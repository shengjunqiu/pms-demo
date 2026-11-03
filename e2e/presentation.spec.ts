import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

const frame = (page: Page) => page.frameLocator('iframe[title="项目四算业务流程讲解"]');
const checkpointKey = 'pms-demo:dev-business:v1';

async function begin(page: Page) {
  page.on('pageerror', (error) => console.log('Presentation page error:', error.message));
  page.on('requestfailed', (request) => console.log('Presentation request failed:', request.url(), request.failure()?.errorText));
  page.on('console', (entry) => { if (entry.type() === 'error') console.log('Presentation console:', entry.text()); });
  await page.addInitScript(() => localStorage.setItem('pms-app-session', JSON.stringify({ state: { currentRole: 'pmo' }, version: 0 })));
  await page.goto('/projects/P-001');
  // The demo seed is assembled on first entry; use the repository's 15s cold-start expectation.
  await expect(page.getByRole('button', { name: '业务流程讲解', exact: true })).toBeVisible({ timeout: 15_000 });
}

async function chooseSlide(page: Page, index: number) {
  await frame(page).locator('#toc-button').click();
  await frame(page).locator(`#toc-grid [data-jump="${index}"]`).click();
}

test('未载入案例时提供恢复入口，取消后保持讲解；原图仍可独立放大', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: '业务流程讲解', exact: true }).click();
  await chooseSlide(page, 20);
  await frame(page).getByRole('tab', { name: '项目周报', exact: true }).click();
  await frame(page).getByRole('button', { name: '放大截图：项目周报', exact: true }).click();
  await expect(frame(page).locator('#image-dialog')).toBeVisible();
  await expect(frame(page).locator('#full-image')).toHaveJSProperty('naturalWidth', 1668);
  await frame(page).getByRole('button', { name: '关闭截图', exact: true }).click();
  await frame(page).getByRole('button', { name: '进入原型：项目周报', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).toBeVisible();
  await expect(page.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭恢复窗口', exact: true }).click();
  await expect(page).toHaveURL(/\/presentation$/);
  await expect(frame(page).locator('#counter')).toHaveText('21 / 36');
  await frame(page).getByRole('button', { name: '回到原型', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/P-001$/);
});

test('同标签页截图跳转、返回和浏览器后退保持页码、截图标签、业务状态及身份', async ({ page, context }) => {
  await begin(page);
  // Isolated test fixture, never applied to the user's demo tab.
  const snapshot = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), checkpointKey);
  snapshot.projects.push({ ...snapshot.projects.find((p: { id: string }) => p.id === 'P-001'), id: 'P-INIT-67', name: '联动导航验证项目', actualCost: 12.34 });
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: checkpointKey, value: JSON.stringify(snapshot) });
  await page.reload();
  await page.evaluate(() => Object.assign(window, { presentationSentinel: 'same-document' }));
  await page.getByRole('button', { name: '业务流程讲解', exact: true }).click();
  await chooseSlide(page, 20);
  await frame(page).getByRole('tab', { name: '项目周报', exact: true }).click();
  await frame(page).getByRole('button', { name: '进入原型：项目周报', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/P-INIT-67\/weekly-reports$/);
  await expect(page.getByRole('button', { name: '返回讲解 · 第21页', exact: true })).toBeVisible();
  await expect(page.getByText('联动导航验证项目', { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { presentationSentinel: string }).presentationSentinel)).toBe('same-document');
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).projects.find((p: { id: string }) => p.id === 'P-INIT-67').actualCost, checkpointKey)).toBe(12.34);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pms-app-session')!).state.currentRole)).toBe('pmo');
  expect(context.pages()).toHaveLength(1);
  await page.getByRole('button', { name: '返回讲解 · 第21页', exact: true }).click();
  await expect(frame(page).getByRole('tab', { name: '项目周报', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(frame(page).locator('#counter')).toHaveText('21 / 36');
  await frame(page).getByRole('button', { name: '进入原型：项目周报', exact: true }).click();
  await expect(page).toHaveURL(/weekly-reports$/);
  await page.goBack();
  await expect(frame(page).locator('#counter')).toHaveText('21 / 36');
  await expect(frame(page).getByRole('tab', { name: '项目周报', exact: true })).toHaveAttribute('aria-selected', 'true');
  await frame(page).getByRole('link', { name: '返回封面', exact: true }).click();
  await expect(frame(page).locator('#counter')).toHaveText('01 / 36');
  await expect(page).toHaveURL(/\/presentation$/);
});

test('验收准备清单可直接定位，原有轮次标签仍可切换', async ({ page }) => {
  await begin(page);
  await page.goto('/projects/P-001/customer-acceptance?view=conditions');
  await expect(page.getByRole('tab', { name: /准备清单/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /验收轮次/ }).click();
  await expect(page.getByRole('tab', { name: /验收轮次/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page).not.toHaveURL(/view=conditions/);
});

async function durableSnapshot(page: Page, id = 'haizhou-current') {
  return page.evaluate((key) => new Promise<{ revision: string; data: Record<string, unknown> }>((resolve, reject) => {
    const open = indexedDB.open('pms-demo-workspaces-v1', 1);
    open.onsuccess = () => {
      const request = open.result.transaction('snapshots').objectStore('snapshots').get(key);
      request.onsuccess = () => { resolve(request.result); open.result.close(); };
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  }), id);
}

test('随稿案例真实恢复、完整备份、导入导出、新标签页与重载均保持业务数据和角色', async ({ page, context }) => {
  test.setTimeout(90_000);
  await begin(page);
  const original = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), checkpointKey);
  await page.getByRole('button', { name: '业务流程讲解', exact: true }).click();
  await frame(page).getByRole('button', { name: '进入原型：项目工作区总览', exact: true }).click();
  await page.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/P-INIT-67$/, { timeout: 20_000 });
  await expect(page.getByText('海州市智慧交通信号优化平台', { exact: false }).first()).toBeVisible();
  const saved = await durableSnapshot(page);
  const projects = saved.data.projects as { id: string; actualCost: number; actualStartDate: string; budgetAmount: number; contractAmount: number }[];
  expect(projects.find((p) => p.id === 'P-INIT-67')).toMatchObject({ actualStartDate: '2026-09-09', budgetAmount: 1944.8, contractAmount: 2860, actualCost: 0 });
  expect((saved.data.tasks as { projectId: string }[]).filter((t) => t.projectId === 'P-INIT-67')).toHaveLength(57);
  expect((saved.data.receiptRecords as unknown[])).toHaveLength(0);
  await page.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前工作区备份', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  // Bad imports must leave the workspace and saved revision intact.
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"pms-demo-workspace","schema":1,"label":"bad","savedAt":"2026-11-03T00:00:00.000Z","data":{}}') });
  await expect(page.getByText('备份结构与当前原型不兼容，当前数据未更改')).toBeVisible();
  expect((await durableSnapshot(page)).revision).toBe(saved.revision);
  // A valid exported package can be imported without changing its business facts.
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).not.toBeVisible();
  expect((await durableSnapshot(page)).data.projects).toEqual(saved.data.projects);
  await page.reload();
  await expect(page.getByRole('button', { name: '演示数据与恢复', exact: true })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pms-app-session')!).state.currentRole)).toBe('pmo');
  // A completely new tab has no inherited session checkpoint, but loads IndexedDB.
  const fresh = await context.newPage();
  await fresh.goto('/presentation');
  await frame(fresh).getByRole('button', { name: '进入原型：项目工作区总览', exact: true }).click();
  await expect(fresh).toHaveURL(/\/projects\/P-INIT-67$/);
  expect((await durableSnapshot(fresh)).data.projects).toEqual(saved.data.projects);
  await fresh.close();
  // Return to the seed workspace that was present before recovery.
  await page.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  await page.getByRole('combobox', { name: '载入前工作区备份' }).click();
  await page.getByRole('option').last().click();
  await page.getByRole('button', { name: '恢复所选工作区备份', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).not.toBeVisible();
  const selected = await page.evaluate(() => sessionStorage.getItem('pms-demo:durable-workspace:v1'));
  expect(selected).toMatch(/^workspace:/);
  const restored = await durableSnapshot(page, selected!.slice('workspace:'.length));
  expect(restored.data.projects).toEqual(original.projects);
  // The saved demo remains available even when this tab returns to another workspace.
  expect((await durableSnapshot(page)).data.projects).toEqual(saved.data.projects);
  // An exported non-demo workspace is also recoverable without replacing the
  // durable Haizhou case. This exercises the file path, rather than IDB backups.
  await page.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'original-workspace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'pms-demo-workspace', schema: 1, label: '原工作区备份', savedAt: new Date().toISOString(), data: original })) });
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).not.toBeVisible();
  const selectedFile = await page.evaluate(() => sessionStorage.getItem('pms-demo:durable-workspace:v1'));
  expect((await durableSnapshot(page, selectedFile!.slice('workspace:'.length))).data.projects).toEqual(original.projects);
  expect((await durableSnapshot(page)).data.projects).toEqual(saved.data.projects);
});

test('业务原单拒绝审计自动保存，旧标签页保存冲突时不覆盖新数据', async ({ page, context }) => {
  test.setTimeout(90_000);
  await begin(page);
  await page.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  await page.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).not.toBeVisible();
  const first = await durableSnapshot(page);
  const stale = await context.newPage();
  await stale.goto('/projects/P-INIT-67');
  await expect(stale.getByRole('button', { name: '演示数据与恢复', exact: true })).toBeVisible({ timeout: 15_000 });
  // Exercise the real store pipeline in this isolated test context. The active
  // PMO identity cannot start an already-started project: audit, never fake success.
  const rejection = await page.evaluate(async () => {
    const storePath = '/src/mock/store.ts'; const actorPath = '/src/store/useAppStore.ts';
    const { useBusinessStore } = await import(/* @vite-ignore */ storePath);
    const { useAppStore } = await import(/* @vite-ignore */ actorPath);
    try { useBusinessStore.getState().dispatch({ type: 'confirm-project-start', projectId: 'P-INIT-67', date: '2026-09-09', opinion: '持久化拒绝审计测试' }, useAppStore.getState().currentUser); }
    catch (error) { return String(error); }
  });
  expect(rejection).toBeTruthy();
  await expect.poll(async () => (await durableSnapshot(page)).revision).not.toBe(first.revision);
  const updated = await durableSnapshot(page);
  expect(updated.data.projects).toEqual(first.data.projects);
  expect((updated.data.audit as { action: string; result: string }[]).at(-1)).toMatchObject({ action: 'confirm-project-start', result: '拒绝' });
  await stale.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  await stale.getByRole('button', { name: '立即保存案例', exact: true }).click();
  await expect(stale.getByText('另一个标签页已保存更新。请先导出本页备份，再载入本机最新案例，避免覆盖。', { exact: true })).toBeVisible();
  expect((await durableSnapshot(stale)).revision).toBe(updated.revision);
  await stale.close();
});

