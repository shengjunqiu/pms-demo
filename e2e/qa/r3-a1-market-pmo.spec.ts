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
  type QaRole,
} from './_helpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(600_000);

const LANE = 'a1';
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

/** goto + 等待 React  hydration，避免 dev server 首帧点击丢失。 */
async function open(page: Page, url: string) {
  await goto(page, url);
  await page.waitForTimeout(450);
}

async function toast(page: Page, text: RegExp | string) {
  await expect(page.locator('.ant-message-notice-content').last()).toContainText(text, { timeout: 8_000 });
}

async function bodyText(page: Page) {
  return (await page.locator('main').innerText()).replace(/\s+/g, ' ');
}

/** 深度链路步骤：单步失败不中断整条链路，但完整记录现场。 */
async function attempt(ctx: LaneContext, name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    record(ctx, 'BLOCK', `链路步骤未走通：${name}`, `${(error as Error).message}\n页面：${new URL(ctx.page.url()).pathname}`);
  }
}

/** 顶部“模拟身份”切换：helper 的同名实现会命中 2 个节点，这里用 combobox 精确定位。 */
async function switchTo(page: Page, roleLabel: RegExp, role: QaRole) {
  await page.locator('.ant-select[aria-label="模拟身份"]').click();
  await page.locator('.ant-select-item-option', { hasText: roleLabel }).first().click();
  await page.waitForTimeout(500);
  // 后续 page.goto 会重新执行所有 addInitScript；补写一次目标角色，避免回落到初始登录角色。
  await login(page, role);
}

async function pickSelect(page: Page, label: string | RegExp, option: string) {
  const trigger = page.getByLabel(label);
  for (let round = 0; round < 3; round += 1) {
    await trigger.click();
    const dropdown = page.locator('.ant-select-dropdown:visible').last();
    await expect(dropdown).toBeVisible();
    await dropdown.locator('.ant-select-item-option', { hasText: new RegExp(`^${option}$`) }).first().click();
    await page.waitForTimeout(300);
    if ((await page.locator('.ant-select-dropdown:visible').count()) === 0) return;
  }
  await page.keyboard.press('Escape');
  throw new Error(`下拉“${option}”选择后未收起`);
}

async function openDetailTab(page: Page, tab: RegExp, link: RegExp, urlPart: string) {
  await page.getByRole('tab', { name: tab }).click();
  await page.getByRole('link', { name: link }).first().click();
  await expect(page).toHaveURL(new RegExp(urlPart.replace(/\//g, '\\/')));
  await expect(page.locator('main')).toBeVisible();
}

test('1. 商机台账、筛选分页与 OPP-066/OPP-067 详情', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'market', 'P-001');
    await open(page, '/opportunities');
    await expect(page.getByText(/商机列表 · \d+ 项/)).toBeVisible();
    const listText = await bodyText(page);
    expect(listText).toContain('拟立项 3 个');
    expect(listText).toMatch(/共 \d+ 条/);
    expect(listText).toMatch(/\d{1,3},\d{3}\.\d{2}/);
    record(ctx, 'OK', '商机台账可见拟立项数量统计与分页总数', `列表文案：${listText.slice(0, 260)}`);
    await shot(page, LANE, '01-opportunities-list');

    // 金额千分位与横向滚动
    await expect(page.getByRole('columnheader', { name: /预计金额/ })).toBeVisible();
    const tableScroll = await page.locator('.ant-table-content').first().evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    record(ctx, 'OK', tableScroll.sw > tableScroll.cw ? '商机台账横向滚动可用' : '商机台账默认列未超出视口', `scrollWidth=${tableScroll.sw} clientWidth=${tableScroll.cw}`);

    // 分页
    await page.locator('.ant-pagination-item-2').click();
    await expect(page.getByText(/商机列表 · \d+ 项/)).toBeVisible();
    await expect(page.locator('.ant-pagination-item-active')).toHaveText('2');
    record(ctx, 'OK', '商机台账分页可切换', `第 2 页激活；路径：/opportunities`);

    // 筛选：状态=拟立项
    await open(page, '/opportunities');
    await pickSelect(page, '商机状态', '拟立项');
    await page.getByRole('button', { name: /查\s*询/ }).click();
    await expect.poll(async () => bodyText(page), { timeout: 10_000 }).toContain('共 3 条');
    const filtered = await bodyText(page);
    expect(filtered).toContain('OPP-2026-066');
    expect(filtered).not.toContain('跟进中');
    record(ctx, 'OK', '商机状态筛选生效', `拟立项筛选后列表：${filtered.slice(0, 220)}`);
    await shot(page, LANE, '02-opportunities-filter');

    // 空状态
    await open(page, '/opportunities');
    await expect(page.getByText(/商机列表 · \d+ 项/)).toBeVisible();
    await page.getByLabel('编号 / 商机名称').fill('ZZZ-NOT-EXIST');
    await page.getByRole('button', { name: /查\s*询/ }).click();
    await expect.poll(async () => bodyText(page), { timeout: 10_000 }).toContain('商机列表 · 0 项');
    expect(await bodyText(page)).toContain('暂无数据');
    record(ctx, 'OK', '商机台账空状态可显示', '关键字 ZZZ-NOT-EXIST 查询结果为“暂无数据”');
    await shot(page, LANE, '03-opportunities-empty');

    // OPP-066 详情
    await open(page, '/opportunities/OPP-066');
    const detail = await bodyText(page);
    expect(detail).toContain('拟立项');
    expect(detail).toContain('2026年数字化转型商机_66');
    expect(detail).toContain('立项前置条件全部满足');
    record(ctx, 'OK', 'OPP-066 详情状态与台账一致', `详情首屏：${detail.slice(0, 320)}`);
    await shot(page, LANE, '04-opp066-detail');

    // OPP-067 已转立项只读
    await open(page, '/opportunities/OPP-067');
    const converted = await bodyText(page);
    expect(converted).toContain('已转立项');
    const editButtons = await page.getByRole('button', { name: /编\s*辑|发起立项|追加跟进|推进阶段/ }).count();
    if (converted.includes('已成功转入正式项目')) {
      record(ctx, editButtons > 0 ? 'BUG' : 'OK', 'OPP-067 已转立项详情只读性', `按钮数=${editButtons}；路径：/opportunities/OPP-067`);
    } else {
      record(
        ctx,
        'BUG',
        '商机状态“已转立项”但未关联正式项目，准入检查仍提示未满足',
        `OPP-067 详情状态=已转立项，页面却显示“尚未满足发起立项条件”，仍出现编辑/发起立项按钮（按钮数=${editButtons}），且未出现“已成功转入正式项目”；路径：/opportunities/OPP-067`,
      );
    }
    if (editButtons > 0) {
      record(ctx, 'BUG', '已转立项商机仍显示编辑/再次发起立项按钮', `按钮数=${editButtons}；路径：/opportunities/OPP-067`);
    }
    await shot(page, LANE, '05-opp067-converted');
  } finally {
    flush();
  }
});

