import { sumMoney, percentage } from './money';
import { Project } from '@/models/types';

export { assessHealth as evaluateProjectHealth } from './health';

/**
 * 经营驾驶舱 KPI 汇总计算
 */
export function calculateCockpitKPIs(projects: Project[]) {
  projects = Array.from(new Map(projects.map((p) => [p.id, p])).values());
  const totalProjects = projects.length;
  const totalContractAmount = sumMoney(projects.filter((p) => !p.isUnsigned).map((p) => p.contractAmount));
  const totalBudgetAmount = projects.reduce((sum, p) => sum + p.budgetAmount, 0);
  const totalRollingCost = projects.reduce((sum, p) => sum + p.rollingCost, 0);
  const totalActualCost = projects.reduce((sum, p) => sum + p.actualCost, 0);

  const totalRevenue = sumMoney(projects.map((p) => p.revenueAmount ?? p.contractAmount));
  const totalGrossMargin = totalRevenue - totalRollingCost;
  const weightedGrossMarginRate = percentage(totalGrossMargin, totalRevenue);
  const totalCostVariance = totalRollingCost - totalBudgetAmount;
  const totalCostVarianceRate = percentage(totalCostVariance, totalBudgetAmount);

  const redCount = projects.filter((p) => p.health === 'red').length;
  const orangeCount = projects.filter((p) => p.health === 'orange').length;
  const yellowCount = projects.filter((p) => p.health === 'yellow').length;
  const greenCount = projects.filter((p) => p.health === 'green').length;

  return {
    totalRevenue,
    totalProjects,
    totalContractAmount,
    totalBudgetAmount,
    totalRollingCost,
    totalActualCost,
    totalGrossMargin,
    weightedGrossMarginRate,
    totalCostVariance,
    totalCostVarianceRate,
    healthDistribution: {
      red: redCount,
      orange: orangeCount,
      yellow: yellowCount,
      green: greenCount,
    },
  };
}
