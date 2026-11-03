/** Navigation only. The presentation never creates or switches business facts. */
export const PRESENTATION_PATH = '/presentation';
export const PRESENTATION_CHANNEL = 'pms-presentation-v1';
export const PRESENTATION_SLIDES = 36;
export const PRESENTATION_PROJECT = 'P-INIT-67';
const project = `/projects/${PRESENTATION_PROJECT}`;

export const SCREENSHOT_TARGETS: Record<string, string> = {
  overview: project,
  opportunity: '/opportunities/OPP-073',
  estimate: '/opportunities/OPP-073/estimate',
  initiation: '/initiation/review?id=INIT-6',
  team: `${project}/team`,
  wbs: `${project}/wbs`,
  budget: `${project}/estimate-budget`,
  start: `${project}/start-confirmation`,
  progress: `${project}/progress`,
  daily: `${project}/daily-reports`,
  deliverables: `${project}/deliverables`,
  acceptance: `${project}/customer-acceptance?view=conditions`,
  receipts: `${project}?tab=contract`,
  settlement: `${project}/settlement/apply`,
  handover: `${project}/operation-handover`,
  archive: `${project}/archive`,
  labor: `${project}/labor-cost`,
  procurement: `${project}/procurement`,
  outsource: `${project}/outsourcing`,
  accounting: `${project}/dynamic-accounting`,
  report: `${project}/report-acceptance`,
  evaluation: `${project}/post-evaluation`,
  closure: `${project}/close`,
  baseline: `${project}/baseline`,
  risks: `${project}/tickets?kind=risk`,
  weekly: `${project}/weekly-reports`,
  internal: `${project}/internal-acceptance?view=conditions`,
  supplier: `${project}/supplier-acceptance`,
  four: `${project}/four-calculations`,
};

export interface PresentationPosition {
  slide: number;
  selections: Record<string, number>;
}

export function readPosition(value: unknown): PresentationPosition | undefined {
  if (!value || typeof value !== 'object') return;
  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.slide) || Number(input.slide) < 1 || Number(input.slide) > PRESENTATION_SLIDES) return;
  const selections: Record<string, number> = {};
  if (input.selections && typeof input.selections === 'object') {
    for (const [key, choice] of Object.entries(input.selections)) {
      if (/^\d{1,2}$/.test(key) && Number(key) < PRESENTATION_SLIDES && Number.isInteger(choice) && Number(choice) >= 0 && Number(choice) <= 1) {
        selections[key] = Number(choice);
      }
    }
  }
  return { slide: Number(input.slide), selections };
}

export function localReturnPath(path: unknown): string {
  return typeof path === 'string' && /^\/(?!\/)/.test(path) && !/[\\\r\n]/.test(path) && !path.startsWith(PRESENTATION_PATH)
    ? path : '/projects';
}
