import { test, type Page } from '@playwright/test';
import { login, laneContext, goto, shot, step, record, finish, visibleProblems, type LaneContext } from './_helpers';

/**
 * R3 B1：集团领导(王总 U-006) + 财务专员(刘敏 U-004) 只读 QA。
 * 3 个场景：财务待办→APR-1 三节点→基线；领导驾驶舱/待办原单跳转；财务结算与配置深链。
 * 全部数值只读取文本后 record 对比，不用 expect 断言业务值。
 */

const pathname = (page: Page) => new URL(page.url()).pathname;
const mainText = async (page: Page) => (await page.locator('main').innerText().catch(() => '')).replace(/\n+/g, ' | ');
const after = (t: string, label: string, len = 60) => {
  const i = t.indexOf(label);
  return i < 0 ? '' : t.slice(i, i + label.length + len);
};
const problems = async (page: Page) => {
  const hits = await visibleProblems(page);
  const t = await mainText(page);
  if (t.includes('404') || t.includes('Not Found')) hits.push('404');
  return hits;
};

/** 顶部身份下拉切换（保留内存业务状态）。 */
async function asRole(page: Page, label: RegExp) {
  let trigger = page.locator('.ant-select[aria-label="模拟身份"]').first();
  if (!(await trigger.count())) {
    trigger = page.locator('.ant-select').filter({ has: page.locator('[aria-label="模拟身份"]') }).first();
  }
  if (!(await trigger.count())) trigger = page.locator('header .ant-select').first();
  await trigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: label }).first().click();
  await page.waitForTimeout(600);
}

/** SPA 内跳转，保留同一内存 store。 */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(800);
}

async function confirmOverlay(page: Page) {
  const btn = page
    .locator('.ant-modal-footer button, .ant-popconfirm button, .ant-popover button')
    .filter({ hasText: /确\s*定|确\s*认|提\s*交|保\s*存/ })
    .last();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(900);
    return true;
  }
  return false;
}

async function overlayText(page: Page) {
  const loc = page.locator('.ant-modal-content, .ant-popover-inner, .ant-drawer-content').last();
  return (await loc.count()) ? (await loc.innerText()).replace(/\n+/g, ' | ').slice(0, 400) : '';
}

async function guard(ctx: LaneContext, body: () => Promise<void>) {
  try {
    await body();
  } catch (error) {
    record(ctx, 'BLOCK', '用例执行中断', `${String(error).slice(0, 400)}（URL=${pathname(ctx.page)}）`);
  }
}

