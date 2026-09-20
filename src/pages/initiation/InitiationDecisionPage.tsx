import { useActionAccess } from '@/hooks/useActionAccess';
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
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useBusinessStore } from "@/mock/store";
import { useAppStore } from "@/store/useAppStore";
import { mockUsers } from "@/mock";
import {
  INITIATION_RULE,
  INITIATION_SIGNATURES,
  initiationClassification,
} from "@/mock/initiation";
import type { Project } from "@/models/types";
import { PageSection } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import {
  InitiationHeader,
  InitiationHistory,
  SourceSummary,
  useInitiationNavigation,
} from "./InitiationShared";
export function InitiationDecisionPage() {
 const {canDo}=useActionAccess();
  const { id } = useParams();
  const { data, dispatch } = useBusinessStore();
  const navigate = useNavigate();
  const actor = useAppStore((s) => s.currentUser);
  const { go } = useInitiationNavigation();
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
  if (!app) {
    return (
      <StateView
        type="empty"
        title="暂无指定立项申请"
        subTitle={
          id
            ? `未找到单号为「${id}」的立项决策申请单。您可以前往立项评审工作台查看待决策项目。`
            : "请先在立项评审工作台选择目标申请进行评审决策。"
        }
        actionText="前往立项评审工作台"
        onAction={() => go("/initiation/review")}
      />
    );
  }
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
  const canDecide = canDo("decide-initiation",app.id) && (
    result === "通过"
      ? activeNode
        ? activeNode.roles.includes(actor.role)
        : actor.role === decisionRole
      : actor.role === decisionRole ||
        (result === "否决" && !!activeNode?.roles.includes(actor.role)));
  const canDecisionFields=canDo("decide-initiation",app.id)&&(actor.role===decisionRole||!!activeNode?.roles.includes(actor.role));
  const canSign=round.status==="会签中"&&canDo("sign-initiation",app.id)&&INITIATION_SIGNATURES.some(n=>n.role===actor.role&&!round.signatures.some(s=>s.node===n.node));
  const canClassify=actor.role==="pmo"&&round.status==="待分级"&&canDo("classify-initiation",app.id);
  const canResume=actor.role==="pmo"&&app.status==="暂缓"&&canDo("resume-initiation",app.id);
  const timeout = approval ? configuredApprovalTimeout(approval) : undefined;
  const rows = INITIATION_SIGNATURES.map((x) => ({
    ...x,
    ...round.signatures.find((s) => s.node === x.node),
  }));
  return (
    <>
      <InitiationHeader app={app} title="项目分级与决策" />
      <PageSection title="当前办理节点" description={ended ? '本轮已结束，原申请版本与历史记录保留' : '根据当前风险、分级和角色完成本人节点'}>
        <Space wrap size={24}><span>评审阶段 <Tag color="processing">{round.status}</Tag></span><span>审批路径 <strong>{round.path ?? '待风险评估与分级'}</strong></span><span>当前节点 <strong>{activeNode?.name ?? (round.status === '会签中' ? '六专业会签' : '待分级')}</strong></span></Space>
        {round.ruleReasons.length > 0 && <p style={{ color: '#64748b', marginBottom: 0 }}>{round.ruleReasons.map((reason) => displayText(reason)).join('；')}</p>}
      </PageSection>
      <details open={round.status === '待分级'} style={{ margin: '16px 0' }}><summary style={{ cursor: 'pointer', padding: '8px 0' }}>项目分级依据与审批路径 · {round.level ?? suggested?.level} · 综合风险 {round.riskLevel ?? '待确认'}</summary>
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
              aria-label="确认项目级别"
              value={level}
              style={{ width: 160 }}
              disabled={!canClassify}
              onChange={setLevel}
              options={["一般", "重点", "重大", "特大型"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Input.TextArea
              style={{ margin: "12px 0" }}
              aria-label="分级确认依据"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="分级确认或人工调整的具体依据"
              disabled={!canClassify}
            />
            <Select
              aria-label="PMO补充必须交付物"
              mode="tags"
              style={{ width: "100%", marginBottom: 12 }}
              disabled={!canClassify}
              value={requiredDeliverables}
              onChange={setRequiredDeliverables}
              placeholder="PMO 补充必须交付物（系统必交材料不可移除）"
            />
            <Button
              type="primary"
              disabled={!canClassify}
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
      </Row></details>
      <PageSection title="办理意见" description="会签与决策共用本次意见，提交后写入各自记录">
        <p>办理意见（会签与决策均须填写）</p>
        <Input.TextArea
          aria-label="立项办理意见"
          rows={3}
          disabled={ended || (!canDecisionFields && !canSign)}
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
        />
      </PageSection>
      {round.path === "线上会签" && (
        <details open={round.status === "会签中"} style={{ marginTop: 16 }}><summary style={{ cursor: "pointer", padding: "8px 0" }}>专业会签 · 已签 {round.signatures.length} / 6 个节点</summary><Card title="专业会签">
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
              disabled={!canSign} placeholder="选择本人待办节点"
              aria-label="本人会签节点"
              value={node || undefined}
              onChange={setNode}
              options={rows
                .filter((r) => r.role === actor.role && !r.by)
                .map((r) => ({ value: r.node, label: r.node }))}
            />
            <Select
              aria-label="专业会签结论"
              disabled={!canSign} value={signConclusion}
              onChange={setSignConclusion}
              options={["同意", "否决"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Button
              disabled={!canSign || !node}
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
        </Card></details>
      )}
      {approval && (
        <details style={{ margin: "16px 0" }}><summary style={{ cursor: "pointer", padding: "8px 0" }}>正式审批节点与签署记录 · {activeNode?.name ?? "已完成"}</summary><Card title="本轮正式决策路径（CF 快照）">
          <Alert
            showIcon
            message={`${approval.snapshot.ruleVersion} · ${displayText(approval.snapshot.reason)}`}
            description={`当前节点：${activeNode?.name ?? "已完成"}；${timeout?.overdue ? "已超时" : "未超时"}，已用 ${timeout?.elapsedDays ?? 0} / ${timeout?.timeoutDays ?? 0} 天。六专业签署与正式决策分别留痕。`}
          />
          <Table
            style={{ marginTop: 12 }}
            rowKey="key"
            pagination={false}
            dataSource={approval.snapshot.nodes.map((node, index) => ({ ...node, key: index }))}
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
        </Card></details>
      )}
      <Card title="决策办理" style={{ marginTop: 16 }}>
        <Alert
          showIcon
          type="warning"
          message="通过后生成正式项目并继承可追溯前期成本；PMO 任命主 PM、候选人接受后开始策划。"
        />
        {round.path && round.path !== "线上会签" && (
          <>
            <Space style={{ marginTop: 16 }}>
              <span>会议日期</span>
              <DatePicker
                aria-label="决策会议日期"
                disabled={ended || !canDecisionFields}
                value={meetingDate ? dayjs(meetingDate) : null}
                onChange={(v) => setMeetingDate(v?.format("YYYY-MM-DD") ?? "")}
              />
              <Select
                disabled={ended || !canDecisionFields}
                aria-label="决策参会人"
                mode="multiple"
                style={{ width: 350 }}
                placeholder="至少两位参会人"
                value={participants}
                onChange={setParticipants}
                options={mockUsers.map((u) => ({ value: u.id, label: u.name }))}
              />
            </Space>
            <Input.TextArea
              disabled={ended || !canDecisionFields}
              rows={3}
              style={{ marginTop: 12 }}
              aria-label="会议纪要与表决结果"
              placeholder="会议纪要与表决结果"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </>
        )}
        <Space style={{ margin: "16px 0" }}>
          <span>决策结果</span>
          <Select
            disabled={ended || !canDecisionFields}
            aria-label="立项决策结果"
            value={result}
            onChange={setResult}
            options={["通过", "整改", "否决", "暂缓"].map((value) => ({
              value,
              label: value,
            }))}
          />
          {result === "暂缓" && (
            <DatePicker aria-label="暂缓复评日期" disabled={ended || !canDecisionFields}
              placeholder="复评日期"
              value={resumeDate ? dayjs(resumeDate) : null}
              onChange={(v) => setResumeDate(v?.format("YYYY-MM-DD") ?? "")}
            />
          )}
        </Space>
        {result === "整改" && (
          <>
            <Button
              disabled={ended || !canDecisionFields}
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
                <Input disabled={ended || !canDecisionFields}
                  aria-label={`整改事项${i + 1}`}
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
                <Select disabled={ended || !canDecisionFields}
                  style={{ width: 140 }}
                  aria-label={`整改责任人${i + 1}`}
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
                <DatePicker aria-label={`整改截止日期${i + 1}`} disabled={ended || !canDecisionFields}
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
            <Input.TextArea disabled={ended || !canDecisionFields}
              aria-label="沉没成本处置说明"
              value={costDisposition}
              onChange={(e) => setCostDisposition(e.target.value)}
              placeholder="沉没成本处置与复盘计划（登记说明，不自动冲销已发生成本）"
            />
            <Select disabled={ended || !canDecisionFields}
              aria-label="跟踪责任人"
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
                    if (!canDo("decide-initiation",app.id)||!canDecide) throw new Error("当前策略不允许提交此决策");
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
                    if (result === "通过") {
                      const createdProject = useBusinessStore.getState().data.projects.find(p => p.opportunityId === app.input.opportunityId);
                      if (createdProject) navigate(`/projects/${createdProject.id}`);
                    }
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
            aria-label="复评触发依据"
            disabled={!canResume} value={resumeReason}
            onChange={(e) => setResumeReason(e.target.value)}
            placeholder="复评触发依据与风险变化"
          />
          <Button
            disabled={!canResume}
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
      <PageSection title="本轮来源资料">
      <SourceSummary compact
        source={{
          ...round.source,
          expertOpinions: round.source.expertOpinions.map((row) => ({
            ...row,
            opinion: displayText(row.opinion) ?? "",
          })),
        }}
      />
      </PageSection>
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
