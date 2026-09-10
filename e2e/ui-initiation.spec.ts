import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Actor, BusinessAction } from '../src/mock/business-domain';
import type { SolutionDraft, CostDraft } from '../src/models/presales';
import { navigate, role } from './helpers';
import { collectBrowserErrors } from './evidence';
type BusinessModule = typeof import('../src/mock/business');
const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
const browserErrors = new WeakMap<Page, string[]>();
const projectName = '立项UI数据共享项目';

// Prerequisites are built with real domain transitions; the target UI actions remain browser-driven.
async function prepare(page: Page, stage: 'source' | 'submitted' | 'classified') {
  await page.goto('/opportunities');
  const id = await page.evaluate(async (scenario) => {
    const modulePath = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ modulePath) as BusinessModule;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    const mockPath = '/src/mock/index.ts';
    const mock = await import(/* @vite-ignore */ mockPath) as typeof import('../src/mock');
    let state = business.createBusinessState();
    const act = (action: BusinessAction, actor: Actor) => { state = business.transition(state, action, actor); };
    act({ type: 'save-opportunity', submit: true, input: {
      name: '立项UI数据共享项目', customerId: mock.mockCustomers.find((c) => c.level === '普通客户')!.id, departmentId: 'D-002', ownerId: 'U-006',
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
      for (const actor of [tech, finance]) act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: actor.role === 'finance' ? '毛利评审核对记录' : '专业条件通过', attachment: '' }, actor);
      act({ type: 'presales-review-decision', id, reviewId, conclusion: '通过', reason: '意见一致，形成概算', corrections: [] }, pmo);
      return reviewId;
    };
    const reviewId = approve();
    act({ type: 'estimate-create-draft', id, reviewId }, tech);
    act({ type: 'estimate-publish', id }, tech);
    act({ type: 'estimate-freeze', id, estimateId: state.estimates.at(-1)!.id, opinion: '核对方案成本版本一致' }, pmo);
    let appId: string | undefined;
    if (scenario !== 'source') {
      const initiationPath = '/src/mock/initiation.ts';
      const initiation = await import(/* @vite-ignore */ initiationPath) as typeof import('../src/mock/initiation');
      act({ type: 'save-initiation', input: { ...initiation.defaultInitiationInput(state, id), necessity: '统一政务数据服务', customerNeeds: '完成部署与培训', recommendation: '按规则分级立项', attachments: ['立项申请.pdf'] } }, market);
      appId = state.initiations.at(-1)!.id;
      act({ type: 'submit-initiation', id: appId }, market);
      if (scenario === 'classified') {
        const round = state.initiations.at(-1)!.rounds.at(-1)!;
        act({ type: 'assess-initiation-risk', id: appId, risks: round.risks, level: initiation.riskScore(round.risks), explanation: '核对来源与控制措施' }, pmo);
        const current = state.initiations.at(-1)!.rounds.at(-1)!;
        const classification = initiation.initiationClassification(current.input, current.source, current.riskLevel!, state, current.configurationSnapshot);
        act({ type: 'classify-initiation', id: appId, level: classification.level, reason: '按真实金额与风险确认' }, pmo);
      }
    }
    business.useBusinessStore.setState({ data: state });
    return { opportunityId: id, appId };
  }, stage);
  await role(page, '客户经理');
  return id;
}