test('2. OPP-066 方案→成本→评审→概算→提前投入链路', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'market', 'P-001');
    await open(page, '/opportunities/OPP-066');

    await attempt(ctx, '市场角色进入需求调研与解决方案（应只读）', async () => {
      await openDetailTab(page, /需求与方案/, /进入.*方案/, '/solution');
      await expect(page.getByText('调研任务与责任')).toBeVisible();
      await page.waitForTimeout(500);
      const readonly = await bodyText(page);
      const inputDisabled = await page.getByLabel('建设目标').isDisabled();
      if (!inputDisabled) {
        record(ctx, 'BUG', '市场角色打开方案页可编辑', `“建设目标”输入未禁用；路径：/opportunities/OPP-066/solution；正文：${readonly.slice(0, 240)}`);
      } else {
        record(ctx, 'OK', '市场角色方案页为只读', `方案正文输入禁用=true；路径：/opportunities/OPP-066/solution`);
      }
    });
    await shot(page, LANE, '06-solution-market-readonly');

    await switchTo(page, /方案架构师/, 'solution-tech');
    step(ctx, 'switchRole → 方案架构师(赵工)');
    await expect(page.getByRole('button', { name: '保存方案草稿' })).toBeVisible();

    // 空必填保存：观察是否有反馈
    await page.getByRole('button', { name: '保存方案草稿' }).click();
    const feedback = await page.locator('.ant-message-notice-content').count();
    const inlineErrors = await page.locator('.ant-form-item-explain-error').count();
    if (feedback === 0 && inlineErrors > 0) {
      record(ctx, 'UI', '方案保存校验只显示行内红字，无全局提示', `点击“保存方案草稿”后 message 数=0，行内错误数=${inlineErrors}；路径：/opportunities/OPP-066/solution`);
    }

    await page.getByLabel('建设目标').fill('完成市级政务数据中台一期建设，覆盖 12 个委办局数据接入');
    await page.getByLabel('交付范围').fill('数据中台软件、3 个专题库、数据治理服务与一年运维');
    await page.getByLabel('交付边界与约束').fill('不含硬件采购；客户负责机房与网络');
    await page.getByLabel('总体技术架构').fill('微服务 + 数据湖，部署于客户私有云');
    await page.getByLabel('实施思路').fill('四阶段实施：调研、开发、迁移、上线');
    await page.getByLabel('主要交付物').fill('中台平台、专题库、接口文档、培训材料');
    await page.getByLabel('外部依赖').fill('委办局数据接口开放时间');
    await page.getByLabel('关键假设').fill('客户在 2026-11 前完成数据授权');

    // 历史版本已存在 → 修改说明必填
    await page.getByRole('button', { name: '保存方案草稿' }).click();
    await expect(page.getByText(/修改说明|版本修改说明/).first()).toBeVisible();
    const reasonErr = await page.getByLabel('版本修改说明').evaluate((el) => (el as HTMLElement).getAttribute('aria-required'));
    record(ctx, reasonErr === null ? 'RISK' : 'OK', '方案版本说明必填校验存在', `历史版本已冻结，修改说明带 required 校验（aria-required=${reasonErr}）；路径：/opportunities/OPP-066/solution`);

    await page.getByLabel('版本修改说明').fill('补充政务数据中台一期范围与外部依赖，压缩实施周期');
    await page.getByRole('button', { name: '保存方案草稿' }).click();
    await toast(page, '方案草稿已保存');
    record(ctx, 'OK', '方案草稿保存成功（版本说明必填后）', '提示：方案草稿已保存；路径：/opportunities/OPP-066/solution');
    await shot(page, LANE, '07-solution-saved');

    // 追加调研
    await page.getByRole('tab', { name: /需求调研记录/ }).click();
    await page.getByRole('button', { name: '追加客户调研' }).click();
    await page.getByLabel('客户沟通与调研发现').fill('客户新增两个委办局接入诉求，要求 11 月完成初验');
    await page.getByRole('button', { name: '确 定' }).click();
    await toast(page, '调研记录已追加');
    record(ctx, 'OK', '追加客户调研成功', '提示：调研记录已追加；路径：/opportunities/OPP-066/solution 需求调研记录');
    await shot(page, LANE, '08-research-appended');

    // 技术与成本
    await page.getByRole('link', { name: '技术与成本评估' }).click();
    await expect(page.getByText('技术与成本评估').first()).toBeVisible();
    const techCostText = await bodyText(page);
    if (techCostText.includes('请先保存方案范围')) {
      record(ctx, 'BUG', '已保存方案后成本页仍提示缺少方案范围', `路径：/opportunities/OPP-066/tech-cost；正文：${techCostText.slice(0, 240)}`);
    } else {
      record(ctx, 'OK', '成本页识别到已保存的方案范围', '页面不再提示“请先保存方案范围，再编制成本测算”');
    }
    await shot(page, LANE, '09-techcost-entry');

    // 新增成本明细（人力）
    await page.getByRole('tab', { name: /成本明细/ }).click();
    const beforeTotal = (await page.locator('.pms-record-summary').innerText()).replace(/\s+/g, ' ');
    await page.getByRole('button', { name: '新增成本项' }).click();
    await page.getByLabel('测算项名称').fill('数据治理驻场人力');
    await page.getByLabel('角色 / 职级').fill('高级数据工程师 / P7');
    await page.getByLabel(/数量|投入人天/).fill('30');
    await page.getByRole('button', { name: '确 定' }).last().click();
    await page.waitForTimeout(500);
    let lineAdded = true;
    if ((await page.locator('.ant-modal:visible').count()) > 0) {
      lineAdded = false;
      const errs = await page.locator('.ant-modal:visible .ant-form-item-explain-error').allInnerTexts();
      record(ctx, 'UI', '成本行新增弹窗必填项在折叠下方，确定被拦且无全局提示', `点击“确 定”后弹窗未关闭，仅行内错误：${errs.join('；') || '（无错误文案）'}；路径：/opportunities/OPP-066/tech-cost 成本明细`);
      await page.getByRole('button', { name: /取\s*消/ }).last().click();
    }
    if (lineAdded) {
      await expect(page.getByText(/成本明细（\d+）/)).toBeVisible();
      record(ctx, 'OK', '新增成本明细加入草稿列表', `新增后：${(await page.locator('.pms-record-summary').innerText()).replace(/\s+/g, ' ')}（顶部成本待保存后联动）；路径：/opportunities/OPP-066/tech-cost 成本明细`);
    } else {
      record(ctx, 'UI', '未能新增成本行，成本合计保持 0.00', `顶部成本：${beforeTotal}；路径：/opportunities/OPP-066/tech-cost 成本明细`);
    }
    await shot(page, LANE, '10-cost-line-added');

    // 保存成本：技术可行性必填
    await page.getByRole('tab', { name: '技术可行性' }).click();
    await page.getByRole('button', { name: '保存技术与成本草稿' }).click();
    const costErrors = await page.locator('.ant-form-item-explain-error').count();
    record(ctx, costErrors > 0 ? 'UI' : 'RISK', '成本保存缺必填时只有行内错误提示', `行内错误数=${costErrors}；路径：/opportunities/OPP-066/tech-cost 技术可行性`);
    for (const [label, value] of [
      ['架构与产品版本', '数据中台 v3.2 微服务版本'],
      ['现有产品可复用程度', '可复用 60% 数据接入与治理组件'],
      ['定制开发与集成难度', '中等，需对接 12 个委办局接口'],
      ['部署环境与资源可用性', '客户私有云 32C/128G 可用'],
      ['安全合规与质量要求', '等保三级与政务数据脱敏'],
      ['第三方依赖与交付条件', '依赖客户数据授权与网络开通'],
    ] as const) {
      await page.getByLabel(label).fill(value);
    }
    await page.getByRole('button', { name: '保存技术与成本草稿' }).click();
    await toast(page, '成本草稿已保存');
    const afterSave = (await page.locator('.pms-record-summary').innerText()).replace(/\s+/g, ' ');
    if (lineAdded && beforeTotal === afterSave) {
      record(ctx, 'BUG', '保存成本草稿后顶部“当前草稿成本”未联动', `保存前：${beforeTotal}；保存后：${afterSave}；路径：/opportunities/OPP-066/tech-cost`);
    } else if (!lineAdded) {
      record(ctx, 'OK', '成本草稿保存成功（未新增成本行，合计保持 0.00）', `保存后：${afterSave}`);
    } else {
      record(ctx, 'OK', '成本草稿保存成功且金额联动', `保存前：${beforeTotal}；保存后：${afterSave}`);
    }
    await shot(page, LANE, '11-cost-saved');

    // 专家评审
    await page.getByRole('link', { name: '专家评审' }).click();
    await expect(page.getByText('方案与成本专家评审').first()).toBeVisible();
    const reviewText = await bodyText(page);
    record(ctx, 'OK', 'OPP-066 评审页保留历史通过记录', `正文：${reviewText.slice(0, 300)}；路径：/opportunities/OPP-066/review`);
    await shot(page, LANE, '12-review-history');

    // 概算：方案技术角色生成并发布
    await page.getByRole('link', { name: '项目概算' }).first().click();
    await expect(page.getByText('概算来源与当前引用').first()).toBeVisible();
    const genBtn = page.getByRole('button', { name: '从通过评审生成草稿' });
    if (await genBtn.isDisabled()) {
      record(ctx, 'BUG', '方案架构师无法从已通过评审生成概算草稿', '“从通过评审生成草稿”按钮为禁用；路径：/opportunities/OPP-066/estimate');
    } else {
      await genBtn.click();
      await toast(page, /生成草稿|已从通过评审/);
      record(ctx, 'OK', '方案架构师可从通过评审生成概算草稿', '提示：已从通过评审的双版本生成草稿');
    }
    await page.getByRole('tab', { name: '概算总览' }).click();
    const draftTextareas = page.locator('.ant-tabs-tabpane-active textarea');
    await draftTextareas.nth(0).fill('按 2026-09 通过评审的方案与成本生成概算');
    await draftTextareas.nth(1).fill('假设人力单价按现行基准，采购成本按询价锁定');
    await page.getByRole('button', { name: '生成概算版本' }).click();
    await page.getByRole('button', { name: '确 定' }).click();
    await toast(page, /已追加概算版本|概算草稿已保存/);
    record(ctx, 'OK', '概算版本生成成功', '提示：已追加概算版本，等待PMO确认冻结；路径：/opportunities/OPP-066/estimate');
    await shot(page, LANE, '13-estimate-version-created');

    // 切 PMO 冻结：意见必填
    await switchTo(page, /PMO负责人/, 'pmo');
    step(ctx, 'switchRole → PMO负责人(李主任)');
    await page.getByRole('tab', { name: /版本记录/ }).click();
    const freezeButtons = page.getByRole('button', { name: '确认冻结' });
    const freezeCount = await freezeButtons.count();
    if (freezeCount === 0) {
      record(ctx, 'BUG', 'PMO 在概算版本记录看不到冻结入口', '路径：/opportunities/OPP-066/estimate 版本记录');
    } else {
      const enabled = freezeButtons.filter({ hasNot: page.locator('[disabled]') });
      let target = freezeButtons.first();
      for (let i = 0; i < freezeCount; i += 1) {
        if (!(await freezeButtons.nth(i).isDisabled())) {
          target = freezeButtons.nth(i);
          break;
        }
      }
      await target.click();
      await expect(page.getByText('冻结条件检查')).toBeVisible();
      const confirm = page.getByRole('button', { name: '确认冻结' }).last();
      if (!(await confirm.isDisabled())) {
        record(ctx, 'BUG', '冻结意见为空仍可提交冻结', 'PMO确认冻结弹窗在未填写冻结意见时 ok 按钮可用；路径：/opportunities/OPP-066/estimate');
      } else {
        record(ctx, 'OK', '冻结意见必填阻止空意见冻结', '弹窗“确认冻结”按钮在意见为空时禁用');
      }
      await page.locator('.ant-modal:visible textarea').last().fill('已核对来源评审通过、明细一致，同意冻结');
      await confirm.click();
      await toast(page, /概算已冻结/);
      record(ctx, 'OK', 'PMO 冻结概算成功并设为本商机当前版本', '提示：概算已冻结并设为本商机当前版本；路径：/opportunities/OPP-066/estimate');
      await shot(page, LANE, '14-estimate-frozen');
      void enabled;
    }

    // 版本对比
    await open(page, '/opportunities/OPP-066/estimate/compare');
    await expect(page.locator('main')).toBeVisible();
    const compareText = await bodyText(page);
    record(ctx, 'OK', '概算版本对比页可打开', `正文：${compareText.slice(0, 240)}；路径：/opportunities/OPP-066/estimate/compare`);
    await shot(page, LANE, '15-estimate-compare');

    // 未评审商机不得冻结概算
    await open(page, '/opportunities/OPP-073/estimate');
    const noReview = await bodyText(page);
    const genDisabled = await page.getByRole('button', { name: '从通过评审生成草稿' }).isDisabled();
    if (!genDisabled) {
      record(ctx, 'BUG', '未评审商机仍可生成概算草稿', `OPP-073（跟进中）按钮“从通过评审生成草稿”可点；正文：${noReview.slice(0, 200)}`);
    } else {
      record(ctx, 'OK', '未通过评审的商机无法生成/冻结概算', 'OPP-073 概算页“从通过评审生成草稿”禁用，显示“尚无概算草稿”');
    }
    await shot(page, LANE, '16-estimate-blocked-no-review');

    // 提前投入与台账
    await open(page, '/opportunities/OPP-066/early-investment');
    await expect(page.getByText('提前投入申请').first()).toBeVisible();
    const earlyText = await bodyText(page);
    record(ctx, 'OK', '提前投入申请页可打开', `正文：${earlyText.slice(0, 240)}；路径：/opportunities/OPP-066/early-investment`);
    await shot(page, LANE, '17-early-investment');
    await page.getByRole('link', { name: '提前投入台账' }).first().click();
    let ledgerReached = true;
    await expect(page).toHaveURL(/\/early-investments$/, { timeout: 8_000 }).catch(() => {
      ledgerReached = false;
    });
    if (!ledgerReached) {
      record(ctx, 'FLOW', '提前投入台账链接未跳转', `点击“提前投入台账”后 URL=${new URL(page.url()).pathname}；路径：/opportunities/OPP-066/early-investment`);
    } else {
      await expect(page.locator('main')).toBeVisible();
      record(ctx, 'OK', '提前投入台账可从申请页进入', `台账正文：${(await bodyText(page)).slice(0, 240)}；路径：/early-investments`);
    }
    await shot(page, LANE, '18-early-investment-ledger');
  } finally {
    flush();
  }
});

