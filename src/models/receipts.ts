export interface ReceiptRecord {
  id: string;
  projectId: string;
  contractId: string;
  sourceNo: string;
  receivedDate: string;
  amount: number;
  allocations: { receiptPlanId: string; amount: number; paidBefore: number; paidAfter: number }[];
  evidenceFiles: string[];
  note: string;
  confirmedBy: string;
  confirmedAt: string;
  contractPaidBefore: number;
  contractPaidAfter: number;
}

export interface ReceiptAction {
  type: 'confirm-project-receipt';
  projectId: string;
  contractId: string;
  sourceNo: string;
  receivedDate: string;
  allocations: { receiptPlanId: string; amount: number }[];
  evidenceFiles: string[];
  note: string;
}
