import type { UserRole } from '@/store/useAppStore';
export interface SolutionDraft {
  customerSituation: string; goals: string; scope: string; boundaries: string; architecture: string; implementation: string; deliverables: string; dependencies: string; assumptions: string;
  ownerId: string; participants: string[]; startDate: string; endDate: string; attachments: string[]; changeReason: string;
}
export interface PresalesCostLine { id: string; subjectId: string; name: string; scope: string; quantity: number; unit: string; unitPrice: number; taxRate: number; taxBasis: '含税' | '不含税'; basis: string; risk: string; supplier?: string; quotationSource?: string; quotationExpiry?: string; laborUserId?: string; laborGrade?: string; baselineVersion?: string }
export interface CostDraft { solutionFingerprint: string; feasibility: '可行' | '有条件可行' | '不可行'; architecture: string; reuse: string; customization: string; environment: string; security: string; dependencies: string; risk: string; lines: PresalesCostLine[]; attachments: string[]; financeCheck?: { fingerprint: string; by: string; date: string; opinion: string } }
export interface SolutionVersion extends SolutionDraft { id: string; version: number; submittedAt: string; submittedBy: string }
export interface CostVersion extends CostDraft { id: string; version: number; solutionVersionId: string; total: number; submittedAt: string; submittedBy: string }
export interface ExpertOpinion { userId: string; by: string; role: UserRole; dimension: string; conclusion: '通过' | '整改' | '不通过'; opinion: string; attachment: string; date: string }
export interface PresalesReview { templateSnapshot?:import('./configuration').TemplateVersion;
  id: string; round: number; solutionVersionId: string; costVersionId: string; status: '评审中' | '通过' | '整改后复审' | '不通过'; method: string; plannedDate: string; experts: { userId: string; name: string; role: UserRole; dimension: string }[]; opinions: ExpertOpinion[];
  createdAt: string; createdBy: string; conclusionReason?: string; decidedAt?: string; corrections: { id: string; item: string; ownerId: string; ownerName: string; dueDate: string; replies: { response: string; attachment: string; date: string; by: string }[] }[];
}
export interface PresalesWorkspace { solutionDraft?: SolutionDraft; costDraft?: CostDraft; solutionVersions: SolutionVersion[]; costVersions: CostVersion[]; reviews: PresalesReview[]; research: { id: string; date: string; by: string; findings: string; scopeChange: string; attachment: string }[] }
