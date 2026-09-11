import { useState } from 'react';
import { DownOutlined, UpOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, DatePicker, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { mockCustomers, mockDepartments, mockProjects } from '@/mock';
import { keys } from '@/utils/project-query';

export function ProjectFilters({ params, onChange, compact = false }: { params: URLSearchParams; onChange: (next: URLSearchParams) => void; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const set = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if ('org' in values) next.delete('orgExact');
    next.delete('projectId'); next.delete('page'); onChange(next);
  };
  const options = (values: string[]) => [...new Set(values)].map((value) => ({ value, label: value }));
  const selects = [
    { key: 'org', label: '组织', options: mockDepartments.map((d) => ({ value: d.id, label: d.name })) },
    { key: 'region', label: '区域', options: options(mockCustomers.map((c) => c.region)) },
    { key: 'type', label: '项目类型', options: options(mockProjects.map((p) => p.type)) },
    { key: 'level', label: '项目等级', options: options(mockProjects.map((p) => p.level)) },
    { key: 'industry', label: '行业', options: options(mockCustomers.map((c) => c.industry)) },
    { key: 'customer', label: '客户', options: mockCustomers.map((c) => ({ value: c.id, label: c.name })) },
    { key: 'pm', label: '项目经理', options: Array.from(new Map(mockProjects.map((p) => [p.pmId, { value: p.pmId, label: p.pmName }])).values()) },
    { key: 'health', label: '健康度', options: ['green', 'yellow', 'orange', 'red'].map((value, i) => ({ value, label: ['健康', '关注', '预警', '高风险'][i] })) },
  ];
  const primary = compact ? selects.filter((s) => ['org', 'health'].includes(s.key)) : selects;
  const secondary = selects.filter((s) => !['org', 'health'].includes(s.key));
  const activeSecondary = [...secondary.map((s) => s.key), 'from', 'search'].filter((key) => params.has(key)).length;
  const totalActive = [...selects.map((s) => s.key), 'from', 'search'].filter((key) => params.has(key)).length;

  const renderSelect = (s: typeof selects[number]) => (
    <Select
      key={s.key}
      aria-label={s.label}
      placeholder={s.label}
      allowClear
      showSearch
      optionFilterProp="label"
      style={{ width: s.key === 'customer' ? 180 : s.key === 'org' ? 160 : 130 }}
      value={params.get(s.key) || undefined}
      options={s.options}
      onChange={(v) => set({ [s.key]: v })}
    />
  );

  const dateAndSearch = (
    <>
      <DatePicker.RangePicker
        aria-label="计划开始日期范围"
        style={{ width: 230 }}
        value={params.get('from') && params.get('to') ? [dayjs(params.get('from')), dayjs(params.get('to'))] : null}
        onChange={(_, dates) => set({ from: dates[0], to: dates[1] })}
      />
      <Input
        prefix={<SearchOutlined className="text-slate-400" />}
        aria-label="项目名称或编号"
        placeholder="搜索项目名称或编号"
        value={params.get('search') ?? ''}
        allowClear
        style={{ width: 190 }}
        onChange={(e) => set({ search: e.target.value })}
      />
    </>
  );

  return (
    <div className="pms-toolbar mb-4 transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between w-full gap-3">
        <Space wrap size={[8, 10]} align="center">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs mr-1 select-none">
            <FilterOutlined className="text-blue-600 text-xs" />
            <span>快速筛选</span>
          </div>
          {primary.map(renderSelect)}
          {!compact && dateAndSearch}
          {compact && (
            <Button
              type={expanded || activeSecondary > 0 ? 'default' : 'dashed'}
              size="middle"
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
              className={activeSecondary > 0 ? 'text-blue-600 border-blue-300' : ''}
            >
              <span>更多筛选</span>
              {activeSecondary > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                  {activeSecondary}
                </span>
              )}
            </Button>
          )}
          {totalActive > 0 && (
            <Button
              type="text"
              icon={<ReloadOutlined className="text-slate-400" />}
              onClick={() => {
                const next = new URLSearchParams(params);
                [...keys, 'metric', 'stage', 'projectId', 'page'].forEach((k) => next.delete(k));
                onChange(next);
              }}
              className="text-slate-500 hover:text-slate-800 text-xs"
            >
              重置
            </Button>
          )}
        </Space>
        {compact && (
          <div className="text-[11px] text-slate-400 hidden xl:block select-none">
            筛选联动经营指标、异常中心与下钻明细
          </div>
        )}
      </div>

      {compact && expanded && (
        <div className="pms-filter-secondary w-full pt-3 mt-2 border-t border-slate-100">
          <Space wrap size={[8, 10]}>
            {secondary.map(renderSelect)}
            {dateAndSearch}
          </Space>
        </div>
      )}
    </div>
  );
}
