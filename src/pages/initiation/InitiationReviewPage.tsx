import { Alert, Button, Card, Col, Collapse, Descriptions, Empty, Input, List, Row, Select, Space, Table, Tabs, Tag } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { canViewInitiation, INITIATION_SIGNATURES, initiationClassification } from '@/mock/initiation';
import { PageSection } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { MoneyText } from '@/components/common/MoneyText';
import { InitiationHeader, SourceSummary, useInitiationNavigation, useInitiationText } from './InitiationShared';

// Mock 立项申请详情数据（参照 Linewell BPM 风格）
const mockInitiationDetail = {
  basicInfo: {
    opportunityCode: 'ALVY-202606-011',
    customerName: '福建软通科科有限公司',
    customerCode: 'CUST016311',
    businessManager: '郑清蒸',
    totalAmount: 16800.00,
    mainBusiness: '人工智能教育事业部',
    softwareAmount: 16800.00,
    hardwareAmount: 0.00,
    estimatedSignDate: '2026-09-30',
    contractSignDate: '2026-09-08',
    salesStatus: '直接签合同',
    internalBidNo: '',
  },
  initiationInfo: {
    initiationName: '福建软通科科有限公司智能作文教学平台项目（泉州师范学院附属小学）',
    initiationCode: 'ALVY-202606-011',
    applicant: '郑清蒸',
    applicantDept: '人工智能教育事业部',
    applyDate: '2026-09-09',
    projectLevel: 'C',
    initiationDate: '2026-09-09',
    isConfidential: false,
    projectType: '软件',
    isPPP: false,
    unsignedFirstInvest: false,
    province: '福建省',
    city: '泉州市',
    district: '市辖区',
    stage: '合同签订',
    customerInitiated: true,
  },
  handoverInfo: {
    plannedStartDate: '2026-09-30',
    presalesStaff: 'ydandan0',
    futureInitiationDesc: '语文作文智能教学服务，致力于小学到高中各学段人文作文教学质量提升。基于人工智能大模型和自然语言处理技术、文字识别技术、智能评分、评测算法、多模态AI生成技术，深度赋能语文教学，旨在改变学生原有书写方式和写作习惯的基础上，实践作文采批、数据分析、智能批改、课程讲解、范文推荐、作品创作的完整流程数字化管理，帮助教师将作文判阅更高效化个性化，指导激发学生写作兴趣，使得学校作文教学管理水平精准提升，实现语文学科教学方式的改进，提高教育教学有效性，达到分层教学与因材施教的目标。',
    handoverDesc: '本月需完成该校全体语文教师开展系统操作专项培训，确保教师熟练掌握平台功能。',
  },
  deliveryInfo: {
    deliveryOrg: '人工智能教育事业部',
    industryCategory: 'AI智能教育',
    procurementOrg: '福建威启智学教育科技有限公司',
    responsibleDept: '人工智能教育事业部',
    pmSource: '部门指派',
    projectManager: '郑清蒸',
    projectDirector: '朱佳乐',
    acceptDeliveryConfirmation: false,
    projectTechnicalManager: '',
  },
  implementationDepts: [
    { category: '软件交付', deptName: '人工智能教育事业部', allocationRatio: 100, initiationCode: 'ALVY-202606-011' },
  ],
  deliverables: [
    { stage: '立项', name: '项目文档目录', code: 'soft-001', required: true, phaseOrder: 0 },
    { stage: '立项', name: '项目策划报告', code: 'soft-002', required: true, phaseOrder: 0 },
    { stage: '立项', name: '合同', code: 'soft-003', required: true, phaseOrder: 0 },
    { stage: '立项', name: '方案（项目的建设方案）', code: 'soft-004', required: true, phaseOrder: 0 },
    { stage: '立项', name: '招投标文件', code: 'soft-005', required: true, phaseOrder: 0 },
    { stage: '立项', name: '项目实施计划（初版）', code: 'soft-006', required: true, phaseOrder: 0 },
    { stage: '立项', name: '项目联系卡', code: 'soft-007', required: true, phaseOrder: 0 },
    { stage: '开工', name: '内部启动会会议纪要', code: 'soft-008', required: true, phaseOrder: 0 },
    { stage: '开工', name: '实施方案（含答辩记录）', code: 'soft-009', required: true, phaseOrder: 0 },
    { stage: '开工', name: '外部启动会会议纪要', code: 'soft-010', required: false, phaseOrder: 0 },
    { stage: '开工', name: '开工确认单/开工报告（纸质...）', code: 'soft-011', required: false, phaseOrder: 0 },
  ],
  approvalRecords: [
    { step: '立项信息填写发起', approver: '-', dept: '', opinion: '', date: '', status: '' },
    { step: '售前工程师', approver: '杨月丹', dept: '人工智能教育事业部', opinion: '同意', date: '2026-09-09 17:50:25', status: '同意' },
    { step: '集团项目管理部', approver: '陈秀芬', dept: '交付管理部', opinion: '同意', date: '2026-09-09 18:47:30', status: '同意' },
    { step: '直属领导', approver: '佟春将', dept: '公司领导', opinion: '同意', date: '2026-09-10 09:06:17', status: '同意' },
    { step: '行业线交付总经理', approver: '郑清蒸', dept: '人工智能教育事业部', opinion: '同意', date: '2026-09-10 09:33:44', status: '同意' },
    { step: '机构项目管理部', approver: '杨月丹', dept: '人工智能教育事业部', opinion: '同意', date: '2026-09-10 12:03:04', status: '同意' },
    { step: '实施交付部门', approver: '郑清蒸', dept: '人工智能教育事业部', opinion: '同意', date: '2026-09-11 10:33:10', status: '同意' },
    { step: '项目经理/技术经理确认', approver: '吴佳乐', dept: '人工智能教育事业部', opinion: '正在办理', date: '', status: '正在办理' },
  ],
};

