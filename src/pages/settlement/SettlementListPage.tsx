import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSection, PageToolbar } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { useBusinessStore } from '@/mock/store';
import { visibleProjects } from '@/mock/selectors';
import { useAppStore } from '@/store/useAppStore';
import type { SettlementRequest } from '@/models/settlement';
import type { SettlementRecord } from '@/models/types';

const STATUS_COLOR: Record<string, string> = {
  草稿: 'default',
  财务核算: 'processing',
  材料整改: 'warning',
  金额退回: 'warning',
  PMO审核: 'processing',
  结算评审: 'processing',
  待最终锁定: 'gold',
  已锁定: 'success',
};

const ROLE_ALLOWED = ['executive', 'pmo', 'finance', 'project-manager', 'admin'];

type Row = {
  key: string;
  projectId: string;
  projectName: string;
  customerName: string;
  request?: SettlementRequest;
  settlement?: SettlementRecord;
  status: string;
  version?: number;
  submittedBy?: string;
  createdAt?: string;
  settledDate?: string;
  finalIncome: number;
  finalCost: number;
  grossMarginRate: number;
};

export function SettlementListPage() {
  const navigate = useNavigate();
  const { data } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();

  const rows = useMemo<Row[]>(() => {
    if (!ROLE_ALLOWED.includes(currentRole)) return [];
    const projects = visibleProjects(currentRole, data.projects, data);
    return projects
      .flatMap<Row>((p) => {
        const requests = data.settlementRequests
          .filter((r) => r.projectId === p.id)
          .sort((a, b) => b.version - a.version);
        const request = requests.find((r) => !r.supersededBy);
        const settlement = data.settlements.find(
          (s) => s.projectId === p.id && s.status === '已锁定已生效',
        );
        if (!request && !settlement) return [];
        const snapshot = request?.snapshot;
        return [{
          key: p.id,
          projectId: p.id,
          projectName: p.name,
          customerName: p.customerName,
          request,
          settlement,
          status: request?.status ?? '已锁定',
          version: request?.version,
          submittedBy: request?.submittedBy,
          createdAt: request?.createdAt,
          settledDate: settlement?.settledDate,
          finalIncome: settlement?.finalIncome ?? snapshot?.income ?? p.contractAmount,
          finalCost: settlement?.finalCost ?? snapshot?.cost ?? p.actualCost,
          grossMarginRate:
            settlement?.finalGrossMarginRate ??
            (p.contractAmount ? ((p.contractAmount - p.actualCost) / p.contractAmount) * 100 : 0),
        }];
      })
      .sort(
        (a, b) =>
          Number(a.status === '已锁定') - Number(b.status === '已锁定') ||
          (a.settledDate ?? '').localeCompare(b.settledDate ?? '') ||
          a.projectId.localeCompare(b.projectId),
      );
  }, [currentRole, data]);

  if (!ROLE_ALLOWED.includes(currentRole))
    return <StateView type="403" subTitle="结算台账仅财务、PMO、项目经理与经营角色可见" />;

  const filtered = rows.filter((row) => {
    if (status && row.status !== status) return false;
    const text = `${row.projectId} ${row.projectName} ${row.customerName}`;
    return !keyword || text.includes(keyword);
  });
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const open = (row: Row) => navigate(`/projects/${row.projectId}/settlement${row.request ? `?request=${row.request.id}` : ''}`);
  const actionLabel = (row: Row) => {
    if (row.status === '已锁定') return '查看结算';
    if (currentRole === 'finance' || currentRole === 'pmo') return '办理结算';
    return '查看详情';
  };

  return (
    <>
      <PageHeader
        title="结算台账"
        description="跨项目查看结算申请与已锁定结果；办理动作仍在项目结算详情按节点执行"
      />
      <div className="pms-metric-strip grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricStatCard variant="flat" title="待财务核算" value={count('财务核算') + count('材料整改') + count('金额退回')} unit="项" />
        <MetricStatCard variant="flat" title="待 PMO 审核/评审" value={count('PMO审核') + count('结算评审')} unit="项" />
        <MetricStatCard variant="flat" title="待最终锁定" value={count('待最终锁定')} unit="项" />
        <MetricStatCard variant="flat" title="已锁定生效" value={count('已锁定')} unit="项" />
      </div>
      <PageSection title="结算项目" description="已锁定项目只读；进行中项目按当前节点由财务或 PMO 办理">
        <PageToolbar>
          <Input.Search
            allowClear
            placeholder="搜索项目编号 / 名称 / 客户"
            style={{ width: 320 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="结算状态"
            style={{ width: 180 }}
            value={status}
            onChange={setStatus}
            options={['草稿', '财务核算', '材料整改', '金额退回', 'PMO审核', '结算评审', '待最终锁定', '已锁定'].map((v) => ({ value: v, label: v }))}
          />
          <span style={{ color: '#64748b' }}>共 {filtered.length} 个项目</span>
        </PageToolbar>
        <Table<Row>
          rowKey="key"
          size="small"
          dataSource={filtered}
          scroll={{ x: 960 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={[
            {
              title: '项目',
              width: 260,
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <Button type="link" style={{ padding: 0 }} onClick={() => open(row)}>
                    {row.projectName}
                  </Button>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{row.projectId} · {row.customerName}</span>
                </Space>
              ),
            },
            { title: '版本', width: 70, responsive: ['xxl'], render: (_, row) => (row.version ? `V${row.version}` : '历史冻结') },
            { title: '状态', width: 100, render: (_, row) => <Tag color={STATUS_COLOR[row.status]}>{row.status}</Tag> },
            { title: '提交人', width: 100, responsive: ['xxl'], render: (_, row) => row.submittedBy ?? '—' },
            { title: '提交日期', width: 100, render: (_, row) => row.createdAt ?? '—' },
            { title: '结算收入', width: 110, align: 'right', render: (_, row) => <MoneyText value={row.finalIncome} /> },
            { title: '结算成本', width: 110, align: 'right', render: (_, row) => <MoneyText value={row.finalCost} /> },
            { title: '毛利率', width: 80, align: 'right', render: (_, row) => `${row.grossMarginRate.toFixed(2)}%` },
            { title: '锁定日期', width: 100, render: (_, row) => row.settledDate ?? '—' },
            {
              title: '操作',
              width: 100,
              fixed: 'right',
              render: (_, row) => (
                <Button type="link" onClick={() => open(row)}>
                  {actionLabel(row)}
                </Button>
              ),
            },
          ]}
        />
      </PageSection>
      <Card size="small" className="mt-3">
        <span style={{ color: '#64748b' }}>
          当前角色：{currentUser.name}；结算台账只汇总项目结算原单，不替代四算对比与经营结果页面。
        </span>
      </Card>
    </>
  );
}
