import { useState } from 'react';
import { Button, Card, Empty, Select, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BudgetApprovalPage } from '@/pages/approvals/BudgetApprovalPage';
import { StateView } from '@/components/common/StateView';
import { usePlanning } from './usePlanning';
import { PlanningHeader } from './PlanningLayout';
export function ProjectBudgetReviewPage(){const c=usePlanning(),navigate=useNavigate();const [selected,setSelected]=useState<string>();if(!c.project)return <StateView type="404"/>;if(!c.allowed||!['project-manager','pmo','finance','executive','admin'].includes(c.actor.role))return <StateView type="403"/>;const items=c.data.approvals.filter(a=>a.projectId===c.project!.id&&a.kind==='budget');const approval=items.find(a=>a.id===selected)??items.at(-1);return <><PlanningHeader title="YS-11 预算审批详情" context={c}/><Card size="small" style={{marginBottom:16}}><Space><Select value={approval?.id} style={{width:330}} placeholder="选择预算审批版本" options={items.map(a=>({value:a.id,label:`${a.id} / ${a.status}${a.baselineConfirmedAt?' / 基线已生效':''}`}))} onChange={setSelected}/><Button onClick={()=>navigate(`/projects/${c.project!.id}/baseline`)}>查看基线确认与版本</Button></Space></Card>{approval?<BudgetApprovalPage approvalId={approval.id}/>:<Empty description="本项目尚未提交预算审批"><Button type="primary" onClick={()=>navigate(`/projects/${c.project!.id}/budget`)}>编制预算</Button></Empty>}</>;}
