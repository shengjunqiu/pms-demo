# Solo Loop 脚本驱动验收规范

## 一、 验收哲学：脚本优先、零人工截图

本技能采用**脚本驱动验收（Script-Driven Acceptance）**模式：
1. **取消所有视觉截图要求**：不再要求 1440×900 / 1280×900 尺寸截图文件，也不要求抽屉动画截图。
2. **测试即证据**：只要自动化测试脚本覆盖了页面路由、控制台无报错、核心状态流转与表单动作，且所有脚本退出码为 0，即可认定为验收通过。

---

## 二、 门禁检查项（Check Criteria）

每轮调用 `loop.py check` 时，必须保证以下工程检查 100% 通过：

1. **`pnpm typecheck`**
   - TypeScript 类型无任何 error。
2. **`pnpm lint`**
   - ESLint 规范检查通过。
3. **`pnpm build`**
   - Vite 生产构建顺利打包，无构建时错误。
4. **`pnpm test:domain`**
   - 领域计算、状态机流转、四算数据契约测试全绿。
5. **E2E 场景自动化**
   - 使用 Playwright 运行当轮相关的 `e2e/*.spec.ts`。
   - 自动化用例需断言：
     - 关键元素可见性。
     - 表单输入与提交成功。
     - 路由跳转与下钻参数保留。
     - 页面运行期间 `console.error` 为空。

---

## 三、 轮次验收操作

当上述检查全部通过后，直接调用：
```bash
python3 skills/pms-solo-loop/scripts/loop.py --root . accept
```
`loop.py` 将自动记录：
- 执行时间与 Git commit hash / revision
- 检查项状态全为 pass
- 更新 `state.json` 中本轮页面的状态为 `done`
- 自动更新 `DEV_PROGRESS.md` 中的进度统计
