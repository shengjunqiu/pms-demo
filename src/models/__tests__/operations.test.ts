import { describe, it, expect } from "vitest";
import { createBusinessState, transition, type Actor } from "@/mock/business-domain";
import { closeChecks, operationExpiry } from "@/mock/operations";
import { AS_OF_DATE, mockSettlements } from "@/mock";
import type { OperationHandover } from "@/models/operations";
import { pendingSettlementSources } from "@/mock/settlement";
const pmo: Actor = { id: "U-002", name: "李主任", role: "pmo" };
const finance: Actor = { id: "U-004", name: "刘敏", role: "finance" };
const receiver: Actor = { id: "U-005", name: "赵工", role: "solution-tech" };
const pm: Actor = { id: "U-001", name: "张建国", role: "project-manager" };
const event = {
  type: "record-operation-event" as const,
  projectId: "P-007",
  operationId: "OPS-007",
  kind: "问题" as const,
  title: "备份恢复异常",
  severity: "重大" as const,
  note: "巡检发现备份恢复验证失败，关联服务单INC-07",
};
const cost = {
  type: "submit-operation-cost" as const,
  projectId: "P-007",
  operationId: "OPS-007",
  kind: "labor" as const,
  date: AS_OF_DATE,
  sourceNo: "OPS-TIME-007-0909",
  hours: 8,
  rate: 0.025,
  amount: 999,
  description: "恢复验证与巡检工时",
  evidence: "运维工时确认单.pdf",
};
function archiveReady() {
  const s = createBusinessState();
  s.projectArchives["P-006"] = {
    id: "TEST-ARCHIVE-006",
    projectId: "P-006",
    version: 1,
    confirmedAt: AS_OF_DATE,
    confirmedBy: pmo.name,
    note: "测试前置：已完成真实归档流程",
    sources: [],
    materials: [],
    categories: [],
  };
  return s;
}
function handover(
  state: ReturnType<typeof createBusinessState>,
  required = true,
): Omit<
  OperationHandover,
  "id" | "projectId" | "status" | "submittedAt" | "submittedBy"
