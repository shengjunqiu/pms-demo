# UI 角色链路报告：r3/b2-admin

- 时间：2026-10-29T04:26:37.435Z

## 结论
管理员配置链路：六页标题/Tab/行数/按钮、抽屉校验与深链 Tab 结果见下；cost-mapping / cost-baseline 深链未落到各自 Tab。

## BLOCK 堵点
- （无）

## BUG 逻辑/功能缺陷
- **/settings/cost-mapping 深链 Tab**
  复现：admin 直接访问 /settings/cost-mapping。期望：落到对应 Tab（cost-mapping→四算科目与映射/来源映射，cost-baseline→成本基准，alerts→预警规则）；实际 URL=/settings/cost-mapping，激活 Tab=「四算科目与映射」，页面标题=「」，首张卡片=「四算科目与来源映射」。代码 src/pages/configuration/FinanceConfigurationPage.tsx:33 kind 只读 query ?kind=，未解析 pathname。
- **/settings/cost-baseline 深链 Tab**
  复现：admin 直接访问 /settings/cost-baseline。期望：落到对应 Tab（cost-mapping→四算科目与映射/来源映射，cost-baseline→成本基准，alerts→预警规则）；实际 URL=/settings/cost-baseline，激活 Tab=「四算科目与映射」，页面标题=「」，首张卡片=「四算科目与来源映射」。代码 src/pages/configuration/FinanceConfigurationPage.tsx:33 kind 只读 query ?kind=，未解析 pathname。
- **/settings/alerts 深链 Tab**
  复现：admin 直接访问 /settings/alerts。期望：落到对应 Tab（cost-mapping→四算科目与映射/来源映射，cost-baseline→成本基准，alerts→预警规则）；实际 URL=/settings/alerts，激活 Tab=「四算科目与映射」，页面标题=「」，首张卡片=「四算科目与来源映射」。代码 src/pages/configuration/FinanceConfigurationPage.tsx:33 kind 只读 query ?kind=，未解析 pathname。

## FLOW 流程问题
- （无）

## UI 问题
- **/settings/project-grading 取消关闭抽屉**
  复现：抽屉内点取消。实际 overlay 可见=true（关闭=false）
- **/settings/permissions 取消关闭抽屉**
  复现：抽屉内点取消。实际 overlay 可见=true（关闭=false）

## RISK 风险与一致性
- （无）

## OK 已验证
- **/settings/project-grading 结构观察**
  标题=(未取到)；Tab=无；表格行数=1；主按钮=新建独立规则 / 另存新版本；问题命中=无；文本首段=首页 | / | 项目分级规则 | 项目分级规则 | 新建独立规则 | 版本化演示规则 | 编辑会另存草稿版本。发布后按生效日期、组织与项目类型选择；停用版本也需发布，且仅影响新业务提交。 | 配置历史版本 | 1 | 个 | 当前生效规则 | 1 | 个 | 待发布草稿 | 0
- **/settings/project-grading 打开「新建独立规则」抽屉/弹窗正常**
  复现：admin → /settings/project-grading → 点「新建独立规则」。实际 overlay 文本=另存新版本 · 新建配置规则 | 保存草稿版本 | 规则编码 | 配置名称 | 发布后状态 | 启用 | 停用 | 生效日期 | 适用组织 | 全集团 | 适用项目类型 | 全部类型 | 修改原因 | 特大型项目金额下限（万元） | 重大项目金额下限（万元） | 重点项目金额下限（万元） | 最低毛利率（%） | 初评最低分 | 未签约累计额度比例（0–1） | 未签约投入最大天数 | 投入到期提前预警天数 | 阶段通过释放比例（%） | 战略项目升为重大 | 高风险升为重大 | 战略客户升为重大
- **/settings/project-grading 必填校验反馈**
  复现：抽屉内清空首个输入后点保存。必填标记数=15；实际提示=请输入规则编码；toast=无
- **/settings/project-grading 抽屉尺寸**
  实际宽=880px，高=900px；保存按钮状态=无保存按钮；必填项标记=15。
- **/settings/approval-rules 结构观察**
  标题=(未取到)；Tab=全部 / 提前投入 / 立项审批 / 超概算决策 / 项目变更 / 项目结算；表格行数=7；主按钮=新建独立规则 / 另存新版本 / 另存新版本 / 另存新版本 / 另存新版本 / 另存新版本 / 另存新版本；问题命中=无；文本首段=首页 | / | 审批规则 | 审批规则配置 | 新建独立规则 | 版本化演示规则 | 编辑会另存草稿版本。发布后按生效日期、组织与项目类型选择；停用版本也需发布，且仅影响新业务提交。 | 配置历史版本 | 7 | 个 | 当前生效规则 | 7 | 个 | 待发布草稿 | 0 |
