import { List, Space, Tag, Typography, Button, Row, Col, Badge, Tooltip } from 'antd'
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { statusConfig } from '../../config/activityColumns'

const { Text, Title } = Typography

// Helper function to check if activity needs completion action
const needsCompletionAction = (activity: Activity): boolean => {
  if (activity.status !== 'COMPLETED') return false
  if (!activity.result_summary || activity.result_summary.trim() === '') {
    return true
  }
  return false
}

interface Activity {
  id: string
  code: string
  title: string
  description: string
  activity_type_id: string
  activity_field_id: string
  status: string
  lead_organization_id: string
  leader_names?: string[]
  start_date: string
  end_date: string
  budget: number
  budget_source: string
  location: string
  completion_percentage: number
  result_summary?: string
  // Relations (from API with eager loading)
  activity_type?: {
    id: string
    name: string
  }
  activity_field?: {
    id: string
    name: string
  }
  lead_organization?: {
    id: string
    name: string
    short_name?: string
  }
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
            {needsCompletionAction(activity) ? (
              <Badge dot offset={[-4, 0]}>
                <Tag
                  color={statusConfig[activity.status]?.color || 'default'}
                  icon={statusConfig[activity.status]?.icon}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {statusConfig[activity.status]?.label || activity.status}
                </Tag>
              </Badge>
            ) : (
              <Tag
                color={statusConfig[activity.status]?.color || 'default'}
                icon={statusConfig[activity.status]?.icon}
                style={{ fontSize: '14px', padding: '4px 12px' }}
              >
                {statusConfig[activity.status]?.label || activity.status}
              </Tag>
            )}
            {needsCompletionAction(activity) && (
              <Tooltip title="Cần cập nhật kết quả hoạt động">
                <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: '14px', padding: '4px 12px' }}>
                  Cần cập nhật
                </Tag>
              </Tooltip>
            )}
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

        {/* Description - truncated, show full in detail view */}
        {activity.description && (
          <Text
            style={{ fontSize: '15px', lineHeight: '1.6' }}
            ellipsis={{ rows: 2, tooltip: false }}
          >
            {activity.description.length > 150
              ? `${activity.description.substring(0, 150)}...`
              : activity.description}
          </Text>
        )}

        {/* Summary Information - only show key info, details in detail view */}
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Space size={4}>
              <TeamOutlined style={{ color: '#1890ff' }} />
              <Text style={{ fontSize: '13px' }}>
                {activity.lead_organization
                  ? (activity.lead_organization.short_name && activity.lead_organization.short_name !== activity.lead_organization.name
                      ? `${activity.lead_organization.short_name} - ${activity.lead_organization.name}`
                      : activity.lead_organization.name)
                  : getOrganizationName(activity.lead_organization_id)}
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space size={4}>
              <CalendarOutlined style={{ color: '#52c41a' }} />
              <Text style={{ fontSize: '13px' }}>
                {dayjs(activity.start_date).format('DD/MM/YYYY')} - {dayjs(activity.end_date).format('DD/MM/YYYY')}
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space size={4} wrap>
              <Tag color="blue" style={{ margin: 0 }}>
                {activity.activity_type?.name || getActivityTypeName(activity.activity_type_id)}
              </Tag>
              {(activity.activity_field || activity.activity_field_id) && (
                <Tag color="purple" style={{ margin: 0 }}>
                  {activity.activity_field?.name || getActivityFieldName(activity.activity_field_id)}
                </Tag>
              )}
            </Space>
          </Col>
          {activity.location && (
            <Col xs={24} sm={12} md={6}>
              <Space size={4}>
                <EnvironmentOutlined style={{ color: '#eb2f96' }} />
                <Text ellipsis style={{ fontSize: '13px', maxWidth: 200 }}>{activity.location}</Text>
              </Space>
            </Col>
          )}
        </Row>

        {/* Leader Names */}
        {activity.leader_names && activity.leader_names.length > 0 && (
          <Space size={4}>
            <UserOutlined style={{ color: '#722ed1' }} />
            <Text style={{ fontSize: '13px' }}>
              <Text strong>Người chủ trì:</Text> {activity.leader_names.join(', ')}
            </Text>
          </Space>
        )}

        {/* Action Button */}
        <Button type="primary" icon={<EyeOutlined />} onClick={() => onViewDetail(activity)}>
          Xem chi tiết
        </Button>
      </Space>
    </List.Item>
  )
}
