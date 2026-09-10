import { canViewSensitiveField } from "@/mock/configuration-access";
import { configuredApprovalTimeout } from "@/mock/configuration";
import { canViewInitiation } from "@/mock/initiation";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useBusinessStore } from "@/mock/business";
import { useAppStore } from "@/store/useAppStore";
import { mockUsers } from "@/mock";
import {
  INITIATION_RULE,
  INITIATION_SIGNATURES,
  initiationClassification,
} from "@/mock/initiation";
import type { Project } from "@/models/types";
import { StateView } from "@/components/common/StateView";
import {
  InitiationHeader,
  InitiationHistory,
  SourceSummary,
} from "./InitiationShared";
export function InitiationDecisionPage() {
  const { id } = useParams();
  const { data, dispatch } = useBusinessStore();
  const actor = useAppStore((s) => s.currentUser);
  const viewMargin = canViewSensitiveField(data, actor, "margin");
  const hiddenMargin = "毛利字段无查看权限";
  const displayText = (value?: string) =>
    !viewMargin && /毛利|gross.?margin/i.test(value ?? "")
      ? hiddenMargin
      : value;
  const app = data.initiations.find((a) => a.id === id);
  const round = app?.rounds.at(-1);
  const suggested = round
    ? initiationClassification(
        round.input,
        round.source,
        round.riskLevel ?? "低",
        data,
        round.configurationSnapshot,
      )
    : undefined;
  const [level, setLevel] = useState<Project["level"]>(
    round?.level ?? suggested?.level ?? "一般",
  );
  const [reason, setReason] = useState("");
  const [requiredDeliverables, setRequiredDeliverables] = useState<string[]>(
    round?.requiredDeliverables ?? [],
  );
  const [opinion, setOpinion] = useState("");
  const [node, setNode] = useState("");
  const [signConclusion, setSignConclusion] = useState<"同意" | "否决">("同意");
  const [meetingDate, setMeetingDate] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [minutes, setMinutes] = useState("");
  const [result, setResult] = useState<"通过" | "整改" | "否决" | "暂缓">(
    "通过",
  );
  const [rectifications, setRectifications] = useState<
    { content: string; ownerId: string; deadline: string }[]
  >([]);
  const [resumeDate, setResumeDate] = useState("");
  const [resumeReason, setResumeReason] = useState("");
  const [costDisposition, setCostDisposition] = useState("");
  const [trackingOwnerId, setTrackingOwnerId] = useState("");
  const { message, modal } = App.useApp();
  if (!app) return <StateView type="404" />;
  if (!canViewInitiation(data, app, actor)) return <StateView type="403" />;
  if (!round)
    return (
      <>
        <InitiationHeader app={app} title="项目分级与决策" />
        <Alert message="请先提交申请并完成风险报告" />
      </>
    );
  const run = (fn: () => void) => {
    try {
      fn();
      message.success("办理已记录");
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  const ended = ["通过", "整改", "否决", "暂缓"].includes(round.status);
  const approval = round.approvalProgress;
  const activeNode = approval?.snapshot.nodes[approval.node];
  const decisionRole = round.path === "PMC决策会" ? "executive" : "pmo";
  const canDecide =
    result === "通过"
      ? activeNode
        ? activeNode.roles.includes(actor.role)
        : actor.role === decisionRole
      : actor.role === decisionRole ||
        (result === "否决" && !!activeNode?.roles.includes(actor.role));
  const timeout = approval ? configuredApprovalTimeout(approval) : undefined;
  const rows = INITIATION_SIGNATURES.map((x) => ({
    ...x,
    ...round.signatures.find((s) => s.node === x.node),
  }));
  return (
    <>
      <InitiationHeader app={app} title="项目分级与决策" />
      <SourceSummary
        source={{
          ...round.source,
          expertOpinions: round.source.expertOpinions.map((row) => ({
            ...row,
            opinion: displayText(row.opinion) ?? "",
          })),
        }}
      />
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="项目分级依据">
            <p>
              规则{" "}
              {round.configurationSnapshot
                ? suggested?.ruleVersion
                : INITIATION_RULE.version}{" "}
              · 金额 {round.input.amount} 万元 · 毛利率{" "}
              {viewMargin ? `${suggested?.margin}%` : hiddenMargin} · 风险{" "}
              {round.riskLevel ?? "待确认"}
            </p>
            <Alert
              showIcon
              message={`推荐 ${suggested?.level} / ${suggested?.path}`}
              description={suggested?.reasons
                .map((reason) => displayText(reason))
                .join("；")}
            />
            <p>PMO 确认级别（可上调，不能低于规则下限）</p>
            <Select
              value={level}
              style={{ width: 160 }}
              disabled={actor.role !== "pmo" || round.status !== "待分级"}
              onChange={setLevel}
              options={["一般", "重点", "重大", "特大型"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Input.TextArea
              style={{ margin: "12px 0" }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="分级确认或人工调整的具体依据"
              disabled={actor.role !== "pmo" || round.status !== "待分级"}
            />
            <Select
              mode="tags"
              style={{ width: "100%", marginBottom: 12 }}
              disabled={actor.role !== "pmo" || round.status !== "待分级"}
              value={requiredDeliverables}
              onChange={setRequiredDeliverables}
              placeholder="PMO 补充必须交付物（系统必交材料不可移除）"
            />
            <Button
              type="primary"
              disabled={actor.role !== "pmo" || round.status !== "待分级"}
              onClick={() =>
                run(() =>
                  dispatch(
                    {
                      type: "classify-initiation",
                      id: app.id,
                      level,
                      reason,
                      requiredDeliverables,
                    },
                    actor,
                  ),
                )
              }
            >
              确认分级与审批路径
            </Button>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="当前决策路径">
            <Tag color="blue">{round.path ?? "风险报告确认后分级"}</Tag>
            <p>
              {round.ruleReasons
                .map((reason) => displayText(reason))
                .join("；")}
            </p>
            <p>
              分级说明：
              {displayText(round.classificationReason) ?? "待 PMO 确认"}
            </p>
            <p>
              综合风险判断：{displayText(round.riskExplanation) ?? "待风险评估"}
            </p>
            <Alert
              showIcon
              type="info"
              message="线上会签保留六个独立节点。法务由 PMO 演示代办；技术与方案由方案技术角色分别签署。"
            />
          </Card>
        </Col>
      </Row>
      {round.path === "线上会签" && (
        <Card style={{ marginTop: 16 }} title="专业会签">
          <Table
            rowKey="node"
            pagination={false}
            dataSource={rows}
            columns={[
              { title: "会签节点", dataIndex: "node" },
              { title: "演示办理角色", dataIndex: "role" },
              {
                title: "签署人",
                dataIndex: "by",
                render: (v) => v ?? "待签署",
              },
              { title: "结论", dataIndex: "conclusion" },
              {
                title: "意见",
                dataIndex: "opinion",
                render: (v) => displayText(v),
              },
              { title: "日期", dataIndex: "date" },
            ]}
          />
          <Space style={{ marginTop: 16 }}>
            <Select
              style={{ width: 200 }}
              placeholder="选择本人待办节点"
              value={node || undefined}
              onChange={setNode}
              options={rows
                .filter((r) => r.role === actor.role && !r.by)
                .map((r) => ({ value: r.node, label: r.node }))}
            />
            <Select
              value={signConclusion}
              onChange={setSignConclusion}
              options={["同意", "否决"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Button
              disabled={round.status !== "会签中" || !node}
              onClick={() =>
                run(() =>
                  dispatch(
                    {
                      type: "sign-initiation",
                      id: app.id,
                      node,
                      conclusion: signConclusion,
                      opinion,
                    },
                    actor,
                  ),
                )
              }
            >
              签署当前节点
            </Button>
          </Space>
        </Card>
      )}
      {approval && (
        <Card title="本轮正式决策路径（CF 快照）" style={{ marginTop: 16 }}>
          <Alert
            showIcon
            message={`${approval.snapshot.ruleVersion} · ${displayText(approval.snapshot.reason)}`}
            description={`当前节点：${activeNode?.name ?? "已完成"}；${timeout?.overdue ? "已超时" : "未超时"}，已用 ${timeout?.elapsedDays ?? 0} / ${timeout?.timeoutDays ?? 0} 天。六专业签署与正式决策分别留痕。`}
          />
          <Table
            style={{ marginTop: 12 }}
            rowKey={(_, i) => String(i)}
            pagination={false}
            dataSource={approval.snapshot.nodes}
            columns={[
              { title: "节点", dataIndex: "name" },
              {
                title: "角色条件",
                render: (_, n) =>
                  `${n.roles.join(" / ")} · ${n.mode === "all" ? "全部签署" : "任一签署"}`,
              },
              {
                title: "状态",
                render: (_, _n, i) =>
                  i < approval.node || approval.status === "通过"
                    ? "已通过"
                    : i === approval.node
                      ? "当前节点"
                      : "待前序完成",
              },
              {
                title: "本节点签署",
                render: (_, _n, i) =>
                  approval.reviews
                    .filter((r) => r.node === i)
                    .map((r) => `${r.by}：${displayText(r.opinion)}`)
                    .join("；") || "尚无",
              },
            ]}
          />
        </Card>
      )}
      <Card title="决策办理" style={{ marginTop: 16 }}>
        <Alert
          showIcon
          type="warning"
          message="通过后生成正式项目并继承可追溯前期成本；PMO 任命主 PM、候选人接受后开始策划。"
        />
        <p>办理意见（会签与决策均须填写）</p>
        <Input.TextArea
          rows={3}
          disabled={ended}
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
        />
        {round.path && round.path !== "线上会签" && (
          <>
            <Space style={{ marginTop: 16 }}>
              <span>会议日期</span>
              <DatePicker
                disabled={ended}
                value={meetingDate ? dayjs(meetingDate) : null}
                onChange={(v) => setMeetingDate(v?.format("YYYY-MM-DD") ?? "")}
              />
              <Select
                disabled={ended}
                mode="multiple"
                style={{ width: 350 }}
                placeholder="至少两位参会人"
                value={participants}
                onChange={setParticipants}
                options={mockUsers.map((u) => ({ value: u.id, label: u.name }))}
              />
            </Space>
            <Input.TextArea
              disabled={ended}
              rows={3}
              style={{ marginTop: 12 }}
              placeholder="会议纪要与表决结果"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </>
        )}
        <Space style={{ margin: "16px 0" }}>
          <span>决策结果</span>
          <Select
            disabled={ended}
            value={result}
            onChange={setResult}
            options={["通过", "整改", "否决", "暂缓"].map((value) => ({
              value,
              label: value,
            }))}
          />
          {result === "暂缓" && (
            <DatePicker
              placeholder="复评日期"
              value={resumeDate ? dayjs(resumeDate) : null}
              onChange={(v) => setResumeDate(v?.format("YYYY-MM-DD") ?? "")}
            />
          )}
        </Space>
        {result === "整改" && (
          <>
            <Button
              onClick={() =>
                setRectifications([
                  ...rectifications,
                  { content: "", ownerId: "", deadline: "" },
                ])
              }
            >
              添加整改项
            </Button>
            {rectifications.map((r, i) => (
              <Space key={i} style={{ display: "flex", margin: "12px 0" }}>
                <Input
                  placeholder="整改事项"
                  value={r.content}
                  onChange={(e) =>
                    setRectifications((rows) =>
                      rows.map((x, j) =>
                        j === i ? { ...x, content: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Select
                  style={{ width: 140 }}
                  placeholder="责任人"
                  value={r.ownerId || undefined}
                  options={mockUsers.map((u) => ({
                    value: u.id,
                    label: u.name,
                  }))}
                  onChange={(ownerId) =>
                    setRectifications((rows) =>
                      rows.map((x, j) => (j === i ? { ...x, ownerId } : x)),
                    )
                  }
                />
                <DatePicker
                  value={r.deadline ? dayjs(r.deadline) : null}
                  onChange={(v) =>
                    setRectifications((rows) =>
                      rows.map((x, j) =>
                        j === i
                          ? { ...x, deadline: v?.format("YYYY-MM-DD") ?? "" }
                          : x,
                      ),
                    )
                  }
                />
              </Space>
            ))}
          </>
        )}
        {["否决", "暂缓"].includes(result) && (
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: 16 }}
          >
            <Input.TextArea
              value={costDisposition}
              onChange={(e) => setCostDisposition(e.target.value)}
              placeholder="沉没成本处置与复盘计划（登记说明，不自动冲销已发生成本）"
            />
            <Select
              value={trackingOwnerId || undefined}
              placeholder="跟踪责任人"
              style={{ width: 200 }}
              onChange={setTrackingOwnerId}
              options={mockUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Space>
        )}
        <div>
          <Button
            type="primary"
            disabled={ended || !canDecide}
            onClick={() =>
              modal.confirm({
                title: `确认立项${result}？`,
                content: "本轮提交资料、专业意见与决策结果将留存。",
                onOk: () => {
                  try {
                    dispatch(
                      {
                        type: "decide-initiation",
                        id: app.id,
                        result,
                        opinion,
                        meetingDate,
                        participants,
                        minutes,
                        rectifications,
                        resumeDate,
                        costDisposition,
                        trackingOwnerId,
                      },
                      actor,
                    );
                    message.success("决策已记录");
                  } catch (e) {
                    message.error((e as Error).message);
                    return Promise.reject(e);
                  }
                },
              })
            }
          >
            {result === "通过" && activeNode
              ? `通过当前节点：${activeNode.name}`
              : "提交决策"}
          </Button>
        </div>
      </Card>
      {app.status === "暂缓" && (
        <Card title="暂缓复评跟踪" style={{ marginTop: 16 }}>
          <p>
            原复评日期：{round.decision?.resumeDate} · 跟踪责任：
            {round.decision?.trackingOwnerId}
          </p>
          <Input.TextArea
            value={resumeReason}
            onChange={(e) => setResumeReason(e.target.value)}
            placeholder="复评触发依据与风险变化"
          />
          <Button
            disabled={actor.role !== "pmo"}
            style={{ marginTop: 12 }}
            onClick={() =>
              run(() =>
                dispatch(
                  {
                    type: "resume-initiation",
                    id: app.id,
                    reason: resumeReason,
                  },
                  actor,
                ),
              )
            }
          >
            恢复为草稿并重新提交评审
          </Button>
        </Card>
      )}
      {viewMargin ? (
        <InitiationHistory app={app} />
      ) : (
        <Card title="评审轮次与整改留痕">
          <p>历史意见可能包含毛利，当前仅展示轮次状态及来源。</p>
          {app.rounds.map((r) => (
            <p key={r.revision}>
              修订 {r.revision} · {r.status} · {r.source.estimate.id}
            </p>
          ))}
        </Card>
      )}
    </>
  );
}
