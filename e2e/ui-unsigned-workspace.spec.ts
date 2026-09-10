import { expect, test, type Page } from '@playwright/test';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';
import { seedAcceptanceScenario } from './scenario-state';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  prepareArtifacts();
  errors.set(page, collectBrowserErrors(page));
  await seedAcceptanceScenario(page, 'unsigned-base');
  await role(page, 'PMO负责人');
});
test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors });
  expect(consoleErrors).toEqual([]);
});
test('UI 未签台账：筛选URL、更多办理与返回保持上下文', async ({ page }) => {
  await navigate(page, '/unsigned-projects');
  await expect(page.getByRole('heading', { name: '未签立项台账', exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-YS13');
  await page.getByPlaceholder('项目编号 / 名称').fill('P-PLAN-001');
  await expect(page).toHaveURL('/unsigned-projects?q=P-PLAN-001');
  await expect(page.getByText('共 1 条记录 · 金额单位：万元', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多办理', exact: true }).click();
  await page.getByRole('menuitem', { name: '申请额外投入', exact: true }).click();
  await expect(page).toHaveURL('/unsigned-projects/P-PLAN-001?tab=investment');
  await expect(page.getByRole('tab', { name: '额外投入申请', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '签约进展', exact: true }).click();
  await page.getByRole('button', { name: '返回台账', exact: true }).click();
  await expect(page).toHaveURL('/unsigned-projects?q=P-PLAN-001');
  await expect(page.getByPlaceholder('项目编号 / 名称')).toHaveValue('P-PLAN-001');
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await expect(page).toHaveURL('/unsigned-projects');
  await page.getByRole('button', { name: '含已签转换记录', exact: true }).click();
  await expect(page).toHaveURL('/unsigned-projects?signed=1');
});
test('UI 未签详情：五个旧深链与表单分区均保持可达', async ({ page }) => {
  for (const [tab, label, title] of [
    ['follow', '签约进展', '更新签约进展'],
    ['cost', '投入与沉没成本', '实际成本来源'],
    ['investment', '额外投入申请', '追加额度与有效期'],
    ['contract', '合同签订确认', '关联或登记客户合同原单'],
    ['exit', '退出与复盘', '沉没成本与退出复盘'],
  ]) {
    await navigate(page, `/unsigned-projects/P-PLAN-001?tab=${tab}`);
    await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.ant-card-head-title').filter({ hasText: title })).toBeVisible();
    await capturePageEvidence(page, `UI-YS14-${tab}`);
  }
});
test('UI 启动确认：当前阻断可见且前置办理回到真实基线', async ({ page }) => {
  await navigate(page, '/projects/P-PLAN-001/start-confirmation');
  await expect(page.getByRole('heading', { name: '项目启动确认', exact: true })).toBeVisible();
  await expect(page.getByText(/已满足 \d+ \/ 7 项启动条件/)).toBeVisible();
  const baseline = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '完整有效四基线', exact: true }) });
  await expect(baseline).toContainText('未满足');
  await expect(page.getByLabel('实际启动日期', { exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-YS15-blocked');
  await baseline.getByRole('button', { name: '进入原业务', exact: true }).click();
  await expect(page).toHaveURL('/projects/P-PLAN-001/baseline');
  await expect(page.getByText('尚未形成生效基线', { exact: true })).toBeVisible();
});
