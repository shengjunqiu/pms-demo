import { expect, test, type Page } from '@playwright/test';

/**
 * 冒烟：每个模拟角色按自己侧边栏能看到的入口逐页打开，断言渲染成功且没有运行时错误。
 * 覆盖角色专属导航、页面懒加载与权限包装，不重复断言具体业务数字（那属于 domain 测试）。
 */
const ROLES = ['executive', 'pmo', 'project-manager', 'finance', 'solution-tech', 'system-admin'] as const;
const START = '/workbench/todos';
const ERROR_TEXT = ['页面未找到', '页面出错了', 'Something went wrong', '无权访问'];

async function login(page: Page, role: string) {
  await page.addInitScript((value) => {
    localStorage.setItem('pms-app-session', JSON.stringify({ state: { currentRole: value, selectedProjectId: 'P-001' }, version: 0 }));
  }, role);
}

/** 首次访问时 Vite 需要预构建依赖，冷启动可能短暂空白；空壳时重载一次再判定失败。 */
async function open(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(url);
    try {
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

async function assertClean(page: Page) {
  await expect(page.locator('main')).not.toHaveText('');
  for (const text of ERROR_TEXT) await expect(page.locator('body')).not.toContainText(text);
}

for (const role of ROLES) {
  test(`${role} 侧边栏每个入口都能打开`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await login(page, role);
    await open(page, START);
    await assertClean(page);

    const visited = new Set([page.url()]);
    const total = await page.getByRole('menuitem').count();
    expect(total, `${role} 侧边栏入口数量`).toBeGreaterThan(3);
    for (let index = 0; index < total; index += 1) {
      const item = page.getByRole('menuitem').nth(index);
      if (!(await item.count())) break;
      await item.click();
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
      const url = page.url();
      if (visited.has(url)) continue;
      visited.add(url);
      await assertClean(page);
    }
    expect(visited.size, `${role} 访问过的页面数`).toBeGreaterThan(3);
    expect(errors, `${role} 运行时异常`).toEqual([]);
  });
}

test('项目经理待办标注办理身份，外部发起事项可最终确认', async ({ page }) => {
  await login(page, 'project-manager');
  await open(page, START);
  await assertClean(page);
  await expect(page.getByRole('columnheader', { name: '办理身份' })).toBeVisible();
  await page.getByLabel('待办搜索').fill('REQ-0001');
  const row = page.getByRole('row').filter({ hasText: 'REQ-0001' });
  await expect(row).toContainText('最终确认');
  await row.getByRole('button', { name: '进入原业务' }).click();
  await expect(page.getByRole('button', { name: '最终确认关闭' })).toBeEnabled();
});
