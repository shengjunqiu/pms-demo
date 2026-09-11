import { marginReason } from '@/utils/sensitive';
import { canViewSensitiveField } from '@/mock/configuration-access';
import { useState } from 'react';
import { Alert, Button, Card, Col, Empty, Popover, Radio, Row, Space, Table, Tag, Typography } from 'antd';
import {
  ProjectOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  LineChartOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { selectFourCalculations, selectProjects, selectReceipts } from '@/mock/selectors';
import { projectExceptions } from '@/mock/exceptions';
import { useAppStore } from '@/store/useAppStore';
import { calculateCockpitKPIs } from '@/utils/calculator';
import { formatPercent, percentage, sumMoney } from '@/utils/money';
import { readProjectFilter } from '@/utils/project-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { MoneyText } from '@/components/common/MoneyText';
import { StateView } from '@/components/common/StateView';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { FourCalculationsPipeline } from '@/components/common/FourCalculationsPipeline';

const healths = [{ key: 'green', name: '健康', color: '#52c41a' }, { key: 'yellow', name: '需关注', color: '#d4a017' }, { key: 'orange', name: '预警', color: '#fa8c16' }, { key: 'red', name: '高风险', color: '#cf1322' }];
export function GL01DashboardPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole); const canViewMargin = canViewSensitiveField(data, { role }, 'margin');
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const [refresh, setRefresh] = useState(0);
  const mode = params.get('demo') ?? 'normal';
  const allowed = ['executive', 'pmo', 'admin'].includes(role);
  const scope = mode === 'empty' ? [] : selectProjects(readProjectFilter(params), role, data.projects, data);
  const kpi = calculateCockpitKPIs(scope); const receipt = selectReceipts(scope, data); const exceptions = projectExceptions(scope, data);
  const calculations = scope.map((p) => selectFourCalculations(p, data)); const estimate = sumMoney(calculations.map((c) => c.estimate?.totalCost ?? 0));
  const ids = new Set(scope.map((p) => p.id)); const pending = data.decisions.filter((d) => ids.has(d.projectId) && d.status === '待决策');
  const query = (values: Record<string, string> = {}) => { const next = new URLSearchParams(params); next.delete('demo'); Object.entries(values).forEach(([k, v]) => next.set(k, v)); return next; };
  const drill = (values: Record<string, string> = {}) => navigate(`/executive/project-drilldown?${query(values)}`);
  const exception = (values: Record<string, string> = {}) => navigate(`/executive/exceptions?${query(values)}`);
  const goProject = (id: string) => drill({ projectId: id });
  const health = healths.map((h) => ({ ...h, count: scope.filter((p) => p.health === h.key).length }));
  const content = <>
    <ProjectFilters compact params={params} onChange={setParams} />
    <FourCalculationsPipeline
      metrics={{
        estimate: estimate,
        budget: kpi.totalBudgetAmount,
        actual: kpi.totalActualCost,
        settlement: sumMoney(calculations.map((c) => c.settlement?.finalCost ?? 0)),
      }}
      currentStage="all"
      className="mb-4"
    />
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>{[
      { label: '在管项目', value: String(scope.length), unit: '个', icon: <ProjectOutlined />, action: () => drill(), statusText: '当前筛选范围', statusType: 'info' as const },
      { label: '已签合同总额', value: receipt.signed, icon: <DollarOutlined />, action: () => drill({ metric: 'signed' }) },
      { label: '实时滚动成本', value: kpi.totalRollingCost, icon: <LineChartOutlined />, action: () => drill() },
      { label: '预测毛利', value: !canViewMargin ? '已隐藏' : kpi.totalGrossMargin, icon: <LineChartOutlined />, action: () => drill() },
      { label: '到期应收', value: receipt.due, icon: <AuditOutlined />, action: () => drill({ metric: 'signed' }) },
      { label: '回款完成率', value: formatPercent(receipt.dueCompletion), unit: '', icon: <SafetyCertificateOutlined />, action: () => drill({ metric: 'signed' }) },
    ].map((m) => (
      <Col span={6} key={m.label}>
        <MetricStatCard
          title={m.label}
          value={m.value}
          unit={m.unit}
          icon={m.icon}
          statusText={m.statusText}
          statusType={m.statusType}
          onClick={scope.length ? m.action : undefined}
        />
      </Col>
    ))}</Row>
    {!!scope.length && <>
      <Row gutter={[16, 16]} className="pms-focus-row" style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card
            size="small"
            title={
              <Space size={8}>
                <span style={{ fontWeight: 600 }}>重点异常项目</span>
                <Tag color={exceptions.length > 0 ? 'error' : 'default'} style={{ margin: 0, borderRadius: 10 }}>
                  {exceptions.length}
                </Tag>
              </Space>
            }
            extra={<Button type="link" onClick={() => exception()}>全部异常</Button>}
          >
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={[...exceptions].sort((a, b) => (b.health === 'red' ? 1 : 0) - (a.health === 'red' ? 1 : 0) || b.calc.variance - a.calc.variance).slice(0, 3)}
              columns={[
                {
                  title: '项目',
                  width: '40%',
                  render: (_, p) => (
                    <Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left', fontWeight: 500 }} onClick={() => goProject(p.id)}>
                      {p.name}
                    </Button>
                  ),
                },
                {
                  title: '原因',
                  dataIndex: 'healthReason',
                  render: (value: string) => marginReason(value, !!canViewMargin),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            size="small"
            title={
              <Space size={8}>
                <span style={{ fontWeight: 600 }}>待决策事项</span>
                <Tag color={pending.length > 0 ? 'warning' : 'default'} style={{ margin: 0, borderRadius: 10 }}>
                  {pending.length}
                </Tag>
              </Space>
            }
            extra={<Button type="link" onClick={() => navigate(`/executive/decisions?${query()}`)}>全部事项</Button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.slice(0, 2).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '10px 12px',
                    background: '#fafbfc',
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.projectName}
                    </div>
                    <Tag color="orange" style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                      {d.type}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>
                      影响：<MoneyText value={d.impactAmount} signed />
                    </span>
                    <span style={{ color: '#94a3b8' }}>{d.level}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: 6, marginTop: 2 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      提交于 {d.createdAt}
                    </Typography.Text>
                    <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => navigate(`${d.targetRoute}?${query()}`)}>
                      查看原审批 →
                    </Button>
                  </div>
                </div>
              ))}
              {!pending.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前范围无待决策事项" style={{ margin: '12px 0' }} />}
            </div>
          </Card>
        </Col>
      </Row>
    </>}
    <Card size="small" style={{ marginBottom: 16, background: '#fafbfc' }}>
      <Space align="center" size={16} wrap>
        <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
          阶段快速穿透：
        </Typography.Text>
        <Space size={8} wrap>
          {[
            { label: '在建项目', rows: scope.filter((p) => p.phase === '执行'), metric: 'construction', color: 'blue' },
            { label: '未签立项', rows: scope.filter((p) => p.isUnsigned), metric: 'unsigned', color: 'orange' },
            { label: '验收收尾', rows: scope.filter((p) => p.phase === '收尾'), metric: 'closing', color: 'cyan' },
          ].map((group) => {
            const count = group.rows.length;
            const totalAmount = sumMoney(group.rows.map((p) => p.revenueAmount ?? p.contractAmount));
            return (
              <Tag.CheckableTag
                key={group.label}
                checked={false}
                onChange={() => count && drill({ metric: group.metric })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                  border: '1px solid #d9d9d9',
                  background: count ? '#fff' : '#f5f5f5',
                  cursor: count ? 'pointer' : 'not-allowed',
                  opacity: count ? 1 : 0.6,
                }}
              >
                <span>{group.label}</span>
                <span style={{ marginLeft: 6, fontWeight: 600, color: '#1677ff' }}>{count}</span>
                <span style={{ margin: '0 4px', color: '#bfbfbf' }}>·</span>
                <MoneyText value={totalAmount} />
              </Tag.CheckableTag>
            );
          })}
        </Space>
      </Space>
    </Card>
    {!scope.length ? <Empty description="当前筛选无项目，请调整条件" /> : <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
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

    </>}
  </>;
  return <><PageHeader title="GL-01 项目看板" description={`集团经营规模、四算、健康异常与待决策 · 更新至 ${AS_OF_DATE} 18:30 · 金额单位：万元`} breadcrumbs={[{ title: '首页', href: '/' }]} extra={<Space>{allowed && <Popover trigger="click" placement="bottomRight" title="演示场景" content={<Radio.Group value={mode} onChange={(e) => { const next = new URLSearchParams(params); next.set('demo', e.target.value); setParams(next); }} options={[{ value: 'normal', label: '正常' }, { value: 'delayed', label: '部分数据延迟' }, { value: 'empty', label: '无数据' }, { value: 'denied', label: '无权限' }, { value: 'loading', label: '计算中' }, { value: 'changed', label: '口径变更' }]} />}><Button>演示场景</Button></Popover>}<Button onClick={() => setRefresh((n) => n + 1)}>刷新数据{refresh ? `（已刷新${refresh}次）` : ''}</Button></Space>} />
    {mode === 'delayed' && <Alert showIcon type="warning" style={{ marginBottom: 16 }} message="演示：采购来源同步延迟，暂使用最近已确认快照" description="采购快照截至2026-09-08 18:30，其他来源截至2026-09-09 18:30；不把未确认金额加入已发生成本。" />}
    {mode === 'changed' && <Alert showIcon type="info" style={{ marginBottom: 16 }} message="演示口径公告：回款完成率按到期计划计算" description="分母为到期应收，不再使用合同总额。合同余额、到期应收和逾期分别展示，历史预算与结算快照不回写。" />}
    {!allowed || mode === 'denied' ? <StateView type="403" /> : mode === 'loading' ? <StateView type="loading" /> : content}
  </>;
}
