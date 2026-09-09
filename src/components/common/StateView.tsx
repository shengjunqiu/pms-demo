import React from 'react';
import { Result, Button, Skeleton } from 'antd';
import { WarningOutlined, LockOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export interface StateViewProps {
  type?: 'empty' | '403' | '404' | 'error' | 'loading';
  title?: string;
  subTitle?: string;
  actionText?: string;
  onAction?: () => void;
}

export const StateView: React.FC<StateViewProps> = ({
  type = 'empty',
  title,
  subTitle,
  actionText,
  onAction,
}) => {
  const navigate = useNavigate();

  if (type === 'loading') return <div role="status" aria-label="正在加载"><Skeleton active paragraph={{ rows: 6 }} /></div>;

  if (type === '403') {
    return (
      <Result
        status="403"
        icon={<LockOutlined />}
        title={title || '403 无访问权限'}
        subTitle={subTitle || '当前角色没有权限访问该页面或数据，请切换角色或联系管理员'}
        extra={
          <Button type="primary" onClick={onAction || (() => navigate('/'))}>
            {actionText || '返回首页'}
          </Button>
        }
      />
    );
  }

  if (type === '404') {
    return (
      <Result
        status="404"
        title={title || '404 页面未找到'}
        subTitle={subTitle || '抱歉，您访问的页面不存在或已被移除'}
        extra={
          <Button type="primary" onClick={onAction || (() => navigate('/'))}>
            {actionText || '返回首页'}
          </Button>
        }
      />
    );
  }

  if (type === 'error') {
    return (
      <Result
        status="error"
        icon={<WarningOutlined />}
        title={title || '加载或计算失败'}
        subTitle={subTitle || '系统数据异常，请检查配置或稍后重试'}
        extra={
          <Button type="primary" onClick={onAction || (() => window.location.reload())}>
            {actionText || '刷新重试'}
          </Button>
        }
      />
    );
  }

  return (
    <Result
      icon={<InboxOutlined style={{ color: '#bfbfbf' }} />}
      title={title || '暂无数据'}
      subTitle={subTitle || '当前筛选条件下没有匹配的数据记录'}
      extra={
        actionText && (
          <Button type="primary" onClick={onAction}>
            {actionText}
          </Button>
        )
      }
    />
  );
};
