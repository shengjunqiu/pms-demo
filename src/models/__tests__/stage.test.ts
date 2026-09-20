import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business-domain';
import { stageChecks, stageSnapshot } from '@/mock/stage';
import { laborAvailability } from '@/mock/labor';
const pm={id:'U-001',name:'张建国',role:'project-manager' as const};
const pmo={id:'U-002',name:'李主任',role:'pmo' as const};
const request={type:'request-plan' as const,projectId:'P-001',kind:'stage' as const,shiftDays:0,reason:'完成执行交付，申请进入客户终验准备'};
const approve={type:'review-plan' as const,id:'PLAN-1',approve:true,opinion:'PMO核验全部阶段条件'};
function ready(){const s=createBusinessState();s.projects[0].progressRate=100;s.tasks.filter((t)=>t.projectId==='P-001').forEach((t)=>{t.progress=100;});s.materials.filter((m)=>m.projectId==='P-001').forEach((m)=>{m.status='通过';});return s;}
it('阶段申请保留提交校验快照，PMO批准才前进并释放预算，原基线和客户验收不改',()=>{
 const before=ready();let s=transition(before,request,pm);expect(s.planRequests[0].stageSnapshot?.fromPhase).toBe('执行');
 expect(()=>transition(s,approve,pm)).toThrow(/无权/);
 s=transition(s,approve,pmo);expect(s.projects[0]).toMatchObject({phase:'收尾',subPhase:'客户终验',releasedBudgetPercent:90});
 expect(s.planRequests[0].approvalSnapshot?.checks.every((c)=>c.passed)).toBe(true);expect(laborAvailability(s,'P-001').releaseRate).toBe(90);
 expect(s.baselines).toEqual(before.baselines);expect(s.budgets).toEqual(before.budgets);expect(s.acceptances).toEqual(before.acceptances);
 expect(()=>transition(s,approve,pmo)).toThrow();expect(()=>transition(s,request,pm)).toThrow(/执行/);
});
it('实际时间、重大风险、任务与材料在审批时重验，失败原子回滚且可驳回保留原阶段',()=>{
 const before=ready();let s=transition(before,request,pm);const milestone=s.milestones.find((m)=>m.projectId==='P-001'&&m.type==='开发完成')!;milestone.actualDate=undefined;
 expect(()=>transition(s,approve,pmo)).toThrow(/实际/);expect(s.planRequests[0].reviews).toHaveLength(0);
 s=transition(s,{...approve,approve:false,opinion:'实际时间缺失，退回补齐'},pmo);expect(s.projects[0].phase).toBe('执行');expect(s.planRequests[0].status).toBe('驳回');
 const bad=ready();bad.risks.find((r)=>r.projectId==='P-001')!.level='重大';expect(stageChecks(bad,'P-001').find((c)=>c.key==='quality')?.passed).toBe(false);
 const tasks=ready();tasks.tasks.find((t)=>t.projectId==='P-001')!.progress=50;expect(()=>transition(tasks,{type:'stage-gate',projectId:'P-001'},pmo)).toThrow('阶段门禁必须通过阶段变更审批流程调用，不允许直接切换');
 const stale=transition(ready(),request,pm);stale.baselines.find((b)=>b.projectId==='P-001'&&b.status==='已生效')!.id='CHANGED';expect(()=>transition(stale,approve,pmo)).toThrow(/基线/);
});
it('门禁目标参数化：缺省口径与既有行为一致（向后兼容）',()=>{
 const s=ready();
 expect(stageChecks(s,'P-001')).toEqual(stageChecks(s,'P-001',{}));
 expect(stageChecks(s,'P-001',{targetPhase:'收尾',targetSubPhase:'客户终验'})).toEqual(stageChecks(s,'P-001'));
 const snap=stageSnapshot(s,'P-001');
 expect(snap.targetPhase).toBe('收尾');expect(snap.targetSubPhase).toBe('客户终验');
 expect(snap.checks).toEqual(stageChecks(s,'P-001'));
 expect(stageChecks(s,'P-001').find((c)=>c.key==='phase')?.detail).toBe(`${s.projects[0].phase}/${s.projects[0].subPhase} → 收尾/客户终验`);
});
it('门禁目标参数化：按目标阶段装配来源阶段与里程碑检查项',()=>{
 const s=ready();
 const ops=stageChecks(s,'P-001',{targetPhase:'运维',targetSubPhase:'运维交接'});
 expect(ops.find((c)=>c.key==='phase')).toMatchObject({passed:false});
 expect(ops.find((c)=>c.key==='phase')?.detail).toContain('→ 运维/运维交接');
 expect(ops.find((c)=>c.key==='milestone')?.name).toBe('客户终验里程碑');
 expect(ops.find((c)=>c.key==='milestone')?.passed).toBe(false);
 const snap=stageSnapshot(s,'P-001',undefined,{targetPhase:'运维',targetSubPhase:'运维交接'});
 expect(snap.targetPhase).toBe('运维');expect(snap.targetSubPhase).toBe('运维交接');
 expect(snap.checks).toEqual(ops);
});
