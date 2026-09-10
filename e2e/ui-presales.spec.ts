import { expect, test } from '@playwright/test';
import type { Actor, BusinessAction } from '../src/mock/business-domain';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';

type BusinessModule = typeof import('../src/mock/business');

test('售前 UI：双宽分区、冻结版本深链与历史轮次一致', async ({ page }, info) => {
  test.setTimeout(90_000);
  prepareArtifacts();
  const consoleErrors = collectBrowserErrors(page);
  await page.goto('/opportunities');
  // The existing presales suite covers every mutation through UI. This short
  // scenario creates valid frozen inputs through transitions to inspect navigation.
  const fixture = await page.evaluate(async () => {
    const modulePath = '/src/mock/business.ts';
    const b = await import(/* @vite-ignore */ modulePath) as BusinessModule;
    let state = b.createBusinessState();
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    const act = (action: BusinessAction, actor: Actor) => { state = b.transition(state, action, actor); };
    act({ type: 'save-opportunity', submit: true, input: { name: 'UI售前版本导航项目', customerId: 'CUST-001', departmentId: 'D-002', ownerId: 'U-006', estimatedAmount: 1000, expectedSignDate: '2026-11-30', winRate: 80, source: '客户需求', projectType: '软件开发', description: '统一门户', competition: '公开比选', businessLine: '数字政务', region: '福建省', collaborators: ['U-005'], attachments: ['需求.pdf'] } }, market);
    const id = state.opportunities.at(-1)!.id;
    act({ type: 'start-opportunity-assessment', id }, market);
    for (const dimension of ['customer', 'commercial', 'competition', 'technology', 'delivery', 'margin'] as const) act({ type: 'save-opportunity-dimension', id, dimension, opinion: { score: 85, conclusion: '可行', note: '专业条件已核实', risk: '', attachment: '', preliminaryCost: dimension === 'margin' ? 600 : undefined } }, dimension === 'margin' ? finance : ['technology', 'delivery'].includes(dimension) ? tech : market);
    act({ type: 'conclude-opportunity', id, conclusion: '拟立项', reason: '条件已齐备' }, market);
    for (const round of [1, 2]) {
      act({ type: 'presales-save-solution', id, draft: { customerSituation: '分散系统', goals: '统一门户', scope: '门户与接口', boundaries: '不含历史清理', architecture: `门户架构V${round}`, implementation: '迭代交付', deliverables: '部署包', dependencies: '客户环境', assumptions: '接口开放', ownerId: 'U-005', participants: ['U-006'], startDate: '2026-09-09', endDate: '2026-09-20', attachments: [`方案V${round}.pdf`], changeReason: round === 2 ? '补充架构说明' : '' } }, tech);
      act({ type: 'presales-save-cost', id, draft: { solutionFingerprint: '', feasibility: '可行', architecture: '门户V3', reuse: '复用平台', customization: '接口开发', environment: '客户环境', security: '访问审计', dependencies: '接口开放', risk: '', attachments: ['成本.pdf'], lines: [{ id: 'UI-L1', subjectId: 'SUB-01', name: '门户开发', scope: '门户与接口', quantity: 100, unit: '人天', unitPrice: 0, taxRate: 0, taxBasis: '含税', basis: '2人50天', risk: '', laborUserId: 'U-005', laborGrade: '高级研发' }] } }, tech);
      act({ type: 'presales-finance-check', id, opinion: '核对成本来源' }, finance);
      act({ type: 'presales-submit-review', id, method: '线上专家评审会', plannedDate: '2026-09-10', expertIds: ['U-005', 'U-004'] }, pmo);
      const reviewId = state.presales[id].reviews.at(-1)!.id;
      if (round === 1) {
        for (const expert of [tech, finance]) act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: '本专业条件满足', attachment: '' }, expert);
        act({ type: 'presales-review-decision', id, reviewId, conclusion: '不通过', reason: '补充架构说明后重新评审', corrections: [] }, pmo);
      }
    }
    b.useBusinessStore.setState({ data: state });
    return { id, solution: state.presales[id].solutionVersions[0].id, cost: state.presales[id].costVersions[0].id, first: state.presales[id].reviews[0].id, latest: state.presales[id].reviews[1].id };
  });
  await role(page, '方案架构师');
  const base = `/opportunities/${fixture.id}`;
  await navigate(page, `${base}/solution`);
  await expect(page.getByRole('heading', { name: '客户与交付范围', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存方案草稿', exact: true })).toBeDisabled();
  const screenshots: Record<string, unknown> = { solution: await capturePageEvidence(page, 'UI-GS05') };
  // Re-enter the page so the legacy direct-link entry is exercised.
  await navigate(page, `${base}/tech-cost`);
  await navigate(page, `${base}/solution?version=${fixture.solution}`);
  await expect(page.getByRole('dialog', { name: '方案历史快照 V1', exact: true })).toContainText('门户架构V1');
  await page.getByRole('dialog').getByRole('button', { name: /^关\s*闭$/ }).click();
  await expect(page).toHaveURL(`${base}/solution`);
  await page.getByRole('link', { name: '技术与成本评估', exact: true }).click();
  await expect(page.locator('.pms-record-summary')).toContainText('当前草稿成本');
  await page.getByRole('tab', { name: /成本明细/ }).click();
  await expect(page.getByRole('button', { name: '新增成本项', exact: true })).toBeDisabled();
  screenshots.cost = await capturePageEvidence(page, 'UI-GS06');
  await navigate(page, `${base}/solution`);
  await navigate(page, `${base}/tech-cost?version=${fixture.cost}`);
  await expect(page.getByRole('tab', { name: /历史成本快照/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ant-table-expanded-row').getByText('门户开发', { exact: true })).toBeVisible();
  await navigate(page, `${base}/review?review=${fixture.first}`);
  await expect(page.getByText('当前查看：第1轮 · 不通过', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '提交本人专家意见', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '第2轮', exact: true }).click();
  await expect(page).toHaveURL(`${base}/review?review=${fixture.latest}`);
  await expect(page.getByRole('button', { name: '提交本人专家意见', exact: true })).toBeEnabled();
  screenshots.review = await capturePageEvidence(page, 'UI-GS07');
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const box = await page.getByRole('button', { name: '提交本人专家意见', exact: true }).boundingBox();
    expect(box && box.y + box.height).toBeLessThan(900);
  }
  await page.getByRole('button', { name: '第1轮', exact: true }).click();
  await expect(page).toHaveURL(`${base}/review?review=${fixture.first}`);
  await expect(page.getByRole('button', { name: '提交本人专家意见', exact: true })).toHaveCount(0);
  writeBrowserReport(info, { fixture, screenshots, consoleErrors });
  expect(consoleErrors).toEqual([]);
});
