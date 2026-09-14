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
          if (id.includes('node_modules/@ant-design/icons')) {
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