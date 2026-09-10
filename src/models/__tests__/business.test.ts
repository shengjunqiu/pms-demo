import { describe, it, expect } from 'vitest';
import { createBusinessState, createDemoBusinessState, transition, type Actor } from '@/mock/business';
import { mockProjects } from '@/mock';
import { selectProjects, selectFourCalculations, selectReceipts } from '@/mock/selectors';
import { calculateCockpitKPIs } from '@/utils/calculator';
import { assessHealth } from '@/utils/health';
import { sumMoney } from '@/utils/money';

const pm: Actor = { id: 'U-001', name: '张建国', role: 'project-manager' };
const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
const leader: Actor = { id: 'U-003', name: '王总', role: 'executive' };
const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };

describe('经营聚合与样本一致性', () => {
  it('同一组织子树包含下属部门，权限先于用户筛选，重复项目只计一次', () => {
    const rows = selectProjects({ org: 'D-002' });
    expect(rows.some((p) => p.id === 'P-001')).toBe(true);
    expect(selectProjects({ org: 'D-001' }, 'project-manager').every((p) => p.pmId === pm.id)).toBe(true);
    expect(selectProjects({}, 'executive', [...rows, ...rows])).toEqual(rows);
    const kpi = calculateCockpitKPIs(rows);
    expect(kpi.totalContractAmount).toBeCloseTo(selectReceipts(rows).signed, 6);
    expect(kpi.weightedGrossMarginRate).toBeCloseTo(kpi.totalGrossMargin / kpi.totalRevenue * 100, 5);
  });
  it('四算科目可复算，未结算为空，P-001毛利及成本偏差符合故事', () => {
    const data = selectFourCalculations(mockProjects[0]);
    expect(data.settlement).toBeUndefined();
    expect(data.grossMargin).toBe(2552.1);
    expect(data.variance).toBe(138.5);
    expect(sumMoney(data.subjects.map((s) => s.rolling))).toBe(data.rolling);
    expect(sumMoney(data.subjects.map((s) => s.budget))).toBe(data.budget?.totalAmount);
    expect(selectFourCalculations(mockProjects[7]).settlement?.finalCost).toBe(1390);
  });
  it('健康规则不依赖项目编号，严重因素不被低级因素覆盖', () => {
    const renamed = { ...mockProjects[0], id: 'NEW-PROJECT', rollingCost: 5000 };
    expect(assessHealth(renamed).level).toBe('red');
    expect(assessHealth(mockProjects[0], { delayDays: 40 }).level).toBe('red');
    expect(assessHealth(mockProjects[0]).level).toBe('yellow');
  });
});

