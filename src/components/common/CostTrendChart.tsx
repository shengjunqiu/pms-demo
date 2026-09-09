type Point = { date: string; budget: number; actual: number; rolling: number };
export function CostTrendChart({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.budget, p.actual, p.rolling]));
  const x = (i: number) => 65 + i * (690 / Math.max(1, points.length - 1));
  const y = (value: number) => 185 - value / max * 145;
  const series = [{ key: 'budget' as const, name: '有效预算', color: '#597ef7' }, { key: 'actual' as const, name: '已发生', color: '#52c41a' }, { key: 'rolling' as const, name: '滚动预测', color: '#fa8c16' }];
  return <svg viewBox="0 0 810 240" role="img" aria-label="成本历史趋势，单位万元" style={{ width: '100%', maxHeight: 270 }}>
    {[0, 0.5, 1].map((factor) => <g key={factor}><line x1="65" x2="755" y1={y(max * factor)} y2={y(max * factor)} stroke="#eee" /><text x="58" y={y(max * factor) + 4} textAnchor="end" fontSize="11" fill="#666">{(max * factor).toFixed(0)}</text></g>)}
    {series.map((s) => <g key={s.key}><polyline points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2" />{points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p[s.key])} r="3" fill={s.color}><title>{p.date} {s.name} {p[s.key].toFixed(2)}万元</title></circle>)}</g>)}
    {points.map((p, i) => <text key={p.date} x={x(i)} y="207" textAnchor="middle" fontSize="11" fill="#666">{p.date}</text>)}
    {series.map((s, i) => <g key={s.key}><rect x={235 + i * 120} y="225" width="14" height="3" fill={s.color} /><text x={255 + i * 120} y="231" fontSize="12" fill="#555">{s.name}</text></g>)}
  </svg>;
}
