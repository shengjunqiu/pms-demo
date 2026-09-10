import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

const artifactDir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errorsByPage = new WeakMap<Page, string[]>();
const laborPath = '/projects/P-001/labor-cost';
const resultPath = '/projects/P-006/business-result';

test.beforeEach(async ({ page }) => {
  mkdirSync(artifactDir, { recursive: true });
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});

test.afterEach(async ({ page }, info) => {
  const consoleErrors = errorsByPage.get(page) ?? [];
  writeFileSync(join(artifactDir, `access-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`),
    JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2));
  expect(consoleErrors).toEqual([]);
});

async function screenshots(page: Page, name: string, drawerOpen = false) {
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  if (!drawerOpen) await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifactDir, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

// Existing role() knows the other role homes; admin now lands on CF07.
async function admin(page: Page) {
  await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '系统管理员' }).click();
  await expect(page).toHaveURL('/settings/permissions');
  await page.getByRole('heading').first().click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}

async function closeDrawer(page: Page) {
  await page.locator('.ant-drawer-close:visible').click();
  await expect(page.locator('.ant-drawer-content:visible')).toHaveCount(0);
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
}

async function submitLabor(page: Page, description: string) {
  await navigate(page, laborPath);
  await page.getByRole('button', { name: '填报本人工时', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '填报本人工时', exact: true });
  await expect(dialog.getByLabel('工时日期', { exact: true })).toHaveValue('2026-09-09');
  await dialog.getByLabel('投入小时', { exact: true }).fill('0.5');
  await dialog.getByLabel('工时工作内容', { exact: true }).fill(description);
  await dialog.getByRole('button', { name: '提交工时审核', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  const row = page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: description });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('待审核');
  return row;
}

async function expectHiddenLabor(page: Page) {
  await expect(page.getByText('人员单价、费率版本及个人成本金额已隐藏；工时填报和审核仍按原职责办理。', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '折算成本（万元）', exact: true })).toHaveCount(0);
  const drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer.getByText('提交时成本基准', { exact: true })).toHaveCount(0);
  await expect(drawer.getByText('折算成本（万元）', { exact: true })).toHaveCount(0);
  await expect(drawer).not.toContainText('元/小时');
  await expect(drawer).not.toContainText('RATE-PM-V1');
  await expect(drawer).not.toContainText('RATE-TECH-V1');
  return drawer;
}

function auditRows(page: Page, action: string) {
  return page.locator('.ant-table-tbody > tr[data-row-key]').filter({
    has: page.getByRole('cell', { name: action, exact: true }),
  });
}

