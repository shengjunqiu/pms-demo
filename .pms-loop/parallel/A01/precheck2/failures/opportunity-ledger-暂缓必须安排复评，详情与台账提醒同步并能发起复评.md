# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: opportunity-ledger.spec.ts >> 暂缓必须安排复评，详情与台账提醒同步并能发起复评
- Location: e2e/opportunity-ledger.spec.ts:230:1

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^暂\s*缓$/ })

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
          - generic [ref=e53]: GS-03
          - strong [ref=e57]: 商机详情
          - generic [ref=e58]: 详情全景
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
            - listitem [ref=e91]:
              - link "商机台账" [ref=e93] [cursor=pointer]:
                - /url: /opportunities
            - listitem [aria-hidden] [ref=e94]: /
            - listitem [ref=e95]: 商机详情
        - generic [ref=e96]:
          - generic [ref=e97]:
            - generic [ref=e98]:
              - heading "福建省生态环境视频能力平台商机" [level=4] [ref=e100]
              - generic [ref=e101]: GS-03
              - generic [ref=e103]: 详情全景
              - generic [ref=e105]: 已转立项
            - generic [ref=e107]: OPP-2026-002 · 福建省生态环境厅 · 负责人 李主任 · 预计金额 1,008.30 万元 · 预计签约 2026-10-15
          - generic [ref=e109]:
            - button "编 辑" [disabled] [ref=e111]
            - button "发起立项" [disabled] [ref=e114]
        - separator [ref=e115]
      - generic [ref=e118]:
        - tablist [ref=e119]:
          - generic [ref=e121]:
            - tab "概览" [selected] [ref=e123] [cursor=pointer]
            - tab "跟进记录" [ref=e125] [cursor=pointer]
            - tab "商机评估" [ref=e127] [cursor=pointer]
            - tab "需求与方案" [ref=e129] [cursor=pointer]
            - tab "技术成本评估" [ref=e131] [cursor=pointer]
            - tab "专家评审" [ref=e133] [cursor=pointer]
            - tab "项目概算" [ref=e135] [cursor=pointer]
            - tab "提前投入" [ref=e137] [cursor=pointer]
            - tab "操作记录" [ref=e139] [cursor=pointer]
        - tabpanel "概览" [ref=e142]:
          - generic [ref=e143]:
            - generic [ref=e144]: 商机基础信息
            - table [ref=e150]:
              - rowgroup [ref=e151]:
                - row [ref=e152]:
                  - 'cell "客户 : 福建省生态环境厅" [ref=e153]':
                    - generic [ref=e154]:
                      - generic [ref=e155]: "客户 :"
                      - generic [ref=e156]: 福建省生态环境厅
                  - 'cell "商机负责人 : 李主任" [ref=e157]':
                    - generic [ref=e158]:
                      - generic [ref=e159]: "商机负责人 :"
                      - generic [ref=e160]: 李主任
                  - 'cell "主办部门 : 智慧城市业务群" [ref=e161]':
                    - generic [ref=e162]:
                      - generic [ref=e163]: "主办部门 :"
                      - generic [ref=e164]: 智慧城市业务群
                - row [ref=e165]:
                  - 'cell "项目类型 : 综合集成" [ref=e166]':
                    - generic [ref=e167]:
                      - generic [ref=e168]: "项目类型 :"
                      - generic [ref=e169]: 综合集成
                  - 'cell "商机来源 : 客户需求" [ref=e170]':
                    - generic [ref=e171]:
                      - generic [ref=e172]: "商机来源 :"
                      - generic [ref=e173]: 客户需求
                  - 'cell "区域 / 业务线 : 福建省 / 数字政务" [ref=e174]':
                    - generic [ref=e175]:
                      - generic [ref=e176]: "区域 / 业务线 :"
                      - generic [ref=e177]: 福建省 / 数字政务
                - row [ref=e178]:
                  - 'cell "预计金额 : 1,008.30 万元" [ref=e179]':
                    - generic [ref=e180]:
                      - generic [ref=e181]: "预计金额 :"
                      - generic [ref=e182]:
                        - generic [ref=e183]: 1,008.30
                        - text: 万元
                  - 'cell "预计签约 : 2026-10-15" [ref=e184]':
                    - generic [ref=e185]:
                      - generic [ref=e186]: "预计签约 :"
                      - generic [ref=e187]: 2026-10-15
                  - 'cell "赢单概率 : 75%" [ref=e188]':
                    - generic [ref=e189]:
                      - generic [ref=e190]: "赢单概率 :"
                      - generic [ref=e191]: 75%
                - row [ref=e192]:
                  - 'cell "业务背景与需求 : 福建省生态环境厅数字化建设与业务协同需求。" [ref=e193]':
                    - generic [ref=e194]:
                      - generic [ref=e195]: "业务背景与需求 :"
                      - generic [ref=e196]: 福建省生态环境厅数字化建设与业务协同需求。
                - row [ref=e197]:
                  - 'cell "竞争情况 : 客户处于方案选型阶段，需持续跟踪竞争与采购进展。" [ref=e198]':
                    - generic [ref=e199]:
                      - generic [ref=e200]: "竞争情况 :"
                      - generic [ref=e201]: 客户处于方案选型阶段，需持续跟踪竞争与采购进展。
                - row [ref=e202]:
                  - 'cell "客户材料 : 尚未提交附件" [ref=e203]':
                    - generic [ref=e204]:
                      - generic [ref=e205]: "客户材料 :"
                      - generic [ref=e206]: 尚未提交附件
          - generic [ref=e207]:
            - generic [ref=e209]:
              - generic [ref=e210]: 转立项条件
              - generic [ref=e213]:
                - generic [ref=e214]: 待补齐 5 项条件
                - alert [ref=e215]:
                  - link "已转入项目：福建省生态环境视频能力平台" [ref=e218] [cursor=pointer]:
                    - /url: /projects/P-002
                - paragraph [ref=e219]: 初评转“拟立项”后启动方案任务；方案评审与冻结概算完成后，方可发起正式立项。
            - generic [ref=e221]:
              - generic [ref=e222]: 评估与经营摘要
              - table [ref=e228]:
                - rowgroup [ref=e229]:
                  - row [ref=e230]:
                    - 'cell "初评综合评分 : —" [ref=e231]':
                      - generic [ref=e232]:
                        - generic [ref=e233]: "初评综合评分 :"
                        - generic [ref=e234]: —
                  - row [ref=e235]:
                    - 'cell "初评风险等级 : 尚未初评" [ref=e236]':
                      - generic [ref=e237]:
                        - generic [ref=e238]: "初评风险等级 :"
                        - generic [ref=e239]: 尚未初评
                  - row [ref=e240]:
                    - 'cell "指定概算版本 : V1.0 · 冻结" [ref=e241]':
                      - generic [ref=e242]:
                        - generic [ref=e243]: "指定概算版本 :"
                        - link "V1.0 · 冻结" [ref=e245] [cursor=pointer]:
                          - /url: /opportunities/OPP-002/estimate
                  - row [ref=e246]:
                    - 'cell "概算总成本 : 585.00 万元" [ref=e247]':
                      - generic [ref=e248]:
                        - generic [ref=e249]: "概算总成本 :"
                        - generic [ref=e250]:
                          - generic [ref=e251]: "585.00"
                          - text: 万元
                  - row [ref=e252]:
                    - 'cell "初评预估毛利率 : —" [ref=e253]':
                      - generic [ref=e254]:
                        - generic [ref=e255]: "初评预估毛利率 :"
                        - generic [ref=e256]: —
                  - row [ref=e257]:
                    - 'cell "提前投入额度 / 已使用 : 50.00 / 30.00 万元" [ref=e258]':
                      - generic [ref=e259]:
                        - generic [ref=e260]: "提前投入额度 / 已使用 :"
                        - generic [ref=e261]:
                          - generic [ref=e262]: "50.00"
                          - text: /
                          - generic [ref=e263]: "30.00"
                          - text: 万元
                  - row [ref=e264]:
                    - 'cell "当前方案版本 : 尚未提交评审" [ref=e265]':
                      - generic [ref=e266]:
                        - generic [ref=e267]: "当前方案版本 :"
                        - generic [ref=e268]: 尚未提交评审
                  - row [ref=e269]:
                    - 'cell "最近专家评审 : 尚无专家结论" [ref=e270]':
                      - generic [ref=e271]:
                        - generic [ref=e272]: "最近专家评审 :"
                        - generic [ref=e273]: 尚无专家结论
          - generic [ref=e274]:
            - generic [ref=e275]: 主要风险
            - generic [ref=e279]:
              - img "暂无数据" [ref=e281]
              - generic [ref=e287]: 当前评估尚未登记风险项
