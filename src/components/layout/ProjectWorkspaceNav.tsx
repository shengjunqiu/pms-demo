import { ApartmentOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Menu, Select, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { canAccessPage, canAccessProject } from '@/mock/configuration-access';
import { useBusinessStore } from '@/mock/business';
import { PAGE_MANIFEST, PAGE_MAP } from '@/routes/manifest';
import { useAppStore } from '@/store/useAppStore';

const PROJECT_NAV_GROUPS = [
  {
    key: 'planning',
    label: '立项预算',
    pageIds: ['YS-05', 'YS-06', 'YS-07', 'YS-08', 'YS-09', 'YS-10', 'YS-11', 'YS-12', 'YS-15'],
  },
  {
    key: 'execution',
    label: '执行核算',
    pageIds: ['HS-02', 'HS-03', 'HS-04', 'HS-09', 'HS-10', 'HS-11', 'HS-12', 'HS-13', 'HS-16', 'HS-17'],
  },
  {
    key: 'settlement',
    label: '验收结算',
    pageIds: ['JS-01', 'JS-02', 'JS-03', 'JS-04', 'JS-05', 'JS-06', 'JS-07', 'JS-08', 'JS-09', 'JS-10', 'JS-11', 'JS-13'],
  },
] as const;

const PROJECT_LEDGER_LINKS = [
  { pageId: 'HS-05', label: '需求BUG' },
  { pageId: 'HS-07', label: '问题风险' },
  { pageId: 'HS-14', label: '项目变更' },
] as const;

function matchPage(pathname: string) {
  return PAGE_MANIFEST.find((page) => {
    const pattern = page.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(pathname);
  });
}

export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useBusinessStore();
  const currentUser = useAppStore((state) => state.currentUser);
  const project = data.projects.find((item) => item.id === projectId);

  if (!project || !canAccessProject(data, currentUser, project)) return null;

  const availableProjects = data.projects.filter((item) => canAccessProject(data, currentUser, item));
  const currentPage = matchPage(location.pathname);
  const selectedKey = currentPage?.id;

  const projectPageItem = (pageId: string) => {
    const page = PAGE_MAP.get(pageId);
    if (!page || !canAccessPage(data, currentUser, pageId)) return null;
    return { key: pageId, label: page.title };
  };

  const overviewItem = projectPageItem('HS-01');
  const items: MenuProps['items'] = [
    overviewItem ? { ...overviewItem, label: '项目总览' } : null,
    ...PROJECT_NAV_GROUPS.map((group) => {
      const children = group.pageIds.map(projectPageItem).filter(Boolean) as NonNullable<MenuProps['items']>;
      return children.length ? { key: group.key, label: group.label, children } : null;
    }),
    {
      key: 'collaboration',
      label: '协作台账',
      children: PROJECT_LEDGER_LINKS
        .filter((item) => canAccessPage(data, currentUser, item.pageId))
        .map((item) => ({ key: item.pageId, label: item.label })),
    },
  ].filter(Boolean) as MenuProps['items'];

  const openPage = (pageId: string) => {
    const ledger = PROJECT_LEDGER_LINKS.find((item) => item.pageId === pageId);
    if (ledger) {
      const route = PAGE_MAP.get(pageId)?.route;
      if (route) navigate(`${route}?projectId=${project.id}`);
      return;
    }

    const route = PAGE_MAP.get(pageId)?.route;
    if (route) navigate(route.replace(':id', project.id));
  };

  return (
    <div
      className="border-b border-slate-200 bg-white shadow-2xs"
      style={{ position: 'sticky', top: 64, zIndex: 90 }}
      aria-label="项目工作区导航"
    >
      <div className="flex min-h-14 items-center gap-4 px-5">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/projects')}
        >
          项目台账
        </Button>
        <div className="h-6 w-px bg-slate-200" />
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
          style={{ width: 260 }}
          popupMatchSelectWidth={360}
          suffixIcon={<ApartmentOutlined />}
        />
        <Menu
          mode="horizontal"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onClick={({ key }) => openPage(key)}
          className="min-w-0 flex-1 border-b-0"
          style={{ lineHeight: '55px' }}
        />
      </div>
    </div>
  );
}
