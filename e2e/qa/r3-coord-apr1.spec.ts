import { test, expect } from '@playwright/test';
import { login, laneContext, goto, shot, record, finish, switchRole } from './_helpers';

test('C6 APR-1 三角色完整链路（切身份后重新进入原单）', async ({ page }) => {
  test.setTimeout(280_000);
  const ctx = laneContext(page, 'coord-apr1');
  const body = () => page.locator('main').innerText().then((t) => t.replace(/\s+/g, ' '));

  await login(page, 'finance');
  await goto(page, '/workbench/todos');
  const row = page.getByRole('row', { name: /APR-1/ }).first();
  record(ctx, 'RISK', '财务待办首行', (await row.innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await row.getByText('进入原业务', { exact: true }).click();
  await expect(page.locator('main')).toContainText('审批详情', { timeout: 15000 });
  await page.getByLabel('审批意见').fill('C6 财务复核通过');
  await page.getByRole('button', { name: '通过，待基线确认' }).click();
  await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
  await page.waitForTimeout(800);
  record(ctx, 'RISK', '财务通过后节点', (await body()).match(/当前节点[^|]{0,80}/)?.[0] ?? '未找到节点');
  await shot(page, 'coord-apr1', '1-finance-approved');

  await switchRole(page, 'pmo');
  record(ctx, 'RISK', '切换 PMO 后落地 URL', page.url());
  await goto(page, '/approvals/APR-1');
  await page.waitForTimeout(800);
  const pmoText = await body();
  const pmoPermitted = await page.getByRole('button', { name: '通过，待基线确认' }).isEnabled().catch(() => false);
  record(ctx, 'RISK', 'PMO 打开 APR-1', `url=${page.url()} permitted=${pmoPermitted} node=${pmoText.match(/当前节点[^|]{0,80}/)?.[0] ?? '-'} 只读提示=${pmoText.includes('当前角色只读')}`);
  await shot(page, 'coord-apr1', '2-pmo-open');
  if (pmoPermitted) {
    await page.getByLabel('审批意见').fill('C6 PMO 评审通过');
    await page.getByRole('button', { name: '通过，待基线确认' }).click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(800);
    record(ctx, 'RISK', 'PMO 通过后节点', (await body()).match(/当前节点[^|]{0,80}/)?.[0] ?? '未找到节点');
  }

  await switchRole(page, '集团领导');
  await goto(page, '/approvals/APR-1');
  await page.waitForTimeout(800);
  const execText = await body();
  const execPermitted = await page.getByRole('button', { name: '通过，待基线确认' }).isEnabled().catch(() => false);
  record(ctx, 'RISK', 'executive 打开 APR-1', `url=${page.url()} permitted=${execPermitted} node=${execText.match(/当前节点[^|]{0,80}/)?.[0] ?? '-'} 只读提示=${execText.includes('当前角色只读')}`);
  await shot(page, 'coord-apr1', '3-exec-open');
  if (execPermitted) {
    await page.getByLabel('审批意见').fill('C6 集团领导同意');
    await page.getByRole('button', { name: '通过，待基线确认' }).click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(1000);
    record(ctx, 'RISK', '领导通过后页面', (await body()).match(/审批状态[^|]{0,60}/)?.[0] ?? (await body()).slice(0, 220));
  }

  await switchRole(page, 'pmo');
  await goto(page, '/projects/P-001/baseline');
  await page.waitForTimeout(800);
  const baseText = await body();
  record(ctx, 'RISK', 'PMO 基线页', `待确认提示=${baseText.includes('等待PMO确认完整基线')} 确认按钮=${await page.getByRole('button', { name: '确认基线' }).count()} url=${page.url()}`);
  await shot(page, 'coord-apr1', '4-pmo-baseline');
  const confirm = page.getByRole('button', { name: '确认基线' }).first();
  if (await confirm.count()) {
    await confirm.click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(1200);
    record(ctx, 'RISK', '基线确认后', (await body()).match(/V\.\d[^|]{0,120}/)?.[0] ?? (await body()).slice(0, 220));
  }
  await goto(page, '/projects/P-001/budget');
  await page.waitForTimeout(800);
  const budgetText = await body();
  record(ctx, 'RISK', '预算页基线', `V1.2=${budgetText.includes('V1.2')} 3340.48=${budgetText.includes('3,340.48') || budgetText.includes('3340.48')} 生效基线=${budgetText.match(/生效基线[^|]{0,40}/)?.[0] ?? '-'}`);
  await shot(page, 'coord-apr1', '5-budget-after');
  finish(ctx, 'APR-1 三角色链路复核：财务通过 → 切 PMO 回原单 → 领导通过 → PMO 基线确认 → 预算 V1.2。');
});
