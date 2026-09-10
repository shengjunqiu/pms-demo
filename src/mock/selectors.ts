import { mockProjects, mockDepartments, mockCustomers, mockContracts, mockCostItems, mockBudgetVersions, mockEstimateVersions, mockSettlements, mockReceiptPlans, AS_OF_DATE } from '@/mock';
import type { BusinessState } from '@/mock/business';
import type { Project } from '@/models/types';
import type { UserRole } from '@/store/useAppStore';
import { allocateMoney, percentage, sumMoney } from '@/utils/money';
import { projectEstimate } from '@/mock/versions';

export interface ProjectFilter {
  org?: string; orgExact?: string; stage?: string; region?: string; type?: string; level?: string; industry?: string;
  customer?: string; pm?: string; health?: string; from?: string; to?: string; search?: string;
}
export function inOrganization(departmentId: string, root?: string): boolean {
  if (!root || root === 'all') return true;
  const seen = new Set<string>();
  let id: string | undefined = departmentId;
  while (id && !seen.has(id)) {
    if (id === root) return true;
    seen.add(id);
    id = mockDepartments.find((d) => d.id === id)?.parentId;
  }
  return false;
}
export function visibleProjects(role: UserRole, projects = mockProjects): Project[] {
  const all = ['executive', 'pmo', 'finance', 'admin', 'market'];
  const userId = ({ executive: 'U-003', pmo: 'U-002', 'project-manager': 'U-001', market: 'U-006', finance: 'U-004', 'solution-tech': 'U-005', admin: 'U-ADMIN' })[role];
  return projects.filter((p) => all.includes(role) || p.memberIds?.includes(userId) || (role === 'project-manager' ? p.pmId === 'U-001' : inOrganization(p.departmentId, 'D-003')));
}
export function selectProjects(filter: ProjectFilter = {}, role: UserRole = 'executive', projects = mockProjects): Project[] {
  return Array.from(new Map(visibleProjects(role, projects).filter((p) => {
    const customer = mockCustomers.find((c) => c.id === p.customerId);
    return inOrganization(p.departmentId, filter.org)
      && (filter.orgExact !== 'true' || p.departmentId === filter.org)
      && (!filter.stage || fourStage(p) === filter.stage)
      && (!filter.region || customer?.region === filter.region)
      && (!filter.industry || customer?.industry === filter.industry)
      && (!filter.customer || p.customerId === filter.customer)
      && (!filter.type || p.type === filter.type) && (!filter.level || p.level === filter.level)
      && (!filter.pm || p.pmId === filter.pm) && (!filter.health || p.health === filter.health)
      && (!filter.from || p.plannedStartDate >= filter.from) && (!filter.to || p.plannedStartDate <= filter.to)
      && (!filter.search || `${p.id} ${p.name}`.includes(filter.search));
  }).map((p) => [p.id, p])).values());
}
export function fourStage(project: Project) {
  return project.phase === '商机' ? '概算' : project.phase === '立项' ? '预算' : project.phase === '执行' ? '核算' : '结算及运维';
}
export function selectFourCalculations(project: Project, data: Pick<BusinessState, 'estimates' | 'budgets' | 'settlements' | 'costs'> = { estimates: mockEstimateVersions, budgets: mockBudgetVersions, settlements: mockSettlements, costs: mockCostItems }) {
  const estimate = projectEstimate(project, data.estimates);
  const budget = data.budgets.find((v) => v.projectId === project.id && v.status === '已生效');
  const settlement = data.settlements.find((v) => v.projectId === project.id && v.status === '已锁定已生效');
  const costs = data.costs.filter((c) => c.projectId === project.id);
  const weights = (budget?.items ?? []).map((item) => item.amount);
  const allocationWeights = weights.some((w) => w > 0) ? weights : weights.map(() => 1);
  const committed = project.commitmentBySubject ? (budget?.items ?? []).map((item) => project.commitmentBySubject![item.subjectId] ?? 0) : allocationWeights.length ? allocateMoney(project.committedCost, allocationWeights) : [];
  const remaining = allocationWeights.length ? allocateMoney(project.forecastRemainingCost, allocationWeights) : [];
  const subjects = (budget?.items ?? []).map((item, index) => {
    const actual = sumMoney(costs.filter((c) => c.subjectId === item.subjectId).map((c) => c.amount));
    const rolling = sumMoney([actual, committed[index], remaining[index]]);
    return { ...item, estimate: estimate?.items.find((e) => e.subjectId === item.subjectId)?.amount ?? 0,
      budget: item.amount, actual, committed: committed[index], remaining: remaining[index], rolling,
      variance: sumMoney([rolling, -item.amount]) };
  });
  const actual = sumMoney(costs.map((c) => c.amount));
  const rolling = sumMoney([actual, project.committedCost, project.forecastRemainingCost]);
  const income = project.revenueAmount ?? project.contractAmount;
  const grossMargin = sumMoney([income, -rolling]);
  return { estimate, budget, settlement, subjects, costs, actual, rolling, income, grossMargin,
    grossMarginRate: percentage(grossMargin, income), variance: sumMoney([rolling, -(budget?.totalAmount ?? 0)]) };
}
export function selectReceipts(projects: Project[], data: Pick<BusinessState, 'contracts' | 'receiptPlans'> = { contracts: mockContracts, receiptPlans: mockReceiptPlans }) {
  const ids = new Set(projects.filter((p) => !p.isUnsigned).map((p) => p.id));
  const contracts = Array.from(new Map(data.contracts.filter((c) => ids.has(c.projectId) && c.status !== '已终止').map((c) => [c.id, c])).values());
  const signed = sumMoney(contracts.map((c) => c.amount));
  const paid = sumMoney(contracts.map((c) => c.paidAmount));
  const contractIds = new Set(contracts.map((contract) => contract.id));
  const plans = Array.from(new Map(data.receiptPlans.filter((plan) => ids.has(plan.projectId) && contractIds.has(plan.contractId)).map((plan) => [plan.id, plan])).values());
  const duePlans = plans.filter((p) => p.dueDate <= AS_OF_DATE);
  const due = sumMoney(duePlans.map((p) => p.amount));
  const overdue = sumMoney(duePlans.map((p) => Math.max(0, p.amount - p.paidAmount)));
  return { contracts, plans, due, overdue, dueCompletion: percentage(sumMoney(duePlans.map((p) => p.paidAmount)), due), signed, paid, outstanding: sumMoney([signed, -paid]), completion: percentage(paid, signed) };
}