describe('审批、权限及成本锁定', () => {
  it('固定数据重建完全相同，状态修改不污染下一次演示', () => {
    const first = createBusinessState(); const second = createBusinessState();
    expect(first).toEqual(second);
    first.projects[0].name = '临时演示修改';
    expect(createBusinessState()).toEqual(second);
  });
  it('超概算由真实金额判定；原因必填；原概算变化不改写提交快照；通过追加版本并更新原决策', () => {
    const original = createBusinessState();
    const draft = { ...original.budgets[0], totalAmount: 4000, items: [{ subjectId: 'SUB-01', subjectName: '人力', amount: 4000 }], isOverEstimate: false };
    expect(() => transition(original, { type: 'submit-budget', projectId: 'P-001', budget: draft, reason: '' }, pm)).toThrow('原因');
    let state = transition(original, { type: 'submit-budget', projectId: 'P-001', budget: draft, reason: '增加跨区交付范围' }, pm);
    expect(state.approvals[0].requiredRole).toBe('executive');
    const quotedEstimate = state.approvals[0].estimate.totalCost;
    state.estimates[0].totalCost = 9999;
    expect(state.approvals[0].estimate.totalCost).toBe(quotedEstimate);
    expect(() => transition(state, { type: 'review', approvalId: 'APR-1', approve: true, opinion: '同意' }, pmo)).toThrow('角色');
    state = transition(state, { type: 'review', approvalId: 'APR-1', approve: true, opinion: '同意追加范围及预算' }, leader);
    expect(state.projects[0].budgetAmount).toBe(original.projects[0].budgetAmount);
    state = transition(state, {type:'confirm-budget-baseline',approvalId:'APR-1'}, pmo);
    expect(state.projects[0].budgetAmount).toBe(4000);
    expect(selectFourCalculations(state.projects[0], state).budget?.totalAmount).toBe(4000);
    expect(state.baselines).toHaveLength(original.baselines.length + 1);
    expect(original.projects[0].budgetAmount).toBe(2847.7);
    expect(state.baselines[0].budgetAmount).toBe(original.baselines[0].budgetAmount);
    expect(state.decisions.find((d) => d.id === 'APR-1')?.status).toBe('已通过');
    expect(() => transition(state, { type: 'review', approvalId: 'APR-1', approve: true, opinion: '重复' }, leader)).toThrow('已处理');
  });
  it('驳回不改变生效基线，失败动作不产生部分写入', () => {
    const original = createBusinessState();
    const pending = transition(original, { type: 'submit-budget', projectId: 'P-001', budget: original.budgets[0], reason: '计划调整' }, pm);
    expect(pending.approvals[0].budget.overEstimateReasons?.length).toBeGreaterThan(0);
    const result = transition(pending, { type: 'review', approvalId: 'APR-1', approve: false, opinion: '补充交付范围' }, leader);
    expect(result.baselines).toEqual(original.baselines);
    expect(result.projects[0].budgetAmount).toBe(original.projects[0].budgetAmount);
    expect(original.approvals).toHaveLength(0);
  });
  it('BUG仅发起人确认，问题仅所属主PM关闭，风险转问题保留来源且防重复', () => {
    let state = createBusinessState();
    state.issues[0].status = '已解决';
    expect(() => transition(state, { type: 'close-issue', id: state.issues[0].id }, leader)).toThrow('角色');
    state = transition(state, { type: 'close-issue', id: state.issues[0].id }, pm);
    expect(state.issues[0].status).toBe('已关闭');
    expect(() => transition(state, { type: 'close-bug', id: state.bugs[0].id }, pm)).toThrow('发起人');
    state = transition(state, { type: 'close-bug', id: state.bugs[0].id }, { ...pm, name: state.bugs[0].creator });
    expect(state.bugs[0].status).toBe('已关闭');
    const riskId = state.risks[0].id;
    state = transition(state, { type: 'risk-to-issue', id: riskId }, pm);
    expect(state.risks[0].status).toBe('已转问题');
    expect(state.issues.find((i) => i.fromRiskId === riskId)?.projectId).toBe('P-001');
    expect(() => transition(state, { type: 'risk-to-issue', id: riskId }, pm)).toThrow('已处理');
  });
  it('阶段门缺材料/待审核/里程碑未完成均阻断；满足后实际进入收尾', () => {
    const state = createBusinessState();
    state.projects[0].progressRate = 100;
    state.tasks.filter((t) => t.projectId === 'P-001').forEach((t) => { t.progress = 100; });
    expect(() => transition(state, { type: 'stage-gate', projectId: 'P-001' }, pmo)).toThrow('材料');
    state.materials.filter((m) => m.projectId === 'P-001').forEach((m) => { m.status = '待审核'; });
    expect(() => transition(state, { type: 'stage-gate', projectId: 'P-001' }, pmo)).toThrow('材料');
    state.materials.filter((m) => m.projectId === 'P-001').forEach((m) => { m.status = '通过'; });
    const milestone = state.milestones.find((m) => m.projectId === 'P-001' && m.type === '开发完成')!;
    milestone.status = '未达成';
    expect(() => transition(state, { type: 'stage-gate', projectId: 'P-001' }, pmo)).toThrow('里程碑');
    milestone.status = '已达成';
    expect(transition(state, { type: 'stage-gate', projectId: 'P-001' }, pmo).projects[0].phase).toBe('收尾');
  });
  it('承诺结转实际不增加滚动成本，前期来源防重复，未签超额度阻断', () => {
    const original = createBusinessState();
    const cost = { ...original.costs[0], id: 'NEW-COST', sourceId: 'EARLY-001', amount: 50 };
    const state = transition(original, { type: 'confirm-cost', cost, fromCommitment: true }, finance);
    expect(state.projects[0].rollingCost).toBe(original.projects[0].rollingCost);
    expect(state.projects[0].actualCost).toBe(1700);
    expect(state.projects[0].committedCost).toBe(786.2);
    expect(() => transition(state, { type: 'confirm-cost', cost: { ...cost, id: 'ANOTHER' } }, finance)).toThrow('重复');
    expect(() => transition(state, { type: 'confirm-cost', cost: { ...cost, id: 'UNSIGNED-COST', projectId: 'P-004', sourceId: 'NEW', amount: 100 } }, finance)).toThrow('额度');
  });
  it('旧直接结算入口不可绕过客户确认与正式评审', () => {
    const original = createBusinessState();
    expect(() => transition(original, { type: 'settle', projectId: 'P-001' }, finance)).toThrow('项目结算申请');
    expect(original.lockedProjects).not.toContain('P-001');
  });
});


