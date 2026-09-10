import { AS_OF_DATE } from '@/mock';
import { describe, expect, it } from 'vitest';
import { createBusinessState, transition, type Actor } from '@/mock/business';
import {
  canViewUnsignedProject,
  startupChecks,
  unsignedControl,
  unsignedSummary,
  type ContractRegistration,
} from '@/mock/unsigned';
import { selectTodos } from '@/mock/todos';
import { canAccessAction, selectAccessPolicy } from '@/mock/configuration-access';
import { inOrganization } from '@/mock/selectors';

const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
const pm: Actor = { id: 'U-001', name: '张伟', role: 'project-manager' };
const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
const leader: Actor = { id: 'U-003', name: '王总', role: 'executive' };
const replacementPm: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
const planId = 'P-PLAN-001';
const registration: ContractRegistration = {
  code: 'CON-TEST-START',
  name: '园区协同平台交付合同',
  amount: 1200,
  signDate: AS_OF_DATE,
  acceptanceDueDate: '2026-12-31',
  source: '客户签署合同正本',
  attachment: '双方签章合同.pdf',
  receiptPlans: [
    { title: '启动款', dueDate: '2026-09-20', amount: 360 },
    { title: '验收款', dueDate: '2026-12-31', amount: 840 },
  ],
};

function planned(plannedStartDate?: string) {
  const initial = createBusinessState();
  if (plannedStartDate) {
    initial.projects.find((project) => project.id === planId)!.plannedStartDate =
      plannedStartDate;
    initial.planningDrafts[planId].plannedStartDate = plannedStartDate;
  }
  const currentAppointment = initial.projectTeams[planId].appointments.find(
    (appointment) =>
      appointment.userId === initial.projects.find((project) => project.id === planId)!.pmId &&
      appointment.status === '已接受',
  )!;
  currentAppointment.nominatedAt = plannedStartDate ?? initial.projects.find((project) => project.id === planId)!.plannedStartDate;
  currentAppointment.respondedAt = plannedStartDate ?? initial.projects.find((project) => project.id === planId)!.plannedStartDate;
  let state = transition(
    initial,
    { type: 'submit-planning', projectId: planId },
    pm,
  );
  state = transition(
    state,
    {
      type: 'review-planning',
      id: 'PREVIEW-1',
      result: '通过',
      opinion: '计划资源满足交付',
      rectifications: [],
    },
    pmo,
  );
  const budget = {
    ...state.budgets[0],
    id: 'DRAFT-NEW',
    projectId: planId,
    totalAmount: 600,
    items: [{ subjectId: 'SUB-01', subjectName: '交付人力', amount: 600 }],
    laborCost: 600,
    procurementCost: 0,
    outsourceCost: 0,
    expenseCost: 0,
    reserveCost: 0,
  };
  state = transition(
    state,
    { type: 'submit-budget', projectId: planId, budget, reason: '首次项目预算' },
    pm,
  );
  state = transition(
    state,
    { type: 'review', approvalId: 'APR-1', approve: true, opinion: '同意预算' },
    pmo,
  );
  return transition(
    state,
    { type: 'confirm-budget-baseline', approvalId: 'APR-1' },
    pmo,
  );
}

const requestInvestment = {
  type: 'request-unsigned-investment' as const,
  projectId: planId,
  amount: 100,
  validUntil: '2026-12-31',
  expectedSignDate: '2026-10-15',
  signProgress: '客户进入合同审批',
  necessity: '继续技术验证',
  risk: '按期不签则停止新增投入',
  attachments: ['申请.pdf'],
};

