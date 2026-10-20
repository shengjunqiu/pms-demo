import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Typography, Space, Breadcrumb } from 'antd';
import { RouteItem } from '@/routes/manifest';
import { resolveNav, type Crumb } from '@/routes/nav-config';
import { useBusinessStore } from '@/mock/store';

const { Title } = Typography;

interface PageHeaderProps {
  item?: RouteItem;
  title?: string;
  /** 已废弃：页面标题下不再展示描述文字（2026-09-21 评审反馈） */
  description?: string;
  tags?: React.ReactNode[];
  extra?: React.ReactNode;
  /** 仅在导航无法解析当前路径时兜底；其中带查询参数的链接会保留到同路径的导航面包屑上。 */
  breadcrumbs?: Crumb[];
}

/** 面包屑统一由 nav-config 生成；页面传入的同路径链接若带筛选参数，则沿用以保留列表上下文。 */
function useBreadcrumbs(fallback: Crumb[]): Crumb[] {
  const location = useLocation();
  const data = useBusinessStore((s) => s.data);
  const nav = resolveNav(location.pathname, location.search, {
    project: (id) => data.projects.find((p) => p.id === id)?.name,
    opportunity: (id) => data.opportunities.find((o) => o.id === id)?.name,
    initiation: (id) => data.initiations.find((i) => i.id === id)?.input.name,
  });
  if (nav.breadcrumbs.length <= 1) return fallback;
  const withQuery = new Map(fallback.filter((c) => c.href?.includes('?')).map((c) => [c.href!.split('?')[0], c.href!]));
  return nav.breadcrumbs.map((c) => (c.href && withQuery.has(c.href) ? { ...c, href: withQuery.get(c.href) } : c));
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  item,
  title,
  tags,
  extra,
  breadcrumbs = [{ title: '首页', href: '/' }],
}) => {
  const crumbs = useBreadcrumbs(breadcrumbs);
  const displayTitle = (title || item?.title || '页面标题').replace(/^[A-Z]{2}-\d{2}\s+/, '');

  return (
    <div className="pms-page-header">
      {crumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8, fontSize: 12 }}
          items={crumbs.map((b) => ({
            title: b.href ? (
              <Link to={b.href} className="text-slate-500 hover:text-blue-600 transition-colors">
                {b.title}
              </Link>
            ) : (
              <span className="text-slate-700 font-medium">{b.title}</span>
            ),
          }))}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Space size={8} align="center">
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {displayTitle}
            </Title>
            {tags?.map((t, i) => (
              <React.Fragment key={i}>{t}</React.Fragment>
            ))}
          </Space>
        </div>
        {extra && <div className="flex items-center gap-2 flex-wrap">{extra}</div>}
      </div>
    </div>
  );
};
