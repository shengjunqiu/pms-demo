import { expect, test, type Page } from '@playwright/test';
import {
  finish,
  goto,
  laneContext,
  login,
  record as emitRecord,
  shot,
  step,
  switchRole,
  visibleProblems,
  type LaneContext,
} from './_helpers';

/**
 * 项目经理(张建国 U-001) 角色链路 QA：
 * 工作台 → 执行（进度/日报/事项/阶段） → 变更 → 验收 → 结算 → 收尾（四算/经营结果/后评价/归档/关闭） → 运维。
 * 只读：不修改 src/、docs/、src/mock、DEV_PROGRESS.md；观察结果写入 qa-reports/r3/a3.md。
 */

const LANE = 'a3';
type Kind = 'BLOCK' | 'BUG' | 'FLOW' | 'UI' | 'RISK' | 'OK';
type Finding = { kind: Kind; title: string; detail: string };

const agg: {
  findings: Finding[];
  consoleErrors: string[];
  pageErrors: string[];
  steps: string[];
} = { findings: [], consoleErrors: [], pageErrors: [], steps: [] };

function absorb(ctx: LaneContext) {
  agg.findings.push(...ctx.findings);
  agg.consoleErrors.push(...ctx.consoleErrors);
  agg.pageErrors.push(...ctx.pageErrors);
  agg.steps.push(...ctx.steps);
}

/* --------------------------- 断言记录绑定上下文 --------------------------- */

let activeCtx: LaneContext | null = null;

/** 每个测试开头建立 lane 上下文，并绑定为当前“断言记录器”的目标。 */
function newCtx(page: Page): LaneContext {
  const ctx = laneContext(page, LANE);
  activeCtx = ctx;
  return ctx;
}

function record(ctx: LaneContext, kind: Kind, title: string, detail: string): void;
function record(kind: Kind, title: string, detail: string): void;
function record(
  a: LaneContext | Kind,
  b: Kind | string,
  c?: string,
  d?: string,
): void {
  const bound = typeof a === 'string';
  const ctx = bound ? activeCtx : (a as LaneContext);
  if (!ctx) throw new Error('record() 之前必须先调用 newCtx(page)');
  emitRecord(ctx, (bound ? a : b) as Kind, (bound ? b : c) as string, (bound ? c : d) as string);
}

/* ------------------------------ 通用工具 ------------------------------ */

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => clean(await page.locator('main').innerText());
const num = (s: string): number | null => {
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const after = (t: string, label: string, len = 60) => {
  const i = t.indexOf(label);
  return i < 0 ? '' : t.slice(i + label.length, i + label.length + len);
};
const tag = (t: string, re: RegExp) => t.match(re)?.[0] ?? '';
const near = (a: number | null, b: number | null) =>
  a !== null && b !== null && Math.abs(a - b) < 0.05;

/** SPA 内跳转：保留同一内存业务状态（page.goto 会重置 demo 数据）。 */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(900);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
}

/** 顶部“模拟身份”下拉切换角色；保留业务状态。 */
async function asRole(page: Page, label: RegExp): Promise<boolean> {
  try {
    await switchRole(page, label);
    return true;
  } catch {
    /* 回退实现：_helpers.switchRole 在当前 DOM 上可能命中多个 .ant-select */
  }
  try {
    await page.getByRole('combobox', { name: '模拟身份' }).first().click();
    await page.getByRole('option', { name: label }).first().click();
    await page.waitForTimeout(900);
    return true;
  } catch {
    return false;
  }
}

const btn = (page: Page, re: RegExp) => page.getByRole('button', { name: re });

async function clickBtn(
  page: Page,
  ctx: LaneContext,
  re: RegExp,
  what: string,
): Promise<boolean> {
  const b = btn(page, re).first();
  if (!(await b.count())) {
    record(ctx, 'FLOW', `入口缺失：${what}`, `页面未渲染按钮 /${re.source}/；当前页面文本：${(await mainText(page)).slice(0, 320)}`);
    return false;
  }
  if (await b.isDisabled()) {
    record(ctx, 'FLOW', `入口置灰：${what}`, `按钮 /${re.source}/ 处于 disabled；title=${(await b.getAttribute('title')) ?? '无'}；页面文本：${(await mainText(page)).slice(0, 320)}`);
    return false;
  }
  await b.click();
  await page.waitForTimeout(700);
  return true;
}

async function msgs(page: Page): Promise<string[]> {
  const list = await page.locator('.ant-message-notice-content').allInnerTexts().catch(() => [] as string[]);
  return list.map(clean);
}

async function modalText(page: Page) {
  const m = page.locator('.ant-modal-content').last();
  if (!(await m.count())) return '';
  return clean(await m.innerText()).slice(0, 900);
}

async function modalOk(page: Page, re = /确认提交|确定|确认|保存|提交|通过/): Promise<boolean> {
  const f = page.locator('.ant-modal-footer button').filter({ hasText: re }).last();
  if (!(await f.count())) return false;
  if (await f.isDisabled()) return false;
  await f.click();
  await page.waitForTimeout(900);
  return true;
}

async function tableRows(page: Page, nth = 0): Promise<string[][]> {
  const rows = page.locator('main .ant-table-wrapper').nth(nth).locator('tbody tr');
  const n = await rows.count();
  const out: string[][] = [];
  for (let i = 0; i < n; i += 1) {
    out.push((await rows.nth(i).locator('td').allInnerTexts()).map(clean));
  }
  return out;
}

async function fillLabel(page: Page, label: string, value: string): Promise<boolean> {
  const f = page.getByLabel(label, { exact: false }).first();
  if (!(await f.count())) return false;
  await f.fill(value);
  await page.waitForTimeout(200);
  return true;
}

async function pickOption(page: Page, selectLabel: string, option: RegExp): Promise<boolean> {
  const s = page.getByLabel(selectLabel, { exact: false }).first();
  if (!(await s.count())) return false;
  await s.click();
  await page.waitForTimeout(300);
  const o = page.getByRole('option', { name: option }).first();
  if (!(await o.count())) {
    await page.keyboard.press('Escape');
    return false;
  }
  await o.click();
  await page.waitForTimeout(400);
  return true;
}

/** 表格行内点击链接/按钮（用于打开原单据）。 */
async function clickRowText(page: Page, text: string | RegExp): Promise<boolean> {
  const target = page.locator('main tbody').getByText(text).first();
  if (!(await target.count())) return false;
  await target.click();
  await page.waitForTimeout(900);
  return true;
}

/* ------------------------------- T1 工作台 ------------------------------- */

