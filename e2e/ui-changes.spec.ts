import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
type BusinessModule = typeof import('../src/mock/business');
const errors = new WeakMap<Page, string[]>();
async function state(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    return (await import(/* @vite-ignore */ path) as BusinessModule).useBusinessStore.getState().data;
  });
}
async function open(page: Page, id: string, query = 'projectId=P-001&status=草稿&q=UI变更') {
  await navigate(page, `/project-changes/new?${query}&changeId=${id}`);
  await expect(page.getByTestId('change-status')).toBeVisible();
}
async function draft(page: Page, title: string, amount = 20, days = 14) {
  await navigate(page, '/project-changes/new?projectId=P-001&status=草稿&q=UI变更');
  await expect(page.getByRole('heading', { name: '发起项目变更', exact: true })).toBeVisible();
  for (const [label, value] of Object.entries({
    '变更标题': title, '原因与内容': '客户签证明确增加设备点位', '客户依据 / 签证': '客户签证2026-09-09',
    '合同依据': '合同范围变更条款', '目标范围': '增加10个设备点位', '新增范围工作包': '新增设备点位接入',
    '采购影响': '新增设备采购，按批准预算实施', '外包影响': '无新增外包', '风险影响与应对': '按原技术栈交付，跟踪联调风险',
  })) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('未完成计划顺延天数', { exact: true }).fill(String(days));
  const data = await state(page);
  const subject = data.budgets.find(b => b.projectId === 'P-001' && b.status === '已生效')!.items.find(i => i.subjectId === 'SUB-03')!;
  await page.getByLabel(`${subject.subjectName}预算调整`, { exact: true }).fill(String(amount));
  await page.getByLabel('附件文件名', { exact: true }).fill('客户签证.pdf');
  await page.getByRole('button', { name: '登记附件', exact: true }).click();
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL(/changeId=/);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('q')).toBe('UI变更');
  return new URL(page.url()).searchParams.get('changeId')!;
}
async function submit(page: Page) {
  await page.getByRole('button', { name: '提交评估', exact: true }).click();
  const modal = page.getByRole('dialog', { name: '提交变更影响评估', exact: true });
  await modal.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('change-status')).toHaveText('影响评估中');
}
async function assess(page: Page, id: string) {
  for (const [identity, area] of [['方案架构师', '技术'], ['财务专员', '财务'], ['客户经理', '市场']]) {
    await role(page, identity); await open(page, id);
    await expect(page.locator('.ant-select[aria-label="专业评估领域"]')).toContainText(`${area}专业评估`);
    await expect(page.getByLabel('变更处理意见', { exact: true })).toHaveValue('');
    await page.getByLabel('变更处理意见', { exact: true }).fill(`${area}核对范围、工期及相应专业成本，同意`);
    await page.getByRole('button', { name: '提交专业评估', exact: true }).click();
    await expect.poll(async () => (await state(page)).changeRequests.find(r => r.id === id)!.assessments.some(a => a.area === area)).toBe(true);
  }
  await role(page, 'PMO负责人'); await open(page, id);
  await page.getByLabel('变更处理意见', { exact: true }).fill('三方专业意见完整，按规则确认分级');
  await page.getByRole('button', { name: 'PMO确认分级', exact: true }).click();
  await expect(page.getByTestId('change-status')).toHaveText('待审批');
}
async function decide(page: Page, approve: boolean, opinion: string) {
  await page.getByLabel('变更处理意见', { exact: true }).fill(opinion);
  await page.getByRole('button', { name: approve ? '通过并追加新基线' : '否决 / 退回补充', exact: true }).click();
  const modal = page.getByRole('dialog', { name: approve ? '确认批准并生成新基线' : '确认退回，保留当前生效基线', exact: true });
  await modal.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('change-status')).toHaveText(approve ? '通过' : '驳回');
}
test.beforeEach(async ({ page }) => {
  prepareArtifacts(); errors.set(page, collectBrowserErrors(page));
  await page.goto('/project-changes');
  await page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    business.useBusinessStore.setState({ data: business.createBusinessState() });
  });
  await role(page, '项目经理');
});
test.afterEach(async ({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors });
  expect(consoleErrors).toEqual([]);
});
for (const scenario of [{ name: '正常', amount: 20, days: 14 }, { name: '重大', amount: 200, days: 40 }]) {
  test(`${scenario.name}变更：真实三方评估、分级、审批与基线追加`, async ({ page }) => {
    test.setTimeout(210_000);
    const initial = await state(page);
    const original = initial.baselines.find(b => b.projectId === 'P-001' && b.status === '已生效')!;
    const id = await draft(page, `UI变更-${scenario.name}`, scenario.amount, scenario.days);
    const proposed = (await state(page)).changeRequests.find(r => r.id === id)!;
    const budgetRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '预算万元', exact: true }) });
    await expect(budgetRow).toContainText(String(original.budgetAmount));
    await expect(budgetRow).toContainText(String(proposed.proposedBudget.totalAmount));
    await capturePageEvidence(page, `UI-HS15-${scenario.name}-draft`);
    await submit(page); await assess(page, id);
    const request = (await state(page)).changeRequests.find(r => r.id === id)!;
    expect(request.requiredRole).toBe(scenario.name === '重大' ? 'executive' : 'pmo');
    if (scenario.name === '重大') {
      await expect(page.getByRole('button', { name: '通过并追加新基线', exact: true })).toBeDisabled();
      await role(page, '集团领导'); await open(page, id);
    }
    await capturePageEvidence(page, `UI-HS15-${scenario.name}-review`);
    await decide(page, true, '同意按批准的范围、计划和预算执行');
    const result = await state(page);
    const retained = result.baselines.find(b => b.id === original.id);
    // Archiving may change only status; all original fields and the full snapshot remain intact.
    expect(retained).toEqual({ ...original, status: '历史' });
    const effective = result.baselines.find(b => b.projectId === 'P-001' && b.status === '已生效')!;
    expect(effective).toBeDefined();
    expect(effective.scopeDesc).toBe(request.proposed.scope);
    expect(effective.plannedStartDate).toBe(request.proposed.plannedStartDate);
    expect(effective.plannedEndDate).toBe(request.proposed.plannedEndDate);
    expect(effective.budgetAmount).toBe(request.proposedBudget.totalAmount);
    expect(effective.budgetAmount).toBe(original.budgetAmount + scenario.amount);
    // Approval assigns budget identity/version metadata, while every proposed business field stays frozen.
    expect(effective.snapshot).toEqual({
      ...request.proposed,
      budget: {
        ...request.proposedBudget,
        id: `BUD-CHANGE-${id}`,
        version: effective.version,
        status: '已生效',
        createdAt: effective.createdAt,
        createdBy: scenario.name === '重大' ? 'U-003' : 'U-002',
      },
    });
    expect(result.budgets.find(b => b.id === effective.snapshot?.budget.id)).toEqual(effective.snapshot?.budget);
    expect(result.changeRequests.find(r => r.id === id)?.proposed).toEqual(request.proposed);
    expect(result.baselines.filter(b => b.projectId === 'P-001')).toHaveLength(initial.baselines.filter(b => b.projectId === 'P-001').length + 1);
    expect(result.costs).toEqual(initial.costs);
    for (const task of initial.tasks.filter(t => t.projectId === 'P-001')) {
      const after = result.tasks.find(t => t.id === task.id)!;
      expect([after.progress, after.actualStartDate, after.actualEndDate]).toEqual([task.progress, task.actualStartDate, task.actualEndDate]);
    }
    await page.getByRole('button', { name: '返回台账', exact: true }).click();
    expect(new URL(page.url()).searchParams.get('q')).toBe('UI变更');
    expect(new URL(page.url()).searchParams.get('status')).toBe('草稿');
  });
}

