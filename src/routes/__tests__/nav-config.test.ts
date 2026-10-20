import { describe, expect, it } from 'vitest';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { GLOBAL_NAV, OPPORTUNITY_NAV, PROJECT_GATE_PAGES, PROJECT_NAV, projectNextStep, resolveNav } from '@/routes/nav-config';

const sample = (route: string) => route.replace(/:id/g, 'X-1');

describe('nav-config', () => {
  it('每个清单页面都有导航归属与标题', () => {
    for (const item of PAGE_MANIFEST) {
      const nav = resolveNav(sample(item.route));
      expect(nav.globalKey, item.route).not.toBe('');
      expect(nav.title, item.route).not.toBe('');
    }
  });

  it('每个页面编号都出现在某个导航入口中', () => {
    const ids = new Set([
      ...GLOBAL_NAV.flatMap((s) => s.items.flatMap((i) => i.pageIds)),
      ...[...PROJECT_NAV, ...OPPORTUNITY_NAV].flatMap((g) => g.pages.flatMap((p) => p.pageIds)),
      ...PROJECT_GATE_PAGES.flatMap((p) => p.pageIds),
    ]);
    // 只能从业务页面进入的详情/表单页
    const contextual = new Set(['GS-02', 'YS-01', 'YS-03', 'YS-04', 'YS-14', 'HS-06', 'HS-08', 'HS-15', 'JS-12']);
    const missing = PAGE_MANIFEST.filter((p) => !ids.has(p.id) && !contextual.has(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('工作区路由高亮所属分组与页面', () => {
    expect(resolveNav('/projects/P-1/budget/review')).toMatchObject({ context: 'project', globalKey: '/projects', groupKey: 'cost', pageKey: 'budget-review' });
    expect(resolveNav('/projects/P-1/budget')).toMatchObject({ pageKey: 'budget' });
    expect(resolveNav('/projects/P-1/settlement/apply')).toMatchObject({ pageKey: 'settlement-apply' });
    expect(resolveNav('/projects/P-1/')).toMatchObject({ groupKey: 'overview', pageKey: 'overview' });
    expect(resolveNav('/projects/P-1/tickets/T-9')).toMatchObject({ groupKey: 'collab', pageKey: 'tickets', title: '事项详情' });
    expect(resolveNav('/projects/P-1/stage-switch')).toMatchObject({ groupKey: undefined, pageKey: 'stage-switch' });
    expect(resolveNav('/opportunities/O-1/estimate/compare')).toMatchObject({ context: 'opportunity', groupKey: 'estimate', pageKey: 'estimate-compare' });
    expect(resolveNav('/opportunities/new')).toMatchObject({ context: 'global', globalKey: '/opportunities' });
  });

  it('旧成本链接按 kind 映射页面', () => {
    expect(resolveNav('/projects/P-1/costs', '?kind=outsource').pageKey).toBe('outsourcing');
    expect(resolveNav('/projects/P-1/costs', '?kind=expense').pageKey).toBe('expenses');
    expect(resolveNav('/projects/P-1/costs').pageKey).toBe('procurement');
  });

  it('面包屑使用实体名称并链接到上级', () => {
    const nav = resolveNav('/projects/P-1/wbs', '', { project: () => '智慧园区' });
    expect(nav.breadcrumbs).toEqual([
      { title: '首页', href: '/' },
      { title: '项目台账', href: '/projects' },
      { title: '智慧园区', href: '/projects/P-1' },
      { title: nav.title },
    ]);
    expect(resolveNav('/tickets/T-1').breadcrumbs.map((c) => c.title)).toEqual(['首页', '事项台账', '事项详情']);
    expect(resolveNav('/settings/alerts').globalKey).toBe('/settings/finance-config');
  });

  it('下一步只按阶段映射', () => {
    expect(projectNextStep('立项', '计划')?.key).toBe('start-confirmation');
    expect(projectNextStep('执行', '实施')?.key).toBe('stage-switch');
    expect(projectNextStep('收尾', '项目结算')?.key).toBe('settlement-apply');
    expect(projectNextStep('运维', '归档')?.key).toBe('archive');
    expect(projectNextStep('已关闭', '')).toBeUndefined();
  });
});
