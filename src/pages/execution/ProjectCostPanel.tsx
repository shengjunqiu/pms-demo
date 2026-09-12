// 项目成本面板：对齐 BPM「项目成本」模块——顶部指标卡 + 项目核算情况概览。
// 金额单位：万元；成本结余=概算-实际；成本使用率=实际/概算（概算为 0 时显示 —）；
// 表尾口径：总营业成本=项目成本总计；销售净利=毛利-服务费-税费（税费=毛利25%，毛利为负按收入8%）。
import { useMemo } from 'react';
import { Card, Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBusinessStore } from '@/mock/business';
import { MoneyText } from '@/components/common/MoneyText';
import { formatPercent } from '@/utils/money';
import type { ProjectCostOverview } from '@/models/types';

const sumBy = (rows: { estimateCost: number; budgetCost: number; actualCost: number }[], key: 'estimateCost' | 'budgetCost' | 'actualCost') =>
  rows.reduce((sum, row) => sum + row[key], 0);

interface DisplayRow {
  key: string;
  category?: string; categorySpan?: number; // undefined=默认1，0=被上方合并
  item?: string; itemSpan?: number;
  subject: string;
  estimate?: number;
  budget?: number;
  actual?: number;
  kind: 'subject' | 'subtotal' | 'categoryTotal' | 'footerMoney' | 'footerRate';
  strong?: boolean;
}

interface SummaryCards {
  estimateMarginRate: number | null;
  budgetMarginRate: number | null;
  actualMarginRate: number | null;
  estimateCost: number;
  budgetCost: number;
  actualCost: number;
  deliverBalance: number;
  softwareIncome: number;
  hardwareIncome: number;
  opsIncome: number;
  totalIncome: number;
}

