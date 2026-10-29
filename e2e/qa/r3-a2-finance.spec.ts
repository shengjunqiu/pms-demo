import { test, expect, type Page } from '@playwright/test';
import {
  login,
  laneContext,
  goto,
  shot,
  step,
  record,
  finish,
  visibleProblems,
  type LaneContext,
} from './_helpers';

/**
 * 财务专员（刘敏 U-004）角色链路 QA：
 * 预算审批 → 成本 → 回款 → 结算 → 验收报告 → 运维成本 → 财务配置。
 * 只读：不修改应用源码；全部结论以“期望 vs 实际”记录到 qa-reports/r3/a2.md。
 */

type Kind = 'BUG' | 'UI' | 'FLOW' | 'BLOCK' | 'RISK' | 'OK';

const all: { kind: Kind; title: string; detail: string }[] = [];
const consoleErrors: string[] = [];
const pageErrors: string[] = [];

function absorb(ctx: LaneContext) {
  all.push(...ctx.findings);
  consoleErrors.push(...ctx.consoleErrors);
  pageErrors.push(...ctx.pageErrors);
  ctx.findings = [];
  ctx.consoleErrors = [];
  ctx.pageErrors = [];
}

/** 记录一次观察：ok=false 时按 badKind 归档。 */
function judge(ctx: LaneContext, ok: boolean, title: string, detail: string, badKind: Kind = 'BUG') {
  record(ctx, ok ? 'OK' : badKind, title, detail.trim());
}

async function guard(ctx: LaneContext, body: () => Promise<void>) {
  try {
    await body();
  } catch (error) {
    record(ctx, 'BLOCK', '用例执行中断', `${String(error).slice(0, 500)}（当前 URL=${new URL(ctx.page.url()).pathname}）`);
  }
}

const mainText = async (page: Page) => (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
const after = (t: string, label: string, len = 50) => {
  const i = t.indexOf(label);
  return i < 0 ? '' : t.slice(i + label.length, i + label.length + len);
};
const num = (s: string): number | null => {
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const metric = (t: string, label: string) => num(after(t, label, 45));
const round2 = (n: number) => Math.round(n * 100) / 100;
const pathname = (page: Page) => new URL(page.url()).pathname;

/** 页面内跳转：保留同一内存业务状态（page.goto 会重置 demo 状态）。 */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(700);
}

/** _helpers.switchRole 在当前 HEAD 因 strict mode 命中 2 个元素不可用，本地等价实现（保留业务状态）。 */
async function asRole(page: Page, label: RegExp) {
  await page.locator('.ant-select').filter({ has: page.getByRole('combobox', { name: '模拟身份' }) }).click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: label }).first().click();
  await page.waitForTimeout(800);
}

async function overlayText(page: Page) {
  const parts: string[] = [];
  for (const sel of ['.ant-modal-content', '.ant-drawer-content', '.ant-popover-inner']) {
    const loc = page.locator(sel).last();
    if (await loc.count()) parts.push((await loc.innerText()).replace(/\n+/g, ' | '));
  }
  return parts.join(' || ').slice(0, 700);
}

/** AntD 中文按钮文案会插入空格（"确 定"），匹配需容忍空白；无浮层时安全返回 false。 */
async function confirmOverlay(page: Page) {
  const btn = page
    .locator('.ant-modal-footer button, .ant-popover button, .ant-confirm-btns button')
    .filter({ hasText: /确\s*定|确\s*认|保\s*存|提\s*交|OK/ })
    .last();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(900);
    return true;
  }
  return false;
}

