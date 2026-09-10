import {AS_OF_DATE,mockUsers} from '@/mock';
import type {Actor,BusinessState,Material} from '@/mock/business';
import {ARCHIVE_CATEGORIES,EVALUATION_GOALS,type ArchiveCategory,type ArchiveSource,type PostEvaluation,type EvaluationGoal} from '@/models/closeout';
import {selectFourCalculations} from '@/mock/selectors';

export function evaluationPeople(state:BusinessState,projectId:string){
 const p=state.projects.find((p)=>p.id===projectId)!;const opp=state.opportunities.find((o)=>o.id===p.opportunityId);
 const team=(state as BusinessState & {projectTeams?:Record<string,{members:{userId:string;name:string;role:string}[]}>}).projectTeams?.[projectId]?.members??[];
 return [...new Set([p.pmId,...(p.memberIds??[]),...team.map((m)=>m.userId),...(opp?[opp.ownerId]:[])])].map((id)=>({id,name:id===p.pmId?p.pmName:team.find((m)=>m.userId===id)?.name??mockUsers.find((u)=>u.id===id)?.name??id,role:id===p.pmId?'项目经理':id===opp?.ownerId?'项目主办':team.find((m)=>m.userId===id)?.role??mockUsers.find((u)=>u.id===id)?.role??'项目成员',delivery:(p.memberIds?.includes(id)||team.some((m)=>m.userId===id))&&id!==p.pmId&&id!==opp?.ownerId}));
}
export function archiveCategory(m:Material):ArchiveCategory|undefined{return m.archiveCategory??(m.name==='测试报告'?'测试与质量资料':m.name==='验收确认函'?'验收资料':m.name==='实施计划'?'WBS / 计划':undefined);}
export function archiveSources(state:BusinessState,projectId:string):ArchiveSource[]{
 const p=state.projects.find((p)=>p.id===projectId)!;const base=`/projects/${p.id}`;const list:ArchiveSource[]=[];
 const add=(category:ArchiveCategory,id:string,label:string,version:string,route:string,record:unknown)=>list.push({category,id,label,version,route,record:structuredClone(record)});
 const opp=state.opportunities.find((o)=>o.id===p.opportunityId);if(opp)add('商机资料',opp.id,opp.name,'当前来源记录',`/opportunities/${opp.id}`,opp);
 add('方案',`${p.id}:solution`,'历史方案文件补档容器（绑定原项目）','原件版本另行登记',`/opportunities/${p.opportunityId}/solution`,{projectId:p.id,opportunityId:p.opportunityId});
 add('立项材料',`${p.id}:initiation`,'立项正式材料补档容器（绑定原项目）','原件版本另行登记','/initiation/review',{projectId:p.id,opportunityId:p.opportunityId});
 for(const c of state.contracts.filter((c)=>c.projectId===p.id))add('合同',c.id,c.name,c.status,base,c);
 for(const b of state.baselines.filter((b)=>b.projectId===p.id))add('WBS / 计划',b.id,'项目基线',b.version,`${base}/baseline`,{...b,tasks:state.tasks.filter((t)=>t.projectId===p.id),milestones:state.milestones.filter((m)=>m.projectId===p.id)});
 for(const b of state.budgets.filter((b)=>b.projectId===p.id))add('预算',b.id,'预算版本',b.version,`${base}/budget`,b);
 add('变更',`${p.id}:changes`,'项目变更台账快照',AS_OF_DATE,'/project-changes',{projectId:p.id,records:state.changes.filter((c)=>c.projectId===p.id)});
 add('需求 / BUG',`${p.id}:tickets`,'需求与BUG台账快照',AS_OF_DATE,`/requirements-bugs?project=${p.id}`,{projectId:p.id,requirements:state.requirements.filter((r)=>r.projectId===p.id),bugs:state.bugs.filter((b)=>b.projectId===p.id)});
 add('问题 / 风险',`${p.id}:risks`,'问题风险台账快照',AS_OF_DATE,`/issues-risks?project=${p.id}`,{projectId:p.id,issues:state.issues.filter((r)=>r.projectId===p.id),risks:state.risks.filter((r)=>r.projectId===p.id)});
 if(state.qualityPlans[p.id])add('测试与质量资料',`${p.id}:quality`,'质量计划与检查记录',AS_OF_DATE,`${base}/deliverables?tab=quality`,state.qualityPlans[p.id]);
 for(const a of state.acceptances.filter((a)=>a.projectId===p.id))add('验收资料',a.id,a.type,`第${a.round}轮`,`${base}/${a.type==='客户终验'?'customer-acceptance':a.type==='供应商验收'?'supplier-acceptance':'internal-acceptance'}?record=${a.id}`,{...a,detail:state.acceptanceDetails[a.id]});
 for(const s of state.settlements.filter((s)=>s.projectId===p.id&&s.status==='已锁定已生效'))add('结算材料',s.id,'正式结算结果',s.settledDate??'历史已锁定',`${base}/settlement`,{...s,request:state.settlementRequests.find((r)=>`SET-${r.id}`===s.id)});
 const evaluation=state.postEvaluations[p.id];if(evaluation){add('项目总结',evaluation.id,'项目后评价',evaluation.status,`${base}/post-evaluation`,evaluation);add('经验教训',`${evaluation.id}:lessons`,'成功经验与改进措施',evaluation.status,`${base}/post-evaluation`,{projectId:p.id,successes:evaluation.successes,lessons:evaluation.lessons,improvements:evaluation.improvements});}
 for(const m of state.materials.filter((m)=>m.projectId===p.id)){const category=archiveCategory(m);if(category)add(category,m.id,m.name,m.versions?.at(-1)?`V${m.versions.at(-1)!.version}`:m.status,`${base}/deliverables?document=${m.id}`,m);}
 return list;
}
const documentCategories:ArchiveCategory[]=['方案','立项材料','合同','测试与质量资料','验收资料','结算材料'];
export function archiveChecks(state:BusinessState,projectId:string){const sources=archiveSources(state,projectId);return ARCHIVE_CATEGORIES.map((category)=>{const materials=state.materials.filter((m)=>m.projectId===projectId&&archiveCategory(m)===category);const source=sources.filter((s)=>s.category===category);const documentsReady=materials.some((m)=>m.status==='通过'&&m.versions?.at(-1)?.status==='通过');const passed=source.length>0&&(documentCategories.includes(category)?documentsReady:category==='项目总结'||category==='经验教训'?state.postEvaluations[projectId]?.status==='已完成':true);return {category,passed,sourceCount:source.length,fileCount:materials.filter((m)=>m.status==='通过'&&m.versions?.at(-1)?.status==='通过').length,detail:!source.length?'缺少原业务记录':documentCategories.includes(category)&&!documentsReady?'缺少已审核正式文件，原记录不代替文件':passed?'目录与来源完整':'后评价尚未最终确认'};});}
export type CloseoutAction=
 |{type:'start-post-evaluation';projectId:string}
 |{type:'save-post-evaluation';projectId:string;goals:PostEvaluation['goals'];riskReview:string;changeReview:string;successes:string;lessons:string;improvements:string;submit:boolean}
 |{type:'score-post-evaluation';projectId:string;userId:string;score:number;note:string}
 |{type:'confirm-post-evaluation';projectId:string;approve:boolean;opinion:string}
 |{type:'submit-archive-file';projectId:string;category:ArchiveCategory;sourceId:string;filename:string;note:string}
 |{type:'review-archive-file';id:string;approve:boolean;opinion:string}
 |{type:'confirm-project-archive';projectId:string;note:string};
