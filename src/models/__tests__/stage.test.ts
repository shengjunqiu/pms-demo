import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business';
import { stageChecks } from '@/mock/stage';
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
 const tasks=ready();tasks.tasks.find((t)=>t.projectId==='P-001')!.progress=50;expect(()=>transition(tasks,{type:'stage-gate',projectId:'P-001'},pmo)).toThrow(/任务/);
 const stale=transition(ready(),request,pm);stale.baselines.find((b)=>b.projectId==='P-001'&&b.status==='已生效')!.id='CHANGED';expect(()=>transition(stale,approve,pmo)).toThrow(/基线/);
});
