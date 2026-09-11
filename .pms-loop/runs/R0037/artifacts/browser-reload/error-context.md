# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-refinement.spec.ts >> UI 工作台：首屏待办、范围、快捷发起与原业务下钻
- Location: e2e/ui-refinement.spec.ts:37:1

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
```

# Test source

```ts
  1   | import { mkdirSync, writeFileSync } from 'node:fs';
  2   | import { join } from 'node:path';
  3   | import { expect, test, type Page } from '@playwright/test';
  4   | import { navigate, role } from './helpers';
  5   | import { collectBrowserErrors } from './evidence';
  6   | 
  7   | const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
  8   | const browserErrors = new WeakMap<Page, string[]>();
  9   | const projectName = '福建省晋江市岸海防综合治理平台';
  10  | 
  11  | test.beforeEach(async ({ page }) => {
  12  |   mkdirSync(artifacts, { recursive: true });
  13  |   browserErrors.set(page, collectBrowserErrors(page));
  14  |   await page.goto('/workbench/project-manager');
  15  |   await expect(page.getByRole('heading', { name: '项目经理工作台', exact: true })).toBeVisible();
  16  | });
  17  | test.afterEach(async ({ page }, info) => {
  18  |   const errors = browserErrors.get(page) ?? [];
  19  |   writeFileSync(join(artifacts, `ui-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors }, null, 2));
  20  |   expect(errors).toEqual([]);
  21  | });
  22  | 
  23  | async function capture(page: Page, name: string) {
  24  |   for (const width of [1440, 1280]) {
  25  |     await page.setViewportSize({ width, height: 900 });
> 26  |     await page.evaluate(() => window.scrollTo(0, 0));
      |                ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
  27  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  28  |     await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), animations: 'disabled' });
  29  |   }
  30  | }
  31  | async function select(page: Page, label: string, option: string) {
  32  |   await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();
  33  |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: option }).click();
  34  | }
  35  | 
  36  | // Verify work is reachable, not merely that the reorganized controls exist.
  37  | test('UI 工作台：首屏待办、范围、快捷发起与原业务下钻', async ({ page }) => {
  38  |   await capture(page, 'WK01');
  39  |   const taskCard = page.locator('.ant-card').filter({ has: page.getByText('异常与待处理事项', { exact: true }) });
  40  |   expect((await taskCard.boundingBox())!.y).toBeLessThan(500);
  41  |   await expect(taskCard.getByText('2026-09-01', { exact: true })).toBeVisible();
  42  |   await taskCard.getByRole('button', { name: '去办理', exact: true }).first().click();
  43  |   await expect(page).toHaveURL(/issues-risks\//);
  44  |   await navigate(page, '/workbench/project-manager');
  45  |   await page.getByRole('button', { name: '采购申请', exact: true }).click();
  46  |   await expect(page).toHaveURL('/projects/P-001/procurement');
  47  |   await navigate(page, '/workbench/project-manager');
  48  |   await page.getByRole('button', { name: '更多发起' }).click();
  49  |   await expect(page.locator('.ant-dropdown:visible').getByRole('menuitem')).toHaveCount(9);
  50  |   await page.getByRole('menuitem', { name: '提问题', exact: true }).click();
  51  |   await expect(page).toHaveURL('/issues-risks?kind=issue&projectId=P-001');
  52  |   await navigate(page, '/workbench/project-manager');
  53  |   await page.getByRole('tab', { name: '我参与', exact: true }).click();
  54  |   await expect(page).toHaveURL(/scope=participating/);
  55  |   await expect(page.locator('.pms-metric').first()).toContainText('0');
  56  |   await expect(page.getByRole('button', { name: '采购申请', exact: true })).toBeDisabled();
  57  |   await page.getByRole('tab', { name: '我负责', exact: true }).click();
  58  |   await expect(page.locator('.pms-metric').first()).toContainText('10');
  59  |   await page.getByRole('button', { name: 'PRJ-2026-001', exact: true }).click();
  60  |   await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
  61  | });
  62  | 
  63  | test('UI 项目详情：金额、分组导航、旧深链与原单据', async ({ page }) => {
  64  |   await navigate(page, '/projects/P-001');
  65  |   await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
  66  |   await expect(page.locator('.pms-metric').filter({ hasText: '有效预算' })).toContainText('2,847.70');
  67  |   await expect(page.locator('.pms-metric').filter({ hasText: '预测成本偏差' })).toContainText('+138.50');
  68  |   await capture(page, 'HS01');
  69  |   await page.getByRole('button', { name: /未关闭 BUG/ }).click();
  70  |   await expect(page).toHaveURL(/tab=requirements&kind=BUG/);
  71  |   await expect(page.getByRole('tab', { name: '协作事项', exact: true })).toHaveAttribute('aria-selected', 'true');
  72  |   await expect(page.locator('.ant-select[aria-label="事项类型"]')).toContainText('BUG');
  73  |   await page.goBack();
  74  |   await expect(page.getByRole('tab', { name: '项目总览', exact: true })).toHaveAttribute('aria-selected', 'true');
  75  |   await page.getByText('更多项目信息 · 来源、组织与合同', { exact: true }).click();
  76  |   await page.getByRole('button', { name: 'OPP-2026-001', exact: true }).click();
  77  |   await expect(page.getByRole('dialog')).toContainText('关联项目');
  78  |   await expect(page.getByRole('dialog')).toContainText('P-001');
  79  |   await page.screenshot({ path: join(artifacts, 'HS01-source.png'), animations: 'disabled' });
  80  |   await page.locator('.ant-drawer-close').click();
  81  |   await expect(page.getByRole('dialog')).toBeHidden();
  82  |   await page.getByRole('button', { name: /有效预算/ }).focus();
  83  |   await page.keyboard.press('Enter');
  84  |   await expect(page).toHaveURL(/\/projects\/P-001\/dynamic-accounting/);
  85  |   await expect(page.locator('main')).toContainText('2,986.20');
  86  |   await navigate(page, '/projects/P-001?tab=receipts');
  87  |   await expect(page.getByRole('tab', { name: '验收与回款', exact: true })).toHaveAttribute('aria-selected', 'true');
  88  |   await expect(page.getByRole('tab', { name: '回款', exact: true })).toHaveAttribute('aria-selected', 'true');
  89  |   await select(page, '切换项目', 'P-006');
  90  |   await expect(page).toHaveURL('/projects/P-006?tab=receipts');
  91  |   await expect(page.getByRole('tab', { name: '回款', exact: true })).toHaveAttribute('aria-selected', 'true');
  92  | });
  93  | 
  94  | test('UI 项目详情：全部原页签可达、未知项目与高风险颜色', async ({ page }) => {
  95  |   await navigate(page, '/projects/P-001');
  96  |   const groups = [
  97  |     ['项目总览', ['项目概览', '团队', '操作记录']],
  98  |     ['计划与交付', ['计划进度', '质量', '交付物']],
  99  |     ['成本与四算', ['四算', '成本', '采购外包', '变更']],
  100 |     ['协作事项', ['日报周报', '问题风险（4）', '需求BUG（25）']],
  101 |     ['验收与回款', ['验收结算', '回款']],
  102 |   ] as const;
  103 |   for (const [group, names] of groups) {
  104 |     await page.getByRole('tab', { name: group, exact: true }).click();
  105 |     for (const name of names) {
  106 |       const tab = page.getByRole('tab', { name, exact: true });
  107 |       await tab.click();
  108 |       await expect(tab).toHaveAttribute('aria-selected', 'true');
  109 |       await expect(page.getByRole('tabpanel').last()).toBeVisible();
  110 |     }
  111 |   }
  112 |   await navigate(page, '/projects/P-NOT-FOUND');
  113 |   await expect(page.getByText('项目不存在', { exact: true })).toBeVisible();
  114 |   await role(page, '集团领导');
  115 |   await navigate(page, '/projects/P-003');
  116 |   await expect(page.locator('.pms-page-header').getByText('高风险', { exact: true }).locator('..')).toHaveClass(/text-rose-700/);
  117 |   await expect(page.locator('.pms-page-header')).toContainText('管理视角：只读');
  118 |   await capture(page, 'HS01-risk');
  119 | });
  120 | 
  121 | test('UI 驾驶舱：异常首屏、筛选继承、指标键盘下钻和返回', async ({ page }) => {
  122 |   await role(page, '集团领导');
  123 |   await capture(page, 'GL01');
  124 |   const exceptions = page.locator('.ant-card').filter({ has: page.getByText(/重点异常项目（/) });
  125 |   expect((await exceptions.boundingBox())!.y).toBeLessThan(600);
  126 |   const heights = await page.locator('.pms-metric').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
```