import { ConfigurationPage } from '@/pages/configuration/ConfigurationPage';
export const configurationRoutes=[{path:'settings/deliverables',element:<ConfigurationPage key="templates" kind="templates"/>},{path:'settings/project-grading',element:<ConfigurationPage key="grading" kind="grading"/>},{path:'settings/approval-rules',element:<ConfigurationPage key="approvals" kind="approvals"/>}];
