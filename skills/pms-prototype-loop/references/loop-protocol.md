# Loop 执行协议

## 运行方式

`scripts/loop.py` 依赖 Python 3.10+ 标准库，适用于 macOS/Linux（文件锁和子进程组使用POSIX接口）。它不调用模型、不自动安装依赖、不运行后台无限循环；Agent在当前授权会话中执行“选择→实现→检查→证据→验收→下一轮”。跨会话依靠文件恢复。

多 agent 模式下，本文件的状态命令与正式轮次只由协调者在集成目录执行。开发包的并发实施、自检和交付按 [并发协议](parallel-protocol.md) 进行；可在正式 `begin` 前准备，不改变本控制器的单活动轮次和证据校验规则。协调者另用 `scripts/pipeline.py --root "$PROJECT_ROOT"` 只读检查验收库存、WIP、重复归属和候选批次；它不调用或替代`begin/check/accept`，也不产生第二份完成状态。

两种实际请求：

- “持续开发整个原型”：循环到完整DoD；不可因为只剩类似页面而提前交付。
- “只做一轮/指定几页/只验收”：完成该范围后报告整体剩余量；不擅自扩成整个应用开发。

下文省略公共前缀：`python3 "$SKILL_DIR/scripts/loop.py" --root "$PROJECT_ROOT"`。两个变量均指实际绝对目录，不修改HOME等系统变量。

| 命令 | 行为 |
|---|---|
| `inspect` | 只读核对4份原文指纹及目录结构，输出72页/337功能/31类数据 |
| `init` | 幂等初始化；已有状态保留，重新生成进度区块 |
| `status` | 只读显示状态、页面完成数、公共能力、活动轮次、阻塞 |
| `next --limit 3` | 给出最多1–5个同阶段任务；有活动轮次时返回恢复信息 |
| `begin --items ID ...` | 选择1–5项，生成计划与空白验收表；公共能力及FINAL单独一轮 |
| `check --timeout 900` | 启动真实package脚本，保存退出码、日志和源码指纹；秒数是每条命令上限 |
| `accept` | 证据与工程检查通过且对应当前源码才计为done |
| `note --text '内容'` | 保存假设、失败原因、端口、下一步等恢复信息 |
| `defer --reason '原因'` | 保存活动轮次，将其中任务标为blocked；允许选择独立任务 |
| `reopen --items ID ... --reason '原因'` | 重开done/blocked项；历史保留，最终验收同时失效 |
| `reconcile --items ID ... --reason '原文变动及影响'` | 审查并更新catalog后迁移其指纹，重开影响项；不能忽略原文差异 |

`reopen/reconcile` 不得覆盖活动轮次，先完成或defer。重开公共能力会要求全量重新验收（实现代码保留）。若文档变化修改了72页ID集合或状态schema，需专门迁移，脚本拒绝猜测。

## 状态与文件

```text
DEV_PROGRESS.md                # 保留手写内容；仅更新pms-loop标记之间
.pms-loop/
  state.json                   # 唯一任务状态来源；含全部历史、证据哈希和备注
  .lock                        # 防两个命令并发写；退出自动释放
  runs/R0001/
    plan.json                  # 本轮页面目标、功能ID、来源行、路由、验收条件
    evidence.json              # Agent依据实际观察填写
    checks.json                # check生成的真实工程检查结果
    typecheck.log
    lint.log
    build.log
    test-domain.log            # FND-02及后续轮次
    test-e2e.log               # FINAL
    artifacts/                 # 截图、控制台、测试和全量路由报告
```

生命周期：`pending → active → done`；真实阻塞为`blocked`，经reopen回到pending。已实现但没完成浏览器验证仍为active，不计done。`defer`不销毁代码、日志、表单或旧证据。

第一次使用时，即使手写DEV_PROGRESS声称已完成很多页，脚本也不会自动将它们认定为已验收。检查已有实现并分批补证据即可，不重写应用。

不要手工将state中的status改成done。手写计划、需求假设放在DEV_PROGRESS受管区块之外；每轮假设用note也会进入历史。

## 任务调度

| 阶段 | 内容 |
|---|---|
| 0 | FND-01：React/TS/Vite、AntD主题、布局、路由清单、模拟角色、标题/状态/空态 |
| 1 | FND-02：统一实体、固定seed/asOf、31类数据最低量、8故事、selectors、状态模拟与领域测试 |
| 2 | GL-01~06：驾驶舱、四算、组合、异常、决策、穿透 |
| 3 | WK-01/02、HS-01/02/13：工作台与项目执行骨架 |
| 4 | GS-01~11 |
| 5 | YS-01~15 |
| 6 | 其余HS页面 |
| 7 | JS-01~13 |
| 8 | CF-01~08 |
| 9 | FINAL：全局视觉、全量路由、角色、七条演示/业务路线与文档 |

`next`只是排序建议。分析页验收前需下钻对象可用，例如可手动选择`GL-01 GL-05 HS-01 HS-13 HS-08`，或先做详情。设计系统可以先注册全部路由，但占位页不能计入72页完成。避免为让当前页通过而将下游点击替换为无业务结果的提示。

## 工程检查与证据新鲜度

