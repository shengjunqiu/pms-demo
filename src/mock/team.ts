import { AS_OF_DATE, mockUsers } from '@/mock';
import type { Actor, BusinessState } from './business';
import type { TeamResource } from '@/models/budget';
import { validPlanDate } from './budget';
import { assertConstructionWritable } from './construction-lock';
export type TeamAction={type:'save-team-member';projectId:string;member:TeamResource;reason:string}|{type:'exit-team-member';projectId:string;userId:string;date:string;reason:string}|{type:'nominate-pm';projectId:string;userId:string;reason:string}|{type:'respond-pm';projectId:string;accept:boolean;opinion:string};
export function applyTeamAction(state:BusinessState,action:TeamAction,actor:Actor){
 const p=state.projects.find(p=>p.id===action.projectId);if(!p)throw new Error('项目不存在');assertConstructionWritable(state,p.id);const team=state.projectTeams[p.id];if(!team)throw new Error('团队关系未初始化');
 if(state.planningDrafts[p.id]?.status==='评审中'||state.approvals.some(a=>a.projectId===p.id&&(a.status==='待审批'||a.kind==='budget'&&a.status==='通过'&&!a.baselineConfirmedAt)))throw new Error('评审或预算审批中，先完成当前流程再调整团队');
 if(action.type==='nominate-pm'){
  if(actor.role!=='pmo')throw new Error('仅PMO可任命主PM');if(!action.reason.trim())throw new Error('任命原因必填');const u=mockUsers.find(u=>u.id===action.userId);if(!u)throw new Error('候选人必须来自人才库');if(team.appointments.some(a=>a.status==='待接受'))throw new Error('已有待接受任命');team.appointments.push({id:`APPOINT-${p.id}-${team.appointments.length+1}`,userId:u.id,name:u.name,status:'待接受',nominatedAt:AS_OF_DATE,nominatedBy:actor.name,opinion:action.reason});
 }else if(action.type==='respond-pm'){
  const a=team.appointments.find(a=>a.status==='待接受');if(!a||a.userId!==actor.id)throw new Error('仅被任命本人可接受或拒绝');if(!action.opinion.trim())throw new Error('接受或拒绝说明必填');a.status=action.accept?'已接受':'已拒绝';a.opinion=action.opinion;a.respondedAt=AS_OF_DATE;
  if(action.accept){const old=p.pmId;p.pmId=a.userId;p.pmName=a.name;team.members.forEach(m=>{if(m.userId===old)m.role='交付成员';});let member=team.members.find(m=>m.userId===a.userId);if(!member){member={userId:a.userId,name:a.name,departmentId:mockUsers.find(u=>u.id===a.userId)!.departmentId,role:'项目经理',active:true,startDate:p.plannedStartDate,endDate:p.plannedEndDate,allocation:100,plannedHours:160,keyPosition:true};team.members.push(member);}member.active=true;member.role='项目经理';}
 }else{
  if(actor.role!=='project-manager'||actor.id!==p.pmId)throw new Error('仅项目主PM可维护团队');if(!action.reason.trim())throw new Error('人员变更原因必填');
  if(action.type==='save-team-member'){
   const m=action.member,u=mockUsers.find(u=>u.id===m.userId);if(!u||!m.role.trim())throw new Error('成员须来自人才库并设置项目角色');if(!validPlanDate(m.startDate)||!validPlanDate(m.endDate)||m.startDate>m.endDate||m.allocation<=0||m.allocation>100||!Number.isFinite(m.plannedHours)||m.plannedHours<=0)throw new Error('成员参与周期、比例与工时无效');if(m.userId!==p.pmId&&m.role==='项目经理')throw new Error('主PM须通过任命接受，不可直接添加');const existing=team.members.find(x=>x.userId===m.userId);const value={...structuredClone(m),name:u.name,departmentId:u.departmentId,active:true,role:m.userId===p.pmId?'项目经理':m.role};if(existing)Object.assign(existing,value);else team.members.push(value);
  }else{const member=team.members.find(m=>m.userId===action.userId&&m.active);if(!member||member.userId===p.pmId)throw new Error('主PM不可直接退出，请先任命接任人');if(!validPlanDate(action.date)||action.date>AS_OF_DATE||action.date<member.startDate)throw new Error('退出日期须在参与日至基准日之间');member.active=false;member.endDate=action.date;}
 }
 p.memberIds=team.members.filter(m=>m.active).map(m=>m.userId);const draft=state.planningDrafts[p.id];
 // Keep historical tasks, costs and submitted review snapshots untouched.
 if(draft&&draft.status!=='已冻结'){draft.resources=structuredClone(team.members);if(draft.status==='已通过')draft.status='草稿';draft.revision++;}
 team.history.push({date:AS_OF_DATE,actor:actor.name,description:`${action.type} · ${'reason'in action?action.reason:action.opinion}`});return p.id;
}
