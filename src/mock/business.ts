import { applyEstimateAction, type EstimateAction } from '@/mock/estimates';
import type { EstimateDraft, EstimateMetadata } from '@/models/estimates';
import { applyTeamAction, type TeamAction } from './team';
import { budgetOverruns, saveBudgetDraft, toBudgetVersion, validateBudgetDraft, type BudgetDraftAction } from './budget-drafts';
import { applyPresalesAction, type PresalesAction } from '@/mock/presales';
import type { PresalesWorkspace } from '@/models/presales';
import { applyBudgetPlanningAction, budgetBaselineProposal, confirmBudgetBaseline, initializePlanning, teamResources, planningSnapshot, type BudgetPlanningAction } from '@/mock/budget';
import type { PlanningDraft, PlanningReview, ProjectTeam, BudgetDraft } from '@/models/budget';
import { initAcceptanceFixture } from '@/mock/acceptance-fixture';
import { applyAcceptanceAction, type AcceptanceAction } from '@/mock/acceptance';
import type { AcceptanceDetail, AcceptanceReport } from '@/models/settlement';
import { applyOpportunityAction, type OpportunityAction } from '@/mock/opportunities';
import type { OpportunityMeta } from '@/models/opportunities';
import { stageChecks, stageSnapshot, STAGE_RULE, type StageSnapshot } from '@/mock/stage';
import { applyLaborAction, type LaborAction, type LaborEntry } from '@/mock/labor';
import { applyDeliverableAction, type DeliverableAction, type DocumentDetails, type QualityPlan } from '@/mock/deliverables';
import { applyReportAction, type ReportAction } from '@/mock/reports';
import { applyCostOrderAction, type CostOrder, type CostOrderAction } from '@/mock/cost-orders';
import { applyTicketAction, ticketMeta, type TicketAction, type TicketMeta } from '@/mock/tickets';
import { create } from 'zustand';
import { AS_OF_DATE, mockOpportunities, mockContracts, mockProjects, mockBudgetVersions, mockBaselineVersions, mockIssues, mockRisks, mockBugs, mockDecisions, mockAcceptances, mockCostItems, mockEstimateVersions, mockMilestones, mockSettlements, mockReceiptPlans, mockChanges, mockWbsTasks, mockRequirements, mockDailyReports, mockWeeklyReports } from '@/mock';
import type { Opportunity, Contract, ReceiptPlan, Project, BudgetVersion, BaselineVersion, Issue, Risk, Bug, CostItem, DecisionItem, AcceptanceRecord, EstimateVersion, Milestone, SettlementRecord, ProjectChange, WbsTask, Requirement, DailyReport, WeeklyReport } from '@/models/types';
import type { UserRole } from '@/store/useAppStore';
import { allocateMoney, money, percentage, sumMoney } from '@/utils/money';
import { assessHealth } from '@/utils/health';
import { projectEstimate } from '@/mock/versions';
import { assertConstructionWritable } from '@/mock/construction-lock';

