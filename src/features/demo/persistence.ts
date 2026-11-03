import { create } from 'zustand';
import type { BusinessState } from '@/mock/business-domain';
import checkpointUrl from './haizhou-started.json?url';

export const LEGACY_CHECKPOINT = 'pms-demo:dev-business:v1';
const SESSION = 'pms-demo:durable-workspace:v1';
const CURRENT = 'haizhou-current';
const ARRAY_KEYS = ['receiptRecords', 'unsignedInvestmentRequests', 'operationCostSources', 'operationCycles', 'operationEvents', 'initiations', 'changeRequests', 'earlyInvestmentRequests', 'earlyCosts', 'settlementRequests', 'settlementCostReviews', 'settlementCostDispositions', 'planningReviews', 'acceptanceReports', 'opportunities', 'contracts', 'contractLedgers', 'projectCostOverviews', 'receiptPlans', 'laborEntries', 'dailyReports', 'weeklyReports', 'costOrders', 'requirements', 'tasks', 'planRequests', 'projects', 'budgets', 'baselines', 'estimates', 'milestones', 'settlements', 'issues', 'risks', 'bugs', 'costs', 'approvals', 'changes', 'managementApprovals', 'decisions', 'acceptances', 'lockedProjects', 'maintenanceCosts', 'audit', 'materials'];
const OBJECT_KEYS = ['accessConfiguration', 'financeConfiguration', 'unsignedProjects', 'startConfirmations', 'operationHandovers', 'projectClosures', 'configuration', 'templateApplications', 'postEvaluations', 'projectArchives', 'settlementAnalyses', 'settlementForecastSnapshots', 'estimateDrafts', 'estimateMeta', 'projectTeams', 'budgetDrafts', 'presales', 'planningDrafts', 'acceptanceDetails', 'opportunityMeta', 'constructionFreezes', 'qualityPlans', 'ticketMeta'];
export interface WorkspacePackage { format: 'pms-demo-workspace'; schema: 1; label: string; savedAt: string; data: BusinessState }
export interface Snapshot extends WorkspacePackage { id: string; revision: string }
export type SnapshotInfo = Omit<Snapshot, 'data'>;

export function validateState(value: unknown): asserts value is BusinessState {
  if (!value || typeof value !== 'object') throw new Error('备份缺少业务数据');
  const data = value as Record<string, unknown>;
  if (ARRAY_KEYS.some((key) => !Array.isArray(data[key])) || OBJECT_KEYS.some((key) => !data[key] || typeof data[key] !== 'object' || Array.isArray(data[key]))) {
    throw new Error('备份结构与当前原型不兼容，当前数据未更改');
  }
  for (const key of ['projects', 'opportunities', 'initiations']) {
    const ids = (data[key] as Record<string, unknown>[]).map((item) => item?.id);
    if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('备份包含无效或重复的业务编号');
  }
}
export function hasDemo(data: BusinessState) {
  const project = data.projects.find((p) => p.id === 'P-INIT-67');
  return project?.opportunityId === 'OPP-073' && data.opportunities.some((o) => o.id === 'OPP-073')
    && data.initiations.some((i) => i.id === 'INIT-6' && i.input.opportunityId === 'OPP-073')
    && !!data.projectTeams['P-INIT-67'] && !!data.startConfirmations['P-INIT-67'];
}
export function parsePackage(value: unknown): WorkspacePackage {
  const p = value as WorkspacePackage;
  if (!p || p.format !== 'pms-demo-workspace' || p.schema !== 1 || typeof p.label !== 'string' || typeof p.savedAt !== 'string' || Number.isNaN(Date.parse(p.savedAt))) throw new Error('请选择此原型导出的演示备份文件');
  validateState(p.data);
  return p;
}
export const packageState = (data: BusinessState, label = '海州演示工作区备份'): WorkspacePackage => ({ format: 'pms-demo-workspace', schema: 1, label, savedAt: new Date().toISOString(), data });

