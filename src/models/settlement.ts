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
