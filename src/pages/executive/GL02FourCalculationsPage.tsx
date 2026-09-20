import { canViewSensitiveField } from '@/mock/configuration-access';
import { useState } from 'react';
import { Alert, Button, Card, Col, Drawer, Row, Table, Tabs, Tag } from 'antd';
import {
  AccountBookOutlined,
  FundOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/store';
import { selectFourCalculations, selectProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { readProjectFilter } from '@/utils/project-query';
import { sumMoney, percentage, formatPercent } from '@/utils/money';

export function GL02FourCalculationsPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole); const canViewMargin = canViewSensitiveField(data, { role }, 'margin');
  const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const [subject, setSubject] = useState<string>();
  if (!['executive', 'pmo', 'finance', 'admin'].includes(role)) return <StateView type="403" />;
  const scope = selectProjects(readProjectFilter(params), role, data.projects, data).map((p) => ({ p, ...selectFourCalculations(p, data) }));
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
    <ProjectFilters compact params={params} onChange={setParams} /><details style={{ margin: '12px 0' }}><summary style={{ cursor: 'pointer', color: '#475569' }}>常用分析视图</summary><div style={{ paddingTop: 12 }}><AnalysisTools storageKey="pms-four-views" params={params} onChange={setParams} /></div></details>
    <Tabs activeKey={settledOnly ? 'settled' : 'all'} onChange={(key) => { const next = new URLSearchParams(params); next.set('sample', key); next.delete('page'); setParams(next); }} items={[{ key: 'all', label: `概算 / 预算同样本（${scope.filter((r) => r.estimate && r.budget).length}）` }, { key: 'settled', label: `已结算同样本（${scope.filter((r) => r.estimate && r.budget && r.settlement).length}）` }]} />
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{[
      { name: '冻结概算成本', value: estimate, icon: <AccountBookOutlined />, statusText: '基线V1.0', statusType: 'info' as const },
      { name: '生效预算成本', value: budget, icon: <FundOutlined />, statusText: '执行基准', statusType: 'healthy' as const },
      { name: '最新滚动成本', value: rolling, icon: <LineChartOutlined />, statusText: rolling > budget ? '超出预算' : '预算受控', statusType: rolling > budget ? ('danger' as const) : ('healthy' as const) },
      { name: '同样本结算成本', value: complete ? settlement : undefined, icon: <CheckCircleOutlined />, statusText: complete ? '全量已结算' : '部分在途', statusType: complete ? ('healthy' as const) : ('warning' as const) },
    ].map((m) => (
      <Col span={6} key={m.name}>
        <MetricStatCard
          title={m.name}
          value={m.value ?? '—'}
          unit={m.value !== undefined ? '万元' : ''}
          icon={m.icon}
          statusText={m.statusText}
          statusType={m.statusType}
        />
      </Col>
    ))}</Row>
    <PageSection title="四阶段成本对比" description={`同一组 ${rows.length} 个项目 · 柱长从零起点按金额比例展示 · 单位：万元`}>
      <div aria-label="四阶段成本比较" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
        {[
          { label: '概算', value: estimate, delta: undefined, color: '#94a3b8' },
          { label: '预算', value: budget, delta: sumMoney([budget, -estimate]), color: '#3b82f6' },
          { label: '核算', value: rolling, delta: sumMoney([rolling, -budget]), color: rolling > budget ? '#dc2626' : '#2563eb' },
          { label: '结算', value: complete ? settlement : undefined, delta: complete && settlement !== undefined ? sumMoney([settlement, -rolling]) : undefined, color: '#0f766e' },
        ].map((stage) => <div key={stage.label}>
          <div style={{ color: '#64748b', marginBottom: 8 }}>{stage.label}</div>
          <div style={{ height: 90, display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1' }}>
            {stage.value !== undefined ? <div aria-hidden="true" style={{ width: '100%', height: `${stage.value / Math.max(estimate, budget, rolling, complete ? settlement ?? 0 : 0, 1) * 100}%`, background: stage.color, borderRadius: '4px 4px 0 0' }} /> : <span style={{ color: '#64748b', marginBottom: 8 }}>— 尚未全部结算</span>}
          </div>
          <div style={{ marginTop: 8, fontSize: 18 }}><MoneyText value={stage.value} /></div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{stage.label === '概算' ? '冻结版本基准' : <>较上一阶段 <MoneyText value={stage.delta} signed /></>}</div>
        </div>)}
      </div>
      <details style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer' }}>比较范围与计算口径</summary><Alert showIcon type="info" style={{ marginBottom: 16 }} message={`当前比较 ${rows.length} 个具备冻结概算及生效预算的项目；排除缺失版本 ${scope.filter((r) => !r.estimate || !r.budget).length} 个`} description="结算比较仅使用已锁定结算的同一组项目，未结算显示—。核算为基准日最新滚动值，非历史预测快照；科目承诺及剩余预测按生效预算权重分摊（演示规则）。" /></details>
    </PageSection>
    <Card size="small" title="毛利变化轨迹 · 同样本预计收入减各阶段成本" style={{ marginBottom: 16 }}>{canViewMargin ? <><Row gutter={12}>{[['概算毛利', sumMoney([income, -estimate])], ['预算毛利', sumMoney([income, -budget])], ['预测毛利', sum((r) => r.grossMargin)], ['实际结算毛利', complete ? sum((r) => r.settlement!.finalGrossMargin) : undefined]].map(([label, value]) => <Col span={6} key={String(label)}>{label}<div><MoneyText value={value as number | undefined} /></div></Col>)}</Row><p>当前预计收入 <MoneyText value={income} />；概算/预算毛利按当前收入统一重算，不冒充历史收入快照。结算毛利使用原结算收入。</p></> : <span>已隐藏：当前策略未开放毛利字段。</span>}</Card>
    <Card size="small" title="偏差分析" style={{ marginBottom: 16 }}><Row gutter={12}><Col span={8}>预算 − 概算<div><MoneyText value={sumMoney([budget, -estimate])} signed /></div></Col><Col span={8}>滚动 − 预算<div><MoneyText value={sumMoney([rolling, -budget])} signed /></div></Col><Col span={8}>结算 − 最新滚动（已结算{closed.length}项）<div><MoneyText value={settlement === undefined ? undefined : sumMoney([settlement, -sumMoney(closed.map((r) => r.rolling))])} signed /></div></Col></Row></Card>
    <PageSection title="偏差来源与有效版本" description="选择项目穿透至原始成本，或按科目查看贡献项目"><Tabs activeKey={tab} onChange={(key) => { const next = new URLSearchParams(params); next.set('tab', key); setParams(next); }} items={[
      { key: 'projects', label: '项目与有效版本', children: <Table rowKey={(r) => r.p.id} size="small" dataSource={rows} scroll={{ x: 1350 }} pagination={{ pageSize: 8, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); } }} columns={[
        { title: '项目 / 有效版本', width: 270, fixed: 'left', render: (_, r) => <>{r.p.name}<div><Tag>{r.p.id}</Tag>概算{r.estimate!.version} / 预算{r.budget!.version}</div></> },
        { title: '概算', render: (_, r) => <MoneyText value={r.estimate!.totalCost} /> }, { title: '预算', render: (_, r) => <MoneyText value={r.budget!.totalAmount} /> },
        { title: '已发生', render: (_, r) => <MoneyText value={r.actual} /> }, { title: '滚动', render: (_, r) => <MoneyText value={r.rolling} /> },
        { title: '锁定结算', render: (_, r) => <MoneyText value={r.settlement?.finalCost} /> }, { title: '滚动偏差 / 比率', render: (_, r) => <><MoneyText value={r.variance} signed /><div>{formatPercent(percentage(r.variance, r.budget!.totalAmount))}</div></> },
        { title: '原始来源', fixed: 'right', width: 130, render: (_, r) => <Button type="primary" ghost size="small" icon={<ArrowRightOutlined />} onClick={() => go(r.p.id)}>四算穿透</Button> },
      ]} /> },
      { key: 'subjects', label: '成本科目偏差来源', children: <Table rowKey="id" size="small" dataSource={subjects} pagination={false} columns={[
        { title: '成本科目', dataIndex: 'name' }, ...(['estimate', 'budget', 'actual', 'rolling', 'variance'] as const).map((key, i) => ({ title: ['概算', '预算', '已发生', '滚动', '滚动偏差'][i], dataIndex: key, align: 'right' as const, render: (v: number) => <MoneyText value={v} signed={key === 'variance'} /> })),
        { title: '归因来源', render: (_, r) => <Button onClick={() => setSubject(r.id)}>查看贡献项目</Button> },
      ]} /> },
    ]} />
    </PageSection><Drawer title={`科目贡献项目 · ${subjects.find((s) => s.id === subject)?.name ?? ''}`} width={700} open={!!subject} onClose={() => setSubject(undefined)}><Table rowKey={(r) => r.p.id} size="small" dataSource={rows.filter((r) => r.subjects.some((s) => s.subjectId === subject))} pagination={{ pageSize: 8 }} columns={[
      { title: '项目', render: (_, r) => r.p.name }, { title: '滚动偏差', render: (_, r) => <MoneyText signed value={r.subjects.find((s) => s.subjectId === subject)?.variance} /> }, { title: '凭证与构成', render: (_, r) => <Button onClick={() => go(r.p.id, subject)}>查看原科目</Button> },
    ]} /></Drawer>
  </>;
}
