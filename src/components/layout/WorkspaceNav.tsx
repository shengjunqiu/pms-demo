import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Select, Tag } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { canAccessPage, canAccessProject } from '@/mock/configuration-access';
import { canViewOpportunity } from '@/mock/opportunities';
import { useBusinessStore } from '@/mock/store';
import { OPPORTUNITY_NAV, PROJECT_NAV, projectNextStep, resolveNav, type WorkspaceNavGroup, type WorkspaceNavPage } from '@/routes/nav-config';
import { useAppStore } from '@/store/useAppStore';

interface Props { kind: 'project' | 'opportunity'; id: string }

const pageHref = (base: string, page: WorkspaceNavPage) => (page.path ? `${base}/${page.path}` : base);

/** 商机/项目工作区导航：对象切换 + 阶段 + 下一步，分组标签 + 组内页面。数据全部来自 nav-config。 */
export function WorkspaceNav({ kind, id }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useBusinessStore();
  const currentUser = useAppStore((state) => state.currentUser);
  const nav = resolveNav(location.pathname, location.search);

  const base = kind === 'project' ? `/projects/${id}` : `/opportunities/${id}`;
  const project = kind === 'project' ? data.projects.find((p) => p.id === id) : undefined;
  const opportunity = kind === 'opportunity' ? data.opportunities.find((o) => o.id === id) : undefined;
  if (kind === 'project' && (!project || !canAccessProject(data, currentUser, project))) return null;
  if (kind === 'opportunity' && (!opportunity || !canViewOpportunity(data, opportunity, currentUser))) return null;

  const visible = (page: WorkspaceNavPage) => page.pageIds.some((pid) => canAccessPage(data, currentUser, pid));
  const groups = (kind === 'project' ? PROJECT_NAV : OPPORTUNITY_NAV)
    .map((group): WorkspaceNavGroup => ({ ...group, pages: group.pages.filter(visible) }))
    .filter((group) => group.pages.length > 0);
  const activeGroup = groups.find((group) => group.key === nav.groupKey);

  const switchOptions = kind === 'project'
    ? data.projects.filter((p) => canAccessProject(data, currentUser, p)).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))
    : data.opportunities.filter((o) => canViewOpportunity(data, o, currentUser)).map((o) => ({ value: o.id, label: `${o.code} · ${o.name}` }));
  // 切换对象时停留在同一页面，便于横向对比
  const switchTo = (nextId: string) => {
    const page = activeGroup?.pages.find((p) => p.key === nav.pageKey);
    const nextBase = kind === 'project' ? `/projects/${nextId}` : `/opportunities/${nextId}`;
    navigate(page ? pageHref(nextBase, page) : nextBase);
  };

  const next = project ? projectNextStep(project.phase, project.subPhase) : undefined;
  const showNext = next && visible(next) && nav.pageKey !== next.key;
  const stage = project ? `${project.phase} · ${project.subPhase}` : opportunity?.status;

  return (
    <div className="pms-workspace-nav border-b border-slate-200 bg-white" style={{ position: 'sticky', top: 56, zIndex: 90 }} aria-label={kind === 'project' ? '项目工作区导航' : '商机工作区导航'}>
      <div className="flex flex-wrap items-center gap-3 px-5 pt-2.5">
        <Select
          aria-label={kind === 'project' ? '切换项目' : '切换商机'}
          showSearch
          optionFilterProp="label"
          value={id}
          onChange={switchTo}
          options={switchOptions}
          variant="borderless"
          className="pms-entity-switch"
          style={{ minWidth: 240, maxWidth: 420, fontWeight: 600 }}
          popupMatchSelectWidth={420}
        />
        {stage && <Tag color="blue" bordered={false}>{stage}</Tag>}
        <div className="flex-1" />
        {showNext && (
          <Button size="small" type="primary" ghost icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => navigate(pageHref(base, next))}>
            下一步：{next.label}
          </Button>
        )}
      </div>
      <nav className="flex items-end gap-1 px-4 mt-1.5" aria-label="工作区分组">
        {groups.map((group) => {
          const active = group.key === activeGroup?.key;
          return (
            <button
              key={group.key}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => navigate(pageHref(base, group.pages[0]))}
              className={`px-3 pb-2 pt-1 text-[13px] border-b-2 transition-colors cursor-pointer bg-transparent ${active ? 'border-blue-600 text-blue-700 font-semibold' : 'border-transparent text-slate-600 hover:text-blue-700'}`}
            >
              {group.label}
            </button>
          );
        })}
      </nav>
      {activeGroup && activeGroup.pages.length > 1 && (
        <nav className="flex flex-wrap items-center gap-1 px-4 py-1.5 bg-slate-50 border-t border-slate-100" aria-label={`${activeGroup.label}页面`}>
          {activeGroup.pages.map((page) => {
            const active = page.key === nav.pageKey;
            return (
              <button
                key={page.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(pageHref(base, page))}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer border-0 ${active ? 'bg-blue-600 text-white font-medium' : 'bg-transparent text-slate-600 hover:bg-white hover:text-blue-700'}`}
              >
                {page.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
