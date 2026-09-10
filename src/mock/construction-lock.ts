import type { BusinessState } from '@/mock/business';

export function constructionLockReason(state: Pick<BusinessState, 'lockedProjects' | 'constructionFreezes'>, projectId: string) {
  if (state.lockedProjects.includes(projectId)) return '建设期成本已结算锁定';
  const freeze = state.constructionFreezes[projectId];
  return freeze ? `建设期成本已冻结（${freeze.requestId}）：${freeze.reason}` : undefined;
}

export function assertConstructionWritable(state: Pick<BusinessState, 'lockedProjects' | 'constructionFreezes'>, projectId: string) {
  const reason = constructionLockReason(state, projectId);
  if (reason) throw new Error(reason);
}
