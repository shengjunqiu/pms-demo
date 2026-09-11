import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { collectBrowserErrors } from './evidence';

const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const errors = new WeakMap<Page, string[]>();
const project = '福建省晋江市岸海防综合治理平台';
test.beforeEach(async ({ page }) => {
  mkdirSync(artifacts, { recursive: true });
  errors.set(page, collectBrowserErrors(page));
  await page.goto('/workbench/project-manager');
  await expect(page.getByRole('heading', { name: '项目经理工作台', exact: true })).toBeVisible();
  await role(page, '集团领导');
});
test.afterEach(async ({ page }, info) => {
  writeFileSync(join(artifacts, `executive-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors.get(page) }, null, 2));
  expect(errors.get(page)).toEqual([]);
});
async function capture(page: Page, name: string) {
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), animations: 'disabled', fullPage: true });
  }
}
async function select(page: Page, label: string, option: string) {
  await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: option }).click();
}

test('UI GL02 同样本四阶段金额、科目归因与凭证', async ({ page }) => {
  await navigate(page, '/executive/four-calculations?search=P-001');
  await expect(page.getByRole('heading', { name: '四算经营专题', exact: true })).toBeVisible();
  const chart = page.locator('[aria-label="四阶段成本比较"]');
  await expect(chart).toContainText('2,847.70');
  await expect(chart).toContainText('2,986.20');
  await expect(chart).toContainText('+138.50');
  await expect(chart).toContainText('尚未全部结算');
  await capture(page, 'GL02');
  await page.getByRole('tab', { name: /成本科目偏差来源/ }).click();
  await page.getByRole('button', { name: '查看贡献项目' }).first().click();
  await expect(page.getByRole('dialog')).toContainText(project);
  await page.getByRole('dialog').getByRole('button', { name: '查看原科目' }).click();
  await expect(page).toHaveURL(/projects\/P-001\/dynamic-accounting\?.*subject=/);
  await expect(page.getByRole('heading', { name: '动态核算', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '四算经营专题', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /已结算同样本/ }).click();
  await expect(page.locator('.pms-section').filter({ has: page.getByRole('heading', { name: '四阶段成本对比' }) })).toContainText('同一组 0 个项目');
});

test('UI GL03 穿透摘要、责任记录及原业务返回', async ({ page }) => {
  await navigate(page, '/executive/project-drilldown?search=P-001');
  await expect(page.getByRole('heading', { name: '筛选项目清单' })).toBeVisible();
  await capture(page, 'GL03-list');
  await page.getByRole('button', { name: project, exact: true }).click();
  await expect(page.getByRole('heading', { name: '经营结论' })).toBeVisible();
  await expect(page.locator('.ant-descriptions')).toContainText('P-001');
  await capture(page, 'GL03');
  await page.getByRole('tab', { name: /里程碑/ }).click();
  await expect(page.getByRole('tab', { name: /里程碑/ })).toHaveAttribute('aria-selected', 'true');
  await page.locator('.ant-tabs-tabpane-active .ant-table-tbody button').first().click();
  await expect(page.getByRole('dialog')).toContainText('责任人');
  await page.getByRole('dialog').locator('.ant-drawer-close').click();
  await page.getByRole('button', { name: '进入项目总览', exact: true }).click();
  await expect(page.getByRole('heading', { name: project, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '经营结论' })).toBeVisible();
  await page.getByRole('button', { name: /返回筛选清单/ }).click();
  await expect(page.getByRole('heading', { name: '筛选项目清单' })).toBeVisible();
  await expect(page).toHaveURL(/search=P-001/);
});

test('UI GL04 组合维度、收入占比与上下级穿透', async ({ page }) => {
  await navigate(page, '/executive/portfolio');
  await expect(page.getByRole('heading', { name: '组合表现' })).toBeVisible();
  await capture(page, 'GL04');
  await page.getByRole('button', { name: '进入下级组织' }).first().click();
  await expect(page).toHaveURL(/org=D-/);
  await expect(page.getByRole('button', { name: '上一级组织' })).toBeEnabled();
  await page.getByRole('button', { name: '上一级组织' }).click();
  await expect(page.getByRole('button', { name: '上一级组织', exact: true })).toBeDisabled();
  await select(page, '组合维度', '健康度');
  await expect(page).toHaveURL(/dimension=health/);
  await page.locator('.ant-table-tbody').getByRole('button', { name: '高风险', exact: true }).click();
  await expect(page.getByRole('heading', { name: '筛选项目清单' })).toBeVisible();
  await expect(page).toHaveURL(/health=red/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: '组合表现' })).toBeVisible();
  await expect(page.locator('.ant-select[aria-label="组合维度"]')).toContainText('健康度');
});

test('UI GL05 异常分类、收纳列与责任链原记录', async ({ page }) => {
  await navigate(page, '/executive/exceptions');
  await expect(page.getByRole('heading', { name: '异常需关注概览' })).toBeVisible();
  await capture(page, 'GL05');
  await page.getByRole('tab', { name: /高风险/ }).click();
  await expect(page).toHaveURL(/exception=red/);
  await expect(page.getByRole('tab', { name: /高风险/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByText('常用视图、列设置与导出', { exact: true }).click();
  await page.getByRole('button', { name: '列设置', exact: true }).click();
  await page.getByRole('dialog').getByLabel('责任组织', { exact: true }).check();
  await page.getByRole('dialog').getByRole('button', { name: /^完\s*成$/ }).click();
  await expect(page.getByRole('columnheader', { name: '责任组织', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '原因与责任链', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('责任链');
  await page.getByRole('dialog').getByRole('button', { name: '成本来源明细' }).click();
  await expect(page).toHaveURL(/dynamic-accounting\?.*exception=/);
  await expect(page.getByRole('heading', { name: '动态核算', exact: true })).toBeVisible();
});

test('UI GL06 待决策摘要、历史切换与原审批', async ({ page }) => {
  await navigate(page, '/executive/decisions');
  await expect(page.getByRole('heading', { name: '决策处理概览' })).toBeVisible();
  await capture(page, 'GL06');
  await page.getByRole('tab', { name: /历史决策/ }).click();
  await expect(page).toHaveURL(/decisionStatus=history/);
  await expect(page.getByRole('tab', { name: /历史决策/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /^待决策/ }).click();
  await expect(page.getByRole('tab', { name: /^待决策/ })).toHaveAttribute('aria-selected', 'true');
  await select(page, '决策事项类型', '超概算审批');
  await expect(page).toHaveURL(/decisionType=/);
  await expect(page.locator('.ant-select[aria-label="决策事项类型"]')).toContainText('超概算审批');
  await page.getByRole('button', { name: 'APR-1', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('引用版本');
  await page.getByRole('dialog').getByRole('button', { name: '进入原审批' }).click();
  await expect(page).toHaveURL(/approvals\/APR-1\?/);
  await expect(page.getByRole('heading', { name: '预算调整原审批', exact: true })).toBeVisible();
  await expect(page.locator('.pms-page-header')).toContainText('APR-1');
  await page.getByLabel('审批意见', { exact: true }).fill('核对提交快照与概算偏差，批准本次预算调整');
  await page.getByRole('button', { name: '通过，待基线确认', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '确认基线生效', exact: true })).toBeDisabled();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '决策处理概览' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'APR-1', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: /历史决策/ }).click();
  await expect(page.getByRole('button', { name: 'APR-1', exact: true })).toBeVisible();
  await expect(page.locator('.ant-table-tbody').getByText('已通过', { exact: true }).first()).toBeVisible();
});


test('UI GL 空范围与项目经理访问边界', async ({ page }) => {
  await navigate(page, '/executive/exceptions?search=不存在的项目');
  await expect(page.getByRole('heading', { name: '异常项目清单' })).toBeVisible();
  await expect(page.locator('.ant-table-tbody .ant-table-row')).toHaveCount(0);
  await navigate(page, '/executive/project-drilldown?projectId=UNKNOWN');
  await expect(page.getByText('项目不存在', { exact: true })).toBeVisible();
  await role(page, '项目经理');
  for (const path of ['four-calculations', 'project-drilldown', 'portfolio', 'exceptions', 'decisions']) {
    await navigate(page, '/workbench/project-manager');
    await expect(page.getByRole('heading', { name: '项目经理工作台', exact: true })).toBeVisible();
    await navigate(page, `/executive/${path}`);
    await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
  }
});
