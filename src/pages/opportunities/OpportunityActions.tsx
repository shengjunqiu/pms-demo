import { useState } from 'react';
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBusinessStore } from '@/mock/business';
import { canManageOpportunity, opportunityLocked, opportunityMeta, initiationMissing } from '@/mock/opportunities';
import { useAppStore } from '@/store/useAppStore';
import { mockUsers } from '@/mock';
import type { Opportunity } from '@/models/types';
export function OpportunityActions({ opportunity: o, compact = false }: { opportunity: Opportunity; compact?: boolean }) {
  const { data, dispatch } = useBusinessStore(); const actor = useAppStore(s => s.currentUser); const navigate = useNavigate(); const { message } = App.useApp();
  const [mode,setMode] = useState<'暂缓'|'已终止'>(); const [form] = Form.useForm();
  const manage = canManageOpportunity(data,o,actor); const readonly = ['已转立项','已终止'].includes(o.status); const missing = initiationMissing(data,o);
  const start = () => { try { if (opportunityMeta(data,o).assessments.at(-1)?.status !== '评估中') dispatch({type:'start-opportunity-assessment',id:o.id},actor); navigate(`/opportunities/${o.id}/evaluation`); } catch(e) { message.error((e as Error).message); } };
  return <><Space wrap size={compact ? 0 : 8}>
    {compact && <Button type="link" size="small" onClick={() => navigate(`/opportunities/${o.id}`)}>查看</Button>}
    {manage && <><Tooltip title={opportunityLocked(data,o) ? '已冻结或进入拟立项，关键数据只读' : ''}><Button type={compact?'link':'default'} size={compact?'small':'middle'} disabled={opportunityLocked(data,o)} onClick={() => navigate(`/opportunities/${o.id}/edit`)}>编辑</Button></Tooltip>
      {!readonly && <><Button type={compact?'link':'primary'} size={compact?'small':'middle'} disabled={['拟立项','方案评审中'].includes(o.status)} onClick={start}>发起评估</Button>
        {(['暂缓','已终止'] as const).map(v => <Button key={v} type={compact?'link':'default'} size={compact?'small':'middle'} danger={v==='已终止'} onClick={() => { form.resetFields(); setMode(v); }}>{v==='已终止'?'终止':v}</Button>)}</>}
      <Tooltip title={missing.join('；')}><span><Button size={compact?'small':'middle'} disabled={missing.length>0} onClick={() => navigate(`/initiation/new?opportunityId=${o.id}`)}>发起立项</Button></span></Tooltip></>}
  </Space><Modal title={mode==='暂缓'?'商机暂缓与复评安排':'商机终止与成本处置'} open={!!mode} onCancel={() => setMode(undefined)} onOk={async () => { try { const v = await form.validateFields(); dispatch({type:'conclude-opportunity',id:o.id,conclusion:mode!,reason:v.reason,reviewDate:v.reviewDate?.format('YYYY-MM-DD'),reviewOwnerId:v.reviewOwnerId,costDisposition:v.costDisposition,retrospective:v.retrospective},actor); setMode(undefined); message.success('商机状态及历史记录已更新'); } catch(e) { if(e instanceof Error) message.error(e.message); } }} okText="确认并记录">
    <Form form={form} layout="vertical"><Form.Item name="reason" label="决策原因" rules={[{required:true,whitespace:true}]}><Input.TextArea rows={3}/></Form.Item>
    {mode==='暂缓'?<><Form.Item name="reviewDate" label="下次复评日期" rules={[{required:true}]}><DatePicker minDate={dayjs('2026-09-10')}/></Form.Item><Form.Item name="reviewOwnerId" label="复评责任人" rules={[{required:true}]}><Select showSearch optionFilterProp="label" options={mockUsers.map(u => ({value:u.id,label:u.name}))}/></Form.Item></>:<><p>已发生提前投入：{o.earlyInvestmentUsed.toFixed(2)} 万元。终止后保留成本与来源记录。</p><Form.Item name="costDisposition" label="成本处置说明" rules={[{required:o.earlyInvestmentUsed>0,whitespace:true}]}><Input.TextArea/></Form.Item><Form.Item name="retrospective" label="退出复盘与沉没成本分析" rules={[{required:o.earlyInvestmentUsed>0,whitespace:true}]}><Input.TextArea/></Form.Item></>}
    </Form></Modal></>;
}
