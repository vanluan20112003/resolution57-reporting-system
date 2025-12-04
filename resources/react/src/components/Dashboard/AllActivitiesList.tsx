import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Space, Button, Descriptions, Divider, Tag, Select, Input, Spin, message, Empty, Alert } from 'antd'
import {
  TeamOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  MailOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { DataTable } from '../../shared/components/DataTable'
import { getActivityColumns, statusConfig, formatBudget } from '../../shared/config/activityColumns'
import { ActivityCard, ActivityListItem } from '../../shared/components/Cards'
import {
  getAllApprovedActivities,
  getActivityFormData,
  getActivityById,
  Activity,
  ActivityFormData,
  UserInvitation,
} from '../../services/activityApi'
import { respondToInvitation } from '../../services/notificationApi'
import { getOrganizationList, Organization } from '../../services/organizationApi'

dayjs.locale('vi')

const { Text, Title } = Typography
const { Search } = Input

interface AllActivitiesListProps {
  initialActivityId?: string // For direct URL access /activities/:id
}

function AllActivitiesList({ initialActivityId }: AllActivitiesListProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [formData, setFormData] = useState<ActivityFormData | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  })

  // View mode
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')

  // User invitation status for the selected activity
  const [userInvitation, setUserInvitation] = useState<UserInvitation | null>(null)
  const [respondingInvitation, setRespondingInvitation] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAllApprovedActivities({
        organization_id: organizationFilter !== 'all' ? organizationFilter : undefined,
        activity_type_id: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchText || undefined,
        per_page: pagination.pageSize,
        page: pagination.current,
      })

      if (response.success) {
        setActivities(response.data)
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
        }))
      }
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động')
    } finally {
      setLoading(false)
    }
  }, [organizationFilter, typeFilter, searchText, pagination.current, pagination.pageSize])

  // Fetch organizations and form data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [orgResponse, formDataResponse] = await Promise.all([
          getOrganizationList({ per_page: 100, page: 1 }),
          getActivityFormData(),
        ])

        if (orgResponse.success) {
          setOrganizations(orgResponse.data)
        }
        if (formDataResponse.success) {
          setFormData(formDataResponse.data)
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
      }
    }

    fetchInitialData()
  }, [])

  // Fetch activities when filters change
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Load activity from URL if initialActivityId is provided
  useEffect(() => {
    if (initialActivityId) {
      const loadActivityFromUrl = async () => {
        setLoading(true)
        try {
          const response = await getActivityById(initialActivityId)
          if (response.success) {
            setSelectedActivity(response.data)
            setUserInvitation(response.user_invitation || null)
            setViewMode('detail')
          } else {
            message.error('Không tìm thấy hoạt động')
            navigate('/dashboard')
          }
        } catch (error: any) {
          message.error(error.message || 'Không thể tải thông tin hoạt động')
          navigate('/dashboard')
        } finally {
          setLoading(false)
        }
      }
      loadActivityFromUrl()
    }
  }, [initialActivityId, navigate])

  // Helper functions
  const getActivityTypeName = (typeId: string) => {
    return formData?.activity_types.find(t => t.id === typeId)?.name || 'N/A'
  }

  const getActivityFieldName = (fieldId: string) => {
    return formData?.activity_fields.find(f => f.id === fieldId)?.name || 'N/A'
  }

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (!org) return 'N/A'
    // Format: "Tên viết tắt - Tên đầy đủ" or just name if no short_name
    if (org.short_name && org.short_name !== org.name) {
      return `${org.short_name} - ${org.name}`
    }
    return org.name
  }

  const getOrganizationShortName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.short_name || org?.name || 'N/A'
  }

  const getOrganizationFullName = (orgId: string) => {
    return organizations.find(o => o.id === orgId)?.name || 'N/A'
  }

  const handleViewDetail = (activity: Activity) => {
    // Navigate to activity URL and show detail
    navigate(`/activities/${activity.id}`)
    setSelectedActivity(activity)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedActivity(null)
    setUserInvitation(null)
    setDescriptionExpanded(false)
    // Navigate back to dashboard home
    navigate('/dashboard?tab=home')
  }

  // Handle invitation response
  const handleInvitationResponse = async (response: 'accepted' | 'declined') => {
    if (!selectedActivity) return

    setRespondingInvitation(true)
    try {
      await respondToInvitation(selectedActivity.id, response)
      message.success(response === 'accepted' ? 'Đã xác nhận tham gia hoạt động!' : 'Đã từ chối lời mời')
      // Update local state
      // Keep lowercase to match database format
      setUserInvitation(prev => prev ? { ...prev, invitation_status: response as any, responded_at: new Date().toISOString() } : null)
    } catch (error: any) {
      // Handle already responded case (409 Conflict)
      if (error.already_responded) {
        setUserInvitation(prev => prev ? { ...prev, invitation_status: error.current_status as any, responded_at: new Date().toISOString() } : null)
        message.warning(error.message || 'Bạn đã phản hồi lời mời này rồi')
      } else {
        message.error(error.message || 'Không thể phản hồi lời mời')
      }
    } finally {
      setRespondingInvitation(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleRefresh = () => {
    fetchActivities()
  }

  // Filter activities by status (client-side for computed statuses)
  const filteredActivities = statusFilter === 'all'
    ? activities
    : activities.filter(a => a.status === statusFilter)

  // Get columns configuration
  const columns = getActivityColumns({
    getActivityTypeName,
    getActivityFieldName,
    getOrganizationName,
    onViewDetail: handleViewDetail,
  })

  // Render detail view
  if (viewMode === 'detail' && selectedActivity) {
    const config = statusConfig[selectedActivity.status] || statusConfig['APPROVED']

    return (
      <Card>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={handleBackToList}
          style={{ padding: 0, marginBottom: 16 }}
        >
          Quay lại danh sách
        </Button>

        <div style={{ marginBottom: 16 }}>
          <Space align="start">
            <Title level={3} style={{ margin: 0 }}>
              {selectedActivity.title}
            </Title>
            <Tag
              color={config.color}
              icon={config.icon}
              style={{ fontSize: '14px', padding: '4px 12px' }}
            >
              {config.label}
            </Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
            {selectedActivity.code}
          </Text>
        </div>

        <Divider style={{ margin: '12px 0 24px 0' }} />

        {/* Invitation Alert - show if user has invitation and activity is not cancelled/postponed */}
        {userInvitation && selectedActivity.status !== 'CANCELLED' && selectedActivity.status !== 'POSTPONED' && (() => {
          // Normalize status to lowercase for comparison (database stores lowercase)
          const status = userInvitation.invitation_status?.toLowerCase()
          const isPending = status === 'pending'
          const isAccepted = status === 'accepted'

          return (
          <Alert
            style={{ marginBottom: 16 }}
            icon={<MailOutlined />}
            showIcon
            type={isPending ? 'info' : isAccepted ? 'success' : 'warning'}
            message={
              isPending
                ? 'Bạn có lời mời tham gia hoạt động này'
                : isAccepted
                ? 'Bạn đã xác nhận tham gia hoạt động này'
                : 'Bạn đã từ chối lời mời tham gia hoạt động này'
            }
            description={
              isPending ? (
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={respondingInvitation}
                    onClick={() => handleInvitationResponse('accepted')}
                  >
                    Xác nhận tham gia
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={respondingInvitation}
                    onClick={() => handleInvitationResponse('declined')}
                  >
                    Từ chối
                  </Button>
                </Space>
              ) : userInvitation.responded_at ? (
                <Text type="secondary">
                  Phản hồi lúc: {dayjs(userInvitation.responded_at).format('DD/MM/YYYY HH:mm')}
                </Text>
              ) : null
            }
          />
        )})()}

        <Descriptions column={2} bordered>
          <Descriptions.Item label="Mã hoạt động" span={2}>
            <Text strong>{selectedActivity.code}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tên hoạt động" span={2}>
            <Text strong>{selectedActivity.title}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Đơn vị chủ trì" span={2}>
            {selectedActivity.lead_organization
              ? (selectedActivity.lead_organization.short_name && selectedActivity.lead_organization.short_name !== selectedActivity.lead_organization.name
                  ? `${selectedActivity.lead_organization.short_name} - ${selectedActivity.lead_organization.name}`
                  : selectedActivity.lead_organization.name)
              : getOrganizationName(selectedActivity.lead_organization_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Loại hoạt động">
            {selectedActivity.activity_type?.name || getActivityTypeName(selectedActivity.activity_type_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Lĩnh vực">
            {selectedActivity.activity_field?.name || (selectedActivity.activity_field_id ? getActivityFieldName(selectedActivity.activity_field_id) : 'N/A')}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả" span={2}>
            {selectedActivity.description ? (
              selectedActivity.description.length > 200 ? (
                <div>
                  <Text>
                    {descriptionExpanded
                      ? selectedActivity.description
                      : `${selectedActivity.description.substring(0, 200)}...`}
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    style={{ padding: '0 4px' }}
                  >
                    {descriptionExpanded ? 'Ẩn bớt' : 'Xem thêm'}
                  </Button>
                </div>
              ) : (
                <Text>{selectedActivity.description}</Text>
              )
            ) : (
              <Text type="secondary">Không có mô tả</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Thời gian kế hoạch" span={2}>
            {selectedActivity.start_date ? dayjs(selectedActivity.start_date).format('DD/MM/YYYY HH:mm') : 'N/A'}
            {' - '}
            {selectedActivity.end_date ? dayjs(selectedActivity.end_date).format('DD/MM/YYYY HH:mm') : 'N/A'}
          </Descriptions.Item>
          {selectedActivity.actual_start_date && (
            <Descriptions.Item label="Thời gian thực tế" span={2}>
              {dayjs(selectedActivity.actual_start_date).format('DD/MM/YYYY')}
              {selectedActivity.actual_end_date ? ` - ${dayjs(selectedActivity.actual_end_date).format('DD/MM/YYYY')}` : ' - Đang thực hiện'}
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Người tạo">
            {selectedActivity.creator
              ? `${selectedActivity.creator.last_name} ${selectedActivity.creator.first_name}`
              : 'N/A'}
          </Descriptions.Item>
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
          <Descriptions.Item label="Trạng thái">
            <Tag color={config.color} icon={config.icon}>
              {config.label}
            </Tag>
          </Descriptions.Item>

          {selectedActivity.budget && (
            <Descriptions.Item label="Kinh phí">
              <Text strong style={{ color: '#1890ff' }}>{formatBudget(selectedActivity.budget)}</Text>
            </Descriptions.Item>
          )}
          {selectedActivity.budget_source && (
            <Descriptions.Item label="Nguồn kinh phí">
              {selectedActivity.budget_source}
            </Descriptions.Item>
          )}
          {selectedActivity.location && (
            <Descriptions.Item label="Địa điểm" span={2}>
              {selectedActivity.location}
            </Descriptions.Item>
          )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <Title level={3} style={{ marginBottom: '4px' }}>
                <TeamOutlined /> Tất cả hoạt động trong hệ thống
              </Title>
              <Text type="secondary">
                Hiển thị các hoạt động đã được phê duyệt từ tất cả các đơn vị
                {!loading && ` • ${pagination.total} hoạt động`}
              </Text>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Làm mới
            </Button>
          </div>

          {/* Filters */}
          <Card size="small" style={{ marginBottom: 0 }}>
            <Space wrap style={{ width: '100%' }}>
              <Search
                placeholder="Tìm kiếm theo tên hoặc mã..."
                allowClear
                style={{ width: 280 }}
                onSearch={handleSearch}
                prefix={<SearchOutlined />}
              />

              <Select
                style={{ width: 200 }}
                placeholder="Đơn vị"
                value={organizationFilter}
                onChange={(value) => {
                  setOrganizationFilter(value)
                  setPagination(prev => ({ ...prev, current: 1 }))
                }}
              >
                <Select.Option value="all">Tất cả đơn vị</Select.Option>
                {organizations.map(org => (
                  <Select.Option key={org.id} value={org.id}>
                    {org.short_name || org.name}
                  </Select.Option>
                ))}
              </Select>

              <Select
                style={{ width: 180 }}
                placeholder="Loại hoạt động"
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value)
                  setPagination(prev => ({ ...prev, current: 1 }))
                }}
              >
                <Select.Option value="all">Tất cả loại</Select.Option>
                {formData?.activity_types.map(type => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>

              <Select
                style={{ width: 180 }}
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                <Select.Option value="IN_PROGRESS">
                  <Tag color="red" style={{ margin: 0 }}>Đang diễn ra</Tag>
                </Select.Option>
                <Select.Option value="APPROVED">Đã phê duyệt</Select.Option>
                <Select.Option value="COMPLETED">Hoàn thành</Select.Option>
                <Select.Option value="POSTPONED">Tạm hoãn</Select.Option>
                <Select.Option value="CANCELLED">Đã hủy</Select.Option>
              </Select>
            </Space>
          </Card>

          {/* Activity List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="Đang tải danh sách hoạt động..." />
            </div>
          ) : filteredActivities.length === 0 ? (
            <Empty
              description="Không có hoạt động nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <DataTable
              columns={columns}
              dataSource={filteredActivities}
              rowKey="id"
              localStorageKey="allActivityDisplayMode"
              tableProps={{
                pagination: {
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: statusFilter === 'all' ? pagination.total : filteredActivities.length,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng ${total} hoạt động`,
                  onChange: (page, pageSize) => {
                    setPagination(prev => ({
                      ...prev,
                      current: page,
                      pageSize: pageSize || prev.pageSize,
                    }))
                  },
                },
                scroll: { x: 2400 },
              }}
              listRenderer={(activity) => (
                <ActivityListItem
                  activity={activity as any}
                  getActivityTypeName={getActivityTypeName}
                  getActivityFieldName={getActivityFieldName}
                  getOrganizationName={getOrganizationName}
                  onViewDetail={handleViewDetail as any}
                />
              )}
              cardRenderer={(activity) => (
                <ActivityCard
                  activity={activity as any}
                  getActivityTypeName={getActivityTypeName}
                  getActivityFieldName={getActivityFieldName}
                  getOrganizationName={getOrganizationName}
                  onViewDetail={handleViewDetail as any}
                />
              )}
            />
          )}
        </Space>
      </Card>
    </div>
  )
}

export default AllActivitiesList
