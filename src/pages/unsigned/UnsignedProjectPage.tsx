import { Button, Space } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { canViewUnsignedProject } from '@/mock/unsigned';
import { UnsignedProjectTab } from '@/pages/unsigned/UnsignedProjectTab';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';

export function UnsignedProjectPage() {
  const location = useLocation();
  const ledgerReturn = typeof location.state?.ledgerReturn === 'string' && location.state.ledgerReturn.startsWith('/unsigned-projects?')
    ? location.state.ledgerReturn : '/unsigned-projects';
  const { id } = useParams();
  const { data } = useBusinessStore();
  const actor = useAppStore(s => s.currentUser);
  const go = useNavigate();
  const p = data.projects.find(p => p.id === id);
  if (!p) return <StateView type="404" />;
  if (!canViewUnsignedProject(data, p, actor)) return <StateView type="403" />;

  return <>
    <PageHeader title="未签项目详情" description={`${p.id} · ${p.name}`}
      breadcrumbs={[{ title: '未签立项台账', href: ledgerReturn }, { title: p.name }]}
      extra={<Space wrap>
        <Button onClick={() => go(ledgerReturn)}>返回台账</Button>
        <Button onClick={() => go(`/projects/${p.id}`)}>项目原业务</Button>
        <Button type="primary" onClick={() => go(`/projects/${p.id}/start-confirmation`)}>启动条件检查</Button>
      </Space>}
    />
    <UnsignedProjectTab projectId={p.id} />
  </>;
}