import { lazyPage } from '@/routes/lazyPage';

const OperationHandoverPage = lazyPage(() => import('@/pages/settlement/OperationHandoverPage'), 'OperationHandoverPage');
const OperationsPage = lazyPage(() => import('@/pages/settlement/OperationsPage'), 'OperationsPage');
const ProjectClosePage = lazyPage(() => import('@/pages/settlement/ProjectClosePage'), 'ProjectClosePage');
const PostEvaluationPage = lazyPage(() => import('@/pages/settlement/PostEvaluationPage'), 'PostEvaluationPage');
const ArchivePage = lazyPage(() => import('@/pages/settlement/ArchivePage'), 'ArchivePage');
const SettlementPage = lazyPage(() => import('@/pages/settlement/SettlementPage'), 'SettlementPage');
const SettlementAnalysisPage = lazyPage(() => import('@/pages/settlement/SettlementAnalysisPage'), 'SettlementAnalysisPage');
const AcceptancePage = lazyPage(() => import('@/pages/settlement/AcceptancePage'), 'AcceptancePage');
const ReportAcceptancePage = lazyPage(() => import('@/pages/settlement/ReportAcceptancePage'), 'ReportAcceptancePage');

export const settlementRoutes = [
 {path:'projects/:id/operation-handover',element:<OperationHandoverPage/>},
 {path:'operations/:id',element:<OperationsPage/>},
 {path:'projects/:id/close',element:<ProjectClosePage/>},
 {path:'projects/:id/post-evaluation',element:<PostEvaluationPage/>},
 {path:'projects/:id/archive',element:<ArchivePage/>},
 { path:'projects/:id/settlement/apply',element:<SettlementPage key="apply" apply/> },
 { path:'projects/:id/settlement',element:<SettlementPage key="detail"/> },
 { path:'projects/:id/four-calculations',element:<SettlementAnalysisPage key="four"/> },
 { path:'projects/:id/business-result',element:<SettlementAnalysisPage key="result" result/> },
 { path:'projects/:id/internal-acceptance',element:<AcceptancePage key="internal" kind="内部初验"/> },
 { path:'projects/:id/supplier-acceptance',element:<AcceptancePage key="supplier" kind="供应商验收"/> },
 { path:'projects/:id/customer-acceptance',element:<AcceptancePage key="customer" kind="客户终验"/> },
 { path:'projects/:id/report-acceptance',element:<ReportAcceptancePage/> },
];
