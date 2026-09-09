import React from 'react';
import { Table, Tag, Typography, Space, Input, Select, Card, Button } from 'antd';
import { SearchOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { demoRoute } from '@/routes/navigation';
import { PAGE_MANIFEST, RouteItem } from '@/routes/manifest';
import { PageHeader } from '@/components/common/PageHeader';

const { Text } = Typography;

export const RoutesManifestPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [phaseFilter, setPhaseFilter] = React.useState<number | 'all'>('all');

  const filtered = PAGE_MANIFEST.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.route.toLowerCase().includes(search.toLowerCase()) ||
      item.roles.toLowerCase().includes(search.toLowerCase());
    const matchPhase = phaseFilter === 'all' || item.phase === phaseFilter;
    return matchSearch && matchPhase;
  });

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: '页面名称',
      dataIndex: 'title',
      key: 'title',
      width: 160,
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: '建议路由路径',
      dataIndex: 'route',
      key: 'route',
      width: 200,
      render: (route: string) => <Text code style={{ fontSize: 12 }}>{route}</Text>,
    },
    {
      title: '页面类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 100,
      render: (kind: string) => <Tag>{kind}</Tag>,
    },
    {
      title: '开发阶段',
      dataIndex: 'phase',
      key: 'phase',
      width: 90,
      render: (phase: number) => <Tag color="cyan">Phase {phase}</Tag>,
    },
    {
      title: '主要角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 130,
      render: (roles: string) => <span style={{ fontSize: 12 }}>{roles}</span>,
    },
    {
      title: '核心验收条件',
      dataIndex: 'criteria',
      key: 'criteria',
      render: (criteria: string[]) => (
        <ul style={{ paddingLeft: 14, margin: 0, fontSize: 12, color: '#595959' }}>
          {criteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_value: unknown, record: RouteItem) => {
        const actualUrl = demoRoute(record.route);
        return (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => navigate(actualUrl)}
          >
            访问
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="72页原型路由清单与开发矩阵 (Route Manifest)"
        description="本平台严格遵循任务书与页面清单V1.1规格，包含全部72个业务页面及对应功能映射。"
        extra={<Tag color="green" style={{ fontSize: 13, padding: '4px 8px' }}>全量 72 页已注册</Tag>}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size={16} wrap>
          <Input
            placeholder="搜索页面ID / 标题 / 路由 / 角色"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={phaseFilter}
            onChange={(val) => setPhaseFilter(val)}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: '全部阶段 (72页)' },
              { value: 2, label: 'Phase 2: 经营驾驶舱' },
              { value: 3, label: 'Phase 3: 工作台中心' },
              { value: 4, label: 'Phase 4: 商机与概算' },
              { value: 5, label: 'Phase 5: 预算与立项' },
              { value: 6, label: 'Phase 6: 核算与执行' },
              { value: 7, label: 'Phase 7: 结算与收尾' },
              { value: 8, label: 'Phase 8: 配置与管理' },
            ]}
          />
          <Text type="secondary">当前筛选显示 {filtered.length} / 72 个页面</Text>
        </Space>
      </Card>

      <Table
        scroll={{ x: 1200 }}
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 12, showTotal: (total) => `共 ${total} 个页面` }}
      />
    </div>
  );
};
