export const EVALUATION_GOALS=['范围目标','商务目标','进度目标','成本目标','质量目标','客户目标'] as const;
export type EvaluationGoal=typeof EVALUATION_GOALS[number];
export const ARCHIVE_CATEGORIES=['商机资料','方案','立项材料','合同','WBS / 计划','预算','变更','需求 / BUG','问题 / 风险','测试与质量资料','验收资料','结算材料','项目总结','经验教训'] as const;
export type ArchiveCategory=typeof ARCHIVE_CATEGORIES[number];
export interface PostEvaluation {
 id:string;projectId:string;status:'编制中'|'待确认'|'已完成';startedAt:string;startedBy:string;completedAt?:string;completedBy?:string;
 snapshot:{settlementId:string;income:number;cost:number;margin:number;budget:number;baselineId:string;scope:string;plannedEnd:string;acceptanceDate:string;issues:{id:string;title:string;status:string}[];risks:{id:string;title:string;status:string}[];changes:{id:string;title:string;status:string}[];requirements:number;bugs:number};
 goals:Record<EvaluationGoal,{conclusion:'达成'|'部分达成'|'未达成'|'';note:string}>;
 riskReview:string;changeReview:string;successes:string;lessons:string;improvements:string;
 staff:{userId:string;name:string;score:number;note:string;evaluatorId:string;evaluator:string;date:string}[];
 history:{date:string;actor:string;action:string;note:string}[];
}
export interface ArchiveSource {id:string;category:ArchiveCategory;label:string;version:string;route:string;record:unknown}
export interface ProjectArchive {id:string;projectId:string;version:number;confirmedAt:string;confirmedBy:string;note:string;sources:ArchiveSource[];materials:{id:string;name:string;category:string;sourceId:string;filename:string;version:number}[];categories:ArchiveCategory[]}