test.beforeEach(({ page }) => { mkdirSync(artifacts, { recursive: true }); browserErrors.set(page, collectBrowserErrors(page)); });
test.afterEach(async ({ page }, info) => {
  const errors = browserErrors.get(page) ?? [];
  writeFileSync(join(artifacts, `initiation-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors }, null, 2));
  expect(errors).toEqual([]);
});
async function capture(page: Page, name: string) {
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.evaluate(() => document.querySelectorAll('.ant-table-content, .ant-table-body').forEach((element) => { element.scrollLeft = 0; }));
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), fullPage: true, animations: 'disabled' });
  }
}
async function select(page: Page, label: string, option: string) {
  const control = page.locator(`.ant-select[aria-label="${label}"]`);
  if ((await control.getAttribute('class'))?.includes('ant-select-multiple') && await control.locator('.ant-select-selection-item').filter({ hasText: option }).count()) return;
  await control.locator('.ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ has: page.getByText(option, { exact: true }) }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}
async function date(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press('Enter');
}
async function open(page: Page, path: string, title: string, id?: string) {
  await navigate(page, path);
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
  if (id) await expect(page.locator('.pms-page-header')).toContainText(id);
}
async function application(page: Page, id: string) {
  return page.evaluate(async (id) => {
    const path = '/src/mock/business.ts'; const business = await import(/* @vite-ignore */ path) as BusinessModule;
    const app = business.useBusinessStore.getState().data.initiations.find((a) => a.id === id)!; const round = app.rounds.at(-1)!;
    const progress = round.approvalProgress; const node = progress?.snapshot.nodes[progress.node];
    return { status: app.status, projectId: app.projectId, rounds: app.rounds.length, sourceEstimate: round.source.estimate.id, riskLevel: round.riskLevel, path: round.path, signatures: round.signatures.length,
      reviews: progress?.reviews.length ?? 0, nextRole: node?.roles.find((role) => !progress?.reviews.some((r) => r.node === progress.node && r.role === role)),
      nodeName: node?.name, history: app.rounds.map((r) => ({ status: r.status, estimate: r.source.estimate.id, reply: r.input.rectificationReply })),
    };
  }, id);
}
const roleNames: Record<string, string> = { pmo: 'PMO负责人', executive: '集团领导', finance: '财务专员', 'solution-tech': '方案架构师', 'project-manager': '项目经理' };
async function confirmDecision(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function finishConfiguredApproval(page: Page, id: string, meeting: boolean) {
  // Follow the real configured nodes; an all-role node may require several independent signatures.
  for (let step = 0; step < 10; step++) {
    const before = await application(page, id);
    if (before.status === '通过') return before;
    expect(before.nextRole).toBeTruthy();
    await role(page, roleNames[before.nextRole!]);
    await open(page, `/initiation/${id}/decision`, '项目分级与决策', id);
    await page.getByLabel('立项办理意见', { exact: true }).fill(`核对本轮来源，批准${before.nodeName}`);
    if (meeting) {
      await date(page, '决策会议日期', '2026-09-10');
      await select(page, '决策参会人', '李主任');
      await select(page, '决策参会人', '刘敏');
      await page.getByRole('heading', { name: '当前办理节点', exact: true }).click();
      await page.getByLabel('会议纪要与表决结果', { exact: true }).fill('会议核对实施范围、风险责任与概算来源，形成通过意见。');
    }
    await page.getByRole('button', { name: `通过当前节点：${before.nodeName}`, exact: true }).click();
    await confirmDecision(page);
    await expect.poll(async () => (await application(page, id)).reviews).toBe(before.reviews + 1);
  }
  throw new Error('真实配置审批未在合理节点数内完成');
}

test('YS01/02 UI申请七页签、提交锁定与评审上下文返回', async ({ page }) => {
  test.setTimeout(120_000);
  const { opportunityId } = await prepare(page, 'source');
  await open(page, `/initiation/apply?opportunityId=${opportunityId}`, '立项申请');
  await page.getByLabel('立项必要性', { exact: true }).fill('统一政务数据共享与业务入口');
  await page.getByLabel('等级建议与依据', { exact: true }).fill('依据项目规模和可控风险建议一般项目');
  await page.getByLabel('区域', { exact: true }).fill('福建省');
  await capture(page, 'YS01-basic');
  for (const tab of ['商机承接', '概算与毛利', '风险信息', '交付物目录']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible();
  }
  await page.getByRole('tab', { name: '项目交付信息', exact: true }).click();
  await page.getByLabel('项目范围与边界', { exact: true }).fill('20个接口与统一门户，不含历史清洗');
  await page.getByLabel('客户诉求及交付要求', { exact: true }).fill('完成部署、培训与交付确认');
  await page.getByRole('tab', { name: '附件', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: '立项申请.pdf', mimeType: 'application/pdf', buffer: Buffer.from('UI demo attachment') });
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL(/id=INIT-/);
  const id = new URL(page.url()).searchParams.get('id')!;
  await expect(page.locator('.pms-page-header')).toContainText(id);
  await page.getByRole('button', { name: '提交立项申请', exact: true }).click();
  await expect(page.getByRole('heading', { name: '综合风险报告', exact: true })).toBeVisible();
  await expect.poll(async () => (await application(page, id)).status).toBe('待风险评估');
  await page.getByRole('navigation', { name: '立项业务导航' }).getByRole('button', { name: '申请资料', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toBeDisabled();
  await role(page, 'PMO负责人');
  await open(page, `/initiation/review?status=${encodeURIComponent('待风险评估')}&id=${id}`, '立项评审工作台');
  await expect(page.getByText('本人待办：PMO 综合风险评估', { exact: true })).toBeVisible();
  await capture(page, 'YS02');
  await page.getByRole('button', { name: '综合风险报告', exact: true }).click();
  await expect(page.locator('.pms-page-header')).toContainText(id);
  await page.getByRole('button', { name: '评审工作台', exact: true }).click();
  await expect(page).toHaveURL(/status=.*&id=INIT-/);
  await expect(page.locator('.ant-select[aria-label="立项评审状态"]')).toContainText('待风险评估');
  await page.getByLabel('搜索立项编号或名称', { exact: true }).fill('没有匹配的申请');
  await expect(page.getByText('暂无线索进入立项评审', { exact: true })).toBeVisible();
});

test('YS03/04 UI高风险填写、降级阻断、分级与真实PMC节点通过', async ({ page }) => {
  test.setTimeout(180_000);
  const { appId: id } = await prepare(page, 'submitted');
  await role(page, 'PMO负责人');
  await open(page, `/initiation/${id}/risk-assessment`, '综合风险报告', id);
  await page.getByRole('button', { name: '补充风险', exact: true }).click();
  const row = page.locator('tr[data-row-key^="MANUAL-"]'); const riskId = (await row.getAttribute('data-row-key'))!;
  await page.getByLabel(`${riskId}风险说明`, { exact: true }).fill('关键上线窗口存在高影响交付风险');
  await page.getByLabel(`${riskId}概率`, { exact: true }).fill('5');
  await page.getByLabel(`${riskId}影响`, { exact: true }).fill('4');
  await page.getByLabel(`${riskId}应对措施`, { exact: true }).fill('提前演练并准备回滚，设置每日跟踪责任');
  await select(page, `${riskId}责任人`, '赵工');
  await page.getByLabel('综合判断与人工调整依据', { exact: true }).fill('新增上线窗口风险，综合等级按最高单项确认');
  await page.getByRole('button', { name: '确认报告并进入项目分级', exact: true }).click();
  await expect(page.getByText('综合等级不得低于矩阵最高风险', { exact: true })).toBeVisible();
  await select(page, '综合风险等级', '高');
  await capture(page, 'YS03');
  await page.getByRole('button', { name: '确认报告并进入项目分级', exact: true }).click();
  await expect(page.getByRole('heading', { name: '项目分级与决策', exact: true })).toBeVisible();
  await expect.poll(async () => (await application(page, id!)).riskLevel).toBe('高');
  await select(page, '确认项目级别', '重大');
  await page.getByLabel('分级确认依据', { exact: true }).fill('高风险项目按重大路径评审，保留上游版本');
  await page.getByRole('button', { name: '确认分级与审批路径', exact: true }).click();
  await expect.poll(async () => (await application(page, id!)).path).toBe('PMC决策会');
  await capture(page, 'YS04');
  const result = await finishConfiguredApproval(page, id!, true);
  expect(result.projectId).toMatch(/^P-INIT-/);
  await page.getByRole('button', { name: '进入团队任命', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${result.projectId}/team`));
  await expect(page.locator('.pms-page-header')).toContainText(projectName);
});

