import { canViewSensitiveField } from '@/mock/configuration-access';
import { marginReason } from '@/utils/sensitive';
import { useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Space, Table, Tabs, type TableColumnsType } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { EXCEPTION_TABS, projectExceptions } from '@/mock/exceptions';
import { fourStage, selectProjects } from '@/mock/selectors';
import { mockDepartments, AS_OF_DATE } from '@/mock';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { HealthBadge } from '@/components/common/Badges';
import { readProjectFilter } from '@/utils/project-query';
import { MoneyText } from '@/components/common/MoneyText';

const names = { green: '健康', yellow: '关注', orange: '预警', red: '高风险' };
type ExceptionRow = ReturnType<typeof projectExceptions>[number];
export function GL05ExceptionsPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole); const showMargin=!!canViewSensitiveField(data,{role},'margin');
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const [selected, setSelected] = useState<string>();
  const [visible, setVisible] = useState(['reason', 'duration', 'variance', 'owner']);
  if (!['executive', 'pmo', 'admin'].includes(role)) return <StateView type="403" />;
  const scope = selectProjects(readProjectFilter(params), role, data.projects, data); const exceptions = projectExceptions(scope, data, params.get('health') === 'green');
  const category = params.get('exception') ?? 'all';
  const rows = exceptions.filter((p) => category === 'all' || p.types.includes(category));
  const detail = exceptions.find((p) => p.id === selected);
  const query = (values: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([k, v]) => next.set(k, v)); return next; };
  const project = (p: ExceptionRow) => navigate(`/executive/project-drilldown?${query({ projectId: p.id })}`);
  const source = (p: ExceptionRow, kind: string) => { const next = query({ projectId: p.id }); next.delete('tab'); if (kind === 'receipt') next.set('tab', 'receipts'); else if (kind === 'schedule') next.set('tab', 'progress'); else if (kind === 'risk') next.set('tab', 'risks'); navigate(`/projects/${p.id}${['cost', 'unsigned', 'margin'].includes(kind) ? '/dynamic-accounting' : ''}?${next}`); };
  const columns: TableColumnsType<ExceptionRow> = [
    { key: 'project', title: '项目', width: 250, fixed: 'left', render: (_, p) => <><Button type="link" style={{ padding: 0, whiteSpace: 'normal', textAlign: 'left' }} onClick={() => project(p)}>{p.name}</Button><div className="flex items-center gap-2 mt-0.5"><span className="font-mono text-slate-500">{p.id}</span><HealthBadge status={names[p.health]} /></div></> },
    { key: 'amount', align: 'right', title: '项目金额（万元）', width: 130, render: (_, p) => <MoneyText value={p.revenueAmount} /> },
    { key: 'org', title: '责任组织', width: 140, dataIndex: 'departmentName' },
    { key: 'phase', title: '阶段', width: 105, render: (_, p) => fourStage(p) },
    { key: 'reason', title: '主要异常 / 偏差', width: 240, render: (_, p) => <><div>{marginReason(p.healthReason,showMargin)}</div>{p.overdueReceipt > 0 && <div>到期未收 <MoneyText value={p.overdueReceipt} /></div>}</> },
    { key: 'duration', title: '首次观测 / 持续', width: 135, render: (_, p) => <>{p.firstObserved}<div>{p.duration} 天（演示快照）</div></> },
    { key: 'variance', align: 'right', title: '成本 / 毛利偏差', width: 145, render: (_, p) => <><MoneyText value={p.calc.variance} signed /><div>{showMargin ? <MoneyText value={p.marginVariance} signed /> : '已隐藏'}</div></>, sortOrder: params.get('exceptionSort') === 'variance' ? (params.get('exceptionOrder') === 'ascend' ? 'ascend' : 'descend') : null, sorter: (a, b) => a.calc.variance - b.calc.variance },
    { key: 'owner', title: 'PM / 总监', width: 150, render: (_, p) => <>{p.pmName}<div>{mockDepartments.find((d) => d.id === mockDepartments.find((d) => d.id === p.departmentId)?.parentId)?.leader ?? '王总'}（演示任命）</div></> },
    { key: 'action', title: '只读操作', width: 120, fixed: 'right', render: (_, p) => <Space direction="vertical"><Button size="small" onClick={() => setSelected(p.id)}>原因与责任链</Button><Button type="link" size="small" onClick={() => project(p)}>查看项目</Button></Space> },
  ];
  return <><PageHeader title="GL-05 项目异常中心" description={`成本、进度、毛利、到期回款与未签额度 · 数据基准 ${AS_OF_DATE} · 金额单位：万元`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '项目异常中心' }]} extra={<Button onClick={() => navigate(-1)}>返回上一级</Button>} />
    <ProjectFilters compact params={params} onChange={setParams} />
    <details style={{ margin: '12px 0' }}><summary style={{ cursor: 'pointer', color: '#475569' }}>常用视图、列设置与导出</summary><div style={{ paddingTop: 12 }}><AnalysisTools storageKey="pms-exception-views" params={params} onChange={setParams} columns={columns.filter((c) => !['project', 'action'].includes(String(c.key))).map((c) => ({ value: String(c.key), label: String(c.title) }))} visible={visible} onColumns={setVisible} exportRows={[
      ['项目编号', '项目名称', '组织', '健康度', '成本偏差（万元）', '毛利偏差（万元）', '原因'], ...rows.map((p) => [p.id, p.name, p.departmentName, names[p.health], p.calc.variance.toFixed(2), showMargin?p.marginVariance.toFixed(2):'已隐藏', marginReason(p.healthReason,showMargin)]),
    ]} /></div></details>
    <PageSection title="异常关注概览" description="项目可同时命中多类异常；先定位原因，再进入原始业务记录">
      <Space size={24} wrap><span>当前清单 <strong>{rows.length}</strong> 个项目</span><span>高风险 <strong style={{ color: '#dc2626' }}>{rows.filter((p) => p.health === 'red').length}</strong> 个</span><span>存在到期未收 <strong>{rows.filter((p) => p.overdueReceipt > 0).length}</strong> 个</span></Space>
      <details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer' }}>健康规则与观测口径</summary>    <Alert type="info" showIcon style={{ marginBottom: 12 }} message="演示规则 DEMO-1：超预算>0为关注，≥5%为预警，≥15%为高风险；最严重因素决定健康度。" description="异常按当前来源数据复算；首次观测使用2026-09-01监控快照，不等同于业务发生时间。回款异常仅统计已到期且未收计划，不将合同余额全部视为逾期。" />
