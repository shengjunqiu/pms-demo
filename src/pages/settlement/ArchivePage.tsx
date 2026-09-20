import { useActionAccess } from "@/hooks/useActionAccess";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
} from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStatCard } from "@/components/common/MetricStatCard";
import { PageSection } from "@/components/common/PageSection";
import { StateView } from "@/components/common/StateView";
import { useBusinessStore } from "@/mock/store";
import { visibleProjects } from "@/mock/selectors";
import {
  archiveCategory,
  archiveChecks,
  archiveSources,
  type CloseoutAction,
} from "@/mock/closeout";
import { ARCHIVE_CATEGORIES, type ArchiveCategory } from "@/models/closeout";
import { useAppStore } from "@/store/useAppStore";
export function ArchivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, dispatch } = useBusinessStore();
  const { currentRole, currentUser } = useAppStore();
  const { canDo } = useActionAccess();
  const { message } = App.useApp();
  const [upload, setUpload] = useState(false);
  const [category, setCategory] = useState<ArchiveCategory>("方案");
  const [sourceId, setSourceId] = useState<string>();
  const [filename, setFilename] = useState("");
  const [note, setNote] = useState("");
  const [review, setReview] = useState<{ id: string; approve: boolean }>();
  const [confirm, setConfirm] = useState(false);
  const p = data.projects.find((p) => p.id === id);
  if (!p) return <StateView type="404" />;
  if (
    !visibleProjects(currentRole, data.projects, data).some((v) => v.id === id)
  )
    return <StateView type="403" />;
  const archive = data.projectArchives[p.id];
  const checks = archiveChecks(data, p.id);
  const sources = archive?.sources ?? archiveSources(data, p.id);
  const selected = sources.find((s) => s.id === params.get("source"));
  const materials = data.materials.filter(
    (m) => m.projectId === p.id && archiveCategory(m),
  );
  const pm = currentRole === "project-manager" && p.pmId === currentUser.id;
  const pmo = currentRole === "pmo";
  const settled = data.settlements.some(
    (s) => s.projectId === p.id && s.status === "已锁定已生效",
  );
  const actor = {
    id: currentUser.id,
    name: currentUser.name,
    role: currentRole,
  };
  const canUpload =
    !archive && settled && (pm || pmo) && canDo("submit-archive-file", p.id);
  const canReview = (materialId?: string) =>
    !archive && pmo && !!materialId && canDo("review-archive-file", materialId);
  const canConfirm =
    !archive &&
    pmo &&
    settled &&
    checks.every((c) => c.passed) &&
    canDo("confirm-project-archive", p.id);
  const run = (action: CloseoutAction) => {
    if (!canDo(action.type, "id" in action ? action.id : p.id)) return false;
    try {
      dispatch(action, actor);
      message.success("项目正式档案状态已更新");
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    }
  };
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const begin = (c: ArchiveCategory) => {
    if (!canUpload) return;
    setCategory(c);
    setSourceId(sources.find((s) => s.category === c)?.id);
    setFilename("");
    setNote("");
    setUpload(true);
  };
  const exportDirectory = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          archive ?? {
            projectId: p.id,
            status: "归档准备",
            checks,
            sources: sources.map(({ id, category, label, version, route }) => ({
              id,
              category,
              label,
              version,
              route,
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${p.id}-项目档案目录.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader
        title="JS-10 项目资料归档"
        description={`${p.id} · ${p.name} · ${archive ? `档案 V${archive.version} 已确认` : "归档目录准备"}`}
        breadcrumbs={[
          { title: p.name, href: `/projects/${p.id}` },
          { title: "项目后评价", href: `/projects/${p.id}/post-evaluation` },
          { title: "资料归档" },
        ]}
        extra={
          <Space>
            <Button onClick={exportDirectory}>导出目录JSON</Button>
            <Button disabled={!canUpload} onClick={() => begin("方案")}>
              补充正式文件
            </Button>
            <Button
              type="primary"
              disabled={!canConfirm}
              onClick={() => {
                setNote("");
                setConfirm(true);
              }}
            >
              确认正式归档
            </Button>
          </Space>
        }
      />
      <Alert
        showIcon
        style={{ marginBottom: 16 }}
        type={archive ? "success" : "info"}
        message={
          archive
            ? `${archive.id} · ${archive.confirmedBy} · ${archive.confirmedAt} 已归档`
            : "演示规则 ARC-1：14类目录保存原业务及版本来源，缺件须补齐；项目结算后补档只更新文档，不解除成本锁定。"
        }
        description={
          archive
            ? "归档快照、正式文件及后评价只读；后续补充须另走新版本流程，不能覆盖本版本。"
            : "方案、立项、合同、测试质量、验收和结算须有审核通过的正式文件。原业务数据或补档容器不代替原文件，历史缺失不会自动标为齐全。"
        }
      />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="归档状态"
            value={archive ? "已确认归档" : "归档准备中"}
            statusType={archive ? "healthy" : "warning"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="分类完整性"
            value={archive ? "14/14" : `${checks.filter((c) => c.passed).length}/14`}
            unit="类"
            statusType={archive || checks.every((c) => c.passed) ? "healthy" : "warning"}
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="正式文件"
            value={archive?.materials.length ?? materials.filter((m) => m.status === "通过" && m.versions?.length).length}
            unit="份"
            statusType="info"
          />
        </Col>
        <Col xs={12} xl={6}>
          <MetricStatCard
            title="前置结算"
            value={settled ? "已锁定" : "未结算"}
            statusType={settled ? "healthy" : "danger"}
          />
        </Col>
      </Row>
      <PageSection
        title="归档基本信息"
        description="14类归档目录齐全、所有材料审核通过且完成冻结结算后方可确认归档。"
        className="mb-4"
      >
        <Descriptions
          column={3}
          size="small"
          items={[
            { key: "pm", label: "项目经理", children: p.pmName },
            {
              key: "settlement",
              label: "结算条件",
              children: settled ? "已有正式冻结结算" : "尚未正式结算",
            },
            {
              key: "evaluation",
              label: "后评价",
              children: data.postEvaluations[p.id]?.status ?? "未发起",
            },
            {
              key: "count",
              label: "分类完整性",
              children: archive
                ? "14 / 14"
                : `${checks.filter((c) => c.passed).length} / 14`,
            },
            {
              key: "files",
              label: "正式文件",
              children:
                archive?.materials.length ??
                materials.filter(
                  (m) => m.status === "通过" && m.versions?.length,
                ).length,
            },
            {
              key: "opinion",
              label: "归档意见",
              children: archive?.note ?? "尚未确认",
            },
          ]}
        />
        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => navigate(`/projects/${p.id}/post-evaluation`)}>
            补齐后评价
          </Button>
          <Button
            onClick={() => navigate(`/projects/${p.id}/operation-handover`)}
          >
            运维衔接
          </Button>
          <Button onClick={() => navigate(`/projects/${p.id}/close`)}>
            项目关闭条件
          </Button>
        </Space>
      </PageSection>
      <Tabs
        items={[
          {
            key: "catalog",
            label: "归档目录与来源",
            children: (
              <>
                <div className="pms-toolbar mb-3">
                  <Space wrap size={[8, 12]}>
                    <Select
                      aria-label="归档分类查询"
                      allowClear
                      placeholder="按归档分类查询"
                      style={{ width: 220 }}
                      value={params.get("category") ?? undefined}
                      onChange={(v) => setParam("category", v)}
                      options={ARCHIVE_CATEGORIES.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                    {params.get("category") && (
                      <Button onClick={() => setParams({})}>重置查询</Button>
                    )}
                  </Space>
                </div>
                <Table
                  rowKey="category"
                  size="small"
                  pagination={false}
                  scroll={{ x: 900 }}
                  dataSource={checks.filter(
                    (c) =>
                      !params.get("category") ||
                      c.category === params.get("category"),
                  )}
                  columns={[
                    { title: "归档分类", dataIndex: "category", width: 155 },
                    {
                      title: "完整性",
                      width: 110,
                      render: (_, c) => (
                        <Tag
                          color={archive || c.passed ? "success" : "warning"}
                        >
                          {archive ? "已归档" : c.passed ? "齐全" : "缺件"}
                        </Tag>
                      ),
                    },
                    {
                      title: "原记录 / 正式文件",
                      width: 160,
                      render: (_, c) =>
                        `${sources.filter((s) => s.category === c.category).length} 条来源 / ${archive ? archive.materials.filter((m) => m.category === c.category).length : c.fileCount} 份`,
                    },
                    { title: "检查依据", dataIndex: "detail" },
                    {
                      title: "补充",
                      width: 100,
                      render: (_, c) => (
                        <Button
                          disabled={!canUpload}
                          onClick={() => begin(c.category)}
                        >
                          补档
                        </Button>
                      ),
                    },
                  ]}
                />
                <Card
                  title="实际来源与版本索引"
                  size="small"
                  style={{ marginTop: 16 }}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    scroll={{ x: 850 }}
                    dataSource={sources.filter(
                      (s) =>
                        !params.get("category") ||
                        s.category === params.get("category"),
                    )}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      { title: "分类", dataIndex: "category", width: 140 },
                      {
                        title: "原业务 / 文件",
                        render: (_, s) => (
                          <Button
                            type="link"
                            onClick={() => setParam("source", s.id)}
                          >
                            {s.label}
                          </Button>
                        ),
                      },
                      { title: "来源ID", dataIndex: "id" },
                      { title: "版本", dataIndex: "version" },
                      {
                        title: "查看",
                        render: (_, s) => (
                          <Button onClick={() => navigate(s.route)}>
                            原业务
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "files",
            label: "正式文件与审核",
            children: (
              <Table
                rowKey="id"
                size="small"
                scroll={{ x: 1080 }}
                dataSource={materials}
                pagination={{ pageSize: 8 }}
                columns={[
                  {
                    title: "名称 / 分类",
                    width: 230,
                    render: (_, m) => (
                      <>
                        {m.name}
                        <div>
                          <Tag>{archiveCategory(m)}</Tag>
                        </div>
                      </>
                    ),
                  },
                  {
                    title: "当前文件名",
                    width: 250,
                    render: (_, m) =>
                      m.versions?.at(-1)?.filename ??
                      "历史审核记录；未导入原文件",
                  },
                  {
                    title: "来源 / 版本",
                    width: 190,
                    render: (_, m) => (
                      <>
                        {m.sourceId ?? m.id}
                        <div>
                          {m.versions?.at(-1)
                            ? `V${m.versions.at(-1)!.version}`
                            : "原版本未导入"}
                        </div>
                      </>
                    ),
                  },
                  {
                    title: "状态",
                    width: 110,
                    render: (_, m) => (
                      <Tag
                        color={
                          m.archived
                            ? "success"
                            : m.status === "通过"
                              ? "success"
                              : m.status === "驳回"
                                ? "error"
                                : "processing"
                        }
                      >
                        {m.archived ? "已归档只读" : m.status}
                      </Tag>
                    ),
                  },
                  {
                    title: "PMO审核",
                    width: 190,
                    render: (_, m) => (
                      <Space>
                        <Button
                          disabled={
                            !canReview(m.id) ||
                            m.status !== "待审核" ||
                            !m.archiveCategory
                          }
                          onClick={() => {
                            setReview({ id: m.id, approve: true });
                            setNote("");
                          }}
                        >
                          通过
                        </Button>
                        <Button
                          disabled={
                            !canReview(m.id) ||
                            m.status !== "待审核" ||
                            !m.archiveCategory
                          }
                          onClick={() => {
                            setReview({ id: m.id, approve: false });
                            setNote("");
                          }}
                        >
                          退回
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <Drawer
        width={800}
        title={archive ? "已归档来源快照" : "原业务与文档来源"}
        open={!!params.get("source")}
        onClose={() => setParam("source")}
      >
        {selected ? (
          <>
            <Descriptions
              bordered
              column={1}
              items={[
                {
                  key: "category",
                  label: "归档分类",
                  children: selected.category,
                },
                { key: "name", label: "来源名称", children: selected.label },
                { key: "id", label: "原对象ID", children: selected.id },
                {
                  key: "version",
                  label: "来源版本",
                  children: selected.version,
                },
              ]}
            />
            <Button
              style={{ margin: "16px 0" }}
              onClick={() => navigate(selected.route)}
            >
              进入原业务
            </Button>
            <Alert
              type="info"
              message={
                archive
                  ? "以下为确认归档时保存的原记录快照，后续操作不会改写。"
                  : "以下为当前原业务记录，确认归档时保存实际版本。"
              }
            />
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                background: "#f5f7fa",
                padding: 16,
                maxHeight: "50vh",
                overflow: "auto",
              }}
            >
              {JSON.stringify(selected.record, null, 2)}
            </pre>
          </>
        ) : (
          <StateView type="404" />
        )}
      </Drawer>
      <Modal
        width={720}
        title="补充正式归档文件"
        open={upload}
        okButtonProps={{ disabled: !canUpload }}
        onCancel={() => setUpload(false)}
        onOk={() => {
          if (!canUpload) return;
          if (
            run({
              type: "submit-archive-file",
              projectId: p.id,
              category,
              sourceId: sourceId ?? "",
              filename,
              note,
            })
          )
            setUpload(false);
        }}
      >
        <Alert
          type="info"
          message="仅登记文件名、版本及来源，提交后由PMO审核；不上传真实服务器、不修改结算金额。"
        />
        <Form layout="vertical" disabled={!canUpload}>
          <Form.Item label="归档分类" required>
            <Select
              aria-label="补档分类"
              value={category}
              onChange={(v) => {
                setCategory(v);
                setSourceId(sources.find((s) => s.category === v)?.id);
              }}
              options={ARCHIVE_CATEGORIES.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item label="绑定原业务 / 明确的历史补档容器" required>
            <Select
              aria-label="补档原业务"
              value={sourceId}
              onChange={setSourceId}
              options={sources
                .filter((s) => s.category === category)
                .map((s) => ({
                  value: s.id,
                  label: `${s.id} · ${s.label} · ${s.version}`,
                }))}
            />
          </Form.Item>
          <Form.Item label="正式文件名（pdf/docx/xlsx/zip）" required>
            <Input
              aria-label="补档文件名"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="原件来源及补档说明" required>
            <Input.TextArea
              aria-label="补档说明"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={review?.approve ? "PMO审核正式文件" : "退回补档文件"}
        open={!!review}
        okButtonProps={{ disabled: !canReview(review?.id) }}
        onCancel={() => setReview(undefined)}
        onOk={() => {
          if (!canReview(review?.id)) return;
          if (
            run({
              type: "review-archive-file",
              id: review!.id,
              approve: review!.approve,
              opinion: note,
            })
          )
            setReview(undefined);
        }}
      >
        <Input.TextArea
          aria-label="补档审核意见"
          disabled={!canReview(review?.id)}
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
      {archive && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="正式归档已确认"
          description={
            <Space>
              <span>归档已完成，可进入下一步。</span>
              <Button
                type="primary"
                size="small"
                onClick={() => navigate(`/projects/${p.id}/operation-handover`)}
              >
                下一步：运维移交
              </Button>
            </Space>
          }
        />
      )}
      <Modal
        title="确认正式归档并锁定本版本"
        open={confirm}
        okButtonProps={{ disabled: !canConfirm }}
        onCancel={() => setConfirm(false)}
        onOk={() => {
          if (!canConfirm) return;
          if (run({ type: "confirm-project-archive", projectId: p.id, note }))
            setConfirm(false);
        }}
      >
        <Alert
          type="warning"
          message="确认后保存14分类来源、文件版本、确认人与时间，当前正式材料及后评价只读。"
        />
        <Input.TextArea
          aria-label="正式归档意见"
          disabled={!canConfirm}
          rows={4}
          style={{ marginTop: 12 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
}