test('YS04 UI六专业独立会签与正式配置审批', async ({ page }) => {
  test.setTimeout(180_000);
  const { appId: id } = await prepare(page, 'classified');
  expect((await application(page, id!)).path).toBe('线上会签');
  const nodes = [['方案架构师', '技术'], ['方案架构师', '方案'], ['项目经理', '交付'], ['财务专员', '财务'], ['PMO负责人', '法务协同（PMO代办）'], ['PMO负责人', 'PMO']];
  for (const [index, [actor, node]] of nodes.entries()) {
    await role(page, actor);
    await open(page, `/initiation/${id}/decision`, '项目分级与决策', id);
    if (actor === '方案架构师') await expect(page.getByRole('button', { name: /^(提交决策|通过当前节点)/ })).toBeDisabled();
    await page.getByLabel('立项办理意见', { exact: true }).fill(`${node}核对来源、范围及责任，确认同意`);
    await select(page, '本人会签节点', node);
    await page.getByRole('button', { name: '签署当前节点', exact: true }).click();
    await expect.poll(async () => (await application(page, id!)).signatures).toBe(index + 1);
  }
  expect((await application(page, id!)).status).toBe('待决策');
  expect((await application(page, id!)).projectId).toBeUndefined();
  const result = await finishConfiguredApproval(page, id!, false);
  expect(result.status).toBe('通过');
  expect(result.signatures).toBe(6);
  await capture(page, 'YS04-approved');
});

