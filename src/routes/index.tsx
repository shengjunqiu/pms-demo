import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
import { ROLE_HOME } from '@/routes/navigation';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { Spin } from 'antd';

// 模块路由（页面组件已在模块内部懒加载）
import { accessConfigurationRoutes } from '@/routes/modules/configuration-access';
import {financeConfigurationRoutes} from '@/routes/modules/configuration-finance';
import {unsignedRoutes} from '@/routes/modules/unsigned';
import { configurationRoutes } from '@/routes/modules/configuration';
import { budgetRoutes } from '@/routes/modules/budget';
import { settlementRoutes } from '@/routes/modules/settlement';
import { opportunityRoutes } from '@/routes/modules/opportunities';
import { RoutesManifestPage } from '@/pages/manifest/RoutesManifestPage';
import { PagePlaceholder } from '@/pages/common/PagePlaceholder';
import { StateView } from '@/components/common/StateView';
import { lazyPage } from '@/routes/lazyPage';

const ProjectManagerWorkbenchPage = lazyPage(() => import('@/pages/workbench/ProjectManagerWorkbenchPage'), 'ProjectManagerWorkbenchPage');
const LaborCostPage = lazyPage(() => import('@/pages/execution/LaborCostPage'), 'LaborCostPage');
const ReportsPage = lazyPage(() => import('@/pages/execution/ReportsPage'), 'ReportsPage');
const DeliverablesPage = lazyPage(() => import('@/pages/execution/DeliverablesPage'), 'DeliverablesPage');
const CostSourcesPage = lazyPage(() => import('@/pages/execution/CostSourcesPage'), 'CostSourcesPage');
const GL01DashboardPage = lazyPage(() => import('@/pages/executive/GL01DashboardPage'), 'GL01DashboardPage');
const GL03ProjectDrilldownPage = lazyPage(() => import('@/pages/executive/GL03ProjectDrilldownPage'), 'GL03ProjectDrilldownPage');
const GL04PortfolioPage = lazyPage(() => import('@/pages/executive/GL04PortfolioPage'), 'GL04PortfolioPage');
const GL05ExceptionsPage = lazyPage(() => import('@/pages/executive/GL05ExceptionsPage'), 'GL05ExceptionsPage');
const DynamicAccountingPage = lazyPage(() => import('@/pages/execution/DynamicAccountingPage'), 'DynamicAccountingPage');
const GL06DecisionsPage = lazyPage(() => import('@/pages/executive/GL06DecisionsPage'), 'GL06DecisionsPage');
const ManagementApprovalPage = lazyPage(() => import('@/pages/approvals/ManagementApprovalPage'), 'ManagementApprovalPage');
const BudgetApprovalPage = lazyPage(() => import('@/pages/approvals/BudgetApprovalPage'), 'BudgetApprovalPage');
const TicketsPage = lazyPage(() => import('@/pages/tickets/TicketsPage'), 'TicketsPage');
const TicketDetailPage = lazyPage(() => import('@/pages/tickets/TicketDetailPage'), 'TicketDetailPage');
const TodosPage = lazyPage(() => import('@/pages/workbench/TodosPage'), 'TodosPage');
const ProjectProgressPage = lazyPage(() => import('@/pages/execution/ProjectProgressPage'), 'ProjectProgressPage');
const PlanRequestPage = lazyPage(() => import('@/pages/approvals/PlanRequestPage'), 'PlanRequestPage');
const ProjectOverviewPage = lazyPage(() => import('@/pages/execution/ProjectOverviewPage'), 'ProjectOverviewPage');
const ProjectLedgerPage = lazyPage(() => import('@/pages/projects/ProjectLedgerPage'), 'ProjectLedgerPage');

const PageLoading = () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><Spin /></div>;

function RoleHome() { const role = useAppStore((s) => s.currentRole); return <Navigate to={ROLE_HOME[role]} replace />; }

