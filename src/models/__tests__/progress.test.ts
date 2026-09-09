import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };
it('切换角色保持实际人员身份和姓名，避免原流程权限失配', () => {
  useAppStore.getState().setRole('finance');
  expect(useAppStore.getState().currentUser.id).toBe('U-004');
  useAppStore.getState().setRole('project-manager');
  expect(useAppStore.getState().currentUser).toMatchObject({ id: 'U-001', name: '张建国' });
});
it('执行事实更新同步总体进度但不改计划或历史基线，并拒绝回退及无权更新', () => {
  const state = createBusinessState(); const task = state.tasks.find((t) => t.projectId === 'P-001' && t.progress === 0)!;
  const action = { type: 'update-task' as const, id: task.id, progress: 50, actualStartDate: '2026-09-08', note: '联调完成一半' };
  const next = transition(state, action, pm);
  expect(next.projects[0].progressRate).toBe(68.75);
  expect(next.baselines).toEqual(state.baselines);
  expect(next.tasks.find((t) => t.id === task.id)?.startDate).toBe(task.startDate);
  expect(() => transition(next, { ...action, progress: 40 }, pm)).toThrow();
  expect(() => transition(next, { ...action, progress: 100 }, pm)).toThrow();
  expect(() => transition(state, action, finance)).toThrow();
  expect(state.tasks.find((t) => t.id === task.id)?.progress).toBe(0);
});
it('计划变更超过30天须PMO和财务全通过才追加计划基线，执行事实与原快照保留', () => {
  const state = createBusinessState(); const submitted = transition(state, { type: 'request-plan', projectId: 'P-001', kind: 'schedule', shiftDays: 35, reason: '客户接口延期，申请顺延并评估资源占用' }, pm);
  const first = transition(submitted, { type: 'review-plan', id: 'PLAN-1', approve: true, opinion: 'PMO同意' }, pmo);
  expect(first.planRequests[0].status).toBe('待审批');
  expect(first.tasks).toEqual(state.tasks);
  expect(() => transition(first, { type: 'review-plan', id: 'PLAN-1', approve: true, opinion: '重复' }, pmo)).toThrow();
  const next = transition(first, { type: 'review-plan', id: 'PLAN-1', approve: true, opinion: '财务确认资源影响' }, finance);
  expect(next.planRequests[0].status).toBe('通过');
  expect(next.projects[0].plannedEndDate).toBe('2027-02-04');
  expect(next.baselines.find((b) => b.projectId === 'P-001' && b.status === '已生效')?.plannedEndDate).toBe('2027-02-04');
  expect(next.projects[0].budgetAmount).toBe(state.projects[0].budgetAmount);
  expect(next.planRequests[0].tasks).toEqual(state.tasks.filter((t) => t.projectId === 'P-001'));
  expect(next.tasks.filter((t) => t.progress === 100)).toEqual(state.tasks.filter((t) => t.progress === 100));
});
it('阶段条件不足不能通过，驳回不改业务状态', () => {
  const state = transition(createBusinessState(), { type: 'request-plan', projectId: 'P-001', kind: 'stage', shiftDays: 0, reason: '申请阶段评审' }, pm);
  expect(() => transition(state, { type: 'review-plan', id: 'PLAN-1', approve: true, opinion: '同意' }, pmo)).toThrow();
  const rejected = transition(state, { type: 'review-plan', id: 'PLAN-1', approve: false, opinion: '请补充必交材料并完成任务' }, pmo);
  expect(rejected.projects).toEqual(state.projects);
  expect(rejected.planRequests[0].status).toBe('驳回');
});
