# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: opportunity-ledger.spec.ts >> 未知商机、组织拒绝和已立项商机的真实项目下钻
- Location: e2e/opportunity-ledger.spec.ts:322:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: '福建省晋江市岸海防综合治理平台', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: '福建省晋江市岸海防综合治理平台', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: '福建省晋江市岸海防综合治理平台', exact: true })

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
  - text: HS-01
  - strong: 项目详情总览
  - text: "详情全景 基准日: 2026-09-09 角色:"
  - combobox "模拟身份"
  - img "user"
  - text: 客户经理/销售 (陈亮)
  - img "user"
  - text: 陈亮
- main:
  - navigation:
    - list:
      - listitem:
        - link "首页":
          - /url: /
      - listitem: 福建省晋江市岸海防综合治理平台
  - heading "HS-01 项目详情总览" [level=4]
  - text: P-001 · 福建省晋江市岸海防综合治理平台
  - combobox "切换项目"
  - text: P-001 福建省晋江市岸海防综合治理平台
  - button "arrow-left 返回":
    - img "arrow-left"
    - text: 返回
  - separator
  - table:
    - rowgroup:
      - 'row "来源商机 : OPP-2026-001 客户 : 福建省晋江市海洋与渔业局 主项目经理 : 张建国"':
        - 'cell "来源商机 : OPP-2026-001"':
          - text: "来源商机 :"
          - button "OPP-2026-001"
        - 'cell "客户 : 福建省晋江市海洋与渔业局"'
        - 'cell "主项目经理 : 张建国"'
      - 'row "主责部门 : 交付中心一部 执行阶段 : 执行 · 开发实施 健康度 : 关注"':
        - 'cell "主责部门 : 交付中心一部"'
        - 'cell "执行阶段 : 执行 · 开发实施"'
        - 'cell "健康度 : 关注"'
      - 'row "合同状态 : 已签约 拟签/项目收入 : 5,538.30 万元 预测毛利率 : 46.1%"':
        - 'cell "合同状态 : 已签约"'
        - 'cell "拟签/项目收入 : 5,538.30 万元"'
        - 'cell "预测毛利率 : 46.1%"'
      - 'row "计划验收 : 2026-12-31 项目总监（演示任命） : 张总 已发生成本 : 1,650.00 万元"':
        - 'cell "计划验收 : 2026-12-31"'
        - 'cell "项目总监（演示任命） : 张总"'
        - 'cell "已发生成本 : 1,650.00 万元"'
      - 'row "已签合同金额 : 5,538.30 万元"':
        - 'cell "已签合同金额 : 5,538.30 万元"'
  - text: 滚动成本超预算 4.86% · 数据更新至 2026-09-09 · 当前角色：业务查看
  - img "check"
  - text: 概算
  - img "check"
  - text: 预算 3 核算 4 结算及运维
  - tablist:
    - tab "项目概览" [selected]
    - tab "团队"
    - tab "计划进度"
    - tab "四算"
    - tab "成本"
    - tab "质量"
    - tab "日报周报"
    - tab "问题风险（4）"
    - tab "需求BUG（25）"
    - tab "采购外包"
    - tab "变更"
    - tab "交付物"
    - tab "验收结算"
    - tab "回款"
    - tab "操作记录"
    - button "ellipsis":
      - img "ellipsis"
  - tabpanel "项目概览":
    - text: 项目经营摘要
    - button "有效预算 2,847.70"
    - button "滚动预测成本 2,986.20"
    - button "预测成本偏差 +138.50"
    - button "预测毛利 2,552.10"
    - button "查看动态核算与原始凭证 arrow-right":
      - text: 查看动态核算与原始凭证
      - img "arrow-right"
    - text: 当前事项
    - button "未关闭问题 2"
    - button "当前风险 2"
    - button "未关闭 BUG 7"
    - button "未关闭需求 18"
    - text: 最近动态
    - strong: 2026-09-08 · 张建国
    - paragraph: 完成系统核心模块接口对接联调与单元测试
    - button "查看日报周报"
    - text: 关键里程碑
    - list:
      - listitem:
        - button "启动"
        - text: 已达成 2026-08-01
      - listitem:
        - button "开发完成"
        - text: 已达成 2026-08-01
      - listitem:
        - button "内部初验"
        - text: 未达成 2026-09-20
      - listitem:
        - button "客户终验"
        - text: 未达成 2026-12-31
    - text: 验收与交付
    - paragraph: 材料审核通过 1 / 3 项
    - progressbar: 33%
    - button "交付物清单"
    - button "验收记录"
