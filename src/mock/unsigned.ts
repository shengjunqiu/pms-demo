import { AS_OF_DATE, mockUsers } from '@/mock';
import type { Actor, BusinessState, ManagementApproval } from './business';
import type { Contract, Project, ReceiptPlan } from '@/models/types';
import type {
  ExecutionWorkReference,
  UnsignedProjectControl,
} from '@/models/unsigned';
import { assertConstructionWritable } from './construction-lock';
import { validPlanDate } from './budget';
import { canManageOpportunity } from './opportunities';
import { canAccessProject } from './configuration-access';
import { money, percentage, sumMoney } from '@/utils/money';

export const UNSIGNED_RULE = {
  version: 'UNSIGNED-2026-01',
  validDays: 90,
  nearDays: 7,
  nearQuotaPercent: 80,
  longDays: 60,
};

const plusDays = (date: string, days: number) =>
  new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
const daysBetween = (from: string, to = AS_OF_DATE) =>
  Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / 86400000));

export function unsignedControl(
  state: BusinessState,
  project: Project,
): UnsignedProjectControl {
  const application = state.initiations.find((item) => item.projectId === project.id);
  const opportunity = state.opportunities.find((item) => item.id === project.opportunityId);
  const initiatedAt =
    application?.rounds.at(-1)?.decision?.date ?? project.plannedStartDate;
  return (
    state.unsignedProjects[project.id] ?? {
      projectId: project.id,
      initiatedAmount: application?.input.amount ?? project.revenueAmount ?? 0,
      initiatedAt,
      expectedSignDate:
        application?.input.expectedSignDate ??
        opportunity?.expectedSignDate ??
        project.plannedStartDate,
      validUntil: plusDays(initiatedAt, UNSIGNED_RULE.validDays),
      ruleVersion: UNSIGNED_RULE.version,
      followups: [],
    }
  );
}

export function unsignedSummary(state: BusinessState, project: Project) {
  const control = unsignedControl(state, project);
  const pendingOrders = sumMoney(
    state.costOrders
      .filter((order) => order.projectId === project.id && order.status === '待审批')
      .map((order) => order.amount),
  );
  const pendingLabor = sumMoney(
    state.laborEntries
      .filter((entry) => entry.projectId === project.id && entry.status === '待审核')
      .map((entry) => entry.amount),
  );
  const pendingCost = money(
    pendingOrders +
      Math.max(0, pendingLabor - (project.commitmentBySubject?.['SUB-01'] ?? 0)),
  );
  const exposure = sumMoney([project.actualCost, project.committedCost, pendingCost]);
  const quota = project.unsignedLimitQuota ?? 0;
  const usage = percentage(exposure, quota);
  const days = daysBetween(control.initiatedAt);
  const flags: string[] = [];
  if (control.expectedSignDate < AS_OF_DATE) flags.push('签约逾期');
  else if (daysBetween(AS_OF_DATE, control.expectedSignDate) <= UNSIGNED_RULE.nearDays)
    flags.push('签约临期');
  if (AS_OF_DATE > control.validUntil) flags.push('投入有效期已过');
  if (exposure > quota) flags.push('投入超限');
  else if ((usage ?? 0) >= UNSIGNED_RULE.nearQuotaPercent) flags.push('投入接近限额');
  if (days >= UNSIGNED_RULE.longDays) flags.push('长期未签');
  return {
    control,
    pendingCost,
    exposure,
    quota,
    usage,
    days,
    flags,
    available: money(Math.max(0, quota - exposure)),
    overrun: money(Math.max(0, exposure - quota)),
    costs: state.costs.filter((cost) => cost.projectId === project.id),
  };
}

export function assertNewProjectCommitment(state: BusinessState, project: Project) {
  if (state.unsignedProjects[project.id]?.exit?.terminated)
    throw new Error('项目已退出，不能新增投入');
  if (project.isUnsigned) {
    const control = unsignedControl(state, project);
    if (AS_OF_DATE > control.validUntil || AS_OF_DATE > control.expectedSignDate)
      throw new Error('未签项目已逾期，须先完成延期与额外投入审批');
  } else if (project.phase === '立项') {
    throw new Error('项目尚未正式启动，不能新增建设投入');
  }
}

