import { AS_OF_DATE, mockTimesheets, mockExpenses } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import type { SettlementRequest, SettlementSnapshot, SettlementAnalysis } from '@/models/settlement';
import { selectFourCalculations } from '@/mock/selectors';
import { mockCostSnapshots } from '@/mock/cost-history';
import { assertConstructionWritable } from '@/mock/construction-lock';
import { hourlyRate } from '@/mock/labor';
import { money, percentage, sumMoney } from '@/utils/money';

export function pendingSettlementSources(state: BusinessState, projectId: string) {
  const resolved=new Set(state.settlementCostReviews.filter((r)=>r.projectId===projectId).map((r)=>r.sourceId));
  return [
    ...mockTimesheets.filter((t)=>t.projectId===projectId&&t.status==='待审核').map((t)=>({id:t.id,name:`历史工时 · ${t.userName} · ${t.date} · ${t.hours}小时`,amount:money(t.hours*hourlyRate(t.userId)/10000),kind:'labor' as const,imported:true,path:'labor-cost'})),
    ...mockExpenses.filter((e)=>e.projectId===projectId&&e.status==='待审批').map((e)=>({id:e.id,name:`历史费用 · ${e.code} · ${e.category}`,amount:e.amount,kind:'expense' as const,imported:true,path:'expenses'})),
    ...state.laborEntries.filter((e)=>e.projectId===projectId&&e.status==='待审核').map((e)=>({id:e.id,name:`待审核工时 · ${e.userName}`,amount:e.amount,kind:'labor' as const,imported:false,path:'labor-cost'})),
    ...state.costOrders.filter((o)=>o.projectId===projectId&&!['已入账','驳回'].includes(o.status)).map((o)=>({id:o.id,name:`${o.title} · ${o.status}`,amount:o.amount,kind:o.kind,imported:false,path:o.kind==='procurement'?'procurement':o.kind==='outsource'?'outsourcing':'expenses'})),
  ].filter((s)=>!resolved.has(s.id));
}
export function settlementChecks(state: BusinessState, projectId:string, excludeRequestId?:string) {
  const p=state.projects.find((p)=>p.id===projectId)!;
  const acceptance=state.acceptances.filter((a)=>a.projectId===projectId&&a.type==='客户终验').sort((a,b)=>b.round-a.round)[0];
  const pending=pendingSettlementSources(state,projectId);
  return [
    {name:'最终客户验收确认',passed:acceptance?.status==='已通过'&&!!state.acceptanceDetails[acceptance.id]?.confirmedAt,detail:acceptance?`${acceptance.id} · ${state.acceptanceDetails[acceptance.id]?.confirmedAt?'PMO已确认':acceptance.status+'，须PMO确认'}`:'尚无客户验收',path:'customer-acceptance'},
    {name:'建设成本已全部明确',passed:p.committedCost===0&&p.forecastRemainingCost===0&&!pending.length,detail:`未发生承诺 ${p.committedCost} 万元，剩余预测 ${p.forecastRemainingCost} 万元，未决原单 ${pending.length} 项`,path:'settlement/apply'},
    {name:'无重复正式结算',passed:!state.lockedProjects.includes(projectId)&&!state.settlements.some((s)=>s.projectId===projectId&&s.status==='已锁定已生效')&&!state.settlementRequests.some((r)=>!r.supersededBy&&r.id!==excludeRequestId&&r.projectId===projectId&&['财务核算','PMO审核','结算评审','待最终锁定','材料整改'].includes(r.status)),detail:state.lockedProjects.includes(projectId)?'已有冻结结算结果':'单项目一次正式结算，历史草稿不算正式结算',path:'settlement'},
    {name:'重大事项与变更',passed:!state.managementApprovals.some((a)=>a.projectId===projectId&&a.status==='待审批')&&!state.issues.some((i)=>i.projectId===projectId&&i.severity==='重大'&&i.status!=='已关闭')&&!state.changes.some((c)=>c.projectId===projectId&&['PMO审批中','PMC审议中'].includes(c.status))&&!state.approvals.some((a)=>a.projectId===projectId&&a.status==='待审批')&&!state.planRequests.some((r)=>r.projectId===projectId&&r.status==='待审批'),detail:'重大问题须最终关闭，管理决策、变更、预算及计划审批须完成',path:'dynamic-accounting'},
  ];
}
export function settlementSnapshot(state:BusinessState, projectId:string):SettlementSnapshot {
  const p=state.projects.find((p)=>p.id===projectId)!;const c=selectFourCalculations(p,state);const acceptance=state.acceptances.filter((a)=>a.projectId===p.id&&a.type==='客户终验').sort((a,b)=>b.round-a.round)[0];
  const contracts=state.contracts.filter((c)=>c.projectId===p.id&&c.status!=='已终止');const receiptPlans=state.receiptPlans.filter((r)=>r.projectId===p.id);const saved=state.settlementForecastSnapshots[p.id];const last=mockCostSnapshots.filter((s)=>s.projectId===p.id).at(-1);
  return structuredClone({capturedAt:AS_OF_DATE,acceptanceId:acceptance?.id??'',confirmedAt:acceptance?state.acceptanceDetails[acceptance.id]?.confirmedAt??'':'',estimateId:c.estimate?.id??'',estimateVersion:c.estimate?.version??'',budgetId:c.budget?.id??'',budgetVersion:c.budget?.version??'',baselineId:state.baselines.find((b)=>b.projectId===p.id&&b.status==='已生效')?.id??'',income:sumMoney(contracts.map((c)=>c.amount)),cost:c.actual,receipts:sumMoney(receiptPlans.map((r)=>r.paidAmount)),receivable:sumMoney(receiptPlans.map((r)=>r.amount-r.paidAmount)),overdue:sumMoney(receiptPlans.filter((r)=>r.dueDate<=AS_OF_DATE).map((r)=>r.amount-r.paidAmount)),lastRolling:saved?.total??last?.rolling??c.rolling,lastRollingDate:saved?.date??last?.date??AS_OF_DATE,subjects:c.subjects.map((s)=>({subjectId:s.subjectId,subjectName:s.subjectName,estimate:s.estimate,budget:s.budget,actual:s.actual,rolling:saved?.subjects[s.subjectId]??s.rolling})),contracts:contracts.map((c)=>({id:c.id,code:c.code,amount:c.amount,status:c.status})),receiptPlans:receiptPlans.map((r)=>({id:r.id,contractId:r.contractId,amount:r.amount,paidAmount:r.paidAmount,dueDate:r.dueDate})),costs:c.costs.map((c)=>({id:c.id,sourceId:c.sourceId,type:c.type,subjectId:c.subjectId,subjectName:c.subjectName,amount:c.amount,description:c.description})),changes:state.changes.filter((c)=>c.projectId===p.id).map((c)=>({id:c.id,title:c.title,status:c.status,costImpact:c.costImpact}))});
}
export type SettlementAction =
 | {type:'save-settlement';projectId:string;id?:string;note:string;files:string[];submit:boolean}
 | {type:'review-settlement';id:string;operation:'finance-confirm'|'pmo-audit'|'review-pass'|'material-return'|'amount-return'|'lock';opinion:string;invoicedAmount?:number;taxAmount?:number}
 | {type:'resolve-settlement-source';projectId:string;sourceId:string;disposition:'已有凭证'|'取消不发生';ledgerId?:string;evidence:string}
 | {type:'dispose-settlement-balance';projectId:string;subjectId:string;bucket:'承诺'|'预测';disposition:'实际发生'|'取消不发生';amount:number;evidence:string}
 | {type:'save-settlement-analysis';projectId:string;rows:SettlementAnalysis[]};
