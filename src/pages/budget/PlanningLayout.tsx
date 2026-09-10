import { Alert, Button, Descriptions, Tabs, Tag } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { usePlanning } from './usePlanning';

export function PlanningHeader({ title, context }: { title: string; context: ReturnType<typeof usePlanning> }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { project: p, draft, frozen } = context;
  if (!p) return null;
  const activeKey = pathname.split('/').at(-1);
  return <>
    <PageHeader title={title} description={`${p.name} · ${p.id}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: p.name, href: `/projects/${p.id}` }, { title: title.replace(/^YS-\d+\s*/, '') }]} extra={<Button onClick={() => navigate(-1)}>返回</Button>} />
    <div className="pms-record-summary">
      <Descriptions size="small" column={3} items={[
        { key: 'phase', label: '项目阶段', children: `${p.phase} / ${p.subPhase}` },
        { key: 'pm', label: '项目经理', children: p.pmName },
        { key: 'version', label: '计划版本', children: <Tag color={frozen ? 'blue' : 'orange'}>{frozen ? `${p.currentBaselineVersion} · 已冻结` : `草稿修订 ${draft?.revision} · ${draft?.status}`}</Tag> },
        { key: 'date', label: '批准总周期', children: `${p.plannedStartDate} ~ ${p.plannedEndDate}` },
        { key: 'baseline', label: '生效基线', children: p.currentBaselineVersion },
        { key: 'state', label: '合同', children: p.isUnsigned ? '已立项未签' : '已签订' },
      ]} />
      <Tabs aria-label="计划工作区" activeKey={activeKey} onChange={path => navigate(`/projects/${p.id}/${path}`)} tabBarExtraContent={p.id !== 'P-PLAN-001' ? <Button type="link" onClick={() => navigate('/projects/P-PLAN-001/wbs')}>进入新项目策划</Button> : undefined} items={[
        { key: 'wbs', label: 'WBS计划' }, { key: 'milestones', label: '里程碑计划' }, { key: 'plan-review', label: '计划评审' },
      ]} />
    </div>
    {frozen && <Alert style={{ marginBottom: 16 }} showIcon type="info" message="当前计划已随基线冻结，调整须提交项目变更" description="执行完成率、实际日期由项目进度维护；本页展示计划字段。" action={<Button onClick={() => navigate(`/project-changes/new?projectId=${p.id}`)}>进入项目变更</Button>} />}
  </>;
}
