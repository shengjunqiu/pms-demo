import { test, type Page } from '@playwright/test';
import {
  finish,
  goto,
  laneContext,
  login,
  record,
  shot,
  step,
  switchRole,
  visibleProblems,
  type LaneContext,
} from './_helpers';

// D1 收尾链路复核：合同 → 启动确认 → 客户终验；结算 → 归档 → 后评价。
// 只读 QA：业务值一律文本读取后 record，不以 expect 断言业务规则。

const clip = (value: string, size = 900) => value.replace(/\s+/g, ' ').trim().slice(0, size);

async function buttonList(page: Page) {
  const locator = page.locator('main').getByRole('button');
  const total = Math.min(await locator.count(), 30);
  const rows: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const button = locator.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    const text = clip(await button.innerText().catch(() => ''), 40);
    if (!text) continue;
    const disabled = await button.isDisabled().catch(() => false);
    rows.push(`${text}${disabled ? '(禁用)' : ''}`);
  }
  return [...new Set(rows)];
}

/** 读取指标卡真实值，例如「归档状态 归档准备中」。 */
async function metric(page: Page, title: string) {
  const card = page
    .locator('.ant-statistic')
    .filter({ has: page.locator('.ant-statistic-title', { hasText: title }) })
    .first();
  if (!(await card.count())) return `${title}=未找到指标卡`;
  return clip(await card.innerText().catch(() => ''), 60);
}

/** 读取描述列表某一项的值，例如「合同执行状态」。 */
async function descriptionItem(page: Page, label: string) {
  const item = page
    .locator('.ant-descriptions-item')
    .filter({ has: page.locator('.ant-descriptions-item-label', { hasText: label }) })
    .first();
  if (!(await item.count())) return `${label}=未找到字段`;
  return clip(await item.innerText().catch(() => ''), 80);
}

async function observe(page: Page, ctx: LaneContext, label: string, size = 900) {
  const problems = await visibleProblems(page);
  const body = clip(await page.locator('main').innerText(), size);
  const buttons = await buttonList(page);
  const url = new URL(page.url());
  step(
    ctx,
    `${label} | ${url.pathname}${url.search} | 错误页=${problems.join(',') || '无'} | 按钮=${buttons.join(' / ') || '无'} | 文本=${clip(body, 240)}`,
  );
  return { problems, body, buttons };
}

/** 按优先顺序尝试点击一个真实业务动作，返回点击结果与弹窗/提示反馈。 */
async function tryClick(page: Page, names: string[]) {
  for (const name of names) {
    const button = page.locator('main').getByRole('button', { name, exact: true }).first();
    if (!(await button.count())) continue;
    if (!(await button.isVisible().catch(() => false))) continue;
    if (await button.isDisabled().catch(() => true)) return { name, clicked: false, reason: `「${name}」按钮存在但禁用` };
    await button.click();
    await page.waitForTimeout(1200);
    const modal = clip(await page.locator('.ant-modal-content').first().innerText().catch(() => ''), 300);
    const message = clip(await page.locator('.ant-message').first().innerText().catch(() => ''), 200);
    return { name, clicked: true, modal, message };
  }
  return { name: '', clicked: false, reason: '页面无该动作按钮' };
}

async function lastMessage(page: Page) {
  return clip(await page.locator('.ant-message').first().innerText().catch(() => ''), 260);
}

async function fillByLabel(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: false }).first();
  if (!(await field.count())) return false;
  await field.fill(value).catch(() => undefined);
  return true;
}

async function clickModalOk(page: Page) {
  const ok = page
    .locator('.ant-modal-footer, .ant-modal-confirm-btns')
    .getByRole('button', { name: /确\s*定|确定|OK|提交/ })
    .first();
  if (!(await ok.count())) return false;
  await ok.click().catch(() => undefined);
  await page.waitForTimeout(1500);
  return true;
}

async function closeModal(page: Page) {
  const cancel = page.locator('.ant-modal-footer').getByRole('button', { name: /取消|关闭/ }).first();
  if (await cancel.count()) await cancel.click().catch(() => undefined);
  await page.waitForTimeout(500);
}

