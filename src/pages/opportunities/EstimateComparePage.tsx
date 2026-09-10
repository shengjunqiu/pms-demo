import { canViewSensitiveField } from "@/mock/configuration-access";
import { useState } from "react";
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from "antd";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useBusinessStore } from "@/mock/business";
import { canViewOpportunity } from "@/mock/opportunities";
import { costLineAmount } from "@/mock/presales";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/common/PageHeader";
import { StateView } from "@/components/common/StateView";
import { MoneyText } from "@/components/common/MoneyText";
import { PAGE_MANIFEST } from "@/routes/manifest";
import { money, percentage } from "@/utils/money";
export function EstimateComparePage() {
  const { id } = useParams();
  const { data } = useBusinessStore();
  const actor = useAppStore((s) => s.currentUser);
  const [query, setQuery] = useSearchParams();
  const viewMargin = canViewSensitiveField(data, actor, "margin");
  const viewLaborRate = canViewSensitiveField(data, actor, "labor-rate");
  const hiddenMargin = "毛利字段无查看权限";
  const displayText = (value?: string) =>
    !viewMargin && /毛利|gross.?margin/i.test(value ?? "")
      ? hiddenMargin
      : value;
  const [leftId, setLeftId] = useState<string | undefined>(() => query.get("base") ?? undefined);
  const [rightId, setRightId] = useState<string | undefined>(() => query.get("compare") ?? undefined);
  const o = data.opportunities.find((o) => o.id === id);
  if (!o) return <StateView type="404" />;
  if (!canViewOpportunity(data, o, actor)) return <StateView type="403" />;
  const versions = data.estimates.filter((e) => e.opportunityId === o.id);
  const left =
    versions.find((e) => e.id === leftId) ?? versions.at(-2) ?? versions[0];
  const right = versions.find((e) => e.id === rightId) ?? versions.at(-1);
  const lm = left ? data.estimateMeta[left.id] : undefined;
  const rm = right ? data.estimateMeta[right.id] : undefined;
  const subjects = Array.from(
    new Map(
      [...(left?.items ?? []), ...(right?.items ?? [])].map((s) => [
        s.subjectId,
        s.subjectName,
      ]),
    ).entries(),
  ).map(([id, name]) => {
    const a = left?.items.find((s) => s.subjectId === id);
    const b = right?.items.find((s) => s.subjectId === id);
    return {
      id,
      name,
      before: a?.amount ?? 0,
      after: b?.amount ?? 0,
      delta: money((b?.amount ?? 0) - (a?.amount ?? 0)),
      kind: !a ? "新增" : !b ? "删除" : a.amount === b.amount ? "未变" : "修改",
    };
  });
  const lineIds = [
    ...new Set([...(lm?.lines ?? []), ...(rm?.lines ?? [])].map((l) => l.id)),
  ];
  const lineRows = lineIds.map((id) => {
    const a = lm?.lines.find((l) => l.id === id);
    const b = rm?.lines.find((l) => l.id === id);
    return {
      id,
      name: b?.name ?? a?.name,
      a,
      b,
      kind: !a
        ? "新增"
        : !b
          ? "删除"
          : JSON.stringify(a) === JSON.stringify(b)
            ? "未变"
            : "修改",
      delta: money((b ? costLineAmount(b) : 0) - (a ? costLineAmount(a) : 0)),
    };
  });
  const options = versions.map((e) => ({
    value: e.id,
    label: `${e.version} · ${e.isFrozen ? "冻结" : "待确认"} · ${e.id}`,
  }));
  const selectVersion = (side: "base" | "compare", value: string) => {
    if (side === "base") setLeftId(value);
    else setRightId(value);
    const next = new URLSearchParams(query);
    next.set(side, value);
    setQuery(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        item={PAGE_MANIFEST.find((p) => p.id === "GS-09")}
        breadcrumbs={[
          { title: "商机台账", href: "/opportunities" },
          { title: o.name, href: `/opportunities/${o.id}` },
          { title: "概算版本对比" },
        ]}
        description="同一商机两版本按统一科目与来源明细比较；历史版本只读，差异＝对比版本−基准版本。"
        extra={<Link to={`/opportunities/${o.id}/estimate`}>返回概算编制</Link>}
      />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>基准版本</span>
          <Select
            aria-label="基准概算版本"
            style={{ width: 320 }}
            value={left?.id}
            onChange={(value) => selectVersion("base", value)}
            options={options}
          />
          <span>对比版本</span>
          <Select
            aria-label="对比概算版本"
            style={{ width: 320 }}
            value={right?.id}
            onChange={(value) => selectVersion("compare", value)}
            options={options}
          />
        </Space>
      </Card>
      {!left || !right ? (
        <Empty description="尚无概算版本，请先生成概算" />
      ) : (
        <>
          {versions.length < 2 && (
            <Alert
              style={{ marginBottom: 16 }}
              type="info"
              message="当前只有一个概算版本，生成新版本后可查看变化；当前对比同版本。"
            />
          )}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {[
              {
                title: "成本差异（万元）",
                value: money(right.totalCost - left.totalCost),
              },
              {
                title: "收入差异（万元）",
                value: money(right.totalIncome - left.totalIncome),
              },
              {
                title: "毛利差异（万元）",
                value: viewMargin
                  ? money(right.grossMargin - left.grossMargin)
                  : hiddenMargin,
              },
              {
                title: "成本变化率",
                value:
                  percentage(
                    right.totalCost - left.totalCost,
                    left.totalCost,
                  ) ?? "—",
                suffix: left.totalCost ? "%" : "",
              },
            ].map((s) => (
              <Col span={6} key={s.title}>
                <Card size="small">
                  <Statistic {...s} precision={2} />
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {[left, right].map((e, i) => (
              <Col span={12} key={`${i}-${e.id}`}>
                <Card
                  size="small"
                  title={`${i ? "对比" : "基准"} ${e.version}`}
                >
                  <Descriptions
                    column={1}
                    size="small"
                    items={[
                      { key: "id", label: "版本ID", children: e.id },
                      {
                        key: "reason",
                        label: "修改原因",
                        children:
                          displayText(data.estimateMeta[e.id]?.changeReason) ??
                          "历史导入版本未保留修改原因",
                      },
                      {
                        key: "source",
                        label: "来源方案 / 成本",
                        children: data.estimateMeta[e.id] ? (
                          <Space wrap size={4}>
                            <Link to={`/opportunities/${o.id}/review?review=${data.estimateMeta[e.id].reviewId}`}>评审 {data.estimateMeta[e.id].reviewId}</Link>
                            <Link to={`/opportunities/${o.id}/solution?version=${data.estimateMeta[e.id].solutionVersionId}`}>方案 {data.estimateMeta[e.id].solutionVersionId}</Link>
                            <Link to={`/opportunities/${o.id}/tech-cost?version=${data.estimateMeta[e.id].costVersionId}`}>成本 {data.estimateMeta[e.id].costVersionId}</Link>
                          </Space>
                        ) : "历史导入快照",
                      },
                      {
                        key: "freeze",
                        label: "冻结记录",
                        children: e.isFrozen
                          ? `${data.estimateMeta[e.id]?.frozenBy ?? e.createdBy} · ${data.estimateMeta[e.id]?.frozenAt ?? e.createdAt}`
                          : "尚未确认冻结",
                      },
                      {
                        key: "opp",
                        label: "商机当前引用",
                        children:
                          o.currentEstimateVersionId === e.id ? (
                            <Tag color="blue">当前指定</Tag>
                          ) : (
                            "非当前指定"
                          ),
                      },
                      {
                        key: "project",
                        label: "正式项目引用",
                        children: data.projects
                          .filter((p) => p.frozenEstimateVersionId === e.id)
                          .map((p) => (
                            <Link key={p.id} to={`/projects/${p.id}`}>
                              {p.name}{" "}
                            </Link>
                          )),
                      },
                    ]}
                  />
                </Card>
              </Col>
            ))}
          </Row>
          <Card size="small" title="统一科目差异" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={subjects}
              columns={[
                { title: "科目", dataIndex: "name" },
                {
                  title: "变化类型",
                  render: (_, r) => (
                    <Tag
                      color={
                        r.kind === "新增"
                          ? "green"
                          : r.kind === "删除"
                            ? "red"
                            : r.kind === "修改"
                              ? "orange"
                              : "default"
                      }
                    >
                      {r.kind}
                    </Tag>
                  ),
                },
                {
                  title: "基准金额（万元）",
                  align: "right",
                  render: (_, r) => <MoneyText value={r.before} />,
                },
                {
                  title: "对比金额（万元）",
                  align: "right",
                  render: (_, r) => <MoneyText value={r.after} />,
                },
                {
                  title: "差异（万元）",
                  align: "right",
                  sorter: (a, b) => a.delta - b.delta,
                  render: (_, r) => <MoneyText signed value={r.delta} />,
                },
              ]}
            />
          </Card>
          <Card size="small" title="数量、单价与范围明细差异">
            {!lm || !rm ? (
              <Alert
                type="info"
                message="其中一个版本为历史导入概算，仅保留科目金额，未记录数量与单价，无法反推明细。"
              />
            ) : (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 1100 }}
                dataSource={lineRows}
                columns={[
                  { title: "成本项", dataIndex: "name", width: 150 },
                  { title: "变化", dataIndex: "kind", width: 80 },
                  {
                    title: "数量（基准→对比）",
                    width: 160,
                    render: (_, r) =>
                      `${r.a?.quantity ?? "—"} → ${r.b?.quantity ?? "—"}`,
                  },
                  {
                    title: "单价（万元）",
                    width: 180,
                    render: (_, r) =>
                      !viewLaborRate && (r.a?.subjectId === "SUB-01" || r.b?.subjectId === "SUB-01")
                        ? "已隐藏"
                        : <><MoneyText value={r.a?.unitPrice} /> → <MoneyText value={r.b?.unitPrice} /></>,
                  },
                  {
                    title: "税口径（基准→对比）",
                    width: 180,
                    render: (_, r) =>
                      `${r.a ? `${r.a.taxRate}% ${r.a.taxBasis}` : "—"} → ${r.b ? `${r.b.taxRate}% ${r.b.taxBasis}` : "—"}`,
                  },
                  {
                    title: "含税金额差异",
                    width: 130,
                    render: (_, r) => <MoneyText signed value={r.delta} />,
                  },
                  {
                    title: "范围 / 依据变更",
                    width: 240,
                    render: (_, r) => (
                      <>
                        <div>
                          基准：{r.a?.scope ?? "无"}；{displayText(r.a?.basis)}
                        </div>
                        <div>
                          对比：{r.b?.scope ?? "无"}；{displayText(r.b?.basis)}
                        </div>
                      </>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
