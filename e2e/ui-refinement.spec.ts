import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { collectBrowserErrors } from './evidence';

const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const browserErrors = new WeakMap<Page, string[]>();
const projectName = '福建省晋江市岸海防综合治理平台';

test.beforeEach(async ({ page }) => {
  mkdirSync(artifacts, { recursive: true });
  browserErrors.set(page, collectBrowserErrors(page));
  await page.goto('/workbench/project-manager');
  await expect(page.getByRole('heading', { name: '项目经理工作台', exact: true })).toBeVisible();
});
test.afterEach(async ({ page }, info) => {
  const errors = browserErrors.get(page) ?? [];
  writeFileSync(join(artifacts, `ui-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors }, null, 2));
  expect(errors).toEqual([]);
});

async function capture(page: Page, name: string) {
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), animations: 'disabled' });
  }
}
async function select(page: Page, label: string, option: string) {
  await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: option }).click();
}

// Verify work is reachable, not merely that the reorganized controls exist.
test('UI 工作台：首屏待办、范围、快捷发起与原业务下钻', async ({ page }) => {
  await capture(page, 'WK01');
  const taskCard = page.locator('.ant-card').filter({ has: page.getByText('异常与待处理事项', { exact: true }) });
  expect((await taskCard.boundingBox())!.y).toBeLessThan(500);
  await expect(taskCard.getByText('2026-09-01', { exact: true })).toBeVisible();
  await taskCard.getByRole('button', { name: '去办理', exact: true }).first().click();
  await expect(page).toHaveURL(/issues-risks\//);
  await navigate(page, '/workbench/project-manager');
  await page.getByRole('button', { name: '采购申请', exact: true }).click();
  await expect(page).toHaveURL('/projects/P-001/procurement');
  await navigate(page, '/workbench/project-manager');
  await page.getByRole('button', { name: '更多发起' }).click();
  await expect(page.locator('.ant-dropdown:visible').getByRole('menuitem')).toHaveCount(9);
  await page.getByRole('menuitem', { name: '提问题', exact: true }).click();
  await expect(page).toHaveURL('/issues-risks?kind=issue&projectId=P-001');
  await navigate(page, '/workbench/project-manager');
  await page.getByRole('tab', { name: '我参与', exact: true }).click();
  await expect(page).toHaveURL(/scope=participating/);
  await expect(page.locator('.pms-metric').first()).toContainText('0');
  await expect(page.getByRole('button', { name: '采购申请', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: '我负责', exact: true }).click();
  await expect(page.locator('.pms-metric').first()).toContainText('10');
  await page.getByRole('button', { name: 'PRJ-2026-001', exact: true }).click();
  await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
});

test('UI 项目详情：金额、分组导航、旧深链与原单据', async ({ page }) => {
  await navigate(page, '/projects/P-001');
  await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
  await expect(page.locator('.pms-metric').filter({ hasText: '有效预算' })).toContainText('2,847.70');
  await expect(page.locator('.pms-metric').filter({ hasText: '预测成本偏差' })).toContainText('+138.50');
  await capture(page, 'HS01');
  await page.getByRole('button', { name: /未关闭 BUG/ }).click();
  await expect(page).toHaveURL(/tab=requirements&kind=BUG/);
  await expect(page.getByRole('tab', { name: '协作事项', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ant-select[aria-label="事项类型"]')).toContainText('BUG');
  await page.goBack();
  await expect(page.getByRole('tab', { name: '项目总览', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByText('更多项目信息 · 来源、组织与合同', { exact: true }).click();
  await page.getByRole('button', { name: 'OPP-2026-001', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('关联项目');
  await expect(page.getByRole('dialog')).toContainText('P-001');
  await page.screenshot({ path: join(artifacts, 'HS01-source.png'), animations: 'disabled' });
  await page.locator('.ant-drawer-close').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: /有效预算/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/projects\/P-001\/dynamic-accounting/);
  await expect(page.locator('main')).toContainText('2,986.20');
  await navigate(page, '/projects/P-001?tab=receipts');
  await expect(page.getByRole('tab', { name: '验收与回款', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: '回款', exact: true })).toHaveAttribute('aria-selected', 'true');
  await select(page, '切换项目', 'P-006');
  await expect(page).toHaveURL('/projects/P-006?tab=receipts');
  await expect(page.getByRole('tab', { name: '回款', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('UI 项目详情：全部原页签可达、未知项目与高风险颜色', async ({ page }) => {
  await navigate(page, '/projects/P-001');
  const groups = [
    ['项目总览', ['项目概览', '团队', '操作记录']],
    ['计划与交付', ['计划进度', '质量', '交付物']],
    ['成本与四算', ['四算', '成本', '采购外包', '变更']],
    ['协作事项', ['日报周报', '问题风险（4）', '需求BUG（25）']],
    ['验收与回款', ['验收结算', '回款']],
  ] as const;
  for (const [group, names] of groups) {
    await page.getByRole('tab', { name: group, exact: true }).click();
    for (const name of names) {
      const tab = page.getByRole('tab', { name, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel').last()).toBeVisible();
    }
  }
  await navigate(page, '/projects/P-NOT-FOUND');
  await expect(page.getByText('项目不存在', { exact: true })).toBeVisible();
  await role(page, '集团领导');
  await navigate(page, '/projects/P-003');
  await expect(page.locator('.pms-page-header').getByText('高风险', { exact: true }).locator('..')).toHaveClass(/text-rose-700/);
  await expect(page.locator('.pms-page-header')).toContainText('管理视角：只读');
  await capture(page, 'HS01-risk');
});

test('UI 驾驶舱：异常首屏、筛选继承、指标键盘下钻和返回', async ({ page }) => {
  await role(page, '集团领导');
  await capture(page, 'GL01');
  const exceptions = page.locator('.ant-card').filter({ has: page.getByText(/重点异常项目（/) });
  expect((await exceptions.boundingBox())!.y).toBeLessThan(600);
  const heights = await page.locator('.pms-metric').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
  await expect(page.getByText('运行正常', { exact: true })).toHaveCount(0);
  await select(page, '健康度', '高风险');
  await expect(page).toHaveURL(/health=red/);
  await expect(page.locator('.ant-select[aria-label="健康度"]')).toContainText('高风险');
  await expect(page.locator('.pms-metric').first().locator('.pms-metric-value')).not.toHaveText('66');
  const count = await page.locator('.pms-metric').first().locator('.pms-metric-value').innerText();
  await page.getByRole('button', { name: /在管项目/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/executive/project-drilldown?health=red');
  await expect(page.locator('.pms-metric').first()).toContainText(count);
  await page.getByRole('button', { name: /返回上一级/ }).click();
  await expect(page).toHaveURL('/executive/dashboard?health=red');
  await expect(page.locator('.ant-select[aria-label="健康度"]')).toContainText('高风险');
  await page.getByRole('button', { name: /更多筛选/ }).click();
  await page.getByLabel('项目名称或编号', { exact: true }).fill('无匹配项目UI');
  await expect(page.getByText('当前筛选无项目，请调整条件', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /收起筛选/ }).click();
  await expect(page.getByRole('button', { name: /更多筛选（1项已选）/ })).toBeVisible();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await expect(page).toHaveURL('/executive/dashboard');
  await page.getByText('指标口径与常用视图', { exact: true }).click();
  await expect(page.getByRole('button', { name: '保存视图', exact: true })).toBeVisible();
});

test('UI 驾驶舱：六种演示状态与待决策原审批入口', async ({ page }) => {
  await role(page, '集团领导');
  for (const [label, mode, content] of [
    ['部分数据延迟', 'delayed', '演示：采购来源同步延迟，暂使用最近已确认快照'],
    ['无数据', 'empty', '当前筛选无项目，请调整条件'],
    ['无权限', 'denied', '403 无访问权限'],
    ['计算中', 'loading', ''],
    ['口径变更', 'changed', '演示口径公告：回款完成率按到期计划计算'],
    ['正常', 'normal', ''],
  ]) {
    await page.getByRole('button', { name: '演示场景', exact: true }).click();
    await page.locator('.ant-popover-inner').getByText(label, { exact: true }).click();
    await page.getByRole('heading', { name: '项目经营驾驶舱', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`demo=${mode}`));
    if (content) await expect(page.getByText(content, { exact: true })).toBeVisible();
    if (mode === 'loading') await expect(page.getByRole('status', { name: '正在加载' })).toBeVisible();
    if (mode === 'normal') await expect(page.getByRole('button', { name: /在管项目/ })).toBeVisible();
  }
  await page.getByRole('button', { name: '查看原审批', exact: true }).first().click();
  await expect(page).toHaveURL('/approvals/APR-1');
  await expect(page.locator('main')).toContainText(projectName);
});

test('UI 工作台：四类事项数量与项目范围保持一致', async ({ page }) => {
  for (const [index, count, route] of [
    [5, '2', '/issues-risks?projectId=P-001&kind=issue'],
    [6, '2', '/issues-risks?projectId=P-001&kind=risk'],
    [7, '7', '/requirements-bugs?projectId=P-001&kind=bug'],
    [8, '18', '/requirements-bugs?projectId=P-001&kind=requirement'],
  ] as const) {
    const row = page.locator('.ant-table-row[data-row-key="P-001"]');
    await expect(row).toContainText('5,538.30');
    const link = row.getByRole('cell').nth(index).getByRole('button');
    await expect(link).toHaveText(count);
    await link.click();
    await expect(page).toHaveURL(route);
    await navigate(page, '/workbench/project-manager');
  }
});