describe('未签投入、合同及正式启动', () => {
  it('未签台账与详情使用当前操作者的组织和本人范围过滤项目', () => {
    const state = createBusinessState();
    const inside = state.projects.find((project) => project.id === planId)!;
    const outside = state.projects.find(
      (project) =>
        project.isUnsigned &&
        !inOrganization(project.departmentId, inside.departmentId),
    )!;
    const policy = selectAccessPolicy(state, pmo.role)!;
    policy.dataScope = 'organizations';
    policy.orgIds = [inside.departmentId];
    expect(canViewUnsignedProject(state, inside, pmo)).toBe(true);
    expect(canViewUnsignedProject(state, outside, pmo)).toBe(false);

    state.projectTeams[inside.id].members.push({
      userId: pmo.id,
      name: pmo.name,
      departmentId: inside.departmentId,
      role: 'PMO监督',
      active: true,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      allocation: 10,
      plannedHours: 8,
      keyPosition: false,
    });
    policy.dataScope = 'self';
    policy.orgIds = [];
    expect(canViewUnsignedProject(state, inside, pmo)).toBe(true);
    expect(canViewUnsignedProject(state, outside, pmo)).toBe(false);
  });

  it('追加申请固定敞口与额度，待审不释放，重复申请阻断，批准后只改额度和授权时限', () => {
    const initial = createBusinessState();
    const project = initial.projects.find((item) => item.id === planId)!;
    let state = transition(initial, requestInvestment, market);
    expect(state.projects.find((item) => item.id === planId)?.unsignedLimitQuota).toBe(0);
    expect(() => transition(state, requestInvestment, market)).toThrow('已有待审');
    const request = structuredClone(state.unsignedInvestmentRequests[0]);
    expect(() =>
      transition(
        state,
        {
          type: 'review-management',
          id: request.approvalId,
          approve: true,
          opinion: '批准',
        },
        pmo,
      ),
    ).toThrow('无权');
    state = transition(
      state,
      {
        type: 'review-management',
        id: request.approvalId,
        approve: true,
        opinion: '同意限额与有效期',
      },
      leader,
    );
    expect(state.projects.find((item) => item.id === planId)?.unsignedLimitQuota).toBe(
      100,
    );
    expect(state.projects.find((item) => item.id === planId)?.actualCost).toBe(
      project.actualCost,
    );
    expect(state.costs).toEqual(initial.costs);
    expect(state.unsignedProjects[planId].validUntil).toBe('2026-12-31');
    expect(state.unsignedInvestmentRequests[0]).toEqual(request);
  });

  it('申请和批准均重算投入敞口，申请后仍超限或审批时余额失效均阻断', () => {
    const insufficient = createBusinessState();
    insufficient.projects.find((item) => item.id === planId)!.actualCost = 101;
    expect(() => transition(insufficient, requestInvestment, market)).toThrow(
      '仍低于当前投入敞口',
    );

    const state = transition(createBusinessState(), requestInvestment, market);
    const request = state.unsignedInvestmentRequests[0];
    state.projects.find((item) => item.id === planId)!.actualCost = 101;
    expect(() =>
      transition(
        state,
        {
          type: 'review-management',
          id: request.approvalId,
          approve: true,
          opinion: '批准',
        },
        leader,
      ),
    ).toThrow('当前投入敞口已超过申请后额度');
    expect(state.projects.find((item) => item.id === planId)?.unsignedLimitQuota).toBe(0);
  });

  it('更新跟进不会擅自延长授权，过期阻断新采购但已发生凭证照实归集', () => {
    const initial = createBusinessState();
    const project = initial.projects[0];
    project.isUnsigned = true;
    project.unsignedLimitQuota = 10000;
    initial.unsignedProjects[project.id] = {
      ...unsignedControl(initial, project),
      expectedSignDate: '2026-09-01',
      validUntil: '2026-09-01',
    };
    let state = transition(
      initial,
      {
        type: 'follow-unsigned',
        projectId: project.id,
        progress: '客户延期',
        nextAction: '申请延期审批',
        expectedSignDate: '2026-10-01',
      },
      market,
    );
    expect(state.unsignedProjects[project.id].validUntil).toBe('2026-09-01');
    expect(() =>
      transition(
        state,
        {
          type: 'submit-cost-order',
          projectId: project.id,
          kind: 'procurement',
          subjectId: 'SUB-03',
          title: '新增采购',
          amount: 1,
          supplier: '供应商',
          contractNo: 'CG1',
          scope: '设备',
          dueDate: '2026-10-01',
        },
        pm,
      ),
    ).toThrow('逾期');
    state.projects[0].unsignedLimitQuota = 0;
    state = transition(
      state,
      {
        type: 'confirm-cost',
        cost: {
          ...state.costs[0],
          id: 'ACTUAL-OVER',
          sourceId: 'VOUCHER-OVER',
          amount: 10,
        },
      },
      finance,
    );
    expect(state.costs.some((cost) => cost.sourceId === 'VOUCHER-OVER')).toBe(true);
    const summary = unsignedSummary(state, state.projects[0]);
    expect(summary.flags).toContain('投入超限');
    expect(summary.available).toBe(0);
    expect(summary.overrun).toBeGreaterThan(0);
  });

  it('签约必须有原单和守恒回款节点，并冻结合同、商机和回款来源轨迹', () => {
    const state = planned();
    expect(() =>
      transition(
        state,
        {
          type: 'confirm-project-contract',
          projectId: planId,
          registration: { ...registration, receiptPlans: [] },
          source: '核验签署依据',
        },
        market,
      ),
    ).toThrow('回款计划');
    expect(() =>
      transition(
        state,
        {
          type: 'confirm-project-contract',
          projectId: planId,
          source: '只有自由文本',
        },
        market,
      ),
    ).toThrow('缺少');
    const next = transition(
      state,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '核验原件主体及金额',
      },
      market,
    );
    const project = next.projects.find((item) => item.id === planId)!;
    const trace = next.unsignedProjects[planId].contractConfirmation!;
    expect(project.isUnsigned).toBe(false);
    expect(project.contractAmount).toBe(1200);
    expect(project.phase).toBe('立项');
    expect(trace.contractSnapshot.opportunityId).toBe(project.opportunityId);
    expect(trace.receiptPlanSnapshots.reduce((total, plan) => total + plan.amount, 0)).toBe(
      1200,
    );
    expect(trace.sourceDocument?.attachment).toBe('双方签章合同.pdf');
    next.contracts.find((contract) => contract.id === trace.contractId)!.name = '后续展示名';
    expect(trace.contractSnapshot.name).toBe('园区协同平台交付合同');
    expect(next.costs).toEqual(state.costs);
    expect(next.baselines).toEqual(state.baselines);
  });

  it('启动重验真实合同、任命、基线和阶段，达成启动里程碑并暴露真实执行待办', () => {
    let state = planned();
    expect(() =>
      transition(
        state,
        {
          type: 'confirm-project-start',
          projectId: planId,
          date: AS_OF_DATE,
          opinion: '启动',
        },
        pmo,
      ),
    ).toThrow('真实已签合同');
    state = transition(
      state,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '原单一致',
      },
      market,
    );
    const before = structuredClone(state);
    state = transition(
      state,
      {
        type: 'confirm-project-start',
        projectId: planId,
        date: AS_OF_DATE,
        opinion: '按计划启动，责任人落实',
      },
      pmo,
    );
    const confirmation = state.startConfirmations[planId];
    expect(state.projects.find((item) => item.id === planId)?.phase).toBe('执行');
    expect(confirmation.notifications.some((item) => item.userId === pm.id)).toBe(true);
    expect(confirmation.baseline).toEqual(
      before.baselines.find((item) => item.projectId === planId),
    );
    expect(confirmation.contract.status).toBe('已签订');
    expect(state.contracts.find((item) => item.id === confirmation.contract.id)?.status).toBe(
      '履约中',
    );
    expect(
      state.milestones.find((item) => item.id === confirmation.startMilestone.id),
    ).toMatchObject({ status: '已达成', actualDate: AS_OF_DATE });
    const wbsWork = confirmation.executionWork.filter((item) => item.type === 'WBS任务');
    expect(wbsWork.length).toBeGreaterThan(0);
    expect(
      wbsWork.every((item) =>
        state.tasks.some((task) => task.id === item.sourceId && task.projectId === planId),
      ),
    ).toBe(true);
    expect(
      selectTodos(state, pm).some(
        (todo) => todo.id === `DAILY-${planId}-${AS_OF_DATE}` && !todo.done,
      ),
    ).toBe(true);
    expect(state.costs).toEqual(before.costs);
    expect(state.budgets).toEqual(before.budgets);
    expect(() =>
      transition(
        state,
        {
          type: 'confirm-project-start',
          projectId: planId,
          date: AS_OF_DATE,
          opinion: '重复',
        },
        pmo,
      ),
    ).toThrow('不得重复');
  });

  it('主PM合法换任只认当前接受任命和唯一有效项目经理，不把历史接受记录计为冲突', () => {
    let state = planned();
    state = transition(
      state,
      {
        type: 'nominate-pm',
        projectId: planId,
        userId: replacementPm.id,
        reason: '原主PM调整，由交付骨干接任',
      },
      pmo,
    );
    state = transition(
      state,
      {
        type: 'respond-pm',
        projectId: planId,
        accept: true,
        opinion: '接受任命并承接当前有效基线',
      },
      replacementPm,
    );
    const project = state.projects.find((item) => item.id === planId)!;
    const team = state.projectTeams[planId];
    expect(team.appointments.filter((appointment) => appointment.status === '已接受')).toHaveLength(2);
    expect(
      team.members.filter(
        (member) => member.active && member.role === '项目经理',
      ),
    ).toMatchObject([{ userId: replacementPm.id }]);
    const result = startupChecks(state, project);
    expect(result.appointed?.userId).toBe(replacementPm.id);
    expect(result.checks.find((check) => check.key === 'pm')?.passed).toBe(true);

    state = transition(
      state,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '原单一致',
      },
      market,
    );
    state = transition(
      state,
      {
        type: 'confirm-project-start',
        projectId: planId,
        date: AS_OF_DATE,
        opinion: '换任责任已落实，正式启动',
      },
      pmo,
    );
    expect(state.startConfirmations[planId].appointmentId).toBe(
      team.appointments.at(-1)!.id,
    );
  });

  it('实际启动日期不得早于合同签订、当前基线生效或当前主PM接受任命日期', () => {
    let ready = planned('2026-09-01');
    ready = transition(
      ready,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '原单一致',
      },
      market,
    );
    const command = {
      type: 'confirm-project-start' as const,
      projectId: planId,
      date: '2026-09-08',
      opinion: '补录启动',
    };

    const beforeContract = structuredClone(ready);
    beforeContract.baselines.find(
      (baseline) =>
        baseline.projectId === planId && baseline.status === '已生效',
    )!.createdAt = '2026-09-01';
    beforeContract.projectTeams[planId].appointments.find(
      (appointment) =>
        appointment.userId === beforeContract.projects.find((item) => item.id === planId)!.pmId &&
        appointment.status === '已接受',
    )!.respondedAt = '2026-09-01';
    expect(() => transition(beforeContract, command, pmo)).toThrow('合同签订日期');

    const beforeBaseline = structuredClone(ready);
    beforeBaseline.contracts.find(
      (contract) => contract.projectId === planId && contract.status === '已签订',
    )!.signDate = '2026-09-01';
    beforeBaseline.projectTeams[planId].appointments.find(
      (appointment) =>
        appointment.userId === beforeBaseline.projects.find((item) => item.id === planId)!.pmId &&
        appointment.status === '已接受',
    )!.respondedAt = '2026-09-01';
    expect(() => transition(beforeBaseline, command, pmo)).toThrow('当前基线生效日期');

    const beforeAppointment = structuredClone(ready);
    beforeAppointment.contracts.find(
      (contract) => contract.projectId === planId && contract.status === '已签订',
    )!.signDate = '2026-09-01';
    beforeAppointment.baselines.find(
      (baseline) =>
        baseline.projectId === planId && baseline.status === '已生效',
    )!.createdAt = '2026-09-01';
    beforeAppointment.projectTeams[planId].appointments.find(
      (appointment) =>
        appointment.userId === beforeAppointment.projects.find((item) => item.id === planId)!.pmId &&
        appointment.status === '已接受',
    )!.respondedAt = AS_OF_DATE;
    expect(() => transition(beforeAppointment, command, pmo)).toThrow(
      '当前主PM接受任命日期',
    );
  });

  it('执行事项保存原业务动作标识，后续策略收紧会实时禁止办理而非绕过', () => {
    let state = planned();
    state = transition(
      state,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '原单一致',
      },
      market,
    );
    state = transition(
      state,
      {
        type: 'confirm-project-start',
        projectId: planId,
        date: AS_OF_DATE,
        opinion: '按基线正式启动',
      },
      pmo,
    );
    const work = state.startConfirmations[planId].executionWork.find(
      (item) => item.type === 'WBS任务',
    )!;
    expect(canAccessAction(state, pm, work.policyAction, work.policyTargetId)).toBe(true);
    const policy = selectAccessPolicy(state, pm.role)!;
    policy.actions = policy.actions.filter((action) => action !== work.policyAction);
    expect(canAccessAction(state, pm, work.policyAction, work.policyTargetId)).toBe(false);
  });

  it('失效任命、历史摘要基线、启动里程碑缺失与建设冻结均不能启动', () => {
    let state = planned();
    state = transition(
      state,
      {
        type: 'confirm-project-contract',
        projectId: planId,
        registration,
        source: '原单核对',
      },
      market,
    );
    const command = {
      type: 'confirm-project-start' as const,
      projectId: planId,
      date: AS_OF_DATE,
      opinion: '启动',
    };
    const noPm = structuredClone(state);
    noPm.projects.find((item) => item.id === planId)!.pmId = '';
    expect(() => transition(noPm, command, pmo)).toThrow('主PM');
    const noSnapshot = structuredClone(state);
    delete noSnapshot.baselines.find((item) => item.projectId === planId)!.snapshot;
    expect(() => transition(noSnapshot, command, pmo)).toThrow('完整');
    const noMilestone = structuredClone(state);
    noMilestone.milestones = noMilestone.milestones.filter(
      (item) => item.projectId !== planId || item.type !== '启动',
    );
    expect(() => transition(noMilestone, command, pmo)).toThrow('启动里程碑');
    state.constructionFreezes[planId] = {
      requestId: 'FREEZE',
      reason: '结算检查',
    };
    expect(() => transition(state, command, pmo)).toThrow('冻结');
  });

  it('退出复盘一经形成即不可二次决策覆盖，包括首次选择继续跟踪', () => {
    let state = createBusinessState();
    const project = state.projects.find((item) => item.id === 'P-004')!;
    const firstDecision = {
      type: 'exit-unsigned' as const,
      projectId: project.id,
      reason: '客户采购计划暂缓',
      resources: '保留最小跟进团队',
      recoverableAssets: '测试设备可调拨',
      responsibility: '主办部门继续跟踪',
      recommendation: '维持未签管控并定期复盘',
      terminated: false,
      reactivationPossible: true,
    };
    state = transition(state, firstDecision, pmo);
    const preserved = structuredClone(state.unsignedProjects[project.id].exit);
    expect(() =>
      transition(
        state,
        {
          ...firstDecision,
          reason: '第二次覆盖原决定',
          terminated: true,
        },
        pmo,
      ),
    ).toThrow('不得重复决策或覆盖历史');
    expect(state.unsignedProjects[project.id].exit).toEqual(preserved);
    expect(state.projects.find((item) => item.id === project.id)?.status).not.toBe(
      '已终止',
    );
  });

  it('退出保留已发生流水和成本快照，追加审批不能给已终止项目释放额度', () => {
    let state = createBusinessState();
    const project = state.projects.find((item) => item.id === 'P-004')!;
    state = transition(
      state,
      {
        type: 'exit-unsigned',
        projectId: project.id,
        reason: '客户取消采购',
        resources: '人员及设备投入',
        recoverableAssets: '设备转库待确认',
        responsibility: '主办部门组织复盘',
        recommendation: '完成资产处置并关闭经营线索',
        terminated: true,
        reactivationPossible: false,
      },
      pmo,
    );
    expect(state.projects.find((item) => item.id === project.id)?.status).toBe('已终止');
    expect(state.unsignedProjects[project.id].exit?.actualCost).toBe(project.actualCost);
    expect(state.unsignedProjects[project.id].exit?.costSources).toEqual(
      state.costs.filter((cost) => cost.projectId === project.id),
    );
    expect(() =>
      transition(
        state,
        {
          type: 'request-unsigned-investment',
          projectId: project.id,
          amount: 10,
          validUntil: '2026-12-31',
          expectedSignDate: '2026-10-01',
          signProgress: '进展',
          necessity: '需求',
          risk: '风险',
          attachments: ['依据'],
        },
        market,
      ),
    ).toThrow('有效未签');
  });
});
