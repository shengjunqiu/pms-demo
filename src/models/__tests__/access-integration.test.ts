import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business-domain';
import { useBusinessStore } from '@/mock/store';
import { visibleProjects } from '@/mock/selectors';
import { canAccessPage, canEditSensitiveField, canViewSensitiveField } from '@/mock/configuration-access';
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


it('字段查看和编辑独立：费率可见但禁编时拒绝保存，仅追加审计', () => {
  const data = createBusinessState();
  const policy = data.accessConfiguration.versions.find(v => v.role === 'finance')!;
  policy.editableFields = ['contact', 'evaluation'];
  expect(canViewSensitiveField(data, finance, 'labor-rate')).toBe(true);
  expect(canEditSensitiveField(data, finance, 'labor-rate')).toBe(false);
  useBusinessStore.setState({ data });
  const before = structuredClone(data.financeConfiguration);
  const rate = data.financeConfiguration.rates[0];
  expect(() => useBusinessStore.getState().dispatch({ type: 'finance-config-save', kind: 'rates', sourceId: rate.id, value: { ...rate, hourlyYuan: rate.hourlyYuan + 10, changeReason: '禁止的费率修改' } }, finance)).toThrow('禁止编辑人员费率');
  expect(useBusinessStore.getState().data.financeConfiguration).toEqual(before);
  expect(useBusinessStore.getState().data.audit.at(-1)).toMatchObject({ result: '拒绝', changes: [] });
  policy.editableFields.push('labor-rate');
  policy.fields = policy.fields.filter(f => f !== 'labor-rate');
  expect(canEditSensitiveField(data, finance, 'labor-rate')).toBe(true);
  expect(canViewSensitiveField(data, finance, 'labor-rate')).toBe(false);
  expect(canEditSensitiveField(data, finance, 'margin')).toBe(false);
});

it('运维人工投入同样受费率编辑权约束，不改变周期和成本源', () => {
  const data = createBusinessState();
  data.accessConfiguration.versions.find(v => v.role === 'finance')!.editableFields = [];
  useBusinessStore.setState({ data });
  const before = structuredClone(data);
  expect(() => useBusinessStore.getState().dispatch({ type: 'submit-operation-cost', projectId: 'P-007', operationId: 'OPS-007', sourceNo: 'DENIED-RATE', kind: 'labor', date: '2026-09-09', hours: 1, rate: 100, amount: 0.01, description: '人工服务', evidence: '服务单' }, finance)).toThrow('禁止编辑人员费率');
  const after = useBusinessStore.getState().data;
  expect({ ...after, audit: before.audit }).toEqual(before);
  expect(after.audit.at(-1)).toMatchObject({ result: '拒绝', action: 'submit-operation-cost', changes: [] });
});
