import { buildAuditChanges, redactAuditEvent } from '@/mock/configuration-access';
import { expect, it } from 'vitest';
import { createBusinessState, useBusinessStore } from '@/mock/business';
import { canViewOpportunity } from '@/mock/opportunities';
import { businessTargetScope, canAccessTargetScope, visibleAuditEvents } from '@/mock/access-scope';
import { canViewInitiation } from '@/mock/initiation';

const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };
const admin = { id: 'U-ADMIN', name: 'Admin', role: 'admin' as const };

it('组织策略同时收紧商机和立项来源，保存未授权业务只产生拒绝审计', () => {
  const data = createBusinessState();
  const outside = data.opportunities.find((o) => o.departmentId !== 'D-003')!;
  const before = structuredClone(outside);
  data.accessConfiguration.versions.find((v) => v.role === 'finance')!.dataScope = 'organizations';
  data.accessConfiguration.versions.find((v) => v.role === 'finance')!.orgIds = ['D-003'];
  expect(canViewOpportunity(data, outside, finance)).toBe(false);
  const application = data.initiations[0];
  if (application) {
    application.input.opportunityId = outside.id;
    expect(canViewInitiation(data, application, finance)).toBe(false);
  }
  useBusinessStore.setState({ data });
  expect(() => useBusinessStore.getState().dispatch({ type: 'estimate-create-draft', id: outside.id, reviewId: 'not-reached' }, finance)).toThrow('访问策略');
  expect(useBusinessStore.getState().data.opportunities.find((o) => o.id === outside.id)).toEqual(before);
  expect(useBusinessStore.getState().data.audit.at(-1)).toMatchObject({ result: '拒绝', changes: [] });
});

it('项目业务按项目组织授权，不能被来源商机的不同部门误阻断', () => {
  const data = createBusinessState();
  const p = data.projects[0];
  const policy = data.accessConfiguration.versions.find((v) => v.role === 'finance')!;
  policy.dataScope = 'organizations'; policy.orgIds = [p.departmentId];
  data.opportunities.find((o) => o.id === p.opportunityId)!.departmentId = 'D-002';
  expect(canAccessTargetScope(data, finance, p.id)).toBe(true);
});

it('审计范围解析实体与URL，不展示未知历史归属，恢复策略后历史仍完整', () => {
  const data = createBusinessState();
  const inside = data.projects[0];
  const outside = data.projects.find((p) => p.departmentId !== inside.departmentId)!;
  const policy = data.accessConfiguration.versions.find((v) => v.role === 'admin')!;
  data.audit = [
    { id: 'A1', actor: '财务', action: 'review', target: inside.id, date: '2026-09-09' },
    { id: 'A2', actor: '财务', action: 'review', target: outside.id, date: '2026-09-09' },
    { id: 'A3', actor: 'Admin', action: 'page-access', target: `/projects/${outside.id}/budget`, date: '2026-09-09' },
    { id: 'A4', actor: '历史', action: 'review', target: 'unknown-legacy-record', date: '2026-09-09' },
  ];
  const original = structuredClone(data.audit);
  policy.dataScope = 'organizations'; policy.orgIds = [inside.departmentId];
  expect(visibleAuditEvents(data, admin).map((e) => e.id)).toEqual(['A1']);
  expect(data.audit).toEqual(original);
  policy.dataScope = 'all';
  expect(visibleAuditEvents(data, admin)).toEqual(original);
});

it('字典内的审批记录从真实父关系解析项目，未知ID不能猜测项目归属', () => {
  const data = createBusinessState();
  const entry = Object.entries(data.projectTeams)[0];
  entry[1].appointments.push({ id: 'APPOINT-scope-test', userId: 'U-001', name: 'PM', status: '待接受', nominatedAt: '2026-09-09', nominatedBy: 'PMO', opinion: '真实任命' });
  expect(businessTargetScope(data, 'APPOINT-scope-test').projectIds).toEqual([entry[0]]);
  expect(businessTargetScope(data, 'FAKE-P-001-record').projectIds).toEqual([]);
});

it('审计意见及嵌套个人工时金额按查看字段脱敏，不改原事件', () => {
 const state=createBusinessState();const policy=state.accessConfiguration.versions.find(v=>v.role==='admin')!;policy.fields=[];
 const event={id:'AUD-SENSITIVE',actor:'财务',date:'2026-09-09',action:'review',target:'LAB-1',reason:'预计毛利率42%',changes:[{path:'laborEntries[LAB-1]',label:'工时',before:null,after:{hours:8,amount:0.12,hourlyYuan:150}}]};
 const result=redactAuditEvent(event,policy);
 expect(result.reason).not.toContain('42');
 expect(result.changes![0].after).toEqual({hours:8,amount:'***（已脱敏）',hourlyYuan:'***（已脱敏）'});
 expect(event.changes[0].after.amount).toBe(0.12);
});

it('已确认人力成本副本和消耗承诺金额都带敏感标记，修改和新增均不可绕过', () => {
 const state=createBusinessState();const policy=state.accessConfiguration.versions.find(v=>v.role==='admin')!;policy.fields=[];
 const previous={costs:[{id:'ledger',projectId:'P-001',type:'labor',amount:0.12,description:'个人8小时'}],laborEntries:[{id:'LAB-1',projectId:'P-001',consumedCommitment:0}]};
 const next={costs:[{id:'ledger',projectId:'P-001',type:'labor',amount:0.15,description:'个人8小时'},{id:'new-ledger',projectId:'P-001',type:'labor',amount:0.2,description:'个人4小时'}],laborEntries:[{id:'LAB-1',projectId:'P-001',consumedCommitment:0.15}]};
 const changes=buildAuditChanges(previous,next,'P-001');
 const event={id:'A',actor:'PM',action:'review-labor',target:'P-001',date:'2026-09-09',changes};
 const redacted=redactAuditEvent(event,policy);
 expect(changes).toHaveLength(3);
 expect(redacted.changes!.every(c=>c.after==='***（已脱敏）')).toBe(true);
 expect(next.costs[0].amount).toBe(0.15);
});
