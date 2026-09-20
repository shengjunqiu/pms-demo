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
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/store";
import { mockUsers, AS_OF_DATE } from "@/mock";
import { visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { OperationHandover } from "@/models/operations";
export function OperationHandoverPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const { message } = App.useApp();
  const [required, setRequired] = useState(true);
  const [form] = Form.useForm();
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some(
      (v) => v.id === id,
    ) &&
    data.operationHandovers[p.id]?.receiverId !== currentUser.id &&
    !data.operationHandovers[p.id]?.teamIds.includes(currentUser.id)
  )
    return <StateView type="403" />;
  const h = data.operationHandovers[p.id];
  const cycles = data.operationCycles.filter((c) => c.projectId === p.id);
  const canEdit =
    (currentRole === "pmo" ||
      (currentRole === "project-manager" && currentUser.id === p.pmId)) &&
    !data.projectClosures[p.id] &&
    canDo("save-operation-handover", p.id);
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const submit = async () => {
    if (!canEdit) return;
    try {
      const values = await form.validateFields();
      dispatch(
        {
          type: "save-operation-handover",
          projectId: p.id,
          handover: {
            startDate: "",
            endDate: "",
            receiverId: "",
            teamIds: [],
            scope: "",
            sla: "",
            systemInfo: "",
            legacyIssues: "",
            accounts: "",
            documents: "",
            ...values,
            required,
          } as Omit<
            OperationHandover,
            "id" | "projectId" | "status" | "submittedAt" | "submittedBy"
          >,
        },
        actor,
      );
      message.success(
        required ? "已提交，等待指定接收人确认" : "已记录合同运维判定",
      );
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    }
  };
  return (
    <>
      <PageHeader
        title="JS-11 运维移交"
        description={`${p.name} · 接收确认后建立独立服务周期`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "运维移交" },
        ]}
        extra={
          <Button onClick={() => navigate(`/projects/${p.id}/close`)}>
            项目关闭检查
          </Button>
        }
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="移交状态"
            value={h ? h.status : "未发起"}
            statusType={h?.status === "已接收" ? "healthy" : h ? "warning" : "info"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="运维周期"
            value={cycles.length}
            unit="个"
            statusType={cycles.length > 0 ? "healthy" : "info"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="接收责任人"
            value={h?.receiverId ? mockUsers.find((u) => u.id === h.receiverId)?.name ?? h.receiverId : "未指定"}
            statusType="info"
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="前置档案"
            value={data.projectArchives[p.id] ? "已归档" : "未归档"}
            statusType={data.projectArchives[p.id] ? "healthy" : "danger"}
          />
        </Col>
      </Row>
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 16 }}
        message="移交须关联原合同及正式档案。系统和账号仅记录交接凭据，不填写实际密码；指定接收人确认后才进入运维。"
      />
      {!data.projectArchives[p.id] && (
        <Alert
          type="warning"
          showIcon
          message="正式档案尚未确认，新建移交被阻断；历史已运行周期保留其原始来源。"
          action={
            <Button onClick={() => navigate(`/projects/${p.id}/archive`)}>
              检查归档
            </Button>
          }
        />
      )}
      {cycles.map((c) => (
        <Card
          key={c.id}
          title={
            <Space>
              {c.id}
              <Tag color="blue">{c.status}</Tag>
            </Space>
          }
          style={{ marginTop: 16 }}
          extra={
            <Button onClick={() => navigate(`/operations/${c.id}`)}>
              进入运维周期
            </Button>
          }
        >
          <Descriptions
            items={[
              { key: "contract", label: "原合同", children: c.contractId },
              {
                key: "dates",
                label: "周期",
                children: `${c.startDate} 至 ${c.endDate}`,
              },
              { key: "source", label: "实际来源", children: c.source },
            ]}
          />
        </Card>
      ))}
      {h && (
        <Card
          title={
            <Space>
              移交记录<Tag>{h.status}</Tag>
            </Space>
          }
          style={{ marginTop: 16 }}
          extra={
            h.status === "待接收" &&
            h.receiverId === currentUser.id && (
              <Button
                type="primary"
                disabled={!canDo("accept-operation-handover", p.id)}
                onClick={() => {
                  if (!canDo("accept-operation-handover", p.id)) return;
                  try {
                    dispatch(
                      { type: "accept-operation-handover", projectId: p.id },
                      actor,
                    );
                    message.success("已确认接收");
                  } catch (e) {
                    message.error((e as Error).message);
                  }
                }}
              >
                确认全部交接并接收
              </Button>
            )
          }
        >
          <Descriptions
            column={2}
            bordered
            items={[
              { key: "basis", label: "合同判定依据", children: h.basis },
              {
                key: "receiver",
                label: "指定接收人",
                children:
                  mockUsers.find((u) => u.id === h.receiverId)?.name ??
                  "无需运维",
              },
              { key: "scope", label: "服务范围", children: h.scope || "—" },
              { key: "sla", label: "SLA", children: h.sla || "—" },
              {
                key: "system",
                label: "系统信息",
                children: h.systemInfo || "—",
              },
              {
                key: "issues",
                label: "遗留问题及处置",
                children: h.legacyIssues || "—",
              },
              {
                key: "accounts",
                label: "账号权限交接凭据",
                children: h.accounts || "—",
              },
              {
                key: "docs",
                label: "项目文档交接",
                children: h.documents || "—",
              },
              {
                key: "date",
                label: "提交人/时间",
                children: `${h.submittedBy} / ${h.submittedAt}`,
              },
              {
                key: "accepted",
                label: "接收人/时间",
                children: h.acceptedAt
                  ? `${h.acceptedBy} / ${h.acceptedAt}`
                  : "尚未接收",
              },
            ]}
          />
        </Card>
      )}
      {canEdit && cycles.length === 0 && h?.status !== "已接收" && (
        <Card title="合同运维判定与移交清单" style={{ marginTop: 16 }}>
          <Form
            form={form}
            disabled={!canEdit}
            layout="vertical"
            initialValues={h ?? { startDate: AS_OF_DATE }}
          >
            <Form.Item label="需要运维">
              <Switch
                checked={required}
                onChange={setRequired}
                checkedChildren="需要"
                unCheckedChildren="无需"
              />
            </Form.Item>
            <Form.Item
              name="contractId"
              label="原项目合同"
              rules={[{ required: true }]}
            >
              <Select
                options={data.contracts
                  .filter((c) => c.projectId === p.id)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.code} · ${c.name}`,
                  }))}
              />
            </Form.Item>
            <Form.Item
              name="basis"
              label="运维 / 无需运维的合同条款依据"
              rules={[{ required: true }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
            {required && (
              <>
                <Space align="start">
                  <Form.Item
                    name="startDate"
                    label="运维开始日期"
                    rules={[{ required: true }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item
                    name="endDate"
                    label="运维结束日期"
                    rules={[{ required: true }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                </Space>
                <Form.Item
                  name="receiverId"
                  label="运维团队接收负责人"
                  rules={[{ required: true }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={mockUsers.map((u) => ({
                      value: u.id,
                      label: `${u.name} · ${u.role}`,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="teamIds" label="运维团队成员（真实人员目录）">
                  <Select
                    mode="multiple"
                    options={mockUsers.map((u) => ({
                      value: u.id,
                      label: `${u.name} · ${u.role}`,
                    }))}
                  />
                </Form.Item>
                {[
                  ["scope", "服务范围与联系人"],
                  ["sla", "服务等级 / 响应和恢复时间"],
                  ["systemInfo", "系统清单 / 部署信息"],
                  ["legacyIssues", "遗留问题 / 处置责任与期限"],
                  ["accounts", "账号与权限交接凭据"],
                  ["documents", "已归档文档 / 操作手册移交记录"],
                ].map(([name, label]) => (
                  <Form.Item
                    key={name}
                    name={name}
                    label={label}
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                ))}
              </>
            )}
            <Button
              type="primary"
              disabled={!canEdit || !data.projectArchives[p.id]}
              onClick={() => void submit()}
            >
              提交合同判定与移交
            </Button>
          </Form>
        </Card>
      )}
    </>
  );
}
