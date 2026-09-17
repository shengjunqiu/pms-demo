import { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { Project } from '@/models/types';
import { useBusinessStore } from '@/mock/business';
import { canAccessProject } from '@/mock/configuration-access';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader } from '@/components/common/PageHeader';
import { BusinessStageBadge, HealthBadge } from '@/components/common/Badges';
import { MoneyText } from '@/components/common/MoneyText';

const phaseOptions = ['商机', '立项', '执行', '收尾', '运维', '已关闭'].map((value) => ({ value, label: value }));
const healthOptions = [
  { value: 'green', label: '正常' },
  { value: 'yellow', label: '需关注' },
  { value: 'orange', label: '预警' },
  { value: 'red', label: '高风险' },
];

const healthNames: Record<Project['health'], string> = {
  green: '正常',
  yellow: '需关注',
  orange: '预警',
  red: '高风险',
};

export function ProjectLedgerPage() {
  const navigate = useNavigate();
  const { data } = useBusinessStore();
  const currentUser = useAppStore((state) => state.currentUser);
  const [keyword, setKeyword] = useState('');
  const [phase, setPhase] = useState<string>();
  const [health, setHealth] = useState<string>();
  const [unsignedOnly, setUnsignedOnly] = useState(false);

  const accessibleProjects = useMemo(
    () => data.projects.filter((project) => canAccessProject(data, currentUser, project)),
    [data, currentUser],
  );

  const projects = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return accessibleProjects.filter((project) =>
      (!normalized || [project.name, project.code, project.customerName, project.pmName, project.departmentName]
        .some((value) => value.toLowerCase().includes(normalized))) &&
      (!phase || project.phase === phase) &&
      (!health || project.health === health) &&
      (!unsignedOnly || project.isUnsigned),
    );
  }, [accessibleProjects, health, keyword, phase, unsignedOnly]);

  const totalAmount = accessibleProjects.reduce((sum, project) => sum + (project.contractAmount || project.revenueAmount || 0), 0);
  const warningCount = accessibleProjects.filter((project) => project.health !== 'green').length;
  const activeCount = accessibleProjects.filter((project) => !['已关闭', '已终止'].includes(project.status)).length;

  const columns: ColumnsType<Project> = [
    {
      title: '项目',
      key: 'project',
      fixed: 'left',
      width: 260,
      render: (_, project) => (
        <div>
          <Button type="link" className="h-auto p-0 font-semibold" onClick={() => navigate(`/projects/${project.id}`)}>
            {project.name}
          </Button>
          <Typography.Text type="secondary" className="mt-1 block text-xs">
            {project.code} · {project.customerName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '生命周期',
      key: 'phase',
      width: 170,
      render: (_, project) => (
        <Space direction="vertical" size={3}>
          <BusinessStageBadge stage={project.phase} />
          <Typography.Text type="secondary" className="text-xs">{project.subPhase}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '健康度',
      key: 'health',
      width: 120,
      render: (_, project) => <HealthBadge status={healthNames[project.health]} />,
    },
    { title: '项目经理', dataIndex: 'pmName', width: 110 },
    { title: '主责部门', dataIndex: 'departmentName', width: 150 },
    {
      title: '项目金额（万元）',
      key: 'amount',
      align: 'right',
      width: 150,
      render: (_, project) => <MoneyText value={project.contractAmount || project.revenueAmount || 0} />,
    },
    {
      title: '执行进度',
      key: 'progress',
      width: 170,
      render: (_, project) => <Progress percent={project.progressRate} size="small" />,
    },
    {
      title: '合同',
      key: 'contract',
      width: 110,
      render: (_, project) => <Tag color={project.isUnsigned ? 'warning' : 'blue'}>{project.isUnsigned ? '未签' : '已签'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_, project) => (
        <Button type="primary" size="small" onClick={() => navigate(`/projects/${project.id}`)}>
          进入项目
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="项目台账"
        description="先选择项目，再在项目工作区中查看立项、预算、执行、核算、验收与结算。"
        breadcrumbs={[{ title: '首页', href: '/' }, { title: '业务中心' }, { title: '项目台账' }]}
      />

      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={24} md={8}><Card size="small"><Statistic title="可访问项目" value={accessibleProjects.length} suffix="个" /></Card></Col>
        <Col xs={24} md={8}><Card size="small"><Statistic title="在管项目" value={activeCount} suffix="个" /></Card></Col>
        <Col xs={24} md={8}><Card size="small"><Statistic title="需关注项目" value={warningCount} suffix="个" valueStyle={{ color: warningCount ? '#d97706' : undefined }} /></Card></Col>
      </Row>

      <Card
        title={<Space><FolderOpenOutlined className="text-blue-600" />项目清单</Space>}
        extra={<Typography.Text type="secondary">当前范围金额 <MoneyText value={totalAmount} /> 万元</Typography.Text>}
      >
        <Space wrap className="mb-4">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索项目、客户、项目经理"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 280 }}
          />
          <Select allowClear placeholder="生命周期" value={phase} onChange={setPhase} options={phaseOptions} style={{ width: 140 }} />
          <Select allowClear placeholder="健康度" value={health} onChange={setHealth} options={healthOptions} style={{ width: 140 }} />
          <Select allowClear placeholder="合同状态" value={unsignedOnly ? 'unsigned' : undefined} onChange={(v) => setUnsignedOnly(v === 'unsigned')} options={[{ value: 'unsigned', label: '未签项目' }]} style={{ width: 140 }} />
          <Typography.Text type="secondary">共 {projects.length} 个项目</Typography.Text>
        </Space>
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={projects}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1260 }}
        />
      </Card>
    </>
  );
}
