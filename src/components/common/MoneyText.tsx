import { Tooltip } from 'antd';

export function MoneyText({ value, signed = false }: { value: number | null | undefined; signed?: boolean }) {
  if (value === null || value === undefined) return <span title="无有效数据或分母为零" className="text-slate-400 font-normal">—</span>;
  const amount = value === 0 ? 0 : value;
  const prefix = signed && value > 0 ? '+' : '';
  return (
    <Tooltip title={`¥ ${(amount * 10_000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
      <span className="pms-tabular-num font-medium" style={{ whiteSpace: 'nowrap' }}>
        {prefix}{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </Tooltip>
  );
}
