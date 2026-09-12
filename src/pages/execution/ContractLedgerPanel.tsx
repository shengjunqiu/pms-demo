// 合同台账面板：模仿 BPM「合同台账表单」结构，内含 12 个子标签。
// 金额口径与项目/合同保持一致（单位：万元），数据来自 BusinessState.contractLedgers。
import { useMemo } from 'react';
import { Card, Descriptions, Empty, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBusinessStore } from '@/mock/business';
import { MoneyText } from '@/components/common/MoneyText';
import { formatPercent } from '@/utils/money';
import type { ContractLedger } from '@/models/types';

const money2 = (value: number) => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const stageColors: Record<string, string> = { 预付款: 'blue', 进度款: 'blue', 验收款: 'gold', 终验款: 'cyan', 质保款: 'default' };
const statusColor = (status: string) => (['正常', '已完成', '已开票', '已结案'].includes(status) ? 'success' : ['待补充', '流程中', '未开票'].includes(status) ? 'processing' : 'error');

function LedgerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="small" title={title} className="mb-3">
      {children}
    </Card>
  );
}

export function ContractLedgerPanel({ projectId }: { projectId: string }) {
  const { data } = useBusinessStore();
  const project = data.projects.find((p) => p.id === projectId);
  const contracts = useMemo(() => data.contracts.filter((c) => c.projectId === projectId), [data, projectId]);
  const ledgers = useMemo(
    () => data.contractLedgers.filter((l) => l.projectId === projectId),
    [data, projectId],
  );

  if (!project || project.isUnsigned || !contracts.length || !ledgers.length) {
    return <Empty description="该项目为未签约立项，暂无合同台账" className="py-12" />;
  }

  const items = ledgers.map((ledger) => {
    const contract = contracts.find((c) => c.id === ledger.contractId)!;
    return {
      key: ledger.contractId,
      label: contract.code,
      children: <LedgerBody ledger={ledger} contractCode={contract.code} contractName={contract.name} customerName={project.customerName} />,
    };
  });

  return (
    <Card
      size="small"
      title="合同台账表单"
      extra={<Typography.Text type="secondary" className="text-xs">金额单位：万元 · 对齐 BPM 合同台账表单结构</Typography.Text>}
    >
      {items.length === 1
        ? <LedgerBody ledger={ledgers[0]} contractCode={contracts[0].code} contractName={contracts[0].name} customerName={project.customerName} />
        : <Tabs items={items} />}
    </Card>
  );
}

function LedgerBody({ ledger, contractCode, contractName, customerName }: { ledger: ContractLedger; contractCode: string; contractName: string; customerName: string }) {
  const subTabs = [
    { key: 'basic', label: '基本信息', children: <BasicTab ledger={ledger} contractCode={contractCode} contractName={contractName} customerName={customerName} /> },
    { key: 'attachments', label: `合同附件（${ledger.attachments.length}）`, children: <AttachmentTab ledger={ledger} /> },
    { key: 'changes', label: `合同变更记录（${ledger.changeRecords.length}）`, children: <ChangeTab ledger={ledger} /> },
    { key: 'receipts', label: '回款计划', children: <ReceiptTab ledger={ledger} /> },
    { key: 'maintenance', label: '维保信息', children: <MaintenanceTab ledger={ledger} /> },
    { key: 'deposit', label: '保证金回款计划', children: <DepositTab ledger={ledger} /> },
    { key: 'devices', label: `设备清单（${ledger.devices.length}）`, children: <DeviceTab ledger={ledger} /> },
    { key: 'margin', label: '毛利测算', children: <MarginTab ledger={ledger} /> },
    { key: 'tax', label: '分税点数据', children: <TaxPointTab ledger={ledger} /> },
    { key: 'invoices', label: '开票明细', children: <InvoiceTab ledger={ledger} /> },
    { key: 'litigations', label: `诉讼记录（${ledger.litigations.length}）`, children: <LitigationTab ledger={ledger} /> },
    { key: 'letters', label: `项目函件记录（${ledger.letters.length}）`, children: <LetterTab ledger={ledger} /> },
  ];
  return <Tabs size="small" items={subTabs} />;
}