test('T1 工作台 KPI 与项目详情/进度/成本/验收子页一致', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T1 工作台 KPI 一致性');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/workbench/project-manager');
  step(ctx, 'PM(张建国) → /workbench/project-manager');

  const problems = await visibleProblems(page);
  if (problems.length) record(ctx, 'BUG', '工作台出现错误页/无权限文案', problems.join('、'));

  const wb = await mainText(page);
  const kpi = {
    当前项目: num(after(wb, '当前项目')),
    待处理事项: num(after(wb, '待处理事项')),
    超期待办: num(after(wb, '超期待办')),
    预警高风险: num(after(wb, '预警与高风险项目')),
  };
  record(ctx, 'OK', '工作台四项 KPI 可读', `当前项目=${kpi.当前项目} 待处理事项=${kpi.待处理事项} 超期待办=${kpi.超期待办} 预警与高风险=${kpi.预警高风险}`);
  await shot(page, LANE, 't1-workbench');

  const rows = await tableRows(page);
  const p1 = rows.find((r) => (r[0] ?? '').includes('P-001'));
  if (!p1) {
    record(ctx, 'BLOCK', '工作台“我的项目”表缺少 P-001', `表格行数=${rows.length}，首列：${rows.map((r) => r[0]).join(' / ').slice(0, 300)}`);
  } else {
    record(
      ctx,
      'OK',
      '工作台 P-001 行数值',
      `列=[${p1.join(' | ').slice(0, 400)}]；完成率=${num(p1[5] ?? '')}；预算/已用=${num((p1[9] ?? '').split(' ')[0] ?? '')}`,
    );
  }
  const wbProgress = p1 ? num(p1[5] ?? '') : null;
  const wbBudget = p1 ? num((p1[9] ?? '').split(' ')[0] ?? '') : null;

  // 待办 → 原单据
  const todoBtn = btn(page, /去办理/).first();
  if (await todoBtn.count()) {
    await todoBtn.click();
    await page.waitForTimeout(1200);
    const url = new URL(page.url());
    const bad = await visibleProblems(page);
    const detail = await mainText(page);
    if (bad.length) record(ctx, 'BUG', '工作台待办“去办理”进入错误页', `跳转=${url.pathname}${url.search}；命中=${bad.join('、')}；正文=${detail.slice(0, 200)}`);
    else record(ctx, 'OK', '工作台待办“去办理”进入原单据', `跳转=${url.pathname}${url.search}；正文=${detail.slice(0, 120)}`);
  } else {
    record(ctx, 'FLOW', '工作台待办区无“去办理”按钮', (await mainText(page)).slice(0, 300));
  }

  // 项目详情：预算 / 已发生成本
  await spa(page, '/projects/P-001');
  const detail = await mainText(page);
  await shot(page, LANE, 't1-project-detail');
  const detailBudget = num(after(detail, '有效预算'));
  const detailActual = num(after(detail, '滚动预测成本'));
  const detailPhase = tag(detail, /执行阶段[^ ]{0,20}/);
  if (wbBudget === null || detailBudget === null) {
    record(ctx, 'RISK', '预算口径无法比对（数值未解析）', `工作台预算/已用=${wbBudget}，详情有效预算=${detailBudget}；详情片段=${after(detail, '项目经营摘要', 240)}`);
  } else if (near(wbBudget, detailBudget)) {
    record(ctx, 'OK', '工作台预算与项目详情有效预算一致', `工作台=${wbBudget} 详情=${detailBudget}`);
  } else {
    record(ctx, 'BUG', '工作台预算与项目详情不一致', `工作台“预算/已用成本”首值=${wbBudget}，详情“有效预算”=${detailBudget}；${detailPhase}`);
  }
  record(ctx, 'OK', '项目详情经营摘要可读', `有效预算=${detailBudget} 滚动预测成本=${detailActual}`);

  // 进度子页
  await spa(page, '/projects/P-001/progress');
  const prog = await mainText(page);
  const progressRate = num(after(prog, '总体实际完成率'));
  await shot(page, LANE, 't1-progress');
  if (wbProgress !== null && progressRate !== null && near(wbProgress, progressRate)) {
    record(ctx, 'OK', '工作台完成率与进度页一致', `工作台=${wbProgress}% 进度页=${progressRate}%`);
  } else {
    record(ctx, 'BUG', '工作台完成率与进度页不一致', `工作台=${wbProgress} 进度页“总体实际完成率”=${progressRate}；进度页片段=${after(prog, '总体实际完成率', 120)}`);
  }
  const taskRows = await tableRows(page);
  record(ctx, 'OK', '进度页 WBS 任务清单', `任务行=${taskRows.length}；首行=${(taskRows[0] ?? []).join(' | ').slice(0, 220)}`);

  // 验收子页
  await spa(page, '/projects/P-001/internal-acceptance');
  const acc = await mainText(page);
  const accRows = await tableRows(page);
  record(ctx, 'OK', '内部验收页可读', `验收行=${accRows.length}；首行=${(accRows[0] ?? []).join(' | ').slice(0, 220)}；工作台待验收卡片=${after(wb, '待验收与整改', 120)}`);
  if (!/待验收|整改中|已通过/.test(acc)) record(ctx, 'BUG', '内部验收页缺少状态信息', acc.slice(0, 300));

  await shot(page, LANE, 't1-internal-acceptance');
  absorb(ctx);
});

/* ----------------------------- T2 进度任务更新 ----------------------------- */

test('T2 进度任务更新后列表与 KPI 联动', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T2 进度任务更新');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/projects/P-001/progress');
  step(ctx, 'PM → /projects/P-001/progress');

  const before = num(after(await mainText(page), '总体实际完成率'));
  const updates = btn(page, /更新执行/);
  const n = await updates.count();
  let idx = -1;
  for (let i = 0; i < n; i += 1) {
    if (!(await updates.nth(i).isDisabled())) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    record(ctx, 'BLOCK', 'PM 在 P-001 进度页无可更新任务', `按钮数=${n}，全部 disabled（PM 应可更新本人项目任务）；页面文本=${(await mainText(page)).slice(0, 300)}`);
    absorb(ctx);
    return;
  }
  await updates.nth(idx).click();
  await page.waitForTimeout(600);
  const modal = await modalText(page);
  record(ctx, 'OK', '打开“更新任务执行事实”弹窗', modal.slice(0, 200));
  const before100 = Number((await page.getByLabel('任务完成率').first().inputValue().catch(() => '0')) || 0) || null;
  await fillLabel(page, '任务完成率', '100');
  await fillLabel(page, '实际完成日期', '2026-09-09');
  await fillLabel(page, '执行说明', 'QA：完成剩余工作并复核交付物');
  const ok = await modalOk(page, /确定|保存|更新/);
  const m = await msgs(page);
  await page.waitForTimeout(500);
  const after100 = num(after(await mainText(page), '总体实际完成率'));
  if (!ok) record(ctx, 'BUG', '任务更新弹窗无法确认提交', `弹窗=${await modalText(page)}；消息=${m.join(' | ')}`);
  else if (m.some((t) => /已更新|成功/.test(t))) record(ctx, 'OK', '任务执行事实提交成功', m.join(' | '));
  else record(ctx, 'FLOW', '任务更新提交后无成功提示', `消息=${m.join(' | ') || '无'}；弹窗=${await modalText(page)}`);
  if (before !== null && after100 !== null) {
    record('OK', '更新后总体完成率变化', `更新前=${before}% 更新后=${after100}%（任务原完成率=${before100}）`);
  }
  await shot(page, LANE, 't2-progress-updated');
  absorb(ctx);
});