test('CF07发布财务页面与人员单价限制，CF08保留发布差异及访问拒绝', async ({ page }) => {
  test.setTimeout(150_000);
  const description = 'E2E-ACCESS-FINANCE-原单展示核对';
  await page.goto('/workbench/project-manager');
  await submitLabor(page, description);
  await role(page, '财务专员');
  await navigate(page, laborPath);
  await page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: description }).getByRole('button', { name: '原单详情', exact: true }).click();
  await expect(page.locator('.ant-drawer-content:visible').getByText('提交时成本基准', { exact: true })).toBeVisible();
  await expect(page.locator('.ant-drawer-content:visible')).toContainText('元/小时');
  await closeDrawer(page);
  await navigate(page, resultPath);
  await expect(page.locator('.ant-result-403')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '财务确认收款', exact: true })).toBeVisible();

  await admin(page);
  await page.locator('.ant-select[aria-label="配置角色"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '财务专员' }).click();
  await page.getByRole('button', { name: '另存策略草稿', exact: true }).click();
  const editor = page.locator('.ant-drawer-content:visible');
  await editor.getByLabel('策略名称', { exact: true }).fill('财务E2E字段与页面限制');
  const js08 = editor.getByRole('checkbox', { name: 'JS-08 项目经营结果', exact: true });
  const laborRate = editor.getByRole('checkbox', { name: '人员成本单价', exact: true });
  await expect(js08).toBeChecked();
  await expect(laborRate).toBeChecked();
  await js08.uncheck();
  await laborRate.uncheck();
  await editor.getByLabel('变更原因', { exact: true }).fill('E2E核对财务JS08页面和人员费率同时收紧，保持工时与财务流程原职责。');
  await editor.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await expect(page.getByText('ACCESS-finance-V1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发布选中版本', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('发布 财务E2E字段与页面限制 V2？');
  await confirm.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.getByText('ACCESS-finance-V2', { exact: true })).toBeVisible();
  await screenshots(page, 'CF07-finance-restrictions-published');

  await role(page, '财务专员');
  await page.locator('.ant-menu-submenu-title').filter({ hasText: '结算与收尾阶段' }).click();
  await expect(page.getByRole('menuitem', { name: /^JS-07 / })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /^JS-08 / })).toHaveCount(0);
  await navigate(page, resultPath);
  await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '财务确认收款', exact: true })).toHaveCount(0);
  await screenshots(page, 'CF07-finance-JS08-direct-access-denied');
  await navigate(page, laborPath);
  await page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: description }).getByRole('button', { name: '原单详情', exact: true }).click();
  await expectHiddenLabor(page);
  await screenshots(page, 'CF07-finance-labor-fields-hidden', true);
  await closeDrawer(page);

  await admin(page);
  await navigate(page, '/settings/audit-log');
  await page.getByLabel('审计对象搜索', { exact: true }).fill('ACCESS-finance-V2');
  const published = auditRows(page, 'access-policy-publish');
  await expect(published).toHaveCount(1);
  await expect(published).toContainText('成功');
  await published.getByRole('button', { name: '查看详情', exact: true }).click();
  const audit = page.locator('.ant-drawer-content:visible');
  await expect(audit.getByText('ACCESS-admin-V1', { exact: true })).toBeVisible();
  const statusChange = audit.locator('.ant-table-tbody > tr[data-row-key]').filter({ has: page.getByText('状态', { exact: true }) });
  await expect(statusChange).toHaveCount(1);
  await expect(statusChange.locator('td').nth(1)).toHaveText('草稿');
  await expect(statusChange.locator('td').nth(2)).toHaveText('已发布');
  await screenshots(page, 'CF08-policy-publish-before-after', true);
  await closeDrawer(page);
  await page.getByLabel('审计对象搜索', { exact: true }).fill(resultPath);
  const rejected = auditRows(page, 'page-access').filter({ has: page.getByRole('cell', { name: '拒绝', exact: true }) });
  await expect(rejected).toHaveCount(1);
  await expect(rejected).toContainText('finance');
  await rejected.getByRole('button', { name: '查看详情', exact: true }).click();
  await expect(page.locator('.ant-drawer-content:visible').getByText('ACCESS-finance-V2', { exact: true })).toBeVisible();
  await screenshots(page, 'CF08-finance-page-access-rejected', true);
});

test('默认PM仍可审核真实团队成员工时，个人单价和金额保持隐藏', async ({ page }) => {
  test.setTimeout(120_000);
  const description = 'E2E-ACCESS-TEAM-技术成员工时';
  await page.goto('/workbench/project-manager');
  await navigate(page, '/projects/P-001/team');
  await page.getByRole('button', { name: '加入成员', exact: true }).click();
  const memberDialog = page.getByRole('dialog', { name: '维护团队与资源', exact: true });
  // The UI default is the real U-005 technical member, with the project participation dates.
  await expect(memberDialog.locator('.ant-select-selection-item').first()).toContainText('U-005');
  await memberDialog.getByLabel('团队变更原因', { exact: true }).fill('E2E确认技术成员参与项目并由主PM审核工时');
  await memberDialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(memberDialog).toBeHidden();
  await role(page, '方案架构师');
  await submitLabor(page, description);
  await role(page, '项目经理');
  await navigate(page, laborPath);
  const row = page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: description });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: '原单详情', exact: true }).click();
  const drawer = await expectHiddenLabor(page);
  await expect(drawer.getByRole('button', { name: '审核工时通过', exact: true })).toBeEnabled();
  await screenshots(page, 'HS09-PM-team-review-with-hidden-rates', true);
  await drawer.getByRole('button', { name: '审核工时通过', exact: true }).click();
  const review = page.getByRole('dialog', { name: '确认工时通过并计费', exact: true });
  await review.getByLabel('工时审核意见', { exact: true }).fill('技术成员工作内容与任务一致，批准本次半小时工时。');
  await review.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(review).toBeHidden();
  await expect(drawer.getByText('已通过', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '审核工时通过', exact: true })).toBeDisabled();
  await expectHiddenLabor(page);
  await screenshots(page, 'HS09-PM-team-labor-approved-rates-hidden', true);
});