// ── 基本信息 ────────────────────────────────────────────────
function BasicTab({ ledger, contractCode, contractName, customerName }: { ledger: ContractLedger; contractCode: string; contractName: string; customerName: string }) {
  const b = ledger.basic;
  return (
    <>
      <LedgerSection title="合同基本信息">
        <Descriptions size="small" bordered column={2}>
          <Descriptions.Item label="商机编号">{b.opportunityCode}</Descriptions.Item>
          <Descriptions.Item label="合同编号">{contractCode}</Descriptions.Item>
          <Descriptions.Item label="合同名称">{contractName}</Descriptions.Item>
          <Descriptions.Item label="合同类别">{b.contractType}</Descriptions.Item>
          <Descriptions.Item label="业主（甲方）">{customerName}</Descriptions.Item>
          <Descriptions.Item label="签约机构">{b.signOrg}</Descriptions.Item>
          <Descriptions.Item label="合同执行状态"><Tag color="processing">{b.execStatus}</Tag></Descriptions.Item>
          <Descriptions.Item label="合作模式">{b.cooperationMode}</Descriptions.Item>
          <Descriptions.Item label="所属大区">{b.region}</Descriptions.Item>
          <Descriptions.Item label="业务部门">{b.businessDept}</Descriptions.Item>
          <Descriptions.Item label="业务经理">{b.businessManager}</Descriptions.Item>
          <Descriptions.Item label="实施行业归属">{b.industry}</Descriptions.Item>
          <Descriptions.Item label="客户属性">{b.customerAttribute}</Descriptions.Item>
          <Descriptions.Item label="售前人员">{b.presalePerson}</Descriptions.Item>
        </Descriptions>
      </LedgerSection>
      <LedgerSection title="合同金额信息">
        <Descriptions size="small" bordered column={3}>
          <Descriptions.Item label="合同总额"><MoneyText value={b.amounts.total} /></Descriptions.Item>
          <Descriptions.Item label="合同软件额"><MoneyText value={b.amounts.software} /></Descriptions.Item>
          <Descriptions.Item label="合同硬件额"><MoneyText value={b.amounts.hardware} /></Descriptions.Item>
          <Descriptions.Item label="自主产品额"><MoneyText value={b.amounts.selfProduct} /></Descriptions.Item>
          <Descriptions.Item label="验收总金额"><MoneyText value={b.amounts.acceptanceTotal} /></Descriptions.Item>
          <Descriptions.Item label="质保金比例">{b.amounts.retentionRatio.toFixed(1)}%</Descriptions.Item>
          <Descriptions.Item label="已回款总金额"><MoneyText value={b.amounts.paidTotal} /></Descriptions.Item>
          <Descriptions.Item label="未回款总金额"><MoneyText value={b.amounts.receivableTotal} /></Descriptions.Item>
          <Descriptions.Item label="已开票总金额"><MoneyText value={b.amounts.invoicedTotal} /></Descriptions.Item>
        </Descriptions>
      </LedgerSection>
      <LedgerSection title="合同时间点信息">
        <Descriptions size="small" bordered column={3}>
          <Descriptions.Item label="约定开工日期">{b.dates.plannedStart ?? '未约定'}</Descriptions.Item>
          <Descriptions.Item label="实际开工日期">{b.dates.actualStart ?? '未约定'}</Descriptions.Item>
          <Descriptions.Item label="要求完工日期">{b.dates.plannedEnd ?? '未约定'}</Descriptions.Item>
          <Descriptions.Item label="要求初验日期">{b.dates.acceptanceDue ?? '未约定'}</Descriptions.Item>
          <Descriptions.Item label="要求终验日期">{b.dates.finalAcceptanceDue ?? '未约定'}</Descriptions.Item>
          <Descriptions.Item label="保证金应收日期">{b.dates.warrantDue ?? '未约定'}</Descriptions.Item>
        </Descriptions>
        {b.dates.remark && <Typography.Text type="secondary" className="text-xs">日期说明：{b.dates.remark}</Typography.Text>}
      </LedgerSection>
    </>
  );
}
// ── 合同附件 ────────────────────────────────────────────────
function AttachmentTab({ ledger }: { ledger: ContractLedger }) {
  const columns: ColumnsType<ContractLedger['attachments'][number]> = [
    { title: '附件类别', dataIndex: 'category', width: 120 },
    { title: '文件名', dataIndex: 'fileName' },
    { title: '状态', dataIndex: 'status', width: 100, render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag> },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.attachments} columns={columns} />;
}

