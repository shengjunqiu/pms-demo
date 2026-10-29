/**
 * 导航唯一数据源：全局侧边栏、商机/项目工作区导航、面包屑、高亮与文档标题都由此生成。
 * 设计说明见 docs/导航结构优化设计.md。导航只描述页面归属，不新增或计算任何业务事实。
 */
import { PAGE_MAP } from '@/routes/manifest';

export type NavContext = 'global' | 'opportunity' | 'initiation' | 'project';
export type NavIcon = 'workspace' | 'presales' | 'initiation' | 'project' | 'executive' | 'settings';

export interface Crumb { title: string; href?: string }

/** 全局菜单项：key 即菜单路由，pageIds 任一可访问即可见。 */
export interface GlobalNavItem { key: string; label: string; pageIds: string[] }
export interface GlobalNavSection { key: string; label: string; icon: NavIcon; items: GlobalNavItem[] }

export const GLOBAL_NAV: GlobalNavSection[] = [
  { key: 'mine', label: '我的工作', icon: 'workspace', items: [
    { key: '/workbench/project-manager', label: '工作台', pageIds: ['WK-01'] },
    { key: '/workbench/todos', label: '待办中心', pageIds: ['WK-02'] },
    { key: '/executive/decisions', label: '待决策事项', pageIds: ['WK-03'] },
  ] },
  { key: 'presales', label: '售前', icon: 'presales', items: [
    { key: '/opportunities', label: '商机台账', pageIds: ['GS-01'] },
    { key: '/early-investments', label: '提前投入台账', pageIds: ['GS-11'] },
  ] },
  { key: 'initiation', label: '立项', icon: 'initiation', items: [
    { key: '/initiation/review', label: '立项评审', pageIds: ['YS-02'] },
    { key: '/unsigned-projects', label: '未签立项台账', pageIds: ['YS-13'] },
  ] },
  { key: 'projects', label: '项目', icon: 'project', items: [
    { key: '/projects', label: '项目台账', pageIds: ['HS-01'] },
    { key: '/settlement', label: '结算台账', pageIds: ['JS-06'] },
    { key: '/project-changes', label: '变更台账', pageIds: ['HS-14'] },
    { key: '/tickets', label: '事项台账', pageIds: ['HS-05', 'HS-07'] },
  ] },
  { key: 'analysis', label: '经营分析', icon: 'executive', items: [
    { key: '/executive/dashboard', label: '项目看板', pageIds: ['GL-01'] },
    { key: '/executive/four-calculations', label: '四算分析', pageIds: ['GL-02'] },
    { key: '/executive/project-drilldown', label: '穿透分析', pageIds: ['GL-03'] },
    { key: '/executive/portfolio', label: '组合分析', pageIds: ['GL-04'] },
    { key: '/executive/exceptions', label: '异常中心', pageIds: ['GL-05'] },
  ] },
  { key: 'settings', label: '系统设置', icon: 'settings', items: [
    { key: '/settings/deliverables', label: '交付物模板', pageIds: ['CF-01'] },
    { key: '/settings/project-grading', label: '项目分级规则', pageIds: ['CF-02'] },
    { key: '/settings/approval-rules', label: '审批规则', pageIds: ['CF-03'] },
    { key: '/settings/finance-config', label: '财务配置', pageIds: ['CF-04', 'CF-05', 'CF-06'] },
    { key: '/settings/permissions', label: '项目权限', pageIds: ['CF-07'] },
    { key: '/settings/audit-log', label: '操作审计', pageIds: ['CF-08'] },
  ] },
];

/** 工作区页面：path 为相对 `/projects/:id/` 或 `/opportunities/:id/` 的路径，'' 表示根页面。 */
export interface WorkspaceNavPage {
  key: string;
  label: string;
  pageIds: string[];
  path: string;
  /** 同一页面的其他相对路径（旧链接/别名/子页面），支持 `:x` 占位。 */
  aliases?: string[];
  /** 仅当查询参数匹配时命中（用于 `costs?kind=` 等旧链接）。 */
  query?: Record<string, string | undefined>;
}
export interface WorkspaceNavGroup { key: string; label: string; pages: WorkspaceNavPage[] }

