import { expect, test, type Page } from '@playwright/test';
import {
  capturePageEvidence,
  collectBrowserErrors,
  prepareArtifacts,
  writeBrowserReport,
} from './evidence';
import { navigate, role } from './helpers';
import { seedAcceptanceScenario } from './scenario-state';

const errorsByPage = new WeakMap<Page, string[]>();
const observationsByPage = new WeakMap<Page, Record<string, unknown>>();

function observe(page: Page, payload: Record<string, unknown>) {
  observationsByPage.set(page, {
    ...(observationsByPage.get(page) ?? {}),
    ...payload,
  });
}

test.beforeEach(async ({ page }) => {
  prepareArtifacts();
  errorsByPage.set(page, collectBrowserErrors(page));
  observationsByPage.set(page, {});
});

test.afterEach(async ({ page }, testInfo) => {
  const consoleErrors = errorsByPage.get(page) ?? [];
  writeBrowserReport(testInfo, {
    url: page.url(),
    consoleErrors,
    observations: observationsByPage.get(page) ?? {},
  });
  expect(consoleErrors).toEqual([]);
});

test('YS-13 未签台账按风险过滤并保留真实下钻', async ({ page }) => {
  const fixture = await seedAcceptanceScenario(page, 'unsigned-base');
  await role(page, 'PMO负责人');
  await navigate(page, '/unsigned-projects');

  await expect(
    page.getByRole('heading', { name: '未签立项台账', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('未签项目').locator('..')).toContainText(
    String(fixture.unsignedCount),
  );
  const visibleRows = page.locator(
    '.ant-table-tbody > tr:not(.ant-table-measure-row)',
  );
  await expect(visibleRows).toHaveCount(10);

  const riskSelect = page
    .locator('.ant-select')
    .filter({ has: page.getByText('全部风险状态', { exact: true }) });
  await riskSelect.click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: /^投入超限$/ })
    .click();
  await expect(visibleRows).toHaveCount(10);
  await expect(
    page.locator('.ant-table-tbody').getByText('投入超限', { exact: true }),
  ).toHaveCount(10);

  const selectedRisk = page.locator('.ant-select').filter({ hasText: '投入超限' });
  await selectedRisk.hover();
  await selectedRisk.locator('.ant-select-clear').click();
  await page.getByPlaceholder('项目编号 / 名称').fill('P-PLAN-001');
  const projectLink = page.getByRole('button', {
    name: 'P-PLAN-001 福建园区设备运维协同平台',
  });
  await expect(projectLink).toBeVisible();
  await projectLink.click();
  await expect(page).toHaveURL('/unsigned-projects/P-PLAN-001');
  await expect(
    page.getByRole('heading', { name: '未签项目详情', exact: true }),
  ).toBeVisible();

  await navigate(page, '/unsigned-projects');
  await page.getByPlaceholder('项目编号 / 名称').fill('');
  const screenshots = await capturePageEvidence(page, 'YS-13');
  observe(page, {
    fixture: 'unsigned-base',
    riskFilter: '投入超限返回10个当前页项目，均显示命中风险标签',
    drilldown: 'P-PLAN-001 从台账进入同一未签项目详情',
    screenshots,
  });
});

