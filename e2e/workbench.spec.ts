import { test, expect } from '@playwright/test';

for (const width of [1440, 1280]) {
  test(`工作台聚合与原业务下钻 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/workbench/project-manager');
    await expect(page.getByRole('heading', { name: '项目经理工作台' })).toBeVisible();
    // A concrete shared fixture must exist, and detail navigation must retain that project.
    const firstProject = page.locator('.ant-table-tbody tr').filter({ has: page.getByRole('button', { name: /^PRJ-/ }) }).first();
    await expect(firstProject).toBeVisible();
    await page.screenshot({ path: `test-results/workbench-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: '采购申请', exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/P-\d+\/procurement/);
    await expect(page.getByText('待开发', { exact: true })).toHaveCount(0);
    await page.goto('/workbench/project-manager');
    await page.getByRole('button', { name: '全部待办', exact: true }).click();
    await expect(page).toHaveURL('/workbench/todos');
    await expect(page.getByRole('heading', { name: '我的待办中心' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
