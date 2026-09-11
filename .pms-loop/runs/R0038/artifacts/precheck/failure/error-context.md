# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-planning.spec.ts >> UI 计划：范围保存、任务编辑、里程碑导航与评审提交快照
- Location: e2e/ui-planning.spec.ts:28:1

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '编辑', exact: true }).first()

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: PMS
        - generic [ref=e9]:
          - generic [ref=e10]: PMS 平台
          - generic [ref=e11]: 四算联动全生命周期
      - menu [ref=e12]:
        - menuitem "appstore 工作台与待办" [expanded] [ref=e13] [cursor=pointer]:
          - img "appstore" [ref=e14]
          - generic [ref=e17]: 工作台与待办
        - menu [ref=e18]:
          - menuitem "项目经理工作台" [ref=e19] [cursor=pointer]
          - menuitem "我的待办中心" [ref=e21] [cursor=pointer]
        - menuitem "dollar 商机与概算阶段" [ref=e23] [cursor=pointer]:
          - img "dollar" [ref=e24]
          - generic [ref=e27]: 商机与概算阶段
        - menuitem "project 预算与立项阶段" [expanded] [ref=e28] [cursor=pointer]:
          - img "project" [ref=e29]
          - generic [ref=e32]: 预算与立项阶段
        - menu [ref=e33]:
          - menuitem "立项申请" [ref=e34] [cursor=pointer]
          - menuitem "立项评审工作台" [ref=e36] [cursor=pointer]
          - menuitem "综合风险评估" [ref=e38] [cursor=pointer]
          - menuitem "立项决策详情" [ref=e40] [cursor=pointer]
          - menuitem "项目团队" [ref=e42] [cursor=pointer]
          - menuitem "WBS计划编制" [ref=e44] [cursor=pointer]
          - menuitem "里程碑计划" [ref=e46] [cursor=pointer]
          - menuitem "计划评审" [ref=e48] [cursor=pointer]
          - menuitem "项目预算编制" [ref=e50] [cursor=pointer]
          - menuitem "概算预算对比" [ref=e52] [cursor=pointer]
          - menuitem "预算审批详情" [ref=e54] [cursor=pointer]
          - menuitem "项目基线" [ref=e56] [cursor=pointer]
          - menuitem "未签立项台账" [ref=e58] [cursor=pointer]
          - menuitem "未签项目详情" [ref=e60] [cursor=pointer]
          - menuitem "项目启动确认" [ref=e62] [cursor=pointer]
        - menuitem "schedule 核算与执行阶段" [ref=e64] [cursor=pointer]:
          - img "schedule" [ref=e65]
          - generic [ref=e68]: 核算与执行阶段
        - menuitem "check-circle 结算与收尾阶段" [ref=e69] [cursor=pointer]:
          - img "check-circle" [ref=e70]
          - generic [ref=e74]: 结算与收尾阶段
  - generic [ref=e75]:
    - banner [ref=e76]:
      - generic [ref=e77]:
        - button "折叠或展开导航" [ref=e79] [cursor=pointer]:
          - img "menu-fold" [ref=e81]
        - button "搜索项目、合同、单据" [ref=e85] [cursor=pointer]:
          - img "search" [ref=e86]
          - generic [ref=e89]: 搜索项目、合同、单据...
          - generic [ref=e90]: ⌘K
        - strong [ref=e95]: WBS计划编制
      - generic [ref=e96]:
        - generic [ref=e97]: 数据截至 2026-09-09
        - generic [ref=e100]:
          - generic [ref=e101]: "角色:"
          - generic "模拟身份" [ref=e103] [cursor=pointer]:
            - generic [ref=e105]:
              - combobox "模拟身份" [ref=e107]
              - generic [ref=e109]:
                - img "user" [ref=e111]
                - generic [ref=e114]: 项目经理 (张建国)
        - generic [ref=e116] [cursor=pointer]:
          - img "user" [ref=e119]
          - generic [ref=e122]: 张建国
    - main [ref=e123]:
      - generic [ref=e124]:
        - navigation [ref=e125]:
          - list [ref=e126]:
            - listitem [ref=e127]:
              - link "首页" [ref=e129] [cursor=pointer]:
                - /url: /
            - listitem [aria-hidden] [ref=e130]: /
            - listitem [ref=e131]:
              - link "福建园区设备运维协同平台" [ref=e133] [cursor=pointer]:
                - /url: /projects/P-PLAN-001
            - listitem [aria-hidden] [ref=e134]: /
            - listitem [ref=e135]: WBS计划编制
        - generic [ref=e136]:
          - generic [ref=e137]:
            - heading "WBS计划编制" [level=4] [ref=e140]
            - generic [ref=e141]: 福建园区设备运维协同平台 · P-PLAN-001
          - button "返 回" [ref=e143] [cursor=pointer]
      - generic [ref=e145]:
        - table [ref=e148]:
          - rowgroup [ref=e149]:
            - row [ref=e150]:
              - 'cell "项目阶段 : 立项 / WBS编制" [ref=e151]':
                - generic [ref=e152]:
                  - generic [ref=e153]: "项目阶段 :"
                  - generic [ref=e154]: 立项 / WBS编制
              - 'cell "项目经理 : 张建国" [ref=e155]':
                - generic [ref=e156]:
                  - generic [ref=e157]: "项目经理 :"
                  - generic [ref=e158]: 张建国
              - 'cell "计划版本 : 草稿修订 2 · 草稿" [ref=e159]':
                - generic [ref=e160]:
                  - generic [ref=e161]: "计划版本 :"
                  - generic [ref=e162]: 草稿修订 2 · 草稿
            - row [ref=e164]:
              - 'cell "批准总周期 : 2026-09-09 ~ 2026-12-31" [ref=e165]':
                - generic [ref=e166]:
                  - generic [ref=e167]: "批准总周期 :"
                  - generic [ref=e168]: 2026-09-09 ~ 2026-12-31
              - 'cell "生效基线 : 未形成" [ref=e169]':
                - generic [ref=e170]:
                  - generic [ref=e171]: "生效基线 :"
                  - generic [ref=e172]: 未形成
              - 'cell "合同 : 已立项未签" [ref=e173]':
                - generic [ref=e174]:
                  - generic [ref=e175]: "合同 :"
                  - generic [ref=e176]: 已立项未签
        - generic "计划工作区" [ref=e177]:
          - tablist [ref=e178]:
            - generic [ref=e180]:
              - tab "WBS计划" [selected] [ref=e182] [cursor=pointer]
              - tab "里程碑计划" [ref=e184] [cursor=pointer]
              - tab "计划评审" [ref=e186] [cursor=pointer]
          - generic:
            - generic:
              - tabpanel "WBS计划"
      - generic [ref=e187]:
        - generic [ref=e188]:
          - generic [ref=e189]:
            - heading "项目范围" [level=2] [ref=e190]
            - generic [ref=e191]: 明确本版计划的交付边界，工作包与计划日期在下方维护。
          - generic [ref=e192]: 根节点：福建园区设备运维协同平台
        - generic [ref=e195]:
          - textbox "计划范围" [ref=e196]: 交付范围：平台实施、培训与验收资料
          - button "保存范围" [active] [ref=e197] [cursor=pointer]
      - generic [ref=e199]:
        - generic [ref=e201]:
          - heading "WBS工作分解与甘特计划" [level=2] [ref=e202]
          - generic [ref=e203]: 1 个工作包 · 叶子任务计划 160 小时
        - generic [ref=e204]:
          - generic [ref=e205]:
            - button "新增工作包" [ref=e207] [cursor=pointer]
            - button "Excel模板导入" [ref=e210] [cursor=pointer]
            - button "导出计划表" [ref=e213] [cursor=pointer]
          - table [ref=e221]:
            - rowgroup [ref=e231]:
              - row [ref=e232]:
                - columnheader "项目 / WBS工作包" [ref=e233]
                - columnheader "责任人" [ref=e234]
                - columnheader "计划日期" [ref=e235]
                - columnheader "人天 / 工时" [ref=e236]
                - columnheader "前置任务" [ref=e237]
                - columnheader "计划甘特 2026-09-09 — 2026-12-31" [ref=e238]:
                  - generic [ref=e239]:
                    - text: 计划甘特
                    - generic [ref=e240]: 2026-09-09 — 2026-12-31
                - columnheader "里程碑" [ref=e241]
                - columnheader "操作" [ref=e242]
            - rowgroup [ref=e243]:
              - generic:
                - text: 计划甘特
                - generic: 2026-09-09 — 2026-12-31
              - row [ref=e244]:
                - cell "1 设备接入与交付 完成设备接入并取得验收确认" [ref=e245]:
                  - generic [ref=e246]: 1 设备接入与交付
                  - generic [ref=e247]: 完成设备接入并取得验收确认
                - cell "张建国" [ref=e248]
                - cell "2026-09-09 2026-12-31" [ref=e249]: 2026-09-092026-12-31
                - cell "113 天 160 小时" [ref=e250]: 113 天160 小时
                - cell "无" [ref=e251]
                - cell [ref=e252]:
                  - generic "2026-09-09 至 2026-12-31" [ref=e253]
                - cell "客户终验" [ref=e255]
                - cell [ref=e256]:
                  - generic [ref=e257]:
                    - button "编 辑" [ref=e259] [cursor=pointer]
                    - button "删 除" [ref=e262] [cursor=pointer]
