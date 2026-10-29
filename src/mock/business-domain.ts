import { applyAccessConfiguration, buildAuditChanges, createAccessConfiguration, selectAccessPolicy } from './configuration-access';
import type { AccessConfigurationAction, AccessConfigurationState, AuditEvent } from '@/models/configuration-access';
import { applyReceiptAction } from './receipts';
import type { ReceiptAction, ReceiptRecord } from '@/models/receipts';
import {applyFinanceConfiguration,createFinanceConfiguration,selectConfiguredHealth,type FinanceConfigurationAction} from './configuration-finance';
import type {FinanceConfigurationState} from '@/models/configuration-finance';
import {applyUnsignedAction,approveUnsignedInvestment,type UnsignedAction} from './unsigned';
import type {UnsignedProjectControl,UnsignedInvestmentRequest,StartConfirmation} from '@/models/unsigned';
import { applyInitiationAction, defaultInitiationInput, initiationSource, INITIATION_SIGNATURES, type InitiationAction } from './initiation';
import { opportunityMeta } from './opportunities';
import type {InitiationApplication} from '@/models/initiation';
import { applyConfigurationAction, createConfigurationState, type ConfigurationAction } from '@/mock/configuration';
import type { ConfigurationState } from '@/models/configuration';
import { applyProjectChangeAction, initializePendingChanges, type ProjectChangeAction } from './changes';
import type { ChangeRequest } from '@/models/changes';
import { applyEarlyInvestmentAction, type EarlyInvestmentAction } from '@/mock/early-investments';
import type { EarlyInvestmentRequest, EarlyCostRecord } from '@/models/early-investments';
import {applyOperationsAction,initOperationsFixture,operationsActions,type OperationsAction} from '@/mock/operations';
import type {OperationHandover,OperationCycle,OperationEvent,ProjectClosure,OperationCostSource} from '@/models/operations';
import { assertArchiveActionWritable } from '@/mock/archive-lock';
import { applyCloseoutAction, type CloseoutAction } from '@/mock/closeout';
import type { PostEvaluation, ProjectArchive, ArchiveCategory } from '@/models/closeout';
import { applySettlementAction, pendingSettlementSources, settlementChecks, settlementSnapshot, type SettlementAction } from '@/mock/settlement';
import type { SettlementRequest, SettlementCostReview, SettlementCostDisposition, SettlementAnalysis } from '@/models/settlement';
import { applyEstimateAction, type EstimateAction } from '@/mock/estimates';
import type { EstimateDraft, EstimateMetadata } from '@/models/estimates';
import { applyTeamAction, type TeamAction } from './team';
import { budgetOverruns, saveBudgetDraft, toBudgetVersion, validateBudgetDraft, type BudgetDraftAction } from './budget-drafts';
import { createDetailedMockBudgetDrafts } from '@/mock/budget-fixtures';
import { applyPresalesAction, costFingerprint, presalesSubjects, solutionFingerprint, type PresalesAction } from '@/mock/presales';
import type { PresalesWorkspace, CostVersion } from '@/models/presales';
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
import { AS_OF_DATE, mockOpportunities, mockOpportunityMetaSeeds, mockContracts, mockProjects, mockBudgetVersions, mockBaselineVersions, mockIssues, mockRisks, mockBugs, mockDecisions, mockAcceptances, mockCostItems, mockEstimateVersions, mockMilestones, mockSettlements, mockReceiptPlans, mockChanges, mockWbsTasks, mockRequirements, mockDailyReports, mockWeeklyReports } from '@/mock';
import type { Opportunity, Contract, ContractLedger, ProjectCostOverview, ReceiptPlan, Project, BudgetVersion, BaselineVersion, Issue, Risk, Bug, CostItem, DecisionItem, AcceptanceRecord, EstimateVersion, Milestone, SettlementRecord, ProjectChange, WbsTask, Requirement, DailyReport, WeeklyReport } from '@/models/types';
import type { UserRole } from '@/store/useAppStore';
import { allocateMoney, money, percentage, sumMoney } from '@/utils/money';
import { projectEstimate } from '@/mock/versions';
import { assertConstructionWritable } from '@/mock/construction-lock';
import { selectFourCalculations } from '@/mock/selectors';
import { createMockContractLedgers } from '@/mock/contract-ledger';
import { createMockProjectCostOverviews } from '@/mock/project-cost';

export interface Actor { id: string; name: string; role: UserRole }
export interface Approval {
  id: string; projectId: string; kind: 'budget' | 'change'; status: '待审批' | '通过' | '驳回';
  budget: BudgetVersion; baseline: BaselineVersion; submittedBy: string; reason: string;
  requiredRole: 'pmo' | 'executive'; opinion?: string;
  estimate: EstimateVersion; sourceChangeId?: string; baselineConfirmedAt?: string; baselineConfirmedBy?: string;
  /** 审批节点链（按顺序）：财务复核 → PMO 评审 →（超概算或 >5000 万）集团领导决策。历史审批单无该字段，按 requiredRole 单节点处理。 */
  nodes?: ApprovalNodePlan[]; node?: number;
  nodeReviews?: { node: number; role: UserRole; by: string; approve: boolean; opinion: string; date: string }[];
}
export interface ApprovalNodePlan { name: string; roles: UserRole[]; mode: 'all' | 'any'; timeoutDays: number }