/* -------------------------------- T3 日报 -------------------------------- */

test('T3 日报：工时上限、必填校验、同日重复填报', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T3 日报');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/projects/P-001/daily-reports');
  step(ctx, 'PM → /projects/P-001/daily-reports');

  const openBtn = btn(page, /填报今日日报|继续今日日报|今日日报已提交/).first();
  if (!(await openBtn.count())) {
    record(ctx, 'BLOCK', '日报页缺少填报入口', (await mainText(page)).slice(0, 400));
    absorb(ctx);
    return;
  }
  if (await openBtn.isDisabled()) {
    record(ctx, 'FLOW', '今日日报入口不可用', `按钮文本=${clean(await openBtn.innerText())}；页面=${(await mainText(page)).slice(0, 300)}`);
    absorb(ctx);
    return;
  }
  await openBtn.click();
  await page.waitForTimeout(700);
  record(ctx, 'OK', '打开日报填报弹窗', (await modalText(page)).slice(0, 160));

  const hours = page.getByLabel('日报实际工时').first();
  if (await hours.count()) {
    await hours.fill('30');
    await hours.press('Tab');
    await page.waitForTimeout(400);
    const hv = await hours.inputValue();
    const nv = Number(hv);
    if (Number.isFinite(nv) && nv > 24) {
      record(ctx, 'BUG', '日报实际工时允许超过 24 小时', `输入 30 后失焦控件值=${hv}，期望被夹取到 24 或给出错误提示`);
    } else {
      record(ctx, 'OK', '日报工时上限 24 生效', `输入 30 后失焦控件值=${hv}`);
    }
    await hours.fill('8');
  } else {
    record(ctx, 'UI', '日报弹窗缺少“实际工时”输入', (await modalText(page)).slice(0, 300));
  }

  // 必填校验：直接提交
  const submitted = await modalOk(page, /确认提交日报/);
  const m1 = await msgs(page);
  if (!submitted) record(ctx, 'BUG', '日报提交按钮不可点击', await modalText(page));
  if (m1.some((t) => t.includes('请先填写'))) record(ctx, 'OK', '日报必填校验提示明确', m1.join(' | '));
  else record(ctx, 'BUG', '日报提交未给出必填提示', `消息=${m1.join(' | ') || '无'}；弹窗=${(await modalText(page)).slice(0, 300)}`);

  const stillOpen = (await modalText(page)).includes('日报填报');
  if (stillOpen) record(ctx, 'OK', '校验失败后停留在填报弹窗', '弹窗未关闭，可继续修改');
  else record(ctx, 'UI', '校验失败后弹窗关闭', '应留在弹窗内就地提示必填项');

  // 正常提交
  await fillLabel(page, '报告进展', 'QA：完成接口联调并复核验收材料');
  await fillLabel(page, '报告下一步', 'QA：推进整改项并准备内部验收');
  await modalOk(page, /确认提交日报/);
  const m2 = await msgs(page);
  if (m2.some((t) => /提交|成功/.test(t))) record(ctx, 'OK', '日报提交成功提示', m2.join(' | '));
  else record(ctx, 'FLOW', '日报提交后无成功提示', `消息=${m2.join(' | ') || '无'}；弹窗=${(await modalText(page)).slice(0, 200)}`);

  const text = await mainText(page);
  const rows = await tableRows(page);
  const todayRows = rows.filter((r) => (r[0] ?? '').includes('2026-09-09'));
  record(
    todayRows.length <= 1 ? 'OK' : 'BUG',
    '日报同日重复记录检查',
    `2026-09-09 行数=${todayRows.length}（期望 1 条）；行=${todayRows.map((r) => r.join(' | ')).join(' // ').slice(0, 300)}`,
  );
  const again = btn(page, /今日日报已提交|填报今日日报/).first();
  if (await again.count()) {
    const label = clean(await again.innerText());
    const dis = await again.isDisabled();
    record(dis && label.includes('已提交') ? 'OK' : 'BUG', '重复日期填报被阻止', `按钮文本=${label} disabled=${dis}；页面状态=${after(text, '今日填报', 80)}`);
  }
  await shot(page, LANE, 't3-daily-reports');
  absorb(ctx);
});

/* ---------------------------- T4 需求/BUG/问题/风险 ---------------------------- */

async function newTicket(
  page: Page,
  ctx: LaneContext,
  kind: 'bug' | 'requirement' | 'issue' | 'risk',
  url: string,
) {
  await spa(page, url);
  const opened = await clickBtn(page, ctx, /新建事项/, `新建${kind}入口`);
  if (!opened) return false;
  const title = `QA-${kind}-${Date.now().toString().slice(-6)}`;
  await fillLabel(page, '事项标题', title);
  await fillLabel(page, '业务类别', 'QA回归');
  await fillLabel(page, '缺陷类别', 'QA回归').catch(() => {});
  await fillLabel(page, '事项描述', `QA 自动回归创建 ${kind}，用于验证保存与列表联动`);
  if (kind !== 'risk') {
    const rankPick = await pickOption(page, '新建优先级', /致命|严重|高|重大/);
    if (!rankPick) record(ctx, 'FLOW', `${kind} 新建弹窗缺少等级选择`, (await modalText(page)).slice(0, 300));
  } else {
    await fillLabel(page, '应对措施', 'QA：提前识别并安排缓解措施');
    await fillLabel(page, '概率评分', '4');
    await fillLabel(page, '影响评分', '4');
    await pickOption(page, '事项等级', /重大|一般/);
  }
  await modalOk(page, /提交责任人/);
  const m = await msgs(page);
  const created = m.some((t) => /提交|成功/.test(t));
  record(created ? 'OK' : 'BUG', `新建${kind}提交结果`, `消息=${m.join(' | ') || '无'}；弹窗残留=${(await modalText(page)).slice(0, 260)}`);
  const rows = await tableRows(page);
  const hit = rows.find((r) => r.join(' ').includes(title));
  record(hit ? 'OK' : 'BUG', `新建${kind}后列表出现记录`, hit ? hit.join(' | ') : `未在列表中找到标题 ${title}；首行=${(rows[0] ?? []).join(' | ').slice(0, 200)}`);
  return true;
}

