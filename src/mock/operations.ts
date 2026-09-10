import { pendingSettlementSources } from "@/mock/settlement";
import { AS_OF_DATE, mockUsers } from "@/mock";
import type { Actor, BusinessState } from "@/mock/business";
import type { OperationHandover, OperationEvent } from "@/models/operations";
import { selectReceipts } from "@/mock/selectors";
export type OperationsAction =
  | {
      type: "submit-operation-cost";
      previousId?: string;
      projectId: string;
      operationId: string;
      sourceNo: string;
      kind: "labor" | "expense";
      date: string;
      hours?: number;
      rate?: number;
      amount: number;
      description: string;
      evidence: string;
    }
  | {
      type: "reject-operation-cost";
      projectId: string;
      id: string;
      note: string;
    }
  | { type: "activate-operation"; projectId: string; operationId: string }
  | {
      type: "configure-operation";
      projectId: string;
      operationId: string;
      remindDays: number;
    }
  | {
      type: "save-operation-handover";
      projectId: string;
      handover: Omit<
        OperationHandover,
        "id" | "projectId" | "status" | "submittedAt" | "submittedBy"
      >;
    }
  | { type: "accept-operation-handover"; projectId: string }
  | {
      type: "record-operation-event";
      projectId: string;
      operationId: string;
      kind: OperationEvent["kind"];
      title: string;
      severity: OperationEvent["severity"];
      note: string;
    }
  | {
      type: "resolve-operation-event";
      projectId: string;
      id: string;
      note: string;
    }
  | {
      type: "record-operation-cost";
      projectId: string;
      operationId: string;
      amount: number;
      sourceId: string;
      description: string;
      kind: "labor" | "expense";
      date: string;
    }
  | {
      type: "renew-operation";
      projectId: string;
      operationId: string;
      contractId: string;
      startDate: string;
      endDate: string;
      note: string;
    }
  | {
      type: "exit-operation";
      projectId: string;
      operationId: string;
      reason: string;
      handoff: string;
      accountsRevoked: string;
      archive: string;
      confirm: boolean;
    }
  | { type: "confirm-project-close"; projectId: string; note: string };
