import { lazyPage } from '@/routes/lazyPage';

const UnsignedProjectsPage = lazyPage(() => import('@/pages/unsigned/UnsignedProjectsPage'), 'UnsignedProjectsPage');
const UnsignedProjectPage = lazyPage(() => import('@/pages/unsigned/UnsignedProjectPage'), 'UnsignedProjectPage');
const StartConfirmationPage = lazyPage(() => import('@/pages/unsigned/StartConfirmationPage'), 'StartConfirmationPage');

export const unsignedRoutes=[{path:'unsigned-projects',element:<UnsignedProjectsPage/>},{path:'unsigned-projects/:id',element:<UnsignedProjectPage/>},{path:'projects/:id/start-confirmation',element:<StartConfirmationPage/>}];
