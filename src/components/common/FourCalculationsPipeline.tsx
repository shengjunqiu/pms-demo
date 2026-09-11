import React from 'react';
import { ArrowRightOutlined, CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { MoneyText } from './MoneyText';

export interface FourStageMetric {
  estimate?: number; // 概算
  budget?: number;   // 预算
  actual?: number;   // 动态核算
  settlement?: number; // 决算
}

interface FourCalculationsPipelineProps {
  metrics: FourStageMetric;
  currentStage?: '商机' | '立项' | '执行' | '结算' | '收尾' | 'all';
  className?: string;
}

export const FourCalculationsPipeline: React.FC<FourCalculationsPipelineProps> = ({
  metrics,
  currentStage = 'all',
  className = '',
}) => {
  const { estimate, budget, actual, settlement } = metrics;

  // 概算 -> 预算偏差 (下浮/溢价)
  const estToBudDiff = estimate && budget ? budget - estimate : null;
  const estToBudRate = estimate && budget && estimate > 0 ? ((budget - estimate) / estimate) * 100 : null;

  // 预算 -> 动态核算 (消耗率 / 超支情况)
  const budToActRate = budget && actual !== undefined && budget > 0 ? (actual / budget) * 100 : null;
  const isOverBudget = budToActRate !== null && budToActRate > 100;

  const stages = [
    {
      key: 'estimate',
      name: '概算阶段',
      subtitle: '商机毛利基准',
      value: estimate,
      highlight: currentStage === '商机',
      badge: '立项前',
    },
    {
      key: 'budget',
      name: '预算阶段',
      subtitle: '目标成本基线',
      value: budget,
      highlight: currentStage === '立项',
      badge: estToBudDiff !== null ? (
        <span className={estToBudDiff <= 0 ? 'text-emerald-600' : 'text-amber-600'}>
          {estToBudDiff > 0 ? '+' : ''}{estToBudRate?.toFixed(1)}% 偏差
        </span>
      ) : null,
    },
    {
      key: 'actual',
      name: '核算阶段',
      subtitle: '实时动态发生成本',
      value: actual,
      highlight: currentStage === '执行',
      badge: budToActRate !== null ? (
        <span className={isOverBudget ? 'text-rose-600 font-semibold' : 'text-blue-600'}>
          消耗 {budToActRate.toFixed(1)}%
        </span>
      ) : null,
      isAlert: isOverBudget,
    },
    {
      key: 'settlement',
      name: '决算阶段',
      subtitle: '最终经营结果',
      value: settlement,
      highlight: currentStage === '结算' || currentStage === '收尾',
      badge: settlement !== undefined ? '经营锁定' : '待结算',
    },
  ];

  return (
    <div className={`pms-section pms-pipeline-card ${className}`} style={{ padding: '16px', background: '#fff' }}>
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">四算全生命周期贯通看板</span>
        </div>
        <div className="text-xs text-slate-500">
          {currentStage === 'all' ? (
            <span className="text-slate-500">全局项目聚合视角</span>
          ) : (
            <>当前项目阶段: <span className="font-medium text-blue-600">{currentStage}阶段</span></>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {stages.map((stage, idx) => (
          <div
            key={stage.key}
            className={`p-3 rounded-lg border transition-all relative ${
              stage.highlight
                ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20'
                : 'border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300'
            }`}
          >
            {/* 顶栏 */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                {stage.name}
                {stage.isAlert ? (
                  <ExclamationCircleFilled className="text-rose-500 text-xs" />
                ) : (
                  stage.value !== undefined && <CheckCircleFilled className="text-emerald-500 text-xs" />
                )}
              </span>
              <span className="text-[11px] text-slate-500">{stage.badge}</span>
            </div>

            {/* 数值 */}
            <div className="text-lg font-bold text-slate-900 my-0.5">
              {stage.value !== undefined ? (
                <>
                  <MoneyText value={stage.value} />
                  <span className="text-xs font-normal text-slate-500 ml-1">万元</span>
                </>
              ) : (
                <span className="text-slate-300 font-normal text-sm">尚未产生</span>
              )}
            </div>

            {/* 底部副文案 */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
              <span>{stage.subtitle}</span>
              {idx < stages.length - 1 && (
                <ArrowRightOutlined className="text-slate-300 hidden md:block" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
