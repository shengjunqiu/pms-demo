import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Input, InputNumber, Modal, Space, Table } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { visibleProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';

export function PlanRequestPage() {
  const { id, requestId } = useParams(); const [params] = useSearchParams(); const navigate = useNavigate(); const { message } = App.useApp();
  const { data, dispatch } = useBusinessStore(); const { currentRole, currentUser } = useAppStore();
  const [reason, setReason] = useState(''); const [days, setDays] = useState(7); const [opinion, setOpinion] = useState(''); const [decision, setDecision] = useState<boolean>();
  const p = data.projects.find((p) => p.id === id); const request = data.planRequests.find((r) => r.id === requestId && r.projectId === id); const isNew = requestId === 'new';
  if (!p || !isNew && !request) return <StateView type="404" />;
  if (!visibleProjects(currentRole, data.projects).some((p) => p.id === id)) return <StateView type="403" />;
  const kind = request?.kind ?? (params.get('kind') === 'stage' ? 'stage' : 'schedule');
  const canSubmit = currentRole === 'project-manager' && currentUser.id === p.pmId && !data.lockedProjects.includes(p.id);
  const canReview = request?.status === '待审批' && request.requiredRoles.some((r) => r === currentRole) && !request.reviews.some((r) => r.role === currentRole);
  const actor = { id: currentUser.id, name: currentUser.name, role: currentRole };
  return <><PageHeader title={kind === 'schedule' ? '项目计划变更原单' : '项目阶段切换原单'} description={`${p.id} · ${p.name} · ${request?.id ?? '新申请'}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '原业务申请' }]} extra={<Button onClick={() => navigate(-1)}>返回来源</Button>} />
    <Descriptions bordered column={2} items={[{ key: 'baseline', label: '引用基线', children: request?.baselineId ?? data.baselines.find((b) => b.projectId === id && b.status === '已生效')?.id }, { key: 'node', label: '节点 / 状态', children: `${request?.requiredRoles.map((role) => role === 'pmo' ? 'PMO' : '财务').join(' + ') ?? (days > 30 && kind === 'schedule' ? 'PMO + 财务会签' : 'PMO')} · ${request?.status ?? '待提交'}` }, { key: 'reason', label: '申请理由', span: 2, children: request?.reason ?? '请填写下方申请' }, { key: 'opinion', label: '审批意见', span: 2, children: request?.opinion ?? '尚未审批' }]} />
    <Alert style={{ margin: '16px 0' }} showIcon type="info" message={kind === 'schedule' ? '演示支持未完成任务和未达成里程碑整体顺延1至90天；通过后追加计划基线，已完成任务和执行事实保留。' : '阶段门检查执行完成率、开发完成里程碑、必交材料及未关闭重大问题；条件不足不能通过。'} />
    {kind === 'stage' && <Card title="阶段门检查" size="small"><p>当前阶段：{p.phase} / {p.subPhase}；实际完成率：{p.progressRate}%</p><p>未关闭重大问题：{data.issues.filter((i) => i.projectId === id && i.severity === '重大' && i.status !== '已关闭').length}</p><p>开发完成里程碑：{data.milestones.find((m) => m.projectId === id && m.type === '开发完成')?.status}</p><Table size="small" rowKey="id" pagination={false} dataSource={data.materials.filter((m) => m.projectId === id)} columns={[{ title: '必交材料', dataIndex: 'name' }, { title: '审核状态', dataIndex: 'status' }]} /></Card>}
    {kind === 'schedule' && <Card title={`申请计划 · 顺延${request?.shiftDays ?? days}天`} size="small"><Table rowKey="id" size="small" pagination={false} dataSource={request?.tasks ?? data.tasks.filter((t) => t.projectId === id)} columns={[{ title: '任务', dataIndex: 'name' }, { title: '原计划开始', dataIndex: 'startDate' }, { title: '原计划完成', dataIndex: 'endDate' }, { title: '提交时完成率', dataIndex: 'progress' }]} /></Card>}
    {request && <Card size="small" title="审批轨迹 · 演示规则 PLAN-1"><p>计划顺延超过30天时须PMO与财务全通过，其余由PMO审批；单个节点通过不生效。</p>{request.requiredRoles.map((role) => <p key={role}>{role === 'pmo' ? 'PMO' : '财务'}：{request.reviews.find((r) => r.role === role)?.opinion ?? '等待处理'}</p>)}</Card>}
    {isNew ? <Card title="提交申请" size="small" style={{ marginTop: 16 }}><Space direction="vertical" style={{ width: '100%' }}>{kind === 'schedule' && <label>顺延天数 <InputNumber aria-label="顺延天数" min={1} max={90} value={days} onChange={(value) => setDays(value ?? 1)} disabled={!canSubmit} /></label>}<Input.TextArea aria-label="申请理由" placeholder="申请理由、影响与应对措施（必填）" value={reason} onChange={(e) => setReason(e.target.value)} disabled={!canSubmit} /><Button type="primary" disabled={!canSubmit} onClick={() => { try { const newId = `PLAN-${data.planRequests.length + 1}`; dispatch({ type: 'request-plan', projectId: p.id, kind, shiftDays: kind === 'stage' ? 0 : days, reason }, actor); navigate(`/projects/${p.id}/plan-requests/${newId}`, { replace: true }); message.success('原申请已提交PMO'); } catch (error) { message.error((error as Error).message); } }}>提交PMO审批</Button></Space></Card> : request?.status === '待审批' && <Card title="当前节点审批" size="small" style={{ marginTop: 16 }}><Input.TextArea aria-label="审批意见" value={opinion} disabled={!canReview} onChange={(e) => setOpinion(e.target.value)} /><Space style={{ marginTop: 12 }}><Button type="primary" disabled={!canReview} onClick={() => opinion.trim() ? setDecision(true) : message.error('审批意见必填')}>通过申请</Button><Button danger disabled={!canReview} onClick={() => opinion.trim() ? setDecision(false) : message.error('审批意见必填')}>驳回申请</Button></Space></Card>}
    <Modal title={decision ? '确认通过申请' : '确认驳回申请'} open={decision !== undefined} onCancel={() => setDecision(undefined)} onOk={() => { try { dispatch({ type: 'review-plan', id: request!.id, approve: decision!, opinion }, actor); setDecision(undefined); message.success('审批状态已更新'); } catch (error) { message.error((error as Error).message); } }}><p>{p.name}</p><p>{opinion}</p></Modal>
  </>;
}
