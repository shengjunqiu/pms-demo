import { beforeAll, expect, it } from 'vitest';
import { AS_OF_DATE } from '@/mock';
import { createBusinessState, createDemoBusinessState, transition, type Actor, type BusinessState } from '@/mock/business-domain';
import { defaultChangeInput, proposeChange } from '@/mock/changes';
import { startupChecks } from '@/mock/unsigned';

const id = 'P-PLAN-001';
const pm: Actor = { id: 'U-001', name: '张建国', role: 'project-manager' };
const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
const experts: Actor[] = [{ id: 'U-005', name: '赵工', role: 'solution-tech' }, finance, { id: 'U-006', name: '陈亮', role: 'market' }];
beforeAll(() => { createDemoBusinessState(); });

function ready() {
  let s = createBusinessState();
  const p = s.projects.find(p => p.id === id)!;
  const plan = s.planningDrafts[id];
  const priorStart = plan.plannedStartDate;
  p.plannedStartDate = plan.plannedStartDate = '2026-09-10';
  plan.tasks.forEach(t => { if (t.startDate === priorStart) t.startDate = p.plannedStartDate; });
  plan.milestones.forEach(m => { if (m.plannedDate === priorStart) m.plannedDate = p.plannedStartDate; });
  plan.resources.forEach(r => { r.startDate = p.plannedStartDate; });
  s.projectTeams[id].members.forEach(r => { r.startDate = p.plannedStartDate; });
  s = transition(s, { type: 'submit-planning', projectId: id }, pm);
  s = transition(s, { type: 'review-planning', id: 'PREVIEW-1', result: '通过', opinion: '范围与资源完整', rectifications: [] }, pmo);
  const budget = { ...s.budgets[0], id: 'DRAFT', projectId: id, totalAmount: 600, items: [{ subjectId: 'SUB-01', subjectName: '人力', amount: 600 }] };
  s = transition(s, { type: 'submit-budget', projectId: id, budget, reason: '首次预算' }, pm);
  for (const actor of [finance, pmo]) s = transition(s, { type: 'review', approvalId: 'APR-1', approve: true, opinion: '按节点通过' }, actor);
  s = transition(s, { type: 'confirm-budget-baseline', approvalId: 'APR-1' }, pmo);
  s = transition(s, { type: 'confirm-project-contract', projectId: id, source: '虚拟演示登记', registration: {
    code: 'TEST-START-CHANGE', name: '模拟合同', amount: 1200, signDate: AS_OF_DATE, acceptanceDueDate: '2026-12-31',
    source: '虚拟测试', attachment: '模拟依据.md', receiptPlans: [{ title: '合同款', dueDate: '2026-12-31', amount: 1200 }],
  } }, experts[2]);
  return s;
}

function input(s: BusinessState) {
  return { ...defaultChangeInput(s, id), title: '启动提前一日', reason: '当日模拟签约后按批准变更启动', plannedStartDate: AS_OF_DATE,
    customerBasis: '虚拟客户启动安排', contractBasis: '模拟合同约定', attachments: ['变更依据.md'], risk: '保留原风险跟踪', procurementImpact: '不增加采购', outsourceImpact: '不增加外包' };
}
function reviewed(s: BusinessState) {
  const requestId = s.changeRequests.at(-1)!.id;
  for (let i = 0; i < experts.length; i++) s = transition(s, { type: 'assess-project-change', id: requestId, area: (['技术', '财务', '市场'] as const)[i], opinion: '已核对本专业影响' }, experts[i]);
  return transition(s, { type: 'classify-project-change', id: requestId, opinion: '无预算增加、提前一天，按规则由PMO审批' }, pmo);
}