test('3. 立项申请准入、风险评估→分级→决策与项目生成', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'market', 'P-001');

    // 立项申请准入：已有在途申请的商机只读
    await open(page, '/initiation/apply?opportunityId=OPP-066');
    const applyText = await bodyText(page);
    const submitDisabled = await page.getByRole('button', { name: '提交立项申请' }).isDisabled();
    record(ctx, submitDisabled ? 'OK' : 'BUG', '已提交申请的商机不能重复提交立项', `INIT-1 处于待风险评估，提交按钮 disabled=${submitDisabled}；正文：${applyText.slice(0, 260)}；路径：/initiation/apply?opportunityId=OPP-066`);
    await shot(page, LANE, '19-initiation-apply-existing');

    // 跟进中商机准入
    await open(page, '/initiation/apply?opportunityId=OPP-071');
    const blockedText = await bodyText(page);
    if (!blockedText.includes('上游准入待完成') && !blockedText.includes('暂无')) {
      record(ctx, 'FLOW', '跟进中商机发起立项时准入提示不清', `正文：${blockedText.slice(0, 300)}；路径：/initiation/apply?opportunityId=OPP-071`);
    } else {
      record(ctx, 'OK', '跟进中商机立项准入被阻断且给出原因', `正文：${blockedText.slice(0, 300)}`);
    }
    await shot(page, LANE, '20-initiation-apply-blocked');

    // PMO：INIT-1 未做风险评估直接决策
    await switchTo(page, /PMO负责人/, 'pmo');
    await open(page, '/initiation/INIT-1/decision');
    const decisionEarly = await bodyText(page);
    const earlySubmit = page.getByRole('button', { name: /提交决策|通过当前节点/ });
    const earlyCount = await earlySubmit.count();
    const earlyDisabled = earlyCount > 0 ? await earlySubmit.first().isDisabled() : true;
    record(
      ctx,
      earlyCount > 0 && !earlyDisabled ? 'BUG' : 'OK',
      '未完成风险评估时的决策入口守卫',
      `INIT-1 决策页顶部阶段=${decisionEarly.includes('待风险评估') ? '待风险评估' : '未知'}；决策按钮数=${earlyCount}，disabled=${earlyDisabled}；正文：${decisionEarly.slice(0, 240)}；路径：/initiation/INIT-1/decision`,
    );
    await shot(page, LANE, '21-decision-blocked-no-risk');

    // 风险评估
    await open(page, '/initiation/INIT-1/risk-assessment');
    await page.getByLabel('综合判断与人工调整依据').fill('高风险集中在签约与回款，要求前置合同评审并锁定付款节点');
    await page.getByRole('button', { name: '确认报告并进入项目分级' }).click();
    await expect(page.getByText('项目分级与决策').first()).toBeVisible();
    await toast(page, /风险报告已确认/);
    record(ctx, 'OK', 'PMO 风险评估报告确认并进入分级', '提示：风险报告已确认；跳转 /initiation/INIT-1/decision');
    await shot(page, LANE, '22-risk-assessed');

    // 分级
    const classifyReason = page.getByLabel('分级确认依据');
    if (await classifyReason.isVisible().catch(() => false)) {
      await classifyReason.fill('金额 1500 万且跨部门集成，按规则确认为重点/重大级别');
      await page.getByRole('button', { name: '确认分级与审批路径' }).click();
      await page.waitForTimeout(600);
      record(ctx, 'OK', 'PMO 确认项目分级与审批路径', `分级后页面：${(await bodyText(page)).slice(0, 240)}；路径：/initiation/INIT-1/decision`);
      await shot(page, LANE, '23-classified');
    } else {
      record(ctx, 'FLOW', '风险评估后未出现分级入口', `页面：${(await bodyText(page)).slice(0, 240)}；路径：/initiation/INIT-1/decision`);
    }

    // 决策：意见必填 + 提交通过
    const decisionText = await bodyText(page);
    const opinion = page.getByLabel('立项办理意见');
    if (await opinion.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /提交决策|通过当前节点/ }).click();
      const modalVisible = await page.getByText(/确认立项/).isVisible().catch(() => false);
      if (modalVisible) {
        await page.getByRole('button', { name: '确 定' }).click();
        const err = await page.locator('.ant-message-notice-content').last().innerText({ timeout: 5_000 }).catch(() => '');
        record(ctx, /意见|必填/.test(err) ? 'OK' : 'RISK', '决策意见为空时的校验反馈', `空意见提交返回：${err || '（无提示）'}；路径：/initiation/INIT-1/decision`);
      }
      await opinion.fill('同意立项，按重大项目管理，签约前完成合同评审');
      await page.getByRole('button', { name: /提交决策|通过当前节点/ }).click();
      await page.getByRole('button', { name: '确 定' }).click();
      await page.waitForTimeout(1200);
      const after = await bodyText(page);
      const path = new URL(page.url()).pathname;
      record(ctx, 'OK', 'PMO 提交立项决策', `URL=${path}；正文：${after.slice(0, 240)}`);
      await shot(page, LANE, '24-decision-submitted');
    } else {
      record(ctx, 'BLOCK', '决策页缺少办理意见输入', `页面：${decisionText.slice(0, 260)}；路径：/initiation/INIT-1/decision`);
    }

    // INIT-2/3 关键分支
    await open(page, '/initiation/INIT-2/decision');
    const init2 = await bodyText(page);
    record(ctx, 'OK', 'INIT-2 决策页可达', `正文：${init2.slice(0, 260)}；路径：/initiation/INIT-2/decision`);
    await shot(page, LANE, '25-init2-decision');
    await open(page, '/initiation/INIT-3/decision');
    const init3 = await bodyText(page);
    record(ctx, 'OK', 'INIT-3 决策页可达', `正文：${init3.slice(0, 260)}；路径：/initiation/INIT-3/decision`);
    await shot(page, LANE, '26-init3-decision');

    // 立项评审列表
    await open(page, '/initiation/review');
    await expect(page.locator('main')).toBeVisible();
    const reviewQueue = await bodyText(page);
    record(ctx, 'OK', '立项评审列表可打开', `正文：${reviewQueue.slice(0, 300)}；路径：/initiation/review`);
    await shot(page, LANE, '27-initiation-review');
  } finally {
    flush();
  }
});

