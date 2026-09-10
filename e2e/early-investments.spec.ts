import { expect, test, type Page } from '@playwright/test';
import type { Actor, BusinessAction } from '../src/mock/business-domain';
import type { SolutionDraft, CostDraft } from '../src/models/presales';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';

type BusinessModule = typeof import('../src/mock/business');

// Build every source version through domain actions; never synthesize approved reviews.
async function seed(page: Page) {
  await page.goto('/opportunities');
  const id = await page.evaluate(async () => {
    const modulePath = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ modulePath) as BusinessModule;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    let state = business.createBusinessState();
    const act = (action: BusinessAction, actor: Actor) => { state = business.transition(state, action, actor); };
    act({ type: 'save-opportunity', submit: true, input: {
      name: '提前投入验收数据共享项目', customerId: 'CUST-001', departmentId: 'D-002', ownerId: 'U-006',
      estimatedAmount: 1000, expectedSignDate: '2026-11-30', winRate: 80, source: '客户需求',
      projectType: '软件开发', description: '整合跨部门数据', competition: '公开比选',
      businessLine: '数字政务', region: '福建省', collaborators: ['U-005'], attachments: ['需求.pdf'],
    } }, market);
    const id = state.opportunities.at(-1)!.id;
    act({ type: 'start-opportunity-assessment', id }, market);
    for (const dimension of ['customer', 'commercial', 'competition', 'technology', 'delivery', 'margin'] as const) {
      act({ type: 'save-opportunity-dimension', id, dimension, opinion: {
        score: 85, conclusion: '可行', risk: '', note: '专业条件核对完成', attachment: '',
        preliminaryCost: dimension === 'margin' ? 600 : undefined,
      } }, dimension === 'margin' ? finance : ['technology', 'delivery'].includes(dimension) ? tech : market);
    }
    act({ type: 'conclude-opportunity', id, conclusion: '拟立项', reason: '六维条件完成，进入方案调研' }, market);
    const solution: SolutionDraft = {
      customerSituation: '多套系统孤立', goals: '统一数据共享', scope: '20个接口', boundaries: '不含历史清洗',
      architecture: '微服务', implementation: '调研、迭代、试运行', deliverables: '接口文档、部署包',
      dependencies: '客户提供环境', assumptions: '接口稳定开放', ownerId: 'U-005', participants: ['U-005', 'U-006'],
      startDate: '2026-09-09', endDate: '2026-09-20', attachments: ['方案.pdf'], changeReason: '',
    };
    const cost: CostDraft = {
      solutionFingerprint: '', feasibility: '可行', architecture: '既有产品', reuse: '复用80%', customization: '20接口',
      environment: '容器平台', security: '身份认证', dependencies: '客户认证服务', risk: '交付窗口', attachments: ['成本.xlsx'],
      lines: [{ id: 'L1', subjectId: 'SUB-01', name: '接口开发', scope: '20接口', quantity: 100, unit: '人天',
        unitPrice: 1, taxRate: 0, taxBasis: '含税', basis: '2人50天', risk: '', laborUserId: 'U-005', laborGrade: '高级研发' }],
    };
    const approve = () => {
      act({ type: 'presales-save-solution', id, draft: solution }, tech);
      act({ type: 'presales-save-cost', id, draft: cost }, tech);
      act({ type: 'presales-finance-check', id, opinion: '核对范围和人力基准' }, finance);
      act({ type: 'presales-submit-review', id, method: '线上评审', plannedDate: '2026-09-10', expertIds: ['U-005', 'U-004'] }, pmo);
      const reviewId = state.presales[id].reviews.at(-1)!.id;
      for (const actor of [tech, finance]) act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: '专业条件通过', attachment: '' }, actor);
      act({ type: 'presales-review-decision', id, reviewId, conclusion: '通过', reason: '意见一致，形成概算', corrections: [] }, pmo);
      return reviewId;
    };
    const reviewId = approve();
    act({ type: 'estimate-create-draft', id, reviewId }, tech);
    act({ type: 'estimate-publish', id }, tech);
    act({ type: 'estimate-freeze', id, estimateId: state.estimates.at(-1)!.id, opinion: '核对方案成本版本一致' }, pmo);
    business.useBusinessStore.setState({ data: state });
    return id;
  });
  await role(page, '客户经理');
  return id;
}

