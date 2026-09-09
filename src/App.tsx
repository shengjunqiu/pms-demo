import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { pmsTheme } from '@/theme';
import { AppRouter } from '@/routes';
import { RouteScrollRestoration } from '@/components/common/RouteScrollRestoration';

dayjs.locale('zh-cn');

export const App: React.FC = () => {
  return (
    <ConfigProvider theme={pmsTheme} locale={zhCN}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouteScrollRestoration />
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
