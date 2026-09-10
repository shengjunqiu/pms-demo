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
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((b) => ({ title: b.href ? <Link to={b.href}>{b.title}</Link> : b.title }))}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Space size={8} align="center">
            <Title level={4} style={{ margin: 0 }}>
              {displayTitle}
            </Title>
            {tags?.map((t, i) => (
              <React.Fragment key={i}>{t}</React.Fragment>
            ))}
          </Space>
          {displayDesc && (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13 }}>
              {displayDesc}
            </Paragraph>
          )}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
};