export interface Actor { id: string; name: string; role: UserRole }
export interface Approval {
  id: string; projectId: string; kind: 'budget' | 'change'; status: '待审批' | '通过' | '驳回';
  budget: BudgetVersion; baseline: BaselineVersion; submittedBy: string; reason: string;
  requiredRole: 'pmo' | 'executive'; opinion?: string;
  estimate: EstimateVersion; sourceChangeId?: string; baselineConfirmedAt?: string; baselineConfirmedBy?: string;
}
export interface ManagementApproval {
  id: string; projectId: string; sourceId: string; type: DecisionItem['type'];
  reason: string; submittedBy: string; status: '待审批' | '通过' | '驳回'; opinion?: string;
  originalQuota?: number; proposedQuota?: number; impactAmount: number;
}
export interface PlanRequest {
  stageSnapshot?: StageSnapshot; approvalSnapshot?: StageSnapshot; reviewedAt?: string;
  id: string; projectId: string; kind: 'schedule' | 'stage'; reason: string; status: '待审批' | '通过' | '驳回';
  requiredRoles: ('pmo' | 'finance')[]; reviews: { role: UserRole; approve: boolean; opinion: string }[]; sourceRequirementId?: string; submittedBy: string; submittedAt: string; baselineId: string; tasks: WbsTask[]; shiftDays: number; opinion?: string;
}
export interface Material extends DocumentDetails { id: string; projectId: string; name: string; required: boolean; status: '缺失' | '待提交' | '待审核' | '通过' | '驳回' }
export interface BusinessState {
  estimateDrafts: Record<string, EstimateDraft>; estimateMeta: Record<string, EstimateMetadata>;
  projectTeams: Record<string,ProjectTeam>; budgetDrafts: Record<string,BudgetDraft>;
  presales: Record<string, PresalesWorkspace>;
  planningDrafts: Record<string,PlanningDraft>; planningReviews: PlanningReview[];
  opportunities: Opportunity[]; opportunityMeta: Record<string, OpportunityMeta>;
  contracts: Contract[]; acceptanceDetails: Record<string, AcceptanceDetail>; acceptanceReports: AcceptanceReport[];
  receiptPlans: ReceiptPlan[];
  constructionFreezes: Record<string, { requestId: string; reason: string }>;
  laborEntries: LaborEntry[]; qualityPlans: Record<string, QualityPlan>; dailyReports: DailyReport[]; weeklyReports: WeeklyReport[]; costOrders: CostOrder[]; requirements: Requirement[]; ticketMeta: Record<string, TicketMeta>; tasks: WbsTask[]; planRequests: PlanRequest[]; projects: Project[]; budgets: BudgetVersion[]; baselines: BaselineVersion[];
  estimates: EstimateVersion[]; milestones: Milestone[]; settlements: SettlementRecord[];
  issues: Issue[]; risks: Risk[]; bugs: Bug[]; costs: CostItem[];
  changes: ProjectChange[]; managementApprovals: ManagementApproval[]; approvals: Approval[]; decisions: DecisionItem[]; acceptances: AcceptanceRecord[];
  materials: Material[]; lockedProjects: string[]; maintenanceCosts: CostItem[];
  audit: { id: string; actor: string; action: string; target: string; date: string }[];
}
export function createBusinessState(): BusinessState {
  const state: BusinessState = structuredClone({ estimateDrafts: {}, estimateMeta: {}, projectTeams: {}, budgetDrafts: {}, presales: {}, planningDrafts: {}, planningReviews: [], acceptanceDetails: {}, acceptanceReports: [], opportunities: mockOpportunities, opportunityMeta: {}, contracts: mockContracts, receiptPlans: mockReceiptPlans, constructionFreezes: {}, laborEntries: [], qualityPlans: {}, dailyReports: mockDailyReports, weeklyReports: mockWeeklyReports, costOrders: [], requirements: mockRequirements, ticketMeta: {}, tasks: mockWbsTasks, planRequests: [], projects: mockProjects.map((project) => ({ ...project, frozenEstimateVersionId: projectEstimate(project, mockEstimateVersions)?.id })), budgets: mockBudgetVersions, baselines: mockBaselineVersions,
    estimates: mockEstimateVersions, milestones: mockMilestones, settlements: mockSettlements,
    issues: mockIssues, risks: mockRisks, bugs: mockBugs, costs: mockCostItems, approvals: [], changes: mockChanges, managementApprovals: [],
    decisions: mockDecisions, acceptances: mockAcceptances, lockedProjects: ['P-008'], maintenanceCosts: [], audit: [],
    materials: mockProjects.flatMap((p) => ['测试报告', '验收确认函', '实施计划'].map((name, i) => ({
      id: `MAT-${p.id}-${i}`, projectId: p.id, name, required: true,
      status: p.status === '已结算' || name === '实施计划' && mockMilestones.some((m) => m.projectId === p.id && m.type === '启动' && m.status === '已达成') ? '通过' as const : '缺失' as const,
    }))),
  });
  for (const opportunity of state.opportunities) {
    const candidates = state.estimates.filter((e) => e.opportunityId === opportunity.id && e.isFrozen);
    if (!opportunity.currentEstimateVersionId && candidates.length === 1) opportunity.currentEstimateVersionId = candidates[0].id;
  }
  initializePlanning(state);
  for(const p of state.projects)state.projectTeams[p.id]={members:teamResources(state,p.id),appointments:[{id:`APPOINT-${p.id}-1`,userId:p.pmId,name:p.pmName,status:'已接受',nominatedAt:p.plannedStartDate,nominatedBy:'PMO',respondedAt:p.plannedStartDate,opinion:'原立项任命接收记录'}],history:[]};
  initAcceptanceFixture(state);
  return state;
}
export type BusinessAction = EstimateAction | TeamAction | BudgetDraftAction | PresalesAction | BudgetPlanningAction | AcceptanceAction | OpportunityAction | LaborAction | DeliverableAction | ReportAction | CostOrderAction | TicketAction
  | { type: 'submit-budget'; projectId: string; budget: BudgetVersion; reason: string }
  | { type: 'review'; approvalId: string; approve: boolean; opinion: string }
  | { type: 'review-management'; id: string; approve: boolean; opinion: string }
  | { type: 'update-task'; id: string; progress: number; actualStartDate: string; actualEndDate?: string; note: string }
  | { type: 'request-plan'; projectId: string; kind: 'schedule' | 'stage'; reason: string; shiftDays: number; sourceRequirementId?: string }
  | { type: 'review-plan'; id: string; approve: boolean; opinion: string }
  | { type: 'close-issue'; id: string }
  | { type: 'close-bug'; id: string }
  | { type: 'risk-to-issue'; id: string; note?: string }
  | { type: 'stage-gate'; projectId: string }
  | { type: 'settle'; projectId: string }
  | { type: 'confirm-cost'; cost: CostItem; fromCommitment?: boolean; maintenance?: boolean };