> {
  return {
    contractId: state.contracts.find((c) => c.projectId === "P-006")!.id,
    required,
    basis: "合同售后服务条款第8条",
    startDate: AS_OF_DATE,
    endDate: "2027-09-08",
    receiverId: receiver.id,
    teamIds: [receiver.id],
    scope: "业务平台运维及客户技术联系",
    sla: "P1响应30分钟、恢复4小时",
    systemInfo: "应用与数据库部署清单",
    legacyIssues: "无未决问题，已核对客户验收清单",
    accounts: "权限交接签收凭据ACL-6，不包含密码",
    documents: "正式档案TEST-ARCHIVE-006操作手册",
  };
}
describe("运维周期与正式关闭", () => {
  it("历史OPS007只映射原项目合同，不伪造验收结算档案", () => {
    const s = createBusinessState();
    const c = s.operationCycles[0];
    expect(c.id).toBe("OPS-007");
    expect(
      s.contracts.some(
        (v) => v.id === c.contractId && v.projectId === c.projectId,
      ),
    ).toBe(true);
    expect(s.projectArchives[c.projectId]).toBeUndefined();
    expect(s.settlements.filter((v) => v.projectId === c.projectId)).toEqual(
      mockSettlements.filter((v) => v.projectId === c.projectId),
    );
    expect(c.source).toContain("历史运维阶段");
  });
  it("移交缺归档阻断；只有指定真实接收人可确认且不重复创建周期", () => {
    const initial = createBusinessState();
    expect(() =>
      transition(
        initial,
        {
          type: "save-operation-handover",
          projectId: "P-006",
          handover: handover(initial),
        },
        pm,
      ),
    ).toThrow("归档");
    let s = archiveReady();
    s = transition(
      s,
      {
        type: "save-operation-handover",
        projectId: "P-006",
        handover: handover(s),
      },
      pm,
    );
    expect(
      s.operationCycles.filter((v) => v.projectId === "P-006"),
    ).toHaveLength(0);
    expect(() =>
      transition(
        s,
        { type: "accept-operation-handover", projectId: "P-006" },
        pmo,
      ),
    ).toThrow("指定");
    s = transition(
      s,
      { type: "accept-operation-handover", projectId: "P-006" },
      receiver,
    );
    expect(
      s.operationCycles.filter((v) => v.projectId === "P-006"),
    ).toHaveLength(1);
    expect(() =>
      transition(
        s,
        { type: "accept-operation-handover", projectId: "P-006" },
        receiver,
      ),
    ).toThrow("待接收");
    expect(s.projectArchives["P-006"].id).toBe("TEST-ARCHIVE-006");
  });
  it("运维原单按工时单价计算，财务校验真实来源，建设成本和冻结快照不变", () => {
    const initial = createBusinessState();
    let s = transition(initial, cost, pmo);
    const source = s.operationCostSources[0];
    expect(source.amount).toBe(0.2);
    expect(() => transition(s, cost, pmo)).toThrow("不可重复提交");
    expect(() =>
      transition(initial, { ...cost, date: "2027-01-01" }, pmo),
    ).toThrow("实际发生日期");
    const action = {
      type: "record-operation-cost" as const,
      projectId: "P-007",
      operationId: "OPS-007",
      kind: source.kind,
      date: source.date,
      amount: source.amount,
      sourceId: source.id,
      description: source.description,
    };
    expect(() =>
      transition(s, { ...action, sourceId: "FAKE" }, finance),
    ).toThrow("原单");
    expect(() => transition(s, { ...action, amount: 999 }, finance)).toThrow(
      "金额",
    );
    expect(() => transition(s, action, pmo)).toThrow("财务");
    s = transition(s, action, finance);
    expect(s.maintenanceCosts[0].operationId).toBe("OPS-007");
    expect(s.costs).toEqual(initial.costs);
    expect(s.projects).toEqual(initial.projects);
    expect(s.settlements).toEqual(initial.settlements);
    expect(() => transition(s, action, finance)).toThrow("待审核");
    expect(() =>
      transition(
        s,
        {
          type: "confirm-cost",
          cost: s.maintenanceCosts[0],
          maintenance: true,
        },
        finance,
      ),
    ).toThrow();
  });
  it("费用退回保留原发生事项，未更正时不能退出；更正串联旧单而不重复入账", () => {
    let s = transition(createBusinessState(), cost, pmo);
    const id = s.operationCostSources[0].id;
    s = transition(
      s,
      {
        type: "reject-operation-cost",
        projectId: "P-007",
        id,
        note: "缺少签字，请补正凭据",
      },
      finance,
    );
    const exit = {
      type: "exit-operation" as const,
      projectId: "P-007",
      operationId: "OPS-007",
      reason: "提前终止依据",
      handoff: "接收签单",
      accountsRevoked: "权限回收单",
      archive: "运维档案目录",
      confirm: true,
    };
    expect(() => transition(s, exit, pmo)).toThrow("待审费用");
    s = transition(
      s,
      { ...cost, previousId: id, evidence: "补签确认单.pdf" },
      pmo,
    );
    expect(s.operationCostSources[0].supersededBy).toBe(
      s.operationCostSources[1].id,
    );
    expect(s.operationCostSources[0].evidence).toBe(cost.evidence);
  });
  it("问题处理与建设问题隔离，未解决事项阻断终止退出", () => {
    let s = transition(createBusinessState(), event, pmo);
    const issues = structuredClone(s.issues);
    const exit = {
      type: "exit-operation" as const,
      projectId: "P-007",
      operationId: "OPS-007",
      reason: "合同提前终止确认函",
      handoff: "客户签收服务移交",
      accountsRevoked: "客户管理员确认回收",
      archive: "运维资料包V1",
      confirm: true,
    };
    expect(() => transition(s, exit, pmo)).toThrow("未决");
    s = transition(
      s,
      {
        type: "resolve-operation-event",
        projectId: "P-007",
        id: s.operationEvents[0].id,
        note: "备份验证已恢复，附恢复验证报告",
      },
      pmo,
    );
    s = transition(s, exit, pmo);
    expect(s.operationCycles[0].status).toBe("已结束");
    expect(s.issues).toEqual(issues);
    expect(() => transition(s, event, pmo)).toThrow("结束");
  });
  it("续期保留当前服务与原合同链，重复/重叠续期阻断，未到期不能激活", () => {
    let s = createBusinessState();
    const original = structuredClone(s.operationCycles[0]);
    const renew = {
      type: "renew-operation" as const,
      projectId: "P-007",
      operationId: "OPS-007",
      contractId: original.contractId,
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      note: "已确认续期合同补充条款",
    };
    expect(() =>
      transition(s, { ...renew, startDate: "2026-12-31" }, pmo),
    ).toThrow("不重叠");
    s = transition(s, renew, pmo);
    expect(s.operationCycles[0].status).toBe("服务中");
    expect(s.operationCycles[0].endDate).toBe(original.endDate);
    const next = s.operationCycles[1];
    expect(next.status).toBe("待生效");
    expect(next.previousId).toBe(original.id);
    expect(() => transition(s, renew, pmo)).toThrow("未续期");
    expect(() =>
      transition(
        s,
        {
          type: "activate-operation",
          projectId: "P-007",
          operationId: next.id,
        },
        pmo,
      ),
    ).toThrow("未到");
  });
  it("提醒天数可配置；新周期到期激活必须清理前期，之后旧期不可入账", () => {
    let s = createBusinessState();
    s.operationCycles[0].endDate = "2026-08-31";
    s = transition(
      s,
      {
        type: "renew-operation",
        projectId: "P-007",
        operationId: "OPS-007",
        contractId: s.operationCycles[0].contractId,
        startDate: "2026-09-01",
        endDate: "2027-08-31",
        note: "测试已生效续期合同",
      },
      pmo,
    );
    s = transition(
      s,
      {
        type: "activate-operation",
        projectId: "P-007",
        operationId: s.operationCycles[1].id,
      },
      pmo,
    );
    expect(s.operationCycles[0].status).toBe("已续期");
    s = transition(
      s,
      {
        type: "configure-operation",
        projectId: "P-007",
        operationId: s.operationCycles[1].id,
        remindDays: 60,
      },
      pmo,
    );
    expect(s.operationCycles[1].remindDays).toBe(60);
    expect(operationExpiry("2026-09-10", 30)).toBe("1天内到期");
    expect(operationExpiry("2026-09-08", 30)).toBe("已到期");
    expect(() => transition(s, cost, pmo)).toThrow("结束");
  });
  it("关闭不受最终结算单独放行，应收/归档/费用与运维判定都必须满足", () => {
    const s = createBusinessState();
    expect(closeChecks(s, "P-006").filter((v) => !v.ok).length).toBeGreaterThan(
      3,
    );
    expect(() =>
      transition(
        s,
        { type: "confirm-project-close", projectId: "P-006", note: "请求关闭" },
        pmo,
      ),
    ).toThrow("关闭阻断");
    expect(() =>
      transition(
        s,
        {
          type: "confirm-project-close",
          projectId: "P-008",
          note: "历史关闭不重写",
        },
        pmo,
      ),
    ).toThrow("已经关闭");
  });
  it("完整前置的无运维项目由PMO关闭，保存引用快照并拒绝生命周期再写", () => {
    let s = archiveReady();
    const p = s.projects.find((p) => p.id === "P-006")!;
    p.committedCost = 0;
    p.forecastRemainingCost = 0;
    p.isMaintenance = false;
    s.settlements.push({
      ...s.settlements[0],
      id: "TEST-SETTLE-006",
      projectId: p.id,
      status: "已锁定已生效",
    });
    s.postEvaluations[p.id] = {
      id: "TEST-EVAL-006",
      status: "已完成",
    } as (typeof s.postEvaluations)[string];
    for (const r of s.receiptPlans.filter((r) => r.projectId === p.id))
      r.paidAmount = r.amount;
    for (const c of s.contracts.filter((c) => c.projectId === p.id)) {
      c.paidAmount = c.amount;
      c.unpaidAmount = 0;
    }
    for (const i of s.issues.filter((i) => i.projectId === p.id))
      i.status = "已关闭";
    for (const b of s.bugs.filter((b) => b.projectId === p.id))
      b.status = "已关闭";
    for (const source of pendingSettlementSources(s, p.id))
      s.settlementCostReviews.push({
        projectId: p.id,
        sourceId: source.id,
      } as (typeof s.settlementCostReviews)[number]);
    s = transition(
      s,
      {
        type: "save-operation-handover",
        projectId: p.id,
        handover: handover(s, false),
      },
      pm,
    );
    expect(closeChecks(s, p.id).every((v) => v.ok)).toBe(true);
    expect(() =>
      transition(
        s,
        {
          type: "confirm-project-close",
          projectId: p.id,
          note: "无运维，已完成财务及归档核对",
        },
        pm,
      ),
    ).toThrow("PMO");
    s = transition(
      s,
      {
        type: "confirm-project-close",
        projectId: p.id,
        note: "无运维，已完成财务及归档核对",
      },
      pmo,
    );
    expect(s.projects.find((v) => v.id === p.id)?.phase).toBe("已关闭");
    expect(s.projectClosures[p.id].archiveId).toBe("TEST-ARCHIVE-006");
    expect(() =>
      transition(
        s,
        {
          type: "save-operation-handover",
          projectId: p.id,
          handover: handover(s),
        },
        pmo,
      ),
    ).toThrow("已经关闭");
  });
});
