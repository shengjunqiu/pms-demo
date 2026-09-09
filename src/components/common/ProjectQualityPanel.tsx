import { Descriptions, Table, Tag, Typography } from 'antd';
import { useBusinessStore } from '@/mock/business';

/** Overview of the current quality plan and its linked evidence, without approval controls. */
export function ProjectQualityPanel({ projectId }: { projectId: string }) {
  const data = useBusinessStore((s) => s.data);
  const project = data.projects.find((p) => p.id === projectId)!;
  const bugs = data.bugs.filter((b) => b.projectId === projectId && b.status !== '已关闭');
  const materials = data.materials.filter((m) => m.projectId === projectId && m.required);
  const review = data.acceptances.find((a) => a.projectId === projectId && a.type === '内部初验');
  const checks = [
    { id: 'defect', name: '缺陷闭环检查', standard: '进入内部初验前，全部缺陷完成复测与发起人确认', result: `${bugs.length} 项未关闭`, status: bugs.length ? '待整改' : '通过' },
    { id: 'material', name: '交付质量材料检查', standard: '阶段必交材料全部审核通过', result: `${materials.filter((m) => m.status === '通过').length}/${materials.length} 项通过`, status: materials.length && materials.every((m) => m.status === '通过') ? '通过' : '待补齐' },
  ];
  return <>
    <Descriptions bordered size="small" column={2} items={[
      { key: 'plan', label: '质量计划', children: `QP-${projectId} / V1.0` },
      { key: 'owner', label: '质量责任人', children: project.pmName },
      { key: 'scope', label: '检查范围', children: '需求交付、缺陷复测、阶段交付材料' },
      { key: 'frequency', label: '检查安排', children: '每周复核，内部初验前专项检查' },
      { key: 'review', label: '内部质量评审', children: `${review?.id ?? '尚未创建'} · ${review?.status ?? '待安排'} · 第 ${review?.round ?? 0} 轮` },
      { key: 'rule', label: '演示规则', children: '缺陷检查通过不自动替代内部初验审批' },
    ]} />
    <Typography.Title level={5}>质量检查与证据</Typography.Title>
    <Table rowKey="id" size="small" pagination={false} dataSource={checks} columns={[
      { title: '检查项', dataIndex: 'name' }, { title: '质量标准', dataIndex: 'standard' }, { title: '当前证据', dataIndex: 'result' },
      { title: '结果', dataIndex: 'status', render: (v: string) => <Tag color={v === '通过' ? 'success' : 'warning'}>{v}</Tag> },
    ]} />
    <Typography.Title level={5}>关联整改事项</Typography.Title>
    <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={bugs} columns={[
      { title: 'BUG 编号', dataIndex: 'id' }, { title: '整改内容', dataIndex: 'title' }, { title: '责任人', dataIndex: 'owner' },
      { title: '最终确认人', dataIndex: 'creator' }, { title: '当前状态', dataIndex: 'status' },
    ]} />
    <Typography.Text type="secondary">检查结果引用当前 BUG 与材料记录；整改状态在原业务维护，内部评审引用验收轮次。</Typography.Text>
  </>;
}