export const PROJECT_NAV: WorkspaceNavGroup[] = [
  { key: 'overview', label: '概览', pages: [
    { key: 'overview', label: '项目概览', pageIds: ['HS-01'], path: '' },
  ] },
  { key: 'plan', label: '计划', pages: [
    { key: 'team', label: '团队', pageIds: ['YS-05'], path: 'team' },
    { key: 'wbs', label: 'WBS', pageIds: ['YS-06'], path: 'wbs' },
    { key: 'milestones', label: '里程碑', pageIds: ['YS-07'], path: 'milestones' },
    { key: 'plan-review', label: '计划评审', pageIds: ['YS-08'], path: 'plan-review', aliases: ['plan-requests/:x'] },
    { key: 'progress', label: '进度', pageIds: ['HS-02'], path: 'progress' },
    { key: 'baseline', label: '基线', pageIds: ['YS-12'], path: 'baseline' },
  ] },
  { key: 'cost', label: '预算与成本', pages: [
    { key: 'budget', label: '预算编制', pageIds: ['YS-09'], path: 'budget' },
    { key: 'estimate-budget', label: '概预对比', pageIds: ['YS-10'], path: 'estimate-budget' },
    { key: 'budget-review', label: '预算审批', pageIds: ['YS-11'], path: 'budget/review' },
    { key: 'dynamic-accounting', label: '动态核算', pageIds: ['HS-13'], path: 'dynamic-accounting' },
    { key: 'labor-cost', label: '工时', pageIds: ['HS-09'], path: 'labor-cost' },
    { key: 'procurement', label: '采购', pageIds: ['HS-10'], path: 'procurement', aliases: ['costs'] },
    { key: 'outsourcing', label: '外包', pageIds: ['HS-11'], path: 'outsourcing' },
    { key: 'expenses', label: '费用', pageIds: ['HS-12'], path: 'expenses' },
  ] },
  { key: 'collab', label: '执行协作', pages: [
    { key: 'tickets', label: '事项', pageIds: ['HS-05', 'HS-07'], path: 'tickets', aliases: ['tickets/:x'] },
    { key: 'changes', label: '变更', pageIds: ['HS-14'], path: 'changes', aliases: ['changes/new'] },
    { key: 'daily-reports', label: '日报', pageIds: ['HS-03'], path: 'daily-reports', aliases: ['reports'] },
    { key: 'weekly-reports', label: '周报', pageIds: ['HS-04'], path: 'weekly-reports' },
    { key: 'deliverables', label: '交付物', pageIds: ['HS-17'], path: 'deliverables' },
  ] },
  { key: 'acceptance', label: '验收结算', pages: [
    { key: 'internal-acceptance', label: '内部验收', pageIds: ['JS-01'], path: 'internal-acceptance' },
    { key: 'supplier-acceptance', label: '供应商验收', pageIds: ['JS-02'], path: 'supplier-acceptance' },
    { key: 'customer-acceptance', label: '客户验收', pageIds: ['JS-03'], path: 'customer-acceptance' },
    { key: 'report-acceptance', label: '报验', pageIds: ['JS-04'], path: 'report-acceptance' },
    { key: 'settlement-apply', label: '结算申请', pageIds: ['JS-05'], path: 'settlement/apply' },
    { key: 'settlement', label: '结算详情', pageIds: ['JS-06'], path: 'settlement' },
    { key: 'four-calculations', label: '四算对比', pageIds: ['JS-07'], path: 'four-calculations' },
    { key: 'business-result', label: '经营结果', pageIds: ['JS-08'], path: 'business-result' },
  ] },
  { key: 'closeout', label: '收尾', pages: [
    { key: 'post-evaluation', label: '后评价', pageIds: ['JS-09'], path: 'post-evaluation' },
    { key: 'archive', label: '资料归档', pageIds: ['JS-10'], path: 'archive' },
    { key: 'operation-handover', label: '运维衔接', pageIds: ['JS-11'], path: 'operation-handover' },
    { key: 'close', label: '项目关闭', pageIds: ['JS-13'], path: 'close' },
  ] },
];

/** 阶段门禁页：不放入分组，由"下一步"与概览阶段卡片进入。 */
export const PROJECT_GATE_PAGES: WorkspaceNavPage[] = [
  { key: 'start-confirmation', label: '项目启动确认', pageIds: ['YS-15'], path: 'start-confirmation' },
  { key: 'stage-switch', label: '阶段切换申请', pageIds: ['HS-16'], path: 'stage-switch' },
];

/** 旧链接 `/projects/:id/costs?kind=` 仍可用：按 kind 映射到成本页面。 */
const COST_KIND_PAGE: Record<string, string> = { procurement: 'procurement', outsource: 'outsourcing', expense: 'expenses' };