const browserErrors = new WeakMap<Page, string[]>();
const observations = new WeakMap<Page, Record<string, unknown>>();
test.beforeEach(({ page }) => { prepareArtifacts(); browserErrors.set(page, collectBrowserErrors(page)); });
test.afterEach(({ page }, info) => {
  const consoleErrors = browserErrors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors, observations: observations.get(page) ?? {} });
  expect(consoleErrors).toEqual([]);
});

async function select(page: Page, label: string, text: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.focus();
  await input.press('ArrowDown');
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option:visible').filter({ hasText: text }).last().click();
  if (await input.evaluate(el => !!el.closest('.ant-select-multiple'))) await input.press('Escape');
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}
async function snapshot(page: Page, id: string) {
  return page.evaluate(async target => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const data = b.useBusinessStore.getState().data;
    return { opportunity: data.opportunities.find(o => o.id === target)!, requests: data.earlyInvestmentRequests.filter(r => r.opportunityId === target), costs: data.earlyCosts.filter(c => c.opportunityId === target) };
  }, id);
}
async function fillApplication(page: Page, amount = 50, risk = '一般') {
  await page.getByLabel('提前投入原因与业务必要性', { exact: true }).fill('客户接口验证窗口临近，需要提前开展技术验证');
  await page.getByLabel('本次申请追加额度（万元）', { exact: true }).fill(String(amount));
  await select(page, '投入资源类型', '人力');
  await page.getByLabel('签约推进计划', { exact: true }).fill('十月底完成合同会签，未签前按周复核投入');
  await select(page, '投入风险级别', risk);
  await page.getByLabel('主要风险与控制措施', { exact: true }).fill('签约延迟风险，每周确认采购计划与验证成果');
  await page.getByLabel('退出方案与成本处置', { exact: true }).fill('客户停止采购即停止验证，原成本按来源保留并复盘');
}
async function submit(page: Page) {
  await page.getByRole('button', { name: '提交申请', exact: true }).click();
  await page.getByRole('dialog', { name: '提交提前投入申请？', exact: true }).getByRole('button', { name: /确\s*定/ }).click();
}
async function approve(page: Page, id: string, requestId: string, approver = 'PMO负责人') {
  await role(page, approver);
  await navigate(page, `/opportunities/${id}/early-investment?requestId=${requestId}`);
  await page.getByLabel('投入审批意见', { exact: true }).fill('验证必要性和概算来源已核对，按额度与有效期执行');
  await page.getByRole('button', { name: '提交通过意见', exact: true }).click();
  await page.getByRole('dialog', { name: '批准本次追加投入额度？', exact: true }).getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('本节点意见已保存，按会签/或签规则推进', { exact: true })).toBeVisible();
}
async function filterLedger(page: Page, id: string) {
  await navigate(page, '/early-investments');
  const { opportunity } = await snapshot(page, id);
  await page.getByLabel('商机 / 客户', { exact: true }).fill(opportunity.name);
  await page.getByRole('button', { name: /^查\s*询$/ }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  return page.locator('.ant-table-tbody tr.ant-table-row');
}

test('GS-10/11 草稿提交、审批意见必填、批准额度与真实成本分离、归集拒绝及来源下钻', async ({ page }) => {
  // One real cross-page chain: two identities, application, approval, four cost attempts and source drilldown.
  test.setTimeout(120_000);
  const id = await seed(page);
  await navigate(page, `/opportunities/${id}/early-investment`);
  await fillApplication(page);
  await expect(page.getByRole('heading', { name: '3. 风险控制与退出', exact: true })).toBeVisible();
  await capturePageEvidence(page, 'UI-GS10-form');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('申请草稿已保存', { exact: true })).toBeVisible();
  let state = await snapshot(page, id);
  expect(state.requests).toHaveLength(1);
  expect(state.requests[0].status).toBe('草稿');
  const requestId = state.requests[0].id;
  await submit(page);
  await expect(page.getByText('投入申请已提交至规则指定审批角色', { exact: true })).toBeVisible();
  state = await snapshot(page, id);
  expect(state.requests).toHaveLength(1);
  expect(state.requests[0].status).toBe('待审批');
  const frozenSource = state.requests[0].estimateSnapshot;
  expect(frozenSource?.isFrozen).toBe(true);
  await role(page, 'PMO负责人');
  await navigate(page, `/opportunities/${id}/early-investment?requestId=${requestId}`);
  await page.getByRole('button', { name: '提交通过意见', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: '批准本次追加投入额度？', exact: true });
  await confirmation.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('审批意见必填', { exact: true })).toBeVisible();
  expect((await snapshot(page, id)).requests[0].status).toBe('待审批');
  await expect(confirmation).toBeHidden();
  await approve(page, id, requestId);
  state = await snapshot(page, id);
  expect(state.opportunity.earlyInvestmentQuota).toBe(50);
  expect(state.opportunity.earlyInvestmentUsed).toBe(0);
  expect(state.costs).toEqual([]);
  expect(state.requests[0].estimateSnapshot).toEqual(frozenSource);
  expect(state.requests[0].status).toBe('通过');
  await expect(page.getByRole('button', { name: '提交通过意见', exact: true })).toHaveCount(0);
  const shots: Record<string, unknown> = { application: await capturePageEvidence(page, 'GS-10') };

  await role(page, '财务专员');
  const row = await filterLedger(page, id);
  await row.getByRole('button', { name: '登记成本', exact: true }).click();
  const modal = page.getByRole('dialog', { name: /登记前期成本/ });
  await select(page, '已批准投入申请', requestId);
  await modal.getByLabel('来源单据编号（唯一）', { exact: true }).fill('PRE-A04-VALID-001');
  await select(page, '成本叶子科目', '人力');
  await modal.getByLabel('已发生成本（万元）', { exact: true }).fill('20');
  await modal.getByLabel('成本内容与凭证说明', { exact: true }).fill('客户接口验证人力，依据工时确认单归集');
  await modal.getByRole('button', { name: '确认归集成本', exact: true }).click();
  await expect(page.getByText('前期成本已归集到商机，原单据唯一保留', { exact: true })).toBeVisible();
  const acceptedCosts = (await snapshot(page, id)).costs;
  expect(acceptedCosts).toHaveLength(1);
  await row.getByRole('button', { name: '登记成本', exact: true }).click();
  await select(page, '已批准投入申请', requestId);
  await modal.getByLabel('来源单据编号（唯一）', { exact: true }).fill('PRE-A04-VALID-001');
  await select(page, '成本叶子科目', '人力');
  await modal.getByLabel('已发生成本（万元）', { exact: true }).fill('20');
  await modal.getByLabel('成本内容与凭证说明', { exact: true }).fill('重复凭证应被阻断');
  await modal.getByRole('button', { name: '确认归集成本', exact: true }).click();
  await expect(page.getByText('来源单据已登记，禁止重复归集', { exact: true })).toBeVisible();
  await modal.getByLabel('来源单据编号（唯一）', { exact: true }).fill('PRE-A04-OVER-002');
  await modal.getByLabel('已发生成本（万元）', { exact: true }).fill('31');
  await modal.getByRole('button', { name: '确认归集成本', exact: true }).click();
  await expect(page.getByText('发生金额无效或超过批准剩余额度，请申请额外投入', { exact: true })).toBeVisible();
  await modal.getByLabel('已发生成本（万元）', { exact: true }).fill('10');
  const date = modal.getByLabel('实际发生日期', { exact: true });
  await date.fill('2026-09-08');
  await date.press('Enter');
  await modal.getByRole('button', { name: '确认归集成本', exact: true }).click();
  await expect(page.getByText('投入不在批准有效期或发生日期无效', { exact: true })).toBeVisible();
  expect((await snapshot(page, id)).costs).toEqual(acceptedCosts);
  await modal.getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.locator('.pms-metric').filter({ hasText: '累计批准额度' })).toContainText('50.00');
  await expect(page.locator('.pms-metric').filter({ hasText: '累计已发生' })).toContainText('20.00');
  await expect(row).toContainText('40.0%');
  shots.ledger = await capturePageEvidence(page, 'GS-11');
  await page.getByRole('button', { name: '导出预览', exact: true }).click();
  const exportModal = page.getByRole('dialog', { name: '当前筛选结果导出预览（CSV模拟）', exact: true });
  await expect(exportModal.getByLabel('导出CSV预览')).toHaveValue(/"50","20","30"/);
  await exportModal.getByRole('button', { name: /^关\s*闭$/ }).click();
  await row.getByRole('button', { name: '查看来源', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer).toContainText('PRE-A04-VALID-001');
  await expect(drawer).toContainText('商机前期成本');
  await drawer.getByRole('link', { name: requestId, exact: true }).click();
  await expect(page).toHaveURL(`/opportunities/${id}/early-investment?requestId=${requestId}`);
  await expect(page.getByLabel('提前投入原因与业务必要性', { exact: true })).toHaveValue('客户接口验证窗口临近，需要提前开展技术验证');
  observations.set(page, { id, requestId, frozenSource, costs: acceptedCosts, screenshots: shots, rejectedAttempts: ['审批空意见', '重复来源', '超额', '有效期外日期'] });
});

