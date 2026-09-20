import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { PageSection } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/store";
import { confirmedReportedAmount, reportAmount } from "@/mock/acceptance";
import { visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { AcceptanceReport } from "@/models/settlement";
import { AS_OF_DATE } from "@/mock";
import { sumMoney } from "@/utils/money";

type Draft = Omit<AcceptanceReport, "id" | "status" | "submittedBy">;
export function ReportAcceptancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [selected, setSelected] = useState<string>();
  const [review, setReview] = useState<boolean>();
  const [opinion, setOpinion] = useState("");
  const [search, setSearch] = useState("");
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const pm = currentRole === "project-manager" && p.pmId === currentUser.id;
  const locked =
    data.lockedProjects.includes(p.id) || ["运维", "已关闭"].includes(p.phase);
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const contracts = data.contracts.filter(
    (c) => c.projectId === p.id && c.status !== "已终止",
  );
  const rows = data.acceptanceReports.filter((r) => r.projectId === p.id);
  const row = rows.find((r) => r.id === selected);
  const contract = contracts.find((c) => c.id === draft?.contractId);
  const acceptances = data.acceptances.filter(
    (a) =>
      a.projectId === p.id &&
      a.type === "客户终验" &&
      a.status === "已通过" &&
      data.acceptanceDetails[a.id]?.contractId === draft?.contractId,
  );
  const canSave =
    pm && !locked && canDo("save-acceptance-report", editing ?? p.id);
  const canConfirm =
    currentRole === "finance" &&
    !locked &&
    row?.status === "待确认" &&
    canDo("confirm-acceptance-report", row.id);
  const begin = (r?: AcceptanceReport) => {
    if (!canSave) return;
    setEditing(r?.id);
    setDraft(
      r
        ? structuredClone(r)
        : {
            projectId: p.id,
            contractId: contracts[0]?.id ?? "",
            acceptanceId: "",
            batchNo: "",
            reportType: "阶段报验",
            date: AS_OF_DATE,
            taxLines: [{ taxRate: 6, amount: 0 }],
            materials: [],
            note: "",
          },
    );
  };
  const save = (submit: boolean) => {
    if (!canSave) return;
    try {
      dispatch(
        { type: "save-acceptance-report", report: draft!, id: editing, submit },
        actor,
      );
      setDraft(undefined);
      message.success(submit ? "报验已提交财务确认" : "报验草稿已保存");
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  const formatted = (value: number) =>
    value.toLocaleString("zh-CN", { maximumFractionDigits: 6 });
  const contractTotal = sumMoney(contracts.map((item) => item.amount));
  const confirmedTotal = sumMoney(rows.filter((item) => item.status === "已确认").map(reportAmount));
  const pendingTotal = sumMoney(rows.filter((item) => item.status === "待确认").map(reportAmount));
  const availableTotal = sumMoney([contractTotal, -confirmedTotal, -pendingTotal]);
  return (
    <>
      <PageHeader
        title="JS-04 项目报验"
        description={`${p.id} · ${p.name} · 分批、分税点报验`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "项目报验" },
        ]}
        extra={
          <Space>
            <Button
              onClick={() => navigate(`/projects/${p.id}/customer-acceptance`)}
            >
              客户验收原单
            </Button>
            <Button
              type="primary"
              disabled={!canSave || !contracts.length}
              onClick={() => begin()}
            >
              新建报验
            </Button>
          </Space>
        }
      />
      <Alert
        showIcon
        style={{ marginBottom: 16 }}
        type="info"
        message="演示规则 RPT-1：同合同批次唯一；累计报验只汇总财务已确认原单，待确认金额占用可报额度。验收金额通过报验单计量，不重复叠加验收轮次金额。"
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}><MetricStatCard title="合同金额" value={contractTotal} /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="已确认报验" value={confirmedTotal} statusType="healthy" /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="待确认占用" value={pendingTotal} statusType={pendingTotal ? "warning" : "info"} /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="剩余可报" value={availableTotal} statusType={availableTotal < 0 ? "danger" : "info"} /></Col>
      </Row>
      <PageSection title="客户合同与累计报验" description="按合同汇总已确认、待确认占用与剩余可提交额度。">
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={contracts}
          columns={[
            {
              title: "合同",
              render: (_, c) => (
                <>
                  {c.code}
                  <div>{c.name}</div>
                </>
              ),
            },
            {
              title: "合同金额（万元）",
              align: "right",
              render: (_, c) => formatted(c.amount),
            },
            {
              title: "已确认报验（万元）",
              align: "right",
              render: (_, c) => formatted(confirmedReportedAmount(data, c.id)),
            },
            {
              title: "待确认占用（万元）",
              align: "right",
              render: (_, c) =>
                formatted(
                  sumMoney(
                    rows
                      .filter(
                        (r) => r.contractId === c.id && r.status === "待确认",
                      )
                      .map(reportAmount),
                  ),
                ),
            },
            {
              title: "剩余可提交（万元）",
              align: "right",
              render: (_, c) =>
                formatted(
                  sumMoney([
                    c.amount,
                    -sumMoney(
                      rows
                        .filter(
                          (r) =>
                            r.contractId === c.id &&
                            ["待确认", "已确认"].includes(r.status),
                        )
                        .map(reportAmount),
                    ),
                  ]),
                ),
            },
          ]}
        />
      </PageSection>
      <PageSection title="报验记录" description="按批次追踪草稿、财务待确认、退回与已确认状态。">
        <Space style={{ marginBottom: 12 }}>
          <Input
            aria-label="报验查询"
            placeholder="批次、编号或状态"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={() => setSearch("")}>重置</Button>
        </Space>
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: 900 }}
          dataSource={rows.filter((r) =>
            `${r.batchNo} ${r.id} ${r.status}`.includes(search),
          )}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          columns={[
            {
              title: "批次 / 报验编号",
              render: (_, r) => (
                <Button type="link" onClick={() => setSelected(r.id)}>
                  {r.batchNo} · {r.id}
                </Button>
              ),
            },
            { title: "类型", dataIndex: "reportType" },
            {
              title: "报验日期",
              dataIndex: "date",
              sorter: (a, b) => a.date.localeCompare(b.date),
            },
            {
              title: "本次含税（万元）",
              align: "right",
              sorter: (a, b) => reportAmount(a) - reportAmount(b),
              render: (_, r) => formatted(reportAmount(r)),
            },
            {
              title: "税点",
              render: (_, r) =>
                r.taxLines.map((l) => `${l.taxRate}%`).join(" / "),
            },
            {
              title: "状态",
              render: (_, r) => (
                <Tag
                  color={
                    r.status === "已确认"
                      ? "success"
                      : r.status === "退回"
                        ? "error"
                        : "processing"
                  }
                >
                  {r.status}
                </Tag>
              ),
            },
            {
              title: "操作",
              render: (_, r) => (
                <Button onClick={() => setSelected(r.id)}>详情</Button>
              ),
            },
          ]}
        />
      </PageSection>
      <Drawer
        width={760}
        title="报验原单"
        open={!!selected}
        onClose={() => setSelected(undefined)}
      >
        {row && (
          <>
            <Descriptions
              size="small"
              bordered
              column={2}
              items={[
                { key: "id", label: "报验单", children: row.id },
                { key: "batch", label: "批次", children: row.batchNo },
                {
                  key: "contract",
                  label: "关联客户合同",
                  children: row.contractId,
                },
                {
                  key: "acceptance",
                  label: "客户验收",
                  children: (
                    <Button
                      type="link"
                      onClick={() =>
                        navigate(
                          `/projects/${p.id}/customer-acceptance?record=${row.acceptanceId}`,
                        )
                      }
                    >
                      {row.acceptanceId}
                    </Button>
                  ),
                },
                { key: "status", label: "状态", children: row.status },
                {
                  key: "amount",
                  label: "含税金额",
                  children: `${formatted(reportAmount(row))} 万元`,
                },
                {
                  key: "materials",
                  label: "报验材料",
                  span: 2,
                  children: row.materials.join("、") || "尚未登记",
                },
                { key: "note", label: "报验说明", span: 2, children: row.note },
                {
                  key: "opinion",
                  label: "财务意见",
                  span: 2,
                  children: row.opinion ?? "尚未确认",
                },
              ]}
            />
            <Table
              style={{ marginTop: 16 }}
              rowKey="taxRate"
              size="small"
              pagination={false}
              dataSource={row.taxLines}
              columns={[
                { title: "税点", render: (_, l) => `${l.taxRate}%` },
                { title: "含税金额（万元）", dataIndex: "amount" },
                {
                  title: "不含税金额（万元）",
                  render: (_, l) => formatted(l.amount / (1 + l.taxRate / 100)),
                },
                {
                  title: "税额（万元）",
                  render: (_, l) =>
                    formatted(l.amount - l.amount / (1 + l.taxRate / 100)),
                },
              ]}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                disabled={!canSave || !["草稿", "退回"].includes(row.status)}
                onClick={() => begin(row)}
              >
                编辑报验
              </Button>
              <Button
                type="primary"
                disabled={!canConfirm}
                onClick={() => {
                  setReview(true);
                  setOpinion("");
                }}
              >
                确认报验金额
              </Button>
              <Button
                danger
                disabled={!canConfirm}
                onClick={() => {
                  setReview(false);
                  setOpinion("");
                }}
              >
                退回补充
              </Button>
            </Space>
          </>
        )}
      </Drawer>
      <Modal
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        zIndex={1200}
        width={800}
        title={editing ? "编辑项目报验" : "新建项目报验"}
        open={!!draft}
        onCancel={() => setDraft(undefined)}
        footer={
          <Space>
            <Button onClick={() => setDraft(undefined)}>取消</Button>
            <Button disabled={!canSave} onClick={() => save(false)}>
              保存草稿
            </Button>
            <Button
              type="primary"
              disabled={!canSave}
              onClick={() =>
                modal.confirm({
                  title: "确认提交本次报验？",
                  content:
                    "提交后金额占用本合同额度，由财务审核；退回后可修改。",
                  onOk: () => save(true),
                  okButtonProps: { disabled: !canSave },
                  zIndex: 1400,
                })
              }
            >
              提交财务确认
            </Button>
          </Space>
        }
      >
        {draft && (
          <Form layout="vertical" disabled={!canSave}>
            <Form.Item label="客户合同" required>
              <Select
                aria-label="报验合同"
                value={draft.contractId}
                onChange={(v) =>
                  setDraft({ ...draft, contractId: v, acceptanceId: "" })
                }
                options={contracts.map((c) => ({
                  value: c.id,
                  label: `${c.code} · ${c.amount} 万元`,
                }))}
              />
            </Form.Item>
            <Form.Item label="客户验收通过原单" required>
              <Select
                aria-label="关联客户验收"
                value={draft.acceptanceId || undefined}
                onChange={(v) => setDraft({ ...draft, acceptanceId: v })}
                options={acceptances.map((a) => ({
                  value: a.id,
                  label: `${a.id} · 第${a.round}轮 · ${a.status}`,
                }))}
              />
            </Form.Item>
            <Space>
              <Form.Item label="报验类型" required>
                <Select
                  style={{ width: 150 }}
                  value={draft.reportType}
                  onChange={(v) => setDraft({ ...draft, reportType: v })}
                  options={["阶段报验", "最终报验"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Form.Item>
              <Form.Item label="合同内唯一批次号" required>
                <Input
                  aria-label="报验批次号"
                  value={draft.batchNo}
                  onChange={(e) =>
                    setDraft({ ...draft, batchNo: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item label="报验日期" required>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Form.Item>
            </Space>
            <Form.Item label="分税点含税金额（万元）" required>
              <Table
                rowKey="taxRate"
                size="small"
                pagination={false}
                dataSource={draft.taxLines}
                columns={[
                  {
                    title: "税率",
                    render: (_, l, i) => (
                      <Select
                        aria-label={`第${i + 1}行税率`}
                        value={l.taxRate}
                        style={{ width: 110 }}
                        onChange={(v) =>
                          setDraft({
                            ...draft,
                            taxLines: draft.taxLines.map((line, n) =>
                              n === i ? { ...line, taxRate: v } : line,
                            ),
                          })
                        }
                        options={[0, 1, 3, 6, 9, 13].map((value) => ({
                          value,
                          label: `${value}%`,
                        }))}
                      />
                    ),
                  },
                  {
                    title: "含税金额",
                    render: (_, l, i) => (
                      <InputNumber
                        aria-label={`第${i + 1}行报验金额`}
                        min={0}
                        precision={6}
                        value={l.amount}
                        onChange={(v) =>
                          setDraft({
                            ...draft,
                            taxLines: draft.taxLines.map((line, n) =>
                              n === i ? { ...line, amount: v ?? 0 } : line,
                            ),
                          })
                        }
                      />
                    ),
                  },
                  {
                    title: "操作",
                    render: (_, l, i) => (
                      <Button
                        danger
                        disabled={!canSave || draft.taxLines.length === 1}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            taxLines: draft.taxLines.filter((_, n) => n !== i),
                          })
                        }
                      >
                        移除 {l.taxRate}%
                      </Button>
                    ),
                  },
                ]}
              />
              <Button
                style={{ marginTop: 8 }}
                disabled={!canSave || draft.taxLines.length === 6}
                onClick={() =>
                  setDraft({
                    ...draft,
                    taxLines: [
                      ...draft.taxLines,
                      {
                        taxRate:
                          [0, 1, 3, 6, 9, 13].find(
                            (r) => !draft.taxLines.some((l) => l.taxRate === r),
                          ) ?? 0,
                        amount: 0,
                      },
                    ],
                  })
                }
              >
                添加税点
              </Button>
            </Form.Item>
            <Alert
              type="info"
              message={`本次 ${formatted(reportAmount(draft))} 万元 · 已确认 ${formatted(confirmedReportedAmount(data, draft.contractId))} 万元 · 合同 ${formatted(contract?.amount ?? 0)} 万元`}
            />
            <Form.Item label="报验材料文件名（每行一份，仅前端登记）" required>
              <Input.TextArea
                aria-label="报验材料"
                value={draft.materials.join("\n")}
                onChange={(e) =>
                  setDraft({ ...draft, materials: e.target.value.split("\n") })
                }
              />
            </Form.Item>
            <Form.Item label="报验范围与说明" required>
              <Input.TextArea
                aria-label="报验说明"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
      <Modal
        zIndex={1400}
        title={review ? "财务确认报验金额" : "退回报验"}
        open={review !== undefined}
        onCancel={() => setReview(undefined)}
        okButtonProps={{ disabled: !canConfirm }}
        onOk={() => {
          if (!canConfirm) return;
          try {
            dispatch(
              {
                type: "confirm-acceptance-report",
                id: row!.id,
                approve: review!,
                opinion,
              },
              actor,
            );
            setReview(undefined);
            message.success("报验原单已更新");
          } catch (e) {
            message.error((e as Error).message);
          }
        }}
      >
        <Input.TextArea
          aria-label="报验财务意见"
          disabled={!canConfirm}
          rows={4}
          placeholder="财务确认/退回意见"
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
        />
      </Modal>
    </>
  );
}
