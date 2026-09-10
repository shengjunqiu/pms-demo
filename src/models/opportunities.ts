import type { Opportunity } from './types';
import type { UserRole } from '@/store/useAppStore';
export type AssessmentDimension = 'customer' | 'technology' | 'commercial' | 'competition' | 'delivery' | 'margin';
export interface DimensionOpinion { score: number; conclusion: '可行' | '有条件可行' | '不可行'; risk: string; note: string; attachment: string; preliminaryCost?: number; by: string; role: UserRole; date: string }
export interface AssessmentRound { templateSnapshot?:import('./configuration').TemplateVersion; ruleSnapshot?:{version:string;minimumScore:number;minimumMargin:number}; id: string; version: number; status: '评估中' | '已确认'; opinions: Partial<Record<AssessmentDimension, DimensionOpinion>>; startedAt: string; conclusion?: string; reason?: string; confirmedAt?: string; ruleVersion?: string; score?: number; riskLevel?: string }
export interface OpportunityMeta {
  source: string; projectType: string; description: string; competition: string; businessLine: string; region: string; collaborators: string[]; attachments: string[];
  followups: { id: string; date: string; communication: string; requirementChange: string; commercialProgress: string; nextPlan: string; author: string }[];
  assessments: AssessmentRound[];
  pauses: { reason: string; reviewDate: string; ownerId: string; ownerName: string; date: string }[];
  termination?: { reason: string; costDisposition: string; retrospective: string; costSnapshot: number; date: string };
  solutionTask?: { id: string; opportunityId: string; assessmentId: string; ownerId: string; ownerName: string; status: '待开始' | '进行中' | '已完成'; createdAt: string; dueDate: string };
}
export type OpportunityInput = Pick<Opportunity, 'name' | 'customerId' | 'departmentId' | 'ownerId' | 'estimatedAmount' | 'expectedSignDate' | 'winRate'> & Pick<OpportunityMeta, 'source' | 'projectType' | 'description' | 'competition' | 'businessLine' | 'region' | 'collaborators' | 'attachments'>;
