import type { AcceptanceRecord } from '@/models/types';
export type AcceptanceType = AcceptanceRecord['type'];
export interface AcceptanceCheck { name: string; passed: boolean; note: string }
export interface AcceptanceCorrection { id: string; content: string; owner: string; deadline: string; reply?: string; repliedAt?: string }
export interface AcceptanceDetail {
  submitted: boolean; scope: string; plannedDate: string; method: string; customerContact: string; participants: string;
  contractId?: string; supplierSourceId?: string; previousId?: string;
  checks: AcceptanceCheck[]; corrections: AcceptanceCorrection[]; opinion: string; process: string;
  proofFiles: string[]; confirmedBy?: string; confirmedAt?: string;
  history: { date: string; actor: string; action: string; note: string }[];
}
export interface AcceptanceReport {
  id: string; projectId: string; contractId: string; acceptanceId: string; batchNo: string;
  reportType: '阶段报验' | '最终报验'; date: string; status: '草稿' | '待确认' | '已确认' | '退回';
  taxLines: { taxRate: number; amount: number }[]; materials: string[]; note: string;
  submittedBy: string; confirmedBy?: string; opinion?: string;
}

export interface SettlementSnapshot {
  capturedAt: string; acceptanceId: string; confirmedAt: string; estimateId: string; estimateVersion: string; budgetId: string; budgetVersion: string; baselineId: string;
  income: number; cost: number; receipts: number; receivable: number; overdue: number; lastRolling: number; lastRollingDate: string;
  subjects: { subjectId: string; subjectName: string; estimate: number; budget: number; actual: number; rolling: number }[];
  contracts: { id: string; code: string; amount: number; status: string }[];
  receiptPlans: { id: string; contractId: string; amount: number; paidAmount: number; dueDate: string }[];
  costs: { id: string; sourceId?: string; type: string; subjectId: string; subjectName: string; amount: number; description: string }[];
  changes: { id: string; title: string; status: string; costImpact: number }[];
}
export interface SettlementRequest {
  id: string; projectId: string; version: number; previousId?: string; supersededBy?: string; status: '草稿'|'财务核算'|'PMO审核'|'结算评审'|'待最终锁定'|'材料整改'|'金额退回'|'已锁定';
  note: string; files: string[]; submittedBy: string; createdAt: string; snapshot: SettlementSnapshot;
  finance?: { actor: string; date: string; invoicedAmount: number; taxAmount: number; opinion: string };
  history: { actor: string; date: string; action: string; opinion: string }[];
}
export interface SettlementCostReview { id: string; projectId: string; sourceId: string; disposition: '已有凭证'|'取消不发生'; ledgerId?: string; amount: number; evidence: string; actor: string; date: string }
export interface SettlementCostDisposition { id: string; projectId: string; subjectId: string; bucket: '承诺'|'预测'; disposition: '实际发生'|'取消不发生'; amount: number; evidence: string; ledgerId?: string; date: string; actor: string }
export interface SettlementAnalysis { subjectId: string; category: string; phase: string; changeId?: string; note: string }
