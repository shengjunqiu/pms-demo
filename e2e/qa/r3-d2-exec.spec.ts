import { test, type Page } from '@playwright/test';
import { login, laneContext, goto, shot, step, record, finish, visibleProblems, type LaneContext } from './_helpers';

/**
 * R3 D2：PM 张建国 + PMO 李主任 只读 QA。
 * 场景1 计划与预算（P-001）：PM 计划评审 → 预算审批页；PMO 评审通过 → 预算审批入口/节点。
 * 场景2 执行与运维：变更草稿、成本单申请、工时填报入口、运维周期与事件登记/解决。
 * 业务值只读取文本后 record，不用 expect 断言；任务给定入口与实际路由不一致时记录 FLOW 并回退到实际路由继续观察。
 */

const pathname = (page: Page) => new URL(page.url()).pathname;
const mainText = async (page: Page) =>
  (await page.locator('main').innerText().catch(() => '')).replace(/\s*\n+\s*/g, ' | ');
const after = (t: string, label: string, len = 60) => {
  const i = t.indexOf(label);
  return i < 0 ? '' : t.slice(i, i + label.length + len);
};
const problems = async (page: Page) => {
  const hits = await visibleProblems(page);
  const t = await mainText(page);
  if (t.includes('404') || t.includes('Not Found')) hits.push('404');
  return [...new Set(hits)];
};
const flash = async (page: Page) =>
  (await page.locator('.ant-message-notice-content').allInnerTexts().catch(() => []))
    .join(' / ')
    .replace(/\s+/g, ' ')
    .slice(0, 200);
const modalText = async (page: Page) => {
  const loc = page.locator('.ant-modal-content').last();
  return (await loc.count()) ? (await loc.innerText()).replace(/\s*\n+\s*/g, ' | ').slice(0, 500) : '';
};
const btnState = async (page: Page, name: RegExp) => {
  const btn = page.getByRole('button', { name }).first();
  const count = await btn.count();
  return {
    count,
    enabled: count ? await btn.isEnabled().catch(() => false) : false,
    text: count ? (await btn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim() : '',
  };
};

/** 顶部身份下拉切换（保留同一内存 store，可做跨角色链路）。 */
async function asRole(page: Page, label: RegExp) {
  let trigger = page.locator('.ant-select[aria-label="模拟身份"]').first();
  if (!(await trigger.count())) {
    trigger = page.locator('.ant-select').filter({ has: page.locator('[aria-label="模拟身份"]') }).first();
  }
  if (!(await trigger.count())) trigger = page.locator('header .ant-select').first();
  await trigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: label }).first().click();
  await page.waitForTimeout(700);
}

/** SPA 内跳转，保留同一内存 store（跨页链路用）。 */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(900);
}

