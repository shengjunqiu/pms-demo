import { expect, test, type Page } from '@playwright/test';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role as selectRole } from './helpers';

type BusinessModule = typeof import('../src/mock/business');
type AcceptanceModule = typeof import('../src/mock/acceptance');
const errors = new WeakMap<Page, string[]>();
const observations = new WeakMap<Page, Record<string, unknown>>();
const base = '/projects/P-006';

test.beforeEach(({ page }) => {
  prepareArtifacts();
  errors.set(page, collectBrowserErrors(page));
});
test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors, observations: observations.get(page) ?? {} });
  expect(consoleErrors).toEqual([]);
});

async function closeDrawer(page: Page) {
  const close = page.locator('.ant-drawer-open .ant-drawer-close');
  if (new URL(page.url()).searchParams.has('record')) {
    await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 6000 });
    await close.click();
  }
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
}
async function role(page: Page, name: string) {
  await closeDrawer(page);
  await selectRole(page, name);
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const { useBusinessStore } = await import(/* @vite-ignore */ path) as BusinessModule;
    const state = useBusinessStore.getState().data;
    return {
      acceptances: state.acceptances.filter(a => a.projectId === 'P-006'),
      details: state.acceptanceDetails,
      costs: state.costs.filter(c => c.projectId === 'P-006'),
      orders: state.costOrders.filter(o => o.projectId === 'P-006'),
    };
  });
}
async function confirm(page: Page) {
  await page.locator('.ant-modal:visible').getByRole('button', { name: '确认提交', exact: true }).click();
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
}
async function fillApplication(page: Page, scope: string) {
  await page.getByLabel('验收范围', { exact: true }).fill(scope);
  await page.getByLabel('计划验收时间', { exact: true }).fill('2026-09-10');
  await page.getByLabel('验收参与人员', { exact: true }).fill('张建国、采购、技术与测试验收组');
}
async function fillReview(page: Page, names: string[]) {
  for (const name of names) {
    await page.getByLabel(`${name}通过`, { exact: true }).check();
    await page.getByLabel(`${name}依据`, { exact: true }).fill(`${name}依据现场记录逐项核对符合`);
  }
  await page.getByLabel('验收过程记录', { exact: true }).fill('验收组现场复核功能和交付文档，逐项记录结果');
  await page.getByLabel('验收意见', { exact: true }).fill('已完成逐项复核，结果详见检查记录');
}
async function capture(page: Page, name: string, path: string) {
  await navigate(page, path);
  await closeDrawer(page);
  return capturePageEvidence(page, name);
}

test('JS01内部整改必须回复后复验，旧轮次与新结论保留', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/workbench/project-manager');
  await navigate(page, `${base}/internal-acceptance`);
  const before = await snapshot(page);
  await page.getByRole('button', { name: '发起内部初验', exact: true }).click();
  await fillApplication(page, '园区内部功能、性能、安全与文档复核');
  await confirm(page);
  const oldId = new URL(page.url()).searchParams.get('record')!;
  expect(oldId).toBeTruthy();
  await role(page, 'PMO负责人');
  await navigate(page, `${base}/internal-acceptance?record=${oldId}`);
  await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  await fillReview(page, ['功能', '性能', '安全', '文档']);
  await page.getByLabel('文档通过', { exact: true }).uncheck();
  const dialog = page.locator('.ant-modal:visible');
  await dialog.locator('.ant-form-item').filter({ has: page.getByText('验收结论', { exact: true }) }).locator('.ant-select').click();
  await page.locator('.ant-select-dropdown:visible').getByText('整改后复验', { exact: true }).click();
  await dialog.locator('.ant-form-item').filter({ has: page.getByText('整改内容', { exact: true }) }).locator('textarea').fill('补齐内部运维操作手册及复核签审记录');
  await confirm(page);
  await role(page, '项目经理');
  await navigate(page, `${base}/internal-acceptance?record=${oldId}`);
  await page.getByRole('button', { name: '整改后发起新轮次', exact: true }).click();
  await confirmBlocked(page, '须先回复全部整改项再申请新轮次');
  await page.locator('.ant-modal:visible').getByRole('button', { name: /^取\s*消$/ }).click();
  await page.getByRole('button', { name: '回复整改清单', exact: true }).click();
  await page.getByLabel('整改回复', { exact: true }).fill('内部操作手册已补齐，复核签审记录完整，申请复验');
  await confirm(page);
  const rectified = await snapshot(page);
  await page.getByRole('button', { name: '整改后发起新轮次', exact: true }).click();
  await fillApplication(page, '内部操作手册整改后的完整范围复验');
  await confirm(page);
  const nextId = new URL(page.url()).searchParams.get('record')!;
  expect(nextId).not.toBe(oldId);
  await role(page, 'PMO负责人');
  await navigate(page, `${base}/internal-acceptance?record=${nextId}`);
  await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  await fillReview(page, ['功能', '性能', '安全', '文档']);
  await confirm(page);
  const after = await snapshot(page);
  expect(after.acceptances).toHaveLength(before.acceptances.length + 2);
  expect(after.acceptances.find(a => a.id === oldId)?.status).toBe('整改中');
  expect(after.details[oldId]).toEqual(rectified.details[oldId]);
  expect(after.acceptances.find(a => a.id === nextId)?.status).toBe('已通过');
  expect(after.details[nextId].previousId).toBe(oldId);
  expect(after.costs).toEqual(before.costs);
  await navigate(page, `${base}/internal-acceptance?record=${oldId}`);
  await expect(page.getByText('补齐内部运维操作手册及复核签审记录', { exact: true })).toBeVisible();
  observations.set(page, { oldId, nextId, screenshots: await capture(page, 'JS01-internal-reinspection-passed', `${base}/internal-acceptance`) });
});

