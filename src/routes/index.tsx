import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoutesManifestPage } from '@/pages/manifest/RoutesManifestPage';
import { PagePlaceholder } from '@/pages/common/PagePlaceholder';
import { StateView } from '@/components/common/StateView';
import { PAGE_MANIFEST } from '@/routes/manifest';

// Phase 2: GL 领导经营驾驶舱系列
import { GL01DashboardPage } from '@/pages/executive/GL01DashboardPage';
import { GL02FourCalculationsPage } from '@/pages/executive/GL02FourCalculationsPage';
import { GL03ProjectDrilldownPage } from '@/pages/executive/GL03ProjectDrilldownPage';
import { GL04PortfolioPage } from '@/pages/executive/GL04PortfolioPage';
import { GL05ExceptionsPage } from '@/pages/executive/GL05ExceptionsPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* 默认重定向到驾驶舱 */}
        <Route index element={<Navigate to="/executive/dashboard" replace />} />
        <Route path="/routes-manifest" element={<RoutesManifestPage />} />

        {/* Phase 2: GL 驾驶舱与专题分析 */}
        <Route path="executive/dashboard" element={<GL01DashboardPage />} />
        <Route path="executive/four-calculations" element={<GL02FourCalculationsPage />} />
        <Route path="executive/project-drilldown" element={<GL03ProjectDrilldownPage />} />
        <Route path="executive/portfolio" element={<GL04PortfolioPage />} />
        <Route path="executive/exceptions" element={<GL05ExceptionsPage />} />

        {/* 其余 72 个页面的标准路由占位与挂载 */}
        {PAGE_MANIFEST.map((item) => {
          const relativeRoute = item.route.startsWith('/') ? item.route.slice(1) : item.route;
          // 跳过已实现的页面
          if (['executive/dashboard', 'executive/four-calculations', 'executive/project-drilldown', 'executive/portfolio', 'executive/exceptions'].includes(relativeRoute)) {
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
