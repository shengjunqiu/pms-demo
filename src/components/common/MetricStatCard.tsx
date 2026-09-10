import React from 'react';

export interface MetricStatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  statusText?: string;
  statusType?: 'healthy' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  className?: string;
}

export const MetricStatCard: React.FC<MetricStatCardProps> = ({
  title,
  value,
  unit = '万元',
  icon,
  subtitle,
  trend,
  statusText,
  statusType = 'healthy',
  onClick,
  className = '',
}) => {
  const statusColorMap = {
    healthy: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-blue-600',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* 1. 卡片顶行：标签 + 语义图标 */}
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-medium text-slate-600">{title}</span>
        {icon && (
          <div className="text-blue-500 group-hover:scale-110 transition-transform flex items-center">
            {icon}
          </div>
        )}
      </div>

      {/* 2. 卡片核心行：大数值 + 等宽字体 + 单位 */}
      <div className="flex items-baseline space-x-1.5 my-1">
        <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>

      {/* 3. 卡片底行：辅助指标 / 同比环比 / 细分健康度占比 */}
      {(subtitle || trend || statusText) && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span className={`font-mono font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.label} {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {statusText && (
            <span className={`font-mono font-medium ${statusColorMap[statusType]}`}>
              {statusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