- 从packageManager/锁文件选择pnpm/npm/yarn/bun，多个矛盾锁文件报错。不运行安装、不修改包管理器。
- 每轮要求`typecheck`、`lint`、`build`。即使build内有类型检查，也添加一个明确的typecheck脚本，便于统一验收；这是本技能的工程约定。
- FND-02及之后每轮还跑`test:domain`，FINAL跑`test:e2e`。首次工程搭建要建立真实检查命令，不用`echo pass`代替。
- 所有命令在项目根目录执行，argv不通过shell拼接；超时或中断只终止本脚本启动的检查进程组，不杀用户已有开发服务。
- 日志存入活动轮次；每次check先使旧结果失效，再执行全部命令。失败仍保留状态与日志。重试必须针对实际修复，不无意义反复执行。
- 源码指纹包括项目输入与docs，排除node_modules、构建/测试输出、`.pms-loop`、`skills`、`.agents`、`.codex`、DEV_PROGRESS、日志和.env。**应用源码不得放在这些排除目录中。** 根目录外链接源码不在本控制器验证范围，需改为本地可验证结构或专门扩展协议。
- check开始与结束的指纹不同则失败；accept时源码、check、证据三者指纹必须相同。单次文案/样式修改也会让本轮旧证据失效。
- 整个项目complete后源码改变，status显示`needs_revalidation`，next选择FINAL。发现实际受影响页面时先reopen这些页面再重新验收，不能仅修改最终通过标记。

## 填写本轮 evidence.json

先完成代码并check；第一次check会填写空的revision。以后改动源码，需要重新执行检查和浏览器观察，并将证据revision改为新结果。不要只复制哈希而沿用未经复查的true。

每项包含：

- `entry`：实际访问路径，如`/projects/P-001/dynamic-accounting`；不能保留`:id`。
- `covered_features`：逐项对照plan中的feature_ids后填写。来源功能ID如GS-001（三位）不同于页面ID GS-01（两位）。
- `checks`：模板列出通用检查及该页business-1、business-2等；实际通过才设`passed: true`，`observation`记录看到了什么、规则如何生效。
- `scenarios`：至少一条真实操作、预期、观察结果；按需要增加正向和阻断场景，不能以“按钮可点”替代业务结果。
- `artifacts`：项目相对路径的控制台/交互/测试记录，至少一份，不允许不存在、空文件或项目外路径。
- `screenshots`：UI页面和FND-01都要1440及1280两张PNG，视口高度900，允许完整长图/2倍DPR；**Agent必须实际查看图片**。FND-02只需数据与领域测试证据。

示例片段（路径须换成实际生成文件）：

```json
{
  "entry": "/projects/P-001/dynamic-accounting",
  "checks": {
    "interaction": {
      "passed": true,
      "observation": "点击采购偏差打开该项目采购明细，返回后保留原科目与项目筛选。"
    }
  },
  "scenarios": [{
    "action": "从P-001总览点击滚动成本",
    "expected": "进入HS-13并显示2,986.20万元",
    "observed": "项目ID和金额一致，可继续下钻成本来源"
  }]
}
```

脚本检查覆盖、退出码、路径、PNG尺寸和指纹，**不证明截图内容真实、不理解业务语义、不取代视觉审查**。不得把伪造记录输入控制器并宣称测试通过。

## FINAL全量报告

测试进程收到：

- `PMS_LOOP_REVISION`：当前源码指纹。
- `PMS_LOOP_ARTIFACT_DIR`：本轮artifacts绝对路径。

让`test:e2e`输出`route-report.json`并在FINAL证据的`route_report`字段引用。报告契约：

```json
{
  "revision": "来自PMS_LOOP_REVISION",
  "pages": [
    {"id": "WK-01", "entry": "/workbench/project-manager", "passed": true, "viewports": [1280, 1440]}
  ],
  "journeys": {
    "estimate": true, "budget": true, "accounting": true,
    "settlement": true, "leadership": true,
    "manager-demo": true, "executive-demo": true
  },
  "roles": {
    "executive": true, "pmo": true, "project-manager": true,
    "market": true, "finance": true, "solution-tech": true
  }
}
```

pages实际需完整72条且无重复，示例仅示结构。路由测试验证页面独有内容和核心动作，不仅HTTP200或标题存在。FINAL的`documents`填写README、路由说明、Mock说明的项目相对路径；按验收说明完成所有手工检查。

## 中断及文档升级

正常中断后先status/next，恢复同一round及已有代码，不重新begin。不依赖上一会话的终端服务仍存在；先核查端口与构建状态。上下文交接note至少包含：正在做的页面、未完成具体动作、失败命令/日志、服务地址、证据路径、下一步。

若原文变化，inspect拒绝继续验收：阅读差异→更新catalog的页面/功能映射、行号、必要契约和原文sha256→确认72页集合→`reconcile --items 受影响ID ... --reason 具体影响`。历史证据保留，受影响页及FINAL重新验收。原文仅修改排版也需记录原因；不得自动更新哈希掩盖语义改变。

没有浏览器、依赖下载被阻断、需要必需业务输入时，先做可独立完成的内容；不可做的项保留blocked和准确原因。技术栈/范围的大改按用户最新指令处理。脚本不提供绕过权限、自动提交Git、强制重置或对外发布命令。

## 技能维护验证

修改本技能后，在含四份原文的项目根目录执行：

```bash
python3 -B "$SKILL_DIR/scripts/validate_bundle.py" --root "$PROJECT_ROOT"
PMS_TEST_PROJECT_ROOT="$PROJECT_ROOT" python3 -B "$SKILL_DIR/scripts/test_loop.py"
python3 -B "$SKILL_DIR/scripts/test_pipeline.py"
```

前者逐项核对原文ID、标题、路由、来源行、功能覆盖和Mock最低量；后者在临时目录验证控制器的失败、恢复、证据过期和最终门禁。测试中的合成截图/命令仅用于验证控制器，不能作为应用页面已完成的证据。技能前置信息另用skill-creator的quick_validate.py验证。
