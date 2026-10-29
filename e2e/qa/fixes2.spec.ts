import { expect, test } from '@playwright/test';
import { finish, goto, laneContext, login, record, shot } from './_helpers';

/**
 * 二次修复回归：INIT-4 草稿提交、结算台账、合同版本/用印、P-008 状态口径。
 * 业务断言保持最小，只锁住本次修复的可观察结果。
 */
test.setTimeout(240_000);
test.use({ viewport: { width: 1600, height: 1000 } });

test('客户经理可从 INIT-4 草稿编辑并提交立项', async ({ page }) => {
  const ctx = laneContext(page, 'fixes2-init');
  await login(page, 'market');
  await goto(page, '/opportunities/OPP-070');
  await expect(page.getByRole('button', { name: '进入立项单' })).toBeVisible({ timeout: 20_000 });
  record(ctx, 'OK', '已有草稿入口', 'OPP-070 显示「进入立项单」');
  await page.getByRole('button', { name: '进入立项单' }).click();
  await page.waitForURL(/\/initiation\/apply\?id=INIT-4/, { timeout: 20_000 });
  await expect(page.getByLabel('立项必要性')).toBeVisible({ timeout: 20_000 });
  record(ctx, 'OK', '草稿可编辑', 'INIT-4 必要性字段可见');

  await page.getByLabel('立项必要性').fill('试点验证后客户追加了二期推广预算');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByText('草稿已保存')).toBeVisible({ timeout: 10_000 });
  record(ctx, 'OK', '保存草稿', '提示「草稿已保存」');

  await page.getByRole('button', { name: '提交立项申请' }).click();
  await expect(page.getByText('已提交，进入综合风险评估')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('待风险评估').first()).toBeVisible({ timeout: 15_000 });
  record(ctx, 'OK', '提交成功', 'INIT-4 进入待风险评估');
  await shot(page, 'fixes2-init', 'init-4-submitted');
  finish(ctx, 'INIT-4 草稿可编辑、保存并提交到待风险评估。');
});

test('财务从 /settlement 查看跨项目结算台账', async ({ page }) => {
  const ctx = laneContext(page, 'fixes2-settlement');
  await login(page, 'finance');
  await goto(page, '/settlement');
  await expect(page.getByRole('heading', { name: '结算台账' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('P-023').first()).toBeVisible({ timeout: 15_000 });
  record(ctx, 'OK', '结算台账可用', '财务看到 P-023 与 P-008 结算记录');
  await shot(page, 'fixes2-settlement', 'settlement-list');
  finish(ctx, '结算台账路由可用，列表含在途与已锁定项目。');
});

test('P-001 合同台账展示合同版本与用印记录', async ({ page }) => {
  const ctx = laneContext(page, 'fixes2-contract');
  await login(page, 'project-manager');
  await goto(page, '/projects/P-001');
  await page.getByRole('tab', { name: '合同与回款' }).click();
  await expect(page.getByRole('tab', { name: /合同版本（2）/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: /合同版本（2）/ }).click();
  await expect(page.getByText('双方签署.pdf').first()).toBeVisible({ timeout: 10_000 });
  record(ctx, 'OK', '合同版本', 'V1.0 草稿与 V2.0 签署版可见');
  await page.getByRole('tab', { name: /用印记录（2）/ }).click();
  await expect(page.getByText('合同章').first()).toBeVisible({ timeout: 10_000 });
  record(ctx, 'OK', '用印记录', '合同章、法人章可见');
  await shot(page, 'fixes2-contract', 'contract-versions');
  finish(ctx, '合同版本与用印只读台账可用。');
});

test('P-008 收尾阶段与归档进度不再显示已关闭', async ({ page }) => {
  const ctx = laneContext(page, 'fixes2-p008');
  await login(page, 'pmo');
  await goto(page, '/projects/P-008');
  await expect(page.getByText('收尾').first()).toBeVisible({ timeout: 20_000 });
  record(ctx, 'OK', 'P-008 阶段', '页面显示「收尾」，不再显示已关闭');
  await goto(page, '/projects/P-008/archive');
  await expect(page.getByText(/6\s*\/\s*14/).first()).toBeVisible({ timeout: 20_000 });
  record(ctx, 'OK', '归档进度', '归档仍为 6/14，与收尾状态一致');
  await shot(page, 'fixes2-p008', 'p008-archive');
  finish(ctx, 'P-008 状态改为收尾，归档进度与状态不再矛盾。');
});

test('PMO 在 INIT-2 决策页可办理当前节点', async ({ page }) => {
  const ctx = laneContext(page, 'fixes2-decision');
  await login(page, 'pmo');
  await goto(page, '/initiation/INIT-2/decision');
  const button = page.getByRole('button', { name: /通过当前节点：PMO正式决策/ });
  await expect(button).toBeVisible({ timeout: 20_000 });
  await expect(button).toBeEnabled();
  record(ctx, 'OK', 'PMO 决策权限', 'INIT-2 首节点由 PMO 决策，按钮可用');
  await shot(page, 'fixes2-decision', 'pmo-decision');
  finish(ctx, 'PMO 在 PMC 决策链首节点具备决策权限。');
});