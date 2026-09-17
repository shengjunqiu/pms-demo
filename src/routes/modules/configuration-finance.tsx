import { lazyPage } from '@/routes/lazyPage';

const FinanceConfigurationPage = lazyPage(() => import('@/pages/configuration/FinanceConfigurationPage'), 'FinanceConfigurationPage');

export const financeConfigurationRoutes=[{path:'settings/cost-mapping',element:<FinanceConfigurationPage key="subjects" kind="subjects"/>},{path:'settings/cost-baseline',element:<FinanceConfigurationPage key="rates" kind="rates"/>},{path:'settings/alerts',element:<FinanceConfigurationPage key="alerts" kind="alerts"/>}];