test('GS-10 高风险命中管理层，PMO不能审批，管理层通过后保留规则与意见', async ({ page }) => {
  test.setTimeout(90_000);
  const id = await seed(page);
  await navigate(page, `/opportunities/${id}/early-investment`);
  await fillApplication(page, 100, '高风险');
  await submit(page);
  await expect(page.getByText('投入申请已提交至规则指定审批角色', { exact: true })).toBeVisible();
  const requestId = (await snapshot(page, id)).requests[0].id;
  expect((await snapshot(page, id)).requests[0].requiredRole).toBe('executive');
  await role(page, 'PMO负责人');
  await navigate(page, `/opportunities/${id}/early-investment?requestId=${requestId}`);
  await expect(page.getByLabel('投入审批意见', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '提交通过意见', exact: true })).toHaveCount(0);
  await approve(page, id, requestId, '集团领导');
  const state = await snapshot(page, id);
  expect(state.requests[0]).toMatchObject({ status: '通过', riskLevel: '高风险', requiredRole: 'executive', reviewedBy: '王总' });
  expect(state.opportunity.earlyInvestmentQuota).toBe(100);
  await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  expect(state.costs).toEqual([]);
  observations.set(page, { id, request: state.requests[0], screenshots: await capturePageEvidence(page, 'GS10-executive') });
});

