import { describe, it, expect } from "vitest";
import {
  createBusinessState,
  transition,
  type Actor,
  type BusinessState,
} from "@/mock/business";
import {
  archiveChecks,
  archiveSources,
  evaluationPeople,
  templateEvaluationResult,
} from "@/mock/closeout";
import { EVALUATION_GOALS, type PostEvaluation } from "@/models/closeout";
const pmo: Actor = { id: "U-002", name: "李主任", role: "pmo" };
const pm: Actor = { id: "U-001", name: "张建国", role: "project-manager" };
function completeEvaluation() {
  let s = transition(
    createBusinessState(),
    { type: "start-post-evaluation", projectId: "P-008" },
    pmo,
  );
  for (const row of s.postEvaluations["P-008"].templateSnapshot!.rows)
    s = transition(
      s,
      {
        type: "score-post-evaluation",
        projectId: "P-008",
        rowId: row.id,
        score: 4,
        note: "按原结算与验收依据评价模板条目",
      },
      pmo,
    );
  for (const person of evaluationPeople(s, "P-008"))
    s = transition(
      s,
      {
        type: "score-post-evaluation",
        projectId: "P-008",
        userId: person.id,
        score: 4,
        note: "结合客户验收、交付质量和结算结果评价",
      },
      pmo,
    );
  const goals = Object.fromEntries(
    EVALUATION_GOALS.map((g) => [
      g,
      { conclusion: "达成", note: "依据正式结算与原业务快照，目标总体实现" },
    ]),
  ) as PostEvaluation["goals"];
  s = transition(
    s,
    {
      type: "save-post-evaluation",
      projectId: "P-008",
      goals,
      riskReview: "回顾历史风险应对与残余事项",
      changeReview: "结合变更原单复盘工期影响",
      successes: "复用数据接入模板减少重复实施",
      lessons: "早期数据质量假设需要现场验证",
      improvements: "建立客户侧数据验证清单并指定责任人",
      submit: true,
    },
    pm,
  );
  return transition(
    s,
    {
      type: "confirm-post-evaluation",
      projectId: "P-008",
      approve: true,
      opinion: "目标、人员评价与经验材料完整",
    },
    pmo,
  );
}
function prepareArchive() {
  let s = completeEvaluation();
  for (const c of archiveChecks(s, "P-008").filter((c) => !c.passed)) {
    const source = archiveSources(s, "P-008").find(
      (r) => r.category === c.category,
    )!;
    expect(source).toBeDefined();
    s = transition(
      s,
      {
        type: "submit-archive-file",
        projectId: "P-008",
        category: c.category,
        sourceId: source.id,
        filename: `数据中台_${c.category.replace(/\//g, "_")}_正式版.pdf`,
        note: "历史签审原件补档，档号CASE-2026-008",
      },
      pm,
    );
    const material = s.materials.at(-1)!;
    s = transition(
      s,
      {
        type: "review-archive-file",
        id: material.id,
        approve: true,
        opinion: "原件来源、版本与签审状态核对一致",
      },
      pmo,
    );
  }
  return s;
}
describe("后评价与正式归档", () => {
  it("仅正式结算后PMO发起，保留原经营及风险变更依据快照", () => {
    const original = createBusinessState();
    expect(() =>
      transition(
        original,
        { type: "start-post-evaluation", projectId: "P-006" },
        pmo,
      ),
    ).toThrow("正式结算");
    expect(() =>
      transition(
        original,
        { type: "start-post-evaluation", projectId: "P-008" },
        pm,
      ),
    ).toThrow("PMO");
    const s = transition(
      original,
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const snapshot = structuredClone(s.postEvaluations["P-008"].snapshot);
    s.projects.find((p) => p.id === "P-008")!.contractAmount = 99999;
    expect(s.postEvaluations["P-008"].snapshot).toEqual(snapshot);
    expect(s.postEvaluations["P-008"].snapshot.cost).toBe(1390);
    expect(original.postEvaluations["P-008"]).toBeUndefined();
  });
  it("人员来自真实项目角色，主PM不可自评或评价其他项目人员", () => {
    let s = transition(
      createBusinessState(),
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    expect(() =>
      transition(
        s,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          userId: "U-001",
          score: 5,
          note: "自评",
        },
        pm,
      ),
    ).toThrow("不可自评");
    expect(() =>
      transition(
        s,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          userId: "U-NOT-IN-TEAM",
          score: 5,
          note: "越权",
        },
        pmo,
      ),
    ).toThrow("真实项目角色");
    s = transition(
      s,
      {
        type: "score-post-evaluation",
        projectId: "P-008",
        userId: "U-001",
        score: 4,
        note: "结算结果良好，交付延误需复盘",
      },
      pmo,
    );
    s = transition(
      s,
      {
        type: "score-post-evaluation",
        projectId: "P-008",
        userId: "U-001",
        score: 3,
        note: "补充风险应对评价",
      },
      pmo,
    );
    expect(s.postEvaluations["P-008"].staff).toHaveLength(2);
  });
  it("六类目标及复盘完整才能提交，确认后不可覆盖经验记录", () => {
    const started = transition(
      createBusinessState(),
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const e = started.postEvaluations["P-008"];
    expect(() =>
      transition(
        started,
        {
          type: "save-post-evaluation",
          projectId: "P-008",
          goals: e.goals,
          riskReview: "",
          changeReview: "",
          successes: "",
          lessons: "",
          improvements: "",
          submit: true,
        },
        pm,
      ),
    ).toThrow("六类目标");
    const s = completeEvaluation();
    expect(s.postEvaluations["P-008"].status).toBe("已完成");
    expect(() =>
      transition(
        s,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          userId: "U-001",
          score: 5,
          note: "覆盖",
        },
        pmo,
      ),
    ).toThrow("编制中");
  });
  it("14目录原记录不冒充正式文件，缺件阻断；补档不解除建设锁定", () => {
    let s = completeEvaluation();
    expect(archiveChecks(s, "P-008")).toHaveLength(14);
    expect(
      archiveChecks(s, "P-008").find((c) => c.category === "方案")?.passed,
    ).toBe(false);
    expect(() =>
      transition(
        s,
        { type: "confirm-project-archive", projectId: "P-008", note: "归档" },
        pmo,
      ),
    ).toThrow("归档缺件");
    const costs = structuredClone(s.costs);
    const frozen = structuredClone(s.settlements);
    const source = archiveSources(s, "P-008").find(
      (r) => r.category === "方案",
    )!;
    s = transition(
      s,
      {
        type: "submit-archive-file",
        projectId: "P-008",
        category: "方案",
        sourceId: source.id,
        filename: "数据中台方案签审版.pdf",
        note: "从历史档案恢复原签审件",
      },
      pm,
    );
    expect(s.lockedProjects).toContain("P-008");
    expect(s.costs).toEqual(costs);
    expect(s.settlements).toEqual(frozen);
    expect(
      archiveChecks(s, "P-008").find((c) => c.category === "方案")?.passed,
    ).toBe(false);
  });
  it("退回补档创建新版本，保留旧文件结论且禁止跨项目来源", () => {
    let s = completeEvaluation();
    const source = archiveSources(s, "P-008").find(
      (r) => r.category === "方案",
    )!;
    const action = {
      type: "submit-archive-file" as const,
      projectId: "P-008",
      category: "方案" as const,
      sourceId: source.id,
      filename: "方案V1.pdf",
      note: "补充原件",
    };
    expect(() =>
      transition(s, { ...action, sourceId: "P-006:solution" }, pm),
    ).toThrow("本项目");
    s = transition(s, action, pm);
    const id = s.materials.at(-1)!.id;
    s = transition(
      s,
      {
        type: "review-archive-file",
        id,
        approve: false,
        opinion: "缺少签审页",
      },
      pmo,
    );
    s = transition(s, { ...action, filename: "方案V2含签审.pdf" }, pm);
    const versions = s.materials.find((m) => m.id === id)!.versions!;
    expect(versions).toHaveLength(2);
    expect(versions[0].status).toBe("驳回");
    expect(versions[1].status).toBe("待审核");
  });
  it("完整目录归档保留全部来源版本，正式文件和后评价不可覆写", () => {
    let s: BusinessState = prepareArchive();
    expect(archiveChecks(s, "P-008").every((c) => c.passed)).toBe(true);
    s = transition(
      s,
      {
        type: "confirm-project-archive",
        projectId: "P-008",
        note: "14分类原件、版本与来源核对完整",
      },
      pmo,
    );
    const a = s.projectArchives["P-008"];
    expect(a.categories).toHaveLength(14);
    expect(a.sources.length).toBeGreaterThan(14);
    expect(a.confirmedBy).toBe("李主任");
    expect(a.materials.length).toBeGreaterThanOrEqual(6);
    const file = a.materials[0];
    expect(s.materials.find((m) => m.id === file.id)?.archived).toBe(true);
    expect(() =>
      transition(
        s,
        {
          type: "submit-archive-file",
          projectId: "P-008",
          category: "方案",
          sourceId: "P-008:solution",
          filename: "覆盖.pdf",
          note: "覆盖",
        },
        pm,
      ),
    ).toThrow("只读");
    expect(() =>
      transition(
        s,
        { type: "confirm-project-archive", projectId: "P-008", note: "重复" },
        pmo,
      ),
    ).toThrow("只读");
  });
  it("归档后旧问题/成本入口不可写，管理员无解档旁路，运维成本仍独立", () => {
    let s = prepareArchive();
    s = transition(
      s,
      { type: "confirm-project-archive", projectId: "P-008", note: "完成归档" },
      pmo,
    );
    const original = structuredClone(s.projectArchives["P-008"]);
    const issue = s.issues.find((i) => i.projectId === "P-008")!;
    expect(() =>
      transition(s, { type: "close-issue", id: issue.id }, pm),
    ).toThrow("归档");
    expect(() =>
      transition(
        s,
        { type: "close-issue", id: issue.id },
        { id: "ADMIN", name: "管理员", role: "admin" },
      ),
    ).toThrow("归档");
    const cost = {
      ...s.costs.find((c) => c.projectId === "P-008")!,
      id: "AFTER-ARCHIVE",
      sourceId: "AFTER-ARCHIVE",
      amount: 1,
    };
    expect(() =>
      transition(
        s,
        { type: "confirm-cost", cost },
        { id: "U-004", name: "刘敏", role: "finance" },
      ),
    ).toThrow("归档");
    expect(() =>
      transition(
        s,
        {
          type: "confirm-cost",
          cost: { ...cost, projectId: "P-007" },
          maintenance: true,
        },
        { id: "U-004", name: "刘敏", role: "finance" },
      ),
    ).toThrow("周期原单");
    expect(s.projectArchives["P-008"]).toEqual(original);
  });
});