describe('领导待决策与到期回款', () => {
  it('每条决策关联真实审批快照；审批后原事项及当前预算联动，历史记录仍可读取', () => {
    const initial = createDemoBusinessState();
    expect(initial.decisions).toHaveLength(49);
    expect(initial.decisions.filter((d) => d.status === '待决策')).toHaveLength(19);
    for (const decision of initial.decisions.filter((d) => d.targetRoute.startsWith('/approvals/'))) {
      const approval = initial.approvals.find((a) => a.id === decision.id)!;
      expect(approval.projectId).toBe(decision.projectId);
      expect(decision.targetRoute).toBe(`/approvals/${approval.id}`);
      expect(sumMoney(approval.budget.items.map((i) => i.amount))).toBe(approval.budget.totalAmount);
    }
    const pending = initial.approvals.find((a) => a.status === '待审批')!;
    let next = transition(initial, { type: 'review', approvalId: pending.id, approve: true, opinion: '同意所引版本和交付范围' }, leader);
    expect(next.decisions.filter((d) => d.status === '待决策')).toHaveLength(18);
    expect(next.projects.find((p) => p.id === pending.projectId)?.budgetAmount).toBe(initial.projects.find(p=>p.id===pending.projectId)?.budgetAmount);
    next = transition(next,{type:'confirm-budget-baseline',approvalId:pending.id},pmo);
    expect(next.projects.find((p) => p.id === pending.projectId)?.budgetAmount).toBe(pending.budget.totalAmount);
    expect(pending.status).toBe('待审批');
    const second = initial.approvals.find((a) => a.projectId === 'P-003')!;
    const imported = { ...initial, baselines: initial.baselines.filter((b) => b.projectId !== 'P-003' || b.status === '已生效') };
    let upgraded = transition(imported, { type: 'review', approvalId: second.id, approve: true, opinion: '按引用版本批准' }, leader);
    upgraded=transition(upgraded,{type:'confirm-budget-baseline',approvalId:second.id},pmo);
    expect(upgraded.projects.find((p) => p.id === 'P-003')?.currentBaselineVersion).toBe('V3.0');
    expect(new Set(upgraded.baselines.filter((b) => b.projectId === 'P-003').map((b) => b.version)).size).toBe(2);
  });
  it('到期回款只使用计划，不把未到期合同余额算成逾期，未签不产生合同计划', () => {
    const p1 = selectReceipts([mockProjects[0]]);
    expect(p1.overdue).toBe(0);
    expect(p1.outstanding).toBeGreaterThan(0);
    expect(sumMoney(p1.plans.map((p) => p.amount))).toBe(p1.signed);
    expect(p1.dueCompletion).toBe(100);
    expect(selectReceipts([mockProjects[1]]).overdue).toBeGreaterThan(0);
    expect(selectReceipts([mockProjects[3]]).plans).toHaveLength(0);
    expect(selectReceipts([]).dueCompletion).toBeNull();
  });
});

 it('管理审批联动原事项但不跳过风险、终验和结算流程；未签审批只变更额度', () => {
    const initial = createDemoBusinessState();
    expect(new Set(initial.decisions.map((d) => d.type)).size).toBe(6);
    let next = initial;
    for (const item of initial.managementApprovals) {
      expect(() => transition(next, { type: 'review-management', id: item.id, approve: true, opinion: '' }, leader)).toThrow();
      next = transition(next, { type: 'review-management', id: item.id, approve: true, opinion: '同意专项方案，按原流程跟踪' }, leader);
      expect(next.decisions.find((d) => d.id === item.id)?.status).toBe('已通过');
      expect(() => transition(next, { type: 'review-management', id: item.id, approve: true, opinion: '重复' }, leader)).toThrow();
    }
    expect(next.risks).toEqual(initial.risks);
    expect(next.acceptances).toEqual(initial.acceptances);
    expect(next.settlements).toEqual(initial.settlements);
    expect(next.projects.find((p) => p.id === 'P-004')?.unsignedLimitQuota).toBe((initial.projects.find((p) => p.id === 'P-004')?.unsignedLimitQuota ?? 0) + 80);
    expect(next.projects.map((p) => p.actualCost)).toEqual(initial.projects.map((p) => p.actualCost));
    const change = initial.approvals.find((a) => a.kind === 'change')!;
    const changed = transition(initial, { type: 'review', approvalId: change.id, approve: true, opinion: '同意成本变更' }, leader);
    expect(changed.changes.find((c) => c.id === change.sourceChangeId)?.newBaselineId).toBe(`BASE-${change.id}`);
  });
