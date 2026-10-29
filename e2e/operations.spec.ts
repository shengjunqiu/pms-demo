import { expect, test, type Page } from '@playwright/test';

/**
 * 运维域权限与提示覆盖：
 * 1) OPS-007 属于 P-007（PM 郑经理 / 运维支持中心），当前「项目经理」角色是张建国，不在该周期团队 ——
 *    403 是数据范围的结果，不是缺陷；
 * 2) PMO 是运维动作的兜底角色（`canAccessAction` 放行 pmo），必须真的能办；
 * 3) 其余角色看得到页面但按钮置灰时，必须就近给出原因，不能只给灰按钮。
 */
const OPS_URL = '/operations/OPS-007';

async function login(page: Page, role: string) {
  await page.addInitScript(
    (value) => {
      localStorage.setItem(
        'pms-app-session',
        JSON.stringify({ state: { currentRole: value.role, selectedProjectId: 'P-001' }, version: 0 }),
      );
    },
    { role },
  );
}

test('非本周期团队成员的项目经理无法进入运维详情（数据范围，非权限缺陷）', async ({ page }) => {
  await login(page, 'project-manager');
  await page.goto(OPS_URL);
  await expect(page.locator('main')).toContainText('无访问权限', { timeout: 15_000 });
  await expect(page.locator('main')).not.toContainText('运维服务管理');
});

test('PMO 可进入运维详情并办理运维记录', async ({ page }) => {
  await login(page, 'pmo');
  await page.goto(OPS_URL);
  await expect(page.locator('main')).toContainText('运维服务管理', { timeout: 15_000 });
  const record = page.getByRole('button', { name: '登记运维记录' });
  await expect(record).toBeEnabled();
  await record.click();
  await expect(page.locator('.ant-modal')).toBeVisible();
});

test('财务可查看运维详情，但运维动作置灰且就近给出原因', async ({ page }) => {
  await login(page, 'finance');
  await page.goto(OPS_URL);
  await expect(page.locator('main')).toContainText('运维服务管理', { timeout: 15_000 });

  const record = page.getByRole('button', { name: '登记运维记录' });
  await expect(record).toBeDisabled();
  await record.hover();
  await expect(page.getByRole('tooltip')).toContainText(/运维团队或 PMO|权限策略/);

  // 周期级动作同理：财务既不是项目经理也不是 PMO。
  await page.getByRole('tab', { name: '续期 / 终止 / 退出' }).click();
  const renew = page.getByRole('button', { name: '办理续期 · 新建周期' });
  await expect(renew).toBeDisabled();
  await renew.hover();
  await expect(page.getByRole('tooltip')).toContainText(/项目经理或 PMO|权限策略/);
});
