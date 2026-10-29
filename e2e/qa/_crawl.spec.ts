import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login, goto, laneContext, visibleProblems, finish } from './_helpers';

const ROUTES = [
  '/workbench/project-manager', '/workbench/todos', '/opportunities', '/opportunities/new', '/opportunities/OPP-066',
  '/opportunities/OPP-066/evaluation', '/opportunities/OPP-066/solution', '/opportunities/OPP-066/tech-cost',
  '/opportunities/OPP-066/review', '/opportunities/OPP-066/estimate', '/opportunities/OPP-066/estimate/compare',
  '/opportunities/OPP-066/early-investment', '/early-investments', '/initiation/apply', '/initiation/review',
  '/initiation/INIT-1/risk-assessment', '/initiation/INIT-1/decision', '/projects/P-001/team', '/projects/P-001/wbs',
  '/projects/P-001/milestones', '/projects/P-001/plan-review', '/projects/P-001/budget', '/projects/P-001/estimate-budget',
  '/projects/P-001/budget/review', '/projects/P-001/baseline', '/unsigned-projects', '/unsigned-projects/P-004',
  '/projects/P-001/start-confirmation', '/projects/P-001', '/projects/P-001/progress', '/projects/P-001/daily-reports',
  '/projects/P-001/weekly-reports', '/requirements-bugs', '/requirements-bugs/REQ-0001', '/requirements-bugs/BUG-0001',
  '/issues-risks', '/issues-risks/ISSUE-0001', '/issues-risks/RSK-0001', '/projects/P-001/labor-cost',
  '/projects/P-001/procurement', '/projects/P-001/outsourcing', '/projects/P-001/expenses',
  '/projects/P-001/dynamic-accounting', '/project-changes', '/project-changes/new', '/projects/P-001/stage-switch',
  '/projects/P-001/deliverables', '/projects/P-001/internal-acceptance', '/projects/P-001/supplier-acceptance',
  '/projects/P-001/customer-acceptance', '/projects/P-001/report-acceptance', '/projects/P-001/settlement/apply',
  '/projects/P-001/settlement', '/projects/P-001/four-calculations', '/projects/P-001/business-result',
  '/projects/P-001/post-evaluation', '/projects/P-001/archive', '/projects/P-001/operation-handover',
  '/operations/OPS-007', '/projects/P-007/close', '/executive/dashboard', '/executive/four-calculations',
  '/executive/project-drilldown', '/executive/portfolio', '/executive/exceptions', '/executive/decisions',
  '/settings/deliverables', '/settings/project-grading', '/settings/approval-rules', '/settings/cost-mapping',
  '/settings/cost-baseline', '/settings/alerts', '/settings/permissions', '/settings/audit-log',
];

test('crawl: admin 全页面渲染', async ({ page }) => {
  test.setTimeout(900_000);
  const ctx = laneContext(page, '_crawl');
  await login(page, 'admin');
  const report: { route: string; ms: number; text: number; problems: string; console: number }[] = [];
  const bad: string[] = [];
  for (const route of ROUTES) {
    const start = Date.now();
    const before = ctx.consoleErrors.length;
    let problems: string[] = [];
    try {
      await goto(page, route);
      problems = await visibleProblems(page);
      const body = await page.locator('body').innerText();
      const text = body.replace(/\s+/g, '').length;
      const newErrors = ctx.consoleErrors.slice(before);
      report.push({ route, ms: Date.now() - start, text, problems: problems.join(','), console: newErrors.length });
      if (problems.length || text < 120 || newErrors.length) bad.push(`${route} text=${text} problems=${problems.join(',')} console=${newErrors.length}`);
    } catch (error) {
      report.push({ route, ms: Date.now() - start, text: -1, problems: 'NAV_FAIL', console: 0 });
      bad.push(`${route} NAV_FAIL ${(error as Error).message.slice(0, 200)}`);
    }
  }
  fs.mkdirSync(path.resolve('qa-reports/r3'), { recursive: true });
  fs.writeFileSync(path.resolve('qa-reports/r3/crawl.json'), JSON.stringify(report, null, 2));
  const slow = report.filter((r) => r.ms > 4000).sort((a, b) => b.ms - a.ms).slice(0, 10);
  console.log('PAGES', report.length, 'BAD', bad.length);
  for (const b of bad) console.log('BADPAGE', b);
  console.log('SLOW', slow.map((s) => `${s.route}:${s.ms}ms`).join(' '));
  console.log('CONSOLE', [...new Set(ctx.consoleErrors)].slice(0, 20).join('\n'));
  for (const b of bad) ctx.findings.push({ kind: 'BUG', title: `页面渲染异常 ${b.split(' ')[0]}`, detail: b });
  finish(ctx, `admin 直链巡览 ${report.length} 个路由，异常 ${bad.length} 个。`);
});
