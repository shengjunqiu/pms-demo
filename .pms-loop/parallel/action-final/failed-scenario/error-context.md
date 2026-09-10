# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: first-batch.spec.ts >> 商机提交和重新打开保留同一份业务记录
- Location: e2e/first-batch.spec.ts:37:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: locator('tr').filter({ hasText: '客户价值' }).getByRole('button', { name: '填写意见' })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" locator('tr').filter({ hasText: '客户价值' }).getByRole('button', { name: '填写意见' }) with timeout 5000ms
  - waiting for locator('tr').filter({ hasText: '客户价值' }).getByRole('button', { name: '填写意见' })

```

```yaml
- complementary:
  - img "safety-certificate"
  - text: 企业四算管控平台
  - menu:
    - menuitem "appstore 工作台与待办" [expanded]:
      - img "appstore"
      - text: 工作台与待办
    - menu:
      - menuitem "WK-02 我的待办中心"
    - menuitem "dollar 商机与概算阶段":
      - img "dollar"
      - text: 商机与概算阶段
    - menuitem "project 预算与立项阶段":
      - img "project"
      - text: 预算与立项阶段
    - menuitem "schedule 核算与执行阶段":
      - img "schedule"
      - text: 核算与执行阶段
    - menuitem "check-circle 结算与收尾阶段":
      - img "check-circle"
      - text: 结算与收尾阶段
- banner:
  - button "折叠或展开导航":
    - img "menu-fold"
  - text: GS-04
  - strong: 商机初步评估
  - text: "表单/评估 基准日: 2026-09-09 角色:"
  - combobox "模拟身份"
  - img "user"
  - text: 方案架构师 (赵工)
  - img "user"
  - text: 赵工
- main:
  - img "Unauthorized"
  - text: 403 无访问权限 当前角色没有权限访问该页面或数据，请切换角色或联系管理员
  - button "返回首页"
