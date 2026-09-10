import { AcceptancePage } from '@/pages/settlement/AcceptancePage';
import { ReportAcceptancePage } from '@/pages/settlement/ReportAcceptancePage';
export const settlementRoutes = [
 { path:'projects/:id/internal-acceptance',element:<AcceptancePage key="internal" kind="内部初验"/> },
 { path:'projects/:id/supplier-acceptance',element:<AcceptancePage key="supplier" kind="供应商验收"/> },
 { path:'projects/:id/customer-acceptance',element:<AcceptancePage key="customer" kind="客户终验"/> },
 { path:'projects/:id/report-acceptance',element:<ReportAcceptancePage/> },
];
