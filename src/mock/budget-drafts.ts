import { CANONICAL_SUBJECTS, projectCostRegion, configuredSubjects, selectCostRate, selectSubjectMapping } from '@/mock/configuration-finance';
import { AS_OF_DATE } from '@/mock';
import type { Actor, BusinessState } from './business';
import type { BudgetDraft, BudgetLine } from '@/models/budget';
import type { BudgetVersion, EstimateVersion } from '@/models/types';
import { hourlyRate } from './labor';
import { projectEstimate } from './versions';
import { assertConstructionWritable } from './construction-lock';
import { money, sumMoney } from '@/utils/money';
export const BUDGET_RULE={version:'BUDGET-2026-01',effectiveDate:'2026-01-01',majorSubjects:['SUB-01','SUB-02','SUB-03'],allowMajorSubjectIncreasePercent:10,workingHoursPerDay:8};
export const BUDGET_SUBJECTS=CANONICAL_SUBJECTS.filter(s=>s.id!=='SUB-04');
export const lineAmount=(line:BudgetLine)=>line.kind==='labor'?money(line.plannedDays*BUDGET_RULE.workingHoursPerDay*(line.hourlyYuan??hourlyRate(line.userId??''))/10000):line.subjectId==='SUB-04-2'&&line.travelDays>0&&line.expenseDailyYuan!==undefined?money(line.travelDays*line.expenseDailyYuan/10000):money(line.amount);
export function budgetOverruns(budget:BudgetVersion,estimate:EstimateVersion){
 const reasons:string[]=[];if(budget.totalAmount>estimate.totalCost)reasons.push(`总成本超过概算${money(budget.totalAmount-estimate.totalCost)}万元`);
 for(const id of BUDGET_RULE.majorSubjects){const proposed=sumMoney(budget.items.filter(i=>i.subjectId===id).map(i=>i.amount));const limit=sumMoney(estimate.items.filter(i=>i.subjectId===id).map(i=>i.amount));if(proposed>limit*(1+BUDGET_RULE.allowMajorSubjectIncreasePercent/100))reasons.push(`${BUDGET_SUBJECTS.find(s=>s.id===id)?.name}超过概算科目${BUDGET_RULE.allowMajorSubjectIncreasePercent}%阈值`);}
 return reasons;
}
export function getBudgetDraft(state:BusinessState,id:string):BudgetDraft {
 if(state.budgetDrafts[id])return structuredClone(state.budgetDrafts[id]);const p=state.projects.find(p=>p.id===id)!;const estimate=projectEstimate(p,state.estimates);const budget=state.budgets.find(b=>b.projectId===id&&b.status==='已生效');
 return {projectId:id,revision:0,estimateVersionId:estimate?.id??'',updatedAt:AS_OF_DATE,reason:'',mitigation:'',responsibility:'',lines:(budget?.items??estimate?.items??[]).map((item,i)=>({id:`BD-${id}-${i}`,name:item.subjectName,kind:item.subjectId==='SUB-01'?'labor':item.subjectId==='SUB-02'?'outsource':item.subjectId==='SUB-03'?'procurement':item.subjectId==='SUB-05'?'reserve':'expense',subjectId:item.subjectId,amount:item.amount,userId:p.pmId,plannedDays:item.subjectId==='SUB-01'?Math.round(item.amount*10000/(8*hourlyRate(p.pmId))*100)/100:0,travelDays:0,grade:'项目岗位基准',taskId:state.planningDrafts[id]?.tasks[0]?.id??state.tasks.find(t=>t.projectId===id)?.id,stage:'开发实施',sourceEstimateItemId:estimate?.items.find(e=>e.subjectId===item.subjectId)?.subjectId,justification:'沿用冻结概算范围测算',department:p.departmentName,supplyMode:item.subjectId==='SUB-02'?'专业外包':'自有交付'}))};
}
export function toBudgetVersion(draft:BudgetDraft,actor:Actor):BudgetVersion {
 const subjects=new Map(BUDGET_SUBJECTS.map(s=>[s.id,s.name]));for(const line of draft.lines)subjects.set(line.subjectId,line.subjectName??subjects.get(line.subjectId)??line.subjectId);
 const items=[...subjects].map(([id,name])=>({id,name})).map(s=>({subjectId:s.id,subjectName:s.name,amount:sumMoney(draft.lines.filter(l=>l.subjectId===s.id).map(lineAmount))}));
 return {id:`DRAFT-${draft.projectId}-${draft.revision}`,projectId:draft.projectId,version:`草稿R${draft.revision}`,status:'草稿',isOverEstimate:false,totalAmount:sumMoney(items.map(i=>i.amount)),items,createdAt:AS_OF_DATE,createdBy:actor.id};
}
export function validateBudgetDraft(state:BusinessState,draft:BudgetDraft,submit=false){
 const p=state.projects.find(p=>p.id===draft.projectId)!;const estimate=projectEstimate(p,state.estimates);if(!estimate||draft.estimateVersionId!==estimate.id)throw new Error('预算须引用项目绑定的冻结概算');
 if(new Set(draft.lines.map(l=>l.id)).size!==draft.lines.length)throw new Error('预算行ID重复');
 for(const l of draft.lines){if(!configuredSubjects(state,p.departmentId,p.type).some(s=>s.id===l.subjectId)||![l.amount,l.plannedDays,l.travelDays].every(n=>Number.isFinite(n)&&n>=0))throw new Error('科目或金额/人天无效');if(l.kind==='labor'&&l.subjectId!=='SUB-01'||l.kind==='procurement'&&l.subjectId!=='SUB-03'||l.kind==='outsource'&&l.subjectId!=='SUB-02'||['expense','third-party'].includes(l.kind)&&!l.subjectId.startsWith('SUB-04-')||l.kind==='reserve'&&l.subjectId!=='SUB-05')throw new Error('成本类型与科目不匹配');
 if(submit){if(!l.name.trim()||!l.stage||!l.department.trim())throw new Error('预算事项、阶段与责任部门必填');if(l.kind==='labor'&&(!state.projectTeams[p.id]?.members.some(m=>m.active&&m.userId===l.userId)||l.plannedDays<=0))throw new Error('人力预算须关联有效成员及正计划人天');if(['labor','outsource'].includes(l.kind)&&![...(state.planningDrafts[p.id]?.tasks??[]),...state.tasks.filter(t=>t.projectId===p.id)].some(t=>t.id===l.taskId))throw new Error('人力与外包须关联本项目WBS范围');if(['procurement','outsource'].includes(l.kind)&&(!l.justification.trim()||!l.supplyMode.trim()))throw new Error('采购外包调整须说明范围、原因与供应方式');}}
 if(submit&&!draft.lines.length)throw new Error('预算明细不能为空');
 const budget=toBudgetVersion(draft,{id:p.pmId,name:p.pmName,role:'project-manager'});if(submit&&budgetOverruns(budget,estimate).length&&(!draft.reason.trim()||!draft.mitigation.trim()||!draft.responsibility.trim()))throw new Error('超概算须填写原因、应对措施和责任说明');
}
export type BudgetDraftAction={type:'save-budget-draft';draft:BudgetDraft;expectedRevision:number}|{type:'submit-budget-draft';projectId:string};
export function saveBudgetDraft(state:BusinessState,draft:BudgetDraft,expectedRevision:number,actor:Actor){
 const p=state.projects.find(p=>p.id===draft.projectId);if(!p)throw new Error('项目不存在');assertConstructionWritable(state,p.id);if(actor.role!=='project-manager'||actor.id!==p.pmId)throw new Error('仅项目主PM可编制预算');if(state.approvals.some(a=>a.projectId===p.id&&(a.status==='待审批'||a.kind==='budget'&&a.status==='通过'&&!a.baselineConfirmedAt)))throw new Error('审批或基线确认中不可修改预算草稿');if((state.budgetDrafts[p.id]?.revision??0)!==expectedRevision)throw new Error('预算草稿版本已变化');validateBudgetDraft(state,draft);const normalized=structuredClone(draft);normalized.lines=normalized.lines.map(line=>{const old=state.budgetDrafts[p.id]?.lines.find(l=>l.id===line.id&&l.userId===line.userId&&l.grade===line.grade&&l.subjectId===line.subjectId&&l.kind===line.kind);const mapping=selectSubjectMapping(state,p.departmentId,p.type);const subjectName=mapping.subjects.find(subject=>subject.id===line.subjectId)?.name??line.subjectId;const next=old?{...line,hourlyYuan:old.hourlyYuan??(old.kind==='labor'?hourlyRate(old.userId??''):undefined),rateVersion:old.rateVersion??(old.kind==='labor'?'LAB-2026-01':undefined),expenseDailyYuan:old.expenseDailyYuan,expenseRateVersion:old.expenseRateVersion,mappingVersion:old.mappingVersion,subjectName:old.subjectName??subjectName}:snapshotBudgetRate(state,p.id,line);return next;});state.budgetDrafts[p.id]={...normalized,revision:expectedRevision+1,updatedAt:AS_OF_DATE};return p.id;
}

export function snapshotBudgetRate(state:BusinessState,projectId:string,line:BudgetLine){const p=state.projects.find(p=>p.id===projectId)!;const rate=selectCostRate(state,{userId:line.userId,grade:line.grade,region:projectCostRegion(state,p),orgId:p.departmentId,projectType:p.type});const mapping=selectSubjectMapping(state,p.departmentId,p.type);return {...line,hourlyYuan:line.kind==='labor'?rate.hourlyYuan:undefined,rateVersion:line.kind==='labor'?rate.versionId:undefined,expenseDailyYuan:line.subjectId==='SUB-04-2'&&line.travelDays>0?rate.expenseDailyYuan:undefined,expenseRateVersion:line.subjectId==='SUB-04-2'&&line.travelDays>0?rate.versionId:undefined,mappingVersion:mapping.id,subjectName:mapping.subjects.find(s=>s.id===line.subjectId)?.name??line.subjectId};}
