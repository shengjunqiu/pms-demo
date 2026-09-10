import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

async function admin(page: Page) {
  await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '系统管理员' }).click();
  await expect(page).toHaveURL('/settings/permissions');
}

async function editPolicy(page: Page, name: string) {
  await page.locator('.ant-select[aria-label="配置角色"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: name }).click();
  await page.getByRole('button', { name: '另存策略草稿', exact: true }).click();
  return page.locator('.ant-drawer-content:visible');
}

async function publish(page: Page) {
  const drawer = page.locator('.ant-drawer-content:visible');
  await drawer.getByLabel('变更原因', { exact: true }).fill('验证动作与字段编辑权限独立，保留原业务记录');
  await drawer.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await page.getByRole('button', { name: '发布选中版本', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
}

test('禁用工时审核仍可填报；费率可见和编辑独立，恢复后原值保留', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/workbench/project-manager');
  await admin(page);
  let drawer = await editPolicy(page, '项目经理');
  await drawer.locator('.ant-select-selection-item[title="review-labor"] .ant-select-selection-item-remove').click();
  await publish(page);
  await role(page, '项目经理');
  await navigate(page, '/projects/P-001/labor-cost');
  await page.getByRole('button', { name: '填报本人工时', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '填报本人工时', exact: true });
  await dialog.getByLabel('投入小时', { exact: true }).fill('0.5');
  await dialog.getByLabel('工时工作内容', { exact: true }).fill('动作分离权限回归');
  await dialog.getByRole('button', { name: '提交工时审核', exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator('.ant-table-tbody > tr[data-row-key]').filter({ hasText: '动作分离权限回归' });
  await expect(row).toContainText('待审核');
  await row.getByRole('button', { name: '原单详情', exact: true }).click();
  await expect(page.getByRole('button', { name: '审核工时通过', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '驳回工时', exact: true })).toBeDisabled();
  await page.locator('.ant-drawer-close:visible').click();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await admin(page);
  drawer = await editPolicy(page, '财务专员');
  await drawer.getByRole('checkbox', { name: '编辑人员成本单价', exact: true }).uncheck();
  await expect(drawer.getByRole('checkbox', { name: '人员成本单价', exact: true })).toBeChecked();
  await publish(page);
  await role(page, '财务专员');
  await navigate(page, '/settings/cost-baseline');
  await expect(page.getByRole('button', { name: '新建独立配置', exact: true })).toBeDisabled();
  for (const button of await page.getByRole('button', { name: '另存版本', exact: true }).all()) await expect(button).toBeDisabled();
  const before = await page.locator('.ant-descriptions').allTextContents();
  expect(before.join(' ')).toContain('180');
  const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
  mkdirSync(artifacts, { recursive: true });
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `CF07-rate-readonly-${width}.png`), fullPage: true });
  }
  await admin(page);
  drawer = await editPolicy(page, '财务专员');
  await drawer.getByRole('checkbox', { name: '编辑人员成本单价', exact: true }).check();
  await publish(page);
  await role(page, '财务专员');
  await navigate(page, '/settings/cost-baseline');
  await expect(page.getByRole('button', { name: '新建独立配置', exact: true })).toBeEnabled();
  expect(await page.locator('.ant-descriptions').allTextContents()).toEqual(before);
  expect(errors).toEqual([]);
});
