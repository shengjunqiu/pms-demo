import { selectGradingRule } from '@/mock/configuration';
import type { BusinessState } from '@/mock/business';
import { AS_OF_DATE } from '@/mock';
import type { Milestone, Project } from '@/models/types';
export const STAGE_RULE = { version: 'STAGE-1', targetPhase: '收尾' as const, targetSubPhase: '客户终验' as const, releasePercent: 90 };
/** 阶段门禁目标参数：缺省沿用 STAGE_RULE 的 收尾/客户终验 口径，既有调用与测试无需改动即保持原行为。 */
export type StageGateTargetPhase = Extract<Project['phase'], '收尾' | '运维' | '已关闭'>;
export interface StageGateTarget { targetPhase?: StageGateTargetPhase; targetSubPhase?: string }
export function resolveStageTarget(target?: StageGateTarget) {
  return { targetPhase: target?.targetPhase ?? STAGE_RULE.targetPhase, targetSubPhase: target?.targetSubPhase ?? STAGE_RULE.targetSubPhase };
}
/** 按目标阶段装配检查项：门禁来源阶段与对应里程碑类型随目标变化。 */
const SOURCE_PHASE_BY_TARGET: Record<StageGateTargetPhase, Project['phase']> = { '收尾': '执行', '运维': '收尾', '已关闭': '运维' };
const MILESTONE_BY_TARGET: Record<StageGateTargetPhase, Milestone['type']> = { '收尾': '开发完成', '运维': '客户终验', '已关闭': '项目结算' };
export function stageChecks(state: BusinessState, projectId: string, target?: StageGateTarget) {
 const t=resolveStageTarget(target);
 const p=state.projects.find((p)=>p.id===projectId)!;
 const milestone=state.milestones.find((m)=>m.projectId===projectId&&m.type===MILESTONE_BY_TARGET[t.targetPhase]);
 const materials=state.materials.filter((m)=>m.projectId===projectId&&m.required);
 const issues=state.issues.filter((i)=>i.projectId===projectId&&i.severity==='重大'&&i.status!=='已关闭');
 const risks=state.risks.filter((r)=>r.projectId===projectId&&['重大','特大'].includes(r.level)&&r.status==='监控中');
 const quality=state.qualityPlans[projectId];
 return [
  {key:'phase',name:'顺序与锁定',passed:p.phase===SOURCE_PHASE_BY_TARGET[t.targetPhase]&&!state.lockedProjects.includes(p.id)&&!['已终止','已关闭'].includes(p.status),detail:`${p.phase}/${p.subPhase} → ${t.targetPhase}/${t.targetSubPhase}`},
  {key:'milestone',name:`${MILESTONE_BY_TARGET[t.targetPhase]}里程碑`,passed:milestone?.status==='已达成'&&!!milestone.actualDate&&milestone.actualDate<=AS_OF_DATE,detail:`计划${milestone?.plannedDate??'未提供'} / 实际${milestone?.actualDate??'未达成'}`},
  {key:'progress',name:'执行任务完成',passed:p.progressRate===100&&state.tasks.filter((t)=>t.projectId===p.id).every((t)=>t.progress===100),detail:`WBS整体${p.progressRate}%，未完成${state.tasks.filter((t)=>t.projectId===p.id&&t.progress<100).length}项`},
  {key:'materials',name:'必交材料审核',passed:materials.length>0&&materials.every((m)=>m.status==='通过'),detail:materials.map((m)=>`${m.name}：${m.status}`).join('；')||'无必交目录'},
  {key:'quality',name:'质量与重大异常',passed:(!quality?.checks.length||quality.checks.at(-1)!.passed)&&issues.length===0&&risks.length===0,detail:`未关闭重大问题${issues.length}项，重大监控风险${risks.length}项；质量${quality?.checks.length?(quality.checks.at(-1)!.passed?'通过':'未通过'):'未登记新检查，材料审核独立校验'}`},
 ];
}
export function stageSnapshot(state:BusinessState,projectId:string,submitted?:{rule:string;releasePercent:number},target?:StageGateTarget) {
 const t=resolveStageTarget(target); const p=state.projects.find((p)=>p.id===projectId)!; const milestone=state.milestones.find((m)=>m.projectId===p.id&&m.type===MILESTONE_BY_TARGET[t.targetPhase]);
 const grading=submitted?{id:submitted.rule,stageReleasePercent:submitted.releasePercent}:selectGradingRule(state,p.departmentId,p.type);
 return {rule:submitted?.rule??grading.id,fromPhase:p.phase,fromSubPhase:p.subPhase,targetPhase:t.targetPhase,targetSubPhase:t.targetSubPhase,milestoneId:milestone?.id,plannedDate:milestone?.plannedDate,actualDate:milestone?.actualDate,releasePercent:submitted?.releasePercent??grading.stageReleasePercent,checks:stageChecks(state,p.id,target)};
}
export type StageSnapshot=ReturnType<typeof stageSnapshot>;
