#!/usr/bin/env node
// 构建产物守卫：检查 chunk 依赖图与首屏加载集合。
//
// 背景（两次线上白屏的根因）：
//   1) vendor-antd <-> vendor-icons 循环依赖：@ant-design/icons 顶层执行
//      setTwoToneColor(blue.primary)，而 blue 来自被分到 vendor-antd 的
//      @ant-design/colors。循环导致初始化时 blue 为 undefined，React 无法挂载。
//   2) mock-data 单一 chunk：首屏布局只需少量 mock，却被迫下载全部 mock 数据。
// 两者都只在 build 产物中出现，dev 模式无法暴露，因此在构建后自动把关。

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
const indexHtmlPath = join(dirname(assetsDir), 'index.html');

// 首屏 JS 预算（gzip 字节）。超出仅告警，不阻断构建。
const EAGER_BUDGET_BYTES = 700 * 1024;

const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const chunks = new Map(); // chunk 名 -> { file, size, deps:Set }

for (const file of files) {
  const code = readFileSync(join(assetsDir, file), 'utf8');
  const name = basename(file).replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
  // 仅统计静态 import/export-from。动态 import("./x.js") 不构成初始化顺序
  // 依赖（按需异步加载），计入会误报循环与首屏集合。
  const staticDeps = new Set();
  for (const m of code.matchAll(/(?:^|[;})\s])(?:import|export)\s*(?:[^"'()]*?from\s*)?["']\.\/([A-Za-z0-9_.-]+\.js)["']/g)) {
    staticDeps.add(m[1]);
  }
  const dynamicDeps = new Set();
  for (const m of code.matchAll(/import\s*\(\s*["']\.\/([A-Za-z0-9_.-]+\.js)["']/g)) {
    dynamicDeps.add(m[1]);
  }
  chunks.set(name, {
    file,
    size: statSync(join(assetsDir, file)).size,
    deps: new Set([...staticDeps].filter((d) => d !== file)),
    dynamicDeps: new Set([...dynamicDeps].filter((d) => d !== file)),
  });
}

// ---- 1. 循环依赖检测（硬失败）----
const cycles = [];
const state = new Map(); // 0=visiting 1=done
const stack = [];

function visit(name) {
  if (state.get(name) === 1) return;
  if (state.get(name) === 0) {
    const at = stack.indexOf(name);
    cycles.push([...stack.slice(at), name]);
    return;
  }
  state.set(name, 0);
  stack.push(name);
  const chunk = chunks.get(name);
  if (chunk) {
    for (const dep of chunk.deps) {
      const depName = [...chunks.entries()].find(([, c]) => c.file === dep)?.[0];
      if (depName) visit(depName);
    }
  }
  stack.pop();
  state.set(name, 1);
}
for (const name of chunks.keys()) visit(name);

// ---- 2. 首屏可达集合（index.html 静态引用的闭包）----
const html = readFileSync(indexHtmlPath, 'utf8');
const entryFiles = new Set([
  ...[...html.matchAll(/src="\.?\/?assets\/([A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/href="\.?\/?assets\/([A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]),
]);

const byFile = new Map([...chunks.entries()].map(([name, c]) => [c.file, name]));
const eager = new Set();
const queue = [...entryFiles];
while (queue.length) {
  const file = queue.pop();
  if (eager.has(file)) continue;
  eager.add(file);
  const chunk = chunks.get(byFile.get(file));
  if (chunk) for (const dep of chunk.deps) if (!eager.has(dep)) queue.push(dep);
}

const eagerBytes = [...eager].reduce((sum, f) => sum + statSync(join(assetsDir, f)).size, 0);
const cssFiles = [...html.matchAll(/href="\.?\/?assets\/([A-Za-z0-9_.-]+\.css)"/g)].map((m) => m[1]);
const cssBytes = cssFiles.reduce((sum, f) => sum + statSync(join(assetsDir, f)).size, 0);

// ---- 报告 ----
const fmt = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`chunk 总数: ${chunks.size}`);
console.log(`首屏 JS: ${eager.size} 个文件, ${fmt(eagerBytes)} (未压缩) + CSS ${fmt(cssBytes)}`);
console.log('\n首屏 JS 明细:');
[...eager]
  .map((f) => ({ f, size: statSync(join(assetsDir, f)).size }))
  .sort((a, b) => b.size - a.size)
  .forEach(({ f, size }) => console.log(`  ${fmt(size).padStart(10)}  ${f}`));

const lazyOnly = [...chunks.values()].filter((c) => !eager.has(c.file));
const lazyBytes = lazyOnly.reduce((s, c) => s + c.size, 0);
console.log(`\n按需加载: ${lazyOnly.length} 个 chunk, 合计 ${fmt(lazyBytes)}`);

let failed = false;
if (cycles.length) {
  console.error(`\n✗ 发现 ${cycles.length} 处 chunk 循环依赖（会导致初始化顺序错误、页面白屏）:`);
  for (const c of cycles.slice(0, 10)) console.error('  ' + c.join(' -> '));
  failed = true;
} else {
  console.log('\n✓ chunk 依赖图无环');
}

if (eagerBytes > EAGER_BUDGET_BYTES) {
  console.warn(`\n⚠ 首屏 JS ${fmt(eagerBytes)} 超出预算 ${fmt(EAGER_BUDGET_BYTES)}，请检查是否有页面/mock 代码被打进首屏`);
} else {
  console.log(`✓ 首屏 JS 在预算 ${fmt(EAGER_BUDGET_BYTES)} 内`);
}

process.exit(failed ? 1 : 0);
