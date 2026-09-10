import { expect, it } from 'vitest';
import { createBusinessState, transition } from '@/mock/business';
import { laborAvailability, type LaborAction } from '@/mock/labor';
import { selectFourCalculations } from '@/mock/selectors';
const pm={id:'U-001',name:'张建国',role:'project-manager' as const};
const tech={id:'U-005',name:'赵工',role:'solution-tech' as const};
const request:Extract<LaborAction,{type:'submit-labor'}>={type:'submit-labor',projectId:'P-001',taskId:'TSK-0001',date:'2026-09-09',hours:4,description:'联调与测试验证'};
it('成员、任务、有效日期、同日重复和跨项目累计工时执行硬校验',()=>{
 const original=createBusinessState(); expect(()=>transition(original,request,tech)).toThrow(/成员/);
 expect(()=>transition(original,{...request,taskId:'TSK-0002'},pm)).toThrow(/任务/);
 for(const date of ['2026-09-10','2026-02-30','2020-01-01'])expect(()=>transition(original,{...request,date},pm)).toThrow(/日期/);
 expect(()=>transition(original,{...request,hours:1.2},pm)).toThrow(/0.5/);
 let s=transition(original,request,pm);expect(()=>transition(s,request,pm)).toThrow(/重复/);
 const other=s.projects.find((p)=>p.id==='P-002')!; other.pmId=pm.id; other.phase='执行';
 const task=s.tasks.find((t)=>t.projectId===other.id)!;
 expect(()=>transition(s,{...request,projectId:other.id,taskId:task.id,hours:5},pm)).toThrow(/累计/);
 s=transition(s,{type:'review-labor',id:'LAB-1',approve:false,opinion:'请修正记录'},pm);
 expect(transition(s,request,pm).laborEntries).toHaveLength(2);expect(original.laborEntries).toHaveLength(0);
});
it('审核后按提交费率一次计成本，消耗承诺不重复增加滚动；审核权限和锁定有效',()=>{
 const before=createBusinessState(); before.projects[0].memberIds=['U-005'];
 let s=transition(before,request,tech); expect(s.laborEntries[0]).toMatchObject({hourlyYuan:180,amount:0.072,rateVersion:'RATE-TECH-V1'});
 expect(s.projects[0].actualCost).toBe(before.projects[0].actualCost);expect(s.costs).toHaveLength(before.costs.length);
 const approve={type:'review-labor' as const,id:'LAB-1',approve:true,opinion:'主PM核实完成'};
 expect(()=>transition(s,approve,tech)).toThrow(/主PM/);
 s=transition(s,approve,pm);expect(s.projects[0].actualCost).toBe(1650.072);expect(s.projects[0].committedCost).toBe(836.128);expect(s.projects[0].rollingCost).toBe(2986.2);
 expect(selectFourCalculations(s.projects[0],s).actual).toBe(s.projects[0].actualCost);
 expect(s.costs.filter((c)=>c.sourceId==='LAB-1')).toHaveLength(1);expect(()=>transition(s,approve,pm)).toThrow();
 const pending=transition(before,request,tech);pending.lockedProjects.push('P-001');expect(()=>transition(pending,approve,pm)).toThrow(/锁定/);
});
it('待审占用预算，阶段变化审批时重验，驳回释放且预算基线不变',()=>{
 let s=createBusinessState();const a=laborAvailability(s,'P-001');expect(a.releaseRate).toBe(75);
 s=transition(s,request,pm);expect(laborAvailability(s,'P-001').pending).toBe(0.06);
 const baseline=structuredClone(s.baselines);s.milestones.filter((m)=>m.projectId==='P-001').forEach((m)=>{m.status='未达成';});
 expect(()=>transition(s,{type:'review-labor',id:'LAB-1',approve:true,opinion:'不应通过'},pm)).toThrow(/释放/);
 s=transition(s,{type:'review-labor',id:'LAB-1',approve:false,opinion:'额度不足退回'},pm);expect(laborAvailability(s,'P-001').pending).toBe(0);expect(s.baselines).toEqual(baseline);
 expect(()=>transition(s,request,pm)).toThrow(/释放/);
});
