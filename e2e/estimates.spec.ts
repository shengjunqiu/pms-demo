import { expect, test, type Page } from '@playwright/test';
import type { Actor, BusinessAction } from '../src/mock/business-domain';
import type { CostDraft, SolutionDraft } from '../src/models/presales';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';

type BusinessModule = typeof import('../src/mock/business');

const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
const errors = new WeakMap<Page, string[]>();
const observations = new WeakMap<Page, Record<string, unknown>>();

test.beforeEach(({ page }) => {
  prepareArtifacts();
  errors.set(page, collectBrowserErrors(page));
});

test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors, observations: observations.get(page) ?? {} });
  expect(consoleErrors).toEqual([]);
});

function solution(version: 1 | 2): SolutionDraft {
  return {
    customerSituation: '多套系统和接口分散',
    goals: '统一数据服务与业务门户',
    scope: version === 1 ? '20个接口与统一门户' : '24个接口、统一门户与身份认证',
    boundaries: '不含历史数据清洗',
    architecture: version === 1 ? '微服务与统一网关' : '微服务、统一网关与双因素认证',
    implementation: '分期迭代交付',
    deliverables: '部署包、接口文档与测试报告',
    dependencies: '客户提供接口及测试环境',
    assumptions: '接口按期开放',
    ownerId: tech.id,
    participants: [market.id],
    startDate: '2026-09-09',
    endDate: '2026-10-20',
    attachments: [`方案V${version}.pdf`],
    changeReason: version === 1 ? '' : '补充认证范围并调整成本结构',
  };
}

function cost(version: 1 | 2): CostDraft {
  return {
    solutionFingerprint: '',
    feasibility: '可行',
    architecture: version === 1 ? '统一网关' : '统一网关与双因素认证',
    reuse: '复用基础平台',
    customization: version === 1 ? '20个接口' : '24个接口',
    environment: '客户容器平台',
    security: '统一身份认证与访问审计',
    dependencies: '客户接口和测试环境',
    risk: '接口开放日期可能影响交付窗口',
    attachments: [`成本测算V${version}.xlsx`],
    lines: version === 1 ? [
      { id: 'A03-PROC', subjectId: 'SUB-03', name: '集成网关', scope: '统一门户', quantity: 2, unit: '套', unitPrice: 10, taxRate: 13, taxBasis: '不含税', basis: '供应商书面询价', risk: '', supplier: '基础设施供应商', quotationSource: 'Q-A03-01', quotationExpiry: '2026-10-31' },
      { id: 'A03-EXPENSE', subjectId: 'SUB-04-2', name: '现场差旅', scope: '现场调研', quantity: 5, unit: '人次', unitPrice: 0.3, taxRate: 0, taxBasis: '含税', basis: '差旅标准', risk: '' },
      { id: 'A03-LABOR', subjectId: 'SUB-01', name: '接口开发人力', scope: '20个接口', quantity: 100, unit: '人天', unitPrice: 0, taxRate: 0, taxBasis: '含税', basis: '2人50天', risk: '', laborUserId: tech.id, laborGrade: '高级研发' },
    ] : [
      { id: 'A03-PROC', subjectId: 'SUB-03', name: '集成网关', scope: '统一门户与认证', quantity: 3, unit: '套', unitPrice: 10, taxRate: 13, taxBasis: '不含税', basis: '供应商更新询价', risk: '', supplier: '基础设施供应商', quotationSource: 'Q-A03-02', quotationExpiry: '2026-11-30' },
      { id: 'A03-THIRD', subjectId: 'SUB-04-1', name: '认证专项服务', scope: '双因素认证', quantity: 1, unit: '项', unitPrice: 8, taxRate: 6, taxBasis: '不含税', basis: '专项服务报价', risk: '' },
      { id: 'A03-LABOR', subjectId: 'SUB-01', name: '接口开发人力', scope: '24个接口', quantity: 120, unit: '人天', unitPrice: 0, taxRate: 0, taxBasis: '含税', basis: '2人60天', risk: '', laborUserId: tech.id, laborGrade: '高级研发' },
    ],
  };
}