// ── 合同变更记录 ────────────────────────────────────────────
function ChangeTab({ ledger }: { ledger: ContractLedger }) {
  if (!ledger.changeRecords.length) return <Empty description="暂无数据" className="py-8" />;
  const columns: ColumnsType<ContractLedger['changeRecords'][number]> = [
    { title: '变更时间', dataIndex: 'date', width: 120 },
    { title: '操作人', dataIndex: 'operator', width: 180 },
    { title: '变更项', dataIndex: 'field', width: 140 },
    { title: '变更前', dataIndex: 'before', ellipsis: true },
    { title: '变更后', dataIndex: 'after', ellipsis: true },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.changeRecords} columns={columns} />;
}

// ── 回款计划 ────────────────────────────────────────────────
function ReceiptTab({ ledger }: { ledger: ContractLedger }) {
  const total = ledger.basic.amounts.total;
  const planned = ledger.receiptPhases.reduce((sum, phase) => sum + phase.plannedAmount, 0);
  const actual = ledger.receiptPhases.reduce((sum, phase) => sum + phase.actualAmount, 0);
  const columns: ColumnsType<ContractLedger['receiptPhases'][number]> = [
    { title: '回款占比', dataIndex: 'ratio', width: 90, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '阶段金额', dataIndex: 'amount', width: 120, render: (v: number) => <MoneyText value={v} /> },
    { title: '回款阶段', dataIndex: 'stage', width: 90, render: (stage: string) => <Tag color={stageColors[stage]}>{stage}</Tag> },
    { title: '关联里程碑', dataIndex: 'milestone', width: 100 },
    { title: '预计回款日期', dataIndex: 'plannedDate', width: 120, render: (v?: string) => v ?? '未约定' },
    { title: '预计回款金额', dataIndex: 'plannedAmount', width: 120, render: (v: number) => <MoneyText value={v} /> },
    { title: '实际回款金额', dataIndex: 'actualAmount', width: 120, render: (v: number) => <MoneyText value={v} /> },
    { title: '回款进度条件', dataIndex: 'condition', ellipsis: true },
    { title: '回款负责人', dataIndex: 'owner', width: 100 },
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Statistic title="合同总额（万元）" value={money2(total)} />
        <Statistic title="预计回款合计（万元）" value={money2(planned)} />
        <Statistic title="实际回款合计（万元）" value={money2(actual)} />
      </div>
      <Table rowKey="id" size="small" pagination={false} dataSource={ledger.receiptPhases} columns={columns} />
    </>
  );
}

// ── 维保信息 ────────────────────────────────────────────────
function MaintenanceTab({ ledger }: { ledger: ContractLedger }) {
  const m = ledger.maintenance;
  if (!m) return <Empty description="暂无维保信息" className="py-8" />;
  return (
    <Descriptions size="small" bordered column={2}>
      <Descriptions.Item label="维保类型">{m.type}</Descriptions.Item>
      <Descriptions.Item label="维保期限（月）">{m.months}</Descriptions.Item>
      <Descriptions.Item label="维保开始时间">{m.startDate ?? '未约定'}</Descriptions.Item>
      <Descriptions.Item label="维保结束时间">{m.endDate ?? '未约定'}</Descriptions.Item>
      <Descriptions.Item label="维保验收情况">
        <Tag color={m.acceptanceStatus === '维保中' ? 'processing' : 'default'}>{m.acceptanceStatus}</Tag>
      </Descriptions.Item>
    </Descriptions>
  );
}

// ── 保证金回款计划 ──────────────────────────────────────────
function DepositTab({ ledger }: { ledger: ContractLedger }) {
  if (!ledger.depositPhases.length) return <Empty description="暂无数据" className="py-8" />;
  const columns: ColumnsType<ContractLedger['depositPhases'][number]> = [
    { title: '保证金类型', dataIndex: 'kind', width: 120 },
    { title: '金额', dataIndex: 'amount', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '应收/退还日期', dataIndex: 'dueDate', width: 120, render: (v?: string) => v ?? '未约定' },
    { title: '条件说明', dataIndex: 'condition', ellipsis: true },
    { title: '已退回金额', dataIndex: 'returnedAmount', width: 120, render: (v: number) => <MoneyText value={v} /> },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.depositPhases} columns={columns} />;
}

