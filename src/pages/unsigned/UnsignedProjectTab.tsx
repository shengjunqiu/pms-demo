import { useState } from 'react';
import { Alert, App, Button, Card, Col, DatePicker, Descriptions, Input, InputNumber, Row, Select, Space, Switch, Table, Tabs, Tag, Timeline, Upload } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { useActionAccess } from '@/hooks/useActionAccess';
import { useBusinessAction } from '@/hooks/useBusinessAction';
import { ReviewManagementConfirm } from '@/components/common/ReviewManagementConfirm';
import { MoneyText } from '@/components/common/MoneyText';
import { AS_OF_DATE } from '@/mock';
import { canManageUnsigned, unsignedSummary, type ContractRegistration } from '@/mock/unsigned';

/**
 * Reusable unsigned project tab component for embedding in ProjectOverviewPage.
 * Contains all unsigned project management features: follow-ups, costs, investment,
 * contract confirmation, and exit review.
 */
export function UnsignedProjectTab({ projectId }: { projectId: string }) {
  const { canDo } = useActionAccess();
  const run = useBusinessAction();
  const { data, dispatch } = useBusinessStore();
  const actor = useAppStore(s => s.currentUser);
  const go = useNavigate();
  const { message, modal } = App.useApp();
  const p = data.projects.find(p => p.id === projectId);
  const [progress, setProgress] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [expectedSignDate, setExpectedSignDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [necessity, setNecessity] = useState('');
  const [risk, setRisk] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [opinion, setOpinion] = useState('');
  const [contractId, setContractId] = useState<string>();
  const [source, setSource] = useState('');
  const [registration, setRegistration] = useState<ContractRegistration>({ code: '', name: '', amount: 0, signDate: AS_OF_DATE, acceptanceDueDate: '', source: '', attachment: '', receiptPlans: [] });
  const [registerNew, setRegisterNew] = useState(true);
  const [exit, setExit] = useState({ reason: '', resources: '', recoverableAssets: '', responsibility: '', recommendation: '', terminated: true, reactivationPossible: false });
  const [reviewConfirm, setReviewConfirm] = useState<{ id: string; approve: boolean }>();

  if (!p) return <Alert type="error" message="项目不存在" />;
  const manage = canManageUnsigned(data, p, actor);
  const s = unsignedSummary(data, p);
  const control = s.control;
  const writable = p.isUnsigned && !control.exit?.terminated;
  const approvals = data.managementApprovals.filter(a => a.projectId === p.id && a.type === '未签额外投入');
  const confirmAction = (title: string, fn: () => void, allowed: () => boolean) => modal.confirm({ title, content: '请核对原始业务依据，提交后保留办理记录。', onOk: () => { try { if (!allowed()) throw new Error('当前策略不允许此操作'); fn(); message.success('办理已记录'); } catch (e) { message.error((e as Error).message); return; } } });
  const pendingReview = reviewConfirm ? data.managementApprovals.find(a => a.id === reviewConfirm.id) : undefined;

  const summaryItems = [
    { key: 'state', label: '合同状态', children: p.isUnsigned ? <Tag color="orange">未签</Tag> : <Tag color="green">已签转换</Tag> },
    { key: 'amount', label: '拟签/立项金额', children: <MoneyText value={control.initiatedAmount} /> },
    { key: 'contract', label: '实际已签金额', children: <MoneyText value={p.contractAmount} /> },
    { key: 'date', label: '立项日期', children: control.initiatedAt },
    { key: 'sign', label: '授权签约日', children: control.expectedSignDate },
    { key: 'valid', label: '投入有效期', children: control.validUntil },
    { key: 'quota', label: '批准额度', children: <MoneyText value={s.quota} /> },
    { key: 'cost', label: '已发生成本', children: <MoneyText value={p.actualCost} /> },
    { key: 'exposure', label: '含承诺/待审敞口', children: <MoneyText value={s.exposure} /> },
    { key: 'available', label: '可用额度余额', children: <MoneyText value={s.available} /> },
    { key: 'overrun', label: '超限金额', children: <MoneyText value={s.overrun} /> },
  ];

  const tabItems = [
    {
      key: 'follow',
      label: '签约进展',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="更新签约进展">
              <div style={{ marginBottom: 8 }}>客户进展与阻碍</div>
              <Input.TextArea aria-label="客户进展与阻碍" disabled={!manage || !writable || !canDo('follow-unsigned', p.id)} rows={3} placeholder="客户审批、合同谈判、阻碍与当前证据" value={progress} onChange={e => setProgress(e.target.value)} />
              <div style={{ marginTop: 12 }}>下一步动作与责任</div>
              <Input.TextArea aria-label="下一步动作与责任" disabled={!manage || !writable || !canDo('follow-unsigned', p.id)} style={{ margin: '12px 0' }} rows={2} placeholder="下一步动作、责任与计划" value={nextAction} onChange={e => setNextAction(e.target.value)} />
              <Space wrap>
                <DatePicker disabled={!manage || !writable || !canDo('follow-unsigned', p.id)} aria-label="最新预计签约日" placeholder="最新预计签约日" value={expectedSignDate ? dayjs(expectedSignDate) : null} onChange={v => setExpectedSignDate(v?.format('YYYY-MM-DD') ?? '')} />
                <Button disabled={!manage || !writable || !canDo('follow-unsigned', p.id)} type="primary" onClick={() => run(() => dispatch({ type: 'follow-unsigned', projectId: p.id, progress, nextAction, expectedSignDate }, actor))}>保存签约进展</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="跟进历史">
              <Timeline items={control.followups.map(f => ({ children: <><b>{f.date} · {f.by}</b><p>{f.progress}</p><p>{f.nextAction} · 最新签约计划 {f.expectedSignDate}</p></> }))} />
              {!control.followups.length && <p>尚无新登记进展</p>}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'cost',
      label: '投入与沉没成本',
      children: (
        <Card title="实际成本来源">
          <Descriptions items={[
            { key: 'a', label: '已发生', children: <MoneyText value={p.actualCost} /> },
            { key: 'c', label: '未发生承诺', children: <MoneyText value={p.committedCost} /> },
            { key: 'pending', label: '待审未计承诺', children: <MoneyText value={s.pendingCost} /> },
          ]} />
          <Alert showIcon message="沉没成本复盘以已发生流水为依据，承诺和待审单独列示；前期投入已继承到项目的流水只计一次。" />
          <Table rowKey="id" style={{ marginTop: 16 }} dataSource={s.costs} pagination={{ pageSize: 8 }} columns={[
            { title: '成本凭证', dataIndex: 'id' },
            { title: '唯一来源', dataIndex: 'sourceId' },
            { title: '科目', dataIndex: 'subjectName' },
            { title: '日期', dataIndex: 'occurredDate' },
            { title: '实际金额', align: 'right', dataIndex: 'amount', render: v => <MoneyText value={v} /> },
            { title: '说明', dataIndex: 'description' },
          ]} />
          <Button onClick={() => go(`/projects/${p.id}/dynamic-accounting`)}>查看动态核算原始流水</Button>
        </Card>
      ),
    },
    {
      key: 'investment',
      label: '额外投入申请',
      children: (
        <>
          <Card title="追加额度与有效期">
            <p style={{ color: '#64748b', marginTop: 0 }}>先核对原授权，再填写申请期限与业务依据。</p>
            <Alert showIcon message="申请不直接改变额度。领导批准后才释放，多个待审申请不重复占用或累计释放。" />
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}><p>追加额度（万元）</p><InputNumber aria-label="追加额度（万元）" min={0.000001} disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={amount} onChange={v => setAmount(v ?? 0)} style={{ width: '100%' }} /></Col>
              <Col span={8}><p>申请有效期至</p><DatePicker aria-label="申请有效期至" disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={validUntil ? dayjs(validUntil) : null} onChange={v => setValidUntil(v?.format('YYYY-MM-DD') ?? '')} /></Col>
              <Col span={8}><p>申请签约日期</p><DatePicker aria-label="申请签约日期" disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={expectedSignDate ? dayjs(expectedSignDate) : null} onChange={v => setExpectedSignDate(v?.format('YYYY-MM-DD') ?? '')} /></Col>
            </Row>
            <h3 style={{ fontSize: 14, marginTop: 24 }}>申请依据与风险</h3>
            <p>签约进展</p><Input.TextArea aria-label="签约进展" disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={progress} onChange={e => setProgress(e.target.value)} />
            <p>投入必要性</p><Input.TextArea aria-label="投入必要性" disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={necessity} onChange={e => setNecessity(e.target.value)} />
            <p>风险与退出措施</p><Input.TextArea aria-label="风险与退出措施" disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} value={risk} onChange={e => setRisk(e.target.value)} />
            <Upload disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} beforeUpload={() => false} onChange={e => setAttachments(e.fileList.map(f => f.name))}><Button style={{ margin: '12px 0' }}>选择申请依据附件</Button></Upload>
            <div><Button disabled={!manage || !writable || !canDo('request-unsigned-investment', p.id)} type="primary" onClick={() => confirmAction('提交追加投入申请？', () => dispatch({ type: 'request-unsigned-investment', projectId: p.id, amount, validUntil, expectedSignDate, signProgress: progress, necessity, risk, attachments }, actor), () => canDo('request-unsigned-investment', p.id))}>提交追加投入申请</Button></div>
          </Card>
          <Card title="追加投入审批记录" style={{ marginTop: 16 }}>
            <Table rowKey="id" pagination={false} dataSource={approvals} expandable={{
              expandedRowRender: a => {
                const r = data.unsignedInvestmentRequests.find(req => req.approvalId === a.id);
                return r ? <Descriptions column={2} items={[
                  { key: 'date', label: '有效期快照', children: `${r.originalValidUntil} → ${r.proposedValidUntil}` },
                  { key: 'sign', label: '申请签约日', children: r.sourceSnapshot.expectedSignDate },
                  { key: 'progress', label: '进展', children: r.signProgress },
                  { key: 'risk', label: '风险', children: r.risk },
                  { key: 'cost', label: '提交时敞口', children: `A ${r.sourceSnapshot.actualCost} / C ${r.sourceSnapshot.committedCost} / 待审 ${r.sourceSnapshot.pendingCost}` },
                  { key: 'files', label: '附件', children: r.attachments.join('、') },
                ]} /> : <Alert message="原审批只登记额度，未提供新的有效期；批准额度不会自动延长授权。" />;
              },
            }} columns={[
              { title: '审批号', dataIndex: 'id' },
              { title: '状态', dataIndex: 'status' },
              { title: '原额度（万元）', align: 'right', dataIndex: 'originalQuota', render: v => <MoneyText value={v} /> },
              { title: '申请额度（万元）', align: 'right', dataIndex: 'proposedQuota', render: v => <MoneyText value={v} /> },
              { title: '意见', dataIndex: 'opinion' },
              { title: '办理', render: (_, a) => <Space>
                <Button type="link" onClick={() => go(`/management-approvals/${a.id}`)}>原审批</Button>
                {actor.role === 'executive' && a.status === '待审批' && <>
                  <Button disabled={!canDo('review-management', a.id)} onClick={() => setReviewConfirm({ id: a.id, approve: true })}>批准</Button>
                  <Button danger disabled={!canDo('review-management', a.id)} onClick={() => setReviewConfirm({ id: a.id, approve: false })}>驳回</Button>
                </>}
              </Space>},
            ]} />
            {actor.role === 'executive' && <Input.TextArea disabled={!approvals.some(a => a.status === '待审批' && canDo('review-management', a.id))} value={opinion} onChange={e => setOpinion(e.target.value)} placeholder="审批意见，批准/驳回前必填" />}
          </Card>
        </>
      ),
    },
    {
      key: 'contract',
      label: '合同签订确认',
      children: (
        <Card title="关联或登记客户合同原单">
          {control.contractConfirmation ? (
            <>
              <Alert type="success" showIcon message={`${control.contractConfirmation.contractId} 已由 ${control.contractConfirmation.by} 于 ${control.contractConfirmation.date} 确认`} description={control.contractConfirmation.source} />
              <Descriptions style={{ marginTop: 16 }} column={2} bordered size="small" items={[
                { key: 'code', label: '合同原单', children: `${control.contractConfirmation.contractSnapshot.code} · ${control.contractConfirmation.contractSnapshot.name}` },
                { key: 'opportunity', label: '来源商机', children: control.contractConfirmation.contractSnapshot.opportunityId ?? p.opportunityId },
                { key: 'project', label: '绑定轨迹', children: `${control.contractConfirmation.priorProjectId || '未绑定'} → ${p.id}` },
                { key: 'amount', label: '合同金额', children: <MoneyText value={control.contractConfirmation.contractSnapshot.amount} /> },
                { key: 'signed', label: '签署日期', children: control.contractConfirmation.contractSnapshot.signDate },
                { key: 'plans', label: '回款计划快照', children: `${control.contractConfirmation.receiptPlanSnapshots.length} 个节点 / ${control.contractConfirmation.receiptPlanSnapshots.reduce((total, plan) => total + plan.amount, 0)} 万元` },
                { key: 'document', label: '签署证据', span: 2, children: control.contractConfirmation.sourceDocument ? `${control.contractConfirmation.sourceDocument.source} · ${control.contractConfirmation.sourceDocument.attachment}` : '关联既有合同原单' },
              ]} />
            </>
          ) : (
            <>
              <Space><span>登记新的模拟原合同</span><Switch checked={registerNew} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} onChange={setRegisterNew} /></Space>
              {registerNew ? (
                <>
                  <Alert style={{ margin: '12px 0' }} showIcon message="演示合同登记：填写签署证据与回款节点，保存后可在合同及回款业务中核对。" />
                  <h3 style={{ fontSize: 14 }}>合同原单信息</h3>
                  <Row gutter={[16, 16]}>
                    {[['code', '合同编号'], ['name', '合同名称'], ['source', '原单来源']].map(([key, label]) => (
                      <Col span={8} key={key}><p>{label}</p><Input aria-label={label} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} value={registration[key as 'code']} onChange={e => setRegistration({ ...registration, [key]: e.target.value })} /></Col>
                    ))}
                  </Row>
                  <Row gutter={[16, 16]}>
                    <Col span={8}><p>已签金额（万元）</p><InputNumber aria-label="已签金额（万元）" disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} min={0.01} value={registration.amount} onChange={v => setRegistration({ ...registration, amount: v ?? 0 })} /></Col>
                    {[['signDate', '签约日期'], ['acceptanceDueDate', '约定验收日期']].map(([key, label]) => (
                      <Col span={8} key={key}><p>{label}</p><DatePicker aria-label={label} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} value={registration[key as 'signDate'] ? dayjs(registration[key as 'signDate']) : null} onChange={v => setRegistration({ ...registration, [key]: v?.format('YYYY-MM-DD') ?? '' })} /></Col>
                    ))}
                  </Row>
                  <Upload maxCount={1} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} beforeUpload={() => false} onChange={e => setRegistration({ ...registration, attachment: e.fileList[0]?.name ?? '' })}><Button style={{ margin: '12px 0' }}>选择签署合同附件</Button></Upload>
                  <h3 style={{ fontSize: 14, marginTop: 24 }}>回款计划</h3>
                  <p style={{ color: '#64748b' }}>节点金额合计须等于合同金额；初始实收为零。</p>
                  {registration.receiptPlans.map((r, i) => (
                    <Space wrap key={i} style={{ display: 'flex', marginBottom: 12 }}>
                      <Input aria-label={`回款节点${i + 1}名称`} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} placeholder="回款节点" value={r.title} onChange={e => setRegistration({ ...registration, receiptPlans: registration.receiptPlans.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
                      <DatePicker aria-label={`回款节点${i + 1}日期`} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} value={r.dueDate ? dayjs(r.dueDate) : null} onChange={v => setRegistration({ ...registration, receiptPlans: registration.receiptPlans.map((x, j) => j === i ? { ...x, dueDate: v?.format('YYYY-MM-DD') ?? '' } : x) })} />
                      <InputNumber aria-label={`回款节点${i + 1}金额`} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} min={0.01} value={r.amount} onChange={v => setRegistration({ ...registration, receiptPlans: registration.receiptPlans.map((x, j) => j === i ? { ...x, amount: v ?? 0 } : x) })} />
                      <Button disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} onClick={() => setRegistration({ ...registration, receiptPlans: registration.receiptPlans.filter((_, j) => i !== j) })}>移除</Button>
                    </Space>
                  ))}
                  <Button disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} onClick={() => setRegistration({ ...registration, receiptPlans: [...registration.receiptPlans, { title: '', dueDate: '', amount: 0 }] })}>新增回款节点</Button>
                </>
              ) : (
                <Select style={{ width: '100%', marginTop: 16 }} disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} value={contractId} onChange={setContractId} placeholder="选择归属本项目或商机的已签原合同" options={data.contracts.filter(c => c.customerId === p.customerId && (c.projectId === p.id || !c.projectId && c.opportunityId === p.opportunityId) && c.status === '已签订').map(c => ({ value: c.id, label: `${c.code} · ${c.amount} 万元` }))} />
              )}
              <p>合同核验确认依据</p>
              <Input.TextArea aria-label="合同核验确认依据" disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} value={source} onChange={e => setSource(e.target.value)} placeholder="核验签署主体、金额、日期及附件的结论" />
              <Button style={{ marginTop: 16 }} type="primary" disabled={!manage || !writable || !canDo('confirm-project-contract', p.id)} onClick={() => confirmAction('确认真实合同已签订？', () => dispatch({ type: 'confirm-project-contract', projectId: p.id, contractId: registerNew ? undefined : contractId, registration: registerNew ? registration : undefined, source }, actor), () => canDo('confirm-project-contract', p.id))}>确认签订并解除未签管控</Button>
            </>
          )}
        </Card>
      ),
    },
    {
      key: 'exit',
      label: '退出与复盘',
      children: (
        <Card title="沉没成本与退出复盘">
          {control.exit ? (
            <>
              <Alert showIcon type="warning" message={`${control.exit.date} · ${control.exit.by} · ${control.exit.terminated ? '终止项目' : '继续跟踪'}`} description={control.exit.reason} />
              <Descriptions style={{ marginTop: 16 }} column={2} items={[
                { key: 'cost', label: '决策时实际成本', children: <MoneyText value={control.exit.actualCost} /> },
                { key: 'resource', label: '投入资源', children: control.exit.resources },
                { key: 'asset', label: '可回收资产', children: control.exit.recoverableAssets },
                { key: 'who', label: '责任分析', children: control.exit.responsibility },
                { key: 'next', label: '后续建议', children: control.exit.recommendation },
                { key: 'reactive', label: '保留再激活可能', children: control.exit.reactivationPossible ? '是' : '否' },
              ]} />
            </>
          ) : (
            <>
              <Alert showIcon message={`当前已发生成本 ${p.actualCost} 万元；退出不清除流水，不将承诺或拟签收入冲入实际成本。`} />
              {[['reason', '未签原因'], ['resources', '已投入资源'], ['recoverableAssets', '可回收资产及处理'], ['responsibility', '责任分析与经验'], ['recommendation', '后续处理建议']].map(([key, label]) => (
                <div key={key}><p>{label}</p><Input.TextArea aria-label={label} disabled={actor.role !== 'pmo' || !writable || !canDo('exit-unsigned', p.id)} value={exit[key as 'reason']} onChange={e => setExit({ ...exit, [key]: e.target.value })} /></div>
              ))}
              <Space style={{ margin: '16px 0' }}>
                <span>彻底终止</span>
                <Switch disabled={actor.role !== 'pmo' || !writable || !canDo('exit-unsigned', p.id)} checked={exit.terminated} onChange={terminated => setExit({ ...exit, terminated })} />
                <span>保留再次激活可能</span>
                <Switch disabled={actor.role !== 'pmo' || !writable || !canDo('exit-unsigned', p.id)} checked={exit.reactivationPossible} onChange={reactivationPossible => setExit({ ...exit, reactivationPossible })} />
              </Space>
              <div><Button danger disabled={actor.role !== 'pmo' || !writable || !canDo('exit-unsigned', p.id)} onClick={() => confirmAction('确认退出复盘结论？', () => dispatch({ type: 'exit-unsigned', projectId: p.id, ...exit }, actor), () => canDo('exit-unsigned', p.id))}>确认退出复盘</Button></div>
            </>
          )}
        </Card>
      ),
    },
  ];

  return (
    <>
      <div className="pms-record-summary">
        <Descriptions bordered size="small" column={3} items={summaryItems} />
      </div>
      <Alert style={{ margin: '16px 0' }} showIcon type={s.flags.length && p.isUnsigned ? 'warning' : 'info'}
        message={p.isUnsigned ? (s.flags.join('；') || '当前未签投入在授权范围内') : '已确认合同，未签限制解除；尚未启动时仍须完成启动检查'}
        description={<details><summary style={{ cursor: 'pointer' }}>投入管控口径与授权规则</summary>{`规则 ${control.ruleVersion}。费用及工时原始凭证形成实际投入，不允许手工覆盖成本；更新跟进不能自动延长投入授权。`}</details>}
      />
      <Tabs defaultActiveKey="follow" items={tabItems} />
      <ReviewManagementConfirm open={!!reviewConfirm} approve={reviewConfirm?.approve === true} approvalId={reviewConfirm?.id ?? ''} opinion={opinion} reason={pendingReview?.reason} onClose={() => setReviewConfirm(undefined)} />
    </>
  );
}