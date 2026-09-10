import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

export const artifactDir = process.env.PMS_LOOP_ARTIFACT_DIR ?? 'test-results';

export function prepareArtifacts() {
  mkdirSync(artifactDir, { recursive: true });
}

export function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function capturePageEvidence(page: Page, pageId: string) {
  await expect(page.locator('.ant-modal:visible')).toHaveCount(0);
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
    timeout: 6_000,
  });
  const screenshots: Record<string, string> = {};
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const path = join(artifactDir, `${pageId}-${width}.png`);
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    screenshots[String(width)] = path;
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return screenshots;
}

export function writeBrowserReport(
  testInfo: TestInfo,
  payload: Record<string, unknown>,
) {
  const file = join(
    artifactDir,
    `r0024-${testInfo.testId.replace(/[^a-z0-9]/gi, '')}.json`,
  );
  writeFileSync(
    file,
    JSON.stringify(
      {
        title: testInfo.title,
        status: testInfo.status,
        ...payload,
      },
      null,
      2,
    ),
  );
  return file;
}
