import { useState, useEffect } from 'react'
import { Card, Typography, Space, Button, Descriptions, Divider, Tag } from 'antd'
import {
  TeamOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { mockActivities, mockActivityTypes, mockActivityFields, mockOrganizations } from '../../data/mockData'
import { DataTable, DisplayMode } from '../../shared/components/DataTable'
import { getActivityColumns, statusConfig, formatBudget } from '../../shared/config/activityColumns'
import ActivityFilters from '../../shared/components/Filters/ActivityFilters'
import { ActivityCard, ActivityListItem } from '../../shared/components/Cards'

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

function AllActivitiesList() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')

  // Filter activities
  const filteredActivities = mockActivities.filter(activity => {
    const matchSearch = activity.title.toLowerCase().includes(searchText.toLowerCase()) ||
                       activity.code.toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = statusFilter === 'all' || activity.status === statusFilter
    const matchType = typeFilter === 'all' || activity.activity_type_id === typeFilter
    return matchSearch && matchStatus && matchType
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
    <div style={{ padding: '16px' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Header with inline info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <Title level={3} style={{ marginBottom: '4px' }}>
                <TeamOutlined /> Tất cả hoạt động trong hệ thống
              </Title>
              <Text type="secondary">
                Hiển thị các hoạt động đã được phê duyệt • {filteredActivities.length} hoạt động
              </Text>
            </div>
          </div>

          {/* Filters */}
          <ActivityFilters
            searchText={searchText}
            onSearchChange={setSearchText}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            activityTypes={mockActivityTypes}
            showTypeFilter={true}
          />

          {/* Activity List - List/Card/Table View */}
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
        </Space>
      </Card>
    </div>
  )
}

export default AllActivitiesList
