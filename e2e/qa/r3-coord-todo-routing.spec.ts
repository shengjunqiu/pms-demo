import { test, expect } from '@playwright/test';
import { login, laneContext, goto, shot, record, finish } from './_helpers';

test('C2 待办“原业务”路由抽查（PMO/财务）', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-todo-routing');
  for (const role of ['pmo', 'finance', 'executive'] as const) {
    await login(page, role);
    await goto(page, '/workbench/todos');
    const rows = page.locator('main .ant-table-tbody tr.ant-table-row');
    const count = await rows.count();
    const links = await page.locator('main a').evaluateAll((as) => as.map((a) => ({ text: (a.textContent || '').trim().slice(0, 24), href: a.getAttribute('href') || '' })).filter((x) => x.text));
    record(ctx, 'RISK', `${role} 待办页链接清单`, `行数=${count}；链接=${links.slice(0, 12).map((l) => `${l.text}->${l.href}`).join(' ; ') || '（无 a 链接）'}`);
    if (count > 0) {
      const first = rows.first();
      const text = (await first.innerText()).replace(/\s+/g, ' ').slice(0, 160);
      const ori = first.getByRole('button', { name: /原业务|去处理|办理/ });
      if (await ori.count()) {
        await ori.first().click();
        await page.waitForTimeout(1200);
        record(ctx, 'RISK', `${role} 首行待办原业务跳转`, `行=${text}；URL=${new URL(page.url()).pathname}; 页面含“审批详情”=${(await page.locator('main').innerText()).includes('审批详情')}`);
        await page.goBack();
        await expect(page.locator('main')).toBeVisible();
      } else {
        record(ctx, 'RISK', `${role} 首行待办无原业务按钮`, `行=${text}`);
      }
    }
    await shot(page, 'coord-todo-routing', `todos-${role}`);
  }
  finish(ctx, '协调者抽查待办原业务路由与链接形态。');
});
