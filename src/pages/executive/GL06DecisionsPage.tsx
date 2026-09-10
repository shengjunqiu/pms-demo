import { useState } from 'react';
import { Button, Descriptions, Drawer, Select, Space, Table, Tabs, Tag, type TableColumnsType } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE, mockUsers } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { selectProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { readProjectFilter } from '@/utils/project-query';
import { MoneyText } from '@/components/common/MoneyText';
import type { DecisionItem } from '@/models/types';
import { StateView } from '@/components/common/StateView';

export function GL06DecisionsPage() {
  const { data } = useBusinessStore(); const role = useAppStore((s) => s.currentRole);
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const [selected, setSelected] = useState<string>();
  const [visible, setVisible] = useState(['project', 'type', 'impact', 'node', 'owner', 'date']);
  if (!['executive', 'pmo', 'admin'].includes(role)) return <StateView type="403" />;
  const ids = new Set(selectProjects(readProjectFilter(params), role, data.projects, data).map((p) => p.id));
  const scope = data.decisions.filter((d) => ids.has(d.projectId) && (!params.get('decisionType') || d.type === params.get('decisionType')));
  const pending = scope.filter((d) => d.status === '待决策');
  const longestWait = pending.reduce((days, d) => Math.max(days, Math.floor((Date.parse(AS_OF_DATE) - Date.parse(d.createdAt)) / 86400000)), 0);
  const status = params.get('decisionStatus') ?? 'pending';
  const rows = scope.filter((d) => status === 'history' ? d.status !== '待决策' : d.status === '待决策');
  const update = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); setParams(next); };
  const original = (id: string) => { const d = data.decisions.find((d) => d.id === id)!; navigate(`${d.targetRoute}?${params}`); };
  const source = (id: string) => data.approvals.find((a) => a.id === id) ?? data.managementApprovals.find((a) => a.id === id);
  const detail = data.decisions.find((d) => d.id === selected); const approval = selected ? source(selected) : undefined;
  const labels = [{ value: 'project', label: '项目' }, { value: 'type', label: '类型' }, { value: 'amount', label: '项目金额' }, { value: 'impact', label: '影响摘要' }, { value: 'node', label: '节点状态' }, { value: 'owner', label: '发起人与责任人' }, { value: 'date', label: '时间与等待' }];
  const columns: TableColumnsType<DecisionItem> = [
      { title: '事项编号', key: 'id', width: 110, fixed: 'left' as const, render: (_, d) => <Button type="link" className="font-mono" onClick={() => setSelected(d.id)}>{d.id}</Button> },
      { title: '项目', key: 'project', width: 240, render: (_, d) => <>{d.projectName}<div className="font-mono text-xs text-slate-400">{d.projectId}</div></> },
      { title: '事项类型', key: 'type', width: 120, dataIndex: 'type' },
      { title: '项目金额', key: 'amount', align: 'right', width: 120, render: (_, d) => <MoneyText value={data.projects.find((p) => p.id === d.projectId)?.revenueAmount} /> },
      { title: '影响金额 / 摘要', key: 'impact', sorter: (a, b) => a.impactAmount - b.impactAmount, sortOrder: params.get('decisionSort') === 'impact' ? (params.get('decisionOrder') === 'ascend' ? 'ascend' : 'descend') : null, width: 250, render: (_, d) => <><MoneyText value={d.impactAmount} signed /><div>{source(d.id)?.reason}</div></> },
      { title: '当前节点 / 状态', key: 'node', width: 150, render: (_, d) => <>{d.level}<div><Tag color={d.status === '待决策' ? 'processing' : d.status === '已通过' ? 'success' : 'error'}>{d.status}</Tag></div></> },
      { title: '发起人 / 项目责任人', key: 'owner', width: 160, render: (_, d) => <>{mockUsers.find((u) => u.id === source(d.id)?.submittedBy)?.name}<div>{data.projects.find((p) => p.id === d.projectId)?.pmName}</div></> },
      { title: '发起时间 / 等待', key: 'date', width: 130, render: (_, d) => <>{d.createdAt}<div>{d.status === '待决策' ? `${Math.max(0, Math.floor((Date.parse(AS_OF_DATE) - Date.parse(d.createdAt)) / 86400000))} 天` : '已处理'}</div></> },
      { title: '建议动作', key: 'action', width: 200, fixed: 'right' as const, render: (_, d) => <Space direction="vertical"><Button size="small" type="primary" ghost onClick={() => original(d.id)}>{d.status === '待决策' ? '进入原审批' : '查看审批记录'}</Button><Button size="small" onClick={() => navigate(`/projects/${d.projectId}?${params}`)}>查看项目全景</Button></Space> },
    ];
  return <><PageHeader title="GL-06 领导待决策事项" description={`聚合原业务审批 · 更新至 ${AS_OF_DATE} · 金额单位：万元`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '待决策事项' }]} extra={<Button onClick={() => navigate(-1)}>返回上一级</Button>} />
    <ProjectFilters compact params={params} onChange={setParams} />
    <PageSection title="决策处理概览" description="先查看影响与责任人，再进入原审批处理">
      <Space size={32} wrap><div>待决策事项 <strong style={{ fontSize: 24, marginLeft: 8 }}>{pending.length}</strong> 项</div><div>涉及项目 <strong style={{ fontSize: 24, marginLeft: 8 }}>{new Set(pending.map((d) => d.projectId)).size}</strong> 个</div><div>最长等待 <strong style={{ fontSize: 24, marginLeft: 8, color: '#b45309' }}>{longestWait}</strong> 天</div></Space>
    </PageSection>
    <PageSection title="决策事项清单"><Space wrap style={{ marginBottom: 12 }}><Select aria-label="决策事项类型" placeholder="全部事项类型" allowClear style={{ width: 210 }} value={params.get('decisionType') ?? undefined} options={['超概算审批', '重大变更审批', '重大风险处置', '未签额外投入', '重大验收异常', '结算争议审定'].map((value) => ({ value, label: value }))} onChange={(value) => update('decisionType', value)} /><Tag>审批操作在原单据处理</Tag></Space>
    <div><details style={{ margin: '12px 0' }}><summary style={{ cursor: 'pointer', color: '#475569' }}>常用视图、列设置与导出</summary><div style={{ paddingTop: 12 }}><AnalysisTools storageKey="pms-decisions-views" params={params} onChange={setParams} columns={labels} visible={visible} onColumns={setVisible} exportRows={[
      ['事项编号', '项目', '类型', '影响金额（万元）', '状态', '发起日期'], ...rows.map((d) => [d.id, d.projectName, d.type, d.impactAmount.toFixed(2), d.status, d.createdAt]),
    ]} /></div></details></div>
    <Tabs activeKey={status} onChange={(value) => update('decisionStatus', value)} items={[{ key: 'pending', label: `待决策（${scope.filter((d) => d.status === '待决策').length}）` }, { key: 'history', label: `历史决策（${scope.filter((d) => d.status !== '待决策').length}）` }]} />
    <Table rowKey="id" size="small" dataSource={rows} scroll={{ x: columns.filter((c) => c.key === 'id' || c.key === 'action' || visible.includes(String(c.key))).reduce((width, c) => width + Number(c.width ?? 120), 0) }} pagination={{ pageSize: 8, current: Number(params.get('page')) || 1, showSizeChanger: false, showTotal: (n) => `共 ${n} 项`}} onChange={(pagination, _, sorter, extra) => { const sort = Array.isArray(sorter) ? sorter[0] : sorter; const next = new URLSearchParams(params); next.set('page', String(extra.action === 'sort' ? 1 : pagination.current ?? 1)); if (sort.order) { next.set('decisionSort', String(sort.columnKey)); next.set('decisionOrder', sort.order); } else { next.delete('decisionSort'); next.delete('decisionOrder'); } setParams(next); }} columns={columns.filter((column) => column.key === 'id' || column.key === 'action' || visible.includes(String(column.key)))} />
    </PageSection><Drawer title="决策事项摘要" width={560} open={!!detail} onClose={() => setSelected(undefined)}>{detail && <><Descriptions bordered column={1} items={[
      { key: 'id', label: '原事项', children: detail.id }, { key: 'project', label: '项目', children: detail.projectName }, { key: 'impact', label: '影响金额', children: <MoneyText value={detail.impactAmount} signed /> },
      { key: 'reason', label: '申请说明', children: approval?.reason }, { key: 'quote', label: '引用版本', children: approval && 'estimate' in approval ? `概算 ${approval.estimate.version} / 基线 ${approval.baseline.version}` : approval && 'sourceId' in approval ? approval.sourceId : '—' },
      { key: 'status', label: '状态', children: detail.status }, { key: 'opinion', label: '历史意见', children: approval?.opinion ?? '尚未审批' },
    ]} /><Button type="primary" style={{ marginTop: 16 }} onClick={() => original(detail.id)}>进入原审批</Button></>}</Drawer>
  </>;
}
