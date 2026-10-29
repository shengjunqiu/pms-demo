# QA 问题修复记录（r3）

日期：2026-10-29　范围：`qa-reports/r3/SUMMARY.md` 中 P0/P1 与轻量 P2；未提交 Git，保留工作区既有改动。

## 已修复

| 问题 | 修复 | 文件 |
| --- | --- | --- |
| P0 立项申请页无字段、无法提交 | 详情页签顶部新增可编辑表单：名称、区域、必要性、建议、范围、客户诉求、三个日期、附件；提交时校验 10 项必填，保存草稿允许不完整；保存草稿不再被必填拦截 | `src/pages/initiation/InitiationApplyPage.tsx` |
| P1 已有立项仍可重复发起 | 商机已有非否决立项单时，按钮改为「进入立项单」并指向原单；已转立项/终止或前置缺失时置灰，tooltip 说明原因 | `src/pages/opportunities/OpportunityActions.tsx` |
| P1 切换角色丢失审批原单 | 审批详情页（`/approvals/:id`）切角色时按工作台权限判定可停留，不再强制跳首页 | `src/components/layout/MainLayout.tsx:75-98` |
| P1 结算核算不进待办 | `settlementRequests` 映射为待办：财务「财务核算」、PMO「PMO审核/结算评审」，路由到项目结算页 | `src/mock/todos.ts` |
| P2 配置深链不落 Tab | `/settings/cost-baseline` →「费率与单价」，`/settings/alerts` →「预警规则」，`?kind=` 仍优先 | `src/pages/configuration/FinanceConfigurationPage.tsx` |
| P2 变更草稿提示错误 | 保存草稿提示「变更草稿已保存」，其余动作保持原文案 | `src/pages/changes/ChangeFormPage.tsx` |
| P2 待办噪音 | 默认按来源排序：我审批的 → 我负责的 → 我跟进的，再按到期日/编号 | `src/pages/workbench/TodosPage.tsx` |

## 验证

- `npx tsc -b --noEmit`：通过
- `npx eslint .`：通过
- `pnpm build`：通过（主包 410.1 KB）
- `pnpm test:domain`：254 passed
- `e2e/qa/fixes.spec.ts`：6 passed（立项表单必填/保存草稿、已有立项入口、审批切角色保上下文、结算待办、成本基准深链、变更文案）

## 未处理 / 需确认

1. **P-008 归档 6/14 与「已关闭」矛盾**：属种子业务语义，未改。需确认是补归档材料，还是把状态改为「收尾/待归档」。
2. **PMO 能否发起立项决策**：`canDecide` 现允许客户经理、PMO 决策页只读。需产品确认“PMO 评估后由谁发起决策”，未单方面放开权限。
3. P3：商机名称占位（`_68`）、未知深链统一 404、已签合同只读无版本/用印、财务 T+5 预警口径，未在本次范围。
4. 全局 `/settlement` 列表仍未新增路由；结算入口通过项目页与财务/PMO 待办可达。
5. 新商机“填写→提交→生成项建书”未做全新 OPP 的 E2E（种子商机均已有立项），表单校验与命令链分别由 fixes spec 和 domain tests 覆盖。

## 回归提示

修复影响立项、商机、审批详情、待办、财务配置、变更六个页面。已验收页面若依赖“切角色回首页”的旧行为，需按新行为复核。

## 第二轮（一并处理剩余项）

| 项 | 处理 | 文件 |
| --- | --- | --- |
| P-008「已关闭」但归档 6/14 | 阶段改为「收尾」，与在途结算/未归档一致；领域测试改为显式构造已关闭项目，保留“已关闭不可重写”覆盖 | `src/mock/index.ts`、`src/models/__tests__/operations.test.ts` |
| PMO 立项决策权限 | 复核 INIT-2：PMC 链首节点角色为 PMO，按钮「通过当前节点：PMO正式决策」可用；末节点才转集团领导，无需改权限 | 已用 E2E 锁定 |
| 全局 `/settlement` 404 | 新增结算台账页，含待核算/待审核/待锁定/已锁定指标、状态筛选、项目深链；财务/PMO/PM 菜单可达 | `src/pages/settlement/SettlementListPage.tsx`、`src/routes/modules/settlement.tsx`、`src/routes/nav-config.ts` |
| 商机占位名 `_68` | 72 条商机按“客户名+行业+商机”生成 | `src/mock/index.ts` |
| 已签合同无版本/用印 | 合同台账新增「合同版本」「用印记录」页签，展示 V1.0 草稿→V2.0 签署版、合同章/法人章留痕 | `src/models/types.ts`、`src/mock/index.ts`、`src/pages/execution/ContractLedgerPanel.tsx` |
| 全新立项链路不可复现 | 新增 INIT-4 草稿种子（OPP-070），客户经理可「进入立项单」→编辑→保存→提交 | `src/mock/business-domain.ts` |
| 未知深链 | 现有 `path="*"` 已渲染友好 404（图标+返回首页），`/settlement` 补齐后无额外改动 | — |
| 财务 T+5 口径 | 文档与代码均未定义 T+5 预警规则，属 QA 假设，未造规则 | — |

### 第二轮验证

- `npx tsc -b --noEmit`：通过
- `npx eslint .`：通过
- `pnpm build`：通过，首屏 gzip 410.4 KB
- `pnpm test:domain`：**254 passed**（34 files）
- `e2e/qa/fixes.spec.ts + fixes2.spec.ts`：**11 passed**，覆盖起草/提交、结算台账、合同版本/用印、P-008、PMO 决策
- 说明：业务状态为纯内存演示数据，整页刷新重置；截图见 `qa-reports/r3/fixes2-*`。
