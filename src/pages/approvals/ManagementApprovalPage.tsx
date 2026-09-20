import { useActionAccess } from '@/hooks/useActionAccess';
import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Input, Modal, Space, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { visibleProjects } from '@/mock/selectors';

export function ManagementApprovalPage() {
  const { canDo } = useActionAccess();
  const { id } = useParams(); const navigate = useNavigate(); const { message } = App.useApp();
  const { data, dispatch } = useBusinessStore(); const { currentRole, currentUser } = useAppStore();
  const [opinion, setOpinion] = useState(''); const [decision, setDecision] = useState<boolean>();
  const approval = data.managementApprovals.find((a) => a.id === id);
  if (!approval) return <StateView type="404" />;
  const project = data.projects.find((p) => p.id === approval.projectId)!;
  if (!['executive','pmo','finance','admin'].includes(currentRole) || !visibleProjects(currentRole, data.projects, data).some((p) => p.id === project.id)) return <StateView type="403" />;
  const risk = data.risks.find((r) => r.id === approval.sourceId);
  const acceptance = data.acceptances.find((a) => a.id === approval.sourceId);
  const settlement = data.settlements.find((s) => s.id === approval.sourceId);
  const permitted = currentRole === 'executive' && approval.status === '待审批' && canDo('review-management',approval.id);
  return <><PageHeader title={`${approval.type}原审批`} description={`${approval.id} · ${project.name} · 演示管理决策`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '原审批' }]} extra={<Button onClick={() => navigate(-1)}>返回来源</Button>} />
    <Descriptions bordered column={2} items={[
      { key: 'source', label: '原业务编号', children: approval.sourceId }, { key: 'status', label: '审批状态', children: <Tag>{approval.status}</Tag> },
      { key: 'node', label: '审批节点', children: '集团领导 / 高管审批' }, { key: 'impact', label: '申请影响（万元）', children: approval.impactAmount ? <MoneyText value={approval.impactAmount} signed /> : '未申请财务金额变更' },
      { key: 'reason', label: '申请方案', span: 2, children: approval.reason },
      { key: 'opinion', label: '决策意见', span: 2, children: approval.opinion ?? '尚未审批' },
    ]} />
    <Card title="关联原业务当前状态" size="small" style={{ margin: '16px 0' }}>
      {risk && <p>{risk.code} · {risk.title} · {risk.level} · {risk.status} · 策略：{risk.strategy} · 责任人：{risk.owner}</p>}
      {acceptance && <p>{acceptance.type} · 第{acceptance.round}轮 · {acceptance.status} · 验收金额 <MoneyText value={acceptance.amount} /> 万元</p>}
      {settlement && <p>{settlement.status} · 结算收入 <MoneyText value={settlement.finalIncome} /> · 结算成本 <MoneyText value={settlement.finalCost} /> · 建设期成本{settlement.isCostLocked ? '已锁定' : '未锁定'}</p>}
      {approval.proposedQuota && <p>提交时额度 <MoneyText value={approval.originalQuota} /> · 当前未签额度 <MoneyText value={project.unsignedLimitQuota} /> → 申请额度 <MoneyText value={approval.proposedQuota} /> 万元；已发生成本 <MoneyText value={project.actualCost} /></p>}
      <Button onClick={() => navigate(`/projects/${project.id}?tab=${risk ? 'risks' : acceptance || settlement ? 'acceptance' : 'overview'}`)}>查看项目原业务</Button>
    </Card>
    <Alert type="info" showIcon message={approval.proposedQuota ? '通过后仅增加未签投入额度，实际成本须另行确认。' : '通过表示同意组织上述协调或复核；风险关闭、客户终验和结算生效仍遵循各自原流程。'} />
    {approval.status === '待审批' && <Card size="small" title="审批意见" style={{ marginTop: 16 }}><Input.TextArea aria-label="审批意见" rows={3} maxLength={500} value={opinion} disabled={!permitted} onChange={(e) => setOpinion(e.target.value)} /><Space style={{ marginTop: 12 }}><Button type="primary" disabled={!permitted} onClick={() => opinion.trim() ? setDecision(true) : message.error('请填写审批意见')}>同意申请</Button><Button danger disabled={!permitted} onClick={() => opinion.trim() ? setDecision(false) : message.error('请填写审批意见')}>驳回申请</Button>{!permitted && <span>当前角色只读；须集团领导审批。</span>}</Space></Card>}
    <Modal title={decision ? '确认同意申请' : '确认驳回申请'} open={decision !== undefined} okButtonProps={{disabled:!permitted}} onCancel={() => setDecision(undefined)} onOk={() => {
      if(!permitted || !canDo('review-management',approval.id)) return;
      try { dispatch({ type: 'review-management', id: approval.id, approve: decision!, opinion }, { id: currentUser.id, name: currentUser.name, role: currentRole }); setDecision(undefined); message.success('审批已记录，待决策事项已联动'); } catch (error) { message.error((error as Error).message); }
    }}><p>{approval.reason}</p><p>审批意见：{opinion}</p></Modal>
  </>;
}