export const OPPORTUNITY_NAV: WorkspaceNavGroup[] = [
  { key: 'overview', label: '概览', pages: [
    { key: 'overview', label: '商机详情', pageIds: ['GS-03'], path: '', aliases: ['edit'] },
  ] },
  { key: 'evaluation', label: '评估', pages: [
    { key: 'evaluation', label: '初步评估', pageIds: ['GS-04'], path: 'evaluation' },
  ] },
  { key: 'solution', label: '方案与成本', pages: [
    { key: 'solution', label: '需求调研与方案', pageIds: ['GS-05'], path: 'solution' },
    { key: 'tech-cost', label: '技术与成本评估', pageIds: ['GS-06'], path: 'tech-cost' },
    { key: 'review', label: '专家评审', pageIds: ['GS-07'], path: 'review' },
  ] },
  { key: 'estimate', label: '概算', pages: [
    { key: 'estimate', label: '概算编制', pageIds: ['GS-08'], path: 'estimate' },
    { key: 'estimate-compare', label: '版本对比', pageIds: ['GS-09'], path: 'estimate/compare' },
  ] },
  { key: 'early-investment', label: '提前投入', pages: [
    { key: 'early-investment', label: '提前投入申请', pageIds: ['GS-10'], path: 'early-investment' },
  ] },
];

/** 项目"下一步"：只按阶段映射门禁页，门禁是否满足由目标页面校验（设计文档 5.5）。 */
export function projectNextStep(phase: string, subPhase: string): WorkspaceNavPage | undefined {
  const page = (key: string) => [...PROJECT_GATE_PAGES, ...PROJECT_NAV.flatMap((g) => g.pages)].find((p) => p.key === key);
  if (phase === '立项') return page('start-confirmation');
  if (phase === '执行') return page(subPhase === '内部初验' ? 'internal-acceptance' : 'stage-switch');
  if (phase === '收尾') return page(subPhase === '客户终验' ? 'customer-acceptance' : subPhase === '项目结算' ? 'settlement-apply' : 'internal-acceptance');
  if (phase === '运维') return page(subPhase === '后评价' ? 'post-evaluation' : subPhase === '归档' ? 'archive' : 'operation-handover');
  return undefined;
}

/** 全局（非工作区）页面的归属：pattern → 菜单 key 与标题。 */
interface GlobalRule { pattern: string; navKey: string; title?: string }
const GLOBAL_RULES: GlobalRule[] = [
  { pattern: '/opportunities/new', navKey: '/opportunities', title: '新建商机' },
  { pattern: '/initiation/apply', navKey: '/initiation/review', title: '立项申请' },
  { pattern: '/unsigned-projects/:x', navKey: '/unsigned-projects', title: '未签项目详情' },
  { pattern: '/operations/:x', navKey: '/projects', title: '运维项目详情' },
  { pattern: '/project-changes/new', navKey: '/project-changes', title: '变更申请与评审' },
  { pattern: '/tickets/:x', navKey: '/tickets', title: '事项详情' },
  { pattern: '/requirements-bugs', navKey: '/tickets' },
  { pattern: '/requirements-bugs/:x', navKey: '/tickets', title: '事项详情' },
  { pattern: '/issues-risks', navKey: '/tickets' },
  { pattern: '/issues-risks/:x', navKey: '/tickets', title: '事项详情' },
  { pattern: '/settings/cost-mapping', navKey: '/settings/finance-config' },
  { pattern: '/settings/cost-baseline', navKey: '/settings/finance-config' },
  { pattern: '/settings/alerts', navKey: '/settings/finance-config' },
  { pattern: '/approvals/:x', navKey: '/workbench/todos', title: '审批详情' },
  { pattern: '/management-approvals/:x', navKey: '/workbench/todos', title: '管理审批详情' },
];

export interface NameLookup {
  project?: (id: string) => string | undefined;
  opportunity?: (id: string) => string | undefined;
  initiation?: (id: string) => string | undefined;
}

export interface ResolvedNav {
  context: NavContext;
  /** 侧边栏高亮 key；空字符串表示不高亮 */
  globalKey: string;
  entityId?: string;
  groupKey?: string;
  pageKey?: string;
  title: string;
  breadcrumbs: Crumb[];
}

const HOME: Crumb = { title: '首页', href: '/' };
const ALL_GLOBAL_ITEMS = GLOBAL_NAV.flatMap((s) => s.items);