test('历史待审否决、补充再提，前轮依据与意见可追溯', async ({ page }) => {
  test.setTimeout(120_000);
  const initial = await state(page);
  await role(page, 'PMO负责人'); await open(page, 'CHG-0006', 'projectId=P-006');
  await decide(page, false, '客户签证和合同材料需补充');
  expect((await state(page)).baselines).toEqual(initial.baselines);
  expect((await state(page)).costs).toEqual(initial.costs);
  await role(page, '项目经理'); await open(page, 'CHG-0006', 'projectId=P-006');
  await page.getByLabel('客户依据 / 签证', { exact: true }).fill('补充客户签证2026');
  await page.getByLabel('合同依据', { exact: true }).fill('补充合同条款');
  for (const label of ['采购影响', '外包影响', '风险影响与应对']) await page.getByLabel(label, { exact: true }).fill('已核对，无新增影响');
  await page.getByLabel('附件文件名', { exact: true }).fill('补充签证.pdf');
  await page.getByRole('button', { name: '登记附件', exact: true }).click();
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByTestId('change-status')).toHaveText('草稿');
  await page.getByText('修订1 · 驳回', { exact: true }).click();
  await expect(page.getByText('客户签证和合同材料需补充', { exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-HS15-revision-history');
  await submit(page);
});

test('筛选和同项目申请隔离，三类原单与只读权限', async ({ page }) => {
  test.setTimeout(180_000);
  const first = await draft(page, 'UI变更-第一份');
  const second = await draft(page, 'UI变更-第二份');
  await open(page, first);
  await page.getByLabel('变更标题', { exact: true }).fill('不应串入第二份的草稿');
  await page.getByLabel('附件文件名', { exact: true }).fill('未登记.pdf');
  await open(page, second);
  await expect(page.getByLabel('变更标题', { exact: true })).toHaveValue('UI变更-第二份');
  await expect(page.getByLabel('附件文件名', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: '返回台账', exact: true }).click();
  await expect(page.getByRole('heading', { name: '项目变更台账', exact: true })).toBeVisible();
  for (const [label, value] of [['筛选项目', 'P-001'], ['筛选变更状态', '草稿']]) {
    await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: value }).click();
  }
  await page.getByLabel('变更搜索', { exact: true }).fill('UI变更');
  expect(new URL(page.url()).searchParams.get('projectId')).toBe('P-001');
  expect(new URL(page.url()).searchParams.get('status')).toBe('草稿');
  await capturePageEvidence(page, 'UI-HS14-filtered');
  await page.getByRole('row').filter({ hasText: 'UI变更-第二份' }).getByRole('button', { name: '原单与对比', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('changeId')).toBe(second);
  await submit(page);
  await role(page, 'PMO负责人'); await open(page, second);
  await page.getByLabel('变更处理意见', { exact: true }).fill('不应串入第一份的意见');
  await page.getByRole('button', { name: '否决 / 退回补充', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '确认退回，保留当前生效基线', exact: true })).toBeVisible();
  await open(page, first);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('变更处理意见', { exact: true })).toHaveValue('');
  const data = await state(page);
  const historical = data.changes.find(c => !data.changeRequests.some(r => r.id === c.id) && !data.approvals.some(a => a.sourceChangeId === c.id))!;
  await navigate(page, `/project-changes?q=${encodeURIComponent(historical.code)}`);
  await page.getByRole('button', { name: '原单与对比', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: '历史变更记录', exact: true });
  await expect(drawer).toContainText(historical.code);
  await drawer.locator('.ant-drawer-close').click(); await expect(drawer).toBeHidden();
  const approval = data.approvals.find(a => a.sourceChangeId && !data.changeRequests.some(r => r.id === a.sourceChangeId))!;
  const summary = data.changes.find(c => c.id === approval.sourceChangeId)!;
  await navigate(page, `/project-changes?q=${encodeURIComponent(summary.code)}`);
  await page.getByRole('button', { name: '原单与对比', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/approvals/${approval.id}`));
  await role(page, '集团领导'); await open(page, second);
  await expect(page.getByLabel('变更标题', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '提交专业评估', exact: true })).toBeDisabled();
  await capturePageEvidence(page, 'UI-HS15-readonly');
  await navigate(page, `/project-changes/new?projectId=${data.lockedProjects[0]}`);
  await expect(page.getByText('建设期成本已结算锁定', { exact: true })).toBeVisible();
  await expect(page.getByLabel('变更标题', { exact: true })).toBeDisabled();
  await navigate(page, '/project-changes/new?changeId=UNKNOWN');
  await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
});
