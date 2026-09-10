import { expect, type Page } from '@playwright/test';
import type { Actor, BusinessState } from '../src/mock/business';

export type AcceptanceScenario =
  | 'unsigned-base'
  | 'unsigned-ready-for-contract'
  | 'unsigned-ready-for-start';

type BusinessModule = typeof import('../src/mock/business');

const projectId = 'P-PLAN-001';

/**
 * Replace slow UI-only prerequisite setup with the same pure domain transitions
 * used by the application. The accepted page still performs its own core action
 * through the visible UI; FINAL keeps the full cross-page journey.
 */
export async function seedAcceptanceScenario(
  page: Page,
  scenario: AcceptanceScenario,
) {
  await page.goto('/workbench/project-manager');
  const summary = await page.evaluate(
    async ({ requestedScenario, targetProjectId }) => {
      const modulePath = '/src/mock/business.ts';
      const business = (await import(/* @vite-ignore */ modulePath)) as BusinessModule;
      const pm: Actor = {
        id: 'U-001',
        name: '张建国',
        role: 'project-manager',
      };
      const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
      const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
      let state: BusinessState = business.createBusinessState();

      if (requestedScenario !== 'unsigned-base') {
        state = business.transition(
          state,
          { type: 'submit-planning', projectId: targetProjectId },
          pm,
        );
        const planningReview = state.planningReviews.at(-1);
        if (!planningReview) throw new Error('场景缺少计划评审单');
        state = business.transition(
          state,
          {
            type: 'review-planning',
            id: planningReview.id,
            result: '通过',
            opinion: '验收场景：计划、资源与里程碑一致',
            rectifications: [],
          },
          pmo,
        );
        const budget: BusinessState['budgets'][number] = {
          ...structuredClone(state.budgets[0]),
          id: 'DRAFT-R0024',
          projectId: targetProjectId,
          version: 'R0024草稿',
          status: '审批中',
          totalAmount: 600,
          items: [
            {
              subjectId: 'SUB-01',
              subjectName: '交付人力',
              amount: 600,
            },
          ],
          laborCost: 600,
          procurementCost: 0,
          outsourceCost: 0,
          expenseCost: 0,
          reserveCost: 0,
        };
        state = business.transition(
          state,
          {
            type: 'submit-budget',
            projectId: targetProjectId,
            budget,
            reason: '验收场景首次预算',
          },
          pm,
        );
        const approval = state.approvals.at(-1);
        if (!approval) throw new Error('场景缺少预算审批单');
        state = business.transition(
          state,
          {
            type: 'review',
            approvalId: approval.id,
            approve: true,
            opinion: '验收场景预算核对通过',
          },
          pmo,
        );
        state = business.transition(
          state,
          { type: 'confirm-budget-baseline', approvalId: approval.id },
          pmo,
        );
      }

      if (requestedScenario === 'unsigned-ready-for-start') {
        state = business.transition(
          state,
          {
            type: 'confirm-project-contract',
            projectId: targetProjectId,
            source: '验收场景核对合同主体、金额、日期与签章附件一致',
            registration: {
              code: 'CON-R0024-START',
              name: '园区协同平台交付合同',
              amount: 1200,
              signDate: '2026-09-09',
              acceptanceDueDate: '2026-12-31',
              source: '客户签署合同正本',
              attachment: '双方签章合同.pdf',
              receiptPlans: [
                {
                  title: '合同全款',
                  dueDate: '2026-12-31',
                  amount: 1200,
                },
              ],
            },
          },
          market,
        );
      }

      business.useBusinessStore.setState({ data: state });
      const project = state.projects.find((item) => item.id === targetProjectId);
      return {
        projectId: project?.id,
        phase: project?.phase,
        isUnsigned: project?.isUnsigned,
        baseline: project?.currentBaselineVersion,
        contractAmount: project?.contractAmount,
        unsignedCount: state.projects.filter((item) => item.isUnsigned).length,
      };
    },
    { requestedScenario: scenario, targetProjectId: projectId },
  );

  expect(summary.projectId).toBe(projectId);
  expect(summary.unsignedCount).toBeGreaterThanOrEqual(10);
  if (scenario !== 'unsigned-base') expect(summary.baseline).toBe('V1.0');
  if (scenario === 'unsigned-ready-for-start') {
    expect(summary.isUnsigned).toBe(false);
    expect(summary.contractAmount).toBe(1200);
  }
  return summary;
}
