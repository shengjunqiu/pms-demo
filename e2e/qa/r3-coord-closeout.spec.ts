import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish } from './_helpers';

test('C10 终验/后评价/归档动作', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-closeout');
  await login(page, 'project-manager');
  await goto(page, '/projects/P-006/customer-acceptance');
  record(ctx, 'RISK', 'P-006 终验按钮', (await page.locator('main button').allInnerTexts()).map((x) => x.trim()).filter(Boolean).join(' | '));
  const detail = page.getByRole('button', { name: '详情与办理' }).or(page.getByText('详情与办理')).first();
  if (await detail.count()) {
    await detail.click();
    await page.waitForTimeout(700);
    record(ctx, 'RISK', 'P-006 办理抽屉', (await page.locator('.ant-drawer').innerText()).replace(/\s+/g, ' ').slice(0, 700));
  } else record(ctx, 'RISK', 'P-006 无详情与办理', '页面不存在该入口');

  await login(page, 'pmo');
  await goto(page, '/projects/P-008/post-evaluation');
  const start = page.getByRole('button', { name: /PMO发起后评价/ });
  record(ctx, 'RISK', 'P-008 后评价按钮', `count=${await start.count()} disabled=${await start.first().isDisabled().catch(() => '-')}`);
  if (await start.count()) {
    await start.first().click();
    await page.waitForTimeout(700);
    const modal = page.locator('.ant-modal').last();
    record(ctx, 'RISK', 'P-008 发起弹窗', (await modal.innerText()).replace(/\s+/g, ' ').slice(0, 700));
    const ok = modal.getByRole('button', { name: /确 定|确定|发起/ }).last();
    record(ctx, 'RISK', 'P-008 发起可用', `disabled=${await ok.isDisabled().catch(() => '-')}`);
  }
  await goto(page, '/projects/P-008/archive');
  const add = page.getByRole('button', { name: /补充正式文件/ });
  record(ctx, 'RISK', 'P-008 归档补充', `count=${await add.count()} disabled=${await add.first().isDisabled().catch(() => '-')}`);
  if (await add.count()) {
    await add.first().click();
    await page.waitForTimeout(700);
    record(ctx, 'RISK', 'P-008 归档弹窗', (await page.locator('.ant-modal').last().innerText()).replace(/\s+/g, ' ').slice(0, 500));
  }
  finish(ctx, '终验/后评价/归档 动作入口复核。');
});