export function InitiationReviewPage() {
  const { data } = useBusinessStore();
  const actor = useAppStore((s) => s.currentUser);
  const { go } = useInitiationNavigation();
  const text = useInitiationText();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? undefined;
  const activeTab = params.get('tab') ?? 'review';

  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'search' || key === 'status') next.delete('id');
    setParams(next, { replace: key === 'search' });
  };

  const accessible = data.initiations.filter((a) => canViewInitiation(data, a, actor));
  const list = accessible.filter((a) => (!status || a.status === status) && `${a.id} ${a.input.name}`.includes(search));
  const app = list.find((a) => a.id === params.get('id')) ?? list[0];
  const round = app?.rounds.at(-1);
  const rule = round ? initiationClassification(round.input, round.source, round.riskLevel ?? '低', data, round.configurationSnapshot) : undefined;
  const pending = accessible.filter((a) => !['通过', '否决', '暂缓'].includes(a.status));
  const todo = round?.status === '会签中' ? INITIATION_SIGNATURES.filter((n) => n.role === actor.role && !round.signatures.some((s) => s.node === n.node)).map((n) => n.node).join('、') || '无待签节点'
    : round?.status === '待风险评估' ? 'PMO 综合风险评估' : round?.status === '待分级' ? 'PMO 分级' : round?.status === '待决策' ? round.approvalProgress?.snapshot.nodes[round.approvalProgress.node]?.name ?? (round.path === 'PMC决策会' ? '集团领导决策' : 'PMO 决策') : '查看历史记录';

  // 基本信息表格数据
  const basicInfoItems = [
    { label: '商机/合同', children: mockInitiationDetail.basicInfo.opportunityCode },
    { label: '客户名称', children: mockInitiationDetail.basicInfo.customerName },
    { label: '客户编号', children: mockInitiationDetail.basicInfo.customerCode },
    { label: '业务经理', children: mockInitiationDetail.basicInfo.businessManager },
    { label: '总金额', children: <MoneyText value={mockInitiationDetail.basicInfo.totalAmount} /> },
    { label: '主事业部', children: mockInitiationDetail.basicInfo.mainBusiness },
    { label: '预计签单时间', children: mockInitiationDetail.basicInfo.estimatedSignDate },
    { label: '软件金额', children: <MoneyText value={mockInitiationDetail.basicInfo.softwareAmount} /> },
    { label: '销售状态', children: mockInitiationDetail.basicInfo.salesStatus },
    { label: '合同签订时间', children: mockInitiationDetail.basicInfo.contractSignDate },
    { label: '硬件金额', children: <MoneyText value={mockInitiationDetail.basicInfo.hardwareAmount} /> },
    { label: '内部转包编号', children: mockInitiationDetail.basicInfo.internalBidNo || '—' },
  ];

  // 立项信息表格数据
  const initiationInfoItems = [
    { label: '立项名称', children: mockInitiationDetail.initiationInfo.initiationName, span: 3 },
    { label: '立项编号', children: mockInitiationDetail.initiationInfo.initiationCode },
    { label: '申请人', children: mockInitiationDetail.initiationInfo.applicant },
    { label: '申请部门', children: mockInitiationDetail.initiationInfo.applicantDept },
    { label: '申请日期', children: mockInitiationDetail.initiationInfo.applyDate },
    { label: '项目分级', children: mockInitiationDetail.initiationInfo.projectLevel },
    { label: '立项日期', children: mockInitiationDetail.initiationInfo.initiationDate },
    { label: '是否涉密', children: mockInitiationDetail.initiationInfo.isConfidential ? '是' : '否' },
    { label: '项目类型', children: mockInitiationDetail.initiationInfo.projectType },
    { label: '是否PPP', children: mockInitiationDetail.initiationInfo.isPPP ? '是' : '否' },
    { label: '立项未签先投入', children: mockInitiationDetail.initiationInfo.unsignedFirstInvest ? '是' : '否' },
    { label: '省', children: mockInitiationDetail.initiationInfo.province },
    { label: '市', children: mockInitiationDetail.initiationInfo.city },
    { label: '区', children: mockInitiationDetail.initiationInfo.district },
    { label: '阶段', children: mockInitiationDetail.initiationInfo.stage },
    { label: '可研咨询机构', children: '—' },
    { label: '客户是否立项', children: mockInitiationDetail.initiationInfo.customerInitiated ? '是' : '否' },
  ];

  return (
    <>
      <InitiationHeader title="立项评审工作台" />
      
      {/* 统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[['待处理', pending.length], ['风险待确认', pending.filter((a) => a.status === '待风险评估').length], ['会签中', pending.filter((a) => a.status === '会签中').length], ['待决策', pending.filter((a) => a.status === '待决策').length]].map(([title, value]) => (
          <Col span={6} key={title}>
            <MetricStatCard title={String(title)} value={String(value)} unit="项" />
          </Col>
        ))}
      </Row>

      {/* 主 Tab：评审工作台 & 立项申请详情 */}
      <Card size="small">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => update('tab', key)}
          items={[
            {
              key: 'review',
              label: '评审工作台',
              children: (
                <Row gutter={16}>
                  <Col span={7}>
                    <PageSection title="立项项目列表" description={`当前筛选 ${list.length} 项`}>
                      <Input.Search
                        aria-label="搜索立项编号或名称"
                        placeholder="搜索编号 / 名称"
                        value={search}
                        onChange={(e) => update('search', e.target.value)}
                      />
                      <Select
                        aria-label="立项评审状态"
                        allowClear
                        style={{ width: '100%', margin: '12px 0' }}
                        placeholder="全部状态"
                        value={status}
                        onChange={(value) => update('status', value)}
                        options={['草稿', '待风险评估', '待分级', '会签中', '待决策', '整改', '通过', '否决', '暂缓'].map((value) => ({ value, label: value }))}
                      />
                      <List
                        pagination={{
                          pageSize: 8,
                          current: Number(params.get('page')) || 1,
                          onChange: (page) => update('page', String(page)),
                        }}
                        dataSource={list}
                        locale={{ emptyText: '暂无匹配申请，可调整条件或新建立项申请' }}
                        renderItem={(a) => (
                          <List.Item style={{ padding: '6px 0' }}>
                            <Button
                              aria-pressed={a.id === app?.id}
                              onClick={() => update('id', a.id)}
                              style={{
                                display: 'block',
                                width: '100%',
                                height: 'auto',
                                padding: 12,
                                whiteSpace: 'normal',
                                textAlign: 'left',
                                background: a.id === app?.id ? '#eff6ff' : '#fff',
                                borderColor: a.id === app?.id ? '#93c5fd' : '#e2e8f0',
                              }}
                            >
                              <strong>{a.input.name}</strong>
                              <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
                                {a.id} · <MoneyText value={a.input.amount} /> 万元
                              </div>
                              <Tag style={{ marginTop: 8 }}>{a.status}</Tag>
                            </Button>
                          </List.Item>
                        )}
                      />
                    </PageSection>
                  </Col>
                  <Col span={17}>
                    {app ? (
                      <PageSection title={app.input.name} extra={<Button onClick={() => go(`/initiation/apply?id=${app.id}`)}>完整申请资料</Button>}>
                        <Descriptions
                          size="small"
                          column={2}
                          items={[
                            { key: 'id', label: '申请编号', children: app.id },
                            { key: 'status', label: '状态', children: <Tag color="processing">{app.status}</Tag> },
                            { key: 'revision', label: '修订', children: app.draftRevision },
                            { key: 'amount', label: '金额', children: <><MoneyText value={app.input.amount} /> 万元</> },
                          ]}
                        />
                        {round ? (
                          <>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, margin: '8px 0 16px' }}>
                              <div style={{ color: '#64748b', fontSize: 12 }}>当前办理事项</div>
                              <strong style={{ display: 'block', margin: '6px 0 12px' }}>本人待办：{todo}</strong>
                              <Space wrap>
                                <Button type={round.status === '待风险评估' ? 'primary' : 'default'} onClick={() => go(`/initiation/${app.id}/risk-assessment`)}>综合风险报告</Button>
                                <Button type={round.status === '待风险评估' ? 'default' : 'primary'} onClick={() => go(`/initiation/${app.id}/decision`)}>进入评审决策</Button>
                                {app.projectId && <Button onClick={() => go(`/projects/${app.projectId}/team`)}>项目团队任命</Button>}
                              </Space>
                            </div>
                            <Alert
                              showIcon
                              message={`项目命中：${(round.ruleReasons.length ? round.ruleReasons : rule?.reasons)?.map((reason) => text(reason)).join('；')}，${round.path ? '进入 ' + round.path : '待 PMO 确认路径'}`}
                              description={`综合风险：${round.riskLevel ?? '待评估'}；${text(round.riskExplanation) ?? ''}`}
                            />
                            <SourceSummary source={round.source} compact />
                          </>
                        ) : (
                          <Alert message="申请尚未提交，等待主办角色补全资料" />
                        )}
                        <details style={{ marginTop: 16 }}>
                          <summary style={{ cursor: 'pointer' }}>立项必要性与范围</summary>
                          <Descriptions
                            style={{ marginTop: 12 }}
                            column={1}
                            items={[
                              { key: 'need', label: '必要性', children: text(app.input.necessity) },
                              { key: 'scope', label: '范围', children: text(app.input.scope) },
                            ]}
                          />
                        </details>
                      </PageSection>
                    ) : (
                      <PageSection>
                        <Empty description="暂无线索进入立项评审" />
                        <p style={{ color: '#64748b', textAlign: 'center' }}>从商机详情发起申请；方案评审与概算冻结后提交。</p>
                      </PageSection>
                    )}
                  </Col>
                </Row>
              ),
            },
            {
              key: 'detail',
              label: '立项申请详情',
              children: (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '16px 0' }}>
                  {/* 立项申请标题 */}
                  <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>立项申请</h2>
                    <Tag color="processing" style={{ position: 'absolute', right: 16, top: 0, fontSize: 12, padding: '2px 12px' }}>审批中</Tag>
                  </div>

                  {/* 立项信息子 Tab */}
                  <Tabs
                    defaultActiveKey="initiation-info"
                    size="small"
                    style={{ background: '#fff', borderRadius: 8, padding: '0 16px' }}
                    items={[
                      {
                        key: 'initiation-info',
                        label: '立项信息',
                        children: (
                          <div>
                            {/* 基本信息 */}
                            <Collapse
                              defaultActiveKey={['basic']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'basic',
                                  label: <span style={{ fontWeight: 600 }}>基本信息</span>,
                                  children: (
                                    <Descriptions bordered column={3} size="small" items={basicInfoItems} />
                                  ),
                                },
                              ]}
                            />

                            {/* 立项信息 */}
                            <Collapse
                              defaultActiveKey={['initiation']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'initiation',
                                  label: <span style={{ fontWeight: 600 }}>立项信息</span>,
                                  children: (
                                    <Descriptions bordered column={3} size="small" items={initiationInfoItems} />
                                  ),
                                },
                              ]}
                            />

                            {/* 交接信息 */}
                            <Collapse
                              defaultActiveKey={['handover']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'handover',
                                  label: <span style={{ fontWeight: 600 }}>交接信息</span>,
                                  children: (
                                    <Descriptions bordered column={3} size="small" items={[
                                      { label: '约定开工日期', children: mockInitiationDetail.handoverInfo.plannedStartDate },
                                      { label: '售前人员', children: mockInitiationDetail.handoverInfo.presalesStaff },
                                      { label: '未来立项说明', children: mockInitiationDetail.handoverInfo.futureInitiationDesc, span: 3 },
                                      { label: '建设内容', children: mockInitiationDetail.handoverInfo.handoverDesc, span: 3 },
                                    ]} />
                                  ),
                                },
                              ]}
                            />

                            {/* 交付信息 */}
                            <Collapse
                              defaultActiveKey={['delivery']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'delivery',
                                  label: <span style={{ fontWeight: 600 }}>交付信息</span>,
                                  children: (
                                    <Descriptions bordered column={3} size="small" items={[
                                      { label: '交付行业机构', children: mockInitiationDetail.deliveryInfo.deliveryOrg },
                                      { label: '行业归属', children: mockInitiationDetail.deliveryInfo.industryCategory },
                                      { label: '采购签约组织', children: mockInitiationDetail.deliveryInfo.procurementOrg },
                                      { label: '负责交付部门', children: mockInitiationDetail.deliveryInfo.responsibleDept },
                                      { label: '项目经理来源', children: mockInitiationDetail.deliveryInfo.pmSource },
                                      { label: '项目经理', children: mockInitiationDetail.deliveryInfo.projectManager },
                                      { label: '项目总监', children: mockInitiationDetail.deliveryInfo.projectDirector },
                                      { label: '是否接受任命确认过程交付物', children: mockInitiationDetail.deliveryInfo.acceptDeliveryConfirmation ? '是' : '否' },
                                      { label: '项目技术经理', children: mockInitiationDetail.deliveryInfo.projectTechnicalManager || '—' },
                                    ]} />
                                  ),
                                },
                              ]}
                            />

                            {/* 实施部门 */}
                            <Collapse
                              defaultActiveKey={['implementation']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'implementation',
                                  label: <span style={{ fontWeight: 600 }}>实施部门</span>,
                                  children: (
                                    <Table
                                      rowKey="category"
                                      size="small"
                                      pagination={false}
                                      dataSource={mockInitiationDetail.implementationDepts}
                                      columns={[
                                        { title: '分配类别', dataIndex: 'category' },
                                        { title: '部门名称', dataIndex: 'deptName' },
                                        { title: '分配比例(%)', dataIndex: 'allocationRatio' },
                                        { title: '立项编号', dataIndex: 'initiationCode' },
                                      ]}
                                    />
                                  ),
                                },
                              ]}
                            />

                            {/* 交付物 */}
                            <Collapse
                              defaultActiveKey={['deliverables']}
                              style={{ marginBottom: 16 }}
                              items={[
                                {
                                  key: 'deliverables',
                                  label: <span style={{ fontWeight: 600 }}>交付物</span>,
                                  children: (
                                    <Table
                                      rowKey="code"
                                      size="small"
                                      pagination={false}
                                      dataSource={mockInitiationDetail.deliverables}
                                      columns={[
                                        { title: '项目阶段', dataIndex: 'stage' },
                                        { title: '交付物名称', dataIndex: 'name' },
                                        { title: '交付物编码', dataIndex: 'code' },
                                        { title: '是否必须', dataIndex: 'required', render: (v: boolean) => v ? '是' : '否' },
                                        { title: '项目阶段程序号', dataIndex: 'phaseOrder' },
                                      ]}
                                    />
                                  ),
                                },
                              ]}
                            />

                            {/* 审批记录 */}
                            <Collapse
                              defaultActiveKey={['approval']}
                              items={[
                                {
                                  key: 'approval',
                                  label: <span style={{ fontWeight: 600 }}>审批记录</span>,
                                  children: (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                                      {mockInitiationDetail.approvalRecords.map((record, idx) => (
                                        <div key={idx} style={{ padding: '12px', background: '#fafbfc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>{record.step}</div>
                                          <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 4 }}>
                                            {record.approver !== '-' ? (
                                              <Button type="link" style={{ padding: 0, height: 'auto' }}>{record.approver}</Button>
                                            ) : <span style={{ color: '#94a3b8' }}>-</span>}
                                          </div>
                                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{record.dept}</div>
                                          {record.status && (
                                            <Tag color={record.status === '同意' ? 'success' : record.status === '正在办理' ? 'processing' : 'default'} style={{ fontSize: 11 }}>
                                              {record.status}
                                            </Tag>
                                          )}
                                          {record.date && (
                                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>{record.date}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ),
                                },
                              ]}
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'profit',
                        label: '毛利测算',
                        children: (
                          <Card size="small">
                            <Descriptions bordered column={2} size="small" items={[
                              { label: '合同金额', children: <MoneyText value={mockInitiationDetail.basicInfo.totalAmount} /> },
                              { label: '预估成本', children: <MoneyText value={mockInitiationDetail.basicInfo.totalAmount * 0.75} /> },
                              { label: '预估毛利', children: <MoneyText value={mockInitiationDetail.basicInfo.totalAmount * 0.25} /> },
                              { label: '毛利率', children: '25.00%' },
                            ]} />
                          </Card>
                        ),
                      },
                      {
                        key: 'equipment',
                        label: '设备清单',
                        children: (
                          <Table
                            rowKey="id"
                            size="small"
                            pagination={false}
                            dataSource={[
                              { id: 1, name: 'AI推理服务器', spec: 'NVIDIA A100 80GB', qty: 2, unit: '台', price: 150000 },
                              { id: 2, name: '存储设备', spec: '100TB NAS', qty: 1, unit: '台', price: 80000 },
                            ]}
                            columns={[
                              { title: '设备名称', dataIndex: 'name' },
                              { title: '规格型号', dataIndex: 'spec' },
                              { title: '数量', dataIndex: 'qty' },
                              { title: '单位', dataIndex: 'unit' },
                              { title: '单价(元)', dataIndex: 'price', render: (v: number) => `¥${v.toLocaleString()}` },
                            ]}
                          />
                        ),
                      },
                      {
                        key: 'attachments',
                        label: '附件',
                        children: (
                          <Empty description="暂无附件" />
                        ),
                      },
                      {
                        key: 'auxiliary',
                        label: '辅助信息',
                        children: (
                          <Descriptions bordered column={2} size="small" items={[
                            { label: '商机归属组织', children: '福建威启智学教育科技有限公司' },
                            { label: '独立分签标识', children: '独立项目' },
                            { label: '主项目标识', children: '单独立项' },
                          ]} />
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
