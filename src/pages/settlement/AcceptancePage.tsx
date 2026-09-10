import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
} from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/business";
import {
  acceptanceConditions,
  confirmedReportedAmount,
  acceptanceDetail,
  acceptancePaths,
  checkNames,
  supplierSources,
  type AcceptanceAction,
} from "@/mock/acceptance";
import { visibleProjects } from "@/mock/selectors";
import { useAppStore } from "@/store/useAppStore";
import type {
  AcceptanceCheck,
  AcceptanceDetail,
  AcceptanceType,
} from "@/models/settlement";
import { AS_OF_DATE } from "@/mock";

type Draft = Pick<
  AcceptanceDetail,
  | "scope"
  | "plannedDate"
  | "method"
  | "customerContact"
  | "participants"
  | "contractId"
  | "supplierSourceId"
>;
const titles = {
  内部初验: "JS-01 内部验收",
  供应商验收: "JS-02 供应商验收",
  客户终验: "JS-03 客户验收",
};
export function AcceptancePage({ kind }: { kind: AcceptanceType }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo, canEditField } = useActionAccess();
  const { message } = App.useApp();
  const [operation, setOperation] = useState<
    "submit" | "review" | "reply" | "proof" | "confirm"
  >();
  const [draft, setDraft] = useState<Draft>({
    scope: "",
    plannedDate: AS_OF_DATE,
    method: "现场验收",
    customerContact: "",
    participants: "",
  });
  const [checks, setChecks] = useState<AcceptanceCheck[]>([]);
  const [passed, setPassed] = useState(true);
  const [note, setNote] = useState("");
  const [process, setProcess] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("2026-09-20");
  const [correction, setCorrection] = useState("");
  const [files, setFiles] = useState("");
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const pm = currentRole === "project-manager" && currentUser.id === p.pmId;
  const pmo = currentRole === "pmo";
  const locked =
    data.lockedProjects.includes(p.id) || ["运维", "已关闭"].includes(p.phase);
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const rows = data.acceptances
    .filter((r) => r.projectId === p.id && r.type === kind)
    .sort((a, b) => b.round - a.round);
  const selected = rows.find((r) => r.id === params.get("record"));
  const d = selected ? acceptanceDetail(data, selected) : undefined;
  const conditions = acceptanceConditions(data, p.id, kind);
  const sources = supplierSources(data, p.id);
  const noSupplier = kind === "供应商验收" && !sources.length;
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const canOperate = (op: typeof operation) => {
    if (!op || locked) return false;
    if (op === "submit")
      return pm && canDo("submit-acceptance", selected?.id ?? p.id);
    if (!selected) return false;
    if (op === "review")
      return (
        (kind === "客户终验" ? pm : pmo) &&
        canDo("review-acceptance", selected.id)
      );
    if (op === "reply") return pm && canDo("reply-acceptance", selected.id);
    if (op === "proof")
      return pm && canDo("save-acceptance-proof", selected.id);
    return pmo && canDo("confirm-acceptance", selected.id);
  };
  const begin = (op: typeof operation) => {
    if (!canOperate(op)) return;
    setOperation(op);
    setNote("");
    setProcess(d?.process ?? "");
    setOwner(p.pmName);
    setFiles(d?.proofFiles.join("\n") ?? "");
    setCorrection("");
    setPassed(true);
    setChecks(
      d?.checks.map((c) => ({ ...c })) ??
        checkNames(kind).map((name) => ({ name, passed: false, note: "" })),
    );
    setDraft(
      d
        ? {
            scope: d.scope,
            plannedDate: AS_OF_DATE,
            method: d.method,
            customerContact: d.customerContact,
            participants: d.participants,
            contractId: d.contractId,
            supplierSourceId: d.supplierSourceId,
          }
        : {
            scope:
              data.baselines.find(
                (b) => b.projectId === p.id && b.status === "已生效",
              )?.scopeDesc ?? "",
            plannedDate: AS_OF_DATE,
            method: "现场验收",
            customerContact: "",
            participants: p.pmName,
            contractId: data.contracts.find((c) => c.projectId === p.id)?.id,
          },
    );
  };
  const execute = () => {
    if (!canOperate(operation)) return;
    try {
      let action: AcceptanceAction;
      const proofFiles = files
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      if (operation === "submit")
        action = {
          type: "submit-acceptance",
          projectId: p.id,
          kind,
          id: selected?.id,
          detail: canEditField("contact")
            ? draft
            : {
                ...draft,
                customerContact: selected
                  ? (data.acceptanceDetails[selected.id]?.customerContact ?? "")
                  : "",
              },
        };
      else if (operation === "review")
        action = {
          type: "review-acceptance",
          id: selected!.id,
          checks,
          passed,
          opinion: note,
          process,
          proofFiles,
          correction: { content: correction, owner, deadline },
        };
      else if (operation === "reply")
        action = { type: "reply-acceptance", id: selected!.id, reply: note };
      else if (operation === "proof")
        action = {
          type: "save-acceptance-proof",
          id: selected!.id,
          proofFiles,
        };
      else
        action = {
          type: "confirm-acceptance",
          id: selected!.id,
          proofFiles,
          opinion: note,
        };
      dispatch(action, actor);
      if (action.type === "submit-acceptance") {
        const next = useBusinessStore
          .getState()
          .data.acceptances.find(
            (r) => r.projectId === p.id && r.type === kind &&
              !data.acceptances.some((previous) => previous.id === r.id),
          ) ?? useBusinessStore.getState().data.acceptances.find((r) => r.id === action.id);
        if (next) setParam("record", next.id);
      }
      setOperation(undefined);
      message.success("验收原单已更新，历史轮次保留");
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  const status = (r: (typeof rows)[number]) =>
    r.status === "已通过" &&
    kind === "客户终验" &&
    !acceptanceDetail(data, r).confirmedAt
      ? "验收通过 · 待PMO确认"
      : r.status === "待验收" && !acceptanceDetail(data, r).submitted
        ? "准备中"
        : r.status;
  return (
    <>
      <PageHeader
        title={titles[kind]}
        description={`${p.id} · ${p.name} · ${p.pmName} · ${p.currentBaselineVersion}`}
        breadcrumbs={[
          { title: "项目", href: `/projects/${p.id}` },
          { title: kind },
        ]}
        extra={
          <Space>
            <Button onClick={() => navigate(`/projects/${p.id}/deliverables`)}>
              质量与交付物
            </Button>
            <Button
              type="primary"
              disabled={!canOperate("submit") || noSupplier}
              onClick={() => {
                setParam("record");
                begin("submit");
              }}
            >
              发起{kind}
            </Button>
          </Space>
        }
      />
      <Space wrap style={{ marginBottom: 16 }}>
        {(Object.keys(acceptancePaths) as AcceptanceType[]).map((k) => (
          <Button
            key={k}
            type={k === kind ? "primary" : "default"}
            onClick={() => navigate(`/projects/${p.id}/${acceptancePaths[k]}`)}
          >
            {k}
          </Button>
        ))}
        <Button onClick={() => navigate(`/projects/${p.id}/report-acceptance`)}>
          项目报验
        </Button>
        <Button onClick={() => navigate(`/projects/${p.id}/settlement/apply`)}>
          项目结算申请
        </Button>
      </Space>
      <Alert
        style={{ marginBottom: 16 }}
        showIcon
        type={noSupplier ? "success" : "info"}
        message={
          noSupplier
            ? "供应商验收不适用：本项目无采购、外包或供应商交付合同。"
            : "演示规则 ACC-1：原业务条件实时校验；整改回复后创建新轮次，历史结果不覆盖。客户通过后须登记签署证明并由PMO确认。"
        }
        description={
          kind === "供应商验收" && !noSupplier
            ? "采购组织及内部验收组由PMO身份模拟办理；来源履约通过仅更新验收节点，财务入账仍由原成本单据完成。"
            : undefined
        }
      />
      {kind === "客户终验" && (
        <Card size="small" title="合同验收计量" style={{ marginBottom: 16 }}>
          {data.contracts
            .filter((c) => c.projectId === p.id)
            .map((c) => (
              <p key={c.id}>
                {c.code} · 合同 {c.amount.toLocaleString("zh-CN")} 万元 ·
                累计已确认报验{" "}
                {confirmedReportedAmount(data, c.id).toLocaleString("zh-CN")}{" "}
                万元{" "}
                <Button
                  type="link"
                  onClick={() =>
                    navigate(`/projects/${p.id}/report-acceptance`)
                  }
                >
                  本次金额与分税点报验
                </Button>
              </p>
            ))}
        </Card>
      )}
      <Tabs
        defaultActiveKey="rounds"
        items={[
          {
            key: "rounds",
            label: `验收轮次（${rows.length}）`,
            children: (
              <Card size="small">
                <Space wrap style={{ marginBottom: 12 }}>
                  <Input
                    aria-label="验收查询"
                    placeholder="编号或范围"
                    value={params.get("q") ?? ""}
                    onChange={(e) => setParam("q", e.target.value)}
                  />
                  <Select
                    aria-label="验收状态筛选"
                    allowClear
                    placeholder="全部状态"
                    value={params.get("status") ?? undefined}
                    onChange={(v) => setParam("status", v)}
                    style={{ width: 150 }}
                    options={["待验收", "整改中", "已通过"].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                  <Button onClick={() => setParams({})}>重置查询</Button>
                </Space>
                {noSupplier ? (
                  <Empty description="本环节不适用，可进入客户验收" />
                ) : (
                  <Table
                    rowKey="id"
                    size="small"
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 6, showSizeChanger: false }}
                    dataSource={rows.filter(
                      (r) =>
                        (!params.get("status") ||
                          r.status === params.get("status")) &&
                        (!params.get("q") ||
                          `${r.id} ${acceptanceDetail(data, r).scope}`.includes(
                            params.get("q")!,
                          )),
                    )}
                    columns={[
                      {
                        title: "验收单 / 轮次",
                        width: 195,
                        render: (_, r) => (
                          <Button
                            type="link"
                            onClick={() => setParam("record", r.id)}
                          >
                            {r.id} · 第{r.round}轮
                          </Button>
                        ),
                      },
                      {
                        title: "范围 / 关联原单",
                        width: 310,
                        render: (_, r) => (
                          <>
                            {acceptanceDetail(data, r).scope}
                            <div style={{ color: "#667085" }}>
                              {acceptanceDetail(data, r).supplierSourceId ??
                                acceptanceDetail(data, r).contractId ??
                                "历史导入记录"}
                            </div>
                          </>
                        ),
                      },
                      {
                        title: "状态",
                        width: 190,
                        render: (_, r) => (
                          <Tag
                            color={
                              r.status === "已通过"
                                ? "success"
                                : r.status === "整改中"
                                  ? "error"
                                  : "processing"
                            }
                          >
                            {status(r)}
                          </Tag>
                        ),
                      },
                      {
                        title: "计划 / 验收日期",
                        width: 160,
                        sorter: (a, b) =>
                          acceptanceDetail(data, a).plannedDate.localeCompare(
                            acceptanceDetail(data, b).plannedDate,
                          ),
                        render: (_, r) => (
                          <>
                            {acceptanceDetail(data, r).plannedDate}
                            <div>{r.acceptanceDate ?? "尚未完成"}</div>
                          </>
                        ),
                      },
                      {
                        title: "操作",
                        width: 100,
                        render: (_, r) => (
                          <Button onClick={() => setParam("record", r.id)}>
                            详情与办理
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "conditions",
            label: `准备清单（${conditions.filter((c) => c.passed).length}/${conditions.length}）`,
            children: (
              <Card size="small" title="验收准入条件与补齐入口">
                <Table
                  rowKey="name"
                  size="small"
                  pagination={false}
                  dataSource={conditions}
                  columns={[
                    { title: "检查项", dataIndex: "name", width: 150 },
                    {
                      title: "当前结果",
                      width: 100,
                      render: (_, c) => (
                        <Tag color={c.passed ? "success" : "error"}>
                          {c.passed ? "满足" : "阻断"}
                        </Tag>
                      ),
                    },
                    { title: "依据", dataIndex: "detail" },
                    {
                      title: "原业务",
                      width: 115,
                      render: (_, c) => (
                        <Button onClick={() => navigate(c.path)}>
                          查看与补齐
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          ...(kind === "供应商验收"
            ? [
                {
                  key: "sources",
                  label: `供应商原合同（${sources.length}）`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={sources}
                      scroll={{ x: 850 }}
                      columns={[
                        {
                          title: "供应商 / 合同",
                          render: (_: unknown, s: (typeof sources)[number]) => (
                            <>
                              {s.name}
                              <div>{s.code}</div>
                            </>
                          ),
                        },
                        { title: "履约范围", dataIndex: "scope" },
                        { title: "金额（万元）", dataIndex: "amount" },
                        { title: "履约状态", dataIndex: "status" },
                        {
                          title: "来源",
                          render: (_: unknown, s: (typeof sources)[number]) => (
                            <Button
                              onClick={() =>
                                navigate(
                                  `/projects/${p.id}/${s.path}?source=${s.id}`,
                                )
                              }
                            >
                              查看原单
                            </Button>
                          ),
                        },
                      ]}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      <Drawer
        title={`${kind} · 验收原单与轮次`}
        width={830}
        open={!!params.get("record")}
        onClose={() => setParam("record")}
      >
        {selected && d ? (
          <>
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                { key: "id", label: "验收单", children: selected.id },
                { key: "status", label: "状态", children: status(selected) },
                {
                  key: "round",
                  label: "轮次",
                  children: `第${selected.round}轮`,
                },
                {
                  key: "prev",
                  label: "上轮原单",
                  children: d.previousId ? (
                    <Button
                      type="link"
                      onClick={() => setParam("record", d.previousId)}
                    >
                      {d.previousId}
                    </Button>
                  ) : (
                    "首次 / 导入快照"
                  ),
                },
                { key: "scope", label: "范围", span: 2, children: d.scope },
                { key: "plan", label: "计划时间", children: d.plannedDate },
                { key: "method", label: "验收方式", children: d.method },
                {
                  key: "contact",
                  label: "客户联系人",
                  children: d.customerContact || "—",
                },
                {
                  key: "people",
                  label: "参与人员",
                  children: d.participants || "导入记录未提供",
                },
                {
                  key: "source",
                  label: "合同 / 来源",
                  span: 2,
                  children:
                    d.contractId ?? d.supplierSourceId ?? "历史导入记录",
                },
                {
                  key: "proof",
                  label: "客户签署证明",
                  span: 2,
                  children: d.proofFiles.join("、") || "尚未登记",
                },
                {
                  key: "confirm",
                  label: "最终确认",
                  span: 2,
                  children: d.confirmedAt
                    ? `${d.confirmedBy} · ${d.confirmedAt}`
                    : "尚未确认",
                },
              ]}
            />
            <Space wrap style={{ margin: "16px 0" }}>
              <Button
                disabled={
                  !canOperate("submit") ||
                  !pm ||
                  locked ||
                  selected.status === "已通过" ||
                  (selected.status === "待验收" && d.submitted)
                }
                onClick={() => begin("submit")}
              >
                {selected.status === "整改中" ? "整改后发起新轮次" : "提交验收"}
              </Button>
              <Button
                disabled={
                  !canOperate("review") ||
                  locked ||
                  selected.status !== "待验收" ||
                  !d.submitted ||
                  (kind === "客户终验" ? !pm : !pmo)
                }
                onClick={() => begin("review")}
              >
                登记验收结论
              </Button>
              <Button
                disabled={
                  !canOperate("reply") ||
                  !pm ||
                  locked ||
                  selected.status !== "整改中" ||
                  d.corrections.every((c) => !!c.reply)
                }
                onClick={() => begin("reply")}
              >
                回复整改清单
              </Button>
              {kind === "客户终验" && (
                <>
                  <Button
                    disabled={
                      !canOperate("proof") ||
                      !pm ||
                      locked ||
                      selected.status !== "已通过" ||
                      !!d.confirmedAt
                    }
                    onClick={() => begin("proof")}
                  >
                    登记签署证明
                  </Button>
                  <Button
                    type="primary"
                    disabled={
                      !canOperate("confirm") ||
                      !pmo ||
                      locked ||
                      selected.status !== "已通过" ||
                      !d.proofFiles.length ||
                      !!d.confirmedAt
                    }
                    onClick={() => begin("confirm")}
                  >
                    PMO确认验收完成
                  </Button>
                </>
              )}
            </Space>
            <Card size="small" title="逐项验收记录">
              <Table
                rowKey="name"
                size="small"
                pagination={false}
                dataSource={d.checks}
                columns={[
                  { title: "检查项", dataIndex: "name" },
                  {
                    title: "结论",
                    render: (_, c) => (
                      <Tag color={c.passed ? "success" : "warning"}>
                        {c.passed ? "通过" : "未通过 / 待检查"}
                      </Tag>
                    ),
                  },
                  { title: "依据", dataIndex: "note" },
                ]}
              />
              <p>过程：{d.process || "尚未记录"}</p>
              <p>意见：{d.opinion || "尚未记录"}</p>
            </Card>
            <Card size="small" title="整改清单" style={{ marginTop: 12 }}>
              {d.corrections.length ? (
                d.corrections.map((c) => (
                  <div key={c.id}>
                    <b>{c.content}</b>
                    <p>
                      {c.owner} · 截止 {c.deadline} ·{" "}
                      {c.reply ? "已回复" : "待整改"}
                    </p>
                    <p>{c.reply ?? "整改完成后填写回复，再提交新一轮验收"}</p>
                  </div>
                ))
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="无整改项"
                />
              )}
            </Card>
            <Timeline
              style={{ marginTop: 24 }}
              items={d.history.map((h) => ({
                children: (
                  <>
                    <b>
                      {h.date} · {h.actor} · {h.action}
                    </b>
                    <p>{h.note}</p>
                  </>
                ),
              }))}
            />
          </>
        ) : (
          <StateView type="404" title="验收记录不存在" />
        )}
      </Drawer>
      <Modal
        styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        zIndex={1200}
        width={760}
        title={
          operation === "submit"
            ? "提交验收申请"
            : operation === "review"
              ? "登记验收过程与结论"
              : operation === "reply"
                ? "提交整改回复"
                : operation === "proof"
                  ? "登记客户签署证明"
                  : "PMO最终确认"
        }
        open={!!operation}
        onCancel={() => setOperation(undefined)}
        onOk={execute}
        okButtonProps={{ disabled: !canOperate(operation) }}
        okText="确认提交"
      >
        <Form layout="vertical" disabled={!canOperate(operation)}>
          {operation === "submit" ? (
            <>
              <Form.Item label="验收范围" required>
                <Input.TextArea
                  aria-label="验收范围"
                  value={draft.scope}
                  onChange={(e) =>
                    setDraft({ ...draft, scope: e.target.value })
                  }
                />
              </Form.Item>
              <Space align="start">
                <Form.Item label="计划验收时间" required>
                  <Input
                    type="date"
                    aria-label="计划验收时间"
                    value={draft.plannedDate}
                    onChange={(e) =>
                      setDraft({ ...draft, plannedDate: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item label="验收方式" required>
                  <Select
                    style={{ width: 180 }}
                    value={draft.method}
                    onChange={(v) => setDraft({ ...draft, method: v })}
                    options={["现场验收", "远程会议", "书面验收"].map(
                      (value) => ({ value, label: value }),
                    )}
                  />
                </Form.Item>
              </Space>
              <Form.Item label="内部 / 客户参与人员" required>
                <Input
                  aria-label="验收参与人员"
                  value={draft.participants}
                  onChange={(e) =>
                    setDraft({ ...draft, participants: e.target.value })
                  }
                />
              </Form.Item>
              {kind === "客户终验" && (
                <>
                  <Form.Item label="客户联系人" required>
                    <Input
                      aria-label="客户联系人"
                      disabled={
                        !canOperate(operation) || !canEditField("contact")
                      }
                      value={draft.customerContact}
                      onChange={(e) =>
                        setDraft({ ...draft, customerContact: e.target.value })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="客户合同及验收节点" required>
                    <Select
                      aria-label="验收客户合同"
                      value={draft.contractId}
                      onChange={(v) => setDraft({ ...draft, contractId: v })}
                      options={data.contracts
                        .filter(
                          (c) => c.projectId === p.id && c.status !== "已终止",
                        )
                        .map((c) => ({
                          value: c.id,
                          label: `${c.code} · ${c.name} · ${c.acceptanceDueDate ?? "按合同约定"}`,
                        }))}
                    />
                  </Form.Item>
                </>
              )}
              {kind === "供应商验收" && (
                <Form.Item label="采购 / 外包原合同" required>
                  <Select
                    aria-label="供应商原合同"
                    value={draft.supplierSourceId}
                    onChange={(v) =>
                      setDraft({ ...draft, supplierSourceId: v })
                    }
                    options={sources.map((s) => ({
                      value: s.id,
                      label: `${s.code} · ${s.name} · ${s.status}`,
                      disabled: !s.ready,
                    }))}
                  />
                </Form.Item>
              )}
              <Alert
                type={conditions.some((c) => !c.passed) ? "warning" : "success"}
                message={
                  conditions
                    .filter((c) => !c.passed)
                    .map((c) => c.name)
                    .join("、") || "实时条件已满足，可提交验收"
                }
              />
            </>
          ) : operation === "review" ? (
            <>
              <Table
                rowKey="name"
                size="small"
                pagination={false}
                dataSource={checks}
                columns={[
                  { title: "检查项", dataIndex: "name", width: 125 },
                  {
                    title: "通过",
                    width: 70,
                    render: (_, c, i) => (
                      <Checkbox
                        aria-label={`${c.name}通过`}
                        checked={c.passed}
                        onChange={(e) =>
                          setChecks(
                            checks.map((v, n) =>
                              n === i ? { ...v, passed: e.target.checked } : v,
                            ),
                          )
                        }
                      />
                    ),
                  },
                  {
                    title: "检查依据（必填）",
                    render: (_, c, i) => (
                      <Input
                        aria-label={`${c.name}依据`}
                        value={c.note}
                        onChange={(e) =>
                          setChecks(
                            checks.map((v, n) =>
                              n === i ? { ...v, note: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    ),
                  },
                ]}
              />
              <Form.Item label="验收会议 / 过程记录" required>
                <Input.TextArea
                  aria-label="验收过程记录"
                  value={process}
                  onChange={(e) => setProcess(e.target.value)}
                />
              </Form.Item>
              {kind === "供应商验收" && (
                <Form.Item label="供应商验收证明（每行一份文件名）" required>
                  <Input.TextArea
                    aria-label="供应商验收证明"
                    value={files}
                    onChange={(e) => setFiles(e.target.value)}
                  />
                </Form.Item>
              )}
              <Form.Item label="验收结论">
                <Select
                  value={passed ? "pass" : "fail"}
                  onChange={(v) => setPassed(v === "pass")}
                  options={[
                    { value: "pass", label: "通过" },
                    { value: "fail", label: "整改后复验" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="验收意见" required>
                <Input.TextArea
                  aria-label="验收意见"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Form.Item>
              {!passed && (
                <>
                  <Form.Item label="整改内容" required>
                    <Input.TextArea
                      value={correction}
                      onChange={(e) => setCorrection(e.target.value)}
                    />
                  </Form.Item>
                  <Space>
                    <Form.Item label="责任人" required>
                      <Input
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                      />
                    </Form.Item>
                    <Form.Item label="整改截止日" required>
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </Form.Item>
                  </Space>
                </>
              )}
            </>
          ) : operation === "reply" ? (
            <Form.Item label="整改完成内容与复验依据" required>
              <Input.TextArea
                aria-label="整改回复"
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Form.Item>
          ) : (
            <>
              <Alert
                type="info"
                message="本原型只登记本地文件名，不向服务器传输；请登记客户签署的报告或确认函。"
              />
              <Form.Item label="签署证明文件名（每行一份）" required>
                <Input.TextArea
                  aria-label="验收签署证明"
                  rows={3}
                  value={files}
                  disabled={!canOperate(operation) || operation === "confirm"}
                  onChange={(e) => setFiles(e.target.value)}
                />
              </Form.Item>
              {operation === "confirm" && (
                <Form.Item label="PMO确认意见" required>
                  <Input.TextArea
                    aria-label="PMO验收确认意见"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}
