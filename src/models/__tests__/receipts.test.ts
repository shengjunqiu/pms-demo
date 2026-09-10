import { describe, it, expect } from "vitest";
import {
  createBusinessState,
  transition,
  type Actor,
  type BusinessState,
} from "@/mock/business";
import { AS_OF_DATE } from "@/mock";
import { closeChecks } from "@/mock/operations";
import { settlementSnapshot } from "@/mock/settlement";
import { selectFourCalculations, selectReceipts } from "@/mock/selectors";
import {
  canAccessAction,
  canAccessPage,
  selectAccessPolicy,
} from "@/mock/configuration-access";
import { ARCHIVE_CATEGORIES } from "@/models/closeout";
import type { ReceiptAction } from "@/models/receipts";
const finance: Actor = { id: "U-004", name: "刘敏", role: "finance" };
const pm: Actor = { id: "U-001", name: "张建国", role: "project-manager" };
function receipt(
  s: BusinessState,
  amount = 100,
  projectId = "P-006",
): ReceiptAction {
  const c = s.contracts.find((c) => c.projectId === projectId)!;
  const p = s.receiptPlans.find(
    (p) => p.contractId === c.id && p.amount > p.paidAmount,
  )!;
  return {
    type: "confirm-project-receipt",
    projectId,
    contractId: c.id,
    sourceNo: "BANK-20260909-001",
    receivedDate: AS_OF_DATE,
    allocations: [{ receiptPlanId: p.id, amount }],
    evidenceFiles: ["银行收款回单.pdf"],
    note: "客户实际付款，按合同验收结算款节点分配",
  };
}
describe("真实收款与合同计划单一实收", () => {
  it("部分收款更新合同与计划，保留历史导入余额和前后快照", () => {
    const initial = createBusinessState();
    const action = receipt(initial);
    const before = initial.contracts.find((c) => c.id === action.contractId)!;
    expect(before.paidAmount).toBe(837);
    const s = transition(initial, action, finance);
    const c = s.contracts.find((c) => c.id === action.contractId)!;
    expect(c.paidAmount).toBe(937);
    expect(c.unpaidAmount).toBe(923);
    expect(
      s.receiptPlans.find((p) => p.id === action.allocations[0].receiptPlanId)
        ?.paidAmount,
    ).toBe(100);
    expect(s.receiptRecords).toHaveLength(1);
    expect(s.receiptRecords[0]).toMatchObject({
      sourceNo: action.sourceNo,
      amount: 100,
      contractPaidBefore: 837,
      contractPaidAfter: 937,
      confirmedBy: "刘敏",
      confirmedAt: AS_OF_DATE,
      allocations: [{ paidBefore: 0, paidAfter: 100, amount: 100 }],
    });
    expect(
      initial.contracts.find((c) => c.id === action.contractId)?.paidAmount,
    ).toBe(837);
  });
  it("同一流水可分配到同合同多个真实节点，分配合计只入账一次", () => {
    const initial = createBusinessState();
    const action = receipt(initial);
    const c = initial.contracts.find((c) => c.id === action.contractId)!;
    const plans = initial.receiptPlans.filter((p) => p.contractId === c.id); // Test precondition: the same contract has two partially paid real nodes.
    plans[0].paidAmount = 800;
    plans[1].paidAmount = 37;
    action.allocations = [
      { receiptPlanId: plans[0].id, amount: 37 },
      { receiptPlanId: plans[1].id, amount: 63 },
    ];
    const s = transition(initial, action, finance);
    expect(s.receiptRecords[0].amount).toBe(100);
    expect(s.receiptRecords[0].allocations).toHaveLength(2);
    expect(s.contracts.find((v) => v.id === c.id)?.paidAmount).toBe(937);
    expect(s.receiptPlans.find((p) => p.id === plans[0].id)?.paidAmount).toBe(
      837,
    );
    expect(s.receiptPlans.find((p) => p.id === plans[1].id)?.paidAmount).toBe(
      100,
    );
  });
  it("重复流水与重复节点拒绝，失败不会重复增加实收", () => {
    let s = createBusinessState();
    const action = receipt(s);
    expect(() =>
      transition(
        s,
        {
          ...action,
          allocations: [...action.allocations, ...action.allocations],
        },
        finance,
      ),
    ).toThrow("节点不能重复");
    s = transition(s, action, finance);
    const saved = structuredClone(s);
    expect(() =>
      transition(s, { ...action, sourceNo: ` ${action.sourceNo} ` }, finance),
    ).toThrow("不可重复");
    expect(s).toEqual(saved);
  });
  it("超节点、超合同与历史合同计划不一致均拒绝", () => {
    const s = createBusinessState();
    const action = receipt(s, 1024);
    expect(() => transition(s, action, finance)).toThrow("节点未收余额");
    const inflated = structuredClone(s);
    inflated.receiptPlans.find(
      (p) => p.id === action.allocations[0].receiptPlanId,
    )!.amount += 10;
    expect(() => transition(inflated, action, finance)).toThrow("合同未收余额");
    const mismatch = structuredClone(s);
    mismatch.contracts.find((c) => c.id === action.contractId)!.paidAmount += 1;
    expect(() => transition(mismatch, receipt(mismatch), finance)).toThrow(
      "历史实收不一致",
    );
  });
  it("项目合同节点真实关联以及财务权限不可绕过", () => {
    const s = createBusinessState();
    const action = receipt(s);
    expect(() => transition(s, action, pm)).toThrow("仅财务");
    expect(() =>
      transition(s, { ...action, projectId: "P-001" }, finance),
    ).toThrow("关联无效");
    expect(() =>
      transition(s, { ...action, projectId: "P-NOT-EXIST" }, finance),
    ).toThrow("关联无效");
    expect(() =>
      transition(
        s,
        {
          ...action,
          allocations: [
            {
              receiptPlanId: s.receiptPlans.find(
                (p) => p.projectId === "P-001",
              )!.id,
              amount: 1,
            },
          ],
        },
        finance,
      ),
    ).toThrow("节点不属于");
  });
  it.each([0, -1, NaN, Infinity, 0.0000001])(
    "金额 %s 不能作为实际收款",
    (amount) => {
      const s = createBusinessState();
      expect(() => transition(s, receipt(s, amount), finance)).toThrow(
        "金额须为正数且精确到分",
      );
    },
  );
  it.each(["2026-02-30", "2026-13-01", "2026-9-09", "2027-01-01", ""])(
    "日期 %s 无效时拒绝",
    (receivedDate) => {
      const s = createBusinessState();
      expect(() =>
        transition(s, { ...receipt(s), receivedDate }, finance),
      ).toThrow("收款日期无效");
    },
  );
  it("缺少流水、有效凭据或说明拒绝；支持精确到分和提前回款", () => {
    const s = createBusinessState();
    const action = receipt(s, 0.000001);
    expect(() => transition(s, { ...action, sourceNo: " " }, finance)).toThrow(
      "流水编号必填",
    );
    expect(() =>
      transition(s, { ...action, evidenceFiles: [] }, finance),
    ).toThrow("凭据");
    expect(() =>
      transition(s, { ...action, evidenceFiles: ["不支持.exe"] }, finance),
    ).toThrow("凭据");
    expect(() => transition(s, { ...action, note: " " }, finance)).toThrow(
      "说明必填",
    );
    const next = transition(
      s,
      { ...action, receivedDate: "2026-09-01" },
      finance,
    );
    expect(next.receiptRecords[0].amount).toBe(0.000001);
    expect(next.receiptRecords[0].receivedDate).toBe("2026-09-01");
  });
  it("经营分析沿用四算建设口径，回款和运维成本不会改写结算成本", () => {
    let s = createBusinessState();
    const p = s.projects.find((p) => p.id === "P-006")!;
    const calc = selectFourCalculations(p, s);
    const snapshot = settlementSnapshot(s, p.id);
    const receiptSummary = selectReceipts([p], s);
    expect(snapshot.income).toBe(calc.income);
    expect(snapshot.cost).toBe(calc.actual);
    expect(snapshot.receipts).toBe(receiptSummary.paid);
    expect(snapshot.receivable).toBe(receiptSummary.outstanding);
    expect(snapshot.overdue).toBe(receiptSummary.overdue);
    expect(
      snapshot.subjects.map((subject) => ({
        id: subject.subjectId,
        actual: subject.actual,
      })),
    ).toEqual(
      calc.subjects.map((subject) => ({
        id: subject.subjectId,
        actual: subject.actual,
      })),
    );

    const plan = s.receiptPlans.find((plan) => plan.projectId === p.id)!;
    const contract = s.contracts.find((contract) => contract.projectId === p.id)!;
    const duplicated = structuredClone(s);
    duplicated.receiptPlans.push(structuredClone(plan));
    duplicated.contracts.push(structuredClone(contract));
    const deDuplicated = selectReceipts([p], duplicated);
    expect(deDuplicated.plans.filter((item) => item.id === plan.id)).toHaveLength(
      1,
    );
    expect(
      deDuplicated.contracts.filter((item) => item.id === contract.id),
    ).toHaveLength(1);
    expect(deDuplicated.paid).toBe(receiptSummary.paid);
    expect(deDuplicated.outstanding).toBe(receiptSummary.outstanding);

    const constructionBefore = structuredClone(selectFourCalculations(p, s));
    s.maintenanceCosts.push({
      ...structuredClone(s.costs.find((cost) => cost.projectId === p.id)!),
      id: "OPS-COST-P006",
      sourceId: "OPS-SOURCE-P006",
      amount: 88,
      description: "运维周期费用，不进入建设期四算",
    });
    expect(selectFourCalculations(p, s)).toEqual(constructionBefore);
    expect(settlementSnapshot(s, p.id).cost).toBe(snapshot.cost);

    s = transition(s, receipt(s, 100), finance);
    expect(selectFourCalculations(p, s)).toEqual(constructionBefore);
    expect(settlementSnapshot(s, p.id).receipts).toBe(
      receiptSummary.paid + 100,
    );
  });
  it("收款动作策略可收紧但JS08只读下钻保持可访问", () => {
    const s = createBusinessState();
    expect(canAccessPage(s, finance, "JS-08")).toBe(true);
    expect(canAccessAction(s, finance, "confirm-project-receipt", "P-006")).toBe(
      true,
    );
    expect(canAccessAction(s, pm, "confirm-project-receipt", "P-006")).toBe(
      false,
    );
    const policy = selectAccessPolicy(s, "finance")!;
    policy.actions = policy.actions.filter(
      (action) => action !== "confirm-project-receipt",
    );
    expect(canAccessPage(s, finance, "JS-08")).toBe(true);
    expect(canAccessAction(s, finance, "confirm-project-receipt", "P-006")).toBe(
      false,
    );
  });
  it("归档及历史关闭后仍能收真实欠款，结算档案关闭和建设成本不改", () => {
    const s = createBusinessState();
    const id = "P-008";
    s.projectArchives[id] = {
      id: "TEST-ARCHIVE-8",
      projectId: id,
      version: 1,
      confirmedAt: AS_OF_DATE,
      confirmedBy: "李主任",
      note: "测试前置：归档已完成",
      sources: [],
      materials: [],
      categories: [...ARCHIVE_CATEGORIES],
    };
    s.settlementRequests.push({
      id: "TEST-SETTLEMENT-8",
      projectId: id,
      version: 1,
      status: "已锁定",
      note: "已锁定测试快照",
      files: ["结算报告.pdf"],
      submittedBy: "张建国",
      snapshot: settlementSnapshot(s, id),
      history: [],
    });
    s.projectClosures[id] = {
      id: "TEST-CLOSE-8",
      projectId: id,
      date: AS_OF_DATE,
      actor: "李主任",
      note: "历史关闭测试前置",
      archiveId: "TEST-ARCHIVE-8",
      evaluationId: "TEST-EVAL-8",
      settlementId: "TEST-SETTLEMENT-8",
      operationIds: [],
      receipts: structuredClone(
        s.receiptPlans.filter((p) => p.projectId === id),
      ),
    };
    const before = structuredClone({
      archives: s.projectArchives,
      closures: s.projectClosures,
      requests: s.settlementRequests,
      settlements: s.settlements,
      costs: s.costs,
      maintenanceCosts: s.maintenanceCosts,
      projects: s.projects,
      budgets: s.budgets,
      freezes: s.constructionFreezes,
    });
    const next = transition(s, receipt(s, 100, id), finance);
    expect(next.receiptRecords).toHaveLength(1);
    expect({
      archives: next.projectArchives,
      closures: next.projectClosures,
      requests: next.settlementRequests,
      settlements: next.settlements,
      costs: next.costs,
      maintenanceCosts: next.maintenanceCosts,
      projects: next.projects,
      budgets: next.budgets,
      freezes: next.constructionFreezes,
    }).toEqual(before);
  });
  it("结算临时冻结期间收款不解冻；P006837+1023=1860仅解除应收门禁", () => {
    const s = createBusinessState();
    s.constructionFreezes["P-006"] = {
      requestId: "TEST-REVIEW",
      reason: "财务核算中",
    };
    const beforeChecks = closeChecks(s, "P-006");
    const check = () =>
      beforeChecks.find((c) => c.label === "合同及回款计划应收结清");
    expect(check()?.ok).toBe(false);
    const next = transition(s, receipt(s, 1023), finance);
    const c = next.contracts.find((c) => c.projectId === "P-006")!;
    expect(c.paidAmount).toBe(1860);
    expect(c.unpaidAmount).toBe(0);
    expect(
      closeChecks(next, "P-006").find(
        (c) => c.label === "合同及回款计划应收结清",
      )?.ok,
    ).toBe(true);
    const afterChecks = closeChecks(next, "P-006");
    expect(afterChecks.some((c) => !c.ok)).toBe(true);
    expect(
      afterChecks
        .filter((c) => c.label !== "合同及回款计划应收结清")
        .map((c) => ({ label: c.label, ok: c.ok })),
    ).toEqual(
      beforeChecks
        .filter((c) => c.label !== "合同及回款计划应收结清")
        .map((c) => ({ label: c.label, ok: c.ok })),
    );
    expect(next.constructionFreezes).toEqual(s.constructionFreezes);
    expect(next.projects).toEqual(s.projects);
  });
});
