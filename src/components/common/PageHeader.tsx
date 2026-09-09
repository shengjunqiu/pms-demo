import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, Typography, Space, Breadcrumb, Divider } from 'antd';
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
  const displayTitle = title || item?.title || '页面标题';
  const displayDesc = description || item?.upstream_feature_scope;

  return (
    <div style={{ marginBottom: 16 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={breadcrumbs.map((b) => ({ title: b.href ? <Link to={b.href}>{b.title}</Link> : b.title }))}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Space size={8} align="center">
            <Title level={4} style={{ margin: 0 }}>
              {displayTitle}
            </Title>
            {item && <Tag color="blue">{item.id}</Tag>}
            {item && <Tag color="cyan">{item.kind}</Tag>}
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
      <Divider style={{ margin: '12px 0 16px' }} />
    </div>
  );
};
