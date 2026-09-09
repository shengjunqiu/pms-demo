import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { selectFourCalculations, visibleProjects, inOrganization } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { AS_OF_DATE, mockCostSources, mockDepartments, mockProcurements, mockOutsources, mockExpenses, mockTimesheets } from '@/mock';
import { mockCostSnapshots } from '@/mock/cost-history';
import { formatPercent, percentage, sumMoney } from '@/utils/money';
import { DEMO_HEALTH_RULES } from '@/utils/health';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { CostTrendChart } from '@/components/common/CostTrendChart';
import type { CostItem } from '@/models/types';

const { Text } = Typography;
const healthNames = { green: '健康', yellow: '关注', orange: '预警', red: '高风险' };
const healthColors = { green: 'success', yellow: 'gold', orange: 'orange', red: 'error' };

export function DynamicAccountingPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const data = useBusinessStore((s) => s.data);
  const role = useAppStore((s) => s.currentRole);
  const [source, setSource] = useState<CostItem>();
  const [query, setQuery] = useState('');
  const p = data.projects.find((project) => project.id === id);
  if (!p) return <StateView type="404" title="项目不存在" />;
  if (!['executive', 'pmo', 'finance', 'project-manager', 'admin'].includes(role) || !visibleProjects(role, data.projects).some((project) => project.id === id)) return <StateView type="403" />;
  const calc = selectFourCalculations(p, data);
  if (!calc.budget) return <StateView type="empty" title="尚无生效预算" subTitle="预算审批通过后即可开展动态核算。" />;
  const subjectId = params.get('subject'); const tab = params.get('tab') ?? 'subjects';
  const update = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  const costs = calc.costs.filter((c) => (!subjectId || c.subjectId === subjectId) && (!query || `${c.sourceId} ${c.description} ${c.subjectName}`.includes(query)));
  const sourceVoucher = mockCostSources.find((v) => v.id === source?.sourceId);
  const upstream = [...mockProcurements, ...mockOutsources, ...mockExpenses, ...mockTimesheets].find((record) => record.id === sourceVoucher?.upstreamId);
  const historical = mockCostSnapshots.filter((s) => s.projectId === p.id);
  const current = { projectId: p.id, date: AS_OF_DATE, budget: calc.budget.totalAmount, actual: calc.actual, rolling: calc.rolling };
  const points = [...historical.filter((s) => s.date !== AS_OF_DATE), current];
  const metrics = [
    ['有效预算', calc.budget.totalAmount], ['已发生成本', calc.actual], ['未发生承诺', p.committedCost], ['剩余预测', p.forecastRemainingCost],
    ['实时滚动成本', calc.rolling], ['预测成本偏差', calc.variance], ['预测毛利', calc.grossMargin], ['剩余预算', sumMoney([calc.budget.totalAmount, -calc.actual])],
  ] as const;
  const costColumns = [
    { title: '来源凭证', dataIndex: 'sourceId', render: (_: string, row: CostItem) => <Button type="link" size="small" onClick={() => setSource(row)}>{row.sourceId}</Button> },
    { title: '科目', dataIndex: 'subjectName' }, { title: '确认日期', dataIndex: 'occurredDate' },
    { title: '已发生（万元）', dataIndex: 'amount', align: 'right' as const, render: (value: number) => <MoneyText value={value} /> },
  ];
  const orgRows = mockDepartments.filter((d) => d.level === 'business_group').map((org) => {
    const rows = visibleProjects(role, data.projects).filter((project) => inOrganization(project.departmentId, org.id));
    return { id: org.id, name: org.name, count: rows.length, budget: sumMoney(rows.map((project) => selectFourCalculations(project, data).budget?.totalAmount ?? 0)), actual: sumMoney(rows.map((project) => project.actualCost)), rolling: sumMoney(rows.map((project) => project.rollingCost)) };
  });
  return <div>
    <PageHeader title="HS-13 动态核算" description={`${p.name} · ${p.id} · 数据更新至 ${AS_OF_DATE} 18:30`} breadcrumbs={[{ title: '首页', href: '/' }, { title: p.name, href: `/projects/${p.id}` }, { title: '动态核算' }]}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回上一级</Button>} />
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap size={16}><Text strong>{p.departmentName}</Text><span>项目经理：{p.pmName}</span><Tag color={healthColors[p.health]}>{healthNames[p.health]}</Tag><Tag>预算 {calc.budget.version}</Tag><Tag>科目映射 DEMO-1</Tag><Tag>{p.isUnsigned ? '未签立项' : '合同已签'}</Tag></Space>
      <div style={{ marginTop: 8, color: '#666' }}>滚动 = 已发生 + 未发生承诺 + 剩余预测；实际取已确认凭证，历史基线不回写。单位：万元。</div>
    </Card>
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{metrics.map(([name, value]) => <Col span={6} key={name}><Card size="small"><Statistic title={name} value={value} formatter={() => <MoneyText value={value} signed={name === '预测成本偏差'} />} valueStyle={{ fontSize: 21, color: name === '预测成本偏差' && value > 0 ? '#cf1322' : undefined }} /></Card></Col>)}</Row>
    <Space wrap size={24} style={{ marginBottom: 16 }}><span>预算执行率：<b>{formatPercent(percentage(calc.actual, calc.budget.totalAmount))}</b></span><span>滚动偏差率：<b>{formatPercent(percentage(calc.variance, calc.budget.totalAmount))}</b></span><span>预测毛利率：<b>{formatPercent(calc.grossMarginRate)}</b></span><span>拟签/预计收入：<MoneyText value={calc.income} /> 万元</span></Space>
    <Alert showIcon type={calc.variance > 0 ? 'warning' : 'success'} message={p.healthReason} description={`${DEMO_HEALTH_RULES.label} ${DEMO_HEALTH_RULES.version}：滚动偏差达到 ${DEMO_HEALTH_RULES.costWarning}% 为预警、${DEMO_HEALTH_RULES.costHigh}% 为高风险；点击科目查看构成，判断原因需结合原始凭证。`} style={{ marginBottom: 16 }} />
    <Card size="small"><Tabs activeKey={tab} onChange={(key) => update('tab', key)} items={[
      { key: 'subjects', label: '成本科目与偏差', children: <>
        <Table rowKey="subjectId" size="small" dataSource={calc.subjects} pagination={false} scroll={{ x: 900 }} columns={[
          { title: '统一成本科目', dataIndex: 'subjectName', fixed: 'left', width: 150, render: (name: string, row) => <Button type="link" size="small" onClick={() => { update('subject', row.subjectId); setQuery(''); }}>{name}</Button> },
          ...(['budget', 'actual', 'committed', 'remaining', 'rolling', 'variance'] as const).map((key, i) => ({ title: ['有效预算', '已发生', '未发生承诺', '剩余预测', '滚动预测', '偏差'][i], dataIndex: key, align: 'right' as const, render: (v: number) => <MoneyText value={v} signed={key === 'variance'} /> })),
        ]} />
        <Text type="secondary">承诺与剩余预测按有效预算科目比例分摊（演示口径）；期间费用只统计子科目，避免父子重复计费。</Text>
      </> },
      { key: 'trend', label: '历史成本趋势', children: <><CostTrendChart points={points} /><Table rowKey="date" size="small" pagination={false} dataSource={points} columns={[{ title: '快照日期', dataIndex: 'date' }, ...(['budget', 'actual', 'rolling'] as const).map((key, i) => ({ title: ['预算', '已发生', '滚动预测'][i], dataIndex: key, render: (v: number) => <MoneyText value={v} /> }))]} /><Text type="secondary">历史演示快照只读；最新一行使用当前共享数据。</Text></> },
      { key: 'organizations', label: '业务群成本对比', children: <><Alert type="info" message="同角色可见项目的业务群汇总；每个项目按主责部门全额归属，不重复分摊。" /><Table dataSource={orgRows} rowKey="id" size="small" pagination={false} columns={[{ title: '业务群', dataIndex: 'name' }, { title: '项目数', dataIndex: 'count' }, ...(['budget', 'actual', 'rolling'] as const).map((key, i) => ({ title: ['预算（万元）', '已发生（万元）', '滚动（万元）'][i], dataIndex: key, render: (v: number) => <MoneyText value={v} /> }))]} /></> },
    ]} /></Card>
    <Card title="已确认成本来源" size="small" style={{ marginTop: 16 }} extra={<Button onClick={() => { update('subject'); setQuery(''); }}>重置明细筛选</Button>}>
      <Space wrap style={{ marginBottom: 12 }}><Select aria-label="成本科目" allowClear placeholder="全部科目" value={subjectId ?? undefined} onChange={(value) => update('subject', value)} style={{ width: 190 }} options={calc.subjects.map((s) => ({ value: s.subjectId, label: s.subjectName }))} /><Input aria-label="搜索来源凭证" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索来源凭证或摘要" allowClear style={{ width: 230 }} /><Text>{costs.length} 笔 · 合计 <MoneyText value={sumMoney(costs.map((c) => c.amount))} /> 万元</Text></Space>
      <Table rowKey="id" columns={costColumns} dataSource={costs} size="small" pagination={{ pageSize: 5, showSizeChanger: false }} scroll={{ x: 750 }} locale={{ emptyText: <Empty description="当前科目没有已确认成本" /> }} />
    </Card>
    <Drawer title="原始成本凭证" open={!!source} onClose={() => setSource(undefined)} width={560}>{source && <>
      <Descriptions bordered column={1} size="small" items={[
        { key: 'project', label: '关联项目', children: `${p.id} ${p.name}` }, { key: 'id', label: '凭证编号', children: source.sourceId },
        { key: 'subject', label: '核算科目', children: source.subjectName }, { key: 'amount', label: '已确认金额（万元）', children: <MoneyText value={source.amount} /> },
        { key: 'date', label: '确认日期', children: source.occurredDate }, { key: 'status', label: '状态', children: <Tag color="success">已确认，已计入实际一次</Tag> },
        { key: 'owner', label: '项目责任人', children: p.pmName }, { key: 'upstream', label: '上游单据', children: sourceVoucher?.upstreamId ?? '本轮录入凭证' },
        { key: 'description', label: '摘要', children: source.description },
      ]} />
      {upstream && <Card title="上游记录摘要" size="small" style={{ marginTop: 16 }}>{'supplierName' in upstream ? `供应商：${upstream.supplierName}` : 'vendorName' in upstream ? `外包单位：${upstream.vendorName}` : 'applicant' in upstream ? `报销人：${upstream.applicant}` : `填报人：${upstream.userName} · ${upstream.hours} 小时`}<p>单据状态：{upstream.status}</p><Text type="secondary">上游单据可能分期确认；此处展示关联关系，核算只累计本凭证金额。</Text></Card>}
      <Alert style={{ marginTop: 16 }} type="info" message="经营穿透为只读查看；关闭后保留科目、查询与上一级筛选。" />
    </>}</Drawer>
  </div>;
}