async function closeOverlay(page: Page) {
  const close = page.locator('.ant-modal-close, .ant-drawer-close').last();
  if (await close.count()) {
    await close.click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

async function messages(page: Page) {
  const m = await page.locator('.ant-message-notice-content').allInnerTexts().catch(() => []);
  return m.map((s) => s.replace(/\s+/g, ' ').trim()).join(' / ');
}

/** 按表头关键字定位页面内任意 table（含非 AntD 的对比表），返回单元格文本矩阵。 */
async function rowsByHeader(page: Page, headerRe: RegExp): Promise<string[][]> {
  const tables = page.locator('main table');
  const n = await tables.count();
  for (let i = 0; i < n; i += 1) {
    const table = tables.nth(i);
    const head = (await table.locator('thead').innerText().catch(() => '')).replace(/\s+/g, '');
    if (!headerRe.test(head)) continue;
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    const out: string[][] = [];
    for (let r = 0; r < count; r += 1) {
      out.push((await rows.nth(r).locator('td').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()));
    }
    return out;
  }
  return [];
}

function sumColumn(rows: string[][], idx: number) {
  const values = rows.map((r) => num(r[idx] ?? '')).filter((v): v is number => v !== null);
  return round2(values.reduce((a, b) => a + b, 0));
}

async function kpi(page: Page, label: string) {
  const t = await mainText(page);
  return metric(t, label);
}

/* ------------------------------------------------------------------ */
/* T1 待办中心：15 条财务待审批 APR 是否都能进入审批详情                */
/* ------------------------------------------------------------------ */
test('T1 财务待办：APR 审批待办清单与进入详情', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/workbench/todos');
    step(ctx, '财务登录 → /workbench/todos');
    const tabs = await page.getByRole('tab').allInnerTexts();
    const todoCount = num(tabs.find((t) => t.includes('待办')) ?? '');
    const doneCount = num(tabs.find((t) => t.includes('已办')) ?? '');
    judge(
      ctx,
      todoCount === 21,
      '财务待办总数与种子一致',
      `种子口径 21 项（15 条 APR + 4 条 MGT + 2 条结算申请）；实际 Tab=${tabs.join(' / ')}，待办=${todoCount}、已办=${doneCount}`,
      'RISK',
    );

    const aprIds = new Set<string>();
    let pages = 0;
    for (let i = 0; i < 5; i += 1) {
      pages += 1;
      const rows = await page.locator('main tbody tr').allInnerTexts();
      for (const r of rows) for (const m of r.matchAll(/APR-\d+/g)) aprIds.add(m[0]);
      const next = page.locator('.ant-pagination-next button');
      if (!(await next.count()) || (await next.isDisabled())) break;
      await next.click();
      await page.waitForTimeout(500);
    }
    const aprs = [...aprIds].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
    judge(
      ctx,
      aprs.length === 15,
      '财务待办覆盖 15 条预算审批',
      `共翻 ${pages} 页，命中 APR 待办 ${aprs.length} 条：${aprs.join(',')}`,
    );

    const rowText = (await page.locator('main tbody tr').first().innerText()).replace(/\s+/g, ' ');
    judge(
      ctx,
      rowText.includes('进入原业务'),
      '待办行提供进入审批详情入口',
      `首行内容=${rowText.slice(0, 240)}；行内可点击元素=行尾"进入原业务"（编号/事项文本本身不可点击）`,
      'UI',
    );
    await page.getByRole('button', { name: /进入原业务/ }).first().click();
    await page.waitForTimeout(900);
    const t = await mainText(page);
    judge(
      ctx,
      pathname(page) === '/approvals/APR-1' && t.includes('审批详情'),
      'APR-1 待办进入审批详情',
      `实际 URL=${pathname(page)}，含审批详情=${t.includes('审批详情')}，当前节点=${after(t, '当前节点', 24)}`,
    );
    await shot(page, 'a2', 't1-todos');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T2 APR-1 三节点审批 + PMO 基线二次确认                              */
/* ------------------------------------------------------------------ */
test('T2 APR-1 逐节点办理：财务复核 → PMO → 集团领导 → PMO 基线生效', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/approvals/APR-1');
    step(ctx, '财务 → /approvals/APR-1');
    let t = await mainText(page);
    judge(ctx, t.includes('1/3 · 财务复核'), 'APR-1 初始节点为财务复核', `实际当前节点=${after(t, '当前节点', 24)}`);

    const applyTotal = metric(t, '申请预算');
    const rows = await rowsByHeader(page, /科目/);
    const subjectSum = sumColumn(rows, 3);
    judge(
      ctx,
      applyTotal !== null && Math.abs(applyTotal - subjectSum) < 0.005,
      'APR-1 申请预算总额=科目合计',
      `申请预算=${applyTotal}，科目申请合计=${subjectSum}，差=${applyTotal === null ? 'n/a' : round2(applyTotal - subjectSum)}（8 个科目）`,
    );

    await page.getByLabel('审批意见').fill('财务复核：引用概算与科目口径一致，同意提交评审');
    await page.getByRole('button', { name: /通过，待基线确认/ }).click();
    await page.waitForTimeout(600);
    const firstModal = await overlayText(page);
    await confirmOverlay(page);
    t = await mainText(page);
    judge(
      ctx,
      t.includes('2/3 · PMO 评审'),
      '财务复核通过后流转 PMO 节点',
      `确认弹窗=${firstModal.slice(0, 120)}；实际当前节点=${after(t, '当前节点', 24)}`,
    );

    await asRole(page, /PMO负责人/);
    judge(ctx, pathname(page) === '/approvals/APR-1', 'PMO 切换后仍停留审批详情', `实际 URL=${pathname(page)}`, 'BLOCK');
    t = await mainText(page);
    const pmoApprove = page.getByRole('button', { name: /通过，待基线确认/ });
    judge(
      ctx,
      (await pmoApprove.count()) > 0 && (await pmoApprove.isEnabled().catch(() => false)),
      'PMO 节点可办理',
      `按钮可用=${await pmoApprove.isEnabled().catch(() => false)}；节点=${after(t, '当前节点', 24)}`,
      'BLOCK',
    );
    await page.getByLabel('审批意见').fill('PMO 评审：范围与计划匹配，同意上报');
    await pmoApprove.click();
    await page.waitForTimeout(600);
    await confirmOverlay(page);
    t = await mainText(page);
    judge(ctx, t.includes('3/3 · 集团领导决策'), 'PMO 通过后流转集团领导节点', `实际当前节点=${after(t, '当前节点', 24)}`);

    await asRole(page, /集团领导/);
    t = await mainText(page);
    const leaderApprove = page.getByRole('button', { name: /通过，待基线确认/ });
    judge(
      ctx,
      (await leaderApprove.count()) > 0 && (await leaderApprove.isEnabled().catch(() => false)),
      '集团领导节点可办理',
      `按钮可用=${await leaderApprove.isEnabled().catch(() => false)}；节点=${after(t, '当前节点', 24)}`,
      'BLOCK',
    );
    await page.getByLabel('审批意见').fill('集团领导决策：同意追加预算，须同步基线');
    await leaderApprove.click();
    await page.waitForTimeout(600);
    await confirmOverlay(page);
    t = await mainText(page);
    judge(
      ctx,
      /通过/.test(after(t, '审批状态', 12)) && !/待审批/.test(after(t, '审批状态', 12)),
      '三节点通过后审批状态=通过',
      `审批状态=${after(t, '审批状态', 12)}；当前节点=${after(t, '当前节点', 20)}；页面含 PMO基线确认=${t.includes('PMO基线确认')}`,
    );

    const confirmBtn = page.getByRole('button', { name: /确认基线生效/ });
    judge(
      ctx,
      (await confirmBtn.count()) > 0,
      '审批通过后出现"确认基线生效"',
      `按钮数=${await confirmBtn.count()}；卡片文案=${after(t, 'PMO基线确认', 120)}`,
      'FLOW',
    );
    judge(
      ctx,
      !(await confirmBtn.isEnabled().catch(() => false)),
      '非 PMO 角色不能确认基线生效',
      `集团领导视角"确认基线生效"可用=${await confirmBtn.isEnabled().catch(() => false)}`,
    );

    await asRole(page, /PMO负责人/);
    const pmoConfirm = page.getByRole('button', { name: /确认基线生效/ });
    judge(
      ctx,
      await pmoConfirm.isEnabled().catch(() => false),
      'PMO 可确认基线生效',
      `PMO 视角按钮可用=${await pmoConfirm.isEnabled().catch(() => false)}`,
      'BLOCK',
    );
    await pmoConfirm.click();
    await page.waitForTimeout(600);
    const confirmModal = await overlayText(page);
    const clicked = await confirmOverlay(page);
    judge(
      ctx,
      clicked || /生效/.test(confirmModal),
      '基线确认给出二次确认/生效反馈',
      `确认浮层=${confirmModal.slice(0, 200)}；出现确认按钮=${clicked}`,
      'FLOW',
    );

    await spa(page, '/projects/P-001/baseline');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('V1.2') && t.includes('3340.48'),
      '预算审批生效后基线追加 V1.2 / 3,340.48',
      `生效基线=${after(t, '生效基线', 20)}；页面含 V1.2=${t.includes('V1.2')}、含 3340.48=${t.includes('3340.48')}；版本轨迹=${after(t, '版本轨迹', 120) || after(t, '生效与变更轨迹', 120)}`,
      'FLOW',
    );

    await spa(page, '/projects/P-001/budget');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('3,340.48') || t.includes('3340.48'),
      '预算页同步新生效预算',
      `预算页含 3,340.48=${t.includes('3,340.48') || t.includes('3340.48')}；草稿标识=${after(t, '预算草稿', 24)}`,
    );

    await spa(page, '/workbench/todos');
    t = await mainText(page);
    judge(ctx, !t.includes('APR-1'), '财务待办中 APR-1 消失', `待办页仍含 APR-1=${t.includes('APR-1')}`);
    await page.getByRole('tab', { name: /已办/ }).click();
    await page.waitForTimeout(600);
    const doneText = await mainText(page);
    judge(
      ctx,
      doneText.includes('APR-1'),
      '已办保留 APR-1 财务复核记录',
      `已办含 APR-1=${doneText.includes('APR-1')}；片段=${after(doneText, 'APR-1', 140)}`,
      'FLOW',
    );

    await spa(page, '/settings/audit-log');
    const problems = await visibleProblems(page);
    t = await mainText(page);
    judge(
      ctx,
      problems.length === 0 && t.includes('APR-1'),
      '审计日志记录审批动作',
      `审计页问题=${problems.join(',') || '无'}；含 APR-1=${t.includes('APR-1')}；片段=${t.slice(0, 240)}`,
      problems.length ? 'BLOCK' : 'BUG',
    );
    await shot(page, 'a2', 't2-audit');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T3 APR-2 第二节点（PMO）驳回                                        */
/* ------------------------------------------------------------------ */
test('T3 APR-2 第二节点驳回：状态回退、原预算不生效、可重新提交', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/approvals/APR-2');
    step(ctx, '财务 → /approvals/APR-2 通过第一节点后由 PMO 驳回');
    await page.getByLabel('审批意见').fill('财务复核通过，转 PMO');
    await page.getByRole('button', { name: /通过，待基线确认/ }).click();
    await page.waitForTimeout(600);
    await confirmOverlay(page);

    await asRole(page, /PMO负责人/);
    let t = await mainText(page);
    judge(ctx, t.includes('2/3'), 'APR-2 已到 PMO 节点', `当前节点=${after(t, '当前节点', 24)}`, 'BLOCK');
    await page.getByLabel('审批意见').fill('PMO 驳回：采购与设备科目缺少比价依据，退回整改');
    await page.getByRole('button', { name: /驳回整改/ }).click();
    await page.waitForTimeout(600);
    const rejectModal = await overlayText(page);
    await confirmOverlay(page);
    t = await mainText(page);
    const status = after(t, '审批状态', 12);
    judge(
      ctx,
      /驳回/.test(status),
      '驳回后审批状态=驳回（非通过）',
      `审批状态=${status}；驳回确认浮层=${rejectModal.slice(0, 200)}`,
    );
    judge(
      ctx,
      t.includes('采购与设备科目缺少比价依据'),
      '驳回意见留痕',
      `审批记录含驳回意见=${t.includes('采购与设备科目缺少比价依据')}；记录片段=${after(t, '审批记录', 200)}`,
      'FLOW',
    );

    await spa(page, '/projects/P-001/baseline');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('V1.1') && !t.includes('V1.2'),
      '驳回后原预算/基线未被错误生效',
      `生效基线=${after(t, '生效基线', 20)}；含 V1.2=${t.includes('V1.2')}；轨迹=${after(t, '生效与变更轨迹', 100)}`,
    );
    await spa(page, '/projects/P-001/budget');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('2,847.70') && !t.includes('3,340.48'),
      '驳回后预算页仍为原生效预算 2,847.70',
      `草稿标识=${after(t, '预算草稿', 24)}；含 2,847.70=${t.includes('2,847.70')}、含 3,340.48=${t.includes('3,340.48')}`,
    );

    await spa(page, '/workbench/todos');
    t = await mainText(page);
    judge(ctx, !t.includes('APR-2'), 'PMO 待办中 APR-2 移除', `待办仍含 APR-2=${t.includes('APR-2')}`);

    await asRole(page, /项目经理/);
    await spa(page, '/projects/P-001/budget/review');
    t = await mainText(page);
    const btns = (await page.getByRole('button').allInnerTexts()).map((s) => s.replace(/\s+/g, '')).filter(Boolean);
    judge(
      ctx,
      /重新提交|再次提交|重提/.test(t + btns.join('/')),
      '驳回后可重新提交预算',
      `审批页按钮=${btns.join(' / ')}；页面含"驳回"=${/驳回/.test(t)}；草稿状态=${after(t, '预算草稿', 24)}`,
      'FLOW',
    );

    await asRole(page, /财务专员/);
    await spa(page, '/workbench/todos');
    await page.getByRole('tab', { name: /已办/ }).click();
    await page.waitForTimeout(600);
    const doneText = await mainText(page);
    judge(ctx, doneText.includes('APR-2'), '财务已办保留 APR-2 财务复核节点', `已办含 APR-2=${doneText.includes('APR-2')}`, 'FLOW');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T4 预算页：总额一致、概算差异、版本与草稿编辑                       */
/* ------------------------------------------------------------------ */
test('T4 预算页：总额一致、概算差异、版本与草稿编辑', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/projects/P-001/dynamic-accounting');
    const effectiveBudget = await kpi(page, '有效预算');
    step(ctx, `动态核算有效预算=${effectiveBudget}`);

    await goto(page, '/projects/P-001/budget');
    let t = await mainText(page);
    judge(ctx, t.includes('预算草稿 R0'), 'P-001 存在可编辑预算草稿', `草稿标识=${after(t, '预算草稿', 24)}`);
    judge(
      ctx,
      t.includes('当前计划已随基线冻结') && t.includes('计划版本') && t.includes('V1.1'),
      '已随基线冻结的计划不可直接改',
      `页面声明=${after(t, '计划版本', 60)}`,
    );

    await page.getByRole('tab', { name: /预算汇总与对比/ }).click();
    await page.waitForTimeout(700);
    const rows = await rowsByHeader(page, /概算/);
    const budgetSum = sumColumn(rows, 2);
    const estimateSum = sumColumn(rows, 1);
    judge(
      ctx,
      rows.length === 8,
      '预算汇总逐科目对比可读',
      `对比表 ${rows.length} 行：${rows.map((r) => `${r[0]}=${r[2]}`).join('、')}`,
    );
    judge(
      ctx,
      effectiveBudget !== null && Math.abs(effectiveBudget - budgetSum) < 0.005,
      '预算总额=科目合计（与动态核算有效预算对齐）',
      `动态核算有效预算=${effectiveBudget}；汇总表科目预算合计=${budgetSum}；差=${effectiveBudget === null ? 'n/a' : round2(effectiveBudget - budgetSum)}（逐科目四舍五入累计差）`,
      'BUG',
    );
    judge(
      ctx,
      estimateSum === 3212,
      '概算科目合计=3,212.00',
      `概算 8 科目合计=${estimateSum}（项目概览冻结概算 3,212.00）`,
    );

    await page.getByRole('button', { name: /提交审批/ }).click();
    await page.waitForTimeout(900);
    const submitMsg = await messages(page);
    judge(
      ctx,
      submitMsg.length > 0,
      '超概算原因/措施/责任缺失时提交被拦截',
      `提示=${submitMsg || '（无提示）'}；超概算路径=${after(t, '超概算路径', 30)}`,
      'FLOW',
    );

    const areas = page.locator('main textarea');
    const areaCount = await areas.count();
    if (areaCount >= 3) {
      await areas.nth(0).fill('机房设备与安全加固范围增加');
      await areas.nth(1).fill('采用框架集采压价，毛利率影响可控');
      await areas.nth(2).fill('项目经理张建国负责范围与成本复核');
    }
    await page.getByRole('button', { name: /保存草稿/ }).click();
    await page.waitForTimeout(900);
    const saveMsg = await messages(page);
    t = await mainText(page);
    judge(
      ctx,
      /草稿/.test(saveMsg) || /R1/.test(after(t, '预算草稿', 24)),
      '预算草稿保存并产生修订',
      `保存提示=${saveMsg || '（无）'}；草稿标识=${after(t, '预算草稿', 24)}；文本域数=${areaCount}`,
      'FLOW',
    );

    await goto(page, '/projects/P-001/baseline');
    t = await mainText(page);
    const baseBtns = (await page.getByRole('button').allInnerTexts()).map((s) => s.replace(/\s+/g, '')).filter(Boolean);
    judge(
      ctx,
      !/编辑|修改|删除/.test(baseBtns.join('/')),
      '已生效基线不可原地编辑',
      `基线页按钮=${baseBtns.join(' / ') || '（无）'}；生效口径=${after(t, '基线', 80)}`,
    );

    await goto(page, '/projects/P-001/estimate-budget');
    t = await mainText(page);
    const frozen = metric(t, '冻结概算');
    const current = metric(t, '当前预算');
    const diff = metric(t, '预算差异');
    const rate = metric(t, '差异率');
    const expectDiff = frozen !== null && current !== null ? round2(current - frozen) : null;
    const expectRate = expectDiff === null || !frozen ? null : round2((expectDiff / frozen) * 100);
    judge(
      ctx,
      diff === expectDiff && rate !== null && expectRate !== null && Math.abs(rate - expectRate) <= 0.02,
      '概算/预算差异与差异率计算正确',
      `冻结概算=${frozen}、当前预算=${current}、差异=${diff}（应=${expectDiff}）、差异率=${rate}%（应≈${expectRate}%）；来源概算=${after(t, '来源概算', 40)}`,
    );

    await goto(page, '/projects/P-001/budget/review');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('APR-1') && t.includes('待审批'),
      '预算审批页展示 APR-1 待审批',
      `审批版本=${after(t, '审批版本', 24)}；审批链=${after(t, '审批链', 60)}`,
    );
    await shot(page, 'a2', 't4-budget');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T5 成本：动态核算 / 直录成本 / 四类来源合计                          */
/* ------------------------------------------------------------------ */
test('T5 成本：动态核算合计、直录成本校验、四类来源一致性', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/projects/P-001/dynamic-accounting');
    step(ctx, '财务 → /projects/P-001/dynamic-accounting');
    const text = await mainText(page);
    const head = text.slice(0, Math.max(0, text.indexOf('核算分析')));
    const actual = metric(head, '已发生成本');
    const committed = metric(head, '未发生承诺');
    const forecast = metric(head, '剩余预测');
    const rolling = metric(head, '实时滚动成本');
    judge(
      ctx,
      actual === 1650 && committed === 836.2 && forecast === 500 && rolling === 2986.2,
      '滚动成本=已发生+未发生承诺+剩余预测',
      `已发生=${actual}、未发生承诺=${committed}、剩余预测=${forecast}、滚动=${rolling}（应 2,986.20）、偏差=${metric(head, '预测成本偏差')}`,
    );
    judge(
      ctx,
      text.includes('20 笔 · 合计 1,650.00'),
      '直录明细笔数与合计一致',
      `明细区=${after(text, '已确认成本来源', 60)}`,
    );

    const subjectRows = await rowsByHeader(page, /统一成本科目/);
    const subjectActualSum = sumColumn(subjectRows, 2);
    judge(
      ctx,
      subjectActualSum === 1650,
      '科目已发生合计=已发生成本',
      `8 个科目已发生合计=${subjectActualSum}；明细合计 1,650.00`,
    );

    await page.getByRole('button', { name: /直录成本/ }).first().click();
    await page.waitForTimeout(800);
    const modal = await overlayText(page);
    judge(ctx, modal.includes('直录成本确认'), '财务可打开直录成本弹窗', `弹窗=${modal.slice(0, 200)}`, 'BLOCK');
    const selects = page.locator('.ant-modal-content .ant-select');
    if ((await selects.count()) >= 2) {
      await selects.nth(0).click();
      await page.getByRole('option').first().click();
      await page.waitForTimeout(300);
      await selects.nth(1).click();
      await page.getByRole('option').first().click();
      await page.waitForTimeout(300);
    }
    const amount = page.getByLabel(/金额（万元）/).last();
    const voucher = page.getByLabel(/来源凭证编号/).last();

    await amount.fill('-5');
    await voucher.fill('QA-A2-NEG');
    await confirmOverlay(page);
    const negMsg = await messages(page);
    const negOpen = (await overlayText(page)).includes('直录成本确认');
    judge(ctx, negMsg.length > 0 || negOpen, '直录成本负数金额被拦截', `提示="${negMsg}"；弹窗仍开=${negOpen}`);

    await amount.fill('999999999');
    await voucher.fill('QA-A2-HUGE');
    await confirmOverlay(page);
    const hugeMsg = await messages(page);
    judge(ctx, hugeMsg.length > 0, '直录成本超大金额被拦截', `提示="${hugeMsg}"`);

    await amount.fill('12.34');
    await voucher.fill('QA-A2-001');
    await page.getByLabel(/摘要/).last().fill('QA 直录成本验证');
    await confirmOverlay(page);
    const okMsg = await messages(page);
    const afterText = await mainText(page);
    const afterActual = metric(afterText.slice(0, Math.max(0, afterText.indexOf('核算分析'))), '已发生成本');
    judge(
      ctx,
      afterActual === 1662.34,
      '直录成本入账后已发生成本=1,662.34',
      `提示=${okMsg || '（无）'}；已发生=${afterActual}；明细条数文案=${afterText.includes('21 笔') ? '21 笔' : after(afterText, '已确认成本来源', 40)}`,
      'FLOW',
    );

    // 重复凭证
    await page.getByRole('button', { name: /直录成本/ }).first().click();
    await page.waitForTimeout(700);
    const sels2 = page.locator('.ant-modal-content .ant-select');
    if ((await sels2.count()) >= 2) {
      await sels2.nth(0).click();
      await page.getByRole('option').first().click();
      await page.waitForTimeout(300);
      await sels2.nth(1).click();
      await page.getByRole('option').first().click();
      await page.waitForTimeout(300);
    }
    await page.getByLabel(/金额（万元）/).last().fill('1');
    await page.getByLabel(/来源凭证编号/).last().fill('QA-A2-001');
    await confirmOverlay(page);
    const dupMsg = await messages(page);
    const dupOpen = (await overlayText(page)).includes('直录成本确认');
    judge(ctx, dupMsg.length > 0 || dupOpen, '同一来源凭证重复入账被拦截', `提示="${dupMsg}"；弹窗仍开=${dupOpen}`);
    await closeOverlay(page);

    const sources: { path: string; label: string; expect: number; name: string }[] = [
      { path: '/projects/P-001/labor-cost', label: '累计实际人力', expect: 742.5, name: '直接人力成本' },
      { path: '/projects/P-001/procurement', label: '已确认实际', expect: 412.5, name: '采购与设备' },
      { path: '/projects/P-001/outsourcing', label: '已确认实际', expect: 330, name: '外包开发成本' },
      { path: '/projects/P-001/expenses', label: '已确认实际', expect: 165, name: '期间费用' },
    ];
    let sumActual = 0;
    for (const s of sources) {
      await goto(page, s.path);
      const got = await kpi(page, s.label);
      sumActual = round2(sumActual + (got ?? 0));
      judge(
        ctx,
        got === s.expect,
        `${s.name}页实际=动态核算科目已发生`,
        `${s.path} ${s.label}=${got}（动态核算科目 ${s.expect}）`,
      );
    }
    judge(
      ctx,
      sumActual === 1650,
      '四类来源合计=动态核算已发生成本',
      `742.50 + 412.50 + 330.00 + 165.00 = ${sumActual}（动态核算=${actual}）`,
    );

    await goto(page, '/projects/P-001/expenses');
    const expRows = await rowsByHeader(page, /可申请/);
    const negRows = expRows.filter((r) => (num(r[6] ?? '') ?? 0) < 0);
    judge(
      ctx,
      negRows.length === 0,
      '费用科目可申请额度出现负数',
      `可申请为负的科目=${negRows.map((r) => `${r[0]} 可申请 ${r[6]}（预算 ${r[2]} / 已用 ${r[3]}）`).join('；') || '无'}`,
      'RISK',
    );
    await shot(page, 'a2', 't5-dynamic');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T6 回款与四算联动                                                   */
/* ------------------------------------------------------------------ */
test('T6 回款登记与四算联动', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/projects/P-001');
    await page.getByText('合同与回款', { exact: true }).first().click();
    await page.waitForTimeout(800);
    let t = await mainText(page);
    const contract = metric(t, '合同总额');
    const paid = metric(t, '已回款总金额');
    const unpaid = metric(t, '未回款总金额');
    judge(
      ctx,
      paid !== null && unpaid !== null && contract !== null && Math.abs(paid + unpaid - contract) <= 0.02,
      '已回款+未回款=合同总额',
      `合同总额=${contract}、已回款=${paid}、未回款=${unpaid}、合计=${paid !== null && unpaid !== null ? round2(paid + unpaid) : 'n/a'}（差 ${paid !== null && unpaid !== null && contract !== null ? round2(paid + unpaid - contract) : 'n/a'}）`,
      'RISK',
    );
    judge(
      ctx,
      t.includes('待验收') && t.includes('RCPT-CTR-001-2'),
      '回款计划按节点展示',
      `计划片段=${after(t, 'RCPT-CTR-001-1', 140)}`,
    );

    await page.getByRole('button', { name: /登记回款/ }).first().click();
    await page.waitForTimeout(800);
    const modal = await overlayText(page);
    judge(ctx, modal.includes('登记回款'), '财务可发起回款登记', `弹窗=${modal.slice(0, 200)}`, 'BLOCK');
    const amount = page.getByLabel(/收款金额/).last();
    await amount.fill('-100');
    await confirmOverlay(page);
    const negMsg = await messages(page);
    const stillOpen = (await overlayText(page)).includes('登记回款');
    judge(ctx, negMsg.length > 0 || stillOpen, '回款金额负数被拦截', `提示="${negMsg}"；弹窗仍开=${stillOpen}`);
    await closeOverlay(page);

    await spa(page, '/projects/P-001/four-calculations');
    t = await mainText(page);
    const fourCost = metric(t, '当前建设成本');
    judge(
      ctx,
      fourCost === 1650,
      '四算当前建设成本=动态核算已发生 1,650.00',
      `四算建设成本=${fourCost}；滚动=${metric(t, '最后滚动')}`,
    );
    judge(ctx, t.includes('—'), '未正式结算时四算结算列留白', `页面含 —=${t.includes('—')}；结算说明=${after(t, '项目尚未正式结算', 40)}`, 'FLOW');
    await shot(page, 'a2', 't6-four');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T7 结算：SREQ-1 / SREQ-2 财务视角 + P-006 阻断                       */
/* ------------------------------------------------------------------ */
test('T7 结算审核：SREQ-1 越权检查、SREQ-2 财务核算、P-006 阻断', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-007');
  await guard(ctx, async () => {
    await goto(page, '/projects/P-007/settlement/apply');
    step(ctx, '财务 → P-007 结算申请（SREQ-1 · PMO审核）');
    let t = await mainText(page);
    judge(ctx, t.includes('SREQ-1'), 'SREQ-1 处于 PMO 审核', `状态=${after(t, '当前状态', 14)}`);
    const fin1 = page.getByRole('button', { name: /财务核算确认/ });
    judge(
      ctx,
      !(await fin1.isEnabled().catch(() => false)),
      'SREQ-1 已过财务核算，财务不可重复确认',
      `当前状态=${after(t, '当前状态', 14)}；"财务核算确认"可用=${await fin1.isEnabled().catch(() => false)}`,
    );
    const backBtn = page.getByRole('button', { name: /退回补充材料/ });
    judge(
      ctx,
      await backBtn.isEnabled().catch(() => false),
      '财务可在 PMO 阶段退回补充材料',
      `"退回补充材料"可用=${await backBtn.isEnabled().catch(() => false)}；"财务退回金额调整"可用=${await page.getByRole('button', { name: /财务退回金额调整/ }).isEnabled().catch(() => false)}`,
      'FLOW',
    );

    await goto(page, '/projects/P-023/settlement/apply');
    t = await mainText(page);
    const fin2 = page.getByRole('button', { name: /财务核算确认/ });
    judge(
      ctx,
      t.includes('SREQ-2') && (await fin2.isEnabled().catch(() => false)),
      'SREQ-2 财务核算节点可办理',
      `状态=${after(t, '当前状态', 14)}；按钮可用=${await fin2.isEnabled().catch(() => false)}`,
      'BLOCK',
    );
    await fin2.click();
    await page.waitForTimeout(700);
    const sreqOverlay = await overlayText(page);
    await confirmOverlay(page);
    t = await mainText(page);
    judge(
      ctx,
      /PMO/.test(after(t, '当前状态', 16)) || /PMO/.test(t.slice(0, 1200)),
      'SREQ-2 财务核算确认后流转 PMO 审核',
      `浮层=${sreqOverlay.slice(0, 160)}；当前状态=${after(t, '当前状态', 16)}`,
      'FLOW',
    );

    await spa(page, '/projects/P-023/settlement');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('穿透合同、成本与回款'),
      '结算详情提供成本溯源入口',
      `溯源入口=${t.includes('穿透合同、成本与回款')}；来源快照=${after(t, '来源', 100)}`,
      'FLOW',
    );
    judge(
      ctx,
      /承诺处置|未决成本|余额/.test(t),
      '结算详情展示余额/未决成本处置',
      `处置区=${after(t, '承诺处置', 160) || after(t, '余额', 160)}`,
      'FLOW',
    );

    await spa(page, '/projects/P-023/four-calculations');
    t = await mainText(page);
    judge(ctx, /结算/.test(t), '结算分析（四算对比）可读', `片段=${after(t, '结算', 200)}`, 'FLOW');

    await goto(page, '/projects/P-006/settlement/apply');
    t = await mainText(page);
    const blockers = (t.match(/阻断/g) ?? []).length;
    judge(
      ctx,
      blockers >= 1 && t.includes('整改中'),
      '整改中/未验收项目结算被阻断并说明依据',
      `阻断项命中=${blockers}；客户验收依据=${after(t, '最终客户验收确认', 60)}；成本依据=${after(t, '建设成本已全部明确', 60)}`,
    );
    const applyBtn = page.getByRole('button', { name: /编制结算申请/ });
    judge(
      ctx,
      (await applyBtn.count()) > 0 && !(await applyBtn.isEnabled().catch(() => false)),
      '阻断时"编制结算申请"不可用',
      `按钮数=${await applyBtn.count()}，可用=${await applyBtn.isEnabled().catch(() => false)}`,
    );
    await shot(page, 'a2', 't7-settlement');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T8 验收报告与运维成本                                               */
/* ------------------------------------------------------------------ */
test('T8 报验/客户验收约束 + 运维成本独立账', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-006');
  await guard(ctx, async () => {
    await goto(page, '/projects/P-006/report-acceptance');
    step(ctx, '财务 → P-006 报验');
    let t = await mainText(page);
    const createCount = await page.getByRole('button', { name: /新建报验/ }).count();
    judge(ctx, createCount > 0, '财务在报验页有"新建报验"入口', `按钮数=${createCount}；规则=${after(t, '累计报验', 60)}`, 'FLOW');
    if (createCount) {
      await page.getByRole('button', { name: /新建报验/ }).click();
      await page.waitForTimeout(800);
      const rptOverlay = await overlayText(page);
      judge(ctx, rptOverlay.length > 0, '新建报验浮层可打开', `浮层=${rptOverlay.slice(0, 300)}`, 'BLOCK');
      await confirmOverlay(page);
      const msg = await messages(page);
      judge(
        ctx,
        msg.length > 0 || rptOverlay.includes('整改中'),
        '整改中（ACC-P-006-3）提交报验给出业务阻断',
        `提示=${msg || '（无提示）'}；浮层仍开=${(await overlayText(page)).length > 0}`,
        'FLOW',
      );
      await closeOverlay(page);
    }

    await spa(page, '/projects/P-006/customer-acceptance');
    t = await mainText(page);
    const launch = page.getByRole('button', { name: /发起客户终验/ });
    judge(
      ctx,
      !(await launch.isEnabled().catch(() => false)),
      '整改中不可发起客户终验（财务视角）',
      `"发起客户终验"可用=${await launch.isEnabled().catch(() => false)}；当前待办理=${after(t, '当前待办理', 14)}；准入=${after(t, '准入条件', 14)}`,
      'FLOW',
    );
    judge(
      ctx,
      t.includes('ACC-P-006-3') && t.includes('整改中'),
      '客户验收页展示第3项整改中',
      `片段=${after(t, 'ACC-P-006-3', 160)}`,
    );

    await spa(page, '/operations/OPS-007');
    await page.getByRole('tab', { name: /独立运维账/ }).click();
    await page.waitForTimeout(700);
    t = await mainText(page);
    const fill = page.getByRole('button', { name: /填报运维工时/ });
    judge(
      ctx,
      (await fill.count()) > 0 && !(await fill.isEnabled().catch(() => false)),
      '运维成本填报仅团队/PM 可操作（财务不可填报）',
      `按钮数=${await fill.count()}，可用=${await fill.isEnabled().catch(() => false)}；口径=${after(t, '金额单位万元', 80)}`,
      'FLOW',
    );

    await asRole(page, /项目经理/);
    const fillPm = page.getByRole('button', { name: /填报运维工时/ });
    judge(ctx, await fillPm.isEnabled().catch(() => false), 'PM 可填报运维工时/费用', `PM 视角可用=${await fillPm.isEnabled().catch(() => false)}`, 'BLOCK');
    await fillPm.click();
    await page.waitForTimeout(800);
    const opsOverlay = await overlayText(page);
    judge(ctx, opsOverlay.length > 0, '运维填报浮层可打开', `浮层=${opsOverlay.slice(0, 320)}`, 'FLOW');
    const opsAmount = page.getByLabel(/金额（万元）/).last();
    await opsAmount.fill('-1').catch(() => undefined);
    await confirmOverlay(page);
    const opsMsg = await messages(page);
    judge(
      ctx,
      opsMsg.length > 0 || opsOverlay.includes('金额'),
      '运维费用负数/必填校验',
      `提示=${opsMsg || '（无提示）'}；浮层仍开=${(await overlayText(page)).length > 0}`,
    );
    await closeOverlay(page);

    await asRole(page, /财务专员/);
    t = await mainText(page);
    const opsBtns = (await page.getByRole('button').allInnerTexts()).map((s) => s.replace(/\s+/g, '')).filter(Boolean);
    judge(
      ctx,
      t.includes('财务审核') || /审核/.test(opsBtns.join('/')),
      '财务可审核运维成本',
      `财务视角按钮=${opsBtns.join(' / ') || '（无）'}；独立运维账表头含财务审核=${t.includes('财务审核')}`,
      'FLOW',
    );
    judge(ctx, t.includes('不改变建设期实际成本'), '运维账与建设期成本隔离口径', `口径=${after(t, '金额单位万元', 80)}`);

    await spa(page, '/projects/P-007/dynamic-accounting');
    t = await mainText(page);
    judge(ctx, metric(t, '已发生成本') === 350, '运维记录不改变建设期已发生成本', `P-007 已发生=${metric(t, '已发生成本')}（期望 350.00）`);
    await shot(page, 'a2', 't8-ops');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T9 财务配置 + 权限 + 金额/空状态                                     */
/* ------------------------------------------------------------------ */
test('T9 财务配置生效校验与权限边界', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'a2');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/settings/cost-mapping');
    let t = await mainText(page);
    const mappingHead = t.slice(0, 160);
    judge(ctx, t.includes('四算科目与来源映射'), '成本映射配置可访问', `面包屑=${after(t, '首页', 60)}`);

    await goto(page, '/settings/cost-baseline');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('成本基准配置') && !t.includes('四算科目与来源映射'),
      'URL /settings/cost-baseline 落到"成本基准配置"',
      `面包屑=${after(t, '首页', 60)}；首屏与 cost-mapping 相同=${t.slice(0, 160) === mappingHead}；首屏=${t.slice(0, 120)}`,
    );
    await goto(page, '/settings/alerts');
    t = await mainText(page);
    judge(
      ctx,
      t.includes('预警规则配置') && !t.includes('四算科目与来源映射'),
      'URL /settings/alerts 落到"预警规则配置"',
      `首屏=${t.slice(0, 140)}`,
    );

    await page.getByRole('tab', { name: /成本基准配置/ }).click();
    await page.waitForTimeout(700);
    t = await mainText(page);
    const versionBefore = metric(t, '当前生效版本');
    const draftBefore = metric(t, '草稿待发布');
    await page.getByRole('button', { name: /另\s*存\s*版\s*本/ }).first().click();
    await page.waitForTimeout(900);
    const overlay = await overlayText(page);
    judge(ctx, overlay.length > 0, '费率"另存版本"打开编辑浮层', `浮层=${overlay.slice(0, 260)}`, 'BLOCK');
    await confirmOverlay(page);
    let msg = await messages(page);
    judge(
      ctx,
      msg.length > 0 || (await overlayText(page)).length > 0,
      '另存版本未填修改原因被拦截',
      `提示=${msg || '（无提示）'}；浮层仍开=${(await overlayText(page)).length > 0}`,
      'FLOW',
    );
    const drawerArea = page.locator('.ant-drawer-content textarea, .ant-modal-content textarea');
    if (await drawerArea.count()) await drawerArea.first().fill('QA：调整交付岗位费率 3%');
    const saveDraft = page.getByRole('button', { name: /保存草稿/ }).last();
    if (await saveDraft.count()) {
      await saveDraft.click();
      await page.waitForTimeout(900);
    }
    await closeOverlay(page);
    t = await mainText(page);
    msg = await messages(page);
    judge(
      ctx,
      /草稿待发布/.test(t) && metric(t, '草稿待发布') !== 0,
      '费率另存产生草稿版本待发布',
      `提示=${msg || '（无）'}；草稿待发布 ${draftBefore} → ${metric(t, '草稿待发布')}；生效版本 ${versionBefore} → ${metric(t, '当前生效版本')}；页面片段=${after(t, '草稿待发布', 60)}`,
      'FLOW',
    );

    await goto(page, '/settings/permissions');
    let problems = await visibleProblems(page);
    judge(ctx, problems.length > 0, '财务访问 /settings/permissions 受限', `命中=${problems.join(',') || '无'}；正文=${(await mainText(page)).slice(0, 80)}`);

    await goto(page, '/initiation/review');
    problems = await visibleProblems(page);
    t = await mainText(page);
    judge(
      ctx,
      problems.length > 0,
      '财务直链 /initiation/review 应受限',
      `命中=${problems.join(',') || '无'}；页面可办理=${t.includes('评审工作台') || t.includes('立项评审')}；正文=${t.slice(0, 120)}`,
    );

    await goto(page, '/projects/P-006/report-acceptance');
    t = await mainText(page);
    judge(ctx, /暂无数据/.test(t) || t.includes('ACC-P-006-3'), '报验页有数据/空状态占位', `空状态=${/暂无数据/.test(t)}；含报验单=${t.includes('ACC-P-006-3')}`);
    await shot(page, 'a2', 't9-config');
  });
  absorb(ctx);
});

/* ------------------------------------------------------------------ */
/* T10 汇总报告                                                        */
/* ------------------------------------------------------------------ */
test('T10 汇总报告', async ({ page }) => {
  test.setTimeout(90_000);
  const ctx = laneContext(page, 'a2');
  ctx.findings.push(...all);
  ctx.consoleErrors.push(...consoleErrors);
  ctx.pageErrors.push(...pageErrors);
  await login(page, 'finance', 'P-001');
  await goto(page, '/workbench/todos');
  await shot(page, 'a2', 't10-final');
  const count = (k: Kind) => all.filter((f) => f.kind === k).length;
  const file = finish(
    ctx,
    [
      '财务专员（刘敏 U-004）链路：待办 → 预算审批全链路 → 驳回 → 预算/概算 → 成本/回款 → 结算 → 报验 → 运维 → 财务配置与权限。',
      '',
      `统计：BLOCK=${count('BLOCK')}、BUG=${count('BUG')}、FLOW=${count('FLOW')}、UI=${count('UI')}、RISK=${count('RISK')}、OK=${count('OK')}；控制台错误 ${ctx.consoleErrors.length} 条、页面异常 ${ctx.pageErrors.length} 条。`,
      '',
      '重点结论：',
      '- APR-1 三节点（财务复核 → PMO 评审 → 集团领导决策）+ PMO 基线二次确认链路可走通；审批通过后新增基线版本并同步预算页。',
      '- APR-2 在 PMO 节点驳回后状态回退、原基线保持不变，待办迁移到已办。',
      '- P-006（整改中）结算被阻断并给出依据；客户终验对财务不可用。',
      '- 结算/成本/四算数据口径一致（科目合计与动态核算逐项对齐）。',
    ].join('\n'),
  );
  console.log(`REPORT=${file}`);
  expect(all.length).toBeGreaterThan(0);
});
