import type {FullBaselineSnapshot} from '@/models/budget';
import {AS_OF_DATE} from '@/mock';
import type {Actor,Approval,BusinessState} from './business';
import type {ChangeInput,ChangeRequest} from '@/models/changes';
import type {BudgetVersion} from '@/models/types';
import {planningSnapshot,confirmBudgetBaseline} from './budget';
import {projectEstimate} from './versions';
import {assertConstructionWritable} from './construction-lock';
import {money,percentage,sumMoney} from '@/utils/money';
export const CHANGE_RULE={version:'CHANGE-2026-01',largeCost:100,largeShiftDays:30,minGrossMarginPercent:20};
export function defaultChangeInput(state:BusinessState,id:string):ChangeInput {
 const p=state.projects.find(p=>p.id===id)!;return {type:'范围/进度变更',title:'',reason:'',scope:planningSnapshot(state,id).scope,customerBasis:'',contractBasis:'',urgency:'一般',shiftDays:0,proposedIncome:p.revenueAmount??p.contractAmount,adjustments:{},resourceHours:{},newWorkPackage:'',newTaskOwnerId:p.pmId,risk:'',majorRisk:false,procurementImpact:'',outsourceImpact:'',attachments:[]};
}
export function proposeChange(state:BusinessState,id:string,input:ChangeInput){
 const p=state.projects.find(p=>p.id===id);if(!p)throw new Error('项目不存在');const original=state.baselines.find(b=>b.projectId===id&&b.status==='已生效');const currentBudget=state.budgets.find(b=>b.projectId===id&&b.status==='已生效'),estimate=projectEstimate(p,state.estimates);if(!original||!currentBudget||!estimate)throw new Error('变更须引用生效基线、预算和冻结概算');
 if(!Number.isInteger(input.shiftDays)||Math.abs(input.shiftDays)>365||!Number.isFinite(input.proposedIncome)||input.proposedIncome<0)throw new Error('工期变化须为±365天内整数，收入须非负');
 if(Object.entries(input.adjustments).some(([subjectId,amount])=>!currentBudget.items.some(i=>i.subjectId===subjectId)||!Number.isFinite(amount)))throw new Error('预算调整科目或金额无效');
 const items=currentBudget.items.map(i=>({...i,amount:money(i.amount+(input.adjustments[i.subjectId]??0))}));if(items.some(i=>i.amount<0))throw new Error('调整后科目预算不能为负');
 const budget:BudgetVersion={...structuredClone(currentBudget),id:`PROPOSED-${id}`,version:'变更提议',status:'审批中',items,totalAmount:sumMoney(items.map(i=>i.amount))};
 const snapshot=planningSnapshot(state,id);const shift=(date:string)=>new Date(Date.parse(date)+input.shiftDays*86400000).toISOString().slice(0,10);
 snapshot.scope=input.scope;snapshot.plannedEndDate=shift(original.plannedEndDate);if(snapshot.plannedEndDate<original.plannedStartDate)throw new Error('变更后结束日期不可早于项目开始');
 snapshot.tasks.forEach(t=>{if(t.progress<100){t.startDate=shift(t.startDate);t.endDate=shift(t.endDate);}});
 snapshot.milestones.forEach(m=>{if(m.status!=='已达成')m.plannedDate=shift(m.plannedDate);});
 snapshot.resources.forEach(r=>{if(input.resourceHours[r.userId]!==undefined){const hours=input.resourceHours[r.userId];if(!Number.isFinite(hours)||hours<=0)throw new Error('资源投入工时须为正数');r.plannedHours=hours;}if(r.active)r.endDate=snapshot.plannedEndDate;});
 if(input.newWorkPackage.trim()){
  if(snapshot.plannedEndDate<AS_OF_DATE)throw new Error('新增工作包须有未来有效计划结束日期');
  const owner=state.projectTeams[id]?.members.find(m=>m.userId===input.newTaskOwnerId&&m.active);if(!owner)throw new Error('新增范围须指定有效团队责任人');
  snapshot.tasks.push({id:`TASK-CHANGE-${id}-${state.changes.length+1}`,projectId:id,taskCode:`${snapshot.tasks.length+1}`,name:input.newWorkPackage,ownerId:owner.userId,ownerName:owner.name,startDate:AS_OF_DATE>p.plannedStartDate?AS_OF_DATE:p.plannedStartDate,endDate:snapshot.plannedEndDate,plannedDays:1,plannedHours:8,progress:0,isMilestone:false,status:'未开始',completionCondition:'完成变更批准范围并提交验证材料',predecessorIds:[]});
 }
 const proposed:FullBaselineSnapshot={...snapshot,budget,estimateVersionId:estimate.id,planningReviewId:state.planningDrafts[id]?.reviewId};
 const margin=percentage(input.proposedIncome-budget.totalAmount,input.proposedIncome);const reasons=[];
 if(Math.abs(budget.totalAmount-currentBudget.totalAmount)>=CHANGE_RULE.largeCost)reasons.push(`成本影响≥${CHANGE_RULE.largeCost}万元`);if(Math.abs(input.shiftDays)>=CHANGE_RULE.largeShiftDays)reasons.push(`工期影响≥${CHANGE_RULE.largeShiftDays}天`);if(margin===null||margin<CHANGE_RULE.minGrossMarginPercent)reasons.push(`变更后毛利率低于${CHANGE_RULE.minGrossMarginPercent}%或收入为零`);if(input.majorRisk)reasons.push('重大风险');
 return {original:structuredClone(original),proposed,budget,reasons};
}
export function initializePendingChanges(state:BusinessState){
 for(const change of state.changes.filter(c=>['PMO审批中','PMC审议中'].includes(c.status))){
  const existing=state.approvals.find(a=>a.sourceChangeId===change.id);if(existing)continue;
  if(!state.baselines.some(b=>b.projectId===change.projectId&&b.status==='已生效'))continue;
  const input=defaultChangeInput(state,change.projectId);input.type=change.type;input.title=change.title;input.reason='历史待审事项补齐影响评估后办理';input.shiftDays=change.scheduleImpactDays;input.adjustments={'SUB-01':change.costImpact};input.customerBasis='待补充原客户变更依据';input.contractBasis='待核对原合同条款';input.risk='待专业评估';input.procurementImpact='待采购协同评估';input.outsourceImpact='待技术协同评估';
  const proposal=proposeChange(state,change.projectId,input);
  state.changeRequests.push({id:change.id,projectId:change.projectId,input,original:proposal.original,proposed:proposal.proposed,proposedBudget:proposal.budget,status:'影响评估中',requiredRole:change.status==='PMC审议中'?'executive':'pmo',ruleReasons:proposal.reasons,assessments:[],submittedBy:'历史申请记录',submittedAt:change.createdAt,revision:1});
 }
}
export type ProjectChangeAction={type:'save-project-change';projectId:string;id?:string;input:ChangeInput}|{type:'submit-project-change';id:string}|{type:'assess-project-change';id:string;area:'技术'|'财务'|'市场';opinion:string}|{type:'classify-project-change';id:string;opinion:string}|{type:'finance-signoff-change';id:string;approve:boolean;opinion:string}|{type:'review-project-change';id:string;approve:boolean;opinion:string};
export function applyProjectChangeAction(state:BusinessState,action:ProjectChangeAction,actor:Actor){
 const request='id'in action?state.changeRequests.find(r=>r.id===action.id):undefined;const projectId=action.type==='save-project-change'?action.projectId:request?.projectId;const p=state.projects.find(p=>p.id===projectId);if(!p)throw new Error('项目或变更单不存在');assertConstructionWritable(state,p.id);if(['已终止','已关闭'].includes(p.status))throw new Error('项目已终止或关闭');
 if(action.type==='save-project-change'){
  if(actor.role!=='project-manager'||actor.id!==p.pmId)throw new Error('仅项目主PM可申请变更');if(request&&!['草稿','驳回'].includes(request.status))throw new Error('提交版本不可修改');const input=structuredClone(action.input);if(!input.title.trim()||!input.reason.trim()||!input.scope.trim())throw new Error('变更标题、原因和目标范围必填');const proposal=proposeChange(state,p.id,input);const id=request?.id??`CHG-NEW-${state.changes.length+1}`;
  const value:ChangeRequest={id,projectId:p.id,input,original:proposal.original,originalIncome:p.revenueAmount??p.contractAmount,proposed:proposal.proposed,proposedBudget:proposal.budget,status:'草稿',requiredRole:proposal.reasons.length?'executive':'pmo',ruleReasons:proposal.reasons,assessments:[],submittedBy:actor.name,revision:(request?.revision??0)+1,history:[...(request?.history??[]),...(request?.status==='驳回'?[{revision:request.revision,status:request.status,input:structuredClone(request.input),original:structuredClone(request.original),originalIncome:request.originalIncome,proposed:structuredClone(request.proposed),opinion:request.opinion}]:[])]};
  if(request)Object.assign(request,value);else state.changeRequests.push(value);const summary={id,projectId:p.id,code:`CR-${id}`,title:input.title,type:input.type,costImpact:money(proposal.budget.totalAmount-proposal.original.budgetAmount),scheduleImpactDays:input.shiftDays,status:'草稿' as const,createdAt:AS_OF_DATE};const existing=state.changes.find(c=>c.id===id);if(existing)Object.assign(existing,{...summary,code:existing.code,createdAt:existing.createdAt});else state.changes.push(summary);return id;
 }
 const r=request!;const summary=state.changes.find(c=>c.id===r.id)!;
 if(action.type==='submit-project-change'){
  if(actor.role!=='project-manager'||actor.id!==p.pmId||r.status!=='草稿')throw new Error('仅主PM可提交草稿');if(!r.input.customerBasis.trim()||!r.input.contractBasis.trim()||!r.input.attachments.length||!r.input.risk.trim()||!r.input.procurementImpact.trim()||!r.input.outsourceImpact.trim())throw new Error('客户/合同依据、风险、采购外包影响和附件必填');if(state.changeRequests.some(x=>x.projectId===p.id&&x.id!==r.id&&!['草稿','通过','驳回'].includes(x.status)))throw new Error('请先处理本项目在途变更');r.status='影响评估中';r.submittedAt=AS_OF_DATE;summary.status='影响评估中';
 }else if(action.type==='assess-project-change'){
  const role={'技术':'solution-tech','财务':'finance','市场':'market'}[action.area];if(actor.role!==role||!['影响评估中','待分级'].includes(r.status))throw new Error('仅对应专业角色可评估当前变更');if(!action.opinion.trim())throw new Error('专业评估意见必填');r.assessments=r.assessments.filter(a=>a.area!==action.area);r.assessments.push({area:action.area,actor:actor.name,opinion:action.opinion,date:AS_OF_DATE});if(r.assessments.length===3){r.status='待分级';summary.status='待分级';}
 }else if(action.type==='classify-project-change'){
  if(actor.role!=='pmo'||r.status!=='待分级')throw new Error('专业评估齐全后由PMO分级');if(!action.opinion.trim())throw new Error('分级依据必填');r.requiredRole=r.ruleReasons.length?'executive':'pmo';r.status='待审批';r.classifiedBy=actor.name;r.classificationOpinion=action.opinion;summary.status=r.requiredRole==='executive'?'PMC审议中':'PMO审批中';
  state.decisions.push({id:`DEC-${r.id}`,projectId:p.id,projectName:p.name,type:'重大变更审批',title:r.input.title,impactAmount:summary.costImpact,level:r.requiredRole==='executive'?'PMC决策会':'PMO立项会',status:'待决策',targetRoute:`/project-changes/new?changeId=${r.id}`,createdAt:AS_OF_DATE});
 }else if(action.type==='finance-signoff-change'){
  if(actor.role!=='finance')throw new Error('仅财务可办理会签');if(!['影响评估中','待分级','待审批'].includes(r.status))throw new Error('变更须在评估或审批阶段办理会签');if(!action.opinion.trim())throw new Error('会签意见必填');
  r.financeSignoff={signed:action.approve,actor:actor.name,date:AS_OF_DATE,opinion:action.opinion};
 }else if(action.type==='review-project-change'){
  if(!action.opinion.trim())throw new Error('审批意见必填');if(['草稿','通过','驳回'].includes(r.status))throw new Error('变更尚未提交或已处理');if(action.approve&&(r.status!=='待审批'||actor.role!==r.requiredRole))throw new Error('须完成评估与分级，并由指定层级审批');if(!action.approve&&!['pmo','executive'].includes(actor.role))throw new Error('仅PMO或集团领导可退回变更');
  if(action.approve){if(r.input.type==='成本/资源变更'&&!r.financeSignoff?.signed)throw new Error('成本/资源变更须先完成财务会签');if(!r.input.attachments.length||r.input.customerBasis.startsWith('待')||r.input.contractBasis.startsWith('待'))throw new Error('历史待审材料不完整，请先退回补充客户/合同依据与附件');if(r.proposed.tasks.some(t=>t.startDate<r.proposed.plannedStartDate||t.endDate>r.proposed.plannedEndDate||t.startDate>t.endDate))throw new Error('提议任务超出批准周期，请退回核对计划');if(state.baselines.find(b=>b.projectId===p.id&&b.status==='已生效')?.id!==r.original.id)throw new Error('源基线已变化，请重新申报变更');
   const estimate=projectEstimate(p,state.estimates)!;const approval:Approval={id:`CHANGE-${r.id}`,projectId:p.id,kind:'change',status:'通过',budget:r.proposedBudget,baseline:{...r.original,scopeDesc:r.proposed.scope,plannedStartDate:r.proposed.plannedStartDate,plannedEndDate:r.proposed.plannedEndDate,snapshot:r.proposed},estimate,requiredRole:r.requiredRole,submittedBy:r.submittedBy,reason:r.input.reason,sourceChangeId:r.id,opinion:action.opinion};
   confirmBudgetBaseline(state,approval,actor);state.approvals.push(approval);r.sourceApprovalId=approval.id;
   const execution=new Map(state.tasks.filter(t=>t.projectId===p.id).map(t=>[t.id,t]));state.tasks=state.tasks.filter(t=>t.projectId!==p.id).concat(r.proposed.tasks.map(t=>{const old=execution.get(t.id);return {...structuredClone(t),...(old?{progress:old.progress,status:old.status,actualStartDate:old.actualStartDate,actualEndDate:old.actualEndDate,executionNote:old.executionNote}:{})};}));
   const actualMilestones=new Map(state.milestones.filter(m=>m.projectId===p.id).map(m=>[m.id,m]));state.milestones=state.milestones.filter(m=>m.projectId!==p.id).concat(r.proposed.milestones.map(m=>{const old=actualMilestones.get(m.id);return {...structuredClone(m),...(old?{status:old.status,actualDate:old.actualDate,}:{})};}));const tasks=state.tasks.filter(t=>t.projectId===p.id);const duration=tasks.reduce((n,t)=>n+t.plannedDays,0);p.progressRate=duration?money(tasks.reduce((n,t)=>n+t.progress*t.plannedDays,0)/duration):0;p.plannedEndDate=r.proposed.plannedEndDate;p.revenueAmount=r.input.proposedIncome;if(state.projectTeams[p.id])state.projectTeams[p.id].members=structuredClone(r.proposed.resources);summary.newBaselineId=`BASE-${approval.id}`;
   if(state.planningDrafts[p.id])state.planningDrafts[p.id]={...structuredClone(r.proposed),projectId:p.id,revision:state.planningDrafts[p.id].revision+1,status:'已冻结',updatedAt:AS_OF_DATE};
  }
  r.status=action.approve?'通过':'驳回';r.reviewedBy=actor.name;r.opinion=action.opinion;r.reviewedAt=AS_OF_DATE;summary.status=action.approve?'已批准':'已否决';const decision=state.decisions.find(d=>d.id===`DEC-${r.id}`);if(decision)decision.status=action.approve?'已通过':'已否决';
 }
 return r.id;
}
