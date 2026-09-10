import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

const artifactDir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  mkdirSync(artifactDir, { recursive: true });
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Each test gets a fresh browser context; its first goto creates fresh demo state.
  // Within a business chain, use navigate/role only, never reload or inject store data.
});

test.afterEach(async ({ page }, info) => {
  const consoleErrors = errorsByPage.get(page) ?? [];
  writeFileSync(
    join(artifactDir, `settlement-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`),
    JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2),
  );
  expect(consoleErrors).toEqual([]);
});

async function screenshots(page: Page, name: string) {
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifactDir, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function submitAcceptanceModal(page: Page) {
  const dialog = page.locator('.ant-modal:visible');
  await dialog.getByRole('button', { name: '确认提交', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
}

test('P006客户整改创建复验轮次，签署证明经PMO确认后分税点报验', async ({ page }) => {
  test.setTimeout(150_000);
  const base = '/projects/P-006/customer-acceptance';
  const oldId = 'ACC-P-006-3';
  const reply = '已补齐园区接口联调验证记录与操作培训签到，客户逐项复核并同意组织复验。';
  const batch = 'E2E-P006-FINAL-01';
  await page.goto('/workbench/project-manager');
  await navigate(page, `${base}?record=${oldId}`);
  let drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer.getByText('整改中', { exact: true })).toBeVisible();
  await expect(drawer.getByText('客户要求补充园区接口联调记录与操作培训材料', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '登记验收结论', exact: true })).toBeDisabled();
  await drawer.getByRole('button', { name: '回复整改清单', exact: true }).click();
  await page.getByLabel('整改回复', { exact: true }).fill(reply);
  await submitAcceptanceModal(page);
  await expect(drawer.getByRole('button', { name: '回复整改清单', exact: true })).toBeDisabled();
  await drawer.getByRole('button', { name: '整改后发起新轮次', exact: true }).click();
  await page.getByLabel('验收范围', { exact: true }).fill('智慧园区平台合同范围；接口联调和培训整改完成后的客户复验');
  await page.getByLabel('验收参与人员', { exact: true }).fill('园区信息中心验收负责人、张建国、交付团队');
  await page.getByLabel('客户联系人', { exact: true }).fill('园区信息中心验收负责人');
  await submitAcceptanceModal(page);
  const newId = new URL(page.url()).searchParams.get('record');
  expect(newId).toBeTruthy();
  expect(newId).not.toBe(oldId);
  drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer.getByText('第2轮', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: oldId, exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: '登记验收结论', exact: true }).click();
  for (const item of ['验收范围', '验收材料', '现场条件', '客户签署意见']) {
    await page.getByLabel(`${item}通过`, { exact: true }).check();
    await page.getByLabel(`${item}依据`, { exact: true }).fill(`${item}已由客户现场逐项核对，依据复验纪要与培训签收记录。`);
  }
  await page.getByLabel('验收过程记录', { exact: true }).fill('客户与交付团队现场复核接口联调结果、培训记录和合同验收清单，逐项确认。');
  await page.getByLabel('验收意见', { exact: true }).fill('全部复验检查通过，同意客户终验通过；签署证明另行登记。');
  await submitAcceptanceModal(page);
  await expect(drawer.getByText('验收通过 · 待PMO确认', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'PMO确认验收完成', exact: true })).toBeDisabled();
  await drawer.getByRole('button', { name: '登记签署证明', exact: true }).click();
  await page.getByLabel('验收签署证明', { exact: true }).fill('园区客户复验签章确认函.pdf\n客户培训签收记录.pdf');
  await submitAcceptanceModal(page);
  await expect(drawer.getByText('园区客户复验签章确认函.pdf、客户培训签收记录.pdf', { exact: true })).toBeVisible();

  // Reopening the original round must retain its correction and original status.
  await navigate(page, `${base}?record=${oldId}`);
  await expect(drawer.getByText('整改中', { exact: true })).toBeVisible();
  await expect(drawer.getByText(reply, { exact: true }).first()).toBeVisible();
  await navigate(page, base);
  await screenshots(page, 'JS03-P006-passed-awaiting-confirmation');
  await role(page, 'PMO负责人');
  await navigate(page, `${base}?record=${newId}`);
  drawer = page.locator('.ant-drawer-content:visible');
  await drawer.getByRole('button', { name: 'PMO确认验收完成', exact: true }).click();
  await page.getByLabel('PMO验收确认意见', { exact: true }).fill('已核对客户签章、复验纪要、培训签收和历史整改回复，确认客户验收完成。');
  await submitAcceptanceModal(page);
  await expect(drawer.getByRole('button', { name: 'PMO确认验收完成', exact: true })).toBeDisabled();
  await expect(drawer.getByText('尚未确认', { exact: true })).toHaveCount(0);
  await navigate(page, base);
  await screenshots(page, 'JS03-P006-confirmed');

  await role(page, '项目经理');
  await navigate(page, '/projects/P-006/report-acceptance');
  await page.getByRole('button', { name: '新建报验', exact: true }).click();
  const reportDialog = page.locator('.ant-modal:visible');
  await page.getByLabel('关联客户验收', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: newId! }).click();
  await reportDialog.locator('.ant-form-item').filter({ has: page.getByText('报验类型', { exact: true }) }).locator('.ant-select').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^最终报验$/ }).click();
  await page.getByLabel('报验批次号', { exact: true }).fill(batch);
  await page.getByLabel('第1行报验金额', { exact: true }).fill('120');
  await reportDialog.getByRole('button', { name: '添加税点', exact: true }).click();
  await page.getByLabel('第2行报验金额', { exact: true }).fill('80');
  await page.getByLabel('报验材料', { exact: true }).fill('园区客户复验签章确认函.pdf\n分税点报验清单.xlsx');
  await page.getByLabel('报验说明', { exact: true }).fill('关联第2轮客户复验及PMO确认，6%税点120万元、0%税点80万元，本次合计200万元。');
  await reportDialog.getByRole('button', { name: '提交财务确认', exact: true }).click();
  await page.locator('.ant-modal-confirm:visible').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  const reportRow = page.locator('.ant-table-tbody > tr').filter({ hasText: batch });
  await expect(reportRow).toContainText('待确认');
  await expect(reportRow).toContainText('6% / 0%');
  const totals = page.locator('.ant-card').filter({ has: page.getByText('客户合同与累计报验', { exact: true }) }).locator('.ant-table-tbody > tr').first();
  await expect(totals.locator('td').nth(2)).toHaveText('0');
  await expect(totals.locator('td').nth(3)).toHaveText('200');
  await screenshots(page, 'JS04-P006-awaiting-finance');
  await role(page, '财务专员');
  await navigate(page, '/projects/P-006/report-acceptance');
  await reportRow.getByRole('button', { name: /^详\s*情$/ }).click();
  await page.getByRole('button', { name: '确认报验金额', exact: true }).click();
  await page.getByLabel('报验财务意见', { exact: true }).fill('原合同、第2轮终验和PMO签章确认一致，核定本批次含税200万元，不叠加历史验收轮次。');
  await page.locator('.ant-modal:visible').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '确认报验金额', exact: true })).toBeDisabled();
  await page.locator('.ant-drawer-close:visible').click();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await navigate(page, '/projects/P-006/report-acceptance');
  await expect(reportRow).toContainText('已确认');
  await expect(totals.locator('td').nth(2)).toHaveText('200');
  await expect(totals.locator('td').nth(3)).toHaveText('0');
  await screenshots(page, 'JS04-P006-confirmed');
  await navigate(page, base);
  await expect(page.getByText(/累计已确认报验 200 万元/)).toBeVisible();
});

