import { canAccessTargetScope, canAccessOpportunityScope, canAccessOrganization } from './access-scope';
import type { Actor, BusinessAction, BusinessState } from '@/mock/business';
import { canAccessAction, canAccessProject } from '@/mock/configuration-access';

export function actionTarget(action: BusinessAction): string {
  if ('operationId' in action && action.operationId) return action.operationId;
  if ('requestId' in action && action.requestId) return action.requestId;
  if ('id' in action && action.id) return action.id;
  if ('approvalId' in action) return action.approvalId;
  if ('projectId' in action) return action.projectId;
  if ('opportunityId' in action && typeof action.opportunityId === 'string') return action.opportunityId;
  if ('draft' in action && 'projectId' in action.draft) return action.draft.projectId;
  if ('cost' in action) return action.cost.projectId;
  if ('report' in action) return action.report.projectId;
  return action.type;
}

export function projectForTarget(state: BusinessState, id: string) {
  const direct = state.projects.find((p) => p.id === id);
  if (direct) return direct;
  const record = Object.values(state).flatMap((bucket) => Array.isArray(bucket) ? bucket : []).find((r): r is { id: string; projectId: string } => !!r && typeof r === 'object' && 'id' in r && r.id === id && 'projectId' in r && typeof r.projectId === 'string');
  return state.projects.find((p) => p.id === record?.projectId);
}

/** Applies configurable restrictions at the shared UI mutation boundary; domain handlers retain their own role and state checks. */
export function assertActionAccess(state: BusinessState, action: BusinessAction, actor: Actor) {
  const target = actionTarget(action);
  if (!canAccessAction(state, actor, action.type, target)) throw new Error('当前访问策略不允许办理此业务动作');
  if (!canAccessTargetScope(state, actor, target)) throw new Error('当前访问策略不允许访问该业务对象');
  if ('input' in action && 'opportunityId' in action.input) {
    const sourceId = action.input.opportunityId;
    const opportunity = state.opportunities.find((o) => o.id === sourceId);
    if (opportunity && !canAccessOpportunityScope(state, actor, opportunity)) throw new Error('当前访问策略不允许访问来源商机');
  }
  if (action.type === 'save-opportunity' && !canAccessOrganization(state, actor, action.input.departmentId, action.input.ownerId === actor.id || action.input.collaborators.includes(actor.id))) throw new Error('当前访问策略不允许将商机保存到该组织');
  const project = projectForTarget(state, target);
  if (project && !canAccessProject(state, actor, project)) throw new Error('当前访问策略不允许访问该项目');
}