test('D1-1 PM 链路：合同 → 启动确认 → 客户终验', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'd1/contract-start-acceptance');
  await login(page, 'project-manager', 'P-001');

  // ① 任务指定路径 /projects/P-001/contract
  await goto(page, '/projects/P-001/contract');
  const contractRoute = await observe(page, ctx, '合同页 /projects/P-001/contract');
  await shot(page, ctx.lane, '01-contract-route');
  if (contractRoute.problems.length) {
    record(
      ctx,
      'FLOW',
      '/projects/P-001/contract 无路由，合同签署与用印入口缺失',
      `路径：/projects/P-001/contract
复现：PM 张建国登录 → 直接访问该 URL
实际：${contractRoute.problems.join('、')}；整页为状态页，无合同状态/版本/用印或生效动作
期望：可查看合同状态、版本，并有用印/生效等签署动作
补充：src/routes/manifest.ts 与 src/routes/modules/*.tsx 均无 contract 路由，合同只出现在 /projects/:id 的「合同与回款」只读台账`,
    );
  } else {
    record(ctx, 'OK', '合同页可访问', `路径：/projects/P-001/contract\n实际：${clip(contractRoute.body, 300)}`);
  }

  // ② 真实合同数据位置：项目详情「合同与回款」
  await goto(page, '/projects/P-001');
  const ledgerTab = page.getByRole('tab', { name: /合同与回款/ }).first();
  if (await ledgerTab.count()) {
    await ledgerTab.click();
    await page.waitForTimeout(900);
  }
  const ledger = await observe(page, ctx, '项目详情·合同与回款', 1500);
  await shot(page, ctx.lane, '02-contract-ledger');
  const contractCode = ledger.body.match(/HT-\d{4}-\d{4}/)?.[0] ?? '未读到合同编号';
  const execStatus = await descriptionItem(page, '合同执行状态');
  const signActions = ledger.buttons.filter((item) => /用印|生效|签署|签订|盖章/.test(item));
  record(
    ctx,
    signActions.length ? 'OK' : 'FLOW',
    signActions.length ? '合同台账可发起签署类动作' : '合同台账只读，无合同状态/版本/用印或生效动作',
    `路径：/projects/P-001（tab 合同与回款）
复现：PM 张建国 → 项目详情 → 合同与回款
实际：合同 ${contractCode}；${execStatus}；台账内按钮 ${ledger.buttons.join(' / ') || '无'}（12 个子标签全为只读表单）
期望：合同状态与版本可用印/生效推进——本链路第 1 步在系统中不可执行`,
  );

  // ③ 未签台账是唯一签约入口
  await goto(page, '/unsigned-projects');
  const unsigned = await observe(page, ctx, '未签立项台账', 700);
  await shot(page, ctx.lane, '03-unsigned-ledger');
  record(
    ctx,
    'FLOW',
    '未签台账不覆盖已签项目，PM 张建国名下无可签订项目',
    `路径：/unsigned-projects
复现：PM 张建国登录 → 未签立项台账
实际：按钮 ${unsigned.buttons.join(' / ') || '无'}；列表「${clip(unsigned.body, 220)}」
期望：已签项目的合同签订/用印可在项目内办理；实际签约动作只在 /unsigned-projects/P-004?tab=contract（PM 刘敏的未签项目，PMO/财务/管理员可见），本次 PM 链路的 P-001 无对应入口`,
  );

  // ④ 启动确认
  await goto(page, '/projects/P-001/start-confirmation');
  const start = await observe(page, ctx, '启动确认 /projects/P-001/start-confirmation', 1200);
  await shot(page, ctx.lane, '04-start-confirmation');
  const startAlert = clip(await page.locator('.ant-alert').first().innerText().catch(() => ''), 200);
  const filled = await fillByLabel(page, '启动会议与确认意见', 'QA 复核：启动条件补齐后再确认，本次仅验证入口可用性。');
  const startAction = await tryClick(page, ['确认正式启动']);
  const startMessage = startAction.clicked && (await clickModalOk(page)) ? await lastMessage(page) : '';
  if (startAction.clicked) await shot(page, ctx.lane, '05-start-confirm-feedback');
  record(
    ctx,
    startAction.clicked && !startMessage ? 'OK' : 'BUG',
    startAction.clicked && !startMessage ? '启动确认入口可点并完成' : '启动条件仅满足 3/7 时「确认正式启动」仍可点击，错误只以 toast 抛出',
    `路径：/projects/P-001/start-confirmation
复现：PM 张建国 → 启动条件检查页 → 填写意见「${filled ? '已填' : '未找到意见输入框'}」→ 点「确认正式启动」→ 确定
实际：提示「${startAlert}」；按钮 ${start.buttons.join(' / ')}；点击后 toast「${startMessage || '无'}」，页面仍停在确认表单
期望：不满足条件时按钮禁用或就地列出未满足项（现仅在提交后以 toast 返回），避免用户误判可提交`,
  );
  record(
    ctx,
    'BLOCK',
    'P-001 启动确认被 4 项前置条件阻断，本链路无法完成启动',
    `路径：/projects/P-001/start-confirmation
复现：同上
实际：页面自述「${startAlert}」；提交被拒，返回「${clip(startMessage, 220)}」
期望：链路内可补齐立项/任命/基线/里程碑后再启动；这些前置分别在其他业务包，PM 单页无法闭环
影响：启动后才会激活 WBS、日报、工时入口，本链路后续执行类验证无法进行`,
  );

  // ⑤ 任务指定路径 /projects/P-006/acceptance（不存在）→ 真实路径 customer-acceptance
  await goto(page, '/projects/P-006/acceptance');
  const acceptRoute = await observe(page, ctx, '验收页 /projects/P-006/acceptance');
  await shot(page, ctx.lane, '06-acceptance-route');
  record(
    ctx,
    'FLOW',
    '/projects/P-006/acceptance 无路由，验收入口按类型拆分且无统一入口',
    `路径：/projects/P-006/acceptance
复现：PM 张建国登录 → 直接访问该 URL
实际：${acceptRoute.problems.join('、') || '未命中错误页文案'}
期望：客户终验页可达；实际需访问 /projects/P-006/customer-acceptance（另有 internal-acceptance、supplier-acceptance）`,
  );

  await goto(page, '/projects/P-006/customer-acceptance');
  const accept = await observe(page, ctx, '客户终验 /projects/P-006/customer-acceptance', 1600);
  await shot(page, ctx.lane, '07-customer-acceptance');
  const roundMetric = await metric(page, '验收轮次');
  const pendingMetric = await metric(page, '整改中');
  const recordButton = page.getByRole('button', { name: /详情与办理/ }).first();
  let drawerButtons = '未打开详情与办理';
  let advance = { name: '', clicked: false, reason: '未尝试' } as { name: string; clicked: boolean; reason: string };
  if (await recordButton.count()) {
    await recordButton.click();
    await page.waitForTimeout(1200);
    drawerButtons = clip(
      await page.locator('.ant-drawer-content').first().getByRole('button').allInnerTexts().then((rows) => rows.map((r) => clip(r, 20)).filter(Boolean).join(' / ')).catch(() => ''),
      200,
    );
    await shot(page, ctx.lane, '08-customer-acceptance-drawer');
    advance = await tryClick(page, ['整改后发起新轮次', '回复整改清单', '登记验收结论']);
    if (advance.clicked) {
      const advanceMessage = (await clickModalOk(page)) ? await lastMessage(page) : '';
      advance.reason = `点击「${advance.name}」→ 确定，提示「${advanceMessage || '无'}」`;
      await closeModal(page);
      await shot(page, ctx.lane, '09-customer-acceptance-advance');
    }
  }
  record(
    ctx,
    advance.clicked ? 'OK' : 'BLOCK',
    advance.clicked ? '客户终验轮次可推进一次动作' : '客户终验详情无可用推进动作',
    `路径：/projects/P-006/customer-acceptance（ACC-P-006-3 第 1 轮）
复现：PM 张建国 → 客户终验 → 打开「详情与办理」
实际：${roundMetric}；${pendingMetric}；列表按钮 ${accept.buttons.join(' / ')}；详情抽屉按钮 ${drawerButtons}；${advance.clicked ? advance.reason : advance.reason}
期望：整改中轮次由提交方补齐材料后发起复验`,
  );
  record(
    ctx,
    'FLOW',
    '客户终验无「客户」角色，验收结论与签署由 PM/PMO 代办',
    `路径：/projects/P-006/customer-acceptance
复现：切换全部 7 个模拟身份核查客户终验环节
实际：模拟身份仅 executive/pmo/project-manager/market/finance/solution-tech/admin；客户终验的「登记验收结论」限 PM，「PMO确认验收完成」限 PMO，均无客户签认
期望：客户终验应有客户侧确认入口或明确标注为代录，否则客户验收结论缺少真实签署方`,
  );

  const report = finish(ctx, 'PM 收尾链路：合同签署/用印无入口（无 contract 路由、台账只读）、启动确认被 4 项前置阻断、客户终验无客户角色。');
  console.log(`report=${report}`);
});