let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('pms-demo-workspaces-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('snapshots', { keyPath: 'id' }); request.result.createObjectStore('catalog', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => reject(new Error('请关闭旧版本演示页面后重试'));
  });
}
export async function readSnapshot(id = CURRENT): Promise<Snapshot | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('snapshots').objectStore('snapshots').get(id);
    request.onsuccess = () => {
      try {
        if (request.result) {
          parsePackage(request.result);
          if (request.result.id !== id || typeof request.result.revision !== 'string') throw new Error('本机备份版本信息损坏，已保留原始数据');
        }
        resolve(request.result);
      } catch (error) { reject(error); }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function listBackups(): Promise<SnapshotInfo[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('catalog').objectStore('catalog').getAll();
    request.onsuccess = () => resolve((request.result as SnapshotInfo[]).filter((s) => s.id !== CURRENT).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    request.onerror = () => reject(request.error);
  });
}
class Conflict extends Error { constructor() { super('另一个标签页已保存更新。请先导出本页备份，再载入本机最新案例，避免覆盖。'); } }
async function writeSnapshot(p: WorkspacePackage, id: string, expected?: string | null, backup?: BusinessState): Promise<Snapshot> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(['snapshots', 'catalog'], 'readwrite');
    const store = tx.objectStore('snapshots');
    const catalog = tx.objectStore('catalog');
    let failure: Error | undefined;
    const snapshot: Snapshot = { ...p, id, revision: crypto.randomUUID() };
    const put = (s: Snapshot) => { store.put(s); catalog.put({ id: s.id, revision: s.revision, format: s.format, schema: s.schema, label: s.label, savedAt: s.savedAt }); };
    const request = store.get(id);
    request.onsuccess = () => {
      try {
      if (expected !== undefined && (request.result?.revision ?? null) !== expected) { failure = new Conflict(); tx.abort(); return; }
      if (backup) {
        // Restoring a baseline must also preserve the durable case it replaces,
        // even when this tab currently contains a different workspace.
        if (request.result) put({ ...request.result, label: '替换前本机案例备份', savedAt: new Date().toISOString(), id: `backup:${crypto.randomUUID()}`, revision: crypto.randomUUID() });
        put({ ...packageState(backup, '载入前工作区（完整备份）'), id: `backup:${crypto.randomUUID()}`, revision: crypto.randomUUID() });
      }
      put(snapshot);
      } catch (error) {
        failure = new Error(`本机保存失败：${error instanceof Error ? error.message : String(error)}`);
        try { tx.abort(); } catch { reject(failure); }
      }
    };
    tx.oncomplete = () => resolve(snapshot);
    tx.onerror = () => reject(failure ?? tx.error ?? new Error('本机保存失败'));
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('本机保存已中止'));
  });
}
interface PersistenceStatus { active: boolean; status: 'idle' | 'saving' | 'saved' | 'error'; savedAt?: string; error?: string }
export const useDemoPersistence = create<PersistenceStatus>(() => ({ active: false, status: 'idle' }));
let revision: string | null = null;
let activeId = CURRENT;
let queue: Promise<void> = Promise.resolve();
let suspended = false;
let pendingWrites = 0;
function activate(snapshot: Snapshot) {
  revision = snapshot.revision;
  activeId = snapshot.id;
  suspended = false;
  sessionStorage.setItem(SESSION, snapshot.id === CURRENT ? 'active' : `workspace:${snapshot.id}`);
  useDemoPersistence.setState({ active: true, status: pendingWrites ? 'saving' : 'saved', savedAt: snapshot.savedAt, error: undefined });
}
function failed(error: unknown) {
  suspended = true;
  useDemoPersistence.setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
}
export async function prepareWorkspace(): Promise<BusinessState | undefined> {
  // Migrate the user's original tab only once. Never replace an unrelated tab's
  // legacy workspace with the durable demo merely because it exists on this PC.
  const selected = sessionStorage.getItem(SESSION);
  if (selected?.startsWith('workspace:')) {
    const saved = await readSnapshot(selected.slice('workspace:'.length));
    if (!saved) throw new Error('找不到载入前工作区备份，请先导出原始标签页数据');
    activate(saved);
    return saved.data;
  }
  const legacy = import.meta.env.DEV && sessionStorage.getItem(LEGACY_CHECKPOINT);
  if (legacy && !sessionStorage.getItem(SESSION)) {
    const data: unknown = JSON.parse(legacy);
    validateState(data);
    if (hasDemo(data)) {
      try {
        const saved = await readSnapshot();
        if (!saved) activate(await writeSnapshot(packageState(data), CURRENT, null));
        else {
          // An old tab may carry an older checkpoint. Keep it intact, but require
          // explicit loading before it can overwrite the durable workspace.
          failed(new Conflict());
        }
      } catch (error) { failed(error); }
    }
    return data;
  }
  try {
    const saved = await readSnapshot();
    if (saved) { if (!hasDemo(saved.data)) throw new Error('本机案例关联不完整，请从演示数据恢复包重新载入'); activate(saved); return saved.data; }
  } catch (error) {
    failed(error);
    // A requested active workspace must never silently fall back to seed data.
    if (sessionStorage.getItem(SESSION)) throw error;
  }
  return undefined;
}
export function saveDemo(data: BusinessState) {
  if (!useDemoPersistence.getState().active || suspended) return queue;
  pendingWrites += 1;
  useDemoPersistence.setState({ status: 'saving' });
  queue = queue.then(async () => {
    if (suspended) { pendingWrites -= 1; return; }
    try { activate(await writeSnapshot(packageState(data), activeId, revision)); }
    catch (error) { failed(error); }
    finally { pendingWrites -= 1; if (!suspended && pendingWrites === 0) useDemoPersistence.setState({ status: 'saved' }); }
  });
  return queue;
}
export async function loadWorkspace(current: BusinessState, source: 'saved' | 'built-in' | WorkspacePackage | { backup: string }): Promise<BusinessState> {
  await queue;
  let target: WorkspacePackage;
  let existing = await readSnapshot();
  if (source === 'saved') {
    if (!existing) throw new Error('本机尚无保存案例，请选择随稿恢复包');
    target = existing;
  } else if (source === 'built-in') {
    const response = await fetch(checkpointUrl);
    if (!response.ok) throw new Error('无法读取随稿恢复包，请确认原型服务正在运行');
    target = parsePackage(await response.json());
  } else if ('backup' in source) {
    const backup = await readSnapshot(source.backup);
    if (!backup) throw new Error('未找到所选备份');
    target = backup;
  } else target = parsePackage(source);
  validateState(target.data);
  if (typeof source === 'string' && !hasDemo(target.data)) throw new Error('案例缺少商机、立项或启动关联，当前工作区未更改');
  if (hasDemo(target.data)) {
    // Backup and switch commit atomically. A quota error leaves memory intact.
    // Re-read after package fetching, then CAS detects concurrent later writes.
    existing = await readSnapshot();
    if (source === 'saved') target = existing!;
    activate(await writeSnapshot(packageState(target.data, target.label), CURRENT, existing?.revision ?? null, current));
  } else {
    activate(await writeSnapshot(packageState(target.data, '返回载入前工作区'), `workspace:${crypto.randomUUID()}`, null, current));
  }
  return structuredClone(target.data);
}
