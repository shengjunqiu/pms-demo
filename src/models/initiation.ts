import type {ConfigurationState,ApprovalProgress} from './configuration';
import type { EstimateVersion,Opportunity,Project } from './types';
import type { UserRole } from '@/store/useAppStore';
export type InitiationRiskDomain='商务'|'技术'|'交付'|'财务'|'法务';
export interface InitiationRisk {
 id:string;domain:InitiationRiskDomain;description:string;sourceId:string;sourceRoute:string;
 probability:number;impact:number;mitigation:string;ownerId:string;
}
export interface InitiationInput {
 opportunityId:string;name:string;type:Project['type'];region:string;amount:number;necessity:string;scope:string;
 plannedStartDate:string;plannedEndDate:string;expectedSignDate:string;customerNeeds:string;recommendation:string;
 strategic:boolean;contractStatus:'未签'|'已签';contractReference:string;attachments:string[];additionalDeliverables:string[];
 risks:InitiationRisk[];rectificationReply:string;
}
export interface InitiationSource {
 opportunity:Opportunity;estimate:EstimateVersion;solutionVersionId:string;solutionScope:string;solutionAttachments:string[];
 expertReviewId:string;expertOpinions:{by:string;dimension:string;conclusion:string;opinion:string}[];
 risks:InitiationRisk[];earlyCostTotal:number;earlyCostSources:{id:string;sourceId:string;amount:number}[];
}
export interface InitiationRound {
 configurationSnapshot?:ConfigurationState;approvalProgress?:ApprovalProgress;
 revision:number;input:InitiationInput;source:InitiationSource;submittedAt:string;submittedBy:string;
 status:'待风险评估'|'待分级'|'会签中'|'待决策'|'通过'|'整改'|'否决'|'暂缓';
 risks:InitiationRisk[];riskLevel?:'低'|'中'|'高';riskExplanation?:string;assessedBy?:string;
 requiredDeliverables?:string[];level?:Project['level'];classificationReason?:string;ruleReasons:string[];path?:'线上会签'|'PMO立项会'|'PMC决策会';
 signatures:{node:string;role:UserRole;by:string;conclusion:'同意'|'否决';opinion:string;date:string}[];
 decision?:{result:'通过'|'整改'|'否决'|'暂缓';opinion:string;by:string;date:string;meetingDate:string;participants:string[];minutes:string;rectifications:{content:string;ownerId:string;deadline:string}[];resumeDate?:string;costDisposition?:string;trackingOwnerId?:string};
}
export interface InitiationApplication {
 id:string;input:InitiationInput;draftRevision:number;rounds:InitiationRound[];status:'草稿'|InitiationRound['status'];
 createdBy:string;createdAt:string;projectId?:string;followups?:{by:string;date:string;reason:string}[];
}

export const INITIATION_SIGNATURES=[{node:'技术',role:'solution-tech'},{node:'方案',role:'solution-tech'},{node:'交付',role:'project-manager'},{node:'财务',role:'finance'},{node:'法务协同（PMO代办）',role:'pmo'},{node:'PMO',role:'pmo'}] as const;
