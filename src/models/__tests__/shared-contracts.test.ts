import { describe, expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business';
import { projectEstimate } from '@/mock/versions';
import { selectFourCalculations, selectReceipts } from '@/mock/selectors';
import { projectExceptions } from '@/mock/exceptions';

const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };

describe('并发业务域共享契约', () => {
  it('项目绑定概算ID，新增和重排冻结版本不改变既有项目或提交快照', () => {
    const state = createBusinessState();
    const project = state.projects[0];
    const original = projectEstimate(project, state.estimates)!;
    state.estimates.unshift({ ...structuredClone(original), id: 'EST-LATER', version: 'V9.0', totalCost: original.totalCost + 20 });
    expect(selectFourCalculations(project, state).estimate?.id).toBe(original.id);
    expect(projectEstimate({ ...project, frozenEstimateVersionId: undefined }, state.estimates)).toBeUndefined();
    expect(projectEstimate({ ...project, frozenEstimateVersionId: 'missing' }, state.estimates)).toBeUndefined();
    const budget = state.budgets.find((value) => value.projectId === project.id && value.status === '已生效')!;
    const submitted = transition(state, { type: 'submit-budget', projectId: project.id, budget, reason: '按绑定概算提交' }, finance);
    expect(submitted.approvals[0].estimate.id).toBe(original.id);
    original.totalCost += 100;
    expect(submitted.approvals[0].estimate.totalCost).not.toBe(original.totalCost);
  });

  it('临时结算冻结阻断工时、采购/外包/费用、预算和直接成本确认，并保留原状态', () => {
    const state = createBusinessState();
    state.constructionFreezes['P-001'] = { requestId: 'SET-APPLICATION-1', reason: '结算审核中' };
    const snapshot = structuredClone(state);
    const budget = state.budgets.find((value) => value.projectId === 'P-001' && value.status === '已生效')!;
    expect(() => transition(state, { type: 'submit-budget', projectId: 'P-001', budget, reason: '追加预算' }, finance)).toThrow(/冻结/);
    expect(() => transition(state, { type: 'submit-labor', projectId: 'P-001', taskId: 'TSK-0001', date: '2026-09-09', hours: 4, description: '实施工作' }, pm)).toThrow(/冻结/);
    for (const kind of ['procurement', 'outsource', 'expense'] as const) {
      expect(() => transition(state, { type: 'submit-cost-order', projectId: 'P-001', kind, subjectId: 'SUB-03', title: '采购实施材料', amount: 1, supplier: '供应商', contractNo: 'PO-NEW', scope: '实施范围', dueDate: '2026-09-15' }, pm)).toThrow(/冻结/);
    }
    const cost = { ...state.costs[0], id: 'COST-NEW', projectId: 'P-001', sourceId: 'SOURCE-NEW', amount: 1 };
    expect(() => transition(state, { type: 'confirm-cost', cost }, finance)).toThrow(/冻结/);
    expect(state).toEqual(snapshot);
  });

  it('审核前重新检查冻结，已有待审工时和采购不能穿透结算申请', () => {
    let state = transition(createBusinessState(), { type: 'submit-labor', projectId: 'P-001', taskId: 'TSK-0001', date: '2026-09-09', hours: 4, description: '实施工作' }, pm);
    state.constructionFreezes['P-001'] = { requestId: 'SET-APPLICATION-2', reason: '财务核算' };
    expect(() => transition(state, { type: 'review-labor', id: state.laborEntries[0].id, approve: true, opinion: '审核工时' }, pm)).toThrow(/冻结/);
    state = createBusinessState();
    state.costOrders.push({ id: 'CO-PENDING', projectId: 'P-001', kind: 'procurement', subjectId: 'SUB-03', subjectName: '采购', title: '设备采购', amount: 1, supplier: '供应商', contractNo: 'PO-PENDING', scope: '实施范围', baselineId: state.baselines[0].id, dueDate: '2026-09-15', applicant: pm.name, applicantId: pm.id, submittedAt: '2026-09-09', status: '待审批', progress: 0, recognized: 0, history: [] });
    state.constructionFreezes['P-001'] = { requestId: 'SET-APPLICATION-3', reason: '审核中' };
    expect(() => transition(state, { type: 'process-cost-order', id: 'CO-PENDING', operation: 'approve', note: '审批' }, finance)).toThrow(/冻结/);
  });

  it('回款分析与异常中心消费当前统一状态，终止合同及重复计划不重复计算', () => {
    const state = createBusinessState();
    const project = state.projects.find((value) => value.id === 'P-002')!;
    expect(selectReceipts([project], state).overdue).toBeGreaterThan(0);
    state.receiptPlans.filter((plan) => plan.projectId === project.id).forEach((plan) => { plan.paidAmount = plan.amount; });
    const contract = state.contracts.find((value) => value.projectId === project.id)!;
    contract.paidAmount = contract.amount; contract.unpaidAmount = 0;
    expect(selectReceipts([project], state).overdue).toBe(0);
    expect(projectExceptions([project], state, true)[0].overdueReceipt).toBe(0);
    const previous = selectReceipts([project], state);
    state.receiptPlans.push(structuredClone(state.receiptPlans.find((plan) => plan.projectId === project.id)!));
    expect(selectReceipts([project], state).due).toBe(previous.due);
    contract.status = '已终止';
    expect(selectReceipts([project], state).plans).toHaveLength(0);
    expect(selectReceipts([project], state).signed).toBe(0);
  });
});
