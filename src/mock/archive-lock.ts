import type {BusinessState} from '@/mock/business';
const lifecycleActions=new Set(['submit-operation-cost','reject-operation-cost','activate-operation','configure-operation','resolve-operation-event','exit-operation','start-operation-handover','save-operation-handover','accept-operation-handover','record-operation-event','record-operation-cost','renew-operation','request-project-close','confirm-project-close']);
/** Resolve actual business objects, never infer a project from an ID prefix. */
export function assertArchiveActionWritable(state:BusinessState,action:{type:string;projectId?:string;opportunityId?:string;id?:string;approvalId?:string;cost?:{projectId:string};report?:{projectId:string};maintenance?:boolean}){
 if(action.type==='configuration-save'||action.type==='configuration-publish'||action.type==='finance-config-save'||action.type==='finance-config-publish')return;
 if(lifecycleActions.has(action.type)||action.type==='confirm-cost'&&action.maintenance)return;
 let projectId=action.projectId??action.cost?.projectId??action.report?.projectId;
 if(projectId&&!state.projects.some((p)=>p.id===projectId))throw new Error('原项目不存在');
 if(!projectId&&action.opportunityId){if(!state.opportunities.some((o)=>o.id===action.opportunityId))throw new Error('原商机不存在');projectId=state.projects.find((p)=>p.opportunityId===action.opportunityId)?.id;}
 const id=action.id??action.approvalId;
 if(!projectId&&id){
   const project=state.projects.find((p)=>p.id===id);
   const initiation=state.initiations.find((request)=>request.id===id);
   const records:unknown[]=Object.values(state).flatMap((bucket)=>Array.isArray(bucket)?bucket:[]);
   const record=records.find((r):r is {id:string;projectId?:string;opportunityId?:string}=>typeof r==='object'&&r!==null&&'id' in r&&r.id===id&&(('projectId' in r&&typeof r.projectId==='string')||('opportunityId' in r&&typeof r.opportunityId==='string')));const opportunity=state.opportunities.find((o)=>o.id===id);const estimate=state.estimates.find((e)=>e.id===id);
   if(!project&&!record&&!opportunity&&!estimate&&!initiation)throw new Error('原业务对象不存在，不能跳过归档只读校验');
   projectId=project?.id??record?.projectId??state.projects.find((p)=>p.opportunityId===(initiation?.input.opportunityId??record?.opportunityId??opportunity?.id??estimate?.opportunityId))?.id;
 }
 if(projectId&&state.projectArchives[projectId])throw new Error('项目已正式归档，建设期原业务及文件只读；运维和关闭走独立流程');
}