async function confirmBlocked(page: Page, text: string) {
  await page.locator('.ant-modal:visible').getByRole('button', { name: '确认提交', exact: true }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.locator('.ant-modal:visible')).toHaveCount(1);
}

// Procurement is an upstream prerequisite prepared through authentic transitions.
// This is NOT evidence of procurement/finance UI acceptance; JS02 actions below use UI only.
async function prepareSupplier(page: Page) {
  await page.goto('/workbench/project-manager');
  return page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const acceptancePath = '/src/mock/acceptance.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    const acceptance = await import(/* @vite-ignore */ acceptancePath) as AcceptanceModule;
    const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
    const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };
    let state = business.createBusinessState();
    if (acceptance.acceptanceConditions(state, 'P-006', '供应商验收').some(c => !c.passed)) throw new Error('P006历史准入条件不满足');
    state = business.transition(state, { type: 'dispose-settlement-balance', projectId: 'P-006', subjectId: 'SUB-03', bucket: '承诺', disposition: '取消不发生', amount: 1, evidence: '旧配件采购取消1万元，供应商取消确认函.pdf' }, finance);
    state = business.transition(state, { type: 'submit-cost-order', projectId: 'P-006', kind: 'procurement', subjectId: 'SUB-03', title: '园区替换配件采购', amount: 1, supplier: '园区设备服务商', contractNo: 'JS02-E2E-CG-001', scope: '替换配件与技术资料', dueDate: '2026-09-20' }, pm);
    const id = state.costOrders.at(-1)!.id;
    state = business.transition(state, { type: 'process-cost-order', id, operation: 'approve', note: '取消旧采购并核准替换配件预算' }, finance);
    state = business.transition(state, { type: 'process-cost-order', id, operation: 'progress', progress: 100, note: '配件与随货技术资料全部到货' }, pm);
    business.useBusinessStore.setState({ data: state });
    return id;
  });
}

