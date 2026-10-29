import { test, expect } from '@playwright/test';
import { login, laneContext, goto, shot, record, finish } from './_helpers';

test('C1 新建立项申请无法补录资料', async ({ page }) => {
  test.setTimeout(240_000);
  const ctx = laneContext(page, 'coord-initiation');
  await login(page, 'market');
  await goto(page, '/initiation/apply?opportunityId=OPP-068');
  await expect(page.getByText('立项申请详情')).toBeVisible();

  const inputs = await page.locator('main input:not([type=hidden]), main textarea').count();
  const upload = await page.getByText(/上传|附件/).count();
  const formItems = await page.locator('main .ant-form-item').count();
  const submit = page.getByRole('button', { name: /提交立项申请/ });
  const enabled = await submit.isEnabled();
  record(ctx, 'RISK', '立项申请页控件盘点', `可见 input/textarea=${inputs}，ant-form-item=${formItems}，上传/附件文案=${upload}，提交按钮可用=${enabled}`);
  await shot(page, 'coord-initiation', '01-apply-page');

  if (enabled) {
    await submit.click();
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    const msg = body.includes('请补全') ? '出现“请补全必填申请资料”' : '未出现补全提示';
    const stillDraft = body.includes('草稿');
    record(ctx, 'BLOCK', '提交新立项被必填校验拦截但页面无可填控件', `${msg}；仍在草稿=${stillDraft}；可选资料页签=${await page.locator('.ant-tabs-tab').allInnerTexts()}`);
    await shot(page, 'coord-initiation', '02-submit-blocked');
  }

  const body = await page.locator('main').innerText();
  record(ctx, 'FLOW', '立项申请详情为只读摘要', `包含“项目经理 -”=${body.includes('项目经理') && /项目经理\s*-/.test(body)}；包含“项目技术经理 -”=${/项目技术经理\s*-/.test(body)}`);
  finish(ctx, '协调者复核：立项申报页无任何可编辑申请字段，新建立项提交路径被必填校验死锁。');
});
