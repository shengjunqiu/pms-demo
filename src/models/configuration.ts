import type { UserRole } from '@/store/useAppStore';
export interface ConfigurationVersion {id:string;key:string;version:number;name:string;status:'草稿'|'已发布';enabled:boolean;effectiveDate:string;orgId:string;projectType:string;changeReason:string;createdBy:string;createdAt:string;publishedBy?:string;publishedAt?:string;}
export interface TemplateVersion extends ConfigurationVersion {kind:'deliverable'|'assessment'|'expert-review'|'post-evaluation';level:string;rows:{id:string;name:string;phase:string;required:boolean;systemRequired:boolean;role:UserRole;timing:string;weight:number}[];}
export interface GradingVersion extends ConfigurationVersion {superAmount:number;majorAmount:number;keyAmount:number;strategicMajor:boolean;highRiskMajor:boolean;strategicCustomerMajor:boolean;minimumMargin:number;minimumAssessmentScore:number;unsignedRatio:number;unsignedDays:number;unsignedWarningDays:number;stageReleasePercent:number;}
export interface ApprovalNode {name:string;roles:UserRole[];mode:'all'|'any';timeoutDays:number;}
export interface ApprovalRuleVersion extends ConfigurationVersion {businessType:'early-investment'|'initiation'|'over-estimate'|'change'|'settlement';priority:number;minimumAmount:number;risk:'all'|'高风险'|'一般';belowMargin?:number;level:string;nodes:ApprovalNode[];}
export interface ConfigurationState {templates:TemplateVersion[];grading:GradingVersion[];approvals:ApprovalRuleVersion[];}
export interface ApprovalRoutingSnapshot {ruleId:string;ruleVersion:string;reason:string;nodes:ApprovalNode[];}
export interface ApprovalNodeReview {node:number;role:UserRole;by:string;approve:boolean;opinion:string;date:string;}
export interface ApprovalProgress {snapshot:ApprovalRoutingSnapshot;node:number;enteredAt:string;reviews:ApprovalNodeReview[];status:'待审批'|'通过'|'驳回';}
