import { Card, Tag, Typography, Space, Button, List } from 'antd'
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { statusConfig, formatBudget } from '../../config/activityColumns'

const { Text } = Typography

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
  actual_start_date: string | null
  actual_end_date: string | null
  budget: number
  budget_source: string
  location: string
  completion_percentage: number
  result_summary?: string
  created_at: string
}

interface ActivityCardProps {
  activity: Activity
  getActivityTypeName: (typeId: string) => string
  getActivityFieldName: (fieldId: string) => string
  getOrganizationName: (orgId: string) => string
  onViewDetail: (activity: Activity) => void
}

function ActivityCard({
  activity,
  getActivityTypeName,
  getActivityFieldName,
  getOrganizationName,
  onViewDetail,
}: ActivityCardProps) {
  const config = statusConfig[activity.status]

  return (
    <List.Item style={{ marginBottom: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
      <Card
        hoverable
        size="small"
        title={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong ellipsis={{ tooltip: activity.title }} style={{ fontSize: '14px' }}>
              {activity.title}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {activity.code}
            </Text>
          </Space>
        }
        extra={
          <Tag color={config.color} icon={config.icon} style={{ margin: 0 }}>
            {config.label}
          </Tag>
        }
        actions={[
          <Button
            type="link"
            icon={<EyeOutlined />}
            key="view"
            size="small"
            onClick={() => onViewDetail(activity)}
          >
            Chi tiết
          </Button>,
        ]}
        style={{ marginBottom: 0 }}
      >
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {/* Organization */}
          <Space size="small">
            <TeamOutlined style={{ color: '#1890ff', fontSize: '13px' }} />
            <Text strong style={{ fontSize: '13px' }}>{getOrganizationName(activity.lead_organization_id)}</Text>
          </Space>

          {/* Type & Field */}
          <Space wrap size={4}>
            <Tag color="blue" style={{ fontSize: '11px', margin: 0 }}>{getActivityTypeName(activity.activity_type_id)}</Tag>
            {activity.activity_field_id && (
              <Tag color="cyan" style={{ fontSize: '11px', margin: 0 }}>{getActivityFieldName(activity.activity_field_id)}</Tag>
            )}
          </Space>

          {/* Date */}
          <Space size="small">
            <CalendarOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
            <Text style={{ fontSize: '12px' }}>
              {dayjs(activity.start_date).format('DD/MM/YYYY')} -{' '}
              {dayjs(activity.end_date).format('DD/MM/YYYY')}
            </Text>
          </Space>

          {/* Location */}
          {activity.location && (
            <Space size="small">
              <EnvironmentOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />
              <Text ellipsis={{ tooltip: activity.location }} style={{ fontSize: '12px' }}>
                {activity.location}
              </Text>
            </Space>
          )}

          {/* Budget */}
          {activity.budget && (
            <Space size="small">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Kinh phí: <Text strong style={{ fontSize: '12px' }}>{formatBudget(activity.budget)}</Text>
              </Text>
            </Space>
          )}

          {/* Progress */}
          {activity.completion_percentage > 0 && (
            <div>
              <Text style={{ fontSize: '11px' }}>
                Tiến độ: {activity.completion_percentage}%
              </Text>
              <div
                style={{
                  width: '100%',
                  marginTop: '2px',
                  background: '#f0f0f0',
                  borderRadius: '3px',
                  height: '5px',
                }}
              >
                <div
                  style={{
                    width: `${activity.completion_percentage}%`,
                    background:
                      activity.completion_percentage === 100 ? '#52c41a' : '#1890ff',
                    height: '100%',
                    borderRadius: '3px',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}
        </Space>
      </Card>
    </List.Item>
  )
}

export default ActivityCard