// ── 设备清单 ────────────────────────────────────────────────
function DeviceTab({ ledger }: { ledger: ContractLedger }) {
  const totalSales = ledger.devices.reduce((sum, device) => sum + device.saleTotalPrice, 0);
  const columns: ColumnsType<ContractLedger['devices'][number]> = [
    { title: '设备编号', dataIndex: 'code', width: 180 },
    { title: '货物类型', dataIndex: 'goodsType', width: 100 },
    { title: '设备名称', dataIndex: 'name', ellipsis: true },
    { title: '品牌', dataIndex: 'brand', width: 100 },
    { title: '计量单位', dataIndex: 'unit', width: 90 },
    { title: '数量', dataIndex: 'quantity', width: 80, render: (v: number) => v.toLocaleString('zh-CN') },
    { title: '设备属性', dataIndex: 'attribute', width: 100, render: (v: string) => <Tag>{v}</Tag> },
    { title: '销售单价', dataIndex: 'saleUnitPrice', width: 120, render: (v: number) => <MoneyText value={v} /> },
    { title: '销售总价', dataIndex: 'saleTotalPrice', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '供应商', dataIndex: 'supplier', width: 150, render: (v?: string) => v ?? '—' },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Statistic title="设备明细条数" value={ledger.devices.length} />
        <Statistic title="销售总价合计（万元）" value={money2(totalSales)} />
      </div>
      <Table rowKey="id" size="small" pagination={{ pageSize: 10, showSizeChanger: false }} dataSource={ledger.devices} columns={columns} scroll={{ x: 1100 }} />
    </>
  );
}

// ── 毛利测算 ────────────────────────────────────────────────
function MarginTab({ ledger }: { ledger: ContractLedger }) {
  const m = ledger.margin;
  const itemColumns: ColumnsType<ContractLedger['margin']['costItems'][number]> = [
    { title: '成本类型', dataIndex: 'type', width: 110 },
    { title: '成本类项', dataIndex: 'item', width: 220 },
    { title: '金额（万元）', dataIndex: 'amount', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '备注', dataIndex: 'note', ellipsis: true },
  ];
  return (
    <>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <Statistic title="合同收入（万元）" value={money2(m.income)} />
        <Statistic title="建设总成本（万元）" value={money2(m.totalCost)} />
        <Statistic title="销售毛利（万元）" value={money2(m.grossProfit)} suffix={<span className="text-xs text-slate-500">毛利率 {formatPercent(m.grossMarginRate)}</span>} />
        <Statistic title="净利润空间（万元）" value={money2(m.netProfit)} suffix={<span className="text-xs text-slate-500">净利率 {formatPercent(m.netProfitRate)}</span>} />
      </div>
      <Descriptions size="small" bordered column={3} className="mb-3">
        <Descriptions.Item label="合同软件额"><MoneyText value={m.softwareIncome} /></Descriptions.Item>
        <Descriptions.Item label="合同硬件额"><MoneyText value={m.hardwareIncome} /></Descriptions.Item>
        <Descriptions.Item label="自主产品额"><MoneyText value={m.selfProductIncome} /></Descriptions.Item>
        <Descriptions.Item label="总部服务费"><MoneyText value={m.hqServiceFee} /></Descriptions.Item>
        <Descriptions.Item label="售前服务费"><MoneyText value={m.presaleServiceFee} /></Descriptions.Item>
        <Descriptions.Item label="税费"><MoneyText value={m.tax} /></Descriptions.Item>
      </Descriptions>
      <Table rowKey="item" size="small" pagination={false} dataSource={m.costItems} columns={itemColumns} />
      <Typography.Text type="secondary" className="text-xs block mt-2">毛利测算为概算口径：收入=合同总额，成本合计=冻结概算版本总成本；总部服务费按软件 6%、硬件 4% 计提。</Typography.Text>
    </>
  );
}