test('GS-10 驳回保留原申请且不增加额度，新申请超累计硬上限被阻断', async ({ page }) => {
  test.setTimeout(90_000);
  const id = await seed(page);
  await navigate(page, `/opportunities/${id}/early-investment`);
  await fillApplication(page, 40);
  await submit(page);
  await expect(page.getByText('投入申请已提交至规则指定审批角色', { exact: true })).toBeVisible();
  const requestId = (await snapshot(page, id)).requests[0].id;
  await role(page, 'PMO负责人');
  await navigate(page, `/opportunities/${id}/early-investment?requestId=${requestId}`);
  await page.getByLabel('投入审批意见', { exact: true }).fill('客户采购计划未明确，退回后另建申请');
  await page.getByRole('button', { name: /^驳\s*回$/ }).click();
  await page.getByRole('dialog', { name: '驳回投入申请？', exact: true }).getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('本节点意见已保存，按会签/或签规则推进', { exact: true })).toBeVisible();
  const rejected = (await snapshot(page, id)).requests[0];
  expect(rejected.status).toBe('驳回');
  await role(page, '客户经理');
  await navigate(page, `/opportunities/${id}/early-investment?requestId=${requestId}`);
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '新建申请', exact: true }).click();
  await fillApplication(page, 101);
  await submit(page);
  await expect(page.getByText('累计投入额度超过预计金额10%的演示硬上限', { exact: true })).toBeVisible();
  const confirmation = page.getByRole('dialog', { name: '提交提前投入申请？', exact: true });
  await expect(confirmation).toBeHidden();
  const state = await snapshot(page, id);
  expect(state.requests).toEqual([rejected]);
  expect(state.opportunity.earlyInvestmentQuota).toBe(0);
  expect(state.costs).toEqual([]);
  observations.set(page, { id, rejected, hardCap: 100, attempted: 101 });
});

