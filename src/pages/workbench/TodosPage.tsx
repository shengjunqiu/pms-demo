import { Button, Input, Select, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { visibleProjects } from '@/mock/selectors';

export function TodosPage() {
  const data = useBusinessStore((s) => s.data); const { currentRole, currentUser } = useAppStore();
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const projects = visibleProjects(currentRole, data.projects); const ids = new Set(projects.map((p) => p.id));
  const deadline = (date: string) => new Date(Date.parse(date) + 3 * 86400000).toISOString().slice(0, 10);
  const approvals = data.approvals.filter((a) => ids.has(a.projectId) && a.requiredRole === currentRole).map((a) => ({ id: a.id, projectId: a.projectId, title: a.kind === 'change' ? '重大成本变更' : '预算审批', type: '预算与变更', node: a.requiredRole === 'executive' ? '集团领导' : 'PMO', status: a.status, done: a.status !== '待审批', due: deadline(data.decisions.find((d) => d.id === a.id)!.createdAt), route: `/approvals/${a.id}`, opinion: a.opinion, owner: a.requiredRole === 'executive' ? '王总' : '李主任' }));
  const management = data.managementApprovals.filter((a) => ids.has(a.projectId) && currentRole === 'executive').map((a) => ({ id: a.id, projectId: a.projectId, title: a.type, type: '管理决策', node: '集团领导', status: a.status, done: a.status !== '待审批', due: '2026-09-08', route: `/management-approvals/${a.id}`, opinion: a.opinion, owner: '王总' }));
  const plans = data.planRequests.filter((r) => ids.has(r.projectId) && r.requiredRoles.some((role) => role === currentRole)).map((r) => ({ id: r.id, projectId: r.projectId, title: r.kind === 'stage' ? '阶段切换' : '计划变更', type: '计划与阶段', node: r.requiredRoles.map((role) => role === 'pmo' ? 'PMO' : '财务').join(' + '), status: r.status, done: r.status !== '待审批' || r.reviews.some((v) => v.role === currentRole), due: deadline(r.submittedAt), route: `/projects/${r.projectId}/plan-requests/${r.id}`, opinion: r.reviews.find((v) => v.role === currentRole)?.opinion ?? r.opinion, owner: r.requiredRoles.map((role) => role === 'pmo' ? '李主任' : '刘敏').join(' / ') }));
  const tasks = data.tasks.filter((t) => ids.has(t.projectId) && t.ownerId === currentUser.id).map((t) => ({ id: t.id, projectId: t.projectId, title: t.name, type: '执行任务', node: '任务执行', status: t.status, done: t.progress === 100, due: t.endDate, route: `/projects/${t.projectId}/progress`, opinion: t.executionNote, owner: t.ownerName }));
  const rows = [...approvals, ...management, ...plans, ...tasks].filter((r) => (!params.get('project') || r.projectId === params.get('project')) && (!params.get('type') || r.type === params.get('type')) && (!params.get('search') || `${r.id} ${r.title}`.includes(params.get('search')!)) && (params.get('due') !== 'overdue' || r.due < AS_OF_DATE) && (params.get('due') !== 'upcoming' || r.due >= AS_OF_DATE && r.due <= '2026-09-16'));
  const history = params.get('status') === 'done'; const filtered = rows.filter((r) => r.done === history);
  const update = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next); };
  return <><PageHeader title="WK-02 我的待办中心" description={`${currentUser.name} · ${AS_OF_DATE} · 原业务状态实时聚合`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '我的待办' }]} />
    <Space wrap style={{ marginBottom: 16 }}><Select aria-label="待办项目" placeholder="全部项目" allowClear showSearch optionFilterProp="label" style={{ width: 260 }} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={params.get('project') ?? undefined} onChange={(v) => update('project', v)} /><Select aria-label="业务类型" placeholder="业务类型" allowClear style={{ width: 160 }} options={['预算与变更', '管理决策', '计划与阶段', '执行任务'].map((value) => ({ value, label: value }))} value={params.get('type') ?? undefined} onChange={(v) => update('type', v)} /><Select aria-label="到期范围" placeholder="全部时限" allowClear style={{ width: 160 }} options={[{ value: 'overdue', label: '已超期' }, { value: 'upcoming', label: '7天内到期' }]} value={params.get('due') ?? undefined} onChange={(v) => update('due', v)} /><Input aria-label="待办搜索" placeholder="编号或标题" style={{ width: 200 }} value={params.get('search') ?? ''} onChange={(e) => update('search', e.target.value)} /><Button onClick={() => setParams({})}>重置筛选</Button></Space>
    <p>演示规则 TODO-1：审批办理期限为提交后3天，任务使用计划截止日；超期在此提醒，不发送外部通知。会签中本人已处理节点进入已办，原单仍等待其他节点。</p>
    <Tabs activeKey={history ? 'done' : 'pending'} onChange={(key) => update('status', key)} items={[{ key: 'pending', label: `待办（${rows.filter((r) => !r.done).length}）` }, { key: 'done', label: `已办（${rows.filter((r) => r.done).length}）` }]} />
    <Table rowKey="id" size="small" dataSource={filtered} scroll={{ x: 1200 }} pagination={{ pageSize: 10, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); } }} columns={[
      { title: '编号 / 事项', width: 230, fixed: 'left', render: (_, r) => <>{r.id}<div>{r.title}</div></> }, { title: '项目', width: 250, render: (_, r) => projects.find((p) => p.id === r.projectId)?.name },
      { title: '业务类型 / 当前节点', width: 180, render: (_, r) => <>{r.type}<div>{r.node}</div></> }, { title: '责任人', width: 120, dataIndex: 'owner' },
      { title: '到期 / 状态', width: 180, render: (_, r) => <>{r.due}<div><Tag color={!r.done && r.due < AS_OF_DATE ? 'error' : 'blue'}>{r.status}{!r.done && r.due < AS_OF_DATE ? ' · 已超期' : ''}</Tag></div></> },
      { title: '办理意见', width: 200, render: (_, r) => r.opinion ?? '尚无办理意见' }, { title: '原业务', width: 140, fixed: 'right', render: (_, r) => <Button onClick={() => navigate(r.route)}>进入原业务</Button> },
    ]} />
  </>;
}
