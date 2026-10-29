import { canViewSensitiveField } from '@/mock/configuration-access';
import { marginReason } from '@/utils/sensitive';
import { useState } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { ArrowRightOutlined, DollarOutlined, FundOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { fourStage, selectFourCalculations, selectReceipts, visibleProjects } from '@/mock/selectors';
import { mockDepartments, AS_OF_DATE } from '@/mock';
import { formatPercent } from '@/utils/money';
import { StateView } from '@/components/common/StateView';
import { ProjectQualityPanel } from '@/components/common/ProjectQualityPanel';
import { MoneyText } from '@/components/common/MoneyText';
import { ContractLedgerPanel } from '@/pages/execution/ContractLedgerPanel';
import { ProjectCostPanel } from '@/pages/execution/ProjectCostPanel';
import { HealthBadge, BusinessStageBadge, DeliveryStageBadge } from '@/components/common/Badges';
import { UnsignedProjectTab } from '@/pages/unsigned/UnsignedProjectTab';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import type { BusinessState } from '@/mock/business-domain';

function ReceiptsTabContent({ projectId, role, receipt, data }: { projectId: string; role: string; receipt: ReturnType<typeof selectReceipts>; data: BusinessState }) {
  const { message } = App.useApp();
  const [showModal, setShowModal] = useState(false);
  const [contractId, setContractId] = useState<string>();
  const [sourceNo, setSourceNo] = useState('');
  const [receivedDate, setReceivedDate] = useState(AS_OF_DATE);
  const [amount, setAmount] = useState(0);
  const [evidenceFiles, setEvidenceFiles] = useState('');
  const [note, setNote] = useState('');
  const isFinance = role === 'finance';
  const contracts = data.contracts.filter((c) => c.projectId === projectId);
  const plans = data.receiptPlans.filter((p) => p.projectId === projectId && (p.amount - p.paidAmount) > 0);
  const hasConfirmedAcceptance = data.acceptances.some((a) => a.projectId === projectId && a.type === '客户终验' && a.status === '已通过') && data.acceptanceDetails && Object.values(data.acceptanceDetails).some((d) => d.confirmedAt);
  const openModal = (cId?: string) => {
    setContractId(cId ?? contracts[0]?.id);
    setSourceNo('');
    setReceivedDate(AS_OF_DATE);
    setAmount(0);
    setEvidenceFiles('');
    setNote('');
    setShowModal(true);
  };
  const submitReceipt = () => {
    try {
      useBusinessStore.getState().dispatch({
        type: 'confirm-project-receipt',
        projectId,
        contractId: contractId!,
        sourceNo,
        receivedDate,
        allocations: [{ receiptPlanId: plans[0]?.id ?? '', amount }],
        evidenceFiles: evidenceFiles.split('\n').map((f) => f.trim()).filter(Boolean),
        note,
      }, useAppStore.getState().currentUser);
      message.success('回款已登记');
      setShowModal(false);
    } catch (e) {
      message.error((e as Error).message);
    }
  };
  return <>
    {hasConfirmedAcceptance && <Alert style={{ marginBottom: 12 }} type="success" showIcon message="客户验收已通过，关联回款计划已就绪，可办理收款。" />}
    <Space size={24} style={{ marginBottom: 12 }}>
      <Statistic title="签约金额（万元）" value={receipt.signed} formatter={() => <MoneyText value={receipt.signed} />} />
      <Statistic title="已收（万元）" value={receipt.paid} formatter={() => <MoneyText value={receipt.paid} />} />
      <Statistic title="合同剩余应收（万元）" value={receipt.outstanding} formatter={() => <MoneyText value={receipt.outstanding} />} />
      {isFinance && <Button type="primary" onClick={() => openModal()}>登记回款</Button>}
    </Space>
    <Table rowKey="id" size="small" dataSource={receipt.contracts} columns={[
      { title: '合同编号', dataIndex: 'code' },
      { title: '合同名称', dataIndex: 'name' },
      { title: '实收（万元）', dataIndex: 'paidAmount', render: (v: number) => <MoneyText value={v} /> },
      ...(isFinance ? [{ title: '操作', width: 100, render: (_: unknown, r: (typeof receipt.contracts)[number]) => <Button size="small" onClick={() => openModal(r.id)}>登记回款</Button> }] : []),
    ]} />
    <Table rowKey="id" size="small" pagination={false} dataSource={receipt.plans} columns={[
      { title: '计划编号', dataIndex: 'id' },
      { title: '回款节点', dataIndex: 'title' },
      { title: '到期日期', dataIndex: 'dueDate' },
      { title: '应收（万元）', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> },
      { title: '实收（万元）', dataIndex: 'paidAmount', render: (v: number) => <MoneyText value={v} /> },
      { title: '状态', width: 110, render: (_: unknown, r: (typeof receipt.plans)[number]) => {
          if (r.paidAmount >= r.amount) return <Tag color="success">已收清</Tag>;
          if (r.collectionStatus === '待收款') return <Tag color="blue">待收款</Tag>;
          if (r.collectionStatus === '已逾期') return <Tag color="red">已逾期</Tag>;
          if (r.collectionStatus === '已核销') return <Tag color="green">已核销</Tag>;
          if (hasConfirmedAcceptance) return <Tag color="blue">待收款</Tag>;
          return <Tag>待验收</Tag>;
        } },
    ]} />
    <Text type="secondary">未签项目的预计收入不计入合同及回款；剩余应收不等同于逾期应收。</Text>
    <Modal title="登记回款" open={showModal} onCancel={() => setShowModal(false)} onOk={submitReceipt} okButtonProps={{ disabled: !isFinance || !contractId || !sourceNo || !amount }}>
      <Form layout="vertical">
        <Form.Item label="收款合同" required>
          <Select value={contractId} onChange={setContractId} options={contracts.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))} />
        </Form.Item>
        <Form.Item label="收款流水编号" required>
          <Input value={sourceNo} onChange={(e) => setSourceNo(e.target.value)} placeholder="银行回单号等" />
        </Form.Item>
        <Form.Item label="到账日期" required>
          <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
        </Form.Item>
        <Form.Item label="收款金额（万元）" required>
          <InputNumber min={0.01} precision={2} value={amount} onChange={(v) => setAmount(v ?? 0)} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="凭证文件名（每行一份）" required>
          <Input.TextArea rows={2} value={evidenceFiles} onChange={(e) => setEvidenceFiles(e.target.value)} placeholder="银行回单.pdf" />
        </Form.Item>
        <Form.Item label="收款说明" required>
          <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  </>;
}

