import { test } from "@playwright/test";
import { login, goto } from "./_helpers";

test("pmo decision probe", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, "pmo");
  await goto(page, "/initiation/INIT-1/risk-assessment");
  console.log("BUTTONS1", await page.locator("button").allInnerTexts());
  const confirm = page.getByRole("button", { name: /确认报告并进入项目分级/ });
  console.log("CONFIRM", await confirm.count(), await confirm.first().isEnabled().catch(() => false));
  await page.getByLabel("综合判断与人工调整依据").fill("风险可控，同意进入分级决策");
  await confirm.first().click();
  await page.waitForTimeout(800);
  console.log("URL", page.url());
  console.log("BUTTONS2", await page.locator("button").allInnerTexts());
  console.log("TEXT", (await page.locator("body").innerText()).slice(0, 1500));
  await page.screenshot({ path: "qa-reports/r3/tmp-pmo.png", fullPage: true });
});
