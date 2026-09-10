import { describe, expect, it } from 'vitest';
import { AS_OF_DATE } from '@/mock';
import { createBusinessState, type Actor } from '@/mock/business';
import { defaultInitiationInput, INITIATION_SIGNATURES } from '@/mock/initiation';
import { selectInitiationTodos } from '@/mock/initiation-todos';
import { reviewConfiguredApproval } from '@/mock/configuration';
import type { InitiationApplication, InitiationRound } from '@/models/initiation';
import type { ApprovalNode } from '@/models/configuration';
const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
const leader: Actor = { id: 'U-003', name: '王总', role: 'executive' };
const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
const nodes: ApprovalNode[] = [
  { name: 'PMO正式确认', roles: ['pmo'], mode: 'all', timeoutDays: 5 },
  { name: '领导终审', roles: ['executive'], mode: 'all', timeoutDays: 2 },
];
function fixture() {
  const state = createBusinessState();
  const o = { ...structuredClone(state.opportunities[0]), id: 'OPP-TODO', ownerId: market.id, departmentId: 'D-002' };
  state.opportunities.push(o);
  const input = { ...defaultInitiationInput(state, o.id), name: '待办测试申请', scope: '统一门户' };
  const round: InitiationRound = {
    revision: 3, input, submittedAt: '2026-09-01', submittedBy: market.name,
    source: { opportunity: o, estimate: { ...state.estimates[0], opportunityId: o.id }, solutionVersionId: 'SV-TODO', solutionScope: input.scope, solutionAttachments: [], expertReviewId: 'REV-TODO', expertOpinions: [], risks: [], earlyCostTotal: 0, earlyCostSources: [] },
    status: '待决策', risks: [], ruleReasons: [], path: 'PMC决策会', signatures: [],
    approvalProgress: { snapshot: { ruleId: 'RULE-TODO', ruleVersion: 'V3', reason: '提交时规则', nodes: structuredClone(nodes) }, node: 0, enteredAt: '2026-09-04', reviews: [], status: '待审批' },
  };
  const app: InitiationApplication = { id: 'INIT-TODO', input, draftRevision: 3, rounds: [round], status: round.status, createdBy: market.name, createdAt: '2026-09-01' };
  state.initiations.push(app);
  return { state, app, round, o };
}
const pending = (f: ReturnType<typeof fixture>, actor: Actor) => selectInitiationTodos(f.state, actor).filter(t => !t.done);

