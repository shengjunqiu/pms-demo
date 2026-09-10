import { AS_OF_DATE } from '@/mock';
import type { BusinessState } from '@/mock/business';
import type { Project } from '@/models/types';
import { selectFourCalculations, selectReceipts } from '@/mock/selectors';
import { percentage, sumMoney } from '@/utils/money';

export const EXCEPTION_TABS = [{ key: 'all', label: '全部' }, { key: 'red', label: '高风险' }, { key: 'schedule', label: '进度异常' }, { key: 'cost', label: '成本异常' }, { key: 'margin', label: '毛利异常' }, { key: 'receipt', label: '回款异常' }, { key: 'unsigned', label: '未签异常' }];
export function projectExceptions(projects: Project[], data: BusinessState, includeHealthy = false) {
  return projects.map((p) => {
    const calc = selectFourCalculations(p, data); const receipts = selectReceipts([p], data);
    const late = data.milestones.filter((m) => m.projectId === p.id && m.status !== '已达成' && m.plannedDate < AS_OF_DATE);
    const days = Math.max(0, ...late.map((m) => Math.floor((Date.parse(AS_OF_DATE) - Date.parse(m.plannedDate)) / 86400000)));
    const marginRate = percentage(calc.income - calc.rolling, calc.income);
    const unsignedExcess = p.isUnsigned ? Math.max(0, sumMoney([calc.actual, p.committedCost, -(p.unsignedLimitQuota ?? 0)])) : 0;
    const types = [p.health === 'red' && 'red', days > 0 && 'schedule', calc.variance > 0 && 'cost', marginRate !== null && marginRate < 15 && 'margin', receipts.overdue > 0 && 'receipt', unsignedExcess > 0 && 'unsigned'].filter(Boolean) as string[];
    // First observation is a dated demo monitoring snapshot, not an inferred business event date.
    const firstObserved = p.health === 'green' && types.length === 0 ? '—' : '2026-09-01';
    return { ...p, types, delayDays: days, overdueReceipt: receipts.overdue, unsignedExcess, calc,
      firstObserved, duration: firstObserved === '—' ? 0 : Math.floor((Date.parse(AS_OF_DATE) - Date.parse(firstObserved)) / 86400000),
      marginVariance: sumMoney([p.budgetAmount, -calc.rolling]), late, receiptPlans: receipts.plans };
  }).filter((p) => includeHealthy || p.types.length > 0 || p.health !== 'green');
}