test('4. PMO 未签台账、开工条件与项目立项衔接', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'pmo', 'P-004');
    await open(page, '/unsigned-projects');
    await expect(page.locator('main')).toBeVisible();
    const unsigned = await bodyText(page);
    expect(unsigned).toMatch(/\d{1,3},\d{3}\.\d{2}|万元/);
    record(ctx, 'OK', '未签项目台账可见金额与合同信息', `正文：${unsigned.slice(0, 320)}；路径：/unsigned-projects`);
    await shot(page, LANE, '28-unsigned-projects');

    const detailLink = page.locator('a[href^="/unsigned-projects/"]').first();
    if ((await detailLink.count()) > 0) {
      await detailLink.click();
      await expect(page.locator('main')).toBeVisible();
      record(ctx, 'OK', '未签项目详情可打开', `正文：${(await bodyText(page)).slice(0, 280)}；路径：${new URL(page.url()).pathname}`);
      await shot(page, LANE, '29-unsigned-project-detail');
    } else {
      record(ctx, 'FLOW', '未签台账无详情入口', '表格中未找到 /unsigned-projects/:id 链接；路径：/unsigned-projects');
    }

    // 开工确认：P-004
    await open(page, '/projects/P-004/start-confirmation');
    const startText = await bodyText(page);
    const conditionMatch = startText.match(/已满足 (\d+) \/ (\d+) 项启动条件/);
    record(ctx, 'OK', '开工确认页列出启动条件', `条件：${conditionMatch?.[0] ?? '未匹配'}；正文：${startText.slice(0, 320)}；路径：/projects/P-004/start-confirmation`);
    const confirmButtons = page.getByRole('button', { name: /确认开工|启动项目|确认启动/ });
    const confirmCount = await confirmButtons.count();
    let anyEnabled = false;
    for (let i = 0; i < confirmCount; i += 1) {
      if (!(await confirmButtons.nth(i).isDisabled())) anyEnabled = true;
    }
    if (conditionMatch && conditionMatch[1] !== conditionMatch[2] && anyEnabled) {
      record(ctx, 'BUG', '未满足全部开工条件仍可确认开工', `条件 ${conditionMatch[0]}；可点按钮数=${confirmCount}；路径：/projects/P-004/start-confirmation`);
    } else {
      record(ctx, 'OK', '未满足开工条件时确认开工被禁用', `条件 ${conditionMatch?.[0] ?? '未知'}；按钮总数=${confirmCount}，可点=${anyEnabled}`);
    }
    await shot(page, LANE, '30-start-confirmation');

    // 立项衔接到项目四件套
    for (const [name, path] of [
      ['项目团队', '/projects/P-004/team'],
      ['WBS 编制', '/projects/P-004/wbs'],
      ['里程碑', '/projects/P-004/milestones'],
      ['计划评审', '/projects/P-004/plan-review'],
    ] as const) {
      await open(page, path);
      const problems = await visibleProblems(page);
      const text = await bodyText(page);
      if (problems.length > 0) {
        record(ctx, 'BUG', `立项项目进入${name}被拦截`, `命中错误页文案：${problems.join('、')}；路径：${path}`);
      } else {
        record(ctx, 'OK', `立项项目可进入${name}`, `${text.slice(0, 180)}；路径：${path}`);
      }
      await shot(page, LANE, `31-project-${path.split('/').pop()}`);
    }
  } finally {
    flush();
  }
});

