import { expect, test, type Page } from '@playwright/test';
import type { Actor, BusinessAction } from '../src/mock/business-domain';
import type { SolutionDraft, CostDraft } from '../src/models/presales';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts } from './evidence';

type BusinessModule = typeof import('../src/mock/business');

// Build every source version through domain actions; never synthesize approved reviews.
async function seed(page: Page, mode: 'base' | 'ready' | 'stale' = 'base') {
  await page.goto('/opportunities');
  const id = await page.evaluate(async (scenario) => {
    const modulePath = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ modulePath) as BusinessModule;
    const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
    const tech: Actor = { id: 'U-005', name: '赵工', role: 'solution-tech' };
    const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
    const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
    let state = business.createBusinessState();
    const act = (action: BusinessAction, actor: Actor) => { state = business.transition(state, action, actor); };
    if (scenario === 'base') {
      business.useBusinessStore.setState({ data: state });
      return 'OPP-002';
    }
    act({ type: 'save-opportunity', submit: true, input: {
      name: '台账验收数据共享项目', customerId: 'CUST-001', departmentId: 'D-002', ownerId: 'U-006',
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
    if (scenario === 'stale') {
      solution.architecture = '微服务增加双因素认证';
      solution.changeReason = '补充安全方案后重新评审';
      approve();
    }
    business.useBusinessStore.setState({ data: state });
    return id;
  }, mode);
  await role(page, '客户经理');
  return id;
}

test.beforeAll(prepareArtifacts);

test('台账日期方案恢复、列设置导出与补录跟进日期', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  const id = await seed(page);
  await navigate(page, '/opportunities?start=2026-10-01&end=2026-10-31');
  await page.getByRole('button', { name: '更多筛选', exact: true }).click();
  const dates = page.locator('.ant-picker-range input');
  await expect(dates.nth(0)).toHaveValue('2026-10-01');
  await page.getByRole('button', { name: '保存视图', exact: true }).click();
  await page.getByLabel('视图名称', { exact: true }).fill('十月签约');
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await page.getByRole('button', { name: '重置', exact: true }).click();
  await expect(dates.nth(0)).toHaveValue('');
  await dates.nth(0).fill('2026-11-01');
  await dates.nth(0).press('Enter');
  await dates.nth(1).fill('2026-11-30');
  await dates.nth(1).press('Enter');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await page.locator('.ant-select[aria-label="常用视图"] .ant-select-selector').click();
  await page.locator('.ant-select-dropdown:visible').getByText('十月签约', { exact: true }).click();
  await expect(dates.nth(0)).toHaveValue('2026-10-01');
  await expect(dates.nth(1)).toHaveValue('2026-10-31');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page).toHaveURL(/start=2026-10-01&end=2026-10-31/);
  await page.getByLabel('编号 / 商机名称', { exact: true }).fill('OPP-2026-002');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  await page.getByRole('button', { name: '列设置', exact: true }).click();
  await page.getByRole('dialog').getByLabel('主办部门', { exact: true }).uncheck();
  await page.getByRole('dialog').getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: '主办部门', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '导出预览', exact: true }).click();
  await expect(page.getByLabel('导出CSV预览')).toHaveValue(/OPP-2026-002/);
  await expect(page.getByLabel('导出CSV预览')).not.toHaveValue(/OPP-2026-001/);
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await navigate(page, `/opportunities/${id}`);
  await page.getByRole('tab', { name: '跟进记录', exact: true }).click();
  for (const date of ['2026-09-09', '2026-09-08']) {
    await page.getByRole('button', { name: '追加跟进', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('跟进日期', { exact: true }).fill(date);
    await dialog.getByLabel('跟进日期', { exact: true }).press('Enter');
    await dialog.getByLabel('客户沟通', { exact: true }).fill(`${date}客户会议`);
    await dialog.getByLabel('下一步计划', { exact: true }).fill('核对采购计划');
    await dialog.getByRole('button', { name: '保存跟进', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(page.getByText('客户沟通：2026-09-09客户会议', { exact: true })).toBeVisible();
  await expect(page.getByText('客户沟通：2026-09-08客户会议', { exact: true })).toBeVisible();
  await navigate(page, '/opportunities?keyword=OPP-2026-002');
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('2026-09-09');
  await capturePageEvidence(page, 'GS01-ledger');
  expect(errors).toEqual([]);
});

test('真实完整版本链可发起立项，九个页签及下钻保持同一商机', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  const id = await seed(page, 'ready');
  const detail = `/opportunities/${id}`;
  await navigate(page, detail);
  await expect(page.getByText(/预计金额 1,000.00 万元 · 预计签约 2026-11-30/)).toBeVisible();
  await expect(page.getByText('全部条件已满足', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeEnabled();
  await capturePageEvidence(page, 'GS03-ready');
  for (const name of ['概览', '跟进记录', '商机评估', '需求与方案', '技术成本评估', '专家评审', '项目概算', '提前投入', '操作记录']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel', { name, exact: true })).toBeVisible();
  }
  for (const [tab, label, suffix] of [
    ['商机评估', '进入商机初步评估', 'evaluation'], ['需求与方案', '进入需求调研与解决方案', 'solution'],
    ['技术成本评估', '进入技术与成本评估', 'tech-cost'], ['专家评审', '进入方案与成本专家评审', 'review'],
    ['项目概算', '进入项目概算编制', 'estimate'], ['提前投入', '进入提前投入申请', 'early-investment'],
  ]) {
    await navigate(page, detail);
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${detail}/${suffix}`);
    await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/尚未实现|页面不存在|无权访问/)).toHaveCount(0);
  }
  await navigate(page, detail);
  await page.getByRole('button', { name: '发起立项', exact: true }).click();
  await expect(page).toHaveURL(`/initiation/apply?opportunityId=${id}`);
  await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('新评审与旧冻结概算不一致时两页共同阻断，项目经理成本显示一致', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  const id = await seed(page, 'stale');
  await navigate(page, `/opportunities?keyword=${id}`);
  // Search accepts business code rather than internal id; use the unique business name.
  await page.getByLabel('编号 / 商机名称', { exact: true }).fill('台账验收数据共享项目');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  await navigate(page, `/opportunities/${id}`);
  await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  await expect(page.getByText(/冻结概算与当前通过的方案\/专家评审版本链不一致/)).toBeVisible();
  await capturePageEvidence(page, 'GS03-stale-version');
  await role(page, '项目经理');
  await navigate(page, '/opportunities?keyword=OPP-2026-001');
  const row = page.locator('.ant-table-tbody tr.ant-table-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('已隐藏');
  await navigate(page, '/opportunities/OPP-001');
  await expect(page.getByText('无敏感字段权限', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '项目概算', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: '项目概算', exact: true })).toContainText('已隐藏');
  expect(errors).toEqual([]);
});
