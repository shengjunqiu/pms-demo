import type { ConfigurationVersion } from './configuration';
import type { UserRole } from '@/store/useAppStore';
export type SourceCostKind='labor'|'procurement'|'outsource'|'expense'|'reserve';
export interface CanonicalSubject {id:string;name:string;parentId?:string;enabled:boolean;kind:SourceCostKind;}
export interface SubjectMappingVersion extends ConfigurationVersion {subjects:CanonicalSubject[];mappings:{sourceType:SourceCostKind;sourceCode:string;subjectId:string}[];}
export interface CostRateVersion extends ConfigurationVersion {userId:string;grade:string;position:string;region:string;hourlyYuan:number;expenseDailyYuan:number;}
export type AlertKind='cost'|'schedule'|'margin'|'unsigned'|'issue'|'risk'|'receipt'|'compliance'|'maintenance';
export interface AlertRuleVersion extends ConfigurationVersion {kind:AlertKind;warningThreshold:number;highThreshold:number;leadDays:number;ownerRole:UserRole;escalationRole:UserRole;escalationDays:number;channels:string[];}
export interface FinanceConfigurationState {subjects:SubjectMappingVersion[];rates:CostRateVersion[];alerts:AlertRuleVersion[];}
export interface ConfiguredAlert {id:string;projectId:string;projectName:string;kind:AlertKind;severity:number;reason:string;sourceId:string;route:string;ruleId:string;ownerRole:UserRole;escalationRole?:UserRole;channels:string[];}
