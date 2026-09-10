export interface OperationHandover {
  id: string;
  projectId: string;
  contractId: string;
  required: boolean;
  basis: string;
  startDate: string;
  endDate: string;
  receiverId: string;
  teamIds: string[];
  scope: string;
  sla: string;
  systemInfo: string;
  legacyIssues: string;
  accounts: string;
  documents: string;
  status: "待接收" | "已接收" | "无需运维";
  submittedBy: string;
  submittedAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}
export interface OperationCycle {
  id: string;
  projectId: string;
  contractId: string;
  previousId?: string;
  renewedById?: string;
  startDate: string;
  endDate: string;
  scope: string;
  sla: string;
  teamIds: string[];
  remindDays: number;
  status: "待生效" | "服务中" | "退出中" | "已结束" | "已续期";
  source: string;
  exit?: {
    reason: string;
    handoff: string;
    accountsRevoked: string;
    archive: string;
    confirmedBy?: string;
    confirmedAt?: string;
  };
}
export interface OperationEvent {
  id: string;
  projectId: string;
  operationId: string;
  kind: "问题" | "巡检" | "服务" | "客户沟通" | "SLA" | "风险";
  title: string;
  severity: "一般" | "重大";
  status: "未解决" | "已解决";
  note: string;
  date: string;
  actor: string;
  resolution?: string;
  resolvedAt?: string;
}
export interface ProjectClosure {
  id: string;
  projectId: string;
  date: string;
  actor: string;
  note: string;
  archiveId: string;
  evaluationId: string;
  settlementId: string;
  operationIds: string[];
  receipts: unknown[];
}

export interface OperationCostSource {
  id: string;
  projectId: string;
  operationId: string;
  sourceNo: string;
  kind: "labor" | "expense";
  date: string;
  hours?: number;
  rate?: number;
  amount: number;
  description: string;
  evidence: string;
  status: "待审核" | "已入账" | "已退回";
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
  previousId?: string;
  supersededBy?: string;
}
