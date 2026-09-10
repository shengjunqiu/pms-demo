import {useParams} from 'react-router-dom';
import {useBusinessStore} from '@/mock/business';
import {planningSnapshot} from '@/mock/budget';
import {useAppStore} from '@/store/useAppStore';
import {visibleProjects} from '@/mock/selectors';
export function usePlanning() {
 const {id}=useParams();const {data,dispatch}=useBusinessStore();const {currentRole,currentUser}=useAppStore();
 const project=data.projects.find(p=>p.id===id);const draft=id?data.planningDrafts[id]:undefined;
 const allowed=!!project&&visibleProjects(currentRole, data.projects, data).some(p=>p.id===id);
 const frozen=!draft||draft.status==='已冻结'||data.baselines.some(b=>b.projectId===id&&b.status==='已生效');
 return {id,data,dispatch,project,draft,allowed,frozen,plan:project?planningSnapshot(data,project.id):undefined,actor:{id:currentUser.id,name:currentUser.name,role:currentRole},canEdit:!frozen&&!data.approvals.some(a=>a.projectId===id&&(a.status==='待审批'||a.kind==='budget'&&a.status==='通过'&&!a.baselineConfirmedAt))&&draft?.status!=='评审中'&&currentRole==='project-manager'&&currentUser.id===project?.pmId};
}