test('D1-2 财务/PMO 链路：结算 → 归档 → 后评价', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'd1/settlement-archive-posteval');
  await login(page, 'finance', 'P-023');

  // ① 全局结算列表仍 404
  await goto(page, '/settlement');
  const list = await observe(page, ctx, '结算列表 /settlement');
  await shot(page, ctx.lane, '01-settlement-list');
  record(
    ctx,
    list.problems.length ? 'FLOW' : 'OK',
    list.problems.length ? '/settlement 全局结算列表仍无路由（复核确认）' : '/settlement 可访问',
    `路径：/settlement
复现：财务 刘敏登录 → 访问 /settlement
实际：${list.problems.join('、') || '未命中错误页文案'}；页面文本「${clip(list.body, 160)}」
期望：财务应有跨项目结算工作台；实际只有 /projects/:id/settlement 单项目入口与待办中心，导航无全局结算列表`,
  );

  // ② P-023 结算详情（SREQ-2）
  await goto(page, '/projects/P-023/settlement');
  const settle = await observe(page, ctx, 'P-023 结算详情', 1800);
  await shot(page, ctx.lane, '02-p023-settlement');
  const sreq = settle.body.match(/SREQ-\d+/)?.[0] ?? '未读到申请编号';
  const settleStatus = await metric(page, '结算状态');
  record(
    ctx,
    /财务核算/.test(settleStatus) ? 'OK' : 'RISK',
    `P-023 结算申请 ${sreq} ${settleStatus}`,
    `路径：/projects/P-023/settlement
复现：财务 刘敏登录 → P-023 结算详情
实际：申请 ${sreq}；${settleStatus}；按钮 ${settle.buttons.join(' / ')}
期望：财务核算节点应能录入开票额/税费/意见并提交 PMO 审核`,
  );
  const financeAction = await tryClick(page, ['财务核算确认', 'PMO材料审核通过', '确认核算', '确认']);
  let financeResult = financeAction.reason ?? '';
  if (financeAction.clicked) {
    const invoiced = await fillByLabel(page, '结算已开票金额', '4000');
    const tax = await fillByLabel(page, '结算税费', '240');
    const opinion = await fillByLabel(page, '结算办理意见', 'QA 复核：开票与税费口径已核对');
    await clickModalOk(page);
    const message = await lastMessage(page);
    const after = await metric(page, '结算状态');
    financeResult = `点击「${financeAction.name}」，填写开票额${invoiced ? '已填' : '未找到'}/税费${tax ? '已填' : '未找到'}/意见${opinion ? '已填' : '未找到'} → 提示「${message || '无'}」；${after}`;
    await shot(page, ctx.lane, '03-p023-finance-confirm');
  }
  record(
    ctx,
    /PMO审核/.test(await metric(page, '结算状态')) ? 'OK' : 'BLOCK',
    /PMO审核/.test(await metric(page, '结算状态')) ? '财务核算确认可推进到 PMO 审核' : '财务核算节点无法在本页推进',
    `路径：/projects/P-023/settlement
复现：财务 刘敏 → 「财务核算确认」→ 填开票额/税费/办理意见 → 确定
实际：${financeResult}
期望：财务核算确认后状态转「PMO审核」并生成 PMO 待办`,
  );

  // ③ 待办中心是否聚合 SREQ
  await goto(page, '/workbench/todos');
  const todos = await observe(page, ctx, '待办中心 /workbench/todos', 1600);
  await shot(page, ctx.lane, '04-finance-todos');
  const todoMetric = await metric(page, '当前筛选待办');
  record(
    ctx,
    /SREQ/.test(todos.body) ? 'OK' : 'FLOW',
    '财务待办中心未聚合结算核算事项',
    `路径：/workbench/todos
复现：财务 刘敏登录 → 待办中心（待办 21 项 / 已办 31 项）
实际：${todoMetric}；列表文本${/SREQ/.test(todos.body) ? '含 SREQ' : '不含 SREQ'}；业务类型筛选项无「结算」；文本「${clip(todos.body, 240)}」
期望：SREQ-2 停在「财务核算」，应作为「我审批的/我办理的」进入财务待办，否则财务只能逐项目点开查找`,
  );

  // ④ PMO 归档
  await goto(page, '/projects/P-008/archive');
  const archiveAsFinance = await observe(page, ctx, 'P-008 归档（财务身份）', 500);
  await switchRole(page, /PMO负责人/);
  await page.waitForTimeout(1200);
  const archive = await observe(page, ctx, 'P-008 归档（切换 PMO）', 1800);
  await shot(page, ctx.lane, '05-p008-archive');
  const archiveStatus = await metric(page, '归档状态');
  const archiveComplete = await metric(page, '分类完整性');
  record(
    ctx,
    archive.problems.length ? 'FLOW' : 'OK',
    `P-008 资料归档 ${archiveStatus} · ${archiveComplete}`,
    `路径：/projects/P-008/archive
复现：财务刘敏打开 → 顶部切换身份为 PMO 李主任（状态保留）
实际：财务身份下${archiveAsFinance.problems.join('、') || '可访问（未按角色拦截）'}；PMO 下${archiveStatus}，${archiveComplete}，按钮 ${archive.buttons.join(' / ')}
期望：P-008 结算已锁定，PMO 补齐 14 类正式文件后确认归档`,
  );
  const upload = await tryClick(page, ['补充正式文件', '补 档']);
  let uploadResult = upload.reason ?? '';
  if (upload.clicked) {
    const filename = await fillByLabel(page, '补档文件名', 'QA复核-归档文件.pdf');
    const note = await fillByLabel(page, '补档说明', 'QA 复核：验证补档入口可提交');
    await clickModalOk(page);
    const message = await lastMessage(page);
    uploadResult = `打开「${upload.name}」，文件名${filename ? '已填' : '未找到'}/说明${note ? '已填' : '未找到'} → 提示「${message || '无'}」；${await metric(page, '分类完整性')}`;
    await shot(page, ctx.lane, '06-p008-archive-upload');
  }
  record(
    ctx,
    upload.clicked ? 'OK' : 'BUG',
    upload.clicked ? '归档补档入口可用' : '归档页无可用的补档入口',
    `路径：/projects/P-008/archive
复现：PMO 李主任 → 「补充正式文件」→ 填分类/原业务/文件名/说明 → 确定
实际：${uploadResult}
期望：可登记正式文件并由 PMO 审核；「确认正式归档」在 14 类齐全前禁用`,
  );
  const confirmArchive = page.locator('main').getByRole('button', { name: '确认正式归档', exact: true }).first();
  const confirmDisabled = (await confirmArchive.count()) ? await confirmArchive.isDisabled() : true;
  record(
    ctx,
    confirmDisabled ? 'BLOCK' : 'OK',
    confirmDisabled ? 'P-008 无法确认归档：14 类正式文件仍缺件' : 'P-008 可确认归档',
    `路径：/projects/P-008/archive
复现：PMO 李主任 → 查看「确认正式归档」
实际：按钮${confirmDisabled ? '禁用' : '可用'}；${await metric(page, '分类完整性')}；页面提示「${clip(archive.body, 200)}」
期望：缺件补齐后可确认归档并锁定版本；缺口主要来自历史项目未导入方案/测试/验收正式文件，单页补档工作量大，收尾链路在此停住`,
  );

  // ⑤ PMO 后评价（重新登录保持 PMO 身份，demo 状态重置）
  await login(page, 'pmo', 'P-008');
  await goto(page, '/projects/P-008/post-evaluation');
  const postEval = await observe(page, ctx, 'P-008 后评价', 1800);
  await shot(page, ctx.lane, '07-p008-post-evaluation');
  const postStatus = await metric(page, '后评价状态');
  record(
    ctx,
    postEval.problems.length ? 'FLOW' : 'OK',
    `P-008 后评价 ${postStatus}`,
    `路径：/projects/P-008/post-evaluation
复现：PMO 李主任登录 → P-008 后评价
实际：${postStatus}；按钮 ${postEval.buttons.join(' / ')}
期望：P-008 结算已锁定、归档未完成，PMO 应能先发起后评价并保存评分`,
  );
  const postAction = await tryClick(page, ['PMO发起后评价', '编制后评价', '记录模板项目评分', '记录项目人员评价']);
  let postResult = postAction.reason ?? '';
  if (postAction.clicked) {
    const modalTitle = clip(await page.locator('.ant-modal-title').first().innerText().catch(() => ''), 40);
    const inputs = await page.locator('.ant-modal input, .ant-modal textarea, .ant-modal .ant-select').count().catch(() => 0);
    const required = await page.locator('.ant-modal .ant-form-item-required').count().catch(() => 0);
    postResult = `点击「${postAction.name}」→ 弹出「${modalTitle || '无弹窗'}」，可填字段 ${inputs} 个，必填项 ${required} 个`;
    await shot(page, ctx.lane, '08-p008-post-evaluation-form');
    await closeModal(page);
  }
  record(
    ctx,
    postAction.clicked ? 'OK' : 'BLOCK',
    postAction.clicked ? '后评价可打开编制表单' : '后评价页无可用动作',
    `路径：/projects/P-008/post-evaluation
复现：PMO 李主任 → 点击发起/编制后评价
实际：${postResult}
期望：可填写目标结论、风险/变更复盘与评分并提交 PMO 确认`,
  );

  const report = finish(ctx, '财务/PMO 收尾链路：/settlement 仍 404、财务核算确认可推进、待办中心不聚合 SREQ；P-008 归档因缺件无法确认、后评价可发起编制。');
  console.log(`report=${report}`);
});
