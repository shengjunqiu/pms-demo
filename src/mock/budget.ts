import { assertConstructionWritable } from './construction-lock';
import { AS_OF_DATE, mockUsers } from '@/mock';
import type { Actor, Approval, BusinessState } from './business';
import type { PlanningReview, PlanningSnapshot, TeamResource } from '@/models/budget';
import type { BaselineVersion, Milestone, Opportunity, Project, WbsTask } from '@/models/types';
import { money, percentage } from '@/utils/money';
export const PLANNING_PROJECT_ID = 'P-PLAN-001';
export const planningOpportunity: Opportunity = { id:'OPP-PLAN-001',code:'OPP-2026-PLAN-001',name:'福建园区设备运维协同平台商机',customerId:'CUST-001',customerName:'福建省晋江市海洋与渔业局',ownerId:'U-006',ownerName:'陈亮',departmentId:'D-002',departmentName:'智慧城市业务群',estimatedAmount:1200,status:'已转立项',winRate:100,expectedSignDate:'2026-09-20',currentEstimateVersionId:'EST-PLAN-001',earlyInvestmentQuota:0,earlyInvestmentUsed:0,createdAt:'2026-09-01' };
export const validPlanDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
export const teamResources = (state: BusinessState, id: string): TeamResource[] => {
  const p = state.projects.find(p=>p.id===id)!;
  if(state.projectTeams?.[id])return structuredClone(state.projectTeams[id].members);
  return [...new Set([p.pmId,...(p.memberIds??[])])].map(userId=> {const u=mockUsers.find(u=>u.id===userId); return {userId,name:u?.name??p.pmName,role:userId===p.pmId?'项目经理':'交付成员',departmentId:u?.departmentId??p.departmentId,active:true,startDate:p.plannedStartDate,endDate:p.plannedEndDate,allocation:100,plannedHours:160,keyPosition:userId===p.pmId};});
};
export function planningSnapshot(state: BusinessState,id: string): PlanningSnapshot {
 const p=state.projects.find(p=>p.id===id)!;const draft=state.planningDrafts[id];
 return structuredClone(draft??{scope:state.baselines.find(b=>b.projectId===id&&b.status==='已生效')?.scopeDesc??`${p.name} 已批准交付范围`,tasks:state.tasks.filter(t=>t.projectId===id),milestones:state.milestones.filter(m=>m.projectId===id),resources:teamResources(state,id),plannedStartDate:p.plannedStartDate,plannedEndDate:p.plannedEndDate});
}
export function milestoneTemplate(projectId:string,start:string,end:string,projectType:Project['type']='混合交付'):Milestone[] {
 const types:Milestone['type'][]=projectType==='咨询服务'?['启动','方案确认','客户终验']:projectType==='运维服务'?['启动','客户终验']:['启动','方案确认','开发完成','内部初验','客户终验'];
 return types.map((type,i)=>({id:`MS-${projectId}-${i+1}`,projectId,name:type,type,plannedDate:new Date(Date.parse(start)+(Date.parse(end)-Date.parse(start))*i/Math.max(1,types.length-1)).toISOString().slice(0,10),status:'未达成',requiredDeliverables:[i===0?'实施计划':i<3?'测试报告':'验收确认函'],ownerId:'U-001',ownerName:'张建国',completionCondition:`${type}范围完成，必交材料审核通过`,acceptanceBasis:'经评审的项目范围说明书',isKey:true,templateRequired:true}));
}
export function initializePlanning(state:BusinessState) {
 const p={...structuredClone(state.projects[0]),id:PLANNING_PROJECT_ID,code:'PMS-2026-PLAN-001',name:'福建园区设备运维协同平台',opportunityId:planningOpportunity.id,phase:'立项' as const,subPhase:'WBS编制' as const,status:'正常进行' as const,isUnsigned:true,isMaintenance:false,contractAmount:0,revenueAmount:1200,frozenEstimateVersionId:'EST-PLAN-001',budgetAmount:0,rollingCost:0,actualCost:0,committedCost:0,forecastRemainingCost:0,costVariance:0,costVarianceRate:0,progressRate:0,plannedStartDate:'2026-09-10',plannedEndDate:'2026-12-31',actualStartDate:undefined,actualEndDate:undefined,currentBaselineVersion:'未形成',memberIds:['U-001','U-005'],unsignedLimitQuota:0,commitmentBySubject:{}};
 state.projects.push(p);state.opportunities.push(structuredClone(planningOpportunity));
 const source=state.estimates[0];state.estimates.push({...structuredClone(source),id:'EST-PLAN-001',opportunityId:planningOpportunity.id,version:'V1.0',totalIncome:1200,totalCost:700,grossMargin:500,grossMarginRate:500/1200*100,items:source.items.map((item,i)=>({...item,amount:i===0?700:0})),isFrozen:true});
 const milestones=milestoneTemplate(p.id,p.plannedStartDate,p.plannedEndDate,p.type);
 const tasks:WbsTask[]=[{id:'TASK-PLAN-1',projectId:p.id,taskCode:'1',name:'设备接入与交付',ownerId:p.pmId,ownerName:p.pmName,plannedDays:113,plannedHours:160,startDate:p.plannedStartDate,endDate:p.plannedEndDate,progress:0,isMilestone:false,status:'未开始',completionCondition:'完成设备接入并取得验收确认',predecessorIds:[],milestoneId:milestones[4].id,description:'首期范围：接入100台设备、管理台和运维手册'}];
 state.planningDrafts[p.id]={projectId:p.id,revision:1,status:'草稿',updatedAt:AS_OF_DATE,scope:'100台设备接入、统一管理台、交付培训与运维手册',tasks,milestones,resources:teamResources(state,p.id),plannedStartDate:p.plannedStartDate,plannedEndDate:p.plannedEndDate};
}
export function validatePlanning(plan:PlanningSnapshot,projectId:string):string[] {
 const errors:string[]=[]; const tasks=plan.tasks;const ids=new Set(tasks.map(t=>t.id));const roots=tasks.filter(t=>!t.parentId);
 if(!plan.scope.trim())errors.push('范围说明必填');
 if(!validPlanDate(plan.plannedStartDate)||!validPlanDate(plan.plannedEndDate)||plan.plannedStartDate>plan.plannedEndDate) errors.push('项目总周期无效');
 if(!tasks.length||!roots.length)errors.push('至少一个项目下属任务');
 if(ids.size!==tasks.length||new Set(tasks.map(t=>t.taskCode)).size!==tasks.length)errors.push('任务ID或编码重复');
 const visit=(id:string,path:Set<string>,field:'parentId'|'predecessorIds'):boolean=>{if(path.has(id))return true;const t=tasks.find(t=>t.id===id);if(!t)return false;const next=new Set(path).add(id);return (field==='parentId'?(t.parentId?[t.parentId]:[]):t.predecessorIds??[]).some(x=>visit(x,next,field));};
 for(const t of tasks){
  const leaf=!tasks.some(c=>c.parentId===t.id);const resource=plan.resources.find(r=>r.userId===t.ownerId&&r.active);
  if(t.projectId!==projectId||!t.name.trim())errors.push(`${t.taskCode} 项目归属或名称无效`);
  if(t.parentId&&!ids.has(t.parentId))errors.push(`${t.taskCode} 父级任务不存在`);
  if(visit(t.id,new Set(),'parentId')||visit(t.id,new Set(),'predecessorIds'))errors.push(`${t.taskCode} 层级或依赖存在循环`);
  if((t.predecessorIds??[]).some(id=>!ids.has(id)))errors.push(`${t.taskCode} 前置任务不存在`);
  if(!validPlanDate(t.startDate)||!validPlanDate(t.endDate)||t.startDate>t.endDate||t.startDate<plan.plannedStartDate||t.endDate>plan.plannedEndDate)errors.push(`${t.taskCode} 日期必须在项目总周期内`);
  if(t.parentId){const parent=tasks.find(x=>x.id===t.parentId);if(parent&&(t.startDate<parent.startDate||t.endDate>parent.endDate))errors.push(`${t.taskCode} 日期超出父任务`);}
  if(leaf&&(!resource||!t.completionCondition?.trim()||!Number.isFinite(t.plannedHours)||!(t.plannedHours!>0)))errors.push(`${t.taskCode} 叶子任务须有有效成员、完成条件和计划工时`);
  if(resource&&(t.startDate<resource.startDate||t.endDate>resource.endDate))errors.push(`${t.taskCode} 日期超出成员参与周期`);
  if(t.milestoneId&&!plan.milestones.some(m=>m.id===t.milestoneId))errors.push(`${t.taskCode} 关联里程碑不存在`);
 }
 if(!plan.milestones.length) errors.push('里程碑计划不能为空');
 if(new Set(plan.milestones.map(m=>m.id)).size!==plan.milestones.length)errors.push('里程碑ID重复');
 for(const m of plan.milestones){if(m.projectId!==projectId||!m.name.trim()||!validPlanDate(m.plannedDate)||m.plannedDate<plan.plannedStartDate||m.plannedDate>plan.plannedEndDate||!plan.resources.some(r=>r.active&&r.userId===m.ownerId)||!m.completionCondition?.trim()||!m.acceptanceBasis?.trim()||!m.requiredDeliverables.length)errors.push(`${m.name} 须有周期内日期、有效责任人、条件、交付物与验收依据`);}
 if(new Set(plan.resources.map(r=>r.userId)).size!==plan.resources.length)errors.push('资源成员重复');
 if(!plan.resources.length||plan.resources.some(r=>!validPlanDate(r.startDate)||!validPlanDate(r.endDate)||r.startDate>r.endDate||r.allocation<=0||r.allocation>100||r.plannedHours<=0))errors.push('资源计划参与时间、比例或工时无效');
 return [...new Set(errors)];
}
export type BudgetPlanningAction=
 | {type:'save-planning';projectId:string;plan:PlanningSnapshot;expectedRevision:number}
 | {type:'submit-planning';projectId:string}
 | {type:'review-planning';id:string;result:'通过'|'整改'|'否决';opinion:string;rectifications:PlanningReview['rectifications']}
 | {type:'reply-planning';id:string;rectificationId:string;reply:string}
 | {type:'confirm-budget-baseline';approvalId:string};
