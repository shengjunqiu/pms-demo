import type { BusinessState } from '@/mock/business';
import { AS_OF_DATE } from '@/mock';
export const STAGE_RULE = { version: 'STAGE-1', targetPhase: '收尾' as const, targetSubPhase: '客户终验' as const, releasePercent: 90 };
export function stageChecks(state: BusinessState, projectId: string) {
 const p=state.projects.find((p)=>p.id===projectId)!;
 const milestone=state.milestones.find((m)=>m.projectId===projectId&&m.type==='开发完成');
 const materials=state.materials.filter((m)=>m.projectId===projectId&&m.required);
 const issues=state.issues.filter((i)=>i.projectId===projectId&&i.severity==='重大'&&i.status!=='已关闭');
 const risks=state.risks.filter((r)=>r.projectId===projectId&&['重大','特大'].includes(r.level)&&r.status==='监控中');
 const quality=state.qualityPlans[projectId];
 return [
  {key:'phase',name:'顺序与锁定',passed:p.phase==='执行'&&!state.lockedProjects.includes(p.id)&&!['已终止','已关闭'].includes(p.status),detail:`${p.phase}/${p.subPhase} → 收尾/客户终验`},
  {key:'milestone',name:'开发完成里程碑',passed:milestone?.status==='已达成'&&!!milestone.actualDate&&milestone.actualDate<=AS_OF_DATE,detail:`计划${milestone?.plannedDate??'未提供'} / 实际${milestone?.actualDate??'未达成'}`},
  {key:'progress',name:'执行任务完成',passed:p.progressRate===100&&state.tasks.filter((t)=>t.projectId===p.id).every((t)=>t.progress===100),detail:`WBS整体${p.progressRate}%，未完成${state.tasks.filter((t)=>t.projectId===p.id&&t.progress<100).length}项`},
  {key:'materials',name:'必交材料审核',passed:materials.length>0&&materials.every((m)=>m.status==='通过'),detail:materials.map((m)=>`${m.name}：${m.status}`).join('；')||'无必交目录'},
  {key:'quality',name:'质量与重大异常',passed:(!quality?.checks.length||quality.checks.at(-1)!.passed)&&issues.length===0&&risks.length===0,detail:`未关闭重大问题${issues.length}项，重大监控风险${risks.length}项；质量${quality?.checks.length?(quality.checks.at(-1)!.passed?'通过':'未通过'):'未登记新检查，材料审核独立校验'}`},
 ];
}
export function stageSnapshot(state:BusinessState,projectId:string) {
 const p=state.projects.find((p)=>p.id===projectId)!; const milestone=state.milestones.find((m)=>m.projectId===p.id&&m.type==='开发完成');
 return {rule:STAGE_RULE.version,fromPhase:p.phase,fromSubPhase:p.subPhase,targetPhase:STAGE_RULE.targetPhase,targetSubPhase:STAGE_RULE.targetSubPhase,milestoneId:milestone?.id,plannedDate:milestone?.plannedDate,actualDate:milestone?.actualDate,releasePercent:STAGE_RULE.releasePercent,checks:stageChecks(state,p.id)};
}
export type StageSnapshot=ReturnType<typeof stageSnapshot>;
