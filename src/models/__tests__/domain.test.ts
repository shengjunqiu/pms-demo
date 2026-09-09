import { describe, it, expect } from 'vitest';
import {
  mockDepartments,
  mockUsers,
  mockCustomers,
  mockOpportunities,
  mockProjects,
  mockContracts,
  mockEstimateVersions,
  mockBudgetVersions,
  mockBaselineVersions,
  mockWbsTasks,
  mockMilestones,
  mockDailyReports,
  mockWeeklyReports,
  mockRequirements,
  mockBugs,
  mockIssues,
  mockRisks,
  mockTimesheets,
  mockCostItems,
  mockProcurements,
  mockOutsources,
  mockExpenses,
  mockChanges,
  mockStageGates,
  mockAcceptances,
  mockSettlements,
  mockDecisions,
  mockWarnings,
  mockAuditLogs,
} from '@/mock';
import { evaluateProjectHealth, calculateCockpitKPIs } from '@/utils/calculator';
import { mockCostSources } from '@/mock';

describe('Domain & Data Contract Invariants', () => {
  it('所有实体ID唯一，所有项目和上游引用可解析；已确认流水绑定唯一来源凭证', () => {
    const tables = [mockDepartments, mockUsers, mockCustomers, mockOpportunities, mockProjects, mockContracts,
      mockEstimateVersions, mockBudgetVersions, mockBaselineVersions, mockWbsTasks, mockMilestones,
      mockDailyReports, mockWeeklyReports, mockRequirements, mockBugs, mockIssues, mockRisks,
      mockTimesheets, mockCostItems, mockProcurements, mockOutsources, mockExpenses,
      mockChanges, mockStageGates, mockAcceptances, mockSettlements, mockDecisions, mockWarnings, mockAuditLogs];
    for (const rows of tables) {
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      for (const row of rows) if ('projectId' in row) expect(mockProjects.some((p) => p.id === row.projectId), row.id).toBe(true);
    }
    for (const source of mockCostSources) {
      expect(source.upstreamId, source.id).toBeTruthy();
      expect([...mockTimesheets, ...mockProcurements, ...mockOutsources, ...mockExpenses].some((r) => r.id === source.upstreamId && r.projectId === source.projectId), source.id).toBe(true);
    }
    expect(new Set(mockCostItems.map((c) => c.sourceId)).size).toBe(mockCostItems.length);
    for (const cost of mockCostItems) expect(mockCostSources.find((s) => s.id === cost.sourceId)?.amount).toBe(cost.amount);
    for (const timesheet of mockTimesheets) expect(mockWbsTasks.find((t) => t.id === timesheet.taskId)?.projectId).toBe(timesheet.projectId);
  });

  it('冻结概算和生效预算不可原地改写', () => {
    expect(() => { mockEstimateVersions[0].totalCost = 1; }).toThrow();
    expect(() => { mockBudgetVersions[0].items[0].amount = 1; }).toThrow();
  });

  it('日报按项目日期唯一，项目进度与叶子任务加权进度相同，来源单据覆盖已确认金额', () => {
    expect(new Set(mockDailyReports.map((r) => `${r.projectId}/${r.date}`)).size).toBe(mockDailyReports.length);
    for (const p of mockProjects) {
      const tasks = mockWbsTasks.filter((t) => t.projectId === p.id);
      expect(tasks.reduce((sum, t) => sum + t.progress * t.plannedDays, 0) / tasks.reduce((sum, t) => sum + t.plannedDays, 0)).toBeCloseTo(p.progressRate, 6);
      const actualProcurement = mockCostItems.filter((c) => c.projectId === p.id && c.type === 'procurement').reduce((sum, c) => sum + c.amount, 0);
      expect(mockProcurements.find((r) => r.projectId === p.id)!.amount + 0.000001).toBeGreaterThanOrEqual(actualProcurement);
    }
  });
  it('未签项目不计入已签合同额，零分母返回空值', () => {
    const unsigned = mockProjects.filter((p) => p.isUnsigned);
    expect(calculateCockpitKPIs(unsigned).totalContractAmount).toBe(0);
    expect(calculateCockpitKPIs([]).weightedGrossMarginRate).toBeNull();
  });

  it('每个项目的成本流水合计等于摘要已发生，三桶合计等于滚动成本', () => {
    for (const project of mockProjects) {
      const actual = mockCostItems.filter((c) => c.projectId === project.id).reduce((sum, c) => sum + c.amount, 0);
      expect(actual, project.id).toBeCloseTo(project.actualCost, 6);
      expect(project.actualCost + project.committedCost + project.forecastRemainingCost, project.id).toBeCloseTo(project.rollingCost, 6);
    }
  });

  it('预算和概算叶子科目合计与版本总额一致', () => {
    for (const version of mockBudgetVersions) {
      expect(version.items.reduce((sum, item) => sum + item.amount, 0), version.id).toBeCloseTo(version.totalAmount, 6);
    }
    for (const version of mockEstimateVersions) {
      expect(version.items.reduce((sum, item) => sum + item.amount, 0), version.id).toBeCloseTo(version.totalCost, 6);
    }
  });

  it('每个项目唯一引用来源商机、有效预算及基线', () => {
    expect(new Set(mockProjects.map((p) => p.opportunityId)).size).toBe(mockProjects.length);
    for (const p of mockProjects) {
      expect(mockOpportunities.some((o) => o.id === p.opportunityId)).toBe(true);
      expect(mockBudgetVersions.filter((b) => b.projectId === p.id && b.status === '已生效')).toHaveLength(1);
      expect(mockBaselineVersions.filter((b) => b.projectId === p.id && b.status === '已生效' && b.version === p.currentBaselineVersion)).toHaveLength(1);
    }
  });

  it('31类Mock数据应达到最低要求数量', () => {
    expect(mockDepartments.length).toBeGreaterThanOrEqual(12);
    expect(mockUsers.length).toBeGreaterThanOrEqual(45);
    expect(mockCustomers.length).toBeGreaterThanOrEqual(30);
    expect(mockOpportunities.length).toBeGreaterThanOrEqual(36);
    expect(mockProjects.length).toBeGreaterThanOrEqual(60);

    const unsignedProjects = mockProjects.filter((p) => p.isUnsigned);
    expect(unsignedProjects.length).toBeGreaterThanOrEqual(10);

    const maintenanceProjects = mockProjects.filter((p) => p.isMaintenance);
    expect(maintenanceProjects.length).toBeGreaterThanOrEqual(12);

    expect(mockContracts.length).toBeGreaterThanOrEqual(45);
    expect(mockEstimateVersions.length).toBeGreaterThanOrEqual(80);
    expect(mockBudgetVersions.length).toBeGreaterThanOrEqual(80);
    expect(mockBaselineVersions.length).toBeGreaterThanOrEqual(90);
    expect(mockWbsTasks.length).toBeGreaterThanOrEqual(500);
    expect(mockMilestones.length).toBeGreaterThanOrEqual(220);
    expect(mockDailyReports.length).toBeGreaterThanOrEqual(300);
    expect(mockWeeklyReports.length).toBeGreaterThanOrEqual(100);
    expect(mockRequirements.length).toBeGreaterThanOrEqual(80);
    expect(mockBugs.length).toBeGreaterThanOrEqual(100);
    expect(mockIssues.length).toBeGreaterThanOrEqual(100);
    expect(mockRisks.length).toBeGreaterThanOrEqual(80);
    expect(mockTimesheets.length).toBeGreaterThanOrEqual(800);
    expect(mockCostItems.length).toBeGreaterThanOrEqual(1000);
    expect(mockProcurements.length).toBeGreaterThanOrEqual(100);
    expect(mockOutsources.length).toBeGreaterThanOrEqual(60);
    expect(mockExpenses.length).toBeGreaterThanOrEqual(150);
    expect(mockChanges.length).toBeGreaterThanOrEqual(50);
    expect(mockStageGates.length).toBeGreaterThanOrEqual(100);
    expect(mockAcceptances.length).toBeGreaterThanOrEqual(70);
    expect(mockSettlements.length).toBeGreaterThanOrEqual(30);
    expect(mockDecisions.length).toBeGreaterThanOrEqual(40);
    expect(mockWarnings.length).toBeGreaterThanOrEqual(100);
    expect(mockAuditLogs.length).toBeGreaterThanOrEqual(300);
  });

  it('8个固定故事项目的关键字段与数值必须符合契约约束', () => {
    const p1 = mockProjects.find((p) => p.id === 'P-001')!;
    expect(p1).toBeDefined();
    expect(p1.contractAmount).toBe(5538.30);
    expect(p1.budgetAmount).toBe(2847.70);
    expect(p1.rollingCost).toBe(2986.20);
    expect(p1.costVariance).toBe(138.50);
    expect(p1.health).toBe('yellow');

    const p1Bugs = mockBugs.filter((b) => b.projectId === 'P-001');
    expect(p1Bugs.length).toBe(7);

    const p1Reqs = mockRequirements.filter((r) => r.projectId === 'P-001');
    expect(p1Reqs.length).toBe(18);

    const p1Risks = mockRisks.filter((r) => r.projectId === 'P-001');
    expect(p1Risks.length).toBe(2);

    const p2 = mockProjects.find((p) => p.id === 'P-002')!;
    expect(p2.contractAmount).toBe(1008.30);
    expect(p2.health).toBe('orange');
    expect(p2.subPhase).toBe('试运行');
    expect(mockIssues.some((i) => i.projectId === p2.id && i.severity === '重要')).toBe(true);

    const p3 = mockProjects.find((p) => p.id === 'P-003')!;
    expect(p3.contractAmount).toBe(3260.00);
    expect(p3.health).toBe('red');
    expect(mockIssues.filter((i) => i.projectId === p3.id && i.severity === '重大')).toHaveLength(1);

    const p4 = mockProjects.find((p) => p.id === 'P-004')!;
    expect(p4.contractAmount).toBe(0);
    expect(p4.revenueAmount).toBe(8800.00);
    expect(p4.isUnsigned).toBe(true);
    expect(p4.actualCost).toBe(98.5);
    expect(mockProcurements.filter((p) => p.projectId === 'P-005').length).toBeGreaterThan(1);
    expect(mockAcceptances.find((a) => a.projectId === 'P-006' && a.type === '客户终验')?.status).toBe('整改中');
    expect(mockProjects.find((p) => p.id === 'P-007')?.isMaintenance).toBe(true);

    const p8 = mockProjects.find((p) => p.id === 'P-008')!;
    expect(p8.contractAmount).toBe(2480.00);
    expect(p8.status).toBe('已结算');
  });

  it('四算公式与驾驶舱加权毛利率计算应满足不变量', () => {
    const kpis = calculateCockpitKPIs(mockProjects);
    expect(kpis.totalProjects).toBe(mockProjects.length);
    expect(kpis.weightedGrossMarginRate).toBeGreaterThan(0);
    expect(kpis.weightedGrossMarginRate).toBeLessThan(100);

    const healthEval = evaluateProjectHealth(mockProjects[0]);
    expect(healthEval.level).toBe('yellow');
    expect(healthEval.reasons.length).toBeGreaterThan(0);
  });
});
