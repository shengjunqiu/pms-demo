import { beforeAll, it, expect } from 'vitest';
import { createDemoBusinessState, transition } from '@/mock/business-domain';
import { selectTodos } from '@/mock/todos';

// Build the shared demo seed during fixture setup; each test still receives its own deep clone.
beforeAll(() => { createDemoBusinessState(); });

it('预算审批办理后转为独立PMO确认待办，确认后原节点进入已办且不重复生成', () => {
  const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
  let data = createDemoBusinessState();
  const approval = data.approvals.find((a) => a.kind === 'budget' && a.status === '待审批')!;
  const actor = approval.requiredRole === 'executive' ? { id: 'U-003', name: '王总', role: 'executive' as const } : pmo;
  expect(selectTodos(data, pmo).filter((t) => t.id === `BASE-CONFIRM-${approval.id}`)).toHaveLength(0);
  data = transition(data, { type: 'review', approvalId: approval.id, approve: true, opinion: '复核预算一致' }, actor);
  expect(selectTodos(data, pmo).find((t) => t.id === `BASE-CONFIRM-${approval.id}`)).toMatchObject({ done: false, route: `/approvals/${approval.id}`, projectId: approval.projectId });
  data = transition(data, { type: 'confirm-budget-baseline', approvalId: approval.id }, pmo);
  const rows = selectTodos(data, pmo).filter((t) => t.id === `BASE-CONFIRM-${approval.id}`);
  expect(rows).toHaveLength(1);
  expect(rows[0].done).toBe(true);
});
