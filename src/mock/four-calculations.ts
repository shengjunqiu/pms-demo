import { mockEstimateVersions, mockBudgetVersions, mockSettlements, mockCostItems } from '@/mock';
import type { BusinessState } from '@/mock/business';
import type { Project } from '@/models/types';
import { allocateMoney, percentage, sumMoney } from '@/utils/money';
import { CANONICAL_SUBJECTS } from '@/mock/configuration-finance';
import { projectEstimate } from '@/mock/versions';

export function fourStage(project: Project) {
  return project.phase === '商机' ? '概算' : project.phase === '立项' ? '预算' : project.phase === '执行' ? '核算' : '结算及运维';
}

export function selectFourCalculations(project: Project, data: Pick<BusinessState, 'estimates' | 'budgets' | 'settlements' | 'costs'> = { estimates: mockEstimateVersions, budgets: mockBudgetVersions, settlements: mockSettlements, costs: mockCostItems }) {
  const estimate = projectEstimate(project, data.estimates);
  const budget = data.budgets.find((v) => v.projectId === project.id && v.status === '已生效');
  const settlement = data.settlements.find((v) => v.projectId === project.id && v.status === '已锁定已生效');
  const costs = data.costs.filter((c) => c.projectId === project.id);
  // A project awaiting its first budget still has estimate/cost subjects. Preserve every leaf.
  const subjectIds = [...new Set([...(budget?.items ?? []).map(i=>i.subjectId), ...(estimate?.items ?? []).map(i=>i.subjectId), ...costs.map(i=>i.subjectId), ...Object.keys(project.commitmentBySubject ?? {}), ...Object.keys(project.forecastBySubject ?? {})])];
  const leafItems = subjectIds.map(subjectId=>({subjectId, subjectName: budget?.items.find(i=>i.subjectId===subjectId)?.subjectName ?? estimate?.items.find(i=>i.subjectId===subjectId)?.subjectName ?? costs.find(i=>i.subjectId===subjectId)?.subjectName ?? CANONICAL_SUBJECTS.find(s=>s.id===subjectId)?.name ?? subjectId, amount:budget?.items.find(i=>i.subjectId===subjectId)?.amount ?? 0}));
  const weights = leafItems.map((item) => item.amount);
  const allocationWeights = weights.some((w) => w > 0) ? weights : weights.map(() => 1);
  const committed = project.commitmentBySubject ? leafItems.map((item) => project.commitmentBySubject![item.subjectId] ?? 0) : allocationWeights.length ? allocateMoney(project.committedCost, allocationWeights) : [];
  const remaining = project.forecastBySubject ? leafItems.map((item) => project.forecastBySubject![item.subjectId] ?? 0) : allocationWeights.length ? allocateMoney(project.forecastRemainingCost, allocationWeights) : [];
  const subjects = leafItems.map((item, index) => {
    const actual = sumMoney(costs.filter((c) => c.subjectId === item.subjectId).map((c) => c.amount));
    const rolling = sumMoney([actual, committed[index], remaining[index]]);
    return { ...item, estimate: estimate?.items.find((e) => e.subjectId === item.subjectId)?.amount ?? 0,
      budget: item.amount, actual, committed: committed[index], remaining: remaining[index], rolling,
      variance: sumMoney([rolling, -item.amount]) };
  });
  const actual = sumMoney(costs.map((c) => c.amount));
  const rolling = sumMoney([actual, project.committedCost, project.forecastRemainingCost]);
  const income = project.revenueAmount ?? project.contractAmount ?? 0;
  const grossMargin = sumMoney([income, -rolling]);
  return { estimate, budget, settlement, subjects, costs, actual, rolling, income, grossMargin,
    grossMarginRate: percentage(grossMargin, income), variance: sumMoney([rolling, -(budget?.totalAmount ?? 0)]), costVarianceRate: percentage(sumMoney([rolling, -(budget?.totalAmount ?? 0)]), budget?.totalAmount ?? 0) };
}