/** Pure transition: validate first and clone, so failed actions never partially update the shared store. */
export function transition(previous: BusinessState, action: BusinessAction, actor: Actor): BusinessState {
  const state = structuredClone(previous);
  const requireRole = (...roles: UserRole[]) => { if (!roles.includes(actor.role)) throw new Error('当前角色无权执行此操作'); };
  const project = (id: string) => {
    const value = state.projects.find((p) => p.id === id);
    if (!value) throw new Error('项目不存在');
    return value;
  };
  let target = '';
  if (action.type === 'estimate-create-draft' || action.type === 'estimate-save-draft' || action.type === 'estimate-publish' || action.type === 'estimate-freeze') {
    target = applyEstimateAction(state, action, actor);
  } else if (action.type === 'presales-research' || action.type === 'presales-save-solution' || action.type === 'presales-save-cost' || action.type === 'presales-finance-check' || action.type === 'presales-submit-review' || action.type === 'presales-expert-opinion' || action.type === 'presales-review-decision' || action.type === 'presales-correction-reply') {
    target = applyPresalesAction(state, action, actor);
  } else if (action.type === 'save-opportunity' || action.type === 'start-opportunity-assessment' || action.type === 'save-opportunity-dimension' || action.type === 'conclude-opportunity' || action.type === 'follow-opportunity') {
    target = applyOpportunityAction(state, action, actor);
  } else if (action.type === 'submit-acceptance' || action.type === 'review-acceptance' || action.type === 'reply-acceptance' || action.type === 'confirm-acceptance' || action.type === 'save-acceptance-proof' || action.type === 'save-acceptance-report' || action.type === 'confirm-acceptance-report') {
    target = applyAcceptanceAction(state, action, actor);
  } else if (action.type === 'save-planning' || action.type === 'submit-planning' || action.type === 'review-planning' || action.type === 'reply-planning' || action.type === 'confirm-budget-baseline') {
    target = applyBudgetPlanningAction(state, action, actor);
  } else if (action.type==='save-team-member'||action.type==='exit-team-member'||action.type==='nominate-pm'||action.type==='respond-pm') {
    target=applyTeamAction(state,action,actor);
  } else if(action.type==='save-budget-draft'){target=saveBudgetDraft(state,action.draft,action.expectedRevision,actor);
  } else if(action.type==='submit-budget-draft'){
    const draft=state.budgetDrafts[action.projectId];if(!draft)throw new Error('请先保存预算草稿');validateBudgetDraft(state,draft,true);
    const next=transition(state,{type:'submit-budget',projectId:action.projectId,budget:toBudgetVersion(draft,actor),reason:`${draft.reason}；措施：${draft.mitigation}；责任：${draft.responsibility}`},actor);
    next.budgetDrafts[action.projectId].submittedApprovalId=next.approvals.at(-1)!.id;return next;
  } else if (action.type === 'submit-labor' || action.type === 'review-labor') {
    target = applyLaborAction(state, action, actor);
  } else if (action.type === 'document-action' || action.type === 'add-document' || action.type === 'quality-plan' || action.type === 'quality-check' || action.type === 'complete-milestone') {
    target = applyDeliverableAction(state, action, actor);
  } else if (action.type === 'save-daily' || action.type === 'create-weekly' || action.type === 'save-weekly') {
    target = applyReportAction(state, action, actor);
  } else if (action.type === 'submit-cost-order' || action.type === 'process-cost-order') {
    target = applyCostOrderAction(state, action, actor);
  } else if (action.type === 'create-ticket' || action.type === 'update-ticket') {
    target = applyTicketAction(state, action, actor);
  } else if (action.type === 'submit-budget') {
    const p = project(action.projectId); target = p.id;
    requireRole('project-manager', 'finance');
    if (actor.role === 'project-manager' && actor.id !== p.pmId) throw new Error('仅项目主PM可提交');
    assertConstructionWritable(state, p.id);
    if (action.budget.projectId !== p.id || action.budget.totalAmount < 0 || !Number.isFinite(action.budget.totalAmount)) throw new Error('预算数据无效');
    const sum = action.budget.items.reduce((total, item) => total + item.amount, 0);
    if (Math.abs(sum - action.budget.totalAmount) > 0.000001 || action.budget.items.some((i) => i.amount < 0 || !Number.isFinite(i.amount))) throw new Error('预算科目合计不符');
    if (state.approvals.some((a) => a.projectId === p.id && (a.status === '待审批' || a.kind === 'budget' && a.status === '通过' && !a.baselineConfirmedAt))) throw new Error('已有待审批预算');
    const estimate = projectEstimate(p, state.estimates);
    if (!estimate) throw new Error('缺少冻结概算');
    const overEstimateReasons=budgetOverruns(action.budget,estimate);
    const isOverEstimate = overEstimateReasons.length>0;
    if (isOverEstimate && !action.reason.trim()) throw new Error('超概算提交必须说明原因');
    const baseline = budgetBaselineProposal(state, p.id);
    baseline.snapshot = { ...planningSnapshot(state,p.id), budget: structuredClone(action.budget), estimateVersionId: estimate.id, planningReviewId: state.planningDrafts[p.id]?.reviewId };
    const id = `APR-${state.approvals.length + 1}`;
    state.approvals.push({ id, projectId: p.id, kind: 'budget', status: '待审批', budget: { ...structuredClone(action.budget), isOverEstimate, overEstimateReasons }, estimate: structuredClone(estimate),
      baseline: structuredClone(baseline), submittedBy: actor.id, reason: action.reason,
      requiredRole: isOverEstimate ? 'executive' : 'pmo' });
    state.decisions.push({ id, projectId: p.id, projectName: p.name, type: '超概算审批', title: `${p.name}预算审批`,
      impactAmount: money(action.budget.totalAmount - p.budgetAmount), level: isOverEstimate ? 'PMC决策会' : 'PMO立项会',
      status: '待决策', targetRoute: `/approvals/${id}`, createdAt: AS_OF_DATE });
  } else if (action.type === 'review') {
    const approval = state.approvals.find((a) => a.id === action.approvalId);
    if (!approval || approval.status !== '待审批') throw new Error('审批不存在或已处理');
    requireRole(approval.requiredRole);
    if (!action.opinion.trim()) throw new Error('审批意见必填');
    const p = project(approval.projectId); target = approval.id;
    assertConstructionWritable(state, p.id);
    if (action.approve) {
      if (approval.kind === 'change') confirmBudgetBaseline(state, approval, actor);
      else state.budgets.push({...structuredClone(approval.budget),id:`BUD-PENDING-${approval.id}`,version:`待确认-${approval.id}`,status:'待确认'});
      // Regular budget approval waits for a separate PMO baseline confirmation.

    }
    if (approval.sourceChangeId) {
      const change = state.changes.find((c) => c.id === approval.sourceChangeId)!;
      change.status = action.approve ? '已批准' : '已否决';
      if (action.approve) change.newBaselineId = `BASE-${approval.id}`;
    }
    approval.status = action.approve ? '通过' : '驳回'; approval.opinion = action.opinion;
    const decision = state.decisions.find((d) => d.id === approval.id);
    if (decision) decision.status = action.approve ? '已通过' : '已否决';
  } else if (action.type === 'review-management') {
    requireRole('executive');
    const approval = state.managementApprovals.find((a) => a.id === action.id);
    if (!approval || approval.status !== '待审批') throw new Error('审批不存在或已处理');
    if (!action.opinion.trim()) throw new Error('审批意见必填');
    const p = project(approval.projectId); target = approval.id;
    if (action.approve && approval.type === '未签额外投入') {
      if (!p.isUnsigned || p.unsignedLimitQuota !== approval.originalQuota || !approval.proposedQuota || approval.proposedQuota <= (p.unsignedLimitQuota ?? 0)) throw new Error('额度或未签状态已变化，请重新申报');
      p.unsignedLimitQuota = approval.proposedQuota;
    }
    // Coordination decisions retain the source risk, acceptance and locked settlement state.
    approval.status = action.approve ? '通过' : '驳回'; approval.opinion = action.opinion.trim();
    const decision = state.decisions.find((d) => d.id === approval.id)!;
    decision.status = action.approve ? '已通过' : '已否决';
  } else if (action.type === 'update-task') {
    const task = state.tasks.find((t) => t.id === action.id);
    if (!task) throw new Error('任务不存在');
    const p = project(task.projectId); target = task.id;
    requireRole('project-manager', 'solution-tech');
    if (!(actor.role === 'project-manager' && actor.id === p.pmId) && actor.id !== task.ownerId) throw new Error('仅项目主PM或任务责任人可更新');
    if (state.lockedProjects.includes(p.id) || p.phase === '已关闭') throw new Error('已关闭项目不可更新建设任务');
    if (!Number.isFinite(action.progress) || action.progress < task.progress || action.progress > 100) throw new Error('完成率不可回退且须在0到100之间');
    if (!action.note.trim()) throw new Error('执行说明必填');
    const dateValid = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && value <= AS_OF_DATE;
    if (action.progress > 0 && !dateValid(action.actualStartDate)) throw new Error('实际开始时间必填且不可晚于基准日');
    if (action.progress === 100 && (!dateValid(action.actualEndDate) || action.actualEndDate! < action.actualStartDate)) throw new Error('完成任务须填写有效实际完成时间');
    if (action.progress < 100 && action.actualEndDate) throw new Error('未完成任务不能填写实际完成时间');
    task.progress = action.progress; task.actualStartDate = action.actualStartDate || undefined; task.actualEndDate = action.actualEndDate; task.executionNote = action.note;
    task.status = action.progress === 100 ? '已完成' : action.progress === 0 ? '未开始' : task.endDate < AS_OF_DATE ? '已延期' : '进行中';
    const tasks = state.tasks.filter((t) => t.projectId === p.id);
    p.progressRate = money(tasks.reduce((sum, t) => sum + t.progress * t.plannedDays, 0) / tasks.reduce((sum, t) => sum + t.plannedDays, 0));
  } else if (action.type === 'request-plan') {
    const p = project(action.projectId); target = p.id;
    requireRole('project-manager');
    if (actor.id !== p.pmId || state.lockedProjects.includes(p.id)) throw new Error('仅未锁定项目主PM可提交');
    assertConstructionWritable(state, p.id);
    if (p.phase !== '执行' || p.status === '已终止') throw new Error('仅执行中项目可申请计划或阶段变更');
    if (!action.reason.trim()) throw new Error('申请说明必填');
    if (action.kind === 'schedule' && (!Number.isInteger(action.shiftDays) || action.shiftDays < 1 || action.shiftDays > 90)) throw new Error('演示计划顺延须为1至90天');
    if (state.planRequests.some((r) => r.projectId === p.id && r.status === '待审批')) throw new Error('已有待审批计划事项');
    const origin = action.sourceRequirementId ? state.requirements.find((r) => r.id === action.sourceRequirementId && r.projectId === p.id) : undefined;
    if (action.sourceRequirementId && !origin) throw new Error('来源需求与项目不符');
    const baseline = state.baselines.find((b) => b.projectId === p.id && b.status === '已生效')!;
    if (origin && state.ticketMeta[origin.id]) state.ticketMeta[origin.id].changeRequestId = `PLAN-${state.planRequests.length + 1}`;
    state.planRequests.push({ id: `PLAN-${state.planRequests.length + 1}`, projectId: p.id, kind: action.kind, sourceRequirementId: origin?.id, reason: action.reason, shiftDays: action.shiftDays, status: '待审批', requiredRoles: action.kind === 'schedule' && action.shiftDays > 30 ? ['pmo', 'finance'] : ['pmo'], reviews: [], submittedBy: actor.id, submittedAt: AS_OF_DATE, baselineId: baseline.id, tasks: structuredClone(state.tasks.filter((t) => t.projectId === p.id)), stageSnapshot: action.kind === 'stage' ? stageSnapshot(state,p.id) : undefined });
  } else if (action.type === 'review-plan') {
    const request = state.planRequests.find((r) => r.id === action.id);
    if (!request || request.status !== '待审批') throw new Error('事项不存在或已处理');
    requireRole(...request.requiredRoles);
    if (request.reviews.some((r) => r.role === actor.role)) throw new Error('当前节点已处理');
    if (!action.opinion.trim()) throw new Error('审批意见必填');
    const p = project(request.projectId); target = request.id;
    request.reviews.push({ role: actor.role, approve: action.approve, opinion: action.opinion });
    const allPassed = request.requiredRoles.every((role) => request.reviews.some((r) => r.role === role && r.approve));
    if (action.approve && allPassed) {
      if (request.kind === 'stage') {
        if (state.baselines.find((b) => b.projectId === p.id && b.status === '已生效')?.id !== request.baselineId) throw new Error('基线已变化，请重新申报阶段切换');
        request.approvalSnapshot = stageSnapshot(state,p.id);
        const next = transition(state, { type: 'stage-gate', projectId: p.id }, actor);
        state.projects = next.projects;
      } else {
        assertConstructionWritable(state, p.id);
        const baseline = state.baselines.find((b) => b.projectId === p.id && b.status === '已生效');
        if (baseline?.id !== request.baselineId || state.lockedProjects.includes(p.id)) throw new Error('基线或锁定状态已变化，请重新申报');
        const shift = (date: string) => new Date(Date.parse(date) + request.shiftDays * 86400000).toISOString().slice(0, 10);
        const version = `V${Math.max(...state.baselines.filter((b) => b.projectId === p.id).map((b) => Number(/^V(\d+)/.exec(b.version)?.[1] ?? 0))) + 1}.0`;
        baseline.status = '历史';
        state.baselines.push({ ...structuredClone(baseline), id: `BASE-${request.id}`, version, status: '已生效', plannedEndDate: shift(baseline.plannedEndDate), createdAt: AS_OF_DATE });
        p.currentBaselineVersion = version;
        state.tasks.filter((t) => t.projectId === p.id && t.progress < 100).forEach((t) => { t.startDate = shift(t.startDate); t.endDate = shift(t.endDate); });
        state.milestones.filter((m) => m.projectId === p.id && m.status !== '已达成').forEach((m) => { m.plannedDate = shift(m.plannedDate); m.status = m.plannedDate < AS_OF_DATE ? '逾期未达成' : '未达成'; });
        p.plannedEndDate = shift(p.plannedEndDate);
      }
    }
    request.status = !action.approve ? '驳回' : allPassed ? '通过' : '待审批'; request.opinion = action.opinion; request.reviewedAt = AS_OF_DATE;
  } else if (action.type === 'close-issue') {
    const issue = state.issues.find((i) => i.id === action.id);
    if (!issue) throw new Error('问题不存在');
    requireRole('project-manager');
    if (actor.id !== project(issue.projectId).pmId || issue.status !== '已解决') throw new Error('问题解决后仅主PM可最终关闭');
    issue.status = '已关闭'; target = issue.id;
  } else if (action.type === 'close-bug') {
    const bug = state.bugs.find((b) => b.id === action.id);
    if (!bug || bug.status !== '待复测' || bug.creator !== actor.name) throw new Error('仅发起人复测确认后可关闭BUG');
    bug.status = '已关闭'; target = bug.id;
  } else if (action.type === 'risk-to-issue') {
    const risk = state.risks.find((r) => r.id === action.id);
    if (!risk || risk.status !== '监控中') throw new Error('风险不存在或已处理');
    requireRole('project-manager');
    if (project(risk.projectId).pmId !== actor.id) throw new Error('仅项目主PM可转问题');
    const id = `ISSUE-FROM-${risk.id}`;
    state.issues.push({ id, code: id, projectId: risk.projectId, title: risk.title, severity: ['重大', '特大'].includes(risk.level) ? '重大' : '重要', status: '待解决', owner: risk.owner, deadline: ticketMeta(state, 'risk', risk.id).deadline, fromRiskId: risk.id });
    const meta = structuredClone(ticketMeta(state, 'risk', risk.id));
    meta.history.push({ date: AS_OF_DATE, actor: actor.name, action: 'convert', detail: action.note ?? `风险已发生，转为问题${id}` });
    state.ticketMeta[risk.id] = meta;
    state.ticketMeta[id] = { ...structuredClone(meta), history: [{ date: AS_OF_DATE, actor: actor.name, action: '由风险转入', detail: `原风险${risk.id}；${action.note ?? '风险实际发生'}` }] };
    risk.status = '已转问题'; target = risk.id;
  } else if (action.type === 'stage-gate') {
    requireRole('pmo'); const p = project(action.projectId); target = p.id;
    const failed = stageChecks(state,p.id).filter((c) => !c.passed);
    if (failed.length) throw new Error(failed.map((c) => `${c.name}：${c.detail}`).join('；'));
    p.phase = STAGE_RULE.targetPhase; p.subPhase = STAGE_RULE.targetSubPhase; p.releasedBudgetPercent = STAGE_RULE.releasePercent;
  } else if (action.type === 'settle') {
    requireRole('finance'); const p = project(action.projectId); target = p.id;
    if (state.lockedProjects.includes(p.id)) throw new Error('禁止重复结算');
    const rounds = state.acceptances.filter((a) => a.projectId === p.id && a.type === '客户终验').sort((a, b) => b.round - a.round);
    if (rounds[0]?.status !== '已通过') throw new Error('客户最终验收未通过');
    if (p.committedCost > 0 || p.forecastRemainingCost > 0) throw new Error('存在未决成本');
    state.settlements.push({ id: `SET-${state.settlements.length + 1}`, projectId: p.id, finalIncome: p.revenueAmount ?? p.contractAmount, finalCost: p.actualCost, finalGrossMargin: money((p.revenueAmount ?? p.contractAmount) - p.actualCost), finalGrossMarginRate: percentage((p.revenueAmount ?? p.contractAmount) - p.actualCost, p.revenueAmount ?? p.contractAmount) ?? 0, status: '已锁定已生效', isCostLocked: true, settledDate: AS_OF_DATE });
    state.lockedProjects.push(p.id); p.status = '已结算'; p.phase = '已关闭';
  } else if (action.type === 'confirm-cost') {
    requireRole('finance'); const p = project(action.cost.projectId); target = p.id;
    if (!Number.isFinite(action.cost.amount) || action.cost.amount <= 0 || !action.cost.sourceId) throw new Error('成本金额及来源无效');
    const bucket = action.maintenance ? state.maintenanceCosts : state.costs;
    if ([...state.costs, ...state.maintenanceCosts].some((c) => c.id === action.cost.id || c.sourceId === action.cost.sourceId)) throw new Error('同一来源不能重复计入成本');
    if (action.maintenance) {
      if (!p.isMaintenance) throw new Error('项目不属于运维周期');
    } else {
      assertConstructionWritable(state, p.id);
      if (action.fromCommitment && action.cost.amount > p.committedCost) throw new Error('结转金额超过未发生承诺');
      const nextCommitted = action.fromCommitment ? money(p.committedCost - action.cost.amount) : p.committedCost;
      if (p.isUnsigned && p.actualCost + action.cost.amount + nextCommitted > (p.unsignedLimitQuota ?? 0)) throw new Error('未签额度不足，须追加审批');
      if (action.fromCommitment && p.commitmentBySubject) {
        if ((p.commitmentBySubject[action.cost.subjectId] ?? 0) < action.cost.amount) throw new Error('科目承诺余额不足');
        p.commitmentBySubject[action.cost.subjectId] = money(p.commitmentBySubject[action.cost.subjectId] - action.cost.amount);
      }
      p.actualCost = money(p.actualCost + action.cost.amount); p.committedCost = nextCommitted;
      p.rollingCost = money(p.actualCost + p.committedCost + p.forecastRemainingCost);
      p.costVariance = money(p.rollingCost - p.budgetAmount); p.costVarianceRate = percentage(p.costVariance, p.budgetAmount) ?? 0;
    }
    bucket.push(action.cost);
  }
  for (const p of state.projects) {
    const delayDays = Math.max(0, ...state.milestones.filter((m) => m.projectId === p.id && m.status !== '已达成').map((m) => (Date.parse(AS_OF_DATE) - Date.parse(m.plannedDate)) / 86400000));
    const health = assessHealth(p, { delayDays, overdueReceipt: sumMoney(state.receiptPlans.filter((r) => r.projectId === p.id && r.dueDate <= AS_OF_DATE).map((r) => Math.max(0, r.amount - r.paidAmount))), majorRisks: state.risks.filter((r) => r.projectId === p.id && ['特大', '重大'].includes(r.level) && r.status === '监控中').length, majorIssues: state.issues.filter((i) => i.projectId === p.id && i.severity === '重大' && i.status !== '已关闭').length });
    p.health = health.level; p.healthReason = health.reasons.join('；');
  }
  state.audit.push({ id: `AUD-${state.audit.length + 1}`, actor: actor.name, action: action.type, target, date: AS_OF_DATE });
  return state;
}

