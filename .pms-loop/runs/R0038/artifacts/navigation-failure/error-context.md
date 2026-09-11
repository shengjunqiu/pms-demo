# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: first-batch.spec.ts >> 策划计划经PMO评审、预算审批与独立基线确认
- Location: e2e/first-batch.spec.ts:94:1

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByLabel('达成条件', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - complementary [ref=f1e5]:
    - generic [ref=f1e6]:
      - generic [ref=f1e7]:
        - generic [ref=f1e8]: PMS
        - generic [ref=f1e9]:
          - generic [ref=f1e10]: PMS 平台
          - generic [ref=f1e11]: 四算联动全生命周期
      - menu [ref=f1e12]:
        - menuitem "appstore 工作台与待办" [expanded] [ref=f1e13] [cursor=pointer]:
          - img "appstore" [ref=f1e14]
          - generic [ref=f1e17]: 工作台与待办
        - menu [ref=f1e18]:
          - menuitem "项目经理工作台" [ref=f1e19] [cursor=pointer]
          - menuitem "我的待办中心" [ref=f1e21] [cursor=pointer]
        - menuitem "dollar 商机与概算阶段" [ref=f1e23] [cursor=pointer]:
          - img "dollar" [ref=f1e24]
          - generic [ref=f1e27]: 商机与概算阶段
        - menuitem "project 预算与立项阶段" [expanded] [ref=f1e28] [cursor=pointer]:
          - img "project" [ref=f1e29]
          - generic [ref=f1e32]: 预算与立项阶段
        - menu [ref=f1e33]:
          - menuitem "立项申请" [ref=f1e34] [cursor=pointer]
          - menuitem "立项评审工作台" [ref=f1e36] [cursor=pointer]
          - menuitem "综合风险评估" [ref=f1e38] [cursor=pointer]
          - menuitem "立项决策详情" [ref=f1e40] [cursor=pointer]
          - menuitem "项目团队" [ref=f1e42] [cursor=pointer]
          - menuitem "WBS计划编制" [ref=f1e44] [cursor=pointer]
          - menuitem "里程碑计划" [ref=f1e46] [cursor=pointer]
          - menuitem "计划评审" [ref=f1e48] [cursor=pointer]
          - menuitem "项目预算编制" [ref=f1e50] [cursor=pointer]
          - menuitem "概算预算对比" [ref=f1e52] [cursor=pointer]
          - menuitem "预算审批详情" [ref=f1e54] [cursor=pointer]
          - menuitem "项目基线" [ref=f1e56] [cursor=pointer]
          - menuitem "未签立项台账" [ref=f1e58] [cursor=pointer]
          - menuitem "未签项目详情" [ref=f1e60] [cursor=pointer]
          - menuitem "项目启动确认" [ref=f1e62] [cursor=pointer]
        - menuitem "schedule 核算与执行阶段" [ref=f1e64] [cursor=pointer]:
          - img "schedule" [ref=f1e65]
          - generic [ref=f1e68]: 核算与执行阶段
        - menuitem "check-circle 结算与收尾阶段" [ref=f1e69] [cursor=pointer]:
          - img "check-circle" [ref=f1e70]
          - generic [ref=f1e74]: 结算与收尾阶段
  - generic [ref=f1e75]:
    - banner [ref=f1e76]:
      - generic [ref=f1e77]:
        - button "折叠或展开导航" [ref=f1e79] [cursor=pointer]:
          - img "menu-fold" [ref=f1e81]
        - button "搜索项目、合同、单据" [ref=f1e85] [cursor=pointer]:
          - img "search" [ref=f1e86]
          - generic [ref=f1e89]: 搜索项目、合同、单据...
          - generic [ref=f1e90]: ⌘K
        - strong [ref=f1e95]: 里程碑计划
      - generic [ref=f1e96]:
        - generic [ref=f1e97]: 数据截至 2026-09-09
        - generic [ref=f1e100]:
          - generic [ref=f1e101]: "角色:"
          - generic "模拟身份" [ref=f1e103] [cursor=pointer]:
            - generic [ref=f1e105]:
              - combobox "模拟身份" [ref=f1e107]
              - generic [ref=f1e109]:
                - img "user" [ref=f1e111]
                - generic [ref=f1e114]: 项目经理 (张建国)
        - generic [ref=f1e116] [cursor=pointer]:
          - img "user" [ref=f1e119]
          - generic [ref=f1e122]: 张建国
    - main [ref=f1e123]:
      - generic [ref=f1e124]:
        - navigation [ref=f1e125]:
          - list [ref=f1e126]:
            - listitem [ref=f1e127]:
              - link "首页" [ref=f1e129] [cursor=pointer]:
                - /url: /
            - listitem [aria-hidden] [ref=f1e130]: /
            - listitem [ref=f1e131]:
              - link "福建园区设备运维协同平台" [ref=f1e133] [cursor=pointer]:
                - /url: /projects/P-PLAN-001
            - listitem [aria-hidden] [ref=f1e134]: /
            - listitem [ref=f1e135]: 里程碑计划
        - generic [ref=f1e136]:
          - generic [ref=f1e137]:
            - heading "里程碑计划" [level=4] [ref=f1e140]
            - generic [ref=f1e141]: 福建园区设备运维协同平台 · P-PLAN-001
          - button "返 回" [ref=f1e143] [cursor=pointer]
      - generic [ref=f1e145]:
        - table [ref=f1e148]:
          - rowgroup [ref=f1e149]:
            - row [ref=f1e150]:
              - 'cell "项目阶段 : 立项 / WBS编制" [ref=f1e151]':
                - generic [ref=f1e152]:
                  - generic [ref=f1e153]: "项目阶段 :"
                  - generic [ref=f1e154]: 立项 / WBS编制
              - 'cell "项目经理 : 张建国" [ref=f1e155]':
                - generic [ref=f1e156]:
                  - generic [ref=f1e157]: "项目经理 :"
                  - generic [ref=f1e158]: 张建国
              - 'cell "计划版本 : 草稿修订 2 · 草稿" [ref=f1e159]':
                - generic [ref=f1e160]:
                  - generic [ref=f1e161]: "计划版本 :"
                  - generic [ref=f1e162]: 草稿修订 2 · 草稿
            - row [ref=f1e164]:
              - 'cell "批准总周期 : 2026-09-09 ~ 2026-12-31" [ref=f1e165]':
                - generic [ref=f1e166]:
                  - generic [ref=f1e167]: "批准总周期 :"
                  - generic [ref=f1e168]: 2026-09-09 ~ 2026-12-31
              - 'cell "生效基线 : 未形成" [ref=f1e169]':
                - generic [ref=f1e170]:
                  - generic [ref=f1e171]: "生效基线 :"
                  - generic [ref=f1e172]: 未形成
              - 'cell "合同 : 已立项未签" [ref=f1e173]':
                - generic [ref=f1e174]:
                  - generic [ref=f1e175]: "合同 :"
                  - generic [ref=f1e176]: 已立项未签
        - generic "计划工作区" [ref=f1e177]:
          - tablist [ref=f1e178]:
            - generic [ref=f1e180]:
              - tab "WBS计划" [ref=f1e182] [cursor=pointer]
              - tab "里程碑计划" [selected] [ref=f1e184] [cursor=pointer]
              - tab "计划评审" [ref=f1e186] [cursor=pointer]
          - generic:
            - generic:
              - tabpanel "里程碑计划"
      - generic [ref=f1e187]:
        - generic [ref=f1e189]:
          - generic [ref=f1e190]: 交付时间线
          - generic [ref=f1e193]:
            - paragraph [ref=f1e194]: 合同要求验收：尚未签订合同
            - list [ref=f1e195]:
              - listitem [ref=f1e196]:
                - generic [ref=f1e199]:
                  - text: 启动
                  - paragraph [ref=f1e200]: 2026-09-09 · 张建国
                  - generic [ref=f1e201]: 未达成
              - listitem [ref=f1e202]:
                - generic [ref=f1e205]:
                  - text: 方案确认
                  - paragraph [ref=f1e206]: 2026-10-07 · 张建国
                  - generic [ref=f1e207]: 未达成
              - listitem [ref=f1e208]:
                - generic [ref=f1e211]:
                  - text: 开发完成
                  - paragraph [ref=f1e212]: 2026-11-04 · 张建国
                  - generic [ref=f1e213]: 未达成
              - listitem [ref=f1e214]:
                - generic [ref=f1e217]:
                  - text: 内部初验
                  - paragraph [ref=f1e218]: 2026-12-02 · 张建国
                  - generic [ref=f1e219]: 未达成
              - listitem [ref=f1e220]:
                - generic [ref=f1e222]:
                  - text: 客户终验
                  - paragraph [ref=f1e223]: 2026-12-31 · 张建国
                  - generic [ref=f1e224]: 未达成
        - generic [ref=f1e226]:
          - generic [ref=f1e228]:
            - generic [ref=f1e229]: 软件开发 · 里程碑与达成条件
            - generic [ref=f1e231]:
              - button "加载标准模板" [ref=f1e233] [cursor=pointer]
              - button "补充节点" [ref=f1e236] [cursor=pointer]
          - generic [ref=f1e238]:
            - paragraph [ref=f1e239]: 5 个节点 · 5 个关键里程碑 · 阶段切换需必交材料审核通过
            - group [ref=f1e240]:
              - generic "标准模板与裁剪规则" [ref=f1e241] [cursor=pointer]
            - table [ref=f1e248]:
              - rowgroup [ref=f1e255]:
                - row [ref=f1e256]:
                  - columnheader "节点 / 计划" [ref=f1e257]
                  - columnheader "责任人" [ref=f1e258]
                  - columnheader "达成条件 / 验收依据" [ref=f1e259]
                  - columnheader "必交材料" [ref=f1e260]
                  - columnheader "操作" [ref=f1e261]
              - rowgroup [ref=f1e262]:
                - row [ref=f1e263]:
                  - cell "启动 关键 2026-09-09 实际 尚未达成 到期未达成：实施计划 查看进度与阻断" [ref=f1e264]:
                    - text: 启动
                    - generic [ref=f1e265]: 关键
                    - generic [ref=f1e266]: 2026-09-09
                    - generic [ref=f1e267]: 实际 尚未达成
                    - generic [ref=f1e268]:
                      - text: 到期未达成：实施计划
                      - button "查看进度与阻断" [ref=f1e269] [cursor=pointer]
                  - cell "张建国" [ref=f1e271]
                  - cell "启动范围完成，必交材料审核通过 经评审的项目范围说明书" [ref=f1e272]:
                    - text: 启动范围完成，必交材料审核通过
                    - generic [ref=f1e273]: 经评审的项目范围说明书
                  - cell "实施计划 查看材料审核" [ref=f1e274]:
                    - generic [ref=f1e275]: 实施计划
                    - button "查看材料审核" [ref=f1e276] [cursor=pointer]
                  - cell [ref=f1e278]:
                    - generic [ref=f1e279]:
                      - button "编 辑" [ref=f1e281] [cursor=pointer]
                      - button "删 除" [disabled] [ref=f1e284]
                - row [ref=f1e285]:
                  - cell "方案确认 关键 2026-10-07 实际 尚未达成" [ref=f1e286]:
                    - text: 方案确认
                    - generic [ref=f1e287]: 关键
                    - generic [ref=f1e288]: 2026-10-07
                    - generic [ref=f1e289]: 实际 尚未达成
                  - cell "张建国" [ref=f1e290]
                  - cell "方案确认范围完成，必交材料审核通过 经评审的项目范围说明书" [ref=f1e291]:
                    - text: 方案确认范围完成，必交材料审核通过
                    - generic [ref=f1e292]: 经评审的项目范围说明书
                  - cell "测试报告 查看材料审核" [ref=f1e293]:
                    - generic [ref=f1e294]: 测试报告
                    - button "查看材料审核" [ref=f1e295] [cursor=pointer]
                  - cell [ref=f1e297]:
                    - generic [ref=f1e298]:
                      - button "编 辑" [ref=f1e300] [cursor=pointer]
                      - button "删 除" [disabled] [ref=f1e303]
                - row [ref=f1e304]:
                  - cell "开发完成 关键 2026-11-04 实际 尚未达成" [ref=f1e305]:
                    - text: 开发完成
                    - generic [ref=f1e306]: 关键
                    - generic [ref=f1e307]: 2026-11-04
                    - generic [ref=f1e308]: 实际 尚未达成
                  - cell "张建国" [ref=f1e309]
                  - cell "开发完成范围完成，必交材料审核通过 经评审的项目范围说明书" [ref=f1e310]:
                    - text: 开发完成范围完成，必交材料审核通过
                    - generic [ref=f1e311]: 经评审的项目范围说明书
                  - cell "测试报告 查看材料审核" [ref=f1e312]:
                    - generic [ref=f1e313]: 测试报告
                    - button "查看材料审核" [ref=f1e314] [cursor=pointer]
                  - cell [ref=f1e316]:
                    - generic [ref=f1e317]:
                      - button "编 辑" [ref=f1e319] [cursor=pointer]
                      - button "删 除" [disabled] [ref=f1e322]
                - row [ref=f1e323]:
                  - cell "内部初验 关键 2026-12-02 实际 尚未达成" [ref=f1e324]:
                    - text: 内部初验
                    - generic [ref=f1e325]: 关键
                    - generic [ref=f1e326]: 2026-12-02
                    - generic [ref=f1e327]: 实际 尚未达成
                  - cell "张建国" [ref=f1e328]
                  - cell "内部初验范围完成，必交材料审核通过 经评审的项目范围说明书" [ref=f1e329]:
                    - text: 内部初验范围完成，必交材料审核通过
                    - generic [ref=f1e330]: 经评审的项目范围说明书
                  - cell "验收确认函 查看材料审核" [ref=f1e331]:
                    - generic [ref=f1e332]: 验收确认函
                    - button "查看材料审核" [ref=f1e333] [cursor=pointer]
                  - cell [ref=f1e335]:
                    - generic [ref=f1e336]:
                      - button "编 辑" [ref=f1e338] [cursor=pointer]
                      - button "删 除" [disabled] [ref=f1e341]
                - row [ref=f1e342]:
                  - cell "客户终验 关键 2026-12-31 实际 尚未达成" [ref=f1e343]:
                    - text: 客户终验
                    - generic [ref=f1e344]: 关键
                    - generic [ref=f1e345]: 2026-12-31
                    - generic [ref=f1e346]: 实际 尚未达成
                  - cell "张建国" [ref=f1e347]
                  - cell "客户终验范围完成，必交材料审核通过 经评审的项目范围说明书" [ref=f1e348]:
                    - text: 客户终验范围完成，必交材料审核通过
                    - generic [ref=f1e349]: 经评审的项目范围说明书
                  - cell "验收确认函 查看材料审核" [ref=f1e350]:
                    - generic [ref=f1e351]: 验收确认函
                    - button "查看材料审核" [ref=f1e352] [cursor=pointer]
                  - cell [ref=f1e354]:
                    - generic [ref=f1e355]:
                      - button "编 辑" [ref=f1e357] [cursor=pointer]
                      - button "删 除" [disabled] [ref=f1e360]
```

# Test source

```ts
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
  27  |     const titles: Record<string, string> = { GS01: '商机台账', GS02: '新建商机', GS03: '福建省晋江市岸海防综合治理平台商机', GS04: '初步评估', YS06: 'WBS计划编制', YS07: '里程碑计划', YS08: '计划评审', JS01: '内部验收', JS02: '供应商验收', JS03: '客户验收', JS04: '项目报验' };
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
  45  |   await page.getByLabel('协同人员', { exact: true }).click();
  46  |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^赵工$/ }).click();
  47  |   await page.getByLabel('商机名称', { exact: true }).click();
  48  |   await page.getByLabel('预计项目金额（万元）', { exact: true }).fill('1000');
  49  |   await page.getByLabel('业务背景、建设目标与主要需求', { exact: true }).fill('统一园区设备台账、巡检计划与运维工单，明确交付范围。');
  50  |   await page.getByRole('button', { name: '提交商机', exact: true }).click();
  51  |   await page.getByRole('dialog').getByRole('button', { name: '确 定' }).click();
  52  |   await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  53  |   const path = new URL(page.url()).pathname;
  54  |   await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  55  |   await navigate(page, '/opportunities');
  56  |   await navigate(page, path);
  57  |   await expect(page.getByText('浏览器验证园区协同项目', { exact: true }).first()).toBeVisible();
  58  |   await page.getByRole('button', { name: '发起评估', exact: true }).first().click();
  59  |   await expect(page.getByRole('button', { name: '确认拟立项', exact: true })).toBeDisabled();
  60  |   for (const [name, dimensions] of [
  61  |     ['客户经理', ['客户价值', '商务风险', '竞争态势']],
  62  |     ['方案架构师', ['技术可行性', '交付难度']],
  63  |     ['财务专员', ['收益与毛利']],
  64  |   ] as const) {
  65  |     if (name !== '客户经理') { await role(page, name); await navigate(page, `${path}/evaluation`); }
  66  |     const forbidden = name === '客户经理' ? '技术可行性' : name === '方案架构师' ? '客户价值' : '交付难度';
  67  |     await expect(page.locator('tr').filter({ hasText: forbidden }).getByRole('button', { name: '填写意见' })).toBeDisabled();
  68  |     for (const dimension of dimensions) {
  69  |       await page.locator('tr').filter({ hasText: dimension }).getByRole('button', { name: '填写意见' }).click();
  70  |       const dialog = page.getByRole('dialog');
  71  |       await dialog.getByLabel('评分（0–100）', { exact: true }).fill('85');
  72  |       await dialog.getByLabel('专业结论', { exact: true }).click();
  73  |       await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^可行$/ }).click();
  74  |       await dialog.getByLabel('风险项与应对建议', { exact: true }).fill('已明确第三方接口依赖与责任人，按周跟踪');
  75  |       await dialog.locator('input[type=file]').setInputFiles({ name: `${dimension}核对.txt`, mimeType: 'text/plain', buffer: Buffer.from('客户需求和专业核对记录') });
  76  |       await dialog.getByLabel('评估说明', { exact: true }).fill(`${dimension}已核对客户需求、资源条件和费用依据`);
  77  |       if (dimension === '收益与毛利') await dialog.getByLabel('初步总成本（万元）').fill('600');
  78  |       await dialog.getByRole('button', { name: '保存本专业意见' }).click();
  79  |       await expect(dialog).toBeHidden();
  80  |     }
  81  |   }
  82  |   await role(page, '客户经理'); await navigate(page, `${path}/evaluation`);
  83  |   await page.getByPlaceholder('结合系统建议说明推进、风险处置与客户沟通依据').fill('六维核对完成，客户预算与交付资源满足，推进方案调研。');
  84  |   await page.getByRole('button', { name: '确认拟立项', exact: true }).click();
  85  |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  86  |   await expect(page.getByText('已生成方案调研任务', { exact: true })).toBeVisible();
  87  |   await expect(page.getByRole('dialog')).toBeHidden();
  88  |   await expect(page.locator('.ant-modal-mask')).toBeHidden();
  89  |   for (const width of [1440, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: join(process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results', `GS04-completed-${width}.png`), fullPage: true }); }
  90  |   await page.getByRole('button', { name: '进入方案任务' }).click();
  91  |   await expect(page).toHaveURL(`${path}/solution`);
  92  | });
  93  | 
  94  | test('策划计划经PMO评审、预算审批与独立基线确认', async ({ page }) => {
  95  |   test.setTimeout(90_000);
  96  |   await page.goto('/projects/P-PLAN-001/wbs');
  97  |   await page.getByRole('button', { name: 'Excel模板导入', exact: true }).click();
  98  |   await page.getByLabel('WBS导入内容').fill('编码\t名称\t父编码\t责任人ID\t开始\t结束\t工时\t前置编码\t完成条件\n1\t错误任务\t\tU-001\t2026-12-31\t2026-09-10\t8\t1\t交付');
  99  |   await expect(page.getByRole('button', { name: '校验通过，替换草稿任务' })).toBeDisabled();
  100 |   await page.getByRole('button', { name: '载入模板样例' }).click();
  101 |   await page.getByRole('button', { name: '校验通过，替换草稿任务' }).click();
  102 |   await expect(page.getByRole('dialog')).toBeHidden();
  103 |   await expect(page.getByText('1 平台交付', { exact: true })).toBeVisible();
  104 |   await navigate(page, '/projects/P-PLAN-001/milestones');
  105 |   await page.getByRole('button', { name: /^编\s*辑$/ }).first().click();
> 106 |   await page.getByLabel('达成条件', { exact: true }).fill('启动会议纪要与责任分工确认');
      |                                                  ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  107 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  108 |   await expect(page.getByText('启动会议纪要与责任分工确认', { exact: true })).toBeVisible();
  109 |   await navigate(page, '/projects/P-PLAN-001/plan-review');
  110 |   await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  111 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  112 |   await expect(page.getByText('评审中', { exact: true })).toBeVisible();
  113 |   await role(page, 'PMO负责人');
  114 |   await navigate(page, '/projects/P-PLAN-001/plan-review');
  115 |   await page.getByLabel('计划评审意见', { exact: true }).fill('补充启动交付责任确认');
  116 |   await page.getByRole('button', { name: /^整\s*改$/ }).click();
  117 |   await page.getByLabel('整改事项', { exact: true }).fill('确认启动资料与培训责任分工');
  118 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  119 |   await expect(page.getByText('整改中', { exact: true })).toBeVisible();
  120 |   await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  121 |   await page.getByRole('button', { name: /^回\s*复$/ }).click();
  122 |   await page.getByLabel('整改落实回复', { exact: true }).fill('启动纪要已明确主PM负责资料确认与交付培训');
  123 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  124 |   await page.getByRole('button', { name: '提交 / 整改重提', exact: true }).click();
  125 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  126 |   await expect(page.getByText('第2轮', { exact: false }).first()).toBeVisible();
  127 |   await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/plan-review');
  128 |   await page.getByLabel('计划评审意见', { exact: true }).fill('WBS职责、里程碑、资源与范围逐项核对一致');
  129 |   await page.getByRole('button', { name: /^通\s*过$/ }).click();
  130 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  131 |   await expect(page.getByText('已通过', { exact: true })).toBeVisible();
  132 |   await expect(page.getByRole('button', { name: '进入预算编制', exact: true })).toBeVisible();
  133 |   await role(page, '项目经理');
  134 |   await navigate(page, '/projects/P-PLAN-001/budget');
  135 |   await expect(page.locator('h4').first()).toContainText('项目预算编制');
  136 |   await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  137 |   await expect(page.getByText('预算草稿 R1', { exact: false })).toBeVisible();
  138 |   await page.getByRole('button', { name: '提交审批', exact: true }).click();
  139 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  140 |   await expect(page).toHaveURL(/P-PLAN-001\/budget\/review$/);
  141 |   await expect(page.getByRole('button', { name: '通过，待基线确认' })).toBeDisabled();
  142 |   await role(page, 'PMO负责人'); await navigate(page, '/projects/P-PLAN-001/budget/review');
  143 |   await page.getByLabel('审批意见', { exact: true }).fill('各成本科目与冻结概算一致，范围、计划和资源完整');
  144 |   await page.getByRole('button', { name: '通过，待基线确认' }).click();
  145 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  146 |   await expect(page.getByRole('button', { name: '确认基线生效' })).toBeVisible();
  147 |   await navigate(page, '/projects/P-PLAN-001/baseline');
  148 |   await expect(page.getByText('尚未形成生效基线', { exact: true })).toBeVisible();
  149 |   await page.getByRole('button', { name: '确认基线', exact: true }).click();
  150 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  151 |   await expect(page.getByText('尚未形成生效基线', { exact: true })).toHaveCount(0);
  152 |   await expect(page.getByText('基线版本快照', { exact: true })).toBeVisible();
  153 |   await role(page, '项目经理'); await navigate(page, '/projects/P-PLAN-001/wbs');
  154 |   await expect(page.getByRole('button', { name: '新增工作包' })).toBeDisabled();
  155 |   await expect(page.getByRole('button', { name: '进入项目变更', exact: true })).toBeVisible();
  156 |   await navigate(page, '/projects/P-PLAN-001/milestones');
  157 |   await expect(page.getByRole('button', { name: '补充节点' })).toBeDisabled();
  158 | 
  159 | 
  160 | });
  161 | 
  162 | test('商机必填、草稿、取消及冻结编辑限制', async ({ page }) => {
  163 |   test.setTimeout(60_000);
  164 |   await page.goto('/'); await role(page, '客户经理'); await navigate(page, '/opportunities/new');
  165 |   await page.getByRole('button', { name: '提交商机', exact: true }).click();
  166 |   await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  167 |   await page.getByLabel('商机名称', { exact: true }).fill('草稿校验商机');
  168 |   await page.getByLabel('客户', { exact: true }).click();
  169 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  170 |   await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  171 |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  172 |   await expect(page).toHaveURL(/\/opportunities\/OPP-NEW-\d+$/);
  173 |   await expect(page.getByText('草稿', { exact: true }).first()).toBeVisible();
  174 |   const path = new URL(page.url()).pathname;
  175 |   await navigate(page, `${path}/edit`);
  176 |   await page.getByLabel('商机名称', { exact: true }).fill('此修改应该取消');
  177 |   await page.getByRole('button', { name: /^取\s*消$/ }).click();
  178 |   await expect(page.getByRole('heading', { name: '草稿校验商机', exact: true })).toBeVisible();
  179 |   await page.getByRole('button', { name: /^暂\s*缓$/ }).click();
  180 |   const pause = page.getByRole('dialog');
  181 |   await pause.getByRole('button', { name: '确认并记录' }).click();
  182 |   await expect(pause.locator('.ant-form-item-explain-error').first()).toBeVisible();
  183 |   await pause.getByLabel('决策原因', { exact: true }).fill('客户预算安排待确认，指定复评责任人');
  184 |   await pause.getByLabel('下次复评日期', { exact: true }).fill('2026-09-20');
  185 |   await pause.getByLabel('下次复评日期', { exact: true }).press('Enter');
  186 |   await pause.getByLabel('复评责任人', { exact: true }).click();
  187 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '陈亮' }).click();
  188 |   await pause.getByRole('button', { name: '确认并记录' }).click();
  189 |   await expect(pause).toBeHidden();
  190 |   await expect(page.getByText('暂缓', { exact: true }).first()).toBeVisible();
  191 |   await navigate(page, '/opportunities/OPP-001/edit');
  192 |   await expect(page.getByLabel('商机名称', { exact: true })).toBeDisabled();
  193 | });
  194 | 
```