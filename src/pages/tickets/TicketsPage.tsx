import { useState } from 'react';
import { App, Button, Checkbox, Col, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE, mockUsers } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { ticketLabels, ticketMeta, ticketTable, type TicketKind } from '@/mock/tickets';
import { visibleProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useActionAccess } from '@/hooks/useActionAccess';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSection } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';

type Family = 'quality' | 'risk';
const finished = (status: string) => ['已关闭', '已缓解', '已转问题'].includes(status);
const awaiting = (status: string) => ['待验证', '待复测', '已解决'].includes(status);

export function TicketsPage({ family }: { family: Family }) {
  const [params] = useSearchParams();
  // A new project or type is a new creation context; unfinished form inputs never cross it.
  return <TicketsContent key={`${family}-${params.get('projectId') ?? params.get('project') ?? ''}-${params.get('kind') ?? ''}`} family={family} />;
}

function TicketsContent({ family }: { family: Family }) {
  const { canDo } = useActionAccess();
  const { data } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const kinds: TicketKind[] = family === 'quality' ? ['requirement', 'bug'] : ['issue', 'risk'];
  const base = family === 'quality' ? '/requirements-bugs' : '/issues-risks';
  const projectFilter = params.get('projectId') ?? params.get('project');
  const projects = visibleProjects(currentRole, data.projects, data);
  const ids = new Set(projects.map((p) => p.id));
  const eligibleProjects = projects.filter((p) => !data.lockedProjects.includes(p.id) && (family === 'risk' ? p.pmId === currentUser.id : p.pmId === currentUser.id || p.memberIds?.includes(currentUser.id)) && canDo('create-ticket', p.id));
  const writers = family === 'quality' ? ['project-manager', 'solution-tech'] : ['project-manager'];
  const canCreate = writers.includes(currentRole) && canDo('create-ticket');
  const all = kinds.flatMap((kind) => ticketTable(data, kind).filter((t) => ids.has(t.projectId)).map((t) => ({ ...t, kind, meta: ticketMeta(data, kind, t.id), rank: 'priority' in t ? t.priority : 'severity' in t ? t.severity : t.level })));
  const scope = all.filter((t) => (!projectFilter || t.projectId === projectFilter) && (!params.get('status') || t.status === params.get('status')) && (!params.get('owner') || t.meta.ownerId === params.get('owner')) && (!params.get('rank') || t.rank === params.get('rank')) && (!params.get('search') || `${t.id} ${t.title}`.includes(params.get('search')!)) && (params.get('overdue') !== 'true' || !finished(t.status) && t.meta.deadline < AS_OF_DATE));
  const filtered = scope.filter((t) => !params.get('kind') || t.kind === params.get('kind'));
  const auxiliaryCount = ['rank', 'owner', 'overdue'].filter((key) => params.get(key)).length;
  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'projectId') next.delete('project');
    next.delete('page'); setParams(next);
  };
  return <>
    <PageHeader title={family === 'quality' ? '需求与BUG' : '问题与风险'} description={`项目权限范围内的原事项 · 基准日 ${AS_OF_DATE}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '业务台账' }]} extra={<Button type="primary" disabled={!canCreate || !eligibleProjects.length} onClick={() => setCreating(true)}>新建事项</Button>} />
    <PageSection title="筛选事项">
      <Space wrap>
        <Select aria-label="事项项目" placeholder="全部项目" allowClear showSearch optionFilterProp="label" style={{ width: 250 }} value={projectFilter ?? undefined} options={projects.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => update('projectId', v)} />
        <Input aria-label="事项搜索" placeholder="编号或标题" style={{ width: 220 }} value={params.get('search') ?? ''} onChange={(e) => update('search', e.target.value)} />
        <Select aria-label="事项状态" placeholder="全部状态" allowClear style={{ width: 150 }} value={params.get('status') ?? undefined} options={[...new Set(all.map((t) => t.status))].map((value) => ({ value, label: value }))} onChange={(v) => update('status', v)} />
        <Button onClick={() => setParams({})}>重置筛选</Button>
      </Space>
      <details open={auxiliaryCount > 0 || undefined} style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', color: '#475569' }}>等级、责任人与超期 {auxiliaryCount > 0 && `· 已启用 ${auxiliaryCount} 项`}</summary>
        <Space wrap style={{ marginTop: 12 }}>
          <Select aria-label="事项等级" placeholder="优先级 / 等级" allowClear style={{ width: 180 }} value={params.get('rank') ?? undefined} options={[...new Set(all.map((t) => t.rank))].map((value) => ({ value, label: value }))} onChange={(v) => update('rank', v)} />
          <Select aria-label="事项责任人" placeholder="责任人" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} value={params.get('owner') ?? undefined} options={mockUsers.map((u) => ({ value: u.id, label: u.name }))} onChange={(v) => update('owner', v)} />
          <Checkbox checked={params.get('overdue') === 'true'} onChange={(e) => update('overdue', e.target.checked ? 'true' : undefined)}>仅超期未关闭</Checkbox>
        </Space>
      </details>
    </PageSection>
    <PageSection className="pms-record-summary">
      <Row gutter={16}>{[
        { title: '当前筛选事项', value: filtered.length },
        { title: '持续处理中', value: filtered.filter((t) => !finished(t.status) && !awaiting(t.status)).length },
        { title: family === 'quality' ? '待发起人验证' : '待PM确认问题', value: filtered.filter((t) => awaiting(t.status)).length },
        { title: '超期未结束', value: filtered.filter((t) => !finished(t.status) && t.meta.deadline < AS_OF_DATE).length },
      ].map((metric) => <Col span={6} key={metric.title}><MetricStatCard variant="flat" title={metric.title} value={String(metric.value)} unit="项" /></Col>)}</Row>
    </PageSection>
    <PageSection title="事项台账" description={family === 'quality' ? '责任人处理，发起人验证关闭；转办保留发起人。' : '问题由主PM最终关闭；风险发生后转问题，原记录保留。'}>
      <Tabs activeKey={params.get('kind') ?? 'all'} onChange={(key) => update('kind', key === 'all' ? undefined : key)} items={[{ key: 'all', label: `全部事项（${scope.length}）` }, ...kinds.map((kind) => ({ key: kind, label: `${ticketLabels[kind]}（${scope.filter((t) => t.kind === kind).length}）` }))]} />
      <Table rowKey="id" size="small" dataSource={filtered} scroll={{ x: 1280 }} pagination={{ pageSize: 10, current: Number(params.get('page')) || 1, showSizeChanger: false, onChange: (page) => { const next = new URLSearchParams(window.location.search); next.set('page', String(page)); setParams(next); } }} columns={[
        { title: '编号 / 事项', width: 270, fixed: 'left', render: (_, t) => <Button type="link" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'left', display: 'block', height: 'auto', padding: 0 }} onClick={() => navigate(`${base}/${t.id}${window.location.search}`)}><span style={{ fontSize: 12, color: '#64748b' }}>{t.id}</span><div style={{ fontWeight: 600 }}>{t.title}</div></Button> },
        { title: '状态 / 责任人', width: 145, render: (_, t) => <><Tag color={finished(t.status) ? 'green' : awaiting(t.status) ? 'gold' : 'blue'}>{t.status}</Tag><div>{t.owner}</div></> },
        { title: '类型 / 等级', width: 115, render: (_, t) => <>{ticketLabels[t.kind]}<div><Tag color={['致命', '严重', '重大', '特大'].includes(t.rank) ? 'red' : undefined}>{t.rank}</Tag></div></> },
        { title: '目标时间 / 提醒', width: 170, render: (_, t) => <>{t.meta.deadline}<div style={{ color: !finished(t.status) && t.meta.deadline < AS_OF_DATE ? '#b91c1c' : '#64748b' }}>{finished(t.status) ? t.status : t.meta.deadline < AS_OF_DATE ? '已超期，持续督办' : '按目标跟踪'}</div></> },
        { title: '项目', width: 220, render: (_, t) => <><div style={{ fontSize: 12, color: '#64748b' }}>{t.projectId}</div>{projects.find((p) => p.id === t.projectId)?.name}</> },
        { title: family === 'quality' ? '跟踪 / 最新进展' : '升级 / 最新进展', width: 260, render: (_, t) => <><Tag>{t.meta.escalatedTo ?? (t.kind === 'risk' && ['重大', '特大'].includes(t.rank) || t.kind === 'issue' && t.rank === '重大' ? 'PMO' : '项目内跟踪')}</Tag><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{t.meta.history.at(-1)?.detail}</div></> },
      ]} />
    </PageSection>
    <details style={{ color: '#64748b', fontSize: 12 }}><summary style={{ cursor: 'pointer' }}>处理与统计口径</summary><p>摘要取当前全部筛选结果；页签计数沿用项目及其他筛选条件，不含类型筛选。需求按优先级、BUG按严重性跟踪，超期以期望日期计算。</p>{family === 'risk' && <p>演示规则 CASE-1：风险评分=概率×影响，6/12/20分对应中等/重大/特大；重大事项进入PMO视野。问题风险超期1/3/7天依次提示部门负责人/PMO/PMC；已解决问题仍须PM确认。</p>}</details>
    {creating && <NewTicketModal key={`${currentUser.id}-${family}`} family={family} initialKind={kinds.find((k) => k === params.get('kind')) ?? kinds[0]} initialProjectId={eligibleProjects.find((p) => p.id === projectFilter)?.id ?? eligibleProjects[0]?.id} onCancel={() => setCreating(false)} onCreated={(id) => { setCreating(false); navigate(`${base}/${id}${window.location.search}`); }} />}
  </>;
}

function NewTicketModal({ family, initialKind, initialProjectId, onCancel, onCreated }: { family: Family; initialKind: TicketKind; initialProjectId?: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const { canDo } = useActionAccess();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { message } = App.useApp();
  const [kind, setKind] = useState(initialKind);
  const [projectId, setProjectId] = useState(initialProjectId);
  const empty = () => ({ title: '', description: '', category: '', rank: '', owner: currentUser.id, deadline: AS_OF_DATE, product: '', impactBaseline: false, probability: 3, impact: 3, measures: '' });
  const [draft, setDraft] = useState(empty);
  const field = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const kinds: TicketKind[] = family === 'quality' ? ['requirement', 'bug'] : ['issue', 'risk'];
  const writers = family === 'quality' ? ['project-manager', 'solution-tech'] : ['project-manager'];
  const eligible = visibleProjects(currentRole, data.projects, data).filter((p) => !data.lockedProjects.includes(p.id) && (family === 'risk' ? p.pmId === currentUser.id : p.pmId === currentUser.id || p.memberIds?.includes(currentUser.id)) && canDo('create-ticket', p.id));
  const canSubmit = writers.includes(currentRole) && eligible.some((p) => p.id === projectId) && canDo('create-ticket', projectId);
  const ranks = kind === 'requirement' ? ['高', '中', '低'] : kind === 'bug' ? ['致命', '严重', '一般', '轻微'] : ['重大', '重要', '一般'];
  const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 500 };
  return <Modal title={`新建${ticketLabels[kind]}`} width={760} maskClosable={false} styles={{ body: { maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 } }} open okText="提交责任人" okButtonProps={{ disabled: !canSubmit }} onCancel={onCancel} onOk={() => {
    try {
      if (!canSubmit || !projectId) throw new Error('当前策略或项目范围不允许创建事项');
      const prefix = ({ requirement: 'REQ', bug: 'BUG', issue: 'ISSUE', risk: 'RSK' })[kind];
      const id = `${prefix}-NEW-${ticketTable(data, kind).length + 1}`;
      dispatch({ type: 'create-ticket', kind, projectId, title: draft.title, rank: draft.rank, ownerId: draft.owner, description: draft.description, category: draft.category, deadline: draft.deadline, product: draft.product, baselineImpact: draft.impactBaseline, probability: draft.probability, impact: draft.impact, measures: draft.measures }, { id: currentUser.id, name: currentUser.name, role: currentRole });
      onCreated(id); message.success('原事项已提交责任人');
    } catch (error) { message.error((error as Error).message); }
  }}>
    <p style={{ color: '#64748b' }}>先确定事项类型和项目，再填写内容与责任。切换类型或项目会清空本次输入。</p>
    <Row gutter={[16, 16]}>
      <Col span={8}><span style={labelStyle}>事项类型</span><Select aria-label="新建事项类型" style={{ width: '100%' }} value={kind} options={kinds.map((value) => ({ value, label: ticketLabels[value] }))} onChange={(value) => { setKind(value); setDraft(empty()); }} /></Col>
      <Col span={16}><span style={labelStyle}>所属项目</span><Select aria-label="新建事项项目" style={{ width: '100%' }} value={eligible.some((p) => p.id === projectId) ? projectId : undefined} options={eligible.map((p) => ({ value: p.id, label: p.name }))} onChange={(value) => { setProjectId(value); setDraft(empty()); }} /></Col>
      <Col span={24}><label style={labelStyle} htmlFor="ticket-title">事项标题 · 必填</label><Input id="ticket-title" aria-label="事项标题" value={draft.title} onChange={(e) => field('title', e.target.value)} placeholder="简述需要处理的事项" /></Col>
      <Col span={12}><label style={labelStyle} htmlFor="ticket-category">{kind === 'bug' ? '缺陷类别' : '业务类别'} · 必填</label><Input id="ticket-category" aria-label="事项类别" value={draft.category} onChange={(e) => field('category', e.target.value)} placeholder={kind === 'bug' ? '功能 / 性能 / 兼容 / 安全等' : '例如功能优化、交付协调'} /></Col>
      {kind !== 'risk' && <Col span={12}><span style={labelStyle}>{kind === 'requirement' ? '优先级' : '严重程度'} · 必填</span><Select aria-label="新建优先级" style={{ width: '100%' }} placeholder="请选择" value={draft.rank || undefined} options={ranks.map((value) => ({ value, label: value }))} onChange={(value) => field('rank', value)} /></Col>}
      <Col span={24}><label style={labelStyle} htmlFor="ticket-description">事项描述 · 必填</label><Input.TextArea id="ticket-description" aria-label="事项描述" rows={4} value={draft.description} onChange={(e) => field('description', e.target.value)} placeholder={kind === 'bug' ? '复现步骤：\n预期结果与实际表现：\n运行环境与影响范围：' : kind === 'risk' ? '风险来源、触发条件与可能影响' : '背景与范围、期望结果、当前影响'} /></Col>
      <Col span={12}><span style={labelStyle}>处理责任人</span><Select aria-label="新建责任人" style={{ width: '100%' }} value={draft.owner} showSearch optionFilterProp="label" options={mockUsers.map((u) => ({ value: u.id, label: u.name }))} onChange={(value) => field('owner', value)} /></Col>
      <Col span={12}><label style={labelStyle} htmlFor="ticket-deadline">{kind === 'risk' ? '措施期限' : '期望解决日期'}</label><Input id="ticket-deadline" aria-label="期望解决日期" value={draft.deadline} placeholder="YYYY-MM-DD" onChange={(e) => field('deadline', e.target.value)} /></Col>
      {kind === 'requirement' && <><Col span={24}><label style={labelStyle} htmlFor="ticket-product">产品线 / 产品名称</label><Input id="ticket-product" aria-label="产品名称" value={draft.product} onChange={(e) => field('product', e.target.value)} /></Col><Col span={24}><Checkbox checked={draft.impactBaseline} onChange={(e) => field('impactBaseline', e.target.checked)}>影响进度基线，须先关联计划变更</Checkbox></Col></>}
      {kind === 'risk' && <><Col span={12}><label style={labelStyle} htmlFor="ticket-probability">概率评分（1–5）</label><InputNumber id="ticket-probability" aria-label="风险概率" min={1} max={5} value={draft.probability} onChange={(value) => field('probability', value ?? 1)} /></Col><Col span={12}><label style={labelStyle} htmlFor="ticket-impact">影响评分（1–5）</label><InputNumber id="ticket-impact" aria-label="风险影响" min={1} max={5} value={draft.impact} onChange={(value) => field('impact', value ?? 1)} /></Col><Col span={24}><label style={labelStyle} htmlFor="ticket-measures">应对措施 · 必填</label><Input.TextArea id="ticket-measures" aria-label="风险措施" rows={3} value={draft.measures} onChange={(e) => field('measures', e.target.value)} /><p style={{ color: '#64748b', marginBottom: 0 }}>演示规则 CASE-1：概率×影响，6 / 12 / 20分对应中等 / 重大 / 特大。</p></Col></>}
    </Row>
  </Modal>;
}
