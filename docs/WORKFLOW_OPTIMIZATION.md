# 并发流程优化记录

> 注：原 `skills/pms-prototype-loop/` 调度脚本与 `.pms-loop/` 目录已随 0c7ae24 清理移除；本文中的命令与路径为历史记录，不再可直接执行。

本次优化调度与验证效率，不启动页面开发或正式验收，不修改页面完成状态。原始需求、证据新鲜度、双宽度视觉审查、测试隔离和单一业务Store保持。

## 调度入口

```bash
# 只读查看库存、就绪分组和派发建议
python3 skills/pms-prototype-loop/scripts/pipeline.py --root .
# 普通页面开发派发前使用；0允许，1暂停，2记录/参数错误
python3 skills/pms-prototype-loop/scripts/pipeline.py --root . --check-dispatch
```

容量达到上限即暂停普通新包，避免等到超限才发出告警。命令是调度前置检查，不是后台调度器，不会自动终止agent。当前14包已集成待验收，普通开发应暂停，空闲席位用于下一轮准备、自动化和当前缺陷修复。支持包仍计入开发WIP；单次只用实际空闲席位，不能将普通页面包伪装成支持包绕过限制。

每包区分：

- `remaining_dependencies`：缺失接口、未实现下钻、阻断缺陷。
- `acceptance_checklist`：正式轮次内执行的工程检查、浏览器动作、双宽截图和accept。
- `acceptance_ready`：协调者核对当前源码的真实依赖、入口、角色和fixture后确认，含义是可以开始验收。

迁移了六份交付单中明确属于验收内工作的条目，保留未核实业务依赖，不自动填写ready或passed。命名验收组包含所有未完成成员；有成员未集成或仍处于活动轮次时整组不能成为候选。

## 两轮衔接

主agent执行当前轮，准备员在独立工作区整理下一轮入口/fixture/动作，自动化员维护独占测试文件，修复员处理当前缺陷。正式check前先做定向业务预检，减少冻结后才发现问题引起的整轮重跑。当前轮accept后才进入短合入窗口。

## 领域测试入口

`src/mock/business-domain.ts`提供纯业务状态工厂及transition，不创建UI Store。`src/mock/business.ts`保留原有公共导出并创建唯一Store，页面与现有浏览器测试入口兼容。

纯领域测试直接导入`business-domain`；验证Store权限拦截、拒绝审计的集成测试继续导入`business`。需要完整故事时显式调用`createDemoBusinessState()`，每次返回独立深拷贝。两个模块都由协调者单写。

```bash
# 子agent使用本包具体测试，不每包重复全部领域测试
pnpm exec vitest run src/models/__tests__/presales.test.ts --maxWorkers=1
# 协调者统一执行正式全量测试
pnpm test:domain
# 当前机器没有Chrome时，可指定已安装的Chromium；默认仍使用Chrome
PMS_BROWSER_EXECUTABLE=/usr/bin/chromium pnpm exec playwright test e2e/workbench.spec.ts
```

未增加worker数量、关闭测试隔离、放宽超时或删除测试断言。尚未建设FINAL全量路由报告，也未引入独立验收worktree；这些是后续工作，不是本次已完成项。

## 同机对比结果

同样的233测试、32文件、单worker，先后各运行一次：

| 指标 | 修改前 | 修改后 |
|---|---:|---:|
| 总耗时 | 168.37秒 | 91.01秒 |
| 收集阶段 | 117.72秒 | 18.10秒 |
| 测试执行阶段 | 42.18秒 | 64.21秒 |

总耗时减少约46%，收集阶段减少约85%。部分初始化从导入时移到真正需要演示故事的测试执行时，因此执行阶段单独变长；全套耗时才是比较口径。两次均233/233通过，不是跨机器历史日志比较；单次样本不构成稳定性能保证。

原始日志及机器可读对比保存在`.pms-loop/benchmarks/workflow-optimization/`，不作为正式页面验收证据。

## 验证

- `pnpm typecheck`、`pnpm lint`、`pnpm build`通过；构建仍有原有的大chunk提示，本次未改变打包策略。
- 领域测试233/233；pipeline测试18/18、delivery测试2/2、Loop控制器测试21/21；bundle及技能结构校验通过。
- 使用系统Chromium，`workbench`、`r0024-controls`、`r0024-unsigned`共9条真实浏览器回归全部通过（2.6分钟），覆盖Store初始化、跨页状态、审批/阻断及工作台双宽度。抽查了本轮生成的未签详情截图。
- 当前普通派发门禁实际返回1，原因是14包集成库存达到/超过2包上限；只读诊断仍可正常执行。正式状态与进度保持33/72，未标记新增页面通过。
- 已按现有锁文件补齐本机缺失的Playwright依赖，锁文件未改动。修改保留在本地工作区，未创建提交或推送。
