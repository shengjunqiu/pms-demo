import { AS_OF_DATE } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import type { DailyReport, WeeklyReport } from '@/models/types';
import { money } from '@/utils/money';
export interface ReportSnapshot { capturedAt: string; dailyIds: string[]; taskIds: string[]; issueIds: string[]; riskIds: string[]; actualProgress: number; plannedProgress: number; budget: number; actualCost: number; rollingCost: number; milestoneSummary: string }
export const REPORT_RULES = { version: 'REPORT-1', dailyDeadline: '18:00', weeklyDeadline: '周五18:00' };
export function currentWeek() { const d = new Date(`${AS_OF_DATE}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); const start = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 6); return { start, end: d.toISOString().slice(0, 10) }; }
export function reportSnapshot(state: BusinessState, projectId: string): ReportSnapshot {
  const p = state.projects.find((p) => p.id === projectId)!; const tasks = state.tasks.filter((t) => t.projectId === projectId); const week = currentWeek(); const weight = tasks.reduce((s, t) => s + t.plannedDays, 0);
  return { capturedAt: AS_OF_DATE, dailyIds: state.dailyReports.filter((r) => r.projectId === projectId && r.date >= week.start && r.date <= AS_OF_DATE && r.status !== '草稿').map((r) => r.id), taskIds: tasks.map((t) => t.id), issueIds: state.issues.filter((i) => i.projectId === projectId && i.status !== '已关闭').map((i) => i.id), riskIds: state.risks.filter((r) => r.projectId === projectId && r.status === '监控中').map((r) => r.id), actualProgress: p.progressRate, plannedProgress: weight ? money(tasks.reduce((s, t) => s + Math.max(0, Math.min(1, (Date.parse(AS_OF_DATE) - Date.parse(t.startDate)) / Math.max(86400000, Date.parse(t.endDate) - Date.parse(t.startDate)))) * t.plannedDays * 100, 0) / weight) : 0, budget: p.budgetAmount, actualCost: p.actualCost, rollingCost: p.rollingCost, milestoneSummary: state.milestones.filter((m) => m.projectId === projectId).map((m) => `${m.type}：${m.status}（计划${m.plannedDate} / 实际${m.actualDate ?? '未达成'}）`).join('；') };
}
export const dailyNeeded = (state: BusinessState, projectId: string) => state.projects.some((p) => p.id === projectId && p.phase === '执行' && !state.lockedProjects.includes(p.id)) && !state.dailyReports.some((r) => r.projectId === projectId && r.date === AS_OF_DATE && r.status !== '草稿');
export type ReportAction = { type: 'save-daily'; projectId: string; submit: boolean; progress: number; hasProgress: boolean; completed: string; reason: string; nextPlan: string; coordination: string; linkedIds: string[]; actualHours?: number }
 | { type: 'create-weekly'; projectId: string }
 | { type: 'save-weekly'; id: string; submit: boolean; summary: string; nextPlan: string; coordination: string };
export function applyReportAction(state: BusinessState, action: ReportAction, actor: Actor) {
  const weekly = action.type === 'save-weekly' ? state.weeklyReports.find((r) => r.id === action.id) : undefined;
  const p = state.projects.find((p) => p.id === (action.type === 'save-weekly' ? weekly?.projectId : action.projectId));
  if (!p || actor.role !== 'project-manager' || actor.id !== p.pmId || p.phase !== '执行' || state.lockedProjects.includes(p.id)) throw new Error('仅执行中项目主PM可填报');
  if (action.type === 'save-daily') {
    const previous = state.dailyReports.find((r) => r.projectId === p.id && r.date === AS_OF_DATE);
    if (previous && previous.status !== '草稿') throw new Error('当天日报已提交，历史不可覆盖');
    if (!Number.isFinite(action.progress) || action.progress < 0 || action.progress > 100) throw new Error('填报完成率须为0至100');
    if (action.submit && (!action.nextPlan.trim() || (action.hasProgress ? !action.completed.trim() : !action.reason.trim()))) throw new Error('下一步计划及进展/无进展原因必填');
    const validIds = [...state.issues, ...state.risks].filter((i) => i.projectId === p.id).map((i) => i.id);
    if (action.linkedIds.some((id) => !validIds.includes(id))) throw new Error('只能关联本项目独立问题风险');
    const report: DailyReport = { id: previous?.id ?? `DR-NEW-${state.dailyReports.length + 1}`, projectId: p.id, date: AS_OF_DATE, reporter: actor.name, completedTasks: action.hasProgress ? action.completed.trim() : `无进展：${action.reason.trim()}`, plannedTasks: action.nextPlan.trim(), status: action.submit ? '已上报' : '草稿', reportedProgress: action.progress, hasProgress: action.hasProgress, noProgressReason: action.reason, coordination: action.coordination.trim(), linkedIds: [...new Set(action.linkedIds)], actualHours: action.actualHours, snapshot: reportSnapshot(state, p.id) };
    if (previous) state.dailyReports[state.dailyReports.indexOf(previous)] = report; else state.dailyReports.unshift(report);
  } else if (action.type === 'create-weekly') {
    const week = currentWeek(); if (state.weeklyReports.some((r) => r.projectId === p.id && r.weekStart === week.start)) throw new Error('本周已有周报，请打开已有记录');
    const snap = reportSnapshot(state, p.id); const reports = state.dailyReports.filter((r) => snap.dailyIds.includes(r.id));
    const report: WeeklyReport = { id: `WR-NEW-${state.weeklyReports.length + 1}`, projectId: p.id, weekSpan: `${week.start} ~ ${week.end}`, weekStart: week.start, reporter: actor.name, status: '草稿', progressSummary: `截至${AS_OF_DATE}，汇集${reports.length}份日报；WBS实际${snap.actualProgress}%，计划${snap.plannedProgress.toFixed(1)}%。\n${reports.map((r) => `${r.date}：${r.completedTasks}`).join('\n')}`, costStatus: `预算${snap.budget} / 已发生${snap.actualCost} / 滚动${snap.rollingCost}万元`, riskSummary: `未关闭问题${snap.issueIds.length}项、监控风险${snap.riskIds.length}项`, nextWeekPlan: reports[0]?.plannedTasks ?? '', coordination: '', snapshot: snap, recipients: ['PMO负责人 李主任', `${p.departmentName}负责人`, ...(['特大型', '重大'].includes(p.level) ? ['PMC委员会'] : [])] };
    state.weeklyReports.unshift(report);
  } else {
    if (!weekly || weekly.status !== '草稿') throw new Error('已上报周报不可覆盖');
    if (action.submit && (!action.summary.trim() || !action.nextPlan.trim())) throw new Error('周度进展和下周计划必填');
    weekly.progressSummary = action.summary.trim(); weekly.nextWeekPlan = action.nextPlan.trim(); weekly.coordination = action.coordination.trim();
    if (action.submit) { weekly.status = '已上报'; weekly.submittedAt = AS_OF_DATE; }
  }
  return p.id;
}
