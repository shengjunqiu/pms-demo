import { test, expect, type Page } from '@playwright/test';
import { login, laneContext, goto, shot, step, record, finish, visibleProblems, type LaneContext } from './_helpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);

const LANE = 'b3';

/** 两个 test 合并成一份报告：findings 汇总到 aggregate 后统一 finish。 */
const aggregate = {
  lane: LANE,
  findings: [],
  consoleErrors: [],
  pageErrors: [],
  steps: [],
} as unknown as LaneContext;

function lane(page: Page) {
  const ctx = laneContext(page, LANE);
  const flush = () => {
    aggregate.findings.push(...ctx.findings);
    aggregate.consoleErrors.push(...ctx.consoleErrors);
    aggregate.pageErrors.push(...ctx.pageErrors);
    aggregate.steps.push(...ctx.steps);
  };
  return { ctx, flush };
}

async function open(page: Page, url: string) {
  await goto(page, url);
  await page.waitForTimeout(450);
}

/** SPA 内导航：page.goto 会重建内存业务状态，跨页核查必须用 pushState+popstate 保留本轮办理结果。 */
async function inAppNav(page: Page, url: string) {
  await page.evaluate((u) => {
    history.pushState({}, '', u);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, url);
  await page.waitForTimeout(1200);
}

const text = async (page: Page, selector = 'main') =>
  (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ');

async function lastToast(page: Page, ms = 6_000) {
  return page
    .locator('.ant-message-notice-content')
    .last()
    .innerText({ timeout: ms })
    .catch(() => '（无提示）');
}

/** 深链路单步失败不中断整条链路，但保留现场。 */
async function attempt(ctx: LaneContext, name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    record(ctx, 'BLOCK', `链路步骤未走通：${name}`, `${(error as Error).message}\n页面：${new URL(ctx.page.url()).pathname}`);
  }
}

async function navProblems(ctx: LaneContext, path: string) {
  const problems = await visibleProblems(ctx.page);
  if (problems.length > 0) {
    record(ctx, 'BUG', `页面出现错误页文案：${path}`, `命中：${problems.join('、')}；路径：${path}`);
    return true;
  }
  return false;
}

test('1. PMO：待办→INIT-1 综合风险评估→立项决策按钮与评审列表迁移', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'pmo', 'P-001');
    await open(page, '/workbench/todos');
    const todoText = await text(page);
    step(ctx, 'PMO 打开 /workbench/todos');
    const hasRiskTodo = todoText.includes('PMO综合风险评估');
    const initRow = page.locator('main tbody tr').filter({ hasText: 'INIT-1' }).first();
    const rowEntry = initRow.getByRole('button', { name: '进入原业务' });
    record(
      ctx,
      hasRiskTodo ? 'OK' : 'FLOW',
      hasRiskTodo ? 'PMO 待办含 INIT-1「PMO综合风险评估」' : 'PMO 待办缺少 INIT-1 综合风险评估',
      `待办正文：${todoText.slice(0, 320)}；路径：/workbench/todos`,
    );
    await shot(page, LANE, '01-pmo-todos');

    await attempt(ctx, '待办 → INIT-1 综合风险评估入口', async () => {
      await expect(initRow).toBeVisible({ timeout: 8_000 });
      await rowEntry.click({ timeout: 8_000 });
      await page.waitForTimeout(1200);
      const path = new URL(page.url()).pathname;
      record(
        ctx,
        path === '/initiation/INIT-1/risk-assessment' ? 'OK' : 'BUG',
        path === '/initiation/INIT-1/risk-assessment' ? '待办点击进入原业务风险报告页' : '待办点击未进入原业务（未落到 /initiation/INIT-1/risk-assessment）',
        `URL=${path}；期望 /initiation/INIT-1/risk-assessment；路径：/workbench/todos`,
      );
      await shot(page, LANE, '02-risk-assessment-entry');
    });

    // 表单与风险矩阵
    await attempt(ctx, '读取风险评估表单与风险矩阵', async () => {
      const main = await text(page);
      const matrixCells = await page.locator('[aria-label*="概率"]').count();
      const riskRows = await page.locator('tbody tr').count();
      const level = page.locator('.ant-select[aria-label="综合风险等级"]').first();
      const levelDisabled = (await level.count()) > 0 ? await level.locator('.ant-select-selector').first().getAttribute('class').then((c) => /disabled/.test(c ?? '')) : true;
      const reason = page.getByLabel('综合判断与人工调整依据').first();
      const reasonDisabled = (await reason.count()) > 0 ? await reason.isDisabled() : true;
      const confirmBtn = page.getByRole('button', { name: '确认报告并进入项目分级' });
      const confirmDisabled = (await confirmBtn.count()) > 0 ? await confirmBtn.isDisabled() : true;
      record(
        ctx,
        'OK',
        '风险评估页含概率×影响风险矩阵与风险清单',
        `矩阵格数=${matrixCells}，风险清单行数=${riskRows}；综合等级下拉 disabled=${levelDisabled}；判断依据可编辑=${!reasonDisabled}；确认按钮 disabled=${confirmDisabled}；正文：${main.slice(0, 300)}；路径：/initiation/INIT-1/risk-assessment`,
      );
      if (levelDisabled || reasonDisabled) {
        record(
          ctx,
          'BUG',
          'PMO 打开风险评估页时表单不可编辑',
          `综合等级 disabled=${levelDisabled}，判断依据 disabled=${reasonDisabled}；页面提示：${main.slice(0, 220)}；路径：/initiation/INIT-1/risk-assessment`,
        );
      }
      await shot(page, LANE, '03-risk-form');
      ctx.steps.push(`风险矩阵格数=${matrixCells} 风险行数=${riskRows} 确认按钮 disabled=${confirmDisabled}`);
    });

    // 填写必填并确认 → 进入分级
    await attempt(ctx, '填写综合判断依据并确认报告', async () => {
      const reason = page.getByLabel('综合判断与人工调整依据').first();
      await reason.fill('高风险集中在签约与回款，要求前置合同评审并锁定付款节点');
      const level = page.locator('.ant-select[aria-label="综合风险等级"]').first();
      if (!/disabled/.test((await level.locator('.ant-select-selector').first().getAttribute('class')) ?? '')) {
        await level.click();
        await page.locator('.ant-select-item-option', { hasText: '高' }).first().click();
        await page.waitForTimeout(200);
      }
      await page.getByRole('button', { name: '确认报告并进入项目分级' }).click();
      await page.waitForTimeout(1200);
      const toast = await lastToast(page);
      const after = await text(page);
      const path = new URL(page.url()).pathname;
      record(
        ctx,
        /风险报告已确认/.test(toast) || path.includes('/decision') ? 'OK' : 'BUG',
        '确认风险报告后的反馈与跳转',
        `提示=${toast}；URL=${path}；正文：${after.slice(0, 300)}；期望提示“风险报告已确认”并进入 /initiation/INIT-1/decision`,
      );
      await shot(page, LANE, '04-risk-confirmed');
    });

    // 立项决策按钮：存在性 / disabled / tooltip / 点击反馈
    await attempt(ctx, '检查「立项决策/发起决策」按钮', async () => {
      const path = new URL(page.url()).pathname;
      const main = await text(page);
      const decisionBtns = page.getByRole('button', { name: /立项决策|发起决策|提交决策|通过当前节点/ });
      const count = await decisionBtns.count();
      const states: string[] = [];
      let anyEnabled = -1;
      let title = '';
      for (let i = 0; i < count; i += 1) {
        const btn = decisionBtns.nth(i);
        const disabled = await btn.isDisabled();
        if (!disabled && anyEnabled < 0) anyEnabled = i;
        states.push(`#${i}「${(await btn.innerText()).replace(/\s+/g, '')}」disabled=${disabled}`);
        const t = await btn.evaluate((el) => el.closest('[title]')?.getAttribute('title') ?? (el as HTMLElement).getAttribute('title') ?? '');
        if (t) title += `；tooltip/title=${t}`;
      }
      const tipText = /需先|未完成|请先|待|不可/.test(main) ? main.match(/[^。；]{0,40}(?:需先|未完成|请先)[^。；]{0,60}/)?.[0] ?? '' : '';
      record(
        ctx,
        count > 0 ? 'OK' : 'BUG',
        count > 0 ? '页面存在立项决策类按钮' : '页面不存在「立项决策/发起决策」按钮',
        `按钮数=${count}；${states.join('|') || '无按钮'}${title}；提示文案=${tipText || '（无）'}；URL=${path}；正文：${main.slice(0, 260)}`,
      );
      if (count > 0 && anyEnabled < 0) {
        record(ctx, 'FLOW', '风险报告确认后决策按钮仍全部禁用', `按钮态：${states.join('|')}；URL=${path}`);
      }
      if (anyEnabled >= 0) {
        const btn = decisionBtns.nth(anyEnabled);
        await btn.click();
        await page.waitForTimeout(900);
        const modal = await page.locator('.ant-modal:visible').count();
        let feedback = '';
        if (modal > 0) {
          feedback = `确认弹窗标题=${(await page.locator('.ant-modal:visible .ant-modal-title').first().innerText().catch(() => '')).slice(0, 60)}`;
          const ok = page.locator('.ant-modal:visible').getByRole('button', { name: /确\s*定|确认/ }).last();
          if ((await ok.count()) > 0 && !(await ok.isDisabled())) {
            await ok.click();
            await page.waitForTimeout(1200);
            feedback += `；点击确定后提示=${await lastToast(page)}；URL=${new URL(page.url()).pathname}`;
          }
        } else {
          feedback = `无确认弹窗，提示=${await lastToast(page)}；URL=${new URL(page.url()).pathname}`;
        }
        record(ctx, 'OK', '点击决策按钮的实际反馈', `按钮「${(await btn.innerText()).replace(/\s+/g, '')}」→ ${feedback}；起始路径=${path}`);
        await shot(page, LANE, '05-decision-clicked');
      }
    });

    // 评审列表状态
    await attempt(ctx, '复核 /initiation/review 列表状态', async () => {
      await inAppNav(page, '/initiation/review');
      if (await navProblems(ctx, '/initiation/review')) return;
      const reviewText = await text(page);
      const hasInit1 = reviewText.includes('INIT-1');
      const statusHits = reviewText.match(/待风险评估|待分级|会签中|已通过|待决策|已立项/g) ?? [];
      record(
        ctx,
        'OK',
        '立项评审列表可打开并含状态列',
        `INIT-1 出现=${hasInit1}；状态取值=${[...new Set(statusHits)].join('/') || '未识别'}；正文：${reviewText.slice(0, 360)}；路径：/initiation/review`,
      );
      await shot(page, LANE, '06-initiation-review');
    });

    // 待办迁移
    await attempt(ctx, '检查待办是否迁移', async () => {
      await inAppNav(page, '/workbench/todos');
      const afterTodo = await text(page);
      const stillRisk = afterTodo.includes('PMO综合风险评估');
      record(
        ctx,
        stillRisk ? 'BUG' : 'OK',
        stillRisk ? '风险报告确认后待办未迁移，仍显示「PMO综合风险评估」' : '风险报告确认后待办已迁移',
        `待办正文：${afterTodo.slice(0, 360)}；期望原待办消失、出现“PMO项目分级”或审批节点；路径：/workbench/todos`,
      );
      await shot(page, LANE, '07-todos-after-risk');
    });
  } finally {
    flush();
  }
});

