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

  // 按照业务流转次序构建：高频工作台/驾驶舱 ➔ 四算生命周期①②③④ ➔ 系统配置
  const groups = [
    { key: 'WK', label: '工作台与待办', icon: <AppstoreOutlined /> },
    { key: 'GL', label: '领导经营驾驶舱', icon: <DashboardOutlined /> },
    { key: 'GS', label: '① 商机与概算阶段', icon: <DollarOutlined /> },
    { key: 'YS', label: '② 预算与立项阶段', icon: <ProjectOutlined /> },
    { key: 'HS', label: '③ 核算与执行阶段', icon: <ScheduleOutlined /> },
    { key: 'JS', label: '④ 结算与收尾阶段', icon: <CheckCircleOutlined /> },
    { key: 'CF', label: '系统与规则配置', icon: <SettingOutlined /> },
  ];
  const menuItems = groups.map((group) => {
    const children = PAGE_MANIFEST.filter(
      (page) => page.id.startsWith(group.key) && canAccessPage(data, currentUser, page.id)
    ).map((page) => ({
      key: demoRoute(page.route),
      label: (
        <span className="flex items-center justify-between pr-1">
          <span className="truncate">{page.title}</span>
          <span className="font-mono text-[10px] text-slate-500 opacity-60 ml-1.5 flex-shrink-0">
            {page.id}
          </span>
        </span>
      ),
    }));

    return {
      key: group.key,
      icon: group.icon,
      label: (
        <span className="flex items-center justify-between w-full pr-1">
          <span className="font-medium text-xs tracking-tight">{group.label}</span>
          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded font-mono">
            {children.length}
          </span>
        </span>
      ),
      children,
    };
  }).filter((group) => group.children.length > 0);

  const currentPage = PAGE_MANIFEST.find((p) => {
    if (p.route === location.pathname) return true;
    const pattern = p.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(location.pathname) || /^\/approvals\/[^/]+$/.test(location.pathname);
  });
  const targetId = location.pathname.split('/')[2] ?? '';
  const routeProject = projectForTarget(data, targetId);
  const allowed = (!currentPage || canAccessPage(data, currentUser, currentPage.id)) && (!routeProject || canAccessProject(data, currentUser, routeProject));
  const activeGroup = currentPage?.id.split('-')[0];
  const isWorkspace = !!currentPage && ['WK', 'GL', 'GS', 'YS', 'HS', 'JS', 'CF'].includes(currentPage.id.split('-')[0])
    || /^\/projects\/[^/]+\/plan-requests\/[^/]+$/.test(location.pathname);
  // 手风琴（Accordion）展开：每次只保留最新点击的一个模块，避免纵向无限拉长
  const handleOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => !openGroups.includes(key));
    if (latestOpenKey) {
      setOpenGroups([latestOpenKey]);
    } else {
      setOpenGroups(keys);
    }
  };

  useEffect(() => {
    if (activeGroup) setOpenGroups([activeGroup]);
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
        {/* 顶部 Logo 品牌区 */}
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
            flexShrink: 0,
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

        {/* 中间菜单区：可独立悬浮滚动 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="pms-sider-scroll">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentPage ? demoRoute(currentPage.route) : location.pathname]}
            openKeys={openGroups}
            onOpenChange={handleOpenChange}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, background: '#0f172a' }}
          />
        </div>

        {/* 底部折叠悬浮栏 */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-4 py-3 bg-[#090d16] border-t border-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer select-none transition-colors"
          style={{ flexShrink: 0, height: 44 }}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? (
            <MenuUnfoldOutlined className="mx-auto text-base" />
          ) : (
            <>
              <span className="text-xs text-slate-400 font-medium">收起侧边导航</span>
              <MenuFoldOutlined className="text-sm" />
            </>
          )}
        </div>
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
              <div className="hidden lg:flex items-center gap-2 max-w-[280px] xl:max-w-md">
                <Text
                  strong
                  ellipsis={{ tooltip: currentPage.title }}
                  style={{ fontSize: 14, color: '#1e293b' }}
                >
                  {currentPage.title}
                </Text>
              </div>
            ) : (
              <Text strong style={{ fontSize: 14, color: '#1e293b' }} className="hidden lg:inline-block">
                项目管理全生命周期平台
              </Text>
            )}
          </Space>

          <Space size={16} align="center" className="flex-shrink-0">
            <span className="hidden xl:inline-block text-xs text-slate-400 select-none">
              截至 {asOfDate}
            </span>
            <Space size={6} align="center">
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>角色:</Text>
              <Select
                value={currentRole}
                aria-label="模拟身份"
                onChange={(val) => { setRole(val as UserRole); navigate(ROLE_HOME[val as UserRole]); }}
                style={{ minWidth: 210 }}
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