function matchPattern(pattern: string, path: string) {
  const re = new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, '[^/]+')}$`);
  return re.test(path);
}

function globalItem(key: string) {
  return ALL_GLOBAL_ITEMS.find((i) => i.key === key);
}

function resolveWorkspace(groups: WorkspaceNavGroup[], extraPages: WorkspaceNavPage[], rest: string, search: URLSearchParams) {
  if (rest === 'costs') {
    const key = COST_KIND_PAGE[search.get('kind') ?? 'procurement'] ?? 'procurement';
    const group = groups.find((g) => g.pages.some((p) => p.key === key));
    return { group, page: group?.pages.find((p) => p.key === key) };
  }
  for (const group of groups) {
    const page = group.pages.find((p) => [p.path, ...(p.aliases ?? [])].some((path) => matchPattern(path, rest)));
    if (page) return { group, page };
  }
  return { group: undefined, page: extraPages.find((p) => matchPattern(p.path, rest)) };
}

function workspaceTitle(page: WorkspaceNavPage | undefined, rest: string) {
  if (!page) return undefined;
  if (rest === 'tickets' || rest === 'changes') return page.label === '事项' ? '项目事项' : '项目变更';
  if (/^tickets\/.+/.test(rest)) return '事项详情';
  if (rest === 'changes/new') return '变更申请与评审';
  if (/^plan-requests\/.+/.test(rest)) return '计划变更申请';
  if (rest === 'edit') return '编辑商机';
  const manifestTitle = PAGE_MAP.get(page.pageIds[0])?.title;
  return manifestTitle ?? page.label;
}

/** 解析当前路径的导航归属。search 用于旧链接别名（如 costs?kind=）。 */
export function resolveNav(pathname: string, search = '', names: NameLookup = {}): ResolvedNav {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const seg = path.split('/').filter(Boolean);
  const params = new URLSearchParams(search);

  if (seg[0] === 'projects' && seg[1]) {
    const id = seg[1];
    const rest = seg.slice(2).join('/');
    const { group, page } = resolveWorkspace(PROJECT_NAV, PROJECT_GATE_PAGES, rest, params);
    const name = names.project?.(id) ?? id;
    const title = workspaceTitle(page, rest) ?? '项目';
    const breadcrumbs: Crumb[] = [HOME, { title: '项目台账', href: '/projects' }];
    breadcrumbs.push(rest ? { title: name, href: `/projects/${id}` } : { title: name });
    if (rest) {
      if (/^(tickets|changes)\/.+/.test(rest)) breadcrumbs.push({ title: page!.label, href: `/projects/${id}/${page!.path}` });
      breadcrumbs.push({ title });
    }
    return { context: 'project', globalKey: '/projects', entityId: id, groupKey: group?.key, pageKey: page?.key, title, breadcrumbs };
  }

  if (seg[0] === 'opportunities' && seg[1] && seg[1] !== 'new') {
    const id = seg[1];
    const rest = seg.slice(2).join('/');
    const { group, page } = resolveWorkspace(OPPORTUNITY_NAV, [], rest, params);
    const name = names.opportunity?.(id) ?? id;
    const title = workspaceTitle(page, rest) ?? '商机';
    const breadcrumbs: Crumb[] = [HOME, { title: '商机台账', href: '/opportunities' }];
    breadcrumbs.push(rest ? { title: name, href: `/opportunities/${id}` } : { title: name });
    if (rest) breadcrumbs.push({ title });
    return { context: 'opportunity', globalKey: '/opportunities', entityId: id, groupKey: group?.key, pageKey: page?.key, title, breadcrumbs };
  }

  if (seg[0] === 'initiation' && seg[1] && !['review', 'apply'].includes(seg[1])) {
    const id = seg[1];
    const title = seg[2] === 'risk-assessment' ? '综合风险评估' : seg[2] === 'decision' ? '立项决策详情' : '立项';
    const name = names.initiation?.(id) ?? id;
    return { context: 'initiation', globalKey: '/initiation/review', entityId: id, title, breadcrumbs: [HOME, { title: '立项评审', href: '/initiation/review' }, { title: name }, { title }] };
  }

  const direct = globalItem(path);
  if (direct) return { context: 'global', globalKey: direct.key, title: direct.label, breadcrumbs: [HOME, { title: direct.label }] };

  const rule = GLOBAL_RULES.find((r) => matchPattern(r.pattern, path));
  if (rule) {
    const parent = globalItem(rule.navKey);
    if (!rule.title) return { context: 'global', globalKey: rule.navKey, title: parent?.label ?? '', breadcrumbs: [HOME, { title: parent?.label ?? '' }] };
    const breadcrumbs: Crumb[] = [HOME, ...(parent ? [{ title: parent.label, href: parent.key }] : []), { title: rule.title }];
    return { context: 'global', globalKey: rule.navKey, title: rule.title, breadcrumbs };
  }

  return { context: 'global', globalKey: '', title: '', breadcrumbs: [HOME] };
}
