import { useActionAccess } from '@/hooks/useActionAccess';
import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Col, Descriptions, Input, InputNumber, Modal, Row, Space, Table, Tag, Timeline } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AS_OF_DATE } from '@/mock';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { visibleProjects } from '@/mock/selectors';
import { PageSection, PageToolbar } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import type { WbsTask } from '@/models/types';

export function ProjectProgressPage() {
  const { id } = useParams();
  return <ProjectProgressContent key={id} />;
}
function ProjectProgressContent() {
  const {canDo}=useActionAccess();
  const { id } = useParams(); const [params] = useSearchParams(); const navigate = useNavigate(); const { message } = App.useApp();
  const { data, dispatch } = useBusinessStore(); const { currentRole, currentUser } = useAppStore();
  const [editing, setEditing] = useState<WbsTask>(); const [percent, setPercent] = useState(0); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [note, setNote] = useState('');
  const tableRef=useRef<HTMLDivElement>(null);
  const focusTask=params.get('task');
  useEffect(()=>{if(focusTask){const row=Array.from(tableRef.current?.querySelectorAll('tr[data-row-key]')??[]).find(el=>el.getAttribute('data-row-key')===focusTask);row?.scrollIntoView({block:'center',behavior:'auto'});}},[focusTask,id]);
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (!visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)) return <StateView type="403" />;
  const tasks = data.tasks.filter((t) => t.projectId === id); const milestones = data.milestones.filter((m) => m.projectId === id);
  const current = milestones.filter((m) => m.status === '已达成').at(-1);
  const upcoming = milestones.filter((m) => m.status !== '已达成').sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0];
  const pm = currentRole === 'project-manager' && currentUser.id === p.pmId && !data.lockedProjects.includes(p.id);
  const canUpdateTask=(task?:WbsTask)=>!!task&&!data.lockedProjects.includes(p.id)&&(pm||currentRole==='solution-tech'&&task.ownerId===currentUser.id)&&canDo('update-task',task.id);
  const currentTask=tasks.find(task=>task.id===editing?.id);const canEditExecution=canUpdateTask(currentTask);
  const days = (date: string) => Math.max(0, Math.floor((Date.parse(AS_OF_DATE) - Date.parse(date)) / 86400000));
  const planProgress = tasks.length ? tasks.reduce((sum, t) => sum + Math.max(0, Math.min(1, (Date.parse(AS_OF_DATE) - Date.parse(t.startDate)) / Math.max(86400000, Date.parse(t.endDate) - Date.parse(t.startDate)))) * t.plannedDays * 100, 0) / tasks.reduce((sum, t) => sum + t.plannedDays, 0) : 0;
  const min = Math.min(...tasks.map((t) => Date.parse(t.startDate))); const max = Math.max(...tasks.map((t) => Date.parse(t.endDate))); const range = Math.max(86400000, max - min);
  const open = (t: WbsTask) => { setEditing(t); setPercent(t.progress); setStart(t.actualStartDate ?? ''); setEnd(t.actualEndDate ?? ''); setNote(t.executionNote ?? ''); };
  return <><PageHeader title="HS-02 项目进度" description={`${p.id} · ${p.name} · 基准日 ${AS_OF_DATE}`} breadcrumbs={[{ title: '首页', href: '/' }, { title: p.name, href: `/projects/${p.id}` }, { title: '项目进度' }]} extra={<Button onClick={() => navigate(-1)}>返回上一级</Button>} />
    <PageToolbar><Tag>当前阶段 {p.phase} / {p.subPhase}</Tag><Tag>有效计划基线 {p.currentBaselineVersion}</Tag><Button disabled={!pm||!canDo('request-plan',p.id)} onClick={() => navigate(`/projects/${p.id}/plan-requests/new?kind=schedule&${params}`)}>发起计划变更</Button><Button disabled={!pm||!canDo('request-plan',p.id)} onClick={() => navigate(`/projects/${p.id}/plan-requests/new?kind=stage&${params}`)}>发起阶段切换</Button><Button onClick={() => navigate(`/projects/${p.id}?tab=progress`)}>项目总览</Button></PageToolbar>
    <PageSection className="pms-record-summary"><Row gutter={16}>{[
      {title:'总体实际完成率',value:`${p.progressRate.toFixed(1)}%`},
      {title:'计划完成率',value:`${planProgress.toFixed(1)}%`},
      {title:'实际−计划偏差',value:`${p.progressRate-planProgress>0?'+':''}${(p.progressRate-planProgress).toFixed(1)}`,unit:'百分点'},
      {title:'超期未完成',value:String(tasks.filter(t=>t.progress<100&&t.endDate<AS_OF_DATE).length),unit:'项'},
    ].map(metric=><Col span={6} key={metric.title}><MetricStatCard variant="flat" unit="" {...metric}/></Col>)}</Row></PageSection>
    <Alert showIcon type="info" style={{ marginBottom: 16 }} message="执行更新仅记录完成率、实际日期与说明；计划日期须通过独立计划变更审批。" description="演示规则：任务按计划工期加权；计划完成率在计划日期区间线性计算。里程碑提前7天提醒；实际完成不自动通过验收或阶段门。" />
    <PageSection title="当前与下一里程碑 · 计划 / 实际 / 延期"><p>最近达成：{current?.type ?? '尚无'}；下一里程碑：{upcoming?.type ?? '全部达成'} {upcoming?.plannedDate}</p><details><summary style={{cursor:"pointer",fontWeight:600,marginBottom:16}}>查看全部里程碑与必交材料</summary><Timeline items={milestones.map((m) => ({ color: m.status === '已达成' ? 'green' : days(m.plannedDate) ? 'red' : 'blue', children: <><b>{m.type}</b> · 计划 {m.plannedDate} · 实际 {m.actualDate ?? '未达成'} · {m.status === '已达成' ? `已达成，偏差${Math.max(0, Math.floor((Date.parse(m.actualDate!) - Date.parse(m.plannedDate)) / 86400000))}天` : days(m.plannedDate) ? `逾期${days(m.plannedDate)}天` : (Date.parse(m.plannedDate) - Date.parse(AS_OF_DATE)) / 86400000 <= 7 ? '7天内临期' : '待执行'}<div>必交材料：{m.requiredDeliverables.join('、')}</div></> }))} /><p>合同要求验收：{data.contracts.find((c) => c.projectId === p.id)?.acceptanceDueDate ?? '未签合同 / 未约定'}；当前计划验收：{p.plannedEndDate}。计划变更不改写原合同日期。</p></details></PageSection>
    <PageSection title="WBS 甘特与执行事实" description="浅蓝为计划区间，深蓝为已完成部分；执行更新不会改写基线计划。"><div ref={tableRef}><Table rowClassName={t=>t.id===focusTask?'ant-table-row-selected':''} rowKey="id" size="small" dataSource={tasks} pagination={false} scroll={{ x: 1450 }} columns={[
      { title: '任务 / 责任人', width: 210, fixed: 'left', render: (_, t) => <>{t.taskCode} {t.name}<div>{t.ownerName} · {t.id}</div></> },
      { title: '计划日期（基线）', width: 170, render: (_, t) => <>{t.startDate} → {t.endDate}</> },
      { title: '甘特 · 计划区间 / 完成', width: 240, render: (_, t) => <div style={{ width: 210, height: 20, background: '#f0f0f0', position: 'relative' }}><div style={{ position: 'absolute', left: `${(Date.parse(t.startDate) - min) / range * 100}%`, width: `${Math.max(2, (Date.parse(t.endDate) - Date.parse(t.startDate)) / range * 100)}%`, height: 20, background: '#91caff' }}><div style={{ width: `${t.progress}%`, height: 20, background: '#1677ff' }} /></div></div> },
      { title: '实际日期', width: 170, render: (_, t) => <>{t.actualStartDate ?? '未录入'} → {t.actualEndDate ?? (t.progress === 100 ? '完成日期未录入' : '未完成')}</> },
      { title: '完成 / 延期', width: 160, render: (_, t) => <>{t.progress.toFixed(1)}%<div>{t.progress < 100 && days(t.endDate) ? <Tag color="error">逾期{days(t.endDate)}天</Tag> : t.status}</div></> },
      { title: '执行说明', width: 220, render: (_, t) => t.executionNote ?? '尚无补充说明' },
      { title: '操作', width: 130, fixed: 'right', render: (_, t) => <Button disabled={!canUpdateTask(t)} onClick={() => open(t)}>更新执行</Button> },
    ]} /></div></PageSection>
    <PageSection title="本项目计划与阶段申请"><Table rowKey="id" size="small" dataSource={data.planRequests.filter((r) => r.projectId === id)} pagination={false} columns={[{ title: '编号', dataIndex: 'id' }, { title: '类型', render: (_, r) => r.kind === 'schedule' ? '计划变更' : '阶段切换' }, { title: '状态', dataIndex: 'status' }, { title: '原事项', render: (_, r) => <Button onClick={() => navigate(`/projects/${p.id}/plan-requests/${r.id}`)}>进入原审批</Button> }]} /></PageSection>
    <Modal title="更新任务执行事实" open={!!editing} okButtonProps={{disabled:!canEditExecution}} onCancel={() => setEditing(undefined)} onOk={() => {
      try { if(!currentTask||!canDo('update-task',currentTask.id)||!canUpdateTask(currentTask))throw new Error('当前任务或动作权限为只读');dispatch({ type: 'update-task', id: editing!.id, progress: percent, actualStartDate: start, actualEndDate: end || undefined, note }, { id: currentUser.id, name: currentUser.name, role: currentRole }); setEditing(undefined); message.success('执行事实已更新，总体进度同步'); } catch (error) { message.error((error as Error).message); }
    }}><Descriptions column={1} items={[{ key: 'task', label: '任务', children: editing?.name }, { key: 'plan', label: '基线计划', children: `${editing?.startDate} → ${editing?.endDate}` }]} /><Space direction="vertical" style={{ width: '100%' }}><label>完成率 <InputNumber disabled={!canEditExecution} aria-label="任务完成率" min={editing?.progress ?? 0} max={100} value={percent} onChange={(v) => setPercent(v ?? 0)} /></label><label>实际开始 <Input disabled={!canEditExecution} aria-label="实际开始日期" placeholder="YYYY-MM-DD" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>实际完成 <Input disabled={!canEditExecution} aria-label="实际完成日期" placeholder="完成100%时必填 YYYY-MM-DD" value={end} onChange={(e) => setEnd(e.target.value)} /></label><Input.TextArea disabled={!canEditExecution} aria-label="执行说明" placeholder="执行说明（必填）" value={note} onChange={(e) => setNote(e.target.value)} /></Space></Modal>
  </>;
}
