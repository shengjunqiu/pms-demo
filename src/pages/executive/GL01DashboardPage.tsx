import { useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Popover, Radio, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/store';
import { selectFourCalculations, selectProjects } from '@/mock/selectors';
import { unsignedSummary } from '@/mock/unsigned';
import { useAppStore } from '@/store/useAppStore';
import { percentage, sumMoney } from '@/utils/money';
import { readProjectFilter } from '@/utils/project-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { MoneyText } from '@/components/common/MoneyText';
import { StateView } from '@/components/common/StateView';
import { FourCalculationsPipeline } from '@/components/common/FourCalculationsPipeline';

// 健康度只留一份文案来源。原 healths 数组还自带一套十六进制色板，其中 yellow=#d4a017 与
// Tag 的 gold 是两种黄，同一状态两个色；P1-a 删掉分布图后这套色板已无消费方，随死代码移除。
const HEALTH_LABEL: Record<string, string> = { green: '健康', yellow: '需关注', orange: '预警', red: '高风险' };

// 健康度语义色：黄=需关注→gold、橙=预警→warning、红=高风险→error。
// 原映射把 yellow 落到 'processing'（蓝色），与「黄=需关注」的语义相反。
const HEALTH_TAG_COLOR: Record<string, string> = { green: 'success', yellow: 'gold', orange: 'warning', red: 'error' };
// 风险排序优先级：高风险 → 预警 → 需关注
const HEALTH_RANK: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

// 正文语义色：取 antd Tag 同一套文字色阶（error #cf1322 / orange #d46b08 / gold #d4b106 / success #389e0d），
// 使「卡片正文的颜色」和「表格里 Tag 的颜色」说的是同一件事。原先同一「危险」同时用了 #cf1322 和 #d4380d 两种红。
const TONE = { danger: '#cf1322', warn: '#d46b08', gold: '#d4b106', good: '#389e0d', muted: '#475569' } as const;

/** 金额统一千分位 + 固定两位小数。原先部分单元格用 toFixed(2)，1234.5 会显示成 1234.50 而无千分位。 */
const money = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 偏差率统一带符号两位小数。原先超支金额列无条件拼「+」，负偏差会渲染成「+-3.02」。 */
const signedPercent = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
/** 偏差率配色阈值只定义一次：超 5% 红、超预算橙、其余绿（原在两个表里各抄了一遍） */
const deviationTone = (v: number) => (v > 5 ? TONE.danger : v > 0 ? TONE.warn : TONE.good);

interface KpiTileProps {
  title: string;
  unit?: string;
  /** 提供 onDrill 即成为可下钻指标卡：补齐光标、可见焦点环与 Enter/Space 键盘契约（与 MetricStatCard 一致） */
  onDrill?: () => void;
  drillTo?: string;
  children: ReactNode;
}

function KpiTile({ title, unit, onDrill, drillTo, children }: KpiTileProps) {
  return (
    <div
      className={`pms-kpi-tile${onDrill ? ' pms-kpi-tile--interactive' : ''}`}
      onClick={onDrill}
      role={onDrill ? 'button' : undefined}
      tabIndex={onDrill ? 0 : undefined}
      aria-label={onDrill ? `${title}，查看${drillTo ?? '明细'}` : undefined}
      onKeyDown={
        onDrill
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onDrill();
              }
            }
          : undefined
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{title}</span>
        {unit ? <span style={{ fontSize: 11, color: '#64748b' }}>{unit}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function GL01DashboardPage() {
  const data = useBusinessStore((s) => s.data);
  const role = useAppStore((s) => s.currentRole);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [recomputed, setRecomputed] = useState(false);
  // 指标下钻一律走页内清单，不跳台账页：/projects 用本地 useState 存筛选，不读 URL 参数，
  // 跳过去只会「点了没变」；异常中心的 cost 分类含未签项目，与卡片口径（排除未签）对不上号。
  const [topTab, setTopTab] = useState('overview');
  const [ledgerTab, setLedgerTab] = useState('all');
  const [processTab, setProcessTab] = useState('all-process');
  const ledgerRef = useRef<HTMLDivElement>(null);
  const drill = (target: { top?: string; ledger?: string; process?: string }) => {
    setTopTab(target.top ?? 'overview');
    if (target.ledger) setLedgerTab(target.ledger);
    if (target.process) setProcessTab(target.process);
    ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
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
  const attentionProjects = scope
    .filter((p) => p.health !== 'green')
    .sort((a, b) => (HEALTH_RANK[a.health] ?? 9) - (HEALTH_RANK[b.health] ?? 9) || b.costVarianceRate - a.costVarianceRate);

  // 1. 已签约规模：已签项目的合同额合计（数据模型无「年度规划」对象，不出占比）
  const signedProjects = scope.filter((p) => !p.isUnsigned);
  const totalSignedContract = sumMoney(signedProjects.map((p) => p.contractAmount));

  // 2. 已签在建项目统计
  const signedBuildingProjects = scope.filter((p) => !p.isUnsigned && (p.phase === '执行' || p.phase === '收尾'));
  const weeklyNewSignedProjects = scope.filter((p) => !p.isUnsigned && p.phase === '执行' && p.actualStartDate && p.actualStartDate >= '2026-08-01');
  const weeklyNewSignedAmount = sumMoney(weeklyNewSignedProjects.map((p) => p.contractAmount));

  // 3. 立项未签项目统计：额度与占用取自未签投入台账的同一计算，不另立口径。
  // 额度为逐项目授权值，部分项目未设额度，合计不可比较，故不聚合比值；超限按台账逐项目规则计数
  const unsignedProjects = scope.filter((p) => p.isUnsigned);
  const unsignedLedger = unsignedProjects.map((p) => unsignedSummary(data, p));
  const totalUnsignedExposure = sumMoney(unsignedLedger.map((u) => u.exposure));
  const overLimitUnsignedIds = new Set(
    unsignedProjects.filter((_, i) => unsignedLedger[i]?.flags.includes('投入超限')).map((p) => p.id),
  );
  const overLimitUnsignedCount = overLimitUnsignedIds.size;

  // 4. 在建成本超支：项目级成本方差。数据不含在建成本科目拆分，故不做科目归因
  const overrunProjects = scope.filter((p) => p.costVariance > 0 && !p.isUnsigned);
  const totalOverrunCost = sumMoney(overrunProjects.map((p) => p.costVariance));
  const maxOverrunProject = overrunProjects.reduce<(typeof overrunProjects)[number] | undefined>(
    (max, p) => (!max || p.costVariance > max.costVariance ? p : max),
    undefined,
  );
  const overrunShare = percentage(overrunProjects.length, signedProjects.length)?.toFixed(2) ?? '0.00';

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
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>整体经营情况</span>
          {/* 数据时点常驻：原挂在 PageHeader 的 description 上，而该属性已于 2026-09-21 评审废止，时点因此不可见 */}
          <span style={{ fontSize: 12, color: '#64748b' }}>
            数据时点 {AS_OF_DATE} 18:30
            {recomputed && <span style={{ color: '#1d4ed8' }}> · 已重算，数据源未变化</span>}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* 整体项目情况 */}
          <KpiTile title="已签约总额" unit="万元" onDrill={() => drill({ ledger: 'all' })} drillTo="全部项目合同额清单">
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8' }}>{money(totalSignedContract)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              已签约 <span style={{ fontWeight: 600, color: TONE.muted }}>{signedProjects.length}</span> 个 / 在管 <span style={{ fontWeight: 600, color: TONE.muted }}>{scope.length}</span> 个
            </div>
          </KpiTile>

          {/* 已签在建 */}
          <KpiTile
            title={`已签在建项目 (${signedBuildingProjects.length}个)`}
            unit="万元"
            onDrill={() => drill({ ledger: 'signed' })}
            drillTo="已签在建项目清单"
          >
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>近期新增启动（{weeklyNewSignedProjects.length}个）</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{money(weeklyNewSignedAmount)}</div>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              累计在建存量 <span style={{ fontWeight: 600, color: TONE.muted }}>{money(sumMoney(signedBuildingProjects.map((p) => p.contractAmount)))}</span>
            </div>
          </KpiTile>

          {/* 立项未签项目 */}
          <KpiTile
            title={`立项未签控制 (${unsignedProjects.length}个)`}
            unit="万元"
            onDrill={() => drill({ ledger: 'unsigned' })}
            drillTo="立项未签项目清单"
          >
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>已占用投入</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{money(totalUnsignedExposure)}</div>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              投入超限 <span style={{ fontWeight: 600, color: overLimitUnsignedCount > 0 ? TONE.danger : TONE.muted }}>{overLimitUnsignedCount}</span> 个（逐项目判定）
            </div>
          </KpiTile>

          {/* 已签在建成本超支项目 */}
          <KpiTile
            title={`在建成本超支预警 (${overrunProjects.length}项)`}
            unit="万元"
            onDrill={() => drill({ top: 'process', process: 'construction-overrun' })}
            drillTo="成本超支重点项目清单"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>累计超支</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TONE.danger }}>{money(totalOverrunCost)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>占已签项目</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: TONE.muted }}>{overrunShare}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>最大单项</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: TONE.danger, cursor: 'help' }} title={maxOverrunProject ? `${maxOverrunProject.name}（${maxOverrunProject.code}）` : undefined}>{maxOverrunProject ? money(maxOverrunProject.costVariance) : '—'}</div>
              </div>
            </div>
          </KpiTile>
        </div>

        {/* 汇总条 */}
        <div style={{ marginTop: 12, background: 'linear-gradient(90deg, rgba(22,119,255,0.06) 0%, rgba(248,250,252,0.5) 100%)', border: '1px solid rgba(22,119,255,0.12)', borderRadius: 8, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 12, color: '#475569' }}>
            <span>立项在审项目 <strong style={{ color: '#1d4ed8' }}>{recentInitiatedProjects.length}</strong> 个，预计金额 <strong style={{ color: '#1d4ed8' }}>{recentInitiatedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>收尾及验收中项目 <strong style={{ color: '#1d4ed8' }}>{recentAcceptedProjects.length}</strong> 个，涉及金额 <strong style={{ color: '#1d4ed8' }}>{recentAcceptedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>已签在建执行项目 <strong style={{ color: '#1d4ed8' }}>{signedBuildingProjects.length}</strong> 个，在建合同额 <strong style={{ color: '#1d4ed8' }}>{sumMoney(signedBuildingProjects.map((p) => p.contractAmount)).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong> 万</span>
          </div>
        </div>
      </div>

      {/* 需关注项目：异常识别层，主因作为一等列直接呈现，不埋进页签 */}
      {attentionProjects.length ? (
        <Card
          size="small"
          style={{ marginTop: 16 }}
          title={`需关注项目 (${attentionProjects.length})`}
          extra={
            <Button type="link" style={{ padding: 0 }} onClick={() => exception()}>
              全部异常 →
            </Button>
          }
        >
          <Table
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, size: 'small', hideOnSinglePage: true }}
            dataSource={attentionProjects}
            columns={[
              { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
              { title: '健康度', dataIndex: 'health', width: 90, render: (v: string) => <Tag color={HEALTH_TAG_COLOR[v] ?? 'default'}>{HEALTH_LABEL[v] ?? v}</Tag> },
              { title: '主要风险与原因', dataIndex: 'healthReason', render: (v: string) => <span style={{ color: v ? '#334155' : '#94a3b8', fontSize: 12 }}>{v || '未登记主因'}</span> },
              { title: '当前阶段', dataIndex: 'phase', width: 90 },
              { title: '成本偏差率', dataIndex: 'costVarianceRate', width: 110, align: 'right', render: (v: number) => <span style={{ color: deviationTone(v), fontWeight: 600 }}>{signedPercent(v)}</span> },
            ]}
          />
        </Card>
      ) : null}

      {/* 整体情况 & 项目过程分析 Tabs */}
      <Card size="small" style={{ marginTop: 16 }} ref={ledgerRef}>
        <Tabs
          activeKey={topTab}
          onChange={setTopTab}
          items={[
            {
              key: 'overview',
              label: '整体情况',
              children: (
                <Tabs
                  activeKey={ledgerTab}
                  onChange={setLedgerTab}
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
                            { title: '健康度', dataIndex: 'health', width: 90, render: (v: string) => <Tag color={HEALTH_TAG_COLOR[v] ?? 'default'}>{HEALTH_LABEL[v] ?? v}</Tag> },
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
                            { title: '未签授权限额(万)', dataIndex: 'unsignedLimitQuota', align: 'right', render: (v: number | undefined, r) => (v != null ? <span style={{ color: overLimitUnsignedIds.has(r.id) ? TONE.danger : undefined, fontWeight: overLimitUnsignedIds.has(r.id) ? 600 : undefined }}>{money(v)}</span> : '—') },
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
                  activeKey={processTab}
                  onChange={setProcessTab}
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
                            { title: '偏差率', dataIndex: 'costVarianceRate', width: 100, align: 'right', render: (v: number) => <span style={{ color: deviationTone(v), fontWeight: 600 }}>{signedPercent(v)}</span> },
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
                            { title: '超支金额(万)', dataIndex: 'costVariance', align: 'right', render: (v: number) => <span style={{ color: deviationTone(v), fontWeight: 600 }}>{v > 0 ? '+' : ''}{money(v)}</span> },
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
                            { title: '关联需求数', render: (_, r) => data.requirements.filter(req => req.projectId === r.id).length },
                            { title: '累计缺陷(BUG)', render: (_, r) => data.bugs.filter(b => b.projectId === r.id).length },
                            { title: '待闭环缺陷', render: (_, r) => data.bugs.filter(b => b.projectId === r.id && b.status !== '已关闭').length || 0 },
                            { title: '交付健康状态', dataIndex: 'health', render: (v: string) => <Tag color={HEALTH_TAG_COLOR[v] ?? 'default'}>{HEALTH_LABEL[v] ?? v}</Tag> },
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

    </>
  );

  return (
    <>
      <PageHeader
        title="GL-01 项目看板"
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
            <Button onClick={() => setRecomputed(true)}>刷新数据</Button>
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
