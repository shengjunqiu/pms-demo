import {ChangesPage} from '@/pages/changes/ChangesPage';
import {ChangeFormPage} from '@/pages/changes/ChangeFormPage';
import {TeamPage} from '@/pages/budget/TeamPage';
import {BudgetEditorPage} from '@/pages/budget/BudgetEditorPage';
import {EstimateBudgetPage} from '@/pages/budget/EstimateBudgetPage';
import {ProjectBudgetReviewPage} from '@/pages/budget/ProjectBudgetReviewPage';
import {BaselinePage} from '@/pages/budget/BaselinePage';
import { WbsPlanningPage } from '@/pages/budget/WbsPlanningPage';
import { MilestonePlanningPage } from '@/pages/budget/MilestonePlanningPage';
import { PlanReviewPage } from '@/pages/budget/PlanReviewPage';
export const budgetRoutes=[
 {path:'project-changes',element:<ChangesPage/>},
 {path:'project-changes/new',element:<ChangeFormPage/>},
 {path:'projects/:id/team',element:<TeamPage/>},
 {path:'projects/:id/budget',element:<BudgetEditorPage/>},
 {path:'projects/:id/estimate-budget',element:<EstimateBudgetPage/>},
 {path:'projects/:id/budget/review',element:<ProjectBudgetReviewPage/>},
 {path:'projects/:id/baseline',element:<BaselinePage/>},
 {path:'projects/:id/wbs',element:<WbsPlanningPage/>},
 {path:'projects/:id/milestones',element:<MilestonePlanningPage/>},
 {path:'projects/:id/plan-review',element:<PlanReviewPage/>},
];
