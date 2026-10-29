import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export type QaRole =
  | 'executive'
  | 'pmo'
  | 'project-manager'
  | 'market'
  | 'finance'
  | 'solution-tech'
  | 'admin';

export const ROLE_LABEL = {
  executive: '集团领导(王总)',
  pmo: 'PMO负责人(李主任)',
  'project-manager': '项目经理(张建国)',
  market: '客户经理(陈亮)',
  finance: '财务专员(刘敏)',
  'solution-tech': '方案架构师(赵工)',
  admin: '系统管理员(Admin)',
} satisfies Record<QaRole, string>;

/** 页面初始化前写入会话角色；业务数据不持久化，每次 page load 都是全新 demo 状态。 */
export async function login(page: Page, role: QaRole, projectId = 'P-001') {
  await page.addInitScript(
    ([r, p]) => {
      localStorage.setItem(
        'pms-app-session',
        JSON.stringify({ state: { currentRole: r, selectedProjectId: p, asOfDate: '2026-09-09' }, version: 0 }),
      );
    },
    [role, projectId] as const,
  );
}

export interface LaneContext {
  page: Page;
  lane: string;
  consoleErrors: string[];
  pageErrors: string[];
  steps: string[];
  findings: { kind: 'BUG' | 'UI' | 'FLOW' | 'BLOCK' | 'RISK' | 'OK'; title: string; detail: string }[];
}

export function laneContext(page: Page, lane: string): LaneContext {
  const ctx: LaneContext = { page, lane, consoleErrors: [], pageErrors: [], steps: [], findings: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') ctx.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => ctx.pageErrors.push(err.message));
  return ctx;
}

/** 打开页面并等待主内容可见；返回是否出现 403/404/错误页。 */
export async function goto(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(url);
    try {
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

export function step(ctx: LaneContext, text: string) {
  ctx.steps.push(text);
}

export function record(
  ctx: LaneContext,
  kind: 'BUG' | 'UI' | 'FLOW' | 'BLOCK' | 'RISK' | 'OK',
  title: string,
  detail: string,
) {
  ctx.findings.push({ kind, title, detail: detail.trim() });
  process.stdout.write(`[${kind}] ${title} :: ${detail.slice(0, 400)}\n`);
}

export async function shot(page: Page, lane: string, name: string, fullPage = true) {
  const dir = path.resolve(process.cwd(), 'qa-reports/r3', lane);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
}

/** 页面错误文案检查（真错误页/403 页），返回命中的问题。 */
export async function visibleProblems(page: Page): Promise<string[]> {
  const body = (await page.locator('body').textContent()) ?? '';
  const hits: string[] = [];
  for (const text of ['页面未找到', '页面出错了', '无权访问', '没有访问权限', '仅支持在项目上下文']) {
    if (body.includes(text)) hits.push(text);
  }
  return hits;
}

/** 通过顶部“角色”下拉切换身份，切换后业务数据保留（同一内存 store），可做跨角色链路。 */
export async function switchRole(page: Page, roleLabel: RegExp | string) {
  const trigger = page.locator('.ant-select').filter({ has: page.getByLabel('模拟身份') }).first();
  await trigger.click();
  await page.getByRole('option', { name: roleLabel as never }).click();
  await page.waitForTimeout(500);
}

export function finish(ctx: LaneContext, summary: string) {
  const dir = path.resolve(process.cwd(), 'qa-reports/r3');
  fs.mkdirSync(dir, { recursive: true });
  const grouped = {
    BLOCK: ctx.findings.filter((f) => f.kind === 'BLOCK'),
    BUG: ctx.findings.filter((f) => f.kind === 'BUG'),
    FLOW: ctx.findings.filter((f) => f.kind === 'FLOW'),
    UI: ctx.findings.filter((f) => f.kind === 'UI'),
    RISK: ctx.findings.filter((f) => f.kind === 'RISK'),
    OK: ctx.findings.filter((f) => f.kind === 'OK'),
  };
  const render = (rows: typeof ctx.findings) =>
    rows.length ? rows.map((f) => `- **${f.title}**\n  ${f.detail.replace(/\n/g, '\n  ')}`).join('\n') : '- （无）';
  const md = [
    `# UI 角色链路报告：${ctx.lane}`,
    '',
    `- 时间：${new Date().toISOString()}`,
    '',
    '## 结论',
    summary || '（见下）',
    '',
    '## BLOCK 堵点',
    render(grouped.BLOCK),
    '',
    '## BUG 逻辑/功能缺陷',
    render(grouped.BUG),
    '',
    '## FLOW 流程问题',
    render(grouped.FLOW),
    '',
    '## UI 问题',
    render(grouped.UI),
    '',
    '## RISK 风险与一致性',
    render(grouped.RISK),
    '',
    '## OK 已验证',
    render(grouped.OK),
    '',
    '## 控制台错误',
    ctx.consoleErrors.length ? ctx.consoleErrors.map((e) => `- ${e}`).join('\n') : '- （无）',
    '',
    '## 运行时异常',
    ctx.pageErrors.length ? ctx.pageErrors.map((e) => `- ${e}`).join('\n') : '- （无）',
    '',
    '## 步骤轨迹',
    '```',
    ...ctx.steps,
    '```',
    '',
  ].join('\n');
  const file = path.join(dir, `${ctx.lane}.md`);
  fs.writeFileSync(file, md, 'utf8');
  process.stdout.write(`\n=== QA REPORT ${file} === BLOCK=${grouped.BLOCK.length} BUG=${grouped.BUG.length} FLOW=${grouped.FLOW.length} UI=${grouped.UI.length} RISK=${grouped.RISK.length} OK=${grouped.OK.length}\n`);
  return file;
}
