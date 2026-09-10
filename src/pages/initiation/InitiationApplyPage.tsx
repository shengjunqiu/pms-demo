import { useActionAccess } from '@/hooks/useActionAccess';
import { canViewSensitiveField } from "@/mock/configuration-access";
import { selectTemplate } from "@/mock/configuration";
import { canViewInitiation } from "@/mock/initiation";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Upload,
} from "antd";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { useBusinessStore } from "@/mock/business";
import { useAppStore } from "@/store/useAppStore";
import {
  defaultInitiationInput,
  initiationDocuments,
  initiationSource,
  initiationPrerequisites,
} from "@/mock/initiation";
import { canManageOpportunity, canViewOpportunity } from "@/mock/opportunities";
import type { InitiationInput } from "@/models/initiation";
import { StateView } from "@/components/common/StateView";
import {
  InitiationHeader,
  InitiationHistory,
  SourceSummary,
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
  const [tab, setTab] = useState("basic");
  const selectedOpportunity = data.opportunities.find((o) => o.id === selected);
  const o = selectedOpportunity && canViewOpportunity(data, selectedOpportunity, actor)
    ? selectedOpportunity
    : undefined;
  const input =
    app?.input ?? (o ? defaultInitiationInput(data, o.id) : undefined);
  const source =
    app?.rounds.at(-1)?.source ??
    (o && !initiationPrerequisites(data, o).length
      ? initiationSource(data, o.id)
      : undefined);
  const locked = !!app && !["草稿", "整改"].includes(app.status);
  const canEdit = canDo("save-initiation", app?.id ?? o?.id) && !!o && canManageOpportunity(data, o, actor) && !locked;
  const type = Form.useWatch("type", form) ?? input?.type;
  const template = selectTemplate(
    {
      ...data,
      configuration:
        app?.rounds.at(-1)?.configurationSnapshot ?? data.configuration,
    },
    "deliverable",
    o?.departmentId ?? "all",
    type ?? "混合交付",
    app?.rounds.at(-1)?.level ?? "all",
  );
  const catalog = [
    ...new Map(
      [
        ...(template?.rows ?? []).map((r) => ({
          name: r.name,
          stage: r.phase,
          required: r.required,
          role: r.role,
        })),
        ...initiationDocuments(type, app?.rounds.at(-1)?.level),
      ].map((r) => [r.name, r]),
    ).values(),
  ];
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
        if (missing) { setTab(missing.key); message.error('请补全当前页签的必填申请资料后提交'); return; }
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
            const next = new URLSearchParams(query); next.set("opportunityId", value); next.delete("id"); setQuery(next); setTab("basic");
          }}
          options={data.opportunities
            .filter(
              (x) => canViewOpportunity(data, x, actor) &&
                (canManageOpportunity(data, x, actor) || x.id === selected),
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
                key: "basic",
                label: "基本信息",
                children: (
                  <Card>
                    <Row gutter={24}>
                      <Col span={16}>
                        <Form.Item
                          name="name"
                          label="项目名称"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="type" label="项目类型">
                          <Select
                            options={[
                              "软件开发",
                              "系统集成",
                              "咨询服务",
                              "运维服务",
                              "混合交付",
                            ].map((value) => ({ value, label: value }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="amount" label="预计金额（万元）">
                          <InputNumber min={0.01} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="region" label="区域">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="strategic"
                          label="战略项目"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="necessity" label="立项必要性">
                      <Input.TextArea
                        disabled={"necessity" in hiddenInput || !canEdit}
                        placeholder={
                          "necessity" in hiddenInput
                            ? "原说明含毛利，已隐藏并原样保留"
                            : undefined
                        }
                        rows={3}
                      />
                    </Form.Item>
                    <Form.Item name="recommendation" label="等级建议与依据">
                      <Input.TextArea
                        disabled={"recommendation" in hiddenInput || !canEdit}
                        placeholder={
                          "recommendation" in hiddenInput
                            ? "原说明含毛利，已隐藏并原样保留"
                            : undefined
                        }
                        rows={2}
                      />
                    </Form.Item>
                  </Card>
                ),
              },
              {
                key: "source",
                label: "商机承接",
                children: source ? (
                  <Card>
                    <SourceSummary
                      source={{
                        ...source,
                        expertOpinions: source.expertOpinions.map((row) => ({
                          ...row,
                          opinion: displayText(row.opinion) ?? "",
                        })),
                      }}
                    />
                  </Card>
                ) : (
                  <Alert message="完成商机评估、方案评审与概算冻结后可形成来源快照" />
                ),
              },
              {
                key: "estimate",
                label: "概算与毛利",
                children: source ? (
                  <Card>
                    <p>
                      冻结版本 {source.estimate.id} · 收入{" "}
                      {source.estimate.totalIncome} 万元 · 成本{" "}
                      {source.estimate.totalCost} 万元 · 毛利{" "}
                      {viewMargin
                        ? `${source.estimate.grossMarginRate}%`
                        : hiddenMargin}
                    </p>
                    <Table
                      rowKey="subjectId"
                      dataSource={source.estimate.items}
                      pagination={false}
                      columns={[
                        { title: "科目", dataIndex: "subjectName" },
                        { title: "概算金额（万元）", dataIndex: "amount", align: "right" },
                      ]}
                    />
                  </Card>
                ) : (
                  <Alert message="缺少冻结概算" />
                ),
              },
              {
                key: "risk",
                label: "风险信息",
                children: (
                  <Card>
                    <Table
                      rowKey="id"
                      pagination={false}
                      dataSource={source?.risks ?? []}
                      columns={[
                        { title: "来源", dataIndex: "sourceId" },
                        { title: "领域", dataIndex: "domain" },
                        { title: "风险说明", dataIndex: "description" },
                        { title: "初步应对", dataIndex: "mitigation" },
                      ]}
                    />
                    <Alert message="提交后由 PMO 在综合风险报告中逐项确认评分、责任人和应对措施。" />
                  </Card>
                ),
              },
              {
                key: "delivery",
                label: "项目交付信息",
                children: (
                  <Card>
                    <Row gutter={24}>
                      {[
                        ["plannedStartDate", "计划开始"],
                        ["plannedEndDate", "计划结束"],
                        ["expectedSignDate", "预计签约"],
                      ].map(([name, label]) => (
                        <Col span={8} key={name}>
                          <Form.Item name={name} label={label}>
                            <DatePicker style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                    <Form.Item name="scope" label="项目范围与边界">
                      <Input.TextArea
                        disabled={"scope" in hiddenInput || !canEdit}
                        placeholder={
                          "scope" in hiddenInput
                            ? "原说明含毛利，已隐藏并原样保留"
                            : undefined
                        }
                        rows={4}
                      />
                    </Form.Item>
                    <Form.Item name="customerNeeds" label="客户诉求及交付要求">
                      <Input.TextArea
                        disabled={"customerNeeds" in hiddenInput || !canEdit}
                        placeholder={
                          "customerNeeds" in hiddenInput
                            ? "原说明含毛利，已隐藏并原样保留"
                            : undefined
                        }
                        rows={3}
                      />
                    </Form.Item>
                    <Form.Item name="contractStatus" label="合同状态">
                      <Select
                        options={["未签", "已签"].map((value) => ({
                          value,
                          label: value,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name="contractReference" label="已签合同依据">
                      <Select
                        allowClear
                        onChange={(id) => {
                          const c = data.contracts.find((c) => c.id === id);
                          if (c) form.setFieldValue("amount", c.amount);
                        }}
                        placeholder="选择本商机尚未绑定项目的真实已签合同"
                        options={data.contracts
                          .filter(
                            (c) =>
                              c.opportunityId === selected &&
                              !c.projectId &&
                              c.status === "已签订",
                          )
                          .map((c) => ({
                            value: c.id,
                            label: `${c.code} · ${c.amount} 万元`,
                          }))}
                      />
                    </Form.Item>
                  </Card>
                ),
              },
              {
                key: "docs",
                label: "交付物目录",
                children: (
                  <Card>
                    <Alert
                      style={{ marginBottom: 12 }}
                      showIcon
                      message={`交付物模板 ${template?.id ?? "无适用配置"} · ${app?.rounds.length ? "使用该轮提交快照" : "提交时固定配置版本"}`}
                      description="规则指定的必交项不可降为可选，PMO可在分级时追加或提升必交项。"
                    />
                    <Table
                      rowKey="name"
                      pagination={false}
                      dataSource={catalog}
                      columns={[
                        { title: "阶段", dataIndex: "stage" },
                        { title: "交付物名称", dataIndex: "name" },
                        {
                          title: "是否必须",
                          render: (_, r) => (r.required ? "必须" : "可选"),
                        },
                        {
                          title: "提交时点",
                          render: (_, r) => `${r.stage}评审前`,
                        },
                        { title: "责任角色", dataIndex: "role" },
                      ]}
                    />
                    <Form.Item
                      name="additionalDeliverables"
                      label="补充必须交付物"
                    >
                      <Select
                        mode="tags"
                        tokenSeparators={["，"]}
                        placeholder="输入补充材料名称，规则必交材料不能移除"
                      />
                    </Form.Item>
                  </Card>
                ),
              },
              {
                key: "files",
                label: "附件",
                children: (
                  <Card>
                    <Form.Item
                      name="files"
                      label="立项申请附件"
                      valuePropName="fileList"
                      getValueFromEvent={(e) => e.fileList}
                      extra="演示记录文件名，不上传服务器"
                    >
                      <Upload beforeUpload={() => false}>
                        <Button>选择立项材料</Button>
                      </Upload>
                    </Form.Item>
                    {app?.rounds.at(-1)?.status === "整改" && (
                      <Form.Item name="rectificationReply" label="逐项整改回复">
                        <Input.TextArea
                          disabled={
                            "rectificationReply" in hiddenInput || !canEdit
                          }
                          placeholder={
                            "rectificationReply" in hiddenInput
                              ? "原说明含毛利，已隐藏并原样保留"
                              : undefined
                          }
                          rows={4}
                        />
                      </Form.Item>
                    )}
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
