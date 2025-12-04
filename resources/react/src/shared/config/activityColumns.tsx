import React from 'react'
import { Tag, Typography, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ActivityStatus } from '../../data/mockData'

const { Text } = Typography

// Status configuration - supports both mock data enum and API string values
export const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // Using enum values (for mock data)
  [ActivityStatus.DRAFT]: { color: 'default', icon: <FileTextOutlined />, label: 'Nháp' },
  [ActivityStatus.PENDING_APPROVAL]: { color: 'warning', icon: <ClockCircleOutlined />, label: 'Chờ phê duyệt' },
  [ActivityStatus.IN_PROGRESS]: { color: 'red', icon: <ClockCircleOutlined />, label: 'Đang diễn ra' },
  [ActivityStatus.ON_HOLD]: { color: 'orange', icon: <ExclamationCircleOutlined />, label: 'Tạm hoãn' },
  [ActivityStatus.CANCELLED]: { color: 'error', icon: <ExclamationCircleOutlined />, label: 'Đã hủy' },
  [ActivityStatus.COMPLETED]: { color: 'success', icon: <CheckCircleOutlined />, label: 'Hoàn thành' },
  // API string values (uppercase) - for API responses
  'DRAFT': { color: 'default', icon: <FileTextOutlined />, label: 'Nháp' },
  'PENDING_APPROVAL': { color: 'warning', icon: <ClockCircleOutlined />, label: 'Chờ phê duyệt' },
  'APPROVED': { color: 'success', icon: <CheckCircleOutlined />, label: 'Đã phê duyệt' },
  'REJECTED': { color: 'error', icon: <ExclamationCircleOutlined />, label: 'Từ chối' },
  'IN_PROGRESS': { color: 'red', icon: <ClockCircleOutlined />, label: 'Đang diễn ra' },
  'POSTPONED': { color: 'orange', icon: <ExclamationCircleOutlined />, label: 'Tạm hoãn' },
  'CANCELLED': { color: 'error', icon: <ExclamationCircleOutlined />, label: 'Đã hủy' },
  'COMPLETED': { color: 'success', icon: <CheckCircleOutlined />, label: 'Hoàn thành' },
}

// Format budget helper
export const formatBudget = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
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
  creator?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

interface ActivityColumnsOptions {
  getActivityTypeName: (typeId: string) => string
  getActivityFieldName: (fieldId: string) => string
  getOrganizationName: (orgId: string) => string
  onViewDetail: (activity: Activity) => void
}

export const getActivityColumns = ({
  getActivityTypeName,
  getActivityFieldName,
  getOrganizationName,
  onViewDetail,
}: ActivityColumnsOptions): ColumnsType<Activity> => [
  {
    title: 'Mã',
    dataIndex: 'code',
    key: 'code',
    width: 140,
    render: (code: string) => (
      <Text strong style={{ color: '#1890ff' }}>
        {code}
      </Text>
    ),
  },
  {
    title: 'Mô tả',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    render: (title: string) => (
      <Text strong>{title}</Text>
    ),
  },
  {
    title: 'Loại hoạt động',
    dataIndex: 'activity_type_id',
    key: 'activity_type_id',
    width: 180,
    render: (_typeId: string, record: Activity) => {
      // Prefer nested relation data, fallback to lookup by ID
      const name = record.activity_type?.name || getActivityTypeName(record.activity_type_id)
      return <Tag color="blue">{name}</Tag>
    },
  },
  {
    title: 'Lĩnh vực',
    dataIndex: 'activity_field_id',
    key: 'activity_field_id',
    width: 180,
    render: (_fieldId: string, record: Activity) => {
      // Prefer nested relation data, fallback to lookup by ID
      const name = record.activity_field?.name || (record.activity_field_id ? getActivityFieldName(record.activity_field_id) : null)
      return name ? <Tag color="cyan">{name}</Tag> : <Text type="secondary">-</Text>
    },
  },
  {
    title: 'Đơn vị chủ trì',
    dataIndex: 'lead_organization_id',
    key: 'lead_organization_id',
    width: 200,
    render: (_orgId: string, record: Activity) => {
      // Prefer nested relation data, fallback to lookup by ID
      let name = 'N/A'
      if (record.lead_organization) {
        const org = record.lead_organization
        name = org.short_name && org.short_name !== org.name
          ? `${org.short_name} - ${org.name}`
          : org.name
      } else if (record.lead_organization_id) {
        name = getOrganizationName(record.lead_organization_id)
      }
      return (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <Text>{name}</Text>
        </Space>
      )
    },
  },
  {
    title: 'Thời gian kế hoạch',
    key: 'timeline',
    width: 220,
    render: (_: any, record: Activity) => (
      <Space direction="vertical" size={0}>
        <Space>
          <CalendarOutlined style={{ color: '#52c41a' }} />
          <Text strong>Bắt đầu:</Text>
          <Text>{dayjs(record.start_date).format('DD/MM/YYYY')}</Text>
        </Space>
        <Space>
          <CalendarOutlined style={{ color: '#ff4d4f' }} />
          <Text strong>Kết thúc:</Text>
          <Text>{dayjs(record.end_date).format('DD/MM/YYYY')}</Text>
        </Space>
      </Space>
    ),
  },
  {
    title: 'Thời gian thực tế',
    key: 'actual_timeline',
    width: 180,
    render: (_: any, record: Activity) => {
      if (!record.actual_start_date) {
        return <Text type="secondary">Chưa bắt đầu</Text>
      }
      if (record.actual_end_date) {
        return <Text type="secondary">Đang thực hiện</Text>
      }
      return <Text type="secondary">Đang thực hiện</Text>
    },
  },
  {
    title: 'Kinh phí',
    dataIndex: 'budget',
    key: 'budget',
    width: 160,
    align: 'right',
    render: (budget: number) => (
      <Space>
        <DollarOutlined style={{ color: '#faad14' }} />
        <Text strong>{formatBudget(budget)}</Text>
      </Space>
    ),
  },
  {
    title: 'Nguồn kinh phí',
    dataIndex: 'budget_source',
    key: 'budget_source',
    width: 200,
  },
  {
    title: 'Địa điểm',
    dataIndex: 'location',
    key: 'location',
    width: 200,
    ellipsis: true,
    render: (location: string) => (
      <Space>
        <EnvironmentOutlined style={{ color: '#fa8c16' }} />
        <Text>{location}</Text>
      </Space>
    ),
  },
  {
    title: 'Liên kết ngoài',
    key: 'external_link',
    width: 150,
    render: () => <Text type="secondary">-</Text>,
  },
  {
    title: 'Tóm tắt kết quả',
    dataIndex: 'result_summary',
    key: 'result_summary',
    width: 250,
    ellipsis: true,
    render: (summary: string) => summary || <Text type="secondary">-</Text>,
  },
  {
    title: 'Người tạo',
    key: 'creator',
    width: 200,
    render: (_: any, record: Activity) => {
      if (record.creator) {
        const fullName = `${record.creator.last_name || ''} ${record.creator.first_name || ''}`.trim()
        return (
          <Space>
            <UserOutlined />
            <Text>{fullName || record.creator.email}</Text>
          </Space>
        )
      }
      return <Text type="secondary">-</Text>
    },
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    width: 140,
    fixed: 'right',
    render: (status: string) => {
      const config = statusConfig[status]
      return (
        <Tag color={config.color} icon={config.icon}>
          {config.label}
        </Tag>
      )
    },
  },
  {
    title: '',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (_: any, record: Activity) => (
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => onViewDetail(record)}
      >
        Xem chi tiết
      </Button>
    ),
  },
]
