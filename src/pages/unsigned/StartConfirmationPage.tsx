import { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  Space,
  Table,
  Tag,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useActionAccess } from '@/hooks/useActionAccess';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';
import { AS_OF_DATE } from '@/mock';
import { startupChecks } from '@/mock/unsigned';
import { visibleProjects } from '@/mock/selectors';
import { StateView } from '@/components/common/StateView';
import { PageHeader } from '@/components/common/PageHeader';

export function StartConfirmationPage() {
  const { canDo } = useActionAccess();
  const { id } = useParams();
  const { data, dispatch } = useBusinessStore();
  const actor = useAppStore((state) => state.currentUser);
  const navigate = useNavigate();
  const [date, setDate] = useState(AS_OF_DATE);
  const [opinion, setOpinion] = useState('');
  const { message, modal } = App.useApp();
  const project = data.projects.find((item) => item.id === id);

  if (!project) return <StateView type="404" />;
  if (
    !visibleProjects(actor.role, data.projects, data).some(
      (item) => item.id === project.id,
    )
  )
    return <StateView type="403" />;

  const result = startupChecks(data, project);
  const confirmed = data.startConfirmations[project.id];
  const canConfirm =
    canDo('confirm-project-start', project.id) &&
    !confirmed &&
    (actor.role === 'pmo' ||
      (actor.role === 'project-manager' && actor.id === project.pmId));

  return (
    <>
      <PageHeader
        title="项目启动确认"
        description={`${project.id} · ${project.name}`}
        breadcrumbs={[
          { title: '项目', href: `/projects/${project.id}` },
          { title: '启动确认' },
        ]}
        extra={
          <Button onClick={() => navigate(`/projects/${project.id}`)}>项目详情</Button>
        }
      />
      <div className="pms-record-summary"><Descriptions
        size="small"
        column={3}
        items={[
          {
            key: 'phase',
            label: '当前阶段',
            children: `${project.phase} / ${project.subPhase}`,
          },
          { key: 'pm', label: '主 PM', children: project.pmName },
          {
            key: 'baseline',
            label: '当前基线',
            children: project.currentBaselineVersion,
          },
        ]}
      />
      </div>
      <Alert showIcon style={{marginTop:16}} type={confirmed?'success':result.checks.every(check=>check.passed)?'success':'warning'} message={confirmed?'项目已正式启动':`已满足 ${result.checks.filter(check=>check.passed).length} / ${result.checks.length} 项启动条件`} description={confirmed?`${confirmed.date} · ${confirmed.by} · ${confirmed.opinion}`:result.checks.filter(check=>!check.passed).map(check=>check.name).join('、')||'请核对实际启动日期与会议意见，确认后生成执行事项。'}/>
      <Card title="启动条件检查" style={{ marginTop: 16 }}>
        <Table
          rowKey="key"
          size="small"
          scroll={{x:760}}
          pagination={false}
          dataSource={confirmed?.checks ?? result.checks}
          columns={[
            { title: '检查项', dataIndex: 'name' },
            {
              title: '结果',
              dataIndex: 'passed',
              render: (passed) => (
                <Tag color={passed ? 'green' : 'red'}>
                  {passed ? '满足' : '未满足'}
                </Tag>
              ),
            },
            { title: '依据', dataIndex: 'detail' },
            {
              title: '前置办理',
              render: (_, check) => {
                const path = {
                  initiation: '/initiation/review',
                  pm: `/projects/${project.id}/team`,
                  baseline: `/projects/${project.id}/baseline`,
                  schedule: `/projects/${project.id}/wbs`,
                  team: `/projects/${project.id}/wbs`,
                  contract: `/unsigned-projects/${project.id}`,
                }[check.key as 'pm'];
                return path ? (
                  <Button type="link" onClick={() => navigate(path)}>
                    进入原业务
                  </Button>
                ) : null;
              },
            },
          ]}
        />
      </Card>
      {confirmed ? (
        <>
          <Card title="启动记录及模拟通知" style={{ marginTop: 16 }}>
            <Alert
              type="success"
              showIcon
              message={`${confirmed.date} · ${confirmed.by} 已确认正式启动`}
              description={confirmed.opinion}
            />
            <p>
              启动依据：{confirmed.baseline.version} · {confirmed.contract.code} ·{' '}
              {confirmed.appointmentId} · {confirmed.startMilestone.name}
            </p>
            <Table
              rowKey="userId"
              size="small"
              scroll={{x:760}}
              pagination={false}
              dataSource={confirmed.notifications}
              columns={[
                { title: '接收人', dataIndex: 'name' },
                { title: '角色', dataIndex: 'role' },
                { title: '模拟通知状态', dataIndex: 'status' },
                { title: '通知内容', dataIndex: 'message' },
              ]}
            />
          </Card>
          <Card title="已激活的真实执行事项" style={{ marginTop: 16 }}>
            <Alert
              showIcon
              type="info"
              message="执行事项已按生效计划生成，请由责任人进入对应业务页面办理。"
              style={{ marginBottom: 16 }}
            />
            <Table
              rowKey="id"
              size="small"
              scroll={{x:900}}
              pagination={false}
              dataSource={confirmed.executionWork}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '事项', dataIndex: 'title' },
                { title: '来源', dataIndex: 'sourceId' },
                { title: '责任人', dataIndex: 'ownerName' },
                { title: '截止日期', dataIndex: 'dueDate' },
                { title: '状态', dataIndex: 'status' },
                {
                  title: '原业务办理',
                  render: (_, work) => (
                    <Button
                      type="link"
                      disabled={!canDo(work.policyAction, work.policyTargetId)}
                      onClick={() => navigate(work.route)}
                    >
                      进入原业务
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Card title="确认正式启动" style={{ marginTop: 16 }}>
          <Alert
            showIcon
            message="必须先满足立项、唯一任命、完整基线、启动里程碑及真实签约条件。确认后进入执行，并激活WBS、日报和工时入口。"
          />
          <Space wrap style={{ margin: '16px 0' }}>
            <span>实际启动日期</span>
            <DatePicker
              aria-label="实际启动日期"
              disabled={!canConfirm}
              value={dayjs(date)}
              onChange={(value) => setDate(value?.format('YYYY-MM-DD') ?? '')}
            />
          </Space>
          <p>启动会议与确认意见</p><Input.TextArea
            aria-label="启动会议与确认意见"
            rows={3}
            disabled={!canConfirm}
            value={opinion}
            onChange={(event) => setOpinion(event.target.value)}
            placeholder="启动会议安排、执行要求与确认意见"
          />
          <Button
            style={{ marginTop: 16 }}
            type="primary"
            disabled={!canConfirm}
            onClick={() =>
              modal.confirm({
                title: '确认项目正式启动？',
                content:
                  '系统重新核对全部启动条件，保存依据快照并激活真实执行事项。',
                onOk: () => {
                  try {
                    if (!canDo('confirm-project-start', project.id))
                      throw new Error('当前策略不允许启动项目');
                    dispatch(
                      {
                        type: 'confirm-project-start',
                        projectId: project.id,
                        date,
                        opinion,
                      },
                      actor,
                    );
                    message.success('项目已正式启动');
                  } catch (error) {
                    message.error((error as Error).message);
                    // Business validation is shown inline; do not create an unhandled rejection.
                    return;
                  }
                },
              })
            }
          >
            确认正式启动
          </Button>
        </Card>
      )}
    </>
  );
}
