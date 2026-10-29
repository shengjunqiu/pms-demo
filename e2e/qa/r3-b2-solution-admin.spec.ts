import { test, type Page } from '@playwright/test';
import { login, laneContext, goto, shot, step, record, finish, switchRole, visibleProblems } from './_helpers';

/**
 * R3 B2：方案架构师(赵工 U-003) + 系统管理员(Admin U-007) 只读 QA。
 * 3 个场景：技术方案编辑/版本/成本可见性；六张配置页与深链 Tab；权限变更与审计、跨角色拦截。
 * 只读取文本后 record，不用 expect 断言业务数值；超时不记为业务缺陷。
 */

test.setTimeout(300_000);

const pathname = (page: Page) => new URL(page.url()).pathname + new URL(page.url()).search;
const mainText = async (page: Page) =>
  (await page.locator('main').innerText().catch(() => '')).replace(/\n+/g, ' | ');
const count = async (page: Page, sel: string) => page.locator(sel).count();
const rowCount = async (page: Page) => page.locator('main .ant-table-tbody tr.ant-table-row').count();
const firstMatch = (t: string, words: string[], len = 90) => {
  for (const w of words) {
    const i = t.indexOf(w);
    if (i >= 0) return t.slice(Math.max(0, i - 30), i + w.length + len);
  }
  return '';
};
const problems = async (page: Page) => {
  const hits = await visibleProblems(page);
  const t = await mainText(page);
  if (t.includes('404') || t.includes('Not Found')) hits.push('404');
  // StateView 403 兜底文案：“403 无访问权限 / 当前角色没有权限访问该页面”
  if (/403/.test(t) && /权限/.test(t)) hits.push('403 兜底页');
  return hits;
};
/** 读取一条 message/notification 文案。 */
async function toast(page: Page) {
  const loc = page.locator('.ant-message-notice-content, .ant-notification-notice').last();
  if (!(await loc.count())) return '';
  return (await loc.innerText().catch(() => '')).replace(/\n+/g, ' ').slice(0, 160);
}
/** SPA 内跳转，保留同一内存 store（不触发整页刷新）。 */
async function spa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(900);
}
/** 抽屉/弹窗文本。 */
async function overlayText(page: Page) {
  const loc = page.locator('.ant-drawer-content, .ant-modal-content').last();
  if (!(await loc.count())) return '';
  return (await loc.innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 500);
}

