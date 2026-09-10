import { expect, type Page } from '@playwright/test';
export async function role(page: Page, name: string) {
  await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();
  await page.locator('.ant-select-item-option').filter({ hasText: name }).click();
}
// Use the application's history navigation so an end-to-end chain retains the same in-memory session.
export async function navigate(page: Page, path: string) {
  await page.evaluate((url) => { window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
  await expect(page).toHaveURL(path);
}
