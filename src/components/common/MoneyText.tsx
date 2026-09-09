import { Tooltip } from 'antd';

export function MoneyText({ value, signed = false }: { value: number | null | undefined; signed?: boolean }) {
  if (value === null || value === undefined) return <span title="无有效数据或分母为零">—</span>;
  const prefix = signed && value > 0 ? '+' : '';
  return <Tooltip title={`¥ ${(value * 10_000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
    <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{prefix}{value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  </Tooltip>;
}
