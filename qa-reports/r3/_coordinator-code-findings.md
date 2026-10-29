# 协调者代码审查发现（补充证据）

## C1 立项申报页无法“补充资料”，关键字段是硬编码占位

- 页面：`/initiation/apply?opportunityId=OPP-066`（立案评审 → 立项申请）
- 位置：`src/pages/initiation/InitiationApplyPage.tsx:60-93`（`const mockDetailData = { ... }`）
- 证据：
  - 页面副标题写“补充基本信息、交付要求及附件；商机与冻结概算按原版本承接。”（同文件 222 行）
  - “立项申请详情”Tab 的 `Descriptions` 全部读取 `mockDetailData`，不是表单控件；页面唯一可见输入是“关联商机”Select 与底部按钮。
  - `projectManager: '-'`、`projectTechnicalManager: '-'`、`procurementOrg: '-'`、`contractSignDate: '-'` 永久占位；`projectDirector: '王总'` 硬编码。
  - `softwareAmount = amount*0.8`、`hardwareAmount = amount*0.2`，与商机实际软硬件金额无关。
  - “毛利测算”Tab 固定 `预估成本 = 合同金额*0.75`、毛利率 25%（同文件约 340 行），与 OPP-066 冻结概算 900 万/1500 万（60%）不一致。
- 影响：申报人无法填写项目经理来源、项目经理、技术经理、采购组织、交付物确认等字段；“保存草稿”实际只保存关联商机与隐藏 input；提交的立项申请关键信息为占位符，下游项目创建/PM 指派拿不到申报信息。
- 建议级别：P1（流程阻断/数据失真）。需确认这些字段是否本应在该页维护；若设计为审批阶段补录，页面必须改为只读并删除“补充资料”文案与无效按钮。