test('独立HTML传入的截图与页码可直达对应页，缺少案例时先恢复再继续', async ({ page }) => {
  test.setTimeout(60_000);
  await begin(page);
  const position = encodeURIComponent(JSON.stringify({ slide: 21, selections: { 20: 1 } }));
  await page.goto(`/presentation?position=${position}&shot=weekly`);
  await expect(page.getByRole('dialog', { name: '演示数据与恢复' })).toBeVisible();
  await expect(page).toHaveURL(/\/presentation$/);
  await page.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/P-INIT-67\/weekly-reports$/, { timeout: 20_000 });
  await page.getByRole('button', { name: '返回讲解 · 第21页', exact: true }).click();
  await expect(frame(page).locator('#counter')).toHaveText('21 / 36');
  await expect(frame(page).getByRole('tab', { name: '项目周报', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('本机写入失败时不替换当前工作区，备份与案例原子回滚', async ({ page }) => {
  test.setTimeout(60_000);
  await begin(page);
  const original = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), checkpointKey);
  await page.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
  // Abort the first IDB write in this isolated browser to model storage failure.
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      IDBObjectStore.prototype.put = originalPut;
      const request = originalPut.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await page.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /本机保存|transaction|abort|inactive/i })).toBeVisible();
  expect(await durableSnapshot(page)).toBeUndefined();
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).projects, checkpointKey)).toEqual(original.projects);
  await expect(page).toHaveURL(/\/projects\/P-001$/);
});


