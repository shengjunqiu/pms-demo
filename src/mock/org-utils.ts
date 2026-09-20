import { mockDepartments } from '@/mock';

export function inOrganization(departmentId: string, root?: string): boolean {
  if (!root || root === 'all') return true;
  const seen = new Set<string>();
  let id: string | undefined = departmentId;
  while (id && !seen.has(id)) {
    if (id === root) return true;
    seen.add(id);
    id = mockDepartments.find((d) => d.id === id)?.parentId;
  }
  return false;
}