import { expect, it } from 'vitest';
import { createDemoBusinessState, transition } from '@/mock/business';
import { archiveSources } from '@/mock/closeout';
import { closeChecks } from '@/mock/operations';
import { settlementChecks } from '@/mock/settlement';

it('待决管理事项阻断结算、归档和关闭；原领导审批办理后解除该项', () => {
  let state = createDemoBusinessState();
  const decision = state.managementApprovals.find((a) => a.id === 'MGT-003')!;
  expect(decision.status).toBe('待审批');
  expect(settlementChecks(state, 'P-006').find((c) => c.name === '重大事项与变更')?.passed).toBe(false);
  expect(closeChecks(state, 'P-006').find((c) => c.label === '管理决策事项已办理')?.ok).toBe(false);
  state = transition(state, { type: 'review-management', id: decision.id, approve: true, opinion: '协调复验资源；仍按客户验收和财务结算原流程执行' }, { id: 'U-003', name: '王总', role: 'executive' });
  expect(closeChecks(state, 'P-006').find((c) => c.label === '管理决策事项已办理')?.ok).toBe(true);
  expect(state.acceptances.find((a) => a.id === decision.sourceId)?.status).toBe('整改中');
});

it('归档来源包含报验税点、材料与财务确认原单快照', () => {
  const state = createDemoBusinessState();
  state.acceptanceReports.push({ id: 'RPT-TEST', projectId: 'P-006', contractId: 'CTR-005', acceptanceId: 'ACC-P-006-3', batchNo: 'TEST-BATCH', reportType: '阶段报验', date: '2026-09-09', taxLines: [{ taxRate: 6, amount: 120 }, { taxRate: 0, amount: 80 }], materials: ['报验清单.pdf'], note: '按合同阶段报验', status: '已确认', submittedBy: '张建国', opinion: '财务核定200万元' });
  const source = archiveSources(state, 'P-006').find((s) => s.id === 'RPT-TEST')!;
  expect(source.category).toBe('验收资料');
  expect(source.record).toEqual(state.acceptanceReports[0]);
  state.acceptanceReports[0].note = '后续草稿变化';
  expect(source.record).not.toEqual(state.acceptanceReports[0]);
});
