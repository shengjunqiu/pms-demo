import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C5b 甘特 DOM', async ({ page }) => {
  test.setTimeout(120_000);
  const ctx = laneContext(page, 'coord-gantt');
  await login(page, 'project-manager');
  await goto(page, '/projects/P-001/progress');
  const row = page.locator('main .ant-table-tbody tr.ant-table-row').first();
  const info = await row.locator('td').nth(2).evaluate((td) => {
    const all = Array.from(td.querySelectorAll('div')).map((el) => {
      const r = el.getBoundingClientRect();
      return { style: el.getAttribute('style'), w: Math.round(r.width), left: Math.round(r.left), bg: getComputedStyle(el).backgroundColor };
    });
    return all;
  });
  record(ctx, 'RISK', '甘特首行 DOM', JSON.stringify(info));
  finish(ctx, '甘特 DOM 检查');
});
