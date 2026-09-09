import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, Tag, Typography, Space, Select, Progress, Statistic } from 'antd';
import { AppstoreOutlined, PieChartOutlined, DollarOutlined } from '@ant-design/icons';
import { mockProjects } from '@/mock';
import { PageHeader } from '@/components/common/PageHeader';

const { Text } = Typography;

export const GL04PortfolioPage: React.FC = () => {
  const [dimension, setDimension] = useState<'dept' | 'type' | 'level' | 'health'>('dept');

  // 按维度分组统计
  const portfolioData = useMemo(() => {
    const groups: { [key: string]: { count: number; contractAmount: number; rollingCost: number; actualCost: number } } = {};

    mockProjects.forEach((p) => {
      let key = p.departmentName;
      if (dimension === 'type') key = p.type;
      if (dimension === 'level') key = p.level;
      if (dimension === 'health') key = p.health === 'red' ? '高风险' : p.health === 'orange' ? '预警' : p.health === 'yellow' ? '关注' : '正常';

      if (!groups[key]) {
        groups[key] = { count: 0, contractAmount: 0, rollingCost: 0, actualCost: 0 };
      }
      groups[key].count += 1;
      groups[key].contractAmount += p.contractAmount;
      groups[key].rollingCost += p.rollingCost;
      groups[key].actualCost += p.actualCost;
    });

    return Object.keys(groups).map((key) => {
      const g = groups[key];
      const grossMargin = g.contractAmount - g.rollingCost;
      const grossMarginRate = g.contractAmount > 0 ? Number(((grossMargin / g.contractAmount) * 100).toFixed(2)) : 0;
      return {
        dimensionKey: key,
        count: g.count,
        contractAmount: g.contractAmount,
        rollingCost: g.rollingCost,
        grossMargin,
        grossMarginRate,
      };
    });
  }, [dimension]);

  const totalContract = portfolioData.reduce((s, d) => s + d.contractAmount, 0);

  const columns = [
    {
      title: dimension === 'dept' ? '业务群 / 交付部门' : dimension === 'type' ? '项目类型' : dimension === 'level' ? '项目等级' : '健康分级',
      dataIndex: 'dimensionKey',
      key: 'dimensionKey',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '项目数量',
      dataIndex: 'count',
      key: 'count',
      render: (c: number) => <Tag color="blue">{c} 个</Tag>,
    },
    {
      title: '合同金额 (万元)',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      render: (v: number) => <span>¥{Math.round(v).toLocaleString()}</span>,
    },
    {
      title: '规模金额占比',
      key: 'share',
      render: (_value: unknown, record: { contractAmount: number }) => {
        const percent = Number(((record.contractAmount / totalContract) * 100).toFixed(1));
        return <Progress percent={percent} size="small" style={{ width: 140 }} />;
      },
    },
    {
      title: '滚动预测成本 (万元)',
      dataIndex: 'rollingCost',
      key: 'rollingCost',
      render: (v: number) => <span>¥{Math.round(v).toLocaleString()}</span>,
    },
    {
      title: '加权毛利率',
      dataIndex: 'grossMarginRate',
      key: 'grossMarginRate',
      render: (rate: number) => (
        <Text strong style={{ color: rate >= 35 ? '#3f8600' : '#cf1322' }}>
          {rate}%
        </Text>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="GL-04 项目组合与多维经营分析"
        description="按组织架构、业务类型、等级分级、健康度等维度矩阵化分析项目组合与资金结构"
        extra={
          <Space size={12}>
            <Text strong>分析聚合维度：</Text>
            <Select
              value={dimension}
              onChange={setDimension}
              style={{ width: 160 }}
              options={[
                { value: 'dept', label: '按组织 / 业务群' },
                { value: 'type', label: '按项目类型' },
                { value: 'level', label: '按项目等级' },
                { value: 'health', label: '按健康状态' },
              ]}
            />
          </Space>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="组合样本项目总数" value={mockProjects.length} suffix="个" prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="组合签约总金额" value={totalContract} precision={2} suffix="万元" prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="整体加权平均毛利率"
              value={38.4}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title={`项目组合多维矩阵分解 (${dimension === 'dept' ? '按组织' : dimension === 'type' ? '按类型' : dimension === 'level' ? '按等级' : '按健康'})`} size="small">
        <Table
          dataSource={portfolioData}
          columns={columns}
          rowKey="dimensionKey"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
};