</details>
    </PageSection>
    {params.get('health') === 'green' && <Alert style={{ marginBottom: 12 }} type="success" message={`当前查看${scope.length}个健康项目，未命中异常；其他异常分类为空。`} />}
    <PageSection title="异常项目清单"><Tabs activeKey={category} onChange={(key) => { const next = query({ exception: key }); next.delete('page'); setParams(next); }} items={EXCEPTION_TABS.map((tab) => ({ ...tab, label: `${tab.label}（${exceptions.filter((p) => tab.key === 'all' || p.types.includes(tab.key)).length}）` }))} />
    <Table rowKey="id" size="small" dataSource={rows} columns={columns.filter((c) => ['project', 'action'].includes(String(c.key)) || visible.includes(String(c.key)))} scroll={{ x: columns.filter((c) => ['project', 'action'].includes(String(c.key)) || visible.includes(String(c.key))).reduce((width, c) => width + Number(c.width ?? 120), 0) }} pagination={{ current: Number(params.get('page')) || 1, pageSize: 8, showSizeChanger: false, showTotal: (n) => `共 ${n} 个${params.get('health') === 'green' ? '健康' : '异常'}项目`}} onChange={(pagination, _, sorter, extra) => { const sort = Array.isArray(sorter) ? sorter[0] : sorter; const next = query({ page: String(extra.action === 'sort' ? 1 : pagination.current ?? 1) }); if (sort.order) { next.set('exceptionSort', String(sort.columnKey)); next.set('exceptionOrder', sort.order); } else { next.delete('exceptionSort'); next.delete('exceptionOrder'); } setParams(next); }} />
    </PageSection><Drawer title="异常原因与责任链" width={600} open={!!detail} onClose={() => setSelected(undefined)}>{detail && <><Descriptions bordered column={1} items={[
      { key: 'project', label: '项目', children: `${detail.id} · ${detail.name}` }, { key: 'owner', label: '责任链', children: `${detail.departmentName} → ${detail.pmName}` },
      { key: 'reason', label: '健康原因', children: marginReason(detail.healthReason,showMargin) }, { key: 'cost', label: '成本偏差', children: <MoneyText value={detail.calc.variance} signed /> },
      { key: 'schedule', label: '最长里程碑逾期', children: `${detail.delayDays} 天` }, { key: 'unsigned', label: '未签额度超出', children: <MoneyText value={detail.unsignedExcess} /> },
    ]} /><Space wrap style={{ margin: '16px 0' }}><Button onClick={() => source(detail, 'cost')}>成本来源明细</Button><Button onClick={() => source(detail, 'schedule')}>里程碑原记录</Button><Button onClick={() => source(detail, 'risk')}>风险问题记录</Button><Button onClick={() => source(detail, 'receipt')}>合同回款明细</Button></Space>
      <Table rowKey="id" size="small" pagination={false} dataSource={detail.receiptPlans} columns={[{ title: '回款计划', dataIndex: 'title' }, { title: '到期日', dataIndex: 'dueDate' }, { title: '计划金额', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> }, { title: '实收金额', dataIndex: 'paidAmount', render: (v: number) => <MoneyText value={v} /> }]} />
    </>}</Drawer>
  </>;
}
