import { Alert, Col, Row, Statistic, Card, Table } from 'antd';
import type { BudgetVersion, EstimateVersion } from '@/models/types';
import { budgetOverruns, BUDGET_RULE } from '@/mock/budget-drafts';
import { money, percentage } from '@/utils/money';
export function BudgetSummary({budget,estimate,income}:{budget:BudgetVersion;estimate:EstimateVersion;income:number}){
 const diff=money(budget.totalAmount-estimate.totalCost),over=budgetOverruns(budget,estimate);
 return <><Row gutter={12} style={{marginBottom:16}}>{[{title:'冻结概算（万元）',value:estimate.totalCost},{title:'当前预算（万元）',value:budget.totalAmount},{title:'预算差异（万元）',value:diff},{title:'差异率（%）',value:percentage(diff,estimate.totalCost)??'—'},{title:'预算毛利率（%）',value:percentage(income-budget.totalAmount,income)??'—'}].map((v,i)=><Col flex="1" key={i}><Card size="small"><Statistic {...v} precision={2} valueStyle={{fontSize:20,color:i===2&&diff>0?'#cf1322':undefined}}/></Card></Col>)}</Row><Alert showIcon type={over.length?'warning':'success'} style={{marginBottom:16}} message={over.length?`超概算路径：${over.join('；')}`:'常规预算审批路径'} description={`演示规则 ${BUDGET_RULE.version}：总额超过概算，或人力/采购/外包科目超过概算${BUDGET_RULE.allowMajorSubjectIncreasePercent}%，进入集团领导/PMC审批。草稿可保存。`}/></>;
}
export function BudgetComparisonTable({budget,estimate}:{budget:BudgetVersion;estimate:EstimateVersion}){
 const ids=[...new Set([...budget.items.map(i=>i.subjectId),...estimate.items.map(i=>i.subjectId)])];const rows=ids.map(id=>{const b=budget.items.find(i=>i.subjectId===id),e=estimate.items.find(i=>i.subjectId===id);return {id,name:b?.subjectName??e?.subjectName,estimate:e?.amount??0,budget:b?.amount??0,diff:money((b?.amount??0)-(e?.amount??0))};});
 return <Table rowKey="id" size="small" dataSource={rows} pagination={false} columns={[{title:'统一叶子科目',dataIndex:'name'},{title:'概算（万元）',dataIndex:'estimate',align:'right',render:v=>v.toFixed(2)},{title:'预算（万元）',dataIndex:'budget',align:'right',render:v=>v.toFixed(2)},{title:'差异（万元）',dataIndex:'diff',align:'right',render:v=><span style={{color:v>0?'#cf1322':undefined}}>{v>0?'+':''}{v.toFixed(2)}</span>},{title:'差异率',render:(_,r)=>{const v=percentage(r.diff,r.estimate);return v===null?'—（零概算）':`${v.toFixed(1)}%`;}}]}/>;
}
