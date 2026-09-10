import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Modal, Space, Table, Tag, Timeline, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { visibleProjects } from '@/mock/selectors';

export function BudgetApprovalPage({ approvalId }: { approvalId?: string } = {}) {
  const { message, modal } = App.useApp();
  const { id } = useParams(); const navigate = useNavigate();
  const { data, dispatch } = useBusinessStore(); const { currentRole, currentUser } = useAppStore();
  const [opinion, setOpinion] = useState(''); const [decision, setDecision] = useState<boolean>();
  const approval = data.approvals.find((a) => a.id === (approvalId ?? id));
  if (!approval) return <StateView type="404" title="审批不存在" />;
  const project = data.projects.find((p) => p.id === approval.projectId)!;
  if (!['project-manager','pmo','finance','executive','admin'].includes(currentRole) || !visibleProjects(currentRole, data.projects).some((p) => p.id === project.id)) return <StateView type="403" />;
  const original = data.decisions.find((d) => d.id === approval.id);
  const permitted = approval.status === '待审批' && currentRole === approval.requiredRole;
  return <><PageHeader title={approval.kind === 'change' ? '重大成本变更原审批' : '预算调整原审批'} description={`${approval.id} · ${project.name} · 审批引用提交时快照`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '预算调整原审批' }]} extra={<Button onClick={() => navigate(-1)}>返回来源</Button>} />
    <Descriptions bordered column={3} items={[
      { key: 'id', label: '项目', children: `${project.id} · ${project.name}` }, { key: 'status', label: '审批状态', children: <Tag color={approval.status === '通过' ? 'success' : approval.status === '驳回' ? 'error' : 'processing'}>{approval.status}</Tag> },
      { key: 'node', label: '当前节点', children: approval.requiredRole === 'executive' ? 'PMC / 集团领导' : 'PMO评审' },
      { key: 'estimate', label: `引用概算 ${approval.estimate.version}`, children: <MoneyText value={approval.estimate.totalCost} /> },
      { key: 'baseline', label: `原基线 ${approval.baseline.version}`, children: <MoneyText value={approval.baseline.budgetAmount} /> },
      { key: 'proposed', label: '申请预算（万元）', children: <MoneyText value={approval.budget.totalAmount} /> },
      { key: 'change', label: '原变更单', span: 3, children: approval.sourceChangeId ?? '预算调整' },
      { key: 'reason', label: '申请说明', span: 3, children: approval.reason },
    ]} />
    <Alert style={{ margin: '16px 0' }} showIcon type="warning" message={approval.budget.isOverEstimate ? `申请预算命中超概算规则，须集团领导审批：${approval.budget.overEstimateReasons?.join('；')??'超总成本'}` : '申请预算在引用概算内，进入PMO审批'} description="预算通过后待PMO确认基线；项目变更审批通过直接追加基线。驳回保留当前生效版本。历史概算、已发生与滚动成本不会因预算审批被改写。" />
    <Table rowKey="subjectId" size="small" pagination={false} dataSource={approval.budget.items} columns={[
      { title: '成本科目', dataIndex: 'subjectName' }, { title: '引用概算（万元）', render: (_, r) => <MoneyText value={approval.estimate.items.find((i) => i.subjectId === r.subjectId)?.amount} /> },
      { title: '原预算（万元）', render: (_, r) => <MoneyText value={data.budgets.find((b) => b.projectId === project.id && b.version === approval.baseline.version)?.items.find((i) => i.subjectId === r.subjectId)?.amount} /> },
      { title: '申请预算（万元）', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> },
    ]} />
    <Card size="small" title="审批记录" style={{ marginTop: 16 }}><Timeline items={[
      { children: `${original?.createdAt ?? approval.budget.createdAt} · 财务汇总提交 · ${approval.submittedBy}` },
      { children: `${approval.requiredRole === 'executive' ? '集团领导' : 'PMO'} · ${approval.status} · ${approval.opinion ?? '等待审批意见'}` },
    ]} /></Card>
    {approval.status === '待审批' && <Card size="small" title="审批意见" style={{ marginTop: 16 }}><Input.TextArea aria-label="审批意见" value={opinion} onChange={(e) => setOpinion(e.target.value)} rows={3} maxLength={500} disabled={!permitted} /><Space style={{ marginTop: 12 }}><Button type="primary" disabled={!permitted} onClick={() => opinion.trim() ? setDecision(true) : message.error('请填写审批意见')}>{approval.kind === 'change' ? '通过并生效' : '通过，待基线确认'}</Button><Button danger disabled={!permitted} onClick={() => opinion.trim() ? setDecision(false) : message.error('请填写整改或否决意见')}>驳回整改</Button>{!permitted && <span>当前角色只读；审批由指定节点处理。</span>}</Space></Card>}
    {approval.status === '通过' && approval.kind === 'budget' && <Card style={{marginTop:16}} title="PMO基线确认"><Alert type={approval.baselineConfirmedAt?'success':'info'} message={approval.baselineConfirmedAt ? `基线已于${approval.baselineConfirmedAt}由${approval.baselineConfirmedBy}确认` : '预算审批已通过，原预算仍有效；确认完整快照后正式生效。'} /><p>范围：{approval.baseline.snapshot?.scope}</p><p>WBS {approval.baseline.snapshot?.tasks.length ?? 0} 项 · 里程碑 {approval.baseline.snapshot?.milestones.length ?? 0} 项 · 团队资源 {approval.baseline.snapshot?.resources.length ?? 0} 人</p><Button type="primary" disabled={currentRole!=='pmo'||!!approval.baselineConfirmedAt} onClick={()=>modal.confirm({title:'确认完整基线正式生效',content:'确认后追加基线版本并冻结计划，历史版本保留。',onOk:()=>{try{dispatch({type:'confirm-budget-baseline',approvalId:approval.id},{id:currentUser.id,name:currentUser.name,role:currentRole});message.success('基线已正式生效');}catch(error){message.error((error as Error).message);return Promise.reject(error);}}})}>确认基线生效</Button></Card>}
    <Modal title={decision ? approval.kind === 'change' ? '确认通过并追加新基线' : '确认通过，等待PMO基线确认' : '确认驳回，保留原基线'} open={decision !== undefined} onCancel={() => setDecision(undefined)} onOk={() => {
      try { dispatch({ type: 'review', approvalId: approval.id, approve: decision!, opinion }, { id: currentUser.id, name: currentUser.name, role: currentRole }); setDecision(undefined); message.success('审批已记录，原事项状态已更新'); } catch (error) { message.error((error as Error).message); }
    }}><p>{project.name}</p><p>申请预算：<MoneyText value={approval.budget.totalAmount} /> 万元</p><p>审批意见：{opinion}</p></Modal>
  </>;
}