```

# Test source

```ts
  230 |   expect(errors).toEqual([]);
  231 | });
  232 | 
  233 | test('暂缓必须安排复评，详情与台账提醒同步并能发起复评', async ({ page }) => {
  234 |   const errors = collectBrowserErrors(page);
  235 |   const id = await seed(page);
  236 |   await navigate(page, `/opportunities/${id}`);
  237 |   await page.getByRole('button', { name: /^暂\s*缓$/ }).click();
  238 |   const dialog = page.getByRole('dialog');
  239 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  240 |   await expect(dialog.locator('.ant-form-item-explain-error')).toHaveCount(3);
  241 |   await dialog.getByLabel('决策原因', { exact: true }).fill('客户预算审批推迟，安排下周复评');
  242 |   await dialog.getByLabel('下次复评日期', { exact: true }).fill('2026-09-15');
  243 |   await dialog.getByLabel('下次复评日期', { exact: true }).press('Enter');
  244 |   const owner = dialog.getByLabel('复评责任人', { exact: true });
  245 |   await owner.focus();
  246 |   await owner.press('ArrowDown');
  247 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^陈亮$/ }).click();
  248 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  249 |   await expect(dialog).toBeHidden();
  250 |   await expect(page.getByText('暂缓原因：客户预算审批推迟，安排下周复评', { exact: true })).toBeVisible();
  251 |   await expect(page.getByText(/复评日期 2026-09-15 · 责任人 陈亮/)).toBeVisible();
  252 |   await capturePageEvidence(page, 'GS03-paused');
  253 |   await navigate(page, '/opportunities?keyword=OPP-2026-002');
  254 |   await expect(page.getByText('未来7日需复评 1 个商机', { exact: true })).toBeVisible();
  255 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toContainText('暂缓');
  256 |   await page.locator('.ant-table-tbody tr.ant-table-row').getByRole('button', { name: '发起评估', exact: true }).click();
  257 |   await expect(page).toHaveURL(`/opportunities/${id}/evaluation`);
  258 |   const result = await page.evaluate(async (opportunityId) => {
  259 |     const path = '/src/mock/business.ts';
  260 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  261 |     const data = business.useBusinessStore.getState().data;
  262 |     return { pause: data.opportunityMeta[opportunityId].pauses.at(-1), assessment: data.opportunityMeta[opportunityId].assessments.at(-1)?.status };
  263 |   }, id);
  264 |   expect(result.pause).toMatchObject({ reason: '客户预算审批推迟，安排下周复评', reviewDate: '2026-09-15', ownerId: 'U-006' });
  265 |   expect(result.assessment).toBe('评估中');
  266 |   expect(errors).toEqual([]);
  267 | });
  268 | 
  269 | test('真实前期投入终止时强制处置说明，保留来源成本与只读历史', async ({ page }) => {
  270 |   const errors = collectBrowserErrors(page);
  271 |   const id = await seed(page, 'ready');
  272 |   const before = await page.evaluate(async (opportunityId) => {
  273 |     const path = '/src/mock/business.ts';
  274 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  275 |     const market: Actor = { id: 'U-006', name: '陈亮', role: 'market' };
  276 |     const pmo: Actor = { id: 'U-002', name: '李主任', role: 'pmo' };
  277 |     const finance: Actor = { id: 'U-004', name: '刘敏', role: 'finance' };
  278 |     let data = business.useBusinessStore.getState().data;
  279 |     const o = data.opportunities.find(v => v.id === opportunityId)!;
  280 |     data = business.transition(data, { type: 'save-early-investment', id: opportunityId, submit: true, input: {
  281 |       reason: '客户技术验证', amount: 20, resourceTypes: ['人力'], department: '智慧城市业务群', people: ['U-005'],
  282 |       startDate: '2026-09-09', endDate: '2026-09-30', signPlanDate: '2026-11-30', signPlan: '完成合同会签',
  283 |       riskLevel: '一般', risks: '签约推迟风险', exitPlan: '未签则停止投入并保留成本', estimateId: o.currentEstimateVersionId!,
  284 |     } }, market);
  285 |     const requestId = data.earlyInvestmentRequests.at(-1)!.id;
  286 |     data = business.transition(data, { type: 'review-early-investment', id: opportunityId, requestId, approve: true, opinion: '同意技术验证额度' }, pmo);
  287 |     data = business.transition(data, { type: 'record-early-cost', id: opportunityId, requestId, sourceId: 'A01-EARLY-VOUCHER', subjectId: 'SUB-01', amount: 12, occurredDate: '2026-09-09', description: '验证人力投入' }, finance);
  288 |     business.useBusinessStore.setState({ data });
  289 |     return { earlyCosts: data.earlyCosts.filter(c => c.opportunityId === opportunityId), costs: data.costs };
  290 |   }, id);
  291 |   await navigate(page, `/opportunities/${id}`);
  292 |   await page.getByRole('button', { name: /^终\s*止$/ }).click();
  293 |   const dialog = page.getByRole('dialog');
  294 |   await expect(dialog).toContainText('已发生提前投入：12.00 万元');
  295 |   await dialog.getByLabel('决策原因', { exact: true }).fill('客户取消采购');
  296 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  297 |   await expect(dialog.locator('.ant-form-item-explain-error')).toHaveCount(2);
  298 |   await dialog.getByLabel('成本处置说明', { exact: true }).fill('12万元转沉没成本复盘，保留原始凭证');
  299 |   await dialog.getByLabel('退出复盘与沉没成本分析', { exact: true }).fill('后续技术验证应控制在已批准额度内并分段确认');
  300 |   await dialog.getByRole('button', { name: '确认并记录', exact: true }).click();
  301 |   await expect(dialog).toBeHidden();
  302 |   await expect(page.getByText(/历史投入 12 万元继续保留/)).toBeVisible();
  303 |   await expect(page.getByRole('button', { name: /^编\s*辑$/ })).toBeDisabled();
  304 |   await page.getByRole('tab', { name: '跟进记录', exact: true }).click();
  305 |   await expect(page.getByRole('button', { name: '追加跟进', exact: true })).toHaveCount(0);
  306 |   const after = await page.evaluate(async (opportunityId) => {
  307 |     const path = '/src/mock/business.ts';
  308 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  309 |     const data = business.useBusinessStore.getState().data;
  310 |     return { earlyCosts: data.earlyCosts.filter(c => c.opportunityId === opportunityId), costs: data.costs,
  311 |       status: data.opportunities.find(o => o.id === opportunityId)!.status,
  312 |       used: data.opportunities.find(o => o.id === opportunityId)!.earlyInvestmentUsed,
  313 |       termination: data.opportunityMeta[opportunityId].termination };
  314 |   }, id);
  315 |   expect(after.earlyCosts).toEqual(before.earlyCosts);
  316 |   expect(after.costs).toEqual(before.costs);
  317 |   expect(after.status).toBe('已终止');
  318 |   expect(after.used).toBe(12);
  319 |   expect(after.termination).toMatchObject({ costSnapshot: 12, reason: '客户取消采购', costDisposition: '12万元转沉没成本复盘，保留原始凭证' });
  320 |   await page.getByRole('tab', { name: '概览', exact: true }).click();
  321 |   await capturePageEvidence(page, 'GS03-terminated');
  322 |   expect(errors).toEqual([]);
  323 | });
  324 | 
  325 | test('未知商机、组织拒绝和已立项商机的真实项目下钻', async ({ page }) => {
  326 |   const errors = collectBrowserErrors(page);
  327 |   await seed(page);
  328 |   await navigate(page, '/opportunities/OPP-NOT-FOUND');
  329 |   await expect(page.locator('.ant-result-404')).toBeVisible();
> 330 |   await navigate(page, '/opportunities/OPP-001');
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  331 |   await page.getByRole('link', { name: '已转入项目：福建省晋江市岸海防综合治理平台', exact: true }).click();
  332 |   await expect(page).toHaveURL('/projects/P-001');
  333 |   await expect(page.getByRole('heading', { name: 'HS-01 项目详情总览', exact: true })).toBeVisible();
  334 |   await expect(page.getByText('P-001 · 福建省晋江市岸海防综合治理平台', { exact: true })).toBeVisible();
  335 |   await role(page, '财务专员');
  336 |   await page.evaluate(async () => {
  337 |     const path = '/src/mock/business.ts';
  338 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  339 |     const admin: Actor = { id: 'U-ADMIN', name: '系统管理员', role: 'admin' };
  340 |     let data = business.useBusinessStore.getState().data;
  341 |     const source = data.accessConfiguration.versions.find(v => v.role === 'finance')!;
  342 |     data = business.transition(data, { type: 'access-policy-save', sourceId: source.id, value: {
  343 |       ...source, name: 'A01数字政务组织范围', dataScope: 'organizations', orgIds: ['D-003'],
  344 |       changeReason: '验收指定组织商机可见范围',
  345 |     } }, admin);
  346 |     data = business.transition(data, { type: 'access-policy-publish', id: data.accessConfiguration.versions.at(-1)!.id }, admin);
  347 |     business.useBusinessStore.setState({ data });
  348 |   });
  349 |   await navigate(page, '/opportunities?keyword=OPP-2026-001');
  350 |   await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  351 |   await expect(page.locator('main').getByText('福建省晋江市岸海防综合治理平台商机', { exact: true })).toHaveCount(0);
  352 |   await navigate(page, '/opportunities/OPP-001');
  353 |   await expect(page.locator('.ant-result-403')).toBeVisible();
  354 |   await expect(page.locator('main').getByText('福建省晋江市岸海防综合治理平台商机', { exact: true })).toHaveCount(0);
  355 |   await capturePageEvidence(page, 'GS03-organization-denied');
  356 |   expect(errors).toEqual([]);
  357 | });
  358 | 
```