# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: internal-supplier-acceptance.spec.ts >> JS01/02筛选空态、错误记录、未知项目和只读角色
- Location: e2e/internal-supplier-acceptance.spec.ts:208:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.ant-table-placeholder')
Expected substring: "暂无数据"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.ant-table-placeholder') with timeout 5000ms
  - waiting for locator('.ant-table-placeholder')

```

```yaml
- complementary:
  - text: PMS PMS 平台 四算联动全生命周期
  - menu:
    - menuitem "appstore 工作台与待办" [expanded]:
      - img "appstore"
      - text: 工作台与待办
    - menu:
      - menuitem "项目经理工作台"
      - menuitem "我的待办中心"
    - menuitem "dollar 商机与概算阶段":
      - img "dollar"
      - text: 商机与概算阶段
    - menuitem "project 预算与立项阶段":
      - img "project"
      - text: 预算与立项阶段
    - menuitem "schedule 核算与执行阶段":
      - img "schedule"
      - text: 核算与执行阶段
    - menuitem "check-circle 结算与收尾阶段" [expanded]:
      - img "check-circle"
      - text: 结算与收尾阶段
    - menu:
      - menuitem "内部验收"
      - menuitem "供应商验收"
      - menuitem "客户验收"
      - menuitem "项目报验"
      - menuitem "项目结算申请"
      - menuitem "项目结算详情"
      - menuitem "四算对比分析"
      - menuitem "项目经营结果"
      - menuitem "项目后评价"
      - menuitem "项目资料归档"
      - menuitem "运维衔接"
      - menuitem "运维项目详情"
      - menuitem "项目关闭"
- banner:
  - button "折叠或展开导航":
    - img "menu-fold"
  - button "搜索项目、合同、单据":
    - img "search"
    - text: 搜索项目、合同、单据... ⌘K
  - strong: 供应商验收
  - text: "数据截至 2026-09-09 角色:"
  - combobox "模拟身份"
  - img "user"
  - text: 项目经理 (张建国)
  - img "user"
  - text: 张建国
- main:
  - navigation:
    - list:
      - listitem:
        - link "项目":
          - /url: /projects/P-PLAN-001
      - listitem: 供应商验收
  - heading "供应商验收" [level=4]
  - text: P-PLAN-001 · 福建园区设备运维协同平台 · 张建国 · 未形成
  - button "质量与交付物"
  - button "发起供应商验收" [disabled]
  - button "内部初验"
  - button "供应商验收"
  - button "客户终验"
  - button "项目报验"
  - button "项目结算申请"
  - alert:
    - img "check-circle"
    - text: 供应商验收不适用：本项目无采购、外包或供应商交付合同。
  - tablist:
    - tab "验收轮次（0）" [selected]
    - tab "准备清单（2/7）"
    - tab "供应商原合同（0）"
  - tabpanel "验收轮次（0）":
    - textbox "验收查询":
      - /placeholder: 编号或范围
      - text: NO-SUCH-ACCEPTANCE
    - combobox "验收状态筛选"
    - text: 全部状态
    - button "重置查询"
    - img "暂无数据"
    - text: 本环节不适用，可进入客户验收