async function seed(page: Page) {
  await page.goto('/opportunities');
  return page.evaluate(async ({ actors, firstSolution, firstCost }) => {
    const path = '/src/mock/business.ts';
    const opportunityPath = '/src/mock/opportunities.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    const { DIMENSIONS } = await import(/* @vite-ignore */ opportunityPath) as typeof import('../src/mock/opportunities');
    let state = business.createBusinessState();
    const act = (action: BusinessAction, actor: Actor) => { state = business.transition(state, action, actor); };
    act({ type: 'save-opportunity', submit: true, duplicateConfirmed: true, input: {
      name: 'A03概算版本验收项目', customerId: 'CUST-001', departmentId: 'D-002', ownerId: actors.market.id,
      estimatedAmount: 1200, expectedSignDate: '2026-11-30', winRate: 85, source: '客户需求', projectType: '软件开发',
      description: '统一门户与数据接口建设', competition: '客户比选', businessLine: '数字政务', region: '福建省',
      collaborators: [actors.tech.id], attachments: ['客户需求纪要.pdf'],
    } }, actors.market);
    const id = state.opportunities.at(-1)!.id;
    act({ type: 'start-opportunity-assessment', id }, actors.market);
    for (const d of DIMENSIONS) act({ type: 'save-opportunity-dimension', id, dimension: d.key, opinion: {
      score: 88, conclusion: '可行', risk: '', note: '专业条件核验通过', attachment: '', preliminaryCost: d.key === 'margin' ? 700 : undefined,
    } }, d.role === 'finance' ? actors.finance : ['technology', 'delivery'].includes(d.key) ? actors.tech : actors.market);
    act({ type: 'conclude-opportunity', id, conclusion: '拟立项', reason: '六维条件通过，进入方案评审' }, actors.market);
    act({ type: 'presales-save-solution', id, draft: firstSolution }, actors.tech);
    act({ type: 'presales-save-cost', id, draft: firstCost }, actors.tech);
    act({ type: 'presales-finance-check', id, opinion: '范围、科目、费率与询价已核对' }, actors.finance);
    act({ type: 'presales-submit-review', id, method: '线上专家评审会', plannedDate: '2026-09-10', expertIds: [actors.tech.id, actors.finance.id] }, actors.pmo);
    const reviewId = state.presales[id].reviews.at(-1)!.id;
    act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: '方案与成本可行', attachment: '' }, actors.tech);
    act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: '财务口径一致', attachment: '' }, actors.finance);
    act({ type: 'presales-review-decision', id, reviewId, conclusion: '通过', reason: '专家意见一致，形成概算', corrections: [] }, actors.pmo);
    business.useBusinessStore.setState({ data: state });
    return { id, reviewId };
  }, { actors: { market, tech, finance, pmo }, firstSolution: solution(1), firstCost: cost(1) });
}

async function appendReviewedSource(page: Page, id: string) {
  return page.evaluate(async ({ target, actors, nextSolution, nextCost }) => {
    const path = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    let state = business.useBusinessStore.getState().data;
    const act = (action: BusinessAction, actor: Actor) => { state = business.transition(state, action, actor); };
    act({ type: 'presales-save-solution', id: target, draft: nextSolution }, actors.tech);
    act({ type: 'presales-save-cost', id: target, draft: nextCost }, actors.tech);
    act({ type: 'presales-finance-check', id: target, opinion: '复审范围、科目和报价已核对' }, actors.finance);
    act({ type: 'presales-submit-review', id: target, method: '线上专家评审会', plannedDate: '2026-09-10', expertIds: [actors.tech.id, actors.finance.id] }, actors.pmo);
    const reviewId = state.presales[target].reviews.at(-1)!.id;
    act({ type: 'presales-expert-opinion', id: target, reviewId, conclusion: '通过', opinion: '变更方案可行', attachment: '' }, actors.tech);
    act({ type: 'presales-expert-opinion', id: target, reviewId, conclusion: '通过', opinion: '变更成本口径一致', attachment: '' }, actors.finance);
    act({ type: 'presales-review-decision', id: target, reviewId, conclusion: '通过', reason: '复审通过，生成新概算', corrections: [] }, actors.pmo);
    business.useBusinessStore.setState({ data: state });
    return reviewId;
  }, { target: id, actors: { tech, finance, pmo }, nextSolution: solution(2), nextCost: cost(2) });
}