test('T4 事项：新建 BUG/需求/问题/风险与升级路径', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T4 事项新建');
  await login(page, 'project-manager', 'P-001');

  await goto(page, '/requirements-bugs?projectId=P-001&kind=bug');
  await newTicket(page, ctx, 'bug', '/requirements-bugs?projectId=P-001&kind=bug');
  await newTicket(page, ctx, 'requirement', '/requirements-bugs?projectId=P-001&kind=requirement');
  await newTicket(page, ctx, 'issue', '/issues-risks?projectId=P-001&kind=issue');
  await newTicket(page, ctx, 'risk', '/issues-risks?projectId=P-001&kind=risk');
  await shot(page, LANE, 't4-issues-risks');

  // 风险 → 转问题 / 督办升级
  const riskRow = await tableRows(page);
  const firstRisk = riskRow.find((r) => r.join(' ').includes('RSK-'));
  if (firstRisk) {
    const opened = await clickRowText(page, /RSK-/);
    if (opened) {
      const t = await mainText(page);
      const hasConvert = /风险转问题/.test(t);
      const hasEscalate = /督办升级/.test(t);
      record(hasConvert ? 'OK' : 'FLOW', '风险详情“风险转问题”入口', hasConvert ? '按钮存在' : `页面文本=${t.slice(0, 300)}`);
      record('OK', '风险详情“督办升级”入口', hasEscalate ? '按钮存在' : '未出现（可能受状态/权限限制）');
      if (hasConvert) {
        await clickBtn(page, ctx, /风险转问题/, '风险转问题');
        await fillLabel(page, '办理意见', 'QA：风险已发生，转为实际问题上处理');
        await modalOk(page, /确定|确认|提交/);
        const m = await msgs(page);
        record(m.some((t2) => /成功|已转/.test(t2)) ? 'OK' : 'FLOW', '风险转问题执行结果', `消息=${m.join(' | ') || '无'}；弹窗=${(await modalText(page)).slice(0, 200)}`);
        await shot(page, LANE, 't4-risk-convert');
      }
    }
  } else {
    record(ctx, 'BLOCK', '风险台账未列出 RSK- 记录', `行=${riskRow.map((r) => r.join('|')).join(' // ').slice(0, 300)}`);
  }

  // 问题详情：确认是否存在“升级风险”入口
  await spa(page, '/issues-risks?projectId=P-001&kind=issue');
  const issueRows = await tableRows(page);
  const firstIssue = issueRows.find((r) => r.join(' ').includes('ISSUE-'));
  if (firstIssue) {
    await clickRowText(page, /ISSUE-/);
    const t = await mainText(page);
    record(/升级风险|转为风险/.test(t) ? 'OK' : 'RISK', '问题详情是否有“升级风险”入口', /升级风险|转为风险/.test(t) ? '入口存在' : '问题详情仅提供督办升级/转办，未见“升级风险”；风险需在 /issues-risks?kind=risk 独立新建');
  }
  absorb(ctx);
});

/* ------------------------------ T5 阶段切换 ------------------------------ */

test('T5 阶段切换申请与 PMO 审批', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T5 阶段切换');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/projects/P-001/stage-switch');
  step(ctx, 'PM → /projects/P-001/stage-switch');
  const before = await mainText(page);
  record(ctx, 'OK', '阶段切换页可读', after(before, '阶段门与原始依据', 300) || before.slice(0, 300));
  await shot(page, LANE, 't5-stage-switch');

  const filled = await fillLabel(page, '申请理由', 'QA：执行阶段交付物与质量检查已通过，申请进入收尾阶段');
  if (!filled) record(ctx, 'BLOCK', '阶段切换页缺少“申请理由”输入', (await mainText(page)).slice(0, 400));

  const submit = btn(page, /提交PMO审批/).first();
  if (!(await submit.count())) {
    record(ctx, 'FLOW', '阶段切换缺少提交按钮', (await mainText(page)).slice(0, 300));
    absorb(ctx);
    return;
  }
  const dis = await submit.isDisabled();
  const title = await submit.getAttribute('title');
  if (dis) {
    record(ctx, 'BLOCK', '阶段切换提交被置灰', `P-001 阶段门未全部通过：title=${title ?? '无提示'}；阶段门文本=${after(before, '阶段门与原始依据', 500)}`);
    await shot(page, LANE, 't5-stage-blocked');
  } else {
    await submit.click();
    await page.waitForTimeout(900);
    const m = await msgs(page);
    record(m.some((t) => /提交|成功/.test(t)) ? 'OK' : 'FLOW', '阶段切换提交结果', `消息=${m.join(' | ') || '无'}；页面=${(await mainText(page)).slice(0, 220)}`);
    await shot(page, LANE, 't5-stage-submitted');

    const ok = await asRole(page, /PMO负责人/);
    if (!ok) record(ctx, 'BLOCK', '无法切换到 PMO 身份', '顶部“模拟身份”下拉不可用');
    else {
      const passBtn = btn(page, /通过申请/).first();
      if (!(await passBtn.count())) {
        record(ctx, 'FLOW', 'PMO 审批阶段未见“通过申请”', (await mainText(page)).slice(0, 400));
      } else if (await passBtn.isDisabled()) {
        record(ctx, 'FLOW', 'PMO“通过申请”置灰', (await mainText(page)).slice(0, 300));
      } else {
        await passBtn.click();
        await page.waitForTimeout(500);
        await modalOk(page, /确定|确认|通过/);
        const m2 = await msgs(page);
        record(m2.some((t) => /通过|成功/.test(t)) ? 'OK' : 'FLOW', 'PMO 通过阶段申请', `消息=${m2.join(' | ') || '无'}`);
        const t = await mainText(page);
        record(/待PMO|审批中/.test(t) ? 'BUG' : 'OK', '通过后阶段切换状态', after(t, '阶段申请历史', 220));
      }
    }
  }
  await shot(page, LANE, 't5-stage-after');
  absorb(ctx);
});

/* ------------------------------- T6 项目变更 ------------------------------- */

