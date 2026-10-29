import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C3 深链与状态页抽查', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-deeplink');
  await login(page, 'admin');
  for (const url of ['/settings/cost-mapping', '/settings/cost-baseline', '/settings/alerts', '/settings/finance-config']) {
    await goto(page, url);
    const active = await page.locator('.ant-tabs-tab-active').allInnerTexts();
    const headings = await page.locator('main h1, main h2, main h3, main .ant-page-header-heading-title').allInnerTexts();
    const body = await page.locator('main').innerText();
    record(ctx, 'BUG', `深链 ${url} Tab 落点`, `URL=${new URL(page.url()).pathname}；activeTab=${active.join('|') || '无'}；标题=${headings.slice(0, 3).join('|')}；出现“项目台账”=${body.includes('项目台账')}`);
  }
  await login(page, 'pmo');
  await goto(page, '/executive/dashboard');
  record(ctx, 'RISK', 'PMO 直链经营驾驶舱', `URL=${new URL(page.url()).pathname}；正文含“经营驾驶舱”=${(await page.locator('main').innerText()).includes('经营驾驶舱')}`);
  await goto(page, '/workbench/todos');
  record(ctx, 'FLOW', 'PMO 待办页草稿入口', `存在“进入草稿箱”=${await page.getByRole('button', { name: /草稿箱/ }).count() > 0}`);
  await login(page, 'project-manager');
  await goto(page, '/projects/P-001');
  record(ctx, 'FLOW', 'S 型项目详情页签', `页签=${(await page.locator('.ant-tabs-tab').allInnerTexts()).join(',')}`);
  record(ctx, 'FLOW', 'P-001 下一步按钮', `“下一步：阶段切换申请”存在=${await page.getByText(/下一步：阶段切换申请/).count() > 0}`);
  finish(ctx, '协调者深链/状态页抽查。');
});
