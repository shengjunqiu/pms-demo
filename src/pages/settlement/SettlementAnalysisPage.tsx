import { useActionAccess } from "@/hooks/useActionAccess";
import { canViewSensitiveField } from "@/mock/configuration-access";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tabs,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { MoneyText } from "@/components/common/MoneyText";
import { useBusinessStore } from "@/mock/business";
import {
  selectFourCalculations,
  selectReceipts,
  visibleProjects,
} from "@/mock/selectors";
import { settlementSnapshot } from "@/mock/settlement";
import { useAppStore } from "@/store/useAppStore";
import { AS_OF_DATE } from "@/mock";
import { percentage, sumMoney } from "@/utils/money";
import type { ReceiptAction } from "@/models/receipts";
import type { SettlementAnalysis } from "@/models/settlement";

const categories = [
  "售前估算偏差",
  "项目范围变化",
  "客户需求变化",
  "采购价格变化",
  "外包变化",
  "人力投入超预期",
  "工期延长",
  "质量返工",
  "管理问题",
  "其他",
];
export function SettlementAnalysisPage({
  result = false,
}: {
  result?: boolean;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const showMargin = canViewSensitiveField(
    data,
    { role: currentRole },
    "margin",
  );
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<SettlementAnalysis[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !["executive", "pmo", "finance", "project-manager", "admin"].includes(
      currentRole,
    ) ||
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const calc = selectFourCalculations(p, data);
  const final = calc.settlement;
  const request = data.settlementRequests
    .filter((r) => r.projectId === p.id && r.status === "已锁定")
    .at(-1);
  const snapshot = request?.snapshot ?? settlementSnapshot(data, p.id);
  const income = final?.finalIncome ?? snapshot.income;
  const cost = final?.finalCost ?? snapshot.cost;
  const rate = percentage(income - cost, income);
  const reasons = data.settlementAnalyses[p.id] ?? [];
  const canEdit =
    canDo("save-settlement-analysis", p.id) &&
    (currentRole === "pmo" ||
      currentRole === "finance" ||
      (currentRole === "project-manager" && currentUser.id === p.pmId));
  // Use the same canonical, de-duplicated contract/plan set as portfolio receipt totals.
  const receiptSummary = selectReceipts([p], data);
  const receiptPlans = receiptSummary.plans;
  const paid = receiptSummary.paid;
  const receivable = receiptSummary.outstanding;
  const overdue = receiptSummary.overdue;
  const selectedPlan = receiptPlans.find((r) => r.id === selectedPlanId);
  const selectedPlanContract = receiptSummary.contracts.find(
    (c) => c.id === selectedPlan?.contractId,
  );
  const selectedPlanReceipts = data.receiptRecords.filter(
    (record) =>
      record.projectId === p.id &&
      record.allocations.some(
        (allocation) => allocation.receiptPlanId === selectedPlan?.id,
      ),
  );
  const subjects = snapshot.subjects.map((s) => ({
    ...s,
    settlement: final ? s.actual : undefined,
    variance: final ? s.actual - s.budget : undefined,
    rate: final ? percentage(s.actual - s.budget, s.budget) : null,
    reason: reasons.find((r) => r.subjectId === s.subjectId),
  }));
  const start = () => {
    if (!canEdit) return;
    setRows(
      subjects.map(
        (s) =>
          reasons.find((r) => r.subjectId === s.subjectId) ?? {
            subjectId: s.subjectId,
            category: "",
            phase: "",
            note: "",
          },
      ),
    );
    setEditing(true);
  };
  return (
    <>
      <PageHeader
        title={result ? "JS-08 项目经营结果" : "JS-07 四算对比分析"}
        description={`${p.id} · ${p.name} · ${final ? "冻结建设期结算结果" : "结算准备测算"} · 演示日 ${AS_OF_DATE}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "结算", href: `/projects/${p.id}/settlement` },
          { title: result ? "经营结果" : "四算对比" },
        ]}
        extra={
          <Space>
            <Button
              onClick={() =>
                navigate(
                  `/projects/${p.id}/${result ? "four-calculations" : "business-result"}`,
                )
              }
            >
              {result ? "四算偏差与归因" : "项目经营结果"}
            </Button>
            <Button onClick={() => navigate(`/projects/${p.id}/settlement`)}>
              结算原单
            </Button>
            {!result && (
              <Button type="primary" disabled={!canEdit} onClick={start}>
                维护差异归因
              </Button>
            )}
          </Space>
        }
      />
      <Alert
        showIcon
        type={final ? "success" : "warning"}
        style={{ marginBottom: 16 }}
        message={
          final
            ? `正式结算 ${final.id} · ${final.settledDate} · 建设成本已锁定`
            : "项目尚未正式结算；结算列显示“—”，当前建设测算不作为最终经营结果。"
        }
        description="四算与建设毛利使用统一含税收入/成本口径，财务确认税费单列展示，不再次从建设毛利扣除；运维成本独立核算。回款为演示日实时数据，结算申请保留提交日回款快照。"
      />
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={final ? "结算收入（万元）" : "合同收入（万元）"}
              value={income}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={final ? "冻结建设成本（万元）" : "当前建设成本（万元）"}
              value={cost}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={final ? "结算毛利（万元）" : "当前测算毛利（万元）"}
              value={showMargin ? income - cost : "已隐藏"}
              precision={2}
              valueStyle={{
                color: showMargin && income - cost < 0 ? "#cf1322" : "#1677ff",
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="毛利率"
              value={showMargin ? (rate ?? "—") : "已隐藏"}
              precision={1}
              suffix={!showMargin || rate === null ? "" : "%"}
            />
          </Card>
        </Col>
      </Row>
      {!result ? (
        <>
          <Card
            title="成本、收入与毛利的四算总览"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={[
                {
                  name: "收入（万元）",
                  estimate: calc.estimate?.totalIncome,
                  budget: income,
                  rolling: income,
                  settlement: final?.finalIncome,
                },
                {
                  name: "成本（万元）",
                  estimate: sumMoney(snapshot.subjects.map((s) => s.estimate)),
                  budget: sumMoney(snapshot.subjects.map((s) => s.budget)),
                  rolling: snapshot.lastRolling,
                  settlement: final?.finalCost,
                },
                {
                  name: "毛利（万元）",
                  estimate: calc.estimate?.grossMargin,
                  budget:
                    income - sumMoney(snapshot.subjects.map((s) => s.budget)),
                  rolling: income - snapshot.lastRolling,
                  settlement: final?.finalGrossMargin,
                },
              ]}
              columns={[
                { title: "指标", dataIndex: "name" },
                {
                  title: `概算 ${snapshot.estimateVersion}`,
                  render: (_, r) =>
                    !showMargin && r.name === "毛利（万元）" ? (
                      "已隐藏"
                    ) : r.estimate === undefined ? (
                      "—"
                    ) : (
                      <MoneyText value={r.estimate} />
                    ),
                },
                {
                  title: `预算 ${snapshot.budgetVersion}`,
                  render: (_, r) =>
                    !showMargin && r.name === "毛利（万元）" ? (
                      "已隐藏"
                    ) : (
                      <MoneyText value={r.budget} />
                    ),
                },
                {
                  title: `最后滚动 ${snapshot.lastRollingDate}`,
                  render: (_, r) =>
                    !showMargin && r.name === "毛利（万元）" ? (
                      "已隐藏"
                    ) : (
                      <MoneyText value={r.rolling} />
                    ),
                },
                {
                  title: "冻结结算",
                  render: (_, r) =>
                    !showMargin && r.name === "毛利（万元）" ? (
                      "已隐藏"
                    ) : r.settlement === undefined ? (
                      "—"
                    ) : (
                      <MoneyText value={r.settlement} />
                    ),
                },
              ]}
            />
          </Card>
          <Card
            title="科目差异、责任阶段与变更来源"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Space style={{ marginBottom: 12 }}>
              <Input
                aria-label="四算科目查询"
                placeholder="科目名称/编号"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button onClick={() => setSearch("")}>重置</Button>
            </Space>
            <Table
              rowKey="subjectId"
              size="small"
              scroll={{ x: 1240 }}
              pagination={false}
              dataSource={subjects.filter((s) =>
                `${s.subjectId} ${s.subjectName}`.includes(search),
              )}
              columns={[
                {
                  title: "成本科目",
                  dataIndex: "subjectName",
                  width: 160,
                  fixed: "left",
                },
                {
                  title: "概算",
                  width: 110,
                  align: "right",
                  render: (_, s) => <MoneyText value={s.estimate} />,
                },
                {
                  title: "预算",
                  width: 110,
                  align: "right",
                  render: (_, s) => <MoneyText value={s.budget} />,
                },
                {
                  title: "核算快照",
                  width: 110,
                  align: "right",
                  render: (_, s) => <MoneyText value={s.rolling} />,
                },
                {
                  title: "结算",
                  width: 110,
                  align: "right",
                  render: (_, s) =>
                    s.settlement === undefined ? (
                      "—"
                    ) : (
                      <MoneyText value={s.settlement} />
                    ),
                },
                {
                  title: "概算→预算",
                  width: 115,
                  align: "right",
                  render: (_, s) => <MoneyText value={s.budget - s.estimate} />,
                },
                {
                  title: "预算→结算",
                  width: 130,
                  align: "right",
                  sorter: (a, b) => (a.variance ?? 0) - (b.variance ?? 0),
                  render: (_, s) => (
                    <>
                      {s.variance === undefined ? (
                        "—"
                      ) : (
                        <MoneyText value={s.variance} />
                      )}
                      <div>
                        {s.rate === null ? "—" : `${s.rate.toFixed(1)}%`}
                      </div>
                    </>
                  ),
                },
                {
                  title: "责任阶段 / 归因",
                  width: 260,
                  render: (_, s) => (
                    <>
                      {s.reason ? (
                        <>
                          <Tag>{s.reason.phase}</Tag>
                          {s.reason.category}
                          <p>{s.reason.note}</p>
                          {s.reason.changeId && (
                            <Button
                              type="link"
                              onClick={() =>
                                navigate(
                                  `/project-changes?change=${s.reason!.changeId}`,
                                )
                              }
                            >
                              {s.reason.changeId}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Tag color="warning">尚未归因</Tag>
                      )}
                    </>
                  ),
                },
                {
                  title: "来源",
                  width: 120,
                  render: (_, s) => (
                    <Button
                      onClick={() =>
                        navigate(
                          `/projects/${p.id}/dynamic-accounting?subject=${s.subjectId}`,
                        )
                      }
                    >
                      成本凭证
                    </Button>
                  ),
                },
              ]}
            />
            <p>
              差异为后阶段减前阶段；正数表示成本增加。演示规则：金额差异≥100万元或相对预算≥10%的科目必须填写分类、责任阶段及依据。
            </p>
          </Card>
          <Card title="项目变更来源" size="small">
            <Table
              rowKey="id"
              size="small"
              dataSource={snapshot.changes}
              columns={[
                {
                  title: "原变更",
                  render: (_, c) => (
                    <Button
                      type="link"
                      onClick={() =>
                        navigate(`/project-changes?change=${c.id}`)
                      }
                    >
                      {c.id} · {c.title}
                    </Button>
                  ),
                },
                { title: "状态", dataIndex: "status" },
                { title: "成本影响（万元）", dataIndex: "costImpact" },
              ]}
            />
          </Card>
        </>
      ) : (
        <>
          <Tabs
            items={[
              {
                key: "cash",
                label: "回款与资金占用",
                children: (
                  <>
                    <Card size="small">
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="已回款（万元）"
                            value={paid}
                            precision={2}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="待回款（万元）"
                            value={receivable}
                            precision={2}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="逾期回款（万元）"
                            value={overdue}
                            precision={2}
                          />
                        </Col>
                      </Row>
                      <p>合同回款完成率</p>
                      <Progress percent={receiptSummary.completion ?? 0} />
                      <Table
                        rowKey="id"
                        size="small"
                        dataSource={receiptPlans}
                        columns={[
                          {
                            title: "回款计划原单",
                            dataIndex: "id",
                            render: (value: string) => (
                              <Button
                                type="link"
                                onClick={() => setSelectedPlanId(value)}
                              >
                                {value}
                              </Button>
                            ),
                          },
                          { title: "节点", dataIndex: "title" },
                          { title: "应收", dataIndex: "amount" },
                          { title: "已收", dataIndex: "paidAmount" },
                          { title: "到期日", dataIndex: "dueDate" },
                          {
                            title: "状态",
                            render: (_, r) => (
                              <Tag
                                color={
                                  r.paidAmount >= r.amount
                                    ? "success"
                                    : r.dueDate <= AS_OF_DATE
                                      ? "error"
                                      : "processing"
                                }
                              >
                                {r.paidAmount >= r.amount
                                  ? "已收齐"
                                  : r.dueDate <= AS_OF_DATE
                                    ? "逾期"
                                    : "未到期"}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </Card>
                    <ReceiptPanel
                      projectId={p.id}
                      selectedReceiptId={selectedReceiptId}
                      onSelectReceipt={setSelectedReceiptId}
                    />
                  </>
                ),
              },
              {
                key: "performance",
                label: "交付与经营表现",
                children: (
                  <Card size="small">
                    <Descriptions
                      bordered
                      column={2}
                      items={[
                        {
                          key: "customer",
                          label: "客户",
                          children: p.customerName,
                        },
                        {
                          key: "org",
                          label: "组织",
                          children: p.departmentName,
                        },
                        {
                          key: "start",
                          label: "实际启动",
                          children: p.actualStartDate ?? "尚未登记",
                        },
                        {
                          key: "end",
                          label: "客户最终确认",
                          children:
                            snapshot.confirmedAt || "历史记录未提供确认日期",
                        },
                        {
                          key: "duration",
                          label: "实际建设周期",
                          children:
                            p.actualStartDate && snapshot.confirmedAt
                              ? `${Math.max(0, Math.round((Date.parse(snapshot.confirmedAt) - Date.parse(p.actualStartDate)) / 86400000))} 天`
                              : "尚无完整起止日期",
                        },
                        {
                          key: "delay",
                          label: "验收延期",
                          children: snapshot.confirmedAt
                            ? `${Math.max(0, Math.round((Date.parse(snapshot.confirmedAt) - Date.parse(p.plannedEndDate)) / 86400000))} 天`
                            : "尚无客户最终确认日期",
                        },
                        {
                          key: "planned",
                          label: "计划结束",
                          children: p.plannedEndDate,
                        },
                        {
                          key: "variance",
                          label: "结算对预算成本偏差",
                          children: final ? (
                            <MoneyText value={cost - p.budgetAmount} />
                          ) : (
                            "尚未结算"
                          ),
                        },
                        {
                          key: "forecast",
                          label: "最后滚动对结算差异",
                          children: final ? (
                            <MoneyText value={cost - snapshot.lastRolling} />
                          ) : (
                            "尚未结算"
                          ),
                        },
                        {
                          key: "invoiced",
                          label: "财务确认已开票",
                          children: request?.finance ? (
                            <MoneyText value={request.finance.invoicedAmount} />
                          ) : (
                            "历史数据未提供"
                          ),
                        },
                        {
                          key: "tax",
                          label: "财务确认税费",
                          children: request?.finance ? (
                            <MoneyText value={request.finance.taxAmount} />
                          ) : (
                            "历史数据未提供"
                          ),
                        },
                        {
                          key: "funding",
                          label: "建设资金净占用",
                          children: (
                            <MoneyText value={Math.max(0, cost - paid)} />
                          ),
                        },
                        {
                          key: "ops",
                          label: "运维成本隔离",
                          children: (
                            <MoneyText
                              value={sumMoney(
                                data.maintenanceCosts
                                  .filter((c) => c.projectId === p.id)
                                  .map((c) => c.amount),
                              )}
                            />
                          ),
                        },
                      ]}
                    />
                    <Space wrap style={{ marginTop: 16 }}>
                      <Button
                        onClick={() =>
                          navigate(`/projects/${p.id}/post-evaluation`)
                        }
                      >
                        后评价与人员考核
                      </Button>
                      <Button
                        onClick={() => navigate(`/projects/${p.id}/archive`)}
                      >
                        项目资料归档
                      </Button>
                      <Button
                        onClick={() =>
                          navigate(`/projects/${p.id}/operation-handover`)
                        }
                      >
                        运维衔接
                      </Button>
                      <Button
                        onClick={() => navigate(`/projects/${p.id}/close`)}
                      >
                        项目关闭条件
                      </Button>
                    </Space>
                  </Card>
                ),
              },
            ]}
          />
        </>
      )}
      <Drawer
        title="只读回款计划原单与收款来源"
        width={820}
        open={!!selectedPlan}
        onClose={() => setSelectedPlanId(undefined)}
      >
        {selectedPlan && (
          <>
            <Descriptions
              bordered
              column={2}
              items={[
                {
                  key: "plan",
                  label: "回款计划原单",
                  children: selectedPlan.id,
                },
                {
                  key: "contract",
                  label: "客户合同",
                  children: selectedPlanContract
                    ? `${selectedPlanContract.code} · ${selectedPlanContract.name}`
                    : selectedPlan.contractId,
                },
                {
                  key: "title",
                  label: "回款节点",
                  children: selectedPlan.title,
                },
                {
                  key: "due",
                  label: "到期日",
                  children: selectedPlan.dueDate,
                },
                {
                  key: "amount",
                  label: "计划应收",
                  children: <MoneyText value={selectedPlan.amount} />,
                },
                {
                  key: "paid",
                  label: "当前实收",
                  children: <MoneyText value={selectedPlan.paidAmount} />,
                },
              ]}
            />
            <Alert
              showIcon
              type="info"
              style={{ marginTop: 16 }}
              message="历史导入实收与本系统新增流水分开追溯；新增流水可继续查看不可变收款原单。"
            />
            <Table
              style={{ marginTop: 12 }}
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={selectedPlanReceipts}
              locale={{ emptyText: "当前节点只有历史导入实收，尚无本系统新增流水" }}
              columns={[
                {
                  title: "原流水编号",
                  render: (_, record) => (
                    <Button
                      type="link"
                      onClick={() => {
                        setSelectedPlanId(undefined);
                        setSelectedReceiptId(record.id);
                      }}
                    >
                      {record.sourceNo}
                    </Button>
                  ),
                },
                { title: "收款日期", dataIndex: "receivedDate" },
                {
                  title: "分配至本节点",
                  render: (_, record) => (
                    <MoneyText
                      value={sumMoney(
                        record.allocations
                          .filter(
                            (allocation) =>
                              allocation.receiptPlanId === selectedPlan.id,
                          )
                          .map((allocation) => allocation.amount),
                      )}
                    />
                  ),
                },
                {
                  title: "凭据",
                  render: (_, record) => record.evidenceFiles.join("、"),
                },
              ]}
            />
          </>
        )}
      </Drawer>
      <Modal
        title="维护四算差异归因"
        width={900}
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        open={editing}
        okButtonProps={{ disabled: !canEdit }}
        onCancel={() => setEditing(false)}
        onOk={() => {
          if (!canEdit) return;
          try {
            dispatch(
              { type: "save-settlement-analysis", projectId: p.id, rows },
              { id: currentUser.id, name: currentUser.name, role: currentRole },
            );
            message.success("科目差异归因已保存");
            setEditing(false);
          } catch (e) {
            message.error((e as Error).message);
          }
        }}
      >
        <Form layout="vertical" disabled={!canEdit}>
          {rows.map((r, i) => (
            <Card
              key={r.subjectId}
              title={
                subjects.find((s) => s.subjectId === r.subjectId)?.subjectName
              }
              size="small"
              style={{ marginBottom: 12 }}
            >
              <Space wrap>
                <Select
                  aria-label={`${r.subjectId}原因分类`}
                  placeholder="原因分类"
                  style={{ width: 180 }}
                  value={r.category || undefined}
                  onChange={(v) =>
                    setRows(
                      rows.map((x, n) => (n === i ? { ...x, category: v } : x)),
                    )
                  }
                  options={categories.map((value) => ({ value, label: value }))}
                />
                <Select
                  aria-label={`${r.subjectId}责任阶段`}
                  placeholder="责任阶段"
                  style={{ width: 130 }}
                  value={r.phase || undefined}
                  onChange={(v) =>
                    setRows(
                      rows.map((x, n) => (n === i ? { ...x, phase: v } : x)),
                    )
                  }
                  options={["概算", "预算", "核算", "结算"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
                <Select
                  allowClear
                  placeholder="关联真实变更"
                  style={{ width: 280 }}
                  value={r.changeId}
                  onChange={(v) =>
                    setRows(
                      rows.map((x, n) => (n === i ? { ...x, changeId: v } : x)),
                    )
                  }
                  options={data.changes
                    .filter((c) => c.projectId === p.id)
                    .map((c) => ({ value: c.id, label: `${c.id} ${c.title}` }))}
                />
              </Space>
              <Input.TextArea
                style={{ marginTop: 8 }}
                aria-label={`${r.subjectId}差异说明`}
                placeholder="依据、责任及改进措施"
                value={r.note}
                onChange={(e) =>
                  setRows(
                    rows.map((x, n) =>
                      n === i ? { ...x, note: e.target.value } : x,
                    ),
                  )
                }
              />
            </Card>
          ))}
        </Form>
      </Modal>
    </>
  );
}

function ReceiptPanel({
  projectId,
  selectedReceiptId,
  onSelectReceipt,
}: {
  projectId: string;
  selectedReceiptId?: string;
  onSelectReceipt: (id?: string) => void;
}) {
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const { message } = App.useApp();
  const [draft, setDraft] =
    useState<Omit<ReceiptAction, "type" | "projectId">>();
  const [query, setQuery] = useState("");
  const project = data.projects.find((p) => p.id === projectId);
  const receiptSummary = selectReceipts(project ? [project] : [], data);
  const contracts = receiptSummary.contracts;
  const records = data.receiptRecords.filter((r) => r.projectId === projectId);
  const record = records.find((r) => r.id === selectedReceiptId);
  const contract = contracts.find((c) => c.id === draft?.contractId);
  const plans = receiptSummary.plans.filter(
    (p) => p.contractId === draft?.contractId,
  );
  const total = sumMoney(draft?.allocations.map((a) => a.amount) ?? []);
  const finance =
    currentRole === "finance" && canDo("confirm-project-receipt", projectId);
  const begin = () => {
    if (!finance) return;
    const c = contracts.find((c) => c.unpaidAmount > 0);
    setDraft({
      contractId: c?.id ?? "",
      sourceNo: "",
      receivedDate: AS_OF_DATE,
      allocations: [],
      evidenceFiles: [],
      note: "",
    });
  };
  const confirm = () => {
    if (!draft || !finance) return;
    try {
      dispatch(
        { type: "confirm-project-receipt", projectId, ...draft },
        { id: currentUser.id, name: currentUser.name, role: currentRole },
      );
      setDraft(undefined);
      message.success("实际收款已确认，合同与回款节点余额同步更新");
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  return (
    <>
      <Card
        title="实际收款与原流水"
        size="small"
        style={{ marginTop: 16 }}
        extra={
          <Button
            type="primary"
            disabled={!finance || !contracts.some((c) => c.unpaidAmount > 0)}
            onClick={begin}
          >
            财务确认收款
          </Button>
        }
      >
        <Alert
          showIcon
          type="info"
          message="历史导入实收保留原余额；本页只登记新增实际收款流水。归档后仍可收款，原结算、档案及关闭快照保持不变。"
        />
        <Table
          style={{ marginTop: 12 }}
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={contracts}
          columns={[
            {
              title: "客户合同",
              render: (_, c) => (
                <>
                  {c.code}
                  <div>{c.name}</div>
                </>
              ),
            },
            {
              title: "合同金额（万元）",
              render: (_, c) => <MoneyText value={c.amount} />,
            },
            {
              title: "历史导入实收",
              render: (_, c) => (
                <MoneyText
                  value={sumMoney([
                    c.paidAmount,
                    -sumMoney(
                      records
                        .filter((r) => r.contractId === c.id)
                        .map((r) => r.amount),
                    ),
                  ])}
                />
              ),
            },
            {
              title: "本系统确认收款",
              render: (_, c) => (
                <MoneyText
                  value={sumMoney(
                    records
                      .filter((r) => r.contractId === c.id)
                      .map((r) => r.amount),
                  )}
                />
              ),
            },
            {
              title: "当前实收",
              render: (_, c) => <MoneyText value={c.paidAmount} />,
            },
            {
              title: "当前待收",
              render: (_, c) => <MoneyText value={c.unpaidAmount} />,
            },
          ]}
        />
        <Input
          aria-label="收款流水查询"
          style={{ maxWidth: 420, margin: "12px 0" }}
          placeholder="原流水编号、凭据或收款说明"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: 950 }}
          dataSource={records.filter((r) =>
            `${r.sourceNo} ${r.note} ${r.evidenceFiles.join(" ")}`.includes(
              query,
            ),
          )}
          columns={[
            {
              title: "原流水编号",
              dataIndex: "sourceNo",
              render: (v, r) => (
                <Button type="link" onClick={() => onSelectReceipt(r.id)}>
                  {v}
                </Button>
              ),
            },
            { title: "收款日期", dataIndex: "receivedDate" },
            {
              title: "金额（万元）",
              render: (_, r) => <MoneyText value={r.amount} />,
            },
            { title: "分配节点数", render: (_, r) => r.allocations.length },
            { title: "凭据", render: (_, r) => r.evidenceFiles.join("、") },
            {
              title: "财务确认",
              render: (_, r) => `${r.confirmedBy} / ${r.confirmedAt}`,
            },
            {
              title: "操作",
              render: (_, r) => (
                <Button onClick={() => onSelectReceipt(r.id)}>
                  查看收款原单
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="财务确认实际收款"
        width={880}
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        open={!!draft}
        onCancel={() => setDraft(undefined)}
        okText="确认收款并更新余额"
        onOk={confirm}
        okButtonProps={{ disabled: !finance }}
      >
        {draft && (
          <Form layout="vertical" disabled={!finance}>
            <Alert
              type="warning"
              message="请核对原流水与凭据。一条流水可分配到同一合同多个节点，确认后保留记录，不提供直接覆盖或删除。"
            />
            <Form.Item label="客户合同" required>
              <Select
                aria-label="收款客户合同"
                value={draft.contractId || undefined}
                onChange={(contractId) =>
                  setDraft({ ...draft, contractId, allocations: [] })
                }
                options={contracts.map((c) => ({
                  value: c.id,
                  label: `${c.code} · ${c.name} · 未收 ${c.unpaidAmount} 万元`,
                  disabled: c.unpaidAmount <= 0,
                }))}
              />
            </Form.Item>
            <Space align="start" wrap>
              <Form.Item label="原银行 / 客户付款流水编号" required>
                <Input
                  aria-label="原收款流水编号"
                  value={draft.sourceNo}
                  onChange={(e) =>
                    setDraft({ ...draft, sourceNo: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item label="实际收款日期" required>
                <Input
                  aria-label="实际收款日期"
                  type="date"
                  max={AS_OF_DATE}
                  value={draft.receivedDate}
                  onChange={(e) =>
                    setDraft({ ...draft, receivedDate: e.target.value })
                  }
                />
              </Form.Item>
            </Space>
            <Form.Item label="回款节点分配（万元，支持部分收款）" required>
              <Table
                rowKey="receiptPlanId"
                pagination={false}
                size="small"
                dataSource={draft.allocations}
                columns={[
                  {
                    title: "真实回款节点",
                    render: (_, a, i) => (
                      <Select
                        aria-label={`第${i + 1}个收款节点`}
                        style={{ width: 260 }}
                        value={a.receiptPlanId || undefined}
                        onChange={(receiptPlanId) =>
                          setDraft({
                            ...draft,
                            allocations: draft.allocations.map((v, n) =>
                              n === i ? { receiptPlanId, amount: 0 } : v,
                            ),
                          })
                        }
                        options={plans.map((p) => ({
                          value: p.id,
                          label: `${p.title} · ${p.id}`,
                          disabled:
                            p.amount <= p.paidAmount ||
                            draft.allocations.some(
                              (v, n) => n !== i && v.receiptPlanId === p.id,
                            ),
                        }))}
                      />
                    ),
                  },
                  {
                    title: "当前未收",
                    render: (_, a) => (
                      <MoneyText
                        value={sumMoney([
                          plans.find((p) => p.id === a.receiptPlanId)?.amount ??
                            0,
                          -(
                            plans.find((p) => p.id === a.receiptPlanId)
                              ?.paidAmount ?? 0
                          ),
                        ])}
                      />
                    ),
                  },
                  {
                    title: "本次分配金额",
                    render: (_, a, i) => (
                      <InputNumber
                        aria-label={`第${i + 1}个节点收款金额`}
                        min={0.000001}
                        precision={6}
                        value={a.amount}
                        onChange={(amount) =>
                          setDraft({
                            ...draft,
                            allocations: draft.allocations.map((v, n) =>
                              n === i ? { ...v, amount: amount ?? 0 } : v,
                            ),
                          })
                        }
                      />
                    ),
                  },
                  {
                    title: "操作",
                    render: (_, _a, i) => (
                      <Button
                        danger
                        disabled={!finance}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            allocations: draft.allocations.filter(
                              (_, n) => n !== i,
                            ),
                          })
                        }
                      >
                        移除分配
                      </Button>
                    ),
                  },
                ]}
              />
              <Button
                style={{ marginTop: 8 }}
                disabled={
                  !finance ||
                  !contract ||
                  draft.allocations.length >=
                    plans.filter((p) => p.amount > p.paidAmount).length
                }
                onClick={() =>
                  setDraft({
                    ...draft,
                    allocations: [
                      ...draft.allocations,
                      {
                        receiptPlanId:
                          plans.find(
                            (p) =>
                              p.amount > p.paidAmount &&
                              !draft.allocations.some(
                                (a) => a.receiptPlanId === p.id,
                              ),
                          )?.id ?? "",
                        amount: 0,
                      },
                    ],
                  })
                }
              >
                添加回款节点
              </Button>
            </Form.Item>
            <Alert
              type={total > (contract?.unpaidAmount ?? 0) ? "error" : "info"}
              message={`本次合计 ${total} 万元 · 合同未收 ${contract?.unpaidAmount ?? 0} 万元 · 确认后未收 ${sumMoney([contract?.unpaidAmount ?? 0, -total])} 万元`}
            />
            <Form.Item
              label="收款凭据文件名（每行一份，pdf/png/jpg/xlsx）"
              required
            >
              <Input.TextArea
                aria-label="收款凭据文件名"
                rows={3}
                value={draft.evidenceFiles.join("\n")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    evidenceFiles: e.target.value.split("\n"),
                  })
                }
              />
            </Form.Item>
            <Form.Item label="收款依据与分配说明" required>
              <Input.TextArea
                aria-label="收款依据与分配说明"
                rows={3}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
      <Drawer
        title="只读收款原单与余额变化"
        width={800}
        open={!!record}
        onClose={() => onSelectReceipt(undefined)}
      >
        {record && (
          <>
            <Descriptions
              bordered
              column={2}
              items={[
                { key: "id", label: "收款记录", children: record.id },
                {
                  key: "source",
                  label: "原流水编号",
                  children: record.sourceNo,
                },
                {
                  key: "contract",
                  label: "客户合同",
                  children:
                    contracts.find((c) => c.id === record.contractId)?.name ??
                    record.contractId,
                },
                {
                  key: "date",
                  label: "实际收款日期",
                  children: record.receivedDate,
                },
                {
                  key: "amount",
                  label: "收款金额",
                  children: <MoneyText value={record.amount} />,
                },
                {
                  key: "actor",
                  label: "确认人 / 日期",
                  children: `${record.confirmedBy} / ${record.confirmedAt}`,
                },
                {
                  key: "before",
                  label: "合同确认前实收",
                  children: <MoneyText value={record.contractPaidBefore} />,
                },
                {
                  key: "after",
                  label: "合同确认后实收",
                  children: <MoneyText value={record.contractPaidAfter} />,
                },
                {
                  key: "files",
                  label: "原凭据",
                  children: record.evidenceFiles.join("、"),
                  span: 2,
                },
                {
                  key: "note",
                  label: "收款及分配依据",
                  children: record.note,
                  span: 2,
                },
              ]}
            />
            <Table
              style={{ marginTop: 16 }}
              rowKey="receiptPlanId"
              pagination={false}
              dataSource={record.allocations}
              columns={[
                {
                  title: "回款节点",
                  render: (_, a) => (
                    <>
                      {
                        data.receiptPlans.find((p) => p.id === a.receiptPlanId)
                          ?.title
                      }
                      <div>{a.receiptPlanId}</div>
                    </>
                  ),
                },
                {
                  title: "本次金额",
                  render: (_, a) => <MoneyText value={a.amount} />,
                },
                {
                  title: "确认前实收",
                  render: (_, a) => <MoneyText value={a.paidBefore} />,
                },
                {
                  title: "确认后实收",
                  render: (_, a) => <MoneyText value={a.paidAfter} />,
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
