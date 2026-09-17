import { lazyPage } from '@/routes/lazyPage';

const InitiationApplyPage = lazyPage(() => import('@/pages/initiation/InitiationApplyPage'), 'InitiationApplyPage');
const InitiationReviewPage = lazyPage(() => import('@/pages/initiation/InitiationReviewPage'), 'InitiationReviewPage');
const InitiationRiskPage = lazyPage(() => import('@/pages/initiation/InitiationRiskPage'), 'InitiationRiskPage');
const InitiationDecisionPage = lazyPage(() => import('@/pages/initiation/InitiationDecisionPage'), 'InitiationDecisionPage');
const ChangesPage = lazyPage(() => import('@/pages/changes/ChangesPage'), 'ChangesPage');
const ChangeFormPage = lazyPage(() => import('@/pages/changes/ChangeFormPage'), 'ChangeFormPage');
const TeamPage = lazyPage(() => import('@/pages/budget/TeamPage'), 'TeamPage');
const BudgetEditorPage = lazyPage(() => import('@/pages/budget/BudgetEditorPage'), 'BudgetEditorPage');
const EstimateBudgetPage = lazyPage(() => import('@/pages/budget/EstimateBudgetPage'), 'EstimateBudgetPage');
const ProjectBudgetReviewPage = lazyPage(() => import('@/pages/budget/ProjectBudgetReviewPage'), 'ProjectBudgetReviewPage');
const BaselinePage = lazyPage(() => import('@/pages/budget/BaselinePage'), 'BaselinePage');
const WbsPlanningPage = lazyPage(() => import('@/pages/budget/WbsPlanningPage'), 'WbsPlanningPage');
const MilestonePlanningPage = lazyPage(() => import('@/pages/budget/MilestonePlanningPage'), 'MilestonePlanningPage');
const PlanReviewPage = lazyPage(() => import('@/pages/budget/PlanReviewPage'), 'PlanReviewPage');

export const budgetRoutes=[
 {path:'initiation/apply',element:<InitiationApplyPage/>},
 {path:'initiation/review',element:<InitiationReviewPage/>},
 {path:'initiation/:id/risk-assessment',element:<InitiationRiskPage/>},
 {path:'initiation/:id/decision',element:<InitiationDecisionPage/>},
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
