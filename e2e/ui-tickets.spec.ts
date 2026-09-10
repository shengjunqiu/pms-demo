import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { artifactDir, capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
type BusinessModule = typeof import('../src/mock/business');
type Kind = 'requirement' | 'bug' | 'issue' | 'risk';
const errors = new WeakMap<Page, string[]>();
const tables = { requirement: 'requirements', bug: 'bugs', issue: 'issues', risk: 'risks' } as const;
const base = (kind: Kind) => ['requirement', 'bug'].includes(kind) ? '/requirements-bugs' : '/issues-risks';

async function state(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    return business.useBusinessStore.getState().data;
  });
}
async function select(page: Page, scope: Page | Locator, label: string, name: string) {
  await scope.getByLabel(label, { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: name }).click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}
async function list(page: Page, kind: Kind, query = 'projectId=P-001') {
  await navigate(page, `${base(kind)}?${query}&kind=${kind}`);
  await expect(page.getByRole('heading', { name: ['requirement', 'bug'].includes(kind) ? '需求与BUG' : '问题与风险', exact: true })).toBeVisible();
}
async function detail(page: Page, kind: Kind, id: string, title: string, query = '') {
  await navigate(page, `${base(kind)}/${id}${query ? `?${query}` : ''}`);
  await expect(page.getByTestId('ticket-title')).toHaveText(title);
}
async function operation(page: Page, name: string, note: string, nextStatus?: string) {
  await page.getByRole('button', { name, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('处理说明', { exact: true }).fill(note);
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(dialog).toBeHidden();
  if (nextStatus) await expect(page.getByTestId('ticket-status')).toHaveText(nextStatus);
}
async function formEvidence(page: Page, name: string) {
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, { timeout: 6000 });
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ })).toBeVisible();
    await page.screenshot({ path: join(artifactDir, `${name}-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function create(page: Page, kind: Kind, title: string, options: { owner?: string; baseline?: boolean; capture?: boolean } = {}) {
  await list(page, kind);
  await page.getByRole('button', { name: '新建事项', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(`新建${{ requirement: '需求', bug: 'BUG', issue: '问题', risk: '风险' }[kind]}`);
  await dialog.getByLabel('事项标题', { exact: true }).fill(title);
  await dialog.getByLabel('事项类别', { exact: true }).fill(kind === 'bug' ? '功能缺陷' : '交付优化');
  await dialog.getByLabel('事项描述', { exact: true }).fill('背景：地图告警与设备交付。\n期望：按类型准确筛选。\n当前影响：操作结果需验证。');
  await select(page, dialog, '新建责任人', options.owner ?? '赵工');
  await dialog.getByLabel('期望解决日期', { exact: true }).fill('2026-09-20');
  if (kind === 'risk') {
    await dialog.getByLabel('风险概率', { exact: true }).fill('5');
    await dialog.getByLabel('风险影响', { exact: true }).fill('4');
    await dialog.getByLabel('风险措施', { exact: true }).fill('提前验证替代设备，协调备用供应商');
  } else {
    await select(page, dialog, '新建优先级', kind === 'requirement' ? '高' : kind === 'bug' ? '严重' : '重大');
  }
  if (kind === 'requirement') {
    await dialog.getByLabel('产品名称', { exact: true }).fill('智慧城市 / 告警平台');
    if (options.baseline) await dialog.getByRole('checkbox', { name: '影响进度基线，须先关联计划变更' }).check();
  } else await expect(dialog.getByLabel('产品名称', { exact: true })).toHaveCount(0);
  if (options.capture) await formEvidence(page, `UI-TICKETS-${kind}-form`);
  await dialog.getByRole('button', { name: '提交责任人', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('ticket-title')).toHaveText(title);
  const ticket = (await state(page))[tables[kind]].find((item) => item.title === title)!;
  expect(ticket).toBeDefined();
  return ticket.id;
}

test.beforeEach(async ({ page }) => {
  prepareArtifacts(); errors.set(page, collectBrowserErrors(page));
  await page.goto('/requirements-bugs');
  await page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const business = await import(/* @vite-ignore */ path) as BusinessModule;
    business.useBusinessStore.setState({ data: business.createBusinessState() });
  });
  await role(page, '项目经理');
});
test.afterEach(async ({ page }, info) => {
  const consoleErrors = errors.get(page) ?? [];
  writeBrowserReport(info, { url: page.url(), consoleErrors });
  expect(consoleErrors).toEqual([]);
});

test('需求真实闭环：反馈、解决、发起人退回与最终关闭，台账保留筛选', async ({ page }) => {
  test.setTimeout(210_000);
  const title = 'UI需求：地图告警筛选';
  const id = await create(page, 'requirement', title, { capture: true });
  await page.getByRole('button', { name: '返回台账', exact: true }).click();
  await expect(page.getByRole('heading', { name: '需求与BUG', exact: true })).toBeVisible();
  await page.getByLabel('事项搜索', { exact: true }).fill(id);
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  const listUrl = new URL(page.url()).pathname + new URL(page.url()).search;
  await capturePageEvidence(page, 'UI-HS05');
  await page.locator(`tr[data-row-key="${id}"]`).getByRole('button').click();
  await expect(page.getByTestId('ticket-title')).toHaveText(title);
  await capturePageEvidence(page, 'UI-HS06');
  const query = new URL(page.url()).search.slice(1);
  await role(page, '方案架构师'); await detail(page, 'requirement', id, title, query);
  await operation(page, '反馈进展', '已开始地图筛选开发', '开发中');
  await operation(page, '提交解决结果', '筛选开发完成，请验证', '待验证');
  await expect(page.getByRole('button', { name: '最终确认关闭', exact: true })).toBeDisabled();
  await role(page, '项目经理'); await detail(page, 'requirement', id, title, query);
  await operation(page, '退回继续处理', '空结果提示需补充', '开发中');
  await role(page, '方案架构师'); await detail(page, 'requirement', id, title, query);
  await operation(page, '提交解决结果', '已补充空结果提示', '待验证');
  await role(page, '项目经理'); await detail(page, 'requirement', id, title, query);
  await operation(page, '最终确认关闭', '验证通过，关闭需求', '已关闭');
  const data = await state(page);
  expect(data.ticketMeta[id].history).toHaveLength(6);
  expect(data.ticketMeta[id].closedAt).toBe('2026-09-09');
  await page.getByText('查看更早的 2 条记录', { exact: true }).click();
  await expect(page.getByText('已开始地图筛选开发', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '反馈进展', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '返回台账', exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.locator(`tr[data-row-key="${id}"]`)).toContainText('已关闭');
});

test('BUG真实闭环：从BUG页签登记、转办、修复与发起人复测', async ({ page }) => {
  test.setTimeout(150_000);
  const title = 'UI缺陷：筛选条件切换错误';
  const id = await create(page, 'bug', title, { owner: '张建国', capture: true });
  await page.getByRole('button', { name: '转办责任人', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await select(page, dialog, '转办责任人', '赵工');
  await dialog.getByLabel('处理说明', { exact: true }).fill('技术责任人排查切换问题');
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click(); await expect(dialog).toBeHidden();
  let data = await state(page);
  expect(data.ticketMeta[id]).toMatchObject({ ownerId: 'U-005', creatorId: 'U-001' });
  await role(page, '方案架构师'); await detail(page, 'bug', id, title);
  await operation(page, '提交解决结果', '切换状态已修复', '待复测');
  await expect(page.getByRole('button', { name: '最终确认关闭', exact: true })).toBeDisabled();
  await role(page, '项目经理'); await detail(page, 'bug', id, title);
  await operation(page, '最终确认关闭', '发起人复测通过', '已关闭');
  data = await state(page);
  expect(data.bugs.find((item) => item.id === id)).toMatchObject({ status: '已关闭', owner: '赵工', creator: '张建国' });
  expect(data.ticketMeta[id].history).toHaveLength(4);
});

test('风险与问题真实闭环：5×4评分、PMO督办、风险转问题及主PM关闭', async ({ page }) => {
  test.setTimeout(210_000);
  const title = 'UI风险：设备交货窗口不足';
  const id = await create(page, 'risk', title, { capture: true });
  let data = await state(page);
  expect(data.risks.find((item) => item.id === id)).toMatchObject({ level: '特大', status: '监控中' });
  expect(data.ticketMeta[id].escalatedTo).toBe('PMO');
  expect(data.projects.find((p) => p.id === 'P-001')?.healthReason).toContain('监控风险');
  await page.getByRole('button', { name: '返回台账', exact: true }).click();
  await expect(page.getByRole('heading', { name: '问题与风险', exact: true })).toBeVisible();
  await page.getByLabel('事项搜索', { exact: true }).fill(id);
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  await capturePageEvidence(page, 'UI-HS07');
  await page.locator(`tr[data-row-key="${id}"]`).getByRole('button').click(); await expect(page.getByTestId('ticket-title')).toHaveText(title);
  const query = new URL(page.url()).search.slice(1);
  await capturePageEvidence(page, 'UI-HS08-risk');
  await role(page, 'PMO负责人'); await detail(page, 'risk', id, title, query);
  await operation(page, '督办升级', '请求集团协调供货', '监控中');
  expect((await state(page)).ticketMeta[id].escalatedTo).toBe('PMC');
  await role(page, '项目经理'); await detail(page, 'risk', id, title, query);
  await operation(page, '风险转问题', '交货延期已经发生', '已转问题');
  await expect(page.getByRole('button', { name: '风险转问题', exact: true })).toBeDisabled();
  data = await state(page);
  const issue = data.issues.find((item) => item.fromRiskId === id)!;
  expect(issue.owner).toBe('赵工');
  expect(data.ticketMeta[id].history).toHaveLength(3);
  await page.getByRole('button', { name: `查看已转问题 ${issue.id}`, exact: true }).click();
  await expect(page.getByTestId('ticket-title')).toHaveText(issue.title);
  expect(new URL(page.url()).search.slice(1)).toBe(query);
  await capturePageEvidence(page, 'UI-HS08-issue');
  await page.getByRole('button', { name: `查看来源风险 ${id}`, exact: true }).click();
  await expect(page.getByTestId('ticket-title')).toHaveText(title);
  await role(page, '方案架构师'); await detail(page, 'issue', issue.id, issue.title, query);
  await operation(page, '提交解决结果', '替代设备已交付，等待PM确认', '已解决');
  await expect(page.getByRole('button', { name: '最终确认关闭', exact: true })).toBeDisabled();
  await role(page, '项目经理'); await detail(page, 'issue', issue.id, issue.title, query);
  await operation(page, '最终确认关闭', 'PM确认交付影响已解除', '已关闭');
  data = await state(page);
  expect(data.issues.find((item) => item.id === issue.id)?.status).toBe('已关闭');
  expect(data.risks.find((item) => item.id === id)?.status).toBe('已转问题');
  expect(data.ticketMeta[issue.id].closedAt).toBe('2026-09-09');
});

test('需求影响基线：阻断解决、真实计划申请和PMO批准后再闭环', async ({ page }) => {
  test.setTimeout(240_000);
  const title = 'UI需求：新增联调窗口影响基线';
  const query = 'projectId=P-001&kind=requirement&status=待处理';
  const id = await create(page, 'requirement', title, { baseline: true });
  await role(page, '方案架构师'); await detail(page, 'requirement', id, title);
  await page.getByRole('button', { name: '提交解决结果', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('处理说明', { exact: true }).fill('尚无批准计划，尝试提交');
  await dialog.getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.getByText('影响基线的需求须先通过关联变更', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible(); expect((await state(page)).requirements.find((r) => r.id === id)?.status).toBe('待处理');
  await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
  await role(page, '项目经理'); await detail(page, 'requirement', id, title, query);
  const before = await state(page);
  await page.getByRole('button', { name: '转计划变更申请', exact: true }).click();
  await expect(page.getByLabel('申请理由', { exact: true })).toHaveValue(`需求${id}影响进度：${title}`);
  await page.getByLabel('顺延天数', { exact: true }).fill('7');
  await page.getByRole('button', { name: '提交PMO审批', exact: true }).click();
  const planId = (await state(page)).ticketMeta[id].changeRequestId!;
  expect(planId).toBeTruthy();
  await expect(page).toHaveURL(`/projects/P-001/plan-requests/${planId}?ticketQuery=${encodeURIComponent(new URLSearchParams(query).toString())}`);
  const planUrl = page.url();
  await role(page, 'PMO负责人'); await navigate(page, planUrl);
  await expect(page.getByRole('heading', { name: '项目计划变更原单', exact: true })).toBeVisible();
  await page.getByLabel('审批意见', { exact: true }).fill('同意新增联调窗口，追加计划基线');
  await page.getByRole('button', { name: '通过申请', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^确\s*定$/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await state(page)).planRequests.find((r) => r.id === planId)?.status).toBe('通过');
  await page.getByRole('button', { name: `查看来源需求 ${id}`, exact: true }).click();
  expect(new URL(page.url()).searchParams.get('projectId')).toBe('P-001');
  expect(new URL(page.url()).searchParams.get('status')).toBe('待处理');
  await expect(page.getByTestId('ticket-title')).toHaveText(title);
  await expect(page.getByRole('button', { name: planId, exact: true })).toBeVisible();
  await role(page, '方案架构师'); await detail(page, 'requirement', id, title);
  await operation(page, '提交解决结果', '按批准计划完成联调', '待验证');
  await role(page, '项目经理'); await detail(page, 'requirement', id, title);
  await operation(page, '最终确认关闭', '按新基线验证通过', '已关闭');
  const after = await state(page);
  expect(after.baselines.length).toBe(before.baselines.length + 1);
  expect(after.projects.find((p) => p.id === 'P-001')?.budgetAmount).toBe(before.projects.find((p) => p.id === 'P-001')?.budgetAmount);
});

test('筛选与隔离：旧project链接、分页返回、类型和项目草稿重置、空态及角色权限', async ({ page }) => {
  test.setTimeout(210_000);
  await list(page, 'requirement', 'project=P-001');
  const projectName = (await state(page)).projects.find((p) => p.id === 'P-001')!.name;
  await expect(page.getByLabel('事项项目', { exact: true })).toContainText(projectName);
  await page.getByRole('button', { name: '新建事项', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('新建事项项目', { exact: true })).toContainText(projectName);
  await dialog.getByLabel('事项标题', { exact: true }).fill('不可带入新类型');
  await dialog.getByLabel('产品名称', { exact: true }).fill('旧产品');
  await select(page, dialog, '新建事项类型', 'BUG');
  await expect(dialog.getByLabel('事项标题', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('产品名称', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('事项标题', { exact: true }).fill('不可带入其他项目');
  const other = (await state(page)).projects.find((p) => p.id === 'P-006')!;
  await select(page, dialog, '新建事项项目', other.name);
  await expect(dialog.getByLabel('事项标题', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
  await page.getByRole('button', { name: '新建事项', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('事项标题', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await expect(page.locator('.ant-pagination-item-2')).toBeVisible(); await page.locator('.ant-pagination-item-2').click();
  await expect(page).toHaveURL(/page=2/);
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
  await row.getByRole('button').click(); await expect(page.getByTestId('ticket-title')).toBeVisible();
  await page.getByRole('button', { name: '返回台账', exact: true }).click(); await expect(page).toHaveURL(/page=2/);
  await navigate(page, '/issues-risks?projectId=P-001&kind=issue&owner=U-001&rank=重大&overdue=true&search=NOT-EXIST&page=1');
  await expect(page.getByRole('heading', { name: '问题与风险', exact: true })).toBeVisible();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await expect(page.getByLabel('事项搜索', { exact: true })).toHaveValue('NOT-EXIST');
  await page.getByLabel('事项搜索', { exact: true }).fill('持续输入测试');
  await expect(page).toHaveURL(/search=%E6%8C%81%E7%BB%AD%E8%BE%93%E5%85%A5%E6%B5%8B%E8%AF%95/);
  expect(new URL(page.url()).searchParams.get('owner')).toBe('U-001');
  expect(new URL(page.url()).searchParams.get('rank')).toBe('重大');
  expect(new URL(page.url()).searchParams.get('overdue')).toBe('true');
  await capturePageEvidence(page, 'UI-HS07-empty');
  await navigate(page, '/issues-risks/NOT-FOUND'); await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
  const riskTitle = 'UI风险：措施验证'; const riskId = await create(page, 'risk', riskTitle);
  await operation(page, '登记风险缓解', '备用供应渠道已验证，风险缓解', '已缓解');
  await expect(page.getByRole('button', { name: '登记风险缓解', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '风险转问题', exact: true })).toBeDisabled();
  await role(page, '集团领导'); await detail(page, 'risk', riskId, riskTitle);
  for (const name of ['反馈进展', '转办责任人', '督办升级']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await list(page, 'risk'); await expect(page.getByRole('button', { name: '新建事项', exact: true })).toBeDisabled();
  await role(page, '项目经理'); await list(page, 'risk');
  const data = await state(page); expect(data.lockedProjects.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: '新建事项', exact: true }).click();
  await page.getByRole('dialog').getByLabel('新建事项项目', { exact: true }).click();
  for (const project of data.projects.filter((p) => data.lockedProjects.includes(p.id))) await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: project.name })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').getByRole('button', { name: /^取\s*消$/ }).click();
  await role(page, '方案架构师');
  const inaccessibleId = await page.evaluate(async () => {
    const businessPath = '/src/mock/business.ts';
    const selectorsPath = '/src/mock/selectors.ts';
    const business = await import(/* @vite-ignore */ businessPath) as BusinessModule;
    const selectors = await import(/* @vite-ignore */ selectorsPath) as typeof import('../src/mock/selectors');
    const data = business.useBusinessStore.getState().data;
    const visible = new Set(selectors.visibleProjects('solution-tech', data.projects, data).map((p) => p.id));
    return data.issues.find((item) => !visible.has(item.projectId))?.id;
  });
  expect(inaccessibleId).toBeTruthy();
  await navigate(page, `/issues-risks/${inaccessibleId}`);
  await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
});