// 预算审批分档：财务复核“钱对不对”始终前置；金额 >5000 万或超概算才上升到集团领导。
export const BUDGET_APPROVAL_EXECUTIVE_THRESHOLD = 5000;
const roleLabel = (role: UserRole) => role === 'finance' ? '财务' : role === 'pmo' ? 'PMO' : role === 'executive' ? '集团领导' : role;
export function budgetApprovalNodes(total: number, isOverEstimate: boolean): ApprovalNodePlan[] {
  const nodes: ApprovalNodePlan[] = [
    { name: '财务复核', roles: ['finance'], mode: 'all', timeoutDays: 2 },
    { name: 'PMO 评审', roles: ['pmo'], mode: 'all', timeoutDays: 3 },
  ];
  if (isOverEstimate || total > BUDGET_APPROVAL_EXECUTIVE_THRESHOLD) nodes.push({ name: '集团领导决策', roles: ['executive'], mode: 'all', timeoutDays: 5 });
  return nodes;
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
export interface Material extends DocumentDetails { archiveCategory?: ArchiveCategory; sourceId?: string; id: string; projectId: string; name: string; required: boolean; status: '缺失' | '待提交' | '待审核' | '通过' | '驳回' }
export interface BusinessState {
  accessConfiguration: AccessConfigurationState;
  receiptRecords: ReceiptRecord[];
  financeConfiguration:FinanceConfigurationState;
  unsignedProjects:Record<string,UnsignedProjectControl>; unsignedInvestmentRequests:UnsignedInvestmentRequest[]; startConfirmations:Record<string,StartConfirmation>;
  initiations: InitiationApplication[];
  configuration: ConfigurationState; templateApplications: Record<string,{templateVersionId:string;generatedAt:string}>;
  changeRequests: ChangeRequest[];
  earlyInvestmentRequests: EarlyInvestmentRequest[]; earlyCosts: EarlyCostRecord[];
  operationCostSources:OperationCostSource[]; operationHandovers:Record<string,OperationHandover>; operationCycles:OperationCycle[]; operationEvents:OperationEvent[]; projectClosures:Record<string,ProjectClosure>;
  postEvaluations: Record<string, PostEvaluation>; projectArchives: Record<string, ProjectArchive>;
  settlementRequests: SettlementRequest[]; settlementCostReviews: SettlementCostReview[]; settlementCostDispositions: SettlementCostDisposition[]; settlementAnalyses: Record<string, SettlementAnalysis[]>;
  settlementForecastSnapshots: Record<string, {date:string;total:number;subjects:Record<string,number>}>;
  estimateDrafts: Record<string, EstimateDraft>; estimateMeta: Record<string, EstimateMetadata>;
  projectTeams: Record<string,ProjectTeam>; budgetDrafts: Record<string,BudgetDraft>;
  presales: Record<string, PresalesWorkspace>;
  planningDrafts: Record<string,PlanningDraft>; planningReviews: PlanningReview[];
  opportunities: Opportunity[]; opportunityMeta: Record<string, OpportunityMeta>;
  contracts: Contract[]; acceptanceDetails: Record<string, AcceptanceDetail>; acceptanceReports: AcceptanceReport[];
  receiptPlans: ReceiptPlan[]; contractLedgers: ContractLedger[]; projectCostOverviews: ProjectCostOverview[];
  constructionFreezes: Record<string, { requestId: string; reason: string }>;
  laborEntries: LaborEntry[]; qualityPlans: Record<string, QualityPlan>; dailyReports: DailyReport[]; weeklyReports: WeeklyReport[]; costOrders: CostOrder[]; requirements: Requirement[]; ticketMeta: Record<string, TicketMeta>; tasks: WbsTask[]; planRequests: PlanRequest[]; projects: Project[]; budgets: BudgetVersion[]; baselines: BaselineVersion[];
  estimates: EstimateVersion[]; milestones: Milestone[]; settlements: SettlementRecord[];
  issues: Issue[]; risks: Risk[]; bugs: Bug[]; costs: CostItem[];
  changes: ProjectChange[]; managementApprovals: ManagementApproval[]; approvals: Approval[]; decisions: DecisionItem[]; acceptances: AcceptanceRecord[];
  materials: Material[]; lockedProjects: string[]; maintenanceCosts: CostItem[];
  audit: AuditEvent[];
}
export function createBusinessState(): BusinessState {
  const state: BusinessState = structuredClone({ accessConfiguration:createAccessConfiguration(), receiptRecords:[], financeConfiguration:createFinanceConfiguration(), unsignedProjects:{}, unsignedInvestmentRequests:[], startConfirmations:{}, operationCostSources:[], operationHandovers:{}, operationCycles:[], operationEvents:[], projectClosures:{}, configuration: createConfigurationState(), templateApplications: {}, initiations: [], postEvaluations: {}, projectArchives: {}, changeRequests: [], earlyInvestmentRequests: [], earlyCosts: [], settlementRequests: [], settlementCostReviews: [], settlementCostDispositions: [], settlementAnalyses: {}, settlementForecastSnapshots: {}, estimateDrafts: {}, estimateMeta: {}, projectTeams: {}, budgetDrafts: {}, presales: {}, planningDrafts: {}, planningReviews: [], acceptanceDetails: {}, acceptanceReports: [], opportunities: mockOpportunities, opportunityMeta: mockOpportunityMetaSeeds, contracts: mockContracts, contractLedgers: createMockContractLedgers(), projectCostOverviews: createMockProjectCostOverviews(), receiptPlans: mockReceiptPlans, constructionFreezes: {}, laborEntries: [], qualityPlans: {}, dailyReports: mockDailyReports, weeklyReports: mockWeeklyReports, costOrders: [], requirements: mockRequirements, ticketMeta: {}, tasks: mockWbsTasks, planRequests: [], projects: mockProjects.map((project) => ({ ...project, frozenEstimateVersionId: projectEstimate(project, mockEstimateVersions)?.id })), budgets: mockBudgetVersions, baselines: mockBaselineVersions,
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
  state.budgetDrafts = createDetailedMockBudgetDrafts();
  for(const p of state.projects)state.projectTeams[p.id]={members:teamResources(state,p.id),appointments:[{id:`APPOINT-${p.id}-1`,userId:p.pmId,name:p.pmName,status:'已接受',nominatedAt:p.plannedStartDate,nominatedBy:'PMO',respondedAt:p.plannedStartDate,opinion:'原立项任命接收记录'}],history:[]};
  // P-001 项目团队增强：补充多样化角色、参与比例与工时
  const p001Team = state.projectTeams['P-001'];
  if (p001Team) {
    const pm = p001Team.members.find((m) => m.userId === 'U-001');
    if (pm) { pm.allocation = 80; pm.plannedHours = 128; pm.keyPosition = true; }
    const extras = [
      { userId: 'U-005', name: '赵工', role: '方案架构师', departmentId: 'D-008', allocation: 80, plannedHours: 128, keyPosition: true },
      { userId: 'U-006', name: '陈亮', role: '市场商务经理', departmentId: 'D-010', allocation: 30, plannedHours: 48, keyPosition: false },
      { userId: 'U-008', name: '郑经理', role: '运维负责人', departmentId: 'D-013', allocation: 50, plannedHours: 80, keyPosition: false },
      { userId: 'U-010', name: '钱工程师', role: '高级开发工程师', departmentId: 'D-007', allocation: 100, plannedHours: 160, keyPosition: false },
      { userId: 'U-011', name: '孙总', role: '财务专员', departmentId: 'D-011', allocation: 20, plannedHours: 32, keyPosition: false },
      { userId: 'U-013', name: '冯架构', role: '测试经理', departmentId: 'D-008', allocation: 60, plannedHours: 96, keyPosition: false },
      { userId: 'U-015', name: '林志远', role: '高级开发工程师', departmentId: 'D-007', allocation: 100, plannedHours: 160, keyPosition: false },
      { userId: 'U-017', name: '何思齐', role: '开发工程师', departmentId: 'D-007', allocation: 100, plannedHours: 160, keyPosition: false },
      { userId: 'U-019', name: '许文静', role: '质控专员', departmentId: 'D-012', allocation: 40, plannedHours: 64, keyPosition: false },
      { userId: 'U-021', name: '吴嘉宁', role: 'PMO专员', departmentId: 'D-006', allocation: 25, plannedHours: 40, keyPosition: false },
    ];
    for (const m of extras) {
      const existing = p001Team.members.find((x) => x.userId === m.userId);
      if (existing) { Object.assign(existing, m); }
      else { p001Team.members.push({ ...m, active: true, startDate: '2026-01-10', endDate: '2026-12-31' }); }
    }
    // 补充 2 条历史任命记录用于操作记录展示
    p001Team.appointments.push(
      { id: 'APPOINT-P-001-2', userId: 'U-005', name: '赵工', status: '已接受', nominatedAt: '2026-01-05', nominatedBy: '张建国', respondedAt: '2026-01-06', opinion: '具备智慧城市平台架构设计经验，承担方案架构职责' },
      { id: 'APPOINT-P-001-3', userId: 'U-010', name: '钱工程师', status: '已接受', nominatedAt: '2026-01-08', nominatedBy: '张建国', respondedAt: '2026-01-09', opinion: '核心开发主力，负责海防数据接入模块' },
    );
  }
  // 其他在途项目也补少量团队成员：团队页、工时填报、资源视图需要真实的多人数据。
  const extraTeams: Record<string, { userId: string; name: string; role: string; departmentId: string; allocation: number; plannedHours: number; keyPosition: boolean }[]> = {
    'P-006': [
      { userId: 'U-017', name: '何思齐', role: '开发工程师', departmentId: 'D-007', allocation: 100, plannedHours: 160, keyPosition: true },
      { userId: 'U-019', name: '许文静', role: '质控专员', departmentId: 'D-012', allocation: 40, plannedHours: 64, keyPosition: false },
      { userId: 'U-013', name: '冯架构', role: '测试经理', departmentId: 'D-008', allocation: 50, plannedHours: 80, keyPosition: false },
    ],
    'P-009': [
      { userId: 'U-010', name: '钱工程师', role: '高级开发工程师', departmentId: 'D-007', allocation: 80, plannedHours: 128, keyPosition: true },
      { userId: 'U-015', name: '林志远', role: '高级开发工程师', departmentId: 'D-007', allocation: 60, plannedHours: 96, keyPosition: false },
    ],
    'P-010': [
      { userId: 'U-005', name: '赵工', role: '方案架构师', departmentId: 'D-008', allocation: 40, plannedHours: 64, keyPosition: true },
      { userId: 'U-021', name: '吴嘉宁', role: 'PMO专员', departmentId: 'D-006', allocation: 20, plannedHours: 32, keyPosition: false },
    ],
    'P-012': [
      { userId: 'U-017', name: '何思齐', role: '开发工程师', departmentId: 'D-007', allocation: 100, plannedHours: 160, keyPosition: true },
      { userId: 'U-019', name: '许文静', role: '质控专员', departmentId: 'D-012', allocation: 30, plannedHours: 48, keyPosition: false },
    ],
  };
  for (const [projectId, members] of Object.entries(extraTeams)) {
    const team = state.projectTeams[projectId];
    if (!team) continue;
    for (const m of members) {
      if (team.members.some((x) => x.userId === m.userId)) continue;
      team.members.push({ ...m, active: true, startDate: '2026-03-01', endDate: '2026-12-31' });
    }
  }
  initializePendingChanges(state);
  // 种子审批与分档规则对齐：历史种子只有单一 requiredRole，没有节点链，财务无法复核“钱对不对”。
  for (const approval of state.approvals) {
    if (approval.nodes?.length) continue;
    const nodes = budgetApprovalNodes(approval.budget.totalAmount, approval.budget.totalAmount > approval.baseline.budgetAmount);
    approval.nodes = nodes;
    approval.node = 0;
    approval.nodeReviews = [];
    approval.requiredRole = nodes[nodes.length - 1].roles[0] as 'pmo' | 'executive';
    // 预算审批由主 PM 提交：历史种子写成财务提交，与「预算草稿仅主 PM 可写」矛盾。
    const owner = state.projects.find((proj) => proj.id === approval.projectId);
    if (owner?.pmName) approval.submittedBy = owner.pmName;
  }

  initAcceptanceFixture(state);
  initOperationsFixture(state);
  return state;
}
export type BusinessAction = AccessConfigurationAction | ReceiptAction | FinanceConfigurationAction | UnsignedAction | OperationsAction | ConfigurationAction | InitiationAction | CloseoutAction | ProjectChangeAction | EarlyInvestmentAction | SettlementAction | EstimateAction | TeamAction | BudgetDraftAction | PresalesAction | BudgetPlanningAction | AcceptanceAction | OpportunityAction | LaborAction | DeliverableAction | ReportAction | CostOrderAction | TicketAction
 | { type: 'update-project-phase'; projectId: string; phase: string; subPhase: string }
  | { type: 'submit-budget'; projectId: string; budget: BudgetVersion; reason: string }
  | { type: 'review'; approvalId: string; approve: boolean; opinion: string }
  | { type: 'review-management'; id: string; approve: boolean; opinion: string }
  | { type: 'update-task'; id: string; progress: number; actualStartDate: string; actualEndDate?: string; note: string }
  | { type: 'request-plan'; projectId: string; kind: 'schedule' | 'stage'; reason: string; shiftDays: number; sourceRequirementId?: string }
  | { type: 'review-plan'; id: string; approve: boolean; opinion: string }
  | { type: 'risk-to-issue'; id: string; note?: string }
  | { type: 'stage-gate'; projectId: string; ruleSnapshot?:StageSnapshot }
  | { type: 'settle'; projectId: string }
  | { type: 'confirm-cost'; cost: CostItem; fromCommitment?: boolean; maintenance?: boolean }
  | { type: 'update-forecast'; projectId: string; forecastRemainingCost: number; forecastBySubject?: Record<string, number>; reason: string };

/** Pure transition: validate first and clone, so failed actions never partially update the shared store. */
export function transition(previous: BusinessState, action: BusinessAction, actor: Actor): BusinessState {
  assertArchiveActionWritable(previous, action);
  const state = structuredClone(previous);
  const requireRole = (...roles: UserRole[]) => { if (!roles.includes(actor.role)) throw new Error('当前角色无权执行此操作'); };
  const project = (id: string) => {
    const value = state.projects.find((p) => p.id === id);
    if (!value) throw new Error('项目不存在');
    return value;
  };
  let target = '';
  if (action.type === 'access-policy-save' || action.type === 'access-policy-publish') { target = applyAccessConfiguration(state, action, actor); }
  else if (action.type === 'confirm-project-receipt') { target = applyReceiptAction(state, action, actor); }
  else if(action.type==='finance-config-save'||action.type==='finance-config-publish'){target=applyFinanceConfiguration(state,action,actor);}
  else if (action.type==='follow-unsigned'||action.type==='request-unsigned-investment'||action.type==='confirm-project-contract'||action.type==='exit-unsigned'||action.type==='confirm-project-start') {
    target=applyUnsignedAction(state,action,actor);
  } else if (operationsActions.has(action.type)) {
    target = applyOperationsAction(state, action as OperationsAction, actor);
  } else if (action.type === 'start-post-evaluation' || action.type === 'save-post-evaluation' || action.type === 'score-post-evaluation' || action.type === 'confirm-post-evaluation' || action.type === 'submit-archive-file' || action.type === 'review-archive-file' || action.type === 'confirm-project-archive') {
    target = applyCloseoutAction(state, action, actor);
  } else if (action.type === 'resume-initiation' || action.type === 'save-initiation' || action.type === 'submit-initiation' || action.type === 'assess-initiation-risk' || action.type === 'classify-initiation' || action.type === 'sign-initiation' || action.type === 'decide-initiation') {
    target = applyInitiationAction(state, action, actor);
  } else if (action.type === 'configuration-save' || action.type === 'configuration-publish' || action.type === 'configuration-apply-template') {
    target = applyConfigurationAction(state, action, actor);
  } else if (action.type === 'save-early-investment' || action.type === 'review-early-investment' || action.type === 'record-early-cost') {
    target = applyEarlyInvestmentAction(state, action, actor);
  } else if (action.type === 'estimate-create-draft' || action.type === 'estimate-save-draft' || action.type === 'estimate-publish' || action.type === 'estimate-freeze') {
    target = applyEstimateAction(state, action, actor);
  } else if (action.type === 'presales-research' || action.type === 'presales-save-solution' || action.type === 'presales-save-cost' || action.type === 'presales-finance-check' || action.type === 'presales-submit-review' || action.type === 'presales-expert-opinion' || action.type === 'presales-review-decision' || action.type === 'presales-correction-reply') {
    target = applyPresalesAction(state, action, actor);
  } else if (action.type === 'save-opportunity' || action.type === 'start-opportunity-assessment' || action.type === 'save-opportunity-dimension' || action.type === 'conclude-opportunity' || action.type === 'follow-opportunity') {
    target = applyOpportunityAction(state, action, actor);
  } else if (action.type === 'save-settlement' || action.type === 'review-settlement' || action.type === 'resolve-settlement-source' || action.type === 'dispose-settlement-balance' || action.type === 'save-settlement-analysis') {
    target = applySettlementAction(state, action, actor);
  } else if (action.type === 'submit-acceptance' || action.type === 'review-acceptance' || action.type === 'reply-acceptance' || action.type === 'confirm-acceptance' || action.type === 'save-acceptance-proof' || action.type === 'save-acceptance-report' || action.type === 'confirm-acceptance-report') {
    target = applyAcceptanceAction(state, action, actor);
  } else if (action.type === 'save-planning' || action.type === 'submit-planning' || action.type === 'review-planning' || action.type === 'reply-planning' || action.type === 'confirm-budget-baseline') {
    target = applyBudgetPlanningAction(state, action, actor);
  } else if(action.type==='save-project-change'||action.type==='submit-project-change'||action.type==='assess-project-change'||action.type==='classify-project-change'||action.type==='review-project-change'){
    target=applyProjectChangeAction(state,action,actor);
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
    const nodes = budgetApprovalNodes(action.budget.totalAmount, isOverEstimate);
    const finalRole = nodes[nodes.length - 1].roles[0] as 'pmo' | 'executive';
    state.approvals.push({ id, projectId: p.id, kind: 'budget', status: '待审批', budget: { ...structuredClone(action.budget), isOverEstimate, overEstimateReasons }, estimate: structuredClone(estimate),
      baseline: structuredClone(baseline), submittedBy: actor.id, reason: action.reason,
      requiredRole: finalRole, nodes, node: 0, nodeReviews: [] });
    state.decisions.push({ id, projectId: p.id, projectName: p.name, type: '超概算审批', title: `${p.name}预算审批`,
      impactAmount: money(action.budget.totalAmount - p.budgetAmount), level: isOverEstimate ? 'PMC决策会' : 'PMO立项会',
      status: '待决策', targetRoute: `/approvals/${id}`, createdAt: AS_OF_DATE });
  } else if (action.type === 'review') {
    const approval = state.approvals.find((a) => a.id === action.approvalId);
    if (!approval || approval.status !== '待审批') throw new Error('审批不存在或已处理');
    const node = approval.nodes?.[approval.node ?? 0];
    if (node && !node.roles.includes(actor.role)) throw new Error(`当前节点「${node.name}」须由${node.roles.map(roleLabel).join('/')}办理`);

    if (!node) requireRole(approval.requiredRole);
    if (!action.opinion.trim()) throw new Error('审批意见必填');
    if (node && approval.nodeReviews?.some((r) => r.node === (approval.node ?? 0) && r.role === actor.role)) throw new Error('本角色已处理当前节点，禁止重复审批');
    const p = project(approval.projectId); target = approval.id;
    assertConstructionWritable(state, p.id);
    // 节点链推进：节点内全部角色通过 → 进下一节点；任一驳回 → 整单驳回。
    let finalPass = action.approve;
    if (node) {
      approval.nodeReviews = [...(approval.nodeReviews ?? []), { node: approval.node ?? 0, role: actor.role, by: actor.name, approve: action.approve, opinion: action.opinion, date: AS_OF_DATE }];
      const reviews = approval.nodeReviews.filter((r) => r.node === (approval.node ?? 0));
      const passed = node.mode === 'any' ? reviews.some((r) => r.approve) : node.roles.every((role) => reviews.some((r) => r.role === role && r.approve));
      const rejected = node.mode === 'all' ? reviews.some((r) => !r.approve) : node.roles.every((role) => reviews.some((r) => r.role === role && !r.approve));
      if (rejected) { approval.status = '驳回'; finalPass = false; }
      else if (passed) {
        if ((approval.node ?? 0) + 1 >= (approval.nodes?.length ?? 1)) { approval.status = '通过'; finalPass = true; }
        else { approval.node = (approval.node ?? 0) + 1; finalPass = false; }
      } else finalPass = false;
    }
    if (finalPass) {
      if (approval.kind === 'change') confirmBudgetBaseline(state, approval, actor);
      else state.budgets.push({...structuredClone(approval.budget),id:`BUD-PENDING-${approval.id}`,version:`待确认-${approval.id}`,status:'待确认'});
      // Regular budget approval waits for a separate PMO baseline confirmation.

    }
    if (approval.sourceChangeId) {
      const change = state.changes.find((c) => c.id === approval.sourceChangeId)!;
      if (finalPass || approval.status === '驳回') change.status = finalPass ? '已批准' : '已否决';
      if (finalPass) change.newBaselineId = `BASE-${approval.id}`;
    }
    if (!node) approval.status = action.approve ? '通过' : '驳回';
    approval.opinion = action.opinion;
    const decision = state.decisions.find((d) => d.id === approval.id);
    if (decision && approval.status !== '待审批') decision.status = approval.status === '通过' ? '已通过' : '已否决';
  } else if (action.type === 'review-management') {
    requireRole('executive');
    const approval = state.managementApprovals.find((a) => a.id === action.id);
    if (!approval || approval.status !== '待审批') throw new Error('审批不存在或已处理');
    if (!action.opinion.trim()) throw new Error('审批意见必填');
    const p = project(approval.projectId); target = approval.id;
    if (action.approve && approval.type === '未签额外投入') {
      if (!p.isUnsigned || p.unsignedLimitQuota !== approval.originalQuota || !approval.proposedQuota || approval.proposedQuota <= (p.unsignedLimitQuota ?? 0)) throw new Error('额度或未签状态已变化，请重新申报');
      approveUnsignedInvestment(state,approval);
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
    if (p.phase !== '执行' || p.status === '已终止' || state.lockedProjects.includes(p.id)) throw new Error('项目正式启动并进入执行阶段后才能更新建设任务');
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
        request.approvalSnapshot = stageSnapshot(state,p.id,request.stageSnapshot,request.stageSnapshot&&{targetPhase:request.stageSnapshot.targetPhase,targetSubPhase:request.stageSnapshot.targetSubPhase});
        const next = transition(state, { type: 'stage-gate', projectId: p.id, ruleSnapshot:request.stageSnapshot }, { id: 'U-002', name: '李主任', role: 'pmo' });
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
    if (!action.ruleSnapshot) throw new Error('阶段门禁必须通过阶段变更审批流程调用，不允许直接切换');
    const failed = stageChecks(state,p.id,{targetPhase:action.ruleSnapshot.targetPhase,targetSubPhase:action.ruleSnapshot.targetSubPhase}).filter((c) => !c.passed);
    if (failed.length) throw new Error(failed.map((c) => `${c.name}：${c.detail}`).join('；'));
    p.phase = action.ruleSnapshot.targetPhase ?? STAGE_RULE.targetPhase; p.subPhase = (action.ruleSnapshot.targetSubPhase ?? STAGE_RULE.targetSubPhase) as typeof p.subPhase; p.releasedBudgetPercent = action.ruleSnapshot.releasePercent??stageSnapshot(state,p.id).releasePercent;
  } else if (action.type === 'settle') {
    throw new Error('请通过项目结算申请、财务核算与PMO评审完成正式结算，不允许直接锁定');
  } else if (action.type === 'update-project-phase') {
    const p = state.projects.find((p) => p.id === action.projectId);
    if (!p) throw new Error('项目不存在');
    if (actor.role !== 'pmo') throw new Error('仅PMO可切换项目阶段');
    p.phase = action.phase as typeof p.phase;
    p.subPhase = action.subPhase as typeof p.subPhase;
    target = action.projectId;
  } else if (action.type === 'update-forecast') {
    const p = project(action.projectId); target = p.id;
    requireRole('project-manager');
    if (actor.id !== p.pmId) throw new Error('仅项目主PM可更新剩余预测');
    if (p.phase !== '执行' || p.status === '已终止' || state.lockedProjects.includes(p.id)) throw new Error('仅执行中未锁定项目可更新预测');
    if (!Number.isFinite(action.forecastRemainingCost) || action.forecastRemainingCost < 0) throw new Error('剩余预测须为非负数');
    if (!action.reason.trim()) throw new Error('预测调整原因必填');
    if (action.forecastBySubject) {
      const total = sumMoney(Object.values(action.forecastBySubject));
      if (Math.abs(total - action.forecastRemainingCost) > 0.000001) throw new Error('按科目预测合计须等于总剩余预测');
      p.forecastBySubject = action.forecastBySubject;
    }
    p.forecastRemainingCost = action.forecastRemainingCost;
    p.rollingCost = money(p.actualCost + p.committedCost + p.forecastRemainingCost);
    p.costVariance = money(p.rollingCost - p.budgetAmount);
    p.costVarianceRate = percentage(p.costVariance, p.budgetAmount) ?? 0;
  } else if (action.type === 'confirm-cost') {
    requireRole('finance'); const p = project(action.cost.projectId); target = p.id;
    if (!Number.isFinite(action.cost.amount) || action.cost.amount <= 0 || !action.cost.sourceId) throw new Error('成本金额及来源无效');
    const bucket = action.maintenance ? state.maintenanceCosts : state.costs;
    if ([...state.costs, ...state.maintenanceCosts].some((c) => c.id === action.cost.id || c.sourceId === action.cost.sourceId)) throw new Error('同一来源不能重复计入成本');
    if (action.maintenance) {
      throw new Error('运维费用请通过周期原单填报和财务审核入口，不允许直接入账');
    } else {
      assertConstructionWritable(state, p.id);
      if (action.fromCommitment && action.cost.amount > p.committedCost) throw new Error('结转金额超过未发生承诺');
      const nextCommitted = action.fromCommitment ? money(p.committedCost - action.cost.amount) : p.committedCost;
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
    const health=selectConfiguredHealth(state,p);
    p.health = health.level; p.healthReason = health.reasons.join('；');
  }
  state.audit.push({ id: `AUD-${state.audit.length + 1}`, actor: actor.name, actorId: actor.id, actorRole: actor.role, action: action.type, target, date: AS_OF_DATE, result: '成功', reason: 'opinion' in action && typeof action.opinion === 'string' ? action.opinion : 'reason' in action && typeof action.reason === 'string' ? action.reason : 'note' in action && typeof action.note === 'string' ? action.note : undefined, ruleVersion: selectAccessPolicy(previous, actor.role)?.id, changes: buildAuditChanges(previous, state, target) });
  return state;
}

/** Pending approvals quote real budget, estimate and baseline objects; no dashboard-only fake decisions. */
export function buildDemoBusinessState(): BusinessState {
  let state = createBusinessState();
  state.decisions = [];
  const candidates = state.projects.filter((p) => !p.isMaintenance && !state.lockedProjects.includes(p.id) && state.budgets.some(b=>b.projectId===p.id&&b.status==='已生效')).slice(0, 45);
  for (const p of candidates) {
    const budget = state.budgets.find((b) => b.projectId === p.id && b.status === '已生效')!;
    const estimate = projectEstimate(p, state.estimates)!;
    const totalAmount = money(Math.max(budget.totalAmount, estimate.totalCost) * 1.04);
    const amounts = allocateMoney(totalAmount, budget.items.map((i) => i.amount));
    const items = budget.items.map((item, i) => ({ ...item, amount: amounts[i] }));
    state = transition(state, { type: 'submit-budget', projectId: p.id, reason: '新增数据接入范围与交付保障工作，申请按冻结概算评估追加预算。', budget: {
      ...budget, id: `SUBMIT-${p.id}`, version: 'V-待审', status: '审批中', totalAmount, items,
      } }, { id: 'U-004', name: '刘敏', role: 'finance' });
    const decision = state.decisions[state.decisions.length - 1];
    decision.createdAt = '2026-09-05';
    if (state.approvals.length > 15) state = transition(state, { type: 'review', approvalId: decision.id, approve: false, opinion: '分项测算与交付范围尚不一致，请补充材料后重新申报。' }, { id: 'U-030', name: '王会计', role: 'finance' });
  }
  const changeApproval = state.approvals.find((a) => a.projectId === 'P-005')!;
  const change = state.changes.find((c) => c.projectId === 'P-005')!;
  change.type = '成本/资源变更'; change.scheduleImpactDays = 0; change.status = 'PMC审议中';
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

  // Seed initiation applications for demonstration across different review stages
  const initActors = {
    market: { id: 'U-006', name: '陈亮', role: 'market' as const },
    pmo: { id: 'U-002', name: '李主任', role: 'pmo' as const },
    tech: { id: 'U-005', name: '赵工', role: 'solution-tech' as const },
    finance: { id: 'U-004', name: '刘敏', role: 'finance' as const },
    pm: { id: 'U-001', name: '张伟', role: 'project-manager' as const },
  };

  const setupInitOpportunity = (oppId: string, amount: number) => {
    const opp = state.opportunities.find((o) => o.id === oppId);
    if (!opp) return;
    opp.status = '拟立项';
    opp.estimatedAmount = amount;
    state.opportunityMeta[oppId] = opportunityMeta(state, opp);
    state.opportunityMeta[oppId].solutionTask = {
      id: `ST-${oppId}`,
      opportunityId: oppId,
      assessmentId: `AR-${oppId}`,
      ownerId: initActors.tech.id,
      ownerName: initActors.tech.name,
      status: '已完成',
      createdAt: '2026-08-01',
      dueDate: '2026-08-20',
    };
    state.presales[oppId] = {
      solutionVersions: [{
        id: `SOL-${oppId}`,
        version: 1,
        submittedAt: '2026-08-20',
        submittedBy: initActors.tech.name,
        customerSituation: '数字化转型与智能化升级建设需求',
        goals: '构建统一业务数据协同平台',
        scope: '平台核心架构及20个标准化业务接口',
        boundaries: '不包含历史非结构化数据清洗',
        architecture: '云原生微服务架构',
        implementation: '分期迭代实施交付',
        deliverables: '软件部署包、设计文档及操作手册',
        dependencies: '客户网络环境与业务接口开放',
        assumptions: '硬件服务器按期到位',
        ownerId: initActors.tech.id,
        participants: [],
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        attachments: ['系统方案设计书.pdf'],
        changeReason: '',
      }],
      costVersions: [],
      research: [],
      reviews: [{
        id: `REV-${oppId}`,
        round: 1,
        solutionVersionId: `SOL-${oppId}`,
        costVersionId: `COST-${oppId}`,
        status: '通过',
        method: '专家会',
        plannedDate: '2026-08-25',
        experts: [
          { userId: initActors.tech.id, name: initActors.tech.name, role: 'solution-tech' as const, dimension: '技术方案、交付与资源' },
          { userId: initActors.finance.id, name: initActors.finance.name, role: 'finance' as const, dimension: '成本合理性、毛利与商务风险' },
        ],
        opinions: [
          { userId: initActors.tech.id, by: initActors.tech.name, role: 'solution-tech' as const, dimension: '技术方案、交付与资源', conclusion: '通过' as const, opinion: '方案边界清晰，交付里程碑可执行', attachment: '方案评审意见.pdf', date: '2026-08-25' },
          { userId: initActors.finance.id, by: initActors.finance.name, role: 'finance' as const, dimension: '成本合理性、毛利与商务风险', conclusion: '通过' as const, opinion: '成本口径与毛利率符合要求，同意立项', attachment: '成本复核意见.pdf', date: '2026-08-25' },
        ],
        createdAt: '2026-08-25',
        createdBy: initActors.pmo.name,
        corrections: [],
      }],
    };
    // 评审「通过」必须能解析到对应成本版本；否则概算编制会拿到 undefined（estimate-create-draft 崩溃）。
    const seededCostLines = presalesSubjects(state).slice(0, 3).map((subject, i) => ({
      id: `CL-${oppId}-${i + 1}`, subjectId: subject.id, name: subject.name,
      scope: '平台核心功能开发与接口联调', quantity: i === 0 ? 120 : 1, unit: i === 0 ? '人天' : '项',
      unitPrice: money((amount * 0.6) / (i === 0 ? 120 : 2)), taxRate: 6, taxBasis: '含税' as const,
      basis: i === 0 ? '按职级人天单价测算' : '按供应商报价测算', risk: '接口联调工期紧张',
      ...(i === 0 ? { laborUserId: initActors.tech.id, laborGrade: 'P6' } : {}),
    }));
    const seededCostVersion: CostVersion = {
      id: `COST-${oppId}`, version: 1, solutionVersionId: `SOL-${oppId}`,
      total: money(seededCostLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)),
      submittedAt: '2026-08-24', submittedBy: initActors.tech.name, solutionFingerprint: '',
      feasibility: '可行', architecture: '云原生微服务架构', reuse: '复用统一权限与工作流组件',
      customization: '20 个业务接口定制开发', environment: '客户私有云，双机热备', security: '等保三级',
      dependencies: '客户网络与接口按期开放', risk: '接口联调延期', lines: seededCostLines, attachments: ['成本测算表.xlsx'],
    };
    const seededWorkspace = state.presales[oppId];
    seededCostVersion.solutionFingerprint = solutionFingerprint(seededWorkspace.solutionVersions[0]);
    seededCostVersion.financeCheck = { fingerprint: costFingerprint(seededCostVersion), by: initActors.finance.name, date: '2026-08-24', opinion: '成本口径与毛利率符合要求' };
    seededWorkspace.costVersions = [seededCostVersion];
    state.estimates.push({
      ...structuredClone(state.estimates[0]),
      id: `EST-${oppId}`,
      opportunityId: oppId,
      isFrozen: true,
      totalIncome: amount,
      totalCost: amount * 0.6,
      grossMargin: amount * 0.4,
      grossMarginRate: 40,
    });
    state.estimateMeta[`EST-${oppId}`] = {
      reviewId: `REV-${oppId}`,
      solutionVersionId: `SOL-${oppId}`,
      costVersionId: `COST-${oppId}`,
      income: amount,
      incomeTaxRate: 0,
      incomeTaxBasis: '不含税',
      lines: structuredClone(seededCostVersion.lines),
      changeReason: '已评审版本',
      assumptions: '硬件环境按期提供',
      riskReserveNote: '已计提风险准备金',
      responsibleDepartment: '智慧城市交付部',
      createdBy: initActors.tech.name,
      createdAt: '2026-08-25',
      frozenBy: initActors.pmo.name,
      frozenAt: '2026-08-25',
      freezeOpinion: '同意冻结概算版本',
    };
    opp.currentEstimateVersionId = `EST-${oppId}`;
  };

  // 1. INI-001 (待风险评估 / 待分级阶段)
  setupInitOpportunity('OPP-066', 1500);
  state = transition(state, {
    type: 'save-initiation',
    input: {
      ...defaultInitiationInput(state, 'OPP-066'),
      necessity: '推进海州市数字化转型一期建设',
      scope: '数据协同平台与15个标准业务接口',
      customerNeeds: '完成系统部署上线及部门培训',
      recommendation: '建议评定为重点项目',
      region: '华东',
      attachments: ['立项申请书.pdf'],
    },
  }, initActors.market);
  // 风险报告须覆盖上游评审意见派生的风险（id=RISK-<reviewId>-<i>），否则保存风险报告会被“不能删除上游风险来源”拦下。
  const initiationRisksFor = (oppId: string) =>
    initiationSource(state, oppId).risks.map((r) => ({
      id: r.id, domain: r.domain, description: r.description, sourceId: r.sourceId, sourceRoute: r.sourceRoute,
      probability: 1, impact: 2, mitigation: '按评审意见纳入交付计划并月度跟踪关闭', ownerId: initActors.pmo.id,
    }));

  state = transition(state, { type: 'submit-initiation', id: 'INIT-1' }, initActors.market);

  // 2. INI-002 (重大 / PMC决策会 / 待决策阶段)
  setupInitOpportunity('OPP-068', 2600);
  state = transition(state, {
    type: 'save-initiation',
    input: {
      ...defaultInitiationInput(state, 'OPP-068'),
      necessity: '打造企业级大数据中台与运营协同底座',
      scope: '大数据中台架构及12个微服务模块',
      customerNeeds: '按期交付并提供高可靠运维支持',
      recommendation: '重点战略项目',
      region: '华南',
      strategic: true,
      attachments: ['项目建议书.pdf', '技术方案.pdf'],
    },
  }, initActors.market);
  state = transition(state, { type: 'submit-initiation', id: 'INIT-2' }, initActors.market);
  state = transition(state, {
    type: 'assess-initiation-risk',
    id: 'INIT-2',
    risks: [
      ...initiationRisksFor('OPP-068'),
      { id: 'RISK-01', domain: '技术', description: '数据源接口协议异构风险', sourceId: 'REV-OPP-068', sourceRoute: '/opportunities/OPP-068/review', probability: 3, impact: 3, mitigation: '建立适配转换适配器', ownerId: initActors.tech.id },
      { id: 'RISK-02', domain: '交付', description: '定制化开发周期偏紧', sourceId: 'AR-OPP-068', sourceRoute: '/opportunities/OPP-068/evaluation', probability: 3, impact: 4, mitigation: '分批敏捷迭代发布', ownerId: initActors.pm.id },
    ],
    level: '中',
    explanation: '已逐项核验技术与交付方案，总体风险可控，建议设置里程碑质量门禁',
  }, initActors.pmo);
  state = transition(state, { type: 'classify-initiation', id: 'INIT-2', level: '重大', reason: '项目金额大且属于战略重点项目，定为重大级别' }, initActors.pmo);

  // 3. INI-003 (一般 / 线上会签 / 已完成会签 / 待PMO决策)
  setupInitOpportunity('OPP-069', 800);
  state = transition(state, {
    type: 'save-initiation',
    input: {
      ...defaultInitiationInput(state, 'OPP-069'),
      necessity: '园区综合能效监控与设备物联升级',
      scope: '能效采集终端接入与可视化看板',
      customerNeeds: '实现园区能耗实时监控与智能告警',
      recommendation: '一般项目',
      region: '华东',
      attachments: ['物联方案.pdf'],
    },
  }, initActors.market);
  state = transition(state, { type: 'submit-initiation', id: 'INIT-3' }, initActors.market);
  state = transition(state, { type: 'assess-initiation-risk', id: 'INIT-3', risks: [...initiationRisksFor('OPP-069')], level: '低', explanation: '成熟物联标准化方案，交付风险低' }, initActors.pmo);
  state = transition(state, { type: 'classify-initiation', id: 'INIT-3', level: '一般', reason: '金额适中且方案成熟' }, initActors.pmo);
  for (const node of INITIATION_SIGNATURES) {
    const actorRole = node.role as 'pmo' | 'finance' | 'solution-tech' | 'project-manager';
    const actor = ({ pmo: initActors.pmo, finance: initActors.finance, 'solution-tech': initActors.tech, 'project-manager': initActors.pm })[actorRole];
    state = transition(state, { type: 'sign-initiation', id: 'INIT-3', node: node.node, conclusion: '同意', opinion: `${node.node}签署同意` }, actor);
  }

  // 4. INI-004 草稿：客户经理从商机继续编辑并提交，保证 UI 立项表单有可复现实的完整链路。
  setupInitOpportunity('OPP-070', 600);
  state = transition(state, {
    type: 'save-initiation',
    input: {
      ...defaultInitiationInput(state, 'OPP-070'),
      necessity: '客户希望先完成园区数据治理试点，再逐步推广',
      scope: '园区数据治理试点与两个业务接口联调',
      customerNeeds: '试点范围内数据可查、可看、可追溯',
      recommendation: '先试点后推广，控制首期投入',
      region: '华东',
      attachments: ['立项申请草稿.pdf'],
    },
  }, initActors.market);

  // 结算种子：直接补齐前置条件后停到「财务核算」，
  // 使 财务核算 → PMO审核 → 结算评审 → 待最终锁定 → 财务锁定 全链路可达（旧种子只写了状态机不存在的「审核中」）。
  // 种子阶段直接写状态而不跑 transition，避免每次深拷贝整个业务状态拖慢演示数据构建。
  function seedSettlementChain(next: BusinessState) {
    for (const projectId of ['P-007', 'P-023', 'P-025', 'P-019', 'P-029', 'P-031']) {
      if (next.settlementRequests.filter((r) => !r.supersededBy && ['财务核算', 'PMO审核'].includes(r.status)).length >= 2) break;
      const p = next.projects.find((x) => x.id === projectId);
      if (!p || next.lockedProjects.includes(p.id)) continue;
      // 1. 客户终验确认：验收记录在建设期结束后只读（acceptance.ts 的 assertAcceptanceWritable），这里补登当时已发生的事实。
      const acceptance = next.acceptances.filter((a) => a.projectId === p.id && a.type === '客户终验').sort((a, b) => b.round - a.round)[0];
      if (!acceptance || next.acceptanceDetails[acceptance.id]?.confirmedAt) continue;
      acceptance.status = '已通过';
      next.acceptanceDetails[acceptance.id] = {
        submitted: true, scope: '合同约定全部交付物', plannedDate: '2026-08-20', method: '现场验收',
        customerContact: '客户项目负责人', participants: '客户、PMO、项目组', checks: [], corrections: [],
        opinion: '客户终验通过', process: '客户签署验收确认函', proofFiles: ['客户终验确认函.pdf'],
        confirmedBy: initActors.pmo.name, confirmedAt: '2026-08-28',
        history: [{ date: '2026-08-28', actor: initActors.pmo.name, action: 'PMO确认客户验收完成', note: '客户终验通过' }],
      };
      p.subPhase = '项目结算';
      // 2. 财务核对历史导入未决单（取消不发生）。
      for (const source of pendingSettlementSources(next, p.id).filter((s) => s.imported)) {
        next.settlementCostReviews.push({ id: `SCOST-${next.settlementCostReviews.length + 1}`, projectId: p.id, sourceId: source.id, disposition: '取消不发生', amount: source.amount, evidence: '结算前财务已核对历史导入未决单，确认不再发生', actor: initActors.finance.name, date: AS_OF_DATE });
      }
      // 3. 逐科目清理未发生承诺与预测；仍有动态未决原单的科目留给财务实际办理。
      const calc = selectFourCalculations(p, next);
      p.commitmentBySubject ??= Object.fromEntries(calc.subjects.map((s) => [s.subjectId, s.committed]));
      p.forecastBySubject ??= Object.fromEntries(calc.subjects.map((s) => [s.subjectId, s.remaining]));
      next.settlementForecastSnapshots[p.id] ??= { date: AS_OF_DATE, total: calc.rolling, subjects: Object.fromEntries(calc.subjects.map((s) => [s.subjectId, s.rolling])) };
      for (const subject of calc.subjects) {
        if (next.costOrders.some((o) => o.projectId === p.id && o.subjectId === subject.subjectId && !['已入账', '驳回'].includes(o.status))) continue;
        if (subject.subjectId === 'SUB-01' && next.laborEntries.some((e) => e.projectId === p.id && e.status === '待审核')) continue;
        for (const [bucket, amount] of [['承诺', p.commitmentBySubject[subject.subjectId] ?? 0], ['预测', p.forecastBySubject[subject.subjectId] ?? 0]] as const) {
          if (!(amount > 0)) continue;
          (bucket === '承诺' ? p.commitmentBySubject : p.forecastBySubject)[subject.subjectId] = 0;
          next.settlementCostDispositions.push({ id: `DISPOSE-${next.settlementCostDispositions.length + 1}`, projectId: p.id, subjectId: subject.subjectId, bucket, disposition: '取消不发生', amount, evidence: '结算前确认该科目余额不再发生', date: AS_OF_DATE, actor: initActors.finance.name });
        }
      }
      p.committedCost = sumMoney(Object.values(p.commitmentBySubject));
      p.forecastRemainingCost = sumMoney(Object.values(p.forecastBySubject));
      p.rollingCost = sumMoney([p.actualCost, p.committedCost, p.forecastRemainingCost]);
      p.costVariance = money(p.rollingCost - p.budgetAmount);
      p.costVarianceRate = percentage(p.costVariance, p.budgetAmount) ?? 0;
      // 4. 前置条件全部满足才生成正式申请（不满足则保持原状）。
      if (settlementChecks(next, p.id).some((c) => !c.passed)) continue;
      const snapshot = settlementSnapshot(next, p.id);
      if (!snapshot.estimateId || !snapshot.budgetId || !snapshot.baselineId || !snapshot.contracts.length) continue;
      const actor = { id: p.pmId ?? initActors.pm.id, name: p.pmName ?? initActors.pm.name, role: 'project-manager' as const };
      const note = '成本已全部明确，客户终验通过，申请进入正式结算核算';
      const request: SettlementRequest = { id: `SREQ-${next.settlementRequests.length + 1}`, projectId: p.id, version: 1, status: '财务核算', note, files: ['结算报告.pdf', '成本归集与偏差说明.xlsx'], submittedBy: actor.name, createdAt: AS_OF_DATE, snapshot, history: [{ actor: actor.name, date: AS_OF_DATE, action: '提交结算', opinion: note }] };
      next.settlementRequests.push(request);
      next.constructionFreezes[p.id] = { requestId: request.id, reason: '结算核算及评审中，建设成本暂停发生；材料整改仍保持冻结' };
      p.subPhase = '项目结算';
    }
    // 第一条申请由财务核算确认，停到「PMO审核」，让结算链的两个在途环节都可演示。
    const firstRequest = next.settlementRequests.find((r) => r.status === '财务核算');
    if (firstRequest) {
      firstRequest.finance = { actor: initActors.finance.name, date: AS_OF_DATE, invoicedAmount: money(firstRequest.snapshot.income * 0.9), taxAmount: money(firstRequest.snapshot.income * 0.06), opinion: '开票、税费与成本口径已核对一致' };
      firstRequest.financeConfirmedAt = AS_OF_DATE;
      firstRequest.status = 'PMO审核';
      firstRequest.history.push({ actor: initActors.finance.name, date: AS_OF_DATE, action: 'finance-confirm', opinion: '开票、税费与成本口径已核对一致' });
    }
  }
  // 黄金演示线路：P-008 的立项历史。66 个在建项目都挂着真实商机，但立项流程的种子只造了
  // OPP-067..070 四条独立申请（projectId 为空）——「同一个项目从商机讲到关闭」在立项段断档。
  // 这里只补一条已通过的立项申请记录（不重跑状态机，也不新建项目），事实取自 P-008 / OPP-008 / CTR-007。
  function seedGoldenInitiation(next: BusinessState) {
    const p = next.projects.find((x) => x.id === 'P-008');
    const o = next.opportunities.find((x) => x.id === 'OPP-008');
    const estimate = next.estimates.find((e) => e.id === o?.currentEstimateVersionId);
    if (!p || !o || !estimate) return;
    if (next.initiations.some((i) => i.projectId === p.id)) return;
    const input = {
      opportunityId: o.id,
      name: p.name,
      type: p.type,
      region: '福建省',
      amount: o.estimatedAmount,
      necessity: '县级数据中台需统一归集人口、法人、信用等主题库，支撑跨部门共享与业务协同。',
      scope: '数据中台主题库建设、数据治理与四类业务系统接口联调。',
      plannedStartDate: p.plannedStartDate,
      plannedEndDate: p.plannedEndDate,
      expectedSignDate: o.expectedSignDate,
      customerNeeds: '希望打通各委办局数据，实现一次采集多方复用，并具备数据质量监控能力。',
      recommendation: '建议按重点项目管理，分期建设、先行试点主题库。',
      strategic: true,
      contractStatus: '未签' as const,
      contractReference: '',
      attachments: ['立项申请.pdf', '数据中台总体方案.pdf'],
      additionalDeliverables: [],
      risks: [],
      rectificationReply: '',
    };
    const signatures = INITIATION_SIGNATURES.map((node) => ({
      node: node.node,
      role: node.role,
      by: node.role === 'finance' ? initActors.finance.name : node.role === 'pmo' ? initActors.pmo.name : node.role === 'project-manager' ? initActors.pm.name : initActors.tech.name,
      conclusion: '同意' as const,
      opinion: `${node.node}意见：商务、技术、交付与资金安排均可执行`,
      date: '2025-02-20',
    }));
    next.initiations.push({
      id: 'INIT-008',
      input,
      draftRevision: 1,
      status: '通过',
      createdBy: o.ownerId,
      createdAt: '2025-02-10',
      projectId: p.id,
      rounds: [
        {
          revision: 1,
          input,
          source: { opportunity: o, estimate, solutionVersionId: '', solutionScope: '数据中台主题库与数据治理', solutionAttachments: ['数据中台总体方案.pdf'], expertReviewId: '', expertOpinions: [], risks: [], earlyCostTotal: 0, earlyCostSources: [] },
          submittedAt: '2025-02-10',
          submittedBy: o.ownerName,
          status: '通过',
          risks: [],
          riskLevel: '中',
          riskExplanation: '数据归集涉及多委办局协调，接口联调依赖客户侧配合，整体风险可控。',
          assessedBy: initActors.pmo.name,
          requiredDeliverables: [],
          level: p.level,
          classificationReason: '金额与战略价值达到重点项目标准',
          ruleReasons: ['预计金额超过一般项目阈值', '战略客户且具备示范效应'],
          path: '线上会签',
          signatures,
          decision: { result: '通过', opinion: '同意立项，按重点项目管理，未签先行立项并同步推进合同签署', by: initActors.pmo.name, date: '2025-02-20', meetingDate: '2025-02-20', participants: [initActors.pmo.name, initActors.market.name, initActors.finance.name, initActors.tech.name], minutes: '各节点会签同意；商务风险由合同条款规避，资金按里程碑支付。', rectifications: [] },
        },
      ],
    });
  }
  seedSettlementChain(state);
  seedGoldenInitiation(state);
  // 项目成员以团队台账为准：工时填报、事项办理、资源视图都读 projects.memberIds，
  // 旧种子只建了 projectTeams.members，导致「已在团队成员列表里的人」事报工时被拒。
  for (const p of state.projects) {
    const team = state.projectTeams[p.id];
    if (!team) continue;
    p.memberIds = [...new Set([...(p.memberIds ?? []), ...team.members.filter((m) => m.active).map((m) => m.userId), ...team.appointments.filter((a) => a.status === '待接受').map((a) => a.userId)])];
  }

  return state;
}

// The fixed demo seed is built through the real transitions once. Never expose
// the private snapshot: each reset gets an independent object graph.
let demoSnapshot: BusinessState | undefined;
export function createDemoBusinessState(): BusinessState {
  demoSnapshot ??= buildDemoBusinessState();
  return structuredClone(demoSnapshot);
}

