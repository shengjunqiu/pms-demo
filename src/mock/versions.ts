import type { EstimateVersion, Project } from '@/models/types';

/** A submitted project always keeps its selected frozen estimate, even after a new version is published. */
export function projectEstimate(project: Project, estimates: EstimateVersion[]) {
  if (project.frozenEstimateVersionId) {
    return estimates.find((version) => version.id === project.frozenEstimateVersionId
      && version.opportunityId === project.opportunityId && version.isFrozen);
  }
  // Legacy records are safe only when the reference is unambiguous. Never guess among frozen versions.
  const candidates = estimates.filter((version) => version.opportunityId === project.opportunityId && version.isFrozen);
  return candidates.length === 1 ? candidates[0] : undefined;
}
