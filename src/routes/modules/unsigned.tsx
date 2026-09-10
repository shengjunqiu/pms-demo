import {UnsignedProjectsPage} from '@/pages/unsigned/UnsignedProjectsPage';
import {UnsignedProjectPage} from '@/pages/unsigned/UnsignedProjectPage';
import {StartConfirmationPage} from '@/pages/unsigned/StartConfirmationPage';
export const unsignedRoutes=[{path:'unsigned-projects',element:<UnsignedProjectsPage/>},{path:'unsigned-projects/:id',element:<UnsignedProjectPage/>},{path:'projects/:id/start-confirmation',element:<StartConfirmationPage/>}];
