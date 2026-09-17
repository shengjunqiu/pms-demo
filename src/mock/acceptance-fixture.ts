import type { BusinessState } from '@/mock/business';
import { acceptanceDetail, supplierSources } from '@/mock/acceptance';
/** Fixed historical closeout fixture. Only P-006; customer round remains in rectification. */
export function initAcceptanceFixture(state: BusinessState) {
  const p=state.projects.find((p)=>p.id==='P-006');if(!p)return;
  const date='2026-09-04'; const note='P-006历史内部验收准备快照（2026-09-04），客户培训及接口证明仍待整改';
  state.tasks.filter((t)=>t.projectId===p.id).forEach((t)=>{t.status='已完成';t.progress=100;t.actualStartDate=t.startDate;t.actualEndDate=date;t.executionNote=note;});
  state.requirements.filter((r)=>r.projectId===p.id&&r.priority==='高').forEach((r)=>{r.status='已关闭';});
  state.bugs.filter((b)=>b.projectId===p.id&&['严重','致命'].includes(b.severity)).forEach((b)=>{b.status='已关闭';});
  state.issues.filter((i)=>i.projectId===p.id&&i.severity==='重大').forEach((i)=>{i.status='已关闭';});
  state.materials.filter((m)=>m.projectId===p.id&&m.name!=='验收确认函').forEach((m)=>{m.status='通过';m.versions=[{version:1,filename:`智慧园区_${m.name}_签审版.pdf`,uploader:p.pmName,uploadedAt:date,note,status:'通过',reviewer:'李主任',opinion:'内部交付材料检查通过'}];});
  state.qualityPlans[p.id]={target:'关键功能、性能、安全与内部交付文档完整',checkpoints:'功能、性能、安全、文档',standard:'关键缺陷清零，内部交付材料审核通过',checks:[{date,actor:p.pmName,passed:true,note}]};
  const sourceRound=state.acceptances.find((a)=>a.projectId===p.id&&a.type==='供应商验收');
  const sources=supplierSources(state,p.id);
  sources.forEach((s,i)=>{const record=i===0&&sourceRound?sourceRound:{id:`ACC-P006-SUP-${i+1}`,projectId:p.id,type:'供应商验收' as const,round:1,status:'已通过' as const,amount:0,acceptanceDate:date,createdAt:date,submittedBy:p.pmName};if(record!==sourceRound)state.acceptances.push(record);record.acceptanceDate=date;const d=acceptanceDetail(state,record);d.scope=s.scope;d.supplierSourceId=s.id;d.plannedDate=date;d.participants='采购主管、项目经理、技术验收组';d.history=[{date,actor:'李主任',action:'历史供应商履约验收通过',note:s.code}];state.acceptanceDetails[record.id]=d;});
  const internal=state.acceptances.find((a)=>a.projectId===p.id&&a.type==='内部初验');if(internal){internal.acceptanceDate=date;const d=acceptanceDetail(state,internal);d.history=[{date,actor:'李主任',action:'历史内部验收通过',note}];d.scope='园区平台功能、性能、安全与内部交付文档';d.participants='项目交付部门、技术、测试';d.plannedDate=date;state.acceptanceDetails[internal.id]=d;}
  const customer=state.acceptances.find((a)=>a.projectId===p.id&&a.type==='客户终验');if(customer){const d=acceptanceDetail(state,customer);d.contractId=state.contracts.find((c)=>c.projectId===p.id)?.id;d.scope='智慧园区数字化平台合同约定建设范围';d.customerContact='园区信息中心验收负责人';d.participants='园区信息中心、项目经理、交付团队';d.history=[{date:'2026-09-07',actor:p.pmName,action:'客户验收整改',note:d.opinion}];state.acceptanceDetails[customer.id]=d;}
  p.progressRate=100;
  state.audit.push({id:'AUD-P006-ACCEPTANCE-FIXTURE',actor:'历史数据导入',action:'恢复内部验收历史前置快照',target:p.id,date});
}
