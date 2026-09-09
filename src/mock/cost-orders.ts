import { AS_OF_DATE } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import { selectFourCalculations } from '@/mock/selectors';
import { money, sumMoney, percentage } from '@/utils/money';

export type CostOrderKind = 'procurement' | 'outsource' | 'expense';
export const costOrderLabels = { procurement: '采购', outsource: '外包', expense: '费用' };
export const costOrderPaths = { procurement: 'procurement', outsource: 'outsourcing', expense: 'expenses' };
export interface CostOrder {
  id: string; projectId: string; kind: CostOrderKind; subjectId: string; subjectName: string; title: string; amount: number;
  supplier: string; contractNo: string; scope: string; taskId?: string; baselineId: string; dueDate: string;
  applicant: string; applicantId: string; submittedAt: string; status: '待审批' | '驳回' | '已批准' | '验收通过' | '已入账';
  progress: number; acceptance?: string; recognized: number; history: { date: string; actor: string; action: string; note: string }[];
}
export type CostOrderAction = { type: 'submit-cost-order'; projectId: string; kind: CostOrderKind; subjectId: string; title: string; amount: number; supplier: string; contractNo: string; scope: string; taskId?: string; dueDate: string }
 | { type: 'process-cost-order'; id: string; operation: 'approve' | 'reject' | 'progress' | 'accept' | 'book'; note: string; progress?: number };