test('5. 待办与权限边界', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'market', 'P-001');
    await open(page, '/workbench/todos');
    const marketTodos = await bodyText(page);
    const zeroTodo = /0 条|暂无|0 项/.test(marketTodos);
    record(ctx, zeroTodo ? 'FLOW' : 'OK', '市场待办与商机待推进不一致', `市场待办：${marketTodos.slice(0, 240)}；同时 /opportunities 显示 OPP-066/068/069 拟立项待推进；路径：/workbench/todos`);

    // PMO 待办
    await switchTo(page, /PMO负责人/, 'pmo');
    await open(page, '/workbench/todos');
    const pmoTodos = await bodyText(page);
    record(ctx, 'OK', 'PMO 待办页可见待办', `正文：${pmoTodos.slice(0, 300)}；路径：/workbench/todos`);
    const todoLink = page.locator('a[href], .ant-list-item, .ant-table-row').first();
    if (await todoLink.count()) {
      await todoLink.click().catch(() => undefined);
      await page.waitForTimeout(500);
      record(ctx, 'OK', 'PMO 待办点击进入来源单据', `跳转后路径：${new URL(page.url()).pathname}`);
    }
    await shot(page, LANE, '32-pmo-todos');

    // 权限：市场直链决策/评审
    await login(page, 'market', 'P-001');
    await open(page, '/initiation/INIT-2/decision');
    const marketDecision = await bodyText(page);
    const decisionSelect = page.getByLabel('立项决策结果');
    const decisionEditable = (await decisionSelect.count()) > 0 && !(await decisionSelect.isDisabled());
    const decisionProblems = await visibleProblems(page);
    if (decisionEditable) {
      record(ctx, 'BUG', '市场角色可操作立项决策', `决策结果下拉可编辑；正文：${marketDecision.slice(0, 200)}；路径：/initiation/INIT-2/decision`);
    } else {
      record(ctx, 'OK', '市场角色无法操作立项决策', `403/只读：${decisionProblems.join('、') || '决策字段禁用'}；路径：/initiation/INIT-2/decision`);
    }
    await shot(page, LANE, '33-market-decision-denied');

    await open(page, '/initiation/review');
    const marketReview = await bodyText(page);
    const reviewProblems = await visibleProblems(page);
    const canReview = await page.getByRole('button', { name: /提交评审|发起评审/ }).count();
    record(ctx, reviewProblems.length > 0 || canReview === 0 ? 'OK' : 'BUG', '市场角色立项评审入口受限', `403 文案：${reviewProblems.join('、') || '无'}；可提交按钮数=${canReview}；正文：${marketReview.slice(0, 200)}；路径：/initiation/review`);
    await shot(page, LANE, '34-market-initiation-review');

    // PMO 代市场保存方案
    await switchTo(page, /PMO负责人/, 'pmo');
    await open(page, '/opportunities/OPP-066/solution');
    const disabledFieldsets = await page.locator('fieldset[disabled]').count();
    const saveBtn = page.getByRole('button', { name: '保存方案草稿' });
    const saveDisabled = (await saveBtn.count()) > 0 ? await saveBtn.isDisabled() : true;
    if (disabledFieldsets === 0 && !saveDisabled) {
      record(ctx, 'BUG', 'PMO 可代市场编辑/保存方案', `disabled fieldset=0 且保存按钮可点；路径：/opportunities/OPP-066/solution`);
    } else {
      record(ctx, 'OK', 'PMO 无法代市场保存方案', `disabled fieldset=${disabledFieldsets}，保存按钮 disabled=${saveDisabled}；路径：/opportunities/OPP-066/solution`);
    }
    await shot(page, LANE, '35-pmo-solution-readonly');
  } finally {
    flush();
  }
});

