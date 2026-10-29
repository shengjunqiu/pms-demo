import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C9 市场发起立项重复与死锁', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, 'coord-apply');
  await login(page, 'market');
  await goto(page, '/opportunities/OPP-068');
  const actions = await page.locator('main button').allInnerTexts();
  record(ctx, 'RISK', 'OPP-068 操作按钮', actions.map((x) => x.replace(/\s+/g, '')).filter(Boolean).join(' | '));
  const btn = page.getByRole('button', { name: '发起立项' });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1200);
    record(ctx, 'RISK', '点击后 URL', page.url());
    const inputs = await page.locator('main input, main textarea, main .ant-select, main .ant-picker').count();
    record(ctx, 'RISK', '申请页控件', `inputs/selects=${inputs} 表单块=${await page.locator('main .ant-form-item').count()} 文本=${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260)}`);
    const submit = page.getByRole('button', { name: /提交立项申请/ });
    if (await submit.count()) {
      await submit.click();
      await page.waitForTimeout(800);
      record(ctx, 'RISK', '提交结果', (await page.locator('body').innerText()).replace(/\s+/g, ' ').match(/请[^。]{0,40}|提交成功[^。]{0,30}/)?.[0] ?? '无提示');
    }
    await goto(page, '/initiation/review');
    const list = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    record(ctx, 'RISK', '立项列表新增', list.match(/INIT-\d+[^|]{0,40}/g)?.slice(-4).join(' / ') ?? '-');
  } else record(ctx, 'BUG', 'OPP-068 无发起立项按钮', '按钮缺失');
  finish(ctx, '复核市场发起立项是否重复建单并卡在无字段申请页。');
});
