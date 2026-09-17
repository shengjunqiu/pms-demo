import { useState } from 'react';
import { Button, Descriptions, Drawer, Input, Select, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { visibleProjects } from '@/mock/selectors';
import { PageHeader } from '@/components/common/PageHeader';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { PageSection, PageToolbar } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import type { ProjectChange } from '@/models/types';
export function ChangesPage() {
    const { data } = useBusinessStore(), { currentRole } = useAppStore(), navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [historical, setHistorical] = useState<ProjectChange>();
    const [columns, setColumns] = useState(['project', 'type', 'cost', 'days', 'status', 'date']);
    const projects = data.projects.filter(p => visibleProjects(currentRole, data.projects, data).some(x => x.id === p.id) || currentRole === 'solution-tech' && data.changeRequests.some(r => r.projectId === p.id && ['影响评估中', '待分级'].includes(r.status)));
    const change = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); if (value)
        next.set(key, value);
    else
        next.delete(key); setParams(next); };
    const rows = data.changes.filter(c => projects.some(p => p.id === c.projectId) && (!params.get('projectId') || c.projectId === params.get('projectId')) && (!params.get('status') || c.status === params.get('status')) && (!params.get('q') || `${c.code} ${c.title}`.includes(params.get('q')!)));
    const target = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); next.set(key, value); return next.toString(); };
    const open = (r: ProjectChange) => { if (data.changeRequests.some(c => c.id === r.id))
        navigate(`/project-changes/new?${target("changeId", r.id)}`);
    else {
        const approval = data.approvals.find(a => a.sourceChangeId === r.id);
        if (approval)
            navigate(`/approvals/${approval.id}?${params}&returnTo=changes`);
        else
            setHistorical(r);
    } };
    return <><PageHeader title="项目变更台账" description="范围、工期、成本、资源和合同变更统一留痕；最新批准版本驱动项目执行。" breadcrumbs={[{ title: '首页', href: '/' }, { title: '项目变更台账' }]} extra={<Button type="primary" disabled={currentRole !== 'project-manager'} onClick={() => navigate(`/project-changes/new?${target("projectId", params.get("projectId") ?? "P-001")}`)}>发起变更</Button>}/><PageSection title="查询变更" description="按项目、状态与编号定位原申请；成本增加为正，核减为负。"><PageToolbar><Input.Search style={{ width: 260 }} aria-label="变更搜索" placeholder="变更编号或名称" value={params.get('q') ?? ''} onChange={e => change('q', e.target.value)}/><Select aria-label="筛选项目" allowClear showSearch optionFilterProp="label" style={{ width: 300 }} placeholder="项目" value={params.get('projectId')} onChange={v => change('projectId', v ?? '')} options={projects.map(p => ({ value: p.id, label: `${p.id} ${p.name}` }))}/><Select aria-label="筛选变更状态" allowClear style={{ width: 170 }} placeholder="变更状态" value={params.get('status')} onChange={v => change('status', v ?? '')} options={['草稿', '影响评估中', '待分级', 'PMO审批中', 'PMC审议中', '已批准', '已否决'].map(value => ({ value, label: value }))}/><Button onClick={() => setParams({})}>重置查询</Button></PageToolbar></PageSection><div className="grid grid-cols-3 gap-4 mb-4"><MetricStatCard variant="flat" title="当前查询结果" value={String(rows.length)} unit="项"/><MetricStatCard variant="flat" title="审批中的变更" value={String(rows.filter(r => ["影响评估中", "待分级", "PMO审批中", "PMC审议中"].includes(r.status)).length)} unit="项"/><MetricStatCard variant="flat" title="已批准" value={String(rows.filter(r => r.status === "已批准").length)} unit="项"/></div><PageSection title="变更记录" description="申请原单、历史审批与迁移记录分别保留来源。"><details style={{ marginBottom: 12 }}><summary>列设置、视图与导出</summary><AnalysisTools storageKey="pms-change-views" params={params} onChange={setParams} columns={['project', 'type', 'cost', 'days', 'status', 'date'].map((value, i) => ({ value, label: ['项目', '类型', '成本影响', '工期影响', '状态', '创建日期'][i] }))} visible={columns} onColumns={setColumns} exportRows={[["编号", "项目", "变更", "成本影响万元", "状态"], ...rows.map(r => [r.code, r.projectId, r.title, String(r.costImpact), r.status])]}/></details><Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `共${total}项变更` }} scroll={{ x: 1100 }} columns={[{ key: 'title', title: '变更编号 / 标题', width: 260, render: (_, r) => <Button type="link" style={{ whiteSpace: 'normal', height: 'auto', textAlign: 'left' }} onClick={() => open(r)}>{r.code}<br />{r.title}</Button> }, ...(columns.includes('project') ? [{ key: 'project', title: '项目', width: 240, render: (_: unknown, r: ProjectChange) => data.projects.find(p => p.id === r.projectId)?.name }] : []), ...(columns.includes('type') ? [{ key: 'type', title: '类型', dataIndex: 'type' }] : []), ...(columns.includes('cost') ? [{ key: 'cost', title: '成本影响万元', align: 'right' as const, dataIndex: 'costImpact', sorter: (a: ProjectChange, b: ProjectChange) => a.costImpact - b.costImpact, render: (v: number) => <span style={{ color: v > 0 ? '#cf1322' : undefined }}>{v > 0 ? '+' : ''}{v.toFixed(2)}</span> }] : []), ...(columns.includes('days') ? [{ key: 'days', title: '工期影响天', align: 'right' as const, dataIndex: 'scheduleImpactDays' }] : []), ...(columns.includes('status') ? [{ key: 'status', title: '状态', render: (_: unknown, r: ProjectChange) => <Tag color={r.status === '已批准' ? 'green' : r.status === '已否决' ? 'red' : ['影响评估中', '待分级'].includes(r.status) ? 'orange' : 'blue'}>{r.status}</Tag> }] : []), ...(columns.includes('date') ? [{ key: 'date', title: '创建日期', dataIndex: 'createdAt', sorter: (a: ProjectChange, b: ProjectChange) => a.createdAt.localeCompare(b.createdAt) }] : []), { key: 'action', title: '操作', fixed: 'right', render: (_, r) => <Button onClick={() => open(r)}>原单与对比</Button> }]}/></PageSection><Drawer width={600} title="历史变更记录" open={!!historical} onClose={() => setHistorical(undefined)}><Descriptions bordered column={1} items={[{ key: 'code', label: '原编号', children: historical?.code }, { key: 'status', label: '原状态', children: historical?.status }, { key: 'cost', label: '原成本影响', children: `${historical?.costImpact}万元` }, { key: 'days', label: '原工期影响', children: `${historical?.scheduleImpactDays}天` }, { key: 'baseline', label: '形成基线', children: historical?.newBaselineId ?? '迁移记录未留存关联版本' }]}/><p>原历史记录只读保留；不能据摘要补造当时的审批结论或版本。</p></Drawer></>;
}
