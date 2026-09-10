import { SolutionPage } from '@/pages/opportunities/SolutionPage';
import { TechCostPage } from '@/pages/opportunities/TechCostPage';
import { PresalesReviewPage } from '@/pages/opportunities/PresalesReviewPage';
import { OpportunitiesPage } from '@/pages/opportunities/OpportunitiesPage';
import { OpportunityFormPage } from '@/pages/opportunities/OpportunityFormPage';
import { OpportunityDetailPage } from '@/pages/opportunities/OpportunityDetailPage';
import { OpportunityAssessmentPage } from '@/pages/opportunities/OpportunityAssessmentPage';
export const opportunityRoutes = [
  { path:'opportunities/:id/solution', element:<SolutionPage/> },
  { path:'opportunities/:id/tech-cost', element:<TechCostPage/> },
  { path:'opportunities/:id/review', element:<PresalesReviewPage/> },
  { path:'opportunities', element:<OpportunitiesPage/> },
  { path:'opportunities/new', element:<OpportunityFormPage key="new"/> },
  { path:'opportunities/:id/edit', element:<OpportunityFormPage key="edit"/> },
  { path:'opportunities/:id', element:<OpportunityDetailPage/> },
  { path:'opportunities/:id/evaluation', element:<OpportunityAssessmentPage/> },
];