/** 点击当前打开弹层的主按钮（确认框 / 表单弹窗）。 */
async function modalOk(page: Page) {
  const btn = page
    .locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-modal-footer .ant-btn-primary')
    .last();
  if (!(await btn.count())) return false;
  await btn.click({ timeout: 6000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  return true;
}

async function guard(ctx: LaneContext, label: string, body: () => Promise<void>) {
  try {
    await body();
  } catch (error) {
    record(
      ctx,
      'BLOCK',
      `${label} 执行中断`,
      `无法继续该段用例：${String(error).slice(0, 400)}（URL=${pathname(ctx.page)}）`,
    );
  }
}

test('T1 计划与预算：PM 提交计划评审 → 预算审批页 → PMO 评审通过 → 预算审批入口/节点', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'd2/plan-budget');
  await login(page, 'project-manager', 'P-001');

  await guard(ctx, '场景1-PM 计划评审与预算审批', async () => {
    await goto(page, '/projects/P-001/plan-review');
    step(ctx, 'PM 张建国 → /projects/P-001/plan-review');
    const t0 = await mainText(page);
    const p0 = await problems(page);
    record(
      ctx,
      p0.length ? 'BLOCK' : 'OK',
      '计划评审页可进入（PM）',
      `路径=/projects/P-001/plan-review；页面问题=${p0.join(',') || '无'}；含“YS-08 计划评审”=${t0.includes('YS-08')}；片段=${t0.slice(0, 200)}`,
    );
    record(
      ctx,
      'OK',
      '计划评审状态与版本快照（PM 视角）',
      `步骤条位置=${(await page.locator('.ant-steps-item-active').allInnerTexts().catch(() => [])).join('/') || '无'}；版本下拉=${(await page.locator('.ant-select-selection-item').allInnerTexts().catch(() => [])).join(' / ') || '未提交（占位）'}；状态标签片段=${after(t0, '提交人', 90)}；完整性校验=${after(t0, '当前草稿完整性校验', 90)}`,
    );

    const submit = await btnState(page, /提交\s*\/\s*整改重提/);
    record(
      ctx,
      submit.count ? 'OK' : 'FLOW',
      'PM 计划评审页“提交 / 整改重提”按钮',
      `路径=/projects/P-001/plan-review；按钮数=${submit.count}；可用=${submit.enabled}；按钮文本=${submit.text || '无'}；期望：草稿/整改中且 PM 可编辑时可提交`,
    );
    await shot(page, 'd2/plan-budget', 't1-pm-plan-review', false);

    if (submit.enabled) {
      await page.getByRole('button', { name: /提交\s*\/\s*整改重提/ }).first().click();
      await page.waitForTimeout(600);
      const confirmBody = await modalText(page);
      await modalOk(page);
      const msg = await flash(page);
      const t1 = await mainText(page);
      const submit2 = await btnState(page, /提交\s*\/\s*整改重提/);
      record(
        ctx,
        t1.includes('待评审') || t1.includes('评审中') ? 'OK' : 'BUG',
        'PM 提交计划评审后的反馈与状态变化',
        `复现：点击“提交 / 整改重提”→ 确认浮层=${confirmBody.slice(0, 140)}；反馈提示=${msg || '无'}；提交后按钮可用=${submit2.enabled}；main 含“待评审”=${t1.includes('待评审')}；含“评审中”=${t1.includes('评审中')}；状态片段=${after(t1, '提交人', 120)}`,
      );
    } else {
      record(
        ctx,
        'FLOW',
        'PM 无法提交计划评审（按钮置灰）',
        `路径=/projects/P-001/plan-review；复现：进入页面观察“提交 / 整改重提”；期望：PM 可提交草稿计划；实际：按钮 disabled；页面状态片段=${after(t0, '当前计划修订', 80)}；完整性=${after(t0, '当前草稿完整性校验', 60)}`,
      );
    }

    await spa(page, '/projects/P-001/budget/review');
    step(ctx, 'PM → /projects/P-001/budget/review（保持内存状态）');
    const bt = await mainText(page);
    const bprobs = await problems(page);
    const opinion = page.getByLabel('审批意见').first();
    const opinionDisabled = (await opinion.count()) ? await opinion.isDisabled().catch(() => null) : null;
    const passBtn = await btnState(page, /通过，待基线确认/);
    const rejectBtn = await btnState(page, /驳回整改/);
    const editable = await page
      .locator('main textarea:not([disabled]), main input:not([disabled])')
      .count()
      .catch(() => -1);
    record(
      ctx,
      bprobs.length ? 'BUG' : 'OK',
      '预算审批页版本与审批节点（PM 视角）',
      `路径=/projects/P-001/budget/review；页面问题=${bprobs.join(',') || '无'}；含“YS-11 预算审批详情”=${bt.includes('YS-11')}；审批版本下拉=${(await page.locator('.ant-select-selection-item').allInnerTexts().catch(() => [])).join(' / ') || '空'}；当前节点=${after(bt, '当前节点', 40)}；状态=${after(bt, '审批状态', 20)}`,
    );
    record(
      ctx,
      'OK',
      '预算审批页 PM 可编辑性与审批链',
      `审批意见输入框=${opinionDisabled === null ? '不存在' : opinionDisabled ? '禁用' : '可编辑'}；主按钮=${passBtn.count}/${passBtn.text}/可用=${passBtn.enabled}；驳回按钮=${rejectBtn.count}/可用=${rejectBtn.enabled}；可编辑输入框数=${editable}；审批链=${after(bt, '审批链', 160) || '未展示'}`,
    );
    await shot(page, 'd2/plan-budget', 't1-pm-budget-review', false);

    await asRole(page, /PMO负责人|李主任/);
    const header1 = (await page.locator('header').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100);
    record(ctx, 'OK', '切换到 PMO 李主任（同会话）', `顶部身份区文本=${header1}；当前 URL=${pathname(page)}`);

    await spa(page, '/projects/P-001/plan-review');
    step(ctx, 'PMO 李主任 → /projects/P-001/plan-review');
    const t2 = await mainText(page);
    const pass = await btnState(page, /^通\s*过$/);
    const rect = await btnState(page, /^整\s*改$/);
    const deny = await btnState(page, /^否\s*决$/);
    const reviewOpinion = page.getByLabel('计划评审意见').first();
    const reviewOpinionDisabled = (await reviewOpinion.count())
      ? await reviewOpinion.isDisabled().catch(() => null)
      : null;
    const canReview = pass.count > 0 && pass.enabled;
    record(
      ctx,
      canReview ? 'OK' : 'FLOW',
      'PMO 能否评审该计划（通过/整改/否决可用性）',
      `路径=/projects/P-001/plan-review；复现：PMO 进入后观察右侧评审操作区；通过按钮=${pass.count}/可用=${pass.enabled}；整改=${rect.count}/可用=${rect.enabled}；否决=${deny.count}/可用=${deny.enabled}；评审意见框=${reviewOpinionDisabled === null ? '不存在' : reviewOpinionDisabled ? '禁用' : '可编辑'}；页面状态片段=${after(t2, '提交人', 110)}`,
    );

    if (canReview) {
      await reviewOpinion.fill('PMO 评审：范围、WBS 与里程碑条件完整，同意通过');
      await page.getByRole('button', { name: /^通\s*过$/ }).first().click();
      await page.waitForTimeout(700);
      const reviewModal = await modalText(page);
      await modalOk(page);
      const msg = await flash(page);
      const t3 = await mainText(page);
      record(
        ctx,
        t3.includes('已通过') || t3.includes('通过') ? 'OK' : 'BUG',
        'PMO 通过计划评审后的结果与页面状态',
        `复现：填写评审意见 → 点“通过”→ 确认弹层=${reviewModal.slice(0, 160)}；反馈提示=${msg || '无'}；通过后含“已通过”=${t3.includes('已通过')}；步骤条位置=${(await page.locator('.ant-steps-item-active').allInnerTexts().catch(() => [])).join('/') || '无'}；状态片段=${after(t3, '提交人', 120)}`,
      );
      await shot(page, 'd2/plan-budget', 't1-pmo-plan-review', false);
    } else {
      record(
        ctx,
        'BLOCK',
        'PMO 无法通过计划评审，预算审批入口链路无法继续验证',
        `路径=/projects/P-001/plan-review；期望：待评审状态下 PMO 可通过；实际：通过按钮可用=${pass.enabled}（count=${pass.count}）；评审意见框=${reviewOpinionDisabled === null ? '不存在' : reviewOpinionDisabled ? '禁用' : '可编辑'}；页面片段=${after(t2, '评审人', 120)}`,
      );
    }

    await spa(page, '/projects/P-001/budget/review');
    step(ctx, 'PMO → /projects/P-001/budget/review（评审后审批入口）');
    const bt2 = await mainText(page);
    const pmoPass = await btnState(page, /通过，待基线确认/);
    const pmoBaseEntry = await btnState(page, /确认基线生效/);
    const pmoOpinion = page.getByLabel('审批意见').first();
    const pmoOpinionDisabled = (await pmoOpinion.count())
      ? await pmoOpinion.isDisabled().catch(() => null)
      : null;
    record(
      ctx,
      pmoPass.count > 0 || pmoBaseEntry.count > 0 ? 'OK' : 'FLOW',
      '计划评审通过后预算审批入口是否出现（PMO 视角）',
      `路径=/projects/P-001/budget/review；复现：PMO 评审通过后进入预算审批页；审批入口（通过按钮）=${pmoPass.count}/可用=${pmoPass.enabled}；“确认基线生效”=${pmoBaseEntry.count}/可用=${pmoBaseEntry.enabled}；审批意见框=${pmoOpinionDisabled === null ? '不存在' : pmoOpinionDisabled ? '禁用' : '可编辑'}；当前节点=${after(bt2, '当前节点', 40)}`,
    );
    record(
      ctx,
      'OK',
      '预算审批节点角色与审批链（PMO 视角）',
      `审批版本=${(await page.locator('.ant-select-selection-item').allInnerTexts().catch(() => [])).join(' / ') || '空'}；审批链=${after(bt2, '审批链', 220) || '未展示'}；状态=${after(bt2, '审批状态', 20)}；页面片段=${bt2.slice(0, 220)}`,
    );
    await shot(page, 'd2/plan-budget', 't1-pmo-budget-review', false);

    record(
      ctx,
      ctx.consoleErrors.length || ctx.pageErrors.length ? 'UI' : 'OK',
      'T1 控制台/运行时错误',
      `console.error=${ctx.consoleErrors.slice(0, 3).join(' || ') || '无'}；pageerror=${ctx.pageErrors.slice(0, 2).join(' || ') || '无'}`,
    );
  });

  finish(
    ctx,
    '场景1：PM 计划评审页状态与提交 → 预算审批页版本/节点/可编辑性 → PMO 评审通过 → 预算审批入口与节点角色。详细结论见各条目。',
  );
});

