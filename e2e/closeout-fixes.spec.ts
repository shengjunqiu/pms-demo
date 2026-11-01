import { expect, test, type Page } from '@playwright/test';

/**
 * 收尾/运维页面级回归（对应 docs/端到端验证问题清单_2026-09-09.md 的 F-32 / F-34）：
 * 1) 运维移交接收人只能是可登录身份——不可登录的候选必须置灰，否则移交卡在「待接收」无人能确认；
 * 2) 退出/终止清单重开时必须回填已保存凭据——否则 PMO 确认退出要重敲一遍，易与原凭据不一致。
 * 业务语义由 src/models/__tests__/operations.test.ts 覆盖，这里只守页面入口。
 */
async function login(page: Page, role: string, projectId = 'P-007') {
  await page.addInitScript(
    (value) => {
      localStorage.setItem(
        'pms-app-session',
        JSON.stringify({ state: { currentRole: value.role, selectedProjectId: value.projectId }, version: 0 }),
      );
    },
    { role, projectId },
  );
}

async function open(page: Page, url: string, expectText: string) {
  await page.goto(url);
  await expect(page.locator('main')).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('main')).toContainText(expectText);
}

test('运维移交接收人下拉只允许可登录身份', async ({ page }) => {
  await login(page, 'pmo', 'P-008');
  await open(page, '/projects/P-008/operation-handover', '运维移交');
  await expect(page.locator('main')).toContainText('合同运维判定与移交清单', { timeout: 25_000 });

  const receiver = page
    .locator('.ant-form-item')
    .filter({ hasText: '运维团队接收负责人' })
    .locator('.ant-select-selector');
  await receiver.click();

  const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  await expect(options.first()).toBeVisible();
  // 可登录身份可选中；人员目录里的其它账号置灰，避免指定一个无法登录确认的接收人。
  await expect(options.filter({ hasText: '李主任' })).not.toHaveClass(/ant-select-item-option-disabled/);
  await expect(options.filter({ hasText: '钱工程师' })).toHaveClass(/ant-select-item-option-disabled/);
  await expect(options.filter({ hasText: '孙总' })).toHaveClass(/ant-select-item-option-disabled/);
});

test('退出清单保存后重开回填已填依据', async ({ page }) => {
  await login(page, 'pmo', 'P-007');
  await open(page, '/operations/OPS-007', '运维周期概况');

  await page.getByRole('tab', { name: /续期/ }).click();
  const openExit = page.getByRole('button', { name: '办理退出 / 提前终止' });
  await expect(openExit).toBeEnabled();
  await openExit.click();

  const values: Record<string, string> = {
    reason: 'CTR-006 服务期止于2026-12-31，客户不再续签，提前10个工作日书面通知',
    handoff: '移交单 YH-2026-0912，客户签收人王科长，含系统清单与联系人',
    accountsRevoked: '运维账号4个已停用，权限回收单 QQ-2026-0912 由安全组归档',
    archive: '运维文档目录 AR-2026-0912 共12份，已入项目档案库',
  };
  const modal = page.locator('.ant-modal:visible').last();
  for (const [id, value] of Object.entries(values)) await modal.locator(`#${id}`).fill(value);
  const confirm = modal.locator('#confirm');
  if (await confirm.count()) {
    await modal.locator('.ant-select:has(#confirm) .ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  }
  await modal.getByRole('button', { name: /确\s*定/ }).click();

  await expect(page.locator('main')).toContainText('退出中');
  await openExit.click();
  for (const [id, value] of Object.entries(values)) await expect(modal.locator(`#${id}`)).toHaveValue(value);
});