test('YS-14 签约进展和合同原单形成同源记录', async ({ page }) => {
  await seedAcceptanceScenario(page, 'unsigned-ready-for-contract');
  await role(page, '客户经理');
  await navigate(page, '/unsigned-projects/P-PLAN-001');

  await page
    .getByPlaceholder('客户审批、合同谈判、阻碍与当前证据')
    .fill('客户法务已完成条款核对，待签署盖章');
  await page
    .getByPlaceholder('下一步动作、责任与计划')
    .fill('陈亮跟踪合同归档并准备启动确认');
  const expectedSignDate = page.getByPlaceholder('最新预计签约日');
  await expectedSignDate.fill('2026-09-20');
  await expectedSignDate.press('Enter');
  await page.getByRole('heading', { name: '未签项目详情' }).click();
  await page.getByRole('button', { name: '保存签约进展' }).click();
  await expect(
    page.locator('.ant-timeline').getByText(
      '客户法务已完成条款核对，待签署盖章',
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole('tab', { name: '合同签订确认' }).click();
  const contractPane = page.locator('.ant-tabs-tabpane-active');
  const textInputs = contractPane.locator('input.ant-input');
  await textInputs.nth(0).fill('CON-R0024-BROWSER');
  await textInputs.nth(1).fill('园区协同平台交付合同');
  await textInputs.nth(2).fill('客户签署合同正本');
  await contractPane.locator('input[role="spinbutton"]').first().fill('1200');
  await contractPane
    .locator('input[placeholder="请选择日期"]')
    .nth(1)
    .fill('2026-12-31');
  await contractPane.locator('input[type="file"]').setInputFiles({
    name: '双方签章合同.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('R0024 signed contract evidence'),
  });
  await page.getByRole('button', { name: '新增回款节点' }).click();
  await contractPane.getByPlaceholder('回款节点').fill('合同全款');
  await contractPane
    .locator('input[placeholder="请选择日期"]')
    .nth(2)
    .fill('2026-12-31');
  await contractPane.locator('input[role="spinbutton"]').nth(1).fill('1200');
  await page
    .getByPlaceholder('核验签署主体、金额、日期及附件的结论')
    .fill('合同主体、金额1200万元、签署日期及双方签章附件核验一致');
  await page
    .getByRole('button', { name: '确认签订并解除未签管控' })
    .click();
  await page
    .locator('.ant-modal:visible')
    .getByRole('button', { name: /确\s*定/ })
    .click();

  await expect(page.getByText(/已由 陈亮 于 2026-09-09 确认/)).toBeVisible();
  await expect(page.getByText('CON-R0024-BROWSER', { exact: false })).toBeVisible();
  await expect(page.getByText('1 个节点 / 1200 万元')).toBeVisible();
  await expect(page.getByText('双方签章合同.pdf', { exact: false })).toBeVisible();
  const screenshots = await capturePageEvidence(page, 'YS-14');
  observe(page, {
    fixture: 'unsigned-ready-for-contract',
    followup: '市场负责人保存签约证据，详情历史即时回显',
    contract:
      '登记真实Contract与1个ReceiptPlan；项目由未签转已签，合同金额1200万元，签章附件保留',
    screenshots,
  });
});

test('YS-15 阻断原因完整且满足条件后原子启动', async ({ page }) => {
  await seedAcceptanceScenario(page, 'unsigned-ready-for-contract');
  await role(page, 'PMO负责人');
  await navigate(page, '/projects/P-PLAN-001/start-confirmation');

  const blockedContract = page
    .locator('tr')
    .filter({ hasText: '真实已签合同' });
  await expect(blockedContract).toContainText('未满足');
  await expect(blockedContract).toContainText('未签项目不能确认正式启动');
  await expect(page.getByText('未满足', { exact: true })).toHaveCount(1);

  await seedAcceptanceScenario(page, 'unsigned-ready-for-start');
  await role(page, 'PMO负责人');
  await navigate(page, '/projects/P-PLAN-001/start-confirmation');
  await expect(page.getByText('未满足', { exact: true })).toHaveCount(0);
  await expect(page.getByText('满足', { exact: true })).toHaveCount(7);
  await page
    .getByPlaceholder('启动会议安排、执行要求与确认意见')
    .fill('启动会议已完成，责任人按有效基线执行');
  await page.getByRole('button', { name: '确认正式启动' }).click();
  await page
    .locator('.ant-modal:visible')
    .getByRole('button', { name: /确\s*定/ })
    .click();

  await expect(page.getByText(/李主任 已确认正式启动/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '项目启动确认', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('WBS任务', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('日报待办', { exact: true })).toBeVisible();
  await expect(page.getByText('工时填报入口', { exact: true })).toBeVisible();
  await expect(page.getByText('已生成', { exact: true })).toHaveCount(4);
  const screenshots = await capturePageEvidence(page, 'YS-15');
  observe(page, {
    blockedFixture: 'unsigned-ready-for-contract',
    blockedResult: '真实合同未签时明确显示唯一未满足项及原业务入口',
    readyFixture: 'unsigned-ready-for-start',
    startResult:
      '七项启动检查全部满足后，PMO确认正式启动；生成WBS、日报、工时事项和4条模拟通知',
    screenshots,
  });
});
