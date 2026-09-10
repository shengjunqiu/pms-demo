import { Button, Card, Col, Dropdown, Empty, Progress, Row, Select, Table, Tabs, Tag, Typography } from 'antd';
import {
  ProjectOutlined,
  CarryOutOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { selectFourCalculations, selectReceipts, visibleProjects } from '@/mock/selectors';
import { selectTodos } from '@/mock/todos';
import { useAppStore } from '@/store/useAppStore';

const actions = [
  ['采购申请', 'procurement'], ['外包申请', 'outsourcing'], ['费用申请', 'expenses'],
  ['项目变更', '/project-changes/new'], ['预算变更', 'budget'], ['阶段切换', 'stage-switch'],
  ['项目报验', 'report-acceptance'], ['项目结算', 'settlement/apply'],
  ['提问题', '/issues-risks?kind=issue'], ['提风险', '/issues-risks?kind=risk'],
  ['提需求', '/requirements-bugs?kind=requirement'], ['提 BUG', '/requirements-bugs?kind=bug'],
];
export function ProjectManagerWorkbenchPage() {
  const data = useBusinessStore((s) => s.data); const { currentUser, currentRole } = useAppStore();
  const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const projects = visibleProjects(currentRole, data.projects, data);
  const participating = params.get('scope') === 'participating';
  const mine = projects.filter((p) => participating ? p.memberIds?.includes(currentUser.id) && p.pmId !== currentUser.id : p.pmId === currentUser.id);
  const selected = mine.find((p) => p.id === params.get('project')) ?? mine[0];
  const ids = new Set(mine.map((p) => p.id));
  const todos = selectTodos(data, currentUser).filter((t) => (ids.has(t.projectId ?? '') || t.sourceType === 'initiation') && !t.done).sort((a, b) => a.due.localeCompare(b.due));
  const milestones = data.milestones.filter((m) => ids.has(m.projectId) && m.status !== '已达成' && m.plannedDate <= '2026-09-16').sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const receipts = selectReceipts(mine, data).plans.filter((r) => r.paidAmount < r.amount && r.dueDate <= '2026-09-16');
  const acceptances = data.acceptances.filter((a) => ids.has(a.projectId) && a.status !== '已通过');
  const rows = mine.map((p) => ({ ...p, calc: selectFourCalculations(p, data), contractDate: data.contracts.find((c) => c.projectId === p.id && c.status !== '已终止')?.acceptanceDueDate }));
  const goAction = (path: string) => {
    if (!selected) return;
    navigate(path.startsWith('/') ? `${path}${path.includes('?') ? '&' : '?'}projectId=${selected.id}` : `/projects/${selected.id}/${path}`);
  };
  const quality = (id: string, kind: string) => {
    const list = kind === 'issue' ? data.issues : kind === 'risk' ? data.risks : kind === 'bug' ? data.bugs : data.requirements;
    const count = list.filter((t) => t.projectId === id && !['已关闭', '已缓解', '已转问题'].includes(t.status)).length;
    return <Button type="link" size="small" onClick={() => navigate(`/${kind === 'issue' || kind === 'risk' ? 'issues-risks' : 'requirements-bugs'}?projectId=${id}&kind=${kind}`)}>{count}</Button>;
  };
  return <><PageHeader title="WK-01 项目经理工作台" description={`${currentUser.name} · ${AS_OF_DATE} · 今天要处理什么，项目进展到哪里`} breadcrumbs={[{ title: '首页', href: '/' }, { title: '项目经理工作台' }]} />
    <Tabs activeKey={participating ? 'participating' : 'owned'} onChange={(scope) => setParams({ scope })} items={[{ key: 'owned', label: '我负责' }, { key: 'participating', label: '我参与' }]} />
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>{[
      { title: '当前项目', value: String(mine.length), unit: '个', icon: <ProjectOutlined />, statusText: '在管', statusType: 'healthy' as const },
      { title: '待处理事项', value: String(todos.length), unit: '项', icon: <CarryOutOutlined />, statusText: '待办', statusType: todos.length > 0 ? ('warning' as const) : ('healthy' as const) },
      { title: '超期待办', value: String(todos.filter((t) => t.due < AS_OF_DATE).length), unit: '项', icon: <ClockCircleOutlined />, statusText: todos.filter((t) => t.due < AS_OF_DATE).length > 0 ? '需紧急处理' : '无逾期', statusType: todos.filter((t) => t.due < AS_OF_DATE).length > 0 ? ('danger' as const) : ('healthy' as const) },
      { title: '预警与高风险项目', value: String(mine.filter((p) => ['orange', 'red'].includes(p.health)).length), unit: '个', icon: <AlertOutlined />, statusText: mine.filter((p) => ['orange', 'red'].includes(p.health)).length > 0 ? '重点跟踪' : '暂无预警或高风险', statusType: mine.filter((p) => ['orange', 'red'].includes(p.health)).length > 0 ? ('danger' as const) : ('healthy' as const) },
    ].map((m) => (
      <Col span={6} key={m.title}>
        <MetricStatCard
          title={m.title}
          value={m.value}
          unit={m.unit}
          icon={m.icon}
          statusText={m.statusText}
          statusType={m.statusType}
        />
      </Col>
    ))}</Row>
    <Row gutter={[16, 16]} className="pms-focus-row"><Col span={14}><Card size="small" title="异常与待处理事项" extra={<Button type="link" onClick={() => navigate('/workbench/todos')}>全部待办</Button>}><Table rowKey="id" size="small" dataSource={todos} pagination={{ pageSize: 4, showSizeChanger: false }} columns={[
      { title: '事项', render: (_, t) => <>{t.title}<div><Typography.Text type="secondary">{t.projectId ?? t.sourceName} · {t.node}</Typography.Text></div></> },
      { title: '到期', width: 115, render: (_, t) => <Typography.Text type={t.due < AS_OF_DATE ? 'danger' : undefined}>{t.due}</Typography.Text> },
      { title: '操作', width: 100, render: (_, t) => <Button size="small" onClick={() => navigate(t.route)}>去办理</Button> },
    ]} /></Card></Col><Col span={10} className="pms-stacked-cards"><Card size="small" title="7天内到期与超期里程碑" extra={<Button type="link" size="small" disabled={!selected} onClick={() => goAction('progress')}>项目进度</Button>}>{milestones.length ? milestones.slice(0, 6).map((m) => <div key={m.id} style={{ marginBottom: 12 }}><Tag color={m.plannedDate < AS_OF_DATE ? 'error' : 'warning'}>{m.plannedDate < AS_OF_DATE ? '已超期' : '即将到期'}</Tag>{m.plannedDate}<div><Button type="link" size="small" onClick={() => navigate(`/projects/${m.projectId}/progress`)}>{m.projectId} · {m.name}</Button></div></div>) : <Empty description="近期无待达成里程碑" />}</Card>
      <Card title="快捷发起" size="small" style={{ marginTop: 16 }}>
        <Select aria-label="快捷操作项目" value={selected?.id} placeholder="选择项目" style={{ width: '100%' }} options={mine.map((p) => ({ value: p.id, label: `${p.id} ${p.name}` }))} onChange={(project) => { const next = new URLSearchParams(params); next.set('project', project); setParams(next); }} />
        <div className="pms-action-list">{actions.slice(0, 3).map(([label, path]) => <Button key={label} disabled={!selected} onClick={() => goAction(path)}>{label}</Button>)}
          <Dropdown trigger={['click']} menu={{ items: actions.slice(3).map(([label, path]) => ({ key: path, label, onClick: () => goAction(path) })) }}>
            <Button disabled={!selected}>更多发起 <DownOutlined /></Button>
          </Dropdown>
        </div>
      </Card>
    </Col></Row>
    <Card title="我的项目 · 进度、成本与待处理事项" size="small" style={{ marginBottom: 16 }}><Table rowKey="id" size="small" dataSource={rows} scroll={{ x: 2100 }} pagination={{ pageSize: 5, showSizeChanger: false }} columns={[
      { title: '项目编号 / 名称', fixed: 'left', width: 240, render: (_, p) => <><Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/projects/${p.id}`)}>{p.code}</Button><div><Button type="link" className="pms-project-name" onClick={() => navigate(`/projects/${p.id}`)}>{p.name}</Button></div></> },
      { title: '项目金额', align: 'right', width: 120, render: (_, p) => <MoneyText value={p.revenueAmount ?? p.contractAmount} /> },
      { title: '合同 / 计划验收', width: 190, render: (_, p) => <>{p.contractDate ?? '尚未签约'}<div>{p.plannedEndDate}</div></> },
      { title: '阶段 / 健康度', width: 160, render: (_, p) => <>{p.phase} · {p.subPhase}<div><Tag color={p.health === 'red' ? 'error' : p.health === 'green' ? 'success' : 'warning'}>{p.status}</Tag></div></> },
      { title: '整体完成率', width: 160, render: (_, p) => <Progress percent={p.progressRate} size="small" /> },
      ...(['issue', 'risk', 'bug', 'requirement'] as const).map((kind, i) => ({ title: ['问题', '风险', 'BUG', '需求'][i], width: 75, render: (_: unknown, p: typeof rows[number]) => quality(p.id, kind) })),
      { title: '预算 / 已用成本', width: 170, render: (_, p) => <><MoneyText value={p.calc.budget?.totalAmount} /><div><MoneyText value={p.calc.actual} /></div></> },
      { title: '预计预算结余', width: 175, render: (_, p) => <><MoneyText value={p.calc.budget ? -p.calc.variance : null} signed /><div><Button size="small" type="link" onClick={() => navigate(`/projects/${p.id}/dynamic-accounting`)}>查看动态核算</Button></div></> },
      { title: '人力预算 / 已用', width: 160, render: (_, p) => <><MoneyText value={p.calc.subjects.find((s) => s.subjectId === 'SUB-01')?.budget} /><div><MoneyText value={p.calc.subjects.find((s) => s.subjectId === 'SUB-01')?.actual} /></div></> },
    ]} /></Card>
    <Row gutter={[16, 16]}>
    <Col span={12}><Card size="small" title="待验收与整改">{acceptances.length ? acceptances.slice(0, 5).map((a) => <p key={a.id}><Tag color={a.status === '整改中' ? 'warning' : 'blue'}>{a.status}</Tag><Button type="link" onClick={() => navigate(`/projects/${a.projectId}/${a.type === '内部初验' ? 'internal-acceptance' : a.type === '供应商验收' ? 'supplier-acceptance' : 'customer-acceptance'}`)}>{a.projectId} · {a.type} · 第{a.round}轮</Button></p>) : <Empty description="暂无待处理验收" />}</Card></Col>
    <Col span={12}><Card size="small" title="近期回款与逾期款项">{receipts.length ? receipts.slice(0, 5).map((r) => <p key={r.id}><Tag color={r.dueDate < AS_OF_DATE ? 'error' : 'blue'}>{r.dueDate}</Tag><Button type="link" onClick={() => navigate(`/projects/${r.projectId}?tab=receipts`)}>{r.projectId} · {r.title}</Button><MoneyText value={r.amount - r.paidAmount} /></p>) : <Empty description="近期无待回款事项" />}</Card></Col></Row>
  </>;
}
