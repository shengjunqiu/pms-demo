import type { UserRole } from '@/store/useAppStore';

export const ROLE_HOME: Record<UserRole, string> = {
  executive: '/executive/dashboard', pmo: '/executive/dashboard',
  'project-manager': '/workbench/project-manager', market: '/opportunities',
  finance: '/executive/four-calculations', 'solution-tech': '/opportunities',
  admin: '/settings/permissions',
};

export interface GlobalNavEntry {
  pageId?: string;
  route?: string;
  label?: string;
  permissionPageId?: string;
}

export interface GlobalNavGroup {
  key: string;
  label: string;
  icon: 'workspace' | 'business' | 'executive' | 'settings';
  entries: GlobalNavEntry[];
}

export interface GlobalNavSection {
  key: string;
  title: string;
  groups: GlobalNavGroup[];
}

/**
 * The global sidebar only contains context-free workbenches, ledgers and settings.
 * Entity details and action pages belong to opportunity/initiation/project workspaces.
 */
export const GLOBAL_NAV_SECTIONS: GlobalNavSection[] = [
  {
    key: 'workspace',
    title: '工作台与任务',
    groups: [
      {
        key: 'workspace',
        label: '工作台与待办',
        icon: 'workspace',
        entries: [{ pageId: 'WK-01' }, { pageId: 'WK-02' }],
      },
    ],
  },
  {
    key: 'management',
    title: '经营分析',
    groups: [
      {
        key: 'management-center',
        label: '项目经营看板',
        icon: 'executive',
        entries: [
          { pageId: 'GL-01' },
          { pageId: 'GL-02' },
          { pageId: 'GL-05' },
          { pageId: 'WK-03' },
        ],
      },
    ],
  },
  {
    key: 'business',
    title: '业务中心',
    groups: [
      {
        key: 'business-center',
        label: '业务台账与评审',
        icon: 'business',
        entries: [
          { pageId: 'GS-01' },
          { pageId: 'YS-02' },
          { pageId: 'GS-11' },
          { pageId: 'YS-13' },
          { route: '/projects', label: '项目台账', permissionPageId: 'HS-01' },
          { route: '/tickets', label: '事项管理', permissionPageId: 'HS-05' },
          { pageId: 'HS-14' },
        ],
      },
    ],
  },
  {
    key: 'system',
    title: '系统设置与管理',
    groups: [
      {
        key: 'settings',
        label: '系统与规则配置',
        icon: 'settings',
        entries: [
          { pageId: 'CF-01' }, { pageId: 'CF-02' }, { pageId: 'CF-03' },
          { route: '/settings/finance-config', label: '财务配置', permissionPageId: 'CF-04' },
          { pageId: 'CF-07' }, { pageId: 'CF-08' },
        ],
      },
    ],
  },
];

/** Keep the global menu anchored to a ledger while the user opens one of its records. */
export function globalNavKey(pathname: string): string {
  if (pathname === '/projects' || pathname.startsWith('/projects/') || pathname.startsWith('/operations/')) return '/projects';
  if (pathname === '/opportunities' || pathname.startsWith('/opportunities/')) return '/opportunities';
  if (pathname.startsWith('/initiation/')) return '/initiation/review';
  if (pathname.startsWith('/unsigned-projects/')) return '/unsigned-projects';
  if (pathname.startsWith('/projects/') && (pathname.includes('/reports') || pathname.includes('/costs'))) return '/projects';
  if (pathname === '/tickets' || pathname.startsWith('/tickets/') || pathname.startsWith('/requirements-bugs/') || pathname.startsWith('/issues-risks/')) return '/tickets';
  if (pathname.startsWith('/project-changes/')) return '/project-changes';
  return pathname;
}

/** Demo-only route materialization used by the 72-page manifest, never by the global sidebar. */
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