export function confirmBudgetBaseline(state:BusinessState,approval:Approval,actor:Actor){
 const p=state.projects.find(p=>p.id===approval.projectId)!;
 const baseline=state.baselines.find(b=>b.projectId===p.id&&b.status==='已生效');
 if((baseline?.id??'INITIAL')!==approval.baseline.id)throw new Error('基线已变化，请重新提交审批');
 const snapshot=approval.baseline.snapshot;if(!snapshot)throw new Error('缺少完整基线快照');
 const draft=state.planningDrafts[p.id];if(!baseline&&(!draft||draft.status!=='已通过'||draft.reviewId!==snapshot.planningReviewId))throw new Error('计划评审版本已变化');
 const version=`V${Math.max(0,...state.baselines.filter(b=>b.projectId===p.id).map(b=>Number(/^V(\d+)/.exec(b.version)?.[1]??0)))+1}.0`;
 state.budgets.filter(b=>b.projectId===p.id&&(b.status==='已生效'||b.id===`BUD-PENDING-${approval.id}`)).forEach(b=>{b.status='已废弃';});if(baseline)baseline.status='历史';
 const budget={...structuredClone(approval.budget),id:`BUD-${approval.id}`,version,status:'已生效' as const,createdAt:AS_OF_DATE,createdBy:actor.id};
 state.budgets.push(budget);const full={...structuredClone(snapshot),budget};
 state.baselines.push({...structuredClone(approval.baseline),id:`BASE-${approval.id}`,version,status:'已生效',budgetAmount:budget.totalAmount,createdAt:AS_OF_DATE,snapshot:full});
 if(!baseline){
  for(const name of [...new Set(snapshot.milestones.flatMap(m=>m.requiredDeliverables))]){if(!state.materials.some(m=>m.projectId===p.id&&m.name===name))state.materials.push({id:`MAT-${p.id}-${state.materials.length+1}`,projectId:p.id,name,required:true,status:'缺失'});}
  state.tasks.push(...structuredClone(snapshot.tasks));state.milestones.push(...structuredClone(snapshot.milestones));if(draft)draft.status='已冻结';}
 p.budgetAmount=budget.totalAmount;p.currentBaselineVersion=version;p.costVariance=money(p.rollingCost-p.budgetAmount);p.costVarianceRate=percentage(p.costVariance,p.budgetAmount)??0;
 approval.baselineConfirmedAt=AS_OF_DATE;approval.baselineConfirmedBy=actor.name;
}
export function budgetBaselineProposal(state:BusinessState,projectId:string):BaselineVersion {
 const p=state.projects.find(p=>p.id===projectId)!;const baseline=state.baselines.find(b=>b.projectId===projectId&&b.status==='已生效');
 if(!baseline&&state.planningDrafts[p.id]?.status!=='已通过')throw new Error('首次预算提交须计划评审通过');
 return structuredClone(baseline??{id:'INITIAL',projectId,version:'待形成V1.0',status:'历史',scopeDesc:state.planningDrafts[p.id].scope,budgetAmount:0,plannedStartDate:p.plannedStartDate,plannedEndDate:p.plannedEndDate,createdAt:AS_OF_DATE});
}
export function applyBudgetPlanningAction(state:BusinessState,action:BudgetPlanningAction,actor:Actor){
 const review='id' in action?state.planningReviews.find(r=>r.id===action.id):undefined;
 const approval=action.type==='confirm-budget-baseline'?state.approvals.find(a=>a.id===action.approvalId):undefined;
 const id='projectId'in action?action.projectId:review?.projectId??approval?.projectId;
 const p=state.projects.find(p=>p.id===id);if(!p)throw new Error('项目或原事项不存在');
 assertConstructionWritable(state,p.id);
 if(state.lockedProjects.includes(p.id)||['已终止','已关闭'].includes(p.status))throw new Error('项目已锁定');
 if(action.type==='confirm-budget-baseline'){if(actor.role!=='pmo')throw new Error('仅PMO可确认基线');if(approval!.kind!=='budget'||approval!.status!=='通过'||approval!.baselineConfirmedAt)throw new Error('预算尚未通过或已确认');confirmBudgetBaseline(state,approval!,actor);return p.id;}
 const draft=state.planningDrafts[p.id];if(!draft||draft.status==='已冻结'||state.baselines.some(b=>b.projectId===p.id&&b.status==='已生效'))throw new Error('生效计划不可直接编辑，请进入项目变更');
 const requirePm=()=>{if(actor.role!=='project-manager'||actor.id!==p.pmId)throw new Error('仅项目主PM可维护计划');};
 if(action.type==='save-planning'){
  requirePm();if(state.approvals.some(a=>a.projectId===p.id&&(a.status==='待审批'||a.kind==='budget'&&a.status==='通过'&&!a.baselineConfirmedAt)))throw new Error('预算审批或基线确认中，计划版本已锁定');if(draft.status==='评审中')throw new Error('评审中禁止修改提交版本');if(action.expectedRevision!==draft.revision)throw new Error('计划版本已变化，请刷新');
  if(action.plan.plannedStartDate!==p.plannedStartDate||action.plan.plannedEndDate!==p.plannedEndDate)throw new Error('项目总周期须沿用已批准时间');
  if(action.plan.resources.some(r=>![p.pmId,...(p.memberIds??[])].includes(r.userId)))throw new Error('资源必须为当前项目成员');
  if(draft.milestones.some(m=>m.templateRequired&&!action.plan.milestones.some(n=>n.id===m.id&&n.type===m.type&&n.templateRequired)))throw new Error('标准关键里程碑不可直接删除或改类型');
  if(draft.tasks.some(t=>t.isMilestone&&!action.plan.tasks.some(n=>n.id===t.id)))throw new Error('里程碑任务不可直接删除');
  const errors=validatePlanning(action.plan,p.id);if(errors.length)throw new Error(errors.join('；'));
  state.planningDrafts[p.id]={...structuredClone(action.plan),projectId:p.id,revision:draft.revision+1,status:draft.status==='整改中'?'整改中':'草稿',reviewId:draft.reviewId,updatedAt:AS_OF_DATE};
 }else if(action.type==='submit-planning'){
  requirePm();if(state.projectTeams[p.id]?.appointments.some(a=>a.status==='待接受'))throw new Error('主PM任命待接受，暂不能提交计划');if(!['草稿','整改中'].includes(draft.status))throw new Error('当前计划不可重复提交');const errors=validatePlanning(draft,p.id);if(errors.length)throw new Error(errors.join('；'));
  const previous=state.planningReviews.find(r=>r.id===draft.reviewId);if(previous?.rectifications.some(r=>!r.reply?.trim()))throw new Error('请先回复全部整改项');
  const id=`PREVIEW-${state.planningReviews.length+1}`;state.planningReviews.push({id,projectId:p.id,round:state.planningReviews.filter(r=>r.projectId===p.id).length+1,revision:draft.revision,snapshot:planningSnapshot(state,p.id),status:'待评审',submittedBy:actor.name,submittedAt:AS_OF_DATE,rectifications:[]});draft.status='评审中';draft.reviewId=id;
 }else if(action.type==='review-planning'){
  if(actor.role!=='pmo')throw new Error('仅PMO可评审');if(review!.status!=='待评审'||draft.reviewId!==review!.id)throw new Error('评审已处理');if(!action.opinion.trim())throw new Error('评审意见必填');
  if(action.result==='整改'&&(!action.rectifications.length||action.rectifications.some(r=>!r.content.trim()||!draft.resources.some(m=>m.active&&m.userId===r.ownerId)||!validPlanDate(r.deadline)||r.deadline<AS_OF_DATE)))throw new Error('整改须有事项、有效责任人及截止日');
  review!.status=action.result;review!.opinion=action.opinion;review!.rectifications=action.result==='整改'?structuredClone(action.rectifications):[];review!.reviewer=actor.name;review!.reviewedAt=AS_OF_DATE;draft.status=action.result==='通过'?'已通过':action.result==='整改'?'整改中':'草稿';
 }else if(action.type==='reply-planning'){
  const item=review!.rectifications.find(r=>r.id===action.rectificationId);if(review!.status!=='整改'||!item||draft.reviewId!==review!.id||draft.status!=='整改中')throw new Error('整改项不存在或已结束');if(actor.id!==item.ownerId&&!(actor.role==='project-manager'&&actor.id===p.pmId))throw new Error('仅责任人或主PM可回复');if(!action.reply.trim())throw new Error('整改回复必填');item.reply=action.reply;
 }
 return p.id;
}
