import type { BaselineVersion, BudgetVersion, ProjectChange } from './types';
import type { FullBaselineSnapshot } from './budget';
export interface ChangeInput {
 type:ProjectChange['type']; title:string; reason:string; scope:string; customerBasis:string; contractBasis:string;
 urgency:'一般'|'紧急'; shiftDays:number; proposedIncome:number; adjustments:Record<string,number>;
 resourceHours:Record<string,number>; newWorkPackage:string; newTaskOwnerId:string; risk:string; majorRisk:boolean;
 procurementImpact:string; outsourceImpact:string; attachments:string[];
}
export interface ChangeRequest {
 history?:{revision:number;status:string;input:ChangeInput;original:BaselineVersion;originalIncome?:number;proposed:FullBaselineSnapshot;opinion?:string}[];
 id:string;projectId:string;input:ChangeInput;original:BaselineVersion;originalIncome?:number;proposed:FullBaselineSnapshot;proposedBudget:BudgetVersion;
 status:'草稿'|'影响评估中'|'待分级'|'PMO审批中'|'PMC审议中'|'已批准'|'已否决';requiredRole:'pmo'|'executive';ruleReasons:string[];
 assessments:{area:'技术'|'财务'|'市场';actor:string;opinion:string;date:string}[];
 financeSignoff?: { signed: boolean; actor: string; date: string; opinion: string };
 submittedBy:string;submittedAt?:string;classifiedBy?:string;classificationOpinion?:string;reviewedBy?:string;opinion?:string;reviewedAt?:string;sourceApprovalId?:string;revision:number;
}
