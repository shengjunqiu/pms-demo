import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C5 甘特比例与概算对比表', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-visual');
  await login(page, 'project-manager');
  await goto(page, '/projects/P-001/progress');
  const rows = page.locator('main .ant-table-tbody tr.ant-table-row');
  const n = Math.min(8, await rows.count());
  for (let i = 0; i < n; i += 1) {
    const row = rows.nth(i);
    const cells = row.locator('td');
    const task = (await cells.nth(0).innerText()).replace(/\s+/g, ' ');
    const dates = (await cells.nth(1).innerText()).replace(/\s+/g, ' ');
    const boxes = await cells.nth(2).evaluate((td) => {
      const track = td.querySelector('div div') as HTMLElement | null;
      const bar = track?.parentElement as HTMLElement | null;
      const inner = track as HTMLElement | null;
      const outer = td.querySelector('div') as HTMLElement;
      return { outerW: outer?.clientWidth ?? 0, barLeft: bar?.offsetLeft ?? 0, barW: bar?.clientWidth ?? 0, innerW: inner?.clientWidth ?? 0, innerBg: inner ? getComputedStyle(inner).backgroundColor : '', barBg: bar ? getComputedStyle(bar).backgroundColor : '' };
    });
    record(ctx, 'RISK', `甘特 ${i + 1}`, `${task} | ${dates} | ${JSON.stringify(boxes)}`);
  }
  await goto(page, '/projects/P-001/budget');
  await page.getByRole('tab', { name: '预算汇总与对比' }).click();
  await page.waitForTimeout(800);
  const table = (await page.locator('.ant-tabs-tabpane-active').innerText()).replace(/\s+/g, ' ');
  record(ctx, 'RISK', '预算汇总与对比表', table.slice(0, 800));
  finish(ctx, '协调者核查甘特宽度与概算对比表数值。');
});
