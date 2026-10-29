export interface BusinessTodo {
  id: string;
  projectId?: string;
  sourceType?: 'initiation';
  sourceId?: string;
  sourceName?: string;
  revision?: number;
  title: string;
  type: string;
  node: string;
  status: string;
  done: boolean;
  due: string;
  route: string;
  opinion?: string;
  owner: string;
  /** 当前角色处理该事项的身份：审批 / 主PM / 责任人 / 最终确认 / 督办 / 审核。 */
  duty?: string;
  /** 待办来源分层：我审批的 / 我办理的 / 我跟进的，用于把本人职责与项目内他人节点分开。 */
  source?: 'approval' | 'mine' | 'follow';
}
