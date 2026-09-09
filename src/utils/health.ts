import type { Project } from '@/models/types';
import { percentage } from './money';

export const DEMO_HEALTH_RULES = Object.freeze({
  version: 'DEMO-1', label: '演示规则', costWarning: 5, costHigh: 15,
  delayWarning: 14, delayHigh: 30, lowMargin: 15,
});
export interface HealthFacts { delayDays?: number; majorIssues?: number; overdueReceipt?: number; missingMaterials?: number }
export function assessHealth(project: Project, facts: HealthFacts = {}, rules = DEMO_HEALTH_RULES) {
  const hits: { id: string; severity: number; reason: string }[] = [];
  const rate = percentage(project.rollingCost - project.budgetAmount, project.budgetAmount);
  if (rate !== null && rate > 0) hits.push({ id: 'cost', severity: rate >= rules.costHigh ? 3 : rate >= rules.costWarning ? 2 : 1, reason: `滚动成本超预算 ${rate.toFixed(2)}%` });
  if ((facts.delayDays ?? 0) > 0) hits.push({ id: 'schedule', severity: facts.delayDays! >= rules.delayHigh ? 3 : facts.delayDays! >= rules.delayWarning ? 2 : 1, reason: `里程碑逾期 ${facts.delayDays} 天` });
  if ((facts.majorIssues ?? 0) > 0) hits.push({ id: 'issue', severity: 3, reason: `存在 ${facts.majorIssues} 个重大未关闭问题` });
  const margin = percentage((project.revenueAmount ?? project.contractAmount) - project.rollingCost, project.revenueAmount ?? project.contractAmount);
  if (margin !== null && margin < rules.lowMargin) hits.push({ id: 'margin', severity: margin < 0 ? 3 : 2, reason: `预测毛利率 ${margin.toFixed(1)}%` });
  if (project.isUnsigned && project.actualCost + project.committedCost > (project.unsignedLimitQuota ?? 0)) hits.push({ id: 'unsigned', severity: 3, reason: '未签已发生及未发生承诺超过授权额度' });
  if ((facts.overdueReceipt ?? 0) > 0) hits.push({ id: 'receipt', severity: 2, reason: `逾期应收 ${facts.overdueReceipt!.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万元` });
  if ((facts.missingMaterials ?? 0) > 0) hits.push({ id: 'compliance', severity: 2, reason: `缺少 ${facts.missingMaterials} 项必交材料` });
  hits.sort((a, b) => b.severity - a.severity);
  return { level: (['green', 'yellow', 'orange', 'red'] as const)[hits[0]?.severity ?? 0],
    reasons: hits.length ? hits.map((h) => h.reason) : ['各项指标受控正常'], hits,
    keyVarianceRate: rate, ruleVersion: rules.version };
}
