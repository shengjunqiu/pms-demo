import { useState } from 'react';
import { Alert, Button, Card, Col, Popover, Radio, Row, Space, Table, Tabs, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { selectProjects, selectReceipts } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import { percentage } from '@/utils/money';
import { readProjectFilter } from '@/utils/project-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectFilters } from '@/components/common/ProjectFilters';
import { MoneyText } from '@/components/common/MoneyText';
import { StateView } from '@/components/common/StateView';

const healths = [{ key: 'green', name: '健康', color: '#52c41a' }, { key: 'yellow', name: '需关注', color: '#d4a017' }, { key: 'orange', name: '预警', color: '#fa8c16' }, { key: 'red', name: '高风险', color: '#cf1322' }];

export function GL01DashboardPage() {
  const data = useBusinessStore((s) => s.data);
  const role = useAppStore((s) => s.currentRole);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [refresh, setRefresh] = useState(0);
  const mode = params.get('demo') ?? 'normal';
  const allowed = ['executive', 'pmo', 'admin'].includes(role);
  const scope = mode === 'empty' ? [] : selectProjects(readProjectFilter(params), role, data.projects, data);
  const receipt = selectReceipts(scope, data);
  const ids = new Set(scope.map((p) => p.id));
  const query = (values: Record<string, string> = {}) => {
    const next = new URLSearchParams(params);
    next.delete('demo');
    Object.entries(values).forEach(([k, v]) => next.set(k, v));
    return next;
  };
  const drill = (values: Record<string, string> = {}) => navigate(`/executive/project-drilldown?${query(values)}`);
  const exception = (values: Record<string, string> = {}) => navigate(`/executive/exceptions?${query(values)}`);
  const goProject = (id: string) => drill({ projectId: id });
  const health = healths.map((h) => ({ ...h, count: scope.filter((p) => p.health === h.key).length }));

  const content = (
    <>
      <ProjectFilters compact params={params} onChange={setParams} />

      {/* 整体情况 Dashboard */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>整体情况</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* 整体项目情况 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>整体项目情况</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>84030.50</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fa8c16' }}>66.24%</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              年度验收指标 <span style={{ fontWeight: 500, color: '#475569' }}>126,848.62</span>
            </div>
          </div>

          {/* 已签在建 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>已签在建</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>本周新增</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>46.00</div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              累计存量 <span style={{ fontWeight: 500, color: '#475569' }}>{receipt.signed.toFixed(2)}</span>
            </div>
          </div>

          {/* 立项未签项目 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>立项未签项目</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>本周新增</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>0.00</div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              累计立项未签 <span style={{ fontWeight: 500, color: '#475569' }}>{scope.filter(p => p.isUnsigned).reduce((sum, p) => sum + (p.unsignedLimitQuota ?? 0), 0).toFixed(2)}</span>
            </div>
          </div>

          {/* 已签在建成本超支项目 */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>已签在建成本超支项目</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>万元</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>当前成本超支</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1677ff' }}>491.50</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>外部建设成本超支</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1677ff' }}>452.18</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>外部费用成本超支</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1677ff' }}>8.85</div>
              </div>
            </div>
          </div>
        </div>

        {/* 汇总条 */}
        <div style={{ marginTop: 12, background: 'linear-gradient(90deg, rgba(22,119,255,0.06) 0%, rgba(248,250,252,0.5) 100%)', border: '1px solid rgba(22,119,255,0.12)', borderRadius: 8, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 12, color: '#475569' }}>
            <span>上周新增项目 <strong style={{ color: '#1677ff' }}>3</strong> 个，金额 <strong style={{ color: '#1677ff' }}>19.00</strong> 万</span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <span>上周验收项目 <strong style={{ color: '#1677ff' }}>13</strong> 个，金额 <strong style={{ color: '#1677ff' }}>1,309.88</strong> 万</span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <span>截至目前已签在建存量 <strong style={{ color: '#1677ff' }}>{scope.filter(p => !p.isUnsigned && p.phase !== '已关闭').length}</strong> 个，金额 <strong style={{ color: '#1677ff' }}>{receipt.signed.toFixed(2)}</strong> 万</span>
          </div>
        </div>
      </div>

      {/* 整体情况 & 项目过程分析 Tabs */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: '整体情况',
              children: (
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={[
                    {
                      key: 'all',
                      label: '全部',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '立项金额(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '合同签约情况', dataIndex: 'isUnsigned', render: (v: boolean) => <Tag color={v ? 'warning' : 'success'}>{v ? '未签约' : '已签约'}</Tag> },
                            { title: '已签在建金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '当前阶段', dataIndex: 'phase' },
                            { title: '项目经理', dataIndex: 'pmName' },
                            { title: '健康度', dataIndex: 'health', render: (v: string) => <Tag color={v === 'green' ? 'success' : v === 'red' ? 'error' : v === 'orange' ? 'warning' : 'processing'}>{healths.find(h => h.key === v)?.name ?? v}</Tag> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'signed',
                      label: '已签在建',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => !p.isUnsigned && (p.phase === '执行' || p.phase === '收尾'))}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '完工进度', dataIndex: 'progressRate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'unsigned',
                      label: '立项未签项目',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.isUnsigned)}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '立项金额(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '未签限额(万)', dataIndex: 'unsignedLimitQuota', render: (v?: number) => v != null ? <MoneyText value={v} /> : '—' },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '当前阶段', dataIndex: 'phase' },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'weeklyNew',
                      label: '本周新增项目',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.phase === '立项')}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '立项金额(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '合同签约情况', dataIndex: 'isUnsigned', render: (v: boolean) => <Tag color={v ? 'warning' : 'success'}>{v ? '未签约' : '已签约'}</Tag> },
                            { title: '客户', dataIndex: 'customerName' },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'weeklyAccept',
                      label: '本周验收项目',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.phase === '收尾')}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '计划验收日期', dataIndex: 'plannedEndDate' },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'settled',
                      label: '已结算项目',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.phase === '运维' || p.phase === '已关闭')}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '合同金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '已发生成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '成本偏差(万)', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'process',
              label: '项目过程分析',
              children: (
                <Tabs
                  defaultActiveKey="all-process"
                  size="small"
                  items={[
                    {
                      key: 'all-process',
                      label: '全部',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '当前阶段', dataIndex: 'phase' },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '实际成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '成本偏差(万)', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '偏差率', dataIndex: 'costVarianceRate', render: (v: number) => <span style={{ color: v > 0 ? '#cf1322' : '#52c41a' }}>{(v * 100).toFixed(1)}%</span> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'construction-overrun',
                      label: '建设成本超支',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.costVariance > 0)}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算建设成本(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '实际费用(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '超支金额(万)', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '成本使用率', dataIndex: 'costVarianceRate', render: (v: number) => <span style={{ color: v > 1 ? '#cf1322' : '#52c41a' }}>{((v + 1) * 100).toFixed(1)}%</span> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'fee-overrun',
                      label: '费用成本超支',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.costVariance > 0)}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算费用(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '实际费用(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '超支金额(万)', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'delivery-overrun',
                      label: '交付超支项目',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.costVariance > 0 && (p.phase === '执行' || p.phase === '收尾'))}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '实际成本(万)', dataIndex: 'actualCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '成本偏差(万)', dataIndex: 'costVariance', render: (v: number) => <MoneyText value={v} signed /> },
                            { title: '完工进度', dataIndex: 'progressRate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'delivery-warning',
                      label: '交付成本预警',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope.filter(p => p.costVarianceRate > 0.1 && p.phase !== '已关闭')}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '项目金额(万)', dataIndex: 'contractAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '预算成本(万)', dataIndex: 'budgetAmount', render: (v: number) => <MoneyText value={v} /> },
                            { title: '滚动成本(万)', dataIndex: 'rollingCost', render: (v: number) => <MoneyText value={v} /> },
                            { title: '偏差率', dataIndex: 'costVarianceRate', render: (v: number) => <Tag color="error">{(v * 100).toFixed(1)}%</Tag> },
                            { title: '健康度', dataIndex: 'health', render: (v: string) => <Tag color={v === 'green' ? 'success' : v === 'red' ? 'error' : v === 'orange' ? 'warning' : 'processing'}>{healths.find(h => h.key === v)?.name ?? v}</Tag> },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'quality',
                      label: '质量分析',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: 'BUG总数', render: () => Math.floor(Math.random() * 10) },
                            { title: '未关闭BUG', render: () => Math.floor(Math.random() * 5) },
                            { title: '质量评分', render: () => `${(80 + Math.random() * 20).toFixed(1)}分` },
                            { title: '当前阶段', dataIndex: 'phase' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'satisfaction',
                      label: '满意度分析',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={scope}
                          columns={[
                            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
                            { title: '项目名称', dataIndex: 'name', render: (name: string, r) => <Button type="link" style={{ padding: 0 }} onClick={() => goProject(r.id)}>{name}</Button> },
                            { title: '客户满意度', render: () => <Tag color="success">{(85 + Math.random() * 15).toFixed(1)}%</Tag> },
                            { title: '内部满意度', render: () => <Tag color="success">{(80 + Math.random() * 20).toFixed(1)}%</Tag> },
                            { title: '当前阶段', dataIndex: 'phase' },
                            { title: '项目经理', dataIndex: 'pmName' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'risk-issue',
                      label: '风险/问题分析',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          dataSource={[
                            ...data.issues.filter(i => ids.has(i.projectId)).map(i => ({ ...i, type: '问题', typeColor: 'orange' })),
                            ...data.risks.filter(r => ids.has(r.projectId)).map(r => ({ ...r, type: '风险', typeColor: 'red' })),
                          ]}
                          columns={[
                            { title: '类型', dataIndex: 'type', render: (v: string, r: any) => <Tag color={r.typeColor}>{v}</Tag> },
                            { title: '标题', dataIndex: 'title' },
                            { title: '等级', dataIndex: 'level' },
                            { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('关闭') ? 'default' : 'processing'}>{v}</Tag> },
                            { title: '责任人', dataIndex: 'owner' },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 项目健康度分布 */}
      {!scope.length ? null : (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title="项目健康度分布"
              extra={
                <Button type="link" style={{ padding: 0 }} onClick={() => exception()}>
                  查看异常原因 →
                </Button>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {health.map((h) => (
                  <div
                    key={h.key}
                    onClick={() => h.count && exception({ health: h.key })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      background: '#fafbfc',
                      border: `1px solid ${h.count ? '#e2e8f0' : '#f1f5f9'}`,
                      textAlign: 'center',
                      cursor: h.count ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{h.name}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--pms-font-mono)', color: h.color }}>
                      {h.count}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {percentage(h.count, scope.length)?.toFixed(1) ?? 0}%
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9', marginBottom: 10 }}>
                {health.map((h) => {
                  const pct = percentage(h.count, scope.length) ?? 0;
                  if (!pct) return null;
                  return (
                    <div
                      key={h.key}
                      style={{
                        width: `${pct}%`,
                        background: h.color,
                        height: '100%',
                      }}
                      title={`${h.name}: ${h.count}个 (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                <span>
                  异常项目（需关注/预警/高风险）：
                  <strong style={{ color: '#cf1322', marginLeft: 4 }}>
                    {health.filter((h) => h.key !== 'green').reduce((n, h) => n + h.count, 0)}
                  </strong> 项
                </span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>最严重因素优先判定</span>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="GL-01 项目看板"
        description={`集团经营规模、四算、健康异常与待决策 · 更新至 ${AS_OF_DATE} 18:30 · 金额单位：万元`}
        breadcrumbs={[{ title: '首页', href: '/' }]}
        extra={
          <Space>
            {allowed && (
              <Popover
                trigger="click"
                placement="bottomRight"
                title="演示场景"
                content={
                  <Radio.Group
                    value={mode}
                    onChange={(e) => {
                      const next = new URLSearchParams(params);
                      next.set('demo', e.target.value);
                      setParams(next);
                    }}
                    options={[
                      { value: 'normal', label: '正常' },
                      { value: 'delayed', label: '部分数据延迟' },
                      { value: 'empty', label: '无数据' },
                      { value: 'denied', label: '无权限' },
                      { value: 'loading', label: '计算中' },
                      { value: 'changed', label: '口径变更' },
                    ]}
                  />
                }
              >
                <Button>演示场景</Button>
              </Popover>
            )}
            <Button onClick={() => setRefresh((n) => n + 1)}>
              刷新数据{refresh ? `（已刷新${refresh}次）` : ''}
            </Button>
          </Space>
        }
      />
      {mode === 'delayed' && (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="演示：采购来源同步延迟，暂使用最近已确认快照"
          description="采购快照截至2026-09-08 18:30，其他来源截至2026-09-09 18:30；不把未确认金额加入已发生成本。"
        />
      )}
      {mode === 'changed' && (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16 }}
          message="演示口径公告：回款完成率按到期计划计算"
          description="分母为到期应收，不再使用合同总额。合同余额、到期应收和逾期分别展示，历史预算与结算快照不回写。"
        />
      )}
      {!allowed || mode === 'denied' ? (
        <StateView type="403" />
      ) : mode === 'loading' ? (
        <StateView type="loading" />
      ) : (
        content
      )}
    </>
  );
}
