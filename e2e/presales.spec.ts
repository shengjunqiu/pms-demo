import { expect, test, type Page, type Locator } from '@playwright/test';
import type { Actor } from '../src/mock/business';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';

type BusinessModule = typeof import('../src/mock/business');
type OpportunityModule = typeof import('../src/mock/opportunities');
const errors = new WeakMap<Page, string[]>();
const observations = new WeakMap<Page, Record<string, unknown>>();
test.beforeEach(({ page }) => { prepareArtifacts(); errors.set(page, collectBrowserErrors(page)); });
test.afterEach(({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors, observations: observations.get(page) ?? {} });
  expect(consoleErrors).toEqual([]);
});

// Only GS-01/04 prerequisites are seeded. Every GS-05/06/07 mutation uses UI.
async function seed(page: Page) {
  await page.goto('/opportunities');
  return page.evaluate(async () => {
    const path = '/src/mock/business.ts'; const oppPath = '/src/mock/opportunities.ts';
    const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const { DIMENSIONS } = await import(/* @vite-ignore */ oppPath) as OpportunityModule;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    let state = b.createBusinessState(); const ids: string[] = [];
    for (const name of ['验收接口协同平台', '验收独立知识平台']) {
      state = b.transition(state, { type: 'save-opportunity', submit: true, duplicateConfirmed: true, input: {
        name, customerId: 'CUST-001', departmentId: 'D-002', ownerId: 'U-006', estimatedAmount: 1000,
        expectedSignDate: '2026-11-30', winRate: 80, source: '客户需求', projectType: '软件开发',
        description: '跨部门接口整合和统一门户建设', competition: '客户比选', businessLine: '数字政务', region: '福建省', collaborators: ['U-005'], attachments: ['需求纪要.pdf'],
      } }, market);
      const id = state.opportunities.at(-1)!.id; ids.push(id);
      state = b.transition(state, { type: 'start-opportunity-assessment', id }, market);
      for (const d of DIMENSIONS) state = b.transition(state, { type: 'save-opportunity-dimension', id, dimension: d.key, opinion: { score: 85, conclusion: '可行', risk: '', note: '专业条件核实通过', attachment: '', preliminaryCost: d.key === 'margin' ? 650 : undefined } }, d.role === 'market' ? market : d.role === 'finance' ? finance : tech);
      state = b.transition(state, { type: 'conclude-opportunity', id, conclusion: '拟立项', reason: '完成初评，进入方案调研' }, market);
    }
    b.useBusinessStore.setState({ data: state }); return ids;
  });
}
async function snapshot(page: Page, id: string) {
  return page.evaluate(async target => {
    const path = '/src/mock/business.ts'; const { useBusinessStore } = await import(/* @vite-ignore */ path) as BusinessModule;
    const state = useBusinessStore.getState().data;
    return { workspace: state.presales[target], task: state.opportunityMeta[target]?.solutionTask };
  }, id);
}
const pane = (page: Page) => page.locator('.ant-tabs-tabpane-active');
async function choose(page: Page, container: Locator, label: string, option: string) {
  await container.getByLabel(label, { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible').getByText(option, { exact: true }).click();
}
async function confirm(page: Page) {
  await page.locator('.ant-modal-confirm:visible').getByRole('button', { name: /确\s*定/ }).click();
}
async function saveSolution(page: Page) {
  const values: Record<string, string> = { '客户现状': '多个业务系统分散', '建设目标': '统一门户与20个数据接口', '交付范围': '20个接口和统一门户', '交付边界与约束': '不含历史数据清洗', '总体技术架构': '微服务与统一身份认证', '实施思路': '调研、迭代、试运行', '主要交付物': '接口文档、部署包和测试报告', '外部依赖': '客户提供测试环境', '关键假设': '接口稳定开放' };
  for (const [label, value] of Object.entries(values)) await page.getByLabel(label, { exact: true }).fill(value);
  await pane(page).locator('input[type="file"]').setInputFiles({ name: '正式方案V1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('acceptance solution') });
  await page.getByRole('button', { name: '保存方案草稿', exact: true }).click();
  await expect(page.getByText('方案草稿已保存，成本测算需引用本次范围', { exact: true })).toBeVisible();
}
async function financeCheck(page: Page, id: string, checkEmpty = false) {
  await role(page, '财务专员'); await navigate(page, `/opportunities/${id}/tech-cost`);
  await page.getByRole('tab', { name: '财务成本核对' }).click();
  if (checkEmpty) {
    await page.getByRole('button', { name: '确认当前测算', exact: true }).click(); await confirm(page);
    await expect(page.getByText('需有成本明细且财务意见必填', { exact: true })).toBeVisible();
    expect((await snapshot(page, id)).workspace.costDraft?.financeCheck).toBeUndefined();
    await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  }
  await page.getByPlaceholder('确认成本口径、单价来源、询价有效期与范围覆盖').fill('核对数量、统一人力基准、采购含税换算与交付范围');
  await page.getByRole('button', { name: '确认当前测算', exact: true }).click(); await confirm(page);
  await expect.poll(async () => (await snapshot(page, id)).workspace.costDraft?.financeCheck?.opinion).toContain('核对数量');
}
async function startReview(page: Page, id: string, next = false) {
  await role(page, 'PMO负责人'); await navigate(page, `/opportunities/${id}/review`);
  await page.getByRole('button', { name: next ? '发起新一轮评审' : '发起专家评审', exact: true }).click();
  await page.getByRole('dialog', { name: '组织专家评审', exact: true }).getByRole('button', { name: '确认提交' }).click(); await confirm(page);
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
}
async function opinion(page: Page, id: string, who: string, result: string) {
  await role(page, who); await navigate(page, `/opportunities/${id}/review`);
  await page.getByRole('button', { name: '提交本人专家意见' }).click();
  const dialog = page.getByRole('dialog', { name: '本人专家意见', exact: true });
  await choose(page, dialog, '评审结论', result);
  await dialog.getByLabel('专家独立意见', { exact: true }).fill(`${who}独立核对：${result === '整改' ? '补充接口鉴权与人力投入' : '方案与成本合理，同意通过'}`);
  await dialog.getByRole('button', { name: '确认提交' }).click();
  await expect(page.getByRole('button', { name: '提交本人专家意见' })).toBeDisabled();
}
async function decision(page: Page, id: string, correction: boolean) {
  await role(page, 'PMO负责人'); await navigate(page, `/opportunities/${id}/review`);
  await page.getByRole('button', { name: '形成综合评审结论' }).click();
  const dialog = page.getByRole('dialog', { name: '综合评审结论', exact: true });
  await choose(page, dialog, '评审结论', correction ? '整改后复审' : '通过');
  await dialog.getByLabel('综合结论说明').fill(correction ? '补充鉴权设计与投入后复审' : '两位专家一致通过，进入概算');
  if (correction) await dialog.getByLabel('整改事项', { exact: true }).fill('补充接口鉴权设计与10人天投入');
  await dialog.getByRole('button', { name: '确认提交' }).click(); await confirm(page);
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
}

test('GS-05/06/07 调研、数量单价、财务核对、冻结评审、整改复审及旧快照', async ({ page }) => {
  // Two complete review rounds, eight role changes and six dual-width captures.
  test.setTimeout(180_000);
  const [id, secondId] = await seed(page);
  await role(page, '方案架构师'); await navigate(page, `/opportunities/${id}/solution`);
  await page.getByRole('tab', { name: /需求调研记录/ }).click(); await page.getByRole('button', { name: '追加客户调研' }).click();
  const research = page.getByRole('dialog', { name: '追加需求调研' });
  await research.getByLabel('客户沟通与调研发现').fill('确认20个接口、统一门户及客户环境责任');
  await research.getByLabel('范围变化与约束').fill('不含历史数据清洗');
  await research.getByRole('button', { name: /确\s*定/ }).click();
  await expect(pane(page)).toContainText('确认20个接口');
  await page.getByRole('tab', { name: '方案编制' }).click(); await saveSolution(page);
  await navigate(page, `/opportunities/${secondId}/solution`);
  await expect(page.getByLabel('建设目标', { exact: true })).toBeEmpty();
  await navigate(page, `/opportunities/${id}/solution`);
  await expect(page.getByLabel('建设目标', { exact: true })).toHaveValue('统一门户与20个数据接口');
  const shots: Record<string, unknown> = { solution: await capturePageEvidence(page, 'GS-05') };
  await page.getByRole('link', { name: '技术与成本评估', exact: true }).click();
  for (const label of ['架构与产品版本', '现有产品可复用程度', '定制开发与集成难度', '部署环境与资源可用性', '安全合规与质量要求', '第三方依赖与交付条件']) await page.getByLabel(label, { exact: true }).fill(`${label}已核实，覆盖20接口`);
  await page.getByLabel('技术风险与关键成本假设').fill('客户测试环境交付存在延期风险');
  await page.getByRole('tab', { name: /成本明细/ }).click();
  await page.getByRole('button', { name: '新增成本项', exact: true }).click();
  let line = page.getByRole('dialog', { name: '新增成本项', exact: true });
  await line.getByLabel('测算项名称').fill('接口开发人力'); await line.getByLabel('投入人天', { exact: true }).fill('100');
  await line.getByLabel('角色 / 职级').fill('高级研发'); await line.getByLabel('测算依据 / 工期假设').fill('2人50天，统一成本基准');
  await line.getByRole('button', { name: /确\s*定/ }).click();
  await page.getByRole('button', { name: '新增成本项', exact: true }).click(); line = page.getByRole('dialog', { name: '新增成本项', exact: true });
  await line.getByLabel('统一成本科目').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '采购' }).click();
  await line.getByLabel('测算项名称').fill('集成网关'); await line.getByLabel('数量', { exact: true }).fill('2');
  await line.getByLabel('单位', { exact: true }).fill('套'); await line.getByLabel('单价（万元）').fill('10');
  await line.getByLabel('税率（%）').fill('13'); await choose(page, line, '单价口径', '不含税');
  await line.getByLabel('询价供应商').fill('数字基础设施供应商'); await line.getByLabel('询价来源 / 编号').fill('Q-20260909');
  await line.getByLabel('报价有效期').fill('2026-10-09'); await line.getByLabel('报价有效期').press('Enter');
  await line.getByLabel('测算依据 / 工期假设').fill('厂商书面询价'); await line.getByRole('button', { name: /确\s*定/ }).click();
  await pane(page).getByRole('button', { name: '保存技术与成本草稿' }).click();
  await expect.poll(async () => (await snapshot(page, id)).workspace.costDraft?.lines.length).toBe(2);
  const saved = (await snapshot(page, id)).workspace.costDraft!;
  expect(saved.lines[0].unitPrice).toBe(0.144); expect(saved.lines[0].baselineVersion).toBeTruthy();
  expect(saved.lines[1].quantity * saved.lines[1].unitPrice * 1.13).toBeCloseTo(22.6);
  await expect(pane(page).locator('tr').filter({ hasText: '集成网关' })).toContainText('22.60');
  shots.cost = await capturePageEvidence(page, 'GS-06');
  await navigate(page, `/opportunities/${secondId}/tech-cost`); await page.getByRole('tab', { name: /成本明细/ }).click();
  await expect(pane(page).getByText('集成网关', { exact: true })).toHaveCount(0);
  await role(page, 'PMO负责人'); await navigate(page, `/opportunities/${id}/review`);
  await expect(page.getByRole('button', { name: '发起专家评审', exact: true })).toBeDisabled();
  await financeCheck(page, id, true); await startReview(page, id);
  const frozen = (await snapshot(page, id)).workspace;
  expect(frozen.costVersions[0].total).toBe(37); expect(frozen.reviews[0].opinions).toHaveLength(0);
  expect(frozen.solutionVersions[0]).toMatchObject({ modifiedBy: '赵工', submittedBy: '李主任' });
  await page.getByRole('button', { name: '形成综合评审结论' }).click();
  const premature = page.getByRole('dialog', { name: '综合评审结论', exact: true });
  await premature.getByLabel('综合结论说明').fill('测试专家意见未齐全的阻断');
  await premature.getByRole('button', { name: '确认提交' }).click(); await confirm(page);
  await expect(page.getByText('专家意见尚未齐全', { exact: true })).toBeVisible();
  expect((await snapshot(page, id)).workspace.reviews[0].status).toBe('评审中');
  await premature.getByRole('button', { name: /取\s*消/ }).click();
  await role(page, '方案架构师'); await navigate(page, `/opportunities/${id}/solution`);
  await expect(page.getByRole('button', { name: '保存方案草稿' })).toBeDisabled();
  await opinion(page, id, '方案架构师', '整改'); await opinion(page, id, '财务专员', '通过'); await decision(page, id, true);
  await role(page, '方案架构师'); await navigate(page, `/opportunities/${id}/review`);
  await page.getByRole('tab', { name: /整改事项/ }).click(); await page.getByRole('button', { name: '追加回复' }).click();
  const reply = page.getByRole('dialog', { name: '整改回复', exact: true });
  await reply.getByLabel('整改响应及落实结果').fill('已补充接口鉴权与10人天投入，申请复审'); await reply.getByRole('button', { name: '确认提交' }).click();
  shots.corrections = await capturePageEvidence(page, 'GS-07-corrections');
  await page.getByRole('link', { name: '响应整改并修改方案' }).click();
  await page.getByLabel('总体技术架构', { exact: true }).fill('微服务、统一身份认证及接口鉴权');
  await page.getByLabel('版本修改说明').fill('落实首轮鉴权整改'); await page.getByRole('button', { name: '保存方案草稿' }).click();
  await page.getByRole('link', { name: '技术与成本评估', exact: true }).click();
  await expect(page.getByText('方案范围已变化，当前成本失去最新范围关联', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /成本明细/ }).click();
  await pane(page).locator('tr').filter({ hasText: '接口开发人力' }).getByRole('button', { name: /编\s*辑/ }).click();
  const edit = page.getByRole('dialog', { name: '编辑成本项', exact: true }); await edit.getByLabel('投入人天', { exact: true }).fill('110'); await edit.getByRole('button', { name: /确\s*定/ }).click();
  await pane(page).getByRole('button', { name: '保存技术与成本草稿' }).click();
  expect((await snapshot(page, id)).workspace.costDraft?.financeCheck).toBeUndefined();
  await financeCheck(page, id); await startReview(page, id, true);
  await opinion(page, id, '方案架构师', '通过'); await opinion(page, id, '财务专员', '通过'); await decision(page, id, false);
  const after = await snapshot(page, id);
  expect(after.workspace.solutionVersions[0]).toEqual(frozen.solutionVersions[0]); expect(after.workspace.costVersions[0]).toEqual(frozen.costVersions[0]);
  expect(after.workspace.reviews).toHaveLength(2); expect(after.workspace.reviews[0].status).toBe('整改后复审'); expect(after.workspace.reviews[0].corrections[0].replies).toHaveLength(1);
  expect(after.workspace.reviews[1].opinions.map(o => o.userId).sort()).toEqual(['U-004', 'U-005']);
  expect(after.workspace.costVersions[1].total).toBe(38.44); expect(after.task?.status).toBe('已完成');
  shots.review = await capturePageEvidence(page, 'GS-07');
  await page.getByRole('button', { name: '第1轮', exact: true }).click(); await expect(page.getByText('当前查看：第1轮 · 整改后复审', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '提交本人专家意见' })).toHaveCount(0);
  await page.getByRole('link', { name: '承接通过版本编制概算' }).click(); await expect(page).toHaveURL(`/opportunities/${id}/estimate`);
  await expect(page.getByRole('heading', { name: /项目概算/ })).toBeVisible();
  observations.set(page, { id, screenshots: shots, firstCost: 37, secondCost: 38.44, reviewRounds: after.workspace.reviews });
});

test('GS-05/06/07 客户经理只读方案成本，错误商机展示404', async ({ page }) => {
  const [id] = await seed(page); await role(page, '客户经理');
  await navigate(page, `/opportunities/${id}/solution`); await expect(page.getByRole('button', { name: '保存方案草稿' })).toBeDisabled();
  await navigate(page, `/opportunities/${id}/tech-cost`); await expect(page.getByRole('button', { name: '保存技术与成本草稿' })).toBeDisabled();
  await navigate(page, `/opportunities/${id}/review`); await expect(page.getByRole('button', { name: '发起专家评审' })).toHaveCount(0);
  for (const route of ['solution', 'tech-cost', 'review']) {
    await navigate(page, `/opportunities/OPP-NOT-FOUND/${route}`); await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
  }
  observations.set(page, { readOnly: ['solution', 'tech-cost', 'review'], invalidIds: 'all three return 404' });
});