describe('立项独立待办聚合', () => {
  it('无正式项目也能看到来源，节点串行且时限只取提交快照', () => {
    const f = fixture(); const before = structuredClone(f.state);
    const first = pending(f, pmo);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ projectId: undefined, sourceType: 'initiation', sourceId: f.app.id, sourceName: f.app.input.name, revision: 3, due: '2026-09-09', route: '/initiation/INIT-TODO/decision' });
    expect(pending(f, leader)).toEqual([]);
    expect(f.state).toEqual(before);
    reviewConfiguredApproval(f.round.approvalProgress!, pmo, true, '正式确认', AS_OF_DATE);
    expect(pending(f, pmo)).toEqual([]);
    expect(pending(f, leader)).toHaveLength(1);
    expect(pending(f, leader)[0].due).toBe(new Date(Date.parse(AS_OF_DATE) + 2 * 86400000).toISOString().slice(0, 10));
    f.state.configuration.approvals.forEach(r => { r.enabled = false; });
    expect(pending(f, leader)[0].node).toBe('领导终审');
  });
  it('all节点排除已签角色，后续同角色节点重新生成独立待办', () => {
    const f = fixture(); f.round.approvalProgress!.snapshot.nodes = [
      { name: '财务和PMO', roles: ['finance', 'pmo'], mode: 'all', timeoutDays: 4 },
      { name: 'PMO最终确认', roles: ['pmo'], mode: 'all', timeoutDays: 2 },
    ];
    const firstId = pending(f, pmo)[0].id;
    reviewConfiguredApproval(f.round.approvalProgress!, pmo, true, '本节点已签', '2026-09-05');
    expect(pending(f, pmo)).toEqual([]); expect(pending(f, finance)).toHaveLength(1);
    const history = selectInitiationTodos(f.state, pmo).find(t => t.done)!;
    expect(history.due).toBe('2026-09-05'); expect(history.node).toContain('办理日');
    reviewConfiguredApproval(f.round.approvalProgress!, finance, true, '财务已签', AS_OF_DATE);
    expect(pending(f, pmo)).toHaveLength(1); expect(pending(f, pmo)[0].id).not.toBe(firstId);
    expect(selectInitiationTodos(f.state, pmo).map(t => t.id)).toHaveLength(new Set(selectInitiationTodos(f.state, pmo).map(t => t.id)).size);
  });
  it('any节点拒绝者已办不再待办，其他角色通过不会伪造未签者的已办', () => {
    const f = fixture(); f.round.approvalProgress!.snapshot.nodes = [{ name: '财务或PMO', roles: ['finance', 'pmo'], mode: 'any', timeoutDays: 3 }];
    reviewConfiguredApproval(f.round.approvalProgress!, finance, false, '财务保留意见');
    expect(pending(f, finance)).toEqual([]); expect(pending(f, pmo)).toHaveLength(1);
    expect(selectInitiationTodos(f.state, finance).filter(t => t.done)).toHaveLength(1);
    const g = fixture(); g.round.approvalProgress!.snapshot.nodes = structuredClone(f.round.approvalProgress!.snapshot.nodes);
    reviewConfiguredApproval(g.round.approvalProgress!, pmo, true, '或签通过');
    expect(selectInitiationTodos(g.state, finance)).toEqual([]);
  });
  it('六专业期间不提前显示正式节点，技术/方案和两项PMO签署保持独立', () => {
    const f = fixture(); f.app.status = f.round.status = '会签中'; f.round.path = '线上会签';
    expect(pending(f, pmo)).toHaveLength(2); expect(pending(f, tech)).toHaveLength(2);
    expect(pending(f, pmo).every(t => t.id.includes('professional:'))).toBe(true);
    const node = INITIATION_SIGNATURES.find(n => n.node === '法务协同（PMO代办）')!;
    f.round.signatures.push({ node: node.node, role: pmo.role, by: pmo.name, conclusion: '同意', opinion: '法务依据核验', date: '2026-09-03' });
    expect(pending(f, pmo)).toHaveLength(1); expect(pending(f, pmo)[0].node).toBe('PMO专业签署');
    f.round.signatures = INITIATION_SIGNATURES.map(n => ({ node: n.node, role: n.role, by: n.role === 'pmo' ? pmo.name : n.role, conclusion: '同意', opinion: '签署', date: AS_OF_DATE }));
    f.app.status = f.round.status = '待决策';
    expect(pending(f, pmo)).toHaveLength(1); expect(pending(f, pmo)[0].id).toContain('formal:');
  });
  it('专业否决后仅出PMO整改处理，不给配置首财务节点不可办理的通过待办', () => {
    const f = fixture(); f.round.path = '线上会签';
    f.round.signatures = INITIATION_SIGNATURES.map(n => ({ node: n.node, role: n.role, by: n.role, conclusion: n.role === 'finance' ? '否决' : '同意', opinion: '专业意见', date: AS_OF_DATE }));
    f.round.approvalProgress!.snapshot.nodes = [{ name: '财务正式决策', roles: ['finance'], mode: 'all', timeoutDays: 3 }];
    expect(pending(f, finance)).toEqual([]);
    expect(pending(f, pmo)).toHaveLength(1);
    expect(pending(f, pmo)[0]).toMatchObject({ node: '专业否决：PMO整改或否决处理', route: '/initiation/INIT-TODO/decision' });
  });
  it('风险、分级和整改按最新轮，旧轮只保留真实办理历史', () => {
    const f = fixture(); f.app.status = f.round.status = '待风险评估';
    expect(pending(f, pmo)[0].route).toBe('/initiation/INIT-TODO/risk-assessment');
    f.app.status = f.round.status = '待分级'; expect(pending(f, pmo)[0].node).toBe('PMO项目分级');
    f.app.status = f.round.status = '整改';
    f.round.path = '线上会签';
    f.round.decision = { result: '整改', opinion: '补材料', by: pmo.name, date: AS_OF_DATE, meetingDate: '', participants: [], minutes: '', rectifications: [{ content: '补充依据', ownerId: market.id, deadline: '2026-09-12' }] };
    expect(pending(f, market)[0]).toMatchObject({ due: '2026-09-12', route: '/initiation/apply?id=INIT-TODO' });
    const next = { ...structuredClone(f.round), revision: 4, status: '待风险评估' as const, decision: undefined, signatures: [], approvalProgress: undefined };
    f.app.rounds.push(next); f.app.status = next.status;
    expect(pending(f, market)).toEqual([]);
    const rows = selectInitiationTodos(f.state, pmo);
    expect(rows.filter(t => !t.done).map(t => t.revision)).toEqual([4]);
    expect(rows.filter(t => t.done).map(t => t.revision)).toEqual([3]);
  });
  it('旧轮无配置快照沿原决策角色，真实最终签署不重复算两条已办', () => {
    const f = fixture(); delete f.round.approvalProgress;
    expect(pending(f, leader)[0].node).toBe('历史路径正式决策'); expect(pending(f, pmo)).toEqual([]);
    f.round.path = '线上会签'; expect(pending(f, pmo)[0].node).toBe('历史路径正式决策');
    const g = fixture(); g.round.approvalProgress!.snapshot.nodes = [nodes[0]];
    reviewConfiguredApproval(g.round.approvalProgress!, pmo, true, '批准立项');
    g.app.status = g.round.status = '通过';
    g.round.decision = { result: '通过', opinion: '批准立项', by: pmo.name, date: AS_OF_DATE, meetingDate: '', participants: [], minutes: '', rectifications: [] };
    expect(selectInitiationTodos(g.state, pmo).filter(t => t.done)).toHaveLength(1);
  });
  it('遵循来源权限，其他同角色签署仅排除待办、不冒充本人已办', () => {
    const f = fixture(); f.o.ownerId = 'OTHER'; f.o.departmentId = 'D-OTHER';
    f.app.status = f.round.status = '整改';
    expect(selectInitiationTodos(f.state, market)).toEqual([]);
    f.app.status = f.round.status = '待决策';
    f.round.approvalProgress!.reviews.push({ node: 0, role: 'pmo', by: '另一位PMO', approve: true, opinion: '已办理', date: AS_OF_DATE });
    expect(selectInitiationTodos(f.state, pmo)).toEqual([]);
    expect(selectInitiationTodos(f.state, { ...pmo, role: 'admin' })).toEqual([]);
  });
});