export function canManageUnsigned(
  state: BusinessState,
  project: Project,
  actor: Actor,
) {
  const opportunity = state.opportunities.find(
    (item) => item.id === project.opportunityId,
  );
  return !!opportunity && canManageOpportunity(state, opportunity, actor);
}

export function canViewUnsignedProject(
  state: BusinessState,
  project: Project,
  actor: Actor,
) {
  if (!canAccessProject(state, actor, project)) return false;
  return (
    ['pmo', 'executive', 'finance', 'admin'].includes(actor.role) ||
    canManageUnsigned(state, project, actor)
  );
}

export function startupChecks(state: BusinessState, project: Project) {
  const application = state.initiations.find((item) => item.projectId === project.id);
  const team = state.projectTeams[project.id];
  const appointed = [...(team?.appointments ?? [])]
    .reverse()
    .find(
      (appointment) =>
        appointment.userId === project.pmId && appointment.status === '已接受',
    );
  const activePmMembers =
    team?.members.filter(
      (member) => member.active && member.role === '项目经理',
    ) ?? [];
  const baseline = state.baselines.find(
    (item) =>
      item.projectId === project.id &&
      item.status === '已生效' &&
      item.version === project.currentBaselineVersion,
  );
  const budget = baseline?.snapshot
    ? state.budgets.find(
        (item) =>
          item.projectId === project.id &&
          item.status === '已生效' &&
          item.id === baseline.snapshot?.budget.id,
      )
    : undefined;
  const startMilestone = baseline?.snapshot?.milestones.find(
    (milestone) => milestone.type === '启动',
  );
  const currentStartMilestone = startMilestone
    ? state.milestones.find(
        (milestone) =>
          milestone.id === startMilestone.id && milestone.projectId === project.id,
      )
    : undefined;
  const leafTasks =
    baseline?.snapshot?.tasks.filter(
      (task) => !baseline.snapshot!.tasks.some((candidate) => candidate.parentId === task.id),
    ) ?? [];
  const currentTasksMatch = leafTasks.every((task) => {
    const current = state.tasks.find(
      (candidate) => candidate.id === task.id && candidate.projectId === project.id,
    );
    return (
      current?.ownerId === task.ownerId &&
      current.startDate === task.startDate &&
      current.endDate === task.endDate
    );
  });
  const contract = state.contracts.find(
    (item) =>
      item.projectId === project.id &&
      item.customerId === project.customerId &&
      ['已签订', '履约中'].includes(item.status),
  );
  const checks = [
    {
      key: 'phase',
      name: '当前阶段与建设锁',
      passed:
        project.phase === '立项' &&
        !state.lockedProjects.includes(project.id) &&
        !state.constructionFreezes[project.id] &&
        !['已终止', '已关闭'].includes(project.status),
      detail: `${project.phase} / ${project.status}`,
    },
    {
      key: 'initiation',
      name: '立项已通过',
      passed: application
        ? application.status === '通过'
        : !!project.frozenEstimateVersionId,
      detail: application
        ? `${application.id} / ${application.status}`
        : '历史立项台账，保留原项目及冻结概算引用',
    },
    {
      key: 'pm',
      name: '唯一主PM接受任命',
      passed:
        !!project.pmId &&
        !!appointed &&
        activePmMembers.length === 1 &&
        activePmMembers[0].userId === project.pmId &&
        !team?.appointments.some((appointment) => appointment.status === '待接受'),
      detail: appointed
        ? `${appointed.id} / ${project.pmName} 已接受；当前有效项目经理 ${activePmMembers.length} 人`
        : '待PMO任命并由候选人接受',
    },
    {
      key: 'baseline',
      name: '完整有效四基线',
      passed:
        !!baseline?.snapshot &&
        !!budget &&
        budget.totalAmount === baseline.budgetAmount,
      detail: baseline
        ? `${baseline.version} / ${baseline.snapshot ? '完整快照' : '仅历史摘要'}`
        : '当前版本尚无生效基线',
    },
    {
      key: 'schedule',
      name: '启动阶段与计划一致',
      passed:
        !!baseline?.snapshot &&
        baseline.snapshot.plannedStartDate === project.plannedStartDate &&
        baseline.snapshot.plannedEndDate === project.plannedEndDate &&
        !!startMilestone &&
        !!currentStartMilestone &&
        currentStartMilestone.status !== '已达成',
      detail: startMilestone
        ? `启动里程碑 ${startMilestone.id} / ${startMilestone.plannedDate}`
        : '有效基线缺少启动里程碑',
    },
    {
      key: 'team',
      name: '执行责任与团队',
      passed:
        leafTasks.length > 0 &&
        currentTasksMatch &&
        leafTasks.every((task) =>
          team?.members.some(
            (member) => member.active && member.userId === task.ownerId,
          ),
        ),
      detail: '当前WBS须与有效基线一致，叶子任务责任人须在有效项目团队中',
    },
    {
      key: 'contract',
      name: '真实已签合同',
      passed:
        !project.isUnsigned &&
        !!contract &&
        contract.amount === project.contractAmount &&
        !!contract.signDate &&
        contract.signDate <= AS_OF_DATE,
      detail: contract
        ? `${contract.code} / ${contract.amount}万元 / ${contract.signDate}`
        : '未签项目不能确认正式启动',
    },
  ];
  return { checks, baseline, budget, contract, appointed, currentStartMilestone };
}