```

# Test source

```ts
  118 |   observations.set(page, { oldId, nextId, screenshots: await capture(page, 'JS01-internal-reinspection-passed', `${base}/internal-acceptance`) });
  119 | });
  120 | 
  121 | async function confirmBlocked(page: Page, text: string) {
  122 |   await page.locator('.ant-modal:visible').getByRole('button', { name: '确认提交', exact: true }).click();
  123 |   await expect(page.getByText(text, { exact: true })).toBeVisible();
  124 |   await expect(page.locator('.ant-modal:visible')).toHaveCount(1);
  125 | }
  126 | 
  127 | // Procurement is an upstream prerequisite prepared through authentic transitions.
  128 | // This is NOT evidence of procurement/finance UI acceptance; JS02 actions below use UI only.
  129 | async function prepareSupplier(page: Page) {
  130 |   await page.goto('/workbench/project-manager');
  131 |   return page.evaluate(async () => {
  132 |     const path = '/src/mock/business.ts';
  133 |     const acceptancePath = '/src/mock/acceptance.ts';
  134 |     const business = await import(/* @vite-ignore */ path) as BusinessModule;
  135 |     const acceptance = await import(/* @vite-ignore */ acceptancePath) as AcceptanceModule;
  136 |     const pm = { id: 'U-001', name: '张建国', role: 'project-manager' as const };
  137 |     const finance = { id: 'U-004', name: '刘敏', role: 'finance' as const };
  138 |     let state = business.createBusinessState();
  139 |     if (acceptance.acceptanceConditions(state, 'P-006', '供应商验收').some(c => !c.passed)) throw new Error('P006历史准入条件不满足');
  140 |     state = business.transition(state, { type: 'dispose-settlement-balance', projectId: 'P-006', subjectId: 'SUB-03', bucket: '承诺', disposition: '取消不发生', amount: 1, evidence: '旧配件采购取消1万元，供应商取消确认函.pdf' }, finance);
  141 |     state = business.transition(state, { type: 'submit-cost-order', projectId: 'P-006', kind: 'procurement', subjectId: 'SUB-03', title: '园区替换配件采购', amount: 1, supplier: '园区设备服务商', contractNo: 'JS02-E2E-CG-001', scope: '替换配件与技术资料', dueDate: '2026-09-20' }, pm);
  142 |     const id = state.costOrders.at(-1)!.id;
  143 |     state = business.transition(state, { type: 'process-cost-order', id, operation: 'approve', note: '取消旧采购并核准替换配件预算' }, finance);
  144 |     state = business.transition(state, { type: 'process-cost-order', id, operation: 'progress', progress: 100, note: '配件与随货技术资料全部到货' }, pm);
  145 |     business.useBusinessStore.setState({ data: state });
  146 |     return id;
  147 |   });
  148 | }
  149 | 
  150 | test('JS02动态采购验收缺证明阻断，通过只同步履约不增加成本', async ({ page }) => {
  151 |   test.setTimeout(90_000);
  152 |   const orderId = await prepareSupplier(page);
  153 |   await navigate(page, `${base}/supplier-acceptance`);
  154 |   const before = await snapshot(page);
  155 |   await page.getByRole('button', { name: '发起供应商验收', exact: true }).click();
  156 |   await fillApplication(page, '替换配件及随货资料履约验收');
  157 |   await page.getByRole('combobox', { name: '供应商原合同', exact: true }).click();
  158 |   await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'JS02-E2E-CG-001' }).click();
  159 |   await confirm(page);
  160 |   let id = new URL(page.url()).searchParams.get('record')!;
  161 |   await expect(page.getByRole('button', { name: '登记验收结论', exact: true })).toBeDisabled();
  162 |   await role(page, 'PMO负责人');
  163 |   await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  164 |   await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  165 |   await fillReview(page, ['数量', '质量及技术参数', '服务', '交付时间', '成果及文档']);
  166 |   const pending = await snapshot(page);
  167 |   await confirmBlocked(page, '供应商验收通过须登记有效验收证明文件名');
  168 |   expect(await snapshot(page)).toEqual(pending);
  169 |   const originalId = id;
  170 |   const reviewDialog = page.locator('.ant-modal:visible');
  171 |   await reviewDialog.locator('.ant-form-item').filter({ has: page.getByText('验收结论', { exact: true }) }).locator('.ant-select').click();
  172 |   await page.locator('.ant-select-dropdown:visible').getByText('整改后复验', { exact: true }).click();
  173 |   await reviewDialog.locator('.ant-form-item').filter({ has: page.getByText('整改内容', { exact: true }) }).locator('textarea').fill('补齐供应商交付文档与设备序列号清单');
  174 |   await confirm(page);
  175 |   await role(page, '项目经理');
  176 |   await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  177 |   await page.getByRole('button', { name: '回复整改清单', exact: true }).click();
  178 |   await page.getByLabel('整改回复', { exact: true }).fill('供应商文档与序列号已补齐，逐项复核一致');
  179 |   await confirm(page);
  180 |   await page.getByRole('button', { name: '整改后发起新轮次', exact: true }).click();
  181 |   await fillApplication(page, '供应商文档与序列号整改复验');
  182 |   await confirm(page);
  183 |   id = new URL(page.url()).searchParams.get('record')!;
  184 |   expect(id).not.toBe(originalId);
  185 |   await role(page, 'PMO负责人');
  186 |   await navigate(page, `${base}/supplier-acceptance?record=${id}`);
  187 |   await page.getByRole('button', { name: '登记验收结论', exact: true }).click();
  188 |   await fillReview(page, ['数量', '质量及技术参数', '服务', '交付时间', '成果及文档']);
  189 |   await page.getByLabel('供应商验收证明', { exact: true }).fill('供应商履约验收证明.pdf');
  190 |   await confirm(page);
  191 |   const after = await snapshot(page);
  192 |   expect(after.orders.find(o => o.id === orderId)?.status).toBe('验收通过');
  193 |   expect(after.details[id].supplierSourceId).toBe(orderId);
  194 |   expect(after.details[id].previousId).toBe(originalId);
  195 |   expect(after.acceptances.find(a => a.id === originalId)?.status).toBe('整改中');
  196 |   expect(after.acceptances.find(a => a.id === id)?.status).toBe('已通过');
  197 |   expect(after.costs).toEqual(before.costs);
  198 |   await expect(page.getByRole('button', { name: '登记验收结论', exact: true })).toBeDisabled();
  199 |   const screenshots = await capture(page, 'JS02-dynamic-supplier-passed', `${base}/supplier-acceptance`);
  200 |   await page.getByRole('tab', { name: /供应商原合同/ }).click();
  201 |   const sourceRow = page.locator('.ant-table-tbody > tr').filter({ hasText: 'JS02-E2E-CG-001' });
  202 |   await expect(sourceRow).toContainText('验收通过');
  203 |   await sourceRow.getByRole('button', { name: '查看原单', exact: true }).click();
  204 |   await expect(page).toHaveURL(new RegExp(`/projects/P-006/procurement\\?source=${orderId}`));
  205 |   observations.set(page, { orderId, acceptanceId: id, screenshots, upstreamPreparation: '真实成本transition；不作为上游UI验收证据' });
  206 | });
  207 | 
  208 | test('JS01/02筛选空态、错误记录、未知项目和只读角色', async ({ page }) => {
  209 |   await page.goto('/workbench/project-manager');
  210 |   const screenshots: Record<string, unknown> = {};
  211 |   await navigate(page, '/projects/P-PLAN-001/supplier-acceptance');
  212 |   await expect(page.getByText('供应商验收不适用：本项目无采购、外包或供应商交付合同。', { exact: true })).toBeVisible();
  213 |   await expect(page.getByRole('button', { name: '发起供应商验收', exact: true })).toBeDisabled();
  214 |   for (const path of ['internal-acceptance', 'supplier-acceptance']) {
  215 |     await navigate(page, `${base}/${path}`);
  216 |     await closeDrawer(page);
  217 |     await page.getByLabel('验收查询', { exact: true }).fill('NO-SUCH-ACCEPTANCE');
> 218 |     await expect(page.locator('.ant-table-placeholder')).toContainText('暂无数据');
      |                                                          ^ Error: expect(locator).toContainText(expected) failed
  219 |     screenshots[path] = await capturePageEvidence(page, `JS-${path}-empty`);
  220 |     await navigate(page, `${base}/${path}?record=UNKNOWN`);
  221 |     await expect(page.getByText('验收记录不存在', { exact: true })).toBeVisible();
  222 |   }
  223 |   await role(page, '财务专员');
  224 |   await navigate(page, `${base}/internal-acceptance`);
  225 |   await expect(page.getByRole('button', { name: '发起内部初验', exact: true })).toBeDisabled();
  226 |   await navigate(page, `${base}/supplier-acceptance`);
  227 |   await expect(page.getByRole('button', { name: '发起供应商验收', exact: true })).toBeDisabled();
  228 |   await role(page, '方案架构师');
  229 |   for (const path of ['internal-acceptance', 'supplier-acceptance']) {
  230 |     await navigate(page, `${base}/${path}`);
  231 |     await expect(page.getByText('403 无访问权限', { exact: true })).toBeVisible();
  232 |   }
  233 |   await role(page, '项目经理');
  234 |   await navigate(page, '/projects/UNKNOWN/internal-acceptance');
  235 |   await expect(page.getByText('404 页面未找到', { exact: true })).toBeVisible();
  236 |   observations.set(page, { screenshots });
  237 | });
  238 | 
```