```

# Test source

```ts
  1   | import { mkdirSync, writeFileSync } from 'node:fs';
  2   | import { join } from 'node:path';
  3   | import { test, expect, type Page } from '@playwright/test';
  4   | import { navigate, role } from './helpers';
  5   | 
  6   | const errorsByPage = new WeakMap<Page, string[]>();
  7   | test.beforeEach(async ({ page }) => { const errors: string[] = []; errorsByPage.set(page, errors); page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); }); });
  8   | test.afterEach(async ({ page }, info) => { const errors = errorsByPage.get(page) ?? []; const dir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results'; mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, `browser-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors: errors }, null, 2)); expect(errors).toEqual([]); });
  9   | 
  10  | const pages = [
  11  |   ['GS01', '/opportunities', '客户经理'], ['GS02', '/opportunities/new', '客户经理'],
  12  |   ['GS03', '/opportunities/OPP-001', '客户经理'], ['GS04', '/opportunities/OPP-001/evaluation', '客户经理'],
  13  |   ['YS06', '/projects/P-PLAN-001/wbs', '项目经理'], ['YS07', '/projects/P-PLAN-001/milestones', '项目经理'], ['YS08', '/projects/P-PLAN-001/plan-review', '项目经理'],
  14  |   ['JS01', '/projects/P-006/internal-acceptance', '项目经理'], ['JS02', '/projects/P-006/supplier-acceptance', '项目经理'], ['JS03', '/projects/P-006/customer-acceptance', '项目经理'], ['JS04', '/projects/P-006/report-acceptance', '项目经理'],
  15  | ];
  16  | for (const width of [1440, 1280]) test(`首批页面可见性和布局 ${width}`, async ({ page }) => {
  17  |   test.setTimeout(120_000);
  18  |   const errors: string[] = [];
  19  |   page.on('pageerror', (e) => errors.push(e.message));
  20  |   page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); });
  21  |   await page.setViewportSize({ width, height: 900 });
  22  |   await page.goto('/workbench/project-manager');
  23  |   let current = '项目经理';
  24  |   for (const [id, path, name] of pages) {
  25  |     if (name !== current) { await role(page, name); current = name; }
  26  |     await navigate(page, path);
  27  |     const titles: Record<string, string> = { GS01: '商机台账', GS02: '新建商机', GS03: '福建省晋江市岸海防综合治理平台商机', GS04: '初步评估', YS06: 'YS-06', YS07: 'YS-07', YS08: 'YS-08', JS01: 'JS-01', JS02: 'JS-02', JS03: 'JS-03', JS04: 'JS-04' };
  28  |     await expect(page.locator('h4').first()).toContainText(titles[id]);
  29  |     await expect(page.getByText('403', { exact: true })).toHaveCount(0);
  30  |     await expect(page.getByText('404', { exact: true })).toHaveCount(0);
  31  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), id).toBe(true);
  32  |     await page.screenshot({ path: join(process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results', `${id}-${width}.png`), fullPage: true });
  33  |   }
  34  |   expect(errors).toEqual([]);
  35  | });
  36  | 
  37  | test('商机提交和重新打开保留同一份业务记录', async ({ page }) => {
  38  |   test.setTimeout(120_000);
  39  |   await page.goto('/');
  40  |   await role(page, '客户经理');
  41  |   await navigate(page, '/opportunities/new');
  42  |   await page.getByLabel('商机名称', { exact: true }).fill('浏览器验证园区协同项目');
  43  |   await page.getByLabel('客户', { exact: true }).click();
  44  |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  45  |   await page.getByLabel('预计项目金额（万元）', { exact: true }).fill('1000');
  46  |   await page.getByLabel('业务背景、建设目标与主要需求', { exact: true }).fill('统一园区设备台账、巡检计划与运维工单，明确交付范围。');
  47  |   await page.getByRole('button', { name: '提交商机', exact: true }).click();
  48  |   await page.getByRole('dialog').getByRole('button', { name: '确 定' }).click();
  49  |   await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  50  |   const path = new URL(page.url()).pathname;
  51  |   await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  52  |   await navigate(page, '/opportunities');
  53  |   await navigate(page, path);
  54  |   await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  55  |   await page.getByRole('button', { name: '发起评估', exact: true }).first().click();
  56  |   await expect(page.getByRole('button', { name: '确认拟立项', exact: true })).toBeDisabled();
  57  |   for (const [name, dimensions] of [
  58  |     ['客户经理', ['客户价值', '商务风险', '竞争态势']],
  59  |     ['方案架构师', ['技术可行性', '交付难度']],
  60  |     ['财务专员', ['收益与毛利']],
  61  |   ] as const) {
  62  |     if (name !== '客户经理') { await role(page, name); await navigate(page, `${path}/evaluation`); }
  63  |     const forbidden = name === '客户经理' ? '技术可行性' : name === '方案架构师' ? '客户价值' : '交付难度';
> 64  |     await expect(page.locator('tr').filter({ hasText: forbidden }).getByRole('button', { name: '填写意见' })).toBeDisabled();
      |                                                                                                           ^ Error: expect(locator).toBeDisabled() failed
  65  |     for (const dimension of dimensions) {
  66  |       await page.locator('tr').filter({ hasText: dimension }).getByRole('button', { name: '填写意见' }).click();
  67  |       const dialog = page.getByRole('dialog');
  68  |       await dialog.getByLabel('评分（0–100）', { exact: true }).fill('85');
  69  |       await dialog.getByLabel('专业结论', { exact: true }).click();
  70  |       await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^可行$/ }).click();
  71  |       await dialog.getByLabel('风险项与应对建议', { exact: true }).fill('已明确第三方接口依赖与责任人，按周跟踪');
  72  |       await dialog.locator('input[type=file]').setInputFiles({ name: `${dimension}核对.txt`, mimeType: 'text/plain', buffer: Buffer.from('客户需求和专业核对记录') });
  73  |       await dialog.getByLabel('评估说明', { exact: true }).fill(`${dimension}已核对客户需求、资源条件和费用依据`);
  74  |       if (dimension === '收益与毛利') await dialog.getByLabel('初步总成本（万元）').fill('600');
  75  |       await dialog.getByRole('button', { name: '保存本专业意见' }).click();
  76  |       await expect(dialog).toBeHidden();
  77  |     }
  78  |   }
  79  |   await role(page, '客户经理'); await navigate(page, `${path}/evaluation`);
  80  |   await page.getByPlaceholder('结合系统建议说明推进、风险处置与客户沟通依据').fill('六维核对完成，客户预算与交付资源满足，推进方案调研。');
  81  |   await page.getByRole('button', { name: '确认拟立项', exact: true }).click();
  82  |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  83  |   await expect(page.getByText('已生成方案调研任务', { exact: true })).toBeVisible();
  84  |   await expect(page.getByRole('dialog')).toBeHidden();
  85  |   await expect(page.locator('.ant-modal-mask')).toBeHidden();
  86  |   for (const width of [1440, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: join(process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results', `GS04-completed-${width}.png`), fullPage: true }); }
  87  |   await page.getByRole('button', { name: '进入方案任务' }).click();
  88  |   await expect(page).toHaveURL(`${path}/solution`);
  89  | });
  90  | 
  91  | test('策划计划经PMO评审、预算审批与独立基线确认', async ({ page }) => {
  92  |   test.setTimeout(90_000);
  93  |   await page.goto('/projects/P-PLAN-001/wbs');
  94  |   await page.getByRole('button', { name: 'Excel模板导入', exact: true }).click();
  95  |   await page.getByLabel('WBS导入内容').fill('编码\t名称\t父编码\t责任人ID\t开始\t结束\t工时\t前置编码\t完成条件\n1\t错误任务\t\tU-001\t2026-12-31\t2026-09-10\t8\t1\t交付');
  96  |   await expect(page.getByRole('button', { name: '校验通过，替换草稿任务' })).toBeDisabled();
  97  |   await page.getByRole('button', { name: '载入模板样例' }).click();
  98  |   await page.getByRole('button', { name: '校验通过，替换草稿任务' }).click();
  99  |   await expect(page.getByRole('dialog')).toBeHidden();
  100 |   await expect(page.getByText('1 平台交付', { exact: true })).toBeVisible();
  101 |   await navigate(page, '/projects/P-PLAN-001/milestones');
  102 |   await page.getByRole('button', { name: /^编\s*辑$/ }).first().click();
  103 |   await page.getByLabel('达成条件', { exact: true }).fill('启动会议纪要与责任分工确认');
  104 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  105 |   await expect(page.getByText('启动会议纪要与责任分工确认', { exact: true })).toBeVisible();
  106 |   await navigate(page, '/projects/P-PLAN-001/plan-review');
  107 |   await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  108 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  109 |   await expect(page.getByText('评审中', { exact: true })).toBeVisible();
  110 |   await role(page, 'PMO负责人');
  111 |   await navigate(page, '/projects/P-PLAN-001/plan-review');
  112 |   await page.getByLabel('计划评审意见', { exact: true }).fill('补充启动交付责任确认');
  113 |   await page.getByRole('button', { name: /^整\s*改$/ }).click();
  114 |   await page.getByLabel('整改事项', { exact: true }).fill('确认启动资料与培训责任分工');
  115 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  116 |   await expect(page.getByText('整改中', { exact: true })).toBeVisible();
  117 |   await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  118 |   await page.getByRole('button', { name: /^回\s*复$/ }).click();
  119 |   await page.getByLabel('整改落实回复', { exact: true }).fill('启动纪要已明确主PM负责资料确认与交付培训');
  120 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  121 |   await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  122 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  123 |   await expect(page.getByText('第2轮', { exact: false }).first()).toBeVisible();
  124 |   await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  125 |   await page.getByLabel('计划评审意见', { exact: true }).fill('WBS职责、里程碑、资源与范围逐项核对一致');
  126 |   await page.getByRole('button', { name: /^通\s*过$/ }).click();
  127 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  128 |   await expect(page.getByText('已通过', { exact: true })).toBeVisible();
  129 |   await expect(page.getByRole('button', { name: '进入预算编制', exact: true })).toBeVisible();
  130 |   await role(page, '项目经理');
  131 |   await navigate(page, '/projects/P-PLAN-001/budget');
  132 |   await expect(page.locator('h4').first()).toContainText('YS-09');
  133 |   await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  134 |   await expect(page.getByText('预算草稿 R1', { exact: false })).toBeVisible();
  135 |   await page.getByRole('button', { name: '提交审批', exact: true }).click();
  136 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  137 |   await expect(page).toHaveURL(/P-PLAN-001\/budget\/review$/);
  138 |   await expect(page.getByRole('button', { name: '通过，待基线确认' })).toBeDisabled();
  139 |   await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/budget/review');
  140 |   await page.getByLabel('审批意见', { exact: true }).fill('各成本科目与冻结概算一致，范围、计划和资源完整');
  141 |   await page.getByRole('button', { name: '通过，待基线确认' }).click();
  142 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  143 |   await expect(page.getByRole('button', { name: '确认基线生效' })).toBeVisible();
  144 |   await navigate(page, '/projects/P-PLAN-001/baseline');
  145 |   await expect(page.getByText('尚未形成生效基线', { exact: true })).toBeVisible();
  146 |   await page.getByRole('button', { name: '确认基线', exact: true }).click();
  147 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  148 |   await expect(page.getByText('尚未形成生效基线', { exact: true })).toHaveCount(0);
  149 |   await expect(page.getByText('基线版本快照', { exact: true })).toBeVisible();
  150 |   await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/wbs');
  151 |   await expect(page.getByRole('button', { name: '新增工作包' })).toBeDisabled();
  152 |   await expect(page.getByRole('button', { name: '进入项目变更', exact: true })).toBeVisible();
  153 |   await navigate(page, '/projects/P-PLAN-001/milestones');
  154 |   await expect(page.getByRole('button', { name: '补充节点' })).toBeDisabled();
  155 | 
  156 | 
  157 | });
  158 | 
  159 | test('商机必填、草稿、取消及冻结编辑限制', async ({ page }) => {
  160 |   test.setTimeout(60_000);
  161 |   await page.goto('/'); await role(page, '客户经理'); await navigate(page, '/opportunities/new');
  162 |   await page.getByRole('button', { name: '提交商机', exact: true }).click();
  163 |   await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  164 |   await page.getByLabel('商机名称', { exact: true }).fill('草稿校验商机');
```