import { canAccessOpportunityScope } from './access-scope';
import {evaluateProjectGrading,selectApprovalRule,reviewConfiguredApproval,instantiateProjectTemplates} from './configuration';
import type {ConfigurationState} from '@/models/configuration';
import {AS_OF_DATE,mockCustomers,mockDepartments,mockUsers} from '@/mock';
import type {Actor,BusinessState} from './business';
import type {InitiationApplication,InitiationInput,InitiationRisk,InitiationSource,InitiationRound} from '@/models/initiation';
import type {Project} from '@/models/types';
import {initiationMissing,opportunityMeta,canManageOpportunity} from './opportunities';
import {presalesWorkspace} from './presales';
import {inheritEarlyCosts} from './early-investments';
import {milestoneTemplate,validPlanDate} from './budget';
import {percentage} from '@/utils/money';
export const INITIATION_RULE={version:'INIT-2026-01',majorAmount:5000,superAmount:10000,keyAmount:2000,minimumMargin:20,highRiskScore:16,mediumRiskScore:9};
import { INITIATION_SIGNATURES } from '@/models/initiation';
export { INITIATION_SIGNATURES } from '@/models/initiation';
export function canViewInitiation(state:BusinessState,app:InitiationApplication,actor:Actor){const o=state.opportunities.find(o=>o.id===app.input.opportunityId);return !!o&&canAccessOpportunityScope(state,actor,o)&&(actor.role!=='market'||canManageOpportunity(state,o,actor));}
export function initiationPrerequisites(state:BusinessState,o:BusinessState['opportunities'][number]){const missing=initiationMissing(state,o);const review=state.presales[o.id]?.reviews.at(-1),estimate=state.estimates.find(e=>e.id===o.currentEstimateVersionId&&e.opportunityId===o.id&&e.isFrozen),meta=estimate?state.estimateMeta[estimate.id]:undefined;if(!review||!meta||meta.reviewId!==review.id||meta.solutionVersionId!==review.solutionVersionId||meta.costVersionId!==review.costVersionId)missing.push('冻结概算与当前通过的方案/专家评审版本链不一致');if(!state.presales[o.id]?.solutionVersions.some(s=>s.id===review?.solutionVersionId))missing.push('缺少可解析的评审方案版本');return missing;}
export function initiationSource(state:BusinessState,opportunityId:string):InitiationSource {
 const o=state.opportunities.find(o=>o.id===opportunityId);if(!o)throw new Error('来源商机不存在');const missing=initiationPrerequisites(state,o);if(missing.length)throw new Error(missing.join('；'));
 const meta=opportunityMeta(state,o),w=presalesWorkspace(state,o.id),review=w.reviews.at(-1)!;const solution=w.solutionVersions.find(v=>v.id===review.solutionVersionId)!;const estimate=state.estimates.find(e=>e.id===o.currentEstimateVersionId&&e.isFrozen)!;
 const risks:InitiationRisk[]=[];const round=meta.assessments.at(-1);for(const [key,opinion] of Object.entries(round?.opinions??{})){if(opinion.risk.trim())risks.push({id:`RISK-${round!.id}-${key}`,domain:key==='technology'?'技术':key==='delivery'?'交付':key==='margin'?'财务':'商务',description:opinion.risk,sourceId:round!.id,sourceRoute:`/opportunities/${o.id}/evaluation`,probability:opinion.conclusion==='有条件可行'?3:2,impact:3,mitigation:opinion.note,ownerId:key==='technology'||key==='delivery'?'U-005':'U-006'});}
 for(const [i,opinion] of review.opinions.entries())risks.push({id:`RISK-${review.id}-${i}`,domain:opinion.role==='finance'?'财务':'技术',description:opinion.opinion,sourceId:review.id,sourceRoute:`/opportunities/${o.id}/review`,probability:2,impact:2,mitigation:'按专家意见落实并在立项评估中确认',ownerId:opinion.userId});
 return structuredClone({opportunity:o,estimate,solutionVersionId:solution.id,solutionScope:solution.scope,solutionAttachments:solution.attachments,expertReviewId:review.id,expertOpinions:review.opinions.map(v=>({by:v.by,dimension:v.dimension,conclusion:v.conclusion,opinion:v.opinion})),risks,earlyCostTotal:o.earlyInvestmentUsed,earlyCostSources:state.earlyCosts.filter(c=>c.opportunityId===o.id).map(c=>({id:c.id,sourceId:c.sourceId,amount:c.amount}))});
}
export function defaultInitiationInput(state:BusinessState,opportunityId:string):InitiationInput {
 const o=state.opportunities.find(o=>o.id===opportunityId)!;const w=presalesWorkspace(state,o.id),solution=w.solutionVersions.at(-1);return {opportunityId,name:o.name.replace(/商机$/,''),type:'混合交付',region:mockCustomers.find(c=>c.id===o.customerId)?.region??'',amount:o.estimatedAmount,necessity:'',scope:solution?.scope??'',plannedStartDate:'2026-09-10',plannedEndDate:'2026-12-31',expectedSignDate:o.expectedSignDate,customerNeeds:'',recommendation:'',strategic:false,contractStatus:'未签',contractReference:'',attachments:[],additionalDeliverables:[],risks:[],rectificationReply:''};
}
export function initiationDocuments(type:Project['type'],level?:Project['level']){
 return [{name:'项目范围说明书',stage:'立项',required:true,role:'主办部门'},{name:'实施计划',stage:'预算',required:true,role:'项目经理'},{name:'测试报告',stage:type==='咨询服务'?'内部验收':'开发实施',required:true,role:'技术负责人'},{name:'验收确认函',stage:'客户终验',required:true,role:'项目经理'},{name:'项目总结',stage:'结算',required:true,role:'项目经理'},...(level==='重大'||level==='特大型'?[{name:'PMC决策纪要',stage:'立项',required:true,role:'PMO'}]:[])];
}
export function riskScore(risks:InitiationRisk[]){const max=Math.max(0,...risks.map(r=>r.probability*r.impact));return max>=INITIATION_RULE.highRiskScore?'高' as const:max>=INITIATION_RULE.mediumRiskScore?'中' as const:'低' as const;}
export function initiationClassification(input:InitiationInput,source:InitiationSource,riskLevel:string,state?:BusinessState,configuration?:ConfigurationState){
 if(state&&configuration){const margin=percentage(input.amount-source.estimate.totalCost,input.amount);const rule=evaluateProjectGrading({...state,configuration},{amount:input.amount,strategic:input.strategic,risk:riskLevel==='高'?'高风险':'一般',customerLevel:mockCustomers.find(c=>c.id===source.opportunity.customerId)?.level??'',projectType:input.type,orgId:source.opportunity.departmentId,grossMarginRate:margin});const major=['重大','特大型'].includes(rule.level)||riskLevel==='高';return {level:rule.level,path:major?'PMC决策会' as const:rule.lowMargin||riskLevel==='中'?'PMO立项会' as const:'线上会签' as const,reasons:[...rule.reasons,...(riskLevel==='中'?['综合风险为中']:[])],margin,ruleVersion:rule.ruleVersion};}

 const margin=percentage(input.amount-source.estimate.totalCost,input.amount);const reasons:string[]=[];let level:Project['level']=input.amount>=INITIATION_RULE.superAmount?'特大型':input.amount>=INITIATION_RULE.majorAmount?'重大':input.amount>=INITIATION_RULE.keyAmount?'重点':'一般';
 if(input.strategic){reasons.push('战略项目');if(level==='一般'||level==='重点')level='重大';}if(input.amount>=INITIATION_RULE.majorAmount)reasons.push(`项目金额≥${INITIATION_RULE.majorAmount}万元`);if(riskLevel==='高')reasons.push('综合风险为高');
 const major=reasons.length>0;if(!major&&((margin??-Infinity)<INITIATION_RULE.minimumMargin||riskLevel==='中'))reasons.push((margin??-Infinity)<INITIATION_RULE.minimumMargin?`概算毛利率低于${INITIATION_RULE.minimumMargin}%`:'综合风险为中');
 return {level,path:major?'PMC决策会' as const:reasons.length?'PMO立项会' as const:'线上会签' as const,reasons:reasons.length?reasons:['日常项目且毛利达标、风险可控'],margin};
}
export type InitiationAction=
 |{type:'resume-initiation';id:string;reason:string}
 |{type:'save-initiation';id?:string;input:InitiationInput}|{type:'submit-initiation';id:string}
 |{type:'assess-initiation-risk';id:string;risks:InitiationRisk[];level:'低'|'中'|'高';explanation:string}
 |{type:'classify-initiation';id:string;level:Project['level'];reason:string;requiredDeliverables?:string[]}
 |{type:'sign-initiation';id:string;node:string;conclusion:'同意'|'否决';opinion:string}
 |{type:'decide-initiation';id:string;result:'通过'|'整改'|'否决'|'暂缓';opinion:string;meetingDate:string;participants:string[];minutes:string;rectifications:{content:string;ownerId:string;deadline:string}[];resumeDate?:string;costDisposition?:string;trackingOwnerId?:string};
