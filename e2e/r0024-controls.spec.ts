import { expect, test, type Page } from '@playwright/test';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';
import { seedAcceptanceScenario } from './scenario-state';

type BusinessModule = typeof import('../src/mock/business');
type UnsignedModule = typeof import('../src/mock/unsigned');
const browserErrors = new WeakMap<Page, string[]>();
const observations = new WeakMap<Page, Record<string, unknown>>();

test.beforeEach(({ page }) => {
  prepareArtifacts();
  browserErrors.set(page, collectBrowserErrors(page));
});
test.afterEach(({ page }, info) => {
  const errors = browserErrors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors: errors, observations: observations.get(page) ?? {} });
  expect(errors).toEqual([]);
});

// Read-only reconciliation: all mutations under test are performed by visible UI.
async function snapshot(page: Page, projectId: string) {
  return page.evaluate(async (id) => {
    const businessPath = '/src/mock/business.ts';
    const unsignedPath = '/src/mock/unsigned.ts';
    const { useBusinessStore } = await import(/* @vite-ignore */ businessPath) as BusinessModule;
    const { unsignedSummary } = await import(/* @vite-ignore */ unsignedPath) as UnsignedModule;
    const state = useBusinessStore.getState().data;
    const project = state.projects.find(p => p.id === id)!;
    const summary = unsignedSummary(state, project);
    return {
      quota: summary.quota, validUntil: summary.control.validUntil,
      expectedSignDate: summary.control.expectedSignDate,
      actualCost: project.actualCost, status: project.status,
      costs: state.costs.filter(c => c.projectId === id),
      requests: state.unsignedInvestmentRequests.filter(r => r.projectId === id),
      approvals: state.managementApprovals.filter(a => a.projectId === id && a.type === '未签额外投入'),
      exit: summary.control.exit,
    };
  }, projectId);
}
async function confirm(page: Page) {
  await page.locator('.ant-modal:visible').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
}

for (const approve of [true, false]) {
  test(`YS-14 追加投入${approve ? '批准释放' : '驳回不释放'}且待审不改变额度期限`, async ({ page }) => {
    const projectId = 'P-PLAN-001';
    await seedAcceptanceScenario(page, 'unsigned-base');
    await role(page, '客户经理');
    await navigate(page, `/unsigned-projects/${projectId}?tab=investment`);
    const before = await snapshot(page, projectId);
    const pane = page.locator('.ant-tabs-tabpane-active');
    await pane.getByRole('spinbutton').fill('100');
    const dates = pane.locator('.ant-picker input');
    await dates.nth(0).fill('2026-10-31');
    await dates.nth(0).press('Enter');
    await dates.nth(1).fill('2026-10-20');
    await dates.nth(1).press('Enter');
    const notes = pane.locator('textarea');
    await notes.nth(0).fill('客户已确认范围，合同正在法务审核');
    await notes.nth(1).fill('追加100万元用于签约前必要交付准备');
    await notes.nth(2).fill('按审批额度投入，未签署前每日跟踪并保留退出安排');
    await pane.locator('input[type="file"]').setInputFiles({ name: '追加投入依据.pdf', mimeType: 'application/pdf', buffer: Buffer.from('R0024 investment evidence') });
    await page.getByRole('button', { name: '提交追加投入申请', exact: true }).click();
    await confirm(page);
    const pending = await snapshot(page, projectId);
    expect(pending.requests).toHaveLength(before.requests.length + 1);
    expect(pending.approvals).toHaveLength(before.approvals.length + 1);
    expect(pending.quota).toBe(before.quota);
    expect(pending.validUntil).toBe(before.validUntil);
    expect(pending.actualCost).toBe(before.actualCost);
    const approval = pending.approvals.at(-1)!;
    expect(approval.status).toBe('待审批');
    await expect(pane.locator('tr').filter({ hasText: approval.id })).toContainText('待审批');

    await role(page, '集团领导');
    await navigate(page, `/unsigned-projects/${projectId}?tab=investment`);
    await page.getByPlaceholder('审批意见，批准/驳回前必填').fill(approve ? '核对依据，批准追加额度和申请期限' : '签约依据不足，驳回追加额度');
    const row = page.locator('.ant-table-tbody tr').filter({ hasText: approval.id });
    await row.getByRole('button', { name: approve ? '批准' : '驳回', exact: true }).click();
    await confirm(page);
    await expect(row).toContainText(approve ? '通过' : '驳回');
    const after = await snapshot(page, projectId);
    expect(after.quota).toBe(approve ? before.quota + 100 : before.quota);
    expect(after.validUntil).toBe(approve ? '2026-10-31' : before.validUntil);
    expect(after.expectedSignDate).toBe(approve ? '2026-10-20' : before.expectedSignDate);
    expect(after.actualCost).toBe(before.actualCost);
    expect(after.costs).toEqual(before.costs);
    await role(page, '客户经理');
    await navigate(page, `/unsigned-projects/${projectId}?tab=investment`);
    await expect(page.locator('.ant-descriptions-item').filter({ hasText: '批准额度' }).first()).toContainText(String(after.quota));
    await expect(page.locator('.ant-descriptions-item').filter({ hasText: '投入有效期' }).first()).toContainText(after.validUntil);
    observations.set(page, { before, pending, after, screenshots: await capturePageEvidence(page, `YS-14-investment-${approve ? 'approve' : 'reject'}`) });
  });
}

