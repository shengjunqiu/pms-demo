import { expect, test } from '@playwright/test';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
import { navigate, role } from './helpers';
type BusinessModule = typeof import('../src/mock/business');

test('概算与投入 UI：同版对比、返回、辅助列及来源明细', async ({ page }, info) => {
  test.setTimeout(90_000);
  prepareArtifacts();
  const consoleErrors = collectBrowserErrors(page);
  await page.goto('/opportunities');
  await role(page, 'PMO负责人');
  const fixture = await page.evaluate(async () => {
    const path = '/src/mock/business.ts';
    const { useBusinessStore } = await import(/* @vite-ignore */ path) as BusinessModule;
    const data = useBusinessStore.getState().data;
    const opportunity = data.opportunities.find(o => data.estimates.some(e => e.opportunityId === o.id));
    if (!opportunity) throw new Error('演示数据缺少可比较概算');
    return { id: opportunity.id, version: data.estimates.find(e => e.opportunityId === opportunity.id)!.id };
  });
  await navigate(page, `/opportunities/${fixture.id}/estimate`);
  await expect(page.getByRole('heading', { name: '概算来源与当前引用', exact: true })).toBeVisible();
  const screenshots: Record<string, unknown> = { estimate: await capturePageEvidence(page, 'UI-GS08') };
  await page.getByRole('link', { name: '版本对比', exact: true }).click();
  await navigate(page, `/opportunities/${fixture.id}/estimate/compare?base=${fixture.version}&compare=${fixture.version}`);
  await expect(page.getByRole('heading', { name: '统一科目差异', exact: true })).toBeVisible();
  await expect(page.locator('.pms-metric').filter({ hasText: '成本差异（万元）' })).toContainText('0.00');
  await expect(page.locator('.pms-metric').filter({ hasText: '收入差异（万元）' })).toContainText('0.00');
  screenshots.compare = await capturePageEvidence(page, 'UI-GS09');
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const heading = await page.getByRole('heading', { name: '统一科目差异', exact: true }).boundingBox();
    expect(heading && heading.y + heading.height).toBeLessThan(900);
  }
  await page.getByRole('link', { name: '返回概算编制', exact: true }).click();
  await expect(page).toHaveURL(`/opportunities/${fixture.id}/estimate`);
  await navigate(page, '/early-investments');
  await expect(page.getByRole('heading', { name: '商机投入与风险敞口', exact: true })).toBeVisible();
  await page.getByLabel('商机 / 客户', { exact: true }).fill('不存在的投入UI');
  await page.getByRole('button', { name: /^查\s*询$/ }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(0);
  await page.getByRole('button', { name: /^重\s*置$/ }).click();
  await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
  await page.getByRole('button', { name: '列设置', exact: true }).click();
  await page.getByRole('dialog').getByLabel('有效期 / 签约计划', { exact: true }).check();
  await page.getByRole('dialog').getByRole('button', { name: /^完\s*成$/ }).click();
  await expect(page.getByRole('columnheader', { name: '有效期 / 签约计划', exact: true })).toBeVisible();
  screenshots.ledger = await capturePageEvidence(page, 'UI-GS11');
  await page.locator('.ant-table-tbody tr.ant-table-row').first().getByRole('button', { name: '查看来源', exact: true }).click();
  await expect(page.locator('.ant-drawer:visible')).toContainText('批准申请与原审批');
  await expect(page.locator('.ant-drawer:visible')).toContainText('新发生成本与项目继承');
  await page.locator('.ant-drawer:visible .ant-drawer-close').click();
  await expect(page.locator('.ant-drawer-mask:visible')).toHaveCount(0);
  writeBrowserReport(info, { fixture, screenshots, consoleErrors });
  expect(consoleErrors).toEqual([]);
});
