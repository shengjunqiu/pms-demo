import { expect, type Page } from '@playwright/test';
export async function role(page: Page, name: string) {
  await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();
  await page.locator('.ant-select-item-option').filter({ hasText: name }).click();
  const home = name === '客户经理' || name === '方案架构师' ? '/opportunities' : name === '项目经理' ? '/workbench/project-manager' : name === '财务专员' ? '/executive/four-calculations' : '/executive/dashboard';
  await expect(page).toHaveURL(home);
  await page.getByRole('heading').first().click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}
// Use application history navigation so a chain retains the same in-memory session.
export async function navigate(page: Page, path: string) {
  await page.evaluate((url) => { window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
  await expect(page).toHaveURL(path);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
