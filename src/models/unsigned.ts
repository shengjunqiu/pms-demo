import type { BaselineVersion, Contract, CostItem, ReceiptPlan } from './types';

export interface UnsignedProjectControl {
  projectId: string;
  initiatedAmount: number;
  initiatedAt: string;
  expectedSignDate: string;
  validUntil: string;
  ruleVersion: string;
  followups: {
    id: string;
    date: string;
    by: string;
    progress: string;
    nextAction: string;
    expectedSignDate: string;
  }[];
  exit?: {
    reason: string;
    resources: string;
    recoverableAssets: string;
    responsibility: string;
    recommendation: string;
    terminated: boolean;
    reactivationPossible: boolean;
    by: string;
    date: string;
    actualCost: number;
    costSources: CostItem[];
  };
  contractConfirmation?: {
    contractId: string;
    by: string;
    date: string;
    source: string;
    priorProjectId: string;
    contractSnapshot: Contract;
    receiptPlanSnapshots: ReceiptPlan[];
    sourceDocument?: { source: string; attachment: string };
  };
}

export interface UnsignedInvestmentRequest {
  id: string;
  projectId: string;
  approvalId: string;
  amount: number;
  originalQuota: number;
  proposedQuota: number;
  originalValidUntil: string;
  proposedValidUntil: string;
  signProgress: string;
  necessity: string;
  risk: string;
  attachments: string[];
  submittedBy: string;
  submittedAt: string;
  sourceSnapshot: {
    actualCost: number;
    committedCost: number;
    pendingCost: number;
    expectedSignDate: string;
  };
}

export type ExecutionPolicyAction = 'update-task' | 'save-daily' | 'submit-labor';

export interface ExecutionWorkReference {
  id: string;
  type: 'WBS任务' | '日报待办' | '工时填报入口';
  sourceId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  dueDate: string;
  route: string;
  policyAction: ExecutionPolicyAction;
  policyTargetId: string;
  status: string;
}

export interface StartConfirmation {
  projectId: string;
  by: string;
  date: string;
  opinion: string;
  baseline: BaselineVersion;
  contract: Contract;
  appointmentId: string;
  startMilestone: { id: string; name: string; actualDate: string; status: '已达成' };
  checks: { key: string; name: string; passed: boolean; detail: string }[];
  executionWork: ExecutionWorkReference[];
  notifications: {
    userId: string;
    name: string;
    role: string;
    status: '已生成';
    message: string;
  }[];
}