test('T2 执行与运维：变更草稿、成本单申请、工时填报入口、运维周期与事件处理', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'd2/exec-ops');
  await login(page, 'project-manager', 'P-001');

  await guard(ctx, '场景2-变更（PM）', async () => {
    await goto(page, '/projects/P-001/change-requests');
    step(ctx, 'PM → /projects/P-001/change-requests（任务给定入口）');
    const p1 = await problems(page);
    const t1 = await mainText(page);
    record(
      ctx,
      p1.length ? 'FLOW' : 'OK',
      '任务给定入口 /projects/P-001/change-requests 可用性',
      `期望：项目变更台账；实际：URL=${pathname(page)}；页面问题命中=${p1.join(',') || '无'}；main 片段=${t1.slice(0, 180)}`,
    );

    await goto(page, '/projects/P-001/changes');
    step(ctx, 'PM → /projects/P-001/changes（实际路由）');
    const rows = await page.locator('main tbody tr').allInnerTexts();
    const t2 = await mainText(page);
    record(
      ctx,
      rows.length ? 'OK' : 'BUG',
      '变更台账列表与新建入口（PM）',
      `路径=/projects/P-001/changes；行数=${rows.length}；编号=${[...new Set((rows.join(' ').match(/[A-Z]{1,4}-\d+/g) ?? []))].slice(0, 12).join(',') || '无'}；状态=${[...new Set((t2.match(/草稿|影响评估中|待分级|PMO审批中|PMC审议中|已批准|已否决/g) ?? []))].join(',')}；首行=${(rows[0] ?? '').replace(/\s+/g, ' ').slice(0, 180)}`,
    );
    const create = await btnState(page, /发起变更/);
    record(
      ctx,
      create.count > 0 ? 'OK' : 'FLOW',
      '变更“发起变更”按钮（PM）',
      `按钮数=${create.count}；可用=${create.enabled}；文本=${create.text || '无'}；期望：项目变更页 PM 可发起变更`,
    );
    await shot(page, 'd2/exec-ops', 't2-pm-changes', false);

    if (create.enabled) {
      await page.getByRole('button', { name: /发起变更/ }).first().click();
      await page.waitForTimeout(1200);
      const formUrl = pathname(page);
      const formText = await mainText(page);
      const requiredHints = (formText.match(/必填/g) ?? []).length;
      const titleInput = page.getByLabel('变更标题').first();
      const draftBtn = await btnState(page, /保存草稿/);
      const submitEval = await btnState(page, /提交评估/);
      record(
        ctx,
        formUrl.includes('/changes/new') ? 'OK' : 'BUG',
        '变更草稿表单路由与必填项',
        `期望：/projects/P-001/changes/new；实际 URL=${formUrl}；必填提示命中数=${requiredHints}；标题输入=${(await titleInput.count()) ? '存在' : '缺失'}；保存草稿=${draftBtn.count}/可用=${draftBtn.enabled}；提交评估=${submitEval.count}/可用=${submitEval.enabled}；表单片段=${formText.slice(0, 260)}`,
      );

      if ((await titleInput.count()) && draftBtn.enabled) {
        await titleInput.fill('QA 草稿：客户新增经营报表需求');
        const reason = page.getByLabel('原因与内容').first();
        if (await reason.count()) {
          await reason.fill('客户提出新增两张经营报表，需评估成本与工期影响；仅验证保存草稿，不提交评估。');
        }
        await page.getByRole('button', { name: /保存草稿/ }).first().click();
        await page.waitForTimeout(1200);
        const msg = await flash(page);
        const status = (await page.locator('[data-testid="change-status"]').allInnerTexts().catch(() => [])).join('/') || '无标签';
        const draftBtn2 = await btnState(page, /保存草稿/);
        const submitEval2 = await btnState(page, /提交评估/);
        record(
          ctx,
          status.includes('草稿') ? 'OK' : 'BUG',
          '新建变更“只保存不提交”的反馈与状态',
          `复现：填写标题/原因 → 点“保存草稿”；反馈提示=${msg || '无（未见 antd message）'}；状态标签=${status}；URL=${pathname(page)}；保存后可再次保存=${draftBtn2.enabled}；提交评估可用=${submitEval2.enabled}；期望：保存为草稿且不触发影响评估`,
        );
        await shot(page, 'd2/exec-ops', 't2-pm-change-draft', false);
      } else {
        record(
          ctx,
          'FLOW',
          '变更草稿无法保存（按钮置灰或表单缺失）',
          `路径=${pathname(page)}；保存草稿可用=${draftBtn.enabled}；标题输入存在=${(await titleInput.count()) > 0}；页面片段=${formText.slice(0, 220)}`,
        );
      }
    } else {
      record(
        ctx,
        'FLOW',
        'PM 无法发起变更（按钮置灰）',
        `路径=/projects/P-001/changes；期望：PM 可发起变更草稿；实际：发起变更按钮 disabled；页面片段=${t2.slice(0, 200)}`,
      );
    }
  });

  await guard(ctx, '场景2-成本单（PM）', async () => {
    await goto(page, '/projects/P-001/cost-orders');
    step(ctx, 'PM → /projects/P-001/cost-orders（任务给定入口）');
    const p1 = await problems(page);
    record(
      ctx,
      p1.length ? 'FLOW' : 'OK',
      '任务给定入口 /projects/P-001/cost-orders 可用性',
      `期望：成本单列表；实际：URL=${pathname(page)}；页面问题命中=${p1.join(',') || '无'}；main 片段=${(await mainText(page)).slice(0, 160)}`,
    );

    await goto(page, '/projects/P-001/costs');
    step(ctx, 'PM → /projects/P-001/costs（实际路由）');
    const rows = await page.locator('main tbody tr').allInnerTexts();
    const t2 = await mainText(page);
    const newBtn = await btnState(page, /新建.*申请/);
    record(
      ctx,
      rows.length || newBtn.count ? 'OK' : 'BUG',
      '成本单列表与新建按钮（PM）',
      `路径=/projects/P-001/costs；含“成本”页头=${t2.includes('成本')}；行数=${rows.length}；新建按钮=${newBtn.count}/${newBtn.text || '无'}/可用=${newBtn.enabled}；首行=${(rows[0] ?? '').replace(/\s+/g, ' ').slice(0, 170)}`,
    );
    await shot(page, 'd2/exec-ops', 't2-pm-cost-orders', false);

    if (newBtn.count && newBtn.enabled) {
      await page.getByRole('button', { name: /新建.*申请/ }).first().click();
      await page.waitForTimeout(800);
      const formText = await modalText(page);
      record(
        ctx,
        'OK',
        '新建成本申请表单字段与必填项',
        `路径=/projects/P-001/costs；弹层=${formText.slice(0, 380)}`,
      );
      await page.getByLabel('成本申请标题').first().fill('QA 成本申请：现场实施耗材');
      const subject = page.getByLabel('申请成本科目').first();
      if (await subject.count()) {
        await subject.click();
        await page.waitForTimeout(400);
        const opt = page.getByRole('option').first();
        if (await opt.count()) await opt.click();
        await page.waitForTimeout(300);
      }
      await page.getByLabel('申请金额').first().fill('3');
      await page.getByLabel('供应商或收款方').first().fill('QA 供应商（验证用）');
      await page.getByLabel('成本申请范围用途').first().fill('QA 验证：新建成本申请并观察是否进入财务审批。');
      const okClicked = await modalOk(page);
      const msg = await flash(page);
      const t3 = await mainText(page);
      const newRow = page.locator('main tbody tr').filter({ hasText: 'QA 成本申请' }).first();
      const newRowText = (await newRow.count()) ? (await newRow.innerText()).replace(/\s+/g, ' ') : '';
      record(
        ctx,
        /财务审批|待审批/.test(msg + t3) ? 'OK' : 'BUG',
        '新建成本单是否需要财务审批（提交后状态）',
        `复现：新建成本申请 → 填写标题/科目/金额/供应商/用途 → 点确定（点击成功=${okClicked}）；反馈=${msg || '无'}；新行=${newRowText || '列表未见新行'}；main 含“待审批”=${t3.includes('待审批')}；期望：提交后“已提交财务审批，尚未计入实际”且状态=待审批`,
      );
    } else {
      record(
        ctx,
        'FLOW',
        'PM 无法新建成本单（按钮置灰或缺失）',
        `路径=/projects/P-001/costs；新建按钮数=${newBtn.count}；可用=${newBtn.enabled}；页面片段=${(await mainText(page)).slice(0, 200)}`,
      );
    }
  });

  await guard(ctx, '场景2-工时（PM）', async () => {
    await goto(page, '/projects/P-001/labor');
    step(ctx, 'PM → /projects/P-001/labor（任务给定入口）');
    const p1 = await problems(page);
    record(
      ctx,
      p1.length ? 'FLOW' : 'OK',
      '任务给定入口 /projects/P-001/labor 可用性',
      `期望：工时与人力成本页；实际：URL=${pathname(page)}；页面问题命中=${p1.join(',') || '无'}；main 片段=${(await mainText(page)).slice(0, 160)}`,
    );

    await goto(page, '/projects/P-001/labor-cost');
    step(ctx, 'PM → /projects/P-001/labor-cost（实际路由）');
    const t2 = await mainText(page);
    const fill = await btnState(page, /填报本人工时/);
    const rows = await page.locator('main tbody tr').allInnerTexts();
    record(
      ctx,
      fill.count ? 'OK' : 'BUG',
      '工时页与“填报本人工时”入口（PM）',
      `路径=/projects/P-001/labor-cost；含“HS-09 工时与人力成本”=${t2.includes('HS-09')}；Tab=${(await page.getByRole('tab').allInnerTexts().catch(() => [])).join(' / ')}；工时行数=${rows.length}；填报按钮=${fill.count}/可用=${fill.enabled}；人力预算=${after(t2, '人力预算', 40)}；锁定/规则提示=${after(t2, '演示规则', 120)}`,
    );
    await shot(page, 'd2/exec-ops', 't2-pm-labor', false);

    if (fill.count && fill.enabled) {
      await page.getByRole('button', { name: /填报本人工时/ }).first().click();
      await page.waitForTimeout(700);
      const fieldCount = await page
        .locator('.ant-modal-content [aria-label="工时所属任务"], .ant-modal-content [aria-label="工时日期"], .ant-modal-content [aria-label="投入小时"], .ant-modal-content [aria-label="工时工作内容"]')
        .count();
      const submitLabor = await btnState(page, /提交工时审核/);
      record(
        ctx,
        fieldCount >= 3 ? 'OK' : 'BUG',
        '工时填报弹层字段与提交按钮',
        `复现：点“填报本人工时”；弹层文本=${(await modalText(page)).slice(0, 260)}；关键字段命中=${fieldCount}/4；提交工时审核=${submitLabor.count}/可用=${submitLabor.enabled}`,
      );
      const cancel = page.locator('.ant-modal-footer button').filter({ hasText: /取\s*消/ }).last();
      if (await cancel.count()) {
        await cancel.click();
        await page.waitForTimeout(400);
      }
    } else {
      record(
        ctx,
        'FLOW',
        'PM 无法填报本人工时（按钮置灰）',
        `路径=/projects/P-001/labor-cost；按钮数=${fill.count}；可用=${fill.enabled}；页面片段=${t2.slice(0, 220)}`,
      );
    }
  });

  await guard(ctx, '场景2-运维（PMO）', async () => {
    // 追加 initScript 覆盖身份（后注册的脚本在页面加载时后执行 → 最终为 PMO）。
    await login(page, 'pmo', 'P-007');
    await goto(page, '/operations');
    step(ctx, 'PMO → /operations（任务给定入口）');
    const header = (await page.locator('header').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100);
    const p1 = await problems(page);
    record(
      ctx,
      p1.length ? 'FLOW' : 'OK',
      '任务给定入口 /operations 可用性',
      `期望：运维周期列表；实际：URL=${pathname(page)}；顶部身份区=${header}；页面问题命中=${p1.join(',') || '无'}；main 片段=${(await mainText(page)).slice(0, 160)}`,
    );

    await goto(page, '/projects/P-008/operations');
    step(ctx, 'PMO → /projects/P-008/operations（任务给定入口）');
    const p2 = await problems(page);
    record(
      ctx,
      p2.length ? 'FLOW' : 'OK',
      '任务给定入口 /projects/P-008/operations 可用性',
      `期望：P-008 运维详情；实际：URL=${pathname(page)}；页面问题命中=${p2.join(',') || '无'}；main 片段=${(await mainText(page)).slice(0, 160)}`,
    );

    await goto(page, '/operations/OPS-007');
    step(ctx, 'PMO → /operations/OPS-007（实际运维周期路由）');
    const t = await mainText(page);
    const p3 = await problems(page);
    const rows = await page.locator('main tbody tr').allInnerTexts();
    const eventBtn = await btnState(page, /登记运维记录/);
    record(
      ctx,
      p3.length ? 'BLOCK' : 'OK',
      '运维周期页（周期/团队/事件列表）',
      `路径=/operations/OPS-007；页面问题=${p3.join(',') || '无'}；含“JS-12 运维服务管理”=${t.includes('JS-12')}；周期状态=${after(t, '周期状态', 24)}；服务周期=${after(t, '服务周期', 50)}；${after(t, 'SLA', 40)}；运维团队=${after(t, '运维团队', 60)}；事件行数=${rows.length}；首行=${(rows[0] ?? '').replace(/\s+/g, ' ').slice(0, 140)}；登记按钮=${eventBtn.count}/可用=${eventBtn.enabled}`,
    );
    await shot(page, 'd2/exec-ops', 't2-pmo-operations', false);

    if (eventBtn.count && eventBtn.enabled) {
      await page.getByRole('button', { name: /登记运维记录/ }).first().click();
      await page.waitForTimeout(700);
      const formText = await modalText(page);
      record(ctx, 'OK', '登记运维记录表单字段', `弹层=${formText.slice(0, 320)}`);
      const titleField = page.getByLabel('主题').first();
      if (await titleField.count()) await titleField.fill('QA 运维事件：巡检发现备份任务失败');
      const noteField = page.getByLabel(/记录 \/ 续期依据/).first();
      if (await noteField.count()) await noteField.fill('QA 验证：巡检发现备份任务连续两次失败，已重启任务并核对备份完整性。');
      await modalOk(page);
      const msg = await flash(page);
      const rows2 = await page.locator('main tbody tr').allInnerTexts();
      const qaRow = page.locator('main tbody tr').filter({ hasText: 'QA 运维事件' }).first();
      const qaRowText = (await qaRow.count()) ? (await qaRow.innerText()).replace(/\s+/g, ' ') : '';
      record(
        ctx,
        qaRowText ? 'OK' : 'BUG',
        '新建运维事件后的列表与状态',
        `复现：点“登记运维记录”→ 填写主题/依据 → 确定；反馈=${msg || '无'}；事件行数=${rows.length}→${rows2.length}；新行=${qaRowText || '未见新行'}；期望：新事件状态=未解决并出现在“服务 / 问题 / SLA”表`,
      );

      if (qaRowText) {
        const resolve = qaRow.getByRole('button', { name: /解决并留证/ }).first();
        const resolveCount = await resolve.count();
        const resolveEnabled = resolveCount ? await resolve.isEnabled().catch(() => false) : false;
        if (resolveEnabled) {
          await resolve.click();
          await page.waitForTimeout(700);
          const resolveNote = page.getByLabel(/解决经过与证据/).first();
          if (await resolveNote.count()) {
            await resolveNote.fill('QA 验证：已恢复备份任务并校验最新快照，问题关闭。');
          }
          await modalOk(page);
          const msg2 = await flash(page);
          const qaRow2 = page.locator('main tbody tr').filter({ hasText: 'QA 运维事件' }).first();
          const afterText = (await qaRow2.count())
            ? (await qaRow2.innerText()).replace(/\s+/g, ' ')
            : '未见该行';
          record(
            ctx,
            afterText.includes('已解决') ? 'OK' : 'BUG',
            '处理（解决并留证）运维事件的反馈与状态',
            `复现：行内点“解决并留证”→ 填写解决经过与证据 → 确定；反馈=${msg2 || '无'}；处理状态=${after(afterText, '已解决', 40) || afterText.slice(0, 160)}；解决依据=${afterText.slice(afterText.indexOf('已解决'))}`,
          );
        } else {
          record(
            ctx,
            'BLOCK',
            'PMO 无法处理运维事件（解决并留证不可用）',
            `路径=/operations/OPS-007；按钮数=${resolveCount}；可用=${resolveEnabled}；期望：周期服务中且 PMO 为成员可解决事件；行文本=${qaRowText.slice(0, 160)}`,
          );
        }
      }
    } else {
      record(
        ctx,
        'BLOCK',
        'PMO 无法新建运维事件（登记按钮置灰）',
        `路径=/operations/OPS-007；按钮数=${eventBtn.count}；可用=${eventBtn.enabled}；页面片段=${t.slice(0, 220)}`,
      );
    }

    record(
      ctx,
      ctx.consoleErrors.length || ctx.pageErrors.length ? 'UI' : 'OK',
      'T2 控制台/运行时错误',
      `console.error=${ctx.consoleErrors.slice(0, 4).join(' || ') || '无'}；pageerror=${ctx.pageErrors.slice(0, 2).join(' || ') || '无'}`,
    );
  });

  finish(
    ctx,
    '场景2：变更台账/新建草稿、成本单新建与财务审批、工时填报入口、运维周期与事件登记/解决；任务给定入口与实际路由差异已单独记录。',
  );
});