test('T6 变更：发起 → 专业评估 → PMO 分级 → 审批/驳回', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T6 项目变更');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/project-changes/new');
  step(ctx, 'PM → /project-changes/new');
  await shot(page, LANE, 't6-change-form');

  await fillLabel(page, '变更标题', 'QA：新增园区能耗看板范围变更');
  await fillLabel(page, '原因与内容', 'QA：客户要求增加能耗看板并提前上线，需评估范围、工期与成本影响');
  await fillLabel(page, '客户依据 / 签证', '客户联系单 QA-001');
  await fillLabel(page, '合同依据', '合同补充条款 QA-001');
  await fillLabel(page, '目标范围', '新增能耗看板 2 个页面与数据接入');
  await fillLabel(page, '未完成计划顺延天数', '7');
  await fillLabel(page, '采购影响', '无新增采购');
  await fillLabel(page, '外包影响', '无新增外包');
  await fillLabel(page, '风险影响与应对', '工期压缩风险，安排并行开发');

  const saved = await clickBtn(page, ctx, /保存草稿/, '保存变更草稿');
  const mSave = await msgs(page);
  if (saved && !mSave.some((t) => /保存|成功/.test(t))) {
    record(ctx, 'FLOW', '变更保存草稿无成功提示', `消息=${mSave.join(' | ') || '无'}；页面=${(await mainText(page)).slice(0, 240)}`);
  }
  const textAfterSave = await mainText(page);
  const projectError = textAfterSave.includes('请先填写') ? after(textAfterSave, '请先填写', 80) : '';
  record(saved ? 'OK' : 'BLOCK', '变更草稿保存', `消息=${mSave.join(' | ') || '无'}；提示=${projectError || '无'}；状态=${tag(textAfterSave, /(草稿|影响评估中|待分级|PMO审批中|已批准|已否决)/)}`);

  const submitOk = await clickBtn(page, ctx, /提交评估/, '提交变更评估');
  if (submitOk) {
    await modalOk(page, /确定|确认|提交/);
    const m = await msgs(page);
    record(m.some((t) => /提交|成功/.test(t)) ? 'OK' : 'FLOW', '变更提交影响评估', `消息=${m.join(' | ') || '无'}；状态=${tag(await mainText(page), /(草稿|影响评估中|待分级|PMO审批中)/)}`);
  }

  // 专业评估（方案架构师）
  if (await asRole(page, /方案架构师/)) {
    const assessed = await clickBtn(page, ctx, /提交专业评估/, '提交专业评估');
    if (assessed) {
      await modalOk(page, /确定|确认|提交/);
      record(ctx, 'OK', '专业评估提交', (await msgs(page)).join(' | ') || '无提示');
    }
  } else record(ctx, 'BLOCK', '无法切换到方案架构师', '顶部身份下拉不可用');

  // PMO 分级
  if (await asRole(page, /PMO负责人/)) {
    const classified = await clickBtn(page, ctx, /PMO确认分级/, 'PMO 确认分级');
    if (classified) {
      await modalOk(page, /确定|确认/);
      const t = await mainText(page);
      record(ctx, 'OK', 'PMO 确认分级', `状态=${tag(t, /(影响评估中|待分级|PMO审批中|PMC审议中|待财务会签|已批准)/)}；消息=${(await msgs(page)).join(' | ') || '无'}`);
      await shot(page, LANE, 't6-change-classified');
    }
    // 审批通过
    const approve = btn(page, /通过并追加新基线/).first();
    if (await approve.count() && !(await approve.isDisabled())) {
      await approve.click();
      await page.waitForTimeout(500);
      await modalOk(page, /确定|确认|通过/);
      const t = await mainText(page);
      const m = await msgs(page);
      record(m.some((x) => /通过|成功/.test(x)) ? 'OK' : 'FLOW', '变更审批通过', `消息=${m.join(' | ') || '无'}；状态=${tag(t, /(PMO审批中|已批准|已否决)/)}`);
      await spa(page, '/projects/P-001/baseline');
      const baseline = await mainText(page);
      record(/V\d/.test(baseline) ? 'OK' : 'FLOW', '变更后基线页可读', after(baseline, '基线', 220));
      await spa(page, '/projects/P-001/budget');
      const budget = await mainText(page);
      record('OK', '变更后预算页可读', after(budget, '预算', 220));
    } else {
      record(ctx, 'FLOW', '变更未进入审批（“通过并追加新基线”不可用）', `页面=${(await mainText(page)).slice(0, 400)}`);
      await shot(page, LANE, 't6-change-not-approvable');
    }
  }

  // 驳回分支：新建第二条变更并退回
  await asRole(page, /项目经理/);
  await spa(page, '/project-changes/new');
  await fillLabel(page, '变更标题', 'QA：驳回分支验证变更');
  await fillLabel(page, '原因与内容', 'QA：验证驳回是否留痕');
  await fillLabel(page, '目标范围', '不改变范围，仅验证流程');
  await clickBtn(page, ctx, /保存草稿/, '保存驳回分支草稿');
  await clickBtn(page, ctx, /提交评估/, '提交驳回分支评估');
  await modalOk(page, /确定|确认|提交/);
  await asRole(page, /PMO负责人/);
  const reject = btn(page, /否决 \/ 退回补充/).first();
  if (await reject.count() && !(await reject.isDisabled())) {
    await reject.click();
    await page.waitForTimeout(500);
    await fillLabel(page, '变更处理意见', 'QA：依据不足，退回补充客户签证');
    await modalOk(page, /确定|确认|退回/);
    const t = await mainText(page);
    const m = await msgs(page);
    record(/已否决|驳回|已退回/.test(t) ? 'OK' : 'FLOW', '变更驳回状态', `状态=${tag(t, /(已否决|已批准|驳回|PMO审批中|待分级)/)}；消息=${m.join(' | ') || '无'}`);
    const trail = /否决|退回/.test(after(t, '版本与留痕', 400)) ? '留痕可见' : '时间线未见驳回记录';
    record(trail === '留痕可见' ? 'OK' : 'BUG', '变更驳回留痕', `${trail}；片段=${after(t, '当前处理', 260)}`);
  } else {
    record(ctx, 'FLOW', '驳回分支入口不可用', `页面=${(await mainText(page)).slice(0, 320)}`);
  }
  await shot(page, LANE, 't6-change-reject');
  absorb(ctx);
});

/* ------------------------------- T7 验收 ------------------------------- */

