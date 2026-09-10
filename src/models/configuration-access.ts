import type { ConfigurationVersion } from './configuration';
import type { UserRole } from '@/store/useAppStore';
export type SensitiveField='labor-rate'|'margin'|'evaluation'|'contact';
export type DataScope='self'|'department'|'department-tree'|'organizations'|'all';
export interface AccessPolicyVersion extends ConfigurationVersion {tenantId:string;role:UserRole;dataScope:DataScope;orgIds:string[];pages:string[];actions:string[];fields:SensitiveField[];editableFields?:SensitiveField[];projectRelationRequired:boolean;}
export interface AccessConfigurationState {versions:AccessPolicyVersion[];}
export interface AuditChange {path:string;label:string;before:unknown;after:unknown;sensitive?:SensitiveField;}
export interface AuditEvent {id:string;actor:string;action:string;target:string;date:string;actorId?:string;actorRole?:UserRole;objectType?:string;result?:'成功'|'拒绝';ruleVersion?:string;changes?:AuditChange[];reason?:string;route?:string;}
export type AccessConfigurationAction={type:'access-policy-save';sourceId?:string;value:AccessPolicyVersion}|{type:'access-policy-publish';id:string};
