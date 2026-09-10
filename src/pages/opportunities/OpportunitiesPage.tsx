import { useActionAccess } from '@/hooks/useActionAccess';
import { useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBusinessStore } from '@/mock/business';
import { assessmentSummary, canViewOpportunity, opportunityMeta } from '@/mock/opportunities';
import { useAppStore } from '@/store/useAppStore';
import type { Opportunity } from '@/models/types';
import { PageHeader } from '@/components/common/PageHeader';
import { AnalysisTools } from '@/components/common/AnalysisTools';
import { MoneyText } from '@/components/common/MoneyText';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { OpportunityActions } from './OpportunityActions';
import { sumMoney } from '@/utils/money';
export function OpportunitiesPage() {
 const {canDo}=useActionAccess();
  const {data}=useBusinessStore(); const actor=useAppStore(s=>s.currentUser); const navigate=useNavigate(); const [params,setParams]=useSearchParams(); const [more,setMore]=useState(false); const [form]=Form.useForm();
  const [visible,setVisible]=useState(['customer','owner','department','sign','assessment','estimate','investment','follow']);
  const accessible=data.opportunities.filter(o=>canViewOpportunity(data,o,actor));
  const rows=accessible.filter(o=>{const m=opportunityMeta(data,o);return (!params.get('keyword')||`${o.code} ${o.name}`.includes(params.get('keyword')!))&&(!params.get('customer')||o.customerName.includes(params.get('customer')!))&&(!params.get('owner')||o.ownerName.includes(params.get('owner')!))&&(!params.get('department')||o.departmentName===params.get('department'))&&(!params.get('status')||o.status===params.get('status'))&&(!params.get('region')||m.region===params.get('region'))&&(!params.get('businessLine')||m.businessLine===params.get('businessLine'))&&(!params.get('min')||o.estimatedAmount>=Number(params.get('min')))&&(!params.get('max')||o.estimatedAmount<=Number(params.get('max')))&&(!params.get('start')||o.expectedSignDate>=params.get('start')!)&&(!params.get('end')||o.expectedSignDate<=params.get('end')!)&&(!params.get('planned')||(o.status==='拟立项')===(params.get('planned')==='yes'))&&(!params.get('investment')||(o.earlyInvestmentUsed>0)===(params.get('investment')==='yes'));});
  const reset=()=>{form.resetFields();setParams(new URLSearchParams());};
  const cols:ColumnsType<Opportunity>=[
    {title:'商机编号 / 名称',key:'name',width:280,fixed:'left',render:(_,o)=><><Link to={`/opportunities/${o.id}`}>{o.name}</Link><div style={{color:'#8c8c8c',fontSize:12}}>{o.code}</div></>},
    {title:'客户',key:'customer',dataIndex:'customerName',width:180}, {title:'负责人',key:'owner',dataIndex:'ownerName',width:90}, {title:'主办部门',key:'department',dataIndex:'departmentName',width:140},
    {title:'预计金额（万元）',key:'amount',width:145,align:'right',sorter:(a,b)=>a.estimatedAmount-b.estimatedAmount,render:(_,o)=><MoneyText value={o.estimatedAmount}/>},
    {title:'预计签约',key:'sign',dataIndex:'expectedSignDate',width:120,sorter:(a,b)=>a.expectedSignDate.localeCompare(b.expectedSignDate)},
    {title:'状态',key:'status',width:105,render:(_,o)=><Tag color={o.status==='已终止'?'red':o.status==='暂缓'?'orange':o.status==='已转立项'?'green':o.status==='草稿'?'default':'blue'}>{o.status}</Tag>},
    {title:'综合评估结论',key:'assessment',width:140,render:(_,o)=>opportunityMeta(data,o).assessments.at(-1)?.conclusion??'尚无初评记录'},
    {title:'概算（万元）',key:'estimate',width:140,align:'right',render:(_,o)=><MoneyText value={data.estimates.find(e=>e.id===o.currentEstimateVersionId)?.totalCost??null}/>},
    {title:'提前投入（万元）',key:'investment',width:145,align:'right',render:(_,o)=><MoneyText value={o.earlyInvestmentUsed}/>},
    {title:'最后跟进',key:'follow',width:115,render:(_,o)=>opportunityMeta(data,o).followups.at(-1)?.date??'无跟进记录'},
    {title:'操作',key:'actions',width:300,fixed:'right',render:(_,o)=><OpportunityActions opportunity={o} compact/>},
  ];
  const due=accessible.filter(o=>o.status==='暂缓'&&(opportunityMeta(data,o).pauses.at(-1)?.reviewDate??'9999-12-31')<='2026-09-16');
  return <><PageHeader item={PAGE_MANIFEST.find(p=>p.id==='GS-01')} breadcrumbs={[{title:'商机与概算'},{title:'商机台账'}]} description="预计金额与已签合同分开管理；按当前角色可见范围汇总，金额单位：万元。" extra={actor.role==='market'&&<Button type="primary" disabled={!canDo('save-opportunity')} onClick={()=>navigate('/opportunities/new')}>新建商机</Button>}/>
    <Row gutter={16} style={{marginBottom:16}}>{[{title:'当前筛选商机',value:rows.length,suffix:'个'},{title:'预计项目总额',value:sumMoney(rows.map(o=>o.estimatedAmount)),precision:2,suffix:'万'},{title:'拟立项',value:rows.filter(o=>o.status==='拟立项').length,suffix:'个'},{title:'初评待补充',value:rows.filter(o=>opportunityMeta(data,o).assessments.at(-1)?.status==='评估中'&&assessmentSummary(o,opportunityMeta(data,o)).missing.length).length,suffix:'个'}].map(x=><Col span={6} key={x.title}><Card size="small"><Statistic {...x}/></Card></Col>)}</Row>
    {due.length>0&&<Alert style={{marginBottom:16}} type="warning" showIcon message={`未来7日需复评 ${due.length} 个商机`} description={<Space wrap>{due.map(o=><Link key={o.id} to={`/opportunities/${o.id}/evaluation`}>{o.name} · {opportunityMeta(data,o).pauses.at(-1)?.ownerName}</Link>)}</Space>}/>}
    <Card size="small" style={{marginBottom:16}}><Form form={form} layout="vertical" initialValues={Object.fromEntries(params)} onFinish={v=>{const next=new URLSearchParams();for(const [k,value]of Object.entries(v)){if(k==='dates'&&Array.isArray(value)){if(value[0])next.set('start',value[0].format('YYYY-MM-DD'));if(value[1])next.set('end',value[1].format('YYYY-MM-DD'));}else if(value!==undefined&&value!==null&&value!=='')next.set(k,String(value));}setParams(next);}}><Row gutter={16}>
      <Col span={6}><Form.Item name="keyword" label="编号 / 商机名称"><Input allowClear/></Form.Item></Col><Col span={6}><Form.Item name="customer" label="客户名称"><Input allowClear/></Form.Item></Col><Col span={6}><Form.Item name="status" label="商机状态"><Select allowClear options={['草稿','待评估','跟进中','暂缓','拟立项','方案评审中','已转立项','已终止'].map(value=>({value,label:value}))}/></Form.Item></Col><Col span={6}><Form.Item name="owner" label="负责人"><Input allowClear/></Form.Item></Col>
      {more&&<><Col span={6}><Form.Item name="department" label="主办部门"><Select allowClear options={[...new Set(accessible.map(o=>o.departmentName))].map(value=>({value,label:value}))}/></Form.Item></Col><Col span={6}><Form.Item name="region" label="区域"><Select allowClear options={[...new Set(accessible.map(o=>opportunityMeta(data,o).region))].map(value=>({value,label:value}))}/></Form.Item></Col><Col span={6}><Form.Item name="businessLine" label="业务线"><Select allowClear options={['数字政务','智慧城市','公共安全','产业数字化'].map(value=>({value,label:value}))}/></Form.Item></Col><Col span={6}><Form.Item name="dates" label="预计签约日期" initialValue={params.get('start')?[dayjs(params.get('start')),dayjs(params.get('end'))]:undefined}><DatePicker.RangePicker/></Form.Item></Col><Col span={6}><Form.Item name="min" label="最低金额（万元）"><InputNumber min={0}/></Form.Item></Col><Col span={6}><Form.Item name="max" label="最高金额（万元）"><InputNumber min={0}/></Form.Item></Col>{['planned','investment'].map((key,i)=><Col span={6} key={key}><Form.Item name={key} label={i?'是否存在提前投入':'是否拟立项'}><Select allowClear options={[{value:'yes',label:'是'},{value:'no',label:'否'}]}/></Form.Item></Col>)}</>}
    </Row><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={reset}>重置</Button><Button type="link" onClick={()=>setMore(!more)}>{more?'收起':'更多筛选'}</Button></Space></Form></Card>
    <Card size="small" title={`商机列表 · ${rows.length} 项`}><AnalysisTools storageKey={`opportunities-views-${actor.id}`} params={params} onChange={v=>{setParams(v);form.resetFields();form.setFieldsValue(Object.fromEntries(v));}} columns={cols.filter(c=>!['name','amount','status','actions'].includes(String(c.key))).map(c=>({value:String(c.key),label:String(c.title)}))} visible={visible} onColumns={setVisible} exportRows={[["商机编号","商机名称","客户","状态","预计金额（万元）"],...rows.map(o=>[o.code,o.name,o.customerName,o.status,String(o.estimatedAmount)])]}/><Table size="small" rowKey="id" dataSource={rows} columns={cols.filter(c=>['name','amount','status','actions'].includes(String(c.key))||visible.includes(String(c.key)))} scroll={{x:1700}} pagination={{pageSize:10,showSizeChanger:true,showTotal:n=>`共 ${n} 条`}}/></Card>
  </>;
}
