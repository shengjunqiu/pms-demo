import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewSensitiveField } from '@/mock/configuration-access';
import { presalesWorkspace } from '@/mock/presales';
import { useState } from 'react';
import { Alert, App, Button, Card, Col, DatePicker, Descriptions, Empty, Form, Input, Modal, Row, Space, Table, Tabs, Tag, Timeline } from 'antd';
import {
  CloseCircleFilled,
  ExclamationCircleFilled,
  FileTextOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useBusinessStore } from '@/mock/business';
import { assessmentSummary, canManageOpportunity, canViewOpportunity, DIMENSIONS, opportunityMeta } from '@/mock/opportunities';
import { initiationPrerequisites } from '@/mock/initiation';
import { useAppStore } from '@/store/useAppStore';
import { PageSection } from '@/components/common/PageSection';
import { PageHeader } from '@/components/common/PageHeader';
import { StateView } from '@/components/common/StateView';
import { MoneyText } from '@/components/common/MoneyText';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { OpportunityActions } from './OpportunityActions';
export function OpportunityDetailPage() {
 const {canDo}=useActionAccess();
  const {id}=useParams();const {data,dispatch}=useBusinessStore();const actor=useAppStore(s=>s.currentUser);const {message}=App.useApp();const [follow,setFollow]=useState(false);const [activeTab, setActiveTab] = useState('overview');const [form]=Form.useForm();
  const o=data.opportunities.find(o=>o.id===id);if(!o)return <StateView type="404"/>;if(!canViewOpportunity(data,o,actor))return <StateView type="403"/>;
  const showMargin=canViewSensitiveField(data,actor,'margin');const m=opportunityMeta(data,o);const presales=presalesWorkspace(data,o.id);const latestReview=presales.reviews.at(-1);const s=assessmentSummary(o,m);const missing=initiationPrerequisites(data,o);const estimate=data.estimates.find(e=>e.id===o.currentEstimateVersionId);const project=data.projects.find(p=>p.opportunityId===o.id);const sensitive=actor.role!=='project-manager';
  const basic=<Descriptions size="small" column={3} items={[{key:'customer',label:'客户',children:o.customerName},{key:'owner',label:'商机负责人',children:o.ownerName},{key:'dept',label:'主办部门',children:o.departmentName},{key:'type',label:'项目类型',children:m.projectType},{key:'source',label:'商机来源',children:m.source},{key:'region',label:'区域 / 业务线',children:`${m.region} / ${m.businessLine}`},{key:'amount',label:'预计金额',children:<><MoneyText value={o.estimatedAmount}/> 万元</>},{key:'sign',label:'预计签约',children:o.expectedSignDate||'未确定'},{key:'desc',label:'业务背景与需求',span:3,children:m.description},{key:'comp',label:'竞争情况',span:3,children:m.competition},{key:'files',label:'客户材料',span:3,children:m.attachments.join('、')||'尚未提交附件'}]}/>;
  const evaluation=<><Space style={{marginBottom:16}}><Link to={`/opportunities/${o.id}/evaluation`}>进入商机初步评估</Link><Tag>{m.assessments.length} 轮记录</Tag></Space>{m.assessments.length?<Table size="small" rowKey="id" pagination={false} dataSource={[...m.assessments].reverse()} columns={[{title:'评估版本',render:(_,r)=>`V${r.version}`},{title:'状态',dataIndex:'status'},{title:'综合结论',dataIndex:'conclusion',render:v=>v??'未确认'},{title:'评分',dataIndex:'score',render:v=>v??'—'},{title:'风险等级',dataIndex:'riskLevel'},{title:'原因 / 意见',dataIndex:'reason'},{title:'确认日期',dataIndex:'confirmedAt'}]}/>:<Empty description="尚无初步评估记录"/>}</>;
  const businessTab=(label:string,path:string,content:React.ReactNode)=><><Space style={{marginBottom:16}}><Link to={`/opportunities/${o.id}/${path}`}>进入{label}</Link></Space>{content}</>;
  return <><PageHeader item={PAGE_MANIFEST.find(p=>p.id==='GS-03')} title={o.name} breadcrumbs={[{title:'商机台账',href:'/opportunities'},{title:'商机详情'}]} description={`${o.code} · ${o.customerName} · 负责人 ${o.ownerName}`} tags={[<Tag color={o.status==='已终止'?'red':o.status==='暂缓'?'orange':'blue'}>{o.status}</Tag>]} extra={<OpportunityActions opportunity={o}/>}/>
    {m.termination&&<Alert style={{marginBottom:16}} showIcon type="warning" message={`已终止 · ${m.termination.reason}`} description={`成本处置：${m.termination.costDisposition||'无投入'}；退出复盘：${m.termination.retrospective||'无'}。历史投入 ${m.termination.costSnapshot} 万元继续保留。`}/>}
    {o.status==='暂缓'&&m.pauses.at(-1)&&<Alert style={{marginBottom:16}} type="warning" showIcon message={`暂缓原因：${m.pauses.at(-1)!.reason}`} description={`复评日期 ${m.pauses.at(-1)!.reviewDate} · 责任人 ${m.pauses.at(-1)!.ownerName}；台账按演示日提醒。`}/>}
    <PageSection className="pms-record-summary"><Descriptions size="small" column={3} items={[
      {key:'amount',label:'预计金额',children:<><MoneyText value={o.estimatedAmount}/> 万元</>},
      {key:'date',label:'预计签约',children:o.expectedSignDate||'未确定'},
      {key:'owner',label:'主办部门',children:o.departmentName},
    ]}/></PageSection>
    <PageSection><Tabs activeKey={activeTab} onChange={setActiveTab} items={[
      {
        key: 'overview',
        label: '概览',
        children: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            {/* 1. 顶部两列：立项条件卡片 + 评估与经营摘要卡片 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  className="h-full"
                  title={
                    <Space size={8}>
                      <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                      <span style={{ fontWeight: 600 }}>转立项准入检查</span>
                    </Space>
                  }
                  extra={
                    project ? (
                      <Tag color="blue" style={{ margin: 0, borderRadius: 10 }}>
                        已转立项
                      </Tag>
                    ) : (
                      <Tag
                        color={missing.length === 0 ? 'blue' : 'warning'}
                        style={{ margin: 0, borderRadius: 10 }}
                      >
                        {missing.length === 0 ? '准入条件已齐备' : `待补齐 ${missing.length} 项`}
                      </Tag>
                    )
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {project ? (
                      <div
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 8,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#047857', fontWeight: 600, fontSize: 13 }}>
                          <SafetyCertificateOutlined />
                          <span>已成功转入正式项目</span>
                        </div>
                        <div style={{ marginLeft: 24, fontSize: 12, color: '#065f46' }}>
                          项目名称：
                          <Link to={`/projects/${project.id}`} style={{ fontWeight: 600 }}>
                            {project.name}
                          </Link>
                        </div>
                      </div>
                    ) : missing.length > 0 ? (
                      <div
                        style={{
                          background: '#fffbe6',
                          border: '1px solid #ffe58f',
                          borderRadius: 8,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#d46b08', fontWeight: 600, fontSize: 13 }}>
                          <ExclamationCircleFilled />
                          <span>尚未满足发起立项条件</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {missing.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#8c4e03' }}>
                              <CloseCircleFilled style={{ color: '#ff4d4f', marginTop: 3, flexShrink: 0 }} />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert
                        type="success"
                        showIcon
                        message="立项前置条件全部满足"
                        description="初评已拟立项、方案评审通过且已完成冻结概算，可随时发起正式立项流程。"
                      />
                    )}

                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#fafbfc',
                        border: '1px solid #f1f5f9',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#64748b',
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: 2 }}>立项门禁规则：</div>
                      初评转“拟立项”后系统自动创建方案任务；完成方案编制、专家评审及 PMO 冻结概算后方可正式发起立项。
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  className="h-full"
                  title={
                    <Space size={8}>
                      <AuditOutlined style={{ color: '#1677ff' }} />
                      <span style={{ fontWeight: 600 }}>评估与经营摘要</span>
                    </Space>
                  }
                  extra={
                    s.round && (
                      <Tag color={s.riskLevel === '高' ? 'error' : s.riskLevel === '中' ? 'warning' : 'blue'} style={{ margin: 0 }}>
                        初评风险: {s.riskLevel}
                      </Tag>
                    )
                  }
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={{ padding: '10px 12px', background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>初评综合评分</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--pms-font-mono)', color: '#0f172a' }}>
                        {s.score ?? '—'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>初评预估毛利率</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--pms-font-mono)', color: '#0f172a' }}>
                        {!showMargin ? '已隐藏' : s.marginRate !== null ? `${s.marginRate.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>概算总成本</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                        {sensitive ? (
                          estimate?.totalCost != null ? (
                            <><MoneyText value={estimate.totalCost} /> 万元</>
                          ) : '未编制'
                        ) : '无权限'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>提前投入使用/额度</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        <MoneyText value={o.earlyInvestmentUsed} /> / <MoneyText value={o.earlyInvestmentQuota} /> 万元
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>指定概算版本：</span>
                      <span>
                        {estimate ? (
                          <Link to={`/opportunities/${o.id}/estimate`} style={{ fontWeight: 500 }}>
                            {estimate.version} · <Tag color={estimate.isFrozen ? 'blue' : 'default'} style={{ margin: 0, fontSize: 11 }}>{estimate.isFrozen ? '已冻结' : '草稿'}</Tag>
                          </Link>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>尚未指定</span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>当前方案版本：</span>
                      <span>
                        {presales.solutionVersions.at(-1) ? (
                          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                            V{presales.solutionVersions.at(-1)!.version}
                          </Tag>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>尚未提交评审</span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>最近专家评审：</span>
                      <span style={{ fontWeight: 500, color: latestReview?.status === '评审中' ? '#1677ff' : latestReview?.status === '整改后复审' ? '#fa8c16' : latestReview?.status === '不通过' ? '#cf1322' : '#2563eb' }}>
                        {latestReview?.status ?? '尚无结论'}
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 2. 中部：主要风险项 */}
            <Card
              size="small"
              title={
                <Space size={8}>
                  <ExclamationCircleFilled style={{ color: '#fa8c16' }} />
                  <span style={{ fontWeight: 600 }}>初评风险识别</span>
                </Space>
              }
            >
              {DIMENSIONS.filter((d) => s.round?.opinions[d.key]?.risk).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                  {DIMENSIONS.filter((d) => s.round?.opinions[d.key]?.risk).map((d) => (
                    <div
                      key={d.key}
                      style={{
                        padding: '10px 12px',
                        background: '#fafbfc',
                        border: '1px solid #f1f5f9',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Tag color="orange" style={{ margin: 0, fontWeight: 500 }}>
                          {d.name}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>评估结论: {s.round?.opinions[d.key]?.conclusion ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                        {s.round!.opinions[d.key]!.risk}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前评估尚未登记风险项" style={{ margin: '8px 0' }} />
              )}
            </Card>

            {/* 3. 底部：折叠卡片化基础信息 */}
            <Card
              size="small"
              title={
                <Space size={8}>
                  <FileTextOutlined style={{ color: '#64748b' }} />
                  <span style={{ fontWeight: 600 }}>商机基础信息、背景与材料</span>
                </Space>
              }
            >
              {basic}
            </Card>
          </div>
        ),
      },
      {key:'follow',label:'跟进记录',children:<>{canManageOpportunity(data,o,actor)&&!['已转立项','已终止'].includes(o.status)&&<Button type="primary" disabled={!canDo('follow-opportunity',o.id)} style={{marginBottom:16}} onClick={()=>{form.resetFields();setFollow(true);}}>追加跟进</Button>}{m.followups.length?<Timeline items={[...m.followups].reverse().map(f=>({children:<><strong>{f.date} · {f.author}</strong><p>客户沟通：{f.communication}</p><p>需求变化：{f.requirementChange||'无'}；商务进展：{f.commercialProgress||'无'}</p><p>下一步：{f.nextPlan}</p></>}))}/>:<Empty description="尚无跟进记录"/>}</>},
      {key:'assessment',label:'商机评估',children:evaluation},
      {key:'solution',label:'需求与方案',children:businessTab('需求调研与解决方案','solution',m.solutionTask?<Descriptions column={1} items={[{key:'id',label:'自动创建方案任务',children:m.solutionTask.id},{key:'owner',label:'任务责任人',children:m.solutionTask.ownerName},{key:'due',label:'计划完成',children:m.solutionTask.dueDate},{key:'source',label:'来源评估',children:m.solutionTask.assessmentId},{key:'status',label:'任务状态',children:m.solutionTask.status}]}/>:<Empty description="尚无方案任务，拟立项后自动创建"/>)},
      {key:'tech',label:'技术成本评估',children:businessTab('技术与成本评估','tech-cost',<p>技术结论：{presales.costDraft?.feasibility??s.round?.opinions.technology?.conclusion??'尚无技术评估'}。{presales.costDraft?.architecture??s.round?.opinions.technology?.note??''}</p>)},
      {key:'review',label:'专家评审',children:businessTab('方案与成本专家评审','review',latestReview?<Descriptions column={1} items={[{key:'round',label:'评审轮次',children:`第${latestReview.round}轮 · ${latestReview.status}`},{key:'version',label:'引用方案 / 成本',children:`${latestReview.solutionVersionId} / ${latestReview.costVersionId}`},{key:'reason',label:'专家综合意见',children:latestReview.conclusionReason??'评审中'},{key:'correction',label:'整改事项',children:latestReview.corrections.map(c=>c.item).join('；')||'无'}]}/>:<Empty description="尚无可引用的专家评审记录"/>)},
      {key:'estimate',label:'项目概算',children:businessTab('项目概算编制','estimate',<Table size="small" rowKey="id" dataSource={data.estimates.filter(e=>e.opportunityId===o.id)} pagination={false} columns={[{title:'版本',dataIndex:'version'},{title:'状态',render:(_,e)=><Tag color={e.isFrozen?'blue':'default'}>{e.isFrozen?'已冻结':'草稿'}</Tag>},{title:'总成本（万元）',render:(_,e)=>sensitive?<MoneyText value={e.totalCost}/>:'已隐藏'},{title:'毛利率',render:(_,e)=>showMargin?`${e.grossMarginRate.toFixed(1)}%`:'已隐藏'},{title:'创建日期',dataIndex:'createdAt'}]}/>)},
      {key:'investment',label:'提前投入',children:businessTab('提前投入申请','early-investment',<Descriptions items={[{key:'quota',label:'批准额度',children:<><MoneyText value={o.earlyInvestmentQuota}/> 万元</>},{key:'used',label:'已使用',children:<><MoneyText value={o.earlyInvestmentUsed}/> 万元</>},{key:'rest',label:'剩余额度',children:<><MoneyText value={o.earlyInvestmentQuota-o.earlyInvestmentUsed}/> 万元</>}]}/>)},
      {key:'audit',label:'操作记录',children:<Timeline items={data.audit.filter(a=>a.target===o.id).map(a=>({children:`${a.date} · ${a.actor} · ${({'save-opportunity':'保存商机','start-opportunity-assessment':'发起初步评估','save-opportunity-dimension':'保存专业意见','conclude-opportunity':'确认商机决策','follow-opportunity':'追加跟进','presales-save-solution':'保存方案草稿','presales-research':'追加需求调研','presales-save-cost':'保存技术成本','presales-finance-check':'财务成本核对','presales-submit-review':'发起专家评审','presales-expert-opinion':'提交专家意见','presales-review-decision':'记录专家评审结论','presales-correction-reply':'追加整改回复','estimate-create-draft':'生成概算草稿','estimate-save-draft':'保存概算草稿','estimate-publish':'生成概算版本','estimate-freeze':'PMO确认冻结概算','save-early-investment':'保存或提交投入申请','review-early-investment':'审批投入额度','record-early-cost':'归集前期成本'} as Record<string,string>)[a.action]??a.action}`}))}/>},
    ]}/></PageSection>
    <Modal title="追加商机跟进" open={follow} okButtonProps={{disabled:!canManageOpportunity(data,o,actor)||['已转立项','已终止'].includes(o.status)||!canDo('follow-opportunity',o.id)}} onCancel={()=>setFollow(false)} okText="保存跟进" onOk={async()=>{try{const v=await form.validateFields();dispatch({type:'follow-opportunity',id:o.id,...v,date:v.date.format('YYYY-MM-DD')},actor);setFollow(false);message.success('已追加跟进，历史记录保留');}catch(e){if(e instanceof Error)message.error(e.message);}}}><Form form={form} layout="vertical" disabled={!canManageOpportunity(data,o,actor)||['已转立项','已终止'].includes(o.status)||!canDo('follow-opportunity',o.id)} initialValues={{date:dayjs('2026-09-09')}}><Form.Item name="date" label="跟进日期" rules={[{required:true}]}><DatePicker maxDate={dayjs('2026-09-09')}/></Form.Item>{[{key:'communication',label:'客户沟通',required:true},{key:'requirementChange',label:'需求变化'},{key:'commercialProgress',label:'商务进展'},{key:'nextPlan',label:'下一步计划',required:true}].map(x=><Form.Item key={x.key} name={x.key} label={x.label} rules={[{required:x.required,whitespace:true}]}><Input.TextArea rows={2}/></Form.Item>)}</Form></Modal>
  </>;
}
