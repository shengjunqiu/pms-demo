import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { navigate, role } from './helpers';

const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const errors: string[] = []; errorsByPage.set(page, errors); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); }); });
test.afterEach(async ({ page }, info) => { const errors = errorsByPage.get(page) ?? []; const dir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results'; mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, `browser-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors }, null, 2)); expect(errors).toEqual([]); });

const pages = [
  ['GS01', '/opportunities', '客户经理'], ['GS02', '/opportunities/new', '客户经理'],
  ['GS03', '/opportunities/OPP-001', '客户经理'], ['GS04', '/opportunities/OPP-001/evaluation', '客户经理'],
  ['YS06', '/projects/P-PLAN-001/wbs', '项目经理'], ['YS07', '/projects/P-PLAN-001/milestones', '项目经理'], ['YS08', '/projects/P-PLAN-001/plan-review', '项目经理'],
  ['JS01', '/projects/P-006/internal-acceptance', '项目经理'], ['JS02', '/projects/P-006/supplier-acceptance', '项目经理'], ['JS03', '/projects/P-006/customer-acceptance', '项目经理'], ['JS04', '/projects/P-006/report-acceptance', '项目经理'],
];
for (const width of [1440, 1280]) test(`首批页面可见性和布局 ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/workbench/project-manager');
  let current = '项目经理';
  for (const [id, path, name] of pages) {
    if (name !== current) { await role(page, name); current = name; }
    await navigate(page, path);
    const titles: Record<string, string> = { GS01: '商机台账', GS02: '新建商机', GS03: '福建省晋江市岸海防综合治理平台商机', GS04: '初步评估', YS06: 'YS-06', YS07: 'YS-07', YS08: 'YS-08', JS01: 'JS-01', JS02: 'JS-02', JS03: 'JS-03', JS04: 'JS-04' };
    await expect(page.locator('h4').first()).toContainText(titles[id]);
    await expect(page.getByText('403', { exact: true })).toHaveCount(0);
    await expect(page.getByText('404', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), id).toBe(true);
    await page.screenshot({ path: join(process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results', `${id}-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('商机提交和重新打开保留同一份业务记录', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await role(page, '客户经理');
  await navigate(page, '/opportunities/new');
  await page.getByLabel('商机名称', { exact: true }).fill('浏览器验证园区协同项目');
  await page.getByLabel('客户', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  await page.getByLabel('协同人员', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^赵工$/ }).click();
  await page.getByLabel('商机名称', { exact: true }).click();
  await page.getByLabel('预计项目金额（万元）', { exact: true }).fill('1000');
  await page.getByLabel('业务背景、建设目标与主要需求', { exact: true }).fill('统一园区设备台账、巡检计划与运维工单，明确交付范围。');
  await page.getByRole('button', { name: '提交商机', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确 定' }).click();
  await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  const path = new URL(page.url()).pathname;
  await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  await navigate(page, '/opportunities');
  await navigate(page, path);
  await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '发起评估', exact: true }).first().click();
  await expect(page.getByRole('button', { name: '确认拟立项', exact: true })).toBeDisabled();
  for (const [name, dimensions] of [
    ['客户经理', ['客户价值', '商务风险', '竞争态势']],
    ['方案架构师', ['技术可行性', '交付难度']],
    ['财务专员', ['收益与毛利']],
  ] as const) {
    if (name !== '客户经理') { await role(page, name); await navigate(page, `${path}/evaluation`); }
    const forbidden = name === '客户经理' ? '技术可行性' : name === '方案架构师' ? '客户价值' : '交付难度';
    await expect(page.locator('tr').filter({ hasText: forbidden }).getByRole('button', { name: '填写意见' })).toBeDisabled();
    for (const dimension of dimensions) {
      await page.locator('tr').filter({ hasText: dimension }).getByRole('button', { name: '填写意见' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('评分（0–100）', { exact: true }).fill('85');
      await dialog.getByLabel('专业结论', { exact: true }).click();
      await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^可行$/ }).click();
      await dialog.getByLabel('风险项与应对建议', { exact: true }).fill('已明确第三方接口依赖与责任人，按周跟踪');
      await dialog.locator('input[type=file]').setInputFiles({ name: `${dimension}核对.txt`, mimeType: 'text/plain', buffer: Buffer.from('客户需求和专业核对记录') });
      await dialog.getByLabel('评估说明', { exact: true }).fill(`${dimension}已核对客户需求、资源条件和费用依据`);
      if (dimension === '收益与毛利') await dialog.getByLabel('初步总成本（万元）').fill('600');
      await dialog.getByRole('button', { name: '保存本专业意见' }).click();
      await expect(dialog).toBeHidden();
    }
  }
  await role(page, '客户经理'); await navigate(page, `${path}/evaluation`);
  await page.getByPlaceholder('结合系统建议说明推进、风险处置与客户沟通依据').fill('六维核对完成，客户预算与交付资源满足，推进方案调研。');
  await page.getByRole('button', { name: '确认拟立项', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('已生成方案调研任务', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.ant-modal-mask')).toBeHidden();
  for (const width of [1440, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: join(process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results', `GS04-completed-${width}.png`), fullPage: true }); }
  await page.getByRole('button', { name: '进入方案任务' }).click();
  await expect(page).toHaveURL(`${path}/solution`);
});

test('策划计划经PMO评审、预算审批与独立基线确认', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/projects/P-PLAN-001/wbs');
  await page.getByRole('button', { name: 'Excel模板导入', exact: true }).click();
  await page.getByLabel('WBS导入内容').fill('编码\t名称\t父编码\t责任人ID\t开始\t结束\t工时\t前置编码\t完成条件\n1\t错误任务\t\tU-001\t2026-12-31\t2026-09-10\t8\t1\t交付');
  await expect(page.getByRole('button', { name: '校验通过，替换草稿任务' })).toBeDisabled();
  await page.getByRole('button', { name: '载入模板样例' }).click();
  await page.getByRole('button', { name: '校验通过，替换草稿任务' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('1 平台交付', { exact: true })).toBeVisible();
  await navigate(page, '/projects/P-PLAN-001/milestones');
  await page.getByRole('button', { name: /^编\s*辑$/ }).first().click();
  await page.getByLabel('达成条件', { exact: true }).fill('启动会议纪要与责任分工确认');
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('启动会议纪要与责任分工确认', { exact: true })).toBeVisible();
  await navigate(page, '/projects/P-PLAN-001/plan-review');
  await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('评审中', { exact: true })).toBeVisible();
  await role(page, 'PMO负责人');
  await navigate(page, '/projects/P-PLAN-001/plan-review');
  await page.getByLabel('计划评审意见', { exact: true }).fill('补充启动交付责任确认');
  await page.getByRole('button', { name: /^整\s*改$/ }).click();
  await page.getByLabel('整改事项', { exact: true }).fill('确认启动资料与培训责任分工');
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('整改中', { exact: true })).toBeVisible();
  await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  await page.getByRole('button', { name: /^回\s*复$/ }).click();
  await page.getByLabel('整改落实回复', { exact: true }).fill('启动纪要已明确主PM负责资料确认与交付培训');
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('第2轮', { exact: false }).first()).toBeVisible();
  await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  await page.getByLabel('计划评审意见', { exact: true }).fill('WBS职责、里程碑、资源与范围逐项核对一致');
  await page.getByRole('button', { name: /^通\s*过$/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('已通过', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入预算编制', exact: true })).toBeVisible();
  await role(page, '项目经理');
  await navigate(page, '/projects/P-PLAN-001/budget');
  await expect(page.locator('h4').first()).toContainText('YS-09');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('预算草稿 R1', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page).toHaveURL(/P-PLAN-001\/budget\/review$/);
  await expect(page.getByRole('button', { name: '通过，待基线确认' })).toBeDisabled();
  await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/budget/review');
  await page.getByLabel('审批意见', { exact: true }).fill('各成本科目与冻结概算一致，范围、计划和资源完整');
  await page.getByRole('button', { name: '通过，待基线确认' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByRole('button', { name: '确认基线生效' })).toBeVisible();
  await navigate(page, '/projects/P-PLAN-001/baseline');
  await expect(page.getByText('尚未形成生效基线', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认基线', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('尚未形成生效基线', { exact: true })).toHaveCount(0);
  await expect(page.getByText('基线版本快照', { exact: true })).toBeVisible();
  await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/wbs');
  await expect(page.getByRole('button', { name: '新增工作包' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '进入项目变更', exact: true })).toBeVisible();
  await navigate(page, '/projects/P-PLAN-001/milestones');
  await expect(page.getByRole('button', { name: '补充节点' })).toBeDisabled();


});

test('商机必填、草稿、取消及冻结编辑限制', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/'); await role(page, '客户经理'); await navigate(page, '/opportunities/new');
  await page.getByRole('button', { name: '提交商机', exact: true }).click();
  await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  await page.getByLabel('商机名称', { exact: true }).fill('草稿校验商机');
  await page.getByLabel('客户', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  await expect(page.getByText('草稿', { exact: true }).first()).toBeVisible();
  const path = new URL(page.url()).pathname;
  await navigate(page, `${path}/edit`);
  await page.getByLabel('商机名称', { exact: true }).fill('此修改应该取消');
  await page.getByRole('button', { name: /^取\s*消$/ }).click();
  await expect(page.getByRole('heading', { name: '草稿校验商机', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^暂\s*缓$/ }).click();
  const pause = page.getByRole('dialog');
  await pause.getByRole('button', { name: '确认并记录' }).click();
  await expect(pause.locator('.ant-form-item-explain-error').first()).toBeVisible();
  await pause.getByLabel('决策原因', { exact: true }).fill('客户预算安排待确认，指定复评责任人');
  await pause.getByLabel('下次复评日期', { exact: true }).fill('2026-09-20');
  await pause.getByLabel('下次复评日期', { exact: true }).press('Enter');
  await pause.getByLabel('复评责任人', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '陈亮' }).click();
  await pause.getByRole('button', { name: '确认并记录' }).click();
  await expect(pause).toBeHidden();
  await expect(page.getByText('暂缓', { exact: true }).first()).toBeVisible();
  await navigate(page, '/opportunities/OPP-001/edit');
  await expect(page.getByLabel('商机名称', { exact: true })).toBeDisabled();
});
