# UI 角色链路报告：coord-deeplink

- 时间：2026-10-29T04:14:35.958Z

## 结论
协调者深链/状态页抽查。

## BLOCK 堵点
- （无）

## BUG 逻辑/功能缺陷
- **深链 /settings/cost-mapping Tab 落点**
  URL=/settings/cost-mapping；activeTab=四算科目与映射|科目树与使用情况；标题=；出现“项目台账”=false
- **深链 /settings/cost-baseline Tab 落点**
  URL=/settings/cost-baseline；activeTab=四算科目与映射|科目树与使用情况；标题=；出现“项目台账”=false
- **深链 /settings/alerts Tab 落点**
  URL=/settings/alerts；activeTab=四算科目与映射|科目树与使用情况；标题=；出现“项目台账”=false
- **深链 /settings/finance-config Tab 落点**
  URL=/settings/finance-config；activeTab=四算科目与映射|科目树与使用情况；标题=；出现“项目台账”=false

## FLOW 流程问题
- **PMO 待办页草稿入口**
  存在“进入草稿箱”=false
- **S 型项目详情页签**
  页签=项目概览,质量,成本核算表,合同与回款,操作记录
- **P-001 下一步按钮**
  “下一步：阶段切换申请”存在=true

## UI 问题
- （无）

## RISK 风险与一致性
- **PMO 直链经营驾驶舱**
  URL=/executive/dashboard；正文含“经营驾驶舱”=false

## OK 已验证
- （无）

## 控制台错误
- （无）

## 运行时异常
- （无）

## 步骤轨迹
```
```
