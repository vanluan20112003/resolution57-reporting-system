import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Typography,
  Row,
  Col,
  Popconfirm,
  DatePicker,
  InputNumber,
  Checkbox,
  Divider,
  Progress,
  Tooltip,
  Alert,
  Tabs,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  FlagOutlined,
  EyeOutlined,
  GlobalOutlined,
  BankOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  LockOutlined,
  UnlockOutlined,
  SendOutlined,
  FileSearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAuth } from '../../shared/hooks'
import * as activityApi from '../../services/activityApi'
import type {
  Activity,
  ActivityStatus,
  ActivityFormData,
  CreateActivityRequest,
  UpdateActivityRequest,
  KpiItem,
} from '../../services/activityApi'
import ApprovalWizardModal from './ApprovalWizardModal'
import './ActivityManagement.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

interface ActivityManagementProps {
  defaultStatusFilter?: ActivityStatus
  showApprovalView?: boolean
}

function ActivityManagement({ defaultStatusFilter, showApprovalView }: ActivityManagementProps) {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | undefined>(defaultStatusFilter)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [fieldFilter, setFieldFilter] = useState<string | undefined>()
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false)
  const [newlyCreatedActivityId, setNewlyCreatedActivityId] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [formData, setFormData] = useState<ActivityFormData | null>(null)
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([])
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Watch start_date and end_date for duration calculation
  const watchStartDate = Form.useWatch('start_date', form)
  const watchEndDate = Form.useWatch('end_date', form)

  // Check if user has organization
  const hasOrganization = currentUser?.organization_id

  // Check permissions
  const canCreate = hasOrganization && ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser?.role || '')
  const canApprove = ['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser?.role || '')
  const isAdmin = ['OPERATOR', 'ADMIN'].includes(currentUser?.role || '')

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      // For approval view, default to PENDING_APPROVAL status
      const effectiveStatus = showApprovalView && !statusFilter ? 'PENDING_APPROVAL' : statusFilter

      const response = await activityApi.getActivities({
        status: effectiveStatus,
        activity_type_id: typeFilter,
        activity_field_id: fieldFilter,
        search: searchText || undefined,
        page: pagination.current,
        per_page: pagination.pageSize,
      })

      setActivities(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, fieldFilter, searchText, pagination.current, pagination.pageSize, showApprovalView])

  // Fetch form data (dropdowns)
  const fetchFormData = async () => {
    try {
      const response = await activityApi.getActivityFormData()
      setFormData(response.data)
    } catch (error: any) {
      console.error('Failed to fetch form data:', error)
    }
  }

  useEffect(() => {
    fetchActivities()
    fetchFormData()
  }, [fetchActivities])

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleAdd = () => {
    if (!canCreate) {
      message.warning('Bạn cần thuộc một đơn vị để tạo hoạt động')
      return
    }
    setSelectedActivity(null)
    setSelectedKpiIds([])
    form.resetFields()
    setEditModalVisible(true)
  }

  const handleEdit = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      const kpiIds = response.data.kpis?.map(k => k.id) || []
      setSelectedKpiIds(kpiIds)
      form.setFieldsValue({
        title: response.data.title,
        description: response.data.description,
        activity_type_id: response.data.activity_type_id,
        activity_field_id: response.data.activity_field_id,
        start_date: response.data.start_date ? dayjs(response.data.start_date) : undefined,
        end_date: response.data.end_date ? dayjs(response.data.end_date) : undefined,
        budget: response.data.budget,
        budget_source: response.data.budget_source,
        location: response.data.location,
        external_url: response.data.external_url,
        completion_percentage: response.data.completion_percentage,
        result_summary: response.data.result_summary,
      })
      setEditModalVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin hoạt động')
    }
  }

  const handleView = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      setViewModalVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin hoạt động')
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.deleteActivity(id)
      message.success('Đã xóa hoạt động thành công')
      fetchActivities()
      // Dispatch event to refresh badge counts
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  // Open Approval Wizard Modal
  const handleOpenApprovalWizard = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      setApprovalModalVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin hoạt động')
    }
  }

  // Handle after approval completed
  const handleApprovalCompleted = () => {
    message.success('Đã phê duyệt và khóa hoạt động thành công')
    fetchActivities()
    window.dispatchEvent(new CustomEvent('activity-status-changed'))
  }

  // Handle after rejection completed
  const handleRejectionCompleted = () => {
    message.success('Đã xử lý từ chối hoạt động')
    fetchActivities()
    window.dispatchEvent(new CustomEvent('activity-status-changed'))
  }

  const handleLock = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.lockActivity(id)
      message.success('Đã khóa hoạt động thành công')
      fetchActivities()
    } catch (error: any) {
      message.error(error.message || 'Không thể khóa hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnlock = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.unlockActivity(id)
      message.success('Đã mở khóa hoạt động thành công')
      fetchActivities()
    } catch (error: any) {
      message.error(error.message || 'Không thể mở khóa hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitForApproval = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.submitActivityForApproval(id)
      message.success('Đã gửi yêu cầu phê duyệt thành công')
      fetchActivities()
      // Dispatch event to refresh badge counts
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi yêu cầu phê duyệt')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle submit for approval after creating new activity
  const handleConfirmSubmitForApproval = async () => {
    if (newlyCreatedActivityId) {
      setActionLoading(true)
      try {
        await activityApi.submitActivityForApproval(newlyCreatedActivityId)
        message.success('Đã gửi yêu cầu phê duyệt thành công')
        // Dispatch event to refresh badge counts
        window.dispatchEvent(new CustomEvent('activity-status-changed'))
        fetchActivities()
      } catch (error: any) {
        message.error(error.message || 'Không thể gửi yêu cầu phê duyệt')
      } finally {
        setActionLoading(false)
      }
    }
    setSubmitConfirmVisible(false)
    setNewlyCreatedActivityId(null)
  }

  // Handle skip submit for approval
  const handleSkipSubmitForApproval = () => {
    setSubmitConfirmVisible(false)
    setNewlyCreatedActivityId(null)
  }

  // Check if activity can be edited (not approved yet or not locked)
  // STAFF can only edit their own activities
  const canEditActivity = (activity: Activity): boolean => {
    if (activity.is_locked) return false
    // Only DRAFT and PENDING_APPROVAL can be fully edited
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(activity.status)) return false
    // STAFF can only edit their own activities
    if (currentUser?.role === 'STAFF' && activity.created_by !== currentUser?.id) return false
    return true
  }

  // Check if activity can be deleted
  const canDeleteActivity = (activity: Activity): boolean => {
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(activity.status)) return false
    // STAFF can only delete their own activities
    if (currentUser?.role === 'STAFF' && activity.created_by !== currentUser?.id) return false
    return true
  }

  // Check if activity can be locked (already approved)
  const canLockActivity = (activity: Activity): boolean => {
    if (activity.is_locked) return false
    const lockableStatuses: ActivityStatus[] = ['IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
    return lockableStatuses.includes(activity.status) && canApprove
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setActionLoading(true)

      // Process datetime - format as YYYY-MM-DD HH:mm:ss
      const start_date = values.start_date ? values.start_date.format('YYYY-MM-DD HH:mm:ss') : undefined
      const end_date = values.end_date ? values.end_date.format('YYYY-MM-DD HH:mm:ss') : undefined

      const requestData = {
        title: values.title,
        description: values.description,
        activity_type_id: values.activity_type_id,
        activity_field_id: values.activity_field_id,
        start_date,
        end_date,
        budget: values.budget,
        budget_source: values.budget_source,
        location: values.location,
        external_url: values.external_url,
        kpi_ids: selectedKpiIds,
      }

      if (selectedActivity) {
        // Update existing activity
        await activityApi.updateActivity(selectedActivity.id, {
          ...requestData,
          completion_percentage: values.completion_percentage,
          result_summary: values.result_summary,
        } as UpdateActivityRequest)
        message.success('Đã cập nhật hoạt động thành công')
        setEditModalVisible(false)
        form.resetFields()
        setSelectedActivity(null)
        setSelectedKpiIds([])
        fetchActivities()
      } else {
        // Create new activity
        const response = await activityApi.createActivity(requestData as CreateActivityRequest)
        message.success('Đã tạo hoạt động thành công')
        // Dispatch event to refresh badge counts (new activity is DRAFT)
        window.dispatchEvent(new CustomEvent('activity-status-changed'))

        setEditModalVisible(false)
        form.resetFields()
        setSelectedActivity(null)
        setSelectedKpiIds([])
        fetchActivities()

        // Show confirmation modal to submit for approval
        if (response.data?.id) {
          setNewlyCreatedActivityId(response.data.id)
          setSubmitConfirmVisible(true)
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        // Validation error
        return
      }
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalCancel = () => {
    setEditModalVisible(false)
    setSelectedActivity(null)
    setSelectedKpiIds([])
    form.resetFields()
  }

  // Calculate duration between start and end date
  const calculateDuration = () => {
    if (!watchStartDate || !watchEndDate) return null
    const start = dayjs(watchStartDate)
    const end = dayjs(watchEndDate)
    if (!start.isValid() || !end.isValid()) return null

    const diffDays = end.diff(start, 'day')
    const diffHours = end.diff(start, 'hour') % 24

    if (diffDays < 0) return <Text type="danger">Ngày kết thúc phải sau ngày bắt đầu</Text>

    let durationText = ''
    if (diffDays > 0) durationText += `${diffDays} ngày `
    if (diffHours > 0) durationText += `${diffHours} giờ`
    if (!durationText) durationText = 'Cùng thời điểm'

    return <Text type="success">Thời lượng: {durationText}</Text>
  }

  // Get status tag color
  const getStatusTag = (status: ActivityStatus) => {
    return (
      <Tag color={activityApi.getStatusColor(status)}>
        {activityApi.getStatusLabel(status)}
      </Tag>
    )
  }

  const columns: ColumnsType<Activity> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã hoạt động',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {code || '-'}
        </Text>
      ),
    },
    {
      title: 'Tên hoạt động',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Activity) => (
        <Tooltip title={title}>
          <a onClick={() => handleView(record)}>{title}</a>
        </Tooltip>
      ),
    },
    {
      title: 'Loại hoạt động',
      dataIndex: ['activity_type', 'name'],
      key: 'activity_type',
      width: 150,
      render: (name: string) =>
        name ? <Tag color="blue">{name}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Đơn vị chủ trì',
      dataIndex: ['lead_organization', 'short_name'],
      key: 'lead_organization',
      width: 150,
      render: (short_name: string, record: Activity) => (
        <Text>{short_name || record.lead_organization?.name || '-'}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status: ActivityStatus) => getStatusTag(status),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'completion_percentage',
      key: 'completion_percentage',
      width: 100,
      align: 'center',
      render: (percentage: number) => (
        <Progress
          percent={percentage || 0}
          size="small"
          status={percentage === 100 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: 'Thời gian',
      key: 'date_range',
      width: 180,
      render: (_: any, record: Activity) => (
        <Text type="secondary">
          {record.start_date
            ? `${dayjs(record.start_date).format('DD/MM/YYYY')} - ${
                record.end_date ? dayjs(record.end_date).format('DD/MM/YYYY') : '...'
              }`
            : '-'}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 220,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Activity) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          {/* Edit button - only for DRAFT/PENDING_APPROVAL and not locked */}
          {canEditActivity(record) && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {/* Submit for approval button - only for DRAFT */}
          {record.status === 'DRAFT' && !record.is_locked && (
            <Tooltip title="Gửi yêu cầu phê duyệt">
              <Popconfirm
                title="Gửi yêu cầu phê duyệt?"
                description="Hoạt động sẽ chuyển sang trạng thái Chờ phê duyệt."
                onConfirm={() => handleSubmitForApproval(record.id)}
                okText="Gửi"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  style={{ color: '#1890ff' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {/* Approval Wizard button - for PENDING_APPROVAL activities */}
          {record.status === 'PENDING_APPROVAL' && canApprove && (
            <Tooltip title="Xem xét & Phê duyệt">
              <Button
                type="link"
                size="small"
                icon={<FileSearchOutlined />}
                onClick={() => handleOpenApprovalWizard(record)}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          )}
          {/* Lock button - for approved activities */}
          {canLockActivity(record) && (
            <Tooltip title="Khóa hoạt động">
              <Popconfirm
                title="Khóa hoạt động này?"
                description="Sau khi khóa, hoạt động không thể chỉnh sửa được nữa."
                onConfirm={() => handleLock(record.id)}
                okText="Khóa"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<LockOutlined />}
                  style={{ color: '#faad14' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {/* Unlock button - only OPERATOR/ADMIN */}
          {record.is_locked && isAdmin && (
            <Tooltip title="Mở khóa hoạt động">
              <Popconfirm
                title="Mở khóa hoạt động này?"
                description="Hoạt động sẽ có thể được chỉnh sửa lại."
                onConfirm={() => handleUnlock(record.id)}
                okText="Mở khóa"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<UnlockOutlined />}
                  style={{ color: '#1890ff' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {/* Locked indicator */}
          {record.is_locked && !isAdmin && (
            <Tooltip title="Hoạt động đã bị khóa">
              <LockOutlined style={{ color: '#999' }} />
            </Tooltip>
          )}
          {/* Delete button - only DRAFT/PENDING_APPROVAL and own activities for STAFF */}
          {canDeleteActivity(record) && !record.is_locked && (
            <Tooltip title="Xóa">
              <Popconfirm
                title="Bạn có chắc chắn muốn xóa hoạt động này?"
                description="Hành động này không thể hoàn tác."
                onConfirm={() => handleDelete(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // KPI Checkbox Group component
  const KpiCheckboxGroup = ({
    title,
    icon,
    kpis,
    selectedIds,
    onChange,
  }: {
    title: string
    icon: React.ReactNode
    kpis: KpiItem[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
  }) => (
    <div className="kpi-group">
      <div className="kpi-group-header">
        {icon}
        <Text strong style={{ marginLeft: 8 }}>{title}</Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          ({kpis.length} chỉ tiêu)
        </Text>
      </div>
      <div className="kpi-checkbox-list">
        {kpis.length === 0 ? (
          <Text type="secondary">Chưa có KPI nào</Text>
        ) : (
          <Checkbox.Group
            value={selectedIds}
            onChange={(checkedValues) => onChange(checkedValues as string[])}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {kpis.map((kpi) => (
                <Checkbox key={kpi.id} value={kpi.id}>
                  <Text>
                    {kpi.code && <Text strong style={{ marginRight: 8 }}>[{kpi.code}]</Text>}
                    {kpi.title}
                  </Text>
                  {kpi.category && (
                    <Tag size="small" style={{ marginLeft: 8 }}>{kpi.category}</Tag>
                  )}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        )}
      </div>
    </div>
  )

  // No organization warning
  if (!hasOrganization && !isAdmin) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FlagOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            Bạn chưa thuộc đơn vị nào
          </Title>
          <Text type="secondary">
            Vui lòng liên hệ quản trị viên để được gán vào đơn vị trước khi quản lý hoạt động
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Title level={3}>
              <FlagOutlined /> Quản lý Hoạt động
            </Title>
            <Text type="secondary">
              {formData?.user_organization
                ? `Các hoạt động của ${formData.user_organization.name}`
                : 'Tất cả hoạt động trong hệ thống'}
            </Text>
          </div>

          {/* Filters and Actions */}
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Tìm kiếm theo mã hoặc tên..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {formData?.statuses
                  .filter((s) => {
                    // In approval view, only show PENDING_APPROVAL
                    if (showApprovalView) {
                      return s.value === 'PENDING_APPROVAL'
                    }
                    return true
                  })
                  .map((s) => (
                    <Option key={s.value} value={s.value}>
                      {s.label}
                    </Option>
                  ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Loại hoạt động"
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {formData?.activity_types.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Lĩnh vực"
                value={fieldFilter}
                onChange={setFieldFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {formData?.activity_fields.map((f) => (
                  <Option key={f.id} value={f.id}>
                    {f.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchText('')
                    setStatusFilter(undefined)
                    setTypeFilter(undefined)
                    setFieldFilter(undefined)
                    fetchActivities()
                  }}
                >
                  Làm mới
                </Button>

                {canCreate && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm hoạt động
                  </Button>
                )}
              </Space>
            </Col>
          </Row>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={activities}
            loading={loading}
            rowKey="id"
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} hoạt động`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>

      {/* Add/Edit Modal - Two Column Layout */}
      <Modal
        title={
          <Space>
            <FlagOutlined />
            <span>{selectedActivity ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}</span>
            {formData?.user_organization && (
              <Tag color="blue">{formData.user_organization.short_name || formData.user_organization.name}</Tag>
            )}
          </Space>
        }
        open={editModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={1100}
        okText={selectedActivity ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
        styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 24px' } }}
      >
        <Form form={form} layout="vertical" size="middle">
          <Row gutter={24}>
            {/* Left Column - Main Info */}
            <Col span={16}>
              {/* Organization Info */}
              {formData?.user_organization && (
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      <strong>Đơn vị chủ trì:</strong> {formData.user_organization.name}
                      {formData.user_organization.short_name && formData.user_organization.short_name !== formData.user_organization.name && (
                        <Text type="secondary"> ({formData.user_organization.short_name})</Text>
                      )}
                    </span>
                  }
                  style={{ marginBottom: 12 }}
                />
              )}

              {/* Title */}
              <Form.Item
                name="title"
                label="Tên hoạt động"
                rules={[{ required: true, message: 'Vui lòng nhập tên hoạt động' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="Nhập tên hoạt động" maxLength={500} />
              </Form.Item>

              {/* Type & Field */}
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="activity_type_id"
                    label={<span><span style={{ color: '#ff4d4f' }}>*</span> Loại hoạt động</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn loại hoạt động' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Chọn loại hoạt động" showSearch optionFilterProp="children">
                      {formData?.activity_types.map((t) => (
                        <Option key={t.id} value={t.id}>
                          {t.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="activity_field_id"
                    label="Lĩnh vực hoạt động"
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Chọn lĩnh vực" showSearch optionFilterProp="children" allowClear>
                      {formData?.activity_fields.map((f) => (
                        <Option key={f.id} value={f.id}>
                          {f.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Start Date & End Date with Time */}
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="start_date" label="Thời điểm bắt đầu" style={{ marginBottom: 8 }}>
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày giờ bắt đầu"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="end_date"
                    label="Thời điểm kết thúc"
                    style={{ marginBottom: 8 }}
                    dependencies={['start_date']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const startDate = getFieldValue('start_date')
                          if (!value || !startDate) {
                            return Promise.resolve()
                          }
                          if (dayjs(value).isAfter(dayjs(startDate)) || dayjs(value).isSame(dayjs(startDate))) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('Thời điểm kết thúc phải sau hoặc bằng thời điểm bắt đầu'))
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày giờ kết thúc"
                    />
                  </Form.Item>
                </Col>
              </Row>
              {/* Duration display */}
              {calculateDuration() && (
                <div style={{ marginBottom: 12, textAlign: 'center' }}>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  {calculateDuration()}
                </div>
              )}

              {/* Location, Budget, Budget Source */}
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="location" label="Địa điểm" style={{ marginBottom: 12 }}>
                    <Input prefix={<EnvironmentOutlined />} placeholder="Địa điểm thực hiện" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="budget" label="Kinh phí (VNĐ)" style={{ marginBottom: 12 }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                      placeholder="Kinh phí"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="budget_source" label="Nguồn kinh phí" style={{ marginBottom: 12 }}>
                    <Input placeholder="Nguồn kinh phí" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Description */}
              <Form.Item name="description" label="Mô tả" style={{ marginBottom: 12 }}>
                <TextArea rows={2} placeholder="Mô tả chi tiết về hoạt động" />
              </Form.Item>

              {/* External URL */}
              <Form.Item name="external_url" label="Đường dẫn tham khảo" style={{ marginBottom: 12 }}>
                <Input prefix={<LinkOutlined />} placeholder="https://..." />
              </Form.Item>

              {/* Progress (only for editing) */}
              {selectedActivity && (
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="completion_percentage" label="Tiến độ (%)" style={{ marginBottom: 12 }}>
                      <InputNumber
                        min={0}
                        max={100}
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}%`}
                        parser={(value) => value!.replace('%', '') as any}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item name="result_summary" label="Tóm tắt kết quả" style={{ marginBottom: 12 }}>
                      <Input placeholder="Nhập tóm tắt kết quả thực hiện" />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Col>

            {/* Right Column - KPIs */}
            <Col span={8}>
              <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, height: '100%', minHeight: 400 }}>
                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                  <GlobalOutlined style={{ marginRight: 6 }} />
                  Chỉ tiêu KPI liên quan
                </Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                  Đã chọn: {selectedKpiIds.length} chỉ tiêu
                </Text>

                <Tabs
                  size="small"
                  tabPosition="top"
                  items={[
                    {
                      key: 'central',
                      label: (
                        <span style={{ fontSize: 12 }}>
                          <GlobalOutlined /> Trung ương ({formData?.kpis.central?.length || 0})
                        </span>
                      ),
                      children: (
                        <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                          {formData?.kpis.central?.length === 0 ? (
                            <Text type="secondary">Chưa có KPI Trung ương</Text>
                          ) : (
                            <Checkbox.Group
                              value={selectedKpiIds.filter(id => formData?.kpis.central?.some(k => k.id === id))}
                              onChange={(checkedValues) => {
                                const vnuIds = selectedKpiIds.filter(id => formData?.kpis.vnu?.some(k => k.id === id))
                                setSelectedKpiIds([...(checkedValues as string[]), ...vnuIds])
                              }}
                              style={{ width: '100%' }}
                            >
                              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                {formData?.kpis.central?.map((kpi) => (
                                  <Checkbox key={kpi.id} value={kpi.id} style={{ marginLeft: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      {kpi.code && <Text code style={{ fontSize: 11 }}>{kpi.code}</Text>}
                                      <Text style={{ fontSize: 12 }}>{kpi.title}</Text>
                                    </div>
                                  </Checkbox>
                                ))}
                              </Space>
                            </Checkbox.Group>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'vnu',
                      label: (
                        <span style={{ fontSize: 12 }}>
                          <BankOutlined /> ĐHQG ({formData?.kpis.vnu?.length || 0})
                        </span>
                      ),
                      children: (
                        <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                          {formData?.kpis.vnu?.length === 0 ? (
                            <Text type="secondary">Chưa có KPI ĐHQG-HCM</Text>
                          ) : (
                            <Checkbox.Group
                              value={selectedKpiIds.filter(id => formData?.kpis.vnu?.some(k => k.id === id))}
                              onChange={(checkedValues) => {
                                const centralIds = selectedKpiIds.filter(id => formData?.kpis.central?.some(k => k.id === id))
                                setSelectedKpiIds([...centralIds, ...(checkedValues as string[])])
                              }}
                              style={{ width: '100%' }}
                            >
                              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                {formData?.kpis.vnu?.map((kpi) => (
                                  <Checkbox key={kpi.id} value={kpi.id} style={{ marginLeft: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      {kpi.code && <Text code style={{ fontSize: 11 }}>{kpi.code}</Text>}
                                      <Text style={{ fontSize: 12 }}>{kpi.title}</Text>
                                    </div>
                                  </Checkbox>
                                ))}
                              </Space>
                            </Checkbox.Group>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={
          <Space>
            <span>Chi tiết hoạt động</span>
            {selectedActivity?.is_locked && (
              <Tag color="warning" icon={<LockOutlined />}>Đã khóa</Tag>
            )}
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSelectedActivity(null)
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Đóng
          </Button>,
          // Submit for approval button for DRAFT activities
          selectedActivity && selectedActivity.status === 'DRAFT' && !selectedActivity.is_locked && (
            <Popconfirm
              key="submit"
              title="Gửi yêu cầu phê duyệt?"
              description="Hoạt động sẽ chuyển sang trạng thái Chờ phê duyệt."
              onConfirm={() => {
                handleSubmitForApproval(selectedActivity.id)
                setViewModalVisible(false)
              }}
              okText="Gửi"
              cancelText="Hủy"
            >
              <Button icon={<SendOutlined />} type="primary">
                Gửi yêu cầu phê duyệt
              </Button>
            </Popconfirm>
          ),
          // Approval Wizard button for PENDING_APPROVAL
          selectedActivity && selectedActivity.status === 'PENDING_APPROVAL' && canApprove && (
            <Button
              key="approval"
              icon={<FileSearchOutlined />}
              type="primary"
              onClick={() => {
                setViewModalVisible(false)
                setApprovalModalVisible(true)
              }}
            >
              Xem xét & Phê duyệt
            </Button>
          ),
          // Lock button for approved activities
          selectedActivity && canLockActivity(selectedActivity) && (
            <Popconfirm
              key="lock"
              title="Khóa hoạt động này?"
              description="Sau khi khóa, hoạt động không thể chỉnh sửa được nữa."
              onConfirm={() => {
                handleLock(selectedActivity.id)
                setViewModalVisible(false)
              }}
              okText="Khóa"
              cancelText="Hủy"
            >
              <Button icon={<LockOutlined />} style={{ color: '#faad14', borderColor: '#faad14' }}>
                Khóa hoạt động
              </Button>
            </Popconfirm>
          ),
          // Unlock button for OPERATOR/ADMIN
          selectedActivity?.is_locked && isAdmin && (
            <Popconfirm
              key="unlock"
              title="Mở khóa hoạt động này?"
              description="Hoạt động sẽ có thể được chỉnh sửa lại."
              onConfirm={() => {
                handleUnlock(selectedActivity.id)
                setViewModalVisible(false)
              }}
              okText="Mở khóa"
              cancelText="Hủy"
            >
              <Button icon={<UnlockOutlined />} type="primary">
                Mở khóa
              </Button>
            </Popconfirm>
          ),
          // Edit button only for editable activities
          selectedActivity && canEditActivity(selectedActivity) && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setViewModalVisible(false)
                handleEdit(selectedActivity)
              }}
            >
              Chỉnh sửa
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedActivity && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Header */}
            <div>
              <Text type="secondary">Mã hoạt động</Text>
              <Title level={4} style={{ margin: '4px 0 8px' }}>
                {selectedActivity.code}
              </Title>
              <Space>
                {getStatusTag(selectedActivity.status)}
                <Progress
                  percent={selectedActivity.completion_percentage || 0}
                  size="small"
                  style={{ width: 150 }}
                />
              </Space>
            </div>

            <Divider />

            {/* Title and Description */}
            <div>
              <Title level={5}>{selectedActivity.title}</Title>
              <Paragraph type="secondary">
                {selectedActivity.description || 'Không có mô tả'}
              </Paragraph>
            </div>

            {/* Details Grid */}
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Loại hoạt động</Text>
                <div>
                  <Tag color="blue">{selectedActivity.activity_type?.name || '-'}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Lĩnh vực</Text>
                <div>
                  <Tag>{selectedActivity.activity_field?.name || '-'}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Đơn vị chủ trì</Text>
                <div>
                  <Text strong>{selectedActivity.lead_organization?.name || '-'}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Người tạo</Text>
                <div>
                  <Text>
                    {selectedActivity.creator
                      ? `${selectedActivity.creator.first_name} ${selectedActivity.creator.last_name}`
                      : '-'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Thời gian</Text>
                <div>
                  <Text>
                    {selectedActivity.start_date
                      ? `${dayjs(selectedActivity.start_date).format('DD/MM/YYYY HH:mm')} - ${
                          selectedActivity.end_date
                            ? dayjs(selectedActivity.end_date).format('DD/MM/YYYY HH:mm')
                            : '...'
                        }`
                      : '-'}
                  </Text>
                  {selectedActivity.start_date && selectedActivity.end_date && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (Thời lượng: {(() => {
                          const start = dayjs(selectedActivity.start_date)
                          const end = dayjs(selectedActivity.end_date)
                          const diffDays = end.diff(start, 'day')
                          const diffHours = end.diff(start, 'hour') % 24
                          let text = ''
                          if (diffDays > 0) text += `${diffDays} ngày `
                          if (diffHours > 0) text += `${diffHours} giờ`
                          return text || 'Cùng thời điểm'
                        })()})
                      </Text>
                    </div>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Địa điểm</Text>
                <div>
                  <Text>{selectedActivity.location || '-'}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Kinh phí</Text>
                <div>
                  <Text>
                    {selectedActivity.budget
                      ? `${selectedActivity.budget.toLocaleString('vi-VN')} VNĐ`
                      : '-'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Nguồn kinh phí</Text>
                <div>
                  <Text>{selectedActivity.budget_source || '-'}</Text>
                </div>
              </Col>
            </Row>

            {/* KPIs */}
            {selectedActivity.kpis && selectedActivity.kpis.length > 0 && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Chỉ tiêu KPI liên quan</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedActivity.kpis.map((kpi) => (
                      <Tag key={kpi.id} color={kpi.source === 'CENTRAL' ? 'blue' : 'purple'}>
                        {kpi.code ? `[${kpi.code}] ` : ''}
                        {kpi.title}
                      </Tag>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Result Summary */}
            {selectedActivity.result_summary && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Tóm tắt kết quả</Text>
                  <Paragraph>{selectedActivity.result_summary}</Paragraph>
                </div>
              </>
            )}

            {/* Approval Info */}
            {selectedActivity.approved_by && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Thông tin phê duyệt</Text>
                  <div>
                    <Text>
                      Người phê duyệt:{' '}
                      {selectedActivity.approver
                        ? `${selectedActivity.approver.first_name} ${selectedActivity.approver.last_name}`
                        : '-'}
                    </Text>
                    <br />
                    <Text>
                      Thời gian:{' '}
                      {selectedActivity.approved_at
                        ? dayjs(selectedActivity.approved_at).format('DD/MM/YYYY HH:mm')
                        : '-'}
                    </Text>
                  </div>
                </div>
              </>
            )}
          </Space>
        )}
      </Modal>

      {/* Approval Wizard Modal */}
      <ApprovalWizardModal
        visible={approvalModalVisible}
        activity={selectedActivity}
        onClose={() => {
          setApprovalModalVisible(false)
          setSelectedActivity(null)
        }}
        onApproved={handleApprovalCompleted}
        onRejected={handleRejectionCompleted}
      />

      {/* Submit for Approval Confirmation Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#1890ff' }} />
            <span>Gửi yêu cầu phê duyệt?</span>
          </Space>
        }
        open={submitConfirmVisible}
        onOk={handleConfirmSubmitForApproval}
        onCancel={handleSkipSubmitForApproval}
        okText="Gửi yêu cầu phê duyệt"
        cancelText="Để sau"
        confirmLoading={actionLoading}
        centered
      >
        <Alert
          type="success"
          showIcon
          message="Hoạt động đã được tạo thành công!"
          style={{ marginBottom: 16 }}
        />
        <Text>
          Bạn có muốn gửi yêu cầu phê duyệt ngay bây giờ không?
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Nếu chọn "Để sau", hoạt động sẽ được lưu ở trạng thái <Tag>Nháp</Tag> và bạn có thể gửi yêu cầu phê duyệt sau.
        </Text>
      </Modal>
    </div>
  )
}

export default ActivityManagement
