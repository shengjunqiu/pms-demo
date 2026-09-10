import { mockUsers } from '@/mock';
import type { Actor, BusinessState } from './business';
import type { Opportunity } from '@/models/types';
import type { AuditEvent } from '@/models/configuration-access';
import { canAccessProject, DEMO_TENANT, selectAccessPolicy } from './configuration-access';
import { inOrganization } from './selectors';

/** Applies the published organization boundary independently of business-role duties. */
export function canAccessOrganization(state: BusinessState, actor: Actor, departmentId: string, related: boolean) {
  const policy = selectAccessPolicy(state, actor.role);
  if (!policy || policy.tenantId !== DEMO_TENANT) return false;
  const department = mockUsers.find((user) => user.id === actor.id)?.departmentId;
  if (policy.projectRelationRequired && !related) return false;
  switch (policy.dataScope) {
    case 'all': return true;
    case 'self': return related;
    case 'department': return !!department && department === departmentId;
    case 'department-tree': return !!department && inOrganization(departmentId, department);
    case 'organizations': return policy.orgIds.some((id) => inOrganization(departmentId, id));
  }
}

export function canAccessOpportunityScope(state: BusinessState, actor: Actor, opportunity: Opportunity) {
  const related = opportunity.ownerId === actor.id
    || (state.opportunityMeta[opportunity.id]?.collaborators ?? ['U-005']).includes(actor.id)
    || state.projects.some((p) => p.opportunityId === opportunity.id && canAccessProject(state, actor, p));
  return canAccessOrganization(state, actor, opportunity.departmentId, related);
}

/** Resolve real entity relationships, including nested records; never infer ownership from ID prefixes. */
function businessScopeIndex(state: BusinessState) {
  const knownProjects = new Set(state.projects.map((p) => p.id));
  const knownOpportunities = new Set(state.opportunities.map((o) => o.id));
  const index = new Map<string, { projectIds: string[]; opportunityIds: string[] }>();
  const visit = (value: unknown, projectId?: string, opportunityId?: string) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, projectId, opportunityId)); return; }
    const record = value as Record<string, unknown>;
    const input = record.input as Record<string, unknown> | undefined;
    const project = typeof record.id === 'string' && knownProjects.has(record.id) ? record.id : typeof record.projectId === 'string' ? record.projectId : projectId;
    const opportunity = typeof record.id === 'string' && knownOpportunities.has(record.id) ? record.id : typeof record.opportunityId === 'string' ? record.opportunityId
      : typeof input?.opportunityId === 'string' ? input.opportunityId : opportunityId;
    if (typeof record.id === 'string') {
      const prior = index.get(record.id);
      index.set(record.id, { projectIds: [...new Set([...(prior?.projectIds ?? []), ...(project ? [project] : [])])], opportunityIds: [...new Set([...(prior?.opportunityIds ?? []), ...(opportunity ? [opportunity] : [])])] });
    }
    for (const [key, child] of Object.entries(record)) {
      if (['audit', 'snapshot', 'source', 'changes'].includes(key)) continue;
      visit(child, knownProjects.has(key) ? key : project,
        knownOpportunities.has(key) ? key : opportunity);
    }
  };
  visit(state);
  return index;
}

export function businessTargetScope(state: BusinessState, target: string) {
  return businessScopeIndex(state).get(target) ?? { projectIds: [], opportunityIds: [] };
}

export function canAccessTargetScope(state: BusinessState, actor: Actor, target: string) {
  return allowsScope(state, actor, businessTargetScope(state, target));
}

function allowsScope(state: BusinessState, actor: Actor, scope: { projectIds: string[]; opportunityIds: string[] }) {
  return scope.projectIds.every((id) => {
    const project = state.projects.find((p) => p.id === id);
    return !!project && canAccessProject(state, actor, project);
  }) && scope.opportunityIds.every((id) => {
    const opportunity = state.opportunities.find((o) => o.id === id);
    return !!opportunity && canAccessOpportunityScope(state, actor, opportunity);
  });
}

export function visibleAuditEvents(state: BusinessState, actor: Actor): AuditEvent[] {
  const policy = selectAccessPolicy(state, actor.role);
  if (!policy || policy.tenantId !== DEMO_TENANT) return [];
  const index = businessScopeIndex(state);
  return state.audit.filter((event) => {
    // A global policy can inspect unresolved historical events; a restricted one cannot infer their scope.
    if (policy.dataScope === 'all' && !policy.projectRelationRequired) return true;
    const candidates = event.target.startsWith('/')
      ? event.target.split(/[/?=&]/).filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return part; } })
      : [event.target];
    const scoped = candidates.filter((target) => {
      const scope = index.get(target);
      return !!scope && scope.projectIds.length + scope.opportunityIds.length > 0;
    });
    return scoped.length > 0 && scoped.every((target) => allowsScope(state, actor, index.get(target)!));
  });
}
