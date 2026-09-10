import type { PresalesCostLine } from './presales';
export interface EstimateDraft { reviewId:string; solutionVersionId:string; costVersionId:string; income:number; incomeTaxRate:number; incomeTaxBasis:'含税'|'不含税'; lines:PresalesCostLine[]; changeReason:string; assumptions:string; riskReserveNote:string; responsibleDepartment:string; }
export interface EstimateMetadata extends EstimateDraft { createdBy:string; createdAt:string; frozenBy?:string; frozenAt?:string; freezeOpinion?:string; }