/** Pending approvals quote real budget, estimate and baseline objects; no dashboard-only fake decisions. */
export function createDemoBusinessState(): BusinessState {
  let state = createBusinessState();
  state.decisions = [];
  const candidates = state.projects.filter((p) => !p.isMaintenance && !state.lockedProjects.includes(p.id) && state.budgets.some(b=>b.projectId===p.id&&b.status==='已生效')).slice(0, 45);
  for (const p of candidates) {
    const budget = state.budgets.find((b) => b.projectId === p.id && b.status === '已生效')!;
    const estimate = projectEstimate(p, state.estimates)!;
    const totalAmount = money(Math.max(budget.totalAmount, estimate.totalCost) * 1.04);
    const amounts = allocateMoney(totalAmount, budget.items.map((i) => i.amount));
    const items = budget.items.map((item, i) => ({ ...item, amount: amounts[i] }));
    const amount = (id: string) => sumMoney(items.filter((i) => i.subjectId === id || i.subjectId.startsWith(`${id}-`)).map((i) => i.amount));
    state = transition(state, { type: 'submit-budget', projectId: p.id, reason: '新增数据接入范围与交付保障工作，申请按冻结概算评估追加预算。', budget: {
      ...budget, id: `SUBMIT-${p.id}`, version: 'V-待审', status: '审批中', totalAmount, items,
      laborCost: amount('SUB-01'), outsourceCost: amount('SUB-02'), procurementCost: amount('SUB-03'), expenseCost: amount('SUB-04'), reserveCost: amount('SUB-05'),
    } }, { id: 'U-004', name: '刘敏', role: 'finance' });
    const decision = state.decisions[state.decisions.length - 1];
    decision.createdAt = '2026-09-05';
    if (state.approvals.length > 15) state = transition(state, { type: 'review', approvalId: decision.id, approve: false, opinion: '分项测算与交付范围尚不一致，请补充材料后重新申报。' }, { id: 'U-003', name: '王总', role: 'executive' });
  }
  const changeApproval = state.approvals.find((a) => a.projectId === 'P-005')!;
  const change = state.changes.find((c) => c.projectId === 'P-005')!;
  change.type = '成本变更'; change.scheduleImpactDays = 0; change.status = 'PMC审议中';
  change.costImpact = money(changeApproval.budget.totalAmount - changeApproval.baseline.budgetAmount);
  changeApproval.kind = 'change'; changeApproval.sourceChangeId = change.id;
  const changeDecision = state.decisions.find((d) => d.id === changeApproval.id)!;
  changeDecision.type = '重大变更审批'; changeDecision.title = change.title;
  const cases: ManagementApproval[] = [
    { id: 'MGT-001', projectId: 'P-003', sourceId: state.risks.find((r) => r.projectId === 'P-003')!.id, type: '重大风险处置', reason: '申请集团协调专项资源并按周跟踪所引风险；风险仍由项目团队持续监控。', impactAmount: 0, submittedBy: 'U-001', status: '待审批' },
    { id: 'MGT-002', projectId: 'P-004', sourceId: 'P-004', type: '未签额外投入', reason: '未签阶段申请追加80万元投入额度，用于客户验证；本审批只调整额度，不确认成本。', impactAmount: 80, originalQuota: state.projects.find((p) => p.id === 'P-004')!.unsignedLimitQuota, proposedQuota: money((state.projects.find((p) => p.id === 'P-004')!.unsignedLimitQuota ?? 0) + 80), submittedBy: 'U-001', status: '待审批' },
    { id: 'MGT-003', projectId: 'P-006', sourceId: state.acceptances.find((a) => a.projectId === 'P-006' && a.type === '客户终验')!.id, type: '重大验收异常', reason: '申请协调客户复验与整改资源；整改完成后仍须客户终验确认。', impactAmount: 0, submittedBy: 'U-001', status: '待审批' },
    { id: 'MGT-004', projectId: 'P-008', sourceId: state.settlements.find((s) => s.projectId === 'P-008')!.id, type: '结算争议审定', reason: '演示争议：对已锁定结算的成本归属提出复核申请，请决策是否组织专项核查；本审批不重开或修改结算。', impactAmount: 0, submittedBy: 'U-004', status: '待审批' },
  ];
  state.managementApprovals = cases;
  for (const item of cases) {
    const p = state.projects.find((p) => p.id === item.projectId)!;
    state.decisions.push({ id: item.id, projectId: p.id, projectName: p.name, type: item.type, title: item.reason, impactAmount: item.impactAmount, level: '高管审批', status: '待决策', targetRoute: `/management-approvals/${item.id}`, createdAt: '2026-09-05' });
  }
  return state;
}

export const useBusinessStore = create<{ data: BusinessState; dispatch: (action: BusinessAction, actor: Actor) => void }>((set) => ({
  data: createDemoBusinessState(),
  dispatch: (action, actor) => set((state) => ({ data: transition(state.data, action, actor) })),
}));
