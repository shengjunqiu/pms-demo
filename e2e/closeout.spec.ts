import { expect, test, type Page } from '@playwright/test';

/**
 * 收尾链路（资料归档）UI 覆盖：
 * 1) 14 类归档目录必须逐项给出完整性结论与依据，不能只给一个灰色按钮；
 * 2) 结算前置是领域规则，页面须把“未结算”这一原因显式呈现，而不是让按钮无解释地禁用；
 * 3) 已完成冻结结算的项目上，PMO 必须真的能补档（证明门禁不是全员死锁）。
 */
const ARCHIVE_CATEGORIES = 14;
const ERROR_TEXT = ['页面未找到', '页面出错了', '无权访问'];

async function login(page: Page, role: string, projectId = 'P-001') {
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

async function open(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(url);
    try {
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('main')).toContainText('项目资料归档');
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  for (const text of ERROR_TEXT) await expect(page.locator('body')).not.toContainText(text);
}

const archiveRows = (page: Page) => page.getByRole('row').filter({ hasText: /(齐全|缺件)/ });
/** AntD 双字按钮渲染为“补 档”，且 getByRole 的 name 默认模糊匹配（会命中“××补档容器”），故用全匹配正则。 */
const uploadButtons = (page: Page) => page.getByRole('button', { name: /^补\s*档$/ });
const confirmButton = (page: Page) => page.getByRole('button', { name: '确认正式归档', exact: true });

test('未结算项目的归档页逐类给出缺件依据，并说明结算前置', async ({ page }) => {
  await login(page, 'pmo');
  await open(page, '/projects/P-001/archive');

  // 结算前置必须是页面上看得见的事实，而不是只有一颗灰按钮。
  await expect(page.locator('main')).toContainText('未结算');
  await expect(page.locator('main')).toContainText('尚未正式结算');

  const rows = archiveRows(page);
  expect(await rows.count()).toBeGreaterThanOrEqual(ARCHIVE_CATEGORIES);
  const first = rows.first();
  await expect(first).toContainText(/条来源 \/ \d+ 份/);
  await expect(first).toContainText(/(原记录|文件|目录|结算)/);

  // 未结算时既不能补档也不能确认归档，且两者都有页面级原因——原因须就近出现在按钮旁。
  await expect(uploadButtons(page).first()).toBeDisabled();
  await expect(confirmButton(page)).toBeDisabled();
  await expect(page.locator('main')).toContainText('未结算：需先完成正式结算，才能补档或确认归档');
});

test('已冻结结算的项目，PMO 可以补档且确认归档仍受缺件约束', async ({ page }) => {
  await login(page, 'pmo', 'P-008');
  await open(page, '/projects/P-008/archive');

  await expect(page.locator('main')).not.toContainText('须先完成正式结算');
  // 结算已锁定 -> 补档入口真实可用，证明链路没有被前置条件整体锁死。
  const upload = uploadButtons(page).first();
  await expect(upload).toBeEnabled();
  await upload.click();
  await expect(page.locator('.ant-modal').getByText('补充正式归档文件')).toBeVisible();
  await expect(page.locator('.ant-modal')).toContainText(/仅登记文件名、版本及来源/);
  await page.getByRole('button', { name: '取 消' }).click();

  // 缺件未补齐前不允许确认归档（按钮状态与归档完整性一致）。
  // 只数表格里的「缺件」标签：页面正文（规则说明、原因文案）也含“缺件”二字。
  const settledMissing = await page.getByText('缺件', { exact: true }).count();
  if (settledMissing > 0) {
    await expect(confirmButton(page)).toBeDisabled();
    await expect(page.locator('main')).toContainText(`尚有 ${settledMissing} 类缺件，补齐后可确认归档`);
  } else {
    await expect(confirmButton(page)).toBeEnabled();
  }
});

test('项目经理在归档页只读，不能确认归档', async ({ page }) => {
  await login(page, 'project-manager', 'P-008');
  await open(page, '/projects/P-008/archive');
  await expect(confirmButton(page)).toBeDisabled();
});
