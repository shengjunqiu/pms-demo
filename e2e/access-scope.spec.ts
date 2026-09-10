import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

const artifactDir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errorsByPage = new WeakMap<Page, string[]>();
const outsideName = '福建省晋江市岸海防综合治理平台商机';
const outsidePath = '/opportunities/OPP-001';
const recordedPath = `${outsidePath}?scopeCase=E2E-SCOPE-OUTSIDE`;
const sourcePath = '/initiation/apply?opportunityId=OPP-001';

test.beforeEach(async ({ page }) => {
  mkdirSync(artifactDir, { recursive: true });
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});

test.afterEach(async ({ page }, info) => {
  const consoleErrors = errorsByPage.get(page) ?? [];
  writeFileSync(join(artifactDir, `access-scope-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`),
    JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2));
  expect(consoleErrors).toEqual([]);
});

async function screenshots(page: Page, name: string) {
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifactDir, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function admin(page: Page) {
  await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '系统管理员' }).click();
  await expect(page).toHaveURL('/settings/permissions');
  await page.getByRole('heading').first().click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}

async function publishScope(page: Page, target: 'finance' | 'admin', scope: 'organizations' | 'all', version: number) {
  await navigate(page, '/settings/permissions');
  await page.locator('.ant-select[aria-label="配置角色"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: target === 'finance' ? '财务专员' : '系统管理员' }).click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await page.getByRole('button', { name: '另存策略草稿', exact: true }).click();
  const editor = page.locator('.ant-drawer-content:visible');
  const name = `E2E-${target}-${scope}-V${version}`;
  await editor.getByLabel('策略名称', { exact: true }).fill(name);
  const scopeField = editor.locator('.ant-form-item').filter({ has: page.locator('label').filter({ hasText: /^数据范围$/ }) });
  await scopeField.locator('.ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: scope === 'organizations' ? /^指定组织及下级$/ : /^全集团$/ }).click();
  if (scope === 'organizations') {
    // Existing opportunities are owned by D-002; selecting sibling D-003 must exclude them.
    const organizations = editor.locator('.ant-form-item').filter({ has: page.locator('label').filter({ hasText: /^指定组织（包含下级）$/ }) });
    await organizations.locator('.ant-select-selector').click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^数字政务业务群$/ }).click();
    await editor.getByLabel('变更原因', { exact: true }).click();
  }
  await editor.getByLabel('变更原因', { exact: true }).fill(scope === 'all'
    ? '恢复全集团审计可见范围，核对原日志仍保留。'
    : '仅允许数字政务业务群及下级，验证商机来源和审计查询使用同一组织边界。');
  await editor.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await page.getByRole('button', { name: '发布选中版本', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText(`发布 ${name} V${version}？`);
  await confirm.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.getByText(`ACCESS-${target}-V${version}`, { exact: true })).toBeVisible();
}

function auditRows(page: Page) {
  return page.locator('.ant-table-tbody > tr[data-row-key]').filter({
    has: page.getByRole('button', { name: '查看详情', exact: true }),
  });
}

async function expectSourceForbidden(page: Page, path: string) {
  await navigate(page, path);
  await expect(page.locator('.ant-result-403')).toBeVisible();
  await expect(page.locator('main').getByText(outsideName, { exact: true })).toHaveCount(0);
}

test('指定组织约束商机与立项来源，审计收窄只隐藏日志且恢复后原事件仍存在', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/workbench/project-manager');
  await role(page, '财务专员');
  await navigate(page, '/opportunities?keyword=OPP-2026-001');
  await expect(page.getByRole('link', { name: outsideName, exact: true })).toBeVisible();
  await navigate(page, recordedPath);
  await expect(page.locator('h4').first()).toContainText(outsideName);
  await expect(page.locator('.ant-result-403')).toHaveCount(0);
  await navigate(page, sourcePath);
  await expect(page.locator('.ant-result-403')).toHaveCount(0);
  await expect(page.locator('h4').first()).toContainText('立项');

  await navigate(page, '/settings/audit-log');
  await expect(page.locator('.ant-result-403')).toBeVisible();
  await admin(page);
  await navigate(page, '/settings/audit-log');
  await page.getByLabel('审计对象搜索', { exact: true }).fill('E2E-SCOPE-OUTSIDE');
  const original = auditRows(page);
  await expect(original).toHaveCount(1);
  await expect(original).toContainText(recordedPath);
  await expect(original).toContainText('page-access');
  await expect(original).toContainText('finance');
  const originalText = await original.innerText();
  const originalId = originalText.match(/\bAUD-\d+\b/)?.[0];
  expect(originalId, '读取真实界面中的原审计编号').toBeTruthy();
  if (!originalId) throw new Error('原访问事件没有可追溯的日志编号');
  await screenshots(page, 'CF08-scope-original-event-visible');

  await publishScope(page, 'finance', 'organizations', 2);
  await screenshots(page, 'CF07-finance-D003-scope-published');
  await role(page, '财务专员');
  await navigate(page, '/opportunities?keyword=OPP-2026-001');
  await expect(page.locator('h4').first()).toContainText('商机台账');
  await expect(page.getByRole('link', { name: outsideName, exact: true })).toHaveCount(0);
  await expect(page.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(0);
  await screenshots(page, 'GS01-outside-organization-search-empty');
  await expectSourceForbidden(page, outsidePath);
  await screenshots(page, 'GS03-outside-organization-detail-denied');
  await expectSourceForbidden(page, sourcePath);
  await screenshots(page, 'YS01-outside-opportunity-source-denied');

  await admin(page);
  await publishScope(page, 'admin', 'organizations', 2);
  await navigate(page, '/settings/audit-log');
  await expect(page.locator('.ant-result-403')).toHaveCount(0);
  await page.getByLabel('审计对象搜索', { exact: true }).fill(originalId);
  await expect(auditRows(page)).toHaveCount(0);
  await page.getByLabel('审计对象搜索', { exact: true }).fill('E2E-SCOPE-OUTSIDE');
  await expect(auditRows(page)).toHaveCount(0);
  await screenshots(page, 'CF08-outside-event-hidden-under-D003-scope');

  await publishScope(page, 'admin', 'all', 3);
  await navigate(page, '/settings/audit-log');
  await page.getByLabel('审计对象搜索', { exact: true }).fill(originalId);
  const restored = auditRows(page);
  await expect(restored).toHaveCount(1);
  await expect(restored).toHaveText(originalText, { useInnerText: true });
  for (const [label, text] of [['操作人筛选', '刘敏'], ['审计动作筛选', 'page-access'], ['审计结果筛选', '成功']]) {
    await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${text}$`) }).click();
  }
  await page.getByLabel('审计开始日期', { exact: true }).fill('2026-09-09');
  await page.getByLabel('审计结束日期', { exact: true }).fill('2026-09-09');
  await expect(auditRows(page)).toHaveCount(1);
  await expect(auditRows(page)).toHaveText(originalText, { useInnerText: true });
  await screenshots(page, 'CF08-original-event-restored-without-rewrite');
});
