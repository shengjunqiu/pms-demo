import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { MoneyText } from "@/components/common/MoneyText";
import { useBusinessStore } from "@/mock/business";
import { canViewSensitiveField } from "@/mock/configuration-access";
import { visibleProjects } from "@/mock/selectors";
import {
  evaluationPeople,
  canScoreTemplate,
  templateEvaluationResult,
  type CloseoutAction,
} from "@/mock/closeout";
import { EVALUATION_GOALS, type PostEvaluation } from "@/models/closeout";
import { useAppStore, ROLES } from "@/store/useAppStore";
export function PostEvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo, canEditField } = useActionAccess();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<PostEvaluation>();
  const [person, setPerson] = useState<string>();
  const [templateRow, setTemplateRow] = useState<string>();
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<boolean>();
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some((p) => p.id === id)
  )
    return <StateView type="403" />;
  const e = data.postEvaluations[p.id];
  const archive = data.projectArchives[p.id];
  const viewEvaluation = canViewSensitiveField(data, currentUser, "evaluation");
  const viewMargin = canViewSensitiveField(data, currentUser, "margin");
  const hiddenEvaluation = "评价字段无查看权限";
  const pmo = currentRole === "pmo";
  const pm = currentRole === "project-manager" && currentUser.id === p.pmId;
  const member =
    currentRole === "solution-tech" && p.memberIds?.includes(currentUser.id);
  const market =
    currentRole === "market" &&
    data.opportunities.find((o) => o.id === p.opportunityId)?.ownerId ===
      currentUser.id;
  const canEdit =
    !!e &&
    e.status === "编制中" &&
    !archive &&
    (pmo || pm || member || market) &&
    canDo("save-post-evaluation", p.id) &&
    canEditField("evaluation");
  const settled = data.settlements.some(
    (s) => s.projectId === p.id && s.status === "已锁定已生效",
  );
  const people = evaluationPeople(data, p.id);
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const templateResult = e ? templateEvaluationResult(e) : undefined;
  // Writing a single score is independent of viewing existing evaluations.
  // Without read access, never replace another evaluator's current score.
  const canEnterTemplate = (rowId: string) =>
    canDo("score-post-evaluation", p.id) &&
    canEditField("evaluation") &&
    canScoreTemplate(data, p.id, actor, rowId) &&
    (viewEvaluation ||
      !e?.templateScores?.[rowId] ||
      e.templateScores[rowId].actorId === currentUser.id);
  const canScorePerson =
    !!e &&
    e.status === "编制中" &&
    !archive &&
    canDo("score-post-evaluation", p.id) &&
    canEditField("evaluation");
  const canConfirm =
    pmo &&
    !archive &&
    e?.status === "待确认" &&
    canDo("confirm-post-evaluation", p.id);
  const run = (action: CloseoutAction) => {
    if (!canDo(action.type, p.id)) return false;
    if (
      ["save-post-evaluation", "score-post-evaluation"].includes(action.type) &&
      !canEditField("evaluation")
    )
      return false;
    try {
      dispatch(action, actor);
      message.success("后评价原任务已更新");
      return true;
    } catch (err) {
      message.error((err as Error).message);
      return false;
    }
  };
  const save = (submit: boolean) => {
    if (!canEdit || !viewEvaluation || !draft) return;
    if (
      run({
        type: "save-post-evaluation",
        projectId: p.id,
        goals: draft!.goals,
        riskReview: draft!.riskReview,
        changeReview: draft!.changeReview,
        successes: draft!.successes,
        lessons: draft!.lessons,
        improvements: draft!.improvements,
        submit,
      })
    )
      setDraft(undefined);
  };
  return (
    <>
      <PageHeader
        title="JS-09 项目后评价"
        description={`${p.id} · ${p.name} · ${e?.status ?? "尚未发起"}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "结算", href: `/projects/${p.id}/settlement` },
          { title: "项目后评价" },
        ]}
        extra={
          <Space>
            <Button
              onClick={() => navigate(`/projects/${p.id}/business-result`)}
            >
              经营结果
            </Button>
            <Button onClick={() => navigate(`/projects/${p.id}/archive`)}>
              资料归档
            </Button>
            {!e ? (
              <Button
                type="primary"
                disabled={
                  !pmo ||
                  !settled ||
                  !!archive ||
                  !canDo("start-post-evaluation", p.id)
                }
                onClick={() =>
                  run({ type: "start-post-evaluation", projectId: p.id })
                }
              >
                PMO发起后评价
              </Button>
            ) : (
              <Button
                type="primary"
                disabled={!canEdit || !viewEvaluation}
                onClick={() => setDraft(structuredClone(e))}
              >
                编制目标与复盘
              </Button>
            )}
          </Space>
        }
      />
      <Alert
        type={archive ? "success" : settled ? "info" : "warning"}
        showIcon
        style={{ marginBottom: 16 }}
        message={
          archive
            ? "档案已确认，后评价与历史依据只读"
            : settled
              ? "演示规则 EVAL-1：结算后由PMO组织复盘，项目参与角色补充依据，PMO最终确认。"
              : "尚未正式结算，后评价发起被阻断。"
        }
        description={`${p.phase === "已关闭" ? "本历史项目仅补录尚未导入的复盘，不重开项目、不改冻结经营结果。" : ""}人员评分为1–5分人工评价，不内置绩效计算公式；评价对象来自原商机主办、项目经理与真实团队。主PM只能评价其他交付成员，PMO评价关联角色，历史意见全部保留。`}
      />
      {e ? (
        <>
          <Card
            title="评价依据 · 发起时项目快照"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions
              bordered
              size="small"
              column={3}
              items={[
                {
                  key: "settle",
                  label: "冻结结算原单",
                  children: e.snapshot.settlementId,
                },
                {
                  key: "baseline",
                  label: "基线",
                  children: e.snapshot.baselineId,
                },
                { key: "date", label: "发起时间", children: e.startedAt },
                {
                  key: "income",
                  label: "结算收入",
                  children: <MoneyText value={e.snapshot.income} />,
                },
                {
                  key: "cost",
                  label: "结算成本",
                  children: <MoneyText value={e.snapshot.cost} />,
                },
                {
                  key: "margin",
                  label: "结算毛利",
                  children: viewMargin ? (
                    <MoneyText value={e.snapshot.margin} />
                  ) : (
                    "毛利字段无查看权限"
                  ),
                },
                {
                  key: "budget",
                  label: "预算",
                  children: <MoneyText value={e.snapshot.budget} />,
                },
                {
                  key: "planned",
                  label: "计划结束",
                  children: e.snapshot.plannedEnd,
                },
                {
                  key: "accepted",
                  label: "验收日期",
                  children: e.snapshot.acceptanceDate || "历史数据未提供",
                },
                {
                  key: "scope",
                  label: "交付范围",
                  span: 3,
                  children: e.snapshot.scope,
                },
              ]}
            />
          </Card>
          <Tabs
            items={[
              {
                key: "template",
                label: "模板评分与版本",
                children: e.templateSnapshot ? (
                  <>
                    <Alert
                      showIcon
                      type={
                        templateResult!.requiredMissing.length
                          ? "warning"
                          : "success"
                      }
                      message={`${e.templateSnapshot.name} · V${e.templateSnapshot.version} · ${e.templateSnapshot.id}`}
                      description={
                        viewEvaluation
                          ? `发起时保存适用模板；已评分 ${templateResult!.scored}/${templateResult!.total} 项，加权分 ${templateResult!.score ?? "尚未形成"}/5。${templateResult!.requiredMissing.length ? `尚缺必填项：${templateResult!.requiredMissing.join("、")}` : "必填评分已完成。"}按已评分条目的权重加权；权重为零的条目不影响加权分。`
                          : hiddenEvaluation
                      }
                    />
                    <Descriptions
                      style={{ margin: "16px 0" }}
                      items={[
                        {
                          key: "date",
                          label: "模板生效日期",
                          children: e.templateSnapshot.effectiveDate,
                        },
                        {
                          key: "published",
                          label: "发布人 / 日期",
                          children: `${e.templateSnapshot.publishedBy} / ${e.templateSnapshot.publishedAt}`,
                        },
                        {
                          key: "scope",
                          label: "适用范围",
                          children: `部门 ${e.templateSnapshot.orgId} / 类型 ${e.templateSnapshot.projectType} / 级别 ${e.templateSnapshot.level}`,
                        },
                      ]}
                    />
                    <Table
                      rowKey="id"
                      pagination={false}
                      dataSource={e.templateSnapshot.rows}
                      columns={[
                        { title: "评价项", dataIndex: "name" },
                        {
                          title: "要求 / 时点",
                          render: (_, r) => (
                            <Space direction="vertical">
                              <Tag
                                color={
                                  r.required || r.systemRequired
                                    ? "red"
                                    : "default"
                                }
                              >
                                {r.required || r.systemRequired
                                  ? "必填"
                                  : "可选"}
                              </Tag>
                              {r.timing}
                            </Space>
                          ),
                        },
                        {
                          title: "责任角色",
                          dataIndex: "role",
                          render: (v) =>
                            ROLES.find((r) => r.key === v)?.name.split(
                              " (",
                            )[0] ?? v,
                        },
                        { title: "权重", dataIndex: "weight" },
                        {
                          title: "当前评分",
                          render: (_, r) =>
                            !viewEvaluation
                              ? hiddenEvaluation
                              : e.templateScores?.[r.id]
                                ? `${e.templateScores[r.id].score}/5`
                                : "待评分",
                        },
                        {
                          title: "评价依据",
                          render: (_, r) =>
                            viewEvaluation
                              ? (e.templateScores?.[r.id]?.note ?? "—")
                              : hiddenEvaluation,
                        },
                        {
                          title: "评分人 / 日期",
                          render: (_, r) =>
                            !viewEvaluation
                              ? hiddenEvaluation
                              : e.templateScores?.[r.id]
                                ? `${e.templateScores[r.id].actor} / ${e.templateScores[r.id].date}`
                                : "—",
                        },
                        {
                          title: "操作",
                          render: (_, r) => (
                            <Button
                              disabled={!canEnterTemplate(r.id)}
                              onClick={() => {
                                setTemplateRow(r.id);
                                setScore(
                                  viewEvaluation
                                    ? (e.templateScores?.[r.id]?.score ?? 3)
                                    : 3,
                                );
                                setNote(
                                  viewEvaluation
                                    ? (e.templateScores?.[r.id]?.note ?? "")
                                    : "",
                                );
                              }}
                            >
                              记录评分
                            </Button>
                          ),
                        },
                      ]}
                    />
                    <Card
                      size="small"
                      title="项目评分历史"
                      style={{ marginTop: 16 }}
                    >
                      <Table
                        rowKey={(_, i) => String(i)}
                        dataSource={
                          viewEvaluation ? (e.templateScoreHistory ?? []) : []
                        }
                        locale={{
                          emptyText: viewEvaluation
                            ? "暂无评分历史"
                            : hiddenEvaluation,
                        }}
                        columns={[
                          {
                            title: "模板条目",
                            dataIndex: "rowId",
                            render: (id) =>
                              e.templateSnapshot?.rows.find((r) => r.id === id)
                                ?.name ?? id,
                          },
                          { title: "评分", dataIndex: "score" },
                          { title: "依据", dataIndex: "note" },
                          { title: "评价人", dataIndex: "actor" },
                          { title: "日期", dataIndex: "date" },
                        ]}
                      />
                    </Card>
                  </>
                ) : (
                  <Alert
                    type="info"
                    message="本历史评价没有模板快照，继续原评价规则；不会追套当前配置。"
                  />
                ),
              },
              {
                key: "goals",
                label: "目标达成与经验",
                children: !viewEvaluation ? (
                  <Alert type="info" message={hiddenEvaluation} />
                ) : (
                  <>
                    <Table
                      rowKey="goal"
                      size="small"
                      pagination={false}
                      dataSource={EVALUATION_GOALS.map((goal) => ({
                        goal,
                        ...e.goals[goal],
                      }))}
                      columns={[
                        { title: "目标", dataIndex: "goal", width: 130 },
                        {
                          title: "达成评价",
                          width: 120,
                          render: (_, g) => (
                            <Tag
                              color={
                                g.conclusion === "达成"
                                  ? "success"
                                  : g.conclusion === "未达成"
                                    ? "error"
                                    : "warning"
                              }
                            >
                              {g.conclusion || "尚未评价"}
                            </Tag>
                          ),
                        },
                        { title: "依据与差距", dataIndex: "note" },
                      ]}
                    />
                    <Descriptions
                      bordered
                      column={1}
                      style={{ marginTop: 16 }}
                      items={[
                        {
                          key: "risk",
                          label: "重大风险复盘",
                          children: e.riskReview || "待补充",
                        },
                        {
                          key: "change",
                          label: "重大变更复盘",
                          children: e.changeReview || "待补充",
                        },
                        {
                          key: "success",
                          label: "成功经验",
                          children: e.successes || "待补充",
                        },
                        {
                          key: "lessons",
                          label: "失败教训",
                          children: e.lessons || "待补充",
                        },
                        {
                          key: "improve",
                          label: "后续改进建议",
                          children: e.improvements || "待补充",
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                key: "people",
                label: "铁三角与交付人员评价",
                children: (
                  <>
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={people}
                      columns={[
                        { title: "实际人员", dataIndex: "name" },
                        { title: "项目角色", dataIndex: "role" },
                        {
                          title: "评价记录",
                          render: (_, person) =>
                            viewEvaluation
                              ? e.staff.filter((s) => s.userId === person.id)
                                  .length
                              : hiddenEvaluation,
                        },
                        {
                          title: "操作",
                          render: (_, u) => (
                            <Button
                              disabled={
                                !canScorePerson ||
                                !e ||
                                e.status !== "编制中" ||
                                !!archive ||
                                (!pmo && !(pm && u.delivery))
                              }
                              onClick={() => {
                                setPerson(u.id);
                                setScore(3);
                                setNote("");
                              }}
                            >
                              记录评价
                            </Button>
                          ),
                        },
                      ]}
                    />
                    <Table
                      style={{ marginTop: 16 }}
                      rowKey={(_, i) => String(i)}
                      size="small"
                      dataSource={viewEvaluation ? e.staff : []}
                      locale={{
                        emptyText: viewEvaluation
                          ? "暂无人员评价"
                          : hiddenEvaluation,
                      }}
                      columns={[
                        { title: "人员", dataIndex: "name" },
                        { title: "评分", render: (_, s) => `${s.score}/5` },
                        { title: "项目表现依据", dataIndex: "note" },
                        { title: "评价人", dataIndex: "evaluator" },
                        { title: "日期", dataIndex: "date" },
                      ]}
                    />
                    <Button onClick={() => navigate(`/projects/${p.id}/team`)}>
                      查看团队与任命来源
                    </Button>
                  </>
                ),
              },
              {
                key: "sources",
                label: "原风险、变更与过程事实",
                children: (
                  <>
                    <Card size="small" title="风险与问题快照">
                      <Table
                        rowKey="id"
                        size="small"
                        dataSource={[...e.snapshot.risks, ...e.snapshot.issues]}
                        columns={[
                          {
                            title: "原记录",
                            render: (_, r) => (
                              <Button
                                type="link"
                                onClick={() =>
                                  navigate(`/issues-risks/${r.id}`)
                                }
                              >
                                {r.id} · {r.title}
                              </Button>
                            ),
                          },
                          { title: "发起时状态", dataIndex: "status" },
                        ]}
                      />
                    </Card>
                    <Card
                      size="small"
                      title="变更快照"
                      style={{ marginTop: 16 }}
                    >
                      <Table
                        rowKey="id"
                        size="small"
                        dataSource={e.snapshot.changes}
                        columns={[
                          {
                            title: "原变更",
                            render: (_, r) => (
                              <Button
                                type="link"
                                onClick={() =>
                                  navigate(`/project-changes?change=${r.id}`)
                                }
                              >
                                {r.id} · {r.title}
                              </Button>
                            ),
                          },
                          { title: "发起时状态", dataIndex: "status" },
                        ]}
                      />
                      <p>
                        原始需求 {e.snapshot.requirements} 项，BUG{" "}
                        {e.snapshot.bugs}{" "}
                        项。后评价记录原因和经验，不修改原单状态。
                      </p>
                    </Card>
                  </>
                ),
              },
            ]}
          />
          <Card size="small" title="PMO确认与历史" style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                disabled={!canConfirm}
                onClick={() => {
                  setConfirm(true);
                  setNote("");
                }}
              >
                确认后评价完成
              </Button>
              <Button
                disabled={!canConfirm}
                onClick={() => {
                  setConfirm(false);
                  setNote("");
                }}
              >
                退回补充
              </Button>
              {e.completedAt && (
                <Tag color="success">
                  {e.completedBy} · {e.completedAt} 完成
                </Tag>
              )}
            </Space>
            {!viewEvaluation && (
              <Alert type="info" message={hiddenEvaluation} />
            )}
            <Timeline
              items={(viewEvaluation ? e.history : []).map((h) => ({
                children: (
                  <>
                    <b>
                      {h.date} · {h.actor} · {h.action}
                    </b>
                    <p>{h.note}</p>
                  </>
                ),
              }))}
            />
          </Card>
        </>
      ) : (
        <Card>
          <p>
            PMO在正式结算后发起后评价，发起时保存项目经营、风险、问题及变更依据，避免后续状态变化改写评价背景。
          </p>
        </Card>
      )}
      <Modal
        title="编制后评价"
        width={820}
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        open={!!draft && viewEvaluation}
        onCancel={() => setDraft(undefined)}
        footer={
          <Space>
            <Button onClick={() => setDraft(undefined)}>取消</Button>
            <Button disabled={!canEdit} onClick={() => save(false)}>
              保存草稿
            </Button>
            <Button
              type="primary"
              disabled={!canEdit}
              onClick={() => save(true)}
            >
              提交PMO确认
            </Button>
          </Space>
        }
      >
        {draft && viewEvaluation && (
          <Form layout="vertical" disabled={!canEdit}>
            {EVALUATION_GOALS.map((g) => (
              <Form.Item key={g} label={g} required>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Select
                    aria-label={`${g}结论`}
                    style={{ width: 180 }}
                    value={draft.goals[g].conclusion || undefined}
                    onChange={(v) =>
                      setDraft({
                        ...draft,
                        goals: {
                          ...draft.goals,
                          [g]: { ...draft.goals[g], conclusion: v },
                        },
                      })
                    }
                    options={["达成", "部分达成", "未达成"].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                  <Input.TextArea
                    aria-label={`${g}依据`}
                    value={draft.goals[g].note}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        goals: {
                          ...draft.goals,
                          [g]: { ...draft.goals[g], note: e.target.value },
                        },
                      })
                    }
                  />
                </Space>
              </Form.Item>
            ))}
            {(
              [
                { key: "riskReview", label: "重大风险复盘" },
                { key: "changeReview", label: "重大变更复盘" },
                { key: "successes", label: "成功经验" },
                { key: "lessons", label: "失败教训" },
                { key: "improvements", label: "后续改进建议" },
              ] as const
            ).map((f) => (
              <Form.Item key={f.key} label={f.label} required>
                <Input.TextArea
                  aria-label={f.label}
                  rows={3}
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
              </Form.Item>
            ))}
          </Form>
        )}
      </Modal>
      <Modal
        title="记录模板项目评分"
        open={!!templateRow}
        onCancel={() => setTemplateRow(undefined)}
        okButtonProps={{
          disabled: !(!!templateRow && canEnterTemplate(templateRow)),
        }}
        onOk={() => {
          if (!(!!templateRow && canEnterTemplate(templateRow))) return;
          if (!templateRow || !canEnterTemplate(templateRow)) return;
          if (
            run({
              type: "score-post-evaluation",
              projectId: p.id,
              rowId: templateRow!,
              score,
              note,
            })
          )
            setTemplateRow(undefined);
        }}
      >
        <Form
          layout="vertical"
          disabled={!(!!templateRow && canEnterTemplate(templateRow))}
        >
          <Form.Item label="固定模板条目">
            {e?.templateSnapshot?.rows.find((r) => r.id === templateRow)?.name}
          </Form.Item>
          <Form.Item label="项目评分（1–5分）" required>
            <InputNumber
              aria-label="模板评价分数"
              min={1}
              max={5}
              precision={0}
              value={score}
              onChange={(v) => setScore(v ?? 1)}
            />
          </Form.Item>
          <Form.Item label="实际项目依据" required>
            <Input.TextArea
              aria-label="模板评价依据"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="记录项目人员评价"
        open={!!person}
        onCancel={() => setPerson(undefined)}
        okButtonProps={{ disabled: !canScorePerson }}
        onOk={() => {
          if (!canScorePerson) return;
          if (
            run({
              type: "score-post-evaluation",
              projectId: p.id,
              userId: person!,
              score,
              note,
            })
          )
            setPerson(undefined);
        }}
      >
        <Form layout="vertical" disabled={!canScorePerson}>
          <Form.Item label="评价对象">
            {people.find((u) => u.id === person)?.name}
          </Form.Item>
          <Form.Item label="人工评价（1–5分）">
            <InputNumber
              aria-label="人员评价分数"
              min={1}
              max={5}
              precision={0}
              value={score}
              onChange={(v) => setScore(v ?? 1)}
            />
          </Form.Item>
          <Form.Item label="基于项目事实的评价依据" required>
            <Input.TextArea
              aria-label="人员评价依据"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={confirm ? "确认后评价完成" : "退回后评价"}
        open={confirm !== undefined}
        onCancel={() => setConfirm(undefined)}
        okButtonProps={{ disabled: !canConfirm }}
        onOk={() => {
          if (!canConfirm) return;
          if (
            run({
              type: "confirm-post-evaluation",
              projectId: p.id,
              approve: confirm!,
              opinion: note,
            })
          )
            setConfirm(undefined);
        }}
      >
        <Input.TextArea
          aria-label="后评价确认意见"
          disabled={!canConfirm}
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
}
