# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r0024-unsigned.spec.ts >> YS-13 未签台账按风险过滤并保留真实下钻
- Location: e2e/r0024-unsigned.spec.ts:37:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByText('未签项目').locator('..')
Expected substring: "12"
Error: strict mode violation: getByText('未签项目').locator('..') resolved to 2 elements:
    1) <li tabindex="-1" role="menuitem" aria-describedby=":rn9:" class="ant-menu-item ant-menu-item-only-child" data-menu-id="rc-menu-uuid-93280-2-/unsigned-projects/P-004">…</li> aka getByRole('menuitem', { name: '未签项目详情' })
    2) <div class="ant-statistic css-dev-only-do-not-override-1mq36b9">…</div> aka getByText('未签项目12')

Call log:
  - Expect "toContainText" getByText('未签项目').locator('..') with timeout 5000ms
  - waiting for getByText('未签项目').locator('..')

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
        - menuitem "dashboard 领导经营驾驶舱" [expanded] [ref=e13] [cursor=pointer]:
          - img "dashboard" [ref=e14]
          - generic [ref=e17]: 领导经营驾驶舱
        - menu [ref=e18]:
          - menuitem "项目经营驾驶舱" [ref=e19] [cursor=pointer]
          - menuitem "四算经营专题" [ref=e21] [cursor=pointer]
          - menuitem "项目穿透分析" [ref=e23] [cursor=pointer]
          - menuitem "项目组合分析" [ref=e25] [cursor=pointer]
          - menuitem "项目异常中心" [ref=e27] [cursor=pointer]
          - menuitem "领导待决策事项" [ref=e29] [cursor=pointer]
        - menuitem "appstore 工作台与待办" [expanded] [ref=e31] [cursor=pointer]:
          - img "appstore" [ref=e32]
          - generic [ref=e35]: 工作台与待办
        - menu [ref=e36]:
          - menuitem "项目经理工作台" [ref=e37] [cursor=pointer]
          - menuitem "我的待办中心" [ref=e39] [cursor=pointer]
        - menuitem "dollar 商机与概算阶段" [ref=e41] [cursor=pointer]:
          - img "dollar" [ref=e42]
          - generic [ref=e45]: 商机与概算阶段
        - menuitem "project 预算与立项阶段" [expanded] [ref=e46] [cursor=pointer]:
          - img "project" [ref=e47]
          - generic [ref=e50]: 预算与立项阶段
        - menu:
          - menuitem "立项申请" [ref=e51] [cursor=pointer]
          - menuitem "立项评审工作台" [ref=e53] [cursor=pointer]
          - menuitem "综合风险评估" [ref=e55] [cursor=pointer]
          - menuitem "立项决策详情" [ref=e57] [cursor=pointer]
          - menuitem "项目团队" [ref=e59] [cursor=pointer]
          - menuitem "WBS计划编制" [ref=e61] [cursor=pointer]
          - menuitem "里程碑计划" [ref=e63] [cursor=pointer]
          - menuitem "计划评审" [ref=e65] [cursor=pointer]
          - menuitem "项目预算编制" [ref=e67] [cursor=pointer]
          - menuitem "概算预算对比" [ref=e69] [cursor=pointer]
          - menuitem "预算审批详情" [ref=e71] [cursor=pointer]
          - menuitem "项目基线" [ref=e73] [cursor=pointer]
          - menuitem "未签立项台账" [ref=e75] [cursor=pointer]
          - menuitem "未签项目详情" [ref=e77] [cursor=pointer]
          - menuitem "项目启动确认" [ref=e79] [cursor=pointer]
        - menuitem "schedule 核算与执行阶段" [ref=e81] [cursor=pointer]:
          - img "schedule" [ref=e82]
          - generic [ref=e85]: 核算与执行阶段
        - menuitem "check-circle 结算与收尾阶段" [ref=e86] [cursor=pointer]:
          - img "check-circle" [ref=e87]
          - generic [ref=e91]: 结算与收尾阶段
        - menuitem "setting 系统与规则配置" [ref=e92] [cursor=pointer]:
          - img "setting" [ref=e93]
          - generic [ref=e96]: 系统与规则配置
  - generic [ref=e97]:
    - banner [ref=e98]:
      - generic [ref=e99]:
        - button "折叠或展开导航" [ref=e101] [cursor=pointer]:
          - img "menu-fold" [ref=e103]
        - button "搜索项目、合同、单据" [ref=e107] [cursor=pointer]:
          - img "search" [ref=e108]
          - generic [ref=e111]: 搜索项目、合同、单据...
          - generic [ref=e112]: ⌘K
        - strong [ref=e117]: 未签立项台账
      - generic [ref=e118]:
        - generic [ref=e119]: 数据截至 2026-09-09
        - generic [ref=e122]:
          - generic [ref=e123]: "角色:"
          - generic "模拟身份" [ref=e125] [cursor=pointer]:
            - generic [ref=e127]:
              - combobox "模拟身份" [ref=e129]
              - generic [ref=e131]:
                - img "user" [ref=e133]
                - generic [ref=e136]: PMO负责人 (李主任)
        - generic [ref=e138] [cursor=pointer]:
          - img "user" [ref=e141]
          - generic [ref=e144]: 李主任
    - main [ref=e145]:
      - generic [ref=e146]:
        - navigation [ref=e147]:
          - list [ref=e148]:
            - listitem [ref=e149]:
              - link "首页" [ref=e151] [cursor=pointer]:
                - /url: /
            - listitem [aria-hidden] [ref=e152]: /
            - listitem [ref=e153]: 未签立项台账
        - generic [ref=e155]:
          - heading "未签立项台账" [level=4] [ref=e158]
          - generic [ref=e159]: 跟踪合同风险、已发生投入与授权边界；拟签金额与已签金额分开展示。
      - generic [ref=e160]:
        - generic [ref=e164]:
          - generic [ref=e165]: 未签项目
          - generic [ref=e166]: "12"
        - generic [ref=e171]:
          - generic [ref=e172]: 已投入（万元）
          - generic [ref=e173]: 17,799.50
        - generic [ref=e178]:
          - generic [ref=e179]: 超限项目
          - generic [ref=e180]: "10"
        - generic [ref=e185]:
          - generic [ref=e186]: 到期项目
          - generic [ref=e187]: "10"
      - generic [ref=e190]:
        - generic [ref=e191]:
          - generic [ref=e194]:
            - searchbox "项目编号 / 名称" [ref=e195]
            - button [ref=e197] [cursor=pointer]:
              - img "search" [ref=e199]
          - generic [ref=e205] [cursor=pointer]:
            - combobox [ref=e207]
            - generic: 全部风险状态
          - button "含已签转换记录" [ref=e209] [cursor=pointer]
        - generic [ref=e213]:
          - table [ref=e217]:
            - rowgroup [ref=e234]:
              - row [ref=e235]:
                - columnheader "项目编号 / 名称" [ref=e236]
                - columnheader "立项金额" [ref=e237]
                - columnheader "立项日期" [ref=e238]
                - columnheader "授权签约日" [ref=e239]
                - columnheader "未签天数" [ref=e240] [cursor=pointer]
                - columnheader "投入有效期" [ref=e251]
                - columnheader "批准额度" [ref=e252]
                - columnheader "可用余额" [ref=e253]
                - columnheader "已发生成本" [ref=e254]
                - columnheader "承诺+待审" [ref=e255]
                - columnheader "额度使用率" [ref=e256]
                - columnheader "最近签约进展" [ref=e257]
                - columnheader "责任人" [ref=e258]
                - columnheader "风险状态" [ref=e259]
                - columnheader "操作" [ref=e260]
            - rowgroup [ref=e261]:
              - generic: 未签天数
              - row [ref=e262]:
                - cell [ref=e263]:
                  - button "P-004 某省一体化政务服务能力提升项目" [ref=e264] [cursor=pointer]:
                    - generic [ref=e265]: P-004
                    - generic [ref=e266]: 某省一体化政务服务能力提升项目
                - cell "8,800.00" [ref=e267]
                - cell "2026-08-01" [ref=e268]
                - cell "2026-10-15" [ref=e269]
                - cell "39" [ref=e270]
                - cell "2026-10-30" [ref=e271]
                - cell "150.00" [ref=e272]
                - cell "51.50" [ref=e273]
                - cell "98.50" [ref=e274]
                - cell "0.00" [ref=e275]
                - cell "65.666667%" [ref=e276]
                - cell "待主办部门更新" [ref=e277]
                - cell "刘敏" [ref=e278]
                - cell [ref=e279]
                - cell [ref=e280]:
                  - generic [ref=e281]:
                    - button "更新签约进展" [ref=e283] [cursor=pointer]
                    - button "申请额外投入" [ref=e286] [cursor=pointer]
                    - button "确认合同签订" [ref=e289] [cursor=pointer]
                    - button "退出复盘" [ref=e292] [cursor=pointer]
              - row [ref=e294]:
                - cell [ref=e295]:
                  - button "P-049 云山市工业和信息化数据共享平台" [ref=e296] [cursor=pointer]:
                    - generic [ref=e297]: P-049
                    - generic [ref=e298]: 云山市工业和信息化数据共享平台
                - cell "4,175.00" [ref=e299]
                - cell "2026-01-01" [ref=e300]
                - cell "2026-10-15" [ref=e301]
                - cell "251" [ref=e302]
                - cell "2026-04-01" [ref=e303]
                - cell "80.00" [ref=e304]
                - cell "0.00" [ref=e305]
                - cell "1,726.00" [ref=e306]
                - cell "531.00" [ref=e307]
                - cell "2821.25%" [ref=e308]
                - cell "待主办部门更新" [ref=e309]
                - cell "孙总" [ref=e310]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e311]:
                  - generic [ref=e312]: 投入有效期已过
                  - generic [ref=e313]: 投入超限
                  - generic [ref=e314]: 长期未签
                - cell [ref=e315]:
                  - generic [ref=e316]:
                    - button "更新签约进展" [ref=e318] [cursor=pointer]
                    - button "申请额外投入" [ref=e321] [cursor=pointer]
                    - button "确认合同签订" [ref=e324] [cursor=pointer]
                    - button "退出复盘" [ref=e327] [cursor=pointer]
              - row [ref=e329]:
                - cell [ref=e330]:
                  - button "P-050 云山市城市投资数据共享平台" [ref=e331] [cursor=pointer]:
                    - generic [ref=e332]: P-050
                    - generic [ref=e333]: 云山市城市投资数据共享平台
                - cell "4,250.00" [ref=e334]
                - cell "2026-01-01" [ref=e335]
                - cell "2026-10-15" [ref=e336]
                - cell "251" [ref=e337]
                - cell "2026-04-01" [ref=e338]
                - cell "80.00" [ref=e339]
                - cell "0.00" [ref=e340]
                - cell "1,807.00" [ref=e341]
                - cell "556.00" [ref=e342]
                - cell "2953.75%" [ref=e343]
                - cell "待主办部门更新" [ref=e344]
                - cell "张建国" [ref=e345]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e346]:
                  - generic [ref=e347]: 投入有效期已过
                  - generic [ref=e348]: 投入超限
                  - generic [ref=e349]: 长期未签
                - cell [ref=e350]:
                  - generic [ref=e351]:
                    - button "更新签约进展" [ref=e353] [cursor=pointer]
                    - button "申请额外投入" [ref=e356] [cursor=pointer]
                    - button "确认合同签订" [ref=e359] [cursor=pointer]
                    - button "退出复盘" [ref=e362] [cursor=pointer]
              - row [ref=e364]:
                - cell [ref=e365]:
                  - button "P-051 云山市公共数据运营数据共享平台" [ref=e366] [cursor=pointer]:
                    - generic [ref=e367]: P-051
                    - generic [ref=e368]: 云山市公共数据运营数据共享平台
                - cell "4,325.00" [ref=e369]
                - cell "2026-01-01" [ref=e370]
                - cell "2026-10-15" [ref=e371]
                - cell "251" [ref=e372]
                - cell "2026-04-01" [ref=e373]
                - cell "80.00" [ref=e374]
                - cell "0.00" [ref=e375]
                - cell "1,535.00" [ref=e376]
                - cell "472.00" [ref=e377]
                - cell "2508.75%" [ref=e378]
                - cell "待主办部门更新" [ref=e379]
                - cell "李主任" [ref=e380]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e381]:
                  - generic [ref=e382]: 投入有效期已过
                  - generic [ref=e383]: 投入超限
                  - generic [ref=e384]: 长期未签
                - cell [ref=e385]:
                  - generic [ref=e386]:
                    - button "更新签约进展" [ref=e388] [cursor=pointer]
                    - button "申请额外投入" [ref=e391] [cursor=pointer]
                    - button "确认合同签订" [ref=e394] [cursor=pointer]
                    - button "退出复盘" [ref=e397] [cursor=pointer]
              - row [ref=e399]:
                - cell [ref=e400]:
                  - button "P-052 新港市交通运输数据共享平台" [ref=e401] [cursor=pointer]:
                    - generic [ref=e402]: P-052
                    - generic [ref=e403]: 新港市交通运输数据共享平台
                - cell "4,400.00" [ref=e404]
                - cell "2026-01-01" [ref=e405]
                - cell "2026-10-15" [ref=e406]
                - cell "251" [ref=e407]
                - cell "2026-04-01" [ref=e408]
                - cell "80.00" [ref=e409]
                - cell "0.00" [ref=e410]
                - cell "1,613.00" [ref=e411]
                - cell "496.00" [ref=e412]
                - cell "2636.25%" [ref=e413]
                - cell "待主办部门更新" [ref=e414]
                - cell "王总" [ref=e415]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e416]:
                  - generic [ref=e417]: 投入有效期已过
                  - generic [ref=e418]: 投入超限
                  - generic [ref=e419]: 长期未签
                - cell [ref=e420]:
                  - generic [ref=e421]:
                    - button "更新签约进展" [ref=e423] [cursor=pointer]
                    - button "申请额外投入" [ref=e426] [cursor=pointer]
                    - button "确认合同签订" [ref=e429] [cursor=pointer]
                    - button "退出复盘" [ref=e432] [cursor=pointer]
              - row [ref=e434]:
                - cell [ref=e435]:
                  - button "P-053 新港市工业和信息化数据共享平台" [ref=e436] [cursor=pointer]:
                    - generic [ref=e437]: P-053
                    - generic [ref=e438]: 新港市工业和信息化数据共享平台
                - cell "4,475.00" [ref=e439]
                - cell "2026-01-01" [ref=e440]
                - cell "2026-10-15" [ref=e441]
                - cell "251" [ref=e442]
                - cell "2026-04-01" [ref=e443]
                - cell "80.00" [ref=e444]
                - cell "0.00" [ref=e445]
                - cell "1,693.00" [ref=e446]
                - cell "521.00" [ref=e447]
                - cell "2767.5%" [ref=e448]
                - cell "待主办部门更新" [ref=e449]
                - cell "刘敏" [ref=e450]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e451]:
                  - generic [ref=e452]: 投入有效期已过
                  - generic [ref=e453]: 投入超限
                  - generic [ref=e454]: 长期未签
                - cell [ref=e455]:
                  - generic [ref=e456]:
                    - button "更新签约进展" [ref=e458] [cursor=pointer]
                    - button "申请额外投入" [ref=e461] [cursor=pointer]
                    - button "确认合同签订" [ref=e464] [cursor=pointer]
                    - button "退出复盘" [ref=e467] [cursor=pointer]
              - row [ref=e469]:
                - cell [ref=e470]:
                  - button "P-054 新港市城市投资数据共享平台" [ref=e471] [cursor=pointer]:
                    - generic [ref=e472]: P-054
                    - generic [ref=e473]: 新港市城市投资数据共享平台
                - cell "4,550.00" [ref=e474]
                - cell "2026-01-01" [ref=e475]
                - cell "2026-10-15" [ref=e476]
                - cell "251" [ref=e477]
                - cell "2026-04-01" [ref=e478]
                - cell "80.00" [ref=e479]
                - cell "0.00" [ref=e480]
                - cell "1,775.00" [ref=e481]
                - cell "546.00" [ref=e482]
                - cell "2901.25%" [ref=e483]
                - cell "待主办部门更新" [ref=e484]
                - cell "赵工" [ref=e485]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e486]:
                  - generic [ref=e487]: 投入有效期已过
                  - generic [ref=e488]: 投入超限
                  - generic [ref=e489]: 长期未签
                - cell [ref=e490]:
                  - generic [ref=e491]:
                    - button "更新签约进展" [ref=e493] [cursor=pointer]
                    - button "申请额外投入" [ref=e496] [cursor=pointer]
                    - button "确认合同签订" [ref=e499] [cursor=pointer]
                    - button "退出复盘" [ref=e502] [cursor=pointer]
              - row [ref=e504]:
                - cell [ref=e505]:
                  - button "P-055 新港市公共数据运营数据共享平台" [ref=e506] [cursor=pointer]:
                    - generic [ref=e507]: P-055
                    - generic [ref=e508]: 新港市公共数据运营数据共享平台
                - cell "4,625.00" [ref=e509]
                - cell "2026-01-01" [ref=e510]
                - cell "2026-10-15" [ref=e511]
                - cell "251" [ref=e512]
                - cell "2026-04-01" [ref=e513]
                - cell "80.00" [ref=e514]
                - cell "0.00" [ref=e515]
                - cell "1,858.00" [ref=e516]
                - cell "572.00" [ref=e517]
                - cell "3037.5%" [ref=e518]
                - cell "待主办部门更新" [ref=e519]
                - cell "陈亮" [ref=e520]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e521]:
                  - generic [ref=e522]: 投入有效期已过
                  - generic [ref=e523]: 投入超限
                  - generic [ref=e524]: 长期未签
                - cell [ref=e525]:
                  - generic [ref=e526]:
                    - button "更新签约进展" [ref=e528] [cursor=pointer]
                    - button "申请额外投入" [ref=e531] [cursor=pointer]
                    - button "确认合同签订" [ref=e534] [cursor=pointer]
                    - button "退出复盘" [ref=e537] [cursor=pointer]
              - row [ref=e539]:
                - cell [ref=e540]:
                  - button "P-056 江宁市交通运输数据共享平台" [ref=e541] [cursor=pointer]:
                    - generic [ref=e542]: P-056
                    - generic [ref=e543]: 江宁市交通运输数据共享平台
                - cell "4,700.00" [ref=e544]
                - cell "2026-01-01" [ref=e545]
                - cell "2026-10-15" [ref=e546]
                - cell "251" [ref=e547]
                - cell "2026-04-01" [ref=e548]
                - cell "80.00" [ref=e549]
                - cell "0.00" [ref=e550]
                - cell "1,943.00" [ref=e551]
                - cell "598.00" [ref=e552]
                - cell "3176.25%" [ref=e553]
                - cell "待主办部门更新" [ref=e554]
                - cell "黄总监" [ref=e555]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e556]:
                  - generic [ref=e557]: 投入有效期已过
                  - generic [ref=e558]: 投入超限
                  - generic [ref=e559]: 长期未签
                - cell [ref=e560]:
                  - generic [ref=e561]:
                    - button "更新签约进展" [ref=e563] [cursor=pointer]
                    - button "申请额外投入" [ref=e566] [cursor=pointer]
                    - button "确认合同签订" [ref=e569] [cursor=pointer]
                    - button "退出复盘" [ref=e572] [cursor=pointer]
              - row [ref=e574]:
                - cell [ref=e575]:
                  - button "P-057 江宁市工业和信息化数据共享平台" [ref=e576] [cursor=pointer]:
                    - generic [ref=e577]: P-057
                    - generic [ref=e578]: 江宁市工业和信息化数据共享平台
                - cell "4,775.00" [ref=e579]
                - cell "2026-01-01" [ref=e580]
                - cell "2026-10-15" [ref=e581]
                - cell "251" [ref=e582]
                - cell "2026-04-01" [ref=e583]
                - cell "80.00" [ref=e584]
                - cell "0.00" [ref=e585]
                - cell "2,030.00" [ref=e586]
                - cell "625.00" [ref=e587]
                - cell "3318.75%" [ref=e588]
                - cell "待主办部门更新" [ref=e589]
                - cell "郑经理" [ref=e590]
                - cell "投入有效期已过 投入超限 长期未签" [ref=e591]:
                  - generic [ref=e592]: 投入有效期已过
                  - generic [ref=e593]: 投入超限
                  - generic [ref=e594]: 长期未签
                - cell [ref=e595]:
                  - generic [ref=e596]:
                    - button "更新签约进展" [ref=e598] [cursor=pointer]
                    - button "申请额外投入" [ref=e601] [cursor=pointer]
                    - button "确认合同签订" [ref=e604] [cursor=pointer]
                    - button "退出复盘" [ref=e607] [cursor=pointer]
          - list [ref=e609]:
            - listitem "上一页" [ref=e610]:
              - button [disabled] [ref=e611]:
                - img "left" [ref=e612]
            - listitem "1" [ref=e615] [cursor=pointer]
            - listitem "2" [ref=e617] [cursor=pointer]
            - listitem "下一页" [ref=e619] [cursor=pointer]:
              - button [ref=e620]:
                - img "right" [ref=e621]
            - listitem [ref=e624]:
              - generic "页码" [ref=e625] [cursor=pointer]:
                - generic [ref=e627]:
                  - combobox "页码" [ref=e629]
                  - generic "10 条/页" [ref=e630]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import {
  3   |   capturePageEvidence,
  4   |   collectBrowserErrors,
  5   |   prepareArtifacts,
  6   |   writeBrowserReport,
  7   | } from './evidence';
  8   | import { navigate, role } from './helpers';
  9   | import { seedAcceptanceScenario } from './scenario-state';
  10  | 
  11  | const errorsByPage = new WeakMap<Page, string[]>();
  12  | const observationsByPage = new WeakMap<Page, Record<string, unknown>>();
  13  | 
  14  | function observe(page: Page, payload: Record<string, unknown>) {
  15  |   observationsByPage.set(page, {
  16  |     ...(observationsByPage.get(page) ?? {}),
  17  |     ...payload,
  18  |   });
  19  | }
  20  | 
  21  | test.beforeEach(async ({ page }) => {
  22  |   prepareArtifacts();
  23  |   errorsByPage.set(page, collectBrowserErrors(page));
  24  |   observationsByPage.set(page, {});
  25  | });
  26  | 
  27  | test.afterEach(async ({ page }, testInfo) => {
  28  |   const consoleErrors = errorsByPage.get(page) ?? [];
  29  |   writeBrowserReport(testInfo, {
  30  |     url: page.url(),
  31  |     consoleErrors,
  32  |     observations: observationsByPage.get(page) ?? {},
  33  |   });
  34  |   expect(consoleErrors).toEqual([]);
  35  | });
  36  | 
  37  | test('YS-13 未签台账按风险过滤并保留真实下钻', async ({ page }) => {
  38  |   const fixture = await seedAcceptanceScenario(page, 'unsigned-base');
  39  |   await role(page, 'PMO负责人');
  40  |   await navigate(page, '/unsigned-projects');
  41  | 
  42  |   await expect(
  43  |     page.getByRole('heading', { name: '未签立项台账', exact: true }),
  44  |   ).toBeVisible();
> 45  |   await expect(page.getByText('未签项目').locator('..')).toContainText(
      |                                                      ^ Error: expect(locator).toContainText(expected) failed
  46  |     String(fixture.unsignedCount),
  47  |   );
  48  |   const visibleRows = page.locator(
  49  |     '.ant-table-tbody > tr:not(.ant-table-measure-row)',
  50  |   );
  51  |   await expect(visibleRows).toHaveCount(10);
  52  | 
  53  |   const riskSelect = page
  54  |     .locator('.ant-select')
  55  |     .filter({ has: page.getByText('全部风险状态', { exact: true }) });
  56  |   await riskSelect.click();
  57  |   await page
  58  |     .locator('.ant-select-dropdown:visible .ant-select-item-option')
  59  |     .filter({ hasText: /^投入超限$/ })
  60  |     .click();
  61  |   await expect(visibleRows).toHaveCount(10);
  62  |   await expect(
  63  |     page.locator('.ant-table-tbody').getByText('投入超限', { exact: true }),
  64  |   ).toHaveCount(10);
  65  | 
  66  |   const selectedRisk = page.locator('.ant-select').filter({ hasText: '投入超限' });
  67  |   await selectedRisk.hover();
  68  |   await selectedRisk.locator('.ant-select-clear').click();
  69  |   await page.getByPlaceholder('项目编号 / 名称').fill('P-PLAN-001');
  70  |   const projectLink = page.getByRole('button', {
  71  |     name: 'P-PLAN-001 福建园区设备运维协同平台',
  72  |   });
  73  |   await expect(projectLink).toBeVisible();
  74  |   await projectLink.click();
  75  |   await expect(page).toHaveURL('/unsigned-projects/P-PLAN-001');
  76  |   await expect(
  77  |     page.getByRole('heading', { name: '未签项目详情', exact: true }),
  78  |   ).toBeVisible();
  79  | 
  80  |   await navigate(page, '/unsigned-projects');
  81  |   await page.getByPlaceholder('项目编号 / 名称').fill('');
  82  |   const screenshots = await capturePageEvidence(page, 'YS-13');
  83  |   observe(page, {
  84  |     fixture: 'unsigned-base',
  85  |     riskFilter: '投入超限返回10个当前页项目，均显示命中风险标签',
  86  |     drilldown: 'P-PLAN-001 从台账进入同一未签项目详情',
  87  |     screenshots,
  88  |   });
  89  | });
  90  | 
  91  | test('YS-14 签约进展和合同原单形成同源记录', async ({ page }) => {
  92  |   await seedAcceptanceScenario(page, 'unsigned-ready-for-contract');
  93  |   await role(page, '客户经理');
  94  |   await navigate(page, '/unsigned-projects/P-PLAN-001');
  95  | 
  96  |   await page
  97  |     .getByPlaceholder('客户审批、合同谈判、阻碍与当前证据')
  98  |     .fill('客户法务已完成条款核对，待签署盖章');
  99  |   await page
  100 |     .getByPlaceholder('下一步动作、责任与计划')
  101 |     .fill('陈亮跟踪合同归档并准备启动确认');
  102 |   const expectedSignDate = page.getByPlaceholder('最新预计签约日');
  103 |   await expectedSignDate.fill('2026-09-20');
  104 |   await expectedSignDate.press('Enter');
  105 |   await page.getByRole('heading', { name: '未签项目详情' }).click();
  106 |   await page.getByRole('button', { name: '保存签约进展' }).click();
  107 |   await expect(
  108 |     page.locator('.ant-timeline').getByText(
  109 |       '客户法务已完成条款核对，待签署盖章',
  110 |       { exact: true },
  111 |     ),
  112 |   ).toBeVisible();
  113 | 
  114 |   await page.getByRole('tab', { name: '合同签订确认' }).click();
  115 |   const contractPane = page.locator('.ant-tabs-tabpane-active');
  116 |   const textInputs = contractPane.locator('input.ant-input');
  117 |   await textInputs.nth(0).fill('CON-R0024-BROWSER');
  118 |   await textInputs.nth(1).fill('园区协同平台交付合同');
  119 |   await textInputs.nth(2).fill('客户签署合同正本');
  120 |   await contractPane.locator('input[role="spinbutton"]').first().fill('1200');
  121 |   await contractPane
  122 |     .locator('input[placeholder="请选择日期"]')
  123 |     .nth(1)
  124 |     .fill('2026-12-31');
  125 | 
  126 |   await page.getByRole('button', { name: '新增回款节点' }).click();
  127 |   await contractPane.getByPlaceholder('回款节点').fill('合同全款');
  128 |   await contractPane
  129 |     .locator('input[placeholder="请选择日期"]')
  130 |     .nth(2)
  131 |     .fill('2026-12-31');
  132 |   await contractPane.locator('input[role="spinbutton"]').nth(1).fill('1200');
  133 |   await page
  134 |     .getByPlaceholder('核验签署主体、金额、日期及附件的结论')
  135 |     .fill('合同主体、金额1200万元、签署日期及双方签章附件核验一致');
  136 |   await page.getByRole('button', { name: '确认签订并解除未签管控' }).click();
  137 |   await page.locator('.ant-modal:visible').getByRole('button', { name: /确\s*定/ }).click();
  138 |   await expect(page.locator('.ant-message-notice').filter({ hasText: '签署附件' })).toBeVisible();
  139 |   await expect(page.getByText(/已由 陈亮 于/)).toHaveCount(0);
  140 |   await contractPane.locator('input[type="file"]').setInputFiles({
  141 |     name: '双方签章合同.pdf',
  142 |     mimeType: 'application/pdf',
  143 |     buffer: Buffer.from('R0024 signed contract evidence'),
  144 |   });
  145 |   await contractPane.locator('input[role="spinbutton"]').nth(1).fill('1100');
```