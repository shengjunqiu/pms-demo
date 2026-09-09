import type { Actor, BusinessState } from '@/mock/business';
import type { Bug, Issue, Requirement, Risk } from '@/models/types';
import { AS_OF_DATE, mockUsers } from '@/mock';
export type TicketKind = 'requirement' | 'bug' | 'issue' | 'risk';
export interface TicketMeta {
  description: string; category: string; deadline: string; creatorId?: string; ownerId?: string;
  probability?: number; impact?: number; measures?: string; product?: string; baselineImpact?: boolean;
  escalatedTo?: string; changeRequestId?: string; closedAt?: string;
  history: { date: string; actor: string; action: string; detail: string }[];
}
export type TicketAction =
  | { type: 'create-ticket'; kind: TicketKind; projectId: string; title: string; rank: string; ownerId: string; description: string; category: string; deadline: string; product?: string; baselineImpact?: boolean; probability?: number; impact?: number; measures?: string }
  | { type: 'update-ticket'; kind: TicketKind; id: string; operation: 'feedback' | 'resolve' | 'transfer' | 'confirm' | 'return' | 'escalate' | 'mitigate'; note: string; ownerId?: string };
export function ticketTable(data: BusinessState, kind: TicketKind): (Requirement | Bug | Issue | Risk)[] {
  return kind === 'requirement' ? data.requirements : kind === 'bug' ? data.bugs : kind === 'issue' ? data.issues : data.risks;
}
export const TICKET_RULES = Object.freeze({ version: 'CASE-1', departmentAfterDays: 1, pmoAfterDays: 3, pmcAfterDays: 7 });
export function ticketMeta(data: BusinessState, kind: TicketKind, id: string): TicketMeta {
  const ticket = ticketTable(data, kind).find((t) => t.id === id)!;
  const meta: TicketMeta = data.ticketMeta[id] ?? { description: `${ticket.title}，请按原业务记录跟踪处理。`, category: '历史导入', deadline: 'deadline' in ticket ? ticket.deadline : '2026-09-20', ownerId: mockUsers.find((u) => u.name === ticket.owner)?.id,
    history: [{ date: AS_OF_DATE, actor: '数据迁移', action: '导入当前快照', detail: '此前历史未提供，原有状态和发起人保留。' }] };
  if ((kind === 'issue' || kind === 'risk') && !['已关闭', '已缓解', '已转问题'].includes(ticket.status)) {
    const days = Math.floor((Date.parse(AS_OF_DATE) - Date.parse(meta.deadline)) / 86400000);
    const escalation = days >= TICKET_RULES.pmcAfterDays ? 'PMC' : days >= TICKET_RULES.pmoAfterDays ? 'PMO' : days >= TICKET_RULES.departmentAfterDays ? '责任部门负责人' : undefined;
    if (escalation && !meta.escalatedTo) return { ...meta, escalatedTo: escalation };
  }
  return meta;
}
export const ticketLabels = { requirement: '需求', bug: 'BUG', issue: '问题', risk: '风险' };
export function applyTicketAction(state: BusinessState, action: TicketAction, actor: Actor): string {
  const requireWriter = () => { if (!['project-manager', 'solution-tech', 'pmo'].includes(actor.role)) throw new Error('当前角色只读'); };
  requireWriter();
  if (action.type === 'create-ticket') {
    const p = state.projects.find((p) => p.id === action.projectId);
    if (!p || !(actor.role === 'project-manager' && actor.id === p.pmId || p.memberIds?.includes(actor.id))) throw new Error('仅项目成员可登记');
    if (['issue', 'risk'].includes(action.kind) && !(actor.role === 'project-manager' && actor.id === p.pmId)) throw new Error('问题风险由项目主PM登记');
    if (state.lockedProjects.includes(p.id)) throw new Error('建设期已锁定，不能新增建设事项');
    if (!action.title.trim() || !action.description.trim() || !action.category.trim()) throw new Error('标题、类别和描述必填');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(action.deadline) || !Number.isFinite(Date.parse(action.deadline)) || action.deadline < AS_OF_DATE) throw new Error('期望解决日期无效或早于基准日');
    const owner = mockUsers.find((u) => u.id === action.ownerId);
    if (!owner) throw new Error('请选择有效责任人');
    const rankOptions = action.kind === 'requirement' ? ['高', '中', '低'] : action.kind === 'bug' ? ['致命', '严重', '一般', '轻微'] : ['重大', '重要', '一般'];
    if (action.kind !== 'risk' && !rankOptions.includes(action.rank)) throw new Error('优先级或严重性无效');
    if (action.kind === 'risk' && (![1, 2, 3, 4, 5].includes(action.probability ?? 0) || ![1, 2, 3, 4, 5].includes(action.impact ?? 0) || !action.measures?.trim())) throw new Error('风险概率、影响评分和应对措施必填');
    const id = `${({ requirement: 'REQ', bug: 'BUG', issue: 'ISSUE', risk: 'RSK' })[action.kind]}-NEW-${ticketTable(state, action.kind).length + 1}`;
    const base = { id, code: id, projectId: p.id, title: action.title.trim(), owner: owner.name };
    if (action.kind === 'requirement') state.requirements.push({ ...base, priority: action.rank as Requirement['priority'], status: '待处理', creator: actor.name, deadline: action.deadline });
    if (action.kind === 'bug') state.bugs.push({ ...base, severity: action.rank as Bug['severity'], status: '待修复', creator: actor.name, createdAt: AS_OF_DATE });
    if (action.kind === 'issue') state.issues.push({ ...base, severity: action.rank as Issue['severity'], status: '待解决', deadline: action.deadline });
    if (action.kind === 'risk') {
      const score = action.probability! * action.impact!;
      state.risks.push({ ...base, level: score >= 20 ? '特大' : score >= 12 ? '重大' : score >= 6 ? '中等' : '一般', status: '监控中', strategy: '减轻', identifiedDate: AS_OF_DATE });
    }
    p.memberIds = [...new Set([...(p.memberIds ?? []), owner.id, actor.id])];
    state.ticketMeta[id] = { description: action.description, category: action.category, deadline: action.deadline, creatorId: actor.id, ownerId: owner.id, probability: action.probability, impact: action.impact, measures: action.measures, product: action.product, baselineImpact: action.baselineImpact,
      escalatedTo: action.kind === 'risk' && action.probability! * action.impact! >= 12 || action.kind === 'issue' && action.rank === '重大' ? 'PMO' : undefined,
      history: [{ date: AS_OF_DATE, actor: actor.name, action: '新建提交', detail: action.description }] };
    return id;
  }
  const ticket = ticketTable(state, action.kind).find((t) => t.id === action.id);
  if (!ticket) throw new Error('原事项不存在');
  const p = state.projects.find((p) => p.id === ticket.projectId)!;
  const meta = structuredClone(ticketMeta(state, action.kind, ticket.id)); state.ticketMeta[ticket.id] = meta;
  const pm = actor.role === 'project-manager' && actor.id === p.pmId;
  const owner = meta.ownerId === actor.id || ticket.owner === actor.name;
  const creator = meta.creatorId ? meta.creatorId === actor.id : 'creator' in ticket && ticket.creator === actor.name;
  if (!action.note.trim()) throw new Error('处理说明或评价必填');
  if (ticket.status === '已关闭') throw new Error('已关闭事项不可修改');
  if (action.operation === 'confirm' || action.operation === 'return') {
    if (action.kind === 'risk') throw new Error('风险采用应对或转问题流程');
    const awaiting = action.kind === 'requirement' ? '待验证' : action.kind === 'bug' ? '待复测' : '已解决';
    if (ticket.status !== awaiting) throw new Error('尚未进入最终确认节点');
    if (action.kind === 'issue' ? !pm : !creator) throw new Error(action.kind === 'issue' ? '问题必须由主PM最终确认' : '仅发起人可以最终确认或退回');
    if (action.operation === 'confirm') { ticket.status = '已关闭'; meta.closedAt = AS_OF_DATE; }
    else ticket.status = action.kind === 'requirement' ? '开发中' : action.kind === 'bug' ? '修复中' : '处理中';
  } else if (action.operation === 'escalate') {
    if (!['issue', 'risk'].includes(action.kind) || !(pm || actor.role === 'pmo')) throw new Error('仅PM或PMO可督办升级');
    meta.escalatedTo = actor.role === 'pmo' ? 'PMC' : 'PMO';
  } else {
    if (!owner && !pm) throw new Error('仅责任人或项目主PM可处理');
    if (action.operation === 'transfer') {
      const next = mockUsers.find((u) => u.id === action.ownerId);
      if (!next || next.id === meta.ownerId) throw new Error('请选择另一位责任人');
      ticket.owner = next.name; meta.ownerId = next.id; p.memberIds = [...new Set([...(p.memberIds ?? []), next.id])];
    } else if (action.operation === 'resolve') {
      if (action.kind === 'risk') throw new Error('风险需记录应对措施');
      if (action.kind === 'requirement' && meta.baselineImpact && !state.planRequests.some((r) => r.id === meta.changeRequestId && r.status === '通过')) throw new Error('影响基线的需求须先通过关联变更');
      ticket.status = action.kind === 'requirement' ? '待验证' : action.kind === 'bug' ? '待复测' : '已解决';
    } else if (action.operation === 'mitigate') {
      if (action.kind !== 'risk' || ticket.status !== '监控中') throw new Error('仅监控中风险可登记缓解');
      ticket.status = '已缓解'; meta.measures = action.note;
    } else if (action.operation === 'feedback' && ['待处理', '待修复', '待解决'].includes(ticket.status)) ticket.status = action.kind === 'requirement' ? '开发中' : action.kind === 'bug' ? '修复中' : '处理中';
  }
  if (action.operation === 'feedback' && action.kind === 'risk') meta.measures = action.note;
  meta.history.push({ date: AS_OF_DATE, actor: actor.name, action: action.operation, detail: action.note });
  return ticket.id;
}
