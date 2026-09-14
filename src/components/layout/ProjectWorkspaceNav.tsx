import { ApartmentOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Dropdown, Select, Space } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { canAccessPage, canAccessProject } from '@/mock/configuration-access';
import { useBusinessStore } from '@/mock/business';
import { PAGE_MAP, type RouteItem } from '@/routes/manifest';
import { useAppStore } from '@/store/useAppStore';

interface NavTab {
  key: string;
  label: string;
  pageIds: string[];
}

const PROJECT_NAV_TABS: NavTab[] = [
  { key: 'overview', label: '项目总览', pageIds: ['HS-01'] },
  { key: 'initiation', label: '立项阶段', pageIds: ['YS-05', 'YS-06', 'YS-07', 'YS-08', 'YS-09', 'YS-10', 'YS-11', 'YS-12', 'YS-15'] },
  { key: 'execution', label: '执行阶段', pageIds: ['HS-02', 'HS-03', 'HS-04', 'HS-09', 'HS-10', 'HS-11', 'HS-12', 'HS-13', 'HS-16', 'HS-17'] },
  { key: 'acceptance', label: '验收结算', pageIds: ['JS-01', 'JS-02', 'JS-03', 'JS-04', 'JS-05', 'JS-06', 'JS-07', 'JS-08', 'JS-09', 'JS-10', 'JS-11', 'JS-13'] },
  { key: 'collaboration', label: '协作台账', pageIds: ['HS-05', 'HS-07', 'HS-14'] },
] as const;

export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useBusinessStore();
  const currentUser = useAppStore((state) => state.currentUser);
  const project = data.projects.find((item) => item.id === projectId);

  if (!project || !canAccessProject(data, currentUser, project)) return null;

  const availableProjects = data.projects.filter((item) => canAccessProject(data, currentUser, item));
  const currentPath = location.pathname;

  const isPageActive = (page: RouteItem | undefined) => {
    if (!page) return false;
    return new RegExp(`^${page.route.replace(/:[a-zA-Z]+/g, '[^/]+')}$`).test(currentPath);
  };

  const navigateTo = (pageId: string) => {
    const page = PAGE_MAP.get(pageId);
    if (!page) return;
    const route = ['HS-05', 'HS-07', 'HS-14'].includes(pageId)
      ? `${page.route}?projectId=${project.id}`
      : page.route.replace(':id', project.id);
    navigate(route);
  };

  return (
    <div
      className="border-b border-slate-200 bg-white shadow-2xs"
      style={{ position: 'sticky', top: 64, zIndex: 90 }}
      aria-label="项目工作区导航"
    >
      <div className="flex items-center gap-2 px-4 py-1.5">
        {/* 左侧：项目台账 + 切换 */}
        <Space size="small">
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
            项目台账
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <Select
            aria-label="切换项目"
            showSearch
            optionFilterProp="label"
            value={project.id}
            onChange={(id) => navigate(`/projects/${id}`)}
            options={availableProjects.map((item) => ({
              value: item.id,
              label: `${item.code} · ${item.name}`,
            }))}
            style={{ width: 210 }}
            popupMatchSelectWidth={360}
            suffixIcon={<ApartmentOutlined />}
          />
        </Space>

        <div className="h-4 w-px bg-slate-200" />

        {/* 阶段导航：紧凑的 Dropdown 按钮组 */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {PROJECT_NAV_TABS.map((tab) => {
            const accessibleChildren = tab.pageIds
              .map((pageId) => ({ pageId, page: PAGE_MAP.get(pageId) }))
              .filter(({ pageId, page }) => page && canAccessPage(data, currentUser, pageId)) as { pageId: string; page: RouteItem }[];
            const isActive = accessibleChildren.some(({ page }) => isPageActive(page));
            const firstChild = accessibleChildren[0];

            if (tab.pageIds.length <= 1 || accessibleChildren.length <= 1) {
              // 单页面 Tab，直接显示为一个按钮
              const active = firstChild && isPageActive(firstChild.page);
              return firstChild ? (
                <Button
                  key={tab.key}
                  type={active ? 'primary' : 'default'}
                  size="small"
                  className={`text-xs font-semibold px-3 py-3.5 rounded-lg border transition-all shadow-none ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-slate-600 border-slate-200 bg-white hover:text-blue-700 hover:border-blue-300'
                  }`}
                  onClick={() => navigateTo(firstChild.pageId)}
                >
                  {tab.label}
                </Button>
              ) : null;
            }

            // 多页面 Tab，用 Dropdown 展示子页面列表
            return (
              <Dropdown
                key={tab.key}
                trigger={['hover']}
                placement="bottom"
                overlayClassName="pms-dropdown-center"
                menu={{
                  items: accessibleChildren.map(({ pageId, page }) => ({
                    key: pageId,
                    label: page.title,
                    onClick: () => navigateTo(pageId),
                  })),
                  selectedKeys: accessibleChildren
                    .filter(({ page }) => isPageActive(page))
                    .map(({ pageId }) => pageId),
                  style: { minWidth: 140 },
                }}
              >
                <Button
                  type={isActive ? 'primary' : 'default'}
                  size="small"
                  className={`text-xs font-semibold px-3 py-3.5 rounded-lg border transition-all shadow-none ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-slate-600 border-slate-200 bg-white hover:text-blue-700 hover:border-blue-300'
                  }`}
                >
                  {tab.label}
                </Button>
              </Dropdown>
            );
          })}
        </div>
      </div>
    </div>
  );
}
