import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewSensitiveField } from '@/mock/configuration-access';
import { configuredSubjects, selectCostRate, projectCostRegion } from '@/mock/configuration-finance';
import { useState } from 'react';
import { App, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag, Statistic, Divider, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageSection } from '@/components/common/PageSection';
import { StateView } from '@/components/common/StateView';
import { usePlanning } from './usePlanning';
import { PlanningHeader } from './PlanningLayout';
import { BudgetSummary, BudgetComparisonTable } from './BudgetSummary';
import { snapshotBudgetRate, getBudgetDraft, lineAmount, toBudgetVersion } from '@/mock/budget-drafts';
import { projectEstimate } from '@/mock/versions';
import { getMockProprietarySoftware } from '@/mock/budget-fixtures';
import type { BudgetDraft, BudgetLine } from '@/models/budget';
import { sumMoney } from '@/utils/money';

export function BudgetEditorPage() {
  const { canDo } = useActionAccess();
  const c = usePlanning(), { message, modal } = App.useApp(), navigate = useNavigate();
  const [local, setLocal] = useState<BudgetDraft>();
  const [editing, setEditing] = useState<string>();
  const [replacementAmount, setReplacementAmount] = useState<number>();
  const [form] = Form.useForm<BudgetLine>();
  const editingKind = Form.useWatch('kind', form);

  if (!c.project || !c.plan) return <StateView type="404" />;
  if (!c.allowed || !['project-manager', 'pmo', 'finance', 'executive', 'admin'].includes(c.actor.role)) return <StateView type="403" />;

  const p = c.project;
  const showPersonalCost = ['project-manager', 'pmo', 'finance', 'executive', 'admin'].includes(c.actor.role) && canViewSensitiveField(c.data, c.actor, 'labor-rate');
  const subjects = configuredSubjects(c.data, p.departmentId, p.type);
  const currentRate = (userId: string) => selectCostRate(c.data, { userId, orgId: p.departmentId, projectType: p.type, region: projectCostRegion(c.data, p) }).hourlyYuan;
  const estimate = projectEstimate(p, c.data.estimates);
  if (!estimate) return <StateView type="empty" title="缺少项目绑定冻结概算" />;

  const draft = local?.projectId === p.id ? local : getBudgetDraft(c.data, p.id);
  const budget = toBudgetVersion(draft, c.actor);
  const canEdit = canDo('save-budget-draft', p.id) && c.actor.role === 'project-manager' && c.actor.id === p.pmId && !c.data.approvals.some(a => a.projectId === p.id && (a.status === '待审批' || a.kind === 'budget' && a.status === '通过' && !a.baselineConfirmedAt));

  const save = () => {
    try {
      if (!canEdit || !canDo('save-budget-draft', p.id)) throw new Error('当前策略不允许保存预算');
      c.dispatch({ type: 'save-budget-draft', draft, expectedRevision: c.data.budgetDrafts[p.id]?.revision ?? 0 }, c.actor);
      setLocal(undefined);
      message.success('预算草稿已保存');
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    }
  };

  const open = (line?: BudgetLine) => {
    setReplacementAmount(undefined);
    form.resetFields();
    form.setFieldsValue(line ?? {
      id: `LINE-${p.id}-${crypto.randomUUID()}`,
      name: '',
      kind: 'procurement',
      subjectId: 'SUB-03',
      amount: 0,
      plannedDays: 1,
      travelDays: 0,
      userId: p.pmId,
      grade: '项目岗位基准',
      taskId: c.plan?.tasks[0]?.id,
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-03',
      justification: '',
      department: p.departmentName,
      supplyMode: '采购'
    });
    setEditing(line?.id ?? 'new');
  };

  const hiddenOriginalAmount = !showPersonalCost && draft.lines.some(line => line.id === editing && line.kind === 'labor');

  const columns = [
    { title: '预算事项', dataIndex: 'name', width: 220 },
    {
      title: 'WBS / 来源概算',
      width: 180,
      render: (_: unknown, l: BudgetLine) => (
        <>
          <div>{c.plan?.tasks.find(t => t.id === l.taskId)?.name ?? '独立费用'}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{l.sourceEstimateItemId ? `${estimate.version} / ${l.sourceEstimateItemId}` : '新增测算项'}</div>
        </>
      )
    },
    {
      title: '测算依据',
      width: 240,
      render: (_: unknown, l: BudgetLine) => l.kind === 'labor' ? (
        showPersonalCost
          ? `${l.plannedDays}人天 × 8小时 × ${(l.hourlyYuan ?? currentRate(l.userId ?? ''))}元/小时`
          : `${l.plannedDays}人天 · 按冻结成本基准自动计算，人员单价已隐藏`
      ) : `${l.supplyMode} · ${l.stage}`
    },
    {
      title: '预算（万元）',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, l: BudgetLine) => l.kind === 'labor' && !showPersonalCost ? '已隐藏' : lineAmount(l).toFixed(2)
    },
    { title: '范围与调整说明', dataIndex: 'justification', width: 260 },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, l: BudgetLine) => (
        <Space size="small">
          <Button size="small" disabled={!canEdit} onClick={() => open(l)}>编辑</Button>
          <Button size="small" danger disabled={!canEdit} onClick={() => setLocal({ ...draft, lines: draft.lines.filter(x => x.id !== l.id) })}>删除</Button>
        </Space>
      )
    }
  ];

  // 自有软件数据
  const proprietarySoftwareList = getMockProprietarySoftware(p.id);
  const totalSoftwareQuotation = sumMoney(proprietarySoftwareList.map(s => s.quotationAmountYuan)) / 10000;
  const totalSoftwareCost = sumMoney(proprietarySoftwareList.map(s => s.deliveryCostAmountYuan)) / 10000;

  // 财务指标联动核算（对齐 BPM 真实项目预算口径）
  const incomeAmount = p.revenueAmount ?? p.contractAmount ?? 0;
  const externalCostAmount = sumMoney(draft.lines.filter(l => l.kind !== 'labor').map(lineAmount));
  const externalGrossMargin = incomeAmount - externalCostAmount;
  const externalGrossMarginRate = incomeAmount > 0 ? (externalGrossMargin / incomeAmount) * 100 : 0;
  const hqServiceFee = Number((incomeAmount * 0.05).toFixed(2));
  const presalesServiceFee = Number((incomeAmount * 0.012).toFixed(2));
  const salesExpense = Number((incomeAmount * 0.018).toFixed(2));
  const totalTaxAmount = Number((incomeAmount * 0.0672).toFixed(2));
  const totalOperatingCost = Number((budget.totalAmount + hqServiceFee + presalesServiceFee + salesExpense).toFixed(2));
  const netProfitSpace = Number((incomeAmount - totalOperatingCost - totalTaxAmount).toFixed(2));
  const netProfitRate = incomeAmount > 0 ? (netProfitSpace / incomeAmount) * 100 : 0;

  // 基础信息 Tab 内容
  const basicInfoTabContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title="项目基本信息">
        <Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="申请单号">
            <Tag color="blue">{`XMYS-${p.id}`}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="项目名称">{p.name}</Descriptions.Item>
          <Descriptions.Item label="项目编号">{p.code}</Descriptions.Item>
          <Descriptions.Item label="合同甲方">{p.customerName}</Descriptions.Item>
          <Descriptions.Item label="预计中标金额">
            <span style={{ fontWeight: 600, color: '#1677ff' }}>{incomeAmount.toFixed(2)} 万元</span>
          </Descriptions.Item>
          <Descriptions.Item label="合同签订时间">{p.plannedStartDate}</Descriptions.Item>
          <Descriptions.Item label="纯运维项目">
            <Tag color={p.isMaintenance ? 'blue' : 'default'}>{p.isMaintenance ? '是' : '否'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="申请不做预算">
            <Tag color="default">否</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="是否专家组评审">
            <Tag color="default">否</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="预算整体情况汇总（经营与毛利指标）">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic title="收入金额（万元）" value={incomeAmount} precision={2} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="外部成本（万元）" value={externalCostAmount} precision={2} valueStyle={{ color: '#d4380d' }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="外部毛利（万元）" value={externalGrossMargin} precision={2} valueStyle={{ color: '#389e0d' }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="项目外部毛利率" value={externalGrossMarginRate} precision={2} suffix="%" valueStyle={{ color: '#389e0d' }} />
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={4}>
            <Statistic title="总部服务费（5%）" value={hqServiceFee} precision={2} />
          </Col>
          <Col xs={12} sm={4}>
            <Statistic title="售前服务费（1.2%）" value={presalesServiceFee} precision={2} />
          </Col>
          <Col xs={12} sm={4}>
            <Statistic title="销售费用（1.8%）" value={salesExpense} precision={2} />
          </Col>
          <Col xs={12} sm={4}>
            <Statistic title="税费（6.72%）" value={totalTaxAmount} precision={2} />
          </Col>
          <Col xs={12} sm={4}>
            <Statistic title="项目净利润空间（万元）" value={netProfitSpace} precision={2} valueStyle={{ color: netProfitSpace > 0 ? '#1677ff' : '#cf1322', fontWeight: 600 }} />
          </Col>
          <Col xs={12} sm={4}>
            <Statistic title="预测净利润率" value={netProfitRate} precision={2} suffix="%" valueStyle={{ color: netProfitRate > 0 ? '#1677ff' : '#cf1322', fontWeight: 600 }} />
          </Col>
        </Row>
      </Card>

      <Card size="small" title="里程碑进度计划关联">
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={c.plan.milestones}
          columns={[
            { title: '序号', width: 60, render: (_, __, i) => i + 1 },
            { title: '任务 / 节点名称', dataIndex: 'name', width: 140 },
            { title: '节点类型', dataIndex: 'type', width: 100, render: v => <Tag color="blue">{v}</Tag> },
            { title: '计划达成日期', dataIndex: 'plannedDate', width: 120 },
            { title: '达成确认条件 / 验收依据', render: (_, r) => <div><div>{r.completionCondition}</div><div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.acceptanceBasis}</div></div> },
            { title: '必交交付物', dataIndex: 'requiredDeliverables', width: 200, render: (v: string[]) => v?.map(d => <Tag key={d}>{d}</Tag>) },
            { title: '当前状态', dataIndex: 'status', width: 100, render: v => <Tag color={v === '已达成' ? 'success' : v === '逾期未达成' ? 'error' : 'default'}>{v}</Tag> }
          ]}
        />
      </Card>
    </Space>
  );

  // 自有软件报价 Tab 内容
  const proprietarySoftwareTabContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        showIcon
        type="info"
        message="自有软件标准化产品配置清单"
        description="本项目包含自主研发的平台与软件产品，报价纳入项目总收入，产品标准交付成本纳入预算核算控制。"
      />
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Statistic title="自有软件产品数" value={proprietarySoftwareList.length} suffix="个模块" />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="软件总报价（万元）" value={totalSoftwareQuotation} precision={2} valueStyle={{ color: '#1677ff' }} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="标准交付成本（万元）" value={totalSoftwareCost} precision={2} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="软件综合毛利率"
            value={totalSoftwareQuotation > 0 ? ((totalSoftwareQuotation - totalSoftwareCost) / totalSoftwareQuotation) * 100 : 0}
            precision={2}
            suffix="%"
            valueStyle={{ color: '#389e0d' }}
          />
        </Col>
      </Row>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={proprietarySoftwareList}
        columns={[
          { title: '模块编号', dataIndex: 'moduleCode', width: 150 },
          {
            title: '软件产品 / 模块名称',
            dataIndex: 'name',
            render: (v, r) => (
              <div>
                <div style={{ fontWeight: 500 }}>{v}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.remarks}</div>
              </div>
            )
          },
          { title: '版本', dataIndex: 'version', width: 120 },
          { title: '分类', dataIndex: 'moduleCategory', width: 120, render: v => <Tag color="cyan">{v}</Tag> },
          { title: '定制化', dataIndex: 'isCustomized', width: 90, render: v => <Tag color={v ? 'orange' : 'green'}>{v ? '定制' : '标准'}</Tag> },
          { title: '数量', dataIndex: 'quantity', width: 70, align: 'right' as const, render: (v, r) => `${v} ${r.unit}` },
          { title: '官方目录价 (元)', dataIndex: 'listPriceYuan', width: 130, align: 'right' as const, render: v => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) },
          { title: '项目报价金额 (元)', dataIndex: 'quotationAmountYuan', width: 140, align: 'right' as const, render: v => <span style={{ fontWeight: 600, color: '#1677ff' }}>{Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span> },
          { title: '毛利率', dataIndex: 'grossMarginRate', width: 90, align: 'right' as const, render: v => <span style={{ color: '#389e0d' }}>{v.toFixed(2)}%</span> }
        ]}
      />
    </Space>
  );

  return (
    <>
      <PlanningHeader title="YS-09 项目预算编制" context={c} />
      <BudgetSummary budget={budget} estimate={estimate} income={p.revenueAmount ?? p.contractAmount} hideCards={true} />
      <Card
        size="small"
        title={`预算草稿 R${draft.revision} · 引用概算 ${estimate.version}`}
        extra={
          <Space wrap>
            <Button onClick={() => { setLocal(undefined); navigate(`/projects/${p.id}/plan-review`); }}>取消 / 返回计划</Button>
            <Button disabled={!canEdit} onClick={save}>保存草稿</Button>
            <Button
              type="primary"
              disabled={!canEdit || !canDo('submit-budget-draft', p.id)}
              onClick={() => modal.confirm({
                title: '确认保存并提交预算审批',
                content: `预算${budget.totalAmount.toFixed(2)}万元；提交后绑定当前概算、计划、资源和预算明细版本。`,
                onOk: () => {
                  if (!canEdit || !canDo('save-budget-draft', p.id) || !canDo('submit-budget-draft', p.id)) {
                    message.error('当前策略不允许保存并提交预算');
                    return;
                  }
                  if (!save()) return;
                  try {
                    c.dispatch({ type: 'submit-budget-draft', projectId: p.id }, c.actor);
                    navigate(`/projects/${p.id}/budget/review`);
                  } catch (e) {
                    message.error((e as Error).message);
                  }
                }
              })}
            >
              提交审批
            </Button>
          </Space>
        }
      >
        <Tabs
          items={[
            {
              key: 'basic-info',
              label: '基本信息',
              children: basicInfoTabContent
            },
            {
              key: 'base',
              label: '项目与计划',
              children: (
                <>
                  <p>客户：{p.customerName} · 项目收入：{p.revenueAmount ?? p.contractAmount}万元</p>
                  <p>范围：{c.plan.scope}</p>
                  <p>WBS {c.plan.tasks.length}项 / 里程碑 {c.plan.milestones.length}项 / 资源 {c.plan.resources.length}人</p>
                  <Button onClick={() => navigate(`/projects/${p.id}/wbs`)}>核对WBS与资源</Button>
                </>
              )
            },
            ...([
              ['labor', '交付人力'],
              ['procurement', '建设采购'],
              ['expense', '期间费用'],
              ['third-party', '第三方费用']
            ] as const).map(([kind, label]) => ({
              key: kind,
              label,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Button
                      disabled={!canEdit}
                      onClick={() => {
                        open();
                        form.setFieldsValue({
                          kind,
                          subjectId: kind === 'labor' ? 'SUB-01' : kind === 'procurement' ? 'SUB-03' : 'SUB-04-4'
                        });
                      }}
                    >
                      新增{label}
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={draft.lines.filter(l => l.kind === kind)}
                    columns={columns}
                    pagination={false}
                    scroll={{ x: 1120 }}
                  />
                </>
              )
            })),
            {
              key: 'proprietary-software',
              label: '自有软件报价',
              children: proprietarySoftwareTabContent
            },
            ...([
              ['outsource', '外包预算'],
              ['reserve', '准备金']
            ] as const).map(([kind, label]) => ({
              key: kind,
              label,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Button
                      disabled={!canEdit}
                      onClick={() => {
                        open();
                        form.setFieldsValue({
                          kind,
                          subjectId: kind === 'outsource' ? 'SUB-02' : 'SUB-05'
                        });
                      }}
                    >
                      新增{label}
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={draft.lines.filter(l => l.kind === kind)}
                    columns={columns}
                    pagination={false}
                    scroll={{ x: 1120 }}
                  />
                </>
              )
            })),
            {
              key: 'summary',
              label: '预算汇总与对比',
              children: <BudgetComparisonTable budget={budget} estimate={estimate} />
            }
          ]}
        />
      </Card>
      <PageSection title="预算调整说明" description="超概算时，提交审批须填写原因、措施和责任说明；草稿可随时保存。">
        <Row gutter={[16, 16]}>
          {[
            ['reason', '超概算原因'],
            ['mitigation', '应对措施与毛利影响'],
            ['responsibility', '责任说明']
          ].map(([key, label]) => (
            <Col xs={24} xl={8} key={key}>
              <label>
                {label}
                <Input.TextArea
                  aria-label={label}
                  disabled={!canEdit}
                  rows={3}
                  value={draft[key as 'reason']}
                  onChange={e => setLocal({ ...draft, [key]: e.target.value })}
                />
              </label>
            </Col>
          ))}
        </Row>
      </PageSection>

      <Modal
        width={800}
        title="预算明细测算"
        open={!!editing}
        onCancel={() => setEditing(undefined)}
        okButtonProps={{ disabled: !canEdit }}
        onOk={() => form.validateFields().then(values => {
          const raw = { ...form.getFieldsValue(true), ...values };
          if (hiddenOriginalAmount && raw.kind !== 'labor') {
            if (replacementAmount === undefined) {
              message.error('转换为非人力事项后，请填写新的预算金额');
              return;
            }
            raw.amount = replacementAmount;
          }
          const original = draft.lines.find(l => l.id === editing && l.userId === raw.userId && l.subjectId === raw.subjectId && l.grade === raw.grade && l.kind === raw.kind);
          const line = original
            ? { ...raw, hourlyYuan: original.hourlyYuan, rateVersion: original.rateVersion, expenseDailyYuan: original.expenseDailyYuan, expenseRateVersion: original.expenseRateVersion }
            : snapshotBudgetRate(c.data, p.id, raw);
          setLocal({ ...draft, lines: editing === 'new' ? [...draft.lines, line] : draft.lines.map(l => l.id === editing ? line : l) });
          setEditing(undefined);
        }).catch(() => { })}
      >
        <Form form={form} layout="vertical" disabled={!canEdit}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="预算事项" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="kind" label="成本类型"><Select options={['labor', 'procurement', 'outsource', 'expense', 'third-party', 'reserve'].map((value, i) => ({ value, label: ['人力', '采购', '外包', '期间费用', '第三方费用', '准备金'][i] }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="subjectId" label="财务统一科目"><Select options={subjects.map(s => ({ value: s.id, label: s.name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="taskId" label="关联WBS范围"><Select options={c.plan.tasks.map(t => ({ value: t.id, label: t.name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="userId" label="人力成员（按成本基准计价）"><Select options={c.plan.resources.filter(r => r.active).map(r => ({ value: r.userId, label: showPersonalCost ? `${r.name} · ${currentRate(r.userId)}元/小时` : r.name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="plannedDays" label="人力计划人天"><InputNumber min={0} precision={2} /></Form.Item></Col>
            <Col span={12}><Form.Item name="travelDays" label="出差天数"><InputNumber min={0} /></Form.Item></Col>
            {editingKind !== 'labor' && (
              <Col span={12}>
                {hiddenOriginalAmount ? (
                  <Form.Item label="转换后的非人力预算金额（万元）" required>
                    <InputNumber aria-label="转换后的非人力预算金额" min={0} precision={2} value={replacementAmount} onChange={value => setReplacementAmount(value ?? undefined)} />
                  </Form.Item>
                ) : (
                  <Form.Item name="amount" label="非人力金额（万元，人力按基准自动计算）">
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                )}
              </Col>
            )}
            <Col span={12}><Form.Item name="stage" label="计划发生阶段"><Select options={['方案确认', '开发实施', '系统联调', '内部初验', '客户终验'].map(value => ({ value, label: value }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="supplyMode" label="供应方式"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="department" label="责任部门"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sourceEstimateItemId" label="来源概算科目"><Select allowClear options={estimate.items.map(i => ({ value: i.subjectId, label: i.subjectName }))} /></Form.Item></Col>
            <Col span={24}><Form.Item name="justification" label="交付范围 / 调整原因"><Input.TextArea /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
