import { test } from '@playwright/test';
import { login, laneContext, goto, shot, record, finish } from './_helpers';

test('C4 预算/核算/报验数值抽查', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-numbers');
  await login(page, 'finance');
  await goto(page, '/projects/P-001/budget');
  const budgetText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  record(ctx, 'RISK', 'P-001 预算页首屏', budgetText.slice(0, 900));
  await shot(page, 'coord-numbers', 'budget');
  await goto(page, '/projects/P-001/dynamic-accounting');
  const dyn = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  record(ctx, 'RISK', 'P-001 动态核算首屏', dyn.slice(0, 900));
  await shot(page, 'coord-numbers', 'dynamic');
  await goto(page, '/projects/P-001/report-acceptance');
  record(ctx, 'RISK', '财务视角报验入口', `新建报验按钮=${await page.getByRole('button', { name: /新建报验/ }).count()}；正文=${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  await login(page, 'project-manager');
  await goto(page, '/approvals/APR-1');
  const apr = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  record(ctx, 'RISK', 'APR-1 金额展示', apr.slice(0, 700));
  await shot(page, 'coord-numbers', 'apr1');
  finish(ctx, '协调者复核预算/核算/报验数值与入口。');
});
