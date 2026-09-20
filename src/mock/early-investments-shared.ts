import type { Actor } from '@/mock/business';
import type { EarlyInvestmentRequest } from '@/models/early-investments';

export function canReviewEarlyInvestment(r: EarlyInvestmentRequest, actor: Actor) {
  const node = r.approvalNode ?? 0;
  return r.status === '待审批'
    && (r.approvalSnapshot?.nodes[node]?.roles ?? [r.requiredRole]).includes(actor.role)
    && !(r.nodeReviews ?? []).some(v => v.node === node && v.role === actor.role);
}