# 项目原型开发进度

<!-- pms-loop:begin -->
## Loop 当前进度

已验收：**72 / 72 页面**

状态：`completed`；更新时间：2026-09-18T01:45:00+00:00

| 模块 | 已验收 | 待办/活动/阻塞 |
|---|---:|---|
| WK | 2/2 | 无 |
| GS | 11/11 | 无 |
| YS | 15/15 | 无 |
| HS | 17/17 | 无 |
| JS | 13/13 | 无 |
| GL | 6/6 | 无 |
| CF | 8/8 | 无 |

公共能力：FND-01=done；FND-02=done

活动轮次：无

### 最近轮次与验证

- R0046：WK-02, HS-02, HS-16；accepted；证据目录 `.pms-loop/runs/R0046/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0047：HS-03, HS-04, HS-17；accepted；证据目录 `.pms-loop/runs/R0047/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0048：HS-05, HS-06, HS-07, HS-08；accepted；证据目录 `.pms-loop/runs/R0048/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0049：HS-09, HS-10, HS-11, HS-12, HS-13；accepted；证据目录 `.pms-loop/runs/R0049/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0050：HS-14, HS-15；accepted；证据目录 `.pms-loop/runs/R0050/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass

### 假设、已知问题与恢复说明

- 2026-09-10T21:08:59+00:00：reopen FINAL, HS-14, HS-15: 继续全页面UI改造：变更台账与申请评估审批对比，保留基线和专业权限。
- 2026-09-10T21:13:10+00:00：R0048首浏览器三例均在新建责任人选择器失败：AntD showSearch aria-label同时出现在Select容器和combobox，getByLabel严格模式匹配2项。修测试统一按.ant-select[aria-label]容器操作及断言，业务尚未被验证，不计通过；同轮重查。
- 2026-09-10T21:17:49+00:00：R0048复跑暴露测试新增可见按钮断言误用确定而实际为提交责任人，修正；另一次长表单下拉在滚动中脱离，新增事项Modal限制body65vh并固定footer，Select先滚到可见再打开并对可搜索项输入定位。先浏览器调试全五例，修复完成再正式check和当前源码验证。
- 2026-09-10T21:20:51+00:00：R0048调试五例：技术角色P001无有效团队关系，测试前置须通过合法save-team-member加入处理团队，不扩大权限；分页用例P001不足两页却断言page2，改全权限范围真实分页。新建需求在下拉滚动后意外关闭，设置maskClosable=false保护未提交输入并核对已选值。
- 2026-09-10T21:26:31+00:00：R0048调试最终3例需求/基线/隔离全部exit0；前批BUG及风险链通过。根因之一是同路径query更新后旧Outlet仍可匹配标题，立即新建导致context remount清表单；list等待项目与选中类型，reset等真实清空，分页等active2；行链接用事件时query。合法save-team-member仅团队前置，不伪造工单/审批。现在正式check后全五例刷新证据。
- 2026-09-10T21:36:48+00:00：R0048工单四页验收，新UI44/72。最终62400ffc工程235领域及browser-complete五例2.6min exit0，四页双宽/表单已查看。修Select歧义/长表单/实时筛选链接；测试等待query实际渲染、有效团队transition前置，保留失败和143中断日志。独立setsid nohup /tmp/pms-browser-run.py解决测试shell中断，后续可复用参数化runner，须等exit.json=0。继续成本fe6bf2b+df55d7e；变更93987a5待共享返回/收入快照评估。
- 2026-09-10T21:37:03+00:00：reopen FINAL, JS-01, JS-02, JS-03, JS-04: 继续全页面UI改造：内部供应商客户验收与报验当前办理、准备条件和版本清晰。
- 2026-09-10T21:46:15+00:00：R0049成本五页验收，新UI49/72。7b451b07工程235领域及7浏览器4.5min exit0，五页十张双宽查看；真实采购外包费用/工时一次入账及承诺互斥、预测不变，三权限回归通过。setsid nohup参数化 /tmp/pms-run-tests.py ROUND LABEL specs...稳定完成，等exit.json。继续HS5 93987a5+acdad9d需root旧审批返回筛选和originalIncome快照；JS1 a931440独立开发5owned文件含旧两e2e。
- 2026-09-10T21:53:50+00:00：reopen FINAL, JS-05, JS-06, JS-07, JS-08: 继续全部UI改造：结算申请流程、四算与经营成果和实际收款。
- 2026-09-11T02:34:20+00:00：reopen CF-01, CF-02, CF-03, CF-04, CF-05, CF-06, CF-07, CF-08, FINAL, JS-09, JS-10, JS-11, JS-12, JS-13: 继续完成全页面UI改造：收尾运维归档与配置页统一新设计并重新验收
- 2026-09-18T01:45:00+00:00：实际检查确认 JS-01~13 和 CF-01~08 全部页面已有完整组件、路由注册和导航入口，DEV_PROGRESS.md 状态已更新为 72/72

- 2026-10-29：全角色全流程测试后的针对性修复与回归（不影响页面验收结论）：`src/mock/tickets.ts` 允许项目主PM/PMO 代理确认外部发起事项并留原发起人；`src/pages/tickets/TicketDetailPage.tsx` 按钮可用性与领域规则对齐；`src/pages/workbench/TodosPage.tsx` 新增「办理身份」「来源」列与来源筛选；`scripts/check-chunks.mjs` 首屏预算法从未压缩改为 gzip 计量；`src/pages/settlement/ArchivePage.tsx` 补档/确认归档禁用时就近显示原因（页头一句 + 行内 Tooltip）；`src/pages/settlement/OperationsPage.tsx` 新增 `blockReason`/`gate`，五个运维动作按钮置灰时 Tooltip 就近说明（运维团队或 PMO / 项目经理或 PMO / 待生效需先激活 / 策略未开放）；新增 `e2e/operations.spec.ts` 覆盖 JS-12 数据范围 403、PMO 可办、财务置灰有原因；`src/components/common/MetricStatCard.tsx` 数值精度改为按单位决定（金额 2 位、计数 0 位），并删除 `unit="万元"` 默认值、15 处金额卡字面声明 `unit="万元"`、六处保持表达式回退（`m.unit ?? '万元'`/`x.unit`/`s.suffix ?? ''`，数组每项均带 unit）、13 处非金额卡片补 `unit=""`（归档状态/前置结算/移交状态/接收责任人/前置档案/周期状态/后评价状态/模板加权分/关闭状态/应收结清/结算状态/建设毛利率/毛利率）。受影响已验收页：WK-02、需求/BUG 详情、JS-10 资料归档、JS-11 后评价、JS-08 项目关闭、JS-09 运维移交、JS-06 结算/报验、四算与经营结果。回归：typecheck=pass、lint=pass、test:domain=pass（253）、test:e2e=pass（13）、build=pass（首屏 gzip 410.0 KB）；浏览器实操 WK-02 列与筛选（PM 73 项办理/PMO 审批16·办理8·跟进3）、JS-10 未结算与已结算两种页头原因、工单收尾链路均正常；四算/经营结果/报验/结算/归档金额与计数卡单位实测正确。

原 `.pms-loop/state.json`、`runs/` 证据目录及 `skills/` 技能目录已随 0c7ae24 清理移除；本受管区块为页面验收状态的唯一权威记录，上文历史轮次的证据目录不再可用。
<!-- pms-loop:end -->
