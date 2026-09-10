# PMS 平台设计系统与前端规范 (DESIGN.md)

本文档系统性地解构与记录 **PMS 项目全生命周期管理平台（原型工程）** 的设计语言、UI 细节、交互规范、排版与色彩系统以及组件架构体系，作为项目前端开发、后续模块扩展和 UI 迭代的统一基准规范。

---

## 目录
1. [设计哲学与整体风格定位](#1-设计哲学与整体风格定位)
2. [设计 Token 规范（色彩、阴影、圆角、排版）](#2-设计-token-规范色彩阴影圆角排版)
3. [页面骨架与布局体系 (App Layout)](#3-页面骨架与布局体系-app-layout)
4. [核心业务状态标签体系 (Badges)](#4-核心业务状态标签体系-badges)
5. [数据展示与 KPI 视窗规范](#5-数据展示与-kpi-视窗规范)
6. [图表可视化设计规范 (Recharts)](#6-图表可视化设计规范-recharts)
7. [通用组件与交互模态 (FilterBar, GlobalSearch, Drawer)](#7-通用组件与交互模态-filterbar-globalsearch-drawer)
8. [典型页面设计模式研究与落地](#8-典型页面设计模式研究与落地)
9. [未来组件扩展与一致性检查清单](#9-未来组件扩展与一致性检查清单)

---

## 1. 设计哲学与整体风格定位

本项目定位于 **企业级“经营主线 + 四算联动 + 控制机制”项目全生命周期数字化平台**。设计风格兼顾了 **严谨的专业金融/ERP质感** 与 **现代 SaaS 产品的克制敏捷感**。

### 1.1 核心设计原则
- **高信息密度而不杂乱（High Density, Low Noise）**：
  - 项目管理与四算分析涉及概算、预算、核算、工时、账龄、风险等海量维度。系统采用紧凑型内边距（`p-3` 到 `p-4`）、小字号排版（`text-xs` / `text-sm`）和明确的网格对齐，保证首屏容纳更多关键决策信息。
- **状态语义高度敏感（State-Driven Semantics）**：
  - 四算阶段与履约交付阶段完全解耦；
  - 健康状态（健康、预警、重大）与风险等级（低、中、高、特大）采用严格色彩映射，拒绝模糊不清的中立色。
- **只读穿透与可溯源性（Traceable Penetration）**：
  - 核心指标卡片、列表行、异常预警条目均具备“点击穿透”交互，从宏观驾驶舱层层下钻到单项目 360 视窗与来源单据只读抽屉。
- **深浅对比的双层界面质感（Dual Tone Structure）**：
  - 左侧全局主导航采用极深底色（`slate-900`），主工作区与顶部栏采用纯净浅色（`slate-100` 背景配合纯白 `bg-white` 卡片），形成强烈的层级稳定感与专注度。

---

## 2. 设计 Token 规范（色彩、阴影、圆角、排版）

基于 Tailwind CSS v4 与项目实践提炼的核心 Token 系统：

### 2.1 色彩系统 (Color Palette)

#### (1) 基础与中性色 (Neutral Scales)
- **全局背景色**：`#f8fafc` (`bg-slate-100` / `bg-slate-50`)，消除刺眼纯白带来的视觉疲劳。
- **容器与卡片底色**：`#ffffff` (`bg-white`)。
- **主文本色**：`#0f172a` (`text-slate-900`)，用于标题、重点金额与关键数值。
- **次要正文色**：`#334155` (`text-slate-700` / `text-slate-600`)，用于表格行、描述、表单标签。
- **辅助弱化色**：`#64748b` (`text-slate-500`) / `#94a3b8` (`text-slate-400`)，用于副标题、时间戳、计量单位。
- **分割线与边框**：`#e2e8f0` (`border-slate-200`) 与次级分割 `#f1f5f9` (`border-slate-100`)。
- **导航栏底色**：`#0f172a` (`bg-slate-900`)，边框 `#1e293b` (`border-slate-800`)。

#### (2) 品牌主色 (Brand Primary)
- **PMS Blue**：`#2563eb` (`bg-blue-600` / `text-blue-600`)。
- **激活/高亮背景**：`#eff6ff` (`bg-blue-50`)。
- **边框与悬停色**：`#3b82f6` (`blue-500`)、`#1d4ed8` (`blue-700`)。
- **应用场景**：主导航高亮、主要按钮、全局搜索快捷键、核心图表主色柱。

#### (3) 状态与语义色 (Semantic Status Colors)
严格遵循 B 端风控规范，禁止红绿误用：
| 状态类别 | 主背景 / 弱背景 | 边框颜色 | 文字与图标色 | 代表含义 |
| :--- | :--- | :--- | :--- | :--- |
| **健康 / 成功 (Emerald)** | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` / `600` | 健康项目、已完成任务、回款正常 |
| **关注 / 预警 (Amber)** | `bg-amber-50` | `border-amber-200` | `text-amber-700` / `600` | 重点关注、黄色预警、进度轻度延期 |
| **严重 / 风险 (Rose/Red)** | `bg-rose-50` / `rose-100` | `border-rose-200` | `text-rose-700` / `800` | 重大风险、四算超支、阻断性缺陷 |
| **中度风险 (Blue)** | `bg-blue-50` | `border-blue-200` | `text-blue-700` | 中风险评估、流转中状态 |
| **低风险 / 中立 (Slate)** | `bg-slate-100` | `border-slate-200` | `text-slate-700` | 低风险、归档结项、已关闭预警 |
| **特大风险 (Extreme)** | `bg-rose-50` + `animate-pulse` | `border-rose-300` | `text-rose-700` | 特大风险、触发红色高能警报 |

---

### 2.2 字体排版与数值体系 (Typography)

#### (1) 字体家族
- **默认无衬线字体**：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`。
- **数值与金额专属字体**：**等宽字体 (`font-mono`)**。所有资金金额（万元）、项目编号（`PJ2026-xxx`）、百分比（`%`）、截止时间（`YYYY-MM-DD HH:mm:ss`）必须声明 `font-mono`，确保表格对齐和数字跳动时的视觉稳定性。

#### (2) 层级与字号标准
- **一级页面大标题**：`text-xl` (20px) + `font-bold` + `tracking-tight` + `text-slate-900`。
- **二级区块/卡片标题**：`text-sm` (14px) / `text-base` (16px) + `font-bold` + `text-slate-800`。
- **指标核心大数值 (KPI Stat)**：`text-2xl` (24px) / `text-3xl` (30px) + `font-mono` + `font-bold`。
- **正文标准字号**：`text-xs` (12px) + `leading-normal` + `text-slate-600`。
- **标签/弱辅助字号**：`text-[11px]` (11px) 与 `text-[10px]` (10px)，用于 Badge 徽章、次级单位、快捷键 Kbd。

---

### 2.3 阴影与微质感 (Elevation & Shadows)

在 Tailwind CSS v4 下，平台克制地使用细微阴影，杜绝厚重的浮夸投影：
- **默认卡片阴影**：`shadow-2xs`（极浅描边级微投影），配合 `border border-slate-200`。
- **卡片悬浮状态 (Hover)**：`hover:shadow-xs` + `hover:border-blue-400` + `transition-all duration-200`。
- **浮层与下拉菜单**：`shadow-lg` 或 `shadow-xl`。
- **模态弹窗与搜索中心 (Modal)**：`shadow-2xl` + `backdrop-blur-xs` + `bg-slate-900/50`。

### 2.4 圆角体系 (Border Radius)
- **系统主容器 / 顶级卡片**：`rounded-2xl` (16px)（如 360 项目卡片、全局搜索框）。
- **标准卡片 / KPI 容器 / 筛选器**：`rounded-xl` (12px)。
- **按钮 / 输入框 / 下拉框**：`rounded-lg` (8px) 或 `rounded-md` (6px)。
- **徽章 (Badges)**：`rounded-full`（状态胶囊）或 `rounded` (4px)（紧凑型矩形徽标）。

---

## 3. 页面骨架与布局体系 (App Layout)

`AppLayout.tsx` 构成了整个单页应用的统一视窗环境，采用双栏 flex 视口固定（`h-screen w-screen overflow-hidden`）结构。

### 3.1 左侧深色侧边栏 (Sidebar)
- **尺寸规则**：展开宽度为 `w-64` (256px)，折叠后为 `w-16` (64px)，动画平滑过渡 `transition-all duration-300`。
- **Logo 区域**：高度 `h-16`，左侧为带阴影的蓝色标志卡片（`w-8 h-8 rounded-lg bg-blue-600`），文字“PMS 平台”与副标“项目全生命周期”。
- **导航交互**：
  - 选中态：`bg-blue-600 text-white shadow-sm`。
  - 普通态：`text-slate-400 hover:bg-slate-800 hover:text-slate-200`。
  - 子菜单：左侧带有缩进与竖向弱引导线（`ml-7 border-l border-slate-800 pl-3`）。
- **权限角色动态剪裁**：
  - 项目成员角色登录时，自动过滤屏蔽管理层专属的“分析中心”。

### 3.2 顶部全局工作栏 (Global Header)
- **高度**：`h-16` (64px)，背景纯白 `bg-white`，下边框 `border-b border-slate-200`。
- **全局搜索入口**：
  - 仿 Mac Spotlight 风格的快速唤起框，内置 `Search` 图标与 `⌘K` 快捷键徽章。
  - 数据截止时间戳展示（`Clock` + `font-mono`）。
- **右侧演示身份切换器 (Demo Role Switcher)**：
  - 胶囊型组合开关（`bg-slate-50 border border-slate-200 p-1`）。
  - 支持 **管理层 / 项目经理 / 项目成员** 三重视角无缝热切换，同步联动工作台默认路由。
  - 用户个人信息简标（圆形纯色头像 `bg-slate-700` + 姓名 + 角色职衔）。

---

## 4. 核心业务状态标签体系 (Badges)

PMS 领域包含多套相互独立的生命周期与状态维度，系统在 `src/components/common/Badges.tsx` 中封装了高度标准化的组件：

### 4.1 经营阶段 vs 交付阶段（双轨制设计）
这是本项目业务与 UI 设计的核心亮点：**绝不混淆四算经营阶段与现场交付阶段**。

1. **经营阶段标签 (`BusinessStageBadge`)**：
   - **视觉风格**：采用淡蓝底色、实心小圆点（`h-1.5 w-1.5 rounded-full bg-blue-600`）的经典管理流风格。
   - 映射：商机阶段、立项阶段、执行中(动态核算)、结算中(四算决算)、已关闭。
2. **交付阶段标签 (`DeliveryStageBadge`)**：
   - **视觉风格**：采用淡紫色系（`bg-purple-50 text-purple-700 border-purple-200`），以区分经营层。
   - 映射：立项准备、开工交底、实施推进、初验报验、试运行、终验移交、维保期、已归档。

### 4.2 健康状态与风险等级
- **`HealthBadge`**：
  - 正常运行：`CheckCircle2` + 绿（`emerald`）
  - 重点关注：`AlertTriangle` + 黄（`amber`）
  - 重大风险：`AlertCircle` + 红（`rose`）
- **`RiskBadge`**：
  - 低风险 (低调沉稳 `slate`)
  - 中风险 (提醒 `blue`)
  - 高风险 (警告 `amber`)
  - 特大风险 (告警 `rose` 伴随呼吸灯动效 `animate-pulse`)

---

## 5. 数据展示与 KPI 视窗规范

### 5.1 KPI 指标卡片 (Metrics Stat Card)
KPI 卡片是仪表盘和工作台的首屏主角，必须遵循以下结构规范：

```html
<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
  <!-- 1. 卡片顶行：标签 + 语义图标（带悬浮微动效） -->
  <div className="flex items-center justify-between text-slate-500 mb-2">
    <span className="text-xs font-medium">指标名称</span>
    <Icon size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
  </div>

  <!-- 2. 卡片核心行：大数值 + 等宽字体 + 单位 -->
  <div className="flex items-baseline space-x-1">
    <span className="text-2xl font-bold text-slate-900 font-mono">1,280.50</span>
    <span className="text-xs text-slate-500">万元</span>
  </div>

  <!-- 3. 卡片底行：辅助指标 / 同比环比 / 细分健康度占比 -->
  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
    <span>次级说明</span>
    <span className="font-mono font-medium text-emerald-600">正常</span>
  </div>
</div>
```

### 5.2 数据表格设计规范 (Data Tables)
- **表头 (`thead`)**：背景统一使用 `bg-slate-50/80`，文字 `text-[11px] font-semibold text-slate-500 uppercase tracking-wider`，下边框 `border-b border-slate-200`。
- **单元格 (`td`)**：
  - 紧凑高度：内边距 `px-4 py-3` 或 `px-3 py-2.5`。
  - 行悬停效果：`hover:bg-slate-50/60 transition-colors`。
  - 数值列：必须靠右对齐 (`text-right`) 且加 `font-mono`。
  - 操作列：通常带有穿透图标（如 `ChevronRight` / `ArrowRight`）或明确的文本动作按钮。

---

## 6. 图表可视化设计规范 (Recharts)

### 6.1 调色板基准 (Data Visualization Palette)
```typescript
export const CHART_COLORS = {
  blue: '#3b82f6',     // 主要数据序列 / 预算基线
  emerald: '#10b981',  // 实际完成 / 正常收款
  amber: '#f59e0b',    // 预警序列 / 中期账龄
  rose: '#ef4444',     // 超支成本 / 重大逾期 / 红色严重
  indigo: '#6366f1',   // 辅助序列 / 概算对比
  purple: '#8b5cf6',   // 交付维度
  pink: '#ec4899',     // 细分费用
  gridBorder: '#f1f5f9' // 图表背景网格线
}
```

### 6.2 图表交互与样式细节
- **自适应容器**：一律使用 `<ResponsiveContainer width="100%" height={...}>`，高度依场景设定在 `240px` 至 `320px`。
- **坐标轴 (XAxis/YAxis)**：
  - 刻度线淡化：`tickLine={false}`，坐标轴线 `axisLine={{ stroke: '#e2e8f0' }}`。
  - 字体：`tick={{ fontSize: 11, fill: '#64748b' }}`。
- **网格线 (CartesianGrid)**：
  - 虚线弱化：`strokeDasharray="3 3"`，颜色统一为 `#f1f5f9`。
- **自定义 Tooltip**：
  - 禁用默认生硬边框，使用 Tailwind 风格：
  - `contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}`。

---

## 7. 通用组件与交互模态

### 7.1 多维组合筛选器 (FilterBar)
位于各业务页面顶部，采用两行式布局：
- **第一行**：左侧带有漏斗图标 `Filter`、标题“多维组合筛选器”以及业务说明“（经营阶段与交付阶段独立筛选）”；右侧带有“重置条件”快捷按钮。
- **第二行**：响应式栅格布局（`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3`）。
- **字段差异化识别**：
  - 经营阶段（四算）：特别采用浅蓝背景与蓝边框（`bg-blue-50/50 border-blue-200`），在视觉上强调与交付阶段的独立性。

### 7.2 全局搜索模态框 (GlobalSearchModal)
- **触发机制**：全局点击顶部搜寻框或按快捷键 `⌘K` / `Ctrl+K`；`ESC` 退出。
- **模态外观**：居中靠上浮出（`pt-20`），背景磨砂遮罩（`bg-slate-900/50 backdrop-blur-xs`）。
- **结果分组分类**：
  - 搜索结果按“项目”、“合同”、“客户”、“人员”、“预警规则”分模块聚合呈现。
  - 每一项具备类型图标、所属主数据、金额标签与键盘上下导航体验。

### 7.3 右侧只读抽屉 (ReadOnly Drawer)
- **应用场景**：项目 360 页面中的“来源单据穿透（合同原件、立项批复单、阶段门评审表）”、预警中心的“预警闭环处置抽屉”。
- **样式细节**：
  - 右侧滑入：`fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 border-l border-slate-200`。
  - 头部与底部固定，中间内容滚动（`overflow-y-auto`）。
  - 底部操作栏具有清晰的动作区分（如“取消/返回”为次要边框按钮，“确认处置/升级”为主要色彩按钮）。

---