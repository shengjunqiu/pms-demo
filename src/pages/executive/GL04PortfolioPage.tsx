import { canViewSensitiveField } from '@/mock/configuration-access';
import { Button, Col, Row, Select, Space, Table, Tag } from 'antd';
import {
  AppstoreOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE, mockCustomers, mockDepartments } from '@/mock';
import { useBusinessStore } from '@/mock/store';
import { fourStage, selectFourCalculations, selectProjects, selectReceipts } from '@/mock/selectors';
import { inOrganization } from '@/mock/org-utils';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { readProjectFilter } from '@/utils/project-query';
import { sumMoney, formatPercent, percentage } from '@/utils/money';
import type { Project } from '@/models/types';

const dimensions = [{ value: 'org', label: '组织层级' }, { value: 'region', label: '区域' }, { value: 'type', label: '项目类型' }, { value: 'level', label: '项目等级' }, { value: 'industry', label: '行业' }, { value: 'customer', label: '客户' }, { value: 'stage', label: '四算阶段' }, { value: 'health', label: '健康度' }];
const healthNames: Record<string, string> = { green: '健康', yellow: '需关注', orange: '预警', red: '高风险' };
export function GL04PortfolioPage() {
  const data = useBusinessStore((s) => s.data); const role = useAppStore((s) => s.currentRole);
  const showMargin = canViewSensitiveField(data, { role }, 'margin');
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  if (!['executive', 'pmo', 'admin'].includes(role)) return <StateView type="403" />;
  const scope = selectProjects(readProjectFilter(params), role, data.projects, data);
  const dimension = dimensions.some((d) => d.value === params.get('dimension')) ? params.get('dimension')! : 'org';
  const root = params.get('org') || 'D-001';
  const groups = new Map<string, { key: string; label: string; projects: Project[]; exact?: boolean }>();
  if (dimension === 'stage') for (const key of ['概算', '预算', '核算', '结算及运维']) groups.set(key, { key, label: key, projects: [] });
  for (const p of scope) {
    const customer = mockCustomers.find((c) => c.id === p.customerId);
    let key = ''; let label = ''; let exact = false;
    if (dimension === 'org') {
      const child = mockDepartments.find((d) => d.parentId === root && inOrganization(p.departmentId, d.id));
      key = child?.id ?? p.departmentId; exact = !child;
      label = `${mockDepartments.find((d) => d.id === key)?.name ?? key}${exact ? '（直属项目）' : ''}`;
    } else {
      key = dimension === 'region' ? customer?.region ?? '未填写' : dimension === 'industry' ? customer?.industry ?? '未填写' : dimension === 'customer' ? p.customerId : dimension === 'stage' ? fourStage(p) : dimension === 'health' ? p.health : dimension === 'level' ? p.level : p.type;
      label = dimension === 'customer' ? p.customerName : dimension === 'health' ? healthNames[key] : key;
    }
    if (!groups.has(key)) groups.set(key, { key, label, projects: [], exact });
    groups.get(key)!.projects.push(p);
  }
  const aggregate = (projects: Project[]) => {
    const calculations = projects.map((p) => selectFourCalculations(p, data)); const income = sumMoney(calculations.map((c) => c.income));
    const rolling = sumMoney(calculations.map((c) => c.rolling)); const gross = sumMoney([income, -rolling]);
    return { count: projects.length, income, rolling, gross, rate: percentage(gross, income), receipts: selectReceipts(projects, data), red: projects.filter((p) => p.health === 'red').length, orange: projects.filter((p) => p.health === 'orange').length, yellow: projects.filter((p) => p.health === 'yellow').length, green: projects.filter((p) => p.health === 'green').length };
  };
  const total = aggregate(scope); const rows = [...groups.values()].map((group) => ({ ...group, ...aggregate(group.projects) }));
  const drill = (row: typeof rows[number], nextLevel = false) => {
    const next = new URLSearchParams(params); next.delete('page'); next.delete('projectId'); next.delete('orgExact');
    next.set(dimension, row.key);
    if (dimension === 'org' && row.exact) next.set('orgExact', 'true');
    if (nextLevel) setParams(next); else navigate(`/executive/project-drilldown?${next}`);
  };
  return <><PageHeader title="GL-04 项目组合分析" description={`集团 → 业务群 → 部门 → 项目 · ${AS_OF_DATE} · 万元`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '组合分析' }]} extra={<Button onClick={() => navigate(-1)}>返回上一级</Button>} />
    <ProjectFilters compact params={params} onChange={setParams} /><details style={{ margin: '12px 0' }}><summary style={{ cursor: 'pointer', color: '#475569' }}>常用视图与导出</summary><div style={{ paddingTop: 12 }}><AnalysisTools storageKey="pms-portfolio-views" params={params} onChange={setParams} exportRows={[
      ['分组', '项目数', '预计收入', '签约金额', '滚动成本', '预测毛利', '加权毛利率'], ...rows.map((r) => [r.label, String(r.count), r.income.toFixed(2), r.receipts.signed.toFixed(2), r.rolling.toFixed(2), showMargin ? r.gross.toFixed(2) : '已隐藏', showMargin ? formatPercent(r.rate) : '已隐藏']),
    ]} /></div></details>
    <Space wrap style={{ margin: '16px 0' }}><Select aria-label="组合维度" style={{ width: 180 }} options={dimensions} value={dimension} onChange={(value) => { const next = new URLSearchParams(params); next.set('dimension', value); next.delete('page'); setParams(next); }} />{dimension === 'org' && <><Tag>当前层级：{mockDepartments.find((d) => d.id === root)?.name}</Tag><Button disabled={root === 'D-001'} onClick={() => { const next = new URLSearchParams(params); next.set('org', mockDepartments.find((d) => d.id === root)?.parentId ?? 'D-001'); next.delete('orgExact'); next.delete('page'); setParams(next); }}>上一级组织</Button></>}</Space>
    <Row gutter={12} style={{ marginBottom: 16 }}>{[
      { label: '去重项目数', value: String(total.count), unit: '个', icon: <AppstoreOutlined /> },
      { label: '预计项目收入', value: total.income, icon: <DollarOutlined /> },
      { label: '已签合同总额', value: total.receipts.signed, icon: <SafetyCertificateOutlined /> },
      { label: '加权预测毛利率', value: showMargin ? formatPercent(total.rate) : '已隐藏', unit: '', icon: <FundOutlined /> },
    ].map((m) => (
      <Col span={6} key={m.label}>
        <MetricStatCard
          title={m.label}
          value={m.value}
          unit={m.unit ?? '万元'}
          icon={m.icon}
        />
      </Col>
    ))}</Row>
    <PageSection title="组合表现" description="比较各组收入规模与风险分布，点击分组继续查看项目"><details><summary style={{ cursor: 'pointer' }}>聚合口径</summary><p>各分组互斥，数量与金额可加总。毛利率 = 汇总预测毛利 ÷ 汇总预计收入；未签收入包含拟签收入，合同金额排除未签。回款按到期计划计算。</p></details>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: '16px 0' }}>
      {[...rows].sort((a, b) => b.income - a.income).slice(0, 3).map((r, index) => <div key={r.key} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
        <Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => drill(r)}>{index + 1}. {r.label}</Button>
        <div style={{ margin: '8px 0' }}>预计收入 <MoneyText value={r.income} /></div>
        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4 }}><div style={{ height: '100%', width: `${percentage(r.income, total.income) ?? 0}%`, background: '#3b82f6', borderRadius: 4 }} /></div>
        <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>{r.count} 个项目 · 收入占比 {formatPercent(percentage(r.income, total.income))} · 高风险 {r.red} 个</div>
      </div>)}
    </div>
    <Table rowKey="key" size="small" dataSource={rows} scroll={{ x: 1700 }} pagination={{ pageSize: 8, current: Number(params.get('page')) || 1, showSizeChanger: false, showTotal: (n) => `共 ${n} 组`, onChange: (page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); } }} columns={[
      { title: '组合分组', width: 220, fixed: 'left', render: (_, r) => <Button type="link" style={{ whiteSpace: 'normal', textAlign: 'left' }} onClick={() => drill(r)}>{r.label}</Button> },
      { title: '项目数', width: 85, dataIndex: 'count' }, { title: '预计收入 / 占比', width: 150, render: (_, r) => <><MoneyText value={r.income} /><div>{formatPercent(percentage(r.income, total.income))}</div></> },
      { title: '已签合同', width: 125, render: (_, r) => <MoneyText value={r.receipts.signed} /> }, { title: '滚动成本', width: 125, render: (_, r) => <MoneyText value={r.rolling} /> },
      { title: '预测毛利 / 比率', width: 150, render: (_, r) => showMargin ? <><MoneyText value={r.gross} /><div>{formatPercent(r.rate)}</div></> : '已隐藏' },
      { title: '健康 / 需关注 / 预警 / 高风险', width: 210, render: (_, r) => `${r.green} / ${r.yellow} / ${r.orange} / ${r.red}` },
      { title: '到期应收 / 实收率', width: 150, render: (_, r) => <><MoneyText value={r.receipts.due} /><div>{formatPercent(r.receipts.dueCompletion)}</div></> },
      { title: '已收 / 逾期', width: 150, render: (_, r) => <><MoneyText value={r.receipts.paid} /><div><MoneyText value={r.receipts.overdue} /></div></> },
      { title: '下钻', width: 150, fixed: 'right', render: (_, r) => <Space direction="vertical"><Button size="small" onClick={() => drill(r)}>查看{r.count}个项目</Button>{dimension === 'org' && !r.exact && <Button size="small" onClick={() => drill(r, true)}>进入下级组织</Button>}</Space> },
    ]} /></PageSection>
  </>;
}