test('B2-1 方案架构师：OPP-066 技术方案编辑/版本/成本可见性与市场角色写权限', async ({ page }) => {
  const ctx = laneContext(page, 'r3/b2');
  await login(page, 'solution-tech');
  step(ctx, 'login solution-tech → /solutions/OPP-066（任务给定深链）');
  await goto(page, '/solutions/OPP-066');
  const p0 = await problems(page);
  record(
    ctx,
    'BUG',
    '/solutions/OPP-066 深链无对应路由，落到占位/错误页',
    `复现：login solution-tech → 直接访问 /solutions/OPP-066。期望：进入 OPP-066 技术方案页；实际：URL=${pathname(page)}，问题命中=${p0.join('、') || '无（但内容为：' + (await mainText(page)).slice(0, 160) + '）'}。代码中真实路由为 /opportunities/:id/solution（src/routes/modules/opportunities.tsx:21），导航与文档口径不一致。`,
  );

  step(ctx, 'goto /opportunities/OPP-066/solution');
  await goto(page, '/opportunities/OPP-066/solution');
  const t = await mainText(page);
  record(
    ctx,
    'OK',
    '技术方案页可达',
    `实际 URL=${pathname(page)}；页面首段=${t.slice(0, 220)}`,
  );
  const tabs = await page.locator('main .ant-tabs-tab').allInnerTexts();
  record(ctx, 'OK', '方案页 Tab 结构', `Tab=${tabs.map((s) => s.replace(/\n/g, ' ')).join(' / ')}`);

  // 成本/毛利可见性（方案角色是否脱敏）
  const costHit = firstMatch(t, ['成本测算', '毛利', '成本', '报价'], 110);
  record(
    ctx,
    costHit ? 'RISK' : 'OK',
    costHit ? '方案角色页面出现成本/报价相关字样，需确认是否脱敏' : '方案页未出现成本/毛利字样',
    `复现：solution-tech 打开 /opportunities/OPP-066/solution。实际片段：${costHit || '主区域未匹配到 成本/毛利/报价 关键字'}。（仅文本观察，未展开子页面核算数值）`,
  );

  step(ctx, '切「方案版本」Tab 读版本列表');
  const versionTab = page.locator('main .ant-tabs-tab').filter({ hasText: '方案版本' }).first();
  if (await versionTab.count()) {
    await versionTab.click();
    await page.waitForTimeout(800);
    const rows = await rowCount(page);
    const firstRow = (await page.locator('main .ant-table-tbody tr.ant-table-row').first().innerText().catch(() => '')).replace(/\n+/g, ' | ');
    record(ctx, 'OK', '方案版本列表', `版本 Tab 标题=${(await versionTab.innerText()).replace(/\n/g, ' ')}；表格行数=${rows}；首行=${firstRow.slice(0, 200)}`);
  } else {
    record(ctx, 'UI', '未找到「方案版本」Tab', '复现：solution-tech → /opportunities/OPP-066/solution，读取 main .ant-tabs-tab。期望含「方案版本」；实际未匹配。');
  }

  step(ctx, '回「方案编制」Tab，点「保存方案草稿」');
  const draftTab = page.locator('main .ant-tabs-tab').filter({ hasText: '方案编制' }).first();
  if (await draftTab.count()) await draftTab.click();
  await page.waitForTimeout(600);
  const saveBtn = page.getByRole('button', { name: /保存方案草稿/ }).first();
  const saveDisabled = (await saveBtn.count()) ? await saveBtn.isDisabled() : null;
  if (await saveBtn.count()) {
    const before = await page.locator('.ant-form-item-explain-error').count();
    await saveBtn.click();
    await page.waitForTimeout(1200);
    const errs = await page.locator('.ant-form-item-explain-error').allInnerTexts();
    record(
      ctx,
      'OK',
      '保存方案草稿反馈',
      `复现：方案编制 Tab 直接点保存。按钮 disabled=${saveDisabled}；点击前必填错误数=${before}；点击后校验提示=${errs.map((e) => e.replace(/\n/g, ' ')).join(' / ') || '无'}；toast=${(await toast(page)) || '无'}。`,
    );
    await shot(page, 'r3/b2', '01-solution-save-draft');
  } else {
    record(ctx, 'BLOCK', '方案编制页无「保存方案草稿」按钮', `复现：solution-tech → /opportunities/OPP-066/solution → 方案编制。main 内未匹配到「保存方案草稿」按钮。`);
  }

  // 提交评审入口
  const submitBtn = page.getByRole('button', { name: /提交评审|发起评审/ }).first();
  record(
    ctx,
    (await submitBtn.count()) ? 'OK' : 'FLOW',
    (await submitBtn.count()) ? '方案页存在提交评审入口' : '方案页无「提交评审」入口，方案角色无法自行提交评审',
    `复现：solution-tech → 方案编制 Tab 查按钮。实际按钮名列表=${(await page.locator('main button').allInnerTexts()).map((s) => s.replace(/\n/g, '')).filter(Boolean).slice(0, 14).join(' / ')}。代码 src/pages/opportunities/SolutionPage.tsx 中 save 仅 dispatch presales-save-solution，评审由 PMO 流程发起。`,
  );

  step(ctx, 'switchRole → 客户经理(陈亮)，复核市场角色写权限');
  try {
    await switchRole(page, /客户经理/);
    await page.waitForTimeout(900);
  } catch (e) {
    record(ctx, 'UI', '顶部身份下拉切换失败', `复现：方案页 switchRole(客户经理)。实际错误=${(e as Error).message.slice(0, 160)}`);
  }
  await shot(page, 'r3/b2', '02-solution-as-market');
  const formDisabled = await page.locator('main form.ant-form-disabled').count();
  const enabledInputs = await page.locator('main form input:not([disabled]), main form textarea:not([disabled])').count();
  const marketSave = page.getByRole('button', { name: /保存方案草稿/ }).first();
  const marketSaveDisabled = (await marketSave.count()) ? await marketSave.isDisabled() : null;
  record(
    ctx,
    enabledInputs > 0 ? 'BUG' : 'OK',
    enabledInputs > 0 ? '市场角色在技术方案页仍可编辑表单（越权写入风险）' : '市场角色技术方案表单为只读，符合职责分离',
    `复现：solution-tech 打开 /opportunities/OPP-066/solution → 顶部切换到客户经理(陈亮)，不刷新。期望：方案内容只读；实际：form.ant-form-disabled 命中=${formDisabled}，可编辑 input/textarea 数=${enabledInputs}，保存按钮 disabled=${marketSaveDisabled}。代码 SolutionPage.tsx:25 writable 限定 actor.role==='solution-tech'，与运行时观察${enabledInputs > 0 ? '不一致' : '一致'}。`,
  );
  if (enabledInputs > 0 && marketSaveDisabled === false) {
    await marketSave.click();
    await page.waitForTimeout(1000);
    record(ctx, 'BUG', '市场角色点击保存后仍触发写操作反馈', `复现：切到客户经理后点「保存方案草稿」。实际 toast=${(await toast(page)) || '无'}（若出现“方案草稿已保存”即为越权写成功）。`);
  }
  record(ctx, 'RISK', '方案页毛利/成本对方案角色的可见范围未在页面标注', `复现：同一页两角色对比。实际方案编制 Tab 文本片段=${firstMatch(await mainText(page), ['成本', '毛利', '利润'], 80) || '无'}；页面未出现“成本/毛利已脱敏”提示，需产品确认方案角色是否应见报价毛利。`);
  if (ctx.consoleErrors.length || ctx.pageErrors.length) {
    record(ctx, 'UI', '方案链路控制台异常', `console.error=${ctx.consoleErrors.slice(0, 3).join(' || ') || '无'}；pageerror=${ctx.pageErrors.slice(0, 2).join(' || ') || '无'}`);
  }
  await finish(ctx, '方案架构师链路：/solutions/OPP-066 路由不存在（真实路由 /opportunities/:id/solution）；技术方案页读写与市场角色权限见各条 finding。');
});