```

# Test source

```ts
  1  | import { mkdirSync, writeFileSync } from 'node:fs';
  2  | import { join } from 'node:path';
  3  | import { expect, test, type Page } from '@playwright/test';
  4  | import { navigate } from './helpers';
  5  | import { collectBrowserErrors } from './evidence';
  6  | 
  7  | const artifacts = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';
  8  | const errors = new WeakMap<Page, string[]>();
  9  | test.beforeEach(async ({ page }) => {
  10 |   mkdirSync(artifacts, { recursive: true });
  11 |   errors.set(page, collectBrowserErrors(page));
  12 |   await page.goto('/projects/P-PLAN-001/wbs');
  13 |   await expect(page.getByRole('heading', { name: 'WBS计划编制', exact: true })).toBeVisible();
  14 | });
  15 | test.afterEach(async ({ page }, info) => {
  16 |   const consoleErrors = errors.get(page) ?? [];
  17 |   writeFileSync(join(artifacts, `ui-planning-${info.testId.replace(/[^a-z0-9]/gi, '')}.json`), JSON.stringify({ title: info.title, status: info.status, url: page.url(), consoleErrors }, null, 2));
  18 |   expect(consoleErrors).toEqual([]);
  19 | });
  20 | async function capture(page: Page, name: string) {
  21 |   for (const width of [1440, 1280]) {
  22 |     await page.setViewportSize({ width, height: 900 });
  23 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  24 |     await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), animations: 'disabled' });
  25 |   }
  26 | }
  27 | 
  28 | test('UI 计划：范围保存、任务编辑、里程碑导航与评审提交快照', async ({ page }) => {
  29 |   await expect(page.getByRole('tab', { name: 'WBS计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  30 |   await page.getByRole('textbox', { name: '计划范围', exact: true }).fill('交付范围：平台实施、培训与验收资料');
  31 |   await page.getByRole('button', { name: '保存范围', exact: true }).click();
  32 |   await expect(page.getByText('计划草稿已保存，版本已更新', { exact: true })).toBeVisible();
  33 |   await capture(page, 'YS06');
> 34 |   await page.getByRole('button', { name: '编辑', exact: true }).first().click();
     |                                                                       ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  35 |   const task = page.getByRole('dialog');
  36 |   await expect(task.getByLabel('任务名称')).not.toHaveValue('');
  37 |   await task.getByLabel('说明', { exact: true }).fill('UI验收：保留原任务日期、依赖与完成条件');
  38 |   await task.getByRole('button', { name: '确 定' }).click();
  39 |   await expect(task).toBeHidden();
  40 |   await page.getByRole('tab', { name: '里程碑计划', exact: true }).click();
  41 |   await expect(page).toHaveURL('/projects/P-PLAN-001/milestones');
  42 |   await expect(page.getByRole('tab', { name: '里程碑计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  43 |   await capture(page, 'YS07');
  44 |   await page.getByText('标准模板与裁剪规则', { exact: true }).click();
  45 |   await expect(page.getByText(/自定义节点可裁剪/)).toBeVisible();
  46 |   await page.getByRole('button', { name: '补充节点', exact: true }).click();
  47 |   await expect(page.getByRole('dialog').getByLabel('达成条件')).toBeVisible();
  48 |   await page.getByRole('dialog').getByRole('button', { name: '取 消' }).click();
  49 |   await page.getByRole('tab', { name: '计划评审', exact: true }).click();
  50 |   await expect(page.getByText('当前草稿完整性校验通过', { exact: true })).toBeVisible();
  51 |   await capture(page, 'YS08');
  52 |   await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  53 |   await page.getByRole('dialog').getByRole('button', { name: '确 定' }).click();
  54 |   await expect(page.locator('.pms-record-summary').first()).toContainText('评审中');
  55 |   await expect(page.locator('.ant-select[aria-label="评审版本"]')).toContainText('待评审');
  56 |   await expect(page.getByRole('button', { name: '提交 / 整改重提', exact: true })).toBeDisabled();
  57 |   await page.goBack();
  58 |   await expect(page.getByRole('tab', { name: '里程碑计划', exact: true })).toHaveAttribute('aria-selected', 'true');
  59 |   await expect(page.getByRole('button', { name: '补充节点', exact: true })).toBeDisabled();
  60 | });
  61 | 
  62 | test('UI 计划：旧深链保持项目与冻结基线只读', async ({ page }) => {
  63 |   for (const [path, tab] of [['wbs', 'WBS计划'], ['milestones', '里程碑计划'], ['plan-review', '计划评审']]) {
  64 |     await navigate(page, `/projects/P-001/${path}`);
  65 |     await expect(page.locator('.pms-page-header')).toContainText('P-001');
  66 |     await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
  67 |     await expect(page.getByText('当前计划已随基线冻结，调整须提交项目变更', { exact: true })).toBeVisible();
  68 |     if (path === 'wbs') await expect(page.getByRole('button', { name: '新增工作包', exact: true })).toBeDisabled();
  69 |     if (path === 'milestones') await expect(page.getByRole('button', { name: '补充节点', exact: true })).toBeDisabled();
  70 |   }
  71 |   await page.getByRole('button', { name: '进入项目变更', exact: true }).click();
  72 |   await expect(page).toHaveURL('/project-changes/new?projectId=P-001');
  73 | });
  74 | 
```