test('GS-10/11 未知商机及申请404、协作角色只读、真实组织规则拒绝访问', async ({ page }) => {
  const id = await seed(page);
  await navigate(page, '/opportunities/OPP-NOT-FOUND/early-investment');
  await expect(page.locator('.ant-result-404')).toBeVisible();
  await navigate(page, `/opportunities/${id}/early-investment?requestId=EARLY-NOT-FOUND`);
  await expect(page.locator('.ant-result-404')).toBeVisible();
  const draftId = await page.evaluate(async () => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const state = b.transition(b.useBusinessStore.getState().data, { type: 'save-opportunity', submit: false, input: {
      name: '未提交草稿商机投入门禁', customerId: 'CUST-001', departmentId: 'D-002', ownerId: market.id,
      estimatedAmount: 1000, expectedSignDate: '2026-11-30', winRate: 80, source: '客户需求',
      projectType: '软件开发', description: '草稿待补充', competition: '', businessLine: '数字政务',
      region: '福建省', collaborators: [], attachments: [],
    } }, market);
    b.useBusinessStore.setState({ data: state });
    return state.opportunities.at(-1)!.id;
  });
  await navigate(page, `/opportunities/${draftId}/early-investment`);
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '提交申请', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('提前投入原因与业务必要性', { exact: true })).toBeDisabled();
  await role(page, '方案架构师');
  await navigate(page, `/opportunities/${id}/early-investment`);
  await expect(page.getByLabel('提前投入原因与业务必要性', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toHaveCount(0);
  await navigate(page, '/early-investments');
  await expect(page.getByRole('button', { name: '登记成本', exact: true })).toHaveCount(0);
  await role(page, '财务专员');
  await page.evaluate(async () => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const admin: Actor = { id: 'U-ADMIN', name: '系统管理员', role: 'admin' };
    let state = b.useBusinessStore.getState().data;
    const source = state.accessConfiguration.versions.find(v => v.role === 'finance')!;
    state = b.transition(state, { type: 'access-policy-save', sourceId: source.id, value: { ...source, name: '提前投入财务组织范围', dataScope: 'organizations', orgIds: ['D-003'], changeReason: '验证提前投入按已发布组织范围过滤' } }, admin);
    state = b.transition(state, { type: 'access-policy-publish', id: state.accessConfiguration.versions.at(-1)!.id }, admin);
    b.useBusinessStore.setState({ data: state });
  });
  await navigate(page, `/opportunities/${id}/early-investment`);
  await expect(page.locator('.ant-result-403')).toBeVisible();
  await navigate(page, '/early-investments?search=提前投入验收数据共享项目');
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('提前投入验收数据共享项目');
  observations.set(page, { id, deniedOrganization: 'D-002', allowedOrganization: 'D-003', screenshots: await capturePageEvidence(page, 'GS11-organization-empty') });
});