export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoading />}>
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {accessConfigurationRoutes.map(route=><Route key={route.path} path={route.path} element={route.element}/>)}
        {financeConfigurationRoutes.map(route=><Route key={route.path} path={route.path} element={route.element}/>)}
        {unsignedRoutes.map(route=><Route key={route.path} path={route.path} element={route.element}/>)}
        {configurationRoutes.map(route=><Route key={route.path} path={route.path} element={route.element}/>)}
        {budgetRoutes.map(route=><Route key={route.path} path={route.path} element={route.element}/>)}
        {/* 默认重定向到驾驶舱 */}
        <Route index element={<RoleHome />} />
        <Route path="/routes-manifest" element={<RoutesManifestPage />} />

        {opportunityRoutes.map(r=><Route key={r.path} path={r.path} element={r.element}/>)}
        {/* Phase 2: GL 驾驶舱与专题分析 */}
        <Route path="executive/dashboard" element={<GL01DashboardPage />} />
        {/* <Route path="executive/four-calculations" element={<GL02FourCalculationsPage />} /> */}
        <Route path="executive/project-drilldown" element={<GL03ProjectDrilldownPage />} />
        <Route path="executive/portfolio" element={<GL04PortfolioPage />} />
        <Route path="executive/decisions" element={<GL06DecisionsPage />} />
        <Route path="management-approvals/:id" element={<ManagementApprovalPage />} />
        <Route path="approvals/:id" element={<BudgetApprovalPage />} />
        <Route path="executive/exceptions" element={<GL05ExceptionsPage />} />
        <Route path="projects/:id/stage-switch" element={<PlanRequestPage stageEntry />} />
        <Route path="projects/:id/labor-cost" element={<LaborCostPage />} />
        <Route path="projects/:id/reports" element={<ReportsPage />} />
        <Route path="projects/:id/daily-reports" element={<ReportsPage />} />
        <Route path="projects/:id/weekly-reports" element={<ReportsPage />} />
        <Route path="projects/:id/deliverables" element={<DeliverablesPage />} />
        <Route path="projects/:id/costs" element={<CostSourcesPage />} />
        <Route path="projects/:id/procurement" element={<CostSourcesPage />} />
        <Route path="projects/:id/outsourcing" element={<CostSourcesPage />} />
        <Route path="projects/:id/expenses" element={<CostSourcesPage />} />
        <Route path="projects/:id/dynamic-accounting" element={<DynamicAccountingPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="requirements-bugs" element={<TicketsPage />} />
        <Route path="requirements-bugs/:id" element={<TicketDetailPage />} />
        <Route path="issues-risks" element={<TicketsPage />} />
        <Route path="issues-risks/:id" element={<TicketDetailPage />} />
        <Route path="workbench/project-manager" element={<ProjectManagerWorkbenchPage />} />
        <Route path="workbench/todos" element={<TodosPage />} />
        <Route path="projects" element={<ProjectLedgerPage />} />
        <Route path="projects/:id/progress" element={<ProjectProgressPage />} />
        <Route path="projects/:id/plan-requests/:requestId" element={<PlanRequestPage />} />
        <Route path="projects/:id" element={<ProjectOverviewPage />} />

        {settlementRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        {/* 其余 72 个页面的标准路由占位与挂载 */}
        {PAGE_MANIFEST.map((item) => {
          const relativeRoute = item.route.startsWith('/') ? item.route.slice(1) : item.route;
          // 跳过已实现的页面
          if (accessConfigurationRoutes.some(r=>r.path===relativeRoute)) return null;
          if (financeConfigurationRoutes.some(r=>r.path===relativeRoute)) return null;
          if (unsignedRoutes.some(r=>r.path===relativeRoute)) return null;
          if (configurationRoutes.some(r=>r.path===relativeRoute)) return null;
          if (budgetRoutes.some(r=>r.path===relativeRoute)) return null;
          if (settlementRoutes.some(r=>r.path===relativeRoute)) return null;
          if (opportunityRoutes.some(r=>r.path===relativeRoute)) return null;
          if (['workbench/project-manager', 'projects/:id/stage-switch', 'projects/:id/labor-cost', 'projects/:id/reports', 'projects/:id/daily-reports', 'projects/:id/weekly-reports', 'projects/:id/deliverables', 'projects/:id/costs', 'projects/:id/procurement', 'projects/:id/outsourcing', 'projects/:id/expenses', 'tickets', 'tickets/:id', 'requirements-bugs', 'requirements-bugs/:id', 'issues-risks', 'issues-risks/:id', 'workbench/todos', 'projects/:id/progress', 'projects/:id', 'projects/:id/dynamic-accounting', 'executive/dashboard', 'executive/project-drilldown', 'executive/portfolio', 'executive/exceptions', 'executive/decisions', 'settings/finance-config'].includes(relativeRoute)) {
            return null;
          }
          return (
            <Route
              key={item.id}
              path={relativeRoute}
              element={<PagePlaceholder pageId={item.id} />}
            />
          );
        })}

        {/* 异常状态演示与404 */}
        <Route path="/status/403" element={<StateView type="403" />} />
        <Route path="/status/404" element={<StateView type="404" />} />
        <Route path="/status/loading" element={<StateView type="loading" />} />
        <Route path="/status/empty" element={<StateView type="empty" />} />
        <Route path="/status/error" element={<StateView type="error" />} />
        <Route path="*" element={<StateView type="404" />} />
      </Route>
    </Routes>
    </Suspense>
  );
};