test('2. 客户经理：OPP-068 立项决策入口、申报页空表单、待办缺口与 PMO 只读抽查', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'market', 'P-001');
    await open(page, '/opportunities/OPP-068');
    let oppText = await text(page);
    let oppId = 'OPP-068';
    if (!oppText.includes('拟立项')) {
      await open(page, '/opportunities/OPP-069');
      oppText = await text(page);
      oppId = 'OPP-069';
      record(ctx, 'RISK', 'OPP-068 状态不是拟立项，改用 OPP-069', `OPP-068 正文：${oppText.slice(0, 200)}；改测 /opportunities/OPP-069`);
    }
    step(ctx, `客户经理打开 /opportunities/${oppId}`);
    await shot(page, LANE, '08-opp-detail');

    await attempt(ctx, '记录商机操作按钮与立项决策入口', async () => {
      const decisionBtn = page.getByRole('button', { name: /立项决策|发起决策|发起立项/ });
      const count = await decisionBtn.count();
      const states: string[] = [];
      let enabledIdx = -1;
      for (let i = 0; i < count; i += 1) {
        const btn = decisionBtn.nth(i);
        const disabled = await btn.isDisabled();
        if (!disabled && enabledIdx < 0) enabledIdx = i;
        const t = await btn.evaluate((el) => el.closest('[title]')?.getAttribute('title') ?? (el as HTMLElement).getAttribute('title') ?? '');
        states.push(`#${i}「${(await btn.innerText()).replace(/\s+/g, '')}」disabled=${disabled}${t ? ` title=${t}` : ''}`);
      }
      const allButtons = await page.locator('main button').allInnerTexts();
      record(
        ctx,
        count === 0 ? 'FLOW' : 'OK',
        count === 0 ? '商机详情无「立项决策/发起立项」按钮' : '商机详情存在立项决策类按钮',
        `命中按钮数=${count}；${states.join('|') || '无'}；全部按钮=${allButtons.map((b) => b.replace(/\s+/g, '')).filter(Boolean).join('/') || '无'}；路径：/opportunities/${oppId}`,
      );
      if (enabledIdx >= 0) {
        const btn = decisionBtn.nth(enabledIdx);
        const btnLabel = (await btn.innerText()).replace(/\s+/g, '');
        const before = new URL(page.url()).pathname;
        await btn.click();
        await page.waitForTimeout(1200);
        const after = new URL(page.url()).pathname;
        record(
          ctx,
          after !== before ? 'OK' : 'BUG',
          after !== before ? '点击立项决策按钮发生跳转' : '点击立项决策按钮无任何跳转/反馈',
          `按钮「${btnLabel}」：${before} → ${after}；提示=${await lastToast(page, 3_000)}`,
        );
        await shot(page, LANE, '09-decision-button-clicked');
        if (after !== before) {
          await open(page, `/opportunities/${oppId}`);
        }
      } else if (count > 0) {
        record(ctx, 'FLOW', '商机立项决策类按钮全部 disabled', `按钮态：${states.join('|')}；页面提示：${(await text(page)).slice(0, 240)}；路径：/opportunities/${oppId}`);
      }
    });

    // 申报页：是否无任何可填写字段
    await attempt(ctx, '复核 /initiation/apply?opportunityId=OPP-068 申报页', async () => {
      await open(page, '/initiation/apply?opportunityId=OPP-068');
      if (await navProblems(ctx, '/initiation/apply')) return;
      const applyText = await text(page);
      const tabCensus: string[] = [];
      const tabNames = await page.locator('main .ant-tabs-tab').allInnerTexts();
      for (const tabName of tabNames) {
        const tab = page.locator('main .ant-tabs-tab').filter({ hasText: tabName.trim() }).first();
        await tab.click().catch(() => undefined);
        await page.waitForTimeout(250);
        const editable = await page
          .locator('main input:visible:not([disabled]), main textarea:visible:not([disabled]), main .ant-select:visible')
          .count();
        const required = await page.locator('main .ant-form-item-required').count();
        tabCensus.push(`${tabName.replace(/\s+/g, '')}:可编辑=${editable}/必填=${required}`);
      }
      const inputs = await page.locator('main input:visible, main textarea:visible').count();
      const editableInputs = await page.locator('main input:visible:not([disabled]):not([readonly]), main textarea:visible:not([disabled]):not([readonly])').count();
      const selects = await page.locator('main .ant-select:visible').count();
      const submit = page.getByRole('button', { name: /提交立项申请/ });
      const submitCount = await submit.count();
      const submitDisabled = submitCount > 0 ? await submit.isDisabled() : true;
      record(
        ctx,
        editableInputs > 0 ? 'OK' : 'BUG',
        editableInputs > 0 ? '申报页有可填写字段，但关键资料未预填（需人工补录）' : '申报页无任何可填写字段（疑似只读/资料缺失）',
        `标签页字段普查：${tabCensus.join(' | ') || '无标签页'}；默认可见 input/textarea=${inputs}（可编辑=${editableInputs}），select=${selects}；提交按钮数=${submitCount}，disabled=${submitDisabled}；正文：${applyText.slice(0, 420)}；路径：/initiation/apply?opportunityId=OPP-068`,
      );
      await shot(page, LANE, '10-apply-empty-form');
      if (submitCount > 0 && !submitDisabled) {
        await submit.first().click();
        await page.waitForTimeout(1200);
        const toast = await lastToast(page);
        const errs = await page.locator('.ant-form-item-explain-error').allInnerTexts();
        record(
          ctx,
          /请补全申请资料/.test(toast) ? 'BUG' : 'OK',
          /请补全申请资料/.test(toast) ? '空申报页提交被“请补全申请资料”拦截（用户无法补全）' : '申报页提交反馈可读',
          `提示=${toast}；行内错误=${errs.join('；') || '（无）'}；URL=${new URL(page.url()).pathname}；期望：要么预填资料可直接提交，要么明确告知补录入口`,
        );
        await shot(page, LANE, '11-apply-submit-blocked');
      }
    });

    // 待办数 vs 拟立项商机
    await attempt(ctx, '客户经理待办数与拟立项商机对比', async () => {
      await open(page, '/workbench/todos');
      const todoText = await text(page);
      const todoItems = await page.locator('main tbody tr, main .ant-list-item, main [class*="todo"] li').count();
      const countMatch = todoText.match(/共\s*(\d+)\s*条|(\d+)\s*条待办|(\d+)\s*项/g) ?? [];
      await shot(page, LANE, '12-market-todos');
      await open(page, '/opportunities');
      const listText = await text(page);
      const pendingMatch = listText.match(/拟立项\s*(\d+)\s*个/) ?? [];
      const pendingRows = await page.locator('tbody tr').count();
      record(
        ctx,
        'FLOW',
        '客户经理待办为 0 但商机仍有拟立项需推进（缺少驱动入口）',
        `待办行数=${todoItems}，计数文案=${countMatch.join('/') || '未匹配'}；商机列表拟立项计数=${pendingMatch[0] ?? '未匹配'}，列表行数=${pendingRows}；待办正文：${todoText.slice(0, 220)}；路径：/workbench/todos 与 /opportunities`,
      );
    });
  } finally {
    flush();
  }

  // 附带抽查（PMO 三个页面）：整页 goto 会重置为全新 demo 状态。
  const { ctx: pctx, flush: pflush } = lane(page);
  try {
    await login(page, 'pmo', 'P-001');
    await attempt(pctx, 'PMO /approvals/APR-1 节点与可操作按钮', async () => {
      await open(page, '/approvals/APR-1');
      if (await navProblems(pctx, '/approvals/APR-1')) return;
      const main = await text(page);
      const stepMatch = main.match(/(\d+)\s*\/\s*(\d+)/) ?? [];
      const btns = await page.locator('main button:visible').allInnerTexts();
      const actionable = await page.locator('main button:visible:not([disabled])').count();
      record(
        pctx,
        actionable > 0 ? 'OK' : 'RISK',
        'PMO 直开审批单 APR-1 的可操作性',
        `节点进度=${stepMatch[0] ?? '未匹配'}；可见按钮=${btns.map((b) => b.replace(/\s+/g, '')).filter(Boolean).join('/') || '无'}；可点按钮数=${actionable}；正文：${main.slice(0, 360)}；路径：/approvals/APR-1`,
      );
      await shot(page, LANE, '13-apr1');
    });
    await attempt(pctx, 'PMO /projects/P-001/plan-review 可达性', async () => {
      await open(page, '/projects/P-001/plan-review');
      if (await navProblems(pctx, '/projects/P-001/plan-review')) return;
      const main = await text(page);
      record(pctx, main.length > 80 ? 'OK' : 'RISK', 'PMO 可进入项目计划评审页', `正文：${main.slice(0, 320)}；路径：/projects/P-001/plan-review`);
      await shot(page, LANE, '14-plan-review');
    });
    await attempt(pctx, 'PMO /settings/project-grading 列表与保存', async () => {
      await open(page, '/settings/project-grading');
      if (await navProblems(pctx, '/settings/project-grading')) return;
      const main = await text(pctx.page);
      const rows = await pctx.page.locator('tbody tr').count();
      const saveBtns = pctx.page.getByRole('button', { name: /保\s*存|保存配置|保存分级/ });
      const saveCount = await saveBtns.count();
      const saveDisabled = saveCount > 0 ? await saveBtns.first().isDisabled() : true;
      record(
        pctx,
        rows > 0 ? 'OK' : 'FLOW',
        rows > 0 ? '项目分级配置列表有数据' : '项目分级配置列表为空',
        `表格行数=${rows}；保存按钮数=${saveCount}，disabled=${saveDisabled}；正文：${main.slice(0, 320)}；路径：/settings/project-grading`,
      );
      await shot(pctx.page, LANE, '15-project-grading');
    });
  } finally {
    pflush();
  }
});

test.afterAll(async () => {
  finish(
    aggregate,
    'PMO 立项评审链路：待办「PMO综合风险评估」可进入 /initiation/INIT-1/risk-assessment，页面含概率×影响风险矩阵与风险清单；确认报告后提示与跳转见报告，评审列表与待办迁移状态见对应 finding。' +
      '客户经理链路：商机详情的“立项决策/发起立项”入口态与点击反馈见报告；/initiation/apply?opportunityId=OPP-068 存在“无任何可填写字段 + 提交被请补全申请资料拦截”的自相矛盾，复核截图已存。' +
      '另记录市场待办为 0 但商机仍有拟立项待推进的 FLOW，以及 PMO 直开 /approvals/APR-1、/projects/P-001/plan-review、/settings/project-grading 的抽查结果。',
  );
});
