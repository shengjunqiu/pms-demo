import { Alert, Button, Descriptions, Space, Table, Tag, Timeline } from 'antd';
import { useLocation, useNavigate, useSearchParams, type NavigateOptions } from 'react-router-dom';
import type { InitiationApplication, InitiationSource } from '@/models/initiation';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSection } from '@/components/common/PageSection';
import { MoneyText } from '@/components/common/MoneyText';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { canViewSensitiveField } from '@/mock/configuration-access';

// eslint-disable-next-line react-refresh/only-export-components -- Private initiation components share this navigation hook.
export function useInitiationNavigation() {
  const navigate = useNavigate(); const location = useLocation(); const [params] = useSearchParams();
  const requested = params.get('returnTo');
  const reviewUrl = location.pathname === '/initiation/review' ? `${location.pathname}${location.search}`
    : requested && /^\/initiation\/review(?:\?|$)/.test(requested) ? requested : '/initiation/review';
  const go = (path: string, options?: NavigateOptions) => {
    if (path.startsWith('/initiation/') && !path.startsWith('/initiation/review')) {
      const [pathname, search = ''] = path.split('?'); const query = new URLSearchParams(search);
      query.set('returnTo', reviewUrl); navigate(`${pathname}?${query}`, options);
    } else navigate(path, options);
  };
  return { go, reviewUrl };
}

// eslint-disable-next-line react-refresh/only-export-components -- Private initiation components share the same sensitive-text policy.
export function useInitiationText() {
  const data = useBusinessStore((s) => s.data); const actor = useAppStore((s) => s.currentUser);
  const viewMargin = canViewSensitiveField(data, actor, 'margin');
  return (text?: string) => !viewMargin && /毛利|gross.?margin/i.test(text ?? '') ? '毛利字段无查看权限' : text;
}

export function InitiationHeader({ app, title }: { app?: InitiationApplication; title: string }) {
  const { go, reviewUrl } = useInitiationNavigation(); const location = useLocation();
  const steps = app ? [
    { title: '申请资料', path: `/initiation/apply?id=${app.id}`, active: location.pathname === '/initiation/apply' },
    { title: '综合风险报告', path: `/initiation/${app.id}/risk-assessment`, active: location.pathname.endsWith('/risk-assessment') },
    { title: '分级与决策', path: `/initiation/${app.id}/decision`, active: location.pathname.endsWith('/decision') },
  ] : [];
  return <>
    <PageHeader title={title} description={app ? `${app.id} · ${app.input.name} · 修订 ${app.draftRevision}` : '承接已评审方案与冻结概算，建立正式项目'} breadcrumbs={[{ title: '立项评审', href: reviewUrl }, { title }]} extra={<Space wrap><Button onClick={() => go('/initiation/apply')}>新立项申请</Button><Button onClick={() => go(reviewUrl)}>评审工作台</Button></Space>} />
    {app && <PageSection title={app.input.name} extra={<Tag color={app.status === '通过' ? 'success' : app.status === '否决' ? 'error' : 'processing'}>{app.status}</Tag>}>
      <Space wrap size={[24, 8]}><span>申请金额 <MoneyText value={app.input.amount} /> 万元</span><span>当前修订 {app.draftRevision}</span><span>已提交 {app.rounds.length} 轮</span><Button type="link" onClick={() => go(`/opportunities/${app.input.opportunityId}`)}>来源商机</Button><Button type="link" onClick={() => go(`/opportunities/${app.input.opportunityId}/estimate`)}>来源概算</Button></Space>
      <nav aria-label="立项业务导航" style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}><Space wrap>{steps.map((step) => <Button key={step.title} type={step.active ? 'primary' : 'default'} aria-current={step.active ? 'page' : undefined} onClick={() => go(step.path)}>{step.title}</Button>)}{app.projectId && <Button type="primary" onClick={() => go(`/projects/${app.projectId}/team`)}>进入团队任命</Button>}</Space></nav>
    </PageSection>}
  </>;
}

export function SourceSummary({ source, compact = false }: { source: InitiationSource; compact?: boolean }) {
  const { go } = useInitiationNavigation(); const text = useInitiationText();
  const content = <>
    <Descriptions bordered size="small" column={3} items={[
      { key: 'o', label: '来源商机', children: <Button type="link" onClick={() => go(`/opportunities/${source.opportunity.id}`)}>{source.opportunity.id}</Button> },
      { key: 's', label: '已评审方案', children: source.solutionVersionId }, { key: 'r', label: '专家评审', children: source.expertReviewId },
      { key: 'e', label: '冻结概算', children: source.estimate.id }, { key: 'c', label: '概算成本（万元）', children: <MoneyText value={source.estimate.totalCost} /> }, { key: 'early', label: '前期投入（万元）', children: <MoneyText value={source.earlyCostTotal} /> },
    ]} />
    <Alert style={{ margin: '12px 0' }} type="info" showIcon message={`本轮固定上游版本；${source.earlyCostSources.length} 笔具备唯一来源的成本将在通过后继承。历史汇总不补造成本明细。`} />
    <Table size="small" pagination={false} rowKey={(opinion) => `${opinion.dimension}-${opinion.by}`}  dataSource={source.expertOpinions} columns={[{ title: '专家', dataIndex: 'by' }, { title: '维度', dataIndex: 'dimension' }, { title: '结论', dataIndex: 'conclusion' }, { title: '意见', dataIndex: 'opinion', render: (value: string) => text(value) }]} />
  </>;
  return compact ? <details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer', color: '#475569', padding: '8px 0' }}>来源版本与专家意见 · {source.estimate.id} · 前期投入 <MoneyText value={source.earlyCostTotal} /> 万元</summary><div style={{ paddingTop: 12 }}>{content}</div></details> : content;
}

export function InitiationHistory({ app }: { app: InitiationApplication }) {
  const text = useInitiationText();
  return <PageSection title="评审轮次与整改留痕" description="每轮保留提交资料、来源版本、专业签署与决策结果">
    {app.followups?.map((f, i) => <p key={i}>复评恢复 · {f.date} · {f.by} · {text(f.reason)}</p>)}
    {!app.rounds.length ? <span style={{ color: '#64748b' }}>尚未提交评审，保存草稿后可继续补充资料。</span> : <Timeline items={[...app.rounds].reverse().map((r, index) => ({ children: <details open={index === 0}><summary style={{ cursor: 'pointer' }}><b>修订 {r.revision} · {r.status}</b> · {r.submittedAt}</summary><p>{r.submittedBy} · {r.source.estimate.id}</p>{r.approvalProgress && <p>正式路径 {r.approvalProgress.snapshot.ruleVersion} · {r.approvalProgress.reviews.map((v) => `${v.by}（节点${v.node + 1}）：${text(v.opinion)}`).join('；')}</p>}{r.input.rectificationReply && <p>整改回复：{text(r.input.rectificationReply)}</p>}{r.decision && <p>{r.decision.by}：{text(r.decision.opinion)}</p>}{r.decision?.rectifications.map((x, i) => <p key={i}>{text(x.content)} · {x.ownerId} · 截止 {x.deadline}</p>)}</details> }))} />}
  </PageSection>;
}
