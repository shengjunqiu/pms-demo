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
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
} from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { PageSection, PageToolbar } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import { MoneyText } from "@/components/common/MoneyText";
import { useBusinessStore } from "@/mock/business";
import {
  pendingSettlementSources,
  settlementChecks,
  settlementSnapshot,
  type SettlementAction,
} from "@/mock/settlement";
import { selectFourCalculations, visibleProjects } from "@/mock/selectors";
import { constructionLockReason } from "@/mock/construction-lock";
import { useAppStore } from "@/store/useAppStore";

type ReviewOperation = Extract<
  SettlementAction,
  { type: "review-settlement" }
>["operation"];
const labels: Record<ReviewOperation, string> = {
  "finance-confirm": "财务核算确认",
  "pmo-audit": "PMO材料审核通过",
  "review-pass": "结算评审通过",
  "material-return": "退回补充材料",
  "amount-return": "财务退回金额调整",
  lock: "财务最终锁定",
};
export function SettlementPage({ apply = false }: { apply?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const viewMargin = canViewSensitiveField(data, currentUser, "margin");
  const hiddenMargin = "毛利字段无查看权限";
  const displayText = (value?: string) =>
    !viewMargin && /毛利|gross.?margin/i.test(value ?? "")
      ? hiddenMargin
      : value;
  const { message } = App.useApp();
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState("");
  const [operation, setOperation] = useState<ReviewOperation>();
  const [opinion, setOpinion] = useState("");
  const [invoiced, setInvoiced] = useState(0);
  const [tax, setTax] = useState(0);
  const [sourceId, setSourceId] = useState<string>();
  const [disposition, setDisposition] = useState<"已有凭证" | "取消不发生">(
    "取消不发生",
  );
  const [ledgerId, setLedgerId] = useState<string>();
  const [evidence, setEvidence] = useState("");
  const [balance, setBalance] = useState<{
    subjectId: string;
    bucket: "承诺" | "预测";
    max: number;
  }>();
  const [actual, setActual] = useState(true);
  const [amount, setAmount] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    ![
      "executive",
      "pmo",
      "finance",
      "project-manager",
      "market",
      "admin",
    ].includes(currentRole) ||
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const pm = currentRole === "project-manager" && p.pmId === currentUser.id;
  const finance = currentRole === "finance";
  const pmo = currentRole === "pmo";
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const requests = data.settlementRequests
    .filter((r) => r.projectId === p.id)
    .sort((a, b) => b.version - a.version);
  const request = params.get("request")
    ? requests.find((r) => r.id === params.get("request"))
    : requests[0];
  const calc = selectFourCalculations(p, data);
  const snapshot = request?.snapshot ?? settlementSnapshot(data, p.id);
  const checks = settlementChecks(data, p.id, request?.id);
  const pending = pendingSettlementSources(data, p.id);
  const frozen = constructionLockReason(data, p.id);
  const final = data.settlements.find(
    (s) => s.projectId === p.id && s.status === "已锁定已生效",
  );
  const live = !request?.supersededBy;
  const canEdit =
    (pm || currentRole === "market") &&
    !final &&
    (!request || ["草稿", "材料整改", "金额退回"].includes(request.status)) &&
    live &&
    canDo("save-settlement", request?.id ?? p.id);
  const canResolve =
    finance && !frozen && canDo("resolve-settlement-source", p.id);
  const canDispose =
    finance && !frozen && canDo("dispose-settlement-balance", p.id);
  const run = (action: SettlementAction) => {
    if (!canDo(action.type, "id" in action ? (action.id ?? p.id) : p.id))
      return false;
    try {
      dispatch(action, actor);
      message.success("结算原单与状态已更新");
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    }
  };
  const beginEdit = () => {
    if (!canEdit) return;
    setNote(
      displayText(request?.note) === hiddenMargin ? "" : (request?.note ?? ""),
    );
    setFiles(request?.files.join("\n") ?? "");
    setEdit(true);
  };
  const review = (op: ReviewOperation) => {
    setOperation(op);
    setOpinion("");
    setInvoiced(request?.finance?.invoicedAmount ?? 0);
    setTax(request?.finance?.taxAmount ?? 0);
  };
  const stage = [
    "财务核算",
    "PMO审核",
    "结算评审",
    "待最终锁定",
    "已锁定",
  ].indexOf(request?.status ?? "");
  const canReviewOperation = (op?: ReviewOperation) =>
    !!op &&
    !!request &&
    live &&
    canDo("review-settlement", request.id) &&
    (op === "finance-confirm"
      ? finance && request.status === "财务核算"
      : op === "pmo-audit"
        ? pmo && request.status === "PMO审核"
        : op === "review-pass"
          ? pmo && request.status === "结算评审"
          : op === "lock"
            ? finance && request.status === "待最终锁定"
            : op === "amount-return"
              ? finance && stage >= 0 && stage < 4
              : (finance || pmo) && stage >= 0 && stage < 4);
  return (
    <>
      <PageHeader
        title={apply ? "JS-05 项目结算申请" : "JS-06 项目结算详情"}
        description={`${p.id} · ${p.name} · ${p.pmName} · ${request ? `申请V${request.version}` : final ? "历史冻结结算" : "结算准备"}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          {
            title: "验收与结算",
            href: `/projects/${p.id}/customer-acceptance`,
          },
          { title: apply ? "结算申请" : "结算详情" },
        ]}
        extra={
          <Space>
            <Button
              onClick={() =>
                navigate(
                  `/projects/${p.id}/${apply ? "settlement" : "settlement/apply"}`,
                )
              }
            >
              {apply ? "结算版本与审核" : "返回结算申请"}
            </Button>
            <Button type="primary" disabled={!canEdit} onClick={beginEdit}>
              {request ? "补充结算材料" : "编制结算申请"}
            </Button>
          </Space>
        }
      />
      <PageToolbar>
        <Button
          onClick={() => navigate(`/projects/${p.id}/customer-acceptance`)}
        >
          最终验收原单
        </Button>
        <Button onClick={() => navigate(`/projects/${p.id}/four-calculations`)}>
          四算对比
        </Button>
        <Button onClick={() => navigate(`/projects/${p.id}/business-result`)}>
          经营结果
        </Button>
        <Button onClick={() => navigate(`/projects/${p.id}/post-evaluation`)}>
          项目后评价
        </Button>
      </PageToolbar>
      <Alert
        showIcon
        type={frozen ? "warning" : "info"}
        style={{ marginBottom: 16 }}
        message={
          frozen ??
          "结算提交即冻结建设成本；财务核算、PMO审核和评审全部通过后，由财务最终锁定结果。"
        }
        description="材料退回只补充附件，建设金额继续冻结；财务明确退回金额调整才解除临时冻结。重新提交生成新版本，原数据快照保留。结算通过后项目仍处于收尾，后评价、归档及运维/关闭另行办理。"
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}><MetricStatCard title="合同收入" value={snapshot.income} /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="实际建设成本" value={snapshot.cost} statusType="info" /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="建设毛利率" value={viewMargin && snapshot.income > 0 ? `${(((snapshot.income - snapshot.cost) / snapshot.income) * 100).toFixed(1)}%` : "已脱敏"} statusType="healthy" /></Col>
        <Col xs={12} xl={6}><MetricStatCard title="结算状态" value={request?.status ?? (final ? "已锁定" : "待发起")} statusType={frozen ? "warning" : "healthy"} /></Col>
      </Row>
      {apply && (
        <>
          <PageSection title="发起条件检查" description="全面核对终验、未决流水与成本闭环条件。" className="mb-4">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={checks}
              columns={[
                { title: "检查项", dataIndex: "name", width: 180 },
                {
                  title: "结果",
                  width: 90,
                  render: (_, c) => (
                    <Tag color={c.passed ? "success" : "error"}>
                      {c.passed ? "满足" : "阻断"}
                    </Tag>
                  ),
                },
                { title: "当前依据", dataIndex: "detail" },
                {
                  title: "业务入口",
                  width: 120,
                  render: (_, c) => (
                    <Button
                      onClick={() => navigate(`/projects/${p.id}/${c.path}`)}
                    >
                      查看原业务
                    </Button>
                  ),
                },
              ]}
            />
          </PageSection>
          <PageSection
            title={`待处理成本原单（${pending.length}）`}
            description="历史导入待审单逐条财务核对；已有凭证须金额一致且唯一绑定。"
            className="mb-4"
          >
            <Alert
              type="info"
              style={{ marginBottom: 12 }}
              message="历史导入待审单逐条财务核对；已有凭证须金额一致且唯一绑定。动态工时/采购外包费用须到原单审核入账。取消不发生必须保存原始取消依据。"
            />
            <Table
              rowKey="id"
              size="small"
              scroll={{ x: 850 }}
              dataSource={pending}
              pagination={{ pageSize: 5 }}
              columns={[
                {
                  title: "来源 / 内容",
                  render: (_, s) => (
                    <>
                      {s.id}
                      <div>{s.name}</div>
                    </>
                  ),
                },
                {
                  title: "待核金额",
                  render: (_, s) => <MoneyText value={s.amount} />,
                },
                {
                  title: "办理",
                  render: (_, s) => (
                    <Space>
                      <Button
                        onClick={() =>
                          navigate(`/projects/${p.id}/${s.path}?source=${s.id}`)
                        }
                      >
                        原单
                      </Button>
                      <Button
                        disabled={!canResolve || !s.imported}
                        onClick={() => {
                          setSourceId(s.id);
                          setEvidence("");
                          setDisposition("取消不发生");
                          setLedgerId(undefined);
                        }}
                      >
                        财务核对
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </PageSection>
          <PageSection
            title="承诺与剩余预测逐科目处置"
            description="实际发生：未决余额等额转实际，滚动总额不增加。原有成本流水不被覆盖。"
            className="mb-4"
          >
            <Table
              rowKey="subjectId"
              size="small"
              pagination={false}
              dataSource={calc.subjects.filter(
                (s) => s.committed > 0 || s.remaining > 0,
              )}
              columns={[
                { title: "科目", dataIndex: "subjectName" },
                {
                  title: "未发生承诺",
                  render: (_, s) => <MoneyText value={s.committed} />,
                },
                {
                  title: "剩余预测",
                  render: (_, s) => <MoneyText value={s.remaining} />,
                },
                {
                  title: "财务处置",
                  render: (_, s) => (
                    <Space>
                      {(["承诺", "预测"] as const).map((bucket) => (
                        <Button
                          key={bucket}
                          disabled={
                            !canDispose ||
                            (bucket === "承诺" ? s.committed : s.remaining) <= 0
                          }
                          onClick={() => {
                            const max =
                              bucket === "承诺" ? s.committed : s.remaining;
                            setBalance({ subjectId: s.subjectId, bucket, max });
                            setAmount(max);
                            setEvidence("");
                            setActual(true);
                          }}
                        >
                          {bucket}处置
                        </Button>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
            <p style={{ marginTop: 8 }}>
              实际发生：未决余额等额转实际，滚动总额不增加。取消不发生：只减少未决余额，保存取消依据。原有成本流水不被覆盖。
            </p>
          </PageSection>
        </>
      )}
      <PageSection
        title="结算取数与来源快照"
        description="锁定或审核取数依据，可穿透合同、成本与回款明细。"
        extra={
          <Button onClick={() => setShowSources(true)}>
            穿透合同、成本与回款
          </Button>
        }
        className="mb-4"
      >
        <Descriptions
          bordered
          column={3}
          size="small"
          items={[
            {
              key: "income",
              label: "合同收入",
              children: <MoneyText value={snapshot.income} />,
            },
            {
              key: "cost",
              label: "实际建设成本",
              children: <MoneyText value={snapshot.cost} />,
            },
            {
              key: "gross",
              label: "建设毛利",
              children: viewMargin ? (
                <MoneyText value={snapshot.income - snapshot.cost} />
              ) : (
                hiddenMargin
              ),
            },
            {
              key: "paid",
              label: "已回款",
              children: <MoneyText value={snapshot.receipts} />,
            },
            {
              key: "due",
              label: "待回款",
              children: <MoneyText value={snapshot.receivable} />,
            },
            {
              key: "overdue",
              label: "逾期回款",
              children: <MoneyText value={snapshot.overdue} />,
            },
            {
              key: "estimate",
              label: "冻结概算",
              children: `${snapshot.estimateId} / ${snapshot.estimateVersion}`,
            },
            {
              key: "budget",
              label: "生效预算",
              children: `${snapshot.budgetId} / ${snapshot.budgetVersion}`,
            },
            {
              key: "acceptance",
              label: "验收最终确认",
              children: snapshot.confirmedAt || "尚未确认",
            },
            {
              key: "last",
              label: "执行期最后滚动",
              children: <MoneyText value={snapshot.lastRolling} />,
            },
            {
              key: "date",
              label: "滚动快照日期",
              children: snapshot.lastRollingDate,
            },
            { key: "basis", label: "取数日期", children: snapshot.capturedAt },
          ]}
        />
      </PageSection>
      <PageSection title="结算版本与流程" description="按版本追踪审批流转、意见留痕与各节点审核动作。" className="mb-4">
        <Select
          style={{ width: "100%", marginBottom: 16 }}
          value={request?.id}
          placeholder={
            final ? "历史已锁定结果，未导入审批原单" : "尚无结算申请"
          }
          onChange={(v) => setParams({ request: v })}
          options={requests.map((r) => ({
            value: r.id,
            label: `${r.id} · V${r.version} · ${r.status}${r.supersededBy ? " · 已有后续版本" : ""}`,
          }))}
        />
        {request ? (
          <>
            <Steps
              size="small"
              current={stage < 0 ? 0 : stage}
              status={
                ["材料整改", "金额退回"].includes(request.status)
                  ? "error"
                  : "process"
              }
              items={[
                "财务核算",
                "PMO审核",
                "结算评审",
                "财务锁定",
                "结果生效",
              ].map((title) => ({ title }))}
            />
            <Descriptions
              column={1}
              style={{ marginTop: 16 }}
              items={[
                {
                  key: "note",
                  label: "结算结论/偏差说明",
                  children: displayText(request.note),
                },
                {
                  key: "files",
                  label: "结算报告及附件",
                  children: request.files.join("、"),
                },
                {
                  key: "status",
                  label: "当前状态",
                  children: <Tag>{request.status}</Tag>,
                },
                {
                  key: "prev",
                  label: "前一版本",
                  children: request.previousId ? (
                    <Button
                      type="link"
                      onClick={() =>
                        setParams({ request: request.previousId! })
                      }
                    >
                      {request.previousId}
                    </Button>
                  ) : (
                    "首次申请"
                  ),
                },
              ]}
            />
            <Space wrap style={{ marginBottom: 16 }}>
              {(
                [
                  "finance-confirm",
                  "pmo-audit",
                  "review-pass",
                  "lock",
                  "material-return",
                  "amount-return",
                ] as ReviewOperation[]
              ).map((op) => {
                const enabled = canReviewOperation(op);
                return (
                  <Button
                    key={op}
                    type={op === "lock" ? "primary" : "default"}
                    danger={op === "amount-return"}
                    disabled={!enabled || !live}
                    onClick={() => review(op)}
                  >
                    {labels[op]}
                  </Button>
                );
              })}
            </Space>
            <Timeline
              items={request.history.map((h) => ({
                children: (
                  <>
                    <b>
                      {h.date} · {h.actor} ·{" "}
                      {labels[h.action as ReviewOperation] ?? h.action}
                    </b>
                    <p>{displayText(h.opinion)}</p>
                  </>
                ),
              }))}
            />
          </>
        ) : (
          <p>
            {final
              ? "历史正式结算结果已锁定；收入、成本与版本保留用于四算和后评价。"
              : "完成条件检查后编制申请，草稿不冻结金额。"}
          </p>
        )}
      </PageSection>
      {(data.settlementCostReviews.some((r) => r.projectId === p.id) ||
        data.settlementCostDispositions.some((r) => r.projectId === p.id)) && (
        <PageSection title="未决成本处置依据" description="记录所有已核销或取消不发生明细，保持原始凭证与审计留痕。" className="mb-4">
          <Table
            rowKey="id"
            size="small"
            dataSource={[
              ...data.settlementCostReviews
                .filter((r) => r.projectId === p.id)
                .map((r) => ({ ...r, source: r.sourceId })),
              ...data.settlementCostDispositions
                .filter((r) => r.projectId === p.id)
                .map((r) => ({ ...r, source: `${r.subjectId} · ${r.bucket}` })),
            ]}
            columns={[
              { title: "来源", dataIndex: "source" },
              { title: "处置", dataIndex: "disposition" },
              { title: "金额", dataIndex: "amount" },
              {
                title: "凭证 / 依据",
                render: (_, r) => (
                  <>
                    {r.ledgerId ?? "取消不发生"}
                    <div>{r.evidence}</div>
                  </>
                ),
              },
              {
                title: "核对人 / 日期",
                render: (_, r) => (
                  <>
                    {r.actor}
                    <div>{r.date}</div>
                  </>
                ),
              },
            ]}
          />
        </PageSection>
      )}
      <Modal
        width={720}
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        title="编制/补充结算报告"
        open={edit}
        onCancel={() => setEdit(false)}
        footer={
          <Space>
            <Button onClick={() => setEdit(false)}>取消</Button>
            <Button
              disabled={!canEdit || request?.status === "材料整改"}
              onClick={() => {
                if (!canEdit) return;
                if (
                  run({
                    type: "save-settlement",
                    projectId: p.id,
                    id: request?.id,
                    note:
                      displayText(request?.note) === hiddenMargin
                        ? request!.note
                        : note,
                    files: files.split("\n").filter(Boolean),
                    submit: false,
                  })
                )
                  setEdit(false);
              }}
            >
              保存草稿
            </Button>
            <Button
              type="primary"
              disabled={!canEdit || checks.some((c) => !c.passed)}
              onClick={() => {
                if (!canEdit) return;
                if (
                  run({
                    type: "save-settlement",
                    projectId: p.id,
                    id: request?.id,
                    note:
                      displayText(request?.note) === hiddenMargin
                        ? request!.note
                        : note,
                    files: files.split("\n").filter(Boolean),
                    submit: true,
                  })
                ) {
                  setEdit(false);
                  setParams({});
                }
              }}
            >
              确认提交并冻结建设成本
            </Button>
          </Space>
        }
      >
        <Alert
          type="warning"
          message="提交将保存本次金额和版本快照，并冻结建设期成本入口。"
        />
        <Form layout="vertical" disabled={!canEdit}>
          <Form.Item label="经营结论、主要偏差与遗留事项" required>
            <Input.TextArea
              aria-label="结算报告说明"
              disabled={!canEdit || displayText(request?.note) === hiddenMargin}
              placeholder={
                displayText(request?.note) === hiddenMargin
                  ? "原说明含毛利，已隐藏并原样保留；可继续补充附件"
                  : undefined
              }
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>
          <Form.Item
            label="结算报告与附件文件名（每行一份，前端登记）"
            required
          >
            <Input.TextArea
              aria-label="结算附件"
              rows={3}
              value={files}
              onChange={(e) => setFiles(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={operation ? labels[operation] : ""}
        open={!!operation}
        onCancel={() => setOperation(undefined)}
        okButtonProps={{ disabled: !canReviewOperation(operation) }}
        onOk={() => {
          if (!canReviewOperation(operation)) return;
          if (
            run({
              type: "review-settlement",
              id: request!.id,
              operation: operation!,
              opinion,
              invoicedAmount: invoiced,
              taxAmount: tax,
            })
          )
            setOperation(undefined);
        }}
      >
        {operation === "finance-confirm" && (
          <Form layout="vertical" disabled={!canReviewOperation(operation)}>
            <Form.Item label="财务确认已开票金额（万元）">
              <InputNumber
                aria-label="结算已开票金额"
                value={invoiced}
                onChange={(v) => setInvoiced(v ?? 0)}
                min={0}
                max={snapshot.income}
              />
            </Form.Item>
            <Form.Item label="财务确认税费（万元）">
              <InputNumber
                aria-label="结算税费"
                value={tax}
                onChange={(v) => setTax(v ?? 0)}
                min={0}
                max={snapshot.income}
              />
            </Form.Item>
            <Alert
              type="info"
              message="开票与税费为财务手工确认的演示字段；合同收入和成本取原单只读，不接真实开票系统。"
            />
          </Form>
        )}
        {operation === "material-return" && (
          <Alert type="warning" message="仅退回材料，不解除建设成本冻结。" />
        )}
        {operation === "amount-return" && (
          <Alert
            type="warning"
            message="财务明确要求调整金额：解除本申请临时冻结，原快照保留，修改成本后须重新提交。"
          />
        )}
        <Form layout="vertical" disabled={!canReviewOperation(operation)}>
          <Form.Item label="办理意见" required>
            <Input.TextArea
              aria-label="结算办理意见"
              rows={4}
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="历史未决成本财务核对"
        open={!!sourceId}
        onCancel={() => setSourceId(undefined)}
        okButtonProps={{ disabled: !canResolve }}
        onOk={() => {
          if (!canResolve) return;
          if (
            run({
              type: "resolve-settlement-source",
              projectId: p.id,
              sourceId: sourceId!,
              disposition,
              ledgerId,
              evidence,
            })
          )
            setSourceId(undefined);
        }}
      >
        <p>原单：{sourceId}</p>
        <Form layout="vertical" disabled={!canResolve}>
          <Form.Item label="核对结论">
            <Select
              value={disposition}
              onChange={setDisposition}
              options={["已有凭证", "取消不发生"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          {disposition === "已有凭证" && (
            <Form.Item label="绑定唯一同金额成本凭证">
              <Select
                showSearch
                value={ledgerId}
                onChange={setLedgerId}
                options={data.costs
                  .filter((c) => c.projectId === p.id)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.id} · ${c.amount} 万元 · ${c.description}`,
                  }))}
              />
            </Form.Item>
          )}
          <Form.Item label="原始取消/已入账依据" required>
            <Input.TextArea
              aria-label="未决成本核对依据"
              rows={4}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`逐科目${balance?.bucket ?? ""}处置`}
        open={!!balance}
        onCancel={() => setBalance(undefined)}
        okButtonProps={{ disabled: !canDispose }}
        onOk={() => {
          if (!canDispose) return;
          if (
            run({
              type: "dispose-settlement-balance",
              projectId: p.id,
              subjectId: balance!.subjectId,
              bucket: balance!.bucket,
              disposition: actual ? "实际发生" : "取消不发生",
              amount,
              evidence,
            })
          )
            setBalance(undefined);
        }}
      >
        <p>
          {balance?.subjectId} · 可处置 {balance?.max} 万元
        </p>
        <Form layout="vertical" disabled={!canDispose}>
          <Form.Item label="实际发生或取消">
            <Select
              value={actual ? "actual" : "cancel"}
              onChange={(v) => setActual(v === "actual")}
              options={[
                { value: "actual", label: "实际发生，生成唯一凭证并等额转换" },
                { value: "cancel", label: "取消 / 不再发生，减少未决余额" },
              ]}
            />
          </Form.Item>
          <Form.Item label="本次金额（万元）">
            <InputNumber
              aria-label="未决余额处置金额"
              min={0}
              max={balance?.max}
              precision={6}
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
            />
          </Form.Item>
          <Form.Item label="发生凭据 / 取消依据" required>
            <Input.TextArea
              aria-label="未决余额处置依据"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        width={880}
        title="结算取数原始来源"
        open={showSources}
        onClose={() => setShowSources(false)}
      >
        <Card size="small" title="合同快照">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={snapshot.contracts}
            columns={[
              { title: "合同ID", dataIndex: "id" },
              { title: "合同编号", dataIndex: "code" },
              { title: "金额（万元）", dataIndex: "amount" },
              { title: "状态", dataIndex: "status" },
            ]}
          />
        </Card>
        <Card title="成本凭证快照" size="small" style={{ marginTop: 12 }}>
          <Table
            rowKey="id"
            size="small"
            dataSource={snapshot.costs}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: "凭证 / 来源",
                render: (_, c) => (
                  <>
                    {c.id}
                    <div>{c.sourceId}</div>
                  </>
                ),
              },
              { title: "科目", dataIndex: "subjectName" },
              { title: "金额", dataIndex: "amount" },
              { title: "内容", dataIndex: "description" },
            ]}
          />
        </Card>
        <Card size="small" title="回款计划快照" style={{ marginTop: 12 }}>
          <Table
            rowKey="id"
            size="small"
            dataSource={snapshot.receiptPlans}
            columns={[
              { title: "原单", dataIndex: "id" },
              { title: "应收", dataIndex: "amount" },
              { title: "实收", dataIndex: "paidAmount" },
              { title: "到期", dataIndex: "dueDate" },
            ]}
          />
        </Card>
      </Drawer>
    </>
  );
}
