import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';

const errors = new WeakMap<Page, string[]>();
test.beforeAll(prepareArtifacts);
test.beforeEach(({ page }) => { errors.set(page, collectBrowserErrors(page)); });
test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors });
  expect(consoleErrors).toEqual([]);
});

test('商机 UI：新建、摘要、六维评估和办理返回保持真实商机', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/opportunities');
  await role(page, '客户经理');
  await page.getByRole('button', { name: '新建商机', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1. 基础与责任信息', exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-GS02');
  await page.getByLabel('商机名称', { exact: true }).fill('UI验收政务协同商机');
  await page.getByLabel('客户', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  await page.getByLabel('预计项目金额（万元）', { exact: true }).fill('1200');
  await page.getByLabel('业务背景、建设目标与主要需求', { exact: true }).fill('统一政务协同入口与跨部门办事流程');
  await page.getByRole('button', { name: '提交商机', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByRole('heading', { name: 'UI验收政务协同商机', exact: true })).toBeVisible();
  const detail = new URL(page.url()).pathname;
  await expect(page.locator('.pms-record-summary')).toContainText('1,200.00');
  await expect(page.getByText('尚未满足发起立项条件', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  await capturePageEvidence(page, 'UI-GS03');
  await page.locator('summary').filter({ hasText: '商机基础信息、背景与材料' }).click();
  await expect(page.getByText('统一政务协同入口与跨部门办事流程', { exact: true })).toBeVisible();
  for (const name of ['跟进记录', '商机评估', '需求与方案', '技术成本评估', '专家评审', '项目概算', '提前投入', '操作记录', '概览']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
  }
  await page.getByRole('button', { name: '发起评估', exact: true }).click();
  await expect(page).toHaveURL(`${detail}/evaluation`);
  await expect(page.getByRole('heading', { name: '本轮评估进度', exact: true })).toBeVisible();
  await expect(page.locator('.pms-record-summary')).toContainText('已提交 0 / 6');
  await expect(page.getByRole('button', { name: '确认拟立项', exact: true })).toBeDisabled();
  await capturePageEvidence(page, 'UI-GS04');
  await page.getByRole('button', { name: '填写意见', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('评分（0–100）', { exact: true }).fill('85');
  await dialog.getByLabel('专业结论', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^可行$/ }).click();
  await dialog.getByLabel('评估说明', { exact: true }).fill('客户已明确建设目标和责任部门');
  await dialog.getByRole('button', { name: '保存本专业意见', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.pms-record-summary')).toContainText('已提交 1 / 6');
  await page.getByRole('button', { name: '返回商机', exact: true }).click();
  await expect(page).toHaveURL(detail);
  await navigate(page, '/opportunities?keyword=' + encodeURIComponent('UI验收政务协同商机'));
  const row = page.locator('.ant-table-tbody tr.ant-table-row');
  await expect(row).toHaveCount(1);
  await expect(page.getByRole('columnheader', { name: '概算（万元）', exact: true })).toHaveCount(0);
  await capturePageEvidence(page, 'UI-GS01');
  await row.getByRole('button', { name: '办理UI验收政务协同商机', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '暂缓', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '终止', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: '发起评估', exact: true }).click();
  await expect(page).toHaveURL(`${detail}/evaluation`);
  await expect(page.locator('.pms-record-summary')).toContainText('已提交 1 / 6');
});

test('商机 UI：空筛选可恢复、辅助列可见、只读角色保留详情', async ({ page }) => {
  await page.goto('/opportunities');
  await role(page, '客户经理');
  await page.getByLabel('编号 / 商机名称', { exact: true }).fill('不存在的商机UI');
  await page.getByRole('button', { name: /^查\s*询$/ }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await page.getByRole('button', { name: /^重\s*置$/ }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
  await page.getByRole('button', { name: '列设置', exact: true }).click();
  await page.getByRole('dialog').getByLabel('最后跟进', { exact: true }).check();
  await page.getByRole('dialog').getByRole('button', { name: /^完\s*成$/ }).click();
  await expect(page.getByRole('columnheader', { name: '最后跟进', exact: true })).toBeVisible();
  await role(page, '方案架构师');
  await expect(page.getByRole('button', { name: /^办理/ })).toHaveCount(0);
  await page.locator('.ant-table-tbody tr.ant-table-row').first().getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('tab', { name: '概览', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0);
  await expect(page.locator('.pms-record-summary')).toBeVisible();
});
