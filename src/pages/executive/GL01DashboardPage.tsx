import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Select, Button, Tooltip, Badge, Progress, Radio } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  ProjectOutlined,
  FilterOutlined,
  ReloadOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mockProjects, mockDecisions, AS_OF_DATE } from '@/mock';
import { calculateCockpitKPIs } from '@/utils/calculator';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { Project } from '@/models/types';

const { Text } = Typography;

export const GL01DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 6 种数据演示状态: normal, delayed, empty, no_permission, calculating, rule_changed
  const [dataState, setDataState] = useState<'normal' | 'delayed' | 'empty' | 'no_permission' | 'calculating' | 'rule_changed'>('normal');

  // 全局筛选
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const filteredProjects = useMemo(() => {
    if (dataState === 'empty' || dataState === 'no_permission') return [];
    return mockProjects.filter((p) => {
      const matchDept = deptFilter === 'all' || p.departmentId === deptFilter || (deptFilter === 'BG-CITY' && p.departmentName.includes('交付'));
      const matchType = typeFilter === 'all' || p.type === typeFilter;
      const matchHealth = healthFilter === 'all' || p.health === healthFilter;
      return matchDept && matchType && matchHealth;
    });
  }, [deptFilter, typeFilter, healthFilter, dataState]);

  const kpis = useMemo(() => calculateCockpitKPIs(filteredProjects), [filteredProjects]);

  if (dataState === 'no_permission') {
    return (
      <div>
        <PageHeader title="GL-01 项目经营驾驶舱" description="集团领导、业务群领导全局经营与决策看板" />
        <Card style={{ marginBottom: 16 }}>
          <Space size={16} align="center">
            <Text strong>演示状态控制：</Text>
            <Radio.Group value={dataState} onChange={(e) => setDataState(e.target.value)} size="small">
              <Radio.Button value="normal">正常模式</Radio.Button>
              <Radio.Button value="delayed">部分源延迟</Radio.Button>
              <Radio.Button value="empty">无匹配数据</Radio.Button>
              <Radio.Button value="no_permission">无权限态</Radio.Button>
              <Radio.Button value="calculating">正在计算</Radio.Button>
              <Radio.Button value="rule_changed">口径变更</Radio.Button>
            </Radio.Group>
          </Space>
        </Card>
        <StateView type="403" title="403 暂无经营看板访问权限" subTitle="当前角色未分配集团级经营驾驶舱查看权限，请在顶部切换为【集团领导】或【PMO负责人】角色。" />
      </div>
    );
  }

  const phaseStats = [
    { phase: '商机阶段', count: mockProjects.filter(p => p.phase === '商机').length, amount: 12500 },
    { phase: '立项阶段', count: mockProjects.filter(p => p.phase === '立项').length, amount: mockProjects.filter(p => p.phase === '立项').reduce((s, p) => s + p.contractAmount, 0) },
    { phase: '执行阶段', count: mockProjects.filter(p => p.phase === '执行').length, amount: mockProjects.filter(p => p.phase === '执行').reduce((s, p) => s + p.contractAmount, 0) },
    { phase: '收尾结算', count: mockProjects.filter(p => p.phase === '收尾' || p.phase === '已关闭' || p.phase === '运维').length, amount: mockProjects.filter(p => p.phase === '收尾' || p.phase === '已关闭' || p.phase === '运维').reduce((s, p) => s + p.contractAmount, 0) },
  ];

  const highRiskProjects = filteredProjects
    .filter(p => p.health === 'red' || p.health === 'orange')
    .slice(0, 5);

  const pendingDecisions = mockDecisions.slice(0, 5);

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
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
            {record.customerName} | PM: {record.pmName}
          </div>
        </div>
      ),
    },
    {
      title: '项目阶段',
      dataIndex: 'phase',
      key: 'phase',
      width: 110,
      render: (phase: string, record: Project) => (
        <Space direction="vertical" size={2}>
          <Tag color="cyan">{phase}</Tag>
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>{record.subPhase}</span>
        </Space>
      ),
    },
    {
      title: '合同/预算(万)',
      key: 'amount',
      width: 140,
      render: (_value: unknown, record: Project) => (
        <div>
          <div>合同: ¥{record.contractAmount.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>预算: ¥{record.budgetAmount.toLocaleString()}</div>
        </div>
      ),
    },
    {
      title: '滚动成本/偏差',
      key: 'cost',
      width: 150,
      render: (_value: unknown, record: Project) => {
        const isOver = record.costVariance > 0;
        return (
          <div>
            <div>¥{record.rollingCost.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: isOver ? '#cf1322' : '#3f8600' }}>
              {isOver ? `+${record.costVariance} (${record.costVarianceRate}%)` : `${record.costVariance} (${record.costVarianceRate}%)`}
            </div>
          </div>
        );
      },
    },
    {
      title: '健康状态与诊断',
      key: 'health',
      width: 220,
      render: (_value: unknown, record: Project) => {
        const color = record.health === 'red' ? 'error' : record.health === 'orange' ? 'warning' : record.health === 'yellow' ? 'gold' : 'success';
        const text = record.health === 'red' ? '高风险' : record.health === 'orange' ? '预警' : record.health === 'yellow' ? '关注' : '正常';
        return (
          <div>
            <Badge status={color as 'error' | 'warning' | 'default' | 'success' | 'processing'} text={<Text strong style={{ fontSize: 12 }}>{text}</Text>} />
            <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>{record.healthReason}</div>
          </div>
        );
      },
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
        title="GL-01 项目经营驾驶舱"
        description="全集团/业务群项目规模、合同收入、四算成本、加权毛利、健康诊断与领导决策总览"
        extra={
          <Space size={12}>
            <Tag color="geekblue" icon={<ClockCircleOutlined />}>数据基准: {AS_OF_DATE}</Tag>
            <Button icon={<ReloadOutlined />} onClick={() => setDataState('normal')}>刷新数据</Button>
          </Space>
        }
      />

      {/* 演示状态切换与开发调试条 */}
      <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size={8} align="center">
              <Text strong style={{ color: '#389e0d' }}>【演示模式控制条】切换驾驶舱六种运行状态：</Text>
              <Radio.Group value={dataState} onChange={(e) => setDataState(e.target.value)} size="small">
                <Radio.Button value="normal">正常数据态</Radio.Button>
                <Radio.Button value="delayed">数据延迟预警</Radio.Button>
                <Radio.Button value="empty">无匹配结果</Radio.Button>
                <Radio.Button value="no_permission">无权限态 (403)</Radio.Button>
                <Radio.Button value="calculating">正在计算中</Radio.Button>
                <Radio.Button value="rule_changed">口径变更模式</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col>
            {dataState === 'delayed' && <Tag color="warning">ERP财务实际数据存在 15 分钟延迟同步</Tag>}
            {dataState === 'rule_changed' && <Tag color="processing">当前已采用 2026 新口径：加权毛利率含未签拟建</Tag>}
          </Col>
        </Row>
      </Card>

      {/* 全局多维筛选 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space size={6}>
              <FilterOutlined style={{ color: '#1677ff' }} />
              <Text strong>所属组织/业务群：</Text>
              <Select
                value={deptFilter}
                onChange={setDeptFilter}
                style={{ width: 180 }}
                options={[
                  { value: 'all', label: '全部组织架构 (全集团)' },
                  { value: 'D-002', label: '智慧城市业务群' },
                  { value: 'D-003', label: '数字政务业务群' },
                  { value: 'D-004', label: '工业互联网业务群' },
                  { value: 'D-005', label: '数字交通业务群' },
                ]}
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space size={6}>
              <Text strong>项目类型：</Text>
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 140 }}
                options={[
                  { value: 'all', label: '全部类型' },
                  { value: '软件开发', label: '软件开发' },
                  { value: '系统集成', label: '系统集成' },
                  { value: '运维服务', label: '运维服务' },
                ]}
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space size={6}>
              <Text strong>健康度分级：</Text>
              <Select
                value={healthFilter}
                onChange={setHealthFilter}
                style={{ width: 140 }}
                options={[
                  { value: 'all', label: '全部健康状态' },
                  { value: 'green', label: '正常 (Green)' },
                  { value: 'yellow', label: '关注 (Yellow)' },
                  { value: 'orange', label: '预警 (Orange)' },
                  { value: 'red', label: '高风险 (Red)' },
                ]}
              />
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Text type="secondary">当前筛选锁定 {kpis.totalProjects} 个项目样本</Text>
          </Col>
        </Row>
      </Card>

      {/* 核心经营 KPI 卡片墙 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" hoverable onClick={() => navigate('/projects')}>
            <Statistic
              title="在管项目总数"
              value={kpis.totalProjects}
              suffix="个"
              prefix={<ProjectOutlined style={{ color: '#1677ff' }} />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              未签: {filteredProjects.filter(p => p.isUnsigned).length} | 运维: {filteredProjects.filter(p => p.isMaintenance).length}
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => navigate('/executive/portfolio')}>
            <Statistic
              title="合同签约总额"
              value={kpis.totalContractAmount}
              precision={2}
              suffix="万元"
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              已收款: ¥{(kpis.totalContractAmount * 0.42).toFixed(1)}万 (42.0%)
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => navigate('/executive/four-calculations')}>
            <Statistic
              title="滚动预测总成本"
              value={kpis.totalRollingCost}
              precision={2}
              suffix="万元"
              valueStyle={{ color: kpis.totalCostVariance > 0 ? '#cf1322' : '#3f8600' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              预算: ¥{kpis.totalBudgetAmount.toFixed(1)}万 (偏差 {kpis.totalCostVarianceRate}%)
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => navigate('/executive/four-calculations')}>
            <Statistic
              title="综合加权毛利率"
              value={kpis.weightedGrossMarginRate ?? '—'}
              precision={1}
              suffix="%"
              valueStyle={{ color: (kpis.weightedGrossMarginRate ?? 0) >= 35 ? '#3f8600' : '#cf1322' }}
              prefix={(kpis.weightedGrossMarginRate ?? 0) >= 35 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              毛利总额: ¥{kpis.totalGrossMargin.toFixed(1)} 万元
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => navigate('/executive/exceptions')}>
            <Text type="secondary" style={{ fontSize: 12 }}>项目健康度分布</Text>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <Tooltip title="高风险项目数"><Tag color="error">红: {kpis.healthDistribution.red}</Tag></Tooltip>
              <Tooltip title="预警项目数"><Tag color="warning">橙: {kpis.healthDistribution.orange}</Tag></Tooltip>
              <Tooltip title="关注项目数"><Tag color="gold">黄: {kpis.healthDistribution.yellow}</Tag></Tooltip>
              <Tooltip title="正常项目数"><Tag color="success">绿: {kpis.healthDistribution.green}</Tag></Tooltip>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#cf1322' }}>
              异常率: {(((kpis.healthDistribution.red + kpis.healthDistribution.orange) / (kpis.totalProjects || 1)) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
      </Row>

      {/* 四阶段生命周期分布与高风险下钻 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="四阶段生命周期分布 (商机 → 立项 → 执行 → 收尾结算)" size="small">
            <Row gutter={16}>
              {phaseStats.map((st, i) => (
                <Col span={6} key={i}>
                  <div style={{ padding: '12px 8px', background: '#fafafa', borderRadius: 4, textAlign: 'center' }}>
                    <Text strong style={{ fontSize: 13 }}>{st.phase}</Text>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff', margin: '6px 0' }}>{st.count} 个</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>金额 ¥{Math.round(st.amount).toLocaleString()}万</Text>
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: 13 }}>四阶段交付资金池推进流速：</Text>
              <Progress
                percent={78.5}
                success={{ percent: 28.5 }}
                strokeColor="#1677ff"
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={
              <Space size={6}>
                <ExclamationCircleOutlined style={{ color: '#cf1322' }} />
                <span>领导待决策事项 ({pendingDecisions.length})</span>
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/executive/decisions')}>全部事项 <RightOutlined /></Button>}
            size="small"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingDecisions.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                  <div>
                    <Tag color={d.type === '超概算审批' ? 'magenta' : 'red'}>{d.type}</Tag>
                    <Text strong style={{ fontSize: 13 }}>{d.projectName}</Text>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>影响金额: ¥{d.impactAmount}万 | 会议: {d.level}</div>
                  </div>
                  <Button type="primary" ghost size="small" onClick={() => navigate(d.targetRoute)}>
                    审批决策
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 异常项目重点聚焦与下钻清单 */}
      <Card
        title="重点异常与高风险项目穿透清单 (TOP 5)"
        size="small"
        extra={<Button type="link" size="small" onClick={() => navigate('/executive/exceptions')}>查看全部异常项目 <RightOutlined /></Button>}
      >
        <Table
          dataSource={highRiskProjects}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
};