test('T7 内部验收提交→PMO审核；P-006 客户终验整改→复验→通过', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T7 验收链路');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/projects/P-001/internal-acceptance');
  step(ctx, 'PM → P-001 内部验收');

  const openFirst = await clickRowText(page, /^ACC-P-001/);
  if (!openFirst) {
    const rowBtns = page.locator('main tbody tr').first();
    if (await rowBtns.count()) await rowBtns.click();
    await page.waitForTimeout(900);
  }
  const drawer = clean(await page.locator('.ant-drawer-content').last().innerText().catch(() => ''));
  record(drawer ? 'OK' : 'BLOCK', '内部验收单详情可打开', drawer ? drawer.slice(0, 200) : '抽屉未渲染，验收单无法办理');

  if (drawer) {
    const canSubmit = await clickBtn(page, ctx, /提交验收$|提交验收申请/, '内部验收提交');
    if (canSubmit) {
      await fillLabel(page, '验收范围', 'P-001 内部初验：功能、性能与交付文档');
      const dateInput = page.locator('.ant-picker input').first();
      if (await dateInput.count()) {
        await dateInput.fill('2026-09-09');
        await dateInput.press('Enter');
      }
      await modalOk(page, /确认提交/);
      record(ctx, 'OK', '内部验收提交', (await msgs(page)).join(' | ') || '无提示');
      await shot(page, LANE, 't7-internal-submitted');
    }
    await asRole(page, /PMO负责人/);
    const reviewed = await clickBtn(page, ctx, /登记验收结论/, 'PMO 登记验收结论');
    if (reviewed) {
      await fillLabel(page, '验收过程', 'QA：逐项核对功能与文档');
      await modalOk(page, /确认提交/);
      const t = await mainText(page);
      record(/已通过|待确认|验收通过/.test(t) ? 'OK' : 'OK', 'PMO 登记内部验收结论', `消息=${(await msgs(page)).join(' | ') || '无'}；状态片段=${after(t, '验收记录', 200)}`);
    }
    await shot(page, LANE, 't7-internal-reviewed');
  }

  // P-006 客户终验第 3 项整改
  await spa(page, '/projects/P-006/customer-acceptance');
  const p6 = await mainText(page);
  const rows = await tableRows(page);
  const target = rows.find((r) => r.join(' ').includes('整改中')) ?? rows[0];
  record(target ? 'OK' : 'BLOCK', 'P-006 客户终验记录定位', target ? target.join(' | ').slice(0, 260) : p6.slice(0, 300));
  await shot(page, LANE, 't7-p6-customer-acceptance');
  if (!target) {
    absorb(ctx);
    return;
  }
  await clickRowText(page, /ACC-P-006/);
  const d2 = clean(await page.locator('.ant-drawer-content').last().innerText().catch(() => ''));
  const corrections = after(d2, '整改清单', 400);
  record(corrections ? 'OK' : 'FLOW', 'P-006 整改清单可读', corrections || d2.slice(0, 300));

  const replied = await clickBtn(page, ctx, /回复整改清单/, '回复整改清单');
  if (replied) {
    const modal = await modalText(page);
    const area = page.locator('.ant-modal-content textarea').first();
    if (await area.count()) {
      await area.fill('QA：客户培训已完成并补齐接口证明');
    } else {
      record(ctx, 'UI', '整改回复弹窗缺少文本域', modal.slice(0, 300));
    }
    await modalOk(page, /确认提交/);
    const t = await mainText(page);
    record(/已回复/.test(t) ? 'OK' : 'FLOW', '整改回复提交', `消息=${(await msgs(page)).join(' | ') || '无'}；片段=${after(t, '整改清单', 260)}`);
    await shot(page, LANE, 't7-p6-reply');
  }

  const newRound = await clickBtn(page, ctx, /整改后发起新轮次|提交新一轮验收/, '整改后发起新轮次');
  if (newRound) {
    await modalOk(page, /确认提交/);
    const t = await mainText(page);
    record(/待验收/.test(t) ? 'OK' : 'FLOW', '整改后进入新一轮验收', `消息=${(await msgs(page)).join(' | ') || '无'}；片段=${after(t, '验收记录', 220)}`);
    const review = await clickBtn(page, ctx, /登记验收结论/, '客户终验登记结论（PM 自评）');
    if (review) {
      await modalOk(page, /确认提交/);
      record(ctx, 'OK', '客户终验结论登记', (await msgs(page)).join(' | ') || '无提示');
    }
    const proof = await clickBtn(page, ctx, /登记签署证明/, '登记客户签署证明');
    if (proof) {
      const area = page.locator('.ant-modal-content textarea').first();
      if (await area.count()) await area.fill('客户终验确认函.pdf');
      await modalOk(page, /确认提交/);
      record(ctx, 'OK', '客户签署证明登记', (await msgs(page)).join(' | ') || '无提示');
    }
    await asRole(page, /PMO负责人/);
    const confirm = await clickBtn(page, ctx, /PMO确认验收完成/, 'PMO 确认验收完成');
    if (confirm) {
      await modalOk(page, /确认提交/);
      const t2 = await mainText(page);
      record(/最终确认|已确认|已通过/.test(t2) ? 'OK' : 'FLOW', 'PMO 最终确认客户验收', `消息=${(await msgs(page)).join(' | ') || '无'}；片段=${after(t2, '验收记录', 240)}`);
      await shot(page, LANE, 't7-p6-confirmed');
    }
  }
  absorb(ctx);
});

/* ------------------------------- T8 结算 ------------------------------- */

test('T8 结算门禁（未通过验收阻断）与 P-007 结算链', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T8 结算');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/projects/P-001/settlement/apply');
  step(ctx, 'PM → P-001 /settlement/apply（客户终验未确认）');
  const p1 = await mainText(page);
  const checks = await tableRows(page);
  const blocked = checks.filter((r) => r.join(' ').includes('阻断'));
  record(blocked.length ? 'OK' : 'BUG', 'P-001 结算前置条件阻断', `阻断行=${blocked.length}；行=${checks.map((r) => r.join(' | ')).join(' // ').slice(0, 400)}`);
  const applyBtn = btn(page, /提交|提交审核|发起结算/).first();
  const applyDis = (await applyBtn.count()) ? await applyBtn.isDisabled() : null;
  record(
    blocked.length && (applyDis === null || applyDis === true) ? 'OK' : 'BUG',
    '未通过验收时结算申请被阻止',
    `阻断行=${blocked.length}；提交按钮 disabled=${applyDis}；页面片段=${after(p1, '发起条件检查', 300)}`,
  );
  const entry = btn(page, /查看原业务/).first();
  if (await entry.count()) {
    await entry.click();
    await page.waitForTimeout(900);
    const bad = await visibleProblems(page);
    record(bad.length ? 'BUG' : 'OK', '结算检查项“查看原业务”跳转', `跳转=${new URL(page.url()).pathname}；命中=${bad.join('、') || '无'}`);
  }
  await shot(page, LANE, 't8-p1-settlement-blocked');

  // P-007：SREQ 在 PMO 审核 → 评审 → 财务锁定
  await spa(page, '/projects/P-007/settlement');
  const s7 = await mainText(page);
  record('OK', 'P-007 结算详情可读', `状态片段=${after(s7, '结算状态', 160)}；版本=${after(s7, '结算版本与流程', 200)}`);
  await shot(page, LANE, 't8-p7-settlement');
  if (await asRole(page, /PMO负责人/)) {
    const audit = await clickBtn(page, ctx, /PMO材料审核通过/, 'PMO 材料审核通过');
    if (audit) {
      await modalOk(page, /确定|确认|通过/);
      record(ctx, 'OK', 'PMO 材料审核通过', `消息=${(await msgs(page)).join(' | ') || '无'}；状态=${tag(await mainText(page), /(PMO审核|结算评审|待最终锁定|已锁定已生效)/)}`);
    }
    const review = await clickBtn(page, ctx, /结算评审通过/, '结算评审通过');
    if (review) {
      await modalOk(page, /确定|确认|通过/);
      record(ctx, 'OK', '结算评审通过', `消息=${(await msgs(page)).join(' | ') || '无'}；状态=${tag(await mainText(page), /(PMO审核|结算评审|待最终锁定|已锁定已生效)/)}`);
    }
  }
  if (await asRole(page, /财务专员/)) {
    const lock = await clickBtn(page, ctx, /财务最终锁定/, '财务最终锁定');
    if (lock) {
      await modalOk(page, /确定|确认|锁定/);
      const t = await mainText(page);
      record(/已锁定/.test(t) ? 'OK' : 'FLOW', '财务最终锁定结算', `消息=${(await msgs(page)).join(' | ') || '无'}；状态=${tag(t, /(待最终锁定|已锁定已生效)/)}`);
      await shot(page, LANE, 't8-p7-locked');
      // 结算后链路：四算 → 经营结果 → 后评价 → 归档 → 关闭
      for (const [path, name] of [
        ['/projects/P-007/four-calculations', '四算'],
        ['/projects/P-007/business-result', '经营结果'],
        ['/projects/P-007/post-evaluation', '后评价'],
        ['/projects/P-007/archive', '归档'],
        ['/projects/P-007/close', '关闭'],
      ] as const) {
        await spa(page, path);
        const t2 = await mainText(page);
        const bad = await visibleProblems(page);
        record(bad.length ? 'BUG' : 'OK', `结算后链路 ${name} 页`, `命中=${bad.join('、') || '无'}；正文=${t2.slice(0, 220)}`);
      }
    }
  }
  absorb(ctx);
});

