import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewSensitiveField } from "@/mock/configuration-access";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Upload,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useBusinessStore } from "@/mock/business";
import {
  assessmentSummary,
  canManageOpportunity,
  canViewOpportunity,
  DIMENSIONS,
  OPPORTUNITY_RULE,
  opportunityMeta,
} from "@/mock/opportunities";
import type { AssessmentDimension } from "@/models/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { MoneyText } from "@/components/common/MoneyText";
import { PAGE_MANIFEST } from "@/routes/manifest";
import { OpportunityActions } from "./OpportunityActions";
export function OpportunityAssessmentPage() {
 const {canDo}=useActionAccess();
  const { id } = useParams();
  const { data, dispatch } = useBusinessStore();
  const actor = useAppStore((s) => s.currentUser);
  const viewMargin = canViewSensitiveField(data, actor, "margin");
  const hiddenMargin = "毛利字段无查看权限";
  const displayText = (value?: string) =>
    !viewMargin && /毛利|gross.?margin/i.test(value ?? "")
      ? hiddenMargin
      : value;
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [dimension, setDimension] = useState<AssessmentDimension>();
  const [form] = Form.useForm();
  const [reason, setReason] = useState("");
  const [selectedRound, setSelectedRound] = useState<string>();
  const o = data.opportunities.find((o) => o.id === id);
  if (!o) return <StateView type="404" />;
  if (!canViewOpportunity(data, o, actor)) return <StateView type="403" />;
  const m = opportunityMeta(data, o);
  const latest = m.assessments.at(-1);
  const round = m.assessments.find((r) => r.id === selectedRound) ?? latest;
  const summary = assessmentSummary(o, {
    ...m,
    assessments: round ? [round] : [],
  });
  const history = round?.id !== latest?.id;
  const manage = canManageOpportunity(data, o, actor);
  const canConclude=manage&&!history&&round?.status==='评估中'&&canDo('conclude-opportunity',o.id);
  const canSaveDimension=!history&&round?.status==='评估中'&&canDo('save-opportunity-dimension',o.id);
  const hiddenOpinion = (key: AssessmentDimension) =>
    !viewMargin &&
    (key === "margin" ||
      [round?.opinions[key]?.note, round?.opinions[key]?.risk].some(
        (value) => displayText(value) === hiddenMargin,
      ));
  const edit = (key: AssessmentDimension) => {
    if (hiddenOpinion(key)) return;
    setDimension(key);
    form.resetFields();
    const opinion = round?.opinions[key];
    form.setFieldsValue({
      ...opinion,
      files: opinion?.attachment
        ? [{ uid: "1", name: opinion.attachment, status: "done" }]
        : [],
    });
  };
  const conclude = (conclusion: "跟进中" | "拟立项") => {
    if (!reason.trim()) {
      message.error("请填写综合决策原因");
      return;
    }
    modal.confirm({
      okButtonProps:{disabled:!canConclude},
      title: `确认${conclusion === "拟立项" ? "转为拟立项" : "继续跟进"}？`,
      content:
        "本轮专业意见与综合结果将形成只读历史快照。拟立项后锁定关键商机信息，并自动生成方案调研任务。",
      onOk: () => {
        try {
          dispatch(
            { type: "conclude-opportunity", id: o.id, conclusion, reason },
            actor,
          );
          message.success("已保存本轮结论");
        } catch (e) {
          message.error((e as Error).message);
          return Promise.reject(e);
        }
      },
    });
  };
  return (
    <>
      <PageHeader
        item={PAGE_MANIFEST.find((p) => p.id === "GS-04")}
        breadcrumbs={[
          { title: "商机台账", href: "/opportunities" },
          { title: o.name, href: `/opportunities/${o.id}` },
          { title: "商机初步评估" },
        ]}
        description={`${o.code} · ${o.customerName} · 预计金额 ${o.estimatedAmount.toFixed(2)} 万元`}
        extra={
          <Button onClick={() => navigate(`/opportunities/${o.id}`)}>
            返回商机
          </Button>
        }
      />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`${OPPORTUNITY_RULE.name} · ${summary.rule.version}`}
        description={`六维意见全部提交、综合评分≥${summary.rule.minimumScore}、毛利率≥${summary.rule.minimumMargin}%且无不可行项，才建议拟立项。市场负责客户/商务/竞争，方案技术负责技术/交付，财务负责收益毛利；主办仅汇总，不能代改专业意见。`}
      />
      <Row gutter={16}>
        <Col span={16}>
          <Card
            size="small"
            title="专业评估工作区"
            extra={
              <Select
                aria-label="评估轮次"
                placeholder="评估轮次"
                style={{ width: 190 }}
                value={round?.id}
                onChange={setSelectedRound}
                options={[...m.assessments].reverse().map((r) => ({
                  value: r.id,
                  label: `V${r.version} · ${r.status}`,
                }))}
              />
            }
          >
            {!round ? (
              <>
                <Empty description="尚未发起初步评估" />
                {manage && <OpportunityActions opportunity={o} />}
              </>
            ) : (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Tag color={round.status === "评估中" ? "blue" : "green"}>
                    {round.status}
                  </Tag>
                  <span>发起日期 {round.startedAt}</span>
                  <span>
                    已提交 {summary.complete} / 6 维 · 模板{" "}
                    {round.templateSnapshot?.id ?? "历史六维模板"}
                  </span>
                  {history && <Tag>历史只读</Tag>}
                </Space>
                <Table
                  size="small"
                  rowKey="key"
                  pagination={false}
                  dataSource={DIMENSIONS}
                  columns={[
                    {
                      title: "评估维度",
                      width: 130,
                      render: (_, d) => (
                        <>
                          <strong>{d.name}</strong>
                          <div>
                            权重{" "}
                            {round.templateSnapshot?.rows.find(
                              (r) =>
                                r.id ===
                                `item-${DIMENSIONS.findIndex((x) => x.key === d.key) + 1}`,
                            )?.weight ?? 1}
                          </div>
                          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                            {d.role === "market"
                              ? "市场 / 主办"
                              : d.role === "finance"
                                ? "财务"
                                : "方案 / 技术"}
                          </div>
                        </>
                      ),
                    },
                    {
                      title: "专业评分 / 结论",
                      width: 145,
                      render: (_, d) => {
                        const v = round.opinions[d.key];
                        if (hiddenOpinion(d.key)) return hiddenMargin;
                        return v ? (
                          <>
                            <strong>{v.score} 分</strong>
                            <br />
                            <Tag
                              color={
                                v.conclusion === "不可行"
                                  ? "red"
                                  : v.conclusion === "有条件可行"
                                    ? "orange"
                                    : "green"
                              }
                            >
                              {v.conclusion}
                            </Tag>
                          </>
                        ) : (
                          "待提交"
                        );
                      },
                    },
                    {
                      title: "说明与风险",
                      render: (_, d) => {
                        const v = round.opinions[d.key];
                        if (hiddenOpinion(d.key)) return hiddenMargin;
                        return (
                          <>
                            <div>{displayText(v?.note) ?? d.prompt}</div>
                            {v?.risk && (
                              <div style={{ color: "#d46b08" }}>
                                风险：{displayText(v.risk)}
                              </div>
                            )}
                            {v?.attachment && (
                              <div style={{ fontSize: 12 }}>
                                材料：{v.attachment}
                              </div>
                            )}
                            {v && (
                              <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                                {v.by} · {v.date}
                              </div>
                            )}
                          </>
                        );
                      },
                    },
                    {
                      title: "操作",
                      width: 90,
                      render: (_, d) => (
                        <Button
                          size="small"
                          disabled={
                            !canSaveDimension ||
                            history ||
                            round.status !== "评估中" ||
                            actor.role !== d.role ||
                            hiddenOpinion(d.key)
                          }
                          onClick={() => edit(d.key)}
                        >
                          填写意见
                        </Button>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </Card>
          <Card size="small" title="毛利预判（万元）" style={{ marginTop: 16 }}>
            <Descriptions
              column={2}
              items={[
                {
                  key: "income",
                  label: "预计收入",
                  children: <MoneyText value={o.estimatedAmount} />,
                },
                {
                  key: "cost",
                  label: "财务初步成本",
                  children: <MoneyText value={summary.cost} />,
                },
                {
                  key: "margin",
                  label: "预估毛利",
                  children: viewMargin ? (
                    <MoneyText value={summary.margin} />
                  ) : (
                    hiddenMargin
                  ),
                },
                {
                  key: "rate",
                  label: "预估毛利率",
                  children: !viewMargin
                    ? hiddenMargin
                    : summary.marginRate === null
                      ? "—"
                      : `${summary.marginRate.toFixed(1)}%`,
                },
              ]}
            />
            <p style={{ color: "#8c8c8c" }}>
              预估毛利＝预计收入−初步成本；此处为初评测算，正式概算以冻结版本为准。
            </p>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="综合评估与条件检查">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="综合评分"
                  value={summary.score ?? "—"}
                  suffix={summary.score !== null ? "分" : undefined}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="风险等级"
                  value={round ? summary.riskLevel : "—"}
                />
              </Col>
            </Row>
            <Alert
              style={{ marginTop: 16 }}
              type={summary.missing.length ? "warning" : "success"}
              showIcon
              message={`系统建议：${summary.suggestion}`}
              description={
                summary.missing.length
                  ? summary.missing.map((x) => <div key={x}>• {x}</div>)
                  : "六维条件满足，由主办确认是否拟立项。"
              }
            />
            {round?.status === "已确认" ? (
              <Descriptions
                style={{ marginTop: 16 }}
                column={1}
                size="small"
                items={[
                  {
                    key: "conclusion",
                    label: "已确认结论",
                    children: round.conclusion,
                  },
                  { key: "reason", label: "决策原因", children: round.reason },
                  {
                    key: "date",
                    label: "确认日期",
                    children: round.confirmedAt,
                  },
                  {
                    key: "rule",
                    label: "规则快照",
                    children: round.ruleVersion,
                  },
                ]}
              />
            ) : (
              manage &&
              round && (
                <>
                  <Form layout="vertical" disabled={!canConclude} style={{ marginTop: 16 }}>
                    <Form.Item required label="综合决策原因">
                      <Input.TextArea
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="结合系统建议说明推进、风险处置与客户沟通依据"
                      />
                    </Form.Item>
                  </Form>
                  <Space wrap>
                    <Button
                      type="primary"
                      disabled={!canConclude || summary.missing.length > 0}
                      onClick={() => conclude("拟立项")}
                    >
                      确认拟立项
                    </Button>
                    <Button
                      disabled={!canConclude || summary.complete < 6}
                      onClick={() => conclude("跟进中")}
                    >
                      继续跟进
                    </Button>
                  </Space>
                </>
              )
            )}
            {manage && !history && (
              <div style={{ marginTop: 16 }}>
                <OpportunityActions opportunity={o} />
              </div>
            )}
            {m.solutionTask && (
              <Alert
                style={{ marginTop: 16 }}
                type="success"
                message="已生成方案调研任务"
                description={
                  <>
                    <p>
                      {m.solutionTask.id} · {m.solutionTask.ownerName}
                    </p>
                    <Button
                      onClick={() =>
                        navigate(`/opportunities/${o.id}/solution`)
                      }
                    >
                      进入方案任务
                    </Button>
                  </>
                }
              />
            )}
          </Card>
        </Col>
      </Row>
      <Modal
        title={`填写${DIMENSIONS.find((d) => d.key === dimension)?.name ?? ""}专业意见`}
        open={!!dimension}
        okButtonProps={{disabled:!canSaveDimension||!dimension||DIMENSIONS.find(d=>d.key===dimension)?.role!==actor.role||hiddenOpinion(dimension)}}
        onCancel={() => setDimension(undefined)}
        okText="保存本专业意见"
        onOk={async () => {
          try {
            const v = await form.validateFields();
            dispatch(
              {
                type: "save-opportunity-dimension",
                id: o.id,
                dimension: dimension!,
                opinion: {
                  score: v.score,
                  conclusion: v.conclusion,
                  note: v.note,
                  risk: v.risk ?? "",
                  attachment: v.files?.[0]?.name ?? "",
                  preliminaryCost:
                    dimension === "margin" ? v.preliminaryCost : undefined,
                },
              },
              actor,
            );
            setDimension(undefined);
            message.success("专业意见已保存");
          } catch (e) {
            if (e instanceof Error) message.error(e.message);
          }
        }}
      >
        <Form form={form} layout="vertical" disabled={!canSaveDimension||!dimension||DIMENSIONS.find(d=>d.key===dimension)?.role!==actor.role||hiddenOpinion(dimension)}>
          <Form.Item
            name="score"
            label="评分（0–100）"
            rules={[{ required: true, type: "number", min: 0, max: 100 }]}
          >
            <InputNumber min={0} max={100} />
          </Form.Item>
          <Form.Item
            name="conclusion"
            label="专业结论"
            rules={[{ required: true }]}
          >
            <Select
              options={["可行", "有条件可行", "不可行"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          {dimension === "margin" && (
            <Form.Item
              name="preliminaryCost"
              label="初步总成本（万元）"
              rules={[{ required: true, type: "number", min: 0 }]}
            >
              <InputNumber min={0} precision={2} />
            </Form.Item>
          )}
          <Form.Item
            name="note"
            label="评估说明"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="risk" label="风险项与应对建议">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="files"
            label="专业附件"
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
            extra="仅保存文件名，供评估材料追溯。"
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>选择附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
