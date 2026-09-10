import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate } from './helpers';
import { collectBrowserErrors } from './evidence';

const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  mkdirSync(artifacts, { recursive: true });
  errors.set(page, collectBrowserErrors(page));
  await page.goto('/projects/P-PLAN-001/wbs');
  await expect(page.getByRole('heading', { name: 'WBS计划编制', exact: true })).toBeVisible();
});
test.afterEach(async ({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeFileSync(join(artifacts, `ui-planning-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2));
  expect(consoleErrors).toEqual([]);
});
async function capture(page: Page, name: string) {
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), animations: 'disabled' });
  }
}

test('UI 计划：范围保存、任务编辑、里程碑导航与评审提交快照', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'WBS计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('textbox', { name: '计划范围', exact: true }).fill('交付范围：平台实施、培训与验收资料');
  await page.getByRole('button', { name: '保存范围', exact: true }).click();
  await expect(page.getByText('计划草稿已保存，版本已更新', { exact: true })).toBeVisible();
  await capture(page, 'YS06');
  await page.getByRole('button', { name: /^编\s*辑$/ }).first().click();
  const task = page.getByRole('dialog');
  await expect(task.getByLabel('任务名称')).not.toHaveValue('');
  await task.getByLabel('说明', { exact: true }).fill('UI验收：保留原任务日期、依赖与完成条件');
  await task.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(task).toBeHidden();
  await page.getByRole('tab', { name: '里程碑计划', exact: true }).click();
  await expect(page).toHaveURL('/projects/P-PLAN-001/milestones');
  await expect(page.getByRole('tab', { name: '里程碑计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  await capture(page, 'YS07');
  await page.getByText('标准模板与裁剪规则', { exact: true }).click();
  await expect(page.getByText(/自定义节点可裁剪/)).toBeVisible();
  await page.getByRole('button', { name: '补充节点', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('达成条件')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /^取\s*消$/ }).click();
  await page.getByRole('tab', { name: '计划评审', exact: true }).click();
  await expect(page.getByText('当前草稿完整性校验通过', { exact: true })).toBeVisible();
  await capture(page, 'YS08');
  await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.locator('.pms-record-summary').first()).toContainText('评审中');
  await expect(page.locator('.ant-select[aria-label="评审版本"]')).toContainText('待评审');
  await expect(page.getByRole('button', { name: '提交 / 整改重提', exact: true })).toBeDisabled();
  await page.goBack();
  await expect(page.getByRole('tab', { name: '里程碑计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '补充节点', exact: true })).toBeDisabled();
});

test('UI 计划：旧深链保持项目与冻结基线只读', async ({ page }) => {
  for (const [path, tab] of [['wbs', 'WBS计划'], ['milestones', '里程碑计划'], ['plan-review', '计划评审']]) {
    await navigate(page, `/projects/P-001/${path}`);
    await expect(page.locator('.pms-page-header')).toContainText('P-001');
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('当前计划已随基线冻结，调整须提交项目变更', { exact: true })).toBeVisible();
    if (path === 'wbs') await expect(page.getByRole('button', { name: '新增工作包', exact: true })).toBeDisabled();
    if (path === 'milestones') await expect(page.getByRole('button', { name: '补充节点', exact: true })).toBeDisabled();
  }
  await page.getByRole('button', { name: '进入项目变更', exact: true }).click();
  await expect(page).toHaveURL('/project-changes/new?projectId=P-001');
});
