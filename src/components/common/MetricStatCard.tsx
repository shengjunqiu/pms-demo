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
  variant?: 'card' | 'flat';
  signed?: boolean;
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
  variant = 'card',
  signed = false,
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
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      className={`pms-metric pms-metric--${variant} ${onClick ? 'pms-metric--interactive' : ''} ${className}`}
    >
      {/* 1. 卡片顶行：标签 + 语义图标 */}
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-medium text-slate-600">{title}</span>
        {icon && (
          <div className="text-blue-500  flex items-center">
            {icon}
          </div>
        )}
      </div>

      {/* 2. 卡片核心行：大数值 + 等宽字体 + 单位 */}
      <div className="flex items-baseline space-x-1.5 my-1">
        <span className="pms-metric-value">
          {typeof value === 'number' ? `${signed && value > 0 ? '+' : ''}${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>

      {/* 3. 卡片底行：辅助指标 / 同比环比 / 细分健康度占比 */}
      {(subtitle || trend || statusText) && (
        <div className="pms-metric-caption flex items-center justify-between text-xs text-slate-500">
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
