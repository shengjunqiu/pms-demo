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
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
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
          if (id.includes('node_modules/antd/')) {
            return 'vendor-antd';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          if (id.includes('node_modules/dayjs')) {
            return 'vendor-utils';
          }
          // mock 数据独立拆包
          if (id.includes('/src/mock/')) {
            return 'mock-data';
          }
          if (id.includes('/src/store/') || id.includes('/src/theme/') || id.includes('/src/models/types')) {
            return 'shared-core';
          }
          if (id.includes('/src/components/common/')) {
            return 'shared-ui';
          }
          if (id.includes('/src/utils/')) {
            return 'shared-utils';
          }
          if (id.includes('/src/routes/navigation') || id.includes('/src/routes/manifest')) {
            return 'routes-static';
          }
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