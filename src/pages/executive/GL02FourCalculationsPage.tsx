import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Select, Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { mockProjects } from '@/mock';
import { PageHeader } from '@/components/common/PageHeader';
import { Project } from '@/models/types';

const { Text } = Typography;

export const GL02FourCalculationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => selectedDept === 'all' || p.departmentId === selectedDept);
  }, [selectedDept]);

  // 四算阶段汇总
  const totalContract = filteredProjects.reduce((s, p) => s + p.contractAmount, 0);
  const totalEstimate = Math.round(totalContract * 0.58);
  const totalBudget = filteredProjects.reduce((s, p) => s + p.budgetAmount, 0);
  const totalActual = filteredProjects.reduce((s, p) => s + p.actualCost, 0);
  const totalRolling = filteredProjects.reduce((s, p) => s + p.rollingCost, 0);
  const settledProjects = filteredProjects.filter((p) => p.status === '已结算');
  const totalSettlement = settledProjects.reduce((s, p) => s + p.rollingCost, 0);

  // 科目偏差归因
  const subjectBreakdown = [
    { subject: '直接人力成本', budget: Math.round(totalBudget * 0.45), actual: Math.round(totalActual * 0.48), diff: Math.round(totalActual * 0.48 - totalBudget * 0.45) },
    { subject: '硬件与采购支出', budget: Math.round(totalBudget * 0.25), actual: Math.round(totalActual * 0.28), diff: Math.round(totalActual * 0.28 - totalBudget * 0.25) },
    { subject: '外包开发费用', budget: Math.round(totalBudget * 0.20), actual: Math.round(totalActual * 0.17), diff: Math.round(totalActual * 0.17 - totalBudget * 0.20) },
    { subject: '项目现场期间费用', budget: Math.round(totalBudget * 0.10), actual: Math.round(totalActual * 0.07), diff: Math.round(totalActual * 0.07 - totalBudget * 0.10) },
  ];

  const columns = [
    {
      title: '项目编号与名称',
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
      title: '概算 (万元)',
      key: 'estimate',
      render: (_value: unknown, record: Project) => <span>¥{Math.round(record.budgetAmount * 0.95).toLocaleString()}</span>,
    },
    {
      title: '预算 (万元)',
      dataIndex: 'budgetAmount',
      key: 'budgetAmount',
      render: (val: number) => <span>¥{val.toLocaleString()}</span>,
    },
    {
      title: '动态核算/滚动 (万元)',
      dataIndex: 'rollingCost',
      key: 'rollingCost',
      render: (val: number) => <Text strong>¥{val.toLocaleString()}</Text>,
    },
    {
      title: '最终结算 (万元)',
      key: 'settlement',
      render: (_value: unknown, record: Project) => (
        record.status === '已结算' ? (
          <Tag color="green">¥{record.rollingCost.toLocaleString()}</Tag>
        ) : (
          <Text type="secondary">— (未结算)</Text>
        )
      ),
    },
    {
      title: '预算→滚动偏差',
      key: 'variance',
      sorter: (a: Project, b: Project) => a.costVarianceRate - b.costVarianceRate,
      render: (_value: unknown, record: Project) => {
        const isOver = record.costVariance > 0;
        return (
          <Text style={{ color: isOver ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
            {isOver ? `+${record.costVariance} (+${record.costVarianceRate}%)` : `${record.costVariance} (${record.costVarianceRate}%)`}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_value: unknown, record: Project) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/executive/project-drilldown?projectId=${record.id}`)}
        >
          四算穿透
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="GL-02 四算经营专题分析 (概算 → 预算 → 核算 → 结算)"
        description="纵向比对四算全流程演变轨迹、科目偏差归因瀑布与毛利率波动分析"
        extra={
          <Space size={12}>
            <Text strong>业务群筛选：</Text>
            <Select
              value={selectedDept}
              onChange={setSelectedDept}
              style={{ width: 160 }}
              options={[
                { value: 'all', label: '全部业务群' },
                { value: 'D-002', label: '智慧城市业务群' },
                { value: 'D-003', label: '数字政务业务群' },
                { value: 'D-004', label: '工业互联网业务群' },
              ]}
            />
          </Space>
        }
      />

      <Alert
        message="四算计算口径与不变量约束提示"
        description="概算取冻结版本；预算取当前生效基线版本；动态核算按【已发生 + 未发生承诺 + 剩余预测】严格互斥计算；结算仅统计已结项项目，未结项不伪装为0。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 四算金额总览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic title="1. 概算总额 (冻结版本)" value={totalEstimate} precision={1} suffix="万元" />
            <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>售前测算毛利: 42.0%</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic title="2. 预算总额 (基线版本)" value={totalBudget} precision={1} suffix="万元" />
            <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>较概算控制: +{((totalBudget - totalEstimate) / totalEstimate * 100).toFixed(1)}%</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderTop: '3px solid #fa8c16' }}>
            <Statistic title="3. 动态核算 (实时滚动)" value={totalRolling} precision={1} suffix="万元" valueStyle={{ color: '#fa8c16' }} />
            <div style={{ marginTop: 6, fontSize: 12, color: '#cf1322' }}>预算偏差: +{((totalRolling - totalBudget) / totalBudget * 100).toFixed(2)}%</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="4. 已结算成本 (样本)" value={totalSettlement} precision={1} suffix="万元" valueStyle={{ color: '#52c41a' }} />
            <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>已结项项目: {settledProjects.length} 个</div>
          </Card>
        </Col>
      </Row>

      {/* 科目偏差归因 */}
      <Card title="四算成本科目偏差归因分析 (预算 vs 动态核算)" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {subjectBreakdown.map((sub, idx) => (
            <Col span={6} key={idx}>
              <div style={{ padding: 12, background: '#fafafa', borderRadius: 4 }}>
                <Text strong>{sub.subject}</Text>
                <div style={{ margin: '8px 0', fontSize: 13 }}>
                  <div>预算: ¥{sub.budget.toLocaleString()}万</div>
                  <div>实际+预测: ¥{sub.actual.toLocaleString()}万</div>
                </div>
                <div style={{ fontSize: 12, color: sub.diff > 0 ? '#cf1322' : '#3f8600' }}>
                  偏差: {sub.diff > 0 ? `+${sub.diff}万 (超支)` : `${sub.diff}万 (结余)`}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 单项目四算对比表 */}
      <Card title="项目四算全景对比明细表" size="small">
        <Table
          dataSource={filteredProjects}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
};
