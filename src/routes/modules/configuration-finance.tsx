import { lazyPage } from '@/routes/lazyPage';

const FinanceConfigurationPage = lazyPage(() => import('@/pages/configuration/FinanceConfigurationPage'), 'FinanceConfigurationPage');

export const financeConfigurationRoutes=[{path:'settings/finance-config',element:<FinanceConfigurationPage />},{path:'settings/cost-mapping',element:<FinanceConfigurationPage />},{path:'settings/cost-baseline',element:<FinanceConfigurationPage />},{path:'settings/alerts',element:<FinanceConfigurationPage />}];