function executionWork(
  state: BusinessState,
  project: Project,
): ExecutionWorkReference[] {
  const baseline = state.baselines.find(
    (item) =>
      item.projectId === project.id &&
      item.status === '已生效' &&
      item.version === project.currentBaselineVersion,
  )!;
  const leafTasks = baseline.snapshot!.tasks.filter(
    (task) => !baseline.snapshot!.tasks.some((candidate) => candidate.parentId === task.id),
  );
  return [
    ...leafTasks.map((task) => ({
      id: `START-WORK-${task.id}`,
      type: 'WBS任务' as const,
      sourceId: task.id,
      title: task.name,
      ownerId: task.ownerId,
      ownerName: task.ownerName,
      dueDate: task.endDate,
      route: `/projects/${project.id}/progress?task=${task.id}`,
      policyAction: 'update-task' as const,
      policyTargetId: task.id,
      status: task.status,
    })),
    {
      id: `DAILY-${project.id}-${AS_OF_DATE}`,
      type: '日报待办' as const,
      sourceId: project.id,
      title: `${AS_OF_DATE} 项目日报`,
      ownerId: project.pmId,
      ownerName: project.pmName,
      dueDate: AS_OF_DATE,
      route: `/projects/${project.id}/daily-reports`,
      policyAction: 'save-daily' as const,
      policyTargetId: project.id,
      status: '待提交',
    },
    {
      id: `LABOR-ENTRY-${project.id}`,
      type: '工时填报入口' as const,
      sourceId: baseline.id,
      title: '按WBS填报执行工时',
      ownerId: project.pmId,
      ownerName: project.pmName,
      dueDate: AS_OF_DATE,
      route: `/projects/${project.id}/labor-cost`,
      policyAction: 'submit-labor' as const,
      policyTargetId: project.id,
      status: '已开放',
    },
  ];
}

export interface ContractRegistration {
  code: string;
  name: string;
  amount: number;
  signDate: string;
  acceptanceDueDate: string;
  source: string;
  attachment: string;
  receiptPlans: { title: string; dueDate: string; amount: number }[];
}

export type UnsignedAction =
  | {
      type: 'follow-unsigned';
      projectId: string;
      progress: string;
      nextAction: string;
      expectedSignDate: string;
    }
  | {
      type: 'request-unsigned-investment';
      projectId: string;
      amount: number;
      validUntil: string;
      expectedSignDate: string;
      signProgress: string;
      necessity: string;
      risk: string;
      attachments: string[];
    }
  | {
      type: 'confirm-project-contract';
      projectId: string;
      contractId?: string;
      registration?: ContractRegistration;
      source: string;
    }
  | {
      type: 'exit-unsigned';
      projectId: string;
      reason: string;
      resources: string;
      recoverableAssets: string;
      responsibility: string;
      recommendation: string;
      terminated: boolean;
      reactivationPossible: boolean;
    }
  | { type: 'confirm-project-start'; projectId: string; date: string; opinion: string };

