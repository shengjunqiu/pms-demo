# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: opportunity-ledger.spec.ts >> 台账日期方案恢复、列设置导出与补录跟进日期
- Location: e2e/opportunity-ledger.spec.ts:87:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '追加跟进', exact: true })

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
            - tab "概览" [ref=e123] [cursor=pointer]
            - tab "跟进记录" [active] [selected] [ref=e125] [cursor=pointer]
            - tab "商机评估" [ref=e127] [cursor=pointer]
            - tab "需求与方案" [ref=e129] [cursor=pointer]
            - tab "技术成本评估" [ref=e131] [cursor=pointer]
            - tab "专家评审" [ref=e133] [cursor=pointer]
            - tab "项目概算" [ref=e135] [cursor=pointer]
            - tab "提前投入" [ref=e137] [cursor=pointer]
            - tab "操作记录" [ref=e139] [cursor=pointer]
        - generic [ref=e141]:
          - text: ": : : : : : : : : : : : : : : : : : : :"
          - tabpanel "跟进记录" [ref=e142]:
            - generic [ref=e143]:
              - img "暂无数据" [ref=e145]
              - generic [ref=e157]: 尚无跟进记录
```

# Test source

```ts
  26  |       name: '台账验收数据共享项目', customerId: 'CUST-001', departmentId: 'D-002', ownerId: 'U-006',
  27  |       estimatedAmount: 1000, expectedSignDate: '2026-11-30', winRate: 80, source: '客户需求',
  28  |       projectType: '软件开发', description: '整合跨部门数据', competition: '公开比选',
  29  |       businessLine: '数字政务', region: '福建省', collaborators: ['U-005'], attachments: ['需求.pdf'],
  30  |     } }, market);
  31  |     const id = state.opportunities.at(-1)!.id;
  32  |     act({ type: 'start-opportunity-assessment', id }, market);
  33  |     for (const dimension of ['customer', 'commercial', 'competition', 'technology', 'delivery', 'margin'] as const) {
  34  |       act({ type: 'save-opportunity-dimension', id, dimension, opinion: {
  35  |         score: 85, conclusion: '可行', risk: '', note: '专业条件核对完成', attachment: '',
  36  |         preliminaryCost: dimension === 'margin' ? 600 : undefined,
  37  |       } }, dimension === 'margin' ? finance : ['technology', 'delivery'].includes(dimension) ? tech : market);
  38  |     }
  39  |     act({ type: 'conclude-opportunity', id, conclusion: '拟立项', reason: '六维条件完成，进入方案调研' }, market);
  40  |     const solution: SolutionDraft = {
  41  |       customerSituation: '多套系统孤立', goals: '统一数据共享', scope: '20个接口', boundaries: '不含历史清洗',
  42  |       architecture: '微服务', implementation: '调研、迭代、试运行', deliverables: '接口文档、部署包',
  43  |       dependencies: '客户提供环境', assumptions: '接口稳定开放', ownerId: 'U-005', participants: ['U-005', 'U-006'],
  44  |       startDate: '2026-09-09', endDate: '2026-09-20', attachments: ['方案.pdf'], changeReason: '',
  45  |     };
  46  |     const cost: CostDraft = {
  47  |       solutionFingerprint: '', feasibility: '可行', architecture: '既有产品', reuse: '复用80%', customization: '20接口',
  48  |       environment: '容器平台', security: '身份认证', dependencies: '客户认证服务', risk: '交付窗口', attachments: ['成本.xlsx'],
  49  |       lines: [{ id: 'L1', subjectId: 'SUB-01', name: '接口开发', scope: '20接口', quantity: 100, unit: '人天',
  50  |         unitPrice: 1, taxRate: 0, taxBasis: '含税', basis: '2人50天', risk: '', laborUserId: 'U-005', laborGrade: '高级研发' }],
  51  |     };
  52  |     const approve = () => {
  53  |       act({ type: 'presales-save-solution', id, draft: solution }, tech);
  54  |       act({ type: 'presales-save-cost', id, draft: cost }, tech);
  55  |       act({ type: 'presales-finance-check', id, opinion: '核对范围和人力基准' }, finance);
  56  |       act({ type: 'presales-submit-review', id, method: '线上评审', plannedDate: '2026-09-10', expertIds: ['U-005', 'U-004'] }, pmo);
  57  |       const reviewId = state.presales[id].reviews.at(-1)!.id;
  58  |       for (const actor of [tech, finance]) act({ type: 'presales-expert-opinion', id, reviewId, conclusion: '通过', opinion: '专业条件通过', attachment: '' }, actor);
  59  |       act({ type: 'presales-review-decision', id, reviewId, conclusion: '通过', reason: '意见一致，形成概算', corrections: [] }, pmo);
  60  |       return reviewId;
  61  |     };
  62  |     const reviewId = approve();
  63  |     act({ type: 'estimate-create-draft', id, reviewId }, tech);
  64  |     act({ type: 'estimate-publish', id }, tech);
  65  |     act({ type: 'estimate-freeze', id, estimateId: state.estimates.at(-1)!.id, opinion: '核对方案成本版本一致' }, pmo);
  66  |     if (scenario === 'stale') {
  67  |       solution.architecture = '微服务增加双因素认证';
  68  |       solution.changeReason = '补充安全方案后重新评审';
  69  |       approve();
  70  |     }
  71  |     business.useBusinessStore.setState({ data: state });
  72  |     return id;
  73  |   }, mode);
  74  |   await role(page, '客户经理');
  75  |   return id;
  76  | }
  77  | 
  78  | test.beforeAll(prepareArtifacts);
  79  | const browserErrors = new WeakMap<Page, string[]>();
  80  | test.beforeEach(({ page }) => { browserErrors.set(page, collectBrowserErrors(page)); });
  81  | test.afterEach(({ page }, info) => {
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
> 126 |     await page.getByRole('button', { name: '追加跟进', exact: true }).click();
      |                                                                   ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  182 |   await expect(page.getByRole('button', { name: '发起立项', exact: true })).toBeDisabled();
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
```