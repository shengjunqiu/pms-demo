import { canViewSensitiveField } from '@/mock/configuration-access';
import { marginReason } from '@/utils/sensitive';
import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, Progress, Row, Select, Space, Statistic, Steps, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, DollarOutlined, FundOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { fourStage, selectFourCalculations, selectReceipts, visibleProjects } from '@/mock/selectors';
import { mockUsers, mockProcurements, mockOutsources, mockDepartments } from '@/mock';
import { formatPercent } from '@/utils/money';
import { StateView } from '@/components/common/StateView';
import { ProjectQualityPanel } from '@/components/common/ProjectQualityPanel';
import { MoneyText } from '@/components/common/MoneyText';
import { HealthBadge, BusinessStageBadge, DeliveryStageBadge } from '@/components/common/Badges';
import { MetricStatCard } from '@/components/common/MetricStatCard';

type Detail = { title: string; fields: { label: string; value: string }[] };
const { Text } = Typography;
const healthNames = { green: '健康', yellow: '关注', orange: '预警', red: '高风险' };

export function ProjectOverviewPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole);
  const [detail, setDetail] = useState<Detail>();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return <StateView type="404" title="项目不存在" />;
  const showMargin=!!canViewSensitiveField(data,{role},'margin');
  const allowed = visibleProjects(role, data.projects, data);
  if (!allowed.some((p) => p.id === id)) return <StateView type="403" />;
  const p = project; const source = data.opportunities.find((o) => o.id === p.opportunityId); const calc = selectFourCalculations(p, data); const receipt = selectReceipts([p], data);
  const milestones = data.milestones.filter((m) => m.projectId === p.id);
  const issues = data.issues.filter((i) => i.projectId === p.id);
  const risks = data.risks.filter((r) => r.projectId === p.id);
  const bugs = data.bugs.filter((b) => b.projectId === p.id);
  const requirements = data.requirements.filter((r) => r.projectId === p.id);
  const materials = data.materials.filter((m) => m.projectId === p.id);
  const acceptances = data.acceptances.filter((a) => a.projectId === p.id);
  const currentTab = params.get('tab') ?? 'overview';
  const selectTab = (tab: string, kind?: string) => { const next = new URLSearchParams(params); next.set('tab', tab); if (kind) next.set('kind', kind); else next.delete('kind'); setParams(next); };
  const accounting = () => { const next = new URLSearchParams(params); next.delete('tab'); navigate(`/projects/${p.id}/dynamic-accounting?${next}`); };
  const open = (title: string, fields: [string, unknown][]) => setDetail({ title, fields: fields.map(([label, value]) => ({ label, value: Array.isArray(value) ? value.join('、') : String(value ?? '—') })) });
  const marker = (status: string) => <Tag color={status.includes('通过') || status.includes('完成') || status.includes('已达成') ? 'success' : status.includes('整改') || status.includes('逾期') ? 'error' : 'processing'}>{status}</Tag>;
  const milestoneView = <Timeline items={milestones.map((m) => ({ color: m.status === '已达成' ? 'green' : m.status === '逾期未达成' ? 'red' : 'blue', children: <Space wrap><Button type="link" size="small" onClick={() => open(m.type, [['编号', m.id], ['计划日期', m.plannedDate], ['实际日期', m.actualDate], ['状态', m.status], ['必交材料', m.requiredDeliverables], ['责任人', p.pmName]])}>{m.type}</Button>{marker(m.status)}<Text type="secondary">{m.plannedDate}</Text></Space> }))} />;
  const counts = [
    { label: '未关闭问题', value: issues.filter((i) => i.status !== '已关闭').length, tab: 'risks' },
    { label: '当前风险', value: risks.filter((r) => !['已关闭', '已缓解'].includes(r.status)).length, tab: 'risks' },
    { label: '未关闭 BUG', value: bugs.filter((b) => b.status !== '已关闭').length, tab: 'requirements', kind: 'BUG' },
    { label: '未关闭需求', value: requirements.filter((r) => r.status !== '已关闭').length, tab: 'requirements', kind: '需求' },
  ];
  const overview = <Row gutter={20}>
    <Col span={14}>
      <Card title="项目经营摘要" size="small">
        <Row gutter={[0, 0]} className="pms-summary-metrics">{[
          { label: '有效预算', value: calc.budget?.totalAmount, icon: <FundOutlined /> },
          { label: '滚动预测成本', value: calc.rolling, icon: <LineChartOutlined /> },
          { label: '预测成本偏差', value: calc.variance, icon: <DollarOutlined />, signed: true, statusText: calc.variance > 0 ? '超预算' : '成本受控', statusType: calc.variance > 0 ? ('danger' as const) : ('healthy' as const) },
          { label: '预测毛利', value: !showMargin ? '已隐藏' : calc.grossMargin, icon: <LineChartOutlined />, unit: !showMargin ? '' : '万元' },
        ].map((m) => (
          <Col span={12} key={m.label}>
            <MetricStatCard
              variant="flat"
              signed={m.signed}
              title={m.label}
              value={m.value ?? '—'}
              unit={m.unit ?? (m.value !== undefined ? '万元' : '')}
              icon={m.icon}
              statusText={m.statusText}
              statusType={m.statusType}
              onClick={accounting}
            />
          </Col>
        ))}</Row>
        <div className="mt-3">
          <Button type="link" onClick={accounting} className="p-0">查看动态核算与原始凭证 <ArrowRightOutlined /></Button>
        </div>
      </Card>
      <Card title="当前事项" size="small" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          {counts.map((c) => (
            <Col span={6} key={c.label}>
              <MetricStatCard
                variant="flat"
                title={c.label}
                value={String(c.value)}
                unit="项"
                statusText={c.value > 0 ? '待处理' : '已清空'}
                statusType={c.value > 0 ? (c.label.includes('BUG') || c.label.includes('问题') ? 'danger' : 'warning') : 'healthy'}
                onClick={() => selectTab(c.tab, 'kind' in c ? c.kind : undefined)}
              />
            </Col>
          ))}
        </Row>
      </Card>
      <Card title="最近动态" size="small" style={{ marginTop: 16 }}>{data.dailyReports.filter((r) => r.projectId === p.id).slice(0, 1).map((r) => <div key={r.id}><Text strong>{r.date} · {r.reporter}</Text><p>{r.completedTasks}</p><Button size="small" onClick={() => selectTab('reports')}>查看日报周报</Button></div>)}</Card>
    </Col>
    <Col span={10}><Card title="关键里程碑" size="small">{milestoneView}</Card><Card title="验收与交付" size="small" style={{ marginTop: 16 }}><p>材料审核通过 {materials.filter((m) => m.status === '通过').length} / {materials.length} 项</p><Progress percent={materials.length ? Math.round(materials.filter((m) => m.status === '通过').length / materials.length * 100) : 0} /><Space><Button onClick={() => selectTab('deliverables')}>交付物清单</Button><Button onClick={() => selectTab('acceptance')}>验收记录</Button></Space></Card></Col>
  </Row>;
  const riskRows = [...issues.map((i) => ({ id: i.id, kind: '问题', title: i.title, level: i.severity, status: i.status, owner: i.owner, date: i.deadline, source: i.fromRiskId ?? '直接登记' })), ...risks.map((r) => ({ id: r.id, kind: '风险', title: r.title, level: r.level, status: r.status, owner: r.owner, date: r.identifiedDate, source: r.strategy }))];
  const demandRows = [...requirements.map((r) => ({ ...r, kind: '需求', level: r.priority })), ...bugs.map((b) => ({ ...b, kind: 'BUG', level: b.severity }))];
  const baseColumns = [{ title: '编号', dataIndex: 'id' }, { title: '名称', dataIndex: 'title' }, { title: '状态', dataIndex: 'status', render: marker }];
  const tabs = [
    { key: 'overview', label: '项目概览', children: overview },
    { key: 'team', label: '团队', children: <Table rowKey="id" size="small" pagination={false} dataSource={mockUsers.filter((u) => u.id === p.pmId || (data.projectTeams[p.id]?.members.filter((m) => m.active).map((m) => m.userId) ?? p.memberIds ?? []).includes(u.id))} columns={[{ title: '人员', dataIndex: 'name' }, { title: '角色', render: (_, u) => u.id === p.pmId ? <Tag color="blue">主项目经理</Tag> : u.role }, { title: '所属部门', render: (_, u) => mockDepartments.find((d) => d.id === u.departmentId)?.name ?? '—' }, { title: '联系邮箱', dataIndex: 'email', render: (value: string) => canViewSensitiveField(data,{role},'contact') ? value : '已隐藏' }]} /> },
    { key: 'progress', label: '计划进度', children: <>{milestoneView}<Table rowKey="id" size="small" dataSource={data.tasks.filter((t) => t.projectId === p.id)} columns={[{ title: '工作包', dataIndex: 'name' }, { title: '责任人', dataIndex: 'ownerName' }, { title: '计划开始', dataIndex: 'startDate' }, { title: '计划完成', dataIndex: 'endDate' }, { title: '进度', dataIndex: 'progress', render: (v: number) => <Progress percent={v} size="small" /> }]} /></> },
    { key: 'four', label: '四算', children: <><Descriptions bordered column={2} items={[
      { key: 'estimate', label: `概算 ${calc.estimate?.version ?? '无有效版本'}`, children: <MoneyText value={calc.estimate?.totalCost} /> },
      { key: 'budget', label: `预算 ${calc.budget?.version ?? '无有效版本'}`, children: <MoneyText value={calc.budget?.totalAmount} /> },
      { key: 'rolling', label: '动态核算', children: <Button type="link" onClick={accounting}><MoneyText value={calc.rolling} /></Button> },
      { key: 'settled', label: '已冻结结算', children: calc.settlement ? <MoneyText value={calc.settlement.finalCost} /> : '尚未结算' },
    ]} /><p>概算引用冻结版本；预算引用当前生效版本；结算未发生时显示“尚未结算”。金额单位：万元。</p></> },
    { key: 'cost', label: '成本', children: <><Table rowKey="subjectId" size="small" pagination={false} dataSource={calc.subjects} columns={[{ title: '科目', dataIndex: 'subjectName' }, ...(['budget', 'actual', 'rolling', 'variance'] as const).map((key, i) => ({ title: ['预算', '已发生', '滚动成本', '偏差'][i], dataIndex: key, render: (v: number) => <MoneyText value={v} /> }))]} /><Button type="primary" onClick={accounting}>进入动态核算查看凭证</Button></> },
    { key: 'quality', label: '质量', children: <ProjectQualityPanel projectId={p.id} /> },
    { key: 'reports', label: '日报周报', children: <><Space style={{ marginBottom: 12 }}><Button onClick={() => navigate(`/projects/${p.id}/daily-reports`)}>填报或查看日报</Button><Button onClick={() => navigate(`/projects/${p.id}/weekly-reports`)}>生成或查看周报</Button></Space><Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={data.dailyReports.filter((r) => r.projectId === p.id)} columns={[{ title: '日期', dataIndex: 'date' }, { title: '填报人', dataIndex: 'reporter' }, { title: '完成工作', dataIndex: 'completedTasks' }, { title: '下一步', dataIndex: 'plannedTasks' }]} /><Table rowKey="id" size="small" dataSource={data.weeklyReports.filter((r) => r.projectId === p.id)} columns={[{ title: '周报周期', dataIndex: 'weekSpan' }, { title: '进度摘要', dataIndex: 'progressSummary' }, { title: '下周计划', dataIndex: 'nextWeekPlan' }]} /></> },
    { key: 'risks', label: `问题风险（${riskRows.length}）`, children: <><Button style={{ marginBottom: 12 }} onClick={() => navigate(`/issues-risks?projectId=${p.id}`)}>进入问题风险台账</Button><Table rowKey="id" size="small" pagination={{ pageSize: 8 }} dataSource={riskRows} columns={[{ title: '类型', dataIndex: 'kind' }, { title: '标题', dataIndex: 'title', render: (title: string, r) => <Button type="link" onClick={() => open(title, [['编号', r.id], ['类型', r.kind], ['等级', r.level], ['责任人', r.owner], ['状态', r.status], ['日期', r.date], ['来源/策略', r.source]])}>{title}</Button> }, { title: '等级', dataIndex: 'level' }, { title: '责任人', dataIndex: 'owner' }, { title: '状态', dataIndex: 'status', render: marker }]} /></> },
    { key: 'requirements', label: `需求BUG（${demandRows.length}）`, children: <><Button style={{ marginRight: 12 }} onClick={() => navigate(`/requirements-bugs?projectId=${p.id}`)}>进入需求BUG台账</Button><Select aria-label="事项类型" value={params.get('kind') ?? '全部'} style={{ width: 140, marginBottom: 12 }} options={['全部', '需求', 'BUG'].map((value) => ({ value, label: value }))} onChange={(value) => selectTab('requirements', value === '全部' ? undefined : value)} /><Table rowKey="id" size="small" pagination={{ pageSize: 8 }} dataSource={demandRows.filter((row) => !params.get('kind') || row.kind === params.get('kind'))} columns={[{ title: '类型', dataIndex: 'kind' }, { title: '标题', dataIndex: 'title', render: (title: string, r) => <Button type="link" onClick={() => open(title, [['编号', r.id], ['发起人', r.creator], ['责任人', r.owner], ['优先级/严重度', r.level], ['状态', r.status]])}>{title}</Button> }, { title: '责任人', dataIndex: 'owner' }, { title: '状态', dataIndex: 'status', render: marker }] } /></> },
    { key: 'supply', label: '采购外包', children: <><Space style={{ marginBottom: 12 }}><Button onClick={() => navigate(`/projects/${p.id}/procurement`)}>进入采购申请与归集</Button><Button onClick={() => navigate(`/projects/${p.id}/outsourcing`)}>进入外包履约与归集</Button><Button onClick={() => navigate(`/projects/${p.id}/expenses`)}>进入项目费用</Button></Space><Table rowKey="id" size="small" dataSource={[...data.costOrders.filter((r) => r.projectId === p.id && r.kind !== 'expense').map((r) => ({ ...r, title: `${r.title} · ${r.supplier}` })), ...mockProcurements.filter((r) => r.projectId === p.id).map((r) => ({ ...r, title: r.supplierName })), ...mockOutsources.filter((r) => r.projectId === p.id).map((r) => ({ ...r, title: r.vendorName }))]} columns={[...baseColumns, { title: '单据金额（万元）', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> }]} /></> },
    { key: 'changes', label: '变更', children: <Table rowKey="id" size="small" dataSource={data.changes.filter((c) => c.projectId === p.id)} columns={[...baseColumns, { title: '成本影响（万元）', dataIndex: 'costImpact', render: (v: number) => <MoneyText value={v} signed /> }, { title: '工期影响（天）', dataIndex: 'scheduleImpactDays' }]} /> },
    { key: 'deliverables', label: '交付物', children: <Table rowKey="id" size="small" pagination={false} dataSource={materials} columns={[{ title: '材料', dataIndex: 'name' }, { title: '要求', dataIndex: 'required', render: (required: boolean) => required ? '必交' : '可选' }, { title: '审核状态', dataIndex: 'status', render: marker }]} /> },
    { key: 'acceptance', label: '验收结算', children: <><Table rowKey="id" size="small" pagination={false} dataSource={acceptances} columns={[{ title: '验收类型', dataIndex: 'type' }, { title: '轮次', dataIndex: 'round' }, { title: '状态', dataIndex: 'status', render: marker }, { title: '确认日期', dataIndex: 'acceptanceDate', render: (v?: string) => v ?? '尚未确认' }]} /><p>建设期成本：{data.lockedProjects.includes(p.id) ? <Tag color="success">已冻结</Tag> : <Tag>未结算</Tag>}</p></> },
    { key: 'receipts', label: '回款', children: <><Space size={24}><Statistic title="签约金额（万元）" value={receipt.signed} formatter={() => <MoneyText value={receipt.signed} />} /><Statistic title="已收（万元）" value={receipt.paid} formatter={() => <MoneyText value={receipt.paid} />} /><Statistic title="合同剩余应收（万元）" value={receipt.outstanding} formatter={() => <MoneyText value={receipt.outstanding} />} /></Space><Table rowKey="id" size="small" dataSource={receipt.contracts} columns={[{ title: '合同编号', dataIndex: 'code' }, { title: '合同名称', dataIndex: 'name' }, { title: '实收（万元）', dataIndex: 'paidAmount', render: (v: number) => <MoneyText value={v} /> }]} /><Table rowKey="id" size="small" pagination={false} dataSource={receipt.plans} columns={[{ title: '计划编号', dataIndex: 'id' }, { title: '回款节点', dataIndex: 'title' }, { title: '到期日期', dataIndex: 'dueDate' }, { title: '应收（万元）', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> }, { title: '实收（万元）', dataIndex: 'paidAmount', render: (v: number) => <MoneyText value={v} /> }]} /><Text type="secondary">未签项目的预计收入不计入合同及回款；剩余应收不等同于逾期应收。</Text></> },
    { key: 'audit', label: '操作记录', children: <Timeline items={[...data.audit.filter((a) => a.target === p.id).map((a) => ({ children: `${a.date} ${a.actor} · ${a.action}` })), ...data.baselines.filter((b) => b.projectId === p.id).map((b) => ({ children: `${b.createdAt} 基线 ${b.version} · ${b.status} · ${b.scopeDesc}` }))]} /> },
  ];
  const summaryItems = [
      { key: 'source', label: '来源商机', children: source ? <Button type="link" size="small" onClick={() => open(source.name, [['商机编号', source.code], ['客户', source.customerName], ['负责人', source.ownerName], ['状态', source.status], ['概算版本', calc.estimate?.version], ['关联项目', p.id]])}>{source.code}</Button> : '无关联商机' },
      { key: 'customer', label: '客户', children: p.customerName }, { key: 'pm', label: '主项目经理', children: p.pmName }, { key: 'org', label: '主责部门', children: p.departmentName },
      { key: 'phase', label: '执行阶段', children: <div className="flex items-center gap-1.5"><BusinessStageBadge stage={p.phase} /><DeliveryStageBadge stage={p.subPhase} /></div> },
      { key: 'status', label: '健康度', children: <HealthBadge status={healthNames[p.health]} /> }, { key: 'contract', label: '合同状态', children: p.isUnsigned ? <Tag color="warning">已立项未签约</Tag> : <Tag color="success">已签约</Tag> },
      { key: 'income', label: '拟签/项目收入', children: <><MoneyText value={calc.income} /> 万元</> }, { key: 'margin', label: '预测毛利率', children: showMargin?formatPercent(calc.grossMarginRate):'已隐藏' }, { key: 'date', label: '计划验收', children: p.plannedEndDate },
      { key: 'director', label: '项目总监（演示任命）', children: mockDepartments.find((d) => d.id === mockDepartments.find((org) => org.id === p.departmentId)?.parentId)?.leader ?? '王总' },
      { key: 'actual', label: '已发生成本', children: <><MoneyText value={calc.actual} /> 万元</> }, { key: 'signed', label: '已签合同金额', children: <><MoneyText value={receipt.signed} /> 万元</> },
    ];
  const groups = [
    { key: 'overview', label: '项目总览', tabs: ['overview', 'team', 'audit'] },
    { key: 'delivery', label: '计划与交付', tabs: ['progress', 'quality', 'deliverables'] },
    { key: 'finance', label: '成本与四算', tabs: ['four', 'cost', 'supply', 'changes'] },
    { key: 'collaboration', label: '协作事项', tabs: ['reports', 'risks', 'requirements'] },
    { key: 'settlement', label: '验收与回款', tabs: ['acceptance', 'receipts'] },
  ];
  const activeGroup = groups.find((group) => group.tabs.includes(currentTab)) ?? groups[0];
  const activeTab = tabs.some((tab) => tab.key === currentTab) ? currentTab : 'overview';
  return <div>
    {/* 顶部 Hero 实体卡片 */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
            {p.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{p.code}</span>
              <h1 className="text-lg font-bold text-slate-900 m-0 tracking-tight">{p.name}</h1>
              <HealthBadge status={healthNames[p.health]} />
              <BusinessStageBadge stage={p.phase} />
              <DeliveryStageBadge stage={p.subPhase} />
              {p.isUnsigned ? <Tag color="warning" className="m-0">未签约立项</Tag> : <Tag color="success" className="m-0">已签约</Tag>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>客户: <strong className="text-slate-700 font-medium">{p.customerName}</strong></span>
              <span>•</span>
              <span>主责部门: <strong className="text-slate-700 font-medium">{p.departmentName}</strong></span>
              <span>•</span>
              <span>主项目经理: <strong className="text-slate-700 font-medium">{p.pmName}</strong></span>
              <span>•</span>
              <span>计划交付: <strong className="text-slate-700 font-medium">{p.plannedEndDate}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <Select
            aria-label="切换项目"
            value={p.id}
            style={{ width: 230 }}
            options={allowed.map((row) => ({ value: row.id, label: `${row.id} ${row.name}` }))}
            onChange={(value) => navigate(`/projects/${value}?${params}`)}
          />
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>

      {/* 实体状态与异常提示 */}
      <div className="mt-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex-1">
          <Alert
            showIcon
            type={p.health === 'red' ? 'error' : p.health === 'green' ? 'success' : 'warning'}
            message={<span className="text-xs font-medium">{marginReason(p.healthReason, showMargin)}</span>}
            className="py-1 px-3 rounded-lg border-0"
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          <span>预计收入: <strong className="text-slate-800 text-sm font-semibold"><MoneyText value={calc.income} /></strong> 万元</span>
          <span>已发生成本: <strong className="text-slate-800 text-sm font-semibold"><MoneyText value={calc.actual} /></strong> 万元</span>
          <span>预测毛利率: <strong className="text-blue-600 text-sm font-semibold">{showMargin ? formatPercent(calc.grossMarginRate) : '已隐藏'}</strong></span>
        </div>
      </div>

      <details className="pms-project-meta pt-2 mt-2 border-t border-slate-100">
        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">更多项目元数据（来源商机、总监、签约金额等）</summary>
        <Descriptions style={{ marginTop: 10 }} column={3} size="small" items={summaryItems.filter((item) => !['customer', 'pm', 'date', 'income', 'actual', 'margin', 'status', 'phase', 'contract'].includes(item.key))} />
      </details>
    </div>

    <div className="pms-project-lifecycle bg-white p-3.5 border border-slate-200 rounded-lg mb-4 flex items-center justify-between">
      <div className="text-xs font-semibold text-slate-700 mr-4 flex-shrink-0">四算生命周期进展:</div>
      <Steps size="small" style={{ flex: 1, minWidth: 420 }} current={['概算', '预算', '核算', '结算及运维'].indexOf(fourStage(p))} items={['概算', '预算', '核算', '结算及运维'].map((title) => ({ title }))} />
    </div>

    <div className="pms-project-tabs">
      <Tabs className="pms-project-groups" activeKey={activeGroup.key} onChange={(key) => selectTab(groups.find((group) => group.key === key)!.tabs[0])} items={groups.map(({ key, label }) => ({ key, label }))} />
      <Tabs size="small" type="card" activeKey={activeTab} onChange={selectTab} items={tabs.filter((tab) => activeGroup.tabs.includes(tab.key))} />
    </div>
    <Drawer title={detail?.title ?? '原始业务记录'} open={!!detail} onClose={() => setDetail(undefined)} width={560}>{detail ? <Descriptions bordered column={1} items={detail.fields.map((field) => ({ key: field.label, label: field.label, children: field.value }))} /> : <Empty />}</Drawer>
  </div>;
}
