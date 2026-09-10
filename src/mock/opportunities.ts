import { canAccessOpportunityScope, isInitiationParticipant } from './access-scope';
import { selectGradingRule, selectTemplate } from '@/mock/configuration';
import { AS_OF_DATE, mockCustomers, mockDepartments, mockUsers } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import type { AssessmentDimension, DimensionOpinion, OpportunityInput, OpportunityMeta } from '@/models/opportunities';
import type { Opportunity } from '@/models/types';
import type { UserRole } from '@/store/useAppStore';
import { money, percentage } from '@/utils/money';

export const OPPORTUNITY_RULE = { version: 'OPP-2026-01', minimumScore: 70, minimumMargin: 20, lowScore: 50, name: '商机初评演示规则' };
export const DIMENSIONS: { key: AssessmentDimension; name: string; role: UserRole; prompt: string }[] = [
  { key: 'customer', name: '客户价值', role: 'market', prompt: '客户级别、预算落实、决策链与持续合作价值' },
  { key: 'technology', name: '技术可行性', role: 'solution-tech', prompt: '产品适配、技术复杂度与外部依赖；不可行将阻断拟立项' },
  { key: 'commercial', name: '商务风险', role: 'market', prompt: '采购方式、付款条件、合同模式及客户资金风险' },
  { key: 'competition', name: '竞争态势', role: 'market', prompt: '竞争强度、差异化优势与签约概率' },
  { key: 'delivery', name: '交付难度', role: 'solution-tech', prompt: '计划工期、可用资源、现场条件和第三方协同' },
  { key: 'margin', name: '收益与毛利', role: 'finance', prompt: '收入取商机预计金额，输入初步成本并自动计算毛利' },
];
export function opportunityMeta(state: BusinessState, o: Opportunity): OpportunityMeta {
  return state.opportunityMeta[o.id] ?? { source: '客户需求', projectType: '综合集成', description: `${o.customerName}数字化建设与业务协同需求。`, competition: '客户处于方案选型阶段，需持续跟踪竞争与采购进展。', businessLine: '数字政务', region: mockCustomers.find(c => c.id === o.customerId)?.region ?? '福建省', collaborators: ['U-005'], attachments: [], followups: [], assessments: [], pauses: [] };
}
export function canViewOpportunity(state: BusinessState, o: Opportunity, actor: Actor) {
  if (!canAccessOpportunityScope(state, actor, o)) return false;
  if (['executive', 'pmo', 'finance', 'solution-tech', 'admin'].includes(actor.role)) return true;
  if (actor.role === 'market') return o.ownerId === actor.id || o.departmentId === 'D-002';
  return isInitiationParticipant(state, actor, o.id) || state.projects.some(p => p.opportunityId === o.id && (p.pmId === actor.id || p.memberIds?.includes(actor.id)));
}
export function canManageOpportunity(state: BusinessState, o: Opportunity, actor: Actor) { return actor.role === 'market' && canViewOpportunity(state, o, actor); }
export function opportunityLocked(state: BusinessState, o: Opportunity) { return ['拟立项', '方案评审中', '已转立项', '已终止'].includes(o.status) || state.estimates.some(e => e.opportunityId === o.id && e.isFrozen); }
export function basicMissing(o: Opportunity, m: OpportunityMeta) { return [!o.name.trim() && '商机名称', !o.customerId && '客户', !o.departmentId && '主办部门', !o.ownerId && '负责人', !(o.estimatedAmount > 0) && '预计金额', !m.source.trim() && '商机来源', !m.projectType.trim() && '项目类型', !m.description.trim() && '业务背景与需求'].filter(Boolean) as string[]; }
export function assessmentSummary(o: Opportunity, m: OpportunityMeta) {
  const round = m.assessments.at(-1); const rule=round?.ruleSnapshot??OPPORTUNITY_RULE; const opinions = round?.opinions ?? {};
  const complete = DIMENSIONS.filter(d => opinions[d.key]);
  const weight=(key:AssessmentDimension)=>round?.templateSnapshot?.rows.find(r=>r.id===`item-${DIMENSIONS.findIndex(d=>d.key===key)+1}`)?.weight??1;const totalWeight=complete.reduce((n,d)=>n+weight(d.key),0);const score = complete.length&&totalWeight>0 ? money(complete.reduce((n,d) => n + opinions[d.key]!.score*weight(d.key), 0) / totalWeight) : null;
  const cost = opinions.margin?.preliminaryCost; const margin = cost === undefined ? null : money(o.estimatedAmount - cost); const marginRate = percentage(margin ?? 0, o.estimatedAmount);
  const missing = [...basicMissing(o,m), ...DIMENSIONS.filter(d => !opinions[d.key]).map(d => `${d.name}意见未提交`)];
  if (Object.values(opinions).some(v => v.conclusion === '不可行')) missing.push('存在专业不可行项');
  if (score !== null && score < rule.minimumScore) missing.push(`综合评分低于${rule.minimumScore}分`);
  if (cost !== undefined && (marginRate === null || marginRate < rule.minimumMargin)) missing.push(`预估毛利率低于${rule.minimumMargin}%`);
  const riskLevel = Object.values(opinions).some(v => v.conclusion === '不可行' || v.score < OPPORTUNITY_RULE.lowScore) ? '高风险' : missing.length || Object.values(opinions).some(v => v.conclusion === '有条件可行') ? '关注' : '正常';
  return { rule, round, score, cost, margin, marginRate: cost === undefined ? null : marginRate, missing, riskLevel, suggestion: missing.length ? '暂缓' : '拟立项', complete: complete.length };
}
export function initiationMissing(state: BusinessState, o: Opportunity) {
  const m = opportunityMeta(state,o);
  return [o.status !== '拟立项' && '商机未达到拟立项', !m.solutionTask || m.solutionTask.status !== '已完成' || state.presales[o.id]?.reviews.at(-1)?.status !== '通过' ? '方案及专家评审未通过' : false, !state.estimates.some(e => e.id === o.currentEstimateVersionId && e.isFrozen) && '缺少指定冻结概算版本', state.projects.some(p => p.opportunityId === o.id) && '商机已关联正式项目'].filter(Boolean) as string[];
}
export type OpportunityAction =
 | { type: 'save-opportunity'; id?: string; input: OpportunityInput; submit: boolean; duplicateConfirmed?: boolean }
 | { type: 'start-opportunity-assessment'; id: string }
 | { type: 'save-opportunity-dimension'; id: string; dimension: AssessmentDimension; opinion: Omit<DimensionOpinion,'by'|'role'|'date'> }
 | { type: 'conclude-opportunity'; id: string; conclusion: '跟进中' | '拟立项' | '暂缓' | '已终止'; reason: string; reviewDate?: string; reviewOwnerId?: string; costDisposition?: string; retrospective?: string }
 | { type: 'follow-opportunity'; id: string; date: string; communication: string; requirementChange: string; commercialProgress: string; nextPlan: string };
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
export function applyOpportunityAction(state: BusinessState, action: OpportunityAction, actor: Actor) {
  if (action.type === 'save-opportunity') {
    const old = action.id ? state.opportunities.find(o => o.id === action.id) : undefined;
    if (action.id && !old) throw new Error('商机不存在');
    if (actor.role !== 'market' || old && !canManageOpportunity(state,old,actor)) throw new Error('仅权限范围内市场主办可维护商机');
    if (old && opportunityLocked(state,old)) throw new Error('已冻结或已进入拟立项的商机禁止直接覆盖，请通过重新评估或项目变更处理');
    if (old && opportunityMeta(state,old).assessments.some(a => a.status === '评估中')) throw new Error('评估期间基础输入已锁定');
    const v = action.input; const customer = mockCustomers.find(c => c.id === v.customerId); const owner = mockUsers.find(u => u.id === v.ownerId); const department = mockDepartments.find(d => d.id === v.departmentId);
    if (!v.name.trim() || !customer || !owner || !department) throw new Error('商机名称、有效客户、负责人和主办部门必填');
    if (department.id !== 'D-002' && owner.id !== actor.id) throw new Error('当前市场角色仅可维护本人或智慧城市业务群商机');
    if (!Number.isFinite(v.estimatedAmount) || v.estimatedAmount < 0 || !Number.isFinite(v.winRate) || v.winRate < 0 || v.winRate > 100) throw new Error('金额及赢单概率无效');
    if (v.expectedSignDate && !validDate(v.expectedSignDate)) throw new Error('预计签约日期无效');
    if (state.opportunities.some(o => o.id !== old?.id && o.customerId === v.customerId && (o.name.includes(v.name.trim()) || v.name.includes(o.name))) && !action.duplicateConfirmed) throw new Error('同客户存在相似商机，请核对并确认后保存');
    const id = old?.id ?? `OPP-NEW-${state.opportunities.length + 1}`;
    const o: Opportunity = { ...(old ?? { id, code: `OPP-2026-N${state.opportunities.length + 1}`, earlyInvestmentQuota: 0, earlyInvestmentUsed: 0, createdAt: AS_OF_DATE }), name: v.name.trim(), customerId: customer.id, customerName: customer.name, departmentId: department.id, departmentName: department.name, ownerId: owner.id, ownerName: owner.name, estimatedAmount: money(v.estimatedAmount), winRate: v.winRate, expectedSignDate: v.expectedSignDate, status: action.submit ? '待评估' : '草稿' };
    const m = { ...(old ? opportunityMeta(state,old) : { followups: [], assessments: [], pauses: [] }), source: v.source, projectType: v.projectType, description: v.description, competition: v.competition, businessLine: v.businessLine, region: v.region, collaborators: v.collaborators, attachments: v.attachments };
    if (action.submit && basicMissing(o,m).length) throw new Error(`提交缺少：${basicMissing(o,m).join('、')}`);
    if (old) state.opportunities[state.opportunities.indexOf(old)] = o; else state.opportunities.push(o);
    state.opportunityMeta[id] = m; return id;
  }
  const o = state.opportunities.find(o => o.id === action.id);
  if (!o || !canViewOpportunity(state,o,actor)) throw new Error('商机不存在或无权访问');
  const m = state.opportunityMeta[o.id] ??= structuredClone(opportunityMeta(state,o));
  if (action.type === 'save-opportunity-dimension') {
    const dimension = DIMENSIONS.find(d => d.key === action.dimension); const round = m.assessments.at(-1);
    if (!dimension || dimension.role !== actor.role || actor.role === 'market' && !canManageOpportunity(state,o,actor)) throw new Error('仅本专业角色可修改负责的评估维度');
    if (!round || round.status !== '评估中') throw new Error('请先发起新一轮评估');
    const v = action.opinion;
    if (!Number.isFinite(v.score) || v.score < 0 || v.score > 100 || !v.note.trim() || !['可行','有条件可行','不可行'].includes(v.conclusion)) throw new Error('评分须为0至100，结论及说明必填');
    if (v.conclusion !== '可行' && !v.risk.trim()) throw new Error('有条件或不可行结论须填写风险项');
    if (action.dimension === 'margin' && (v.preliminaryCost === undefined || !Number.isFinite(v.preliminaryCost) || v.preliminaryCost < 0)) throw new Error('财务初步成本须为非负金额');
    round.opinions[action.dimension] = { ...v, by: actor.name, role: actor.role, date: AS_OF_DATE }; return o.id;
  }
  if (!canManageOpportunity(state,o,actor)) throw new Error('仅市场主办角色可办理此操作');
  if (['已终止','已转立项'].includes(o.status)) throw new Error('已归档或转立项商机只读');
  if (action.type === 'follow-opportunity') {
    if (!validDate(action.date) || action.date > AS_OF_DATE || action.date < o.createdAt || !action.communication.trim() || !action.nextPlan.trim()) throw new Error('有效跟进日期、客户沟通和下一步计划必填，日期不得晚于演示日');
    m.followups.push({ id: `FOLLOW-${o.id}-${m.followups.length + 1}`, date: action.date, communication: action.communication.trim(), requirementChange: action.requirementChange, commercialProgress: action.commercialProgress, nextPlan: action.nextPlan.trim(), author: actor.name }); return o.id;
  }
  if (action.type === 'start-opportunity-assessment') {
    if (o.status === '拟立项' || o.status === '方案评审中') throw new Error('已进入方案流程，请在方案评审中处理');
    if (basicMissing(o,m).length) throw new Error(`必要信息不完整：${basicMissing(o,m).join('、')}`);
    if (m.assessments.at(-1)?.status === '评估中') throw new Error('已有进行中的评估');
    const grading=selectGradingRule(state,o.departmentId,m.projectType);
    const template=selectTemplate(state,'assessment',o.departmentId,m.projectType);if(!template)throw new Error('无适用商机评估模板');m.assessments.push({ templateSnapshot:structuredClone(template), ruleSnapshot:{version:grading.id,minimumScore:grading.minimumAssessmentScore,minimumMargin:grading.minimumMargin}, id: `ASSESS-${o.id}-${m.assessments.length + 1}`, version: m.assessments.length + 1, status: '评估中', opinions: {}, startedAt: AS_OF_DATE }); o.status = '待评估'; return o.id;
  }
  if (!action.reason.trim()) throw new Error('决策原因必填');
  if (action.conclusion === '暂缓') {
    const owner = mockUsers.find(u => u.id === action.reviewOwnerId);
    if (!action.reviewDate || !validDate(action.reviewDate) || action.reviewDate <= AS_OF_DATE || !owner) throw new Error('暂缓须填写晚于演示日的复评日期及责任人');
    m.pauses.push({ reason: action.reason, reviewDate: action.reviewDate, ownerId: owner.id, ownerName: owner.name, date: AS_OF_DATE });
  } else if (action.conclusion === '已终止') {
    if (o.earlyInvestmentUsed > 0 && (!action.costDisposition?.trim() || !action.retrospective?.trim())) throw new Error('已有提前投入，终止必须填写成本处置说明及退出复盘');
    m.termination = { reason: action.reason, costDisposition: action.costDisposition ?? '', retrospective: action.retrospective ?? '', costSnapshot: o.earlyInvestmentUsed, date: AS_OF_DATE };
  } else {
    const s = assessmentSummary(o,m);
    if (!s.round || s.round.status !== '评估中' || s.complete !== DIMENSIONS.length) throw new Error('请完成本轮六个专业维度评估');
    if (action.conclusion === '拟立项' && s.missing.length) throw new Error(`拟立项阻断：${s.missing.join('、')}`);
    if (action.conclusion === '拟立项') m.solutionTask ??= { id: `SOL-TASK-${o.id}`, opportunityId: o.id, assessmentId: s.round.id, ownerId: 'U-005', ownerName: mockUsers.find(u => u.id === 'U-005')!.name, status: '待开始', createdAt: AS_OF_DATE, dueDate: '2026-09-20' };
  }
  const round = m.assessments.at(-1); const summary = assessmentSummary(o,m);
  if (round?.status === '评估中') Object.assign(round,{ status:'已确认', conclusion: action.conclusion, reason: action.reason, confirmedAt: AS_OF_DATE, ruleVersion: summary.rule.version, score: summary.score ?? undefined, riskLevel: summary.riskLevel });
  o.status = action.conclusion; return o.id;
}
