import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business-domain';
import { currentWeek, dailyNeeded, type ReportAction } from '@/mock/reports';
const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
const daily: Extract<ReportAction, { type: 'save-daily' }> = { type: 'save-daily', projectId: 'P-001', submit: true, progress: 62.5, hasProgress: false, completed: '', reason: '第三方联调窗口等待确认', nextPlan: '协调接口联调窗口', coordination: '请接口负责人确认时间', linkedIds: ['ISSUE-0001'] };
it('日报自动待办、草稿、无进展原因与唯一提交；报告不改WBS或独立问题', () => {
  const before = createBusinessState(); expect(dailyNeeded(before, 'P-001')).toBe(true);
  expect(() => transition(before, { ...daily, reason: '' }, pm)).toThrow(/必填/);
  expect(() => transition(before, { ...daily, linkedIds: ['ISSUE-0003'] }, pm)).toThrow();
  let s = transition(before, { ...daily, submit: false, reason: '' }, pm); expect(dailyNeeded(s, 'P-001')).toBe(true);
  s = transition(s, daily, pm); expect(dailyNeeded(s, 'P-001')).toBe(false);
  expect(s.dailyReports.filter((r) => r.projectId === 'P-001' && r.date === '2026-09-09')).toHaveLength(1);
  expect(s.tasks).toEqual(before.tasks); expect(s.issues).toEqual(before.issues); expect(s.projects[0].progressRate).toBe(before.projects[0].progressRate);
  expect(() => transition(s, daily, pm)).toThrow(/已提交/);
});
it('周报保存来源与成本快照，补充模拟上报范围，后续事实改变不改历史', () => {
  let s = transition(createBusinessState(), daily, pm); s = transition(s, { type: 'create-weekly', projectId: 'P-001' }, pm);
  const id = s.weeklyReports[0].id; const snap = structuredClone(s.weeklyReports[0].snapshot);
  expect(currentWeek()).toEqual({ start: '2026-09-07', end: '2026-09-13' });
  expect(snap?.dailyIds).toContain(s.dailyReports[0].id); expect(snap?.actualCost).toBe(1650);
  s = transition(s, { type: 'save-weekly', id, submit: true, summary: '已完成本周联调准备', nextPlan: '下周完成接口测试', coordination: '请PMO协调客户窗口' }, pm);
  expect(s.weeklyReports[0].status).toBe('已上报'); expect(s.weeklyReports[0].recipients).toContain('PMO负责人 李主任');
  s.projects[0].actualCost += 10; expect(s.weeklyReports[0].snapshot).toEqual(snap);
  expect(() => transition(s, { type: 'save-weekly', id, submit: true, summary: '覆盖', nextPlan: '覆盖', coordination: '' }, pm)).toThrow();
});
it('质量整改独立闭环，材料版本经质量门与PMO审核后才允许里程碑达成', () => {
  let s = createBusinessState(); const milestone = s.milestones.find((m) => m.projectId === 'P-001' && m.status !== '已达成')!;
  const complete = { type: 'complete-milestone' as const, id: milestone.id, actualDate: '2026-09-09', note: '全部材料核验完成' };
  expect(() => transition(s, complete, pm)).toThrow(/材料/);
  const ids = s.materials.filter((m) => m.projectId === 'P-001').map((m) => m.id);
  const doc = (id: string, operation: 'upload' | 'submit' | 'approve' | 'reject' | 'archive') => ({ type: 'document-action' as const, id, operation, filename: '海防测试报告.pdf', note: '材料与版本核验说明' });
  s = transition(s, doc(ids[0], 'upload'), pm); expect(() => transition(s, doc(ids[0], 'submit'), pm)).toThrow(/质量/);
  s = transition(s, { type: 'quality-check', projectId: 'P-001', passed: false, note: '安全扫描报告缺失' }, pm);
  const issueId = s.qualityPlans['P-001'].checks[0].issueId!; expect(s.issues.find((i) => i.id === issueId)?.severity).toBe('重大');
  expect(() => transition(s, { type: 'quality-check', projectId: 'P-001', passed: true, note: '直接通过' }, pm)).toThrow(/整改/);
  s = transition(s, { type: 'update-ticket', kind: 'issue', id: issueId, operation: 'resolve', note: '已补充报告' }, pm);
  s = transition(s, { type: 'update-ticket', kind: 'issue', id: issueId, operation: 'confirm', note: '主PM验证关闭' }, pm);
  s = transition(s, { type: 'quality-check', projectId: 'P-001', passed: true, note: '复查通过' }, pm);
  s = transition(s, doc(ids[0], 'submit'), pm); expect(() => transition(s, doc(ids[0], 'approve'), pm)).toThrow();
  s = transition(s, doc(ids[0], 'reject'), pmo); s = transition(s, doc(ids[0], 'upload'), pm); s = transition(s, doc(ids[0], 'submit'), pm); s = transition(s, doc(ids[0], 'approve'), pmo);
  expect(s.materials.find((m) => m.id === ids[0])?.versions?.map((v) => v.status)).toEqual(['驳回', '通过']);
  for (const id of ids.slice(1)) { s = transition(s, doc(id, 'upload'), pm); s = transition(s, doc(id, 'submit'), pm); s = transition(s, doc(id, 'approve'), pmo); }
  const planDate = milestone.plannedDate; s = transition(s, complete, pm); expect(s.milestones.find((m) => m.id === milestone.id)).toMatchObject({ plannedDate: planDate, actualDate: '2026-09-09', status: '已达成' });
  expect(() => transition(s, doc(ids[0], 'archive'), pmo)).toThrow();
  s.projects[0].phase = '收尾'; s = transition(s, doc(ids[0], 'archive'), pmo); expect(() => transition(s, doc(ids[0], 'upload'), pm)).toThrow(/归档/);
});
