import { useState } from 'react';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Input, Select, Space } from 'antd';
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
  const renderSelect = (s: typeof selects[number]) => <Select key={s.key} aria-label={s.label} placeholder={s.label} allowClear showSearch optionFilterProp="label" style={{ width: s.key === 'customer' ? 200 : 140 }} value={params.get(s.key) || undefined} options={s.options} onChange={(v) => set({ [s.key]: v })} />;
  const dateAndSearch = <>
    <DatePicker.RangePicker aria-label="计划开始日期范围" value={params.get('from') && params.get('to') ? [dayjs(params.get('from')), dayjs(params.get('to'))] : null} onChange={(_, dates) => set({ from: dates[0], to: dates[1] })} />
    <Input aria-label="项目名称或编号" placeholder="项目名称或编号" value={params.get('search') ?? ''} allowClear style={{ width: 200 }} onChange={(e) => set({ search: e.target.value })} />
  </>;
  return <Card size="small" style={{ marginBottom: 16 }}><Space wrap size={[8, 12]}>
    {primary.map(renderSelect)}
    {!compact && dateAndSearch}
    {compact && <Button type="text" icon={expanded ? <UpOutlined /> : <DownOutlined />} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起筛选' : '更多筛选'}{activeSecondary ? `（${activeSecondary}项已选）` : ''}</Button>}
    <Button onClick={() => { const next = new URLSearchParams(params); [...keys, 'metric', 'stage', 'projectId', 'page'].forEach((k) => next.delete(k)); onChange(next); }}>重置筛选</Button>
    {compact && <span className="pms-section-note">当前筛选同步用于指标、异常和下钻明细</span>}
  </Space>
    {compact && expanded && <div className="pms-filter-secondary"><Space wrap size={[8, 12]}>{secondary.map(renderSelect)}{dateAndSearch}</Space></div>}
  </Card>;
}
