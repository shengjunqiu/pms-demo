import { expect, test } from '@playwright/test';
import { goto, login, switchRole } from './_helpers';

test('P0 立项申请表单可填写并触发提交校验', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'market');
  await goto(page, '/initiation/apply?opportunityId=OPP-068');
  await expect(page.getByLabel('立项必要性')).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('立项必要性').fill('客户要求年内完成数据中台升级，支撑跨部门数据共享。');
  await page.getByLabel('立项建议').fill('建议采用分期交付，先完成数据治理再上线分析应用。');
  await page.getByLabel('项目范围 / 建设内容').fill('数据治理、指标体系、分析应用及运维交接。');
  await page.getByLabel('客户核心诉求').fill('年底前上线核心报表，并通过等保测评。');
  await page.getByLabel('立项附件').setInputFiles({ name: '立项申请说明.pdf', mimeType: 'application/pdf', buffer: Buffer.from('demo') });
  await page.getByRole('button', { name: '提交立项申请' }).click();
  await expect(page.getByText('本商机已有立项申请')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.ant-form-item')).toHaveCount(10);
});

test('P1 结算在途进入财务待办并可打开项目结算页', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'finance');
  await goto(page, '/workbench/todos');
  await page.getByLabel('待办搜索').fill('SREQ-2');
  const row = page.locator('tr').filter({ hasText: 'SREQ-2' }).first();
  await expect(row).toContainText('结算核算', { timeout: 20_000 });
  await row.getByText('进入原业务', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/P-023\/settlement/, { timeout: 20_000 });
  await expect(page.getByText(/财务核算确认|结算申请/).first()).toBeVisible({ timeout: 20_000 });
});

test('P1 审批详情切角色保留原单', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'finance');
  await goto(page, '/approvals/APR-1');
  await expect(page.getByText(/审批详情|审批记录/).first()).toBeVisible({ timeout: 20_000 });
  await switchRole(page, /PMO负责人/);
  await expect(page).toHaveURL(/\/approvals\/APR-1/, { timeout: 20_000 });
  await expect(page.getByText(/审批详情|审批记录/).first()).toBeVisible({ timeout: 20_000 });
});

test('P2 财务配置深链落到对应 Tab', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'finance');
  await goto(page, '/settings/cost-baseline');
  await expect(page.locator('.ant-tabs-tab-active')).toContainText('成本基准配置', { timeout: 20_000 });
  await login(page, 'pmo');
  await goto(page, '/settings/alerts');
  await expect(page.locator('.ant-tabs-tab-active')).toContainText('预警规则配置', { timeout: 20_000 });
});

test('P1 已有立项单进入原单，不再重复发起', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'market');
  await goto(page, '/opportunities/OPP-068');
  const entry = page.getByRole('button', { name: '进入立项单' });
  await expect(entry).toBeVisible({ timeout: 20_000 });
  await entry.click();
  await expect(page).toHaveURL(/\/initiation\/apply\?id=INIT-2/, { timeout: 20_000 });
});

test('P2 变更草稿保存提示正确', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'project-manager');
  await goto(page, '/projects/P-001/changes/new');
  await page.getByLabel('变更标题').fill('新增数据迁移子项');
  await page.getByLabel('原因与内容').fill('客户新增历史数据迁移范围，需补充实施与验证工作。');
  await page.getByLabel('客户依据 / 签证').fill('客户变更签证单 CR-001');
  await page.getByLabel('合同依据').fill('合同补充条款第 3 条');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByText('变更草稿已保存')).toBeVisible({ timeout: 20_000 });
});

