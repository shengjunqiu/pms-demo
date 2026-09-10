import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { navigate, role } from './helpers';
import { artifactDir, capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
type BusinessModule = typeof import('../src/mock/business');
type OrdersModule = typeof import('../src/mock/cost-orders');
type LocksModule = typeof import('../src/mock/construction-lock');
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  prepareArtifacts(); errors.set(page, collectBrowserErrors(page));
  await page.goto('/workbench/project-manager');
  await expect(page.getByRole('heading', { name: '项目经理工作台', exact: true })).toBeVisible();
});
test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors }); expect(consoleErrors).toEqual([]);
});
async function snapshot(page: Page, projectId: string) {
  return page.evaluate(async id => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const s = b.useBusinessStore.getState().data;
    return { project: s.projects.find(p => p.id === id)!, orders: s.costOrders.filter(o => o.projectId === id), costs: s.costs.filter(c => c.projectId === id), labor: s.laborEntries.filter(e => e.projectId === id) };
  }, projectId);
}
async function closeDrawer(page: Page) {
  const close = page.locator('.ant-drawer-close:visible');
  if (await close.count()) { await close.click(); await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0); }
}
async function changeRole(page: Page, name: string) { await closeDrawer(page); await role(page, name); }
async function overlay(page: Page, name: string) {
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 6000 });
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifactDir, `${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function process(page: Page, label: string, progress?: number) {
  await page.getByRole('dialog', { name: '原业务单据', exact: true }).getByRole('button', { name: label, exact: true }).click();
  const modal = page.getByRole('dialog', { name: label, exact: true });
  if (progress !== undefined) await modal.getByLabel('履约完成率', { exact: true }).fill(String(progress));
  await modal.getByLabel('成本办理说明', { exact: true }).fill(`UI验收：${label}，核对原单与预算依据`);
  await modal.getByRole('button', { name: /^确\s*定$/ }).click(); await expect(modal).toBeHidden();
}
for (const [kind, path, label, pageId] of [
  ['procurement', 'procurement', '采购', 'HS10'],
  ['outsource', 'outsourcing', '外包', 'HS11'],
  ['expense', 'expenses', '费用', 'HS12'],
] as const) {
  test(`成本 UI：${label}真实申请、审批与单次入账核算`, async ({ page }) => {
    test.setTimeout(180_000);
    // Read-only selection of a lawful existing project and leaf budget. All business mutations below use UI.
    const fixture = await page.evaluate(async requested => {
      const bp = '/src/mock/business.ts', op = '/src/mock/cost-orders.ts', lp = '/src/mock/construction-lock.ts';
      const b = await import(/* @vite-ignore */ bp) as BusinessModule;
      const o = await import(/* @vite-ignore */ op) as OrdersModule;
      const l = await import(/* @vite-ignore */ lp) as LocksModule;
      const s = b.useBusinessStore.getState().data;
      for (const p of s.projects.filter(p => p.pmId === 'U-001' && !p.isUnsigned && p.phase === '执行' && !l.constructionLockReason(s, p.id))) {
        const budget = s.budgets.find(v => v.projectId === p.id && v.status === '已生效');
        const subject = budget?.items.find(i => o.isCostSubject(requested, i.subjectId) && o.costAvailability(s, p.id, i.subjectId).available > 1);
        if (subject) return { id: p.id, subjectId: subject.subjectId, subjectName: subject.subjectName };
      }
      throw new Error(`缺少合法${requested}预算场景`);
    }, kind);
    const base = `/projects/${fixture.id}/${path}`; const before = await snapshot(page, fixture.id);
    await navigate(page, base); await expect(page.locator('.pms-page-header')).toContainText(fixture.id);
    await capturePageEvidence(page, `UI-${pageId}`);
    await page.getByRole('button', { name: `新建${label}申请`, exact: true }).click();
    const modal = page.getByRole('dialog', { name: `新建${label}申请`, exact: true });
    await modal.getByLabel('成本申请标题', { exact: true }).fill(`UI${label}原单`);
    await modal.locator('.ant-select[aria-label="申请成本科目"] .ant-select-selector').click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: fixture.subjectName }).click();
    await modal.getByLabel('申请金额', { exact: true }).fill('0.01');
    await modal.getByLabel('供应商或收款方', { exact: true }).fill('UI交付服务商');
    if (kind !== 'expense') await modal.getByLabel('采购外包合同号', { exact: true }).fill(`UI-${kind}-001`);
    if (kind === 'outsource') {
      await modal.locator('.ant-select[aria-label="外包关联WBS"] .ant-select-selector').click();
      await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
    }
    await modal.getByLabel('成本申请范围用途', { exact: true }).fill('原WBS交付范围内的验收测试事项');
    await overlay(page, `UI-${pageId}-application`);
    await modal.getByRole('button', { name: /^确\s*定$/ }).click(); await expect(modal).toBeHidden();
    const pending = await snapshot(page, fixture.id); const order = pending.orders.at(-1)!;
    expect(order.status).toBe('待审批'); expect(pending.costs).toEqual(before.costs);
    expect(pending.project.committedCost).toBe(before.project.committedCost);
    await changeRole(page, '财务专员'); await navigate(page, `${base}?source=${order.id}`);
    await process(page, '批准申请');
    const approved = await snapshot(page, fixture.id); expect(approved.project.actualCost).toBe(before.project.actualCost);
    expect(approved.project.committedCost - before.project.committedCost).toBeCloseTo(0.01, 6);
    if (kind !== 'expense') {
      await changeRole(page, '项目经理'); await navigate(page, `${base}?source=${order.id}`);
      await process(page, '更新履约进度', 100); await process(page, '确认验收通过');
      expect((await snapshot(page, fixture.id)).costs).toEqual(before.costs);
      await changeRole(page, '财务专员'); await navigate(page, `${base}?source=${order.id}`);
    }
    await process(page, '确认实际入账'); const posted = await snapshot(page, fixture.id);
    expect(posted.costs.filter(c => c.sourceId === order.id)).toHaveLength(1);
    expect(posted.project.actualCost - before.project.actualCost).toBeCloseTo(0.01, 6);
    expect(posted.project.committedCost).toBeCloseTo(before.project.committedCost, 6);
    expect(posted.project.forecastRemainingCost).toBe(before.project.forecastRemainingCost);
    expect(posted.project.rollingCost).toBeCloseTo(posted.project.actualCost + posted.project.committedCost + posted.project.forecastRemainingCost, 6);
    await expect(page.getByRole('dialog', { name: '原业务单据', exact: true }).getByRole('button', { name: '确认实际入账', exact: true })).toBeDisabled();
    await overlay(page, `UI-${pageId}-posted`); await closeDrawer(page);
    await page.getByRole('button', { name: '查看动态核算', exact: true }).click();
    await expect(page.getByRole('heading', { name: '动态核算', exact: true })).toBeVisible();
    await page.getByLabel('搜索来源凭证', { exact: true }).fill(order.id);
    await page.getByRole('button', { name: order.id, exact: true }).click();
    await expect(page.getByRole('dialog', { name: '原始成本凭证', exact: true })).toContainText('已确认，已计入实际一次');
    await page.getByRole('button', { name: '进入原申请及履约记录', exact: true }).click();
    await expect(page).toHaveURL(`${base}?source=${order.id}`);
  });
}

test('成本 UI：工时待审不计费、PM审核及核算旧深链', async ({ page }) => {
  test.setTimeout(120_000); const before = await snapshot(page, 'P-001');
  await navigate(page, '/projects/P-001/labor-cost');
  await expect(page.getByRole('heading', { name: '工时与人力成本', exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-HS09');
  await page.getByRole('button', { name: '填报本人工时', exact: true }).click();
  const modal = page.getByRole('dialog', { name: '填报本人工时', exact: true });
  await modal.getByLabel('投入小时', { exact: true }).fill('0.5');
  await modal.getByLabel('工时工作内容', { exact: true }).fill('UI工时与实际核算校验');
  await overlay(page, 'UI-HS09-form');
  await modal.getByRole('button', { name: '提交工时审核', exact: true }).click(); await expect(modal).toBeHidden();
  const pending = await snapshot(page, 'P-001'); const entry = pending.labor.at(-1)!;
  expect(pending.costs).toEqual(before.costs);
  await page.getByRole('row').filter({ hasText: 'UI工时与实际核算校验' }).getByRole('button', { name: '原单详情', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: '工时原单与成本依据', exact: true });
  await drawer.getByRole('button', { name: '审核工时通过', exact: true }).click();
  const review = page.getByRole('dialog', { name: '确认工时通过并计费', exact: true });
  await review.getByLabel('工时审核意见', { exact: true }).fill('核对任务与实际投入，确认工时');
  await review.getByRole('button', { name: /^确\s*定$/ }).click(); await expect(review).toBeHidden();
  const posted = await snapshot(page, 'P-001'); expect(posted.costs.filter(c => c.sourceId === entry.id)).toHaveLength(1);
  const approvedEntry = posted.labor.find(e => e.id === entry.id)!;
  expect(approvedEntry.status).toBe('已通过');
  expect(approvedEntry.consumedCommitment).toBeDefined();
  expect(posted.project.actualCost - before.project.actualCost).toBeCloseTo(approvedEntry.amount, 6);
  expect(before.project.committedCost - posted.project.committedCost).toBeCloseTo(approvedEntry.consumedCommitment!, 6);
  expect(posted.project.forecastRemainingCost).toBe(before.project.forecastRemainingCost);
  expect(posted.project.rollingCost - before.project.rollingCost).toBeCloseTo(approvedEntry.amount - approvedEntry.consumedCommitment!, 6);
  await expect(drawer.getByRole('button', { name: '审核工时通过', exact: true })).toBeDisabled();
  await overlay(page, 'UI-HS09-reviewed'); await closeDrawer(page);
  await navigate(page, '/projects/P-001/dynamic-accounting?subject=SUB-01&tab=trend');
  await expect(page.getByRole('tab', { name: '历史成本趋势', exact: true })).toHaveAttribute('aria-selected', 'true');
  await capturePageEvidence(page, 'UI-HS13');
  await page.getByLabel('搜索来源凭证', { exact: true }).fill(entry.id);
  await page.getByRole('button', { name: entry.id, exact: true }).click();
  await overlay(page, 'UI-HS13-source');
  await page.getByRole('button', { name: '进入工时原单与成本基准', exact: true }).click();
  await expect(page).toHaveURL(`/projects/P-001/labor-cost?entry=${entry.id}`);
});
