import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Space,
  Steps,
  Table,
  Tag,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { PageSection } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/store";
import { selectReceipts, visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import { closeChecks } from "@/mock/operations";
export function ProjectClosePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const { message } = App.useApp();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const checks = closeChecks(data, p.id);
  const receiptSummary = selectReceipts([p], data);
  const closure = data.projectClosures[p.id];
  const history = p.phase === "已关闭" && !closure;
  const failed = checks.filter((c) => !c.ok);
  const canClose =
    currentRole === "pmo" &&
    !closure &&
    !history &&
    failed.length === 0 &&
    canDo("confirm-project-close", p.id);
  const management =
    data.managementApprovals.find(
      (a) => a.projectId === p.id && a.status === "待审批",
    ) ?? data.managementApprovals.find((a) => a.projectId === p.id);
  const cycle = data.operationCycles.find((c) => c.projectId === p.id);
  const operationPath = cycle
    ? `/operations/${cycle.id}`
    : `/projects/${p.id}/operation-handover`;
  const settlementLocked = !!data.settlements.find(
    (s) => s.projectId === p.id && s.status === "已锁定已生效",
  );
  const evaluationDone = !!data.postEvaluations[p.id];
  const archiveDone = !!data.projectArchives[p.id];
  const handoverDone = data.operationHandovers[p.id]?.status === "已接收";
  const receiptsCleared = receiptSummary.outstanding === 0;
  const isOpsProject = p.isMaintenance || p.phase === '运维';
  const closeSteps = [
    {
      title: "结算锁定",
      status: settlementLocked ? "finish" as const : (closure ? "finish" as const : "wait" as const),
      onClick: () => navigate(`/projects/${p.id}/settlement`),
    },
    {
      title: "后评价",
      status: evaluationDone ? "finish" as const : (closure ? "finish" as const : "wait" as const),
      onClick: () => navigate(`/projects/${p.id}/post-evaluation`),
    },
    ...(isOpsProject ? [{
      title: "运维移交",
      status: handoverDone ? "finish" as const : (closure ? "finish" as const : "wait" as const),
      onClick: () => navigate(`/projects/${p.id}/operation-handover`),
    }] : [{
      title: "正式归档",
      status: archiveDone ? "finish" as const : (closure ? "finish" as const : "wait" as const),
      onClick: () => navigate(`/projects/${p.id}/archive`),
    }]),
    {
      title: "应收结清",
      status: receiptsCleared ? "finish" as const : (closure ? "finish" as const : "wait" as const),
      onClick: () => navigate(`/projects/${p.id}/business-result`),
    },
    {
      title: "PMO确认关闭",
      status: closure ? "finish" as const : "wait" as const,
    },
  ];
  const paths: Record<string, string> = {
    管理决策事项已办理: management
      ? `/management-approvals/${management.id}`
      : `/workbench/todos?project=${p.id}&type=管理决策`,
    财务最终结算锁定: `/projects/${p.id}/settlement`,
    后评价已完成: `/projects/${p.id}/post-evaluation`,
    正式归档已确认: `/projects/${p.id}/archive`,
    合同及回款计划应收结清: `/projects/${p.id}/business-result`,
    建设期未决成本及承诺预测清零: `/projects/${p.id}/settlement/apply`,
    "运维判定明确、周期全部退出": operationPath,
    重大建设期问题已解决: `/issues-risks?projectId=${p.id}&kind=issue`,
    "运维问题/风险全部解决": operationPath,
    "运维工时 / 费用原单已核对": `${operationPath}${cycle ? "?tab=costs" : ""}`,
    运维历史费用均关联实际周期: `${operationPath}${cycle ? "?tab=costs" : ""}`,
  };
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
          <Space>
            {p.isMaintenance && p.phase !== '运维' && settlementLocked && !closure && (
              <Button
                type="default"
                onClick={() => {
                  try {
                    dispatch(
                      { type: "update-project-phase", projectId: p.id, phase: "运维", subPhase: "质保运维" },
                      { id: currentUser.id, name: currentUser.name, role: currentRole },
                    );
                    message.success("项目已转入运维阶段");
                  } catch (e) {
                    message.error((e as Error).message);
                  }
                }}
              >
                进入运维阶段
              </Button>
            )}
            <Button
              type="primary"
              disabled={!canClose}
              onClick={() => setConfirm(true)}
            >
              PMO确认关闭
            </Button>
          </Space>
        }
      />
      <Steps
        size="small"
        current={closeSteps.findIndex((s) => s.status === "wait")}
        style={{ marginBottom: 16 }}
        items={closeSteps.map((s) => ({
          title: (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              disabled={!s.onClick}
              onClick={s.onClick}
            >
              {s.title}
            </Button>
          ),
          status: s.status,
        }))}
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="关闭状态"
            value={closure || history ? "已正式关闭" : "准备关闭中"}
            statusType={closure || history ? "healthy" : "warning"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="关闭门禁达成"
            value={`${checks.filter((c) => c.ok).length}/${checks.length}`}
            unit="项"
            statusType={failed.length === 0 ? "healthy" : "danger"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="待办阻断项"
            value={failed.length}
            unit="项"
            statusType={failed.length === 0 ? "healthy" : "danger"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="应收结清"
            value={receiptSummary.outstanding === 0 ? "已结清" : `剩 ${receiptSummary.outstanding} 万元`}
            statusType={receiptSummary.outstanding === 0 ? "healthy" : "warning"}
          />
        </Col>
      </Row>
      <Alert
        type={closure ? "success" : history ? "warning" : "info"}
        showIcon
        style={{ marginBottom: 16 }}
        message={
          closure
            ? "项目正式关闭，关闭快照和历史业务只读。"
            : history
              ? "历史导入项目已关闭，未伪造正式关闭快照；缺少的后评价和档案可按补录流程完善。"
              : "最终结算不会自动关闭项目。需完成评价、归档、收款和运维退出，再由PMO确认。"
        }
      />
      <PageSection title="真实关闭门禁" description="核验结算锁定、后评价、归档确认、收款结清与运维退出全项条件。" className="mb-4">
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
              render: (_, r) => (
                <Button type="link" onClick={() => navigate(paths[r.label])}>
                  查看{r.ok ? "来源" : "并处理"}
                </Button>
              ),
            },
          ]}
        />
      </PageSection>
      <PageSection title="合同应收与回款计划" description="关闭页只核对原合同与实际回款计划，不在此确认收款或减免应收。" className="mb-4">
        <Table
          rowKey="id"
          dataSource={receiptSummary.contracts}
          columns={[
            { title: "合同", dataIndex: "name" },
            { title: "合同金额（万元）", dataIndex: "amount" },
            { title: "实收（万元）", dataIndex: "paidAmount" },
            { title: "待收（万元）", dataIndex: "unpaidAmount" },
          ]}
        />
        <Table
          rowKey="id"
          style={{ marginTop: 16 }}
          dataSource={receiptSummary.plans}
          columns={[
            { title: "回款节点", dataIndex: "title" },
            { title: "到期日期", dataIndex: "dueDate" },
            { title: "计划金额", dataIndex: "amount" },
            { title: "已收金额", dataIndex: "paidAmount" },
          ]}
        />
      </PageSection>
      {closure && (
        <PageSection title="不可变关闭快照" description="记录关闭确认人、归档与结算原单编号及关联运维周期。" className="mb-4">
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
        </PageSection>
      )}
      <Modal
        title="确认关闭项目"
        open={confirm}
        okButtonProps={{ disabled: !canClose }}
        onCancel={() => setConfirm(false)}
        onOk={() => {
          if (!canClose) return;
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
            disabled={!canClose}
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
