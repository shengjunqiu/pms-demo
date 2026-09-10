import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { mockDepartments, AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { fourStage, selectFourCalculations, selectProjects, selectReceipts } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { readProjectFilter } from '@/utils/project-query';
import { MoneyText } from '@/components/common/MoneyText';
import { percentage, formatPercent, sumMoney } from '@/utils/money';

const names = { green: '健康', yellow: '关注', orange: '预警', red: '高风险' };
const colors = { green: 'success', yellow: 'gold', orange: 'orange', red: 'error' };
export function GL03ProjectDrilldownPage() {
  const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const location = useLocation();
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole);
  const [detail, setDetail] = useState<{ title: string; fields: [string, string][] }>();
  const scope = selectProjects(readProjectFilter(params), role, data.projects).filter((p) =>
    (!params.get('stage') || fourStage(p) === params.get('stage')) &&
    (params.get('metric') !== 'overbudget' || p.rollingCost > p.budgetAmount) &&
    (params.get('metric') !== 'unsigned' || p.isUnsigned) &&
    (params.get('metric') !== 'signed' || !p.isUnsigned) &&
    (params.get('metric') !== 'construction' || p.phase === '执行') &&
    (params.get('metric') !== 'closing' || p.phase === '收尾') &&
    (params.get('metric') !== 'maintenance' || p.isMaintenance));
  if (!['executive', 'pmo', 'admin'].includes(role)) return <StateView type="403" />;
  const id = params.get('projectId'); const project = data.projects.find((p) => p.id === id);
  if (id && !project) return <StateView type="404" title="项目不存在" />;
  const view = (values: Record<string, string | undefined>) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k)); setParams(next, { replace: Object.keys(values).length === 1 && 'tab' in values, state: values.projectId ? { fromList: true } : location.state }); };
  const projectLink = (tab?: string, accounting = false, subject?: string) => {
    const next = new URLSearchParams(params); next.delete('tab'); if (tab) next.set('tab', tab); if (subject) next.set('subject', subject);
    navigate(`/projects/${project!.id}${accounting ? '/dynamic-accounting' : ''}?${next}`);
  };
  const header = <PageHeader title="GL-03 项目穿透分析" description={`组织与指标 → 项目 → 原始记录 · 数据更新至 ${AS_OF_DATE} · 金额单位：万元 · 管理视角只读`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '项目穿透分析' }]} extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回上一级</Button>} />;
  if (project && !scope.some((p) => p.id === project.id)) return <>{header}<Alert type="warning" showIcon message="项目不在当前筛选范围内" description="保留上一级组织、健康度和时间条件，返回清单重新选择。" action={<Button onClick={() => view({ projectId: undefined })}>返回筛选清单</Button>} /></>;
  const receipts = selectReceipts(scope, data);
  const totalBudget = sumMoney(scope.map((p) => p.budgetAmount)); const totalRolling = sumMoney(scope.map((p) => p.rollingCost));
  const list = <>{header}<ProjectFilters params={params} onChange={setParams} />
    {(params.get('metric') || params.get('stage')) && <Alert style={{ marginBottom: 16 }} message={`继承指标：${(({ overbudget: '预测超预算', unsigned: '未签项目', signed: '已签约项目', construction: '在建项目', closing: '验收收尾', maintenance: '运维项目' } as Record<string, string>)[params.get('metric') ?? ''] ?? '全部')}；阶段：${params.get('stage') ?? '全部'}`} type="info" />}
    <Row gutter={16} style={{ marginBottom: 16 }}>{[['项目数量', scope.length], ['已签合同金额', receipts.signed], ['有效预算合计', totalBudget], ['滚动预测合计', totalRolling]].map(([label, value], i) => <Col span={6} key={String(label)}><Card size="small"><Statistic title={label} value={Number(value)} formatter={() => i === 0 ? String(value) : <MoneyText value={Number(value)} />} /></Card></Col>)}</Row>
    <Table rowKey="id" size="small" dataSource={scope} scroll={{ x: 1250 }} pagination={{ current: Number(params.get('page')) || 1, pageSize: 10, showSizeChanger: false, showTotal: (n) => `共 ${n} 个项目`, }} onChange={(pagination, _, sorter, extra) => { const sort = Array.isArray(sorter) ? sorter[0] : sorter; view({ page: String(extra.action === 'sort' ? 1 : pagination.current ?? 1), sort: sort.order ? String(sort.columnKey) : undefined, order: sort.order ?? undefined }); }} columns={[
      { title: '项目', width: 260, fixed: 'left', render: (_, p) => <><Button type="link" style={{ padding: 0, whiteSpace: 'normal', textAlign: 'left' }} onClick={() => view({ projectId: p.id })}>{p.name}</Button><div><Typography.Text type="secondary">{p.id} · {p.customerName}</Typography.Text></div></> },
      { title: '责任部门 / PM', width: 160, render: (_, p) => <>{p.departmentName}<div>{p.pmName}</div></> },
      { title: '阶段', width: 100, render: (_, p) => fourStage(p) },
      ...(['contractAmount', 'budgetAmount', 'rollingCost', 'costVariance'] as const).map((key, i) => ({ title: ['已签合同', '预算', '滚动预测', '预测偏差'][i], dataIndex: key, key, width: 120, sortOrder: params.get('sort') === key ? (params.get('order') === 'ascend' ? 'ascend' as const : 'descend' as const) : null, sorter: (a: typeof scope[number], b: typeof scope[number]) => a[key] - b[key], render: (v: number) => <MoneyText value={v} signed={key === 'costVariance'} /> })),
      { title: '健康度与原因', width: 250, render: (_, p) => <><Tag color={colors[p.health]}>{names[p.health]}</Tag><div>{p.healthReason}</div></> },
    ]} />
  </>;
  if (!project) return list;
  const p = project; const calc = selectFourCalculations(p, data);
  const records = [...data.issues.filter((r) => r.projectId === p.id).map((r) => ({ id: r.id, title: r.title, type: '问题', owner: r.owner, status: r.status, severity: r.severity, date: r.deadline, source: r.fromRiskId ?? '直接登记' })), ...data.risks.filter((r) => r.projectId === p.id).map((r) => ({ id: r.id, title: r.title, type: '风险', owner: r.owner, status: r.status, severity: r.level, date: r.identifiedDate, source: r.strategy }))];
  const milestones = data.milestones.filter((m) => m.projectId === p.id);
  return <>{header}<Space wrap style={{ marginBottom: 16 }}><Button onClick={() => location.state?.fromList ? navigate(-1) : view({ projectId: undefined, tab: undefined })}>返回筛选清单（{scope.length}）</Button><Button type="primary" onClick={() => projectLink()}>进入项目总览</Button><Button onClick={() => projectLink(undefined, true)}>成本来源凭证</Button><Tag>组织/指标/健康度筛选已继承</Tag></Space>
    <Card size="small" style={{ marginBottom: 16 }}><Descriptions title={`${p.id} · ${p.name}`} column={3} items={[
      { key: 'customer', label: '客户', children: p.customerName }, { key: 'pm', label: '项目经理', children: p.pmName }, { key: 'dept', label: '责任部门', children: p.departmentName },
      { key: 'director', label: '项目总监（演示任命）', children: mockDepartments.find((d) => d.id === mockDepartments.find((d) => d.id === p.departmentId)?.parentId)?.leader ?? '王总' },
      { key: 'phase', label: '生命周期', children: `${fourStage(p)} · ${p.subPhase}` }, { key: 'health', label: '健康度', children: <Tag color={colors[p.health]}>{names[p.health]}</Tag> },
    ]} /><Alert showIcon type={p.health === 'red' ? 'error' : p.health === 'green' ? 'success' : 'warning'} message={p.healthReason} /></Card>
    <Row gutter={16} style={{ marginBottom: 16 }}>{[['冻结概算', calc.estimate?.totalCost], ['有效预算', calc.budget?.totalAmount], ['动态核算', calc.rolling], ['冻结结算', calc.settlement?.finalCost]].map(([label, value]) => <Col span={6} key={String(label)}><Card size="small"><Statistic title={label} value={Number(value)} formatter={() => <MoneyText value={typeof value === 'number' ? value : null} />} /></Card></Col>)}</Row>
    <Typography.Paragraph>项目收入 <MoneyText value={calc.income} />；滚动偏差 <MoneyText value={calc.variance} signed />（{formatPercent(percentage(calc.variance, calc.budget?.totalAmount ?? 0))}）；预测毛利 <MoneyText value={calc.grossMargin} />（{formatPercent(calc.grossMarginRate)}）。未结算显示 —，未签预计收入不计入已签合同。</Typography.Paragraph>
    <Tabs activeKey={params.get('tab') ?? 'cost'} onChange={(tab) => view({ tab })} items={[
      { key: 'cost', label: '成本异常原因', children: <Table rowKey="subjectId" size="small" pagination={false} dataSource={calc.subjects} columns={[
        { title: '科目 / 来源', render: (_, r) => <Button type="link" onClick={() => projectLink(undefined, true, r.subjectId)}>{r.subjectName}</Button> },
        ...(['budget', 'actual', 'committed', 'remaining', 'rolling', 'variance'] as const).map((key, i) => ({ title: ['预算', '已发生', '未发生承诺', '剩余预测', '滚动预测', '偏差'][i], dataIndex: key, render: (v: number) => <MoneyText value={v} signed={key === 'variance'} /> })),
      ]} /> },
      { key: 'milestones', label: `里程碑（${milestones.length}）`, children: <Table rowKey="id" size="small" pagination={false} dataSource={milestones} columns={[
        { title: '里程碑', render: (_, m) => <Button type="link" onClick={() => setDetail({ title: m.type, fields: [['编号', m.id], ['责任人', p.pmName], ['计划日期', m.plannedDate], ['实际日期', m.actualDate ?? '尚未达成'], ['状态', m.status], ['材料要求', m.requiredDeliverables.join('、')]] })}>{m.type}</Button> }, { title: '计划日期', dataIndex: 'plannedDate' }, { title: '状态', dataIndex: 'status' },
      ]} /> },
      { key: 'risks', label: `问题风险（${records.length}）`, children: <Table rowKey="id" size="small" dataSource={records} columns={[
        { title: '类型', dataIndex: 'type' }, { title: '原始事项', render: (_, r) => <Button type="link" onClick={() => setDetail({ title: r.title, fields: [['编号', r.id], ['项目', p.id], ['责任人', r.owner], ['等级', r.severity], ['状态', r.status], ['日期', r.date], ['来源/策略', r.source]] })}>{r.title}</Button> }, { title: '责任人', dataIndex: 'owner' }, { title: '等级', dataIndex: 'severity' }, { title: '状态', dataIndex: 'status' },
      ]} /> },
      { key: 'related', label: '相关业务', children: <Space wrap>{[['进度', 'progress'], ['需求BUG', 'requirements'], ['变更', 'changes'], ['交付物', 'deliverables'], ['验收结算', 'acceptance'], ['回款合同', 'receipts']].map(([label, tab]) => <Button key={tab} onClick={() => projectLink(tab)}>{label}</Button>)}</Space> },
    ]} />
    <Drawer title={detail?.title} width={560} open={!!detail} onClose={() => setDetail(undefined)}>{detail ? <Descriptions bordered column={1} items={detail.fields.map(([label, children]) => ({ key: label, label, children }))} /> : <Empty />}</Drawer>
  </>;
}
