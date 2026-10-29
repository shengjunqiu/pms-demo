import {selectCostRate,projectCostRegion} from './configuration-finance';
import {assertNewProjectCommitment} from './unsigned';
import { AS_OF_DATE, mockTimesheets } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import { selectFourCalculations } from '@/mock/selectors';
import { money, percentage, sumMoney } from '@/utils/money';
import { assertConstructionWritable } from '@/mock/construction-lock';

export const LABOR_RULE = { version: 'LAB-2026-01', effectiveDate: '2026-01-01', dailyLimit: 8, defaultHourlyYuan: 120 };
export interface LaborEntry {
  id: string; projectId: string; taskId: string; userId: string; userName: string; date: string; hours: number; description: string;
  status: '待审核' | '已通过' | '已驳回'; rateVersion: string; hourlyYuan: number; amount: number; baselineId: string;
  reviewer?: string; opinion?: string; reviewedAt?: string; ledgerId?: string; consumedCommitment?: number;
  entryMode?: 'self' | 'pm-proxy'; filledBy?: string;
}
export type LaborAction = { type: 'submit-labor'; projectId: string; taskId: string; date: string; hours: number; description: string; userId?: string }
 | { type: 'review-labor'; id: string; approve: boolean; opinion: string };
export const hourlyRate = (userId: string) => userId === 'U-001' ? 150 : userId === 'U-005' ? 180 : LABOR_RULE.defaultHourlyYuan;
export function laborAvailability(state: BusinessState, projectId: string, excludeId?: string) {
  const p = state.projects.find((p) => p.id === projectId)!;
  const s = selectFourCalculations(p, state).subjects.find((s) => s.subjectId === 'SUB-01');
  const milestones = state.milestones.filter((m) => m.projectId === p.id && m.status === '已达成');
  const milestoneRate = milestones.some((m) => m.type === '客户终验') ? 100 : milestones.some((m) => m.type === '内部初验') ? 90 : milestones.some((m) => m.type === '开发完成') ? 75 : milestones.some((m) => m.type === '启动') ? 60 : 0;
  const releaseRate = Math.max(milestoneRate, p.releasedBudgetPercent ?? 0);
  const pending = sumMoney(state.laborEntries.filter((e) => e.projectId === p.id && e.status === '待审核' && e.id !== excludeId).map((e) => e.amount));
  const released = money((s?.budget ?? 0) * releaseRate / 100);
  return { budget: s?.budget ?? 0, actual: s?.actual ?? 0, committed: s?.committed ?? 0, released, releaseRate, pending, available: money(released - (s?.actual ?? 0) - pending) };
}
export function applyLaborAction(state: BusinessState, action: LaborAction, actor: Actor) {
  const entry = action.type === 'review-labor' ? state.laborEntries.find((e) => e.id === action.id) : undefined;
  const p = state.projects.find((p) => p.id === (action.type === 'submit-labor' ? action.projectId : entry?.projectId));
  if (!p) throw new Error('项目或工时记录不存在');
  if (p.phase !== '执行' || ['已终止', '已关闭'].includes(p.status) || state.lockedProjects.includes(p.id)) throw new Error('仅执行中且未锁定项目可办理建设工时');
  assertConstructionWritable(state, p.id);
  const limit = (amount: number, excludeId?: string, checkUnsigned = true) => {
    const a = laborAvailability(state, p.id, excludeId);
    if (amount > a.available) throw new Error('当前阶段释放人力预算不足，请先完成阶段或预算审批');
    const pending = sumMoney(state.laborEntries.filter((e) => e.projectId === p.id && e.status === '待审核' && e.id !== excludeId).map((e) => e.amount));
    const otherPending = sumMoney(state.costOrders.filter((o) => o.projectId === p.id && o.status === '待审批').map((o) => o.amount));
    if (checkUnsigned && p.isUnsigned && p.actualCost + p.committedCost + Math.max(0, pending + amount - a.committed) + otherPending > (p.unsignedLimitQuota ?? 0)) throw new Error('未签投入额度不足');
  };
  if (action.type === 'submit-labor') {
    assertNewProjectCommitment(state,p);
    // 工时填报：本人可填报自己的工时；主PM 可为本项目成员代填（自动留痕 pm-proxy）；其余人拒绝
    const isPm = p.pmId === actor.id;
    const isMember = p.memberIds?.includes(actor.id);
    if (!isPm && !isMember) throw new Error('仅项目成员可填报本人工时，主PM可代填本项目成员工时');
    const proxyUserId = isPm && action.userId && action.userId !== actor.id ? action.userId : undefined;
    const targetUserId = proxyUserId ?? actor.id;
    const targetMember = proxyUserId ? p.memberIds?.includes(proxyUserId) : true;
    if (!targetMember) throw new Error('主PM代填的对象必须是本项目成员');
    const targetName = proxyUserId ? (state.projectTeams[p.id]?.members.find((m) => m.userId === proxyUserId)?.name ?? proxyUserId) : actor.name;
    if (!state.tasks.some((t) => t.id === action.taskId && t.projectId === p.id)) throw new Error('任务必须属于当前项目');
    const date = new Date(action.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10) !== action.date || action.date > AS_OF_DATE || action.date < p.plannedStartDate) throw new Error('工时日期须在项目开始日至演示基准日之间');
    if (!Number.isFinite(action.hours) || action.hours <= 0 || action.hours > LABOR_RULE.dailyLimit || action.hours * 2 % 1 !== 0) throw new Error('工时按0.5小时填报，每日不超过8小时');
    if (!action.description.trim()) throw new Error('工作内容必填');
    const all = [...mockTimesheets, ...state.laborEntries].filter((e) => e.userId === targetUserId && e.date === action.date && e.status !== '已驳回');
    if (all.some((e) => e.projectId === p.id && e.taskId === action.taskId)) throw new Error('同人同日同项目任务不可重复填报');
    if (all.reduce((n,e) => n + e.hours,0) + action.hours > LABOR_RULE.dailyLimit) throw new Error('跨项目每日累计工时超过8小时');
    const baseline = state.baselines.find((b) => b.projectId === p.id && b.status === '已生效');
    if (!baseline) throw new Error('须引用已生效基线');
    const rate = selectCostRate(state,{userId:targetUserId,orgId:p.departmentId,projectType:p.type,region:projectCostRegion(state,p),date:action.date}); const hourlyYuan = rate.hourlyYuan; const amount = money(action.hours * hourlyYuan / 10000); limit(amount);
    state.laborEntries.push({ id: `LAB-${state.laborEntries.length + 1}`, projectId: p.id, taskId: action.taskId, userId: targetUserId, userName: targetName, date: action.date, hours: action.hours, description: action.description.trim(), status: '待审核', rateVersion: rate.versionId, hourlyYuan, amount, baselineId: baseline.id, ...(proxyUserId ? { entryMode: 'pm-proxy' as const, filledBy: actor.name } : {}) });
  } else {
    if (actor.role !== 'project-manager' || actor.id !== p.pmId || entry!.status !== '待审核') throw new Error('仅项目主PM可审核待审核工时');
    if (!action.opinion.trim()) throw new Error('审核意见必填');
    const e = entry!;
    if (action.approve) {
      limit(e.amount, e.id, true);
      if (state.costs.some((c) => c.sourceId === e.id)) throw new Error('工时已计费，不可重复归集');
      p.commitmentBySubject ??= Object.fromEntries(selectFourCalculations(p,state).subjects.map((s) => [s.subjectId,s.committed]));
      const consumed = Math.min(e.amount, p.commitmentBySubject['SUB-01'] ?? 0);
      p.commitmentBySubject['SUB-01'] = money((p.commitmentBySubject['SUB-01'] ?? 0) - consumed);
      p.committedCost = sumMoney(Object.values(p.commitmentBySubject)); p.actualCost = money(p.actualCost + e.amount);
      e.ledgerId = `LEDGER-${e.id}`; e.consumedCommitment = consumed;
      state.costs.push({ id:e.ledgerId, projectId:p.id, sourceId:e.id, type:'labor', subjectId:'SUB-01',subjectName:'直接人力成本', amount:e.amount, occurredDate:e.date, description:`${e.userName} ${e.hours}小时 · ${e.rateVersion} · ${e.description}` });
      p.rollingCost = money(p.actualCost + p.committedCost + p.forecastRemainingCost); p.costVariance = money(p.rollingCost-p.budgetAmount); p.costVarianceRate = percentage(p.costVariance,p.budgetAmount) ?? 0;
    }
    e.status = action.approve ? '已通过' : '已驳回'; e.reviewer = actor.name; e.opinion=action.opinion; e.reviewedAt=AS_OF_DATE;
  }
  return p.id;
}
