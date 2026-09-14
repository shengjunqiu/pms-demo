import { Alert, Button, Card, Col, Descriptions, Empty, Input, List, Row, Select, Space, Tabs, Tag } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { useAppStore } from '@/store/useAppStore';
import { canViewInitiation, INITIATION_SIGNATURES, initiationClassification } from '@/mock/initiation';
import { PageSection } from '@/components/common/PageSection';
import { MetricStatCard } from '@/components/common/MetricStatCard';
import { MoneyText } from '@/components/common/MoneyText';
import { InitiationHeader, SourceSummary, useInitiationNavigation, useInitiationText } from './InitiationShared';



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
          ]}
        />
      </Card>

    </>
  );
}
