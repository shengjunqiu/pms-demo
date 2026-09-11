import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { PageSection } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/business";
import { mockUsers, AS_OF_DATE } from "@/mock";
import { visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import { operationExpiry, type OperationsAction } from "@/mock/operations";
export function OperationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo, canEditField } = useActionAccess();
  const { message } = App.useApp();
  const [modal, setModal] = useState<
    "event" | "cost" | "renew" | "exit" | "resolve" | "config" | "reject"
  >();
  const [eventId, setEventId] = useState("");
  const [form] = Form.useForm();
  const costKind = Form.useWatch("kind", form);
  const c = data.operationCycles.find((c) => c.id === id);
  const p = data.projects.find((p) => p.id === c?.projectId);
  if (!c || !p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some(
      (v) => v.id === p.id,
    ) &&
    !c.teamIds.includes(currentUser.id)
  )
    return <StateView type="403" />;
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const pmo = currentRole === "pmo";
  const owner =
    pmo || (currentRole === "project-manager" && currentUser.id === p.pmId);
  const member = pmo || c.teamIds.includes(currentUser.id);
  const active = c.status === "服务中" || c.status === "退出中";
  const events = data.operationEvents.filter((e) => e.operationId === c.id);
  const costs = data.maintenanceCosts.filter((v) => v.operationId === c.id);
  const orphan = data.maintenanceCosts.filter(
    (v) => v.projectId === p.id && !v.operationId,
  );
  const canModal = (kind: typeof modal, targetId = eventId) => {
    if (kind === "event")
      return active && member && canDo("record-operation-event", c.id);
    if (kind === "cost")
      return active && member && canDo("submit-operation-cost", c.id);
    if (kind === "resolve")
      return active && member && canDo("resolve-operation-event", targetId);
    if (kind === "reject")
      return (
        currentRole === "finance" && canDo("reject-operation-cost", targetId)
      );
    if (kind === "config")
      return owner && active && canDo("configure-operation", c.id);
    if (kind === "renew")
      return owner && c.status === "服务中" && canDo("renew-operation", c.id);
    if (kind === "exit")
      return (
        owner &&
        (active || c.status === "待生效") &&
        canDo("exit-operation", c.id)
      );
    return false;
  };
  const canSubmitModal =
    canModal(modal) &&
    !(modal === "cost" && costKind === "labor" && !canEditField("labor-rate"));
  const open = (kind: typeof modal, targetId = eventId) => {
    if (!canModal(kind, targetId)) return;
    setEventId(targetId);
    setModal(kind);
    form.resetFields();
    form.setFieldsValue({
      kind: kind === "cost" ? "expense" : "问题",
      severity: "一般",
      date: AS_OF_DATE,
      remindDays: c.remindDays,
      confirm: false,
    });
  };
  const run = (action: OperationsAction) => {
    if (
      !canDo(
        action.type,
        "operationId" in action
          ? action.operationId
          : "id" in action
            ? action.id
            : p.id,
      )
    )
      return;
    try {
      dispatch(action, actor);
      message.success("已更新运维状态");
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  const submit = async () => {
    if (!canSubmitModal) return;
    try {
      const v = await form.validateFields();
      const base = { projectId: p.id, operationId: c.id };
      let action: OperationsAction;
      if (modal === "event")
        action = {
          ...base,
          type: "record-operation-event",
          kind: v.kind,
          title: v.title,
          severity: v.severity,
          note: v.note,
        };
      else if (modal === "cost")
        action = {
          ...base,
          type: "submit-operation-cost",
          previousId: v.previousId,
          sourceNo: v.sourceNo,
          kind: v.kind,
          amount: v.amount ?? 0,
          hours: v.hours,
          rate: v.rate,
          evidence: v.evidence,
          description: v.description,
          date: v.date,
        };
      else if (modal === "reject")
        action = {
          type: "reject-operation-cost",
          projectId: p.id,
          id: eventId,
          note: v.note,
        };
      else if (modal === "config")
        action = {
          ...base,
          type: "configure-operation",
          remindDays: v.remindDays,
        };
      else if (modal === "renew")
        action = {
          ...base,
          type: "renew-operation",
          contractId: v.contractId,
          startDate: v.startDate,
          endDate: v.endDate,
          note: v.note,
        };
      else if (modal === "resolve")
        action = {
          type: "resolve-operation-event",
          projectId: p.id,
          id: eventId,
          note: v.note,
        };
      else
        action = {
          ...base,
          type: "exit-operation",
          reason: v.reason,
          handoff: v.handoff,
          accountsRevoked: v.accountsRevoked,
          archive: v.archive,
          confirm: v.confirm ?? false,
        };
      dispatch(action, actor);
      message.success("运维记录已保存");
      setModal(undefined);
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    }
  };
  return (
    <>
      <PageHeader
        title="JS-12 运维服务管理"
        description={`${p.name} · ${c.id} · ${c.status}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "运维周期" },
        ]}
        extra={
          <Space>
            <Button
              onClick={() => navigate(`/projects/${p.id}/operation-handover`)}
            >
              移交记录
            </Button>
            <Button onClick={() => navigate(`/projects/${p.id}/close`)}>
              项目关闭
            </Button>
          </Space>
        }
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="周期状态"
            value={c.status}
            statusType={c.status === "服务中" ? "healthy" : c.status === "退出中" ? "warning" : "info"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="本期运维费用"
            value={costs.reduce((s, c) => s + c.amount, 0)}
            statusType="info"
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="未解决问题/风险"
            value={events.filter((e) => e.status === "未解决").length}
            unit="项"
            statusType={events.filter((e) => e.status === "未解决").length > 0 ? "danger" : "healthy"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="服务记录"
            value={events.length}
            unit="条"
            statusType="info"
          />
        </Col>
      </Row>
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 16 }}
        message="建设期结算与运维账独立。续期创建新的不重叠周期；退出保留服务记录、问题处理、权限回收与移交凭据。"
      />
      <PageSection title="运维周期概况" description="服务合同、SLA规范、响应周期与服务团队人员。" className="mb-4">
        <Descriptions
          bordered
          items={[
            { key: "contract", label: "真实合同", children: c.contractId },
            {
              key: "dates",
              label: "服务周期",
              children: `${c.startDate} — ${c.endDate}`,
            },
            {
              key: "expiry",
              label: "到期提醒（演示日期）",
              children: (
                <Tag color="orange">
                  {operationExpiry(c.endDate, c.remindDays)} · {AS_OF_DATE}
                </Tag>
              ),
            },
            { key: "sla", label: "SLA", children: c.sla },
            { key: "scope", label: "服务范围", children: c.scope },
            {
              key: "team",
              label: "运维团队",
              children: c.teamIds
                .map((id) => mockUsers.find((u) => u.id === id)?.name ?? id)
                .join("、"),
            },
            { key: "source", label: "周期来源", children: c.source },
            {
              key: "previous",
              label: "上一周期",
              children: c.previousId ? (
                <Button
                  type="link"
                  onClick={() => navigate(`/operations/${c.previousId}`)}
                >
                  {c.previousId}
                </Button>
              ) : (
                "首期"
              ),
            },
          ]}
        />
      </PageSection>
      {orphan.length > 0 && (
        <Alert
          type="warning"
          message={`有 ${orphan.length} 笔历史运维费用未关联周期，关闭将被阻断；不能直接摊入本期。`}
        />
      )}
      <Card style={{ marginTop: 16 }}>
        <Tabs
          activeKey={params.get("tab") ?? "events"}
          onChange={(tab) => setParams({ tab })}
          items={[
            {
              key: "events",
              label: "服务 / 问题 / SLA",
              children: (
                <>
                  <Button
                    type="primary"
                    disabled={!canModal("event")}
                    onClick={() => open("event")}
                  >
                    登记运维记录
                  </Button>
                  <Table
                    rowKey="id"
                    dataSource={events}
                    columns={[
                      { title: "编号", dataIndex: "id" },
                      { title: "类别", dataIndex: "kind" },
                      { title: "主题", dataIndex: "title" },
                      { title: "级别", dataIndex: "severity" },
                      {
                        title: "处理状态",
                        dataIndex: "status",
                        render: (v) => (
                          <Tag color={v === "已解决" ? "green" : "red"}>
                            {v}
                          </Tag>
                        ),
                      },
                      { title: "发生记录", dataIndex: "note" },
                      {
                        title: "解决依据",
                        dataIndex: "resolution",
                        render: (v) => v ?? "—",
                      },
                      {
                        title: "日期 / 记录人",
                        render: (_, r) => `${r.date} / ${r.actor}`,
                      },
                      {
                        title: "操作",
                        render: (_, r) =>
                          r.status === "未解决" && member ? (
                            <Button
                              type="link"
                              disabled={!canModal("resolve", r.id)}
                              onClick={() => {
                                setEventId(r.id);
                                open("resolve", r.id);
                              }}
                            >
                              解决并留证
                            </Button>
                          ) : (
                            "—"
                          ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: "costs",
              label: "独立运维账",
              children: (
                <>
                  <Alert
                    type="info"
                    message="金额单位万元。团队提交真实发生的工时或费用记录，财务审核后单次入账，不改变建设期实际成本和最终结算。"
                  />
                  <Button
                    disabled={!canModal("cost")}
                    onClick={() => open("cost")}
                    style={{ margin: "12px 0" }}
                  >
                    填报运维工时 / 费用
                  </Button>
                  <Table
                    rowKey="id"
                    dataSource={data.operationCostSources.filter(
                      (s) => s.operationId === c.id,
                    )}
                    columns={[
                      { title: "原单编号", dataIndex: "id" },
                      {
                        title: "事项 / 凭据",
                        render: (_, s) => `${s.description} / ${s.evidence}`,
                      },
                      {
                        title: "工时 × 单价",
                        render: (_, s) =>
                          s.kind === "labor"
                            ? `${s.hours}h × ${s.rate}万元/h`
                            : "报销费用",
                      },
                      { title: "金额", dataIndex: "amount" },
                      { title: "状态", dataIndex: "status" },
                      {
                        title: "财务审核",
                        render: (_, s) =>
                          s.status === "待审核" && currentRole === "finance" ? (
                            <Space>
                              <Button
                                type="link"
                                disabled={!canDo("record-operation-cost", c.id)}
                                onClick={() =>
                                  run({
                                    type: "record-operation-cost",
                                    projectId: p.id,
                                    operationId: c.id,
                                    sourceId: s.id,
                                    kind: s.kind,
                                    date: s.date,
                                    amount: s.amount,
                                    description: s.description,
                                  })
                                }
                              >
                                确认入账
                              </Button>
                              <Button
                                type="link"
                                danger
                                disabled={!canModal("reject", s.id)}
                                onClick={() => {
                                  setEventId(s.id);
                                  open("reject", s.id);
                                }}
                              >
                                退回
                              </Button>
                            </Space>
                          ) : (
                            "—"
                          ),
                      },
                    ]}
                  />
                  <Table
                    rowKey="id"
                    dataSource={costs}
                    columns={[
                      { title: "原单号", dataIndex: "sourceId" },
                      { title: "发生日期", dataIndex: "occurredDate" },
                      { title: "科目", dataIndex: "subjectName" },
                      { title: "金额（万元）", dataIndex: "amount" },
                      { title: "说明", dataIndex: "description" },
                    ]}
                  />
                </>
              ),
            },
            {
              key: "lifecycle",
              label: "续期 / 终止 / 退出",
              children: (
                <>
                  <Space>
                    <Button
                      disabled={!canModal("config")}
                      onClick={() => open("config")}
                    >
                      配置到期提醒
                    </Button>
                    {c.status === "待生效" && (
                      <Button
                        disabled={!owner || !canDo("activate-operation", c.id)}
                        onClick={() =>
                          run({
                            type: "activate-operation",
                            projectId: p.id,
                            operationId: c.id,
                          })
                        }
                      >
                        检查并激活新周期
                      </Button>
                    )}
                    <Button
                      disabled={!canModal("renew")}
                      onClick={() => open("renew")}
                    >
                      办理续期 · 新建周期
                    </Button>
                    <Button
                      disabled={!canModal("exit")}
                      onClick={() => open("exit")}
                    >
                      办理退出 / 提前终止
                    </Button>
                  </Space>
                  {c.exit && (
                    <Descriptions
                      style={{ marginTop: 16 }}
                      column={1}
                      bordered
                      items={[
                        {
                          key: "reason",
                          label: "终止 / 到期依据",
                          children: c.exit.reason,
                        },
                        {
                          key: "handoff",
                          label: "客户 / 下期团队移交",
                          children: c.exit.handoff,
                        },
                        {
                          key: "accounts",
                          label: "账号权限回收",
                          children: c.exit.accountsRevoked,
                        },
                        {
                          key: "archive",
                          label: "运维文档归档凭据",
                          children: c.exit.archive,
                        },
                        {
                          key: "confirm",
                          label: "退出确认",
                          children: c.exit.confirmedAt
                            ? `${c.exit.confirmedBy} / ${c.exit.confirmedAt}`
                            : "待PMO确认",
                        },
                      ]}
                    />
                  )}
                  <Table
                    style={{ marginTop: 16 }}
                    rowKey="id"
                    dataSource={data.operationCycles.filter(
                      (v) => v.projectId === p.id,
                    )}
                    columns={[
                      {
                        title: "周期",
                        dataIndex: "id",
                        render: (v) => (
                          <Button
                            type="link"
                            onClick={() => navigate(`/operations/${v}`)}
                          >
                            {v}
                          </Button>
                        ),
                      },
                      { title: "开始", dataIndex: "startDate" },
                      { title: "结束", dataIndex: "endDate" },
                      { title: "状态", dataIndex: "status" },
                      { title: "合同", dataIndex: "contractId" },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        width={680}
        title={
          modal === "event"
            ? "登记运维服务记录"
            : modal === "cost"
              ? "填报运维费用原单"
              : modal === "config"
                ? "到期提醒配置"
                : modal === "renew"
                  ? "续期建立新周期"
                  : modal === "resolve"
                    ? "解决运维事项"
                    : modal === "reject"
                      ? "财务退回原单"
                      : "退出 / 终止清单"
        }
        open={!!modal}
        onCancel={() => setModal(undefined)}
        onOk={() => void submit()}
        okButtonProps={{ disabled: !canSubmitModal }}
      >
        <Form
          form={form}
          disabled={!canModal(modal)}
          layout="vertical"
          initialValues={{
            kind: modal === "cost" ? "expense" : "问题",
            remindDays: c.remindDays,
            severity: "一般",
            date: AS_OF_DATE,
            confirm: false,
          }}
        >
          {modal === "event" ? (
            <>
              <Form.Item
                name="kind"
                label="记录类别"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    "问题",
                    "巡检",
                    "服务",
                    "客户沟通",
                    "SLA",
                    "风险",
                  ].map((value) => ({ value, label: value }))}
                />
              </Form.Item>
              <Form.Item name="severity" label="影响级别">
                <Select
                  options={["一般", "重大"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Form.Item>
              <Form.Item name="title" label="主题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          ) : null}
          {modal === "cost" ? (
            <>
              <Form.Item
                name="sourceNo"
                label="原工时单 / 报销单编号（唯一）"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="previousId"
                label="更正已退回原单（首次填报留空）"
              >
                <Select
                  allowClear
                  options={data.operationCostSources
                    .filter(
                      (s) =>
                        s.operationId === c.id &&
                        s.status === "已退回" &&
                        !s.supersededBy,
                    )
                    .map((s) => ({
                      value: s.id,
                      label: `${s.id} · ${s.description} · ${s.reviewNote}`,
                    }))}
                />
              </Form.Item>
              <Form.Item
                name="kind"
                label="费用来源类别"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    {
                      value: "labor",
                      label: "运维工时",
                      disabled: !canEditField("labor-rate"),
                    },
                    { value: "expense", label: "运维报销" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="evidence"
                label="发生依据 / 凭据文件名"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="hours" label="人工：实际工时（小时）">
                <InputNumber min={0.01} />
              </Form.Item>
              <Form.Item name="rate" label="人工：单价（万元/小时）">
                <InputNumber
                  disabled={!canModal(modal) || !canEditField("labor-rate")}
                  min={0.0001}
                  precision={4}
                />
              </Form.Item>
              <Form.Item
                name="date"
                label="发生日期"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="amount"
                label="费用：报销金额（万元）；人工按工时计算"
              >
                <InputNumber min={0.01} precision={2} />
              </Form.Item>
              <Form.Item
                name="description"
                label="发生事项与凭据"
                rules={[{ required: true }]}
              >
                <Input.TextArea />
              </Form.Item>
            </>
          ) : null}
          {modal === "renew" ? (
            <>
              <Alert
                type="warning"
                message="请先在商务流程办妥续期合同。新周期开始日期必须晚于本期结束日期，本期未决事项必须清理。"
              />
              <Form.Item
                name="contractId"
                label="有效续期合同"
                rules={[{ required: true }]}
              >
                <Select
                  options={data.contracts
                    .filter(
                      (v) => v.projectId === p.id && v.status !== "已终止",
                    )
                    .map((v) => ({ value: v.id, label: v.name }))}
                />
              </Form.Item>
              <Form.Item
                name="startDate"
                label="新周期开始"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="endDate"
                label="新周期结束"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
            </>
          ) : null}
          {modal === "exit" ? (
            <>
              {[
                ["reason", "到期 / 提前终止的合同依据"],
                ["handoff", "客户或后续团队移交凭据"],
                ["accountsRevoked", "账号和权限回收凭据"],
                ["archive", "运维周期文档归档凭据"],
              ].map(([name, label]) => (
                <Form.Item
                  key={name}
                  name={name}
                  label={label}
                  rules={[{ required: true }]}
                >
                  <Input.TextArea />
                </Form.Item>
              ))}
              <Form.Item name="confirm" label="处理方式">
                <Select
                  options={[
                    { value: false, label: "保存退出清单，等待确认" },
                    {
                      value: true,
                      label: "PMO确认退出并结束本期",
                      disabled: !pmo,
                    },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}
          {modal === "config" && (
            <Form.Item
              name="remindDays"
              label="提前提醒天数"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={180} />
            </Form.Item>
          )}
          {modal !== "cost" && modal !== "exit" && modal !== "config" && (
            <Form.Item
              name="note"
              label={modal === "resolve" ? "解决经过与证据" : "记录 / 续期依据"}
              rules={[{ required: true }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