test('T1 财务待办进入原单 → APR-1 三节点+基线确认 → 预算/待办迁移', async ({ page }) => {
  test.setTimeout(300_000);
  const ctx = laneContext(page, 'b1');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await goto(page, '/workbench/todos');
    step(ctx, '财务登录 → /workbench/todos');
    const tabs = await page.getByRole('tab').allInnerTexts();
    const rows = await page.locator('main tbody tr').allInnerTexts();
    record(ctx, 'OK', '财务待办清单可见', `Tab=${tabs.join(' / ')}；首屏行数=${rows.length}；首行=${(rows[0] ?? '').replace(/\s+/g, ' ').slice(0, 160)}`);
    await shot(page, 'b1', 't1-todos');

    const aprRow = page.locator('main tbody tr').filter({ hasText: 'APR-1' }).first();
    const hasApr = await aprRow.count();
    record(
      ctx,
      'OK',
      '待办表含 APR-1 财务复核项',
      `APR-1 行存在=${hasApr > 0}；行文本=${hasApr ? (await aprRow.innerText()).replace(/\s+/g, ' ').slice(0, 220) : '未找到'}`,
    );
    await aprRow.getByRole('button', { name: /进入原业务/ }).click();
    await page.waitForTimeout(1200);
    const url1 = pathname(page);
    const t1 = await mainText(page);
    record(
      ctx,
      url1 === '/approvals/APR-1' ? 'OK' : 'BUG',
      '待办“进入原业务”应落到 /approvals/APR-1',
      `期望 URL=/approvals/APR-1；实际 URL=${url1}；main 含“审批详情”=${t1.includes('审批详情')}；当前节点=${after(t1, '当前节点', 26)}；片段=${t1.slice(0, 180)}`,
    );

    if (url1.startsWith('/approvals/')) {
      await page.getByLabel('审批意见').fill('财务复核：科目口径与概算一致，同意报送 PMO');
      await page.getByRole('button', { name: /通过/ }).first().click();
      await page.waitForTimeout(700);
      const m1 = await overlayText(page);
      await confirmOverlay(page);
      let t = await mainText(page);
      record(
        ctx,
        /2\/3/.test(t) ? 'OK' : 'BUG',
        '财务复核通过后应流转 PMO 节点',
        `确认浮层=${m1.slice(0, 120)}；实际当前节点=${after(t, '当前节点', 26)}；审批状态=${after(t, '审批状态', 14)}`,
      );

      await asRole(page, /PMO负责人|李主任/);
      record(ctx, pathname(page) === '/approvals/APR-1' ? 'OK' : 'BLOCK', '切换 PMO 后仍停留审批详情', `实际 URL=${pathname(page)}`);
      t = await mainText(page);
      const pmoBtn = page.getByRole('button', { name: /通过/ }).first();
      const pmoEnabled = (await pmoBtn.count()) > 0 && (await pmoBtn.isEnabled().catch(() => false));
      if (pmoEnabled) {
        await page.getByLabel('审批意见').fill('PMO 评审：范围与计划匹配，同意上报');
        await pmoBtn.click();
        await page.waitForTimeout(700);
        await confirmOverlay(page);
      }
      t = await mainText(page);
      record(
        ctx,
        /3\/3/.test(t) ? 'OK' : 'BLOCK',
        'PMO 节点通过后应流转集团领导决策',
        `PMO 按钮可用=${pmoEnabled}；当前节点=${after(t, '当前节点', 26)}`,
      );

      await asRole(page, /集团领导|王总/);
      const execBtn = page.getByRole('button', { name: /通过/ }).first();
      const execEnabled = (await execBtn.count()) > 0 && (await execBtn.isEnabled().catch(() => false));
      if (execEnabled) {
        await page.getByLabel('审批意见').fill('集团领导决策：同意追加预算，须同步基线');
        await execBtn.click();
        await page.waitForTimeout(700);
        await confirmOverlay(page);
      }
      t = await mainText(page);
      record(
        ctx,
        execEnabled ? 'OK' : 'BLOCK',
        '集团领导节点可办理',
        `领导按钮可用=${execEnabled}；当前节点=${after(t, '当前节点', 26)}；审批状态=${after(t, '审批状态', 14)}`,
      );

      await asRole(page, /PMO负责人|李主任/);
      const baseBtn = page.getByRole('button', { name: /确认基线生效/ });
      const baseCount = await baseBtn.count();
      if (baseCount) {
        await baseBtn.first().click();
        await page.waitForTimeout(700);
        await confirmOverlay(page);
      }
      t = await mainText(page);
      record(
        ctx,
        baseCount > 0 ? 'OK' : 'FLOW',
        '审批通过后 PMO 可确认基线生效',
        `按钮数=${baseCount}；main 含“确认基线生效”=${t.includes('确认基线生效')}；审批状态=${after(t, '审批状态', 14)}`,
      );

      await spa(page, '/projects/P-001/budget');
      const bt = await mainText(page);
      record(
        ctx,
        'OK',
        '预算页版本/总额观察（基线生效后）',
        `含 V1.2=${bt.includes('V1.2')}；含生效基线=${after(bt, '生效基线', 40)}；含 3340.48=${/3,?340\.48/.test(bt)}；片段=${bt.slice(0, 200)}`,
      );
      await asRole(page, /财务专员|刘敏/);
      await spa(page, '/workbench/todos');
      const tabs2 = await page.getByRole('tab').allInnerTexts();
      const todoText = await mainText(page);
      record(
        ctx,
        todoText.includes('APR-1') ? 'FLOW' : 'OK',
        '财务复核后 APR-1 应从财务待办移除',
        `Tab=${tabs2.join(' / ')}；待办 Tab 含 APR-1=${todoText.includes('APR-1')}；片段=${after(todoText, 'APR-1', 120) || todoText.slice(0, 180)}`,
      );
      const doneTab = page.locator('.ant-tabs-tab').filter({ hasText: /^\s*已办/ }).first();
      if (await doneTab.count()) {
        await doneTab.click();
        await page.waitForTimeout(1200);
        const doneText = await mainText(page);
        record(
          ctx,
          doneText.includes('APR-1') ? 'OK' : 'BUG',
          '已办应保留 APR-1 财务复核记录',
          `已办 Tab 含 APR-1=${doneText.includes('APR-1')}；当前 URL=${pathname(page)}${page.url().includes('?') ? page.url().slice(page.url().indexOf('?')) : ''}；片段=${after(doneText, 'APR-1', 140) || doneText.slice(0, 200)}`,
        );
      } else {
        record(ctx, 'BUG', '财务已办 Tab 不可点击', `Tab=${tabs2.join(' / ')}`);
      }
    }
    record(
      ctx,
      ctx.consoleErrors.length ? 'UI' : 'OK',
      'T1 控制台错误',
      ctx.consoleErrors.length ? ctx.consoleErrors.slice(0, 3).join(' || ') : '无 console.error',
    );
  });
  finish(ctx, '场景1：财务待办 → APR-1 三节点审批 → PMO 基线确认 → 预算页/待办迁移。结论见各条目。');
});