describe("后评价版本化模板消费", () => {
  it("发起保存适用模板，发布新版本只影响新评价，原记录与必填项不漂移", () => {
    let s = transition(
      createBusinessState(),
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const snapshot = structuredClone(
      s.postEvaluations["P-008"].templateSnapshot!,
    );
    const template = s.configuration.templates.find(
      (t) => t.id === snapshot.id,
    )!;
    const value = {
      ...template,
      changeReason: "增加交接完整性评价",
      rows: [
        ...template.rows,
        {
          id: "handover-quality",
          name: "交接完整性",
          phase: "后评价",
          required: true,
          systemRequired: false,
          role: "pmo" as const,
          timing: "提交前",
          weight: 3,
        },
      ],
    };
    s = transition(
      s,
      {
        type: "configuration-save",
        kind: "templates",
        sourceId: template.id,
        value,
      },
      pmo,
    );
    s = transition(
      s,
      {
        type: "configuration-publish",
        kind: "templates",
        id: s.configuration.templates.at(-1)!.id,
      },
      pmo,
    );
    expect(s.postEvaluations["P-008"].templateSnapshot).toEqual(snapshot);
    expect(
      templateEvaluationResult(s.postEvaluations["P-008"]).requiredMissing,
    ).not.toContain("交接完整性");
    let fresh = createBusinessState();
    fresh.configuration = structuredClone(s.configuration);
    fresh = transition(
      fresh,
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    expect(fresh.postEvaluations["P-008"].templateSnapshot!.version).toBe(
      snapshot.version + 1,
    );
    expect(
      templateEvaluationResult(fresh.postEvaluations["P-008"]).requiredMissing,
    ).toContain("交接完整性");
  });
  it("使用模板角色和权重，越权或无依据拒绝，重复评分保留完整历史", () => {
    let s = createBusinessState();
    const t = s.configuration.templates.find(
      (t) => t.kind === "post-evaluation",
    )!;
    t.rows = t.rows.map((r, i) => ({
      ...r,
      role: i === 0 ? "finance" : "pmo",
      weight: i === 0 ? 3 : i === 1 ? 1 : 0,
    }));
    s = transition(
      s,
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const rows = s.postEvaluations["P-008"].templateSnapshot!.rows;
    const action = {
      type: "score-post-evaluation" as const,
      projectId: "P-008",
      rowId: rows[0].id,
      score: 5,
      note: "根据实际结算成本、预算及成本归集原单评分",
    };
    expect(() => transition(s, action, pmo)).toThrow("模板指定角色");
    const finance: Actor = { id: "U-004", name: "刘敏", role: "finance" };
    expect(() => transition(s, { ...action, note: "" }, finance)).toThrow(
      "实际依据",
    );
    expect(() =>
      transition(s, { ...action, rowId: "不存在" }, finance),
    ).toThrow("模板指定角色");
    s = transition(s, action, finance);
    s = transition(s, { ...action, rowId: rows[1].id, score: 1 }, pmo);
    expect(templateEvaluationResult(s.postEvaluations["P-008"]).score).toBe(4);
    s = transition(
      s,
      { ...action, score: 4, note: "补充确认成本归集遗漏，修订评分" },
      finance,
    );
    expect(templateEvaluationResult(s.postEvaluations["P-008"]).score).toBe(
      3.25,
    );
    expect(s.postEvaluations["P-008"].templateScoreHistory).toHaveLength(3);
    expect(s.postEvaluations["P-008"].templateScoreHistory![0].score).toBe(5);
  });
  it("模板必填与系统必填评分阻断提交，评分后提交；完成记录不可改评分", () => {
    let s = transition(
      createBusinessState(),
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const e = s.postEvaluations["P-008"];
    const action = {
      type: "save-post-evaluation" as const,
      projectId: "P-008",
      goals: Object.fromEntries(
        EVALUATION_GOALS.map((g) => [
          g,
          { conclusion: "达成", note: "结算验收事实支持" },
        ]),
      ) as PostEvaluation["goals"],
      riskReview: "风险已核对",
      changeReview: "变更已核对",
      successes: "成功经验已总结",
      lessons: "失败教训已记录",
      improvements: "后续改进有责任人",
      submit: true,
    };
    expect(() => transition(s, action, pm)).toThrow("模板必填评分");
    for (const row of e.templateSnapshot!.rows)
      s = transition(
        s,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          rowId: row.id,
          score: 4,
          note: "基于实际项目事实的评价",
        },
        pmo,
      );
    s = transition(s, action, pm);
    expect(s.postEvaluations["P-008"].status).toBe("待确认");
    const complete = completeEvaluation();
    expect(() =>
      transition(
        complete,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          rowId: e.templateSnapshot!.rows[0].id,
          score: 5,
          note: "覆盖评分",
        },
        pmo,
      ),
    ).toThrow("编制中");
  });
  it("旧记录无模板不追套，禁用当前模板阻断新评价而不更改旧记录", () => {
    const s = transition(
      createBusinessState(),
      { type: "start-post-evaluation", projectId: "P-008" },
      pmo,
    );
    const e = s.postEvaluations["P-008"];
    delete e.templateSnapshot;
    delete e.templateScores;
    delete e.templateScoreHistory;
    const legacy = structuredClone(e);
    for (const t of s.configuration.templates.filter(
      (t) => t.kind === "post-evaluation",
    ))
      t.enabled = false;
    expect(templateEvaluationResult(e).requiredMissing).toEqual([]);
    expect(() =>
      transition(
        s,
        {
          type: "score-post-evaluation",
          projectId: "P-008",
          rowId: "item-1",
          score: 4,
          note: "不应追套",
        },
        pmo,
      ),
    ).toThrow("历史后评价");
    expect(s.postEvaluations["P-008"]).toEqual(legacy);
    const fresh = createBusinessState();
    fresh.configuration = structuredClone(s.configuration);
    expect(() =>
      transition(
        fresh,
        { type: "start-post-evaluation", projectId: "P-008" },
        pmo,
      ),
    ).toThrow("没有适用");
  });
});

it("后评价按项目实际部门、类型和级别选择专用模板", () => {
  let s = createBusinessState();
  const p = s.projects.find((p) => p.id === "P-008")!;
  const base = s.configuration.templates.find(
    (t) => t.kind === "post-evaluation",
  )!;
  const value = {
    ...base,
    key: "TPL-SCOPED-EVALUATION",
    name: "本部门同级项目后评价",
    orgId: p.departmentId,
    projectType: p.type,
    level: p.level,
    changeReason: "为实际部门类型级别发布专用评价模板",
  };
  s = transition(
    s,
    { type: "configuration-save", kind: "templates", value },
    pmo,
  );
  const id = s.configuration.templates.at(-1)!.id;
  s = transition(
    s,
    { type: "configuration-publish", kind: "templates", id },
    pmo,
  );
  s = transition(s, { type: "start-post-evaluation", projectId: p.id }, pmo);
  expect(s.postEvaluations[p.id].templateSnapshot!.id).toBe(id);
  expect(s.postEvaluations[p.id].templateSnapshot!.orgId).toBe(p.departmentId);
  expect(s.postEvaluations[p.id].templateSnapshot!.level).toBe(p.level);
});