// ── 分税点数据 ──────────────────────────────────────────────
function TaxPointTab({ ledger }: { ledger: ContractLedger }) {
  const columns: ColumnsType<ContractLedger['taxPoints'][number]> = [
    { title: '分税点名称', dataIndex: 'name', width: 130 },
    { title: '税率(%)', dataIndex: 'taxRate', width: 90 },
    { title: '收入(含税)', dataIndex: 'incomeWithTax', width: 140, render: (v: number) => <MoneyText value={v} /> },
    { title: '不含税收入', dataIndex: 'incomeWithoutTax', width: 140, render: (v: number) => <MoneyText value={v} /> },
    { title: '税收', dataIndex: 'tax', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '成本', dataIndex: 'cost', width: 130, render: (v: number) => <MoneyText value={v} /> },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.taxPoints} columns={columns} />;
}

// ── 开票明细 ────────────────────────────────────────────────
function InvoiceTab({ ledger }: { ledger: ContractLedger }) {
  const b = ledger.basic.amounts;
  const invoiced = ledger.invoices.filter((inv) => inv.invoiceStatus === '已开票').reduce((sum, inv) => sum + inv.amount, 0);
  const columns: ColumnsType<ContractLedger['invoices'][number]> = [
    { title: '申请编码', dataIndex: 'code', width: 130 },
    { title: '开票货物名称', dataIndex: 'goodsName', ellipsis: true },
    { title: '开票类型', dataIndex: 'invoiceType', width: 140 },
    { title: '申请人', dataIndex: 'applicant', width: 90 },
    { title: '申请日期', dataIndex: 'applyDate', width: 110 },
    { title: '开票申请金额', dataIndex: 'amount', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '单据流程状态', dataIndex: 'processStatus', width: 110, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
    { title: '开票状态', dataIndex: 'invoiceStatus', width: 100, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
  ];
  return (
    <>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <Statistic title="应开金额（万元）" value={money2(b.total)} />
        <Statistic title="已开票金额（台账）（万元）" value={money2(invoiced)} />
        <Statistic title="已开票总金额（合同）（万元）" value={money2(b.invoicedTotal)} />
        <Statistic title="未开票金额（万元）" value={money2(Math.max(0, b.total - invoiced))} />
      </div>
      {ledger.invoices.length
        ? <Table rowKey="id" size="small" pagination={false} dataSource={ledger.invoices} columns={columns} />
        : <Empty description="暂无开票申请" className="py-8" />}
    </>
  );
}

// ── 诉讼记录 ────────────────────────────────────────────────
function LitigationTab({ ledger }: { ledger: ContractLedger }) {
  if (!ledger.litigations.length) return <Empty description="暂无数据" className="py-8" />;
  const columns: ColumnsType<ContractLedger['litigations'][number]> = [
    { title: '申请编码', dataIndex: 'code', width: 140 },
    { title: '争议方', dataIndex: 'disputeParty', ellipsis: true },
    { title: '申请类型', dataIndex: 'applyType', width: 100 },
    { title: '涉案金额', dataIndex: 'involvedAmount', width: 130, render: (v: number) => <MoneyText value={v} /> },
    { title: '风险等级', dataIndex: 'riskLevel', width: 100, render: (v: string) => <Tag color={v === '高' ? 'error' : v === '中' ? 'warning' : 'success'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.litigations} columns={columns} />;
}

// ── 项目函件记录 ────────────────────────────────────────────
function LetterTab({ ledger }: { ledger: ContractLedger }) {
  if (!ledger.letters.length) return <Empty description="暂无数据" className="py-8" />;
  const columns: ColumnsType<ContractLedger['letters'][number]> = [
    { title: '方向', dataIndex: 'direction', width: 100, render: (v: string) => <Tag color={v === '客户来函' ? 'blue' : 'green'}>{v}</Tag> },
    { title: '函件标题', dataIndex: 'title', ellipsis: true },
    { title: '日期', dataIndex: 'date', width: 110 },
    { title: '发函方', dataIndex: 'sender', width: 200, ellipsis: true },
    { title: '摘要', dataIndex: 'summary', ellipsis: true },
  ];
  return <Table rowKey="id" size="small" pagination={false} dataSource={ledger.letters} columns={columns} />;
}