import { it, expect } from 'vitest';
import { createDemoBusinessState, transition } from '@/mock/business-domain';
import { selectTodos } from '@/mock/todos';


it('待办按来源分层：审批节点归我审批的，本人节点归我办理的，督办归我跟进的', () => {
  const data = createDemoBusinessState();
  const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
  const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
  const pmRows = selectTodos(data, pm);
  expect(pmRows.length).toBeGreaterThan(0);
  expect(pmRows.every((t) => ['approval', 'mine', 'follow'].includes(t.source!))).toBe(true);
  // 最终确认与主 PM 日报是本人的活；工时审核是对他人申报出结论。
  expect(pmRows.filter((t) => t.duty === '最终确认').every((t) => t.source === 'mine')).toBe(true);
  expect(pmRows.filter((t) => t.type === '日报').every((t) => t.source === 'mine')).toBe(true);
  expect(pmRows.filter((t) => t.type === '工时审核').every((t) => t.source === 'approval')).toBe(true);
  // PMO 的立项评审属于审批类，不被归入本人节点。
  expect(selectTodos(data, pmo).filter((t) => t.type === '立项评审' && !t.done).every((t) => t.source === 'approval')).toBe(true);
});

it('外部发起事项的最终确认待办对项目主PM可见并标注来源', () => {
  const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
  const todo = selectTodos(createDemoBusinessState(), pm).find((t) => t.id === 'REQ-0001');
  expect(todo).toMatchObject({ duty: '最终确认', source: 'mine', done: false });
});

it('预算审批办理后转为独立PMO确认待办，确认后原节点进入已办且不重复生成', () => {
  const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
  let data = createDemoBusinessState();
  const approval = data.approvals.find((a) => a.kind === 'budget' && a.status === '待审批')!;
  const fin = { id: 'U-004', name: '刘敏', role: 'finance' as const };
  const actor = approval.requiredRole === 'executive' ? { id: 'U-003', name: '王总', role: 'executive' as const } : pmo;
  expect(selectTodos(data, pmo).filter((t) => t.id === `BASE-CONFIRM-${approval.id}`)).toHaveLength(0);
  for (const node of approval.nodes ?? []) for (const role of node.roles) data = transition(data, { type: 'review', approvalId: approval.id, approve: true, opinion: '复核预算一致' }, role === 'finance' ? fin : role === 'pmo' ? pmo : actor);
  expect(selectTodos(data, pmo).find((t) => t.id === `BASE-CONFIRM-${approval.id}`)).toMatchObject({ done: false, route: `/approvals/${approval.id}`, projectId: approval.projectId });
  data = transition(data, { type: 'confirm-budget-baseline', approvalId: approval.id }, pmo);
  const rows = selectTodos(data, pmo).filter((t) => t.id === `BASE-CONFIRM-${approval.id}`);
  expect(rows).toHaveLength(1);
  expect(rows[0].done).toBe(true);
});

it('结算在途事项进入财务/PMO待办并可回到项目结算页', () => {
  const data = createDemoBusinessState();
  const request = data.settlementRequests.find((r) => !r.supersededBy && r.status === '财务核算');
  expect(request).toBeDefined();
  const fin = { id: 'U-004', name: '刘敏', role: 'finance' as const };
  const pmo = { id: 'U-002', name: '李主任', role: 'pmo' as const };
  expect(selectTodos(data, fin).find((t) => t.id === request!.id)).toMatchObject({
    type: '结算核算',
    duty: '审批',
    source: 'approval',
    done: false,
    route: `/projects/${request!.projectId}/settlement`,
  });
  expect(selectTodos(data, pmo).some((t) => t.id === request!.id)).toBe(false);
  const afterFinance = transition(data, { type: 'review-settlement', id: request!.id, operation: 'finance-confirm', opinion: '收入与税费核对一致', invoicedAmount: request!.snapshot.income, taxAmount: 0 }, fin);
  expect(selectTodos(afterFinance, pmo).find((t) => t.id === request!.id)).toMatchObject({
    type: '结算核算',
    node: 'PMO材料与过程审核',
    source: 'approval',
    done: false,
  });
});