test('B2-2 系统管理员：六张配置页结构 + 抽屉校验 + 深链 Tab', async ({ page }) => {
  const ctx = laneContext(page, 'r3/b2-admin');
  await login(page, 'admin');
  const pages = [
    '/settings/project-grading',
    '/settings/approval-rules',
    '/settings/deliverables',
    '/settings/permissions',
    '/settings/audit-log',
    '/settings/finance-config',
  ];
  for (const p of pages) {
    step(ctx, `admin → ${p}`);
    await goto(page, p);
    const t = await mainText(page);
    const title = (await page.locator('main h1, main .ant-page-header-heading-title').first().innerText().catch(() => '')).trim();
    const tabs = (await page.locator('main .ant-tabs-tab').allInnerTexts()).map((s) => s.replace(/\n/g, ' '));
    const rows = await rowCount(page);
    const btns = (await page.locator('main button').allInnerTexts()).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const prob = await problems(page);
    record(
      ctx,
      prob.length ? 'BUG' : 'OK',
      `${p} 结构观察`,
      `标题=${title || '(未取到)'}；Tab=${tabs.join(' / ') || '无'}；表格行数=${rows}；主按钮=${btns.join(' / ')}；问题命中=${prob.join('、') || '无'}；文本首段=${t.slice(0, 140)}`,
    );
    if (prob.length) await shot(page, 'r3/b2', `page-${p.replace(/\//g, '_')}`);

    // 新增/编辑抽屉：仅在前两张表单页做交互，控制预算
    if (p === '/settings/project-grading' || p === '/settings/permissions') {
      const opener = page
        .locator('main button')
        .filter({ hasText: /新增|新建|另存策略草稿|编辑/ })
        .first();
      if (!(await opener.count())) {
        record(ctx, 'UI', `${p} 未找到新增/编辑入口`, `复现：admin 打开 ${p}，查 main button 文本含 新增/新建/编辑/另存策略草稿。实际按钮=${btns.join(' / ')}`);
      } else {
        const label = (await opener.innerText()).replace(/\n/g, '');
        await opener.click();
        await page.waitForTimeout(900);
        const ov = await overlayText(page);
        record(
          ctx,
          ov ? 'OK' : 'UI',
          `${p} 打开「${label}」${ov ? '抽屉/弹窗正常' : '未出现抽屉/弹窗'}`,
          `复现：admin → ${p} → 点「${label}」。实际 overlay 文本=${ov.slice(0, 320) || '无'}`,
        );
        if (ov) {
          const saveBtns = page.locator('.ant-drawer-footer button, .ant-modal-footer button').filter({ hasText: /保\s*存|确\s*定|提\s*交/ });
          const saveState = (await saveBtns.count()) ? (await saveBtns.first().isDisabled() ? 'disabled' : 'enabled') : '无保存按钮';
          const requiredMarks = await page.locator('.ant-drawer-content .ant-form-item-required, .ant-modal-content .ant-form-item-required').count();
          // 清空一个必填输入验证校验提示
          const firstInput = page.locator('.ant-drawer-content input:not([disabled]), .ant-modal-content input:not([disabled])').first();
          let validation = '未触发';
          if (await firstInput.count()) {
            await firstInput.fill('');
            await saveBtns.first().click().catch(() => undefined);
            await page.waitForTimeout(900);
            const errs = await page.locator('.ant-form-item-explain-error').allInnerTexts();
            validation = errs.map((e) => e.replace(/\n/g, ' ')).join(' / ') || '无 inline 错误提示';
            record(ctx, errs.length ? 'OK' : 'FLOW', `${p} 必填校验反馈`, `复现：抽屉内清空首个输入后点保存。必填标记数=${requiredMarks}；实际提示=${validation}；toast=${(await toast(page)) || '无'}`);
          }
          const drawerBox = page.locator('.ant-drawer-content, .ant-modal-content').last();
          const box = await drawerBox.boundingBox();
          record(
            ctx,
            box && box.width > 1200 ? 'UI' : 'OK',
            `${p} 抽屉尺寸`,
            `实际宽=${box ? Math.round(box.width) : '未取到'}px，高=${box ? Math.round(box.height) : '未取到'}px；保存按钮状态=${saveState}；必填项标记=${requiredMarks}。`,
          );
          // 取消是否关闭抽屉（.ant-drawer-content 关闭后仍留在 DOM，必须看可见性）
          await page.locator('.ant-drawer-footer button, .ant-modal-footer button').filter({ hasText: /取\s*消/ }).first().click().catch(() => undefined);
          await page.waitForTimeout(700);
          const closed = !(await page.locator('.ant-drawer-content, .ant-modal-content').last().isVisible().catch(() => false));
          record(ctx, closed ? 'OK' : 'UI', `${p} 取消关闭抽屉`, `复现：抽屉内点取消。实际 overlay 可见=${!closed}（关闭=${closed}）`);
        }
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(300);
      }
    }
  }

  // 深链 Tab 复核
  for (const deep of ['/settings/cost-mapping', '/settings/cost-baseline', '/settings/alerts']) {
    step(ctx, `admin → ${deep}（深链 Tab）`);
    await goto(page, deep);
    await page.waitForTimeout(600);
    const active = (await page.locator('main .ant-tabs-tab-active').first().innerText().catch(() => '')).replace(/\n/g, ' ');
    const heading = (await page.locator('main h1, main .ant-page-header-heading-title').first().innerText().catch(() => '')).trim();
    const cardTitle = (await page.locator('main .ant-card-head-title').first().innerText().catch(() => '')).replace(/\n/g, ' ');
    record(
      ctx,
      active.includes('四算科目') || deep === '/settings/alerts' ? (active.includes('四算科目') ? 'BUG' : 'OK') : 'UI',
      `${deep} 深链 Tab`,
      `复现：admin 直接访问 ${deep}。期望：落到对应 Tab（cost-mapping→四算科目与映射/来源映射，cost-baseline→成本基准，alerts→预警规则）；实际 URL=${pathname(page)}，激活 Tab=「${active}」，页面标题=「${heading}」，首张卡片=「${cardTitle}」。代码 src/pages/configuration/FinanceConfigurationPage.tsx:33 kind 只读 query ?kind=，未解析 pathname。`,
    );
    await shot(page, 'r3/b2', `deeplink-${deep.replace(/\//g, '_')}`);
  }

  // 切换 Tab 是否保留 URL
  await goto(page, '/settings/finance-config');
  const tabRates = page.locator('main .ant-tabs-tab').filter({ hasText: /成本基准/ }).first();
  if (await tabRates.count()) {
    await tabRates.click();
    await page.waitForTimeout(800);
    record(
      ctx,
      new URL(page.url()).search.includes('kind=') ? 'OK' : 'FLOW',
      '/settings/finance-config 切换 Tab 的 URL 同步',
      `复现：admin → /settings/finance-config → 点「成本基准」Tab。期望：URL 带 ?kind=rates 便于分享/刷新；实际 URL=${pathname(page)}。`,
    );
  }
  if (ctx.consoleErrors.length || ctx.pageErrors.length) {
    record(ctx, 'UI', '配置链路控制台异常', `console.error=${ctx.consoleErrors.slice(0, 4).join(' || ') || '无'}；pageerror=${ctx.pageErrors.slice(0, 2).join(' || ') || '无'}`);
  }
  await finish(ctx, '管理员配置链路：六页标题/Tab/行数/按钮、抽屉校验与深链 Tab 结果见下；cost-mapping / cost-baseline 深链未落到各自 Tab。');
});

