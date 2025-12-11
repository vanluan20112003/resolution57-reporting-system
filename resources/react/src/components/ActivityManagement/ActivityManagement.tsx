import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Badge,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
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
  PauseCircleOutlined,
  StopOutlined,
  UndoOutlined,
  UserSwitchOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAuth } from '../../shared/hooks'
import * as activityApi from '../../services/activityApi'
import * as reportApi from '../../services/reportApi'
import { getMyOrganizationMembers, OrganizationMember } from '../../services/organizationApi'
import type {
  Activity,
  ActivityStatus,
  ActivityFormData,
  CreateActivityRequest,
  UpdateActivityRequest,
  KpiItem,
} from '../../services/activityApi'
import ApprovalWizardModal from './ApprovalWizardModal'
import ActivityWizardModal from './ActivityWizardModal'
import ActivityDetailModal from './ActivityDetailModal'
import AdvancedFilter, { FilterField, FilterValues } from '../../shared/components/AdvancedFilter'
import ColumnToggle, { ToggleableColumn } from '../../shared/components/ColumnToggle'
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

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: '',
    status: defaultStatusFilter,
    activity_type_id: undefined,
    activity_field_id: undefined,
    date_range: undefined,
    completion_range: undefined,
    is_locked: undefined,
  })

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailModalMode, setDetailModalMode] = useState<'view' | 'edit'>('view')
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [wizardModalVisible, setWizardModalVisible] = useState(false)
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false)
  const [newlyCreatedActivityId, setNewlyCreatedActivityId] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelActivityId, setCancelActivityId] = useState<string | null>(null)

  // Assign staff modal state
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [assigningActivity, setAssigningActivity] = useState<Activity | null>(null)
  const [staffList, setStaffList] = useState<OrganizationMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined)
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [assigningStaff, setAssigningStaff] = useState(false)

  // Export report modal state
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportMonth, setExportMonth] = useState(dayjs().month() + 1)
  const [exportYear, setExportYear] = useState(dayjs().year())
  const [exportViewMode, setExportViewMode] = useState<reportApi.ViewMode>('activities')
  const [exportColumns, setExportColumns] = useState<reportApi.ExportColumn[]>([])
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([])
  const [loadingColumns, setLoadingColumns] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [formData, setFormData] = useState<ActivityFormData | null>(null)
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([])
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'index', 'code', 'title', 'activity_type', 'lead_organization', 'status', 'completion_percentage', 'date_range', 'actions'
  ])

  // Watch start_date and end_date for duration calculation
  const watchStartDate = Form.useWatch('start_date', form)
  const watchEndDate = Form.useWatch('end_date', form)

  // Check if user has organization
  const hasOrganization = currentUser?.organization_id

  // Check permissions
  const canCreate = hasOrganization && ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser?.role || '')
  const canApprove = ['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser?.role || '')
  const isAdmin = ['OPERATOR', 'ADMIN'].includes(currentUser?.role || '')

  // Fetch activities - always filter by user's organization
  const fetchActivities = useCallback(async () => {
    if (!currentUser?.organization_id) return // Don't fetch if no organization

    setLoading(true)
    try {
      // For approval view, default to PENDING_APPROVAL status
      const effectiveStatus = showApprovalView && !filterValues.status ? 'PENDING_APPROVAL' : filterValues.status

      const response = await activityApi.getActivities({
        status: effectiveStatus,
        activity_type_id: filterValues.activity_type_id,
        activity_field_id: filterValues.activity_field_id,
        organization_id: currentUser.organization_id, // Always filter by user's organization
        search: filterValues.search || undefined,
        start_date: filterValues.date_range?.[0]?.format('YYYY-MM-DD'),
        end_date: filterValues.date_range?.[1]?.format('YYYY-MM-DD'),
        is_locked: filterValues.is_locked,
        page: pagination.current,
        per_page: pagination.pageSize,
      })

      // Sort activities: prioritize items needing action (DRAFT or COMPLETED without result_summary)
      const sortedActivities = [...response.data].sort((a, b) => {
        const aNeedsAction = (a.status === 'DRAFT' || (a.status === 'COMPLETED' && (!a.result_summary || a.result_summary.trim() === ''))) ? 0 : 1
        const bNeedsAction = (b.status === 'DRAFT' || (b.status === 'COMPLETED' && (!b.result_summary || b.result_summary.trim() === ''))) ? 0 : 1
        return aNeedsAction - bNeedsAction
      })
      setActivities(sortedActivities)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.organization_id, filterValues, pagination.current, pagination.pageSize, showApprovalView])

  // Fetch form data (dropdowns)
  const fetchFormData = async () => {
    try {
      const response = await activityApi.getActivityFormData()
      setFormData(response.data)
    } catch (error: any) {
      console.error('Failed to fetch form data:', error)
    }
  }

  // Advanced filter fields configuration
  const filterFields: FilterField[] = useMemo(() => {
    const fields: FilterField[] = [
      {
        key: 'search',
        label: 'Tìm kiếm',
        type: 'text',
        placeholder: 'Tìm theo mã hoặc tên...',
        span: 8,
      },
      {
        key: 'status',
        label: 'Trạng thái',
        type: 'select',
        span: 4,
        options: (formData?.statuses || [])
          .filter((s) => !showApprovalView || s.value === 'PENDING_APPROVAL')
          .map((s) => ({
            value: s.value,
            label: s.label,
            color: s.value === 'COMPLETED' ? 'green' :
                   s.value === 'IN_PROGRESS' ? 'blue' :
                   s.value === 'PENDING_APPROVAL' ? 'orange' :
                   s.value === 'CANCELLED' ? 'red' :
                   s.value === 'APPROVED' ? 'cyan' : undefined,
          })),
      },
      {
        key: 'activity_type_id',
        label: 'Loại hoạt động',
        type: 'select',
        span: 6,
        options: (formData?.activity_types || []).map((t) => ({
          value: t.id,
          label: t.name,
        })),
      },
      {
        key: 'activity_field_id',
        label: 'Lĩnh vực',
        type: 'select',
        span: 6,
        options: (formData?.activity_fields || []).map((f) => ({
          value: f.id,
          label: f.name,
        })),
      },
      {
        key: 'date_range',
        label: 'Thời gian',
        type: 'daterange',
        span: 8,
      },
      {
        key: 'is_locked',
        label: 'Đã khóa',
        type: 'boolean',
        span: 4,
      },
    ]
    return fields
  }, [formData, showApprovalView])

  // Handle filter change
  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues)
  }

  // Handle filter search
  const handleFilterSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchActivities()
  }

  // Handle filter reset
  const handleFilterReset = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
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
    setWizardModalVisible(true)
  }

  const handleEdit = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      setDetailModalMode('edit')
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin hoạt động')
    }
  }

  const handleView = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      setDetailModalMode('view')
      setDetailModalVisible(true)
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

  // Handle wizard modal success
  const handleWizardSuccess = (activity: Activity, submitted: boolean) => {
    fetchActivities()
    if (submitted) {
      message.success('Đã gửi yêu cầu phê duyệt thành công')
    }
    window.dispatchEvent(new CustomEvent('activity-status-changed'))
  }

  // Handle wizard modal close
  const handleWizardClose = () => {
    setWizardModalVisible(false)
    setSelectedActivity(null)
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

  // Handle postpone activity
  const handlePostpone = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.postponeActivity(id)
      message.success('Đã tạm hoãn hoạt động. Vui lòng cập nhật ngày bắt đầu/kết thúc mới.')
      fetchActivities()
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
    } catch (error: any) {
      message.error(error.message || 'Không thể tạm hoãn hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  // Open cancel modal
  const openCancelModal = (id: string) => {
    setCancelActivityId(id)
    setCancelReason('')
    setShowCancelModal(true)
  }

  // Handle cancel activity
  const handleCancelActivity = async () => {
    if (!cancelActivityId || !cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy hoạt động')
      return
    }

    setActionLoading(true)
    try {
      await activityApi.cancelActivity(cancelActivityId, { reason: cancelReason })
      message.success('Đã hủy hoạt động thành công')
      setShowCancelModal(false)
      setCancelActivityId(null)
      setCancelReason('')
      fetchActivities()
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
    } catch (error: any) {
      message.error(error.message || 'Không thể hủy hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  // Open assign staff modal
  const handleOpenAssignModal = async (activity: Activity) => {
    setAssigningActivity(activity)
    setSelectedStaffId(activity.assigned_to || undefined)
    setAssignModalVisible(true)

    // Fetch staff list
    setLoadingStaff(true)
    try {
      const response = await getMyOrganizationMembers({ role: 'STAFF', per_page: 100 })
      setStaffList(response.data)
    } catch (error: any) {
      message.error('Không thể tải danh sách nhân viên')
    } finally {
      setLoadingStaff(false)
    }
  }

  // Handle assign staff
  const handleAssignStaff = async () => {
    if (!assigningActivity) return

    setAssigningStaff(true)
    try {
      await activityApi.updateActivity(assigningActivity.id, {
        assigned_to: selectedStaffId || null,
      })
      message.success(selectedStaffId ? 'Đã phân công nhân viên phụ trách' : 'Đã bỏ phân công nhân viên')
      setAssignModalVisible(false)
      setAssigningActivity(null)
      setSelectedStaffId(undefined)
      fetchActivities()
    } catch (error: any) {
      message.error(error.message || 'Không thể phân công nhân viên')
    } finally {
      setAssigningStaff(false)
    }
  }

  // Close assign modal
  const handleCloseAssignModal = () => {
    setAssignModalVisible(false)
    setAssigningActivity(null)
    setSelectedStaffId(undefined)
    setStaffList([])
  }

  // Check if can assign staff (MANAGER+ only)
  const canAssignStaff = canApprove

  // Handle uncancel activity (ADMIN only)
  const handleUncancel = async (id: string) => {
    setActionLoading(true)
    try {
      await activityApi.uncancelActivity(id)
      message.success('Đã khôi phục hoạt động thành công')
      fetchActivities()
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
    } catch (error: any) {
      message.error(error.message || 'Không thể khôi phục hoạt động')
    } finally {
      setActionLoading(false)
    }
  }

  // Check if activity can be postponed/cancelled
  // STAFF can only postpone/cancel their own activities
  // MANAGER, OPERATOR, ADMIN can postpone/cancel any activity in their scope
  // Note: is_locked does NOT prevent postpone/cancel - this allows fixing mistakes
  const canPostponeOrCancel = (activity: Activity): boolean => {
    const allowedStatuses: ActivityStatus[] = ['APPROVED', 'IN_PROGRESS', 'COMPLETED']
    if (!allowedStatuses.includes(activity.status)) return false

    // STAFF can only postpone/cancel their own activities
    if (currentUser?.role === 'STAFF') {
      return activity.created_by === currentUser?.id
    }

    // MANAGER, OPERATOR, ADMIN can postpone/cancel
    return canApprove
  }

  // Check if activity can be uncancelled (ADMIN only)
  const canUncancelActivity = (activity: Activity): boolean => {
    return activity.status === 'CANCELLED' && isAdmin
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

  // Fetch export columns when view mode changes
  const fetchExportColumns = useCallback(async (viewMode: reportApi.ViewMode) => {
    setLoadingColumns(true)
    try {
      const response = await reportApi.getExportColumns(viewMode)
      const columns = response.data.columns
      setExportColumns(columns)
      // Select default columns
      const defaultCols = columns.filter(c => c.default).map(c => c.key)
      setSelectedExportColumns(defaultCols)
    } catch (error: any) {
      message.error('Không thể tải danh sách cột')
    } finally {
      setLoadingColumns(false)
    }
  }, [])

  // Handle view mode change
  const handleExportViewModeChange = (viewMode: reportApi.ViewMode) => {
    setExportViewMode(viewMode)
    fetchExportColumns(viewMode)
  }

  // Handle open export modal
  const handleOpenExportModal = () => {
    setExportModalVisible(true)
    fetchExportColumns(exportViewMode)
  }

  // Export report handler
  const handleExportReport = async () => {
    if (selectedExportColumns.length === 0) {
      message.warning('Vui lòng chọn ít nhất một cột để xuất')
      return
    }

    setExporting(true)
    try {
      await reportApi.exportActivityReport({
        month: exportMonth,
        year: exportYear,
        viewMode: exportViewMode,
        columns: selectedExportColumns,
      })
      message.success('Đã xuất báo cáo thành công')
      setExportModalVisible(false)
    } catch (error: any) {
      message.error(error.message || 'Không thể xuất báo cáo')
    } finally {
      setExporting(false)
    }
  }

  // Toggle all columns
  const handleSelectAllColumns = (checked: boolean) => {
    if (checked) {
      setSelectedExportColumns(exportColumns.map(c => c.key))
    } else {
      setSelectedExportColumns([])
    }
  }

  // Reset to default columns
  const handleResetDefaultColumns = () => {
    const defaultCols = exportColumns.filter(c => c.default).map(c => c.key)
    setSelectedExportColumns(defaultCols)
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
    const lockableStatuses: ActivityStatus[] = ['APPROVED', 'IN_PROGRESS', 'POSTPONED', 'COMPLETED', 'CANCELLED']
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

  // Check if activity needs action (DRAFT or COMPLETED without result_summary)
  const needsAction = (activity: Activity): boolean => {
    if (activity.status === 'DRAFT') return true
    if (activity.status === 'COMPLETED') {
      return !activity.result_summary || activity.result_summary.trim() === ''
    }
    return false
  }

  // Get status tag color with badge for items needing action
  const getStatusTag = (status: ActivityStatus, activity?: Activity) => {
    const tag = (
      <Tag color={activityApi.getStatusColor(status)}>
        {activityApi.getStatusLabel(status)}
      </Tag>
    )

    // Show badge dot for activities needing action
    if (activity && needsAction(activity)) {
      return (
        <Badge dot offset={[2, 0]} color="#ff4d4f">
          {tag}
        </Badge>
      )
    }

    return tag
  }

  // Toggleable columns configuration
  const toggleableColumns: ToggleableColumn[] = useMemo(() => [
    { key: 'index', title: 'STT', fixed: true },
    { key: 'code', title: 'Mã hoạt động', defaultVisible: true },
    { key: 'title', title: 'Tên hoạt động', fixed: true },
    { key: 'activity_type', title: 'Loại hoạt động', defaultVisible: true },
    { key: 'lead_organization', title: 'Đơn vị chủ trì', defaultVisible: true },
    { key: 'status', title: 'Trạng thái', defaultVisible: true },
    { key: 'completion_percentage', title: 'Tiến độ', defaultVisible: true },
    { key: 'date_range', title: 'Thời gian', defaultVisible: true },
    { key: 'actions', title: 'Thao tác', fixed: true },
  ], [])

  const allColumns: ColumnsType<Activity> = [
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
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
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
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
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
      sorter: (a, b) => (a.activity_type?.name || '').localeCompare(b.activity_type?.name || ''),
      render: (name: string) =>
        name ? <Tag color="blue">{name}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Đơn vị chủ trì',
      dataIndex: ['lead_organization', 'short_name'],
      key: 'lead_organization',
      width: 150,
      sorter: (a, b) => (a.lead_organization?.short_name || a.lead_organization?.name || '').localeCompare(b.lead_organization?.short_name || b.lead_organization?.name || ''),
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
      sorter: (a, b) => {
        // Priority sorting: activities needing action first
        const aNeedsAction = needsAction(a) ? 0 : 1
        const bNeedsAction = needsAction(b) ? 0 : 1
        if (aNeedsAction !== bNeedsAction) return aNeedsAction - bNeedsAction
        return (a.status || '').localeCompare(b.status || '')
      },
      defaultSortOrder: 'ascend',
      render: (status: ActivityStatus, record: Activity) => getStatusTag(status, record),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'completion_percentage',
      key: 'completion_percentage',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.completion_percentage || 0) - (b.completion_percentage || 0),
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
      sorter: (a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
        return dateA - dateB
      },
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
      width: 280,
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
          {/* Assign Staff button - for MANAGER+ only, not locked */}
          {canAssignStaff && !record.is_locked && (
            <Tooltip title={record.assigned_to ? 'Đổi nhân viên phụ trách' : 'Phân công nhân viên'}>
              <Button
                type="link"
                size="small"
                icon={<UserSwitchOutlined />}
                onClick={() => handleOpenAssignModal(record)}
                style={{ color: record.assigned_to ? '#52c41a' : '#722ed1' }}
              />
            </Tooltip>
          )}
          {/* Postpone button - for APPROVED/IN_PROGRESS/COMPLETED activities */}
          {canPostponeOrCancel(record) && (
            <Tooltip title="Tạm hoãn">
              <Popconfirm
                title="Tạm hoãn hoạt động này?"
                description="Hoạt động sẽ chuyển sang trạng thái Tạm hoãn để chỉnh sửa ngày."
                onConfirm={() => handlePostpone(record.id)}
                okText="Tạm hoãn"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<PauseCircleOutlined />}
                  style={{ color: '#fa8c16' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {/* Cancel button - for APPROVED/IN_PROGRESS/COMPLETED activities */}
          {canPostponeOrCancel(record) && (
            <Tooltip title="Hủy hoạt động">
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
                onClick={() => openCancelModal(record.id)}
                style={{ color: '#ff4d4f' }}
              />
            </Tooltip>
          )}
          {/* Uncancel button - for CANCELLED activities, ADMIN only */}
          {canUncancelActivity(record) && (
            <Tooltip title="Khôi phục hoạt động">
              <Popconfirm
                title="Khôi phục hoạt động này?"
                description="Hoạt động sẽ chuyển về trạng thái Đã phê duyệt."
                onConfirm={() => handleUncancel(record.id)}
                okText="Khôi phục"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<UndoOutlined />}
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
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

  // Filter columns based on visibility
  const columns = useMemo(() =>
    allColumns.filter(col => visibleColumns.includes(col.key as string)),
    [allColumns, visibleColumns]
  )

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
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            <FlagOutlined /> Quản lý Hoạt động
          </Title>
          <Text type="secondary">
            {formData?.user_organization
              ? `Các hoạt động của ${formData.user_organization.name}`
              : 'Tất cả hoạt động trong hệ thống'}
          </Text>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Advanced Filter */}
          <AdvancedFilter
            fields={filterFields}
            values={filterValues}
            onChange={handleFilterChange}
            onSearch={handleFilterSearch}
            onReset={handleFilterReset}
            loading={loading}
            storageKey="activity_management_filters"
            showPresets={true}
            collapsible={true}
            defaultExpanded={true}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchActivities} loading={loading}>
                  Làm mới
                </Button>
                <ColumnToggle
                  columns={toggleableColumns}
                  visibleColumns={visibleColumns}
                  onChange={setVisibleColumns}
                  storageKey="activity_management"
                />
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={handleOpenExportModal}
                >
                  Xuất báo cáo
                </Button>
                {canCreate && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm hoạt động
                  </Button>
                )}
              </Space>
            }
          />

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

      {/* Activity Detail Modal - Tabs for View/Edit */}
      <ActivityDetailModal
        visible={detailModalVisible}
        activity={selectedActivity}
        formData={formData}
        mode={detailModalMode}
        onClose={() => {
          setDetailModalVisible(false)
          setSelectedActivity(null)
        }}
        onSuccess={(activity) => {
          fetchActivities()
          window.dispatchEvent(new CustomEvent('activity-status-changed'))
        }}
      />

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

      {/* Cancel Activity Modal */}
      <Modal
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            <span>Hủy hoạt động</span>
          </Space>
        }
        open={showCancelModal}
        onOk={handleCancelActivity}
        onCancel={() => {
          setShowCancelModal(false)
          setCancelActivityId(null)
          setCancelReason('')
        }}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
        confirmLoading={actionLoading}
        centered
      >
        <Alert
          type="warning"
          showIcon
          message="Lưu ý: Hoạt động bị hủy sẽ không thể chỉnh sửa được nữa."
          description="Chỉ ADMIN mới có quyền khôi phục hoạt động đã hủy."
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item
            label="Lý do hủy hoạt động"
            required
            help="Vui lòng nhập lý do để ghi nhận và thông báo cho các bên liên quan"
          >
            <Input.TextArea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy hoạt động..."
              rows={3}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Activity Wizard Modal - 3 Steps for Creating New Activity */}
      <ActivityWizardModal
        visible={wizardModalVisible}
        activity={null}
        formData={formData}
        onClose={handleWizardClose}
        onSuccess={handleWizardSuccess}
      />

      {/* Assign Staff Modal */}
      <Modal
        title={
          <Space>
            <UserSwitchOutlined style={{ color: '#722ed1' }} />
            <span>Phân công nhân viên phụ trách</span>
          </Space>
        }
        open={assignModalVisible}
        onOk={handleAssignStaff}
        onCancel={handleCloseAssignModal}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={assigningStaff}
        centered
        width={500}
      >
        {assigningActivity && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Hoạt động:</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong>{assigningActivity.title}</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text code>{assigningActivity.code}</Text>
              </div>
            </div>

            <Form layout="vertical">
              <Form.Item
                label="Chọn nhân viên phụ trách"
                help="Nhân viên được phân công sẽ có quyền chỉnh sửa hoạt động này"
              >
                <Select
                  value={selectedStaffId}
                  onChange={setSelectedStaffId}
                  placeholder="Chọn nhân viên..."
                  loading={loadingStaff}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                >
                  {staffList.map((staff) => (
                    <Option key={staff.id} value={staff.id}>
                      {staff.last_name} {staff.first_name} ({staff.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>

            {assigningActivity.assigned_to && !selectedStaffId && (
              <Alert
                type="info"
                message="Bỏ chọn nhân viên sẽ xóa phân công hiện tại"
                style={{ marginTop: 8 }}
                showIcon
              />
            )}
          </>
        )}
      </Modal>

      {/* Export Report Modal */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <span>Xuất báo cáo hoạt động NQ57</span>
          </Space>
        }
        open={exportModalVisible}
        onOk={handleExportReport}
        onCancel={() => setExportModalVisible(false)}
        confirmLoading={exporting}
        okText={
          <Space>
            <DownloadOutlined />
            Xuất báo cáo
          </Space>
        }
        cancelText="Hủy"
        width={700}
      >
        <Form layout="vertical">
          {/* View Mode Selection */}
          <Form.Item label="Chế độ hiển thị">
            <Select
              value={exportViewMode}
              onChange={handleExportViewModeChange}
              style={{ width: '100%' }}
            >
              <Option value="activities">
                <Space>
                  <FlagOutlined />
                  Theo Hoạt động - Mỗi hoạt động 1 dòng, KPI ở cột riêng
                </Space>
              </Option>
              <Option value="kpis">
                <Space>
                  <GlobalOutlined />
                  Theo KPI - Phân loại theo Categories, hoạt động dưới mỗi KPI
                </Space>
              </Option>
            </Select>
          </Form.Item>

          {/* Period Selection */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tháng">
                <Select
                  value={exportMonth}
                  onChange={setExportMonth}
                  style={{ width: '100%' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <Option key={m} value={m}>
                      Tháng {m}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Năm">
                <Select
                  value={exportYear}
                  onChange={setExportYear}
                  style={{ width: '100%' }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <Option key={y} value={y}>
                      {y}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Column Selection */}
          <Form.Item
            label={
              <Space>
                <span>Chọn cột xuất</span>
                <Text type="secondary">({selectedExportColumns.length}/{exportColumns.length} cột)</Text>
              </Space>
            }
          >
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Checkbox
                  checked={selectedExportColumns.length === exportColumns.length}
                  indeterminate={selectedExportColumns.length > 0 && selectedExportColumns.length < exportColumns.length}
                  onChange={(e) => handleSelectAllColumns(e.target.checked)}
                >
                  Chọn tất cả
                </Checkbox>
                <Button size="small" onClick={handleResetDefaultColumns}>
                  Mặc định
                </Button>
              </Space>
            </div>

            <div style={{
              background: '#fafafa',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: 12,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              {loadingColumns ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Text type="secondary">Đang tải...</Text>
                </div>
              ) : (
                <Checkbox.Group
                  value={selectedExportColumns}
                  onChange={(values) => setSelectedExportColumns(values as string[])}
                  style={{ width: '100%' }}
                >
                  <Row gutter={[8, 8]}>
                    {exportColumns.map((col) => (
                      <Col span={12} key={col.key}>
                        <Checkbox value={col.key}>
                          {col.label}
                          {col.default && (
                            <Tag size="small" color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                              mặc định
                            </Tag>
                          )}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              )}
            </div>
          </Form.Item>
        </Form>

        <Alert
          type="info"
          message={
            exportViewMode === 'activities'
              ? 'Chế độ Hoạt động: Mỗi hoạt động xuất hiện 1 dòng, các KPI được hiển thị trong cột riêng (KPI Trung ương, KPI ĐHQG-HCM).'
              : 'Chế độ KPI: Báo cáo phân loại theo KPI Categories (I, II, III...), mỗi KPI hiển thị các hoạt động liên kết bên dưới.'
          }
          style={{ marginTop: 8 }}
          showIcon
        />
      </Modal>
    </div>
  )
}

export default ActivityManagement