export function approveUnsignedInvestment(
  state: BusinessState,
  approval: ManagementApproval,
) {
  const project = state.projects.find((item) => item.id === approval.projectId);
  if (!project || ['已终止', '已关闭'].includes(project.status))
    throw new Error('项目已退出，不能释放新增额度');
  assertConstructionWritable(state, project.id);
  const request = state.unsignedInvestmentRequests.find(
    (item) => item.approvalId === approval.id,
  );
  // The original demo approval predates the request contract. It may change quota,
  // but must never silently extend the authorization dates.
  if (!request) return;
  if (
    approval.sourceId !== request.id ||
    approval.proposedQuota !== request.proposedQuota ||
    money(request.originalQuota + request.amount) !== request.proposedQuota
  )
    throw new Error('追加投入审批与原申请不一致，请重新申报');
  const control = state.unsignedProjects[project.id] ??= unsignedControl(state, project);
  const current = unsignedSummary(state, project);
  if (current.exposure > request.proposedQuota)
    throw new Error('当前投入敞口已超过申请后额度，请重新申报');
  if (
    control.validUntil !== request.originalValidUntil ||
    request.proposedValidUntil < AS_OF_DATE ||
    request.sourceSnapshot.expectedSignDate < AS_OF_DATE
  )
    throw new Error('投入申请有效期或签约计划已过期，请重新申请');
  control.validUntil = request.proposedValidUntil;
  control.expectedSignDate = request.sourceSnapshot.expectedSignDate;
}

