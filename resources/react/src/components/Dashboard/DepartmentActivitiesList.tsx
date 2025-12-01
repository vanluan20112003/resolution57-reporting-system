import { useState } from 'react'
import { Card, Typography, Space, Button, Badge, Alert, Descriptions, Divider, Tag } from 'antd'
import {
  FileTextOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { mockActivities, mockActivityTypes, mockActivityFields, mockOrganizations, ActivityStatus } from '../../data/mockData'
import { DataTable } from '../../shared/components/DataTable'
import { getActivityColumns, statusConfig, formatBudget } from '../../shared/config/activityColumns'
import ActivityFilters from '../../shared/components/Filters/ActivityFilters'
import { ActivityCard, ActivityListItem } from '../../shared/components/Cards'
import { useAuth } from '../../shared/hooks'

dayjs.locale('vi')

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
  actual_start_date: string | null
  actual_end_date: string | null
  budget: number
  budget_source: string
  location: string
  completion_percentage: number
  result_summary?: string
  created_at: string
}

function DepartmentActivitiesList() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')

  // Get current user from auth
  const { user } = useAuth()

  // Get user's organization info from user data or fallback to mock
  const userOrganizationId = user?.organization_id || '4' // Fallback to UIT for demo
  const userOrganizationShortName = user?.organization_name || null
  const userOrganizationFullName = (user as any)?.organization_full_name || null
  const userOrganization = userOrganizationShortName
    ? {
        name: userOrganizationFullName || userOrganizationShortName,
        short_name: userOrganizationShortName
      }
    : mockOrganizations.find(o => o.id === userOrganizationId)

  // Filter activities của phòng ban
  const departmentActivities = mockActivities.filter(activity => {
    return activity.lead_organization_id === userOrganizationId
  })

  // Apply search and status filter
  const filteredActivities = departmentActivities.filter(activity => {
    const matchSearch = activity.title.toLowerCase().includes(searchText.toLowerCase()) ||
                       activity.code.toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = statusFilter === 'all' || activity.status === statusFilter
    return matchSearch && matchStatus
  })

  // Helper functions
  const getActivityTypeName = (typeId: string) => {
    return mockActivityTypes.find(t => t.id === typeId)?.name || 'N/A'
  }

  const getActivityFieldName = (fieldId: string) => {
    return mockActivityFields.find(f => f.id === fieldId)?.name || 'N/A'
  }

  const getOrganizationName = (orgId: string) => {
    return mockOrganizations.find(o => o.id === orgId)?.short_name || 'N/A'
  }

  const handleViewDetail = (activity: Activity) => {
    setSelectedActivity(activity)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedActivity(null)
  }

  // Get columns configuration
  const columns = getActivityColumns({
    getActivityTypeName,
    getActivityFieldName,
    getOrganizationName,
    onViewDetail: handleViewDetail,
  })

  // Render detail view - All info in one Card like other pages
  if (viewMode === 'detail' && selectedActivity) {
    return (
      <Card>
        {/* Back Button */}
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={handleBackToList}
          style={{ padding: 0, marginBottom: 16 }}
        >
          Quay lại danh sách
        </Button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
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
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
            {selectedActivity.code}
          </Text>
        </div>

        <Divider style={{ margin: '12px 0 24px 0' }} />

        {/* All Info in One Table */}
        <Descriptions column={2} bordered>
          {/* Basic Info Section */}
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

          {/* Timeline Section */}
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

          {/* Budget & Location Section */}
          <Descriptions.Item label="Kinh phí">
            <Text strong style={{ color: '#1890ff' }}>{formatBudget(selectedActivity.budget)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Nguồn kinh phí">
            {selectedActivity.budget_source}
          </Descriptions.Item>
          <Descriptions.Item label="Địa điểm" span={2}>
            {selectedActivity.location}
          </Descriptions.Item>

          {/* Results Section */}
          {selectedActivity.result_summary && (
            <Descriptions.Item label="Tóm tắt kết quả" span={2}>
              {selectedActivity.result_summary}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    )
  }

  // Render list view
  return (
    <div style={{ padding: '0' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <ApartmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                Hoạt động của {userOrganization?.short_name || userOrganization?.name || 'Phòng ban'}
              </Title>
            </Space>
            {userOrganization?.name && userOrganization?.short_name && userOrganization.name !== userOrganization.short_name && (
              <div style={{ marginLeft: 32, marginBottom: 8 }}>
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                  <TeamOutlined /> {userOrganization.name}
                </Tag>
              </div>
            )}
            <Text type="secondary" style={{ marginLeft: 32, display: 'block' }}>
              Hiển thị các hoạt động do {userOrganization?.name || 'phòng ban của bạn'} chủ trì
            </Text>
          </div>

          {/* Info Alert - Only show if using mock data */}
          {!user?.organization_id && (
            <Alert
              message="Dữ liệu mẫu"
              description={`Đang hiển thị hoạt động của ${userOrganization?.name}. Trong phiên bản thực tế sẽ dựa vào tổ chức của user đang đăng nhập.`}
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              closable
            />
          )}

          {/* Statistics */}
          <Space size="large" wrap>
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

          {/* Filters */}
          <ActivityFilters
            searchText={searchText}
            onSearchChange={setSearchText}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />

          {/* Activity List - Empty State */}
          {filteredActivities.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <Title level={4} type="secondary">Chưa có hoạt động nào</Title>
              <Text type="secondary">
                {departmentActivities.length === 0
                  ? 'Phòng ban chưa có hoạt động nào được tạo'
                  : 'Không tìm thấy hoạt động phù hợp với bộ lọc'}
              </Text>
            </div>
          )}

          {/* Activity List - List/Card/Table View */}
          {filteredActivities.length > 0 && (
            <DataTable
              columns={columns}
              dataSource={filteredActivities}
              rowKey="id"
              localStorageKey="activityDisplayMode"
              tableProps={{
                pagination: {
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng ${total} hoạt động`,
                },
                scroll: { x: 2400 },
              }}
              listRenderer={(activity) => (
                <ActivityListItem
                  activity={activity}
                  getActivityTypeName={getActivityTypeName}
                  getActivityFieldName={getActivityFieldName}
                  getOrganizationName={getOrganizationName}
                  onViewDetail={handleViewDetail}
                />
              )}
              cardRenderer={(activity) => (
                <ActivityCard
                  activity={activity}
                  getActivityTypeName={getActivityTypeName}
                  getActivityFieldName={getActivityFieldName}
                  getOrganizationName={getOrganizationName}
                  onViewDetail={handleViewDetail}
                />
              )}
            />
          )}
        </Space>
      </Card>
    </div>
  )
}

export default DepartmentActivitiesList
