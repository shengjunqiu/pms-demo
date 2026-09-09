import React, { useState } from 'react';
import { Layout, Menu, Select, Space, Typography, Tag, Button, Dropdown, Avatar, theme } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, ROLES, UserRole } from '@/store/useAppStore';
import { demoRoute, ROLE_HOME } from '@/routes/navigation';
import { PAGE_MANIFEST } from '@/routes/manifest';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, setRole, currentUser, asOfDate } = useAppStore();
  const { token } = theme.useToken();

  const groups = [
    { key: 'GL', label: '领导经营驾驶舱', icon: <DashboardOutlined /> },
    { key: 'WK', label: '工作台与待办', icon: <AppstoreOutlined /> },
    { key: 'GS', label: '商机与概算阶段', icon: <DollarOutlined /> },
    { key: 'YS', label: '预算与立项阶段', icon: <ProjectOutlined /> },
    { key: 'HS', label: '核算与执行阶段', icon: <ScheduleOutlined /> },
    { key: 'JS', label: '结算与收尾阶段', icon: <CheckCircleOutlined /> },
    { key: 'CF', label: '系统与规则配置', icon: <SettingOutlined /> },
  ];
  const menuItems = groups.filter((group) =>
    group.key !== 'CF' || ['admin', 'pmo', 'finance'].includes(currentRole)
  ).map((group) => ({
    ...group,
    children: PAGE_MANIFEST.filter((page) => page.id.startsWith(group.key)).map((page) => ({
      key: demoRoute(page.route), label: `${page.id} ${page.title}`,
    })),
  }));

  const currentPage = PAGE_MANIFEST.find((p) => {
    if (p.route === location.pathname) return true;
    const pattern = p.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(location.pathname);
  });

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: '#001529',
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            background: '#002140',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#1677ff', marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && <span>企业四算管控平台</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['GL', 'WK']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'all 0.2s', minWidth: 0, overflow: 'hidden' }}>
        <Header
          style={{
            padding: '0 20px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 56,
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
            {currentPage ? (
              <Space size={8}>
                <Tag color="blue">{currentPage.id}</Tag>
                <Text strong style={{ fontSize: 15 }}>{currentPage.title}</Text>
                <Tag color="default">{currentPage.kind}</Tag>
              </Space>
            ) : (
              <Text strong style={{ fontSize: 15 }}>项目管理全生命周期平台</Text>
            )}
          </Space>

          <Space size={16} align="center">
            <Tag color="purple">基准日: {asOfDate}</Tag>
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
                <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                <Text style={{ fontSize: 13 }}>{currentUser.name}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: '16px',
            padding: '20px',
            background: '#fff',
            borderRadius: token.borderRadius,
            minHeight: 'calc(100vh - 88px)',
            overflowX: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