test('GS-11 配置临期提醒与真实立项成本继承，保留商机来源且不重复计费', async ({ page }) => {
  test.setTimeout(90_000);
  const id = await seed(page);
  await page.evaluate(async id => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    let state = b.useBusinessStore.getState().data;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    const admin: Actor = { id: 'U-ADMIN', name: '系统管理员', role: 'admin' };
    const act = (action: BusinessAction, actor: Actor) => { state = b.transition(state, action, actor); };
    const current = state.configuration.grading[0];
    act({ type: 'configuration-save', kind: 'grading', sourceId: current.id, value: { ...current, unsignedWarningDays: 30, changeReason: '提前30天复核未签投入' } }, admin);
    act({ type: 'configuration-publish', kind: 'grading', id: state.configuration.grading.at(-1)!.id }, admin);
    const o = state.opportunities.find(o => o.id === id)!;
    act({ type: 'save-early-investment', id, submit: true, input: {
      reason: '客户验证需要提前投入', amount: 50, resourceTypes: ['人力'], department: o.departmentName, people: ['U-005'],
      startDate: '2026-09-09', endDate: '2026-09-30', signPlanDate: '2026-11-30', signPlan: '按周核对签约进度',
      riskLevel: '一般', risks: '控制客户联调窗口', exitPlan: '暂停投入并保留原成本', estimateId: o.currentEstimateVersionId!,
    } }, market);
    const requestId = state.earlyInvestmentRequests.at(-1)!.id;
    act({ type: 'review-early-investment', id, requestId, approve: true, opinion: '按配置30天预警复核' }, pmo);
    act({ type: 'record-early-cost', id, requestId, sourceId: 'PRE-A04-INHERIT-001', subjectId: 'SUB-01', amount: 20, occurredDate: '2026-09-09', description: '客户验证人力原凭证' }, finance);
    b.useBusinessStore.setState({ data: state });
  }, id);
  await role(page, '财务专员');
  let row = await filterLedger(page, id);
  await expect(row).toContainText('投入有效期临近');
  const warningScreenshots = await capturePageEvidence(page, 'GS11-warning');
  const filteredUrl = page.url();
  await navigate(page, '/early-investments?search=NO-MATCH-A04');
  await expect(page.getByLabel('商机 / 客户', { exact: true })).toHaveValue('NO-MATCH-A04');
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await expect(page.getByLabel('商机 / 客户', { exact: true })).toHaveValue('提前投入验收数据共享项目');
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  const original = await snapshot(page, id);
  expect(original.requests[0].gradingSnapshot?.unsignedWarningDays).toBe(30);
  const inherited = await page.evaluate(async id => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    const initiationPath = '/src/mock/initiation.ts';
    const initiation = await import(/* @vite-ignore */ initiationPath) as typeof import('../src/mock/initiation');
    let state = b.useBusinessStore.getState().data;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    const actors: Record<string, Actor> = { pmo, finance: { id: 'U-004', name: '刘敏', role: 'finance' }, 'solution-tech': { id: 'U-005', name: '赵工', role: 'solution-tech' }, 'project-manager': { id: 'U-001', name: '张伟', role: 'project-manager' } };
    const act = (action: BusinessAction, actor: Actor) => { state = b.transition(state, action, actor); };
    act({ type: 'save-initiation', input: { ...initiation.defaultInitiationInput(state, id), necessity: '验证成果转正式交付', customerNeeds: '统一数据共享与上线培训', recommendation: '按规则分级立项', region: '福建省', attachments: ['立项申请.pdf'] } }, market);
    const appId = state.initiations.at(-1)!.id;
    act({ type: 'submit-initiation', id: appId }, market);
    let round = state.initiations.find(a => a.id === appId)!.rounds.at(-1)!;
    const level = initiation.riskScore(round.source.risks);
    act({ type: 'assess-initiation-risk', id: appId, risks: round.source.risks, level, explanation: '保留全部上游风险并核对控制措施' }, pmo);
    round = state.initiations.find(a => a.id === appId)!.rounds.at(-1)!;
    const classification = initiation.initiationClassification(round.input, round.source, level, state, round.configurationSnapshot);
    act({ type: 'classify-initiation', id: appId, level: classification.level, reason: '遵照金额和风险分级规则' }, pmo);
    round = state.initiations.find(a => a.id === appId)!.rounds.at(-1)!;
    if (round.path === '线上会签') {
      for (const node of initiation.INITIATION_SIGNATURES) act({ type: 'sign-initiation', id: appId, node: node.node, conclusion: '同意', opinion: `${node.node}确认来源与投入金额` }, actors[node.role]);
    }
    act({ type: 'decide-initiation', id: appId, result: '通过', opinion: '批准立项，继承真实前期成本', meetingDate: '2026-09-10', participants: ['U-002', 'U-004'], minutes: '与会核对投入凭证，按来源继承一次', rectifications: [] }, pmo);
    const projectId = state.initiations.find(a => a.id === appId)!.projectId!;
    b.useBusinessStore.setState({ data: state });
    return { appId, project: state.projects.find(p => p.id === projectId)!, costs: state.costs.filter(c => c.sourceId === 'PRE-A04-INHERIT-001') };
  }, id);
  expect(inherited.project.id).toBeTruthy();
  expect(inherited.project.actualCost).toBe(20);
  expect(inherited.costs).toHaveLength(1);
  expect(inherited.costs[0]).toMatchObject({ projectId: inherited.project.id, amount: 20 });
  const after = await snapshot(page, id);
  expect(after.costs).toHaveLength(1);
  expect(after.costs[0]).toMatchObject({ sourceId: 'PRE-A04-INHERIT-001', projectId: inherited.project.id, amount: 20 });
  expect(after.opportunity.earlyInvestmentUsed).toBe(20);
  row = await filterLedger(page, id);
  await expect(row).toContainText('已转立项');
  await expect(row.getByRole('button', { name: '登记成本', exact: true })).toBeDisabled();
  const inheritedScreenshots = await capturePageEvidence(page, 'GS11-inherited');
  await row.getByRole('button', { name: '查看来源', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content:visible');
  await expect(drawer).toContainText('PRE-A04-INHERIT-001');
  await expect(drawer).toContainText(`已继承至 ${inherited.project.id}`);
  const sourceScreenshots: Record<string, string> = {};
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(drawer).toBeVisible();
    const path = `${process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results'}/GS11-source-${width}.png`;
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    sourceScreenshots[String(width)] = path;
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await drawer.getByRole('link', { name: `已继承至 ${inherited.project.id}`, exact: true }).click();
  await expect(page).toHaveURL(`/projects/${inherited.project.id}/dynamic-accounting`);
  await expect(page.getByText('尚无生效预算', { exact: true })).toBeVisible();
  // The newly initiated project has no approved budget yet; the actual cost remains in its authoritative ledger.
  expect(await page.evaluate(async () => {
    const path = '/src/mock/business.ts'; const b = await import(/* @vite-ignore */ path) as BusinessModule;
    return b.useBusinessStore.getState().data.costs.filter(c => c.sourceId === 'PRE-A04-INHERIT-001');
  })).toEqual(inherited.costs);
  observations.set(page, { id, original, inherited, warningScreenshots, inheritedScreenshots, sourceScreenshots, downstreamState: '正式项目尚无生效预算，未伪造预算以绕过动态核算门禁' });
});
