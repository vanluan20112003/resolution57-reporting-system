import { List, Space, Tag, Typography, Button, Progress, Row, Col } from 'antd'
import {
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { statusConfig, formatBudget } from '../../config/activityColumns'

const { Text, Title } = Typography

interface Activity {
  id: string
  code: string
  title: string
  description: string
  activity_type_id: string
  activity_field_id: string
  status: string
  lead_organization_id: string
  start_date: string
  end_date: string
  budget: number
  budget_source: string
  location: string
  completion_percentage: number
  result_summary?: string
}

interface ActivityListItemProps {
  activity: Activity
  getActivityTypeName: (typeId: string) => string
  getActivityFieldName: (fieldId: string) => string
  getOrganizationName: (orgId: string) => string
  onViewDetail: (activity: Activity) => void
}

export function ActivityListItem({
  activity,
  getActivityTypeName,
  getActivityFieldName,
  getOrganizationName,
  onViewDetail,
}: ActivityListItemProps) {
  return (
    <List.Item
      style={{
        padding: '24px',
        marginBottom: '16px',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        background: '#fafafa',
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Title and Tags */}
        <div>
          <Space wrap size={[8, 8]} style={{ marginBottom: '12px' }}>
            <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
              {activity.code}
            </Tag>
            <Tag
              color={statusConfig[activity.status]?.color || 'default'}
              icon={statusConfig[activity.status]?.icon}
              style={{ fontSize: '14px', padding: '4px 12px' }}
            >
              {statusConfig[activity.status]?.label || activity.status}
            </Tag>
            {activity.completion_percentage > 0 && (
              <Tag color="cyan" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {activity.completion_percentage}% hoàn thành
              </Tag>
            )}
          </Space>
          <Title level={4} style={{ margin: 0 }}>
            {activity.title}
          </Title>
        </div>

        {/* Description */}
        <Text style={{ fontSize: '15px', lineHeight: '1.6' }}>
          {activity.description}
        </Text>

        {/* Full Information Grid */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Loại hoạt động</Text>
              <Tag>{getActivityTypeName(activity.activity_type_id)}</Tag>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Lĩnh vực</Text>
              {activity.activity_field_id && (
                <Tag color="purple">
                  {getActivityFieldName(activity.activity_field_id)}
                </Tag>
              )}
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Đơn vị chủ trì</Text>
              <Space size={4}>
                <TeamOutlined style={{ color: '#1890ff' }} />
                <Text>{getOrganizationName(activity.lead_organization_id)}</Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Thời gian kế hoạch</Text>
              <Space size={4}>
                <CalendarOutlined style={{ color: '#52c41a' }} />
                <Text>
                  {dayjs(activity.start_date).format('DD/MM/YYYY')} - {dayjs(activity.end_date).format('DD/MM/YYYY')}
                </Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Kinh phí</Text>
              <Space size={4}>
                <DollarOutlined style={{ color: '#faad14' }} />
                <Text strong>{formatBudget(activity.budget)}</Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Nguồn kinh phí</Text>
              <Tag color="geekblue">{activity.budget_source}</Tag>
            </Space>
          </Col>
          <Col xs={24}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Địa điểm</Text>
              <Space size={4}>
                <EnvironmentOutlined style={{ color: '#eb2f96' }} />
                <Text>{activity.location}</Text>
              </Space>
            </Space>
          </Col>
          {activity.result_summary && (
            <Col xs={24}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Tóm tắt kết quả</Text>
                <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>{activity.result_summary}</Text>
              </Space>
            </Col>
          )}
        </Row>

        {/* Progress Bar for In Progress items */}
        {activity.status === 'IN_PROGRESS' && (
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              Tiến độ thực hiện
            </Text>
            <Progress
              percent={activity.completion_percentage}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}

        {/* Action Button */}
        <Button type="primary" icon={<EyeOutlined />} onClick={() => onViewDetail(activity)}>
          Xem chi tiết
        </Button>
      </Space>
    </List.Item>
  )
}
