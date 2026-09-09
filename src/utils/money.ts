// Existing fixtures use 万元. Convert to integer 分 during arithmetic (1 万元 = 1,000,000 分).
export const money = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
export const sumMoney = (values: number[]) => values.reduce((sum, value) => sum + Math.round(value * 1_000_000), 0) / 1_000_000;
export const percentage = (numerator: number, denominator: number): number | null => denominator === 0 ? null : money(numerator / denominator * 100);
export const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;
export function allocateMoney(total: number, weights: number[]): number[] {
  const units = Math.round(total * 1_000_000);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (!weights.length || weightSum <= 0) throw new Error('成本分摊权重不能为空');
  const result = weights.map((weight) => Math.floor(units * weight / weightSum));
  result[result.length - 1] += units - result.reduce((sum, value) => sum + value, 0);
  return result.map((value) => value / 1_000_000);
}
