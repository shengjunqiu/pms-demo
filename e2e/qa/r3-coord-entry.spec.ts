import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C10 商机决策入口 + 财务结算待办', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'coord-entry');
  await login(page, 'market');
  await goto(page, '/opportunities/OPP-068');
  const btns = await page.locator('main button, main a.ant-btn').evaluateAll((els) => els.map((e) => ({ text: (e.textContent ?? '').replace(/\s+/g, ' ').trim(), dis: (e as HTMLButtonElement).disabled ?? false, href: (e as HTMLAnchorElement).getAttribute('href') })).filter((b) => b.text));
  record(ctx, 'RISK', 'OPP-068 按钮', JSON.stringify(btns));
  const decision = page.getByRole('button', { name: /发起决策|立项决策|提交决策/ }).first();
  if (await decision.count()) {
    const before = page.url();
    await decision.click();
    await page.waitForTimeout(800);
    const modal = await page.locator('.ant-modal, .ant-message-notice-content').allInnerTexts();
    record(ctx, 'RISK', '点击决策入口', `before=${before} after=${page.url()} modal/msg=${modal.join(' | ').replace(/\s+/g, ' ').slice(0, 300)}`);
  } else {
    record(ctx, 'RISK', '点击决策入口', '未找到决策按钮');
  }

  await login(page, 'finance');
  await goto(page, '/workbench/todos');
  const rows = await page.locator('main .ant-table-tbody tr.ant-table-row').allInnerTexts();
  const settlementRows = rows.filter((r) => /结算|SREQ|SET-/.test(r)).map((r) => r.replace(/\s+/g, ' '));
  record(ctx, 'RISK', '财务待办结算行', `总行=${rows.length} 匹配=${settlementRows.length} :: ${settlementRows.join(' || ').slice(0, 600)}`);
  await goto(page, '/projects/P-023/settlement');
  const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const btns2 = await page.locator('main button').allInnerTexts();
  record(ctx, 'RISK', 'P-023 结算页', `SREQ=${body.match(/SREQ-\d+/g)?.join(',') ?? '无'} SET=${body.match(/SET-\d{4}/g)?.join(',') ?? '无'} 按钮=${btns2.join(',')} 关键=${body.match(/.{0,20}(财务核算|核算中|锁定).{0,40}/g)?.join(' | ').slice(0, 500)}`);
  finish(ctx, '商机决策入口与结算待办入口核查。');
});
