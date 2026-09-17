import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // ---- vendor 分包 ----
          // 注意：vendor-icons 必须自包含（只依赖 vendor-react）。
          // @ant-design/icons 顶层会执行 setTwoToneColor(blue.primary)，
          // 若 @ant-design/colors 或其工具依赖被分到 vendor-antd，
          // 会形成 vendor-antd <-> vendor-icons 循环依赖，
          // 初始化顺序导致 blue 为 undefined，页面白屏卡在骨架屏。
          if (
            id.includes('node_modules/@ant-design/icons') ||
            id.includes('node_modules/@ant-design/colors') ||
            id.includes('node_modules/rc-util') ||
            id.includes('node_modules/classnames') ||
            id.includes('node_modules/@babel/runtime')
          ) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          if (id.includes('node_modules/dayjs')) {
            return 'vendor-utils';
          }
          // ---- src 侧不要手动分包 ----
          // 1) mock 数据若捆成单一 chunk，首屏布局（MainLayout 依赖
          //    mock/business 等少量模块）会迫使浏览器下载全部 40+ 个
          //    mock 文件；交给 Rollup 默认算法后，首屏必需的少量 mock
          //    留在入口依赖图，其余跟随懒加载页面按需下载。
          // 2) 手动 chunk 会把"被所有懒加载页面共享的未分配模块"
          //    （如页面共用的 mock 大数据）一并合并进来，而首屏布局
          //    又引用了该 chunk 里的个别小组件，导致整包变为首屏阻塞。
          // 构建后由 scripts/check-chunks.mjs 检查循环依赖与首屏体积。
        },
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: false,
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: 'esbuild',
  },
});