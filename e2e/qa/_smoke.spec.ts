import { test, expect } from '@playwright/test';
import { login, laneContext, goto, shot, visibleProblems, finish } from './_helpers';

test('smoke: helper login + workbench', async ({ page }) => {
  test.setTimeout(120_000);
  const ctx = laneContext(page, '_smoke');
  await login(page, 'project-manager', 'P-001');
  await goto(page, '/workbench/todos');
  await expect(page.getByText('待办中心').first()).toBeVisible();
  const problems = await visibleProblems(page);
  console.log('problems:', problems.join(','));
  console.log('menu:', (await page.getByRole('menuitem').allInnerTexts()).join(' | '));
  await shot(page, '_smoke', 'workbench');
  finish(ctx, 'helper smoke');
});
