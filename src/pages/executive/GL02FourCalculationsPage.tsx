import { useState } from 'react';
import { Alert, Button, Card, Col, Drawer, Row, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { selectFourCalculations, selectProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { readProjectFilter } from '@/utils/project-query';
import { sumMoney, percentage, formatPercent } from '@/utils/money';

export function GL02FourCalculationsPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole);
  const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const [subject, setSubject] = useState<string>();
  if (!['executive', 'pmo', 'finance', 'admin'].includes(role)) return <StateView type="403" />;
  const scope = selectProjects(readProjectFilter(params), role, data.projects).map((p) => ({ p, ...selectFourCalculations(p, data) }));
  const settledOnly = params.get('sample') === 'settled';
  const rows = scope.filter((r) => r.estimate && r.budget && (!settledOnly || r.settlement));
  const sum = (get: (r: typeof rows[number]) => number) => sumMoney(rows.map(get));
  const estimate = sum((r) => r.estimate!.totalCost); const budget = sum((r) => r.budget!.totalAmount);
  const rolling = sum((r) => r.rolling); const income = sum((r) => r.income);
  const closed = rows.filter((r) => r.settlement); const settlement = closed.length ? sumMoney(closed.map((r) => r.settlement!.finalCost)) : undefined;
  const complete = rows.length > 0 && closed.length === rows.length;
  const subjectIds = [...new Set(rows.flatMap((r) => r.subjects.map((s) => s.subjectId)))];
  const subjects = subjectIds.map((id) => {
    const items = rows.flatMap((r) => r.subjects.filter((s) => s.subjectId === id));
    return { id, name: items[0].subjectName, estimate: sumMoney(items.map((s) => s.estimate)), budget: sumMoney(items.map((s) => s.budget)), actual: sumMoney(items.map((s) => s.actual)), rolling: sumMoney(items.map((s) => s.rolling)), variance: sumMoney(items.map((s) => s.variance)) };
  });
  const go = (id: string, subjectId?: string) => { const next = new URLSearchParams(params); next.delete('tab'); if (subjectId) next.set('subject', subjectId); navigate(`/projects/${id}/dynamic-accounting?${next}`); };
  const tab = params.get('tab') ?? 'projects';
  return <><PageHeader title="GL-02 四算经营专题" description={`冻结概算 → 生效预算 → 动态核算 → 锁定结算 · ${AS_OF_DATE} · 万元`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '四算专题' }]} extra={<Button onClick={() => navigate(-1)}>返回上一级</Button>} />
    <ProjectFilters params={params} onChange={setParams} /><AnalysisTools storageKey="pms-four-views" params={params} onChange={setParams} />
    <Tabs activeKey={settledOnly ? 'settled' : 'all'} onChange={(key) => { const next = new URLSearchParams(params); next.set('sample', key); next.delete('page'); setParams(next); }} items={[{ key: 'all', label: `概算 / 预算同样本（${scope.filter((r) => r.estimate && r.budget).length}）` }, { key: 'settled', label: `已结算同样本（${scope.filter((r) => r.estimate && r.budget && r.settlement).length}）` }]} />
    <Alert showIcon type="info" style={{ marginBottom: 16 }} message={`当前比较 ${rows.length} 个具备冻结概算及生效预算的项目；排除缺失版本 ${scope.filter((r) => !r.estimate || !r.budget).length} 个`} description="结算比较仅使用已锁定结算的同一组项目，未结算显示—。核算为基准日最新滚动值，非历史预测快照；科目承诺及剩余预测按生效预算权重分摊（演示规则）。" />
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{[['冻结概算成本', estimate], ['生效预算成本', budget], ['最新滚动成本', rolling], ['同样本结算成本', complete ? settlement : undefined]].map(([name, value]) => <Col span={6} key={String(name)}><Card size="small" title={String(name)}><div style={{ fontSize: 24 }}><MoneyText value={value as number | undefined} /></div></Card></Col>)}</Row>
    <Card size="small" title="毛利变化轨迹 · 同样本预计收入减各阶段成本" style={{ marginBottom: 16 }}><Row gutter={12}>{[['概算毛利', sumMoney([income, -estimate])], ['预算毛利', sumMoney([income, -budget])], ['预测毛利', sum((r) => r.grossMargin)], ['实际结算毛利', complete ? sum((r) => r.settlement!.finalGrossMargin) : undefined]].map(([label, value]) => <Col span={6} key={String(label)}>{label}<div><MoneyText value={value as number | undefined} /></div></Col>)}</Row><p>当前预计收入 <MoneyText value={income} />；概算/预算毛利按当前收入统一重算，不冒充历史收入快照。结算毛利使用原结算收入。</p></Card>
    <Card size="small" title="偏差分析" style={{ marginBottom: 16 }}><Row gutter={12}><Col span={8}>预算 − 概算<div><MoneyText value={sumMoney([budget, -estimate])} signed /></div></Col><Col span={8}>滚动 − 预算<div><MoneyText value={sumMoney([rolling, -budget])} signed /></div></Col><Col span={8}>结算 − 最新滚动（已结算{closed.length}项）<div><MoneyText value={settlement === undefined ? undefined : sumMoney([settlement, -sumMoney(closed.map((r) => r.rolling))])} signed /></div></Col></Row></Card>
    <Tabs activeKey={tab} onChange={(key) => { const next = new URLSearchParams(params); next.set('tab', key); setParams(next); }} items={[
      { key: 'projects', label: '项目与有效版本', children: <Table rowKey={(r) => r.p.id} size="small" dataSource={rows} scroll={{ x: 1350 }} pagination={{ pageSize: 8, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); } }} columns={[
        { title: '项目 / 有效版本', width: 270, fixed: 'left', render: (_, r) => <>{r.p.name}<div><Tag>{r.p.id}</Tag>概算{r.estimate!.version} / 预算{r.budget!.version}</div></> },
        { title: '概算', render: (_, r) => <MoneyText value={r.estimate!.totalCost} /> }, { title: '预算', render: (_, r) => <MoneyText value={r.budget!.totalAmount} /> },
        { title: '已发生', render: (_, r) => <MoneyText value={r.actual} /> }, { title: '滚动', render: (_, r) => <MoneyText value={r.rolling} /> },
        { title: '锁定结算', render: (_, r) => <MoneyText value={r.settlement?.finalCost} /> }, { title: '滚动偏差 / 比率', render: (_, r) => <><MoneyText value={r.variance} signed /><div>{formatPercent(percentage(r.variance, r.budget!.totalAmount))}</div></> },
        { title: '原始来源', fixed: 'right', width: 130, render: (_, r) => <Button onClick={() => go(r.p.id)}>四算穿透</Button> },
      ]} /> },
      { key: 'subjects', label: '成本科目偏差来源', children: <Table rowKey="id" size="small" dataSource={subjects} pagination={false} columns={[
        { title: '成本科目', dataIndex: 'name' }, ...(['estimate', 'budget', 'actual', 'rolling', 'variance'] as const).map((key, i) => ({ title: ['概算', '预算', '已发生', '滚动', '滚动偏差'][i], dataIndex: key, render: (v: number) => <MoneyText value={v} signed={key === 'variance'} /> })),
        { title: '归因来源', render: (_, r) => <Button onClick={() => setSubject(r.id)}>查看贡献项目</Button> },
      ]} /> },
    ]} />
    <Drawer title={`科目贡献项目 · ${subjects.find((s) => s.id === subject)?.name ?? ''}`} width={700} open={!!subject} onClose={() => setSubject(undefined)}><Table rowKey={(r) => r.p.id} size="small" dataSource={rows.filter((r) => r.subjects.some((s) => s.subjectId === subject))} pagination={{ pageSize: 8 }} columns={[
      { title: '项目', render: (_, r) => r.p.name }, { title: '滚动偏差', render: (_, r) => <MoneyText signed value={r.subjects.find((s) => s.subjectId === subject)?.variance} /> }, { title: '凭证与构成', render: (_, r) => <Button onClick={() => go(r.p.id, subject)}>查看原科目</Button> },
    ]} /></Drawer>
  </>;
}