test('YS-14 退出复盘保留已有成本流水并限制新增投入', async ({ page }) => {
  await seedAcceptanceScenario(page, 'unsigned-base');
  const projectId = await page.evaluate(async () => {
    const businessPath = '/src/mock/business.ts';
    const unsignedPath = '/src/mock/unsigned.ts';
    const { useBusinessStore } = await import(/* @vite-ignore */ businessPath) as BusinessModule;
    const { canManageUnsigned } = await import(/* @vite-ignore */ unsignedPath) as UnsignedModule;
    const state = useBusinessStore.getState().data;
    const market = { id: 'U-006', name: '陈亮', role: 'market' as const };
    return state.projects.find(p => p.isUnsigned && p.actualCost > 0 && state.costs.some(c => c.projectId === p.id) && canManageUnsigned(state, p, market))?.id;
  });
  expect(projectId, '固定故事需有市场可访问且已有实际流水的未签项目').toBeTruthy();
  const id = projectId!;
  const before = await snapshot(page, id);
  await role(page, 'PMO负责人');
  await navigate(page, `/unsigned-projects/${id}?tab=exit`);
  const pane = page.locator('.ant-tabs-tabpane-active');
  const values = ['客户采购计划取消，确认终止未签项目', '现有交付准备和已投入人员工时', '保留可复用方案，原费用按实际保留', '主办部门复盘签约前投入管理', '停止新增投入，归档原始凭据与经验'];
  for (const [index, value] of values.entries()) await pane.locator('textarea').nth(index).fill(value);
  await expect(pane.getByRole('switch').first()).toBeChecked();
  await page.getByRole('button', { name: '确认退出复盘', exact: true }).click();
  await confirm(page);
  await expect(pane.getByText('客户采购计划取消，确认终止未签项目', { exact: true })).toBeVisible();
  const after = await snapshot(page, id);
  expect(after.status).toBe('已终止');
  expect(after.exit?.terminated).toBe(true);
  expect(after.exit?.actualCost).toBe(before.actualCost);
  expect(after.actualCost).toBe(before.actualCost);
  expect(after.costs).toEqual(before.costs);
  expect(after.exit?.costSources).toEqual(before.costs);
  await role(page, '客户经理');
  await navigate(page, `/unsigned-projects/${id}?tab=investment`);
  await expect(page.getByRole('button', { name: '提交追加投入申请', exact: true })).toBeDisabled();
  await expect(page.locator('.ant-tabs-tabpane-active').getByRole('spinbutton')).toBeDisabled();
  await page.getByRole('tab', { name: '合同签订确认', exact: true }).click();
  await expect(page.getByRole('button', { name: '确认签订并解除未签管控' })).toBeDisabled();
  await page.getByRole('tab', { name: '退出与复盘', exact: true }).click();
  observations.set(page, { projectId: id, before, after, screenshots: await capturePageEvidence(page, 'YS-14-exit-controls') });
});