export function applyCloseoutAction(state:BusinessState,action:CloseoutAction,actor:Actor){
 const material=action.type==='review-archive-file'?state.materials.find((m)=>m.id===action.id):undefined;const p=state.projects.find((p)=>p.id===(action.type==='review-archive-file'?material?.projectId:action.projectId));if(!p)throw new Error('项目或正式文件不存在');const pm=actor.role==='project-manager'&&actor.id===p.pmId;const pmo=actor.role==='pmo';const member=actor.role==='solution-tech'&&p.memberIds?.includes(actor.id);const market=actor.role==='market'&&state.opportunities.find((o)=>o.id===p.opportunityId)?.ownerId===actor.id;
 if(state.projectArchives[p.id])throw new Error('正式档案已确认，历史材料与后评价只读，不可覆盖');
 const final=state.settlements.find((s)=>s.projectId===p.id&&s.status==='已锁定已生效');if(!final)throw new Error('须先完成正式结算，再开展后评价及正式归档');
 const e=state.postEvaluations[p.id];const log=(record:PostEvaluation,event:string,note:string)=>record.history.push({date:AS_OF_DATE,actor:actor.name,action:event,note});
 if(action.type==='start-post-evaluation'){
   if(!pmo)throw new Error('后评价由PMO组织发起');if(e)throw new Error('已有后评价，请在原任务继续办理');const calc=selectFourCalculations(p,state);const baseline=state.baselines.find((b)=>b.projectId===p.id&&b.status==='已生效');const acceptance=state.acceptances.filter((a)=>a.projectId===p.id&&a.type==='客户终验'&&a.status==='已通过').sort((a,b)=>b.round-a.round)[0];
   const record:PostEvaluation={id:`EVAL-${p.id}`,projectId:p.id,status:'编制中',startedAt:AS_OF_DATE,startedBy:actor.name,snapshot:{settlementId:final.id,income:final.finalIncome,cost:final.finalCost,margin:final.finalGrossMargin,budget:calc.budget?.totalAmount??0,baselineId:baseline?.id??'',scope:baseline?.scopeDesc??'',plannedEnd:p.plannedEndDate,acceptanceDate:acceptance?.acceptanceDate??'',issues:state.issues.filter((r)=>r.projectId===p.id).map(({id,title,status})=>({id,title,status})),risks:state.risks.filter((r)=>r.projectId===p.id).map(({id,title,status})=>({id,title,status})),changes:state.changes.filter((r)=>r.projectId===p.id).map(({id,title,status})=>({id,title,status})),requirements:state.requirements.filter((r)=>r.projectId===p.id).length,bugs:state.bugs.filter((r)=>r.projectId===p.id).length},goals:Object.fromEntries(EVALUATION_GOALS.map((g)=>[g,{conclusion:'',note:''}])) as Record<EvaluationGoal,{conclusion:'';note:string}>,riskReview:'',changeReview:'',successes:'',lessons:'',improvements:'',staff:[],history:[]};log(record,p.phase==='已关闭'?'历史后评价补录':'发起后评价','引用正式结算、基线及项目原始业务快照；仅新增复盘记录，不回写冻结经营结果');state.postEvaluations[p.id]=record;
 }else if(action.type==='save-post-evaluation'){
   if(!e||e.status!=='编制中'||(!pm&&!pmo&&!member&&!market))throw new Error('仅项目参与角色可补充编制中的后评价');
   if(action.submit&&(EVALUATION_GOALS.some((g)=>!action.goals[g]?.conclusion||!action.goals[g].note.trim())||![action.riskReview,action.changeReview,action.successes,action.lessons,action.improvements].every((v)=>v.trim())))throw new Error('六类目标、风险变更复盘、成功经验、教训与改进建议均须完整');
   Object.assign(e,{goals:structuredClone(action.goals),riskReview:action.riskReview,changeReview:action.changeReview,successes:action.successes,lessons:action.lessons,improvements:action.improvements,status:action.submit?'待确认':'编制中'});log(e,action.submit?'提交后评价':'保存后评价草稿',action.improvements||'补充评价内容');
 }else if(action.type==='score-post-evaluation'){
   if(!e||e.status!=='编制中')throw new Error('人员评价仅在编制中办理');const person=evaluationPeople(state,p.id).find((u)=>u.id===action.userId);if(!person||(!pmo&&!(pm&&person.delivery)))throw new Error('PMO可评价真实项目角色；主PM仅评价其他交付成员，不可自评');if(!Number.isFinite(action.score)||action.score<1||action.score>5||!Number.isInteger(action.score)||!action.note.trim())throw new Error('评分须为1–5整数并填写项目表现依据');e.staff.push({userId:person.id,name:person.name,score:action.score,note:action.note,evaluatorId:actor.id,evaluator:actor.name,date:AS_OF_DATE});log(e,'人员评价',`${person.name} · ${action.score}分 · ${action.note}`);
 }else if(action.type==='confirm-post-evaluation'){
   if(!pmo||!e||e.status!=='待确认'||!action.opinion.trim())throw new Error('PMO填写意见后确认待审核后评价');if(action.approve&&evaluationPeople(state,p.id).some((person)=>!e.staff.some((s)=>s.userId===person.id)))throw new Error('须补齐实际关联的项目主办、项目经理及交付成员评价后确认');e.status=action.approve?'已完成':'编制中';if(action.approve){e.completedAt=AS_OF_DATE;e.completedBy=actor.name;}log(e,action.approve?'确认完成':'退回补充',action.opinion);
 }else if(action.type==='submit-archive-file'){
   if(!pm&&!pmo)throw new Error('仅主PM或PMO可提交归档补充文件');if(!action.note.trim()||!action.filename.trim()||!/\.(pdf|docx|xlsx|zip)$/i.test(action.filename))throw new Error('正式文件名（pdf/docx/xlsx/zip）与补档依据必填');const source=archiveSources(state,p.id).find((s)=>s.id===action.sourceId&&s.category===action.category);if(!source)throw new Error('必须绑定本项目对应分类的真实原记录或明确的历史补档容器');
   const prior=state.materials.find((m)=>m.projectId===p.id&&m.archiveCategory===action.category&&m.sourceId===action.sourceId);if(prior&&(prior.archived||prior.status==='待审核'))throw new Error('已归档或待审核文件不能覆盖');const m:Material=prior??{id:`ARCHIVE-MAT-${state.materials.length+1}`,projectId:p.id,name:`${action.category} · ${source.label}`,required:true,status:'缺失',archiveCategory:action.category,sourceId:action.sourceId,versions:[]};m.versions??=[];m.versions.push({version:m.versions.length+1,filename:action.filename,uploader:actor.name,uploadedAt:AS_OF_DATE,note:action.note,status:'待审核'});m.status='待审核';if(!prior)state.materials.push(m);
 }else if(action.type==='review-archive-file'){
   if(!pmo||!material||!material.archiveCategory||material.status!=='待审核'||!action.opinion.trim())throw new Error('PMO审核待处理的归档补充正式文件');const version=material.versions?.at(-1);if(!version)throw new Error('文件版本不存在');material.status=action.approve?'通过':'驳回';version.status=material.status;version.reviewer=actor.name;version.opinion=action.opinion;
 }else{
   if(!pmo||!action.note.trim())throw new Error('PMO确认完整档案并填写归档意见');const failed=archiveChecks(state,p.id).filter((c)=>!c.passed);if(failed.length)throw new Error(`归档缺件：${failed.map((c)=>c.category).join('、')}`);if(state.materials.some((m)=>m.projectId===p.id&&m.archiveCategory&&m.status!=='通过'))throw new Error('补档文件仍有未通过版本，须完成审核');
   const materials=state.materials.filter((m)=>m.projectId===p.id&&m.status==='通过'&&m.versions?.at(-1)?.status==='通过');state.projectArchives[p.id]={id:`ARCHIVE-${p.id}-V1`,projectId:p.id,version:1,confirmedAt:AS_OF_DATE,confirmedBy:actor.name,note:action.note,categories:[...ARCHIVE_CATEGORIES],sources:archiveSources(state,p.id),materials:materials.map((m)=>({id:m.id,name:m.name,category:archiveCategory(m)??'其他正式文件',sourceId:m.sourceId??m.id,filename:m.versions!.at(-1)!.filename,version:m.versions!.at(-1)!.version}))};materials.forEach((m)=>{m.archived=true;m.archivedAt=AS_OF_DATE;});
 }
 return p.id;
}
