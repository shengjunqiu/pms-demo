import { OpportunityScope } from '@/pages/opportunities/OpportunityScope';
import { EarlyInvestmentPage } from '@/pages/opportunities/EarlyInvestmentPage';
import { EarlyInvestmentsPage } from '@/pages/opportunities/EarlyInvestmentsPage';
import { EstimatePage } from '@/pages/opportunities/EstimatePage';
import { EstimateComparePage } from '@/pages/opportunities/EstimateComparePage';
import { SolutionPage } from '@/pages/opportunities/SolutionPage';
import { TechCostPage } from '@/pages/opportunities/TechCostPage';
import { PresalesReviewPage } from '@/pages/opportunities/PresalesReviewPage';
import { OpportunitiesPage } from '@/pages/opportunities/OpportunitiesPage';
import { OpportunityFormPage } from '@/pages/opportunities/OpportunityFormPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { OpportunityAssessmentPage } from '@/pages/opportunities/OpportunityAssessmentPage';
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
