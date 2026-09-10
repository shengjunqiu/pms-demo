import { test, expect } from '@playwright/test';
import { navigate, role } from './helpers';

const pages = [
  ['GS01', '/opportunities', '客户经理'], ['GS02', '/opportunities/new', '客户经理'],
  ['GS03', '/opportunities/OPP-001', '客户经理'], ['GS04', '/opportunities/OPP-001/evaluation', '客户经理'],
  ['YS06', '/projects/P-PLAN-001/wbs', '项目经理'], ['YS07', '/projects/P-PLAN-001/milestones', '项目经理'], ['YS08', '/projects/P-PLAN-001/plan-review', '项目经理'],
  ['JS01', '/projects/P-006/internal-acceptance', '项目经理'], ['JS02', '/projects/P-006/supplier-acceptance', '项目经理'], ['JS03', '/projects/P-006/customer-acceptance', '项目经理'], ['JS04', '/projects/P-006/report-acceptance', '项目经理'],
];
for (const width of [1440, 1280]) test(`首批页面可见性和布局 ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/workbench/project-manager');
  let current = '项目经理';
  for (const [id, path, name] of pages) {
    if (name !== current) { await role(page, name); current = name; }
    await navigate(page, path);
    await expect(page.locator('h4').first()).toBeVisible();
    await expect(page.getByText('403', { exact: true })).toHaveCount(0);
    await expect(page.getByText('404', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), id).toBe(true);
    await page.screenshot({ path: `test-results/${id}-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('商机提交和重新打开保留同一份业务记录', async ({ page }) => {
  await page.goto('/');
  await role(page, '客户经理');
  await navigate(page, '/opportunities/new');
  await page.getByLabel('商机名称', { exact: true }).fill('浏览器验证园区协同项目');
  await page.getByLabel('客户', { exact: true }).click();
  await page.locator('.ant-select-item-option').first().click();
  await page.getByLabel('预计项目金额（万元）', { exact: true }).fill('1000');
  await page.getByLabel('业务背景、建设目标与主要需求', { exact: true }).fill('统一园区设备台账、巡检计划与运维工单，明确交付范围。');
  await page.getByRole('button', { name: '提交商机', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确 定' }).click();
  await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  const path = new URL(page.url()).pathname;
  await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  await navigate(page, '/opportunities');
  await navigate(page, path);
  await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
});

test('策划计划经PMO评审后进入预算编制入口', async ({ page }) => {
  await page.goto('/projects/P-PLAN-001/plan-review');
  await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('评审中', { exact: true })).toBeVisible();
  await role(page, 'PMO负责人');
  await navigate(page, '/projects/P-PLAN-001/plan-review');
  await page.getByLabel('计划评审意见', { exact: true }).fill('WBS职责、里程碑、资源与范围逐项核对一致');
  await page.getByRole('button', { name: /^通\s*过$/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('已通过', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入预算编制', exact: true })).toBeVisible();
});
