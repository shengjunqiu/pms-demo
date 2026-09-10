import { beforeAll, expect, it } from 'vitest';
import { mockProjects, mockDepartments } from '@/mock';
import { selectProjects, inOrganization, selectFourCalculations } from '@/mock/selectors';
import { createDemoBusinessState } from '@/mock/business-domain';
import { sumMoney } from '@/utils/money';

// Build the shared demo seed during fixture setup; each test still receives its own deep clone.
beforeAll(() => { createDemoBusinessState(); });

it('集团与部门筛选包含后代，直属筛选排除后代且每个项目只计一次', () => {
  const group = selectProjects({ org: 'D-002' });
  const children = mockDepartments.filter((d) => d.parentId === 'D-002');
  const partition = [...selectProjects({ org: 'D-002', orgExact: 'true' }), ...children.flatMap((d) => selectProjects({ org: d.id }))];
  expect(new Set(partition.map((p) => p.id)).size).toBe(partition.length);
  expect(partition.map((p) => p.id).sort()).toEqual(group.map((p) => p.id).sort());
  expect(group.every((p) => inOrganization(p.departmentId, 'D-002'))).toBe(true);
  expect(selectProjects({ stage: '核算' }).map((p) => p.id)).toEqual(mockProjects.filter((p) => p.phase === '执行').map((p) => p.id));
});
it('四算科目跨项目加总守恒，结算比较只纳入锁定项目', () => {
  const data = createDemoBusinessState();
  const rows = data.projects.map((p) => selectFourCalculations(p, data));
  expect(sumMoney(rows.flatMap((r) => r.subjects.map((s) => s.rolling)))).toBe(sumMoney(rows.map((r) => r.rolling)));
  expect(sumMoney(rows.flatMap((r) => r.subjects.map((s) => s.estimate)))).toBe(sumMoney(rows.map((r) => r.estimate!.totalCost)));
  const settled = rows.filter((r) => r.settlement);
  expect(settled).toHaveLength(1);
  expect(settled[0].settlement?.projectId).toBe('P-008');
  expect(rows[0].settlement).toBeUndefined();
});
