# UI 角色链路报告：r3/b2-perm

- 时间：2026-10-29T04:21:28.779Z

## 结论
权限与审计链路：权限页开关可直接切换、审计留痕与跨角色直链拦截结果见下。

## BLOCK 堵点
- **项目经理直链 /settings/permissions 的拦截结果**
  复现：admin 页 switchRole 项目经理(张建国) → history.pushState 到 /settings/permissions。期望：403/无权访问或重定向；实际 URL=/settings/permissions；问题文案=无；正文首段=403 无访问权限 | 当前角色没有权限访问该页面或数据，请切换角色或联系管理员 | 返回可用页面
- **项目经理直链 /settings/audit-log 的拦截结果**
  复现：项目经理身份 → pushState /settings/audit-log。期望：拦截或拒绝；实际 URL=/settings/audit-log；问题文案=无；正文首段=403 无访问权限 | 当前角色没有权限访问该页面或数据，请切换角色或联系管理员 | 返回可用页面；可见表格行数=0

## BUG 逻辑/功能缺陷
- **/settings/permissions 开关与结构**
  复现：admin → /settings/permissions。实际 switch 数=0；Tab=菜单与页面白名单 / 业务动作白名单 / 敏感字段；首段文本=首页 | / | 项目权限 | 项目权限配置 | 查看权限变更审计 → | 前端权限演示 | 配置仅能收紧角色默认职责。审批角色、项目归属和业务状态仍独立校验；单租户演示不代表服务端安全隔离。 | 配置角色 | 项目经理 (张建国) | 历史版本 | V1 · 已发布 · 2026-01-01 | 另存策略草稿 | 发布选中版本 | 当前允许页面 | 57 | 页 | 动作白名单数量 | 48 |

## FLOW 流程问题
- **权限页切换开关后审计日志无对应新记录（时间/操作人/对象/结果）**
  复现：admin → /settings/permissions 切换首行开关（未保存）→ /settings/audit-log 读列表。期望：出现对应权限变更或“草稿未发布”类事件；实际：列表前 3 行为 ["2026-09-09 | AUD-94 | \tAdmin | admin | \tpage-access\t/settings/audit-log\t成功\t0项\t | 查看详情","2026-09-09 | AUD-93 | \tAdmin | admin | \tpage-access\t/settings/audit-log\t成功\t0项\t | 查看详情","2026-09-09 | AUD-92 | \t李主任 | pmo | \tsign-initiation\tINIT-3\t成功\t2项\t | 查看详情"]；累计事件数=值时明确展示缺失，不重建历史；敏感字段按当前策略脱敏。 | 累计审计事件 | 94 | 条 | 。判定按“未保存的切换不入账”口径可接受，但页面无“切换未生效/未记录”提示，作为流程观察。

## UI 问题
- **权限页白名单表格无可切换开关**
  复现：admin → /settings/permissions → 白名单 Tab。期望每行有访问权限开关；实际 switch 数=0，行数=12。

## RISK 风险与一致性
- （无）

## OK 已验证
- **/settings/audit-log 结构与列**
  实际行数=10（分页 size 10）；表头列=时间 / 日志ID / 操作人 / 业务动作 / 对象 / 结果 / 字段差异 / 操作；首行=2026-09-09 | AUD-94 | 	Admin | admin | 	page-access	/settings/audit-log	成功	0项	 | 查看详情；第2行=2026-09-09 | AUD-93 | 	Admin | admin | 	page-access	/settings/audit-log	成功	0项	 | 查看详情；第3行=2026-09-09 | AUD-92 | 	李主任 | pmo | 	sign-initiation	INIT-3	成功	2项	 | 查看详情；文本含“权限”字样=true。
- **admin 访问 /workbench/todos**
  实际 URL=/workbench/todos；问题文案=无；待办文本片段=首页 | / | 待办中心 | 我的待办中心 | 当前筛选待办 | 0 | 项 | 已超期待办 | 0；表格行数=0
- **admin 访问 /executive/dashboard**
  实际 URL=/executive/dashboard；问题文案=无；正文首段=首页 | / | 项目看板 | 项目看板 | 演示场景 | 刷新数据 | 快速筛选 | 组织 | 健康度 | 更多筛选 | 筛选联动经营指标、异常中心与下钻明细 | 四算全生命周期贯通看板 | 全局项目聚合视角 | 概算阶段 | 立项前 | 130,165.00万元 | 商机毛利基准 | 预算阶段 | +2.2% 偏差 | 133,002.70万元 | 目标成本基线 | 核算阶段 | 消耗 63.；页面是否显示 403 兜底=false。管理员默认职责是否应含领导驾驶舱需产品确认（src/routes/navigation.ts admin 首页=/settings/permissions）。

## 控制台错误
- （无）

## 运行时异常
- （无）

## 步骤轨迹
```
admin → /settings/permissions，观察角色开关
尝试改一个角色开关（观察后取消，不保存）
admin → /settings/audit-log，检查是否记录刚才操作
switchRole → 项目经理(张建国)，SPA 直链 /settings/permissions 与 /settings/audit-log
切回 admin，读 /workbench/todos 与 /executive/dashboard
```
