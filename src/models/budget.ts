import type { BudgetVersion, Milestone, WbsTask } from './types';
export interface TeamResource {
  userId: string; name: string; role: string; departmentId: string; active: boolean;
  startDate: string; endDate: string; allocation: number; plannedHours: number; keyPosition: boolean;
}
export interface PlanningSnapshot {
  scope: string; tasks: WbsTask[]; milestones: Milestone[]; resources: TeamResource[];
  plannedStartDate: string; plannedEndDate: string;
}
export interface FullBaselineSnapshot extends PlanningSnapshot {
  budget: BudgetVersion; estimateVersionId: string; planningReviewId?: string;
}
export interface PlanningDraft extends PlanningSnapshot {
  projectId: string; revision: number; status: '草稿' | '评审中' | '整改中' | '已通过' | '已冻结';
  reviewId?: string; updatedAt: string;
}
export interface PlanningReview {
  id: string; projectId: string; round: number; revision: number; snapshot: PlanningSnapshot;
  status: '待评审' | '通过' | '整改' | '否决'; submittedBy: string; submittedAt: string;
  reviewer?: string; reviewedAt?: string; opinion?: string;
  rectifications: { id: string; content: string; ownerId: string; deadline: string; reply?: string }[];
}
