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
          // vendor 框架库
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
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
          // 公共组件（被多页面共享的）
          if (id.includes('/src/components/common/') || id.includes('/src/store/') || id.includes('/src/theme/') || id.includes('/src/mock/')) {
            return 'shared-common';
          }
          if (id.includes('/src/utils/')) {
            return 'shared-utils';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
