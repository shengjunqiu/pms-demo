import { lazyPage } from '@/routes/lazyPage';

const PermissionsPage = lazyPage(() => import('@/pages/configuration/PermissionsPage'), 'PermissionsPage');
const AuditLogPage = lazyPage(() => import('@/pages/configuration/AuditLogPage'), 'AuditLogPage');

export const accessConfigurationRoutes=[{path:'settings/permissions',element:<PermissionsPage/>},{path:'settings/audit-log',element:<AuditLogPage/>}];
