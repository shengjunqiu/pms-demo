import { useState } from 'react';
import { Alert, App, Button, Col, Descriptions, Input, Modal, Row, Select, Space, Tag, Timeline } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE, mockUsers } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { ticketLabels, ticketMeta, ticketTable, type TicketAction, type TicketKind } from '@/mock/tickets';
import { visibleProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useActionAccess } from '@/hooks/useActionAccess';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSection, PageToolbar } from '@/components/common/PageSection';
import { StateView } from '@/components/common/StateView';
type Operation = Extract<TicketAction, { type: 'update-ticket' }>['operation'] | 'convert';
const operations: Record<Operation, string> = { feedback: '反馈进展', resolve: '提交解决结果', transfer: '转办责任人', confirm: '最终确认关闭', return: '退回继续处理', escalate: '督办升级', mitigate: '登记风险缓解', convert: '风险转问题' };

export function TicketDetailPage({ family }: { family: 'quality' | 'risk' }) {
  const { id } = useParams();
  return <TicketDetailContent key={`${family}-${id}`} family={family} />;
}

function TicketDetailContent({ family }: { family: 'quality' | 'risk' }) {
  const { canDo } = useActionAccess();
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
  const canOperate = (op: Operation | undefined) => !!op && canDo(op === 'convert' ? 'risk-to-issue' : 'update-ticket', ticket.id) && writer && !closed && (op === 'confirm' || op === 'return' ? awaiting && (kind === 'issue' ? pm : creator) : op === 'convert' ? pm && ticket.status === '监控中' : op === 'escalate' ? pm || currentRole === 'pmo' : op === 'mitigate' ? (owner || pm) && ticket.status === '监控中' : owner || pm);
  const canOperateCurrent = canOperate(operation);
  const sourceRisk = 'fromRiskId' in ticket ? ticket.fromRiskId : undefined;
  const converted = data.issues.find((i) => i.fromRiskId === ticket.id);
  const rank = 'priority' in ticket ? ticket.priority : 'severity' in ticket ? ticket.severity : ticket.level;
  const ended = closed || ['已缓解', '已转问题'].includes(ticket.status);
  const overdue = !ended && meta.deadline < AS_OF_DATE;
  const creatorName = meta.creatorId ? mockUsers.find((u) => u.id === meta.creatorId)?.name : 'creator' in ticket ? ticket.creator : p.pmName;
  const confirmationName = kind === 'issue' ? `主PM ${p.pmName}` : `发起人 ${creatorName ?? '原发起人'}`;
  const nextStep = closed ? `已最终关闭 · ${meta.closedAt ?? '历史未提供日期'}` : kind === 'risk' ? ticket.status === '已转问题' ? '风险已转为实际问题，请继续办理关联问题。' : ticket.status === '已缓解' ? '已登记缓解措施，原风险及历史保留。' : `由 ${ticket.owner} 持续监控；风险发生后由主PM转为问题。` : awaiting ? `等待${confirmationName}验证结果，确认关闭或退回。` : `由 ${ticket.owner} 处理并提交解决结果，再由${confirmationName}确认。`;
  const primary: Operation = kind === 'risk' ? 'mitigate' : awaiting ? 'confirm' : 'resolve';
  const orderedOperations: Operation[] = [primary, ...(kind === 'risk' ? ['convert' as const] : awaiting ? ['return' as const] : []), 'feedback', 'transfer', ...(family === 'risk' ? ['escalate' as const] : []), ...(kind !== 'risk' ? awaiting ? ['resolve' as const] : ['confirm' as const, 'return' as const] : [])];
  const historyItems = [...meta.history].reverse().map((h, i) => ({ key: i, children: <><b>{operations[h.action as Operation] ?? h.action}</b><div style={{ color: '#64748b', fontSize: 12 }}>{h.date} · {h.actor}</div><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 4 }}>{h.detail}</div></> }));
  const openOperation = (op: Operation) => { setOperation(op); setNote(''); setOwnerId(undefined); };
  return <>
    <PageHeader title={`${ticketLabels[kind]}详情`} description={`${ticket.id} · ${p.id} · ${p.name}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: family === 'quality' ? '需求与BUG' : '问题与风险', href: `${base}?${params}` }, { title: '原事项' }]} extra={<Button onClick={() => navigate(`${base}?${params}`)}>返回台账</Button>} />
    <PageSection title={<span data-testid="ticket-title">{ticket.title}</span>} extra={<Space wrap><Tag color={ended ? 'green' : awaiting ? 'gold' : 'blue'} data-testid="ticket-status">{ticket.status}</Tag><Tag color={['致命', '严重', '重大', '特大'].includes(rank) ? 'red' : undefined}>{rank}</Tag></Space>}>
      <Descriptions column={3} size="small" items={[
        { key: 'owner', label: '当前责任人', children: ticket.owner },
        { key: 'creator', label: '发起人', children: creatorName ?? '历史未提供' },
        { key: 'deadline', label: '期望解决 / 措施期限', children: <>{meta.deadline}{overdue && <Tag color="red" style={{ marginLeft: 8 }}>已超期</Tag>}</> },
      ]} />
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}><strong>当前任务</strong><p style={{ margin: '6px 0 12px' }}>{nextStep}</p><Space wrap>{orderedOperations.map((op) => <Button key={op} disabled={!canOperate(op)} type={op === primary && canOperate(op) ? 'primary' : 'default'} onClick={() => openOperation(op)}>{operations[op]}</Button>)}</Space></div>
    </PageSection>
    {(sourceRisk || converted) && <PageSection title="风险与问题关联" description="保留原风险，实际问题独立处理并由主PM关闭。"><Space wrap>{sourceRisk && <Button onClick={() => navigate(`/issues-risks/${sourceRisk}?${params}`)}>查看来源风险 {sourceRisk}</Button>}{converted && <Button onClick={() => navigate(`/issues-risks/${converted.id}?${params}`)}>查看已转问题 {converted.id}</Button>}</Space></PageSection>}
    <Row gutter={16}>
      <Col xs={24} lg={15}>
        <PageSection title="原始事项与处理依据">
          <Descriptions size="small" column={2} items={[
            { key: 'type', label: '业务类别', children: `${ticketLabels[kind]} / ${meta.category}` },
            { key: 'rank', label: kind === 'requirement' ? '优先级' : '等级', children: rank },
          ]} />
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>原始描述</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 0 }}>{meta.description}</p>
          {kind === 'requirement' && <><h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>产品与基线关联</h3><Descriptions size="small" column={1} items={[
            { key: 'product', label: '产品线 / 产品', children: meta.product || '历史记录未提供' },
            { key: 'impact', label: '进度基线影响', children: meta.baselineImpact ? '须变更审批' : '未声明影响' },
            { key: 'change', label: '关联变更', children: meta.changeRequestId ? <Button type="link" onClick={() => navigate(`/projects/${p.id}/plan-requests/${meta.changeRequestId}`)}>{meta.changeRequestId}</Button> : '无' },
          ]} />{meta.baselineImpact && <><Alert style={{ margin: '12px 0' }} showIcon type="info" message="关联计划变更通过后，方可提交需求解决结果。" /><Button disabled={!pm || !!meta.changeRequestId || !canDo('request-plan', p.id)} onClick={() => navigate(`/projects/${p.id}/plan-requests/new?kind=schedule&sourceRequirementId=${ticket.id}&reason=${encodeURIComponent(`需求${ticket.id}影响进度：${ticket.title}`)}`)}>转计划变更申请</Button></>}</>}
          {kind === 'risk' && <><h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>风险评估与应对</h3><Descriptions size="small" column={1} items={[
            { key: 'score', label: '概率 × 影响', children: meta.probability && meta.impact ? `${meta.probability} × ${meta.impact} = ${meta.probability * meta.impact}` : '沿用导入等级，评分未提供' },
            { key: 'strategy', label: '应对策略', children: 'strategy' in ticket ? ticket.strategy : '—' },
            { key: 'measures', label: '应对措施', children: <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{meta.measures ?? '待责任人补充'}</span> },
          ]} /><p style={{ color: '#64748b', fontSize: 12 }}>演示规则 CASE-1：概率×影响；6 / 12 / 20分对应中等 / 重大 / 特大。</p></>}
        </PageSection>
        <PageSection title="责任链与处理规则">
          <p style={{ marginTop: 0 }}>{ticket.owner} → 项目经理 {p.pmName} → {p.departmentName} → {meta.escalatedTo ?? 'PMO（按需升级）'}</p>
          <Descriptions size="small" column={1} items={[{ key: 'closed', label: '实际关闭日期', children: meta.closedAt ?? '尚未最终关闭' }, { key: 'escalated', label: '当前督办层级', children: meta.escalatedTo ?? (kind === 'risk' && ['重大', '特大'].includes(rank) || kind === 'issue' && rank === '重大' ? 'PMO' : '项目内跟踪') }]} />
          <p style={{ margin: '12px 0 0', color: '#64748b' }}>{kind === 'issue' ? '责任人解决后，必须由主PM最终确认关闭；重大及超期问题持续督办。' : kind === 'risk' ? '重大风险升级后仍继续跟踪；发生后转问题，保留原风险、措施和关联。' : '责任人提交解决结果后，必须由发起人验证关闭或退回；转办不会改变发起人。'}</p>
        </PageSection>
      </Col>
      <Col xs={24} lg={9}><PageSection title="处理轨迹" description={`共 ${meta.history.length} 条 · 最新在前，完整历史保留`}><Timeline items={historyItems.slice(0, 4)} />{historyItems.length > 4 && <details><summary style={{ cursor: 'pointer', marginBottom: 16 }}>查看更早的 {historyItems.length - 4} 条记录</summary><Timeline items={historyItems.slice(4)} /></details>}</PageSection></Col>
    </Row>
    <PageToolbar><Button onClick={() => navigate(`/projects/${p.id}?tab=${family === 'quality' ? 'requirements' : 'risks'}`)}>查看项目原摘要</Button><span style={{ color: '#64748b', fontSize: 12 }}>项目、台账与原事项共享同一业务状态。</span></PageToolbar>
    <Modal title={operation ? operations[operation] : ''} open={!!operation} okButtonProps={{ disabled: !canOperateCurrent }} onCancel={() => setOperation(undefined)} onOk={() => {
      try {
        if (!canOperate(operation)) throw new Error('当前策略或事项状态不允许此操作');
        if (!note.trim()) throw new Error('处理说明或评价必填');
        const actor = { id: currentUser.id, name: currentUser.name, role: currentRole };
        if (operation === 'convert') dispatch({ type: 'risk-to-issue', id: ticket.id, note }, actor);
        else dispatch({ type: 'update-ticket', kind, id: ticket.id, operation: operation!, note, ownerId }, actor);
        setOperation(undefined); message.success('原事项及关联摘要已更新');
      } catch (error) { message.error((error as Error).message); }
    }}><p>{ticket.title}</p>{operation === 'transfer' && <><p>选择另一位责任人，发起人保持不变。</p><Select disabled={!canOperateCurrent} aria-label="转办责任人" style={{ width: '100%', marginBottom: 12 }} placeholder="选择另一位责任人" showSearch optionFilterProp="label" value={ownerId} options={mockUsers.map((u) => ({ value: u.id, label: u.name }))} onChange={setOwnerId} /></>}<label htmlFor="ticket-operation-note" style={{ display: 'block', marginBottom: 8 }}>处理说明 · 必填</label><Input.TextArea id="ticket-operation-note" disabled={!canOperateCurrent} aria-label="处理说明" rows={4} placeholder="处理结果、转办原因、措施或验证评价" value={note} onChange={(e) => setNote(e.target.value)} /></Modal>
  </>;
}