export const operationsActions = new Set([
  "submit-operation-cost",
  "reject-operation-cost",
  "activate-operation",
  "configure-operation",
  "save-operation-handover",
  "accept-operation-handover",
  "record-operation-event",
  "resolve-operation-event",
  "record-operation-cost",
  "renew-operation",
  "exit-operation",
  "confirm-project-close",
]);
export function initOperationsFixture(state: BusinessState) {
  const p = state.projects.find((p) => p.id === "P-007");
  const c = state.contracts.find((c) => c.projectId === p?.id);
  if (!p || !c) return;
  state.operationCycles.push({
    id: "OPS-007",
    projectId: p.id,
    contractId: c.id,
    startDate: p.plannedStartDate,
    endDate: p.plannedEndDate,
    scope: p.name,
    sla: "沿用项目健康说明：运维SLA达标99.98%；正式服务指标待交接文件核验",
    teamIds: [p.pmId],
    remindDays: 30,
    status: "服务中",
    source: `${AS_OF_DATE} 历史运维阶段导入，来源 ${p.id} / ${c.id}；不代表建设期验收或归档通过`,
  });
}
export function operationExpiry(endDate: string, remindDays: number) {
  const days = Math.ceil(
    (Date.parse(endDate) - Date.parse(AS_OF_DATE)) / 86400000,
  );
  return days < 0
    ? "已到期"
    : days <= remindDays
      ? `${days}天内到期`
      : `剩余${days}天`;
}
export function closeChecks(state: BusinessState, id: string) {
  const p = state.projects.find((p) => p.id === id)!;
  const cycles = state.operationCycles.filter((c) => c.projectId === id);
  const handover = state.operationHandovers[id];
  const receiptSummary = selectReceipts([p], state);
  return [
    {
      label: "管理决策事项已办理",
      ok: !state.managementApprovals.some((a) => a.projectId === id && a.status === "待审批"),
    },
    {
      label: "财务最终结算锁定",
      ok: state.settlements.some(
        (s) => s.projectId === id && s.status === "已锁定已生效",
      ),
    },
    {
      label: "后评价已完成",
      ok: state.postEvaluations[id]?.status === "已完成",
    },
    { label: "正式归档已确认", ok: !!state.projectArchives[id] },
    {
      label: "合同及回款计划应收结清",
      ok:
        receiptSummary.outstanding <= 0 &&
        receiptSummary.plans.every((r) => r.paidAmount >= r.amount),
    },
    {
      label: "建设期未决成本及承诺预测清零",
      ok:
        pendingSettlementSources(state, id).length === 0 &&
        p.committedCost === 0 &&
        p.forecastRemainingCost === 0,
    },
    {
      label: "运维判定明确、周期全部退出",
      ok:
        cycles.length > 0
          ? cycles.every((c) => c.status === "已结束" || c.status === "已续期")
          : handover?.status === "无需运维" && !p.isMaintenance,
    },
    {
      label: "重大建设期问题已解决",
      ok:
        !state.issues.some(
          (i) =>
            i.projectId === id &&
            i.severity === "重大" &&
            i.status !== "已关闭",
        ) &&
        !state.bugs.some(
          (b) =>
            b.projectId === id &&
            ["致命", "严重"].includes(b.severity) &&
            b.status !== "已关闭",
        ),
    },
    {
      label: "运维问题/风险全部解决",
      ok: !state.operationEvents.some(
        (e) => e.projectId === id && e.status === "未解决",
      ),
    },
    {
      label: "运维工时 / 费用原单已核对",
      ok: !state.operationCostSources.some(
        (s) => s.projectId === id && s.status !== "已入账" && !s.supersededBy,
      ),
    },
    {
      label: "运维历史费用均关联实际周期",
      ok: state.maintenanceCosts
        .filter((c) => c.projectId === id)
        .every((c) => cycles.some((o) => o.id === c.operationId)),
    },
  ];
}
export function applyOperationsAction(
  state: BusinessState,
  action: OperationsAction,
  actor: Actor,
) {
  const p = state.projects.find((p) => p.id === action.projectId);
  if (!p) throw Error("原项目不存在");
  if (state.projectClosures[p.id] || p.phase === "已关闭")
    throw Error("项目已经关闭，本次关闭快照只读");
  const pmo = () => {
    if (actor.role !== "pmo") throw Error("仅PMO可确认");
  };
  const owner = () => {
    if (
      actor.role !== "pmo" &&
      !(actor.role === "project-manager" && actor.id === p.pmId)
    )
      throw Error("仅主PM或PMO可办理");
  };
  const text = (v: string) => {
    if (!v.trim()) throw Error("请填写完整依据和处理说明");
  };
  const cycle = (id: string) => {
    const c = state.operationCycles.find(
      (c) => c.id === id && c.projectId === p.id,
    );
    if (!c) throw Error("原运维周期不存在");
    return c;
  };
  const member = (ids: string[]) => {
    if (!ids.includes(actor.id) && actor.role !== "pmo")
      throw Error("仅运维团队成员或PMO可处理");
  };
  if (action.type === "configure-operation") {
    owner();
    const c = cycle(action.operationId);
    if (c.status === "已结束" || c.status === "已续期")
      throw Error("历史周期只读");
    if (
      !Number.isInteger(action.remindDays) ||
      action.remindDays < 1 ||
      action.remindDays > 180
    )
      throw Error("提醒提前天数须为1至180");
    c.remindDays = action.remindDays;
  } else if (action.type === "submit-operation-cost") {
    const c = cycle(action.operationId);
    member(c.teamIds);
    if (c.status !== "服务中" && c.status !== "退出中")
      throw Error("周期未开始或已结束");
    text(action.description);
    text(action.evidence);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(action.date) ||
      !Number.isFinite(Date.parse(action.date)) ||
      action.date < c.startDate ||
      action.date > c.endDate ||
      action.date > AS_OF_DATE
    )
      throw Error("实际发生日期必须在本期且不晚于演示日期");
    const amount =
      action.kind === "labor"
        ? Math.round((action.hours ?? 0) * (action.rate ?? 0) * 100) / 100
        : action.amount;
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (action.kind === "labor" && (!(action.hours! > 0) || !(action.rate! > 0)))
    )
      throw Error("费用金额或工时单价无效");
    const previous = action.previousId
      ? state.operationCostSources.find(
          (s) =>
            s.id === action.previousId &&
            s.projectId === p.id &&
            s.operationId === c.id,
        )
      : undefined;
    if (
      action.previousId &&
      (!previous || previous.status !== "已退回" || previous.supersededBy)
    )
      throw Error("更正原单必须为本周期已退回单");
    text(action.sourceNo);
    if (
      state.operationCostSources.some(
        (s) =>
          s.sourceNo === action.sourceNo &&
          s.id !== action.previousId &&
          !s.supersededBy,
      )
    )
      throw Error("同一运维原单不可重复提交");
    if (previous && previous.sourceNo !== action.sourceNo)
      throw Error("更正必须保留原单编号");
    const sourceId = `OCS-${state.operationCostSources.length + 1}`;
    if (previous) previous.supersededBy = sourceId;
    state.operationCostSources.push({
      ...action,
      id: sourceId,
      amount,
      status: "待审核",
      submittedBy: actor.name,
      submittedAt: AS_OF_DATE,
    });
  } else if (action.type === "reject-operation-cost") {
    if (actor.role !== "finance") throw Error("仅财务可审核");
    const source = state.operationCostSources.find(
      (s) => s.id === action.id && s.projectId === p.id,
    );
    if (!source || source.status !== "待审核")
      throw Error("原费用单不存在或已审核");
    text(action.note);
    source.status = "已退回";
    source.reviewedBy = actor.name;
    source.reviewNote = action.note;
  } else if (action.type === "activate-operation") {
    owner();
    const c = cycle(action.operationId);
    if (c.status !== "待生效" || AS_OF_DATE < c.startDate)
      throw Error("新周期尚未到生效日期");
    const previous = c.previousId ? cycle(c.previousId) : undefined;
    if (
      state.operationEvents.some(
        (e) => e.operationId === previous?.id && e.status === "未解决",
      ) ||
      state.operationCostSources.some(
        (s) =>
          s.operationId === previous?.id &&
          s.status !== "已入账" &&
          !s.supersededBy,
      )
    )
      throw Error("前期未决事项或成本阻断新期生效");
    if (previous) previous.status = "已续期";
    c.status = "服务中";
  } else if (action.type === "save-operation-handover") {
    owner();
    if (
      state.operationHandovers[p.id]?.status === "已接收" ||
      state.operationCycles.some((c) => c.projectId === p.id)
    )
      throw Error("已有有效运维周期，请使用续期或退出流程");
    if (!state.projectArchives[p.id]) throw Error("先完成正式资料归档");
    const h = action.handover;
    const c = state.contracts.find(
      (c) => c.id === h.contractId && c.projectId === p.id,
    );
    if (!c) throw Error("请选择原项目合同");
    text(h.basis);
    if (h.required) {
      for (const value of [
        h.scope,
        h.sla,
        h.systemInfo,
        h.legacyIssues,
        h.accounts,
        h.documents,
      ])
        text(value);
      if (h.teamIds.some((id) => !mockUsers.some((u) => u.id === id)))
        throw Error("运维团队必须来自真实人员目录");
      if (!mockUsers.some((u) => u.id === h.receiverId))
        throw Error("接收人必须来自真实人员目录");
      if (
        !Number.isFinite(Date.parse(h.startDate)) ||
        !Number.isFinite(Date.parse(h.endDate)) ||
        h.endDate < h.startDate
      )
        throw Error("运维起止日期无效");
    } else if (p.isMaintenance)
      throw Error("已有运维属性，不能直接判为无需运维");
    state.operationHandovers[p.id] = {
      ...h,
      id: `HAND-${p.id}`,
      projectId: p.id,
      status: h.required ? "待接收" : "无需运维",
      submittedAt: AS_OF_DATE,
      submittedBy: actor.name,
    };
  } else if (action.type === "accept-operation-handover") {
    const h = state.operationHandovers[p.id];
    if (!h || h.status !== "待接收") throw Error("没有待接收移交");
    if (actor.id !== h.receiverId) throw Error("仅指定运维接收人可确认");
    h.status = "已接收";
    h.acceptedAt = AS_OF_DATE;
    h.acceptedBy = actor.name;
    state.operationCycles.push({
      id: `OPS-${p.id}-${state.operationCycles.length + 1}`,
      projectId: p.id,
      contractId: h.contractId,
      startDate: h.startDate,
      endDate: h.endDate,
      scope: h.scope,
      sla: h.sla,
      teamIds: [...new Set([h.receiverId, ...h.teamIds])],
      remindDays: 30,
      status: h.startDate > AS_OF_DATE ? "待生效" : "服务中",
      source: h.id,
    });
    p.phase = "运维";
    p.subPhase = "质保运维";
    p.isMaintenance = true;
  } else if (action.type === "record-operation-event") {
    const c = cycle(action.operationId);
    member(c.teamIds);
    if (c.status !== "服务中" && c.status !== "退出中")
      throw Error("该周期已结束");
    text(action.title);
    text(action.note);
    state.operationEvents.push({
      ...action,
      id: `OPE-${state.operationEvents.length + 1}`,
      date: AS_OF_DATE,
      actor: actor.name,
      status:
        action.kind === "问题" ||
        action.kind === "风险" ||
        action.severity === "重大"
          ? "未解决"
          : "已解决",
    });
  } else if (action.type === "resolve-operation-event") {
    const e = state.operationEvents.find(
      (e) => e.id === action.id && e.projectId === p.id,
    );
    if (!e || e.status === "已解决") throw Error("不存在待处理运维事项");
    const eventCycle = cycle(e.operationId);
    if (eventCycle.status !== "服务中" && eventCycle.status !== "退出中")
      throw Error("历史周期事项只读");
    member(eventCycle.teamIds);
    text(action.note);
    e.status = "已解决";
    e.resolution = action.note;
    e.resolvedAt = AS_OF_DATE;
  } else if (action.type === "record-operation-cost") {
    if (actor.role !== "finance") throw Error("运维费用由财务确认");
    const c = cycle(action.operationId);
    if (c.status !== "服务中" && c.status !== "退出中")
      throw Error("已结束周期不可新增费用");
    const source = state.operationCostSources.find(
      (s) =>
        s.id === action.sourceId &&
        s.projectId === p.id &&
        s.operationId === c.id,
    );
    if (
      !source ||
      source.status !== "待审核" ||
      source.amount !== action.amount ||
      source.kind !== action.kind ||
      source.date !== action.date
    )
      throw Error("须绑定本周期待审核原单，金额、类型与日期须一致");
    source.status = "已入账";
    source.reviewedBy = actor.name;
    if (!Number.isFinite(action.amount) || action.amount <= 0)
      throw Error("费用须大于零");
    text(action.sourceId);
    text(action.description);
    if (!action.date || action.date < c.startDate || action.date > c.endDate)
      throw Error("费用发生日期须在周期内");
    if (
      [...state.costs, ...state.maintenanceCosts].some(
        (v) => v.sourceId === action.sourceId,
      )
    )
      throw Error("原费用来源已入账");
    state.maintenanceCosts.push({
      id: `OMC-${source.id}`,
      projectId: p.id,
      operationId: c.id,
      type: action.kind,
      subjectId: action.kind === "labor" ? "LABOR" : "EXPENSE",
      subjectName: action.kind === "labor" ? "运维人工" : "运维费用",
      amount: action.amount,
      occurredDate: action.date,
      sourceId: action.sourceId,
      description: source.description,
    });
  } else if (action.type === "renew-operation") {
    owner();
    const c = cycle(action.operationId);
    if (c.status !== "服务中" || c.renewedById)
      throw Error("仅未续期的服务中周期可续期");
    if (
      !state.contracts.some(
        (v) =>
          v.id === action.contractId &&
          v.projectId === p.id &&
          v.status !== "已终止",
      )
    )
      throw Error("续期必须关联真实有效合同");
    text(action.note);
    if (
      !Number.isFinite(Date.parse(action.startDate)) ||
      !Number.isFinite(Date.parse(action.endDate)) ||
      action.startDate <= c.endDate ||
      action.endDate < action.startDate
    )
      throw Error("续期必须创建不重叠的新周期");
    if (
      state.operationEvents.some(
        (e) => e.operationId === c.id && e.status === "未解决",
      )
    )
      throw Error("先解决本期未决事项");
    const nextId = `OPS-${p.id}-${state.operationCycles.length + 1}`;
    state.operationCycles.push({
      ...structuredClone(c),
      id: nextId,
      contractId: action.contractId,
      previousId: c.id,
      startDate: action.startDate,
      endDate: action.endDate,
      status: "待生效",
      source: action.note,
    });
    c.renewedById = nextId;
  } else if (action.type === "exit-operation") {
    const c = cycle(action.operationId);
    if (c.renewedById && cycle(c.renewedById).status !== "已结束")
      throw Error("请先处理已申请的续期周期");
    if (c.status !== "服务中" && c.status !== "退出中" && c.status !== "待生效")
      throw Error("周期已结束");
    owner();
    for (const v of [
      action.reason,
      action.handoff,
      action.accountsRevoked,
      action.archive,
    ])
      text(v);
    if (action.confirm) {
      pmo();
      if (
        state.operationEvents.some(
          (e) => e.operationId === c.id && e.status === "未解决",
        ) ||
        state.operationCostSources.some(
          (s) =>
            s.operationId === c.id && s.status !== "已入账" && !s.supersededBy,
        )
      )
        throw Error("未决运维事项或待审费用阻断退出");
    }
    c.exit = {
      reason: action.reason,
      handoff: action.handoff,
      accountsRevoked: action.accountsRevoked,
      archive: action.archive,
      ...(action.confirm
        ? { confirmedAt: AS_OF_DATE, confirmedBy: actor.name }
        : {}),
    };
    c.status = action.confirm ? "已结束" : "退出中";
    if (action.confirm && c.previousId) {
      const previous = cycle(c.previousId);
      if (previous.status === "服务中") delete previous.renewedById;
    }
  } else {
    pmo();
    text(action.note);
    const failed = closeChecks(state, p.id).filter((c) => !c.ok);
    if (failed.length)
      throw Error(`关闭阻断：${failed.map((c) => c.label).join("、")}`);
    state.projectClosures[p.id] = {
      id: `CLOSE-${p.id}`,
      projectId: p.id,
      date: AS_OF_DATE,
      actor: actor.name,
      note: action.note,
      archiveId: state.projectArchives[p.id].id,
      evaluationId: state.postEvaluations[p.id].id,
      settlementId: state.settlements.find(
        (s) => s.projectId === p.id && s.status === "已锁定已生效",
      )!.id,
      operationIds: state.operationCycles
        .filter((c) => c.projectId === p.id)
        .map((c) => c.id),
      receipts: structuredClone(
        state.receiptPlans.filter((r) => r.projectId === p.id),
      ),
    };
    p.phase = "已关闭";
    p.status = "已关闭";
  }
  return p.id;
}
