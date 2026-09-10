import { AS_OF_DATE } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import type { ReceiptAction } from '@/models/receipts';
import { money, sumMoney } from '@/utils/money';

export function applyReceiptAction(state: BusinessState, action: ReceiptAction, actor: Actor) {
  if (actor.role !== 'finance') throw new Error('仅财务可确认实际收款');
  const project = state.projects.find((p) => p.id === action.projectId);
  const contract = state.contracts.find((c) => c.id === action.contractId && c.projectId === project?.id);
  if (!project || !contract) throw new Error('项目与客户合同关联无效');
  const sourceNo = action.sourceNo.trim();
  if (!sourceNo || state.receiptRecords.some((r) => r.sourceNo === sourceNo)) throw new Error('原收款流水编号必填且不可重复登记');
  const date = action.receivedDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > AS_OF_DATE) throw new Error('收款日期无效或晚于演示日');
  const files = action.evidenceFiles.map((f) => f.trim());
  if (!action.note.trim() || !files.length || files.some((f) => !/\.(pdf|png|jpg|xlsx)$/i.test(f))) throw new Error('收款依据、有效凭据文件名和说明必填');
  if (!action.allocations.length || new Set(action.allocations.map((a) => a.receiptPlanId)).size !== action.allocations.length) throw new Error('回款分配不能为空且同一节点不能重复');
  const plans = state.receiptPlans.filter((p) => p.contractId === contract.id);
  if (money(sumMoney(plans.map((p) => p.paidAmount)) - contract.paidAmount) !== 0 || money(contract.amount - contract.paidAmount - contract.unpaidAmount) !== 0) throw new Error('合同与回款计划历史实收不一致，请先核对来源');
  const allocations = action.allocations.map((a) => {
    const plan = plans.find((p) => p.id === a.receiptPlanId && p.projectId === project.id);
    if (!plan) throw new Error('回款节点不属于当前项目和合同');
    if (!Number.isFinite(a.amount) || a.amount <= 0 || Math.abs(a.amount * 1_000_000 - Math.round(a.amount * 1_000_000)) > 0.000001) throw new Error('收款金额须为正数且精确到分');
    if (money(a.amount + plan.paidAmount - plan.amount) > 0) throw new Error('分配金额超过回款节点未收余额');
    return { receiptPlanId: plan.id, amount: money(a.amount), paidBefore: plan.paidAmount, paidAfter: sumMoney([plan.paidAmount, a.amount]) };
  });
  const amount = sumMoney(allocations.map((a) => a.amount));
  if (amount > contract.unpaidAmount) throw new Error('本次收款超过合同未收余额');
  const id = `RCPT-${state.receiptRecords.length + 1}`;
  state.receiptRecords.push({ id, projectId: project.id, contractId: contract.id, sourceNo, receivedDate: date, amount, allocations, evidenceFiles: files, note: action.note.trim(), confirmedBy: actor.name, confirmedAt: AS_OF_DATE, contractPaidBefore: contract.paidAmount, contractPaidAfter: sumMoney([contract.paidAmount, amount]) });
  for (const allocation of allocations) plans.find((p) => p.id === allocation.receiptPlanId)!.paidAmount = allocation.paidAfter;
  contract.paidAmount = sumMoney([contract.paidAmount, amount]);
  contract.unpaidAmount = money(contract.amount - contract.paidAmount);
  return id;
}
