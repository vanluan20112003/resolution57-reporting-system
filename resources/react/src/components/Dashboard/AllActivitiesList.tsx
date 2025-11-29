import { useState, useEffect } from 'react'
import { Card, List, Tag, Typography, Space, Input, Select, Button, Badge, Descriptions, Divider, Segmented, Table } from 'antd'
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
  ArrowLeftOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { mockActivities, mockActivityTypes, mockActivityFields, mockOrganizations, ActivityStatus } from '../../data/mockData'

dayjs.locale('vi')

const { Text, Title } = Typography
const { Search } = Input

// Status color and icon mapping
const statusConfig = {
  [ActivityStatus.DRAFT]: { color: 'default', icon: <FileTextOutlined />, label: 'Mở mới' },
  [ActivityStatus.PENDING_APPROVAL]: { color: 'warning', icon: <ClockCircleOutlined />, label: 'Chờ phê duyệt' },
  [ActivityStatus.IN_PROGRESS]: { color: 'processing', icon: <ClockCircleOutlined />, label: 'Đang thực hiện' },
  [ActivityStatus.ON_HOLD]: { color: 'warning', icon: <ExclamationCircleOutlined />, label: 'Hoãn' },
  [ActivityStatus.CANCELLED]: { color: 'error', icon: <ExclamationCircleOutlined />, label: 'Huỷ' },
  [ActivityStatus.COMPLETED]: { color: 'success', icon: <CheckCircleOutlined />, label: 'Hoàn thành' },
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
}

