import { Alert, Button, Descriptions, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { usePlanning } from './usePlanning';

export function PlanningHeader({ title, context }: { title: string; context: ReturnType<typeof usePlanning> }) {
  const navigate = useNavigate();
  const { project: p, draft, frozen } = context;
  if (!p) return null;
  return <>
    <PageHeader title={title} description={`${p.name} · ${p.id}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: p.name, href: `/projects/${p.id}` }, { title: title.replace(/^YS-\d+\s*/, '') }]} extra={p.id !== 'P-PLAN-001' ? <Button type="link" onClick={() => navigate('/projects/P-PLAN-001/wbs')}>进入新项目策划</Button> : undefined} />
    <div className="pms-record-summary">
      <Descriptions size="small" column={3} items={[
        { key: 'phase', label: '项目阶段', children: `${p.phase} / ${p.subPhase}` },
        { key: 'pm', label: '项目经理', children: p.pmName },
        { key: 'version', label: '计划版本', children: <Tag color={frozen ? 'blue' : 'orange'}>{frozen ? `${p.currentBaselineVersion} · 已冻结` : `草稿修订 ${draft?.revision} · ${draft?.status}`}</Tag> },
        { key: 'date', label: '批准总周期', children: `${p.plannedStartDate} ~ ${p.plannedEndDate}` },
        { key: 'baseline', label: '生效基线', children: p.currentBaselineVersion },
        { key: 'state', label: '合同', children: p.isUnsigned ? '已立项未签' : '已签订' },
      ]} />
    </div>
    {frozen && (
      <div className="mb-4">
        <Alert
          showIcon
          type="info"
          className="rounded-lg border-blue-200/80 bg-blue-50/50"
          message="当前计划已随基线冻结，调整须提交项目变更"
          description="执行完成率、实际日期由项目进度维护；本页展示计划字段。"
          action={<Button type="primary" size="small" onClick={() => navigate(`/projects/${p.id}/changes/new?projectId=${p.id}`)}>进入项目变更</Button>}
        />
      </div>
    )}
  </>;
}
