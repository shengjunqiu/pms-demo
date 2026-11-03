import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'styles.css'), 'utf8');
const flowCss = await readFile(join(root, 'flow.css'), 'utf8');
let js = `${await readFile(join(root, 'content.js'), 'utf8')}\n${await readFile(join(root, 'slides.js'), 'utf8')}`;
new vm.Script(js, { filename: 'slides.js' });
const assets = [...new Set(js.match(/assets\/[a-z-]+\.png/g))];
for (const asset of assets) {
  const image = await readFile(join(root, asset));
  if (image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`Invalid PNG: ${asset}`);
  }
  js = js.replaceAll(asset, `data:image/png;base64,${image.toString('base64')}`);
}
const bundled = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<link rel="stylesheet" href="flow.css">', `<style>\n${flowCss}\n</style>`)
  .replace('<script src="content.js"></script>\n  <script src="slides.js"></script>', () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace('所有原始系统截图均保存在 assets 目录。', '系统截图已内嵌在本文件中。');
if (/src="(?:content|slides)\.js"|href="styles\.css"|assets\/[a-z-]+\.png/.test(bundled)) {
  throw new Error('Standalone file still has external local dependencies');
}
const output = join(root, '项目全生命周期演示.html');
await writeFile(output, bundled);
console.log(JSON.stringify({ file: output, screenshots: assets.length, bytes: (await stat(output)).size }));
