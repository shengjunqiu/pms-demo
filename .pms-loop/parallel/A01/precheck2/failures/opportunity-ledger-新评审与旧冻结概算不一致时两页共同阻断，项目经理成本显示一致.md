# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: opportunity-ledger.spec.ts >> 新评审与旧冻结概算不一致时两页共同阻断，项目经理成本显示一致
- Location: e2e/opportunity-ledger.spec.ts:175:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('button', { name: '发起立项', exact: true })
Expected: disabled
Error: strict mode violation: getByRole('button', { name: '发起立项', exact: true }) resolved to 10 elements:
    1) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).first()
    2) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).nth(1)
    3) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).nth(2)
    4) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).nth(3)
    5) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).nth(4)
    6) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka getByRole('button', { name: '发起立项' }).nth(5)
    7) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka locator('tr:nth-child(8) > .ant-table-cell.ant-table-cell-fix-right > .ant-space > div:nth-child(3) > span > .ant-btn')
    8) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka locator('tr:nth-child(9) > .ant-table-cell.ant-table-cell-fix-right > .ant-space > div:nth-child(3) > span > .ant-btn')
    9) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka locator('tr:nth-child(10) > .ant-table-cell.ant-table-cell-fix-right > .ant-space > div:nth-child(3) > span > .ant-btn')
    10) <button disabled type="button" class="ant-btn css-dev-only-do-not-override-vgqema ant-btn-default ant-btn-color-default ant-btn-variant-outlined ant-btn-sm">…</button> aka locator('tr:nth-child(11) > .ant-table-cell.ant-table-cell-fix-right > .ant-space > div:nth-child(3) > span > .ant-btn')