test('YS04/01 UI整改退回、回复重提与原版保留', async ({ page }) => {
  test.setTimeout(120_000);
  const { appId: id } = await prepare(page, 'classified'); const before = await application(page, id!);
  await role(page, 'PMO负责人');
  await open(page, `/initiation/${id}/decision`, '项目分级与决策', id);
  await page.getByLabel('立项办理意见', { exact: true }).fill('需要补充上线回滚安排后重新评审');
  await select(page, '立项决策结果', '整改');
  await page.getByRole('button', { name: '添加整改项', exact: true }).click();
  await page.getByLabel('整改事项1', { exact: true }).fill('补充上线回滚与培训计划');
  await select(page, '整改责任人1', '陈亮');
  await date(page, '整改截止日期1', '2026-09-20');
  await page.getByRole('button', { name: '提交决策', exact: true }).click();
  await confirmDecision(page);
  await expect.poll(async () => (await application(page, id!)).status).toBe('整改');
  await capture(page, 'YS04-rectification');
  await role(page, '客户经理');
  await open(page, `/initiation/apply?id=${id}`, '立项申请', id);
  await page.getByRole('tab', { name: '附件', exact: true }).click();
  await page.getByLabel('逐项整改回复', { exact: true }).fill('已补充上线回滚与培训安排，申请重新评审');
  await page.getByRole('button', { name: '提交立项申请', exact: true }).click();
  await expect(page.getByRole('heading', { name: '综合风险报告', exact: true })).toBeVisible();
  const after = await application(page, id!);
  expect(after.status).toBe('待风险评估'); expect(after.rounds).toBe(2);
  expect(after.history[0]).toMatchObject({ status: '整改', estimate: before.sourceEstimate });
  expect(after.history[1].reply).toContain('已补充上线回滚');
});

test('YS权限 UI只读、敏感意见隐藏与未知申请', async ({ page }) => {
  test.setTimeout(120_000);
  const { appId: id } = await prepare(page, 'classified');
  await role(page, '方案架构师');
  await open(page, `/initiation/${id}/risk-assessment`, '综合风险报告', id);
  await expect(page.getByRole('button', { name: '补充风险', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '确认报告并进入项目分级', exact: true })).toBeDisabled();
  await page.locator('summary').filter({ hasText: '来源版本与专家意见' }).click();
  await expect(page.getByText('毛利评审核对记录', { exact: true })).toHaveCount(0);
  await expect(page.getByText('毛利字段无查看权限', { exact: true }).first()).toBeVisible();
  await open(page, `/initiation/review?id=${id}`, '立项评审工作台');
  await page.locator('summary').filter({ hasText: '来源版本与专家意见' }).click();
  await expect(page.getByText('毛利评审核对记录', { exact: true })).toHaveCount(0);
  await capture(page, 'YS02-readonly');
  await navigate(page, '/initiation/UNKNOWN/decision');
  await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
});