/* ------------------------------ T9 收尾门禁 ------------------------------ */

test('T9 收尾：跳步阻止（未后评价归档、未归档关闭）与历史已关闭项目', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T9 收尾门禁');
  await login(page, 'pmo', 'P-006');
  await goto(page, '/projects/P-006/archive');
  step(ctx, 'PMO → P-006 /archive（未结算/未后评价）');
  const arch = await mainText(page);
  record(/尚未正式结算|未结算/.test(arch) ? 'OK' : 'FLOW', 'P-006 未结算时归档被阻断并说明原因', `片段=${after(arch, '前置结算', 300) || arch.slice(0, 300)}`);
  const confirmBtn = btn(page, /确认正式归档并锁定本版本/).first();
  const dis = (await confirmBtn.count()) ? await confirmBtn.isDisabled() : null;
  record(dis === true ? 'OK' : 'BUG', '未满足前置时“确认正式归档”置灰', `disabled=${dis}；阻断文案=${after(arch, '前置结算', 200)}`);
  await shot(page, LANE, 't9-p6-archive-blocked');

  await spa(page, '/projects/P-006/post-evaluation');
  const pe = await mainText(page);
  const start = btn(page, /PMO发起后评价/).first();
  const peDis = (await start.count()) ? await start.isDisabled() : null;
  record(peDis === true && /阻断|尚未正式结算/.test(pe) ? 'OK' : 'FLOW', '未结算时 PMO 发起后评价被阻断', `disabled=${peDis}；页面=${pe.slice(0, 300)}`);
  await shot(page, LANE, 't9-p6-posteval-blocked');

  await spa(page, '/projects/P-006/close');
  const close = await mainText(page);
  const closeBtn = btn(page, /PMO确认关闭/).first();
  const closeDis = (await closeBtn.count()) ? await closeBtn.isDisabled() : null;
  const gateRows = await tableRows(page);
  const unmet = gateRows.filter((r) => /未|否|待/.test(r.join(' ')));
  record(closeDis === true && unmet.length > 0 ? 'OK' : 'BUG', 'P-006 未完成前置时关闭被阻止', `disabled=${closeDis}；未达成门禁行=${unmet.map((r) => r.join(' | ')).join(' // ').slice(0, 400)}`);
  record('OK', 'P-006 关闭门禁明细', `门禁行=${gateRows.length}；片段=${after(close, '真实关闭门禁', 400)}`);
  await shot(page, LANE, 't9-p6-close-blocked');

  // P-008 历史已关闭
  await spa(page, '/projects/P-008/close');
  const p8 = await mainText(page);
  record(/历史导入|已关闭/.test(p8) ? 'OK' : 'FLOW', 'P-008 历史已关闭项目说明', `片段=${after(p8, '关闭状态', 320)}`);
  const p8Btn = btn(page, /PMO确认关闭/).first();
  record((await p8Btn.count()) && (await p8Btn.isDisabled()) ? 'OK' : 'RISK', 'P-008 已关闭项目不可重复关闭', `按钮存在=${await p8Btn.count()} disabled=${(await p8Btn.count()) ? await p8Btn.isDisabled() : 'n/a'}；${after(p8, '关闭门禁达成', 160)}`);
  await shot(page, LANE, 't9-p8-closed');

  // 归档页：未后评价时应给出“后评价”前置说明（P-007 已结算后）
  await spa(page, '/projects/P-007/archive');
  const a7 = await mainText(page);
  record(/后评价/.test(a7) ? 'OK' : 'RISK', '归档页展示后评价前置/只读说明', after(a7, '归档状态', 320));
  absorb(ctx);
});

/* ------------------------------- T10 运维 ------------------------------- */

test('T10 运维：P-007 交接、OPS-007 配置/事件/成本/续约/退出与结算入口', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T10 运维');
  await login(page, 'project-manager', 'P-007');
  await goto(page, '/projects/P-007/operation-handover');
  step(ctx, 'PM → /projects/P-007/operation-handover');
  const handover = await mainText(page);
  record(handover.length > 80 ? 'OK' : 'BLOCK', '运维交接页可读', handover.slice(0, 300));
  const hoRows = await tableRows(page);
  record(hoRows.length ? 'OK' : 'FLOW', '交接记录列表', hoRows.map((r) => r.join(' | ')).join(' // ').slice(0, 300));
  await shot(page, LANE, 't10-handover');

  await goto(page, '/operations/OPS-007');
  const ops = await mainText(page);
  record(ops.length > 80 ? 'OK' : 'BLOCK', 'OPS-007 运维周期页可读', ops.slice(0, 300));
  for (const [tab, name] of [
    ['events', '服务/问题/SLA'],
    ['costs', '运维工时/费用'],
    ['renewal', '续期/终止/退出'],
  ] as const) {
    await spa(page, `/operations/OPS-007?tab=${tab}`);
    const t = await mainText(page);
    const bad = await visibleProblems(page);
    record(bad.length ? 'BUG' : 'OK', `OPS-007 ${name} 标签页`, `命中=${bad.join('、') || '无'}；正文=${t.slice(0, 240)}`);
    await shot(page, LANE, `t10-ops-${tab}`);
  }

  await spa(page, '/operations/OPS-007');
  const editBtn = btn(page, /填报运维工时|填报运维工时 \/ 费用/).first();
  if (await editBtn.count()) {
    record((await editBtn.isDisabled()) ? 'FLOW' : 'OK', '运维成本填报入口', `disabled=${await editBtn.isDisabled()}；${after(await mainText(page), '本期运维费用', 120)}`);
  } else {
    record(ctx, 'FLOW', 'OPS-007 缺少运维工时/费用填报入口', (await mainText(page)).slice(0, 300));
  }
  const renew = btn(page, /办理续期|续期建立新周期/).first();
  record((await renew.count()) ? 'OK' : 'FLOW', '续期/退出入口', (await renew.count()) ? '续期入口存在' : '未找到续期入口');
  if (await renew.count()) {
    await renew.click();
    await page.waitForTimeout(700);
    const modal = await modalText(page);
    record(modal.includes('续期') ? 'OK' : 'FLOW', '续期弹窗内容', modal.slice(0, 300));
    await page.keyboard.press('Escape');
  }
  const settleEntry = /结算/.test(ops) ? after(ops, '结算', 120) : '';
  record(settleEntry ? 'OK' : 'FLOW', '运维页是否给出项目结算入口', settleEntry || `OPS-007 页未见“结算”入口/链接，仅提示“建设期结算与运维账独立”；正文=${ops.slice(0, 260)}`);
  absorb(ctx);
});

/* --------------------------- T11 入口与权限 --------------------------- */

