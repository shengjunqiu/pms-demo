import { mockCostItems, mockProjects } from '@/mock';
import { sumMoney } from '@/utils/money';

export const COST_SNAPSHOT_DATES = ['2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-09'];
// Saved demonstration snapshots. Current state changes never rewrite the historic observations.
export const mockCostSnapshots = mockProjects.flatMap((p) => COST_SNAPSHOT_DATES.map((date, i) => Object.freeze({
  projectId: p.id, date, budget: p.budgetAmount, version: p.currentBaselineVersion,
  actual: sumMoney(mockCostItems.filter((c) => c.projectId === p.id && c.occurredDate <= date).map((c) => c.amount)),
  rolling: p.id === 'P-001' ? [2847.7, 2875, 2910, 2940, 2986.2][i] : p.rollingCost,
})));
