/**
 * 「重大差异」唯一口径（与 docs/验收结算关闭运维流程审计.md 2.5 一致）：|核算实际-预算| ≥ 100 万元 或 相对预算 ≥ 10%。
 * 结算保存的必填校验（src/mock/settlement.ts）与未归因预警（src/mock/alerts.ts）
 * 都必须调用本模块，避免页脚写一个阈值、store 判另一个阈值。
 */
export const MAJOR_VARIANCE = Object.freeze({ minAmount: 100, minRate: 0.1 });

export interface SubjectVariance {
  budget: number;
  actual: number;
}

export interface AnalysisRow {
  subjectId: string;
  category: string;
  phase: string;
  note: string;
}

export function isMajorVariance(variance: SubjectVariance): boolean {
  const gap = Math.abs(variance.actual - variance.budget);
  return gap >= MAJOR_VARIANCE.minAmount || (variance.budget > 0 && gap / variance.budget >= MAJOR_VARIANCE.minRate);
}

/** 达阈值的科目。 */
export function majorVariances<T extends SubjectVariance>(rows: T[]): T[] {
  return rows.filter(isMajorVariance);
}

/** 达阈值但未完整填写原因/责任阶段/说明的科目。 */
export function missingAttribution<T extends SubjectVariance & { subjectId: string }>(rows: T[], analyses: AnalysisRow[]): T[] {
  const complete = (row: T) => analyses.some((a) => a.subjectId === row.subjectId && Boolean(a.category?.trim() && a.phase?.trim() && a.note?.trim()));
  return majorVariances(rows).filter((row) => !complete(row));
}
