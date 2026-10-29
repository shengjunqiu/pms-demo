import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ACCESS_ACTIONS, defaultActions, defaultPages } from '@/mock/configuration-access';
import { PAGE_MANIFEST } from '@/routes/manifest';
import type { UserRole } from '@/store/useAppStore';

/**
 * 访问策略 × 页面 一致性检查。
 * 拦住两类“能写但没入口 / 有动作没页面”的不对称——历史验收里反复出现的堵点：
 * 1) 策略授予的动作必须能在某个页面源码里找到调用；
 * 2) 若动作只由若干页面承载，该角色至少要能进其中一个页面。
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const p = join(dir, name);
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
  });

const segments = (route: string) => route.replace(/^\//, '').split('/');

const sameRoute = (a: string, b: string) => {
  const left = segments(a);
  const right = segments(b);
  if (left.length !== right.length) return false;
  return left.every((s, i) => s === right[i] || (s.startsWith(':') && right[i].startsWith(':')));
};

const isParam = (s: string) => s.startsWith(':');

/** 先精确匹配路由；找不到时归到最长前缀的 manifest 页面（子页面/详情页归属其父页面） */
const pageIdForRoute = (route: string) => {
  const exact = PAGE_MANIFEST.find((p) => sameRoute(p.route, route));
  if (exact) return exact.id;
  const target = segments(route);
  const candidates = PAGE_MANIFEST.filter((p) => {
    const seg = segments(p.route);
    return seg.length < target.length && seg.every((s, i) => s === target[i] || isParam(s) || isParam(target[i]));
  }).sort((a, b) => segments(b.route).length - segments(a.route).length);
  return candidates[0]?.id;
};

/** 页面文件 -> manifest 页面 id（经路由定义里的 path + 组件名反查） */
function pageFileToId(): Map<string, string> {
  const map = new Map<string, string>();
  const routeFiles = ['src/routes/index.tsx', ...walk('src/routes/modules')].filter((f) => /\.tsx?$/.test(f));
  for (const file of routeFiles) {
    const src = read(file);
    const components = new Map<string, string>();
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*lazyPage\(\s*\(\)\s*=>\s*import\(['"]@\/(pages\/[^'"]+)['"]\)/g)) {
      components.set(m[1], m[2]);
    }
    for (const m of src.matchAll(/path(?:=|:)\s*['"]([^'"]+)['"]/g)) {
      const id = pageIdForRoute(m[1]);
      if (!id) continue;
      const window = src.slice(m.index ?? 0, (m.index ?? 0) + 260);
      const page = [...components.keys()].find((name) => window.includes(`<${name}`));
      if (page) map.set(components.get(page)!, id);
    }
  }
  return map;
}

/** 动作 -> 承载它的页面 id 集合 */
function actionPages(): Map<string, Set<string>> {
  const known = new Set(ACCESS_ACTIONS);
  const fileToId = pageFileToId();
  const map = new Map<string, Set<string>>();
  for (const file of walk('src/pages').filter((f) => /\.tsx?$/.test(f))) {
    const id = fileToId.get(file.replace(/^src\//, '').replace(/\.tsx?$/, ''));
    if (!id) continue;
    for (const m of read(file).matchAll(/['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"]/g)) {
      if (!known.has(m[1])) continue;
      if (!map.has(m[1])) map.set(m[1], new Set());
      map.get(m[1])!.add(id);
    }
  }
  return map;
}

/** 无独立页面入口的动作：通用审批节点、后台动作、或由页面动态拼接的通用动作 */
// 无独立页面入口：通用审批节点动作，或由页内 Tab / 共享面板承载（这些文件没有自己的路由）
const PAGE_FREE = new Set<string>([
  'review', 'review-management', 'review-plan', 'review-early-investment', 'stage-gate', 'submit-budget',
  'confirm-project-contract', 'exit-unsigned', 'follow-unsigned', 'request-unsigned-investment',
  'risk-to-issue', 'update-ticket',
]);

describe('访问策略 × 页面一致性', () => {
  const byPage = actionPages();

  it('每个被授予的动作都能在某页面找到入口', () => {
    const orphan = ACCESS_ACTIONS.filter((a) => !byPage.has(a) && !PAGE_FREE.has(a));
    expect(orphan, `以下动作没有任何页面调用入口：${orphan.join('、')}`).toEqual([]);
  });

  it('角色被授予的动作至少落在该角色可访问的页面里', () => {
    const offenders: string[] = [];
    for (const role of Object.keys(defaultActions) as UserRole[]) {
      const pages = new Set(defaultPages[role]);
      for (const action of defaultActions[role]) {
        const carriers = byPage.get(action);
        if (!carriers || carriers.size === 0) continue;
        if (![...carriers].some((page) => pages.has(page))) {
          offenders.push(`${role}:${action} → 入口页 ${[...carriers].join('/')}`);
        }
      }
    }
    expect(offenders, `角色能写但页面进不去：\n${offenders.join('\n')}`).toEqual([]);
  });
});