async function chooseSelect(page: Page, label: string, optionText: string) {
  const selector = page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`);
  await selector.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option:visible').filter({ hasText: optionText }).last().click();
}

async function generateFromReview(page: Page) {
  await page.getByRole('button', { name: '从通过评审生成草稿', exact: true }).click();
  const confirmation = page.locator('.ant-modal-confirm:visible');
  if (await confirmation.count()) await confirmation.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('已从通过评审的双版本生成草稿', { exact: true })).toBeVisible();
}

async function publishCurrentDraft(page: Page) {
  await page.getByRole('button', { name: '生成概算版本', exact: true }).click();
  await page.locator('.ant-modal-confirm:visible').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('已追加概算版本，等待PMO确认冻结', { exact: true })).toBeVisible();
}

async function freezeLatest(page: Page, id: string) {
  await role(page, 'PMO负责人');
  await navigate(page, `/opportunities/${id}/estimate`);
  await page.getByRole('tab', { name: /版本记录/ }).click();
  const row = page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr').filter({ hasText: '待确认' }).first();
  await row.getByRole('button', { name: '确认冻结', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'PMO确认冻结概算', exact: true });
  await expect(dialog.getByRole('button', { name: '确认冻结', exact: true })).toBeDisabled();
  await dialog.locator('textarea').fill('已核对评审方案、成本明细和税口径');
  await expect(dialog.getByRole('button', { name: '确认冻结', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: '确认冻结', exact: true }).click();
  await expect(page.getByText('概算已冻结并设为本商机当前版本，历史项目引用保持不变', { exact: true })).toBeVisible();
}

test('GS-08/09 从通过评审生成、追加、冻结、差异追溯并承接立项版本', async ({ page }) => {
  test.setTimeout(120_000);
  const { id, reviewId } = await seed(page);
  await role(page, '方案架构师');
  await navigate(page, `/opportunities/${id}/estimate`);
  await chooseSelect(page, '通过评审来源', '第1轮');
  await generateFromReview(page);
  await expect(page.getByRole('link', { name: reviewId, exact: true })).toHaveAttribute('href', new RegExp(`review\\?review=${reviewId}$`));
  await expect(page.getByText('关键测算假设（必填）', { exact: true })).toBeVisible();
  await publishCurrentDraft(page);
  const firstId = await page.evaluate(async target => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    return b.useBusinessStore.getState().data.estimates.filter(e => e.opportunityId === target).at(-1)!.id;
  }, id);
  await freezeLatest(page, id);
  await expect(page.getByRole('link', { name: '按当前冻结版发起立项', exact: true })).toBeVisible();
  const shots: Record<string, unknown> = { estimate: await capturePageEvidence(page, 'GS-08') };

  const secondReviewId = await appendReviewedSource(page, id);
  await role(page, '方案架构师');
  await navigate(page, `/opportunities/${id}/estimate`);
  await chooseSelect(page, '通过评审来源', '第2轮');
  await generateFromReview(page);
  await expect(page.getByRole('link', { name: secondReviewId, exact: true })).toBeVisible();
  await publishCurrentDraft(page);
  const secondId = await page.evaluate(async target => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    return b.useBusinessStore.getState().data.estimates.filter(e => e.opportunityId === target).at(-1)!.id;
  }, id);
  await freezeLatest(page, id);

  await page.getByRole('link', { name: '版本对比', exact: true }).click();
  await navigate(page, `/opportunities/${id}/estimate/compare?base=${firstId}&compare=${secondId}`);
  await expect(page).toHaveURL(new RegExp(`base=${firstId}.*compare=${secondId}`));
  await expect(page.getByRole('cell', { name: '新增', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '删除', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '修改', exact: true }).first()).toBeVisible();
  await expect(page.locator('.ant-table-row').filter({ hasText: '接口开发人力' })).toContainText('已隐藏');
  await expect(page.getByRole('link', { name: `评审 ${secondReviewId}`, exact: true })).toHaveAttribute('href', new RegExp(`review\\?review=${secondReviewId}$`));
  shots.compare = await capturePageEvidence(page, 'GS-09');

  await navigate(page, `/opportunities/${id}/estimate`);
  await page.getByRole('link', { name: '按当前冻结版发起立项', exact: true }).click();
  await expect(page).toHaveURL(`/initiation/apply?opportunityId=${id}`);
  await page.getByRole('tab', { name: '概算与毛利', exact: true }).click();
  await expect(page.getByText(`冻结版本 ${secondId}`, { exact: false })).toBeVisible();
  const binding = await page.evaluate(async target => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const state = b.useBusinessStore.getState().data; const o = state.opportunities.find(x => x.id === target)!;
    return { current: o.currentEstimateVersionId, versions: state.estimates.filter(e => e.opportunityId === target).map(e => ({ id: e.id, frozen: e.isFrozen })) };
  }, id);
  expect(binding.current).toBe(secondId);
  expect(binding.versions).toEqual([{ id: firstId, frozen: true }, { id: secondId, frozen: true }]);
  observations.set(page, { id, firstId, secondId, reviewId, secondReviewId, screenshots: shots, binding });
});

test('GS-08/09 阻断偏离评审的冻结，并覆盖空态、404与403', async ({ page }) => {
  const { id } = await seed(page);
  await role(page, '方案架构师');
  await navigate(page, `/opportunities/${id}/estimate`);
  await expect(page.getByText('尚无概算草稿，请先从通过的专家评审生成', { exact: true })).toBeVisible();
  await navigate(page, `/opportunities/${id}/estimate/compare`);
  await expect(page.getByText('尚无概算版本，请先生成概算', { exact: true })).toBeVisible();
  for (const route of ['estimate', 'estimate/compare']) {
    await navigate(page, `/opportunities/OPP-NOT-FOUND/${route}`);
    await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
  }
  const deniedId = await page.evaluate(async (marketActor) => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    let state = b.useBusinessStore.getState().data;
    state = b.transition(state, { type: 'save-opportunity', submit: true, duplicateConfirmed: true, input: {
      name: 'A03无协同访问商机', customerId: 'CUST-001', departmentId: 'D-002', ownerId: marketActor.id,
      estimatedAmount: 900, expectedSignDate: '2026-11-30', winRate: 70, source: '客户需求', projectType: '软件开发',
      description: '仅客户经理跟进', competition: '客户比选', businessLine: '数字政务', region: '福建省', collaborators: [], attachments: [],
    } }, marketActor);
    b.useBusinessStore.setState({ data: state }); return state.opportunities.at(-1)!.id;
  }, market);
  for (const route of ['estimate', 'estimate/compare']) {
    await navigate(page, `/opportunities/${deniedId}/${route}`);
    await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
  }
  observations.set(page, { empty: id, invalid: 'OPP-NOT-FOUND', deniedId });
});