type Detail = { title: string; fields: { label: string; value: string }[] };
const { Text } = Typography;
const healthNames = { green: '健康', yellow: '需关注', orange: '预警', red: '高风险' };

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
  const selectTab = (tab: string) => { const next = new URLSearchParams(params); if (tab === 'overview') next.delete('tab'); else next.set('tab', tab); next.delete('kind'); setParams(next); };
  const accounting = () => { const next = new URLSearchParams(params); next.delete('tab'); navigate(`/projects/${p.id}/dynamic-accounting?${next}`); };
  const open = (title: string, fields: [string, unknown][]) => setDetail({ title, fields: fields.map(([label, value]) => ({ label, value: Array.isArray(value) ? value.join('、') : String(value ?? '—') })) });
  const counts = [
    { label: '未关闭问题', value: issues.filter((i) => i.status !== '已关闭').length, kind: 'issue' },
    { label: '当前风险', value: risks.filter((r) => !['已关闭', '已缓解'].includes(r.status)).length, kind: 'risk' },
    { label: '未关闭 BUG', value: bugs.filter((b) => b.status !== '已关闭').length, kind: 'bug' },
    { label: '未关闭需求', value: requirements.filter((r) => r.status !== '已关闭').length, kind: 'requirement' },
  ];
  // 工作区状态卡片：顺序与项目导航分组一致，只取现有业务数据，点击进入对应独立页
  const changes = data.changes.filter((c) => c.projectId === p.id);
  const workspaceCards = [
    { key: 'plan', title: '计划', path: 'milestones', facts: [`里程碑 ${milestones.filter((m) => m.status === '已达成').length}/${milestones.length} 已达成`, `${milestones.filter((m) => m.status === '逾期未达成').length} 项逾期`] },
    { key: 'cost', title: '预算与成本', path: 'dynamic-accounting', facts: [`有效预算 ${calc.budget?.totalAmount?.toFixed(1) ?? '—'} 万元`, `预测偏差 ${calc.variance > 0 ? '+' : ''}${calc.variance.toFixed(1)} 万元`] },
    { key: 'collab', title: '执行协作', path: 'tickets', facts: [`未关闭事项 ${counts.reduce((sum, c) => sum + c.value, 0)} 项`, `变更 ${changes.length} 项`, `交付物 ${materials.filter((m) => m.status.includes('通过')).length}/${materials.length} 已审核`] },
    { key: 'acceptance', title: '验收结算', path: 'internal-acceptance', facts: [`验收记录 ${acceptances.length} 条`, data.lockedProjects.includes(p.id) ? '建设期成本已冻结' : '尚未结算'] },
  ];
  const overview = <>
  <Row gutter={12} style={{ marginBottom: 16 }}>
    {workspaceCards.map((card) => (
      <Col span={6} key={card.key}>
        <button type="button" onClick={() => navigate(`/projects/${p.id}/${card.path}`)} className="w-full text-left rounded-lg border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-800">{card.title}<ArrowRightOutlined className="text-slate-300 text-xs" /></div>
          <div className="mt-1.5 text-xs text-slate-500 leading-5">{card.facts.join(' · ')}</div>
        </button>
      </Col>
    ))}
  </Row>
  <Row gutter={20}>
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
                onClick={() => navigate(`/projects/${p.id}/tickets?kind=${c.kind}`)}
              />
            </Col>
          ))}
        </Row>
      </Card>
      </Col>
    <Col span={10}>
      <Card title="关键里程碑" size="small" className="h-full">
        <div className="flex flex-col gap-2">
          {milestones.map((m) => {
            const isDone = m.status === '已达成';
            const isOverdue = m.status === '逾期未达成';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 border-b border-slate-100 px-1 py-2.5 last:border-b-0 transition-colors cursor-pointer hover:bg-slate-50/80 ${isOverdue ? 'bg-rose-50/40' : ''}`}
                onClick={() => open(m.name, [['编号', m.id], ['计划日期', m.plannedDate], ['实际日期', m.actualDate], ['状态', m.status], ['必交材料', m.requiredDeliverables], ['责任人', p.pmName]])}
              >
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                  isOverdue ? 'bg-rose-500' : isDone ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 truncate">{m.name}</span>
                    <Tag color={isOverdue ? 'error' : isDone ? 'success' : 'processing'} className="m-0 text-xs leading-none px-1.5 py-0.5 flex-shrink-0">
                      {m.status}
                    </Tag>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>计划: {m.plannedDate}</span>
                    {m.actualDate && <span>实际: {m.actualDate}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </Col>
  </Row>
  </>;
  const tabs = [
    { key: 'overview', label: '项目概览', children: overview },
    { key: 'quality', label: '质量', children: <ProjectQualityPanel projectId={p.id} /> },
    { key: 'project-cost', label: '成本核算表', children: <ProjectCostPanel projectId={p.id} /> },
    { key: 'contract', label: '合同与回款', children: <><ContractLedgerPanel projectId={p.id} /><div style={{ marginTop: 16 }}><ReceiptsTabContent projectId={p.id} role={role} receipt={receipt} data={data} /></div></> },
    ...(p.isUnsigned ? [{ key: 'unsigned', label: '未签管控', children: <UnsignedProjectTab projectId={p.id} /> }] : []),
    { key: 'audit', label: '操作记录', children: <Timeline items={[...data.audit.filter((a) => a.target === p.id).map((a) => ({ children: `${a.date} ${a.actor} · ${a.action}` })), ...data.baselines.filter((b) => b.projectId === p.id).map((b) => ({ children: `${b.createdAt} 基线 ${b.version} · ${b.status} · ${b.scopeDesc}` }))]} /> },
  ];
  const summaryItems = [
      { key: 'source', label: '来源商机', children: source ? <Button type="link" size="small" onClick={() => open(source.name, [['商机编号', source.code], ['客户', source.customerName], ['负责人', source.ownerName], ['状态', source.status], ['概算版本', calc.estimate?.version], ['关联项目', p.id]])}>{source.code}</Button> : '无关联商机' },
      { key: 'customer', label: '客户', children: p.customerName }, { key: 'pm', label: '主项目经理', children: p.pmName }, { key: 'org', label: '主责部门', children: p.departmentName },
      { key: 'phase', label: '执行阶段', children: <div className="flex items-center gap-1.5"><BusinessStageBadge stage={p.phase} /><DeliveryStageBadge stage={p.subPhase} /></div> },
      { key: 'status', label: '健康度', children: <HealthBadge status={healthNames[p.health]} /> }, { key: 'contract', label: '合同状态', children: p.isUnsigned ? <Tag color="warning">已立项未签约</Tag> : <Tag color="success">已签约</Tag> },
      { key: 'income', label: '拟签/项目收入', children: <><MoneyText value={calc.income} /> 万元</> }, { key: 'margin', label: '预测毛利率', children: showMargin?formatPercent(calc.grossMarginRate):'已隐藏' }, { key: 'date', label: '计划验收', children: p.plannedEndDate },
      { key: 'director', label: '项目总监（演示任命）', children: mockDepartments.find((d) => d.id === mockDepartments.find((org) => org.id === p.departmentId)?.parentId)?.leader ?? '王总' },
      { key: 'description', label: '项目描述', span: 3, children: p.description ?? '暂无描述' },
      { key: 'actual', label: '已发生成本', children: <><MoneyText value={calc.actual} /> 万元</> }, { key: 'signed', label: '已签合同金额', children: <><MoneyText value={receipt.signed} /> 万元</> },
    ];
  // 旧链接 ?tab=contract-ledger / receipts 归并到"合同与回款"；已删除的 Tab 回到概览
  const legacyTab: Record<string, string> = { 'contract-ledger': 'contract', receipts: 'contract' };
  const activeTab = tabs.some((tab) => tab.key === (legacyTab[currentTab] ?? currentTab)) ? (legacyTab[currentTab] ?? currentTab) : 'overview';
  return <div>
    {/* 顶部 Hero 实体卡片 */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3 shadow-2xs">
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
              <span>•</span>
              <span>创建日期: <strong className="text-slate-700 font-medium">{p.createdAt}</strong></span>
            </div>
          </div>
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
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-600">更多项目元数据（来源商机、总监、签约金额等）</summary>
        <Descriptions style={{ marginTop: 10 }} column={3} size="small" items={summaryItems.filter((item) => !['customer', 'pm', 'date', 'income', 'actual', 'margin', 'status', 'phase', 'contract'].includes(item.key))} />
      </details>
    </div>

    <div className="grid grid-cols-4 gap-3 mb-2">
      {['概算', '预算', '核算', '结算及运维'].map((title, i) => {
        const currentIdx = ['概算', '预算', '核算', '结算及运维'].indexOf(fourStage(p));
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        const stageAmounts = [calc.estimate?.totalCost, calc.budget?.totalAmount, calc.rolling, calc.settlement?.finalCost];
        return (
          <div
            key={title}
            className={`rounded-xl border px-4 py-3 transition-all ${
              isActive
                ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                : isPast
                  ? 'bg-white border-emerald-200 shadow-2xs'
                  : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-blue-600' : isPast ? 'bg-emerald-500' : 'bg-slate-300'
              }`} />
              <span className={`text-sm font-semibold ${
                isActive ? 'text-blue-700' : isPast ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {title}
              </span>
              {isActive && (
                <span className="ml-auto text-xs font-medium text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded-full">当前</span>
              )}
              {isPast && (
                <span className="ml-auto text-xs font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded-full">已完成</span>
              )}
            </div>
            <div className={`text-xs font-mono ${
              isActive ? 'text-blue-600' : isPast ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {stageAmounts[i] != null
                ? `${stageAmounts[i]!.toFixed(1)} 万元`
                : isActive
                  ? '核算中'
                  : '—'
              }
            </div>
          </div>
        );
      })}
    </div>

    <div className="pms-project-tabs">
      <Tabs aria-label="项目概览视图" activeKey={activeTab} onChange={selectTab} items={tabs} />
    </div>
    <Drawer title={detail?.title ?? '原始业务记录'} open={!!detail} onClose={() => setDetail(undefined)} width={560}>{detail ? <Descriptions bordered column={1} items={detail.fields.map((field) => ({ key: field.label, label: field.label, children: field.value }))} /> : <Empty />}</Drawer>
  </div>;
}
