import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewSensitiveField } from "@/mock/configuration-access";
import { canViewInitiation } from "@/mock/initiation";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  Form,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { useBusinessStore } from "@/mock/store";
import { useAppStore } from "@/store/useAppStore";
import {
  defaultInitiationInput,
  initiationPrerequisites,
} from "@/mock/initiation";
import { canManageOpportunity, canViewOpportunity } from "@/mock/opportunities";
import type { InitiationInput } from "@/models/initiation";
import { StateView } from "@/components/common/StateView";
import {
  InitiationHeader,
  InitiationHistory,
  useInitiationNavigation,
} from "./InitiationShared";
export function InitiationApplyPage() {
 const {canDo}=useActionAccess();
  const { data, dispatch } = useBusinessStore();
  const actor = useAppStore((s) => s.currentUser);
  const viewMargin = canViewSensitiveField(data, actor, "margin");
  const hiddenMargin = "毛利字段无查看权限";
  const displayText = (value?: string) =>
    !viewMargin && /毛利|gross.?margin/i.test(value ?? "")
      ? hiddenMargin
      : value;
  const [query, setQuery] = useSearchParams();
  const { go } = useInitiationNavigation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const app = data.initiations.find((a) => a.id === query.get("id"));
  const selected = app?.input.opportunityId ?? query.get("opportunityId") ?? "";
  const [tab, setTab] = useState("detail");
  const selectedOpportunity = data.opportunities.find((o) => o.id === selected);
  const o = selectedOpportunity && canViewOpportunity(data, selectedOpportunity, actor)
    ? selectedOpportunity
    : undefined;
  const input =
    app?.input ?? (o ? defaultInitiationInput(data, o.id) : undefined);

  // Mock 立项申请详情数据
  const mockDetailData = {
    basicInfo: {
      opportunityCode: input?.opportunityId ?? '-',
      customerName: o?.customerName ?? '-',
      customerCode: 'CUST-' + (o?.customerId ?? '-').slice(-6),
      businessManager: o?.ownerName ?? '-',
      totalAmount: input?.amount ?? 0,
      mainBusiness: o?.departmentName ?? '-',
      softwareAmount: (input?.amount ?? 0) * 0.8,
      hardwareAmount: (input?.amount ?? 0) * 0.2,
      estimatedSignDate: input?.expectedSignDate ?? '-',
      contractSignDate: '-',
      salesStatus: input?.contractStatus ?? '未签',
      internalBidNo: '',
    },
    deliveryInfo: {
      deliveryOrg: o?.departmentName ?? '-',
      industryCategory: input?.type ?? '-',
      procurementOrg: '-',
      responsibleDept: o?.departmentName ?? '-',
      pmSource: '部门指派',
      projectManager: '-',
      projectDirector: '王总',
      acceptDeliveryConfirmation: false,
      projectTechnicalManager: '-',
    },
    implementationDepts: [
      { category: '软件交付', deptName: o?.departmentName ?? '-', allocationRatio: 70, initiationCode: app?.id ?? '-' },
      { category: '硬件集成', deptName: '系统集成部', allocationRatio: 30, initiationCode: app?.id ?? '-' },
    ],
    approvalRecords: app?.rounds.at(-1)?.signatures.map((s) => ({
      step: s.node,
      approver: s.by,
      dept: '-',
      opinion: s.opinion,
      date: s.date,
      status: s.conclusion,
    })) ?? [],
  };


  const locked = !!app && !["草稿", "整改"].includes(app.status);
  const canEdit = canDo("save-initiation", app?.id ?? o?.id) && !!o && canManageOpportunity(data, o, actor) && !locked;



  if (app && !canViewInitiation(data, app, actor))
    return <StateView type="403" />;
  if (query.get("id") && !app) return <StateView type="404" />;
  if (selectedOpportunity && !o) return <StateView type="403" />;
  if (selected && !selectedOpportunity) return <StateView type="404" />;
  const hiddenInput = Object.fromEntries(
    Object.entries(input ?? {}).filter(
      ([, value]) =>
        typeof value === "string" && displayText(value) === hiddenMargin,
    ),
  );
  const save = async (submit: boolean) => {
    try {
      if (!canEdit || !canDo("save-initiation", app?.id ?? o?.id) || (submit && !canDo("submit-initiation", app?.id ?? o?.id))) throw new Error("当前策略不允许保存或提交立项申请");
      if (submit) {
        const values = { ...form.getFieldsValue(true), ...hiddenInput };
        const missing = [
          { key: 'basic', fields: ['name', 'necessity', 'recommendation', 'region'] },
          { key: 'delivery', fields: ['scope', 'customerNeeds', 'plannedStartDate', 'plannedEndDate', 'expectedSignDate'] },
          { key: 'files', fields: ['files'] },
        ].find((group) => group.fields.some((name) => !values[name] || (Array.isArray(values[name]) && !values[name].length)));
        if (missing) { setTab('detail'); message.error('请补全「立项申请详情」页签的必填申请资料后提交'); return; }
      }
      await form.validateFields();
      const v = form.getFieldsValue(true);
      const next: InitiationInput = {
        ...input!,
        ...v,
        plannedStartDate: v.plannedStartDate?.format("YYYY-MM-DD") ?? "",
        plannedEndDate: v.plannedEndDate?.format("YYYY-MM-DD") ?? "",
        expectedSignDate: v.expectedSignDate?.format("YYYY-MM-DD") ?? "",
        attachments: (v.files ?? []).map((x: { name: string }) => x.name),
        additionalDeliverables: v.additionalDeliverables ?? [],
        risks: input?.risks ?? [],
        ...hiddenInput,
      };
      dispatch({ type: "save-initiation", id: app?.id, input: next }, actor);
      const id =
        app?.id ?? useBusinessStore.getState().data.initiations.at(-1)!.id;
      go(`/initiation/apply?id=${id}`, { replace: true });
      if (submit) dispatch({ type: "submit-initiation", id }, actor);
      message.success(submit ? "已提交，进入综合风险评估" : "草稿已保存");
      go(
        submit
          ? `/initiation/${id}/risk-assessment`
          : `/initiation/apply?id=${id}`,
      );
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    }
  };
  return (
    <>
      <InitiationHeader app={app} title="立项申请" />
      <Card size="small" title="关联商机">
        <Select
          aria-label="关联立项商机"
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
          value={selected || undefined}
          disabled={!!app}
          placeholder="选择拟立项商机"
          onChange={(value) => {
            const next = new URLSearchParams(query); next.set("opportunityId", value); next.delete("id"); setQuery(next); setTab("detail");
          }}
          options={data.opportunities
            .filter(
              (x) => canViewOpportunity(data, x, actor) &&
                (canManageOpportunity(data, x, actor) || x.id === selected) &&
                // 与保存时域守卫一致：已转立项/已终止/暂缓、已关联项目、已有在途申请的商机不可再发起新立项
                (x.id === selected ||
                  (!['已终止', '暂缓', '已转立项'].includes(x.status) &&
                    !data.projects.some((p) => p.opportunityId === x.id) &&
                    !data.initiations.some((a) => a.input.opportunityId === x.id && a.status !== '否决'))),
            )
            .map((x) => ({
              value: x.id,
              label: `${x.id} · ${x.name} · ${x.status}`,
            }))}
        />
        {o && <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12, color: '#64748b' }}><span>客户：{o.customerName}</span><span>主办部门：{o.departmentName}</span><span>业务经理：{o.ownerName}</span></div>}
        {o &&
          initiationPrerequisites(data, o).length > 0 &&
          !app?.projectId && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="上游准入待完成"
              description={initiationPrerequisites(data, o).join("；")}
            />
          )}
      </Card>
      {input && (
        <Form
          key={selected + String(app?.id)}
          form={form}
          layout="vertical"
          disabled={!canEdit}
          initialValues={{
            ...input,
            ...Object.fromEntries(
              Object.keys(hiddenInput).map((key) => [key, undefined]),
            ),
            plannedStartDate: dayjs(input.plannedStartDate),
            plannedEndDate: dayjs(input.plannedEndDate),
            expectedSignDate: dayjs(input.expectedSignDate),
            files: input.attachments.map((name, i) => ({
              uid: String(i),
              name,
              status: "done",
            })),
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 0 0' }}>
            <div><strong>申请资料</strong><div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{locked ? '本轮已提交；来源版本与申请资料只读，整改退回后可重新修订。' : '补充基本信息、交付要求及附件；商机与冻结概算按原版本承接。'}</div></div>
            <span style={{ color: '#64748b', fontSize: 12 }}>金额单位：万元</span>
          </div>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            style={{ marginTop: 16 }}
            items={[
              {
                key: "detail",
                label: "立项申请详情",
                children: (
                  <Card>
                    <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
                      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>立项申请</h2>
                      <Tag color="processing" style={{ position: 'absolute', right: 16, top: 0, fontSize: 12, padding: '2px 12px' }}>{app?.status ?? '草稿'}</Tag>
                    </div>

                    <Collapse
                      defaultActiveKey={['basic', 'delivery', 'implementation', 'approval']}
                      items={[
                        {
                          key: 'basic',
                          label: <span style={{ fontWeight: 600 }}>基本信息</span>,
                          children: (
                            <Descriptions bordered column={3} size="small" items={[
                              { label: '商机/合同', children: mockDetailData.basicInfo.opportunityCode },
                              { label: '客户名称', children: mockDetailData.basicInfo.customerName },
                              { label: '客户编号', children: mockDetailData.basicInfo.customerCode },
                              { label: '业务经理', children: mockDetailData.basicInfo.businessManager },
                              { label: '总金额', children: `${mockDetailData.basicInfo.totalAmount} 万元` },
                              { label: '主事业部', children: mockDetailData.basicInfo.mainBusiness },
                              { label: '预计签单时间', children: mockDetailData.basicInfo.estimatedSignDate },
                              { label: '软件金额', children: `${mockDetailData.basicInfo.softwareAmount.toFixed(2)} 万元` },
                              { label: '销售状态', children: mockDetailData.basicInfo.salesStatus },
                              { label: '合同签订时间', children: mockDetailData.basicInfo.contractSignDate },
                              { label: '硬件金额', children: `${mockDetailData.basicInfo.hardwareAmount.toFixed(2)} 万元` },
                              { label: '内部转包编号', children: mockDetailData.basicInfo.internalBidNo || '—' },
                            ]} />
                          ),
                        },
                        {
                          key: 'delivery',
                          label: <span style={{ fontWeight: 600 }}>交付信息</span>,
                          children: (
                            <Descriptions bordered column={3} size="small" items={[
                              { label: '交付行业机构', children: mockDetailData.deliveryInfo.deliveryOrg },
                              { label: '行业归属', children: mockDetailData.deliveryInfo.industryCategory },
                              { label: '采购签约组织', children: mockDetailData.deliveryInfo.procurementOrg },
                              { label: '负责交付部门', children: mockDetailData.deliveryInfo.responsibleDept },
                              { label: '项目经理来源', children: mockDetailData.deliveryInfo.pmSource },
                              { label: '项目经理', children: mockDetailData.deliveryInfo.projectManager },
                              { label: '项目总监', children: mockDetailData.deliveryInfo.projectDirector },
                              { label: '是否接受任命确认过程交付物', children: mockDetailData.deliveryInfo.acceptDeliveryConfirmation ? '是' : '否' },
                              { label: '项目技术经理', children: mockDetailData.deliveryInfo.projectTechnicalManager },
                            ]} />
                          ),
                        },
                        {
                          key: 'implementation',
                          label: <span style={{ fontWeight: 600 }}>实施部门</span>,
                          children: (
                            <Table
                              rowKey="category"
                              size="small"
                              pagination={false}
                              dataSource={mockDetailData.implementationDepts}
                              columns={[
                                { title: '分配类别', dataIndex: 'category' },
                                { title: '部门名称', dataIndex: 'deptName' },
                                { title: '分配比例(%)', dataIndex: 'allocationRatio' },
                                { title: '立项编号', dataIndex: 'initiationCode' },
                              ]}
                            />
                          ),
                        },
                        {
                          key: 'approval',
                          label: <span style={{ fontWeight: 600 }}>审批记录</span>,
                          children: mockDetailData.approvalRecords.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                              {mockDetailData.approvalRecords.map((record, idx) => (
                                <div key={idx} style={{ padding: '12px', background: '#fafbfc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>{record.step}</div>
                                  <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 4 }}>{record.approver}</div>
                                  {record.status && (
                                    <Tag color={record.status === '同意' ? 'success' : 'processing'} style={{ fontSize: 11 }}>
                                      {record.status}
                                    </Tag>
                                  )}
                                  {record.date && (
                                    <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>{record.date}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Alert message="暂无审批记录" type="info" />
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: "profit",
                label: "毛利测算",
                children: (
                  <Card>
                    <Descriptions bordered column={2} size="small" items={[
                      { label: '合同金额', children: `${input?.amount ?? 0} 万元` },
                      { label: '预估成本', children: `${((input?.amount ?? 0) * 0.75).toFixed(2)} 万元` },
                      { label: '预估毛利', children: `${((input?.amount ?? 0) * 0.25).toFixed(2)} 万元` },
                      { label: '毛利率', children: '25.00%' },
                    ]} />
                  </Card>
                ),
              },
              {
                key: "equipment",
                label: "设备清单",
                children: (
                  <Card>
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
                  </Card>
                ),
              },
              {
                key: "auxiliary",
                label: "辅助信息",
                children: (
                  <Card>
                    <Descriptions bordered column={2} size="small" items={[
                      { label: '商机归属组织', children: o?.departmentName ?? '-' },
                      { label: '独立分签标识', children: input?.contractStatus === '已签' ? '已签约' : '待签约' },
                      { label: '主项目标识', children: '单独立项' },
                    ]} />
                  </Card>
                ),
              },
            ]}
          />
          <Space wrap style={{ margin: "16px 0", padding: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, width: "100%", justifyContent: "flex-end" }}>
            <Button disabled={!canEdit} onClick={() => save(false)}>
              保存草稿
            </Button>
            <Button
              disabled={!canEdit || !canDo("submit-initiation", app?.id ?? o?.id)}
              type="primary"
              onClick={() => save(true)}
            >
              提交立项申请
            </Button>
          </Space>
        </Form>
      )}
      {app &&
        (viewMargin ? (
          <InitiationHistory app={app} />
        ) : (
          <Card title="评审轮次与整改留痕">
            <p>历史意见可能包含毛利，当前仅展示轮次状态及来源。</p>
            {app.rounds.map((r) => (
              <p key={r.revision}>
                修订 {r.revision} · {r.status} · {r.source.estimate.id}
              </p>
            ))}
          </Card>
        ))}
    </>
  );
}