Call log:
  - Expect "toBeDisabled" getByRole('button', { name: '发起立项', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: '发起立项', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - img "safety-certificate" [ref=e8]
        - generic [ref=e11]: 企业四算管控平台
      - menu [ref=e12]:
        - menuitem "appstore 工作台与待办" [expanded] [ref=e13] [cursor=pointer]:
          - img "appstore" [ref=e14]
          - generic [ref=e17]: 工作台与待办
        - menu [ref=e18]:
          - menuitem "WK-02 我的待办中心" [ref=e19] [cursor=pointer]
        - menuitem "dollar 商机与概算阶段" [ref=e21] [cursor=pointer]:
          - img "dollar" [ref=e22]
          - generic [ref=e25]: 商机与概算阶段
        - menuitem "project 预算与立项阶段" [ref=e26] [cursor=pointer]:
          - img "project" [ref=e27]
          - generic [ref=e30]: 预算与立项阶段
        - menuitem "schedule 核算与执行阶段" [ref=e31] [cursor=pointer]:
          - img "schedule" [ref=e32]
          - generic [ref=e35]: 核算与执行阶段
        - menuitem "check-circle 结算与收尾阶段" [ref=e36] [cursor=pointer]:
          - img "check-circle" [ref=e37]
          - generic [ref=e41]: 结算与收尾阶段
  - generic [ref=e42]:
    - banner [ref=e43]:
      - generic [ref=e44]:
        - button "折叠或展开导航" [ref=e46] [cursor=pointer]:
          - img "menu-fold" [ref=e48]
        - generic [ref=e52]:
          - generic [ref=e53]: GS-01
          - strong [ref=e57]: 商机台账
          - generic [ref=e58]: 台账列表
      - generic [ref=e60]:
        - generic [ref=e61]: "基准日: 2026-09-09"
        - generic [ref=e64]:
          - generic [ref=e65]: "角色:"
          - generic "模拟身份" [ref=e67] [cursor=pointer]:
            - generic [ref=e69]:
              - combobox "模拟身份" [ref=e71]
              - generic [ref=e73]:
                - img "user" [ref=e75]
                - generic [ref=e78]: 客户经理/销售 (陈亮)
        - generic [ref=e80] [cursor=pointer]:
          - img "user" [ref=e83]
          - generic [ref=e86]: 陈亮
    - main [ref=e87]:
      - generic [ref=e88]:
        - navigation [ref=e89]:
          - list [ref=e90]:
            - listitem [ref=e91]: 商机与概算
            - listitem [aria-hidden] [ref=e92]: /
            - listitem [ref=e93]: 商机台账
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]:
              - heading "商机台账" [level=4] [ref=e98]
              - generic [ref=e99]: GS-01
              - generic [ref=e101]: 台账列表
            - generic [ref=e103]: 预计金额与已签合同分开管理；按当前角色可见范围汇总，金额单位：万元。
          - button "新建商机" [ref=e105] [cursor=pointer]
        - separator [ref=e107]
      - generic [ref=e108]:
        - generic [ref=e112]:
          - generic [ref=e113]: 当前筛选商机
          - generic [ref=e114]:
            - generic [ref=e115]: "74"
            - generic [ref=e116]: 个
        - generic [ref=e120]:
          - generic [ref=e121]: 预计项目总额
          - generic [ref=e122]:
            - generic [ref=e123]: 333,761.60
            - generic [ref=e124]: 万
        - generic [ref=e128]:
          - generic [ref=e129]: 拟立项
          - generic [ref=e130]:
            - generic [ref=e131]: "1"
            - generic [ref=e132]: 个
        - generic [ref=e136]:
          - generic [ref=e137]: 初评待补充
          - generic [ref=e138]:
            - generic [ref=e139]: "0"
            - generic [ref=e140]: 个
      - generic [ref=e143]:
        - generic [ref=e144]:
          - generic [ref=e147]:
            - generic "编号 / 商机名称" [ref=e149]
            - generic [ref=e153]:
              - textbox "编号 / 商机名称" [ref=e154]: 台账验收数据共享项目
              - button [ref=e156] [cursor=pointer]:
                - img "close-circle" [ref=e157]
          - generic [ref=e162]:
            - generic "客户名称" [ref=e164]
            - textbox "客户名称" [ref=e169]
          - generic [ref=e173]:
            - generic "商机状态" [ref=e175]
            - combobox "商机状态" [ref=e183] [cursor=pointer]
          - generic [ref=e186]:
            - generic "负责人" [ref=e188]
            - textbox "负责人" [ref=e193]
        - generic [ref=e195]:
          - button "查 询" [active] [ref=e197] [cursor=pointer]
          - button "重 置" [ref=e200] [cursor=pointer]
          - button "更多筛选" [ref=e203] [cursor=pointer]
      - generic [ref=e205]:
        - generic [ref=e206]: 商机列表 · 74 项
        - generic [ref=e209]:
          - generic [ref=e210]:
            - generic "常用视图" [ref=e212] [cursor=pointer]:
              - generic [ref=e214]:
                - combobox "常用视图" [ref=e216]
                - generic: 常用视图
            - button "保存视图" [ref=e218] [cursor=pointer]
            - button "恢复默认视图" [ref=e221] [cursor=pointer]
            - button "列设置" [ref=e224] [cursor=pointer]
            - button "导出预览" [ref=e227] [cursor=pointer]
          - generic [ref=e231]:
            - table [ref=e235]:
              - rowgroup [ref=e249]:
                - row [ref=e250]:
                  - columnheader "商机编号 / 名称" [ref=e251]
                  - columnheader "客户" [ref=e252]
                  - columnheader "负责人" [ref=e253]
                  - columnheader "主办部门" [ref=e254]
                  - columnheader "预计金额（万元）" [ref=e255] [cursor=pointer]
                  - columnheader "预计签约" [ref=e266] [cursor=pointer]
                  - columnheader "状态" [ref=e277]
                  - columnheader "综合评估结论" [ref=e278]
                  - columnheader "概算（万元）" [ref=e279]
                  - columnheader "提前投入（万元）" [ref=e280]
                  - columnheader "最后跟进" [ref=e281]
                  - columnheader "操作" [ref=e282]
              - rowgroup [ref=e283]:
                - generic: 预计金额（万元）
                - generic: 预计签约
                - row [ref=e284]:
                  - cell "福建省晋江市岸海防综合治理平台商机 OPP-2026-001" [ref=e285]:
                    - link "福建省晋江市岸海防综合治理平台商机" [ref=e286] [cursor=pointer]:
                      - /url: /opportunities/OPP-001
                    - generic [ref=e287]: OPP-2026-001
                  - cell "福建省晋江市海洋与渔业局" [ref=e288]
                  - cell "张建国" [ref=e289]
                  - cell "智慧城市业务群" [ref=e290]
                  - cell "5,538.30" [ref=e291]
                  - cell "2026-10-15" [ref=e292]
                  - cell "已转立项" [ref=e293]
                  - cell "尚无初评记录" [ref=e295]
                  - cell "3,212.00" [ref=e296]
                  - cell "30.00" [ref=e297]
                  - cell "无跟进记录" [ref=e298]
                  - cell [ref=e299]:
                    - generic [ref=e300]:
                      - button "查看" [ref=e302] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e305]
                      - button "发起立项" [disabled] [ref=e308]
                - row [ref=e309]:
                  - cell "福建省生态环境视频能力平台商机 OPP-2026-002" [ref=e310]:
                    - link "福建省生态环境视频能力平台商机" [ref=e311] [cursor=pointer]:
                      - /url: /opportunities/OPP-002
                    - generic [ref=e312]: OPP-2026-002
                  - cell "福建省生态环境厅" [ref=e313]
                  - cell "李主任" [ref=e314]
                  - cell "智慧城市业务群" [ref=e315]
                  - cell "1,008.30" [ref=e316]
                  - cell "2026-10-15" [ref=e317]
                  - cell "已转立项" [ref=e318]
                  - cell "尚无初评记录" [ref=e320]
                  - cell "585.00" [ref=e321]
                  - cell "30.00" [ref=e322]
                  - cell "无跟进记录" [ref=e323]
                  - cell [ref=e324]:
                    - generic [ref=e325]:
                      - button "查看" [ref=e327] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e330]
                      - button "发起立项" [disabled] [ref=e333]
                - row [ref=e334]:
                  - cell "某市城市运行管理服务平台商机 OPP-2026-003" [ref=e335]:
                    - link "某市城市运行管理服务平台商机" [ref=e336] [cursor=pointer]:
                      - /url: /opportunities/OPP-003
                    - generic [ref=e337]: OPP-2026-003
                  - cell "某市城市管理监督局" [ref=e338]
                  - cell "王总" [ref=e339]
                  - cell "智慧城市业务群" [ref=e340]
                  - cell "3,260.00" [ref=e341]
                  - cell "2026-10-15" [ref=e342]
                  - cell "已转立项" [ref=e343]
                  - cell "尚无初评记录" [ref=e345]
                  - cell "1,891.00" [ref=e346]
                  - cell "30.00" [ref=e347]
                  - cell "无跟进记录" [ref=e348]
                  - cell [ref=e349]:
                    - generic [ref=e350]:
                      - button "查看" [ref=e352] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e355]
                      - button "发起立项" [disabled] [ref=e358]
                - row [ref=e359]:
                  - cell "某省一体化政务服务能力提升项目商机 OPP-2026-004" [ref=e360]:
                    - link "某省一体化政务服务能力提升项目商机" [ref=e361] [cursor=pointer]:
                      - /url: /opportunities/OPP-004
                    - generic [ref=e362]: OPP-2026-004
                  - cell "某省政务服务数据管理局" [ref=e363]
                  - cell "刘敏" [ref=e364]
                  - cell "智慧城市业务群" [ref=e365]
                  - cell "8,800.00" [ref=e366]
                  - cell "2026-10-15" [ref=e367]
                  - cell "已转立项" [ref=e368]
                  - cell "尚无初评记录" [ref=e370]
                  - cell "5,104.00" [ref=e371]
                  - cell "98.50" [ref=e372]
                  - cell "无跟进记录" [ref=e373]
                  - cell [ref=e374]:
                    - generic [ref=e375]:
                      - button "查看" [ref=e377] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e380]
                      - button "发起立项" [disabled] [ref=e383]
                - row [ref=e384]:
                  - cell "某市公共安全视频智能化建设项目商机 OPP-2026-005" [ref=e385]:
                    - link "某市公共安全视频智能化建设项目商机" [ref=e386] [cursor=pointer]:
                      - /url: /opportunities/OPP-005
                    - generic [ref=e387]: OPP-2026-005
                  - cell "某市公安局公共安全处" [ref=e388]
                  - cell "赵工" [ref=e389]
                  - cell "智慧城市业务群" [ref=e390]
                  - cell "12,600.00" [ref=e391]
                  - cell "2026-10-15" [ref=e392]
                  - cell "已转立项" [ref=e393]
                  - cell "尚无初评记录" [ref=e395]
                  - cell "7,308.00" [ref=e396]
                  - cell "30.00" [ref=e397]
                  - cell "无跟进记录" [ref=e398]
                  - cell [ref=e399]:
                    - generic [ref=e400]:
                      - button "查看" [ref=e402] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e405]
                      - button "发起立项" [disabled] [ref=e408]
                - row [ref=e409]:
                  - cell "某区智慧园区数字化平台商机 OPP-2026-006" [ref=e410]:
                    - link "某区智慧园区数字化平台商机" [ref=e411] [cursor=pointer]:
                      - /url: /opportunities/OPP-006
                    - generic [ref=e412]: OPP-2026-006
                  - cell "某区高新技术产业园区管委会" [ref=e413]
                  - cell "张建国" [ref=e414]
                  - cell "智慧城市业务群" [ref=e415]
                  - cell "1,860.00" [ref=e416]
                  - cell "2026-10-15" [ref=e417]
                  - cell "已转立项" [ref=e418]
                  - cell "尚无初评记录" [ref=e420]
                  - cell "1,079.00" [ref=e421]
                  - cell "30.00" [ref=e422]
                  - cell "无跟进记录" [ref=e423]
                  - cell [ref=e424]:
                    - generic [ref=e425]:
                      - button "查看" [ref=e427] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e430]
                      - button "发起立项" [disabled] [ref=e433]
                - row [ref=e434]:
                  - cell "某市政务云运维服务项目商机 OPP-2026-007" [ref=e435]:
                    - link "某市政务云运维服务项目商机" [ref=e436] [cursor=pointer]:
                      - /url: /opportunities/OPP-007
                    - generic [ref=e437]: OPP-2026-007
                  - cell "某市大数据与政务云运营中心" [ref=e438]
                  - cell "李主任" [ref=e439]
                  - cell "智慧城市业务群" [ref=e440]
                  - cell "980.00" [ref=e441]
                  - cell "2026-10-15" [ref=e442]
                  - cell "已转立项" [ref=e443]
                  - cell "尚无初评记录" [ref=e445]
                  - cell "568.00" [ref=e446]
                  - cell "30.00" [ref=e447]
                  - cell "无跟进记录" [ref=e448]
                  - cell [ref=e449]:
                    - generic [ref=e450]:
                      - button "查看" [ref=e452] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e455]
                      - button "发起立项" [disabled] [ref=e458]
                - row [ref=e459]:
                  - cell "某县数据中台建设项目商机 OPP-2026-008" [ref=e460]:
                    - link "某县数据中台建设项目商机" [ref=e461] [cursor=pointer]:
                      - /url: /opportunities/OPP-008
                    - generic [ref=e462]: OPP-2026-008
                  - cell "某县数字经济发展中心" [ref=e463]
                  - cell "王总" [ref=e464]
                  - cell "智慧城市业务群" [ref=e465]
                  - cell "2,480.00" [ref=e466]
                  - cell "2026-10-15" [ref=e467]
                  - cell "已转立项" [ref=e468]
                  - cell "尚无初评记录" [ref=e470]
                  - cell "1,438.00" [ref=e471]
                  - cell "30.00" [ref=e472]
                  - cell "无跟进记录" [ref=e473]
                  - cell [ref=e474]:
                    - generic [ref=e475]:
                      - button "查看" [ref=e477] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e480]
                      - button "发起立项" [disabled] [ref=e483]
                - row [ref=e484]:
                  - cell "海州市工业和信息化业务协同平台商机 OPP-2026-009" [ref=e485]:
                    - link "海州市工业和信息化业务协同平台商机" [ref=e486] [cursor=pointer]:
                      - /url: /opportunities/OPP-009
                    - generic [ref=e487]: OPP-2026-009
                  - cell "海州市工业和信息化局" [ref=e488]
                  - cell "刘敏" [ref=e489]
                  - cell "智慧城市业务群" [ref=e490]
                  - cell "1,175.00" [ref=e491]
                  - cell "2026-10-15" [ref=e492]
                  - cell "已转立项" [ref=e493]
                  - cell "尚无初评记录" [ref=e495]
                  - cell "682.00" [ref=e496]
                  - cell "30.00" [ref=e497]
                  - cell "无跟进记录" [ref=e498]
                  - cell [ref=e499]:
                    - generic [ref=e500]:
                      - button "查看" [ref=e502] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e505]
                      - button "发起立项" [disabled] [ref=e508]
                - row [ref=e509]:
                  - cell "海州市城市投资业务协同平台商机 OPP-2026-010" [ref=e510]:
                    - link "海州市城市投资业务协同平台商机" [ref=e511] [cursor=pointer]:
                      - /url: /opportunities/OPP-010
                    - generic [ref=e512]: OPP-2026-010
                  - cell "海州市城市投资集团" [ref=e513]
                  - cell "赵工" [ref=e514]
                  - cell "智慧城市业务群" [ref=e515]
                  - cell "1,250.00" [ref=e516]
                  - cell "2026-10-15" [ref=e517]
                  - cell "已转立项" [ref=e518]
                  - cell "尚无初评记录" [ref=e520]
                  - cell "725.00" [ref=e521]
                  - cell "30.00" [ref=e522]
                  - cell "无跟进记录" [ref=e523]
                  - cell [ref=e524]:
                    - generic [ref=e525]:
                      - button "查看" [ref=e527] [cursor=pointer]
                      - button "编辑" [disabled] [ref=e530]
                      - button "发起立项" [disabled] [ref=e533]
            - list [ref=e534]:
              - listitem [ref=e535]: 共 74 条
              - listitem "上一页" [ref=e536]:
                - button [disabled] [ref=e537]:
                  - img "left" [ref=e538]
              - listitem "1" [ref=e541] [cursor=pointer]
              - listitem "2" [ref=e543] [cursor=pointer]
              - listitem "3" [ref=e545] [cursor=pointer]
              - listitem "4" [ref=e547] [cursor=pointer]
              - listitem "5" [ref=e549] [cursor=pointer]
              - listitem "向后 5 页" [ref=e551] [cursor=pointer]:
                - generic [ref=e553]:
                  - img "double-right" [ref=e554]
                  - generic [ref=e557]: •••
              - listitem "8" [ref=e558] [cursor=pointer]
              - listitem "下一页" [ref=e560] [cursor=pointer]:
                - button [ref=e561]:
                  - img "right" [ref=e562]
              - listitem [ref=e565]:
                - generic "页码" [ref=e566] [cursor=pointer]:
                  - generic [ref=e568]:
                    - combobox "页码" [ref=e570]
                    - generic "10 条/页" [ref=e571]