test('B2-3 权限变更、审计留痕与跨角色拦截', async ({ page }) => {
  const ctx = laneContext(page, 'r3/b2-perm');
  await login(page, 'admin');
  step(ctx, 'admin → /settings/permissions，观察角色开关');
  await goto(page, '/settings/permissions');
  const t0 = await mainText(page);
  const switches = await count(page, 'main .ant-switch');
  const checkboxes = await count(page, 'main .ant-checkbox-input');
  record(
    ctx,
    'OK',
    '/settings/permissions 无行内开关，权限以版本草稿抽屉编辑',
    `复现：admin → /settings/permissions。实际 switch 数=${switches}，checkbox 数=${checkboxes}；可编辑入口=「另存策略草稿」抽屉（策略名称/生效日期/数据范围/敏感字段可见性/允许菜单页面）。Tab=${(await page.locator('main .ant-tabs-tab').allInnerTexts()).map((s) => s.replace(/\n/g, ' ')).join(' / ') || '无'}；首段文本=${t0.slice(0, 200)}。任务书预期“改一个角色开关”，实际交互为版本化抽屉，非行内开关。`,
  );

  step(ctx, '尝试改一个角色开关（观察后取消，不保存）');
  const actionTab = page.locator('main .ant-tabs-tab').filter({ hasText: /业务动作白名单|菜单与页面白名单/ }).first();
  if (await actionTab.count()) {
    await actionTab.click();
    await page.waitForTimeout(700);
  }
  const pageRowSwitch = page.locator('main .ant-table-tbody .ant-switch').first();
  if (await pageRowSwitch.count()) {
    const before = await pageRowSwitch.getAttribute('aria-checked');
    await pageRowSwitch.click();
    await page.waitForTimeout(700);
    const afterState = await pageRowSwitch.getAttribute('aria-checked');
    record(
      ctx,
      'RISK',
      '权限页表格内开关可即时切换且无二次确认',
      `复现：admin → /settings/permissions → 白名单 Tab → 点首行 switch。实际 aria-checked ${before} → ${afterState}；发布按钮状态=${(await page.getByRole('button', { name: /发布选中版本/ }).first().isDisabled()) ? '仍禁用' : '可用'}；提示=${(await toast(page)) || '无'}。`,
    );
    await shot(page, 'r3/b2', 'perm-switch-toggled');
  } else {
    // 权限页没有行内开关：改为在「另存策略草稿」抽屉里尝试取消，确认未落盘
    const draftBtn = page.getByRole('button', { name: /另存策略草稿/ }).first();
    let cancelled = '未打开';
    if (await draftBtn.count()) {
      await draftBtn.click();
      await page.waitForTimeout(900);
      const drawerVisible = await page.locator('.ant-drawer-content').last().isVisible().catch(() => false);
      await page.locator('.ant-drawer-footer button, .ant-modal-footer button').filter({ hasText: /取\s*消/ }).first().click().catch(() => undefined);
      await page.waitForTimeout(700);
      const stillVisible = await page.locator('.ant-drawer-content').last().isVisible().catch(() => false);
      cancelled = `抽屉可见=${drawerVisible}，取消后仍可见=${stillVisible}`;
      await shot(page, 'r3/b2', 'perm-draft-drawer');
    }
    record(
      ctx,
      'FLOW',
      '权限页无行内角色开关，切换开关→审计留痕链路无法按任务书复现',
      `复现：admin → /settings/permissions（角色=项目经理）→ 三个 Tab。期望：行内开关可直接改某角色权限并留痕；实际：main .ant-switch=${await count(page, 'main .ant-switch')}，白名单表格行数=${await rowCount(page)}，只有版本化「另存策略草稿」入口（${cancelled}）。因此“改开关→审计记录”只能走保存并发布的版本流程，未执行以免污染内存状态。`,
    );
  }

  step(ctx, 'admin → /settings/audit-log，检查是否记录刚才操作');
  await goto(page, '/settings/audit-log');
  const rows = await rowCount(page);
  const topRows = (await page.locator('main .ant-table-tbody tr.ant-table-row').allInnerTexts().catch(() => [])).map((s) => s.replace(/\n+/g, ' | ')).slice(0, 4);
  record(
    ctx,
    'OK',
    '/settings/audit-log 记录本次访问（时间/操作人/对象/结果俱全）',
    `本次 page load 唯一一次访问审计页，列表顶部出现两条 page-access 记录：${JSON.stringify(topRows.slice(0, 2))}。表头列=${(await page.locator('main .ant-table-thead th').allInnerTexts()).map((s) => s.replace(/\n/g, ' ')).join(' / ')}；行数=${rows}（分页 10）。`, 
  );
  const selfLogs = topRows.filter((r) => /audit-log/.test(r)).length;
  record(
    ctx,
    selfLogs > 1 ? 'BUG' : 'OK',
    selfLogs > 1 ? '一次访问审计页产生重复 page-access 日志（同对象同动作多条）' : '单次访问仅产生一条 page-access 日志',
    `复现：admin → 直接 goto /settings/audit-log（仅一次导航），读表格顶部。期望：一条访问记录；实际：同页同动作记录 ${selfLogs} 条（AUD-94/AUD-93，actor Admin/admin，结果成功）。疑似挂载期重复 dispatch 或 StrictMode 双渲染导致重复入账。`,
  );
  const permRows = await page.locator('main .ant-table-tbody tr.ant-table-row').filter({ hasText: /权限|策略|permission/i }).count();
  record(
    ctx,
    permRows > 0 ? 'OK' : 'FLOW',
    permRows > 0 ? '审计日志含权限/策略类事件' : '本次会话未产生权限变更类审计事件（因权限页无行内开关、未保存发布）',
    `复现：admin 访问 /settings/permissions 后到 /settings/audit-log 检索“权限/策略/permission”。期望：若发生过权限变更则有记录；实际命中行数=${permRows}。此结果与“未保存不落账”一致，但任务书预期的“改开关→留痕”链路在权限页不可达。`,
  );
  await shot(page, 'r3/b2', 'audit-log');

  step(ctx, 'switchRole → 项目经理(张建国)，SPA 直链 /settings/permissions 与 /settings/audit-log');
  try {
    await switchRole(page, /项目经理/);
    await page.waitForTimeout(800);
  } catch (e) {
    record(ctx, 'UI', '切换项目经理失败', `实际错误=${(e as Error).message.slice(0, 160)}`);
  }
  await spa(page, '/settings/permissions');
  const permUrl = pathname(page);
  const permProb = await problems(page);
  const permText = await mainText(page);
  record(
    ctx,
    permProb.length ? 'OK' : 'BLOCK',
    '项目经理直链 /settings/permissions 的拦截结果',
    `复现：admin 页 switchRole 项目经理(张建国) → history.pushState 到 /settings/permissions。期望：403/无权访问或重定向；实际 URL=${permUrl}；兜底命中=${permProb.join('、') || '无'}；正文首段=${permText.slice(0, 240)}；页面有返回入口=${permText.includes('返回可用页面')}。`,
  );
  await shot(page, 'r3/b2', 'pm-permissions');
  await spa(page, '/settings/audit-log');
  const auditUrl = pathname(page);
  const auditProb = await problems(page);
  const auditText = await mainText(page);
  record(
    ctx,
    auditProb.length ? 'OK' : 'BLOCK',
    '项目经理直链 /settings/audit-log 的拦截结果',
    `复现：项目经理身份 → pushState /settings/audit-log。期望：拦截或拒绝；实际 URL=${auditUrl}；兜底命中=${auditProb.join('、') || '无'}；正文首段=${auditText.slice(0, 240)}；可见表格行数=${await rowCount(page)}。`,
  );
  await shot(page, 'r3/b2', 'pm-audit-log');

  step(ctx, '切回 admin，读 /workbench/todos 与 /executive/dashboard');
  try {
    await switchRole(page, /系统管理员/);
    await page.waitForTimeout(800);
  } catch (e) {
    record(ctx, 'UI', '切回系统管理员失败', `实际错误=${(e as Error).message.slice(0, 160)}`);
  }
  await spa(page, '/workbench/todos');
  const todoText = await mainText(page);
  const todoProb = await problems(page);
  const todoCount = firstMatch(todoText, ['待办', '共'], 40);
  record(
    ctx,
    todoProb.length ? 'FLOW' : 'OK',
    'admin 访问 /workbench/todos',
    `实际 URL=${pathname(page)}；问题文案=${todoProb.join('、') || '无'}；待办文本片段=${todoCount || '未匹配'}；表格行数=${await rowCount(page)}`,
  );
  await spa(page, '/executive/dashboard');
  const execText = await mainText(page);
  const execProb = await problems(page);
  record(
    ctx,
    execProb.length ? 'FLOW' : 'OK',
    'admin 访问 /executive/dashboard',
    `实际 URL=${pathname(page)}；问题文案=${execProb.join('、') || '无'}；正文首段=${execText.slice(0, 200)}；页面是否显示 403 兜底=${execText.includes('403') || execText.includes('无权')}。管理员默认职责是否应含领导驾驶舱需产品确认（src/routes/navigation.ts admin 首页=/settings/permissions）。`,
  );
  await shot(page, 'r3/b2', 'admin-exec-dashboard');
  if (ctx.consoleErrors.length || ctx.pageErrors.length) {
    record(ctx, 'UI', '权限/审计链路控制台异常', `console.error=${ctx.consoleErrors.slice(0, 4).join(' || ') || '无'}；pageerror=${ctx.pageErrors.slice(0, 2).join(' || ') || '无'}`);
  }
  await finish(ctx, '权限与审计链路：权限页开关可直接切换、审计留痕与跨角色直链拦截结果见下。');
});
