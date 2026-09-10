# 工作流优化交接

已接入原 workflow/acceptance-pipeline 分支 3c0fef3（main 映射 9dccb92），并补检查中冻结与重复归属不能就绪的保护。共享接口范围检查新增 hooks/access/configuration 相关文件。

调度历史和迁移原因见 reconciliation.json。旧包的状态变化只影响派工，未改正式 state、DEV_PROGRESS 或 R0024 证据。剩余42页唯一覆盖；M01承接WK01，G01承接CF07，二者均等待依赖与精确owned_paths确认，没有启动新的开发者。

恢复步骤：
1. 读取 git status、DEV_PROGRESS、state 和 pipeline 报告，确认没有其他写入者。
2. 优先恢复 R0024（YS13/14/15）。现有预算初始化、unsigned领域测试修改，以及 e2e/evidence.ts、r0024-unsigned.spec.ts、scenario-state.ts 是优化前已存在的WIP，全部保留，未纳入工作流提交。
3. 最新正式领域检查是229通过、3超时，不是已通过。先定位 business/portfolio/project-changes 的耗时，核对当前源码后再正式check；原证据与check版本不一致，须重新真实观察，不改哈希冒充通过。
4. 正式check期间至证据验收完成保持集成输入冻结；其他worktree只准备下一轮的场景、测试或独占缺陷。只运行一份本项目重型检查队列。
5. R0024完成后，再逐包核对具体fixture/入口/依赖并填写acceptance_group与ready。15包库存仍是真实待办，不通过清空依赖来压低数字。

仅工作流/文档变更，不增加30/72的页面验收数，也不承诺已修复应用测试超时。