export function applySettlementAction(state:BusinessState,action:SettlementAction,actor:Actor){
  const request=action.type==='review-settlement'?state.settlementRequests.find((r)=>r.id===action.id):undefined;const projectId=action.type==='review-settlement'?request?.projectId:action.projectId;const p=state.projects.find((p)=>p.id===projectId);if(!p)throw new Error('项目或结算申请不存在');
  const pm=actor.role==='project-manager'&&actor.id===p.pmId;const finance=actor.role==='finance';const pmo=actor.role==='pmo';
  const recalc=()=>{p.rollingCost=sumMoney([p.actualCost,p.committedCost,p.forecastRemainingCost]);p.costVariance=money(p.rollingCost-p.budgetAmount);p.costVarianceRate=percentage(p.costVariance,p.budgetAmount)??0;};
  if(action.type==='resolve-settlement-source'){
    assertConstructionWritable(state,p.id);if(!finance||!action.evidence.trim())throw new Error('财务须核对原单并提供取消或已入账凭证依据');
    const source=pendingSettlementSources(state,p.id).find((s)=>s.id===action.sourceId);if(!source||!source.imported)throw new Error('只允许核对历史导入未决单；动态原单须走其审核入账流程');
    if(action.disposition==='已有凭证'){const ledger=state.costs.find((c)=>c.id===action.ledgerId&&c.projectId===p.id&&c.type===source.kind);if(!ledger||ledger.amount!==source.amount||!ledger.sourceId)throw new Error('已有凭证必须属于本项目同类成本、金额完全一致且有唯一来源');if(state.settlementCostReviews.some((r)=>r.ledgerId===ledger.id))throw new Error('同一已入账凭证不能重复抵充未决原单');}
    state.settlementCostReviews.push({id:`SCOST-${state.settlementCostReviews.length+1}`,projectId:p.id,sourceId:source.id,disposition:action.disposition,ledgerId:action.disposition==='已有凭证'?action.ledgerId:undefined,amount:source.amount,evidence:action.evidence,actor:actor.name,date:AS_OF_DATE});
  }else if(action.type==='dispose-settlement-balance'){
    assertConstructionWritable(state,p.id);if(!finance||!action.evidence.trim())throw new Error('财务填写实际发生或取消依据后逐科目办理');
    const calc=selectFourCalculations(p,state);const subject=calc.subjects.find((s)=>s.subjectId===action.subjectId);if(!subject||!Number.isFinite(action.amount)||action.amount<=0||money(action.amount)!==action.amount)throw new Error('请选择有效科目与精确金额');
    if(state.costOrders.some((o)=>o.projectId===p.id&&o.subjectId===action.subjectId&&!['已入账','驳回'].includes(o.status))||action.subjectId==='SUB-01'&&state.laborEntries.some((e)=>e.projectId===p.id&&e.status==='待审核'))throw new Error('此科目仍有动态未决原单，请先走原单审核和入账，不可重复处置');
    state.settlementForecastSnapshots[p.id]??={date:AS_OF_DATE,total:calc.rolling,subjects:Object.fromEntries(calc.subjects.map((s)=>[s.subjectId,s.rolling]))};
    p.commitmentBySubject??=Object.fromEntries(calc.subjects.map((s)=>[s.subjectId,s.committed]));p.forecastBySubject??=Object.fromEntries(calc.subjects.map((s)=>[s.subjectId,s.remaining]));
    const bucket=action.bucket==='承诺'?p.commitmentBySubject:p.forecastBySubject;if(action.amount>(bucket[action.subjectId]??0))throw new Error('处置金额超过科目未决余额');
    bucket[action.subjectId]=money(bucket[action.subjectId]-action.amount);let ledgerId:string|undefined;
    const sourceId=`DISPOSE-${state.settlementCostDispositions.length+1}`;
    if(action.disposition==='实际发生'){ledgerId=`LEDGER-${sourceId}`;state.costs.push({id:ledgerId,projectId:p.id,type:action.subjectId==='SUB-01'?'labor':action.subjectId==='SUB-02'?'outsource':action.subjectId==='SUB-03'?'procurement':'expense',subjectId:subject.subjectId,subjectName:subject.subjectName,amount:action.amount,occurredDate:AS_OF_DATE,sourceId,description:action.evidence});p.actualCost=money(p.actualCost+action.amount);}
    p.committedCost=sumMoney(Object.values(p.commitmentBySubject));p.forecastRemainingCost=sumMoney(Object.values(p.forecastBySubject));recalc();state.settlementCostDispositions.push({id:sourceId,projectId:p.id,subjectId:action.subjectId,bucket:action.bucket,disposition:action.disposition,amount:action.amount,evidence:action.evidence,ledgerId,date:AS_OF_DATE,actor:actor.name});
  }else if(action.type==='save-settlement'){
    if(!pm&&actor.role!=='market')throw new Error('仅主PM或项目主办部门可编制结算');if(state.lockedProjects.includes(p.id))throw new Error('已正式结算，不可覆盖历史');
    const old=state.settlementRequests.find((r)=>r.id===action.id);if(action.id&&(!old||old.supersededBy||old.projectId!==p.id||!['草稿','材料整改','金额退回'].includes(old.status)))throw new Error('只有草稿或退回申请可补充');
    if(!action.note.trim())throw new Error('结算经营结论及偏差说明必填');
    const snapshot=old?.status==='材料整改'?structuredClone(old.snapshot):settlementSnapshot(state,p.id);
    if(action.submit){const failed=settlementChecks(state,p.id,old?.id).filter((c)=>!c.passed);if(failed.length)throw new Error(failed.map((c)=>c.name).join('、'));if(!snapshot.estimateId||!snapshot.budgetId||!snapshot.baselineId||!snapshot.contracts.length)throw new Error('冻结概算、生效预算基线与有效合同必备');if(!action.files.length||action.files.some((f)=>!/\.(pdf|docx|xlsx|zip)$/i.test(f)))throw new Error('结算报告及附件文件名必填且格式有效');}
    const reuse=old?.status==='草稿';const id=reuse?old.id:`SREQ-${state.settlementRequests.length+1}`;const version=reuse?old.version:Math.max(0,...state.settlementRequests.filter((r)=>r.projectId===p.id).map((r)=>r.version))+1;
    const next:SettlementRequest={id,projectId:p.id,version,previousId:reuse?old.previousId:old?.id,status:action.submit?'财务核算':'草稿',note:action.note,files:[...action.files],submittedBy:actor.name,snapshot,history:[...(reuse?old.history:[]),{actor:actor.name,date:AS_OF_DATE,action:action.submit?'提交结算':'保存草稿',opinion:action.note}]};
    if(old&&old.status==='材料整改'&&!action.submit)throw new Error('材料整改须补充后重新提交，原快照继续冻结');
    if(reuse)Object.assign(old,next);else {state.settlementRequests.push(next);if(old)old.supersededBy=next.id;}
    if(action.submit){state.constructionFreezes[p.id]={requestId:id,reason:'结算核算及评审中，建设成本暂停发生；材料整改仍保持冻结'};p.subPhase='项目结算';}
  }else if(action.type==='review-settlement'){
    if(!request||request.supersededBy||!action.opinion.trim())throw new Error('原结算申请与办理意见必填');if(['草稿','材料整改','金额退回','已锁定'].includes(request.status))throw new Error('当前结算版本不在审核中');
    if(action.operation==='amount-return'){if(!finance)throw new Error('只有财务可明确退回金额调整并解除临时冻结');request.status='金额退回';if(state.constructionFreezes[p.id]?.requestId===request.id)delete state.constructionFreezes[p.id];}
    else if(action.operation==='material-return'){if(!finance&&!pmo)throw new Error('仅财务或PMO可退回材料');request.status='材料整改';}
    else if(action.operation==='finance-confirm'){
      if(!finance||request.status!=='财务核算')throw new Error('当前步骤由财务核算确认');if(!Number.isFinite(action.invoicedAmount)||action.invoicedAmount!<0||action.invoicedAmount!>request.snapshot.income||!Number.isFinite(action.taxAmount)||action.taxAmount!<0||action.taxAmount!>request.snapshot.income)throw new Error('财务确认开票及税费须为有效金额且不超过收入');request.finance={actor:actor.name,date:AS_OF_DATE,invoicedAmount:action.invoicedAmount!,taxAmount:action.taxAmount!,opinion:action.opinion};request.status='PMO审核';
    }else if(action.operation==='pmo-audit'){if(!pmo||request.status!=='PMO审核')throw new Error('当前步骤由PMO进行材料与过程审核');request.status='结算评审';}
    else if(action.operation==='review-pass'){if(!pmo||request.status!=='结算评审')throw new Error('当前步骤由PMO组织结算评审');request.status='待最终锁定';}
    else{
      if(!finance||request.status!=='待最终锁定'||!request.finance)throw new Error('财务在结算评审通过后最终锁定');const failed=settlementChecks(state,p.id,request.id).filter((c)=>!c.passed&&c.name!=='无重复正式结算');if(failed.length)throw new Error(`锁定前条件已变化：${failed.map((c)=>c.name).join('、')}`);if(state.lockedProjects.includes(p.id)||state.settlements.some((s)=>s.projectId===p.id&&s.status==='已锁定已生效'))throw new Error('禁止重复正式结算');
      const now=settlementSnapshot(state,p.id);if(JSON.stringify(now.costs)!==JSON.stringify(request.snapshot.costs)||now.income!==request.snapshot.income||now.budgetId!==request.snapshot.budgetId||now.estimateId!==request.snapshot.estimateId)throw new Error('结算引用金额或版本变化，须财务退回重新申报');
      const margin=money(request.snapshot.income-request.snapshot.cost);state.settlements.push({id:`SET-${request.id}`,projectId:p.id,finalIncome:request.snapshot.income,finalCost:request.snapshot.cost,finalGrossMargin:margin,finalGrossMarginRate:percentage(margin,request.snapshot.income)??0,status:'已锁定已生效',isCostLocked:true,settledDate:AS_OF_DATE});state.lockedProjects.push(p.id);delete state.constructionFreezes[p.id];request.status='已锁定';p.status='已结算';p.phase='收尾';p.subPhase='项目结算';
    }
    request.history.push({actor:actor.name,date:AS_OF_DATE,action:action.operation,opinion:action.opinion});
  }else{
    if(!pm&&!pmo&&!finance)throw new Error('仅主PM、PMO或财务可维护差异归因');const calc=selectFourCalculations(p,state);const significant=calc.subjects.filter((s)=>Math.abs(s.actual-s.budget)>=100||(s.budget>0&&Math.abs(s.actual-s.budget)/s.budget>=.1));
    if(significant.some((s)=>!action.rows.some((r)=>r.subjectId===s.subjectId&&r.category.trim()&&r.phase.trim()&&r.note.trim())))throw new Error('演示规则：差异≥100万元或≥10%的科目必须完整填写原因与责任阶段');
    if(action.rows.some((r)=>!calc.subjects.some((s)=>s.subjectId===r.subjectId)||(r.changeId&&!state.changes.some((c)=>c.id===r.changeId&&c.projectId===p.id))))throw new Error('科目或关联变更不属于当前项目');state.settlementAnalyses[p.id]=structuredClone(action.rows);
  }
  return p.id;
}