test('T2 集团领导：驾驶舱/审批列表/待办原单跳转/KPI 与台账一致性', async ({ page }) => {
  test.setTimeout(300_000);
  const ctx = laneContext(page, 'b1');
  await login(page, 'executive', 'P-001');
  await guard(ctx, async () => {
    step(ctx, '领导登录 → /workbench/executive（路由存在性）');
    await page.goto('/workbench/executive');
    await page.waitForTimeout(2500);
    const pWork = pathname(page);
    record(
      ctx,
      pWork === '/workbench/executive' ? 'OK' : 'BUG',
      '/workbench/executive 是否为有效路由',
      `期望：存在领导工作台或重定向到 /executive/dashboard；实际 URL=${pWork}；页面问题=${(await problems(page)).join(',') || '无'}；片段=${(await mainText(page)).slice(0, 160)}`,
    );

    await goto(page, '/executive/dashboard');
    step(ctx, '→ /executive/dashboard');
    const dt = await mainText(page);
    const empties = await page.locator('.ant-empty').count();
    const canvases = await page.locator('canvas, svg.recharts-surface').count();
    record(
      ctx,
      empties > 0 ? 'UI' : 'OK',
      '经营驾驶舱 KPI 与图表渲染',
      `KPI 片段=${dt.slice(0, 320)}；空数据占位 .ant-empty=${empties}；图表节点=${canvases}`,
    );
    record(
      ctx,
      /P-001/.test(dt) ? 'OK' : 'RISK',
      '驾驶舱项目相关明细含 P-001',
      `main 含 P-001=${/P-001/.test(dt)}；含 P-006=${/P-006/.test(dt)}；含 P-007=${/P-007/.test(dt)}`,
    );
    await shot(page, 'b1', 't2-exec-dashboard', false);

    await goto(page, '/management-approvals');
    step(ctx, '→ /management-approvals（列表）');
    const mp = await problems(page);
    record(
      ctx,
      mp.length ? 'BUG' : 'OK',
      '/management-approvals 列表页可用性',
      `页面问题=${mp.join(',') || '无'}；URL=${pathname(page)}；片段=${(await mainText(page)).slice(0, 200)}`,
    );

    await goto(page, '/approvals');
    step(ctx, '→ /approvals 审批列表');
    const apRows = await page.locator('main tbody tr').allInnerTexts();
    record(
      ctx,
      apRows.length ? 'OK' : 'BUG',
      '审批列表可见且含预算审批单',
      `行数=${apRows.length}；APR 编号=${[...new Set((apRows.join(' ').match(/APR-\d+/g) ?? []))].slice(0, 16).join(',')}；首行=${(apRows[0] ?? '').replace(/\s+/g, ' ').slice(0, 180)}`,
    );

    await goto(page, '/workbench/todos');
    step(ctx, '领导 → /workbench/todos 打开 executive 待办');
    const rows = await page.locator('main tbody tr').allInnerTexts();
    const execRow = page.locator('main tbody tr').filter({ hasText: /MGT-|APR-/ }).first();
    const rowExists = await execRow.count();
    const rowText = rowExists ? (await execRow.innerText()).replace(/\s+/g, ' ') : '';
    record(
      ctx,
      rowExists ? 'OK' : 'BLOCK',
      '领导待办清单可见',
      `行数=${rows.length}；首行=${rowText.slice(0, 200)}；Tab=${(await page.getByRole('tab').allInnerTexts()).join(' / ')}`,
    );
    if (rowExists) {
      const expectId = (rowText.match(/(MGT|APR|SET|SREQ)-[\w-]+/) ?? [''])[0];
      await execRow.getByRole('button', { name: /进入原业务/ }).click();
      await page.waitForTimeout(1200);
      const url2 = pathname(page);
      const t2 = await mainText(page);
      const expectPath = expectId.startsWith('MGT') ? `/management-approvals/${expectId}` : expectId.startsWith('APR') ? `/approvals/${expectId}` : '原单据路由';
      record(
        ctx,
        url2.includes(expectId) ? 'OK' : 'BUG',
        '领导待办“进入原业务”应打开对应原单',
        `待办=${expectId}；期望 URL≈${expectPath}；实际 URL=${url2}；main 含审批详情=${t2.includes('审批详情') || t2.includes('管理审批')}；片段=${t2.slice(0, 200)}`,
      );
      const approveBtn = page.getByRole('button', { name: /通过/ }).first();
      if (await approveBtn.count()) {
        const opinion = page.getByLabel('审批意见');
        if (await opinion.count()) await opinion.fill('集团领导：同意，按基线执行并跟踪偏差');
        await approveBtn.click();
        await page.waitForTimeout(700);
        const modal = await overlayText(page);
        await confirmOverlay(page);
        const t3 = await mainText(page);
        record(
          ctx,
          'OK',
          '领导审批提交后的状态与待办观察',
          `确认浮层=${modal.slice(0, 160)}；审批状态=${after(t3, '审批状态', 16)}；main 含待办=${t3.includes('待办')}`,
        );
      } else {
        record(ctx, 'BUG', '领导应在待办原单看到审批动作', `页面无“通过”类按钮；片段=${(await mainText(page)).slice(0, 200)}`);
      }
    }

    await goto(page, '/projects');
    const ledger = await mainText(page);
    const pick = (id: string) => {
      const i = ledger.indexOf(id);
      return i < 0 ? `${id}:未出现在台账` : ledger.slice(i, i + 140);
    };
    record(
      ctx,
      ledger.includes('P-001') ? 'OK' : 'RISK',
      '项目台账 P-001/P-006/P-007 状态与驾驶舱口径',
      `台账片段：${pick('P-001')} || ${pick('P-006')} || ${pick('P-007')}`,
    );
    record(
      ctx,
      ctx.consoleErrors.length ? 'UI' : 'OK',
      'T2 控制台错误',
      ctx.consoleErrors.length ? ctx.consoleErrors.slice(0, 3).join(' || ') : '无 console.error',
    );
  });
  finish(ctx, '场景2：领导驾驶舱 / 待办原单跳转 / 审批动作 / KPI 与台账一致性。');
});

