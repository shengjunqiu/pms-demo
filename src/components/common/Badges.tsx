import React from 'react';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

// 1. 经营阶段标签 (四算主线：商机、立项、执行中核算、结算中、已关闭)
export type BusinessStage = '商机阶段' | '立项阶段' | '执行中' | '结算中' | '已关闭' | string;

export const BusinessStageBadge: React.FC<{ stage?: BusinessStage; className?: string }> = ({
  stage = '执行中',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
      <span>{stage}</span>
    </span>
  );
};

// 2. 交付阶段标签 (现场实施推进：准备、交底、推进、报验、试运行、终验、维保等)
export type DeliveryStage =
  | '立项准备'
  | '开工交底'
  | '实施推进'
  | '初验报验'
  | '试运行'
  | '终验移交'
  | '维保期'
  | '已归档'
  | string;

export const DeliveryStageBadge: React.FC<{ stage?: DeliveryStage; className?: string }> = ({
  stage = '实施推进',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
    >
      {stage}
    </span>
  );
};

// 3. 健康状态标签 (正常运行 / 重点关注 / 重大风险)
export type HealthStatus = '健康' | '正常' | '正常运行' | '关注' | '预警' | '重点关注' | '严重' | '风险' | '重大风险' | string;

export const HealthBadge: React.FC<{ status?: HealthStatus; label?: string; className?: string }> = ({
  status = '正常',
  label,
  className = '',
}) => {
  const text = label || status;
  if (status.includes('高风险') || status.includes('重大') || status.includes('严重') || status.includes('红') || status.includes('超支')) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
      >
        <ExclamationCircleOutlined className="text-rose-600 text-[11px]" />
        <span>{text}</span>
      </span>
    );
  }
  if (status.includes('关注') || status.includes('预警') || status.includes('黄') || status.includes('中度')) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
      >
        <WarningOutlined className="text-amber-600 text-[11px]" />
        <span>{text}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
    >
      <CheckCircleOutlined className="text-emerald-600 text-[11px]" />
      <span>{text}</span>
    </span>
  );
};

// 4. 风险等级标签 (低风险 / 中风险 / 高风险 / 特大风险)
export type RiskLevel = '低' | '低风险' | '中' | '中风险' | '高' | '高风险' | '特大' | '特大风险' | string;

export const RiskBadge: React.FC<{ level?: RiskLevel; className?: string }> = ({
  level = '低风险',
  className = '',
}) => {
  if (level.includes('特大')) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 ${className}`}
      >
        {level}
      </span>
    );
  }
  if (level.includes('高')) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
      >
        {level}
      </span>
    );
  }
  if (level.includes('中')) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
      >
        {level}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      {level}
    </span>
  );
};