export function applyUnsignedAction(
  state: BusinessState,
  action: UnsignedAction,
  actor: Actor,
) {
  const project = state.projects.find((item) => item.id === action.projectId);
  if (!project) throw new Error('项目不存在');
  assertConstructionWritable(state, project.id);
  const control = state.unsignedProjects[project.id] ??= unsignedControl(state, project);
  const canManage = canManageUnsigned(state, project, actor);

  if (action.type === 'confirm-project-start') {
    if (
      actor.role !== 'pmo' &&
      !(actor.role === 'project-manager' && actor.id === project.pmId)
    )
      throw new Error('仅主PM或PMO确认项目启动');
    if (state.startConfirmations[project.id])
      throw new Error('项目已确认启动，不得重复');
    if (
      !validPlanDate(action.date) ||
      action.date > AS_OF_DATE ||
      action.date < project.plannedStartDate ||
      action.date > project.plannedEndDate ||
      !action.opinion.trim()
    )
      throw new Error('启动日期须在批准项目周期内且不晚于演示日，确认意见必填');
    const result = startupChecks(state, project);
    const failed = result.checks.filter((check) => !check.passed);
    if (failed.length)
      throw new Error(
        failed.map((check) => `${check.name}：${check.detail}`).join('；'),
      );
    const backdatedSources = [
      { name: '合同签订日期', date: result.contract!.signDate },
      { name: '当前基线生效日期', date: result.baseline!.createdAt },
      { name: '当前主PM接受任命日期', date: result.appointed!.respondedAt },
    ].filter(
      (source): source is { name: string; date: string } =>
        !!source.date && action.date < source.date,
    );
    if (backdatedSources.length)
      throw new Error(
        `实际启动日期不得早于${backdatedSources
          .map((source) => `${source.name} ${source.date}`)
          .join('、')}`,
      );
    const work = executionWork(state, project);
    const recipients = [
      ...new Set([
        ...state.projectTeams[project.id].members
          .filter((member) => member.active)
          .map((member) => member.userId),
        'U-002',
        'U-004',
      ]),
    ];
    state.startConfirmations[project.id] = {
      projectId: project.id,
      by: actor.name,
      date: action.date,
      opinion: action.opinion.trim(),
      baseline: structuredClone(result.baseline!),
      contract: structuredClone(result.contract!),
      appointmentId: result.appointed!.id,
      startMilestone: {
        id: result.currentStartMilestone!.id,
        name: result.currentStartMilestone!.name,
        actualDate: action.date,
        status: '已达成',
      },
      checks: structuredClone(result.checks),
      executionWork: structuredClone(work),
      notifications: recipients.flatMap((id) => {
        const user = mockUsers.find((item) => item.id === id);
        return user
          ? [
              {
                userId: id,
                name: user.name,
                role: user.role,
                status: '已生成' as const,
                message: `${project.name} 于 ${action.date} 正式启动，请按已生效基线办理执行事项。`,
              },
            ]
          : [];
      }),
    };
    result.currentStartMilestone!.status = '已达成';
    result.currentStartMilestone!.actualDate = action.date;
    result.contract!.status = '履约中';
    project.phase = '执行';
    project.subPhase = '开发实施';
    project.actualStartDate = action.date;
    project.releasedBudgetPercent = Math.max(project.releasedBudgetPercent ?? 0, 60);
    return project.id;
  }

  if (action.type === 'exit-unsigned' && control.exit)
    throw new Error('退出复盘已形成，不得重复决策或覆盖历史');
  if (!project.isUnsigned || control.exit?.terminated)
    throw new Error('仅有效未签项目可办理');

  if (action.type === 'follow-unsigned') {
    if (
      !canManage ||
      !action.progress.trim() ||
      !action.nextAction.trim() ||
      !validPlanDate(action.expectedSignDate)
    )
      throw new Error('主办角色须填写进展、下一步与签约日期');
    control.followups.push({
      id: `FOLLOW-${project.id}-${control.followups.length + 1}`,
      date: AS_OF_DATE,
      by: actor.name,
      progress: action.progress.trim(),
      nextAction: action.nextAction.trim(),
      expectedSignDate: action.expectedSignDate,
    });
    // A progress note cannot release or extend an expired investment authorization.
  } else if (action.type === 'request-unsigned-investment') {
    if (
      !canManage ||
      !Number.isFinite(action.amount) ||
      action.amount <= 0 ||
      !action.signProgress.trim() ||
      !action.necessity.trim() ||
      !action.risk.trim() ||
      !action.attachments.length
    )
      throw new Error('主办角色须填写正追加额度、签约进展、必要性、风险与附件');
    if (
      !validPlanDate(action.validUntil) ||
      !validPlanDate(action.expectedSignDate) ||
      action.validUntil < AS_OF_DATE ||
      action.expectedSignDate < AS_OF_DATE ||
      action.validUntil < action.expectedSignDate
    )
      throw new Error('新增授权有效期和签约计划必须有效，且覆盖预计签约日');
    if (
      state.managementApprovals.some(
        (approval) =>
          approval.projectId === project.id &&
          approval.type === '未签额外投入' &&
          approval.status === '待审批',
      )
    )
      throw new Error('已有待审追加投入，不能并发重复释放');
    const id = `UNSIGNED-REQ-${state.unsignedInvestmentRequests.length + 1}`;
    const approvalId = `MGT-${id}`;
    const summary = unsignedSummary(state, project);
    const proposedQuota = money(summary.quota + action.amount);
    if (proposedQuota < summary.exposure)
      throw new Error('申请后额度仍低于当前投入敞口，请补足超限金额');
    state.unsignedInvestmentRequests.push({
      id,
      projectId: project.id,
      approvalId,
      amount: action.amount,
      originalQuota: summary.quota,
      proposedQuota,
      originalValidUntil: control.validUntil,
      proposedValidUntil: action.validUntil,
      signProgress: action.signProgress.trim(),
      necessity: action.necessity.trim(),
      risk: action.risk.trim(),
      attachments: structuredClone(action.attachments),
      submittedBy: actor.name,
      submittedAt: AS_OF_DATE,
      sourceSnapshot: {
        actualCost: project.actualCost,
        committedCost: project.committedCost,
        pendingCost: summary.pendingCost,
        expectedSignDate: action.expectedSignDate,
      },
    });
    state.managementApprovals.push({
      id: approvalId,
      projectId: project.id,
      sourceId: id,
      type: '未签额外投入',
      reason: `${action.necessity.trim()}；签约：${action.signProgress.trim()}；风险：${action.risk.trim()}`,
      submittedBy: actor.id,
      status: '待审批',
      originalQuota: summary.quota,
      proposedQuota,
      impactAmount: action.amount,
    });
    state.decisions.push({
      id: approvalId,
      projectId: project.id,
      projectName: project.name,
      type: '未签额外投入',
      title: `${project.name} 未签追加投入`,
      impactAmount: action.amount,
      createdAt: AS_OF_DATE,
      status: '待决策',
      level: '高管审批',
      targetRoute: `/unsigned-projects/${project.id}`,
    });
  } else if (action.type === 'confirm-project-contract') {
    if (!canManage || !action.source.trim())
      throw new Error('仅主办角色根据真实合同依据确认签约');
    let contract: Contract | undefined;
    let priorProjectId = '';
    if (action.contractId) {
      contract = state.contracts.find(
        (item) =>
          item.id === action.contractId &&
          item.customerId === project.customerId &&
          (item.projectId === project.id ||
            (!item.projectId && item.opportunityId === project.opportunityId)) &&
          item.status === '已签订',
      );
      priorProjectId = contract?.projectId ?? '';
    } else if (action.registration) {
      const registration = action.registration;
      if (
        !registration.code.trim() ||
        !registration.name.trim() ||
        !registration.source.trim() ||
        !registration.attachment.trim() ||
        !Number.isFinite(registration.amount) ||
        registration.amount <= 0 ||
        !validPlanDate(registration.signDate) ||
        registration.signDate > AS_OF_DATE ||
        !validPlanDate(registration.acceptanceDueDate) ||
        registration.acceptanceDueDate < registration.signDate
      )
        throw new Error(
          '模拟原合同须有编号、金额、签约日、验收日、原单来源及签署附件',
        );
      if (state.contracts.some((item) => item.code === registration.code.trim()))
        throw new Error('合同编号重复，请关联已有合同');
      if (
        !registration.receiptPlans.length ||
        registration.receiptPlans.some(
          (plan) =>
            !plan.title.trim() ||
            !validPlanDate(plan.dueDate) ||
            plan.dueDate < registration.signDate ||
            !Number.isFinite(plan.amount) ||
            plan.amount <= 0,
        ) ||
        Math.abs(
          sumMoney(registration.receiptPlans.map((plan) => plan.amount)) -
            registration.amount,
        ) > 0.000001
      )
        throw new Error('回款计划须有有效节点日期，合计等于合同金额');
      contract = {
        id: `CON-REGISTER-${state.contracts.length + 1}`,
        code: registration.code.trim(),
        name: registration.name.trim(),
        projectId: project.id,
        opportunityId: project.opportunityId,
        customerId: project.customerId,
        amount: registration.amount,
        signDate: registration.signDate,
        acceptanceDueDate: registration.acceptanceDueDate,
        status: '已签订',
        paidAmount: 0,
        unpaidAmount: registration.amount,
      };
      state.contracts.push(contract);
      const plans: ReceiptPlan[] = registration.receiptPlans.map((plan, index) => ({
        id: `RCPT-${contract!.id}-${index + 1}`,
        projectId: project.id,
        contractId: contract!.id,
        title: plan.title.trim(),
        dueDate: plan.dueDate,
        amount: plan.amount,
        paidAmount: 0,
      }));
      state.receiptPlans.push(...plans);
    }
    if (
      !contract ||
      !validPlanDate(contract.signDate) ||
      contract.signDate > AS_OF_DATE ||
      contract.amount <= 0
    )
      throw new Error('缺少归属当前项目的真实已签合同');
    contract.projectId = project.id;
    const receiptPlans = state.receiptPlans.filter(
      (plan) => plan.contractId === contract!.id,
    );
    receiptPlans.forEach((plan) => {
      plan.projectId = project.id;
    });
    project.isUnsigned = false;
    project.contractAmount = contract.amount;
    project.revenueAmount = contract.amount;
    control.contractConfirmation = {
      contractId: contract.id,
      by: actor.name,
      date: AS_OF_DATE,
      source: action.source.trim(),
      priorProjectId,
      contractSnapshot: structuredClone(contract),
      receiptPlanSnapshots: structuredClone(receiptPlans),
      sourceDocument: action.registration
        ? {
            source: action.registration.source.trim(),
            attachment: action.registration.attachment.trim(),
          }
        : undefined,
    };
  } else if (action.type === 'exit-unsigned') {
    if (
      actor.role !== 'pmo' ||
      ![
        action.reason,
        action.resources,
        action.recoverableAssets,
        action.responsibility,
        action.recommendation,
      ].every((value) => value.trim())
    )
      throw new Error('PMO确认退出须完整登记原因、资源、资产、责任与建议');
    control.exit = {
      ...action,
      reason: action.reason.trim(),
      resources: action.resources.trim(),
      recoverableAssets: action.recoverableAssets.trim(),
      responsibility: action.responsibility.trim(),
      recommendation: action.recommendation.trim(),
      by: actor.name,
      date: AS_OF_DATE,
      actualCost: project.actualCost,
      costSources: structuredClone(
        state.costs.filter((cost) => cost.projectId === project.id),
      ),
    };
    if (action.terminated) project.status = '已终止';
  }
  return project.id;
}
