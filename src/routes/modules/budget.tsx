import { WbsPlanningPage } from '@/pages/budget/WbsPlanningPage';
import { MilestonePlanningPage } from '@/pages/budget/MilestonePlanningPage';
import { PlanReviewPage } from '@/pages/budget/PlanReviewPage';
export const budgetRoutes=[
 {path:'projects/:id/wbs',element:<WbsPlanningPage/>},
 {path:'projects/:id/milestones',element:<MilestonePlanningPage/>},
 {path:'projects/:id/plan-review',element:<PlanReviewPage/>},
];
