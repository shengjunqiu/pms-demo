import { marginReason } from '@/utils/sensitive';
import { canViewSensitiveField } from '@/mock/configuration-access';
import { useState } from 'react';
import { Alert, Button, Card, Col, Collapse, Empty, Progress, Radio, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { fourStage, selectFourCalculations, selectProjects, selectReceipts } from '@/mock/selectors';
import { projectExceptions } from '@/mock/exceptions';
import { useAppStore } from '@/store/useAppStore';
import { calculateCockpitKPIs } from '@/utils/calculator';
import { formatPercent, percentage, sumMoney } from '@/utils/money';
import { readProjectFilter } from '@/utils/project-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { MoneyText } from '@/components/common/MoneyText';
import { StateView } from '@/components/common/StateView';

const healths = [{ key: 'green', name: '健康', color: '#52c41a' }, { key: 'yellow', name: '关注', color: '#d4a017' }, { key: 'orange', name: '预警', color: '#fa8c16' }, { key: 'red', name: '高风险', color: '#cf1322' }];
export function GL01DashboardPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole); const canViewMargin = canViewSensitiveField(data, { role }, 'margin');
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const [refresh, setRefresh] = useState(0);
  const mode = params.get('demo') ?? 'normal';
  const allowed = ['executive', 'pmo', 'admin'].includes(role);
  const scope = mode === 'empty' ? [] : selectProjects(readProjectFilter(params), role, data.projects, data);
  const kpi = calculateCockpitKPIs(scope); const receipt = selectReceipts(scope, data); const exceptions = projectExceptions(scope, data);
  const calculations = scope.map((p) => selectFourCalculations(p, data)); const estimate = sumMoney(calculations.map((c) => c.estimate?.totalCost ?? 0));
  const ids = new Set(scope.map((p) => p.id)); const pending = data.decisions.filter((d) => ids.has(d.projectId) && d.status === '待决策');
  const query = (values: Record<string, string> = {}) => { const next = new URLSearchParams(params); next.delete('demo'); next.delete('analysis'); Object.entries(values).forEach(([k, v]) => next.set(k, v)); return next; };
  const drill = (values: Record<string, string> = {}) => navigate(`/executive/project-drilldown?${query(values)}`);
  const exception = (values: Record<string, string> = {}) => navigate(`/executive/exceptions?${query(values)}`);
  const goProject = (id: string) => drill({ projectId: id });
  const stages = ['概算', '预算', '核算', '结算及运维'].map((stage) => { const rows = scope.filter((p) => fourStage(p) === stage); return { stage, count: rows.length, amount: sumMoney(rows.map((p) => p.revenueAmount ?? p.contractAmount)) }; });
  const health = healths.map((h) => ({ ...h, count: scope.filter((p) => p.health === h.key).length }));
  const analysis = params.get('analysis') ?? 'cost';
  const rows = scope.map((p) => { const c = selectFourCalculations(p, data); const r = selectReceipts([p], data); const warning = exceptions.find((e) => e.id === p.id); return { ...p, estimateCost: c.estimate?.totalCost, gross: c.grossMargin, grossRate: c.grossMarginRate, due: r.due, overdue: r.overdue, paid: r.paid, delay: warning?.delayDays ?? 0, settled: c.settlement?.finalCost }; });
  const columnsByTab = {
    progress: [{ title: '完成进度', dataIndex: 'progressRate', render: (v: number) => <Progress percent={v} size="small" /> }, { title: '最长里程碑逾期', dataIndex: 'delay', render: (v: number) => `${v} 天` }, { title: '计划验收日', dataIndex: 'plannedEndDate' }],
    cost: [{ title: '有效预算', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> }, { title: '已发生', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> }, { title: '滚动预测', dataIndex: 'rollingCost', render: (v: number) => <MoneyText value={v} /> }, { title: '偏差', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> }],
    margin: [{ title: '预计收入', dataIndex: 'revenueAmount', render: (v: number) => <MoneyText value={v} /> }, { title: '预测毛利', dataIndex: 'gross', render: (v: number) => canViewMargin ? <MoneyText value={v} /> : '已隐藏' }, { title: '预测毛利率', dataIndex: 'grossRate', render: (v: number | null) => canViewMargin ? formatPercent(v) : '已隐藏' }],
    receipt: [{ title: '到期应收', dataIndex: 'due', render: (v: number) => <MoneyText value={v} /> }, { title: '已回款', dataIndex: 'paid', render: (v: number) => <MoneyText value={v} /> }, { title: '到期未收', dataIndex: 'overdue', render: (v: number) => <MoneyText value={v} /> }],
    four: [{ title: '冻结概算', dataIndex: 'estimateCost', render: (v?: number) => <MoneyText value={v} /> }, { title: '有效预算', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> }, { title: '滚动核算', dataIndex: 'rollingCost', render: (v: number) => <MoneyText value={v} /> }, { title: '冻结结算', dataIndex: 'settled', render: (v?: number) => <MoneyText value={v} /> }],
  };
  const selectedColumns = columnsByTab[analysis as keyof typeof columnsByTab] ?? columnsByTab.cost;
  const content = <>
    <ProjectFilters params={params} onChange={setParams} /><AnalysisTools storageKey="pms-dashboard-views" params={params} onChange={setParams} />
    <Space wrap style={{ marginBottom: 12 }}><Typography.Text type="secondary">口径：项目规模含未签与运维；签约额排除未签；毛利按预计项目收入减滚动成本；回款完成率=到期计划实收/到期应收。</Typography.Text></Space>
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{[
      { label: '在管项目', value: scope.length, count: true, action: () => drill() },
      { label: '已签合同总额', value: receipt.signed, action: () => drill({ metric: 'signed' }) },
      { label: '有效预算', value: kpi.totalBudgetAmount, action: () => drill() },
      { label: '实时滚动成本', value: kpi.totalRollingCost, action: () => drill() },
      { label: '预测毛利', value: kpi.totalGrossMargin, action: () => drill() },
      { label: '已发生成本', value: kpi.totalActualCost, action: () => drill() },
      { label: '到期应收', value: receipt.due, action: () => drill({ metric: 'signed' }) },
      { label: '回款完成率', value: receipt.dueCompletion, ratio: true, action: () => drill({ metric: 'signed' }) },
    ].map((m) => <Col span={6} key={m.label}><Card size="small"><Button type="text" style={{ height: 'auto', width: '100%', textAlign: 'left', padding: 0 }} disabled={!scope.length} onClick={m.action}><Statistic title={m.label} value={m.value ?? 0} valueStyle={{ fontSize: 23 }} formatter={() => m.label === '预测毛利' && !canViewMargin ? '已隐藏' : m.count ? String(m.value) : m.ratio ? formatPercent(m.value) : <MoneyText value={m.value} />} /></Button></Card></Col>)}</Row>
    <Space wrap size={[20, 8]} style={{ marginBottom: 16 }}><span>预计项目收入 <MoneyText value={kpi.totalRevenue} /></span><span>冻结概算 <MoneyText value={estimate} /></span><span>预算毛利 {canViewMargin ? <MoneyText value={sumMoney([kpi.totalRevenue, -kpi.totalBudgetAmount])} /> : '已隐藏'}</span><span>预测毛利率 {canViewMargin ? formatPercent(kpi.weightedGrossMarginRate) : '已隐藏'}</span><span>毛利偏差 {canViewMargin ? <MoneyText value={-kpi.totalCostVariance} signed /> : '已隐藏'}</span><span>已收 <MoneyText value={receipt.paid} /></span><Button type="link" onClick={() => exception({ exception: 'receipt' })}>逾期 <MoneyText value={receipt.overdue} /></Button></Space>
    <Space wrap style={{ marginBottom: 16 }}>{[{ label: '在建', rows: scope.filter((p) => p.phase === '执行'), metric: 'construction' }, { label: '未签立项', rows: scope.filter((p) => p.isUnsigned), metric: 'unsigned' }, { label: '验收收尾', rows: scope.filter((p) => p.phase === '收尾'), metric: 'closing' }, { label: '运维', rows: scope.filter((p) => p.isMaintenance), metric: 'maintenance' }].map((group) => <Button key={group.label} disabled={!group.rows.length} onClick={() => drill({ metric: group.metric })}>{group.label} {group.rows.length} 个 · <MoneyText value={sumMoney(group.rows.map((p) => p.revenueAmount ?? p.contractAmount))} /></Button>)}</Space>
    {!scope.length ? <Empty description="当前筛选无项目，请调整条件" /> : <>
      <Row gutter={16} style={{ marginBottom: 16 }}><Col span={12}><Card size="small" title="四阶段项目分布 · 预计项目金额"><Table rowKey="stage" size="small" pagination={false} dataSource={stages} columns={[{ title: '四算阶段', render: (_, r) => <Button type="link" disabled={!r.count} onClick={() => drill({ stage: r.stage })}>{r.stage}</Button> }, { title: '数量', dataIndex: 'count' }, { title: '金额（万元）', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> }]} /></Card></Col>
      <Col span={12}><Card size="small" title="项目健康度 · 最严重因素优先">{health.map((h) => <Row key={h.key} align="middle" gutter={8}><Col span={6}><Button type="link" disabled={!h.count} onClick={() => exception({ health: h.key })}>{h.name} {h.count}</Button></Col><Col span={18}><Progress percent={percentage(h.count, scope.length) ?? 0} format={(v) => `${v?.toFixed(1)}%`} strokeColor={h.color} size="small" /></Col></Row>)}<Typography.Text type="secondary">关注/预警/高风险共 {health.filter((h) => h.key !== 'green').reduce((n, h) => n + h.count, 0)} 项；点击查看原始原因。</Typography.Text></Card></Col></Row>
      <Card size="small" title="经营与执行分析" extra={<Button type="link" onClick={() => drill()}>查看全部项目</Button>}><Tabs activeKey={analysis} onChange={(key) => { const next = new URLSearchParams(params); next.set('analysis', key); setParams(next, { replace: true }); }} items={[['progress', '进度'], ['cost', '成本'], ['margin', '毛利'], ['receipt', '回款'], ['four', '四算']].map(([key, label]) => ({ key, label }))} /><Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 5, showSizeChanger: false }} columns={[{ title: '项目', width: 300, render: (_, p) => <Button type="link" style={{ whiteSpace: 'normal', textAlign: 'left' }} onClick={() => goProject(p.id)}>{p.name}</Button> }, ...selectedColumns]} /></Card>
      <Row gutter={16} style={{ marginTop: 16 }}><Col span={14}><Card size="small" title={`重点异常项目（${exceptions.length}）`} extra={<Button type="link" onClick={() => exception()}>全部异常</Button>}><Table rowKey="id" size="small" pagination={false} dataSource={[...exceptions].sort((a, b) => (b.health === 'red' ? 1 : 0) - (a.health === 'red' ? 1 : 0) || b.calc.variance - a.calc.variance).slice(0, 5)} columns={[{ title: '项目', render: (_, p) => <Button type="link" style={{ whiteSpace: 'normal', textAlign: 'left' }} onClick={() => goProject(p.id)}>{p.name}</Button> }, { title: '原因', dataIndex: 'healthReason', render:(value:string)=>marginReason(value,!!canViewMargin) }]} /></Card></Col><Col span={10}><Card size="small" title={`待决策（${pending.length}）`} extra={<Button type="link" onClick={() => navigate(`/executive/decisions?${query()}`)}>全部事项</Button>}>
        {pending.slice(0, 4).map((d) => <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><Typography.Text strong>{d.projectName}</Typography.Text><div><Tag>{d.type}</Tag>影响 <MoneyText value={d.impactAmount} signed /></div><Typography.Text type="secondary">{d.level} · 提交于 {d.createdAt}</Typography.Text><div><Button type="link" onClick={() => navigate(`${d.targetRoute}?${query()}`)}>查看原审批</Button></div></div>)}{!pending.length && <Empty description="当前范围无待决策事项" />}
      </Card></Col></Row>
    </>}
  </>;
  return <><PageHeader title="GL-01 项目经营驾驶舱" description={`集团经营规模、四算、健康异常与待决策 · 更新至 ${AS_OF_DATE} 18:30 · 金额单位：万元`} breadcrumbs={[{ title: '首页', href: '/' }]} extra={<Button onClick={() => setRefresh((n) => n + 1)}>刷新数据{refresh ? `（已刷新${refresh}次）` : ''}</Button>} />
    {allowed && <Collapse size="small" style={{ marginBottom: 16 }} items={[{ key: 'demo', label: '演示场景', children: <Radio.Group value={mode} onChange={(e) => { const next = new URLSearchParams(params); next.set('demo', e.target.value); setParams(next); }} options={[{ value: 'normal', label: '正常' }, { value: 'delayed', label: '部分数据延迟' }, { value: 'empty', label: '无数据' }, { value: 'denied', label: '无权限' }, { value: 'loading', label: '计算中' }, { value: 'changed', label: '口径变更' }]} /> }]} />}
    {mode === 'delayed' && <Alert showIcon type="warning" style={{ marginBottom: 16 }} message="演示：采购来源同步延迟，暂使用最近已确认快照" description="采购快照截至2026-09-08 18:30，其他来源截至2026-09-09 18:30；不把未确认金额加入已发生成本。" />}
    {mode === 'changed' && <Alert showIcon type="info" style={{ marginBottom: 16 }} message="演示口径公告：回款完成率按到期计划计算" description="分母为到期应收，不再使用合同总额。合同余额、到期应收和逾期分别展示，历史预算与结算快照不回写。" />}
    {!allowed || mode === 'denied' ? <StateView type="403" /> : mode === 'loading' ? <StateView type="loading" /> : content}
  </>;
}
