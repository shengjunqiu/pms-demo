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
import { GL02FourCalculationsPage } from '@/pages/executive/GL02FourCalculationsPage';
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

function RoleHome() { const role = useAppStore((s) => s.currentRole); return <Navigate to={ROLE_HOME[role]} replace />; }

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* 默认重定向到驾驶舱 */}
        <Route index element={<RoleHome />} />
        <Route path="/routes-manifest" element={<RoutesManifestPage />} />

        {/* Phase 2: GL 驾驶舱与专题分析 */}
        <Route path="executive/dashboard" element={<GL01DashboardPage />} />
        <Route path="executive/four-calculations" element={<GL02FourCalculationsPage />} />
        <Route path="executive/project-drilldown" element={<GL03ProjectDrilldownPage />} />
        <Route path="executive/portfolio" element={<GL04PortfolioPage />} />
        <Route path="executive/decisions" element={<GL06DecisionsPage />} />
        <Route path="management-approvals/:id" element={<ManagementApprovalPage />} />
        <Route path="approvals/:id" element={<BudgetApprovalPage />} />
        <Route path="executive/exceptions" element={<GL05ExceptionsPage />} />
        <Route path="projects/:id/dynamic-accounting" element={<DynamicAccountingPage />} />
        <Route path="requirements-bugs" element={<TicketsPage family="quality" />} />
        <Route path="requirements-bugs/:id" element={<TicketDetailPage family="quality" />} />
        <Route path="issues-risks" element={<TicketsPage family="risk" />} />
        <Route path="issues-risks/:id" element={<TicketDetailPage family="risk" />} />
        <Route path="workbench/todos" element={<TodosPage />} />
        <Route path="projects/:id/progress" element={<ProjectProgressPage />} />
        <Route path="projects/:id/plan-requests/:requestId" element={<PlanRequestPage />} />
        <Route path="projects/:id" element={<ProjectOverviewPage />} />

        {/* 其余 72 个页面的标准路由占位与挂载 */}
        {PAGE_MANIFEST.map((item) => {
          const relativeRoute = item.route.startsWith('/') ? item.route.slice(1) : item.route;
          // 跳过已实现的页面
          if (['requirements-bugs', 'requirements-bugs/:id', 'issues-risks', 'issues-risks/:id', 'workbench/todos', 'projects/:id/progress', 'projects/:id', 'projects/:id/dynamic-accounting', 'executive/dashboard', 'executive/four-calculations', 'executive/project-drilldown', 'executive/portfolio', 'executive/exceptions', 'executive/decisions'].includes(relativeRoute)) {
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