it('开工日变更审批前无效，审批后四基线一致，旧版、预算及执行事实保留并可当日启动', () => {
  const initial = ready();
  const oldBase = structuredClone(initial.baselines.find(b => b.projectId === id && b.status === '已生效')!);
  let s = transition(initial, { type: 'save-project-change', projectId: id, input: input(initial) }, pm);
  const requestId = s.changeRequests.at(-1)!.id;
  expect(s.projects.find(p => p.id === id)?.plannedStartDate).toBe('2026-09-10');
  expect(s.changes.find(c => c.id === requestId)?.scheduleImpactDays).toBe(-1);
  s = transition(s, { type: 'submit-project-change', id: requestId }, pm);
  expect(() => transition(s, { type: 'review-project-change', id: requestId, approve: true, opinion: '跳过评估' }, pmo)).toThrow('评估');
  s = reviewed(s);
  s = transition(s, { type: 'review-project-change', id: requestId, approve: true, opinion: '批准开工提前一日' }, pmo);
  const p = s.projects.find(p => p.id === id)!;
  const base = s.baselines.find(b => b.projectId === id && b.status === '已生效')!;
  expect(p.plannedStartDate).toBe(AS_OF_DATE);
  expect(p.plannedEndDate).toBe(oldBase.plannedEndDate);
  expect(base.snapshot?.plannedStartDate).toBe(AS_OF_DATE);
  expect(s.planningDrafts[id].plannedStartDate).toBe(AS_OF_DATE);
  expect(base.snapshot?.tasks).toEqual(s.tasks.filter(t => t.projectId === id));
  expect(base.snapshot?.resources).toEqual(s.projectTeams[id].members);
  expect(base.snapshot?.resources.every(r => r.startDate === AS_OF_DATE)).toBe(true);
  expect(base.snapshot?.tasks.map(t => t.plannedHours)).toEqual(oldBase.snapshot?.tasks.map(t => t.plannedHours));
  expect(base.budgetAmount).toBe(oldBase.budgetAmount);
  expect(s.costs).toEqual(initial.costs);
  expect(s.baselines.find(b => b.id === oldBase.id)?.snapshot).toEqual(oldBase.snapshot);
  expect(base.snapshot?.milestones.find(m => m.type === '启动')?.plannedDate).toBe(AS_OF_DATE);
  expect(base.snapshot?.milestones.filter(m => m.type !== '启动')).toEqual(oldBase.snapshot?.milestones.filter(m => m.type !== '启动'));
  expect(startupChecks(s, p).checks.filter(c => !c.passed)).toEqual([]);
  s = transition(s, { type: 'confirm-project-start', projectId: id, date: AS_OF_DATE, opinion: '按已批准新基线正式启动' }, pm);
  expect(s.startConfirmations[id].date).toBe(AS_OF_DATE);
  expect(s.projects.find(p => p.id === id)?.phase).toBe('执行');
});

it('非法日期、周期冲突及与整体顺延混用均阻断；预览不修改原数据', () => {
  const s = ready(); const before = structuredClone(s);
  for (const patch of [{ plannedStartDate: '2026-02-30' }, { plannedStartDate: '2027-01-01' }, { shiftDays: -1 }]) {
    expect(() => proposeChange(s, id, { ...input(s), ...patch })).toThrow();
  }
  expect(s).toEqual(before);
});

it('已有实际执行以及评估期间出现实际执行，均不能重写批准开工日', () => {
  const s = ready(); s.tasks.find(t => t.projectId === id)!.actualStartDate = AS_OF_DATE;
  expect(() => proposeChange(s, id, input(s))).toThrow('实际执行');
  let pending = ready(); pending = transition(pending, { type: 'save-project-change', projectId: id, input: input(pending) }, pm);
  const requestId = pending.changeRequests.at(-1)!.id;
  pending = transition(pending, { type: 'submit-project-change', id: requestId }, pm); pending = reviewed(pending);
  pending.projects.find(p => p.id === id)!.actualStartDate = AS_OF_DATE;
  expect(() => transition(pending, { type: 'review-project-change', id: requestId, approve: true, opinion: '批准' }, pmo)).toThrow('实际执行');
});

it('大幅提前开工仍进入高阶审批，旧版整体顺延保持原语义', () => {
  const s = ready();
  expect(proposeChange(s, id, { ...input(s), plannedStartDate: '2026-08-01' }).reasons).toContain('工期影响≥30天');
  const old = proposeChange(s, id, { ...input(s), plannedStartDate: undefined, shiftDays: 1 });
  expect(old.proposed.plannedStartDate).toBe('2026-09-10');
  expect(old.proposed.plannedEndDate).toBe('2027-01-01');
});
