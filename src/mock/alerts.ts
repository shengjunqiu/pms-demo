import { collectConfiguredAlerts, selectAlertRules } from '@/mock/configuration-finance';
import { unattributedMajorVariances } from '@/mock/settlement';
import type { ConfiguredAlert } from '@/models/configuration-finance';
import type { BusinessState } from '@/mock/business';
import { money, percentage, sumMoney } from '@/utils/money';

/** 归因是结算前动作（JS-031 属验收与结算域），只在收尾/验收/已结算项目上评估。 */
const ATTRIBUTION_PHASES = ['收尾', '验收'];

/**
 * 归因未完成预警。
 * 规则（标签、阈值、责任角色、渠道、版本）来自财务配置 `ALERT-ATTRIBUTION-*`，阈值为未归因差异合计占预算的百分比；
 * 达阈值科目与结算保存必填校验同口径（`src/utils/major-variance.ts`），补齐原因后即从预警中移除。
 */
export function collectAttributionAlerts(state: BusinessState, projects = state.projects): ConfiguredAlert[] {
  const result: ConfiguredAlert[] = [];
  for (const p of projects) {
    const rule = selectAlertRules(state, p).get('attribution');
    if (!rule) continue;
    if (!ATTRIBUTION_PHASES.includes(p.phase) && p.status !== '已结算') continue;
    const pending = unattributedMajorVariances(state, p.id);
    const gap = sumMoney(pending.map((s) => Math.abs(s.actual - s.budget)));
    const rate = percentage(gap, p.budgetAmount);
    if (rate === null || rate < rule.warningThreshold) continue;
    result.push({
      id: `${rule.id}:${p.id}`, projectId: p.id, projectName: p.name, kind: 'attribution',
      severity: rate >= rule.highThreshold ? 3 : 2,
      reason: `${pending.length} 项重大差异未归因：${pending.map((s) => s.subjectName).join('、')}（合计 ${money(gap)} 万元，占预算 ${rate.toFixed(2)}%）`,
      sourceId: p.id, route: `/projects/${p.id}/four-calculations`, ruleId: rule.id,
      ownerRole: rule.ownerRole, channels: rule.channels,
    });
  }
  return result;
}

/** 配置预警 + 结算事实预警的唯一汇合点；异常中心与财务配置命中表都读这里，避免两个页面口径不同。 */
export function collectAllAlerts(state: BusinessState, projects = state.projects): ConfiguredAlert[] {
  return [...collectConfiguredAlerts(state, projects), ...collectAttributionAlerts(state, projects)]
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
}