function AllActivitiesList() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [displayMode, setDisplayMode] = useState<'table' | 'card'>('table')

  // Load display mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('activityDisplayMode')
    if (savedMode === 'card' || savedMode === 'table') {
      setDisplayMode(savedMode)
    }
  }, [])

  // Save display mode to localStorage
  const handleDisplayModeChange = (mode: 'table' | 'card') => {
    setDisplayMode(mode)
    localStorage.setItem('activityDisplayMode', mode)
  }

  // Filter activities
  const filteredActivities = mockActivities.filter(activity => {
    const matchSearch = activity.title.toLowerCase().includes(searchText.toLowerCase()) ||
                       activity.code.toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = statusFilter === 'all' || activity.status === statusFilter
    const matchType = typeFilter === 'all' || activity.activity_type_id === typeFilter
    return matchSearch && matchStatus && matchType
  })

  // Get activity type name
  const getActivityTypeName = (typeId: string) => {
    return mockActivityTypes.find(t => t.id === typeId)?.name || 'N/A'
  }

  // Get activity field name
  const getActivityFieldName = (fieldId: string) => {
    return mockActivityFields.find(f => f.id === fieldId)?.name || 'N/A'
  }

  // Get organization name
  const getOrganizationName = (orgId: string) => {
    return mockOrganizations.find(o => o.id === orgId)?.short_name || 'N/A'
  }

  // Format budget
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Handle view detail
  const handleViewDetail = (activity: Activity) => {
    setSelectedActivity(activity)
    setViewMode('detail')
  }

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list')
    setSelectedActivity(null)
  }

  // Table columns for list view
  const columns: ColumnsType<Activity> = [
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
      title: 'Tổ chức hội thảo quốc tế với sự tham gia của các chuyên gia hàng đầu trong lĩnh vực AI, dự kiến có 200 đại biểu',
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
      render: (typeId: string) => (
        <Tag color="blue">{getActivityTypeName(typeId)}</Tag>
      ),
    },
    {
      title: 'Lĩnh vực',
      dataIndex: 'activity_field_id',
      key: 'activity_field_id',
      width: 180,
      render: (fieldId: string) => (
        fieldId ? <Tag color="cyan">{getActivityFieldName(fieldId)}</Tag> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Đơn vị chủ trì',
      dataIndex: 'lead_organization_id',
      key: 'lead_organization_id',
      width: 200,
      render: (orgId: string) => (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <Text>{getOrganizationName(orgId)}</Text>
        </Space>
      ),
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
      render: () => (
        <Space>
          <UserOutlined />
          <Text>Lê Văn C (khoacntt@vnuhcm.edu.vn)</Text>
        </Space>
      ),
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
          onClick={() => handleViewDetail(record)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ]

  // Render detail view
  if (viewMode === 'detail' && selectedActivity) {
    return (
      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Back Button */}
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToList}
            style={{ padding: 0 }}
          >
            Quay lại danh sách
          </Button>

          {/* Header */}
          <div>
            <Space align="start">
              <Title level={3} style={{ margin: 0 }}>
                {selectedActivity.title}
              </Title>
              <Tag
                color={statusConfig[selectedActivity.status]?.color}
                icon={statusConfig[selectedActivity.status]?.icon}
                style={{ fontSize: '14px', padding: '4px 12px' }}
              >
                {statusConfig[selectedActivity.status]?.label}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {selectedActivity.code}
            </Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Basic Info */}
          <Descriptions title="Thông tin cơ bản" column={2} bordered>
            <Descriptions.Item label="Mã hoạt động" span={2}>
              <Text strong>{selectedActivity.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên hoạt động" span={2}>
              <Text strong>{selectedActivity.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đơn vị chủ trì" span={2}>
              {mockOrganizations.find(o => o.id === selectedActivity.lead_organization_id)?.name || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Loại hoạt động">
              {getActivityTypeName(selectedActivity.activity_type_id)}
            </Descriptions.Item>
            <Descriptions.Item label="Lĩnh vực">
              {selectedActivity.activity_field_id ? getActivityFieldName(selectedActivity.activity_field_id) : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>
              {selectedActivity.description}
            </Descriptions.Item>
          </Descriptions>

          {/* Timeline */}
          <Descriptions title="Thời gian" column={2} bordered>
            <Descriptions.Item label="Thời gian kế hoạch" span={2}>
              {dayjs(selectedActivity.start_date).format('DD/MM/YYYY')} - {dayjs(selectedActivity.end_date).format('DD/MM/YYYY')}
            </Descriptions.Item>
            {selectedActivity.actual_start_date && (
              <Descriptions.Item label="Thời gian thực tế" span={2}>
                {dayjs(selectedActivity.actual_start_date).format('DD/MM/YYYY')}
                {selectedActivity.actual_end_date ? ` - ${dayjs(selectedActivity.actual_end_date).format('DD/MM/YYYY')}` : ' - Đang thực hiện'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedActivity.created_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Tiến độ">
              <Space>
                <div style={{ width: '120px', background: '#f0f0f0', borderRadius: '4px', height: '16px' }}>
                  <div
                    style={{
                      width: `${selectedActivity.completion_percentage}%`,
                      background: selectedActivity.completion_percentage === 100 ? '#52c41a' : '#1890ff',
                      height: '100%',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <Text strong>{selectedActivity.completion_percentage}%</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>

          {/* Budget & Location */}
          <Descriptions title="Kinh phí & Địa điểm" column={2} bordered>
            <Descriptions.Item label="Kinh phí">
              <Text strong style={{ color: '#1890ff' }}>{formatBudget(selectedActivity.budget)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Nguồn kinh phí">
              {selectedActivity.budget_source}
            </Descriptions.Item>
            <Descriptions.Item label="Địa điểm" span={2}>
              {selectedActivity.location}
            </Descriptions.Item>
          </Descriptions>

          {/* Results */}
          {selectedActivity.result_summary && (
            <Descriptions title="Kết quả" column={1} bordered>
              <Descriptions.Item label="Tóm tắt kết quả">
                {selectedActivity.result_summary}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </div>
    )
  }

  // Render list view
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={3}>
            <TeamOutlined /> Tất cả hoạt động trong hệ thống
          </Title>
          <Text type="secondary">
            Hiển thị toàn bộ hoạt động của ĐHQG-HCM
          </Text>
        </div>

        {/* Statistics */}
        <Card>
          <Space size="large">
            <Badge count={filteredActivities.length} showZero color="blue">
              <Text strong>Tổng số: </Text>
            </Badge>
            <Badge count={filteredActivities.filter(a => a.status === ActivityStatus.COMPLETED).length} showZero color="green">
              <Text strong>Hoàn thành: </Text>
            </Badge>
            <Badge count={filteredActivities.filter(a => a.status === ActivityStatus.IN_PROGRESS).length} showZero color="orange">
              <Text strong>Đang thực hiện: </Text>
            </Badge>
            <Badge count={filteredActivities.filter(a => a.status === ActivityStatus.PENDING_APPROVAL).length} showZero color="gold">
              <Text strong>Chờ duyệt: </Text>
            </Badge>
          </Space>
        </Card>

        {/* Filters */}
        <Card>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Search
                placeholder="Tìm kiếm theo tên hoặc mã hoạt động..."
                allowClear
                style={{ width: 300 }}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                style={{ width: 180 }}
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value={ActivityStatus.DRAFT}>Mở mới</Select.Option>
                <Select.Option value={ActivityStatus.PENDING_APPROVAL}>Chờ phê duyệt</Select.Option>
                <Select.Option value={ActivityStatus.IN_PROGRESS}>Đang thực hiện</Select.Option>
                <Select.Option value={ActivityStatus.ON_HOLD}>Hoãn</Select.Option>
                <Select.Option value={ActivityStatus.CANCELLED}>Huỷ</Select.Option>
                <Select.Option value={ActivityStatus.COMPLETED}>Hoàn thành</Select.Option>
              </Select>
              <Select
                style={{ width: 180 }}
                placeholder="Loại hoạt động"
                value={typeFilter}
                onChange={setTypeFilter}
              >
                <Select.Option value="all">Tất cả loại</Select.Option>
                {mockActivityTypes.map(type => (
                  <Select.Option key={type.id} value={type.id}>{type.name}</Select.Option>
                ))}
              </Select>
            </Space>
            <Segmented
              value={displayMode}
              onChange={handleDisplayModeChange}
              options={[
                {
                  label: 'Danh sách',
                  value: 'table',
                  icon: <UnorderedListOutlined />,
                },
                {
                  label: 'Thẻ',
                  value: 'card',
                  icon: <AppstoreOutlined />,
                },
              ]}
            />
          </Space>
        </Card>

        {/* Activity List - Table View */}
        {displayMode === 'table' && (
          <Table
            columns={columns}
            dataSource={filteredActivities}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} hoạt động`,
            }}
            scroll={{ x: 2400 }}
            bordered
          />
        )}

        {/* Activity List - Card View */}
        {displayMode === 'card' && (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
            dataSource={filteredActivities}
            pagination={{
              pageSize: 12,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} hoạt động`,
            }}
            renderItem={(activity) => {
              const config = statusConfig[activity.status]
              return (
                <List.Item>
                  <Card
                    hoverable
                    title={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong ellipsis={{ tooltip: activity.title }}>
                          {activity.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {activity.code}
                        </Text>
                      </Space>
                    }
                    extra={
                      <Tag color={config.color} icon={config.icon}>
                        {config.label}
                      </Tag>
                    }
                    actions={[
                      <Button type="link" icon={<EyeOutlined />} key="view" onClick={() => handleViewDetail(activity)}>
                        Chi tiết
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {/* Organization */}
                      <Space>
                        <TeamOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{getOrganizationName(activity.lead_organization_id)}</Text>
                      </Space>

                      {/* Type & Field */}
                      <Space wrap>
                        <Tag color="blue">{getActivityTypeName(activity.activity_type_id)}</Tag>
                        {activity.activity_field_id && (
                          <Tag color="cyan">{getActivityFieldName(activity.activity_field_id)}</Tag>
                        )}
                      </Space>

                      {/* Date */}
                      <Space>
                        <CalendarOutlined style={{ color: '#52c41a' }} />
                        <Text style={{ fontSize: '13px' }}>
                          {dayjs(activity.start_date).format('DD/MM/YYYY')} - {dayjs(activity.end_date).format('DD/MM/YYYY')}
                        </Text>
                      </Space>

                      {/* Location */}
                      {activity.location && (
                        <Space>
                          <EnvironmentOutlined style={{ color: '#fa8c16' }} />
                          <Text ellipsis={{ tooltip: activity.location }} style={{ fontSize: '13px' }}>
                            {activity.location}
                          </Text>
                        </Space>
                      )}

                      {/* Budget */}
                      {activity.budget && (
                        <Space>
                          <Text type="secondary" style={{ fontSize: '13px' }}>
                            Kinh phí: <Text strong>{formatBudget(activity.budget)}</Text>
                          </Text>
                        </Space>
                      )}

                      {/* Progress */}
                      {activity.completion_percentage > 0 && (
                        <div>
                          <Text style={{ fontSize: '12px' }}>Tiến độ: {activity.completion_percentage}%</Text>
                          <div style={{ width: '100%', marginTop: '4px', background: '#f0f0f0', borderRadius: '4px', height: '6px' }}>
                            <div
                              style={{
                                width: `${activity.completion_percentage}%`,
                                background: activity.completion_percentage === 100 ? '#52c41a' : '#1890ff',
                                height: '100%',
                                borderRadius: '4px',
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
            }}
          />
        )}
      </Space>
    </div>
  )
}

export default AllActivitiesList
