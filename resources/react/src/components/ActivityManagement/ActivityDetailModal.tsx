import { useState, useEffect } from 'react'
import {
  Modal,
  Tabs,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  Tag,
  Checkbox,
  Descriptions,
  Divider,
  message,
  Spin,
  Badge,
  Tooltip,
  Table,
  Card,
  Empty,
  Upload,
  Popconfirm,
} from 'antd'
import type { UploadProps } from 'antd'
import {
  FlagOutlined,
  FileOutlined,
  EditOutlined,
  EyeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  GlobalOutlined,
  BankOutlined,
  SendOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  MailOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
  PauseCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as activityApi from '../../services/activityApi'
import type {
  Activity,
  ActivityFormData,
  UpdateActivityRequest,
  ActivityFile,
  FileType,
  ActivityParticipant,
  AttendanceFile,
  ParticipantsSummary,
  OrganizationUserGroup,
  OrganizationOption,
} from '../../services/activityApi'
import ActivityFilesStep, { PendingFile } from './ActivityFilesStep'
import ActivityCompletionModal from './ActivityCompletionModal'
import { needsCompletionAction } from '../../services/activityApi'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// Status configuration
// Workflow: DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED
// IN_PROGRESS and COMPLETED are computed dynamically from APPROVED based on dates
// POSTPONED: Temporarily postponed - allows editing dates, auto-returns to APPROVED after saving
const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  draft: { color: 'default', text: 'Nháp', icon: <EditOutlined /> },
  pending_approval: { color: 'processing', text: 'Chờ phê duyệt', icon: <ClockCircleOutlined /> },
  approved: { color: 'success', text: 'Đã phê duyệt', icon: <CheckCircleOutlined /> },
  rejected: { color: 'error', text: 'Từ chối', icon: <CloseOutlined /> },
  in_progress: { color: 'blue', text: 'Đang thực hiện', icon: <ClockCircleOutlined /> },
  completed: { color: 'success', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
  postponed: { color: 'warning', text: 'Tạm hoãn', icon: <ExclamationCircleOutlined /> },
  cancelled: { color: 'error', text: 'Đã hủy', icon: <CloseOutlined /> },
}

interface ActivityDetailModalProps {
  visible: boolean
  activity: Activity | null
  formData: ActivityFormData | null
  mode: 'view' | 'edit'
  onClose: () => void
  onSuccess: (activity: Activity) => void
}

function ActivityDetailModal({
  visible,
  activity,
  formData,
  mode,
  onClose,
  onSuccess,
}: ActivityDetailModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [isEditing, setIsEditing] = useState(mode === 'edit')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([])

  // Files state
  const [files, setFiles] = useState<ActivityFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  // Participants state
  const [participants, setParticipants] = useState<ActivityParticipant[]>([])
  const [attendanceFile, setAttendanceFile] = useState<AttendanceFile | null>(null)
  const [participantsSummary, setParticipantsSummary] = useState<ParticipantsSummary | null>(null)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [exportingParticipants, setExportingParticipants] = useState(false)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [resendingInvitation, setResendingInvitation] = useState(false)
  const [sendingInvitations, setSendingInvitations] = useState(false)

  // Postpone/Cancel state
  const [postponing, setPostponing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // Organization groups state (for adding participants)
  const [organizationGroups, setOrganizationGroups] = useState<OrganizationUserGroup[]>([])
  const [organizationsList, setOrganizationsList] = useState<OrganizationOption[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(undefined)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [addingFromGroup, setAddingFromGroup] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showAddParticipants, setShowAddParticipants] = useState(false)

  // Watch dates for duration calculation
  const watchStartDate = Form.useWatch('start_date', form)
  const watchEndDate = Form.useWatch('end_date', form)

  // Reset state when modal opens/closes or activity changes
  useEffect(() => {
    if (visible && activity) {
      setActiveTab('info')
      // Only allow editing if mode is 'edit' AND status is 'draft' or 'postponed'
      // pending_approval and other statuses cannot be edited
      // postponed status can only edit dates
      setIsEditing(mode === 'edit' && (activity.status === 'DRAFT' || activity.status === 'POSTPONED'))
      setPendingFiles([])
      setParticipants([])
      setAttendanceFile(null)
      setParticipantsSummary(null)
      setSelectedParticipantIds([])
      setOrganizationGroups([])
      setOrganizationsList([])
      setSelectedOrganizationId(undefined)
      setSelectedGroups([])
      setShowAddParticipants(false)

      // Set form values
      const kpiIds = activity.kpis?.map(k => k.id) || []
      setSelectedKpiIds(kpiIds)
      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        activity_type_id: activity.activity_type_id,
        activity_field_id: activity.activity_field_id,
        leader_names: activity.leader_names || [],
        start_date: activity.start_date ? dayjs(activity.start_date) : undefined,
        end_date: activity.end_date ? dayjs(activity.end_date) : undefined,
        budget: activity.budget,
        budget_source: activity.budget_source,
        location: activity.location,
        external_url: activity.external_url,
        completion_percentage: activity.completion_percentage,
        result_summary: activity.result_summary,
      })

      // Fetch files
      fetchActivityFiles(activity.id)
      // Fetch participants
      fetchParticipants(activity.id)
    }
  }, [visible, activity, mode])

  // Fetch activity files
  const fetchActivityFiles = async (activityId: string) => {
    setFilesLoading(true)
    try {
      const response = await activityApi.getActivityFiles(activityId)
      setFiles(response.data.files)
      if (response.data.file_types) {
        setFileTypes(response.data.file_types)
      }
    } catch (error: any) {
      console.error('Failed to fetch files:', error)
    } finally {
      setFilesLoading(false)
    }
  }

  // Fetch participants
  const fetchParticipants = async (activityId: string) => {
    setParticipantsLoading(true)
    try {
      const response = await activityApi.getActivityParticipants(activityId)
      setParticipants(response.data.participants)
      setAttendanceFile(response.data.attendance_file)
      setParticipantsSummary(response.data.summary)
    } catch (error: any) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setParticipantsLoading(false)
    }
  }

  // Upload attendance list
  const handleUploadAttendance = async (file: File) => {
    if (!activity) return false

    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel' ||
                   file.name.endsWith('.xlsx') ||
                   file.name.endsWith('.xls')

    if (!isExcel) {
      message.error('Chỉ chấp nhận file Excel (.xlsx, .xls)')
      return false
    }

    setUploadingAttendance(true)
    try {
      const response = await activityApi.uploadAttendanceList(activity.id, file)
      message.success(response.message)
      setAttendanceFile(response.data.file)
      await fetchParticipants(activity.id)
    } catch (error: any) {
      message.error(error.message || 'Không thể upload danh sách tham dự')
    } finally {
      setUploadingAttendance(false)
    }
    return false
  }

  // Delete attendance list
  const handleDeleteAttendance = async () => {
    if (!activity) return

    setParticipantsLoading(true)
    try {
      await activityApi.deleteAttendanceList(activity.id)
      message.success('Đã xóa danh sách tham dự')
      setAttendanceFile(null)
      setParticipants([])
      setParticipantsSummary(null)
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa danh sách tham dự')
    } finally {
      setParticipantsLoading(false)
    }
  }

  // Download attendance template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      await activityApi.downloadAttendanceTemplate()
      message.success('Đã tải xuống mẫu danh sách tham dự')
    } catch (error: any) {
      message.error(error.message || 'Không thể tải xuống mẫu')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  // Export participants list
  const handleExportParticipants = async () => {
    if (!activity) return
    setExportingParticipants(true)
    try {
      await activityApi.exportParticipants(activity.id)
      message.success('Đã xuất danh sách tham dự')
    } catch (error: any) {
      message.error(error.message || 'Không thể xuất danh sách')
    } finally {
      setExportingParticipants(false)
    }
  }

  // Send invitations to all participants
  const handleSendInvitations = async () => {
    if (!activity) return

    setSendingInvitations(true)
    try {
      const response = await activityApi.sendInvitations(activity.id)
      message.success(response.message)
      await fetchParticipants(activity.id)
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi lời mời')
    } finally {
      setSendingInvitations(false)
    }
  }

  // Postpone activity
  const handlePostpone = async () => {
    if (!activity) return

    setPostponing(true)
    try {
      const response = await activityApi.postponeActivity(activity.id)
      message.success('Hoạt động đã được tạm hoãn. Bạn có thể chỉnh sửa thời gian.')
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
      onSuccess(response.data)
      // Enable editing mode for dates
      setIsEditing(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tạm hoãn hoạt động')
    } finally {
      setPostponing(false)
    }
  }

  // Cancel activity
  const handleCancel = async () => {
    if (!activity || !cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy')
      return
    }

    setCancelling(true)
    try {
      const response = await activityApi.cancelActivity(activity.id, { reason: cancelReason })
      message.success('Hoạt động đã bị hủy')
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
      onSuccess(response.data)
      setShowCancelModal(false)
      setCancelReason('')
      handleClose()
    } catch (error: any) {
      message.error(error.message || 'Không thể hủy hoạt động')
    } finally {
      setCancelling(false)
    }
  }

  // Resend invitation to selected participants
  const handleResendInvitation = async () => {
    if (!activity || selectedParticipantIds.length === 0) {
      message.warning('Vui lòng chọn người tham dự để gửi lại lời mời')
      return
    }

    setResendingInvitation(true)
    try {
      const response = await activityApi.resendInvitation(activity.id, selectedParticipantIds)
      message.success(response.message)
      setSelectedParticipantIds([])
      await fetchParticipants(activity.id)
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi lại lời mời')
    } finally {
      setResendingInvitation(false)
    }
  }

  // Fetch organization user groups
  const fetchOrganizationGroups = async (activityId: string, organizationId?: string) => {
    setLoadingGroups(true)
    try {
      const response = await activityApi.getOrganizationUserGroups(activityId, organizationId)
      setOrganizationGroups(response.data.groups)
      setOrganizationsList(response.data.organizations)
      if (response.data.organization && !selectedOrganizationId) {
        setSelectedOrganizationId(response.data.organization.id)
      }
    } catch (error: any) {
      console.error('Failed to fetch organization groups:', error)
    } finally {
      setLoadingGroups(false)
    }
  }

  // Handle organization change
  const handleOrganizationChange = async (organizationId: string) => {
    if (!activity) return
    setSelectedOrganizationId(organizationId)
    setSelectedGroups([])
    await fetchOrganizationGroups(activity.id, organizationId)
  }

  // Add participants from selected groups
  const handleAddFromGroups = async () => {
    if (!activity || selectedGroups.length === 0) {
      message.warning('Vui lòng chọn ít nhất một nhóm')
      return
    }

    if (!selectedOrganizationId) {
      message.warning('Vui lòng chọn tổ chức')
      return
    }

    setAddingFromGroup(true)
    try {
      const response = await activityApi.addParticipantsFromGroup(activity.id, selectedOrganizationId, selectedGroups)
      message.success(response.message)
      setSelectedGroups([])
      await Promise.all([
        fetchParticipants(activity.id),
        fetchOrganizationGroups(activity.id, selectedOrganizationId),
      ])
    } catch (error: any) {
      message.error(error.message || 'Không thể thêm người tham dự')
    } finally {
      setAddingFromGroup(false)
    }
  }

  // Toggle show add participants panel
  const handleToggleAddParticipants = async () => {
    if (!showAddParticipants && activity) {
      await fetchOrganizationGroups(activity.id)
    }
    setShowAddParticipants(!showAddParticipants)
  }

  // Calculate duration
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

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return '-'
    return dayjs(date).format('DD/MM/YYYY HH:mm')
  }

  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  // Save changes
  const handleSave = async () => {
    if (!activity) return

    try {
      const values = await form.validateFields()
      setLoading(true)

      const start_date = values.start_date ? values.start_date.format('YYYY-MM-DD HH:mm:ss') : undefined
      const end_date = values.end_date ? values.end_date.format('YYYY-MM-DD HH:mm:ss') : undefined

      // If activity is POSTPONED, only send start_date and end_date
      let requestData: UpdateActivityRequest
      if (activity.status === 'POSTPONED') {
        requestData = {
          start_date,
          end_date,
        }
      } else {
        requestData = {
          title: values.title,
          description: values.description,
          activity_type_id: values.activity_type_id,
          activity_field_id: values.activity_field_id,
          leader_names: values.leader_names || [],
          start_date,
          end_date,
          budget: values.budget,
          budget_source: values.budget_source,
          location: values.location,
          external_url: values.external_url,
          completion_percentage: values.completion_percentage,
          result_summary: values.result_summary,
          kpi_ids: selectedKpiIds,
        }
      }

      const response = await activityApi.updateActivity(activity.id, requestData)
      message.success(activity.status === 'POSTPONED'
        ? 'Đã cập nhật thời gian. Hoạt động đã chuyển về trạng thái Đã phê duyệt.'
        : 'Đã cập nhật hoạt động')
      setIsEditing(false)
      onSuccess(response.data)
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!activity) return

    try {
      setLoading(true)
      await activityApi.submitActivityForApproval(activity.id)
      message.success('Đã gửi yêu cầu phê duyệt thành công')
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
      onSuccess({ ...activity, status: 'pending_approval' })
      handleClose()
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi yêu cầu phê duyệt')
    } finally {
      setLoading(false)
    }
  }

  // Close modal
  const handleClose = () => {
    setActiveTab('info')
    setIsEditing(false)
    setFiles([])
    setPendingFiles([])
    setSelectedKpiIds([])
    setParticipants([])
    setAttendanceFile(null)
    setParticipantsSummary(null)
    setSelectedParticipantIds([])
    setOrganizationGroups([])
    setOrganizationsList([])
    setSelectedOrganizationId(undefined)
    setSelectedGroups([])
    setShowAddParticipants(false)
    // Reset postpone/cancel state
    setShowCancelModal(false)
    setCancelReason('')
    form.resetFields()
    onClose()
  }

  // Get activity type name
  const getActivityTypeName = (typeId?: string) => {
    if (!typeId) return '-'
    const type = formData?.activity_types.find(t => t.id === typeId)
    return type?.name || '-'
  }

  // Get activity field name
  const getActivityFieldName = (fieldId?: string) => {
    if (!fieldId) return '-'
    const field = formData?.activity_fields.find(f => f.id === fieldId)
    return field?.name || '-'
  }

  // Render view mode for info tab
  const renderInfoView = () => {
    if (!activity) return null

    const status = statusConfig[activity.status] || statusConfig.draft

    return (
      <div style={{ padding: '8px 0' }}>
        {/* Status and Code */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color={status.color} icon={status.icon}>
              {status.text}
            </Tag>
            <Text code>{activity.code}</Text>
          </Space>
          <Space>
            {/* Edit button for DRAFT */}
            {activity.status === 'DRAFT' && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              >
                Chỉnh sửa
              </Button>
            )}
            {/* Edit dates button for POSTPONED */}
            {activity.status === 'POSTPONED' && (
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => setIsEditing(true)}
              >
                Sửa thời gian
              </Button>
            )}
            {/* Completion action button for COMPLETED activities needing update */}
            {activity.status === 'COMPLETED' && needsCompletionAction(activity) && (
              <Badge dot>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setShowCompletionModal(true)}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Cập nhật kết quả
                </Button>
              </Badge>
            )}
            {/* Update more button for COMPLETED activities that already have result */}
            {activity.status === 'COMPLETED' && !needsCompletionAction(activity) && (
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => setShowCompletionModal(true)}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                Cập nhật thêm
              </Button>
            )}
            {/* Postpone/Cancel buttons for APPROVED, IN_PROGRESS only (not COMPLETED, not locked) */}
            {['APPROVED', 'IN_PROGRESS'].includes(activity.status) && !activity.is_locked && (
              <>
                <Popconfirm
                  title="Tạm hoãn hoạt động?"
                  description="Bạn có thể chỉnh sửa thời gian sau khi tạm hoãn. Lời mời sẽ được gửi lại cho người tham dự sau khi lưu thời gian mới."
                  onConfirm={handlePostpone}
                  okText="Tạm hoãn"
                  cancelText="Hủy"
                >
                  <Button
                    icon={<PauseCircleOutlined />}
                    loading={postponing}
                  >
                    Tạm hoãn
                  </Button>
                </Popconfirm>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => setShowCancelModal(true)}
                >
                  Hủy hoạt động
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* Pending approval notice */}
        {activity.status === 'PENDING_APPROVAL' && (
          <Alert
            type="info"
            message="Hoạt động đang chờ phê duyệt"
            description="Hoạt động này đang chờ Manager phê duyệt. Trong thời gian này, không thể chỉnh sửa nội dung hoạt động."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Postponed notice */}
        {activity.status === 'POSTPONED' && (
          <Alert
            type="warning"
            message="Hoạt động đang tạm hoãn"
            description="Hoạt động này đang tạm hoãn. Bạn có thể chỉnh sửa thời gian bắt đầu và kết thúc. Sau khi lưu thay đổi, hoạt động sẽ tự động chuyển về trạng thái Đã phê duyệt và lời mời sẽ được gửi lại cho người tham dự."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Completed activity needs update notice */}
        {activity.status === 'COMPLETED' && needsCompletionAction(activity) && (
          <Alert
            type="success"
            message={
              <Space>
                <span>Hoạt động đã hoàn thành!</span>
                <Badge dot>
                  <span style={{ color: '#ff4d4f', fontWeight: 500 }}>Cần cập nhật</span>
                </Badge>
              </Space>
            }
            description="Hoạt động đã hoàn thành. Vui lòng cập nhật kết quả thực hiện, tải lên tài liệu (nếu có) và điểm danh người tham dự."
            style={{ marginBottom: 16 }}
            showIcon
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            action={
              <Button
                size="small"
                type="primary"
                onClick={() => setShowCompletionModal(true)}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Cập nhật ngay
              </Button>
            }
          />
        )}

        {/* Completed activity with result - show success without badge */}
        {activity.status === 'COMPLETED' && !needsCompletionAction(activity) && (
          <Alert
            type="success"
            message="Hoạt động đã hoàn thành"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Kết quả thực hiện:</Text>
                </div>
                <div style={{
                  background: '#f6ffed',
                  padding: '12px 16px',
                  borderRadius: 6,
                  border: '1px solid #b7eb8f',
                  whiteSpace: 'pre-wrap'
                }}>
                  {activity.result_summary}
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
            showIcon
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
        )}

        {/* Organization */}
        {activity.organization && (
          <Alert
            type="info"
            showIcon
            icon={<BankOutlined />}
            message={
              <span>
                <strong>Đơn vị chủ trì:</strong> {activity.organization.name}
                {activity.organization.short_name && activity.organization.short_name !== activity.organization.name && (
                  <Text type="secondary"> ({activity.organization.short_name})</Text>
                )}
              </span>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Basic Info */}
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Tên hoạt động" span={2}>
            <Text strong>{activity.title}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Loại hoạt động">
            {getActivityTypeName(activity.activity_type_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Lĩnh vực">
            {getActivityFieldName(activity.activity_field_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Người chủ trì">
            {activity.leader_names && activity.leader_names.length > 0 ? (
              <Space wrap size={[4, 4]}>
                {activity.leader_names.map((name, index) => (
                  <Tag key={index} icon={<UserOutlined />} color="blue">
                    {name}
                  </Tag>
                ))}
              </Space>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Nhân viên phụ trách">
            {activity.assigned_user ? (
              <Tag icon={<UserOutlined />} color="green">
                {activity.assigned_user.last_name} {activity.assigned_user.first_name}
                <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                  ({activity.assigned_user.email})
                </Text>
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian bắt đầu">
            {formatDate(activity.start_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian kết thúc">
            {formatDate(activity.end_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Địa điểm" span={2}>
            {activity.location || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Kinh phí">
            {formatCurrency(activity.budget)}
          </Descriptions.Item>
          <Descriptions.Item label="Nguồn kinh phí">
            {activity.budget_source || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Tiến độ">
            {activity.completion_percentage != null ? `${activity.completion_percentage}%` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Tóm tắt kết quả">
            {activity.result_summary || '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* Description */}
        {activity.description && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Mô tả:</Text>
            <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
              {activity.description}
            </Paragraph>
          </div>
        )}

        {/* External URL */}
        {activity.external_url && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Đường dẫn tham khảo: </Text>
            <a href={activity.external_url} target="_blank" rel="noopener noreferrer">
              <LinkOutlined /> {activity.external_url}
            </a>
          </div>
        )}

        {/* KPIs - Separated into tabs by source */}
        {activity.kpis && activity.kpis.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              <GlobalOutlined style={{ marginRight: 6 }} />
              Chỉ tiêu KPI liên quan ({activity.kpis.length})
            </Text>
            <Tabs
              size="small"
              items={[
                {
                  key: 'central',
                  label: (
                    <span>
                      <GlobalOutlined style={{ marginRight: 4 }} />
                      Trung ương ({activity.kpis.filter(k => k.source === 'CENTRAL').length})
                    </span>
                  ),
                  children: (
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {activity.kpis.filter(k => k.source === 'CENTRAL').length === 0 ? (
                        <Text type="secondary">Không có KPI Trung ương</Text>
                      ) : (
                        activity.kpis.filter(k => k.source === 'CENTRAL').map(kpi => (
                          <Tag key={kpi.id} color="purple" style={{ marginBottom: 4, marginRight: 4 }}>
                            {kpi.code && <Text code style={{ marginRight: 4, fontSize: 11 }}>{kpi.code}</Text>}
                            {kpi.title}
                          </Tag>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  key: 'vnu',
                  label: (
                    <span>
                      <BankOutlined style={{ marginRight: 4 }} />
                      ĐHQG-HCM ({activity.kpis.filter(k => k.source === 'VNU').length})
                    </span>
                  ),
                  children: (
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {activity.kpis.filter(k => k.source === 'VNU').length === 0 ? (
                        <Text type="secondary">Không có KPI ĐHQG-HCM</Text>
                      ) : (
                        activity.kpis.filter(k => k.source === 'VNU').map(kpi => (
                          <Tag key={kpi.id} color="blue" style={{ marginBottom: 4, marginRight: 4 }}>
                            {kpi.code && <Text code style={{ marginRight: 4, fontSize: 11 }}>{kpi.code}</Text>}
                            {kpi.title}
                          </Tag>
                        ))
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    )
  }

  // Render edit mode for info tab
  const renderInfoEdit = () => {
    if (!activity) return null

    // Check if only dates can be edited (postponed status)
    const isPostponed = activity.status === 'POSTPONED'

    return (
      <Form form={form} layout="vertical" size="middle">
        <Row gutter={24}>
          {/* Left Column - Main Info */}
          <Col span={isPostponed ? 24 : 16}>
            {/* Postponed notice */}
            {isPostponed && (
              <Alert
                type="warning"
                message="Chỉnh sửa thời gian"
                description="Hoạt động đang tạm hoãn. Bạn chỉ có thể chỉnh sửa thời gian bắt đầu và kết thúc. Sau khi lưu, hoạt động sẽ tự động chuyển về trạng thái Đã phê duyệt và lời mời sẽ được gửi lại cho người tham dự."
                style={{ marginBottom: 12 }}
                showIcon
              />
            )}

            {/* Organization Info */}
            {activity.organization && (
              <Alert
                type="info"
                showIcon
                message={
                  <span>
                    <strong>Đơn vị chủ trì:</strong> {activity.organization.name}
                    {activity.organization.short_name && activity.organization.short_name !== activity.organization.name && (
                      <Text type="secondary"> ({activity.organization.short_name})</Text>
                    )}
                  </span>
                }
                style={{ marginBottom: 12 }}
              />
            )}

            {/* Code & Status */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">Mã hoạt động: </Text>
              <Text code>{activity.code}</Text>
              <Tag
                color={statusConfig[activity.status]?.color || 'default'}
                style={{ marginLeft: 8 }}
              >
                {statusConfig[activity.status]?.text || activity.status}
              </Tag>
            </div>

            {/* Title - disabled for postponed */}
            <Form.Item
              name="title"
              label="Tên hoạt động"
              rules={[{ required: true, message: 'Vui lòng nhập tên hoạt động' }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="Nhập tên hoạt động" maxLength={500} disabled={isPostponed} />
            </Form.Item>

            {/* Type & Field - disabled for postponed */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="activity_type_id"
                  label={<span><span style={{ color: '#ff4d4f' }}>*</span> Loại hoạt động</span>}
                  rules={[{ required: true, message: 'Vui lòng chọn loại hoạt động' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Select placeholder="Chọn loại hoạt động" showSearch optionFilterProp="children" disabled={isPostponed}>
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
                  <Select placeholder="Chọn lĩnh vực" showSearch optionFilterProp="children" allowClear disabled={isPostponed}>
                    {formData?.activity_fields.map((f) => (
                      <Option key={f.id} value={f.id}>
                        {f.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Leader Names - disabled for postponed */}
            <Form.Item
              name="leader_names"
              label="Người chủ trì"
              style={{ marginBottom: 12 }}
              tooltip="Nhập tên người chủ trì, nhấn Enter để thêm nhiều người"
            >
              <Select
                mode="tags"
                placeholder="Nhập tên người chủ trì và nhấn Enter"
                tokenSeparators={[',']}
                disabled={isPostponed}
                style={{ width: '100%' }}
              />
            </Form.Item>

            {/* Start Date & End Date with Time - EDITABLE for postponed */}
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

            {/* Location, Budget, Budget Source - disabled for postponed */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="location" label="Địa điểm" style={{ marginBottom: 12 }}>
                  <Input prefix={<EnvironmentOutlined />} placeholder="Địa điểm thực hiện" disabled={isPostponed} />
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
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="budget_source" label="Nguồn kinh phí" style={{ marginBottom: 12 }}>
                  <Input placeholder="Nguồn kinh phí" disabled={isPostponed} />
                </Form.Item>
              </Col>
            </Row>

            {/* Description - disabled for postponed */}
            <Form.Item name="description" label="Mô tả" style={{ marginBottom: 12 }}>
              <TextArea rows={2} placeholder="Mô tả chi tiết về hoạt động" disabled={isPostponed} />
            </Form.Item>

            {/* External URL - disabled for postponed */}
            <Form.Item name="external_url" label="Đường dẫn tham khảo" style={{ marginBottom: 12 }}>
              <Input prefix={<LinkOutlined />} placeholder="https://..." disabled={isPostponed} />
            </Form.Item>

            {/* Progress - disabled for postponed */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="completion_percentage" label="Tiến độ (%)" style={{ marginBottom: 12 }}>
                  <InputNumber
                    min={0}
                    max={100}
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value!.replace('%', '') as any}
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="result_summary" label="Tóm tắt kết quả" style={{ marginBottom: 12 }}>
                  <Input placeholder="Nhập tóm tắt kết quả thực hiện" disabled={isPostponed} />
                </Form.Item>
              </Col>
            </Row>
          </Col>

          {/* Right Column - KPIs - Hidden for postponed */}
          {!isPostponed && (
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
          )}
        </Row>
      </Form>
    )
  }

  // Render files tab
  const renderFilesTab = () => {
    if (!activity) return null

    // Allow file upload for: DRAFT (editing), APPROVED, IN_PROGRESS, COMPLETED
    // File upload is the only action allowed for these approved+ statuses
    const canUploadFiles = isEditing ||
      ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(activity.status)

    return (
      <ActivityFilesStep
        activityId={activity.id}
        files={files}
        pendingFiles={pendingFiles}
        fileTypes={fileTypes}
        onFilesChange={setFiles}
        onPendingFilesChange={setPendingFiles}
        loading={filesLoading}
        disabled={!canUploadFiles}
      />
    )
  }

  // Render participants tab
  const renderParticipantsTab = () => {
    if (!activity) return null

    // Check if activity is editable (ONLY draft status - pending_approval cannot be edited)
    const canEditParticipants = activity.status === 'DRAFT'
    // Check if can send invitations (approved/in_progress/completed status)
    const canSendInvitations = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(activity.status)

    // Invitation status configuration
    const invitationStatusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pending: { color: 'default', text: 'Chờ phản hồi', icon: <ClockCircleOutlined /> },
      accepted: { color: 'success', text: 'Đã chấp nhận', icon: <CheckCircleOutlined /> },
      declined: { color: 'error', text: 'Đã từ chối', icon: <CloseOutlined /> },
    }

    const uploadProps: UploadProps = {
      name: 'file',
      accept: '.xlsx,.xls',
      showUploadList: false,
      beforeUpload: handleUploadAttendance,
    }

    // Row selection for resend invitation
    const rowSelection = canSendInvitations ? {
      selectedRowKeys: selectedParticipantIds,
      onChange: (selectedRowKeys: React.Key[]) => {
        setSelectedParticipantIds(selectedRowKeys as string[])
      },
      getCheckboxProps: (record: ActivityParticipant) => ({
        disabled: !record.user_id, // Can't resend to external users
      }),
    } : undefined

    const participantColumns = [
      {
        title: 'STT',
        key: 'index',
        width: 50,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Email',
        key: 'email',
        render: (_: any, record: ActivityParticipant) => (
          <Space>
            <MailOutlined />
            {record.user ? (
              <Text>{record.user.email}</Text>
            ) : (
              <Space>
                <Text>{record.external_email}</Text>
                <Tooltip title="Email này không tồn tại trong hệ thống">
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                    Không có TK
                  </Tag>
                </Tooltip>
              </Space>
            )}
          </Space>
        ),
      },
      {
        title: 'Họ tên',
        key: 'name',
        render: (_: any, record: ActivityParticipant) => {
          if (record.user) {
            return (
              <Space>
                <UserOutlined />
                {`${record.user.last_name} ${record.user.first_name}`}
              </Space>
            )
          }
          return record.external_name || '-'
        },
      },
      {
        title: 'Đã gửi lời mời',
        key: 'invited',
        width: 130,
        render: (_: any, record: ActivityParticipant) => {
          if (!record.user_id) {
            return <Tag color="red">Không thể gửi</Tag>
          }
          if (record.invited_at) {
            return (
              <Tooltip title={`Gửi lúc: ${dayjs(record.invited_at).format('DD/MM/YYYY HH:mm')}`}>
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Đã gửi
                </Tag>
              </Tooltip>
            )
          }
          return <Tag color="default">Chưa gửi</Tag>
        },
      },
      {
        title: 'Phản hồi',
        key: 'response',
        width: 130,
        render: (_: any, record: ActivityParticipant) => {
          if (!record.user_id) {
            return '-'
          }
          if (!record.invited_at) {
            return '-'
          }
          const status = invitationStatusConfig[record.invitation_status] || invitationStatusConfig.pending
          return (
            <Tooltip title={record.responded_at ? `Phản hồi lúc: ${dayjs(record.responded_at).format('DD/MM/YYYY HH:mm')}` : undefined}>
              <Tag color={status.color} icon={status.icon}>
                {status.text}
              </Tag>
            </Tooltip>
          )
        },
      },
    ]

    if (participantsLoading || uploadingAttendance) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip={uploadingAttendance ? 'Đang xử lý danh sách...' : 'Đang tải danh sách người tham dự...'} />
        </div>
      )
    }

    return (
      <div style={{ padding: '8px 0' }}>
        {/* Summary cards */}
        {participantsSummary && participantsSummary.total > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Tổng số</Text>
                <Title level={4} style={{ margin: 0 }}>{participantsSummary.total}</Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Có tài khoản</Text>
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>{participantsSummary.internal}</Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Không có TK</Text>
                <Title level={4} style={{ margin: 0, color: '#faad14' }}>{participantsSummary.external}</Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã mời</Text>
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>{participantsSummary.invited}</Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã chấp nhận</Text>
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>{participantsSummary.accepted}</Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã từ chối</Text>
                <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>{participantsSummary.declined}</Title>
              </Card>
            </Col>
          </Row>
        )}

        {/* External emails warning */}
        {participantsSummary && participantsSummary.external > 0 && (
          <Alert
            type="warning"
            message={`Có ${participantsSummary.external} email không tồn tại trong hệ thống`}
            description="Những email này sẽ không nhận được thông báo mời tham dự. Vui lòng liên hệ trực tiếp với họ."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Action buttons bar */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              {/* Add participants button */}
              {canEditParticipants && (
                <Button
                  icon={showAddParticipants ? <CloseOutlined /> : <PlusOutlined />}
                  onClick={handleToggleAddParticipants}
                >
                  {showAddParticipants ? 'Đóng' : 'Thêm người tham dự'}
                </Button>
              )}
              {/* Upload Excel button */}
              {canEditParticipants && (
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} loading={uploadingAttendance}>
                    Tải lên Excel
                  </Button>
                </Upload>
              )}
              {/* Download template */}
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                loading={downloadingTemplate}
                size="small"
              >
                Tải mẫu
              </Button>
              {/* Export participants list */}
              {participants.length > 0 && (
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={handleExportParticipants}
                  loading={exportingParticipants}
                  size="small"
                  type="primary"
                  ghost
                >
                  Xuất danh sách
                </Button>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {/* Resend invitation button - for selected participants */}
              {canSendInvitations && selectedParticipantIds.length > 0 && (
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleResendInvitation}
                  loading={resendingInvitation}
                >
                  Gửi lại lời mời ({selectedParticipantIds.length})
                </Button>
              )}
              {/* Send all invitations button */}
              {canSendInvitations && participantsSummary && participantsSummary.not_invited > 0 && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendInvitations}
                  loading={sendingInvitations}
                >
                  Gửi lời mời ({participantsSummary.not_invited} người)
                </Button>
              )}
              {/* Delete attendance list */}
              {canEditParticipants && attendanceFile && (
                <Popconfirm
                  title="Xóa danh sách tham dự?"
                  description="Tất cả người tham dự sẽ bị xóa khỏi hoạt động này."
                  onConfirm={handleDeleteAttendance}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Xóa danh sách
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>

        {/* Add participants panel - Collapsible */}
        {showAddParticipants && canEditParticipants && (
          <Card
            title={<Space><TeamOutlined /><span>Thêm người tham dự từ tổ chức</span></Space>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            {loadingGroups ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin tip="Đang tải danh sách nhóm..." />
              </div>
            ) : organizationsList.length > 0 ? (
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    Chọn tổ chức:
                  </Text>
                  <Select
                    placeholder="Chọn tổ chức để thêm người tham dự"
                    value={selectedOrganizationId}
                    onChange={handleOrganizationChange}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {organizationsList.map((org) => (
                      <Option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={12}>
                  {organizationGroups.length > 0 ? (
                    <>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        Chọn nhóm người dùng:
                      </Text>
                      <Checkbox.Group
                        value={selectedGroups}
                        onChange={(values) => setSelectedGroups(values as string[])}
                      >
                        <Space>
                          {organizationGroups.map((group) => (
                            <Checkbox
                              key={group.key}
                              value={group.key}
                              disabled={group.disabled}
                            >
                              {group.label} <Tag color={group.disabled ? 'default' : 'blue'}>{group.count}</Tag>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    </>
                  ) : selectedOrganizationId ? (
                    <Text type="secondary">Tổ chức này không có thành viên mới để thêm</Text>
                  ) : (
                    <Text type="secondary">Vui lòng chọn tổ chức để xem danh sách nhóm</Text>
                  )}
                </Col>
                <Col span={4}>
                  <div style={{ paddingTop: 20 }}>
                    <Button
                      type="primary"
                      icon={<TeamOutlined />}
                      onClick={handleAddFromGroups}
                      loading={addingFromGroup}
                      disabled={selectedGroups.length === 0}
                      block
                    >
                      Thêm
                    </Button>
                  </div>
                </Col>
              </Row>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có tổ chức nào trong hệ thống"
              />
            )}
          </Card>
        )}

        {/* Attendance file info */}
        {attendanceFile && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <FileExcelOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  <div>
                    <Text strong>{attendanceFile.file_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tải lên: {attendanceFile.uploaded_at ? dayjs(attendanceFile.uploaded_at).format('DD/MM/YYYY HH:mm') : '-'}
                    </Text>
                  </div>
                </Space>
              </Col>
              {canEditParticipants && (
                <Col>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />} size="small" loading={uploadingAttendance}>
                      Thay thế
                    </Button>
                  </Upload>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {/* Participants table */}
        {participants.length > 0 ? (
          <Table
            columns={participantColumns}
            dataSource={participants}
            rowKey="id"
            size="small"
            rowSelection={rowSelection}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} người` }}
            locale={{ emptyText: 'Chưa có người tham dự' }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có danh sách người tham dự"
          >
            {canEditParticipants && (
              <Space direction="vertical">
                <Text type="secondary">Bạn có thể thêm người tham dự bằng cách:</Text>
                <Space>
                  <Button icon={<PlusOutlined />} onClick={handleToggleAddParticipants}>
                    Thêm từ tổ chức
                  </Button>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>
                      Tải lên từ Excel
                    </Button>
                  </Upload>
                </Space>
              </Space>
            )}
          </Empty>
        )}

        {/* Note about invitations */}
        {canSendInvitations && participants.length > 0 && (
          <Alert
            type="info"
            message="Gửi lời mời tham dự"
            description="Chọn người tham dự trong bảng và nhấn 'Gửi lại lời mời' để nhắc nhở họ về hoạt động. Lời mời sẽ được gửi dưới dạng thông báo trong hệ thống."
            style={{ marginTop: 16 }}
            showIcon
          />
        )}
      </div>
    )
  }

  // Render footer buttons
  const renderFooter = () => {
    if (!activity) return null

    const buttons = [
      <Button key="close" onClick={handleClose}>
        Đóng
      </Button>,
    ]

    if (isEditing) {
      buttons.push(
        <Button key="cancel-edit" onClick={() => setIsEditing(false)}>
          Hủy chỉnh sửa
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
        >
          Lưu thay đổi
        </Button>
      )
    } else if (activity.status === 'DRAFT') {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={handleSubmitForApproval}
        >
          Gửi yêu cầu phê duyệt
        </Button>
      )
    }

    return buttons
  }

  // Get modal title
  const getModalTitle = () => {
    if (!activity) return 'Chi tiết hoạt động'

    const status = statusConfig[activity.status] || statusConfig.draft

    return (
      <Space>
        {isEditing ? <EditOutlined /> : <EyeOutlined />}
        <span>{isEditing ? 'Chỉnh sửa hoạt động' : 'Chi tiết hoạt động'}</span>
        <Tag color={status.color}>{status.text}</Tag>
      </Space>
    )
  }

  if (!activity) return null

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={handleClose}
      width={1200}
      footer={renderFooter()}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 24px' } }}
      maskClosable={false}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'info',
            label: (
              <span>
                <FlagOutlined />
                Thông tin
              </span>
            ),
            children: isEditing ? renderInfoEdit() : renderInfoView(),
          },
          {
            key: 'files',
            label: (
              <Badge count={files.length + pendingFiles.length} size="small" offset={[8, 0]}>
                <span>
                  <FileOutlined />
                  Tài liệu
                </span>
              </Badge>
            ),
            children: renderFilesTab(),
          },
          {
            key: 'participants',
            label: (
              <Badge count={participantsSummary?.total || 0} size="small" offset={[8, 0]}>
                <span>
                  <TeamOutlined />
                  Người tham dự
                </span>
              </Badge>
            ),
            children: renderParticipantsTab(),
          },
        ]}
      />

      {/* Cancel Activity Modal */}
      <Modal
        title={<Space><StopOutlined style={{ color: '#ff4d4f' }} /> Hủy hoạt động</Space>}
        open={showCancelModal}
        onCancel={() => {
          setShowCancelModal(false)
          setCancelReason('')
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowCancelModal(false)
            setCancelReason('')
          }}>
            Đóng
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            icon={<StopOutlined />}
            loading={cancelling}
            onClick={handleCancel}
            disabled={!cancelReason.trim()}
          >
            Xác nhận hủy
          </Button>,
        ]}
        width={500}
      >
        <Alert
          type="warning"
          message="Lưu ý"
          description="Sau khi hủy, hoạt động sẽ không thể khôi phục. Người tham dự sẽ nhận được thông báo về việc hủy hoạt động."
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form layout="vertical">
          <Form.Item
            label="Lý do hủy"
            required
            help="Vui lòng nhập lý do hủy hoạt động"
          >
            <TextArea
              rows={3}
              placeholder="Nhập lý do hủy hoạt động..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Activity Completion Modal */}
      <ActivityCompletionModal
        visible={showCompletionModal}
        activity={activity}
        onClose={() => setShowCompletionModal(false)}
        onSuccess={(updatedActivity) => {
          onSuccess(updatedActivity)
        }}
      />
    </Modal>
  )
}

export default ActivityDetailModal
