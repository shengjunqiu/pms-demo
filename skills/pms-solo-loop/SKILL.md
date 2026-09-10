---
name: pms-solo-loop
description: 单 Agent 脚本测试驱动的持续开发、恢复和验收项目四算管理平台的 React + Ant Design 高保真前端原型。不需要多 Agent 并发，无需人工截图，以纯自动化测试脚本（Typecheck、Lint、Build、Domain Test、E2E Test）为验收门禁，快速完成 72 页交付。
---

# 项目四算原型 Solo Loop（单 Agent 纯脚本驱动版）

本项目通过单 Agent 闭环循环迭代（Loop）推进，以**纯自动化测试脚本**作为核心验收标准，无需人工/视觉截图，全面交付 72 个页面高保真原型。

## 核心原则

1. **单 Agent 闭环**：单线程迭代，无需 worktree 隔离、并发席位管理与 cherry-pick 流程，所有工作均在当前代码仓库主干完成。
2. **纯脚本自动化验收**：无需截图；通过 `typecheck`、`lint`、`build`、`test:domain` 以及 Playwright `test:e2e` 脚本套件作为验收判定标准。
3. **真实 Mock 单一事实**：统一基于 `useBusinessStore` 状态机与公共计算 selector 进行流转，保证多页面、跨模块下钻数据一致性。
4. **轮次持续推进**：每轮选择 1~5 个相关页面，开发/调试 ➔ 跑测试脚本 ➔ 脚本全绿直接验收 ➔ 推进下一轮。

---

## 常用命令

```bash
SKILL_DIR="skills/pms-solo-loop"

# 1. 查看当前进度与活动轮次
python3 "$SKILL_DIR/scripts/loop.py" --root . status

# 2. 获取下一批推荐页面
python3 "$SKILL_DIR/scripts/loop.py" --root . next

# 3. 开启新轮次（指定页面 ID）
python3 "$SKILL_DIR/scripts/loop.py" --root . begin --items YS-01 YS-02 YS-03 YS-04

# 4. 运行全套工程门禁检查 (typecheck / lint / build / test:domain)
python3 "$SKILL_DIR/scripts/loop.py" --root . check

# 5. 验收当前轮次并推进进度（测试全部通过后）
python3 "$SKILL_DIR/scripts/loop.py" --root . accept

# 6. 记录开发笔记 / 关键状态
python3 "$SKILL_DIR/scripts/loop.py" --root . note --text "完成了XX页面的修复与E2E测试"

# 7. 退回/重新打开页面（如有必要）
python3 "$SKILL_DIR/scripts/loop.py" --root . reopen --items YS-01 --reason "发现缺少某项计算规则"
```

---

## 标准开发与验收流程

### Step 1: 状态确认与选包
运行 `python3 skills/pms-solo-loop/scripts/loop.py --root . next` 查看依赖树和下一批候选页面。

### Step 2: 开启轮次
运行 `python3 skills/pms-solo-loop/scripts/loop.py --root . begin --items PAGE_ID_1 PAGE_ID_2...`，生成当轮计划 `plan.json`。

### Step 3: 代码实现与测试编写
- 编写/优化对应页面的 UI、交互逻辑与 Mock 数据。
- 确保领域计算（`src/mock/business-domain.ts`）与状态转移正确。
- 为本轮页面编写或完善对应的 Playwright E2E 脚本（位于 `e2e/` 目录），覆盖：
  1. 页面可正常访问、无 404 / 403。
  2. 控制台无 Uncaught Error / React Warning。
  3. 核心业务按钮、筛选、表单提交与流转动作可正常执行。

### Step 4: 脚本门禁检查
运行：
```bash
python3 skills/pms-solo-loop/scripts/loop.py --root . check
```
该命令会自动运行：
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test:domain`

随后运行当轮对应的 E2E 测试：
```bash
pnpm exec playwright test e2e/your-feature.spec.ts
```

### Step 5: 正式验收
当所有脚本执行通过后，运行：
```bash
python3 skills/pms-solo-loop/scripts/loop.py --root . accept
```
系统将自动更新 `state.json` 与 `DEV_PROGRESS.md`，增加已完成页面计数，并结转当轮历史。

### Step 6: 最终回归（FINAL）
当 72 个页面全部通过验收后，进入 `FINAL` 阶段：
运行全量端到端回归测试 `pnpm test:e2e`，确认全部通过后标记项目整体完成（`complete`）。
