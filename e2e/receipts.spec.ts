import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

const artifactDir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errorsByPage = new WeakMap<Page, string[]>();
const resultPath = '/projects/P-006/business-result';

// A fresh context resets each scenario; role/navigate retain state within its chain.
test.beforeEach(async ({ page }) => {
  mkdirSync(artifactDir, { recursive: true });
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(async ({ page }, info) => {
  const consoleErrors = errorsByPage.get(page) ?? [];
  writeFileSync(
    join(artifactDir, `receipts-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`),
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

function receiptPanel(page: Page) {
  return page.locator('.ant-card').filter({
    has: page.locator('.ant-card-head-title').getByText('实际收款与原流水', { exact: true }),
  });
}

function receiptRow(page: Page, sourceNo: string) {
  return receiptPanel(page).locator('.ant-table-tbody > tr').filter({
    has: page.getByRole('button', { name: sourceNo, exact: true }),
  });
}

async function expectBalance(page: Page, paid: string, unpaid: string) {
  const contractRow = receiptPanel(page).locator('.ant-table-wrapper').first().locator('.ant-table-tbody > tr[data-row-key]');
  await expect(contractRow).toHaveCount(1);
  await expect(contractRow.locator('td').nth(4)).toHaveText(paid);
  await expect(contractRow.locator('td').nth(5)).toHaveText(unpaid);
}

async function enterReceipt(page: Page, sourceNo: string, amount: string) {
  await page.getByRole('button', { name: '财务确认收款', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '财务确认实际收款', exact: true });
  await dialog.getByLabel('原收款流水编号', { exact: true }).fill(sourceNo);
  await expect(dialog.getByLabel('实际收款日期', { exact: true })).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await dialog.getByRole('button', { name: '添加回款节点', exact: true }).click();
  await dialog.getByLabel('第1个节点收款金额', { exact: true }).fill(amount);
  await dialog.getByLabel('收款凭据文件名', { exact: true }).fill(`${sourceNo}-银行回单.pdf`);
  await dialog.getByLabel('收款依据与分配说明', { exact: true }).fill('模拟银行实际到账回单，财务核对智慧园区客户合同，将本次到账分配至验收结算款节点。');
  await dialog.getByRole('button', { name: '确认收款并更新余额', exact: true }).click();
  return dialog;
}

test('P006财务收清1023万元后应收门禁解除，其他关闭条件仍待办理', async ({ page }) => {
  test.setTimeout(120_000);
  const sourceNo = 'E2E-P006-RECEIPT-FULL-001';
  await page.goto('/workbench/project-manager');
  await navigate(page, resultPath);
  await expect(page.getByRole('button', { name: '财务确认收款', exact: true })).toBeDisabled();
  await screenshots(page, 'JS08-P006-non-finance-readonly');
  await role(page, '财务专员');
  await navigate(page, resultPath);
  await expectBalance(page, '837.00', '1,023.00');
  const dialog = await enterReceipt(page, sourceNo, '1023');
  await expect(dialog).toBeHidden();
  await expectBalance(page, '1,860.00', '0.00');
  const planRow = page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: '验收结算款' });
  await expect(planRow).toHaveCount(1);
  await expect(planRow.locator('td').nth(3)).toHaveText('1023');
  await expect(planRow).toContainText('已收齐');
  await expect(receiptRow(page, sourceNo)).toHaveCount(1);
  await expect(page.getByRole('button', { name: '财务确认收款', exact: true })).toBeDisabled();
  await screenshots(page, 'JS08-P006-receipt-paid-in-full');

  await role(page, 'PMO负责人');
  await navigate(page, '/projects/P-006/close');
  const gate = (label: string) => page.locator('.ant-table-tbody > tr').filter({ has: page.getByText(label, { exact: true }) });
  await expect(gate('合同及回款计划应收结清')).toContainText('已满足');
  for (const label of ['财务最终结算锁定', '后评价已完成', '正式归档已确认']) {
    await expect(gate(label)).toContainText('待处理');
  }
  await expect(page.getByRole('button', { name: 'PMO确认关闭', exact: true })).toBeDisabled();
  await screenshots(page, 'JS13-P006-receivable-cleared-other-gates-pending');

  await navigate(page, resultPath);
  await expectBalance(page, '1,860.00', '0.00');
  await expect(receiptRow(page, sourceNo)).toHaveCount(1);
  await receiptRow(page, sourceNo).getByRole('button', { name: '查看收款原单', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer.getByText(sourceNo, { exact: true })).toBeVisible();
  await expect(drawer.getByText(`${sourceNo}-银行回单.pdf`, { exact: true })).toBeVisible();
  await page.locator('.ant-drawer-close:visible').click();
  await expect(drawer).toBeHidden();
  await screenshots(page, 'JS08-P006-original-receipt-preserved');
});

test('P006部分收款后重复流水被拒，合同余额及原流水条数保持不变', async ({ page }) => {
  test.setTimeout(90_000);
  const sourceNo = 'E2E-P006-RECEIPT-PARTIAL-001';
  await page.goto('/workbench/project-manager');
  await role(page, '财务专员');
  await navigate(page, resultPath);
  await expectBalance(page, '837.00', '1,023.00');
  const firstDialog = await enterReceipt(page, sourceNo, '100');
  await expect(firstDialog).toBeHidden();
  await expectBalance(page, '937.00', '923.00');
  await expect(receiptRow(page, sourceNo)).toHaveCount(1);

  // Full payment disables new receipts, so exercise duplicate rejection while a real balance remains.
  const duplicateDialog = await enterReceipt(page, sourceNo, '100');
  await expect(page.locator('.ant-message-error')).toContainText('原收款流水编号必填且不可重复登记');
  await expect(duplicateDialog).toBeVisible();
  await duplicateDialog.getByRole('button', { name: /^取\s*消$/ }).click();
  await expect(duplicateDialog).toBeHidden();
  await expectBalance(page, '937.00', '923.00');
  await expect(receiptRow(page, sourceNo)).toHaveCount(1);
  const planRow = page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: '验收结算款' });
  await expect(planRow.locator('td').nth(3)).toHaveText('100');
  await screenshots(page, 'JS08-P006-duplicate-rejected-balance-preserved');
});