```

# Test source

```ts
  134 |     await dialog.getByRole('button', { name: '保存跟进', exact: true }).click();
  135 |     await expect(dialog).toBeHidden();
  136 |   }
  137 |   await expect(page.getByText('客户沟通：2026-09-09客户会议', { exact: true })).toBeVisible();
  138 |   await expect(page.getByText('客户沟通：2026-09-08客户会议', { exact: true })).toBeVisible();
  139 |   await navigate(page, '/opportunities?keyword=OPP-2026-002');
  140 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('2026-09-09');
  141 |   await capturePageEvidence(page, 'GS01-ledger');
  142 |   expect(errors).toEqual([]);
  143 | });
  144 | 
  145 | test('真实完整版本链可发起立项，九个页签及下钻保持同一商机', async ({ page }) => {
  146 |   const errors = collectBrowserErrors(page);
  147 |   const id = await seed(page, 'ready');
  148 |   const detail = `/opportunities/${id}`;
  149 |   await navigate(page, detail);
  150 |   await expect(page.getByText(/预计金额 1,000.00 万元 · 预计签约 2026-11-30/)).toBeVisible();
  151 |   await expect(page.getByText('全部条件已满足', { exact: true })).toBeVisible();
  152 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeEnabled();
  153 |   await capturePageEvidence(page, 'GS03-ready');
  154 |   for (const name of ['概览', '跟进记录', '商机评估', '需求与方案', '技术成本评估', '专家评审', '项目概算', '提前投入', '操作记录']) {
  155 |     await page.getByRole('tab', { name, exact: true }).click();
  156 |     await expect(page.getByRole('tabpanel', { name, exact: true })).toBeVisible();
  157 |   }
  158 |   for (const [tab, label, suffix] of [
  159 |     ['商机评估', '进入商机初步评估', 'evaluation'], ['需求与方案', '进入需求调研与解决方案', 'solution'],
  160 |     ['技术成本评估', '进入技术与成本评估', 'tech-cost'], ['专家评审', '进入方案与成本专家评审', 'review'],
  161 |     ['项目概算', '进入项目概算编制', 'estimate'], ['提前投入', '进入提前投入申请', 'early-investment'],
  162 |   ]) {
  163 |     await navigate(page, detail);
  164 |     await page.getByRole('tab', { name: tab, exact: true }).click();
  165 |     await page.getByRole('link', { name: label, exact: true }).click();
  166 |     await expect(page).toHaveURL(`${detail}/${suffix}`);
  167 |     await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
  168 |     await expect(page.getByText(/尚未实现|页面不存在|无权访问/)).toHaveCount(0);
  169 |   }
  170 |   await navigate(page, detail);
  171 |   await page.getByRole('button', { name: '发起立项', exact: true }).click();
  172 |   await expect(page).toHaveURL(`/initiation/apply?opportunityId=${id}`);
  173 |   await expect(page.getByText('台账验收数据共享项目', { exact: true }).first()).toBeVisible();
  174 |   expect(errors).toEqual([]);
  175 | });
  176 | 
  177 | test('新评审与旧冻结概算不一致时两页共同阻断，项目经理成本显示一致', async ({ page }) => {
  178 |   const errors = collectBrowserErrors(page);
  179 |   const id = await seed(page, 'stale');
  180 |   await navigate(page, `/opportunities?keyword=${id}`);
  181 |   // Search accepts business code rather than internal id; use the unique business name.
  182 |   await page.getByLabel('编号 / 商机名称', { exact: true }).fill('台账验收数据共享项目');
  183 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  184 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  185 |   await navigate(page, `/opportunities/${id}`);
  186 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
  187 |   await expect(page.getByText(/冻结概算与当前通过的方案\/专家评审版本链不一致/)).toBeVisible();
  188 |   await capturePageEvidence(page, 'GS03-stale-version');
  189 |   await role(page, '项目经理');
  190 |   await navigate(page, '/opportunities?keyword=OPP-2026-001');
  191 |   const row = page.locator('.ant-table-tbody tr.ant-table-row');
  192 |   await expect(row).toHaveCount(1);
  193 |   await expect(row).toContainText('已隐藏');
  194 |   await navigate(page, '/opportunities/OPP-001');
  195 |   await expect(page.getByText('无敏感字段权限', { exact: true })).toBeVisible();
  196 |   await page.getByRole('tab', { name: '项目概算', exact: true }).click();
  197 |   await expect(page.getByRole('tabpanel', { name: '项目概算', exact: true })).toContainText('已隐藏');
  198 |   expect(errors).toEqual([]);
  199 | });
  200 | 
  201 | test('台账分页和金额排序使用完整可见集合', async ({ page }) => {
  202 |   const errors = collectBrowserErrors(page);
  203 |   await seed(page);
  204 |   await navigate(page, '/opportunities');
  205 |   const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  206 |   await expect(rows).toHaveCount(10);
  207 |   await expect(rows.first()).toHaveAttribute('data-row-key', 'OPP-001');
  208 |   await page.locator('.ant-pagination-next').click();
  209 |   await expect(rows.first()).toHaveAttribute('data-row-key', 'OPP-011');
  210 |   await page.getByRole('columnheader', { name: /预计金额（万元）/ }).click();
  211 |   await page.locator('.ant-pagination-item-1').click();
  212 |   const expectedIds = await page.evaluate(async () => {
  213 |     const path = '/src/mock/business.ts';
  214 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  215 |     return [...business.useBusinessStore.getState().data.opportunities]
  216 |       .sort((a, b) => a.estimatedAmount - b.estimatedAmount).slice(0, 10).map(o => o.id);
  217 |   });
  218 |   await expect.poll(async () => rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-row-key')))).toEqual(expectedIds);
  219 |   await page.getByRole('button', { name: '更多筛选', exact: true }).click();
  220 |   await page.getByLabel('最低金额（万元）', { exact: true }).fill('8000');
  221 |   await page.getByRole('button', { name: /^查\s*询$/ }).click();
  222 |   const filteredIds = await page.evaluate(async () => {
  223 |     const path = '/src/mock/business.ts';
  224 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  225 |     return [...business.useBusinessStore.getState().data.opportunities]
  226 |       .filter(o => o.estimatedAmount >= 8000).sort((a, b) => a.estimatedAmount - b.estimatedAmount).slice(0, 10).map(o => o.id);
  227 |   });
  228 |   await expect.poll(async () => rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-row-key')))).toEqual(filteredIds);
  229 |   expect(errors).toEqual([]);
  230 | });
  231 | 
  232 | test('暂缓必须安排复评，详情与台账提醒同步并能发起复评', async ({ page }) => {
  233 |   const errors = collectBrowserErrors(page);
> 234 |   const id = await seed(page);
      |                                                       ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  235 |   await navigate(page, `/opportunities/${id}`);
  236 |   await page.getByRole('button', { name: /^暂\s*缓$/ }).click();
  237 |   const dialog = page.getByRole('dialog');
  238 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  239 |   await expect(dialog.locator('.ant-form-item-explain-error')).toHaveCount(3);
  240 |   await dialog.getByLabel('决策原因', { exact: true }).fill('客户预算审批推迟，安排下周复评');
  241 |   await dialog.getByLabel('下次复评日期', { exact: true }).fill('2026-09-15');
  242 |   await dialog.getByLabel('下次复评日期', { exact: true }).press('Enter');
  243 |   const owner = dialog.getByLabel('复评责任人', { exact: true });
  244 |   await owner.focus();
  245 |   await owner.press('ArrowDown');
  246 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^陈亮$/ }).click();
  247 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  248 |   await expect(dialog).toBeHidden();
  249 |   await expect(page.getByText('暂缓原因：客户预算审批推迟，安排下周复评', { exact: true })).toBeVisible();
  250 |   await expect(page.getByText(/复评日期 2026-09-15 · 责任人 陈亮/)).toBeVisible();
  251 |   await capturePageEvidence(page, 'GS03-paused');
  252 |   await navigate(page, '/opportunities?keyword=OPP-2026-002');
  253 |   await expect(page.getByText('未来7日需复评 1 个商机', { exact: true })).toBeVisible();
  254 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('暂缓');
  255 |   await page.locator('.ant-table-tbody tr.ant-table-row').getByRole('button', { name: '发起评估', exact: true }).click();
  256 |   await expect(page).toHaveURL(`/opportunities/${id}/evaluation`);
  257 |   const result = await page.evaluate(async (opportunityId) => {
  258 |     const path = '/src/mock/business.ts';
  259 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  260 |     const data = business.useBusinessStore.getState().data;
  261 |     return { pause: data.opportunityMeta[opportunityId].pauses.at(-1), assessment: data.opportunityMeta[opportunityId].assessments.at(-1)?.status };
  262 |   }, id);
  263 |   expect(result.pause).toMatchObject({ reason: '客户预算审批推迟，安排下周复评', reviewDate: '2026-09-15', ownerId: 'U-006' });
  264 |   expect(result.assessment).toBe('评估中');
  265 |   expect(errors).toEqual([]);
  266 | });
  267 | 
  268 | test('真实前期投入终止时强制处置说明，保留来源成本与只读历史', async ({ page }) => {
  269 |   const errors = collectBrowserErrors(page);
  270 |   const id = await seed(page, 'ready');
  271 |   const before = await page.evaluate(async (opportunityId) => {
  272 |     const path = '/src/mock/business.ts';
  273 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  274 |     const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
  275 |     const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
  276 |     const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
  277 |     let data = business.useBusinessStore.getState().data;
  278 |     const o = data.opportunities.find(v => v.id === opportunityId)!;
  279 |     data = business.transition(data, { type: 'save-early-investment', id: opportunityId, submit: true, input: {
  280 |       reason: '客户技术验证', amount: 20, resourceTypes: ['人力'], department: '智慧城市业务群', people: ['U-005'],
  281 |       startDate: '2026-09-09', endDate: '2026-09-30', signPlanDate: '2026-11-30', signPlan: '完成合同会签',
  282 |       riskLevel: '一般', risks: '签约推迟风险', exitPlan: '未签则停止投入并保留成本', estimateId: o.currentEstimateVersionId!,
  283 |     } }, market);
  284 |     const requestId = data.earlyInvestmentRequests.at(-1)!.id;
  285 |     data = business.transition(data, { type: 'review-early-investment', id: opportunityId, requestId, approve: true, opinion: '同意技术验证额度' }, pmo);
  286 |     data = business.transition(data, { type: 'record-early-cost', id: opportunityId, requestId, sourceId: 'A01-EARLY-VOUCHER', subjectId: 'SUB-01', amount: 12, occurredDate: '2026-09-09', description: '验证人力投入' }, finance);
  287 |     business.useBusinessStore.setState({ data });
  288 |     return { earlyCosts: data.earlyCosts.filter(c => c.opportunityId === opportunityId), costs: data.costs };
  289 |   }, id);
  290 |   await navigate(page, `/opportunities/${id}`);
  291 |   await page.getByRole('button', { name: /^终\s*止$/ }).click();
  292 |   const dialog = page.getByRole('dialog');
  293 |   await expect(dialog).toContainText('已发生提前投入：12.00 万元');
  294 |   await dialog.getByLabel('决策原因', { exact: true }).fill('客户取消采购');
  295 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  296 |   await expect(dialog.locator('.ant-form-item-explain-error')).toHaveCount(2);
  297 |   await dialog.getByLabel('成本处置说明', { exact: true }).fill('12万元转沉没成本复盘，保留原始凭证');
  298 |   await dialog.getByLabel('退出复盘与沉没成本分析', { exact: true }).fill('后续技术验证应控制在已批准额度内并分段确认');
  299 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  300 |   await expect(dialog).toBeHidden();
  301 |   await expect(page.getByText(/历史投入 12 万元继续保留/)).toBeVisible();
  302 |   await expect(page.getByRole('button', { name: /^编\s*辑$/ })).toBeDisabled();
  303 |   await page.getByRole('tab', { name: '跟进记录', exact: true }).click();
  304 |   await expect(page.getByRole('button', { name: '追加跟进', exact: true })).toHaveCount(0);
  305 |   const after = await page.evaluate(async (opportunityId) => {
  306 |     const path = '/src/mock/business.ts';
  307 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  308 |     const data = business.useBusinessStore.getState().data;
  309 |     return { earlyCosts: data.earlyCosts.filter(c => c.opportunityId === opportunityId), costs: data.costs,
  310 |       status: data.opportunities.find(o => o.id === opportunityId)!.status,
  311 |       used: data.opportunities.find(o => o.id === opportunityId)!.earlyInvestmentUsed,
  312 |       termination: data.opportunityMeta[opportunityId].termination };
  313 |   }, id);
  314 |   expect(after.earlyCosts).toEqual(before.earlyCosts);
  315 |   expect(after.costs).toEqual(before.costs);
  316 |   expect(after.status).toBe('已终止');
  317 |   expect(after.used).toBe(12);
  318 |   expect(after.termination).toMatchObject({ costSnapshot: 12, reason: '客户取消采购', costDisposition: '12万元转沉没成本复盘，保留原始凭证' });
  319 |   await page.getByRole('tab', { name: '概览', exact: true }).click();
  320 |   await capturePageEvidence(page, 'GS03-terminated');
  321 |   expect(errors).toEqual([]);
  322 | });
  323 | 
  324 | test('未知商机、组织拒绝和已立项商机的真实项目下钻', async ({ page }) => {
  325 |   const errors = collectBrowserErrors(page);
  326 |   await seed(page);
  327 |   await navigate(page, '/opportunities/OPP-NOT-FOUND');
  328 |   await expect(page.locator('.ant-result-404')).toBeVisible();
  329 |   await navigate(page, '/opportunities/OPP-001');
  330 |   await page.getByRole('link', { name: '已转入项目：福建省晋江市岸海防综合治理平台', exact: true }).click();
  331 |   await expect(page).toHaveURL('/projects/P-001');
  332 |   await expect(page.getByRole('heading', { name: 'HS-01 项目详情总览', exact: true })).toBeVisible();
  333 |   await expect(page.getByText('P-001 · 福建省晋江市岸海防综合治理平台', { exact: true })).toBeVisible();
  334 |   await role(page, '财务专员');
```