test('OPS007真实运维原单经财务单次入账，与独立周期关联', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/workbench/project-manager');
  await role(page, 'PMO负责人');
  await navigate(page, '/operations/OPS-007?tab=costs');
  await expect(page.getByRole('heading', { name: 'JS-12 运维服务管理', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '填报运维工时 / 费用', exact: true }).click();
  const dialog = page.locator('.ant-modal:visible');
  await dialog.getByLabel('原工时单 / 报销单编号（唯一）', { exact: true }).fill('E2E-OPS007-EXP-001');
  await dialog.getByLabel('发生依据 / 凭据文件名', { exact: true }).fill('政务云巡检差旅费用确认单.pdf');
  await dialog.getByLabel('费用：报销金额（万元）；人工按工时计算', { exact: true }).fill('0.8');
  await dialog.getByLabel('发生事项与凭据', { exact: true }).fill('E2E政务云巡检差旅，客户现场确认巡检记录与费用凭据');
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(dialog).toBeHidden();
  const sourceRow = page.locator('.ant-table-tbody > tr').filter({ hasText: 'E2E政务云巡检差旅' }).filter({ hasText: 'OCS-' });
  await expect(sourceRow).toContainText('待审核');
  const sourceId = await sourceRow.locator('td').first().innerText();
  await expect(page.getByRole('button', { name: '确认入账', exact: true })).toHaveCount(0);
  await screenshots(page, 'JS12-OPS007-cost-submitted');
  await role(page, '财务专员');
  await navigate(page, '/operations/OPS-007?tab=costs');
  await sourceRow.getByRole('button', { name: '确认入账', exact: true }).click();
  await expect(sourceRow).toContainText('已入账');
  await expect(sourceRow.getByRole('button', { name: '确认入账', exact: true })).toHaveCount(0);
  const ledger = page.locator('.ant-table-tbody > tr').filter({ hasText: '运维费用' }).filter({ hasText: sourceId });
  await expect(ledger).toHaveCount(1);
  await expect(ledger).toContainText('0.8');
  await screenshots(page, 'JS12-OPS007-cost-posted');
  await navigate(page, '/projects/P-007/operation-handover');
  await navigate(page, '/operations/OPS-007?tab=costs');
  await expect(ledger).toHaveCount(1);
  await expect(sourceRow).toContainText('已入账');
});
