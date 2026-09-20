import { useActionAccess } from '@/hooks/useActionAccess';
import { App, Alert, Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBusinessStore } from '@/mock/store';
import { canManageOpportunity, canViewOpportunity, opportunityLocked, opportunityMeta } from '@/mock/opportunities';
import type { OpportunityInput } from '@/models/opportunities';
import { useAppStore } from '@/store/useAppStore';
import { mockCustomers, mockDepartments, mockUsers } from '@/mock';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { PAGE_MANIFEST } from '@/routes/manifest';
export function OpportunityFormPage() {
 const {canDo}=useActionAccess();
  const {id} = useParams(); const {data,dispatch} = useBusinessStore(); const actor = useAppStore(s => s.currentUser); const navigate = useNavigate(); const {message,modal} = App.useApp(); const [form] = Form.useForm();
  const o = data.opportunities.find(o => o.id===id); const m = o ? opportunityMeta(data,o):undefined;
  if(id&&!o) return <StateView type="404"/>;
  if(actor.role!=='market'||o&&!canManageOpportunity(data,o,actor)) return <StateView type="403"/>;
  const locked = (!!o && (opportunityLocked(data,o)||m?.assessments.at(-1)?.status==='评估中'))||!canDo('save-opportunity',id);
  const save = async(submit:boolean) => { try {
    if(locked)throw new Error('当前商机或动作权限为只读');
    const v = await form.validateFields(submit?undefined:['name','customerId','departmentId','ownerId','estimatedAmount']);
    const fields = {...form.getFieldsValue(),...v}; const input:OpportunityInput = {...fields,winRate:fields.winRate??50,expectedSignDate:fields.expectedSignDate?.format('YYYY-MM-DD')??'',estimatedAmount:fields.estimatedAmount??0,attachments:(fields.files??[]).map((f:{name:string})=>f.name),collaborators:fields.collaborators??[],source:fields.source??'',description:fields.description??'',competition:fields.competition??'',businessLine:fields.businessLine??'',region:fields.region??'',projectType:fields.projectType??''};
    const duplicates = data.opportunities.filter(x=>x.id!==id&&x.customerId===input.customerId&&(x.name.includes(input.name.trim())||input.name.includes(x.name)));
    const visibleDuplicates = duplicates.filter(x=>canViewOpportunity(data,x,actor));
    const duplicateDescription = [...visibleDuplicates.map(x=>`${x.code} · ${x.name}`), ...(visibleDuplicates.length<duplicates.length?['另有相似商机不在当前查看范围内，请联系主办部门核实。']:[])].join('；');
    modal.confirm({okButtonProps:{disabled:locked},title:duplicates.length?'发现相似商机，仍要保存？':submit?'提交商机至待评估？':'保存商机草稿？',content:duplicates.length?duplicateDescription:submit?'提交后可发起跨专业初步评估。':'保存后生成唯一商机编号，可继续补充资料。',onOk:()=>{try { dispatch({type:'save-opportunity',id,input,submit,duplicateConfirmed:duplicates.length>0},actor); const nextId=id??useBusinessStore.getState().data.opportunities.at(-1)!.id; message.success(submit?'商机已提交':'草稿已保存'); navigate(`/opportunities/${nextId}`); }catch(e){message.error((e as Error).message);return Promise.reject(e);} }});
  }catch(e){if(e instanceof Error)message.error(e.message);} };
  return <><PageHeader item={PAGE_MANIFEST.find(p=>p.id==='GS-02')} title={id?'商机编辑':'新建商机'} breadcrumbs={[{title:'商机台账',href:'/opportunities'},{title:id?'商机编辑':'新建商机'}]} description="明确客户、经营责任与业务需求，形成后续初评的统一输入。" extra={<Button disabled={false} onClick={()=>navigate(o?`/opportunities/${o.id}`:'/opportunities')}>返回</Button>}/>
    {locked&&<Alert style={{marginBottom:16}} type="warning" showIcon message={canDo('save-opportunity',id)?'商机已冻结或进入评估，基础输入只读':'当前策略禁止保存商机，基础输入只读'} description="请保留当前评审输入；后续范围变化通过重新评估或项目变更处理。"/>}
    <Form form={form} layout="vertical" disabled={locked} initialValues={{...o,...m,source:m?.source??'客户需求',projectType:m?.projectType??'综合集成',departmentId:o?.departmentId??'D-002',ownerId:o?.ownerId??actor.id,estimatedAmount:o?.estimatedAmount??0,winRate:o?.winRate??50,expectedSignDate:o?.expectedSignDate?dayjs(o.expectedSignDate):undefined,files:m?.attachments.map((name,i)=>({uid:String(i),name,status:'done'}))??[]}}>
      <PageSection title="1. 基础与责任信息" description="明确客户和经营责任，是创建商机的基础。"><Row gutter={24}>
        <Col span={16}><Form.Item name="name" label="商机名称" rules={[{required:true,whitespace:true,max:100}]}><Input placeholder="客户可识别的项目机会名称" maxLength={100}/></Form.Item></Col>
        <Col span={8}><Form.Item name="customerId" label="客户" rules={[{required:true}]}><Select showSearch optionFilterProp="label" options={mockCustomers.map(c=>({value:c.id,label:c.name}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="departmentId" label="项目主办部门" rules={[{required:true}]}><Select options={mockDepartments.filter(d=>d.level!=='group').map(d=>({value:d.id,label:d.name}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="ownerId" label="商机负责人" rules={[{required:true}]}><Select showSearch optionFilterProp="label" options={mockUsers.map(u=>({value:u.id,label:u.name}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="collaborators" label="协同人员"><Select mode="multiple" maxTagCount={2} options={mockUsers.map(u=>({value:u.id,label:u.name}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="source" label="商机来源" rules={[{required:true}]}><Select options={['客户需求','招标信息','市场线索','合作伙伴推荐'].map(value=>({value,label:value}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="projectType" label="项目类型" rules={[{required:true}]}><Select options={['综合集成','软件开发','硬件工程','纯运维','整体外包'].map(value=>({value,label:value}))}/></Form.Item></Col>
        <Col span={8}><Form.Item name="businessLine" label="业务线"><Select options={['数字政务','智慧城市','公共安全','产业数字化'].map(value=>({value,label:value}))}/></Form.Item></Col>
      </Row></PageSection>
      <PageSection title="2. 商务预期" description="预计金额与签约时间用于跟踪机会成熟度，不计入已签合同。"><Row gutter={24}>
        <Col span={8}><Form.Item name="estimatedAmount" label="预计项目金额（万元）" rules={[{required:true},{type:'number',min:0}]}><InputNumber min={0} precision={2} style={{width:'100%'}}/></Form.Item></Col>
        <Col span={8}><Form.Item name="expectedSignDate" label="预计签约日期"><DatePicker style={{width:'100%'}}/></Form.Item></Col>
        <Col span={8}><Form.Item name="region" label="区域"><Select allowClear options={Array.from(new Set(mockCustomers.map(c=>c.region))).map(value=>({value,label:value}))}/></Form.Item></Col>
        <Col span={24}><Form.Item name="competition" label="竞争情况"><Input.TextArea rows={2}/></Form.Item></Col>
      </Row></PageSection>
      <PageSection title="3. 背景、需求与材料" description="补充建设目标与需求，供各专业开展初步评估。"><Form.Item name="description" label="业务背景、建设目标与主要需求" rules={[{required:true,whitespace:true}]}><Input.TextArea rows={4} maxLength={2000} showCount/></Form.Item><Form.Item name="files" label="客户需求 / 招标材料" valuePropName="fileList" getValueFromEvent={e=>e.fileList} extra="前端演示仅记录文件名，不上传服务器。"><Upload beforeUpload={()=>false} maxCount={8}><Button icon={<UploadOutlined/>}>选择附件</Button></Upload></Form.Item></PageSection>
      <div className="pms-form-actions"><span style={{color:"#64748b",marginRight:"auto"}}>草稿可继续补充；提交后进入待评估。</span><Space><Button onClick={()=>save(false)}>保存草稿</Button><Button type="primary" onClick={()=>save(true)}>提交商机</Button><Button disabled={false} onClick={()=>navigate(o?`/opportunities/${o.id}`:'/opportunities')}>取消</Button></Space></div>
    </Form></>;
}
