import { accessConfigurationRoutes } from '@/routes/modules/configuration-access';
import {financeConfigurationRoutes} from '@/routes/modules/configuration-finance';
import {unsignedRoutes} from '@/routes/modules/unsigned';
import { configurationRoutes } from '@/routes/modules/configuration';
import { budgetRoutes } from '@/routes/modules/budget';
import { settlementRoutes } from '@/routes/modules/settlement';
import { opportunityRoutes } from '@/routes/modules/opportunities';
import { ProjectManagerWorkbenchPage } from '@/pages/workbench/ProjectManagerWorkbenchPage';
import { LaborCostPage } from '@/pages/execution/LaborCostPage';
import { ReportsPage } from '@/pages/execution/ReportsPage';
import { DeliverablesPage } from '@/pages/execution/DeliverablesPage';
import { CostSourcesPage } from '@/pages/execution/CostSourcesPage';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoutesManifestPage } from '@/pages/manifest/RoutesManifestPage';
import { PagePlaceholder } from '@/pages/common/PagePlaceholder';
import { StateView } from '@/components/common/StateView';
import { useAppStore } from '@/store/useAppStore';
import { ROLE_HOME } from '@/routes/navigation';
import { PAGE_MANIFEST } from '@/routes/manifest';

// Phase 2: GL 领导经营驾驶舱系列
import { GL01DashboardPage } from '@/pages/executive/GL01DashboardPage';
// import { GL02FourCalculationsPage } from '@/pages/executive/GL02FourCalculationsPage';
import { GL03ProjectDrilldownPage } from '@/pages/executive/GL03ProjectDrilldownPage';
import { GL04PortfolioPage } from '@/pages/executive/GL04PortfolioPage';
import { GL05ExceptionsPage } from '@/pages/executive/GL05ExceptionsPage';
import { DynamicAccountingPage } from '@/pages/execution/DynamicAccountingPage';
import { GL06DecisionsPage } from '@/pages/executive/GL06DecisionsPage';
import { ManagementApprovalPage } from '@/pages/approvals/ManagementApprovalPage';
import { BudgetApprovalPage } from '@/pages/approvals/BudgetApprovalPage';
import { TicketsPage } from '@/pages/tickets/TicketsPage';
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage';
import { TodosPage } from '@/pages/workbench/TodosPage';
import { ProjectProgressPage } from '@/pages/execution/ProjectProgressPage';
import { PlanRequestPage } from '@/pages/approvals/PlanRequestPage';
import { ProjectOverviewPage } from '@/pages/execution/ProjectOverviewPage';
import { ProjectLedgerPage } from '@/pages/projects/ProjectLedgerPage';

function RoleHome() { const role = useAppStore((s) => s.currentRole); return <Navigate to={ROLE_HOME[role]} replace />; }

export const AppRouter: React.FC = () => {
  return (
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
        <Route path="projects/:id/daily-reports" element={<ReportsPage key="daily" />} />
        <Route path="projects/:id/weekly-reports" element={<ReportsPage key="weekly" weekly />} />
        <Route path="projects/:id/deliverables" element={<DeliverablesPage />} />
        <Route path="projects/:id/procurement" element={<CostSourcesPage key="procurement" kind="procurement" />} />
        <Route path="projects/:id/outsourcing" element={<CostSourcesPage key="outsource" kind="outsource" />} />
        <Route path="projects/:id/expenses" element={<CostSourcesPage key="expense" kind="expense" />} />
        <Route path="projects/:id/dynamic-accounting" element={<DynamicAccountingPage />} />
        <Route path="requirements-bugs" element={<TicketsPage family="quality" />} />
        <Route path="requirements-bugs/:id" element={<TicketDetailPage family="quality" />} />
        <Route path="issues-risks" element={<TicketsPage family="risk" />} />
        <Route path="issues-risks/:id" element={<TicketDetailPage family="risk" />} />
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
          if (['workbench/project-manager', 'projects/:id/stage-switch', 'projects/:id/labor-cost', 'projects/:id/daily-reports', 'projects/:id/weekly-reports', 'projects/:id/deliverables', 'projects/:id/procurement', 'projects/:id/outsourcing', 'projects/:id/expenses', 'requirements-bugs', 'requirements-bugs/:id', 'issues-risks', 'issues-risks/:id', 'workbench/todos', 'projects/:id/progress', 'projects/:id', 'projects/:id/dynamic-accounting', 'executive/dashboard', 'executive/project-drilldown', 'executive/portfolio', 'executive/exceptions', 'executive/decisions'].includes(relativeRoute)) {
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
  );
};
