import { useState } from 'react';
import { Alert, App, Button, Col, Input, InputNumber, Row, Select, Space, Table, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewInitiation, riskScore } from '@/mock/initiation';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { mockUsers } from '@/mock';
import type { InitiationRisk } from '@/models/initiation';
import { StateView } from '@/components/common/StateView';
import { PageSection } from '@/components/common/PageSection';
import { InitiationHeader, SourceSummary, useInitiationNavigation, useInitiationText } from './InitiationShared';

export function InitiationRiskPage() {
  const { canDo } = useActionAccess(); const { id } = useParams(); const { data, dispatch } = useBusinessStore(); const actor = useAppStore((s) => s.currentUser);
  const app = data.initiations.find((a) => a.id === id); const round = app?.rounds.at(-1); const text = useInitiationText();
  const [risks, setRisks] = useState<InitiationRisk[]>(structuredClone(round?.risks ?? []));
  const [level, setLevel] = useState<'低' | '中' | '高'>(round?.riskLevel ?? riskScore(risks)); const [explanation, setExplanation] = useState(round?.riskExplanation ?? '');
  const { message } = App.useApp(); const { go } = useInitiationNavigation();
  if (!app) return <StateView type="404" />; if (!canViewInitiation(data, app, actor)) return <StateView type="403" />;
  if (!round) return <><InitiationHeader app={app} title="综合风险报告" /><Alert message="请先提交立项申请" /></>;
  const editable = canDo('assess-initiation-risk', app.id) && actor.role === 'pmo' && ['待风险评估', '待分级'].includes(round.status);
  const patch = (id: string, value: Partial<InitiationRisk>) => setRisks((rows) => rows.map((r) => r.id === id ? { ...r, ...value } : r));
  const save = () => { try { if (!editable) throw new Error('当前策略不允许风险评估'); dispatch({ type: 'assess-initiation-risk', id: app.id, risks, level, explanation }, actor); message.success('风险报告已确认'); go(`/initiation/${app.id}/decision`); } catch (e) { message.error((e as Error).message); } };
  const scoreColor = (score: number) => score >= 16 ? 'red' : score >= 9 ? 'gold' : 'green';
  return <>
    <InitiationHeader app={app} title="综合风险报告" />
    <Row gutter={16}><Col span={11}>
      <PageSection title="风险分布矩阵" description={`共 ${risks.length} 项 · 最高单项等级 ${riskScore(risks)}`}>
        <div style={{ display: 'flex', gap: 8 }}><span style={{ writingMode: 'vertical-rl', color: '#64748b', paddingTop: 20 }}>概率：高 → 低</span><div style={{ flex: 1 }}>
          <div aria-label="概率影响风险矩阵" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
            {[5, 4, 3, 2, 1].flatMap((probability) => [1, 2, 3, 4, 5].map((impact) => <div key={`${probability}-${impact}`} aria-label={`概率${probability}影响${impact}`} style={{ background: probability * impact >= 16 ? '#fff1f0' : probability * impact >= 9 ? '#fffbe6' : '#f0fdf4', padding: '7px 4px', border: '1px solid #e2e8f0', borderRadius: 4, textAlign: 'center' }}><div style={{ color: '#64748b', fontSize: 12 }}>{probability} × {impact}</div><strong>{risks.filter((r) => r.probability === probability && r.impact === impact).length}</strong><span style={{ fontSize: 12 }}> 项</span></div>))}
          </div><div style={{ textAlign: 'center', marginTop: 8, color: '#64748b', fontSize: 12 }}>影响：低 → 高</div>
        </div></div>
        <Space wrap style={{ marginTop: 12 }}><Tag color="green">低 1–8</Tag><Tag color="gold">中 9–15</Tag><Tag color="red">高 16–25</Tag></Space>
      </PageSection>
    </Col><Col span={13}>
      <PageSection title="综合风险结论" description={editable ? '结合来源风险确认等级，填写本轮判断依据' : '当前角色或阶段只读，保留已确认报告'}>
        <Alert showIcon type="info" message={`矩阵最高等级：${riskScore(risks)}；综合判断不可低于最高单项等级。`} />
        <Space style={{ margin: '16px 0' }}><label htmlFor="initiation-risk-level">综合等级</label><Select id="initiation-risk-level" aria-label="综合风险等级" disabled={!editable} value={level} onChange={setLevel} options={['低', '中', '高'].map((value) => ({ value, label: value }))} /></Space>
        <label htmlFor="initiation-risk-explanation" style={{ display: 'block', marginBottom: 8 }}>综合判断与人工调整依据</label>
        <Input.TextArea id="initiation-risk-explanation" aria-label="综合判断与人工调整依据" disabled={!editable || text(explanation) !== explanation} rows={4} value={text(explanation)} onChange={(e) => setExplanation(e.target.value)} />
        <Button style={{ marginTop: 16 }} type="primary" disabled={!editable} onClick={save}>确认报告并进入项目分级</Button>
      </PageSection>
    </Col></Row>
    <PageSection title="风险清单与责任措施" description="保留所有上游风险来源；逐项确认概率、影响、责任人与应对措施" extra={<Button disabled={!editable} onClick={() => setRisks([...risks, { id: `MANUAL-${risks.length + 1}`, domain: '交付', description: '', sourceId: app.id, sourceRoute: `/initiation/apply?id=${app.id}`, probability: 2, impact: 3, mitigation: '', ownerId: '' }])}>补充风险</Button>}>
      <Table rowKey="id" scroll={{ x: 1200 }} pagination={false} dataSource={risks} columns={[
        { title: '领域', dataIndex: 'domain', width: 110, render: (value, r) => <Select aria-label={`${r.id}风险领域`} disabled={!editable} value={value} onChange={(domain) => patch(r.id, { domain })} options={['商务', '技术', '交付', '财务', '法务'].map((value) => ({ value, label: value }))} /> },
        { title: '风险及来源', width: 270, render: (_, r) => <><Input.TextArea aria-label={`${r.id}风险说明`} disabled={!editable || text(r.description) !== r.description} value={text(r.description)} onChange={(e) => patch(r.id, { description: e.target.value })} /><Button type="link" style={{ paddingLeft: 0 }} onClick={() => go(r.sourceRoute)}>{r.sourceId}</Button></> },
        { title: '概率', width: 80, render: (_, r) => <InputNumber aria-label={`${r.id}概率`} style={{ width: 64 }} disabled={!editable} min={1} max={5} value={r.probability} onChange={(value) => patch(r.id, { probability: value ?? 1 })} /> },
        { title: '影响', width: 80, render: (_, r) => <InputNumber aria-label={`${r.id}影响`} style={{ width: 64 }} disabled={!editable} min={1} max={5} value={r.impact} onChange={(value) => patch(r.id, { impact: value ?? 1 })} /> },
        { title: '评分', width: 90, render: (_, r) => <Tag color={scoreColor(r.probability * r.impact)}>{r.probability * r.impact} · {r.probability * r.impact >= 16 ? '高' : r.probability * r.impact >= 9 ? '中' : '低'}</Tag> },
        { title: '应对措施', width: 300, render: (_, r) => <Input.TextArea aria-label={`${r.id}应对措施`} disabled={!editable || text(r.mitigation) !== r.mitigation} value={text(r.mitigation)} onChange={(e) => patch(r.id, { mitigation: e.target.value })} /> },
        { title: '责任人', width: 160, render: (_, r) => <Select aria-label={`${r.id}责任人`} style={{ width: '100%' }} disabled={!editable} value={r.ownerId || undefined} options={mockUsers.map((u) => ({ value: u.id, label: u.name }))} onChange={(ownerId) => patch(r.id, { ownerId })} /> },
      ]} />
    </PageSection>
    <PageSection title="来源资料"><SourceSummary source={round.source} compact /></PageSection>
  </>;
}
