import React, { useMemo } from 'react';
import { Result, Button, Skeleton } from 'antd';
import { WarningOutlined, LockOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useBusinessStore } from '@/mock/store';
import { canAccessPage } from '@/mock/configuration-access';
import { GLOBAL_NAV_SECTIONS, ROLE_HOME, type GlobalNavEntry } from '@/routes/navigation';
import { PAGE_MAP } from '@/routes/manifest';

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
  const { currentRole, currentUser } = useAppStore();
  const { data } = useBusinessStore();

  // 🔵1 403 默认回退：取当前角色页集内首个有权页面，避免“403→首页→403”循环
  const firstAccessibleRoute = useMemo(() => {
    for (const section of GLOBAL_NAV_SECTIONS) {
      for (const group of section.groups) {
        for (const raw of group.entries) {
          const entry: GlobalNavEntry = raw;
          const page = entry.pageId ? PAGE_MAP.get(entry.pageId) : undefined;
          const route = entry.route ?? page?.route;
          const permId = entry.permissionPageId ?? entry.pageId;
          if (route && (!permId || canAccessPage(data, currentUser, permId))) return route;
        }
      }
    }
    return ROLE_HOME[currentRole];
  }, [data, currentUser, currentRole]);

  if (type === 'loading') return <div role="status" aria-label="正在加载"><Skeleton active paragraph={{ rows: 6 }} /></div>;

  if (type === '403') {
    return (
      <Result
        status="403"
        icon={<LockOutlined />}
        title={title || '403 无访问权限'}
        subTitle={subTitle || '当前角色没有权限访问该页面或数据，请切换角色或联系管理员'}
        extra={
          <Button type="primary" onClick={onAction || (() => navigate(firstAccessibleRoute))}>
            {actionText || '返回可用页面'}
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
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
        <InboxOutlined style={{ fontSize: 28 }} />
      </div>
      <div className="text-sm font-semibold text-slate-800 mb-1">
        {title || '暂无数据记录'}
      </div>
      <div className="text-xs text-slate-500 max-w-sm mb-4">
        {subTitle || '当前筛选条件下没有匹配的数据记录，您可以调整筛选条件或重置查看全部'}
      </div>
      {actionText && (
        <Button type="primary" size="small" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
