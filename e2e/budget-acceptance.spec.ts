import { test, expect, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts } from './evidence';

const project = '/projects/P-PLAN-001';
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  prepareArtifacts();
  browserErrors.set(page, collectBrowserErrors(page));
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

async function confirm(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(dialog).toBeHidden();
}
async function addProcurement(page: Page, name: string, amount: number) {
  await page.getByRole('button', { name: '新增建设采购', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '预算明细测算' });
  await dialog.getByLabel('预算事项', { exact: true }).fill(name);
  await dialog.getByLabel('非人力金额（万元，人力按基准自动计算）', { exact: true }).fill(String(amount));
  await dialog.getByLabel('交付范围 / 调整原因', { exact: true }).fill('新增现场设备与接口适配，保留采购范围及来源');
  await confirm(page);
}
async function approvePlanning(page: Page) {
  await navigate(page, `${project}/plan-review`);
  await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  await confirm(page);
  await role(page, 'PMO负责人');
  await navigate(page, `${project}/plan-review`);
  await page.getByLabel('计划评审意见', { exact: true }).fill('范围、任务、必交材料及资源均完整，批准预算编制');
  await page.getByRole('button', { name: /^通\s*过$/ }).click();
  await confirm(page);
  await expect(page.getByText('已通过', { exact: true })).toBeVisible();
  await role(page, '项目经理');
  await navigate(page, `${project}/budget`);
}

test('YS-09 删除中间新增事项再新增，保存后各事项仍独立', async ({ page }) => {
  await page.goto(`${project}/budget`);
  await page.getByRole('tab', { name: '建设采购', exact: true }).click();
  await addProcurement(page, '待删除采购 A', 11);
  await addProcurement(page, '保留采购 B', 22);
  await page.getByRole('row').filter({ hasText: '待删除采购 A' }).getByRole('button', { name: /^删\s*除$/ }).click();
  await addProcurement(page, '新增采购 C', 33);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('预算草稿 R1', { exact: false })).toBeVisible();
  await navigate(page, `${project}/estimate-budget`);
  await page.getByRole('button', { name: '调整预算', exact: true }).click();
  await page.getByRole('tab', { name: '建设采购', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: '保留采购 B' })).toContainText('22.00');
  await expect(page.getByRole('row').filter({ hasText: '新增采购 C' })).toContainText('33.00');
  await expect(page.getByRole('row').filter({ hasText: '待删除采购 A' })).toHaveCount(0);
  await page.getByRole('row').filter({ hasText: '保留采购 B' }).getByRole('button', { name: /^删\s*除$/ }).click();
  await expect(page.getByRole('row').filter({ hasText: '新增采购 C' })).toContainText('33.00');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('预算草稿 R2', { exact: false })).toBeVisible();
});

test('YS-09/10/11/12 超概算保存、原因阻断、高级审批和独立基线确认', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${project}/budget`);
  await approvePlanning(page);
  await page.getByRole('tab', { name: '建设采购', exact: true }).click();
  await addProcurement(page, '新增设备采购', 100);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('预算草稿 R1', { exact: false })).toBeVisible();
  const estimateMargin = page.locator('.ant-statistic').filter({ hasText: '概算毛利率（%）' });
  await expect(estimateMargin).toContainText('41.67');
  await expect(page.locator('.ant-statistic').filter({ hasText: '预算毛利率（%）' })).toContainText('33.33');
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await confirm(page);
  await expect(page.getByText('超概算须填写原因、应对措施和责任说明', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${project}/budget`);
  await page.getByLabel('超概算原因', { exact: true }).fill('增加现场设备与接口适配');
  await page.getByLabel('应对措施与毛利影响', { exact: true }).fill('集中采购控制成本，预算毛利率降至33.33%');
  await page.getByLabel('责任说明', { exact: true }).fill('项目经理跟踪采购交付，PMO复核');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await navigate(page, `${project}/estimate-budget`);
  await expect(page.locator('.ant-statistic').filter({ hasText: '概算毛利率（%）' })).toContainText('41.67');
  await expect(page.locator('.ant-statistic').filter({ hasText: '当前预算（万元）' })).toContainText('800.00');
  await expect(page.getByText('增加现场设备与接口适配', { exact: true })).toBeVisible();
  await capturePageEvidence(page, 'YS10-over-estimate');
  await page.getByRole('button', { name: '调整预算', exact: true }).click();
  await capturePageEvidence(page, 'YS09-over-estimate');
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await confirm(page);
  await expect(page).toHaveURL(`${project}/budget/review`);
  await expect(page.getByRole('button', { name: '通过，待基线确认', exact: true })).toBeDisabled();
  await role(page, 'PMO负责人');
  await navigate(page, `${project}/budget/review`);
  await expect(page.getByRole('button', { name: '通过，待基线确认', exact: true })).toBeDisabled();
  await expect(page.getByText('PMC / 集团领导', { exact: true })).toBeVisible();
  await role(page, '集团领导');
  await navigate(page, `${project}/budget/review`);
  await capturePageEvidence(page, 'YS11-over-estimate');
  await page.getByLabel('审批意见', { exact: true }).fill('批准新增采购，预算通过后由PMO核实完整基线');
  await page.getByRole('button', { name: '通过，待基线确认', exact: true }).click();
  await confirm(page);
  await navigate(page, `${project}/baseline`);
  await expect(page.getByText('尚未形成生效基线', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认基线', exact: true })).toBeDisabled();
  await role(page, 'PMO负责人');
  await navigate(page, `${project}/baseline`);
  await page.getByRole('button', { name: '确认基线', exact: true }).click();
  await confirm(page);
  await expect(page.getByText('基线版本快照', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '成本基线', exact: true }).click();
  await expect(page.getByText('本版预算 800.00 万元', { exact: true })).toBeVisible();
  await capturePageEvidence(page, 'YS12-confirmed-baseline');
  await role(page, '项目经理');
  await navigate(page, `${project}/wbs`);
  await expect(page.getByRole('button', { name: '新增工作包', exact: true })).toBeDisabled();
  await navigate(page, `${project}/milestones`);
  await expect(page.getByRole('button', { name: '补充节点', exact: true })).toBeDisabled();
});