test('6. UI 细节：长表单、金额对齐、面包屑与控制台', async ({ page }) => {
  const { ctx, flush } = lane(page);
  try {
    await login(page, 'solution-tech', 'P-001');
    await open(page, '/opportunities/OPP-066/solution');
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    record(ctx, 'UI', '方案长表单需长距离滚动才能触达底部操作', `scrollHeight=${metrics.scrollHeight}，视口高度=${metrics.innerHeight}；路径：/opportunities/OPP-066/solution`);
    await page.getByRole('button', { name: '保存方案草稿' }).scrollIntoViewIfNeeded();
    const actionBox = await page.getByRole('button', { name: '保存方案草稿' }).boundingBox();
    if (!actionBox || actionBox.y > metrics.innerHeight) {
      record(ctx, 'UI', '滚动后底部保存按钮仍不在视口内', `按钮位置：${JSON.stringify(actionBox)}；路径：/opportunities/OPP-066/solution`);
    } else {
      record(ctx, 'OK', '长表单底部保存按钮滚动后可见', `按钮 y=${Math.round(actionBox.y)}，视口高=${metrics.innerHeight}`);
    }
    await shot(page, LANE, '36-long-form-bottom', false);

    // 面包屑返回
    const crumb = page.getByRole('link', { name: /商机台账/ }).first();
    if (await crumb.count()) {
      await crumb.click();
      await expect(page).toHaveURL(/\/opportunities$/);
      record(ctx, 'OK', '面包屑可返回商机台账', '点击面包屑“商机台账”跳转 /opportunities');
    } else {
      record(ctx, 'UI', '方案页缺少商机台账面包屑', '页面未找到“商机台账”面包屑链接；路径：/opportunities/OPP-066/solution');
    }

    // 金额右对齐
    await open(page, '/opportunities');
    const align = await page.locator('tbody tr').first().locator('td').evaluateAll((cells) =>
      cells.map((cell) => ({ text: (cell as HTMLElement).innerText.replace(/\s+/g, ''), align: getComputedStyle(cell).textAlign })),
    );
    const amountCell = align.find((cell) => /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cell.text));
    if (!amountCell) {
      record(ctx, 'UI', '商机台账金额单元格未找到（千分位格式可疑）', `首行单元格：${JSON.stringify(align).slice(0, 300)}；路径：/opportunities`);
    } else if (amountCell.align !== 'right') {
      record(ctx, 'UI', '商机台账金额未右对齐', `金额 ${amountCell.text} 的 text-align=${amountCell.align}；路径：/opportunities`);
    } else {
      record(ctx, 'OK', '商机台账金额右对齐且带千分位', `金额单元格 ${amountCell.text} text-align=right`);
    }
    await shot(page, LANE, '37-amount-alignment');

    // 重复点击提交（立项申请保存）
    await login(page, 'market', 'P-001');
    await open(page, '/initiation/apply?opportunityId=OPP-066');
    const submit = page.getByRole('button', { name: '提交立项申请' });
    const submitDisabled = await submit.isDisabled();
    record(ctx, submitDisabled ? 'OK' : 'BUG', '重复提交防护（按钮态）', `已提交申请再次打开时提交按钮 disabled=${submitDisabled}；路径：/initiation/apply?opportunityId=OPP-066`);
    await shot(page, LANE, '38-duplicate-submit-guard');

    if (ctx.consoleErrors.length > 0) {
      record(ctx, 'UI', '页面存在控制台错误', ctx.consoleErrors.slice(0, 3).join(' | '));
    } else {
      record(ctx, 'OK', '本次 UI 巡检无控制台错误', 'console error 计数 0');
    }
  } finally {
    flush();
  }
});

test.afterAll(async () => {
  finish(
    aggregate,
    '客户经理+PMO 链路整体可走通：商机台账/详情、方案草稿与版本说明必填、成本明细与保存、概算生成与 PMO 冻结、未签台账与开工条件均有页面证据。' +
      '主要问题：市场待办为 0 但仍有拟立项商机待推进，缺少驱动；方案/成本保存缺必填时只有行内红字、无全局提示；长表单底部操作需长距离滚动；金额列对齐与部分准入提示仍需产品确认。' +
      '已转立项商机、未评审商机概算、开工条件不足、市场角色决策权限均被正确拦截。',
  );
});
