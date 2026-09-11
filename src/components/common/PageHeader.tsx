import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Space, Breadcrumb } from 'antd';
import { RouteItem } from '@/routes/manifest';

const { Title, Paragraph } = Typography;

interface PageHeaderProps {
  item?: RouteItem;
  title?: string;
  description?: string;
  tags?: React.ReactNode[];
  extra?: React.ReactNode;
  breadcrumbs?: { title: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  item,
  title,
  description,
  tags,
  extra,
  breadcrumbs = [{ title: '首页', href: '/' }],
}) => {
  const displayTitle = (title || item?.title || '页面标题').replace(/^[A-Z]{2}-\d{2}\s+/, '');
  const displayDesc = description || item?.upstream_feature_scope;

  return (
    <div className="pms-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 10, fontSize: 12 }}
          items={breadcrumbs.map((b) => ({
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Space size={8} align="center">
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {displayTitle}
            </Title>
            {tags?.map((t, i) => (
              <React.Fragment key={i}>{t}</React.Fragment>
            ))}
          </Space>
          {displayDesc && (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6 }}>
              {displayDesc}
            </Paragraph>
          )}
        </div>
        {extra && <div className="flex items-center gap-2 flex-wrap">{extra}</div>}
      </div>
    </div>
  );
};