export const isCostSubject = (kind: CostOrderKind, id: string) => kind === 'procurement' ? id === 'SUB-03' : kind === 'outsource' ? id === 'SUB-02' : id.startsWith('SUB-04-');
export function costAvailability(state: BusinessState, projectId: string, subjectId: string, excludeId?: string) {
  const p = state.projects.find((p) => p.id === projectId)!; const subject = selectFourCalculations(p, state).subjects.find((s) => s.subjectId === subjectId);
  const pending = sumMoney(state.costOrders.filter((o) => o.projectId === projectId && o.subjectId === subjectId && o.status === '待审批' && o.id !== excludeId).map((o) => o.amount));
  return { budget: subject?.budget ?? 0, actual: subject?.actual ?? 0, committed: subject?.committed ?? 0, pending, available: money((subject?.budget ?? 0) - (subject?.actual ?? 0) - (subject?.committed ?? 0) - pending) };
}
export function applyCostOrderAction(state: BusinessState, action: CostOrderAction, actor: Actor) {
  const existing = action.type === 'process-cost-order' ? state.costOrders.find((o) => o.id === action.id) : undefined;
  const p = state.projects.find((p) => p.id === (action.type === 'submit-cost-order' ? action.projectId : existing?.projectId));
  if (!p) throw new Error('项目或原申请不存在');
  if (state.lockedProjects.includes(p.id) || ['已关闭', '运维'].includes(p.phase) || ['已终止', '已关闭'].includes(p.status)) throw new Error('建设期已结束或锁定，请使用运维周期费用');
  const pm = actor.role === 'project-manager' && actor.id === p.pmId;
  const checkLimit = (amount: number, subjectId: string, excludeId?: string) => {
    if (amount > costAvailability(state, p.id, subjectId, excludeId).available) throw new Error('科目预算不足，请先完成预算变更审批');
    const pending = sumMoney(state.costOrders.filter((o) => o.projectId === p.id && o.status === '待审批' && o.id !== excludeId).map((o) => o.amount));
    if (p.isUnsigned && p.actualCost + p.committedCost + pending + amount > (p.unsignedLimitQuota ?? 0)) throw new Error('未签投入额度不足，须先追加审批');
  };
  const adjustCommitment = (subjectId: string, delta: number) => {
    p.commitmentBySubject ??= Object.fromEntries(selectFourCalculations(p, state).subjects.map((s) => [s.subjectId, s.committed]));
    p.commitmentBySubject[subjectId] = money((p.commitmentBySubject[subjectId] ?? 0) + delta);
    p.committedCost = sumMoney(Object.values(p.commitmentBySubject));
  };
  if (action.type === 'submit-cost-order') {
    if (!pm && !(action.kind === 'expense' && actor.role === 'solution-tech' && p.memberIds?.includes(actor.id))) throw new Error('仅主PM或项目费用成员可提交');
    const budget = state.budgets.find((b) => b.projectId === p.id && b.status === '已生效'); const baseline = state.baselines.find((b) => b.projectId === p.id && b.status === '已生效');
    const subject = budget?.items.find((s) => s.subjectId === action.subjectId);
    if (!subject || !baseline || !isCostSubject(action.kind, subject.subjectId)) throw new Error('须引用生效基线及对应成本科目');
    if (!Number.isFinite(action.amount) || action.amount <= 0 || money(action.amount) !== action.amount) throw new Error('金额必须大于0且精确到分（万元至多六位小数）');
    if (!action.title.trim() || !action.scope.trim() || !action.supplier.trim()) throw new Error('申请标题、范围/用途和供应商/收款方必填');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(action.dueDate) || !Number.isFinite(Date.parse(action.dueDate)) || action.dueDate < AS_OF_DATE) throw new Error('计划日期不得早于基准日');
    if (action.kind !== 'expense' && (!action.contractNo.trim() || state.costOrders.some((o) => o.contractNo === action.contractNo && o.status !== '驳回'))) throw new Error('合同编号必填且不能重复');
    if (action.kind === 'outsource' && !state.tasks.some((t) => t.id === action.taskId && t.projectId === p.id)) throw new Error('外包必须引用本项目WBS范围');
    checkLimit(action.amount, action.subjectId);
    state.costOrders.push({ id: `CO-${state.costOrders.length + 1}`, projectId: p.id, kind: action.kind, subjectId: subject.subjectId, subjectName: subject.subjectName, title: action.title.trim(), amount: action.amount, supplier: action.supplier.trim(), contractNo: action.kind === 'expense' ? '费用申请，无采购合同' : action.contractNo.trim(), scope: action.scope.trim(), taskId: action.taskId, baselineId: baseline.id, dueDate: action.dueDate, applicant: actor.name, applicantId: actor.id, submittedAt: AS_OF_DATE, status: '待审批', progress: 0, recognized: 0, history: [{ date: AS_OF_DATE, actor: actor.name, action: '提交申请', note: action.scope }] });
  } else {
    const o = existing!; if (!action.note.trim()) throw new Error('办理说明必填');
    if (action.operation === 'approve' || action.operation === 'reject') {
      if (actor.role !== 'finance' || o.status !== '待审批') throw new Error('仅财务可处理待审批原单');
      if (action.operation === 'approve') { checkLimit(o.amount, o.subjectId, o.id); adjustCommitment(o.subjectId, o.amount); o.status = '已批准'; } else o.status = '驳回';
    } else if (action.operation === 'progress' || action.operation === 'accept') {
      if (!pm || o.kind === 'expense' || o.status !== '已批准') throw new Error('仅主PM可更新已批准合同的履约验收');
      if (action.operation === 'progress') { if (!Number.isFinite(action.progress) || action.progress! < o.progress || action.progress! > 100) throw new Error('履约进度只能递增至100%'); o.progress = action.progress!; }
      else { if (o.progress !== 100) throw new Error('到货/履约完成100%后才能验收'); o.acceptance = action.note; o.status = '验收通过'; }
    } else {
      if (actor.role !== 'finance' || (o.kind === 'expense' ? o.status !== '已批准' : o.status !== '验收通过')) throw new Error('仅财务可入账，采购外包须先验收通过');
      if (state.costs.some((c) => c.sourceId === o.id) || o.recognized > 0) throw new Error('原单已入账，不可重复归集');
      adjustCommitment(o.subjectId, -o.amount); p.actualCost = money(p.actualCost + o.amount);
      state.costs.push({ id: `LEDGER-${o.id}`, projectId: p.id, type: o.kind, subjectId: o.subjectId, subjectName: o.subjectName, amount: o.amount, occurredDate: AS_OF_DATE, sourceId: o.id, description: `${o.title} · ${o.contractNo}` });
      o.recognized = o.amount; o.status = '已入账';
    }
    o.history.push({ date: AS_OF_DATE, actor: actor.name, action: ({ approve: '财务批准', reject: '财务驳回', progress: '履约进展', accept: '验收通过', book: '财务确认入账' })[action.operation], note: action.note });
  }
  p.rollingCost = money(p.actualCost + p.committedCost + p.forecastRemainingCost); p.costVariance = money(p.rollingCost - p.budgetAmount); p.costVarianceRate = percentage(p.costVariance, p.budgetAmount) ?? 0;
  return p.id;
}
