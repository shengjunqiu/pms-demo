import { OpportunityScope } from '@/pages/opportunities/OpportunityScope';
import { lazyPage } from '@/routes/lazyPage';

const EarlyInvestmentPage = lazyPage(() => import('@/pages/opportunities/EarlyInvestmentPage'), 'EarlyInvestmentPage');
const EarlyInvestmentsPage = lazyPage(() => import('@/pages/opportunities/EarlyInvestmentsPage'), 'EarlyInvestmentsPage');
const EstimatePage = lazyPage(() => import('@/pages/opportunities/EstimatePage'), 'EstimatePage');
const EstimateComparePage = lazyPage(() => import('@/pages/opportunities/EstimateComparePage'), 'EstimateComparePage');
const SolutionPage = lazyPage(() => import('@/pages/opportunities/SolutionPage'), 'SolutionPage');
const TechCostPage = lazyPage(() => import('@/pages/opportunities/TechCostPage'), 'TechCostPage');
const PresalesReviewPage = lazyPage(() => import('@/pages/opportunities/PresalesReviewPage'), 'PresalesReviewPage');
const OpportunitiesPage = lazyPage(() => import('@/pages/opportunities/OpportunitiesPage'), 'OpportunitiesPage');
const OpportunityFormPage = lazyPage(() => import('@/pages/opportunities/OpportunityFormPage'), 'OpportunityFormPage');
const OpportunityDetailPage = lazyPage(() => import('@/pages/opportunities/OpportunityDetailPage'), 'OpportunityDetailPage');
const OpportunityAssessmentPage = lazyPage(() => import('@/pages/opportunities/OpportunityAssessmentPage'), 'OpportunityAssessmentPage');

export const opportunityRoutes = [
  { path:'opportunities/:id/early-investment', element:<OpportunityScope><EarlyInvestmentPage/></OpportunityScope> },
  { path:'early-investments', element:<OpportunityScope><EarlyInvestmentsPage/></OpportunityScope> },
  { path:'opportunities/:id/estimate', element:<OpportunityScope><EstimatePage/></OpportunityScope> },
  { path:'opportunities/:id/estimate/compare', element:<OpportunityScope><EstimateComparePage/></OpportunityScope> },
  { path:'opportunities/:id/solution', element:<OpportunityScope><SolutionPage/></OpportunityScope> },
  { path:'opportunities/:id/tech-cost', element:<OpportunityScope><TechCostPage/></OpportunityScope> },
  { path:'opportunities/:id/review', element:<OpportunityScope><PresalesReviewPage/></OpportunityScope> },
  { path:'opportunities', element:<OpportunityScope><OpportunitiesPage/></OpportunityScope> },
  { path:'opportunities/new', element:<OpportunityScope><OpportunityFormPage key="new"/></OpportunityScope> },
  { path:'opportunities/:id/edit', element:<OpportunityScope><OpportunityFormPage key="edit"/></OpportunityScope> },
  { path:'opportunities/:id', element:<OpportunityScope><OpportunityDetailPage/></OpportunityScope> },
  { path:'opportunities/:id/evaluation', element:<OpportunityScope><OpportunityAssessmentPage/></OpportunityScope> },
];
