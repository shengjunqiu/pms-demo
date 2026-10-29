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
import type { BusinessTodo } from '@/models/todos';

export function TodosPage() {
  const data = useBusinessStore((s) => s.data); const { currentRole, currentUser } = useAppStore();
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const projects = visibleProjects(currentRole, data.projects, data);
  const allRows = selectTodos(data, currentUser);
  // 来源计数按全部待办算，不随当前筛选缩水
  const pendingBy = (source: BusinessTodo['source']) => allRows.filter((r) => r.source === source && !r.done).length;
  const rows = allRows.filter((r) => (!params.get('project') || r.projectId === params.get('project')) && (!params.get('type') || r.type === params.get('type')) && (!params.get('source') || r.source === params.get('source')) && (!params.get('search') || `${r.id} ${r.title}`.includes(params.get('search')!)) && (params.get('due') !== 'overdue' || r.due < AS_OF_DATE) && (params.get('due') !== 'upcoming' || r.due >= AS_OF_DATE && r.due <= dayjs(AS_OF_DATE).add(7, 'day').format('YYYY-MM-DD')));
  const history = params.get('status') === 'done'; const filtered = rows.filter((r) => r.done === history);
  // 默认把“我审批的”置顶，再按到期日排序，避免审批节点被大量执行事项淹没。
  const sourceRank: Record<NonNullable<BusinessTodo['source']>, number> = { approval: 0, mine: 1, follow: 2 };
  const prioritized = [...filtered].sort((a, b) => sourceRank[a.source ?? 'mine'] - sourceRank[b.source ?? 'mine'] || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  const update = (key: string, value?: string) => { const next = new URLSearchParams(window.location.search); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next); };
  // 🔵6 空态引导：区分“筛选过严”与“确实无待办”，并给出可达去向
  const hasFilters = ['project', 'type', 'source', 'due', 'search'].some((k) => params.get(k));
  return <><PageHeader title="WK-02 我的待办中心" description={`${currentUser.name} · ${AS_OF_DATE} · 原业务状态实时聚合`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '我的待办' }]} />
    <PageSection className="pms-record-summary"><Row gutter={16}>{[
      {title:'当前筛选待办',value:rows.filter(r=>!r.done).length},
      {title:'已超期待办',value:rows.filter(r=>!r.done&&r.due<AS_OF_DATE).length},
      {title:'7天内到期',value:rows.filter(r=>!r.done&&r.due>=AS_OF_DATE&&r.due<=dayjs(AS_OF_DATE).add(7, 'day').format('YYYY-MM-DD')).length},
      {title:'本人已办',value:rows.filter(r=>r.done).length},
    ].map(metric=><Col span={6} key={metric.title}><MetricStatCard variant="flat" title={metric.title} value={String(metric.value)} unit="项"/></Col>)}</Row></PageSection>
    <PageSection title="筛选事项"><Space wrap><Select aria-label="待办项目" placeholder="全部项目" allowClear showSearch optionFilterProp="label" style={{ width: 260 }} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={params.get('project') ?? undefined} onChange={(v) => update('project', v)} /><Select aria-label="待办来源" placeholder="全部来源" allowClear style={{ width: 150 }} options={[{ value: 'approval', label: `我审批的（${pendingBy('approval')}）` }, { value: 'mine', label: `我办理的（${pendingBy('mine')}）` }, { value: 'follow', label: `我跟进的（${pendingBy('follow')}）` }]} value={params.get('source') ?? undefined} onChange={(v) => update('source', v)} /><Select aria-label="业务类型" placeholder="业务类型" allowClear style={{ width: 160 }} options={['立项评审', '基线确认', '计划评审', '工时审核', '日报', '交付物审核', '成本申请', '预算与变更', '管理决策', '计划与阶段', '执行任务', '需求', 'BUG', '问题', '风险'].map((value) => ({ value, label: value }))} value={params.get('type') ?? undefined} onChange={(v) => update('type', v)} /><Select aria-label="到期范围" placeholder="全部时限" allowClear style={{ width: 160 }} options={[{ value: 'overdue', label: '已超期' }, { value: 'upcoming', label: '7天内到期' }]} value={params.get('due') ?? undefined} onChange={(v) => update('due', v)} /><Input aria-label="待办搜索" placeholder="编号或标题" style={{ width: 200 }} value={params.get('search') ?? ''} onChange={(e) => update('search', e.target.value)} /><Button onClick={() => setParams({})}>重置筛选</Button></Space></PageSection>

    <PageSection title="我的事项" description="按当前模拟身份显示：办理身份列标注本次是以审批、主PM、责任人或最终确认等哪一种职责收到该事项；来源列区分“我审批的”（需要我出结论）、“我办理的”（我自己的节点）与“我跟进的”（超期升级与督办）。会签中本人已处理的节点进入已办，原单可能仍等待其他人处理。"><Tabs activeKey={history ? 'done' : 'pending'} onChange={(key) => update('status', key)} items={[{ key: 'pending', label: `待办（${rows.filter((r) => !r.done).length}）` }, { key: 'done', label: `已办（${rows.filter((r) => r.done).length}）` }]} />
    <Table rowKey="id" size="small" dataSource={prioritized} scroll={{ x: 960 }} pagination={{ pageSize: 10, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(window.location.search); next.set('page', String(page)); setParams(next); } }} columns={[
      { title: '编号 / 事项', width: 200, fixed: 'left', render: (_, r) => <><span className="font-mono text-xs text-blue-600 font-semibold">{r.id}</span><div>{r.title}</div></> }, { title: '项目 / 立项来源', width: 180, render: (_, r) => projects.find((p) => p.id === r.projectId)?.name ?? r.sourceName },
      { title: '业务类型 / 当前节点', width: 150, render: (_, r) => <>{r.type}<div>{r.node}</div></> }, { title: '责任人', width: 80, dataIndex: 'owner' },
      { title: '来源 / 办理身份', width: 140, render: (_, r) => { const map = { approval: ['我审批的', 'blue'], mine: ['我办理的', 'green'], follow: ['我跟进的', 'orange'] } as const; const [label, color] = map[r.source ?? 'mine']; return <><Tag color={color}>{label}</Tag>{r.duty && <div className="text-xs text-slate-500 mt-0.5">{r.duty}</div>}</>; } },
      { title: '到期 / 状态', width: 120, render: (_, r) => <><span className="font-mono text-xs">{r.due}</span><div><Tag color={!r.done && r.due < AS_OF_DATE ? 'error' : 'blue'}>{r.status}{!r.done && r.due < AS_OF_DATE ? ' · 已超期' : ''}</Tag></div></> },
      { title: '原业务', width: 90, fixed: 'right', render: (_, r) => <Button type="link" size="small" onClick={() => navigate(r.route)}>进入原业务</Button> },
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