test('T3 财务结算与配置深链：SET/SREQ、整改阻断、Tab 深链、权限 403', async ({ page }) => {
  test.setTimeout(300_000);
  const ctx = laneContext(page, 'b1');
  await login(page, 'finance', 'P-001');
  await guard(ctx, async () => {
    await page.goto('/settlement');
    await page.waitForTimeout(2500);
    step(ctx, '财务 → /settlement 列表');
    const sp = await problems(page);
    record(
      ctx,
      sp.length ? 'BUG' : 'OK',
      '/settlement 结算列表路由可用性',
      `实际 URL=${pathname(page)}；页面问题=${sp.join(',') || '无'}；片段=${(await mainText(page)).slice(0, 200)}`,
    );

    await goto(page, '/projects/P-023/settlement');
    step(ctx, '→ /projects/P-023/settlement（待结算）');
    const s23 = await mainText(page);
    record(
      ctx,
      'OK',
      'P-023 结算页四算/锁定信息',
      `含 SET-0008=${s23.includes('SET-0008')}；含“锁定”=${s23.includes('锁定')}；含“已生效”=${s23.includes('已生效')}；四算片段=${after(s23, '四算', 120) || s23.slice(0, 200)}`,
    );
    const setRow = page.locator('main tbody tr').filter({ hasText: /SET-0008/ }).first();
    if (await setRow.count()) {
      await setRow.click().catch(() => undefined);
      await page.waitForTimeout(800);
      const openedUrl = pathname(page);
      const detail = await page.locator('.ant-modal-content, .ant-drawer-content').last();
      const detailText = (await detail.count()) ? (await detail.innerText()).replace(/\n+/g, ' | ').slice(0, 400) : '';
      const editableInputs = (await detail.count()) ? await detail.locator('input:not([disabled]), textarea:not([disabled])').count() : -1;
      record(
        ctx,
        editableInputs === 0 ? 'OK' : 'BUG',
        'SET-0008 已锁定记录详情应只读',
        `URL=${openedUrl}；详情文本=${detailText || '无浮层（行未展开）'}；可编辑输入框数=${editableInputs}`,
      );
    } else {
      record(ctx, 'FLOW', 'P-023 结算页未列出 SET-0008 记录', `页面可见 SET 编号=${[...new Set((s23.match(/SET-\d+/g) ?? []))].join(',') || '无'}`);
    }

    await goto(page, '/workbench/todos');
    step(ctx, '→ /workbench/todos 查找 SREQ 财务核算待办');
    const todoAll = await mainText(page);
    const sreq = [...new Set(todoAll.match(/SREQ-\d+/g) ?? [])];
    record(
      ctx,
      sreq.length ? 'OK' : 'FLOW',
      '财务待办含结算申请 SREQ 财务核算项',
      `命中=${sreq.join(',') || '无'}；片段=${after(todoAll, 'SREQ', 160) || todoAll.slice(0, 200)}`,
    );
    const sreqRow = page.locator('main tbody tr').filter({ hasText: /SREQ-/ }).first();
    if (await sreqRow.count()) {
      await sreqRow.getByRole('button', { name: /进入原业务/ }).click();
      await page.waitForTimeout(1200);
      const t = await mainText(page);
      record(
        ctx,
        /SREQ-\d+/.test(pathname(page)) ? 'OK' : 'BUG',
        'SREQ 待办进入原业务路由',
        `实际 URL=${pathname(page)}；含“财务核算”=${t.includes('财务核算')}；片段=${t.slice(0, 200)}`,
      );
    }

    await goto(page, '/projects/P-006/settlement/apply');
    step(ctx, '→ /projects/P-006/settlement/apply（整改中应阻断）');
    const p6 = await mainText(page);
    const submitBtn = page.getByRole('button', { name: /提交结算|发起结算|提交申请/ }).first();
    record(
      ctx,
      /整改|阻断|不可|禁止|未满足/.test(p6) ? 'OK' : 'BUG',
      '整改中项目发起结算应给出阻断提示',
      `含整改=${p6.includes('整改')}；提交按钮数=${await submitBtn.count()}，可用=${await submitBtn.isEnabled().catch(() => false)}；片段=${p6.slice(0, 300)}`,
    );
    await shot(page, 'b1', 't3-p006-apply', false);

    for (const [path, expectTab] of [
      ['/settings/cost-mapping', '成本映射'],
      ['/settings/cost-baseline', '成本基线'],
      ['/settings/alerts', '预警'],
    ] as const) {
      await goto(page, path);
      const active = await page.locator('.ant-tabs-tab-active').allInnerTexts().catch(() => []);
      const body = await mainText(page);
      record(
        ctx,
        active.join('').includes(expectTab) ? 'OK' : 'BUG',
        `深链 ${path} 应激活“${expectTab}”Tab`,
        `激活 Tab=${active.join(' / ') || '无'}；main 前缀=${body.slice(0, 160)}`,
      );
    }

    await goto(page, '/settings/permissions');
    step(ctx, '→ 财务访问 /settings/permissions');
    const perm = await mainText(page);
    const permProblems = await problems(page);
    record(
      ctx,
      /无权|没有访问权限|403|仅.*可访问/.test(perm) || permProblems.length ? 'OK' : 'BUG',
      '财务访问 /settings/permissions 应 403/无权',
      `页面问题=${permProblems.join(',') || '无'}；片段=${perm.slice(0, 200)}`,
    );

    await goto(page, '/workbench/todos');
    const wide = await page.evaluate(() => {
      const el = document.querySelector('main .ant-table-content, main .ant-table-body');
      return el ? { scroll: el.scrollWidth, client: el.clientWidth } : null;
    });
    record(
      ctx,
      wide && wide.scroll > wide.client ? 'UI' : 'OK',
      '待办宽表横向滚动容器',
      `表格 scrollWidth=${wide?.scroll ?? 'n/a'} clientWidth=${wide?.client ?? 'n/a'}（scroll>client 时需要横向滚动）`,
    );
    const align = await page.evaluate(() => {
      const td = Array.from(document.querySelectorAll('main tbody tr td')) as HTMLElement[];
      const money = td.filter((c) => /^[¥￥]?\s?\d{1,3}(,\d{3})+(\.\d+)?$/.test((c.innerText || '').trim()));
      return { moneyCells: money.length, rightAligned: money.filter((c) => getComputedStyle(c).textAlign === 'right').length };
    });
    record(
      ctx,
      align.moneyCells === 0 || align.rightAligned === align.moneyCells ? 'OK' : 'UI',
      '金额千分位与右对齐',
      `千分位金额单元格=${align.moneyCells}，右对齐=${align.rightAligned}（待办页）`,
    );
    record(
      ctx,
      ctx.consoleErrors.length ? 'UI' : 'OK',
      'T3 控制台错误',
      ctx.consoleErrors.length ? ctx.consoleErrors.slice(0, 4).join(' || ') : '无 console.error',
    );
  });
  finish(ctx, '场景3：财务结算列表 / P-023 已锁定记录只读 / SREQ 财务核算 / P-006 整改阻断 / 配置深链 Tab / permissions 403 / UI。');
});
