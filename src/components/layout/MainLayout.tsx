import React, { useEffect, useMemo, useState } from 'react';
import { useBusinessStore } from '@/mock/store';
import { canAccessPage, canAccessProject, selectAccessPolicy } from '@/mock/configuration-access';
import { projectForTarget } from '@/mock/access';
import { StateView } from '@/components/common/StateView';
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal';
import { Layout, Menu, Select, Space, Typography, Dropdown, Avatar, type MenuProps } from 'antd';
import {
  AppstoreOutlined,
  AuditOutlined,
  BulbOutlined,
  DashboardOutlined,
  ProjectOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { buildUserProfile, useAppStore, ROLES, UserRole } from '@/store/useAppStore';
import { ROLE_HOME } from '@/routes/navigation';
import { GLOBAL_NAV, resolveNav, type NavIcon } from '@/routes/nav-config';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { WorkspaceNav } from '@/components/layout/WorkspaceNav';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const NAV_ICONS: Record<NavIcon, React.ReactNode> = {
  workspace: <AppstoreOutlined />,
  presales: <BulbOutlined />,
  initiation: <AuditOutlined />,
  project: <ProjectOutlined />,
  executive: <DashboardOutlined />,
  settings: <SettingOutlined />,
};

const HEADER_HEIGHT = 56;

export const MainLayout: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setRole, currentUser, asOfDate } = useAppStore();
  const { data, recordAccess } = useBusinessStore();

  const nav = resolveNav(location.pathname, location.search, {
    project: (id) => data.projects.find((p) => p.id === id)?.name,
    opportunity: (id) => data.opportunities.find((o) => o.id === id)?.name,
    initiation: (id) => data.initiations.find((i) => i.id === id)?.input.name,
  });

  // 全局菜单只展示无对象上下文也能成立的入口；分区标题不折叠，菜单只有一层。
  const menuItems = useMemo(() => {
    const items: NonNullable<MenuProps['items']> = [];
    GLOBAL_NAV.forEach((section) => {
      const children = section.items
        .filter((item) => item.pageIds.some((pageId) => canAccessPage(data, currentUser, pageId)))
        .map((item) => ({ key: item.key, label: item.label }));
      if (children.length === 0) return;
      items.push({
        key: section.key,
        type: 'group',
        label: (
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none">
            {NAV_ICONS[section.icon]}
            {section.label}
          </span>
        ),
        children,
      });
    });
    return items;
  }, [data, currentUser]);

  const isApprovalsDetail = /^\/approvals\/[^/]+$/.test(location.pathname);
  // /approvals/:id 不属于任何 manifest 页，鉴权交给审批页内角色白名单（BudgetApprovalPage/ManagementApprovalPage）
  const currentPage = isApprovalsDetail ? undefined : PAGE_MANIFEST.find((p) => {
    if (p.route === location.pathname) return true;
    const pattern = p.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(location.pathname);
  });
  const targetId = location.pathname.split('/')[2] ?? '';
  const routeProject = projectForTarget(data, targetId);
  const allowed = (!currentPage || canAccessPage(data, currentUser, currentPage.id)) && (!routeProject || canAccessProject(data, currentUser, routeProject));
  const isWorkspace = !!currentPage && ['WK', 'GL', 'GS', 'YS', 'HS', 'JS', 'CF'].includes(currentPage.id.split('-')[0])
    || isApprovalsDetail
    || nav.context === 'project';
  const workspaceKind = nav.context === 'project' || nav.context === 'opportunity' ? nav.context : undefined;

  // 🔵2 切角色：当前页对新角色可见时原地停留，否则回角色首页，避免丢上下文或落 403
  const handleRoleChange = (val: UserRole) => {
    const nextUser = buildUserProfile(val);
    const canStay = !!currentPage
      && canAccessPage(data, nextUser, currentPage.id)
      && (!routeProject || canAccessProject(data, nextUser, routeProject));
    setRole(val);
    navigate(canStay ? `${location.pathname}${location.search}` : ROLE_HOME[val]);
  };

  const policyId = selectAccessPolicy(data, currentRole)?.id;
  useEffect(() => {
    recordAccess(location.pathname + location.search, allowed, currentUser);
  }, [location.pathname, location.search, allowed, policyId, currentUser, recordAccess]);

  useEffect(() => {
    document.title = nav.title ? `${nav.title} · 项目管理平台` : '项目管理平台';
  }, [nav.title]);

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      <Sider
        trigger={null}
        width={220}
        className="pms-sider"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: '#0f172a',
          borderRight: '1px solid #1e293b',
        }}
      >
        <div
          style={{ height: HEADER_HEIGHT, flexShrink: 0, borderBottom: '1px solid #1e293b', background: '#090d16' }}
          className="flex items-center px-4 cursor-pointer"
          onClick={() => navigate(ROLE_HOME[currentRole])}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">S</div>
          <div className="ml-3 flex flex-col justify-center whitespace-nowrap">
            <span className="leading-none text-slate-100 font-bold text-sm">项目管理平台</span>
            <span className="text-[11px] text-slate-400 mt-1 leading-none">四算联动全生命周期</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="pms-sider-scroll py-1">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={nav.globalKey ? [nav.globalKey] : []}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, background: '#0f172a' }}
          />
        </div>
      </Sider>

      <Layout style={{ marginLeft: 220, minWidth: 0, background: '#f8fafc' }}>
        <Header
          style={{
            padding: '0 20px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: HEADER_HEIGHT,
          }}
        >
          <button
            type="button"
            aria-label="搜索项目、合同、单据"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:border-blue-400 hover:text-slate-600 cursor-pointer transition-all w-64 text-xs select-none"
          >
            <SearchOutlined className="text-slate-400" />
            <span className="flex-1 truncate text-left">搜索项目、合同、单据...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-500">⌘K</kbd>
          </button>

          <Space size={16} align="center" className="flex-shrink-0">
            <span className="hidden xl:inline-block text-xs text-slate-400 select-none">截至 {asOfDate}</span>
            <Space size={6} align="center">
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>角色:</Text>
              <Select
                value={currentRole}
                aria-label="模拟身份"
                onChange={handleRoleChange}
                style={{ minWidth: 180 }}
                popupMatchSelectWidth={false}
                options={ROLES.map((r) => ({
                  value: r.key,
                  label: (
                    <Space size={6} align="center">
                      <UserOutlined style={{ color: '#2563eb', fontSize: 12 }} />
                      <span>{r.name}</span>
                    </Space>
                  ),
                }))}
              />
            </Space>

            <Dropdown
              menu={{
                items: [
                  { key: 'dept', label: `所属部门: ${currentUser.department}` },
                  { key: 'role', label: `当前权限: ${currentUser.roleName}` },
                  { type: 'divider' },
                  { key: 'manifest', label: '72页完整清单', onClick: () => navigate('/routes-manifest') },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" style={{ backgroundColor: '#2563eb' }} icon={<UserOutlined />} />
                <Text style={{ fontSize: 13, fontWeight: 500 }}>{currentUser.name}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {allowed && workspaceKind && nav.entityId && <WorkspaceNav kind={workspaceKind} id={nav.entityId} />}

        <Content
          className={isWorkspace ? 'pms-workspace' : 'pms-content'}
          style={{
            margin: '20px',
            padding: isWorkspace ? 0 : '20px',
            background: isWorkspace ? 'transparent' : '#ffffff',
            borderRadius: 12,
            border: isWorkspace ? undefined : '1px solid #e2e8f0',
            minHeight: `calc(100vh - ${HEADER_HEIGHT + 40}px)`,
            overflowX: isWorkspace ? 'visible' : 'auto',
          }}
        >
          {allowed ? <Outlet /> : <StateView type="403" />}
        </Content>
      </Layout>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Layout>
  );
};
