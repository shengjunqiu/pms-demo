import dayjs from 'dayjs';
import { selectTodos } from '@/mock/todos';
import { Button, Col, Row, Input, Select, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { PageHeader } from '@/components/common/PageHeader';
import { visibleProjects } from '@/mock/selectors';

export function TodosPage() {
  const data = useBusinessStore((s) => s.data); const { currentRole, currentUser } = useAppStore();
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const projects = visibleProjects(currentRole, data.projects, data);
  const rows = selectTodos(data, currentUser).filter((r) => (!params.get('project') || r.projectId === params.get('project')) && (!params.get('type') || r.type === params.get('type')) && (!params.get('search') || `${r.id} ${r.title}`.includes(params.get('search')!)) && (params.get('due') !== 'overdue' || r.due < AS_OF_DATE) && (params.get('due') !== 'upcoming' || r.due >= AS_OF_DATE && r.due <= dayjs(AS_OF_DATE).add(7, 'day').format('YYYY-MM-DD')));
  const history = params.get('status') === 'done'; const filtered = rows.filter((r) => r.done === history);
  const update = (key: string, value?: string) => { const next = new URLSearchParams(window.location.search); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next); };
  // 🔵6 空态引导：区分“筛选过严”与“确实无待办”，并给出可达去向
  const hasFilters = ['project', 'type', 'due', 'search'].some((k) => params.get(k));
  return <><PageHeader title="WK-02 我的待办中心" description={`${currentUser.name} · ${AS_OF_DATE} · 原业务状态实时聚合`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '我的待办' }]} />
    <PageSection className="pms-record-summary"><Row gutter={16}>{[
      {title:'当前筛选待办',value:rows.filter(r=>!r.done).length},
      {title:'已超期待办',value:rows.filter(r=>!r.done&&r.due<AS_OF_DATE).length},
      {title:'7天内到期',value:rows.filter(r=>!r.done&&r.due>=AS_OF_DATE&&r.due<=dayjs(AS_OF_DATE).add(7, 'day').format('YYYY-MM-DD')).length},
      {title:'本人已办',value:rows.filter(r=>r.done).length},
    ].map(metric=><Col span={6} key={metric.title}><MetricStatCard variant="flat" title={metric.title} value={String(metric.value)} unit="项"/></Col>)}</Row></PageSection>
    <PageSection title="筛选事项"><Space wrap><Select aria-label="待办项目" placeholder="全部项目" allowClear showSearch optionFilterProp="label" style={{ width: 260 }} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={params.get('project') ?? undefined} onChange={(v) => update('project', v)} /><Select aria-label="业务类型" placeholder="业务类型" allowClear style={{ width: 160 }} options={['立项评审', '基线确认', '计划评审', '工时审核', '日报', '交付物审核', '成本申请', '预算与变更', '管理决策', '计划与阶段', '执行任务', '需求', 'BUG', '问题', '风险'].map((value) => ({ value, label: value }))} value={params.get('type') ?? undefined} onChange={(v) => update('type', v)} /><Select aria-label="到期范围" placeholder="全部时限" allowClear style={{ width: 160 }} options={[{ value: 'overdue', label: '已超期' }, { value: 'upcoming', label: '7天内到期' }]} value={params.get('due') ?? undefined} onChange={(v) => update('due', v)} /><Input aria-label="待办搜索" placeholder="编号或标题" style={{ width: 200 }} value={params.get('search') ?? ''} onChange={(e) => update('search', e.target.value)} /><Button onClick={() => setParams({})}>重置筛选</Button></Space></PageSection>

    <PageSection title="我的事项" description="会签中本人已处理的节点进入已办，原单可能仍等待其他人处理。"><Tabs activeKey={history ? 'done' : 'pending'} onChange={(key) => update('status', key)} items={[{ key: 'pending', label: `待办（${rows.filter((r) => !r.done).length}）` }, { key: 'done', label: `已办（${rows.filter((r) => r.done).length}）` }]} />
    <Table rowKey="id" size="small" dataSource={filtered} scroll={{ x: 1200 }} pagination={{ pageSize: 10, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(window.location.search); next.set('page', String(page)); setParams(next); } }} columns={[
      { title: '编号 / 事项', width: 230, fixed: 'left', render: (_, r) => <><span className="font-mono text-xs text-blue-600 font-semibold">{r.id}</span><div>{r.title}</div></> }, { title: '项目 / 立项来源', width: 210, render: (_, r) => projects.find((p) => p.id === r.projectId)?.name ?? r.sourceName },
      { title: '业务类型 / 当前节点', width: 180, render: (_, r) => <>{r.type}<div>{r.node}</div></> }, { title: '责任人', width: 90, dataIndex: 'owner' },
      { title: '到期 / 状态', width: 180, render: (_, r) => <><span className="font-mono text-xs">{r.due}</span><div><Tag color={!r.done && r.due < AS_OF_DATE ? 'error' : 'blue'}>{r.status}{!r.done && r.due < AS_OF_DATE ? ' · 已超期' : ''}</Tag></div></> },
      { title: '办理意见', width: 170, render: (_, r) => r.opinion ?? '尚无办理意见' }, { title: '原业务', width: 120, fixed: 'right', render: (_, r) => <Button type="link" size="small" onClick={() => navigate(r.route)}>进入原业务</Button> },
    ]} locale={{ emptyText: history ? (
      <div style={{ padding: '24px 0', color: '#64748b' }}>暂无已办记录：您会签处理过的节点会在此留痕。</div>
    ) : (
      <div style={{ padding: '16px 0' }}>
        <div style={{ color: '#64748b', marginBottom: 12 }}>{hasFilters ? '筛选条件下无待办：可重置筛选查看全部事项。' : '当前角色暂无待办：无需您处理的审批与办理节点，可前往项目台账查看进展。'}</div>
        <Space>
          {hasFilters && <Button size="small" onClick={() => setParams({})}>重置筛选</Button>}
          <Button type="primary" size="small" onClick={() => navigate('/projects')}>前往项目台账</Button>
        </Space>
      </div>
    ) } } /></PageSection><details style={{color:"#64748b",fontSize:12}}><summary style={{cursor:"pointer"}}>到期与会签口径</summary>    <p>演示规则 TODO-1：配置审批按提交快照节点时限，普通审批为提交后3天，任务使用计划截止日；超期在此提醒，不发送外部通知。会签中本人已处理节点进入已办，原单仍等待其他节点。</p></details>
  </>;
}
