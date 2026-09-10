import React, { useEffect, useState } from 'react';
import { useBusinessStore } from '@/mock/business';
import { canAccessPage, canAccessProject, selectAccessPolicy } from '@/mock/configuration-access';
import { projectForTarget } from '@/mock/access';
import { StateView } from '@/components/common/StateView';
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal';
import { Layout, Menu, Select, Space, Typography, Button, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  DollarOutlined,
  SettingOutlined,
  UserOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, ROLES, UserRole } from '@/store/useAppStore';
import { demoRoute, ROLE_HOME } from '@/routes/navigation';
import { PAGE_MANIFEST } from '@/routes/manifest';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setRole, currentUser, asOfDate } = useAppStore();
  const { data, recordAccess } = useBusinessStore();
  const [openGroups, setOpenGroups] = useState<string[]>(['WK']);

  const groups = [
    { key: 'GL', label: '领导经营驾驶舱', icon: <DashboardOutlined /> },
    { key: 'WK', label: '工作台与待办', icon: <AppstoreOutlined /> },
    { key: 'GS', label: '商机与概算阶段', icon: <DollarOutlined /> },
    { key: 'YS', label: '预算与立项阶段', icon: <ProjectOutlined /> },
    { key: 'HS', label: '核算与执行阶段', icon: <ScheduleOutlined /> },
    { key: 'JS', label: '结算与收尾阶段', icon: <CheckCircleOutlined /> },
    { key: 'CF', label: '系统与规则配置', icon: <SettingOutlined /> },
  ];
  const menuItems = groups.map((group) => ({
    ...group,
    children: PAGE_MANIFEST.filter((page) => page.id.startsWith(group.key) && canAccessPage(data, currentUser, page.id)).map((page) => ({
      key: demoRoute(page.route), label: page.title,
    })),
  })).filter((group) => group.children.length > 0);

  const currentPage = PAGE_MANIFEST.find((p) => {
    if (p.route === location.pathname) return true;
    const pattern = p.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(location.pathname) || /^\/approvals\/[^/]+$/.test(location.pathname);
  });
  const targetId = location.pathname.split('/')[2] ?? '';
  const routeProject = projectForTarget(data, targetId);
  const allowed = (!currentPage || canAccessPage(data, currentUser, currentPage.id)) && (!routeProject || canAccessProject(data, currentUser, routeProject));
  const activeGroup = currentPage?.id.split('-')[0];
  const isWorkspace = [
    'WK-01', 'WK-02', 'HS-02', 'HS-03', 'HS-04', 'HS-05', 'HS-06', 'HS-07', 'HS-08', 'HS-09', 'HS-10', 'HS-11', 'HS-12', 'HS-13', 'HS-14', 'HS-15', 'HS-16', 'HS-17', 'GL-01', 'HS-01',
    'GS-01', 'GS-02', 'GS-03', 'GS-04', 'GS-05', 'GS-06', 'GS-07', 'GS-08', 'GS-09', 'GS-10', 'GS-11',
    'GL-02', 'GL-03', 'GL-04', 'GL-05', 'GL-06',
    'YS-01', 'YS-02', 'YS-03', 'YS-04', 'YS-05', 'YS-06', 'YS-07', 'YS-08', 'YS-09', 'YS-10', 'YS-11', 'YS-12', 'YS-13', 'YS-14', 'YS-15',
  ].includes(currentPage?.id ?? '') || /^\/projects\/[^/]+\/plan-requests\/[^/]+$/.test(location.pathname);
  useEffect(() => {
    if (activeGroup) setOpenGroups((keys) => keys.includes(activeGroup) ? keys : [...keys, activeGroup]);
  }, [activeGroup]);
  const policyId = selectAccessPolicy(data, currentRole)?.id;
  useEffect(() => {
    recordAccess(location.pathname + location.search, allowed, currentUser);
  }, [location.pathname, location.search, allowed, policyId, currentUser, recordAccess]);

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          overflow: 'auto',
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
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            background: '#090d16',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
            PMS
          </div>
          {!collapsed && (
            <div className="ml-3 flex flex-col justify-center">
              <span className="leading-none text-slate-100 font-bold text-sm">PMS 平台</span>
              <span className="text-[11px] text-slate-400 font-normal mt-1 leading-none">四算联动全生命周期</span>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage ? demoRoute(currentPage.route) : location.pathname]}
          openKeys={openGroups}
          onOpenChange={setOpenGroups}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, background: '#0f172a' }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 240, transition: 'all 0.2s', minWidth: 0, background: '#f8fafc' }}>
        <Header
          style={{
            padding: '0 20px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
          }}
        >
          <Space size={16} align="center">
            <Button
              type="text"
              aria-label="折叠或展开导航"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 32, height: 32 }}
            />

            {/* Spotlight 风格全局搜索入口 */}
            <button
              type="button"
              aria-label="搜索项目、合同、单据"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:border-blue-400 hover:text-slate-600 cursor-pointer transition-all w-48 sm:w-64 text-xs select-none"
            >
              <SearchOutlined className="text-slate-400" />
              <span className="flex-1 truncate">搜索项目、合同、单据...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-500">
                ⌘K
              </kbd>
            </button>

            {currentPage ? (
              <Space size={8} className="hidden md:inline-flex">
                <Text strong style={{ fontSize: 15 }}>{currentPage.title}</Text>
              </Space>
            ) : (
              <Text strong style={{ fontSize: 15 }} className="hidden md:inline-block">项目管理全生命周期平台</Text>
            )}
          </Space>

          <Space size={16} align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>数据截至 {asOfDate}</Text>
            <Space size={4} align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>角色:</Text>
              <Select
                value={currentRole}
                aria-label="模拟身份"
                onChange={(val) => { setRole(val as UserRole); navigate(ROLE_HOME[val as UserRole]); }}
                style={{ width: 160 }}
                size="small"
                options={ROLES.map((r) => ({
                  value: r.key,
                  label: (
                    <Space size={4}>
                      <UserOutlined />
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

        <Content
          className={isWorkspace ? 'pms-workspace' : 'pms-content'}
          style={{
            margin: '20px',
            padding: isWorkspace ? 0 : '20px',
            background: isWorkspace ? 'transparent' : '#ffffff',
            borderRadius: 12,
            border: isWorkspace ? undefined : '1px solid #e2e8f0',
            minHeight: 'calc(100vh - 96px)',
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
