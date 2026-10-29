import { test, expect } from '@playwright/test';
import { login, goto, laneContext, ROLE_LABEL, visibleProblems, type QaRole } from './_helpers';

const ROLES: QaRole[] = ['market', 'solution-tech', 'project-manager', 'pmo', 'finance', 'executive', 'admin'];

test('probe roles and nav', async ({ page }) => {
  test.setTimeout(180_000);
  const ctx = laneContext(page, '_probe');
  for (const role of ROLES) {
    await login(page, role);
    await goto(page, '/workbench/todos');
    const title = await page.title();
    const items = await page.getByRole('menuitem').allInnerTexts();
    const header = await page.locator('header').innerText();
    const problems = await visibleProblems(page);
    console.log(`ROLE=${role} ${ROLE_LABEL[role]} title=${title} menu=${items.length} problems=${problems.join(',')} header=${header.replace(/\n/g, ' / ').slice(0, 160)}`);
    expect(items.length).toBeGreaterThan(0);
  }
  console.log('consoleErrors', ctx.consoleErrors);
  console.log('pageErrors', ctx.pageErrors);
});
