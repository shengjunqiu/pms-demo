import { test } from '@playwright/test';
import { login, laneContext, goto, record, finish, switchRole } from './_helpers';

async function spa(page: import('@playwright/test').Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(900);
}

test('C7 APR-1 同页状态跨角色链', async ({ page }) => {
  test.setTimeout(300_000);
  const ctx = laneContext(page, 'coord-apr1b');
  const body = () => page.locator('main').innerText().then((t) => t.replace(/\s+/g, ' '));
  const node = (t: string) => t.match(/当前节点\s*([0-9]\/[0-9]\s*·\s*[^ ]+)/)?.[1] ?? t.match(/当前节点[^|]{0,40}/)?.[0] ?? '-';

  await login(page, 'finance');
  await goto(page, '/approvals/APR-1');
  let t = await body();
  record(ctx, 'RISK', '种子-财务打开', `role=${await page.locator('.ant-select-selection-item').first().innerText()} node=${node(t)} 可编辑=${await page.getByLabel('审批意见').isEnabled()}`);
  await page.getByLabel('审批意见').fill('C7 财务复核');
  await page.getByRole('button', { name: '通过，待基线确认' }).click();
  await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
  await page.waitForTimeout(700);
  record(ctx, 'RISK', '财务通过后', node(await body()));

  await switchRole(page, 'pmo');
  await spa(page, '/approvals/APR-1');
  t = await body();
  record(ctx, 'RISK', 'PMO 同页打开', `node=${node(t)} 可编辑=${await page.getByLabel('审批意见').isEnabled()} 只读=${t.includes('当前角色只读')}`);
  if (await page.getByLabel('审批意见').isEnabled()) {
    await page.getByLabel('审批意见').fill('C7 PMO 评审');
    await page.getByRole('button', { name: '通过，待基线确认' }).click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(700);
    record(ctx, 'RISK', 'PMO 通过后', node(await body()));
  }

  await switchRole(page, '集团领导');
  await spa(page, '/approvals/APR-1');
  t = await body();
  record(ctx, 'RISK', '领导同页打开', `node=${node(t)} 可编辑=${await page.getByLabel('审批意见').isEnabled()} 只读=${t.includes('当前角色只读')}`);
  if (await page.getByLabel('审批意见').isEnabled()) {
    await page.getByLabel('审批意见').fill('C7 集团领导同意');
    await page.getByRole('button', { name: '通过，待基线确认' }).click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(900);
    t = await body();
    record(ctx, 'RISK', '领导通过后', `status=${t.match(/审批状态\s*([^ ]+)/)?.[1] ?? '-'} 基线确认卡=${t.includes('PMO基线确认')} 基线确认按钮=${await page.getByRole('button', { name: '确认基线生效' }).count()}`);
  }

  await switchRole(page, 'pmo');
  await spa(page, '/approvals/APR-1');
  t = await body();
  record(ctx, 'RISK', 'PMO 回原单确认基线', `status=${t.match(/审批状态\s*([^ ]+)/)?.[1] ?? '-'} 按钮=${await page.getByRole('button', { name: '确认基线生效' }).count()} 已确认=${t.includes('基线已于')}`);
  const confirm = page.getByRole('button', { name: '确认基线生效' });
  if (await confirm.count()) {
    await confirm.click();
    await page.getByRole('button', { name: '确 定' }).or(page.getByRole('button', { name: '确定' })).first().click();
    await page.waitForTimeout(900);
    record(ctx, 'RISK', '确认后提示', (await body()).match(/基线已于[^。]{0,80}/)?.[0] ?? '未出现已确认提示');
  }
  await spa(page, '/projects/P-001/baseline');
  t = await body();
  record(ctx, 'RISK', '基线页确认后', t.slice(0, 500));
  await spa(page, '/projects/P-001/budget');
  t = await body();
  record(ctx, 'RISK', '预算页', `V2.0=${t.includes('V2.0')} V1.2=${t.includes('V1.2')} 3340.48=${t.includes('3,340.48')} 生效基线=${t.match(/生效基线[^。]{0,50}/)?.[0] ?? '-'}`);
  finish(ctx, '同一页面内（不刷新）完成 APR-1 财务→PMO→集团领导→PMO 基线确认，并核对预算 V1.2。');
});
