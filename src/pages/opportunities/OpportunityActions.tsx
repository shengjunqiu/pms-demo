import { useActionAccess } from '@/hooks/useActionAccess';
import { App, Button, Dropdown, Space, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { canManageOpportunity, opportunityLocked, opportunityMeta } from '@/mock/opportunities';
import { initiationPrerequisites } from '@/mock/initiation';
import { useAppStore } from '@/store/useAppStore';
import type { Opportunity } from '@/models/types';
export function OpportunityActions({ opportunity: o, compact = false }: { opportunity: Opportunity; compact?: boolean }) {
 const {canDo}=useActionAccess();
  const { data, dispatch } = useBusinessStore(); const actor = useAppStore(s => s.currentUser); const navigate = useNavigate(); const { message } = App.useApp();
  const manage = canManageOpportunity(data,o,actor); const readonly = ['已转立项','已终止'].includes(o.status); const missing = initiationPrerequisites(data,o);
  const start = () => { try { if (opportunityMeta(data,o).assessments.at(-1)?.status !== '评估中') dispatch({type:'start-opportunity-assessment',id:o.id},actor); navigate(`/opportunities/${o.id}/evaluation`); } catch(e) { message.error((e as Error).message); } };
  // 暂缓/已终止结论统一在商机评估页的「结束办理」区完成（B4 收敛），此处仅提供入口。
  const conclude = () => navigate(`/opportunities/${o.id}/evaluation`);
  const compactItems = manage ? [
    {key:'edit',label:'编辑',disabled:opportunityLocked(data,o)||!canDo('save-opportunity',o.id),onClick:()=>navigate(`/opportunities/${o.id}/edit`)},
    ...(!readonly ? [
      {key:'assessment',label:'发起评估',disabled:['拟立项','方案评审中'].includes(o.status)||(opportunityMeta(data,o).assessments.at(-1)?.status!=='评估中'&&!canDo('start-opportunity-assessment',o.id)),onClick:start},
      {key:'conclusion',label:'暂缓/终止',disabled:!canDo('conclude-opportunity',o.id),onClick:conclude},
    ] : []),
    {key:'initiation',label:<Tooltip title={missing.join('；')}>发起立项</Tooltip>,disabled:missing.length>0,onClick:()=>navigate(`/initiation/apply?opportunityId=${o.id}`)},
  ] : [];
  return <>{compact ? <Space size={0}><Button type="link" size="small" onClick={()=>navigate(`/opportunities/${o.id}`)}>查看</Button>{manage&&<Dropdown trigger={['click']} menu={{items:compactItems}}><Button type="link" size="small" aria-label={`办理${o.name}`}>办理⌄</Button></Dropdown>}</Space> : <Space wrap size={compact ? 0 : 8}>
    {compact && <Button type="link" size="small" onClick={() => navigate(`/opportunities/${o.id}`)}>查看</Button>}
    {manage && <><Tooltip title={opportunityLocked(data,o) ? '已冻结或进入拟立项，关键数据只读' : ''}><Button type={compact?'link':'default'} size={compact?'small':'middle'} disabled={opportunityLocked(data,o)||!canDo('save-opportunity',o.id)} onClick={() => navigate(`/opportunities/${o.id}/edit`)}>编辑</Button></Tooltip>
      {!readonly && <><Button type={compact?'link':'primary'} size={compact?'small':'middle'} disabled={['拟立项','方案评审中'].includes(o.status)||(opportunityMeta(data,o).assessments.at(-1)?.status!=='评估中'&&!canDo('start-opportunity-assessment',o.id))} onClick={start}>发起评估</Button>
        <Button type={compact?'link':'default'} size={compact?'small':'middle'} disabled={!canDo('conclude-opportunity',o.id)} onClick={conclude}>暂缓/终止</Button></>}
      <Tooltip title={missing.join('；')}><span><Button size={compact?'small':'middle'} disabled={missing.length>0} onClick={() => navigate(`/initiation/apply?opportunityId=${o.id}`)}>发起立项</Button></span></Tooltip></>}
  </Space>}</>;
}