test('关闭并重启独立测试浏览器后，无原标签页也能恢复案例并联动讲解', async ({ baseURL }) => {
  test.setTimeout(120_000);
  const directory = await mkdtemp(join(tmpdir(), 'pms-demo-persistence-'));
  let active: BrowserContext | undefined;
  const launch = () => chromium.launchPersistentContext(directory, {
    headless: true, baseURL,
    channel: process.env.PMS_BROWSER_EXECUTABLE ? undefined : 'chrome',
    executablePath: process.env.PMS_BROWSER_EXECUTABLE,
  });
  try {
    active = await launch();
    const original = active.pages()[0];
    try { await begin(original); }
    catch (error) {
      console.log('Persistent startup diagnostics:', { url: original.url(), title: await original.title(), body: await original.locator('body').innerText() });
      throw error;
    }
    await original.getByRole('button', { name: '演示数据与恢复', exact: true }).click();
    await original.getByRole('button', { name: '恢复随稿案例（已签约已启动）', exact: true }).click();
    await expect(original.getByRole('dialog', { name: '演示数据与恢复' })).not.toBeVisible();
    const saved = await durableSnapshot(original);
    await active.close(); active = undefined;
    active = await launch();
    const reopened = active.pages()[0];
    await reopened.goto('/presentation');
    await frame(reopened).getByRole('button', { name: '进入原型：项目工作区总览', exact: true }).click();
    await expect(reopened).toHaveURL(/\/projects\/P-INIT-67$/);
    expect((await durableSnapshot(reopened)).data.projects).toEqual(saved.data.projects);
    expect(await reopened.evaluate(() => JSON.parse(localStorage.getItem('pms-app-session')!).state.currentRole)).toBe('pmo');
    await expect(reopened.getByText('海州市智慧交通信号优化平台', { exact: false }).first()).toBeVisible();
  } finally {
    await active?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
