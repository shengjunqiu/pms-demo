import type { UserRole } from '@/store/useAppStore';

export const ROLE_HOME: Record<UserRole, string> = {
  executive: '/executive/dashboard', pmo: '/executive/dashboard',
  'project-manager': '/workbench/project-manager', market: '/opportunities',
  finance: '/executive/four-calculations', 'solution-tech': '/opportunities',
  admin: '/settings/permissions',
};

/** Use the route's entity type, so issue, initiation and opportunity links never receive wrong project IDs. */
export function demoRoute(route: string): string {
  const id = route.startsWith('/opportunities/') ? 'OPP-001'
    : route.startsWith('/initiation/') ? 'INIT-1'
    : route.startsWith('/issues-risks/') ? 'ISSUE-0003'
    : route.startsWith('/requirements-bugs/') ? 'REQ-0001'
    : route.startsWith('/operations/') ? 'OPS-007'
    : route.startsWith('/unsigned-projects/') ? 'P-004'
    : 'P-001';
  return route.replace(':id', id).replace(':taskId', 'TSK-0001');
}
