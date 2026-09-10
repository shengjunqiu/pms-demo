import React from 'react';
import { Select, Button } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  businessStages?: FilterOption[];
  deliveryStages?: FilterOption[];
  healthStatuses?: FilterOption[];
  selectedBusinessStage?: string;
  selectedDeliveryStage?: string;
  selectedHealthStatus?: string;
  onBusinessStageChange?: (val: string) => void;
  onDeliveryStageChange?: (val: string) => void;
  onHealthStatusChange?: (val: string) => void;
  onReset?: () => void;
  extraFilters?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  businessStages = [
    { label: '全部经营阶段', value: 'all' },
    { label: '商机阶段', value: '商机阶段' },
    { label: '立项阶段', value: '立项阶段' },
    { label: '执行中', value: '执行中' },
    { label: '结算中', value: '结算中' },
    { label: '已关闭', value: '已关闭' },
  ],
  deliveryStages = [
    { label: '全部交付阶段', value: 'all' },
    { label: '立项准备', value: '立项准备' },
    { label: '开工交底', value: '开工交底' },
    { label: '实施推进', value: '实施推进' },
    { label: '初验报验', value: '初验报验' },
    { label: '试运行', value: '试运行' },
    { label: '终验移交', value: '终验移交' },
    { label: '已归档', value: '已归档' },
  ],
  healthStatuses = [
    { label: '全部健康状态', value: 'all' },
    { label: '健康/正常', value: '正常' },
    { label: '重点关注', value: '关注' },
    { label: '重大风险', value: '重大' },
  ],
  selectedBusinessStage = 'all',
  selectedDeliveryStage = 'all',
  selectedHealthStatus = 'all',
  onBusinessStageChange,
  onDeliveryStageChange,
  onHealthStatusChange,
  onReset,
  extraFilters,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs mb-4 ${className}`}>
      {/* 第一行：标题 + 规范强调 + 重置动作 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">多维组合筛选器</span>
          <span className="text-xs text-slate-400">（经营阶段与交付阶段独立双轨筛选）</span>
        </div>
        {onReset && (
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={onReset}
            className="text-slate-500 hover:text-blue-600 text-xs"
          >
            重置条件
          </Button>
        )}
      </div>

      {/* 第二行：响应式栅格布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
        {/* 经营阶段：淡蓝底色高亮 */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-blue-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            四算经营阶段
          </span>
          <Select
            value={selectedBusinessStage}
            onChange={onBusinessStageChange}
            options={businessStages}
            className="w-full bg-blue-50/40 rounded-lg border-blue-200"
            size="middle"
          />
        </div>

        {/* 交付阶段：淡紫区分 */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-purple-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            现场交付阶段
          </span>
          <Select
            value={selectedDeliveryStage}
            onChange={onDeliveryStageChange}
            options={deliveryStages}
            className="w-full rounded-lg"
            size="middle"
          />
        </div>

        {/* 健康状态 */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-600">健康与风险度</span>
          <Select
            value={selectedHealthStatus}
            onChange={onHealthStatusChange}
            options={healthStatuses}
            className="w-full rounded-lg"
            size="middle"
          />
        </div>

        {/* 额外扩展筛选条件 */}
        {extraFilters && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600">更多维度</span>
            <div>{extraFilters}</div>
          </div>
        )}
      </div>
    </div>
  );
};