```

# Test source

```ts
  82  |   const consoleErrors = browserErrors.get(page) ?? [];
  83  |   writeBrowserReport(info, { url: page.url(), consoleErrors });
  84  |   expect(consoleErrors).toEqual([]);
  85  | });
  86  | 
  87  | test('台账日期方案恢复、列设置导出与补录跟进日期', async ({ page }) => {
  88  |   const errors = collectBrowserErrors(page);
  89  |   const id = await seed(page);
  90  |   await navigate(page, '/opportunities?start=2026-10-01&end=2026-10-31');
  91  |   await page.getByRole('button', { name: '更多筛选', exact: true }).click();
  92  |   const dates = page.locator('.ant-picker-range input');
  93  |   await expect(dates.nth(0)).toHaveValue('2026-10-01');
  94  |   await page.getByRole('button', { name: '保存视图', exact: true }).click();
  95  |   await page.getByLabel('视图名称', { exact: true }).fill('十月签约');
  96  |   await page.getByRole('dialog').getByRole('button', { name: /确\s*定/ }).click();
  97  |   await page.getByRole('button', { name: /^重\s*置$/ }).click();
  98  |   await expect(dates.nth(0)).toHaveValue('');
  99  |   await dates.nth(0).fill('2026-11-01');
  100 |   await dates.nth(0).press('Enter');
  101 |   await dates.nth(1).fill('2026-11-30');
  102 |   await dates.nth(1).press('Enter');
  103 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  104 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  105 |   await page.getByRole('combobox', { name: '常用视图', exact: true }).focus();
  106 |   await page.getByRole('combobox', { name: '常用视图', exact: true }).press('ArrowDown');
  107 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').getByText('十月签约', { exact: true }).click();
  108 |   await expect(dates.nth(0)).toHaveValue('2026-10-01');
  109 |   await expect(dates.nth(1)).toHaveValue('2026-10-31');
  110 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  111 |   await expect(page).toHaveURL(/start=2026-10-01&end=2026-10-31/);
  112 |   await page.getByLabel('编号 / 商机名称', { exact: true }).fill('OPP-2026-002');
  113 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  114 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(1);
  115 |   await page.getByRole('button', { name: '列设置', exact: true }).click();
  116 |   await page.getByRole('dialog').getByLabel('主办部门', { exact: true }).uncheck();
  117 |   await page.getByRole('dialog').getByRole('button', { name: /^完\s*成$/ }).click();
  118 |   await expect(page.getByRole('columnheader', { name: '主办部门', exact: true })).toHaveCount(0);
  119 |   await page.getByRole('button', { name: '导出预览', exact: true }).click();
  120 |   await expect(page.getByLabel('导出CSV预览')).toHaveValue(/OPP-2026-002/);
  121 |   await expect(page.getByLabel('导出CSV预览')).not.toHaveValue(/OPP-2026-001/);
  122 |   await page.getByRole('dialog').getByRole('button', { name: /^关\s*闭$/ }).click();
  123 |   await navigate(page, `/opportunities/${id}`);
  124 |   await page.getByRole('tab', { name: '跟进记录', exact: true }).click();
  125 |   for (const date of ['2026-09-09', '2026-09-08']) {
  126 |     await page.getByRole('button', { name: '追加跟进', exact: true }).click();
  127 |     const dialog = page.getByRole('dialog');
  128 |     await dialog.getByLabel('跟进日期', { exact: true }).fill(date);
  129 |     await dialog.getByLabel('跟进日期', { exact: true }).press('Enter');
  130 |     await dialog.getByLabel('客户沟通', { exact: true }).fill(`${date}客户会议`);
  131 |     await dialog.getByLabel('下一步计划', { exact: true }).fill('核对采购计划');
  132 |     await dialog.getByRole('button', { name: '保存跟进', exact: true }).click();
  133 |     await expect(dialog).toBeHidden();
  134 |   }
  135 |   await expect(page.getByText('客户沟通：2026-09-09客户会议', { exact: true })).toBeVisible();
  136 |   await expect(page.getByText('客户沟通：2026-09-08客户会议', { exact: true })).toBeVisible();
  137 |   await navigate(page, '/opportunities?keyword=OPP-2026-002');
  138 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('2026-09-09');
  139 |   await capturePageEvidence(page, 'GS01-ledger');
  140 |   expect(errors).toEqual([]);
  141 | });
  142 | 
  143 | test('真实完整版本链可发起立项，九个页签及下钻保持同一商机', async ({ page }) => {
  144 |   const errors = collectBrowserErrors(page);
  145 |   const id = await seed(page, 'ready');
  146 |   const detail = `/opportunities/${id}`;
  147 |   await navigate(page, detail);
  148 |   await expect(page.getByText(/预计金额 1,000.00 万元 · 预计签约 2026-11-30/)).toBeVisible();
  149 |   await expect(page.getByText('全部条件已满足', { exact: true })).toBeVisible();
  150 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeEnabled();
  151 |   await capturePageEvidence(page, 'GS03-ready');
  152 |   for (const name of ['概览', '跟进记录', '商机评估', '需求与方案', '技术成本评估', '专家评审', '项目概算', '提前投入', '操作记录']) {
  153 |     await page.getByRole('tab', { name, exact: true }).click();
  154 |     await expect(page.getByRole('tabpanel', { name, exact: true })).toBeVisible();
  155 |   }
  156 |   for (const [tab, label, suffix] of [
  157 |     ['商机评估', '进入商机初步评估', 'evaluation'], ['需求与方案', '进入需求调研与解决方案', 'solution'],
  158 |     ['技术成本评估', '进入技术与成本评估', 'tech-cost'], ['专家评审', '进入方案与成本专家评审', 'review'],
  159 |     ['项目概算', '进入项目概算编制', 'estimate'], ['提前投入', '进入提前投入申请', 'early-investment'],
  160 |   ]) {
  161 |     await navigate(page, detail);
  162 |     await page.getByRole('tab', { name: tab, exact: true }).click();
  163 |     await page.getByRole('link', { name: label, exact: true }).click();
  164 |     await expect(page).toHaveURL(`${detail}/${suffix}`);
  165 |     await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
  166 |     await expect(page.getByText(/尚未实现|页面不存在|无权访问/)).toHaveCount(0);
  167 |   }
  168 |   await navigate(page, detail);
  169 |   await page.getByRole('button', { name: '发起立项', exact: true }).click();
  170 |   await expect(page).toHaveURL(`/initiation/apply?opportunityId=${id}`);
  171 |   await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
  172 |   expect(errors).toEqual([]);
  173 | });
  174 | 
  175 | test('新评审与旧冻结概算不一致时两页共同阻断，项目经理成本显示一致', async ({ page }) => {
  176 |   const errors = collectBrowserErrors(page);
  177 |   const id = await seed(page, 'stale');
  178 |   await navigate(page, `/opportunities?keyword=${id}`);
  179 |   // Search accepts business code rather than internal id; use the unique business name.
  180 |   await page.getByLabel('编号 / 商机名称', { exact: true }).fill('台账验收数据共享项目');
  181 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
> 182 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
      |                                                                         ^ Error: expect(locator).toBeDisabled() failed
  183 |   await navigate(page, `/opportunities/${id}`);
  184 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  185 |   await expect(page.getByText(/冻结概算与当前通过的方案\/专家评审版本链不一致/)).toBeVisible();
  186 |   await capturePageEvidence(page, 'GS03-stale-version');
  187 |   await role(page, '项目经理');
  188 |   await navigate(page, '/opportunities?keyword=OPP-2026-001');
  189 |   const row = page.locator('.ant-table-tbody tr.ant-table-row');
  190 |   await expect(row).toHaveCount(1);
  191 |   await expect(row).toContainText('已隐藏');
  192 |   await navigate(page, '/opportunities/OPP-001');
  193 |   await expect(page.getByText('无敏感字段权限', { exact: true })).toBeVisible();
  194 |   await page.getByRole('tab', { name: '项目概算', exact: true }).click();
  195 |   await expect(page.getByRole('tabpanel', { name: '项目概算', exact: true })).toContainText('已隐藏');
  196 |   expect(errors).toEqual([]);
  197 | });
  198 | 
  199 | test('台账分页和金额排序使用完整可见集合', async ({ page }) => {
  200 |   const errors = collectBrowserErrors(page);
  201 |   await seed(page);
  202 |   await navigate(page, '/opportunities');
  203 |   const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  204 |   await expect(rows).toHaveCount(10);
  205 |   await expect(rows.first()).toHaveAttribute('data-row-key', 'OPP-001');
  206 |   await page.locator('.ant-pagination-next').click();
  207 |   await expect(rows.first()).toHaveAttribute('data-row-key', 'OPP-011');
  208 |   await page.getByRole('columnheader', { name: /预计金额（万元）/ }).click();
  209 |   await page.locator('.ant-pagination-item-1').click();
  210 |   const expectedIds = await page.evaluate(async () => {
  211 |     const path = '/src/mock/business.ts';
  212 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  213 |     return [...business.useBusinessStore.getState().data.opportunities]
  214 |       .sort((a, b) => a.estimatedAmount - b.estimatedAmount).slice(0, 10).map(o => o.id);
  215 |   });
  216 |   await expect.poll(async () => rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-row-key')))).toEqual(expectedIds);
  217 |   await page.getByRole('button', { name: '更多筛选', exact: true }).click();
  218 |   await page.getByLabel('最低金额（万元）', { exact: true }).fill('8000');
  219 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  220 |   const filteredIds = await page.evaluate(async () => {
  221 |     const path = '/src/mock/business.ts';
  222 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  223 |     return [...business.useBusinessStore.getState().data.opportunities]
  224 |       .filter(o => o.estimatedAmount >= 8000).sort((a, b) => a.estimatedAmount - b.estimatedAmount).slice(0, 10).map(o => o.id);
  225 |   });
  226 |   await expect.poll(async () => rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-row-key')))).toEqual(filteredIds);
  227 |   expect(errors).toEqual([]);
  228 | });
  229 | 
  230 | test('暂缓必须安排复评，详情与台账提醒同步并能发起复评', async ({ page }) => {
  231 |   const errors = collectBrowserErrors(page);
  232 |   const id = await seed(page);
  233 |   await navigate(page, `/opportunities/${id}`);
  234 |   await page.getByRole('button', { name: /^暂\s*缓$/ }).click();
  235 |   const dialog = page.getByRole('dialog');
  236 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  237 |   await expect(dialog.locator('.ant-form-item-explain-error')).toHaveCount(3);
  238 |   await dialog.getByLabel('决策原因', { exact: true }).fill('客户预算审批推迟，安排下周复评');
  239 |   await dialog.getByLabel('下次复评日期', { exact: true }).fill('2026-09-15');
  240 |   await dialog.getByLabel('下次复评日期', { exact: true }).press('Enter');
  241 |   const owner = dialog.getByLabel('复评责任人', { exact: true });
  242 |   await owner.focus();
  243 |   await owner.press('ArrowDown');
  244 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^陈亮$/ }).click();
  245 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  246 |   await expect(dialog).toBeHidden();
  247 |   await expect(page.getByText('暂缓原因：客户预算审批推迟，安排下周复评', { exact: true })).toBeVisible();
  248 |   await expect(page.getByText(/复评日期 2026-09-15 · 责任人 陈亮/)).toBeVisible();
  249 |   await capturePageEvidence(page, 'GS03-paused');
  250 |   await navigate(page, '/opportunities?keyword=OPP-2026-002');
  251 |   await expect(page.getByText('未来7日需复评 1 个商机', { exact: true })).toBeVisible();
  252 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('暂缓');
  253 |   await page.locator('.ant-table-tbody tr.ant-table-row').getByRole('button', { name: '发起评估', exact: true }).click();
  254 |   await expect(page).toHaveURL(`/opportunities/${id}/evaluation`);
  255 |   const result = await page.evaluate(async (opportunityId) => {
  256 |     const path = '/src/mock/business.ts';
  257 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  258 |     const data = business.useBusinessStore.getState().data;
  259 |     return { pause: data.opportunityMeta[opportunityId].pauses.at(-1), assessment: data.opportunityMeta[opportunityId].assessments.at(-1)?.status };
  260 |   }, id);
  261 |   expect(result.pause).toMatchObject({ reason: '客户预算审批推迟，安排下周复评', reviewDate: '2026-09-15', ownerId: 'U-006' });
  262 |   expect(result.assessment).toBe('评估中');
  263 |   expect(errors).toEqual([]);
  264 | });
  265 | 
  266 | test('真实前期投入终止时强制处置说明，保留来源成本与只读历史', async ({ page }) => {
  267 |   const errors = collectBrowserErrors(page);
  268 |   const id = await seed(page, 'ready');
  269 |   const before = await page.evaluate(async (opportunityId) => {
  270 |     const path = '/src/mock/business.ts';
  271 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  272 |     const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
  273 |     const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
  274 |     const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
  275 |     let data = business.useBusinessStore.getState().data;
  276 |     const o = data.opportunities.find(v => v.id === opportunityId)!;
  277 |     data = business.transition(data, { type: 'save-early-investment', id: opportunityId, submit: true, input: {
  278 |       reason: '客户技术验证', amount: 20, resourceTypes: ['人力'], department: '智慧城市业务群', people: ['U-005'],
  279 |       startDate: '2026-09-09', endDate: '2026-09-30', signPlanDate: '2026-11-30', signPlan: '完成合同会签',
  280 |       riskLevel: '一般', risks: '签约推迟风险', exitPlan: '未签则停止投入并保留成本', estimateId: o.currentEstimateVersionId!,
  281 |     } }, market);
  282 |     const requestId = data.earlyInvestmentRequests.at(-1)!.id;
```