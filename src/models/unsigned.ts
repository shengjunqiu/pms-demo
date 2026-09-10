import type { BaselineVersion, Contract, CostItem } from './types';
export interface UnsignedProjectControl {
 projectId:string;initiatedAmount:number;initiatedAt:string;expectedSignDate:string;validUntil:string;ruleVersion:string;
 followups:{id:string;date:string;by:string;progress:string;nextAction:string;expectedSignDate:string}[];
 exit?:{reason:string;resources:string;recoverableAssets:string;responsibility:string;recommendation:string;terminated:boolean;reactivationPossible:boolean;by:string;date:string;actualCost:number;costSources:CostItem[]};
 contractConfirmation?:{contractId:string;by:string;date:string;source:string;sourceDocument?:{source:string;attachment:string}};
}
export interface UnsignedInvestmentRequest {
 id:string;projectId:string;approvalId:string;amount:number;originalQuota:number;proposedQuota:number;
 originalValidUntil:string;proposedValidUntil:string;signProgress:string;necessity:string;risk:string;attachments:string[];
 submittedBy:string;submittedAt:string;sourceSnapshot:{actualCost:number;committedCost:number;pendingCost:number;expectedSignDate:string};
}
export interface StartConfirmation {
 projectId:string;by:string;date:string;opinion:string;baseline:BaselineVersion;contract:Contract;
 appointmentId:string;checks:{key:string;name:string;passed:boolean;detail:string}[];
 notifications:{userId:string;name:string;role:string;status:'已生成';message:string}[];
}