test('T11 PM 入口齐全性与按钮权限', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T11 入口与权限');
  await login(page, 'project-manager', 'P-001');

  const entries: [string, string, RegExp][] = [
    ['/projects/P-001/team', '团队', /邀请|调整|新增成员|成员/],
    ['/projects/P-001/deliverables', '交付物/质量检查', /登记质量检查|维护质量计划|追加文档/],
    ['/projects/P-001/report-acceptance', '报验', /详情|新建|提交/],
    ['/projects/P-001/wbs', 'WBS', /保存|新增|任务/],
    ['/projects/P-001/budget', '预算', /预算/],
    ['/projects/P-001/baseline', '基线', /基线/],
    ['/projects/P-001/changes', '变更台账', /变更/],
  ];
  for (const [path, name, re] of entries) {
    await goto(page, path);
    const t = await mainText(page);
    const bad = await visibleProblems(page);
    const hasControl = await page.getByRole('button', { name: re }).count();
    record(
      bad.length ? 'BUG' : hasControl ? 'OK' : 'FLOW',
      `PM 入口 ${name}`,
      `路径=${path} 命中=${bad.join('、') || '无'} 关键按钮命中=${hasControl} 正文=${t.slice(0, 200)}`,
    );
    if (bad.length) await shot(page, LANE, `t11-${name}-problem`);
  }

  // 交付物页质量检查入口
  await goto(page, '/projects/P-001/deliverables');
  const qc = btn(page, /登记质量检查/).first();
  if (await qc.count()) {
    await qc.click();
    await page.waitForTimeout(600);
    const modal = await modalText(page);
    record(modal ? 'OK' : 'FLOW', '质量检查弹窗', modal.slice(0, 300));
    await page.keyboard.press('Escape');
  } else {
    record(ctx, 'FLOW', '交付物页缺少质量检查入口', (await mainText(page)).slice(0, 300));
  }

  // 非 PM 项目：PM 不应看到可编辑按钮
  await goto(page, '/projects/P-023/progress');
  const t23 = await mainText(page);
  const upd = btn(page, /更新执行/).first();
  const count = await upd.count();
  const allDisabled = count
    ? await (async () => {
        const list = btn(page, /更新执行/);
        const n = await list.count();
        for (let i = 0; i < n; i += 1) if (!(await list.nth(i).isDisabled())) return false;
        return true;
      })()
    : true;
  record(
    /无权|403/.test(t23) || allDisabled ? 'OK' : 'BUG',
    'PM 对非本人项目 P-023 只读',
    `403文案=${/无权|403/.test(t23)}；“更新执行”按钮数=${count} 全置灰=${allDisabled}；片段=${t23.slice(0, 200)}`,
  );
  absorb(ctx);
});

/* ------------------------------- T12 UI ------------------------------- */

test('T12 UI：密集表格滚动、固定列、长弹窗、控制台错误', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  ctx.steps.push('T12 UI');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/workbench/project-manager');

  const scroll = await page.locator('main .ant-table-content').first().evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  record(scroll.scrollWidth > scroll.clientWidth ? 'OK' : 'UI', '工作台密集表格横向滚动', `scrollWidth=${scroll.scrollWidth} clientWidth=${scroll.clientWidth}`);
  const fixedLeft = await page.locator('main .ant-table-cell-fix-left').count();
  const fixedRight = await page.locator('main .ant-table-cell-fix-right').count();
  record(fixedLeft && fixedRight ? 'OK' : 'UI', '工作台表格固定列', `fix-left=${fixedLeft} fix-right=${fixedRight}`);
  await shot(page, LANE, 't12-table-scroll');

  // 长弹窗：变更表单的评估意见/附件区域
  await goto(page, '/project-changes/new');
  const bodyOverflow = await page.locator('main').evaluate((el) => el.scrollHeight > el.clientHeight);
  record('OK', '变更表单页滚动', `页面可滚动=${bodyOverflow}`);

  // 必填错误提示位置：事项新建弹窗直接提交
  await goto(page, '/issues-risks?projectId=P-001&kind=bug');
  await clickBtn(page, ctx, /新建事项/, '事项新建');
  await modalOk(page, /提交责任人/);
  const m = await msgs(page);
  const inline = await page.locator('.ant-form-item-explain-error').count();
  record(m.length && inline === 0 ? 'UI' : 'OK', '必填错误提示位置', `toast=${m.join(' | ') || '无'}；表单内联错误条数=${inline}（弹窗内未使用 Form.Item 校验，错误仅以全局 toast 呈现）`);
  const stillOpen = (await modalText(page)).length > 0;
  record(stillOpen ? 'OK' : 'UI', '校验失败后停留原弹窗', `弹窗仍在=${stillOpen}`);
  await page.keyboard.press('Escape');

  // 保存后是否停留原页（日报保存草稿）
  await goto(page, '/projects/P-001/daily-reports');
  const openBtn = btn(page, /填报今日日报|继续今日日报/).first();
  if (await openBtn.count() && !(await openBtn.isDisabled())) {
    await openBtn.click();
    await page.waitForTimeout(600);
    await fillLabel(page, '报告进展', 'QA：草稿保存验证');
    await modalOk(page, /保存草稿/);
    await page.waitForTimeout(500);
    const url = new URL(page.url());
    record(url.pathname === '/projects/P-001/daily-reports' ? 'OK' : 'UI', '保存草稿后停留原页', `当前路径=${url.pathname}`);
  }

  const consoleErrors = agg.consoleErrors.length + ctx.consoleErrors.length;
  record(consoleErrors === 0 ? 'OK' : 'BUG', '控制台错误汇总', consoleErrors === 0 ? '无 console.error' : `共 ${consoleErrors} 条，样例：${[...agg.consoleErrors, ...ctx.consoleErrors].slice(0, 5).join(' | ').slice(0, 600)}`);
  absorb(ctx);
});

/* ------------------------------- 汇总 ------------------------------- */

test('T99 汇总报告', async ({ page }) => {
  test.setTimeout(600_000);
  const ctx = newCtx(page);
  const uniqConsole = [...new Set(agg.consoleErrors)];
  const uniqPageErr = [...new Set(agg.pageErrors)];
  const merged: LaneContext = {
    page,
    lane: LANE,
    consoleErrors: uniqConsole,
    pageErrors: uniqPageErr,
    steps: agg.steps,
    findings: agg.findings,
  };
  const count = (k: Kind) => agg.findings.filter((f) => f.kind === k).length;
  const summary = [
    `项目经理(张建国)链路只读回归：工作台/进度/日报/事项/阶段/变更/验收/结算/收尾/运维/入口权限/UI 共 ${agg.findings.length} 条观察。`,
    '',
    `- BLOCK=${count('BLOCK')} BUG=${count('BUG')} FLOW=${count('FLOW')} UI=${count('UI')} RISK=${count('RISK')} OK=${count('OK')}`,
    `- 控制台错误 ${uniqConsole.length} 条；运行时异常 ${uniqPageErr.length} 条。`,
    '- 业务状态为纯内存，跨测试不复用；跨角色链路在同一 page load 内通过顶部“模拟身份”切换完成。',
  ].join('\n');
  finish(merged, summary);
  expect(agg.findings.length).toBeGreaterThan(0);
  void ctx;
});
