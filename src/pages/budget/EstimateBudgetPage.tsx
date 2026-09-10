import { Button, Card, Descriptions, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { StateView } from '@/components/common/StateView';
import { usePlanning } from './usePlanning';
import { PlanningHeader } from './PlanningLayout';
import { BudgetSummary, BudgetComparisonTable } from './BudgetSummary';
import { getBudgetDraft, toBudgetVersion } from '@/mock/budget-drafts';
import { projectEstimate } from '@/mock/versions';
export function EstimateBudgetPage(){const c=usePlanning(),navigate=useNavigate();if(!c.project)return <StateView type="404"/>;if(!c.allowed||!['project-manager','pmo','finance','executive','admin'].includes(c.actor.role))return <StateView type="403"/>;const p=c.project,estimate=projectEstimate(p,c.data.estimates);if(!estimate)return <StateView type="empty" title="缺少冻结概算"/>;const draft=getBudgetDraft(c.data,p.id),budget=toBudgetVersion(draft,c.actor);return <><PlanningHeader title="YS-10 概算预算对比" context={c}/><BudgetSummary budget={budget} estimate={estimate} income={p.revenueAmount??p.contractAmount}/><Card title="概算与预算科目对比" size="small" extra={<Space><Button onClick={()=>navigate(`/projects/${p.id}/budget`)}>调整预算</Button><Button onClick={()=>navigate(`/projects/${p.id}/budget/review`)}>预算审批</Button></Space>}><Descriptions column={2} items={[{key:'estimate',label:'来源概算',children:`${estimate.id} / ${estimate.version}`},{key:'budget',label:'预算版本',children:budget.version},{key:'reason',label:'超概算说明',children:draft.reason||'暂无'},{key:'mitigation',label:'措施与影响',children:draft.mitigation||'暂无'}]}/><p style={{color:"#64748b"}}>按统一叶子科目核对 · 金额单位：万元 · 正差额表示预算增加</p><BudgetComparisonTable budget={budget} estimate={estimate}/></Card></>;}
