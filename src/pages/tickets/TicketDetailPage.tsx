import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Input, Modal, Select, Space, Tag, Timeline } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockUsers } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { ticketLabels, ticketMeta, ticketTable, type TicketAction, type TicketKind } from '@/mock/tickets';
import { visibleProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
type Operation = Extract<TicketAction, { type: 'update-ticket' }>['operation'] | 'convert';
const operations: Record<Operation, string> = { feedback: '反馈进展', resolve: '提交解决结果', transfer: '转办责任人', confirm: '最终确认关闭', return: '退回继续处理', escalate: '督办升级', mitigate: '登记风险缓解', convert: '风险转问题' };

export function TicketDetailPage({ family }: { family: 'quality' | 'risk' }) {
  const { id } = useParams(); const [params] = useSearchParams(); const navigate = useNavigate(); const { message } = App.useApp();
  const { data, dispatch } = useBusinessStore(); const { currentRole, currentUser } = useAppStore();
  const [operation, setOperation] = useState<Operation>(); const [note, setNote] = useState(''); const [ownerId, setOwnerId] = useState<string>();
  const kinds: TicketKind[] = family === 'quality' ? ['requirement', 'bug'] : ['issue', 'risk'];
  const kind = kinds.find((kind) => ticketTable(data, kind).some((t) => t.id === id));
  if (!kind) return <StateView type="404" />;
  const ticket = ticketTable(data, kind).find((t) => t.id === id)!; const p = data.projects.find((p) => p.id === ticket.projectId)!;
  if (!visibleProjects(currentRole, data.projects, data).some((p) => p.id === ticket.projectId)) return <StateView type="403" />;
  const meta = ticketMeta(data, kind, ticket.id); const pm = currentRole === 'project-manager' && currentUser.id === p.pmId;
  const writer = ['project-manager', 'solution-tech', 'pmo'].includes(currentRole);
  const owner = meta.ownerId === currentUser.id || ticket.owner === currentUser.name;
  const creator = meta.creatorId ? meta.creatorId === currentUser.id : 'creator' in ticket && ticket.creator === currentUser.name;
  const awaiting = ticket.status === (kind === 'requirement' ? '待验证' : kind === 'bug' ? '待复测' : '已解决');
  const closed = ticket.status === '已关闭'; const base = family === 'quality' ? '/requirements-bugs' : '/issues-risks';
  const sourceRisk = 'fromRiskId' in ticket ? ticket.fromRiskId : undefined;
  const converted = data.issues.find((i) => i.fromRiskId === ticket.id);
  const rank = 'priority' in ticket ? ticket.priority : 'severity' in ticket ? ticket.severity : ticket.level;
  return <><PageHeader title={`${family === 'quality' ? 'HS-06' : 'HS-08'} ${ticketLabels[kind]}详情`} description={`${ticket.id} · ${p.name}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '原业务详情' }]} extra={<Button onClick={() => navigate(`${base}?${params}`)}>返回台账</Button>} />
    <Descriptions bordered column={3} items={[
      { key: 'title', label: '标题', span: 3, children: ticket.title }, { key: 'type', label: '业务类别', children: `${ticketLabels[kind]} / ${meta.category}` }, { key: 'rank', label: kind === 'requirement' ? '优先级' : '等级', children: rank }, { key: 'status', label: '当前状态', children: <Tag>{ticket.status}</Tag> },
      { key: 'owner', label: '当前责任人', children: ticket.owner }, { key: 'creator', label: '发起人', children: meta.creatorId ? mockUsers.find((u) => u.id === meta.creatorId)?.name : 'creator' in ticket ? ticket.creator : p.pmName }, { key: 'due', label: '期望解决 / 措施期限', children: meta.deadline },
      { key: 'desc', label: '原始描述', span: 3, children: meta.description }, { key: 'chain', label: '责任链', span: 3, children: `${ticket.owner} → 项目经理 ${p.pmName} → ${p.departmentName} → ${meta.escalatedTo ?? 'PMO（按需升级）'}` },
      ...(kind === 'requirement' ? [{ key: 'product', label: '产品线 / 产品', children: meta.product ?? '历史记录未提供' }, { key: 'impact', label: '进度基线影响', children: meta.baselineImpact ? '须变更审批' : '未声明影响' }, { key: 'change', label: '关联变更', children: meta.changeRequestId ? <Button type="link" onClick={() => navigate(`/projects/${p.id}/plan-requests/${meta.changeRequestId}`)}>{meta.changeRequestId}</Button> : '无' }] : []),
      ...(kind === 'risk' ? [{ key: 'score', label: '概率 × 影响', children: meta.probability && meta.impact ? `${meta.probability} × ${meta.impact} = ${meta.probability * meta.impact}` : '沿用导入等级，评分未提供' }, { key: 'strategy', label: '应对策略', children: 'strategy' in ticket ? ticket.strategy : '—' }, { key: 'measures', label: '应对措施', children: meta.measures ?? '待责任人补充' }] : []),
      { key: 'closed', label: '实际关闭日期', span: 3, children: meta.closedAt ?? '尚未最终关闭' },
    ]} />
    <Space wrap style={{ margin: '16px 0' }}><Button onClick={() => navigate(`/projects/${p.id}?tab=${family === 'quality' ? 'requirements' : 'risks'}`)}>查看项目原摘要</Button>{sourceRisk && <Button onClick={() => navigate(`/issues-risks/${sourceRisk}`)}>查看来源风险 {sourceRisk}</Button>}{converted && <Button onClick={() => navigate(`/issues-risks/${converted.id}`)}>查看已转问题 {converted.id}</Button>}{kind === 'requirement' && meta.baselineImpact && <Button disabled={!pm || !!meta.changeRequestId} onClick={() => navigate(`/projects/${p.id}/plan-requests/new?kind=schedule&sourceRequirementId=${ticket.id}&reason=${encodeURIComponent(`需求${ticket.id}影响进度：${ticket.title}`)}`)}>转计划变更申请</Button>}</Space>
    <Alert showIcon type="info" message={kind === 'issue' ? '责任人解决后，必须由主PM最终确认关闭；重大及超期问题持续督办。' : kind === 'risk' ? '重大风险升级后仍继续跟踪；发生后转问题，保留原风险、措施和关联。' : '责任人提交解决结果后，必须由发起人验证关闭或退回；转办不会改变发起人。'} />
    <Card size="small" title="原事项处理" style={{ margin: '16px 0' }}><Space wrap>
      {(['feedback', 'transfer', ...(kind === 'risk' ? ['mitigate', 'convert'] : ['resolve']), ...(family === 'risk' ? ['escalate'] : []), ...(kind !== 'risk' ? ['confirm', 'return'] : [])] as Operation[]).map((op) => {
        const allowed = writer && !closed && (op === 'confirm' || op === 'return' ? awaiting && (kind === 'issue' ? pm : creator) : op === 'convert' ? pm && ticket.status === '监控中' : op === 'escalate' ? pm || currentRole === 'pmo' : op === 'mitigate' ? (owner || pm) && ticket.status === '监控中' : owner || pm);
        return <Button key={op} disabled={!allowed} type={op === 'confirm' ? 'primary' : 'default'} onClick={() => { setOperation(op); setNote(''); setOwnerId(undefined); }}>{operations[op]}</Button>;
      })}
    </Space></Card>
    <Card title="不可删除的处理轨迹" size="small"><Timeline items={meta.history.map((h, i) => ({ key: i, children: <><b>{h.date} · {h.actor} · {operations[h.action as Operation] ?? h.action}</b><div>{h.detail}</div></> }))} /></Card>
    <Modal title={operation ? operations[operation] : ''} open={!!operation} onCancel={() => setOperation(undefined)} onOk={() => {
      try { if (!note.trim()) throw new Error('处理说明或评价必填'); const actor = { id: currentUser.id, name: currentUser.name, role: currentRole }; if (operation === 'convert') dispatch({ type: 'risk-to-issue', id: ticket.id, note }, actor); else dispatch({ type: 'update-ticket', kind, id: ticket.id, operation: operation!, note, ownerId }, actor); setOperation(undefined); message.success('原事项及关联摘要已更新'); } catch (error) { message.error((error as Error).message); }
    }}><p>{ticket.title}</p>{operation === 'transfer' && <Select aria-label="转办责任人" style={{ width: '100%', marginBottom: 12 }} placeholder="选择另一位责任人" showSearch optionFilterProp="label" value={ownerId} options={mockUsers.map((u) => ({ value: u.id, label: u.name }))} onChange={setOwnerId} />}<Input.TextArea aria-label="处理说明" rows={4} placeholder="处理结果、转办原因、措施或验证评价（必填）" value={note} onChange={(e) => setNote(e.target.value)} /></Modal>
  </>;
}
