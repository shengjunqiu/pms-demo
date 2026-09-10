import { PostEvaluationPage } from '@/pages/settlement/PostEvaluationPage';
import { ArchivePage } from '@/pages/settlement/ArchivePage';
import { SettlementPage } from '@/pages/settlement/SettlementPage';
import { SettlementAnalysisPage } from '@/pages/settlement/SettlementAnalysisPage';
import { AcceptancePage } from '@/pages/settlement/AcceptancePage';
import { ReportAcceptancePage } from '@/pages/settlement/ReportAcceptancePage';
export const settlementRoutes = [
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
