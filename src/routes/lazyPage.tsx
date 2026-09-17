import React, { lazy } from 'react';

// 页面级动态导入辅助：将命名导出的页面组件包装为 React.lazy 组件。
// 所有路由模块必须通过此辅助懒加载页面，避免页面代码被打进首屏入口 chunk。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LazyModule = Record<string, React.ComponentType<any>>;

export const lazyPage = <T extends LazyModule>(importer: () => Promise<T>, exportName: keyof T) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lazy(() => importer().then(m => ({ default: m[exportName] as React.ComponentType<any> })));
