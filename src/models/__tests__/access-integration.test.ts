import { expect, it } from 'vitest';
import { createBusinessState, transition, useBusinessStore } from '@/mock/business';
import { visibleProjects } from '@/mock/selectors';
import { canAccessPage } from '@/mock/configuration-access';
import { actionTarget } from '@/mock/access';

const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };
const admin = { id: 'U-ADMIN', name: '管理员', role: 'admin' as const };

it('发布收紧策略同时过滤项目与页面，冻结旧策略保留', () => {
  let state = createBusinessState();
  const policy = state.accessConfiguration.versions.find((v) => v.role === 'finance')!;
  const old = structuredClone(policy);
  state = transition(state, { type: 'access-policy-save', sourceId: policy.id, value: { ...policy, dataScope: 'organizations', orgIds: ['D-003'], pages: policy.pages.filter((id) => id !== 'JS-08'), changeReason: '只允许交付组织且移除经营分析入口' } }, admin);
  expect(canAccessPage(state, finance, 'JS-08')).toBe(true);
  state = transition(state, { type: 'access-policy-publish', id: 'ACCESS-finance-V2' }, admin);
  expect(canAccessPage(state, finance, 'JS-08')).toBe(false);
  expect(visibleProjects('finance', state.projects, state).length).toBeLessThan(state.projects.length);
  expect(state.accessConfiguration.versions.find((v) => v.id === old.id)).toEqual(old);
  expect(state.audit.at(-1)).toMatchObject({ result: '成功', actorRole: 'admin' });
  expect(state.audit.at(-1)?.changes?.some((c) => c.path.endsWith('.status') && c.after === '已发布')).toBe(true);
});

it('UI统一入口拒绝已禁用收款，只追加拒绝审计不改变业务余额', () => {
  const data = createBusinessState();
  data.accessConfiguration.versions.find((v) => v.role === 'finance')!.actions = [];
  useBusinessStore.setState({ data });
  const originalContracts = structuredClone(data.contracts);
  expect(() => useBusinessStore.getState().dispatch({ type: 'confirm-project-receipt', projectId: 'P-006', contractId: 'CTR-005', sourceNo: 'DENIED', receivedDate: '2026-09-09', allocations: [], evidenceFiles: ['回单.pdf'], note: '访问策略阻断' }, finance)).toThrow('访问策略');
  expect(useBusinessStore.getState().data.contracts).toEqual(originalContracts);
  expect(useBusinessStore.getState().data.receiptRecords).toHaveLength(0);
  expect(useBusinessStore.getState().data.audit.at(-1)).toMatchObject({ result: '拒绝', actorRole: 'finance', action: 'confirm-project-receipt', changes: [] });
});

it('条件授权定位具体流程对象，而非统一传项目编号', () => {
  expect(actionTarget({ type: 'reply-planning', id: 'PLAN-1', rectificationId: 'FIX-1', reply: '回复' })).toBe('PLAN-1');
  expect(actionTarget({ type: 'record-operation-event', projectId: 'P-007', operationId: 'OPS-007', kind: '服务', title: '服务', severity: '一般', note: '依据' })).toBe('OPS-007');
  expect(actionTarget({ type: 'resolve-operation-event', projectId: 'P-007', id: 'EVENT-1', note: '已解决' })).toBe('EVENT-1');
});
