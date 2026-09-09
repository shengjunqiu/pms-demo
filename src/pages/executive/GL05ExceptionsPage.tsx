import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Space, Tabs, Badge, Button, Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mockProjects } from '@/mock';
import { PageHeader } from '@/components/common/PageHeader';
import { Project } from '@/models/types';

const { Text } = Typography;

export const GL05ExceptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');

  const redProjects = mockProjects.filter((p) => p.health === 'red');
  const orangeProjects = mockProjects.filter((p) => p.health === 'orange');
  const costExceptions = mockProjects.filter((p) => p.costVarianceRate > 5);
  const unsignedExceptions = mockProjects.filter((p) => p.isUnsigned);

  const getDataSource = () => {
    switch (activeTab) {
      case 'red': return redProjects;
      case 'orange': return orangeProjects;
      case 'cost': return costExceptions;
      case 'unsigned': return unsignedExceptions;
      default: return mockProjects.filter((p) => p.health !== 'green');
    }
  };

  const columns = [
    {
      title: '项目编号/名称',
      dataIndex: 'name',
      key: 'name',
      render: (_value: unknown, record: Project) => (
        <div>
          <Space size={4}>
            <Tag color="blue">{record.id}</Tag>
            <Text strong>{record.name}</Text>
          </Space>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customerName} | PM: {record.pmName}</div>
        </div>
      ),
    },
    {
      title: '所属部门',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 140,
    },
    {
      title: '健康等级',
      dataIndex: 'health',
      key: 'health',
      width: 100,
      render: (health: string) => {
        const color = health === 'red' ? 'error' : health === 'orange' ? 'warning' : 'gold';
        const text = health === 'red' ? '高风险' : health === 'orange' ? '预警' : '关注';
        return <Badge status={color as 'error' | 'warning' | 'default' | 'success' | 'processing'} text={text} />;
      },
    },
    {
      title: '最严重异常原因与诊断',
      dataIndex: 'healthReason',
      key: 'healthReason',
      render: (reason: string) => <Text style={{ color: '#cf1322', fontSize: 13 }}>{reason}</Text>,
    },
    {
      title: '合同金额 / 滚动成本 (万元)',
      key: 'cost',
      width: 200,
      render: (_value: unknown, record: Project) => (
        <div>
          <div>合同: ¥{record.contractAmount.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: record.costVariance > 0 ? '#cf1322' : '#3f8600' }}>
            滚动: ¥{record.rollingCost.toLocaleString()} (偏差: {record.costVarianceRate}%)
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_value: unknown, record: Project) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/executive/project-drilldown?projectId=${record.id}`)}
        >
          全景穿透
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="GL-05 项目健康度与异常监控中心"
        description="集中监控高风险、进度严重逾期、成本超支、未签投入超限等红黄绿异常项目台账"
        extra={
          <Space size={12}>
            <Tag color="error">高风险: {redProjects.length}</Tag>
            <Tag color="warning">预警: {orangeProjects.length}</Tag>
          </Space>
        }
      />

      <Alert
        message="异常监控规则提示"
        description="系统实时依据【成本偏差率 ≥ 15%】、【终验延期超 14 天】、【未签投入超限】等规则自动触发红线预警并归集至本中心。"
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Card size="small">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: `全部异常项目 (${mockProjects.filter(p => p.health !== 'green').length})` },
            { key: 'red', label: `高风险红线项目 (${redProjects.length})` },
            { key: 'orange', label: `预警项目 (${orangeProjects.length})` },
            { key: 'cost', label: `成本超支专项 (${costExceptions.length})` },
            { key: 'unsigned', label: `未签立项监控 (${unsignedExceptions.length})` },
          ]}
        />

        <Table
          dataSource={getDataSource()}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
};
