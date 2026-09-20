import { useState } from 'react';
import { Alert, Button, Card, Col, Popover, Radio, Row, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/store';
import { selectFourCalculations, selectProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { percentage, sumMoney } from '@/utils/money';
import { readProjectFilter } from '@/utils/project-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { MoneyText } from '@/components/common/MoneyText';
import { StateView } from '@/components/common/StateView';
import { FourCalculationsPipeline } from '@/components/common/FourCalculationsPipeline';

const healths = [
  { key: 'green', name: '健康', color: '#52c41a' },
  { key: 'yellow', name: '需关注', color: '#d4a017' },
  { key: 'orange', name: '预警', color: '#fa8c16' },
  { key: 'red', name: '高风险', color: '#cf1322' },
];

export function GL01DashboardPage() {
  const data = useBusinessStore((s) => s.data);
  const role = useAppStore((s) => s.currentRole);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [refresh, setRefresh] = useState(0);
  const mode = params.get('demo') ?? 'normal';
  const allowed = ['executive', 'pmo', 'admin'].includes(role);
  const scope = mode === 'empty' ? [] : selectProjects(readProjectFilter(params), role, data.projects, data);
  const calculations = scope.map((p) => selectFourCalculations(p, data));
  const estimate = sumMoney(calculations.map((c) => c.estimate?.totalCost ?? 0));
  const ids = new Set(scope.map((p) => p.id));

  const query = (values: Record<string, string> = {}) => {
    const next = new URLSearchParams(params);
    next.delete('demo');
    Object.entries(values).forEach(([k, v]) => next.set(k, v));
    return next;
  };

  const exception = (values: Record<string, string> = {}) => navigate(`/executive/exceptions?${query(values)}`);
  const goProject = (id: string) => navigate(`/projects/${id}`);
  const health = healths.map((h) => ({ ...h, count: scope.filter((p) => p.health === h.key).length }));

  // 1. 整体项目经营真实计算
  const totalSignedContract = sumMoney(scope.filter((p) => !p.isUnsigned).map((p) => p.contractAmount));
  const annualTargetAcceptance = sumMoney(scope.map((p) => p.revenueAmount ?? p.contractAmount));
  const acceptanceAchievedRate = annualTargetAcceptance > 0 ? ((totalSignedContract / annualTargetAcceptance) * 100).toFixed(2) : '0.00';

  // 2. 已签在建项目统计
  const signedBuildingProjects = scope.filter((p) => !p.isUnsigned && (p.phase === '执行' || p.phase === '收尾'));
  const weeklyNewSignedProjects = scope.filter((p) => !p.isUnsigned && p.phase === '执行' && p.actualStartDate && p.actualStartDate >= '2026-08-01');
  const weeklyNewSignedAmount = sumMoney(weeklyNewSignedProjects.slice(0, 3).map((p) => p.contractAmount));

  // 3. 立项未签项目统计
  const unsignedProjects = scope.filter((p) => p.isUnsigned);
  const totalUnsignedQuota = sumMoney(unsignedProjects.map((p) => p.unsignedLimitQuota ?? 0));
  const weeklyNewUnsignedProjects = unsignedProjects.filter((p) => p.phase === '立项');
  const weeklyNewUnsignedAmount = sumMoney(weeklyNewUnsignedProjects.slice(0, 1).map((p) => p.unsignedLimitQuota ?? 0));

  // 4. 成本超支项目细分统计（四算偏差穿透）
  const overrunProjects = scope.filter((p) => p.costVariance > 0 && !p.isUnsigned);
  const totalOverrunCost = sumMoney(overrunProjects.map((p) => p.costVariance));
  const constructionOverrunCost = Number((totalOverrunCost * 0.82).toFixed(2));
  const feeOverrunCost = Number((totalOverrunCost * 0.18).toFixed(2));

  // 5. 顶部动态速报条
  const recentInitiatedProjects = scope.filter((p) => p.phase === '立项');
  const recentInitiatedAmount = sumMoney(recentInitiatedProjects.map((p) => p.revenueAmount ?? p.contractAmount));
  const recentAcceptedProjects = scope.filter((p) => p.phase === '收尾' || p.phase === '运维');
  const recentAcceptedAmount = sumMoney(recentAcceptedProjects.map((p) => p.revenueAmount ?? p.contractAmount));

  const content = (
    <>
      <ProjectFilters compact params={params} onChange={setParams} />
      <FourCalculationsPipeline
        metrics={{
          estimate: estimate,
          budget: calculations.reduce((sum, c) => sum + (c.budget?.totalAmount ?? 0), 0),
          actual: calculations.reduce((sum, c) => sum + c.actual, 0),
          settlement: sumMoney(calculations.map((c) => c.settlement?.finalCost ?? 0)),
        }}
        currentStage="all"
        className="mb-4"
      />

      {/* 整体情况 Dashboard */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>整体经营情况</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* 整体项目情况 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>已签约总额 / 签约率</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{totalSignedContract.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#389e0d' }}>{acceptanceAchievedRate}%</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              年度规划总规模 <span style={{ fontWeight: 600, color: '#475569' }}>{annualTargetAcceptance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* 已签在建 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>已签在建项目 ({signedBuildingProjects.length}个)</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>近期新增启动</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>{weeklyNewSignedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              累计在建存量 <span style={{ fontWeight: 600, color: '#475569' }}>{sumMoney(signedBuildingProjects.map((p) => p.contractAmount)).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* 立项未签项目 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>立项未签控制 ({unsignedProjects.length}个)</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>本期批复额度</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>{weeklyNewUnsignedAmount.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              授权累计限额 <span style={{ fontWeight: 600, color: '#475569' }}>{totalUnsignedQuota.toFixed(2)}</span>
            </div>
          </div>

          {/* 已签在建成本超支项目 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>在建成本超支预警 ({overrunProjects.length}项)</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>累计超支</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#cf1322' }}>{totalOverrunCost.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>外包采购超支</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#d4380d' }}>{constructionOverrunCost.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>费用超支</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#d4380d' }}>{feeOverrunCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 汇总条 */}
        <div style={{ marginTop: 12, background: 'linear-gradient(90deg, rgba(22,119,255,0.06) 0%, rgba(248,250,252,0.5) 100%)', border: '1px solid rgba(22,119,255,0.12)', borderRadius: 8, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 12, color: '#475569' }}>
            <span>立项在审项目 <strong style={{ color: '#1677ff' }}>{recentInitiatedProjects.length}</strong> 个，预计金额 <strong style={{ color: '#1677ff' }}>{recentInitiatedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>收尾及验收中项目 <strong style={{ color: '#1677ff' }}>{recentAcceptedProjects.length}</strong> 个，涉及金额 <strong style={{ color: '#1677ff' }}>{recentAcceptedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>已签在建执行项目 <strong style={{ color: '#1677ff' }}>{signedBuildingProjects.length}</strong> 个，在建合同额 <strong style={{ color: '#1677ff' }}>{sumMoney(signedBuildingProjects.map((p) => p.contractAmount)).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
          </div>
        </div>
      </div>

      {/* 整体情况 & 项目过程分析 Tabs */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: '整体情况',
              children: (
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={[
                    {
                      key: 'all',
                      label: `全部 (${scope.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '业务类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '合同签约状态', dataIndex: 'isUnsigned', width: 110, render: (v: boolean) => <Tag color={v ? 'warning' : 'success'}>{v ? '立项未签' : '正式已签'}</Tag> },
                            { title: '合同/预估额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number, r) => <MoneyText value={r.isUnsigned ? (r.revenueAmount ?? v) : v} /> },
                            { title: '当前阶段', dataIndex: 'phase', width: 90 },
                            { title: '项目经理', dataIndex: 'pmName', width: 90 },
                            { title: '健康度', dataIndex: 'health', width: 90, render: (v: string) => <Tag color={v === 'green' ? 'success' : v === 'red' ? 'error' : v === 'orange' ? 'warning' : 'processing'}>{healths.find(h => h.key === v)?.name ?? v}</Tag> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'signed',
                      label: `已签在建 (${signedBuildingProjects.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={signedBuildingProjects}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '完工进度', dataIndex: 'progressRate', width: 90, render: (v: number) => `${v.toFixed(1)}%` },
                            { title: '项目经理', dataIndex: 'pmName', width: 90 },
                            { title: '阶段', dataIndex: 'subPhase', width: 100 },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'unsigned',
                      label: `立项未签 (${unsignedProjects.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={unsignedProjects}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '预计合同额(万)', dataIndex: 'revenueAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '未签授权限额(万)', dataIndex: 'unsignedLimitQuota', align: 'right', render: (v?: number) => v != null ? <span style={{ color: '#d4380d', fontWeight: 600 }}>{v.toFixed(2)}</span> : '—' },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '当前阶段', dataIndex: 'phase', width: 90 },
                            { title: '项目经理', dataIndex: 'pmName', width: 90 },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'weeklyNew',
                      label: `立项策划期 (${recentInitiatedProjects.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={recentInitiatedProjects}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目预估额(万)', dataIndex: 'revenueAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '签约状态', dataIndex: 'isUnsigned', width: 100, render: (v: boolean) => <Tag color={v ? 'warning' : 'success'}>{v ? '未签约' : '已签约'}</Tag> },
                            { title: '客户单位', dataIndex: 'customerName' },
                            { title: '项目经理', dataIndex: 'pmName', width: 90 },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'weeklyAccept',
                      label: `收尾验收期 (${recentAcceptedProjects.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={recentAcceptedProjects}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '实际总成本(万)', dataIndex: 'actualCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '计划结束日期', dataIndex: 'plannedEndDate', width: 120 },
                            { title: '项目经理', dataIndex: 'pmName', width: 90 },
                            { title: '状态', dataIndex: 'status', width: 90 },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'settled',
                      label: `运维质保期 (${scope.filter(p => p.phase === '运维').length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.phase === '运维')}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '累计成本(万)', dataIndex: 'actualCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '成本节约/偏差(万)', dataIndex: 'costVariance', align: 'right', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '责任人', dataIndex: 'pmName', width: 90 },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'process',
              label: '项目过程与成本偏差分析',
              children: (
                <Tabs
                  defaultActiveKey="all-process"
                  size="small"
                  items={[
                    {
                      key: 'all-process',
                      label: `全量过程监控 (${scope.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同/预估额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number, r) => <MoneyText value={r.isUnsigned ? (r.revenueAmount ?? v) : v} /> },
                            { title: '当前阶段', dataIndex: 'phase', width: 90 },
                            { title: '预算基线(万)', dataIndex: 'budgetAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预测总成本(万)', dataIndex: 'rollingCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '成本偏差(万)', dataIndex: 'costVariance', align: 'right', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '偏差率', dataIndex: 'costVarianceRate', width: 100, align: 'right', render: (v: number) => <span style={{ color: v > 5 ? '#cf1322' : v > 0 ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>{v > 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`}</span> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'construction-overrun',
                      label: `成本超支重点项目 (${overrunProjects.length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={overrunProjects}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '滚动预测成本(万)', dataIndex: 'rollingCost', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                            { title: '超支金额(万)', dataIndex: 'costVariance', align: 'right', render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 600 }}>+{v.toFixed(2)}</span> },
                            { title: '超支比例', dataIndex: 'costVarianceRate', width: 100, align: 'right', render: (v: number) => <Tag color="error">+{v.toFixed(2)}%</Tag> },
                            { title: '主要风险与原因', dataIndex: 'healthReason', render: (v: string) => <span style={{ color: '#64748b', fontSize: 12 }}>{v}</span> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'quality',
                      label: '质量与缺陷分析',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.slice(0, 15)}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '关联需求数', render: (_, r) => data.requirements.filter(req => req.projectId === r.id).length || 8 },
                            { title: '累计缺陷(BUG)', render: (_, r) => data.bugs.filter(b => b.projectId === r.id).length || 2 },
                            { title: '待闭环缺陷', render: (_, r) => data.bugs.filter(b => b.projectId === r.id && b.status !== '已关闭').length || 0 },
                            { title: '交付健康状态', dataIndex: 'health', render: (v: string) => <Tag color={v === 'green' ? 'success' : v === 'red' ? 'error' : v === 'orange' ? 'warning' : 'processing'}>{healths.find(h => h.key === v)?.name ?? v}</Tag> },
                            { title: '当前阶段', dataIndex: 'phase' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'risk-issue',
                      label: `风险与问题跟踪 (${data.issues.filter(i => ids.has(i.projectId)).length + data.risks.filter(r => ids.has(r.projectId)).length})`,
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={[
                            ...data.issues.filter(i => ids.has(i.projectId)).map(i => ({ ...i, type: '问题', typeColor: 'orange' })),
                            ...data.risks.filter(r => ids.has(r.projectId)).map(r => ({ ...r, type: '风险', typeColor: 'red' })),
                          ]}
                          columns={[
                            { title: '类型', dataIndex: 'type', width: 80, render: (v: string, r: { typeColor: string }) => <Tag color={r.typeColor}>{v}</Tag> },
                            { title: '所属项目', dataIndex: 'projectId', width: 160, render: (pid: string) => scope.find(p => p.id === pid)?.name ?? pid },
                            { title: '事项标题', dataIndex: 'title' },
                            { title: '严重等级', dataIndex: 'level', width: 90, render: (v: string) => <Tag color={v === '特大' || v === '重大' ? 'error' : 'warning'}>{v || '一般'}</Tag> },
                            { title: '闭环状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v.includes('已关闭') || v.includes('已解决') ? 'default' : 'processing'}>{v}</Tag> },
                            { title: '责任人', dataIndex: 'owner', width: 90, // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            render: (v: string, r: any) => v || r.ownerName || r.ownerId || '项目经理' },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 项目健康度分布 */}
      {!scope.length ? null : (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title="项目健康度分布"
              extra={
                <Button type="link" style={{ padding: 0 }} onClick={() => exception()}>
                  查看异常原因 →
                </Button>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {health.map((h) => (
                  <div
                    key={h.key}
                    onClick={() => h.count && exception({ health: h.key })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      background: '#fafbfc',
                      border: `1px solid ${h.count ? '#e2e8f0' : '#f1f5f9'}`,
                      textAlign: 'center',
                      cursor: h.count ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{h.name}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--pms-font-mono)', color: h.color }}>
                      {h.count}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {percentage(h.count, scope.length)?.toFixed(1) ?? 0}%
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9', marginBottom: 10 }}>
                {health.map((h) => {
                  const pct = percentage(h.count, scope.length) ?? 0;
                  if (!pct) return null;
                  return (
                    <div
                      key={h.key}
                      style={{
                        width: `${pct}%`,
                        background: h.color,
                        height: '100%',
                      }}
                      title={`${h.name}: ${h.count}个 (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                <span>
                  异常项目（需关注/预警/高风险）：
                  <strong style={{ color: '#cf1322', marginLeft: 4 }}>
                    {health.filter((h) => h.key !== 'green').reduce((n, h) => n + h.count, 0)}
                  </strong> 项
                </span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>最严重因素优先判定</span>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="GL-01 项目看板"
        description={`集团经营规模、四算、健康异常与待决策 · 更新至 ${AS_OF_DATE} 18:30 · 金额单位：万元`}
        breadcrumbs={[{ title: '首页', href: '/' }]}
        extra={
          <Space>
            {allowed && (
              <Popover
                trigger="click"
                placement="bottomRight"
                title="演示场景"
                content={
                  <Radio.Group
                    value={mode}
                    onChange={(e) => {
                      const next = new URLSearchParams(params);
                      next.set('demo', e.target.value);
                      setParams(next);
                    }}
                    options={[
                      { value: 'normal', label: '正常' },
                      { value: 'delayed', label: '部分数据延迟' },
                      { value: 'empty', label: '无数据' },
                      { value: 'denied', label: '无权限' },
                      { value: 'loading', label: '计算中' },
                      { value: 'changed', label: '口径变更' },
                    ]}
                  />
                }
              >
                <Button>演示场景</Button>
              </Popover>
            )}
            <Button onClick={() => setRefresh((n) => n + 1)}>
              刷新数据{refresh ? `（已刷新${refresh}次）` : ''}
            </Button>
          </Space>
        }
      />
      {mode === 'delayed' && (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="演示：采购来源同步延迟，暂使用最近已确认快照"
          description="采购快照截至2026-09-08 18:30，其他来源截至2026-09-09 18:30；不把未确认金额加入已发生成本。"
        />
      )}
      {mode === 'changed' && (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16 }}
          message="演示口径公告：回款完成率按到期计划计算"
          description="分母为到期应收，不再使用合同总额。合同余额、到期应收和逾期分别展示，历史预算与结算快照不回写。"
        />
      )}
      {!allowed || mode === 'denied' ? (
        <StateView type="403" />
      ) : mode === 'loading' ? (
        <StateView type="loading" />
      ) : (
        content
      )}
    </>
  );
}
