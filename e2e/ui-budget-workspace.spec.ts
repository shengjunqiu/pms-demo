import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { collectBrowserErrors } from './evidence';
const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  mkdirSync(artifacts, { recursive: true });
  errors.set(page, collectBrowserErrors(page));
  await page.goto('/projects/P-PLAN-001/team');
  await expect(page.getByRole('heading', { name: '项目团队', exact: true })).toBeVisible();
});
test.afterEach(async ({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeFileSync(join(artifacts, `ui-budget-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2));
  expect(consoleErrors).toEqual([]);
});
async function capture(page: Page, name: string) {
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), fullPage: true, animations: 'disabled' });
  }
}
test('UI 团队：维护成员投入、原因与当前主PM退出限制', async ({ page }) => {
  const memberTable = page.locator('.ant-card').filter({ has: page.getByText('项目成员与资源投入', { exact: true }) });
  const pmRow = memberTable.getByRole('row').filter({ hasText: 'U-001' });
  await expect(pmRow.getByRole('button', { name: /^退\s*出$/ })).toBeDisabled();
  await capture(page, 'YS05');
  await memberTable.getByRole('button', { name: /^编\s*辑$/ }).first().click();
  const dialog = page.getByRole('dialog', { name: '维护团队与资源' });
  await dialog.getByLabel('投入比例%').fill('80');
  await dialog.getByLabel('计划工时', { exact: true }).fill('240');
  await dialog.getByLabel('团队变更原因', { exact: true }).fill('按交付阶段调整资源投入，保留历史记录');
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(dialog).toBeHidden();
  await expect(memberTable).toContainText('80% / 240小时');
  await expect(page.locator('.ant-timeline').getByText(/按交付阶段调整资源投入/)).toBeVisible();
});
test('UI 预算工作区：五页上下文、版本来源、只读审批与基线快照', async ({ page }) => {
  await navigate(page, '/projects/P-PLAN-001/budget');
  await expect(page.getByRole('heading', { name: '项目预算编制', exact: true })).toBeVisible();
  await expect(page.locator('.ant-statistic')).toHaveCount(6);
  await expect(page.locator('.ant-statistic').filter({ hasText: '预算差异（万元）' }).locator('.ant-statistic-content')).toHaveText('0.00');
  await capture(page, 'YS09');
  await page.getByRole('tab', { name: '建设采购', exact: true }).click();
  await page.getByRole('button', { name: '新增建设采购', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '预算明细测算' })).toBeVisible();
  await capture(page, 'YS09-editor');
  await page.getByRole('dialog').getByRole('button', { name: /^取\s*消$/ }).click();
  await navigate(page, '/projects/P-PLAN-001/estimate-budget');
  await expect(page.getByRole('heading', { name: '概算预算对比', exact: true })).toBeVisible();
  await expect(page.getByText('概算与预算科目对比', { exact: true })).toBeVisible();
  await capture(page, 'YS10');
  await page.getByRole('button', { name: '调整预算', exact: true }).click();
  await expect(page).toHaveURL('/projects/P-PLAN-001/budget');
  await navigate(page, '/projects/P-001/budget/review');
  await expect(page.getByRole('heading', { name: '预算审批详情', exact: true })).toBeVisible();
  await expect(page.locator('.pms-page-header')).toHaveCount(1);
  await expect(page.locator('.ant-select[aria-label="预算审批版本"]')).not.toBeEmpty();
  await capture(page, 'YS11');
  await page.getByRole('button', { name: '查看基线确认与版本', exact: true }).click();
  await expect(page.getByRole('heading', { name: '项目基线', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '成本基线', exact: true }).click();
  await expect(page.getByText(/本版预算/)).toBeVisible();
  await capture(page, 'YS12');
  await page.getByRole('tab', { name: '进度基线', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WBS工作包', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发起项目变更', exact: true }).click();
  await expect(page).toHaveURL('/project-changes/new?projectId=P-001');
  await role(page, '集团领导');
  await navigate(page, '/projects/P-001/budget');
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toBeDisabled();
});