test('JS02动态采购验收缺证明阻断，通过只同步履约不增加成本', async ({ page }) => {
  test.setTimeout(90_000);
  const orderId = await prepareSupplier(page);
  await navigate(page, `${base}/supplier-acceptance`);
  const before = await snapshot(page);
  await page.getByRole('button', { name: '发起供应商验收', exact: true }).click();
  await fillApplication(page, '替换配件及随货资料履约验收');
  await page.getByRole('combobox', { name: '供应商原合同', exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'JS02-E2E-CG-001' }).click();
  await confirm(page);
  let id = new URL(page.url()).searchParams.get('record')!;
  await expect(page.getByRole('button', { name: '登记验收结论', exact: true })).toBeDisabled();
  await role(page, 'PMO负责人');
  await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  await fillReview(page, ['数量', '质量及技术参数', '服务', '交付时间', '成果及文档']);
  const pending = await snapshot(page);
  await confirmBlocked(page, '供应商验收通过须登记有效验收证明文件名');
  expect(await snapshot(page)).toEqual(pending);
  const originalId = id;
  const reviewDialog = page.locator('.ant-modal:visible');
  await reviewDialog.locator('.ant-form-item').filter({ has: page.getByText('验收结论', { exact: true }) }).locator('.ant-select').click();
  await page.locator('.ant-select-dropdown:visible').getByText('整改后复验', { exact: true }).click();
  await reviewDialog.locator('.ant-form-item').filter({ has: page.getByText('整改内容', { exact: true }) }).locator('textarea').fill('补齐供应商交付文档与设备序列号清单');
  await confirm(page);
  await role(page, '项目经理');
  await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  await page.getByRole('button', { name: '回复整改清单', exact: true }).click();
  await page.getByLabel('整改回复', { exact: true }).fill('供应商文档与序列号已补齐，逐项复核一致');
  await confirm(page);
  await page.getByRole('button', { name: '整改后发起新轮次', exact: true }).click();
  await fillApplication(page, '供应商文档与序列号整改复验');
  await confirm(page);
  id = new URL(page.url()).searchParams.get('record')!;
  expect(id).not.toBe(originalId);
  await role(page, 'PMO负责人');
  await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  await fillReview(page, ['数量', '质量及技术参数', '服务', '交付时间', '成果及文档']);
  await page.getByLabel('供应商验收证明', { exact: true }).fill('供应商履约验收证明.pdf');
  await confirm(page);
  const after = await snapshot(page);
  expect(after.orders.find(o => o.id === orderId)?.status).toBe('验收通过');
  expect(after.details[id].supplierSourceId).toBe(orderId);
  expect(after.details[id].previousId).toBe(originalId);
  expect(after.acceptances.find(a => a.id === originalId)?.status).toBe('整改中');
  expect(after.acceptances.find(a => a.id === id)?.status).toBe('已通过');
  expect(after.costs).toEqual(before.costs);
  await expect(page.getByRole('button', { name: '登记验收结论', exact: true })).toBeDisabled();
  const screenshots = await capture(page, 'JS02-dynamic-supplier-passed', `${base}/supplier-acceptance`);
  await page.getByRole('tab', { name: /供应商原合同/ }).click();
  const sourceRow = page.locator('.ant-table-tbody > tr').filter({ hasText: 'JS02-E2E-CG-001' });
  await expect(sourceRow).toContainText('验收通过');
  await sourceRow.getByRole('button', { name: '查看原单', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/P-006/procurement\\?source=${orderId}`));
  observations.set(page, { orderId, acceptanceId: id, screenshots, upstreamPreparation: '真实成本transition；不作为上游UI验收证据' });
});

test('JS01/02筛选空态、错误记录、未知项目和只读角色', async ({ page }) => {
  await page.goto('/workbench/project-manager');
  const screenshots: Record<string, unknown> = {};
  await navigate(page, '/projects/P-PLAN-001/supplier-acceptance');
  await expect(page.getByText('供应商验收不适用：本项目无采购、外包或供应商交付合同。', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '发起供应商验收', exact: true })).toBeDisabled();
  for (const path of ['internal-acceptance', 'supplier-acceptance']) {
    await navigate(page, `${base}/${path}`);
    await expect(page.locator('.pms-page-header')).toContainText('P-006');
    await closeDrawer(page);
    await page.getByLabel('验收查询', { exact: true }).fill('NO-SUCH-ACCEPTANCE');
    await expect(page.locator('.ant-table-placeholder')).toContainText('暂无数据');
    screenshots[path] = await capturePageEvidence(page, `JS-${path}-empty`);
    await navigate(page, `${base}/${path}?record=UNKNOWN`);
    await expect(page.getByText('验收记录不存在', { exact: true })).toBeVisible();
  }
  await role(page, '财务专员');
  await navigate(page, `${base}/internal-acceptance`);
  await expect(page.getByRole('button', { name: '发起内部初验', exact: true })).toBeDisabled();
  await navigate(page, `${base}/supplier-acceptance`);
  await expect(page.getByRole('button', { name: '发起供应商验收', exact: true })).toBeDisabled();
  await role(page, '方案架构师');
  for (const path of ['internal-acceptance', 'supplier-acceptance']) {
    await navigate(page, `${base}/${path}`);
    await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
  }
  await role(page, '项目经理');
  await navigate(page, '/projects/UNKNOWN/internal-acceptance');
  await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
  observations.set(page, { screenshots });
});
