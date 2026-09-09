import React from 'react';
import { Card, Tag, Typography, Space, Button, Descriptions, Alert } from 'antd';
import { ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { PAGE_MANIFEST } from '@/routes/manifest';
import { PageHeader } from '@/components/common/PageHeader';

const { Text } = Typography;

export const PagePlaceholder: React.FC<{ pageId?: string }> = ({ pageId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const item = PAGE_MANIFEST.find((p) => {
    if (pageId && p.id === pageId) return true;
    if (p.route === location.pathname) return true;
    const pattern = p.route.replace(/:[a-zA-Z]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(location.pathname);
  });

  if (!item) {
    return (
      <Card>
        <Alert
          type="info"
          message="页面准备中"
          description={`当前访问路径为 ${location.pathname}`}
          showIcon
        />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        item={item}
        title={`${item.id} - ${item.title}`}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回上一页
          </Button>
        }
      />

      <Alert
        message={`本页面 [${item.id}] 将在 Phase ${item.phase} 中按任务书与验收标准完整实现。`}
        description="所有原型路由已挂载，导航与参数链路正常打通。当前为高保真框架状态。"
        type="info"
        showIcon
        icon={<ClockCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Card title="页面定义与规格说明" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="页面编号">
            <Tag color="blue">{item.id}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="页面类型">
            <Tag color="cyan">{item.kind}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="建议路由">
            <Text code>{item.route}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="所属开发阶段">
            <Tag color="geekblue">Phase {item.phase}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="适用角色" span={2}>
            {item.roles}
          </Descriptions.Item>
          <Descriptions.Item label="映射功能ID" span={2}>
            <Space wrap size={4}>
              {item.feature_ids.map((fid) => (
                <Tag key={fid} color="purple">{fid}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="上游功能范围" span={2}>
            {item.upstream_feature_scope}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="页面专属验收标准" size="small">
        <ul style={{ paddingLeft: 20, margin: 0, lineHeight: '24px' }}>
          {item.criteria.map((crit, idx) => (
            <li key={idx}><Text>{crit}</Text></li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