function buildRows(overview: ProjectCostOverview): { rows: DisplayRow[]; cards: SummaryCards } {
  const { summary, serviceFees } = overview;
  const rows: DisplayRow[] = [];
  const categoryTotals: Record<'外部成本' | '交付结算', [number, number, number]> = { 外部成本: [0, 0, 0], 交付结算: [0, 0, 0] };

  for (const category of overview.categories) {
    const blocks = category.items.map((item) => {
      const est = sumBy(item.subjects, 'estimateCost');
      const bud = sumBy(item.subjects, 'budgetCost');
      const act = sumBy(item.subjects, 'actualCost');
      return {
        item,
        est, bud, act,
        subjRows: item.subjects.map((subject, si) => ({
          key: `${category.category}-${item.item}-${subject.subject}-${si}`,
          subject: subject.subject,
          estimate: subject.estimateCost,
          budget: subject.budgetCost,
          actual: subject.actualCost,
        })),
      };
    });
    const catRowCount = blocks.reduce((n, b) => n + b.subjRows.length + 1, 0);
    let firstOfCategory = true;
    for (const block of blocks) {
      block.subjRows.forEach((subject, si) => {
        rows.push({
          key: subject.key,
          subject: subject.subject,
          estimate: subject.estimate,
          budget: subject.budget,
          actual: subject.actual,
          kind: 'subject',
          category: si === 0 && firstOfCategory ? category.category : undefined,
          categorySpan: si === 0 && firstOfCategory ? catRowCount : 0,
          item: si === 0 ? block.item.item : undefined,
          itemSpan: si === 0 ? block.subjRows.length + 1 : 0,
        });
      });
      firstOfCategory = false;
      rows.push({
        key: `${category.category}-${block.item.item}-小计`,
        subject: '小计',
        estimate: block.est, budget: block.bud, actual: block.act,
        kind: 'subtotal',
        categorySpan: 0, itemSpan: 0,
      });
    }
    const catEst = blocks.reduce((n, b) => n + b.est, 0);
    const catBud = blocks.reduce((n, b) => n + b.bud, 0);
    const catAct = blocks.reduce((n, b) => n + b.act, 0);
    categoryTotals[category.category] = [catEst, catBud, catAct];
    rows.push({
      key: `${category.category}-合计`,
      subject: category.category === '外部成本' ? '外部成本合计' : '项目建设交付成本总计',
      estimate: catEst, budget: catBud, actual: catAct,
      kind: 'categoryTotal', strong: true,
    });
  }

  const [totalEst, totalBud, totalAct] = [categoryTotals.外部成本, categoryTotals.交付结算]
    .reduce((acc, t) => [acc[0] + t[0], acc[1] + t[1], acc[2] + t[2]], [0, 0, 0] as [number, number, number]);
  const grossOf = (col: 0 | 1 | 2) => summary.totalIncome - [totalEst, totalBud, totalAct][col];
  const hq = serviceFees.find((f) => f.label === '总部服务费')!;
  const presale = serviceFees.find((f) => f.label === '售前服务费')!;
  const sales = serviceFees.find((f) => f.label === '销售服务费')!;
  const feeOf = (col: 'estimate' | 'budget' | 'actual') => hq[col] + presale[col] + sales[col];
  const taxOf = (col: 0 | 1 | 2) => {
    const gross = grossOf(col);
    return gross < 0 ? summary.totalIncome * 0.08 : gross * 0.25;
  };
  const netOf = (col: 0 | 1 | 2) => grossOf(col) - feeOf(col === 0 ? 'estimate' : col === 1 ? 'budget' : 'actual') - taxOf(col);
  const rateOf = (value: number) => (summary.totalIncome > 0 ? (value / summary.totalIncome) * 100 : null);

  const footer: DisplayRow[] = [
    { key: 'f-total', subject: '项目成本总计', estimate: totalEst, budget: totalBud, actual: totalAct, kind: 'footerMoney', strong: true },
    { key: 'f-gross', subject: '销售毛利', estimate: grossOf(0), budget: grossOf(1), actual: grossOf(2), kind: 'footerMoney' },
    { key: 'f-gross-rate', subject: '毛利率', estimate: rateOf(grossOf(0)) ?? 0, budget: rateOf(grossOf(1)) ?? 0, actual: rateOf(grossOf(2)) ?? 0, kind: 'footerRate' },
    { key: 'f-hq', subject: '总部服务费', estimate: hq.estimate, budget: hq.budget, actual: hq.actual, kind: 'footerMoney' },
    { key: 'f-presale', subject: '售前服务费', estimate: presale.estimate, budget: presale.budget, actual: presale.actual, kind: 'footerMoney' },
    { key: 'f-sales', subject: '销售服务费', estimate: sales.estimate, budget: sales.budget, actual: sales.actual, kind: 'footerMoney' },
    { key: 'f-opcost', subject: '总营业成本', estimate: totalEst, budget: totalBud, actual: totalAct, kind: 'footerMoney', strong: true },
    { key: 'f-tax', subject: '税费', estimate: taxOf(0), budget: taxOf(1), actual: taxOf(2), kind: 'footerMoney' },
    { key: 'f-net', subject: '销售净利', estimate: netOf(0), budget: netOf(1), actual: netOf(2), kind: 'footerMoney', strong: true },
    { key: 'f-net-rate', subject: '销售净利率', estimate: rateOf(netOf(0)) ?? 0, budget: rateOf(netOf(1)) ?? 0, actual: rateOf(netOf(2)) ?? 0, kind: 'footerRate' },
  ];

  const cards: SummaryCards = {
    estimateMarginRate: rateOf(summary.estimateCost === summary.totalIncome ? 0 : summary.totalIncome - summary.estimateCost) ?? null,
    budgetMarginRate: rateOf(summary.totalIncome - summary.budgetCost),
    actualMarginRate: rateOf(summary.totalIncome - summary.actualCost),
    estimateCost: summary.estimateCost,
    budgetCost: summary.budgetCost,
    actualCost: summary.actualCost,
    deliverBalance: summary.estimateCost - summary.actualCost,
    softwareIncome: summary.softwareIncome,
    hardwareIncome: summary.hardwareIncome,
    opsIncome: summary.opsIncome,
    totalIncome: summary.totalIncome,
  };
  // 概算毛利率与概算成本口径一致：毛利=收入-概算成本
  cards.estimateMarginRate = rateOf(summary.totalIncome - summary.estimateCost);
  return { rows: [...rows, ...footer], cards };
}

