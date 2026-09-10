import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Table,
  Tag,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/business";
import { visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import { closeChecks } from "@/mock/operations";
export function ProjectClosePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { message } = App.useApp();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (!visibleProjects(currentRole, data.projects, data).some((v) => v.id === id))
    return <StateView type="403" />;
  const checks = closeChecks(data, p.id);
  const closure = data.projectClosures[p.id];
  const history = p.phase === "已关闭" && !closure;
  const failed = checks.filter((c) => !c.ok);
  const paths = [
    "settlement",
    "post-evaluation",
    "archive",
    "business-result",
    "settlement/apply",
    "operation-handover",
    "issues",
    "operation-handover",
    "operation-handover",
    "operation-handover",
  ];
  return (
    <>
      <PageHeader
        title="JS-13 项目关闭"
        description={`${p.name} · ${closure || history ? "已关闭" : "关闭准备"}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "项目关闭" },
        ]}
        extra={
          <Button
            type="primary"
            disabled={
              currentRole !== "pmo" || !!closure || history || failed.length > 0
            }
            onClick={() => setConfirm(true)}
          >
            PMO确认关闭
          </Button>
        }
      />
      <Alert
        type={closure ? "success" : history ? "warning" : "info"}
        showIcon
        message={
          closure
            ? "项目正式关闭，关闭快照和历史业务只读。"
            : history
              ? "历史导入项目已关闭，未伪造正式关闭快照；缺少的后评价和档案可按补录流程完善。"
              : "最终结算不会自动关闭项目。需完成评价、归档、收款和运维退出，再由PMO确认。"
        }
      />
      <Card title="真实关闭门禁" style={{ marginTop: 16 }}>
        <Table
          rowKey="label"
          pagination={false}
          dataSource={checks}
          columns={[
            { title: "检查项", dataIndex: "label" },
            {
              title: "当前结果",
              dataIndex: "ok",
              render: (ok) => (
                <Tag color={ok ? "green" : "red"}>
                  {ok ? "已满足" : "待处理"}
                </Tag>
              ),
            },
            {
              title: "原业务",
              render: (_, r, index) => (
                <Button
                  type="link"
                  onClick={() => navigate(`/projects/${p.id}/${paths[index]}`)}
                >
                  查看{r.ok ? "来源" : "并处理"}
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Card title="合同应收与回款计划" style={{ marginTop: 16 }}>
        <Alert
          type="info"
          message="关闭页只核对原合同与实际回款计划，不在此确认收款或减免应收。"
        />
        <Table
          rowKey="id"
          dataSource={data.contracts.filter((c) => c.projectId === p.id)}
          columns={[
            { title: "合同", dataIndex: "name" },
            { title: "合同金额（万元）", dataIndex: "amount" },
            { title: "实收（万元）", dataIndex: "paidAmount" },
            { title: "待收（万元）", dataIndex: "unpaidAmount" },
          ]}
        />
        <Table
          rowKey="id"
          dataSource={data.receiptPlans.filter((r) => r.projectId === p.id)}
          columns={[
            { title: "回款节点", dataIndex: "title" },
            { title: "到期日期", dataIndex: "dueDate" },
            { title: "计划金额", dataIndex: "amount" },
            { title: "已收金额", dataIndex: "paidAmount" },
          ]}
        />
      </Card>
      {closure && (
        <Card title="不可变关闭快照" style={{ marginTop: 16 }}>
          <Descriptions
            bordered
            column={2}
            items={[
              { key: "id", label: "关闭编号", children: closure.id },
              {
                key: "actor",
                label: "确认人 / 日期",
                children: `${closure.actor} / ${closure.date}`,
              },
              {
                key: "archive",
                label: "正式档案",
                children: closure.archiveId,
              },
              {
                key: "evaluation",
                label: "后评价",
                children: closure.evaluationId,
              },
              {
                key: "settlement",
                label: "最终结算",
                children: closure.settlementId,
              },
              {
                key: "cycles",
                label: "运维周期",
                children: closure.operationIds.join("、") || "无需运维",
              },
              { key: "note", label: "关闭意见", children: closure.note },
            ]}
          />
        </Card>
      )}
      <Modal
        title="确认关闭项目"
        open={confirm}
        onCancel={() => setConfirm(false)}
        onOk={() => {
          try {
            dispatch(
              { type: "confirm-project-close", projectId: p.id, note },
              { id: currentUser.id, name: currentUser.name, role: currentRole },
            );
            message.success("项目已正式关闭");
            setConfirm(false);
          } catch (e) {
            message.error((e as Error).message);
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="warning"
            message="确认将保存归档、后评价、结算、周期和回款快照，项目进入历史只读状态。"
          />
          <Input.TextArea
            aria-label="项目关闭意见"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="填写关闭核对结论与责任交接说明"
          />
        </Space>
      </Modal>
    </>
  );
}