- **/settings/deliverables 结构观察**
  标题=(未取到)；Tab=全部 / 交付物目录 / 商机评估 / 专家评审 / 项目后评价；表格行数=9；主按钮=新建独立规则 / 另存新版本 / 另存新版本 / 另存新版本 / 另存新版本；问题命中=无；文本首段=首页 | / | 交付物模板 | 交付物模板配置 | 新建独立规则 | 版本化演示规则 | 编辑会另存草稿版本。发布后按生效日期、组织与项目类型选择；停用版本也需发布，且仅影响新业务提交。 | 配置历史版本 | 4 | 个 | 当前生效规则 | 4 | 个 | 待发布草稿 | 0
- **/settings/permissions 结构观察**
  标题=(未取到)；Tab=菜单与页面白名单 / 业务动作白名单 / 敏感字段；表格行数=12；主按钮=另存策略草稿 / 发布选中版本；问题命中=无；文本首段=首页 | / | 项目权限 | 项目权限配置 | 查看权限变更审计 → | 前端权限演示 | 配置仅能收紧角色默认职责。审批角色、项目归属和业务状态仍独立校验；单租户演示不代表服务端安全隔离。 | 配置角色 | 项目经理 (张建国) | 历史版本 | V1 · 已发布 · 202
- **/settings/permissions 打开「另存策略草稿」抽屉/弹窗正常**
  复现：admin → /settings/permissions → 点「另存策略草稿」。实际 overlay 文本=另存权限策略草稿 | 保存草稿 | 策略名称 | 生效日期 | 发布后启用 | 要求有效项目关系 | 数据范围 | 本人参与项目 | 指定组织（包含下级） | 敏感字段可见性 | 人员成本单价 | 毛利与收益 | 经营评价与绩效 | 联系方式 | 敏感字段编辑权限 | 编辑人员成本单价 | 编辑经营评价与绩效 | 编辑联系方式 | 查看与编辑独立控制；无查看权限时，页面仅允许新增填写或保留旧值。毛利为自动计算只读值，不能直接编辑。 | 允许的菜单与页面 | WK-01 项目经理工作台 | WK-02 我的待办中心 | GS-01 商机台账 | GS-03 商机详情 | GS-04 商机初步评估 | GS-05 需求调研与解决方案 |
- **/settings/permissions 必填校验反馈**
  复现：抽屉内清空首个输入后点保存。必填标记数=3；实际提示=请输入策略名称；toast=无
- **/settings/permissions 抽屉尺寸**
  实际宽=850px，高=900px；保存按钮状态=无保存按钮；必填项标记=3。
- **/settings/audit-log 结构观察**
  标题=(未取到)；Tab=无；表格行数=10；主按钮=重 置 / 查看详情 / 查看详情 / 查看详情 / 查看详情 / 查看详情 / 查看详情 / 查看详情 / 查看详情 / 查看详情；问题命中=无；文本首段=首页 | / | 操作审计 | 操作审计日志 | 审计范围与历史口径 | 列表、统计与轨迹均按当前组织范围过滤；收窄范围不会删除原日志，无法确定归属的旧记录仅在全集团策略下可查。成功操作、权限拒绝和关键访问由统一入口登记。旧记录未保留前后值时明确展示缺失，不重建历史；敏感字段按当
- **/settings/finance-config 结构观察**
  标题=(未取到)；Tab=四算科目与映射 / 成本基准配置 / 预警规则配置 / 科目树与使用情况 / 来源到四算映射；表格行数=10；主按钮=新建独立配置 / 另存版本；问题命中=无；文本首段=首页 | / | 财务配置 | 四算科目与映射 | 新建独立配置 | 四算科目与映射 | 成本基准配置 | 预警规则配置 | 版本化演示规则 | 每次编辑另存草稿，发布后按生效日期与范围选用。停用不物理删除，业务历史引用仍可追溯。 | 历史配置版本 | 1 | 个 | 当前生效版
- **/settings/finance-config 切换 Tab 的 URL 同步**
  复现：admin → /settings/finance-config → 点「成本基准」Tab。期望：URL 带 ?kind=rates 便于分享/刷新；实际 URL=/settings/finance-config?kind=rates。

## 控制台错误
- （无）

## 运行时异常
- （无）

## 步骤轨迹
```
admin → /settings/project-grading
admin → /settings/approval-rules
admin → /settings/deliverables
admin → /settings/permissions
admin → /settings/audit-log
admin → /settings/finance-config
admin → /settings/cost-mapping（深链 Tab）
admin → /settings/cost-baseline（深链 Tab）
admin → /settings/alerts（深链 Tab）
```