export function ProjectCostPanel({ projectId }: { projectId: string }) {
  const { data } = useBusinessStore();
  const overview = useMemo(
    () => data.projectCostOverviews.find((o) => o.projectId === projectId),
    [data, projectId],
  );
  const built = useMemo(() => (overview ? buildRows(overview) : null), [overview]);

  if (!overview || !built) return <Empty description="暂无项目成本数据" className="py-12" />;
  const { rows, cards } = built;

  const deviation = cards.actualMarginRate !== null && cards.budgetMarginRate !== null ? cards.actualMarginRate - cards.budgetMarginRate : null;
  const cells: { label: string; value: React.ReactNode; danger?: boolean }[][] = [
    [
      { label: '概算毛利率', value: formatPercent(cards.estimateMarginRate) },
      { label: '预算毛利率', value: formatPercent(cards.budgetMarginRate) },
      { label: '实时毛利率', value: formatPercent(cards.actualMarginRate) },
      { label: '毛利率偏差', value: deviation === null ? '—' : `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`, danger: deviation !== null && deviation < 0 },
    ],
    [
      { label: '概算成本', value: <MoneyText value={cards.estimateCost} /> },
      { label: '预算成本', value: <MoneyText value={cards.budgetCost} /> },
      { label: '实际费用', value: <MoneyText value={cards.actualCost} /> },
      { label: '交付成本结余', value: <MoneyText value={cards.deliverBalance} signed />, danger: cards.deliverBalance < 0 },
    ],
    [
      { label: '软件收入', value: <MoneyText value={cards.softwareIncome} /> },
      { label: '硬件收入', value: <MoneyText value={cards.hardwareIncome} /> },
      { label: '运维收入', value: <MoneyText value={cards.opsIncome} /> },
      { label: '总计收入', value: <MoneyText value={cards.totalIncome} /> },
    ],
  ];

  const columns: ColumnsType<DisplayRow> = [
    {
      title: '成本分类', dataIndex: 'category', width: 90,
      onCell: (row) => ({ rowSpan: row.categorySpan ?? 1 }),
      render: (_, row) => row.category ?? '',
    },
    {
      title: '成本项', dataIndex: 'item', width: 160,
      onCell: (row) => ({ rowSpan: row.itemSpan ?? 1 }),
      render: (_, row) => row.item ?? '',
    },
    { title: '科目', dataIndex: 'subject' },
    { title: '概算成本', dataIndex: 'estimate', width: 130, align: 'right', render: (_, row) => row.kind === 'footerRate' ? <RateCell value={row.estimate} /> : <MoneyText value={row.estimate} /> },
    { title: '预算成本', dataIndex: 'budget', width: 130, align: 'right', render: (_, row) => row.kind === 'footerRate' ? <RateCell value={row.budget} /> : <MoneyText value={row.budget} /> },
    { title: '实际费用', dataIndex: 'actual', width: 130, align: 'right', render: (_, row) => row.kind === 'footerRate' ? <RateCell value={row.actual} /> : <MoneyText value={row.actual} /> },
    {
      title: '成本结余', key: 'balance', width: 130, align: 'right',
      render: (_, row) => row.kind === 'footerRate' || row.kind === 'footerMoney' ? '' : row.estimate === undefined ? '' : <MoneyText value={row.estimate - (row.actual ?? 0)} signed />,
    },
    {
      title: '成本使用率', key: 'usage', width: 110, align: 'right',
      render: (_, row) => {
        if (row.kind === 'footerRate' || row.kind === 'footerMoney' || row.estimate === undefined) return '';
        const rate = row.estimate === 0 ? null : ((row.actual ?? 0) / row.estimate) * 100;
        return <span className="pms-tabular-num">{rate === null ? '—' : `${rate.toFixed(2)}%`}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-3">
        {cells.map((line, li) => (
          <div key={li} className={`grid grid-cols-8 ${li > 0 ? 'border-t border-slate-100' : ''}`}>
            {line.map((cell) => (
              <div key={cell.label} className="col-span-2 flex items-center border-r border-slate-100 last:border-r-0">
                <div className="w-1/2 px-3 py-2.5 text-xs font-medium text-slate-500 bg-slate-50/70 border-r border-slate-100">{cell.label}</div>
                <div className={`w-1/2 px-3 py-2.5 text-sm font-semibold pms-tabular-num ${cell.danger ? 'text-rose-600' : 'text-slate-800'}`}>{cell.value}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Card size="small" title="项目核算情况概览" extra={<Typography.Text type="secondary" className="text-xs">金额单位：万元 · 成本结余 = 概算 - 实际</Typography.Text>}>
        <Table<DisplayRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={rows}
          columns={columns}
          rowClassName={(row) => (row.kind === 'subject' ? '' : 'bg-slate-50/80')}
          scroll={{ y: 520 }}
        />
        <Typography.Text type="secondary" className="text-xs block mt-2">
          口径说明：概算成本=冻结概算版本；预算成本=当前生效预算；实际费用=动态核算已发生成本；总营业成本=项目成本总计；税费按毛利 25% 计提（毛利为负按收入 8%）；总部/售前/销售服务费在销售净利中扣除。
        </Typography.Text>
      </Card>
    </div>
  );
}

function RateCell({ value }: { value?: number }) {
  return <span className="pms-tabular-num font-medium">{value === undefined ? '' : `${value.toFixed(2)}%`}</span>;
}