export function applyInitiationAction(state:BusinessState,action:InitiationAction,actor:Actor){
 const app='id'in action?state.initiations.find(a=>a.id===action.id):undefined;
 if(action.type==='resume-initiation'){if(!app||app.status!=='暂缓'||actor.role!=='pmo'||!action.reason.trim())throw new Error('仅PMO可凭复评说明恢复暂缓申请');const o=state.opportunities.find(o=>o.id===app.input.opportunityId)!;if(o.status!=='暂缓')throw new Error('商机状态已变化，请先核对来源');o.status='拟立项';initiationSource(state,o.id);app.status='草稿';app.draftRevision++;app.input.rectificationReply=action.reason;(app.followups??=[]).push({by:actor.name,date:AS_OF_DATE,reason:action.reason});return app.id;}
 if(action.type==='save-initiation'){
  const input=structuredClone(action.input),o=state.opportunities.find(o=>o.id===input.opportunityId);if(!o||!canManageOpportunity(state,o,actor))throw new Error('仅来源商机主办角色可维护立项申请');if(state.projects.some(p=>p.opportunityId===o.id))throw new Error('商机已关联正式项目，不可重复立项');if(app&&!['草稿','整改'].includes(app.status))throw new Error('已提交或已决策版本不可覆盖');if(!input.name.trim()||!Number.isFinite(input.amount)||input.amount<=0)throw new Error('项目名称和正预计金额必填');if(app&&app.input.opportunityId!==input.opportunityId)throw new Error('不得替换原商机来源');if(state.initiations.some(a=>a.id!==app?.id&&a.input.opportunityId===o.id&&!['否决'].includes(a.status)))throw new Error('本商机已有立项申请，请进入原单');const value:InitiationApplication={id:app?.id??`INIT-${state.initiations.length+1}`,input,draftRevision:(app?.draftRevision??0)+1,rounds:app?.rounds??[],status:'草稿',createdBy:app?.createdBy??actor.name,createdAt:app?.createdAt??AS_OF_DATE};if(app)Object.assign(app,value);else state.initiations.push(value);return value.id;
 }
 if(!app)throw new Error('立项申请不存在');const o=state.opportunities.find(o=>o.id===app.input.opportunityId)!;const round=app.rounds.at(-1);
 if(action.type==='submit-initiation'){
  if(!canManageOpportunity(state,o,actor)||app.status!=='草稿')throw new Error('仅主办角色可提交草稿');const input=app.input;if(!input.necessity.trim()||!input.scope.trim()||!input.customerNeeds.trim()||!input.recommendation.trim()||!input.attachments.length||!input.region.trim())throw new Error('必要性、范围、客户诉求、建议、区域和立项附件必填');if(!validPlanDate(input.plannedStartDate)||!validPlanDate(input.plannedEndDate)||input.plannedEndDate<input.plannedStartDate||!validPlanDate(input.expectedSignDate))throw new Error('计划周期或预计签约日期无效');if(input.contractStatus==='已签'&&!state.contracts.some(c=>c.id===input.contractReference&&c.opportunityId===o.id&&c.customerId===o.customerId&&!c.projectId&&c.status==='已签订'&&c.amount===input.amount))throw new Error('已签须选择归属本商机且尚未绑定项目的真实已签合同');if(round?.status==='整改'&&!input.rectificationReply.trim())throw new Error('整改后须填写逐项回复说明');const source=initiationSource(state,o.id);
  app.rounds.push({configurationSnapshot:structuredClone(state.configuration),revision:app.draftRevision,input:structuredClone(input),source,submittedAt:AS_OF_DATE,submittedBy:actor.name,status:'待风险评估',risks:structuredClone([...source.risks,...input.risks]),ruleReasons:[],signatures:[]});app.status='待风险评估';
 }else{
  if(!round||['通过','整改','否决','暂缓'].includes(round.status))throw new Error('当前评审轮次已结束或未提交');
  if(action.type==='assess-initiation-risk'){
   if(actor.role!=='pmo'||!['待风险评估','待分级'].includes(round.status))throw new Error('仅PMO在分级前确认风险报告');if(!action.explanation.trim())throw new Error('综合判断与人工调整依据必填');if(action.risks.some(r=>!r.description.trim()||!r.sourceId||!r.mitigation.trim()||!mockUsers.some(u=>u.id===r.ownerId)||![r.probability,r.impact].every(n=>Number.isInteger(n)&&n>=1&&n<=5)))throw new Error('风险须有关联来源、说明、责任人、应对和1至5分评分');if(round.source.risks.some(r=>!action.risks.some(x=>x.id===r.id&&x.sourceId===r.sourceId)))throw new Error('不能删除上游风险来源');const rank={'低':0,'中':1,'高':2};if(rank[action.level]<rank[riskScore(action.risks)])throw new Error('综合等级不得低于矩阵最高风险');round.risks=structuredClone(action.risks);round.riskLevel=action.level;round.riskExplanation=action.explanation;round.assessedBy=actor.name;round.status='待分级';app.status=round.status;
  }else if(action.type==='classify-initiation'){
   if(actor.role!=='pmo'||round.status!=='待分级')throw new Error('风险评估后由PMO确认分级');if(!action.reason.trim())throw new Error('分级确认或调整原因必填');const rule=initiationClassification(round.input,round.source,round.riskLevel!,state,round.configurationSnapshot);const rank={'一般':0,'重点':1,'重大':2,'特大型':3};if(rank[action.level]<rank[rule.level])throw new Error('不能降低规则最低项目级别');round.requiredDeliverables=[...new Set((action.requiredDeliverables??[]).map(x=>x.trim()).filter(Boolean))];round.level=action.level;round.path=['重大','特大型'].includes(action.level)?'PMC决策会':rule.path;round.ruleReasons=rule.reasons;round.classificationReason=action.reason;initializeInitiationApproval(state,round);round.status=round.path==='线上会签'?'会签中':'待决策';app.status=round.status;
  }else if(action.type==='sign-initiation'){
   const node=INITIATION_SIGNATURES.find(n=>n.node===action.node);if(!node||node.role!==actor.role||round.status!=='会签中')throw new Error('仅指定角色可签署当前会签节点');if(!action.opinion.trim()||round.signatures.some(s=>s.node===node.node))throw new Error('意见必填且同一节点不能重复签署');round.signatures.push({node:node.node,role:actor.role,by:actor.name,conclusion:action.conclusion,opinion:action.opinion,date:AS_OF_DATE});if(round.signatures.length===INITIATION_SIGNATURES.length){round.status='待决策';app.status=round.status;if(round.approvalProgress)round.approvalProgress.enteredAt=AS_OF_DATE;}
  }else if(action.type==='decide-initiation'){
   const progress=round.approvalProgress;const currentNode=progress?.snapshot.nodes[progress.node];
   const decisionRole=round.path==='PMC决策会'?'executive':'pmo';
   if(!action.opinion.trim())throw new Error('决策意见必填');
   if(action.result==='通过'){
    if(round.status!=='待决策')throw new Error('须在指定决策路径完成全部前置节点');
    if(round.path==='线上会签'&&(round.signatures.length!==6||round.signatures.some(s=>s.conclusion!=='同意')))throw new Error('关键会签存在否决或缺失，须整改后重新评审');
    if(progress?!currentNode?.roles.includes(actor.role):actor.role!==decisionRole)throw new Error('当前角色不是本节点审批人');
    if(round.path!=='线上会签'&&(!validPlanDate(action.meetingDate)||new Set(action.participants).size<2||action.participants.some(id=>!mockUsers.some(u=>u.id===id))||!action.minutes.trim()))throw new Error('决策会须有会议日期、至少两位参会人和纪要');
    if(['已终止','暂缓','已转立项'].includes(o.status)||state.projects.some(p=>p.opportunityId===o.id))throw new Error('来源商机已停止或已立项，不能重复生成项目');
    if(progress){reviewConfiguredApproval(progress,actor,true,action.opinion);if(progress.status!=='通过'){round.status='待决策';return app.id;}}
    createInitiatedProject(state,app,actor);
   }else {if(action.result==='否决'&&progress&&round.status==='待决策'&&currentNode?.roles.includes(actor.role)){reviewConfiguredApproval(progress,actor,false,action.opinion);if(progress.status!=='驳回'){round.status='待决策';return app.id;}}else if(actor.role!==decisionRole)throw new Error('本路径整改、否决或暂缓须由指定决策角色办理');}
   if(action.result==='整改'&&(!action.rectifications.length||action.rectifications.some(r=>!r.content.trim()||!mockUsers.some(u=>u.id===r.ownerId)||!validPlanDate(r.deadline)||r.deadline<AS_OF_DATE)))throw new Error('整改必须明确事项、责任人与有效截止日');
   if(['否决','暂缓'].includes(action.result)&&(!action.costDisposition?.trim()||!mockUsers.some(u=>u.id===action.trackingOwnerId)))throw new Error('否决或暂缓须登记沉没成本处置说明及跟踪责任人');
   if(action.result==='暂缓'&&(!action.resumeDate||!validPlanDate(action.resumeDate)||action.resumeDate<AS_OF_DATE))throw new Error('暂缓须登记有效复评日期');if(action.result!=='通过'&&progress)progress.status='驳回';round.decision={...action,by:actor.name,date:AS_OF_DATE};round.status=action.result;app.status=action.result;if(action.result==='否决'){o.status='已终止';(state.opportunityMeta[o.id]??=opportunityMeta(state,o)).termination={reason:action.opinion,costDisposition:action.costDisposition!,retrospective:`立项 ${app.id} 决策，跟踪责任 ${action.trackingOwnerId}`,costSnapshot:o.earlyInvestmentUsed,date:AS_OF_DATE};}if(action.result==='暂缓'){o.status='暂缓';(state.opportunityMeta[o.id]??=opportunityMeta(state,o)).pauses.push({reason:`${action.opinion}；成本处置：${action.costDisposition}`,reviewDate:action.resumeDate!,ownerId:action.trackingOwnerId!,ownerName:mockUsers.find(u=>u.id===action.trackingOwnerId)!.name,date:AS_OF_DATE});}
  }
 }
 return app.id;
}
function initializeInitiationApproval(state:BusinessState,round:InitiationRound){
 if(!round.configurationSnapshot)return;
 const snapshot=selectApprovalRule({...state,configuration:round.configurationSnapshot},{businessType:'initiation',amount:round.input.amount,risk:round.riskLevel==='高'?'高风险':'一般',grossMarginRate:percentage(round.input.amount-round.source.estimate.totalCost,round.input.amount),level:round.level,orgId:round.source.opportunity.departmentId,projectType:round.input.type});
 if(round.path==='PMC决策会'){const last=snapshot.nodes.at(-1);if(last?.roles.length!==1||last.roles[0]!=='executive')snapshot.nodes.push({name:'重大/高风险领导最终决策',roles:['executive'],mode:'all',timeoutDays:3});snapshot.reason+='；重大/高风险必须由集团领导最终决策';}
 round.approvalProgress={snapshot,node:0,enteredAt:AS_OF_DATE,reviews:[],status:'待审批'};
}
function createInitiatedProject(state:BusinessState,app:InitiationApplication,actor:Actor){
 const r=app.rounds.at(-1)!,i=r.input,o=state.opportunities.find(o=>o.id===i.opportunityId)!;const id=`P-INIT-${state.projects.length+1}`;const customer=mockCustomers.find(c=>c.id===o.customerId)!;const department=mockDepartments.find(d=>d.id===o.departmentId)!;
 const contract=i.contractStatus==='已签'?state.contracts.find(c=>c.id===i.contractReference&&c.opportunityId===o.id&&c.customerId===o.customerId&&!c.projectId&&c.status==='已签订'&&c.amount===i.amount):undefined;if(i.contractStatus==='已签'&&!contract)throw new Error('签约依据已失效或已绑定其他项目');
 const p:Project={id,code:`PMS-2026-${id}`,name:i.name,customerId:customer.id,customerName:customer.name,opportunityId:o.id,frozenEstimateVersionId:r.source.estimate.id,pmId:'',pmName:'待任命',memberIds:[],departmentId:department.id,departmentName:department.name,type:i.type,level:r.level!,phase:'立项',subPhase:'WBS编制',status:'正常进行',health:'green',healthReason:'立项通过，待团队任命和计划预算',isUnsigned:!contract,unsignedLimitQuota:0,isMaintenance:false,contractAmount:contract?.amount??0,revenueAmount:contract?.amount??i.amount,budgetAmount:0,rollingCost:0,actualCost:0,committedCost:0,forecastRemainingCost:0,costVariance:0,costVarianceRate:0,progressRate:0,plannedStartDate:i.plannedStartDate,plannedEndDate:i.plannedEndDate,currentBaselineVersion:'未形成',createdAt:AS_OF_DATE,description:i.scope};
 state.projects.push(p);if(r.configurationSnapshot)instantiateProjectTemplates({...state,configuration:r.configurationSnapshot},p.id);if(contract){contract.projectId=id;state.receiptPlans.filter(x=>x.contractId===contract.id).forEach(x=>{x.projectId=id;});}state.projectTeams[id]={members:[],appointments:[],history:[{date:AS_OF_DATE,actor:actor.name,description:`立项${app.id}通过，待PMO任命主PM`}]};
 state.planningDrafts[id]={projectId:id,revision:1,status:'草稿',updatedAt:AS_OF_DATE,scope:i.scope,tasks:[],milestones:milestoneTemplate(id,i.plannedStartDate,i.plannedEndDate,i.type).map(m=>({...m,ownerId:'',ownerName:'待指定'})),resources:[],plannedStartDate:i.plannedStartDate,plannedEndDate:i.plannedEndDate};
 for(const doc of new Map([...initiationDocuments(i.type,r.level),...[...new Set([...i.additionalDeliverables,...r.requiredDeliverables??[]])].map(name=>({name,stage:'立项',required:true,role:'项目经理'}))].map(d=>[d.name,d])).values()){const existing=state.materials.find(m=>m.projectId===id&&m.name===doc.name);if(existing){existing.required=true;continue;}state.materials.push({id:`MAT-${id}-${state.materials.length+1}`,projectId:id,name:doc.name,required:doc.required,status:'缺失'});}
 inheritEarlyCosts(state,o.id,id);o.status='已转立项';app.projectId=id;
}
