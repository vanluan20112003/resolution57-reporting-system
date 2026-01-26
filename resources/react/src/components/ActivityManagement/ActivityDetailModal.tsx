import { useState, useEffect } from "react"
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
  List,
  Progress
} from "antd"
import type { UploadProps } from "antd"
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
  ShareAltOutlined,
  HistoryOutlined,
  ContainerOutlined,
  FolderOpenOutlined,
  UnorderedListOutlined,
  UserOutlined as UserIcon,
  DownloadOutlined as DownloadIcon,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined as FileExcelIcon,
  ExpandOutlined
} from "@ant-design/icons"
import dayjs from "dayjs"
import * as activityApi from "../../services/activityApi"
import * as reportBatchApi from "../../services/reportBatchApi"
import type {
  ReportBatch as FullReportBatch,
  BatchFile
} from "../../services/reportBatchApi"
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
  ActivityReportBatch
} from "../../services/activityApi"
import { useAuth } from "../../shared/hooks/useAuth"
import ActivityFilesStep, { PendingFile } from "./ActivityFilesStep"
import ActivityCompletionModal from "./ActivityCompletionModal"
import ShareLinksManager from "./ShareLinksManager"
import ActivityLogTimeline from "./ActivityLogTimeline"
import { needsCompletionAction } from "../../services/activityApi"
import "./ActivityDetailModal.css"

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// Status configuration
// Workflow: DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED
// IN_PROGRESS and COMPLETED are computed dynamically from APPROVED based on dates
// POSTPONED: Temporarily postponed - allows editing dates, auto-returns to APPROVED after saving
const statusConfig: Record<
  string,
  { color: string; text: string; icon: React.ReactNode }
> = {
  draft: { color: "default", text: "Nháp", icon: <EditOutlined /> },
  pending_approval: {
    color: "processing",
    text: "Chờ phê duyệt",
    icon: <ClockCircleOutlined />
  },
  approved: {
    color: "success",
    text: "Đã phê duyệt",
    icon: <CheckCircleOutlined />
  },
  rejected: { color: "error", text: "Từ chối", icon: <CloseOutlined /> },
  in_progress: {
    color: "blue",
    text: "Đang thực hiện",
    icon: <ClockCircleOutlined />
  },
  completed: {
    color: "success",
    text: "Hoàn thành",
    icon: <CheckCircleOutlined />
  },
  postponed: {
    color: "warning",
    text: "Tạm hoãn",
    icon: <ExclamationCircleOutlined />
  },
  cancelled: { color: "error", text: "Đã hủy", icon: <CloseOutlined /> }
}

interface ActivityDetailModalProps {
  visible: boolean
  activity: Activity | null
  formData: ActivityFormData | null
  mode: "view" | "edit"
  onClose: () => void
  onSuccess: (activity: Activity) => void
  /** Chế độ chỉ xem - ẩn các chức năng cập nhật tiến độ, tải tài liệu, quản lý người tham dự */
  readOnly?: boolean
}

function ActivityDetailModal({
  visible,
  activity,
  formData,
  mode,
  onClose,
  onSuccess,
  readOnly = false
}: ActivityDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [isEditing, setIsEditing] = useState(mode === "edit")
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
  const [attendanceFile, setAttendanceFile] = useState<AttendanceFile | null>(
    null
  )
  const [participantsSummary, setParticipantsSummary] =
    useState<ParticipantsSummary | null>(null)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [exportingParticipants, setExportingParticipants] = useState(false)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([])
  const [resendingInvitation, setResendingInvitation] = useState(false)
  const [sendingInvitations, setSendingInvitations] = useState(false)

  // Postpone/Cancel state
  const [postponing, setPostponing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // Share links modal state
  const [showShareLinksModal, setShowShareLinksModal] = useState(false)

  // Organization groups state (for adding participants)
  const [organizationGroups, setOrganizationGroups] = useState<
    OrganizationUserGroup[]
  >([])
  const [organizationsList, setOrganizationsList] = useState<
    OrganizationOption[]
  >([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | undefined
  >(undefined)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [addingFromGroup, setAddingFromGroup] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showAddParticipants, setShowAddParticipants] = useState(false)

  // Report batches state
  const [reportBatches, setReportBatches] = useState<ActivityReportBatch[]>([])
  const [reportBatchesLoading, setReportBatchesLoading] = useState(false)
  const [selectedBatchDetail, setSelectedBatchDetail] =
    useState<ActivityReportBatch | null>(null)
  const [showBatchDetailModal, setShowBatchDetailModal] = useState(false)
  // Full batch detail state (loaded from reportBatchApi)
  const [fullBatchDetail, setFullBatchDetail] =
    useState<FullReportBatch | null>(null)
  const [fullBatchDetailLoading, setFullBatchDetailLoading] = useState(false)
  const [ownerFilesForBatch, setOwnerFilesForBatch] = useState<BatchFile[]>([])

  // Response detail modal state
  const [responseDetailVisible, setResponseDetailVisible] = useState(false)
  const [selectedResponsesForDetail, setSelectedResponsesForDetail] = useState<
    any[]
  >([])
  const [selectedResponseActivityTitle, setSelectedResponseActivityTitle] =
    useState<string>("")

  // Mobile KPI type selector state
  const [mobileKpiType, setMobileKpiType] = useState<"central" | "vnu">(
    "central"
  )

  // Get current user info
  const { user } = useAuth()

  // Watch dates for duration calculation
  const watchStartDate = Form.useWatch("start_date", form)
  const watchEndDate = Form.useWatch("end_date", form)

  // Reset state when modal opens/closes or activity changes
  useEffect(() => {
    if (visible && activity) {
      setActiveTab("info")
      // Only allow editing if mode is 'edit' AND status is 'draft' or 'postponed'
      // pending_approval and other statuses cannot be edited
      // postponed status can only edit dates
      // In readOnly mode, always set isEditing to false
      setIsEditing(
        !readOnly &&
          mode === "edit" &&
          (activity.status === "DRAFT" || activity.status === "POSTPONED")
      )
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
      // Reset report batches state
      setReportBatches([])
      setSelectedBatchDetail(null)
      setShowBatchDetailModal(false)

      // Set form values
      const kpiIds = activity.kpis?.map((k) => k.id) || []
      setSelectedKpiIds(kpiIds)
      const collabOrgIds =
        activity.collaborating_organizations?.map((org) => org.id) || []
      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        focus_content: activity.focus_content,
        activity_type_id: activity.activity_type_id,
        activity_field_id: activity.activity_field_id,
        leader_names: activity.leader_names || [],
        collaborating_organization_ids: collabOrgIds,
        start_date: activity.start_date
          ? dayjs(activity.start_date)
          : undefined,
        end_date: activity.end_date ? dayjs(activity.end_date) : undefined,
        budget: activity.budget,
        budget_source: activity.budget_source,
        location: activity.location,
        external_url: activity.external_url,
        completion_percentage: activity.completion_percentage,
        result_summary: activity.result_summary
      })

      // Fetch files
      fetchActivityFiles(activity.id)
      // Fetch participants
      fetchParticipants(activity.id)
      // Fetch report batches if user can view
      if (canViewReportBatches()) {
        fetchReportBatches(activity.id)
      }
    }
  }, [visible, activity, mode, user])

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
      console.error("Failed to fetch files:", error)
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
      console.error("Failed to fetch participants:", error)
    } finally {
      setParticipantsLoading(false)
    }
  }

  // Fetch report batches for activity
  const fetchReportBatches = async (activityId: string) => {
    setReportBatchesLoading(true)
    try {
      const response = await activityApi.getActivityReportBatches(activityId)
      setReportBatches(response.data)
    } catch (error: any) {
      console.error("Failed to fetch report batches:", error)
      // Silently fail - user might not have permission
    } finally {
      setReportBatchesLoading(false)
    }
  }

  // Check if current user can view report batches
  const canViewReportBatches = (): boolean => {
    if (!activity || !user) return false
    // ADMIN and OPERATOR can always view
    if (user.role === "ADMIN" || user.role === "OPERATOR") return true
    // Lead organization STAFF/MANAGER can view
    if (
      activity.lead_organization_id === user.organization_id &&
      (user.role === "STAFF" || user.role === "MANAGER")
    ) {
      return true
    }
    return false
  }

  // Fetch full batch detail when opening batch detail modal
  const fetchFullBatchDetail = async (batchId: string) => {
    setFullBatchDetailLoading(true)
    try {
      const response = await reportBatchApi.getReportBatch(batchId)
      setFullBatchDetail(response.data)
      // Fetch files
      const filesResponse = await reportBatchApi.getBatchFiles(batchId)
      setOwnerFilesForBatch(filesResponse.data.owner_files || [])
    } catch (error: any) {
      console.error("Failed to fetch batch detail:", error)
      message.error("Không thể tải chi tiết đợt báo cáo")
    } finally {
      setFullBatchDetailLoading(false)
    }
  }

  // Handle view batch detail
  const handleViewBatchDetail = (batch: ActivityReportBatch) => {
    setSelectedBatchDetail(batch)
    setShowBatchDetailModal(true)
    fetchFullBatchDetail(batch.id)
  }

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType?.includes("pdf"))
      return <FilePdfOutlined style={{ color: "#ff4d4f" }} />
    if (fileType?.includes("word") || fileType?.includes("doc"))
      return <FileWordOutlined style={{ color: "#1890ff" }} />
    if (
      fileType?.includes("excel") ||
      fileType?.includes("sheet") ||
      fileType?.includes("xls")
    )
      return <FileExcelIcon style={{ color: "#52c41a" }} />
    return <FileOutlined />
  }

  // Handle download file
  const handleDownloadBatchFile = async (file: BatchFile) => {
    try {
      if (!fullBatchDetail) return
      await reportBatchApi.downloadBatchFile(fullBatchDetail.id, file.id)
    } catch (error: any) {
      message.error(error.message || "Không thể tải file")
    }
  }

  // Upload attendance list
  const handleUploadAttendance = async (file: File) => {
    if (!activity) return false

    const isExcel =
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls")

    if (!isExcel) {
      message.error("Chỉ chấp nhận file Excel (.xlsx, .xls)")
      return false
    }

    setUploadingAttendance(true)
    try {
      const response = await activityApi.uploadAttendanceList(activity.id, file)
      message.success(response.message)
      setAttendanceFile(response.data.file)
      await fetchParticipants(activity.id)
    } catch (error: any) {
      message.error(error.message || "Không thể upload danh sách tham dự")
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
      message.success("Đã xóa danh sách tham dự")
      setAttendanceFile(null)
      setParticipants([])
      setParticipantsSummary(null)
    } catch (error: any) {
      message.error(error.message || "Không thể xóa danh sách tham dự")
    } finally {
      setParticipantsLoading(false)
    }
  }

  // Download attendance template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      await activityApi.downloadAttendanceTemplate()
      message.success("Đã tải xuống mẫu danh sách tham dự")
    } catch (error: any) {
      message.error(error.message || "Không thể tải xuống mẫu")
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
      message.success("Đã xuất danh sách tham dự")
    } catch (error: any) {
      message.error(error.message || "Không thể xuất danh sách")
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
      message.error(error.message || "Không thể gửi lời mời")
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
      message.success(
        "Hoạt động đã được tạm hoãn. Bạn có thể chỉnh sửa thời gian."
      )
      window.dispatchEvent(new CustomEvent("activity-status-changed"))
      onSuccess(response.data)
      // Enable editing mode for dates
      setIsEditing(true)
    } catch (error: any) {
      message.error(error.message || "Không thể tạm hoãn hoạt động")
    } finally {
      setPostponing(false)
    }
  }

  // Cancel activity
  const handleCancel = async () => {
    if (!activity || !cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy")
      return
    }

    setCancelling(true)
    try {
      const response = await activityApi.cancelActivity(activity.id, {
        reason: cancelReason
      })
      message.success("Hoạt động đã bị hủy")
      window.dispatchEvent(new CustomEvent("activity-status-changed"))
      onSuccess(response.data)
      setShowCancelModal(false)
      setCancelReason("")
      handleClose()
    } catch (error: any) {
      message.error(error.message || "Không thể hủy hoạt động")
    } finally {
      setCancelling(false)
    }
  }

  // Resend invitation to selected participants
  const handleResendInvitation = async () => {
    if (!activity || selectedParticipantIds.length === 0) {
      message.warning("Vui lòng chọn người tham dự để gửi lại lời mời")
      return
    }

    setResendingInvitation(true)
    try {
      const response = await activityApi.resendInvitation(
        activity.id,
        selectedParticipantIds
      )
      message.success(response.message)
      setSelectedParticipantIds([])
      await fetchParticipants(activity.id)
    } catch (error: any) {
      message.error(error.message || "Không thể gửi lại lời mời")
    } finally {
      setResendingInvitation(false)
    }
  }

  // Fetch organization user groups
  const fetchOrganizationGroups = async (
    activityId: string,
    organizationId?: string
  ) => {
    setLoadingGroups(true)
    try {
      const response = await activityApi.getOrganizationUserGroups(
        activityId,
        organizationId
      )
      setOrganizationGroups(response.data.groups)
      setOrganizationsList(response.data.organizations)
      if (response.data.organization && !selectedOrganizationId) {
        setSelectedOrganizationId(response.data.organization.id)
      }
    } catch (error: any) {
      console.error("Failed to fetch organization groups:", error)
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
      message.warning("Vui lòng chọn ít nhất một nhóm")
      return
    }

    if (!selectedOrganizationId) {
      message.warning("Vui lòng chọn tổ chức")
      return
    }

    setAddingFromGroup(true)
    try {
      const response = await activityApi.addParticipantsFromGroup(
        activity.id,
        selectedOrganizationId,
        selectedGroups
      )
      message.success(response.message)
      setSelectedGroups([])
      await Promise.all([
        fetchParticipants(activity.id),
        fetchOrganizationGroups(activity.id, selectedOrganizationId)
      ])
    } catch (error: any) {
      message.error(error.message || "Không thể thêm người tham dự")
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

    const diffDays = end.diff(start, "day")
    const diffHours = end.diff(start, "hour") % 24

    if (diffDays < 0)
      return <Text type="danger">Ngày kết thúc phải sau ngày bắt đầu</Text>

    let durationText = ""
    if (diffDays > 0) durationText += `${diffDays} ngày `
    if (diffHours > 0) durationText += `${diffHours} giờ`
    if (!durationText) durationText = "Cùng thời điểm"

    return <Text type="success">Thời lượng: {durationText}</Text>
  }

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return "-"
    return dayjs(date).format("DD/MM/YYYY HH:mm")
  }

  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value) return "-"
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value)
  }

  // Save changes
  const handleSave = async () => {
    if (!activity) return

    try {
      const values = await form.validateFields()
      setLoading(true)

      const start_date = values.start_date
        ? values.start_date.format("YYYY-MM-DD HH:mm:ss")
        : undefined
      const end_date = values.end_date
        ? values.end_date.format("YYYY-MM-DD HH:mm:ss")
        : undefined

      // If activity is POSTPONED, only send start_date and end_date
      let requestData: UpdateActivityRequest
      if (activity.status === "POSTPONED") {
        requestData = {
          start_date,
          end_date
        }
      } else {
        requestData = {
          title: values.title,
          description: values.description,
          focus_content: values.focus_content,
          activity_type_id: values.activity_type_id,
          activity_field_id: values.activity_field_id,
          leader_names: values.leader_names || [],
          collaborating_organization_ids:
            values.collaborating_organization_ids || [],
          start_date,
          end_date,
          budget: values.budget,
          budget_source: values.budget_source,
          location: values.location,
          external_url: values.external_url,
          completion_percentage: values.completion_percentage,
          result_summary: values.result_summary,
          kpi_ids: selectedKpiIds
        }
      }

      const response = await activityApi.updateActivity(
        activity.id,
        requestData
      )
      message.success(
        activity.status === "POSTPONED"
          ? "Đã cập nhật thời gian. Hoạt động đã chuyển về trạng thái Đã phê duyệt."
          : "Đã cập nhật hoạt động"
      )
      setIsEditing(false)
      onSuccess(response.data)
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || "Có lỗi xảy ra")
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
      message.success("Đã gửi yêu cầu phê duyệt thành công")
      window.dispatchEvent(new CustomEvent("activity-status-changed"))
      onSuccess({ ...activity, status: "pending_approval" })
      handleClose()
    } catch (error: any) {
      message.error(error.message || "Không thể gửi yêu cầu phê duyệt")
    } finally {
      setLoading(false)
    }
  }

  // Close modal
  const handleClose = () => {
    setActiveTab("info")
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
    setCancelReason("")
    form.resetFields()
    onClose()
  }

  // Get activity type name
  const getActivityTypeName = (typeId?: string) => {
    if (!typeId) return "-"
    const type = formData?.activity_types.find((t) => t.id === typeId)
    return type?.name || "-"
  }

  // Get activity field name
  const getActivityFieldName = (fieldId?: string) => {
    if (!fieldId) return "-"
    const field = formData?.activity_fields.find((f) => f.id === fieldId)
    return field?.name || "-"
  }

  // Render view mode for info tab
  const renderInfoView = () => {
    if (!activity) return null

    const status = statusConfig[activity.status] || statusConfig.draft

    return (
      <div style={{ padding: "8px 0" }}>
        {/* Status and Code */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
          <Space>
            <Tag color={status.color} icon={status.icon}>
              {status.text}
            </Tag>
            <Text code>{activity.code}</Text>
          </Space>
          {!readOnly && (
            <Space>
              {/* Edit button for DRAFT */}
              {activity.status === "DRAFT" && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}>
                  Chỉnh sửa
                </Button>
              )}
              {/* Edit dates button for POSTPONED */}
              {activity.status === "POSTPONED" && (
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => setIsEditing(true)}>
                  Sửa thời gian
                </Button>
              )}
              {/* Completion action button for COMPLETED activities needing update */}
              {activity.status === "COMPLETED" &&
                needsCompletionAction(activity) && (
                  <Badge dot>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => setShowCompletionModal(true)}
                      style={{ background: "#52c41a", borderColor: "#52c41a" }}>
                      Cập nhật kết quả
                    </Button>
                  </Badge>
                )}
              {/* Update more button for COMPLETED activities that already have result */}
              {activity.status === "COMPLETED" &&
                !needsCompletionAction(activity) && (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => setShowCompletionModal(true)}
                    style={{ borderColor: "#52c41a", color: "#52c41a" }}>
                    Cập nhật thêm
                  </Button>
                )}
              {/* Update progress button for APPROVED, IN_PROGRESS */}
              {["APPROVED", "IN_PROGRESS"].includes(activity.status) && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setShowCompletionModal(true)}
                  style={{ background: "#1890ff", borderColor: "#1890ff" }}>
                  Cập nhật tiến độ
                </Button>
              )}
              {/* Postpone/Cancel buttons for APPROVED, IN_PROGRESS only (not COMPLETED, not locked) */}
              {["APPROVED", "IN_PROGRESS"].includes(activity.status) &&
                !activity.is_locked && (
                  <>
                    <Popconfirm
                      title="Tạm hoãn hoạt động?"
                      description="Bạn có thể chỉnh sửa thời gian sau khi tạm hoãn. Lời mời sẽ được gửi lại cho người tham dự sau khi lưu thời gian mới."
                      onConfirm={handlePostpone}
                      okText="Tạm hoãn"
                      cancelText="Hủy">
                      <Button
                        icon={<PauseCircleOutlined />}
                        loading={postponing}>
                        Tạm hoãn
                      </Button>
                    </Popconfirm>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={() => setShowCancelModal(true)}>
                      Hủy hoạt động
                    </Button>
                  </>
                )}
            </Space>
          )}
        </div>

        {/* Pending approval notice */}
        {activity.status === "PENDING_APPROVAL" && (
          <Alert
            type="info"
            message="Hoạt động đang chờ phê duyệt"
            description="Hoạt động này đang chờ Manager phê duyệt. Trong thời gian này, không thể chỉnh sửa nội dung hoạt động."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Postponed notice */}
        {activity.status === "POSTPONED" && (
          <Alert
            type="warning"
            message="Hoạt động đang tạm hoãn"
            description="Hoạt động này đang tạm hoãn. Bạn có thể chỉnh sửa thời gian bắt đầu và kết thúc. Sau khi lưu thay đổi, hoạt động sẽ tự động chuyển về trạng thái Đã phê duyệt và lời mời sẽ được gửi lại cho người tham dự."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Completed activity needs update notice */}
        {!readOnly &&
          activity.status === "COMPLETED" &&
          needsCompletionAction(activity) && (
            <Alert
              type="success"
              message={
                <Space>
                  <span>Hoạt động đã hoàn thành!</span>
                  <Badge dot>
                    <span style={{ color: "#ff4d4f", fontWeight: 500 }}>
                      Cần cập nhật
                    </span>
                  </Badge>
                </Space>
              }
              description="Hoạt động đã hoàn thành. Vui lòng cập nhật kết quả thực hiện, tải lên tài liệu (nếu có) và điểm danh người tham dự."
              style={{ marginBottom: 16 }}
              showIcon
              icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              action={
                <Button
                  size="small"
                  type="primary"
                  onClick={() => setShowCompletionModal(true)}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}>
                  Cập nhật ngay
                </Button>
              }
            />
          )}

        {/* Completed activity with result - show success without badge */}
        {activity.status === "COMPLETED" &&
          !needsCompletionAction(activity) && (
            <Alert
              type="success"
              message="Hoạt động đã hoàn thành"
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Kết quả thực hiện:</Text>
                  </div>
                  <div
                    style={{
                      background: "#f6ffed",
                      padding: "12px 16px",
                      borderRadius: 6,
                      border: "1px solid #b7eb8f",
                      whiteSpace: "pre-wrap"
                    }}>
                    {activity.result_summary}
                  </div>
                </div>
              }
              style={{ marginBottom: 16 }}
              showIcon
              icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
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
                {activity.organization.short_name &&
                  activity.organization.short_name !==
                    activity.organization.name && (
                    <Text type="secondary">
                      {" "}
                      ({activity.organization.short_name})
                    </Text>
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
          style={{ marginBottom: 16 }}>
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
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Đơn vị phối hợp" span={2}>
            {activity.collaborating_organizations &&
            activity.collaborating_organizations.length > 0 ? (
              <Space wrap size={[4, 4]}>
                {activity.collaborating_organizations.map((org) => (
                  <Tag key={org.id} icon={<BankOutlined />} color="cyan">
                    {org.short_name || org.name}
                  </Tag>
                ))}
              </Space>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian bắt đầu">
            {formatDate(activity.start_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian kết thúc">
            {formatDate(activity.end_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Địa điểm" span={2}>
            {activity.location || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Kinh phí">
            {formatCurrency(activity.budget)}
          </Descriptions.Item>
          <Descriptions.Item label="Nguồn kinh phí">
            {activity.budget_source || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tiến độ">
            {activity.completion_percentage != null
              ? `${activity.completion_percentage}%`
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tóm tắt kết quả" span={2}>
            {activity.result_summary || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Khó khăn, vướng mắc" span={2}>
            {activity.difficulties || "-"}
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

        {/* Focus Content */}
        {activity.focus_content && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Nội dung trọng tâm:</Text>
            <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
              {activity.focus_content}
            </Paragraph>
          </div>
        )}

        {/* Targets */}
        {(activity.qualitative_target || activity.quantitative_target) && (
          <div style={{ marginBottom: 16 }}>
            <Divider orientation="left" plain>
              <Text strong>Mục tiêu</Text>
            </Divider>
            {activity.qualitative_target && (
              <div style={{ marginBottom: 8 }}>
                <Text strong>Mục tiêu định tính:</Text>
                <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                  {activity.qualitative_target}
                </Paragraph>
              </div>
            )}
            {activity.quantitative_target && (
              <div>
                <Text strong>Mục tiêu định lượng:</Text>
                <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                  {activity.quantitative_target}
                </Paragraph>
              </div>
            )}
          </div>
        )}

        {/* External URL */}
        {activity.external_url && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Đường dẫn tham khảo: </Text>
            <a
              href={activity.external_url}
              target="_blank"
              rel="noopener noreferrer">
              <LinkOutlined /> {activity.external_url}
            </a>
          </div>
        )}

        {/* KPIs - Separated into tabs by source */}
        {activity.kpis && activity.kpis.length > 0 && (
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              <GlobalOutlined style={{ marginRight: 6 }} />
              Chỉ tiêu KPI liên quan ({activity.kpis.length})
            </Text>
            <Tabs
              size="small"
              items={[
                {
                  key: "central",
                  label: (
                    <span>
                      <GlobalOutlined style={{ marginRight: 4 }} />
                      Trung ương (
                      {
                        activity.kpis.filter((k) => k.source === "CENTRAL")
                          .length
                      }
                      )
                    </span>
                  ),
                  children: (
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {activity.kpis.filter((k) => k.source === "CENTRAL")
                        .length === 0 ? (
                        <Text type="secondary">Không có KPI Trung ương</Text>
                      ) : (
                        activity.kpis
                          .filter((k) => k.source === "CENTRAL")
                          .map((kpi) => (
                            <Tag
                              key={kpi.id}
                              color="purple"
                              style={{ marginBottom: 4, marginRight: 4 }}>
                              {kpi.code && (
                                <Text
                                  code
                                  style={{ marginRight: 4, fontSize: 11 }}>
                                  {kpi.code}
                                </Text>
                              )}
                              {kpi.title}
                            </Tag>
                          ))
                      )}
                    </div>
                  )
                },
                {
                  key: "vnu",
                  label: (
                    <span>
                      <BankOutlined style={{ marginRight: 4 }} />
                      ĐHQG-HCM (
                      {activity.kpis.filter((k) => k.source === "VNU").length})
                    </span>
                  ),
                  children: (
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {activity.kpis.filter((k) => k.source === "VNU")
                        .length === 0 ? (
                        <Text type="secondary">Không có KPI ĐHQG-HCM</Text>
                      ) : (
                        activity.kpis
                          .filter((k) => k.source === "VNU")
                          .map((kpi) => (
                            <Tag
                              key={kpi.id}
                              color="blue"
                              style={{ marginBottom: 4, marginRight: 4 }}>
                              {kpi.code && (
                                <Text
                                  code
                                  style={{ marginRight: 4, fontSize: 11 }}>
                                  {kpi.code}
                                </Text>
                              )}
                              {kpi.title}
                            </Tag>
                          ))
                      )}
                    </div>
                  )
                }
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
    const isPostponed = activity.status === "POSTPONED"

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
                    <strong>Đơn vị chủ trì:</strong>{" "}
                    {activity.organization.name}
                    {activity.organization.short_name &&
                      activity.organization.short_name !==
                        activity.organization.name && (
                        <Text type="secondary">
                          {" "}
                          ({activity.organization.short_name})
                        </Text>
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
                color={statusConfig[activity.status]?.color || "default"}
                style={{ marginLeft: 8 }}>
                {statusConfig[activity.status]?.text || activity.status}
              </Tag>
            </div>

            {/* Title - disabled for postponed */}
            <Form.Item
              name="title"
              label="Tên hoạt động"
              rules={[
                { required: true, message: "Vui lòng nhập tên hoạt động" }
              ]}
              style={{ marginBottom: 12 }}>
              <Input
                placeholder="Nhập tên hoạt động"
                maxLength={500}
                disabled={isPostponed}
              />
            </Form.Item>

            {/* Type & Field - disabled for postponed */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="activity_type_id"
                  label={
                    <span>
                      <span style={{ color: "#ff4d4f" }}>*</span> Loại hoạt động
                    </span>
                  }
                  rules={[
                    { required: true, message: "Vui lòng chọn loại hoạt động" }
                  ]}
                  style={{ marginBottom: 12 }}>
                  <Select
                    placeholder="Chọn loại hoạt động"
                    showSearch
                    optionFilterProp="children"
                    disabled={isPostponed}>
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
                  style={{ marginBottom: 12 }}>
                  <Select
                    placeholder="Chọn lĩnh vực"
                    showSearch
                    optionFilterProp="children"
                    allowClear
                    disabled={isPostponed}>
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
              tooltip="Nhập tên người chủ trì, nhấn Enter để thêm nhiều người">
              <Select
                mode="tags"
                placeholder="Nhập tên người chủ trì và nhấn Enter"
                tokenSeparators={[","]}
                disabled={isPostponed}
                style={{ width: "100%" }}
              />
            </Form.Item>

            {/* Đơn vị phối hợp - disabled for postponed */}
            <Form.Item
              name="collaborating_organization_ids"
              label="Đơn vị phối hợp"
              style={{ marginBottom: 12 }}
              tooltip="Chọn các đơn vị khác phối hợp thực hiện hoạt động này">
              <Select
                mode="multiple"
                placeholder="Chọn đơn vị phối hợp (nếu có)"
                disabled={isPostponed}
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                maxTagCount={3}
                maxTagPlaceholder={(omittedValues) =>
                  `+${omittedValues.length} đơn vị khác`
                }
                style={{ width: "100%" }}>
                {formData?.organizations?.map((org) => (
                  <Option key={org.id} value={org.id}>
                    {org.short_name || org.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Start Date & End Date with Time - EDITABLE for postponed */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="start_date"
                  label="Thời điểm bắt đầu"
                  style={{ marginBottom: 8 }}>
                  <DatePicker
                    showTime={{ format: "HH:mm" }}
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: "100%" }}
                    placeholder="Chọn ngày giờ bắt đầu"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="end_date"
                  label="Thời điểm kết thúc"
                  style={{ marginBottom: 8 }}
                  dependencies={["start_date"]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const startDate = getFieldValue("start_date")
                        if (!value || !startDate) {
                          return Promise.resolve()
                        }
                        if (
                          dayjs(value).isAfter(dayjs(startDate)) ||
                          dayjs(value).isSame(dayjs(startDate))
                        ) {
                          return Promise.resolve()
                        }
                        return Promise.reject(
                          new Error(
                            "Thời điểm kết thúc phải sau hoặc bằng thời điểm bắt đầu"
                          )
                        )
                      }
                    })
                  ]}>
                  <DatePicker
                    showTime={{ format: "HH:mm" }}
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: "100%" }}
                    placeholder="Chọn ngày giờ kết thúc"
                  />
                </Form.Item>
              </Col>
            </Row>
            {/* Duration display */}
            {calculateDuration() && (
              <div style={{ marginBottom: 12, textAlign: "center" }}>
                <CalendarOutlined style={{ marginRight: 6 }} />
                {calculateDuration()}
              </div>
            )}

            {/* Location, Budget, Budget Source - disabled for postponed */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="location"
                  label="Địa điểm"
                  style={{ marginBottom: 12 }}>
                  <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Địa điểm thực hiện"
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="budget"
                  label="Kinh phí (VNĐ)"
                  style={{ marginBottom: 12 }}>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
                    placeholder="Kinh phí"
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="budget_source"
                  label="Nguồn kinh phí"
                  style={{ marginBottom: 12 }}>
                  <Input placeholder="Nguồn kinh phí" disabled={isPostponed} />
                </Form.Item>
              </Col>
            </Row>

            {/* Description - disabled for postponed */}
            <Form.Item
              name="description"
              label="Mô tả"
              style={{ marginBottom: 12 }}>
              <TextArea
                rows={2}
                placeholder="Mô tả chi tiết về hoạt động"
                disabled={isPostponed}
              />
            </Form.Item>

            {/* Focus Content - disabled for postponed */}
            <Form.Item
              name="focus_content"
              label="Nội dung trọng tâm"
              style={{ marginBottom: 12 }}>
              <TextArea
                rows={3}
                placeholder="Nhập nội dung trọng tâm của hoạt động"
                disabled={isPostponed}
              />
            </Form.Item>

            {/* External URL - disabled for postponed */}
            <Form.Item
              name="external_url"
              label="Đường dẫn tham khảo"
              style={{ marginBottom: 12 }}>
              <Input
                prefix={<LinkOutlined />}
                placeholder="https://..."
                disabled={isPostponed}
              />
            </Form.Item>

            {/* Progress - disabled for postponed */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="completion_percentage"
                  label="Tiến độ (%)"
                  style={{ marginBottom: 12 }}>
                  <InputNumber
                    min={0}
                    max={100}
                    style={{ width: "100%" }}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value!.replace("%", "") as any}
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  name="result_summary"
                  label="Tóm tắt kết quả"
                  style={{ marginBottom: 12 }}>
                  <Input
                    placeholder="Nhập tóm tắt kết quả thực hiện"
                    disabled={isPostponed}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Col>

          {/* Right Column - KPIs - Hidden for postponed */}
          {!isPostponed && (
            <Col span={8}>
              <div
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  padding: 12,
                  height: "100%",
                  minHeight: 400
                }}>
                <Text
                  strong
                  style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
                  <GlobalOutlined style={{ marginRight: 6 }} />
                  Chỉ tiêu KPI liên quan
                </Text>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                  Đã chọn: {selectedKpiIds.length} chỉ tiêu
                </Text>

                {/* Mobile: Dropdown selector */}
                <div className="kpi-mobile-selector">
                  <Select
                    value={mobileKpiType}
                    onChange={(value) => setMobileKpiType(value)}
                    style={{ width: "100%", marginBottom: 12 }}
                    size="small">
                    <Option value="central">
                      <GlobalOutlined style={{ marginRight: 6 }} />
                      KPI Trung ương ({formData?.kpis.central?.length || 0})
                    </Option>
                    <Option value="vnu">
                      <BankOutlined style={{ marginRight: 6 }} />
                      KPI ĐHQG-HCM ({formData?.kpis.vnu?.length || 0})
                    </Option>
                  </Select>
                  <div
                    style={{
                      maxHeight: 280,
                      overflowY: "auto",
                      paddingRight: 4
                    }}>
                    {mobileKpiType === "central" ? (
                      formData?.kpis.central?.length === 0 ? (
                        <Text type="secondary">Chưa có KPI Trung ương</Text>
                      ) : (
                        <Checkbox.Group
                          value={selectedKpiIds.filter((id) =>
                            formData?.kpis.central?.some((k) => k.id === id)
                          )}
                          onChange={(checkedValues) => {
                            const vnuIds = selectedKpiIds.filter((id) =>
                              formData?.kpis.vnu?.some((k) => k.id === id)
                            )
                            setSelectedKpiIds([
                              ...(checkedValues as string[]),
                              ...vnuIds
                            ])
                          }}
                          style={{ width: "100%" }}>
                          <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                            size={4}>
                            {formData?.kpis.central?.map((kpi) => (
                              <Checkbox
                                key={kpi.id}
                                value={kpi.id}
                                style={{ marginLeft: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column"
                                  }}>
                                  {kpi.code && (
                                    <Text code style={{ fontSize: 11 }}>
                                      {kpi.code}
                                    </Text>
                                  )}
                                  <Text style={{ fontSize: 12 }}>
                                    {kpi.title}
                                  </Text>
                                </div>
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      )
                    ) : formData?.kpis.vnu?.length === 0 ? (
                      <Text type="secondary">Chưa có KPI ĐHQG-HCM</Text>
                    ) : (
                      <Checkbox.Group
                        value={selectedKpiIds.filter((id) =>
                          formData?.kpis.vnu?.some((k) => k.id === id)
                        )}
                        onChange={(checkedValues) => {
                          const centralIds = selectedKpiIds.filter((id) =>
                            formData?.kpis.central?.some((k) => k.id === id)
                          )
                          setSelectedKpiIds([
                            ...centralIds,
                            ...(checkedValues as string[])
                          ])
                        }}
                        style={{ width: "100%" }}>
                        <Space
                          direction="vertical"
                          style={{ width: "100%" }}
                          size={4}>
                          {formData?.kpis.vnu?.map((kpi) => (
                            <Checkbox
                              key={kpi.id}
                              value={kpi.id}
                              style={{ marginLeft: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column"
                                }}>
                                {kpi.code && (
                                  <Text code style={{ fontSize: 11 }}>
                                    {kpi.code}
                                  </Text>
                                )}
                                <Text style={{ fontSize: 12 }}>
                                  {kpi.title}
                                </Text>
                              </div>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    )}
                  </div>
                </div>

                {/* Desktop: Tabs */}
                <div className="kpi-desktop-tabs">
                  <Tabs
                    size="small"
                    tabPosition="top"
                    items={[
                      {
                        key: "central",
                        label: (
                          <span style={{ fontSize: 12 }}>
                            <GlobalOutlined /> Trung ương (
                            {formData?.kpis.central?.length || 0})
                          </span>
                        ),
                        children: (
                          <div
                            style={{
                              maxHeight: 280,
                              overflowY: "auto",
                              paddingRight: 4
                            }}>
                            {formData?.kpis.central?.length === 0 ? (
                              <Text type="secondary">
                                Chưa có KPI Trung ương
                              </Text>
                            ) : (
                              <Checkbox.Group
                                value={selectedKpiIds.filter((id) =>
                                  formData?.kpis.central?.some(
                                    (k) => k.id === id
                                  )
                                )}
                                onChange={(checkedValues) => {
                                  const vnuIds = selectedKpiIds.filter((id) =>
                                    formData?.kpis.vnu?.some((k) => k.id === id)
                                  )
                                  setSelectedKpiIds([
                                    ...(checkedValues as string[]),
                                    ...vnuIds
                                  ])
                                }}
                                style={{ width: "100%" }}>
                                <Space
                                  direction="vertical"
                                  style={{ width: "100%" }}
                                  size={4}>
                                  {formData?.kpis.central?.map((kpi) => (
                                    <Checkbox
                                      key={kpi.id}
                                      value={kpi.id}
                                      style={{ marginLeft: 0 }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column"
                                        }}>
                                        {kpi.code && (
                                          <Text code style={{ fontSize: 11 }}>
                                            {kpi.code}
                                          </Text>
                                        )}
                                        <Text style={{ fontSize: 12 }}>
                                          {kpi.title}
                                        </Text>
                                      </div>
                                    </Checkbox>
                                  ))}
                                </Space>
                              </Checkbox.Group>
                            )}
                          </div>
                        )
                      },
                      {
                        key: "vnu",
                        label: (
                          <span style={{ fontSize: 12 }}>
                            <BankOutlined /> ĐHQG (
                            {formData?.kpis.vnu?.length || 0})
                          </span>
                        ),
                        children: (
                          <div
                            style={{
                              maxHeight: 280,
                              overflowY: "auto",
                              paddingRight: 4
                            }}>
                            {formData?.kpis.vnu?.length === 0 ? (
                              <Text type="secondary">Chưa có KPI ĐHQG-HCM</Text>
                            ) : (
                              <Checkbox.Group
                                value={selectedKpiIds.filter((id) =>
                                  formData?.kpis.vnu?.some((k) => k.id === id)
                                )}
                                onChange={(checkedValues) => {
                                  const centralIds = selectedKpiIds.filter(
                                    (id) =>
                                      formData?.kpis.central?.some(
                                        (k) => k.id === id
                                      )
                                  )
                                  setSelectedKpiIds([
                                    ...centralIds,
                                    ...(checkedValues as string[])
                                  ])
                                }}
                                style={{ width: "100%" }}>
                                <Space
                                  direction="vertical"
                                  style={{ width: "100%" }}
                                  size={4}>
                                  {formData?.kpis.vnu?.map((kpi) => (
                                    <Checkbox
                                      key={kpi.id}
                                      value={kpi.id}
                                      style={{ marginLeft: 0 }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column"
                                        }}>
                                        {kpi.code && (
                                          <Text code style={{ fontSize: 11 }}>
                                            {kpi.code}
                                          </Text>
                                        )}
                                        <Text style={{ fontSize: 12 }}>
                                          {kpi.title}
                                        </Text>
                                      </div>
                                    </Checkbox>
                                  ))}
                                </Space>
                              </Checkbox.Group>
                            )}
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
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
    // But not allowed in readOnly mode
    const canUploadFiles =
      !readOnly &&
      (isEditing ||
        ["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED"].includes(
          activity.status
        ))

    // Can share files if activity has files and is not in draft/rejected status
    // But not allowed in readOnly mode
    const canShareFiles =
      !readOnly &&
      files.length > 0 &&
      !["DRAFT", "REJECTED", "CANCELLED"].includes(activity.status)

    return (
      <div>
        {/* Share button */}
        {canShareFiles && (
          <div style={{ marginBottom: 16, textAlign: "right" }}>
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => setShowShareLinksModal(true)}>
              Chia sẻ tài liệu
            </Button>
          </div>
        )}

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
      </div>
    )
  }

  // Render participants tab
  const renderParticipantsTab = () => {
    if (!activity) return null

    // Check if activity is editable (ONLY draft status - pending_approval cannot be edited)
    // But not allowed in readOnly mode
    const canEditParticipants = !readOnly && activity.status === "DRAFT"
    // Check if can send invitations (approved/in_progress/completed status)
    // But not allowed in readOnly mode
    const canSendInvitations =
      !readOnly &&
      ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(activity.status)

    // Invitation status configuration
    const invitationStatusConfig: Record<
      string,
      { color: string; text: string; icon: React.ReactNode }
    > = {
      pending: {
        color: "default",
        text: "Chờ phản hồi",
        icon: <ClockCircleOutlined />
      },
      accepted: {
        color: "success",
        text: "Đã chấp nhận",
        icon: <CheckCircleOutlined />
      },
      declined: { color: "error", text: "Đã từ chối", icon: <CloseOutlined /> }
    }

    const uploadProps: UploadProps = {
      name: "file",
      accept: ".xlsx,.xls",
      showUploadList: false,
      beforeUpload: handleUploadAttendance
    }

    // Row selection for resend invitation
    const rowSelection = canSendInvitations
      ? {
          selectedRowKeys: selectedParticipantIds,
          onChange: (selectedRowKeys: React.Key[]) => {
            setSelectedParticipantIds(selectedRowKeys as string[])
          },
          getCheckboxProps: (record: ActivityParticipant) => ({
            disabled: !record.user_id // Can't resend to external users
          })
        }
      : undefined

    const participantColumns = [
      {
        title: "STT",
        key: "index",
        width: 50,
        render: (_: any, __: any, index: number) => index + 1
      },
      {
        title: "Email",
        key: "email",
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
        )
      },
      {
        title: "Họ tên",
        key: "name",
        render: (_: any, record: ActivityParticipant) => {
          if (record.user) {
            return (
              <Space>
                <UserOutlined />
                {`${record.user.last_name} ${record.user.first_name}`}
              </Space>
            )
          }
          return record.external_name || "-"
        }
      },
      {
        title: "Đã gửi lời mời",
        key: "invited",
        width: 130,
        render: (_: any, record: ActivityParticipant) => {
          if (!record.user_id) {
            return <Tag color="red">Không thể gửi</Tag>
          }
          if (record.invited_at) {
            return (
              <Tooltip
                title={`Gửi lúc: ${dayjs(record.invited_at).format("DD/MM/YYYY HH:mm")}`}>
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Đã gửi
                </Tag>
              </Tooltip>
            )
          }
          return <Tag color="default">Chưa gửi</Tag>
        }
      },
      {
        title: "Phản hồi",
        key: "response",
        width: 130,
        render: (_: any, record: ActivityParticipant) => {
          if (!record.user_id) {
            return "-"
          }
          if (!record.invited_at) {
            return "-"
          }
          const status =
            invitationStatusConfig[record.invitation_status] ||
            invitationStatusConfig.pending
          return (
            <Tooltip
              title={
                record.responded_at
                  ? `Phản hồi lúc: ${dayjs(record.responded_at).format("DD/MM/YYYY HH:mm")}`
                  : undefined
              }>
              <Tag color={status.color} icon={status.icon}>
                {status.text}
              </Tag>
            </Tooltip>
          )
        }
      }
    ]

    if (participantsLoading || uploadingAttendance) {
      return (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin
            size="large"
            tip={
              uploadingAttendance
                ? "Đang xử lý danh sách..."
                : "Đang tải danh sách người tham dự..."
            }
          />
        </div>
      )
    }

    return (
      <div style={{ padding: "8px 0" }}>
        {/* Summary cards */}
        {participantsSummary && participantsSummary.total > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Tổng số</Text>
                <Title level={4} style={{ margin: 0 }}>
                  {participantsSummary.total}
                </Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Có tài khoản</Text>
                <Title level={4} style={{ margin: 0, color: "#52c41a" }}>
                  {participantsSummary.internal}
                </Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Không có TK</Text>
                <Title level={4} style={{ margin: 0, color: "#faad14" }}>
                  {participantsSummary.external}
                </Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã mời</Text>
                <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
                  {participantsSummary.invited}
                </Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã chấp nhận</Text>
                <Title level={4} style={{ margin: 0, color: "#52c41a" }}>
                  {participantsSummary.accepted}
                </Title>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Text type="secondary">Đã từ chối</Text>
                <Title level={4} style={{ margin: 0, color: "#ff4d4f" }}>
                  {participantsSummary.declined}
                </Title>
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
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              {/* Add participants button */}
              {canEditParticipants && (
                <Button
                  icon={
                    showAddParticipants ? <CloseOutlined /> : <PlusOutlined />
                  }
                  onClick={handleToggleAddParticipants}>
                  {showAddParticipants ? "Đóng" : "Thêm người tham dự"}
                </Button>
              )}
              {/* Upload Excel button */}
              {canEditParticipants && (
                <Upload {...uploadProps}>
                  <Button
                    icon={<UploadOutlined />}
                    loading={uploadingAttendance}>
                    Tải lên Excel
                  </Button>
                </Upload>
              )}
              {/* Download template */}
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                loading={downloadingTemplate}
                size="small">
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
                  ghost>
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
                  loading={resendingInvitation}>
                  Gửi lại lời mời ({selectedParticipantIds.length})
                </Button>
              )}
              {/* Send all invitations button */}
              {canSendInvitations &&
                participantsSummary &&
                participantsSummary.not_invited > 0 && (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendInvitations}
                    loading={sendingInvitations}>
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
                  cancelText="Hủy">
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
            title={
              <Space>
                <TeamOutlined />
                <span>Thêm người tham dự từ tổ chức</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}>
            {loadingGroups ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <Spin tip="Đang tải danh sách nhóm..." />
              </div>
            ) : organizationsList.length > 0 ? (
              <Row gutter={16}>
                <Col span={8}>
                  <Text
                    type="secondary"
                    style={{ display: "block", marginBottom: 4 }}>
                    Chọn tổ chức:
                  </Text>
                  <Select
                    placeholder="Chọn tổ chức để thêm người tham dự"
                    value={selectedOrganizationId}
                    onChange={handleOrganizationChange}
                    style={{ width: "100%" }}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }>
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
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 4 }}>
                        Chọn nhóm người dùng:
                      </Text>
                      <Checkbox.Group
                        value={selectedGroups}
                        onChange={(values) =>
                          setSelectedGroups(values as string[])
                        }>
                        <Space>
                          {organizationGroups.map((group) => (
                            <Checkbox
                              key={group.key}
                              value={group.key}
                              disabled={group.disabled}>
                              {group.label}{" "}
                              <Tag color={group.disabled ? "default" : "blue"}>
                                {group.count}
                              </Tag>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    </>
                  ) : selectedOrganizationId ? (
                    <Text type="secondary">
                      Tổ chức này không có thành viên mới để thêm
                    </Text>
                  ) : (
                    <Text type="secondary">
                      Vui lòng chọn tổ chức để xem danh sách nhóm
                    </Text>
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
                      block>
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
                  <FileExcelOutlined
                    style={{ fontSize: 20, color: "#52c41a" }}
                  />
                  <div>
                    <Text strong>{attendanceFile.file_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tải lên:{" "}
                      {attendanceFile.uploaded_at
                        ? dayjs(attendanceFile.uploaded_at).format(
                            "DD/MM/YYYY HH:mm"
                          )
                        : "-"}
                    </Text>
                  </div>
                </Space>
              </Col>
              {canEditParticipants && (
                <Col>
                  <Upload {...uploadProps}>
                    <Button
                      icon={<UploadOutlined />}
                      size="small"
                      loading={uploadingAttendance}>
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
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} người`
            }}
            locale={{ emptyText: "Chưa có người tham dự" }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có danh sách người tham dự">
            {canEditParticipants && (
              <Space direction="vertical">
                <Text type="secondary">
                  Bạn có thể thêm người tham dự bằng cách:
                </Text>
                <Space>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={handleToggleAddParticipants}>
                    Thêm từ tổ chức
                  </Button>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>Tải lên từ Excel</Button>
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
      </Button>
    ]

    // In readOnly mode, only show Close button
    if (readOnly) {
      return buttons
    }

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
          onClick={handleSave}>
          Lưu thay đổi
        </Button>
      )
    } else if (activity.status === "DRAFT") {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={handleSubmitForApproval}>
          Gửi yêu cầu phê duyệt
        </Button>
      )
    }

    return buttons
  }

  // Get modal title
  const getModalTitle = () => {
    if (!activity) return "Chi tiết hoạt động"

    const status = statusConfig[activity.status] || statusConfig.draft

    return (
      <Space>
        {isEditing ? <EditOutlined /> : <EyeOutlined />}
        <span>{isEditing ? "Chỉnh sửa hoạt động" : "Chi tiết hoạt động"}</span>
        <Tag color={status.color}>{status.text}</Tag>
      </Space>
    )
  }

  // Render report batches tab
  const renderReportBatchesTab = () => {
    if (reportBatchesLoading) {
      return (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Đang tải lịch sử đợt báo cáo..." />
        </div>
      )
    }

    if (reportBatches.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hoạt động này chưa được thêm vào đợt báo cáo nào"
        />
      )
    }

    const getBatchStatusTag = (status: string) => {
      const config: Record<string, { color: string; label: string }> = {
        upcoming: { color: "default", label: "Sắp tới" },
        ongoing: { color: "processing", label: "Đang diễn ra" },
        completed: { color: "success", label: "Kết thúc" }
      }
      const { color, label } = config[status] || config.upcoming
      return <Tag color={color}>{label}</Tag>
    }

    return (
      <div>
        <Alert
          message="Lịch sử các đợt báo cáo có hoạt động này"
          description="Bạn có thể xem chi tiết từng đợt báo cáo bao gồm các phản hồi từ đơn vị phối hợp."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <List
          itemLayout="vertical"
          dataSource={reportBatches}
          renderItem={(batch) => (
            <List.Item
              key={batch.id}
              style={{
                background: "#fafafa",
                borderRadius: 8,
                marginBottom: 12,
                padding: "16px 20px"
              }}
              actions={[
                <Button
                  key="view"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewBatchDetail(batch)}>
                  Xem chi tiết
                </Button>
              ]}>
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{batch.name}</Text>
                    {getBatchStatusTag(batch.status)}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    {batch.organization && (
                      <Text type="secondary">
                        <BankOutlined style={{ marginRight: 4 }} />
                        Đơn vị yêu cầu:{" "}
                        {batch.organization.short_name ||
                          batch.organization.name}
                      </Text>
                    )}
                    {batch.start_date && batch.end_date && (
                      <Text type="secondary">
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        Thời gian:{" "}
                        {dayjs(batch.start_date).format("DD/MM/YYYY")} -{" "}
                        {dayjs(batch.end_date).format("DD/MM/YYYY")}
                      </Text>
                    )}
                    {batch.deadline && (
                      <Text type="secondary">
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        Hạn nộp:{" "}
                        {dayjs(batch.deadline).format("DD/MM/YYYY HH:mm")}
                      </Text>
                    )}
                  </Space>
                }
              />
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Tag
                    color={
                      batch.response_count >= batch.required_response_count
                        ? "success"
                        : "warning"
                    }>
                    Phản hồi: {batch.response_count}/
                    {batch.required_response_count}
                  </Tag>
                  {batch.response_count > 0 && (
                    <Progress
                      percent={Math.round(
                        (batch.response_count / batch.required_response_count) *
                          100
                      )}
                      size="small"
                      style={{ width: 100 }}
                      status={
                        batch.response_count >= batch.required_response_count
                          ? "success"
                          : "active"
                      }
                    />
                  )}
                </Space>
              </div>
            </List.Item>
          )}
        />
      </div>
    )
  }

  // Get batch status tag
  const getBatchStatusTagForModal = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      upcoming: { color: "default", label: "Sắp tới" },
      ongoing: { color: "processing", label: "Đang diễn ra" },
      completed: { color: "success", label: "Kết thúc" }
    }
    const { color, label } = config[status] || config.upcoming
    return <Tag color={color}>{label}</Tag>
  }

  // Render batch detail modal - Full version like ReportBatchTab
  const renderBatchDetailModal = () => {
    if (!selectedBatchDetail) return null

    const batchData = fullBatchDetail || selectedBatchDetail

    return (
      <Modal
        title={
          <Space>
            <ContainerOutlined style={{ color: "#1890ff" }} />
            <span>Chi tiết đợt báo cáo</span>
          </Space>
        }
        open={showBatchDetailModal}
        onCancel={() => {
          setShowBatchDetailModal(false)
          setSelectedBatchDetail(null)
          setFullBatchDetail(null)
          setOwnerFilesForBatch([])
        }}
        width={1200}
        centered
        styles={{ body: { padding: "16px 24px" } }}
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
            <Text type="secondary">
              {fullBatchDetail?.creator && (
                <>
                  Tạo bởi:{" "}
                  <Text strong>
                    {fullBatchDetail.creator.first_name}{" "}
                    {fullBatchDetail.creator.last_name}
                  </Text>
                  {" • "}
                  {fullBatchDetail.created_at &&
                    dayjs(fullBatchDetail.created_at).format(
                      "DD/MM/YYYY HH:mm"
                    )}
                </>
              )}
            </Text>
            <Button
              onClick={() => {
                setShowBatchDetailModal(false)
                setSelectedBatchDetail(null)
                setFullBatchDetail(null)
                setOwnerFilesForBatch([])
              }}>
              Đóng
            </Button>
          </div>
        }>
        <Spin spinning={fullBatchDetailLoading}>
          <Row gutter={24}>
            {/* Left Column - Batch Info */}
            <Col span={10}>
              <div
                style={{
                  background: "#fafafa",
                  padding: 16,
                  borderRadius: 8,
                  height: "100%",
                  minHeight: 450
                }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16
                  }}>
                  <Title level={5} style={{ margin: 0 }}>
                    <FileOutlined style={{ marginRight: 8 }} />
                    Thông tin đợt báo cáo
                  </Title>
                  {getBatchStatusTagForModal(batchData.status)}
                </div>

                {/* Batch Name */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tên đợt báo cáo
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {batchData.name}
                    </Text>
                  </div>
                </div>

                {/* Date Range */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Thời gian báo cáo
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {batchData.start_date && batchData.end_date ? (
                      <Tag icon={<CalendarOutlined />} color="blue">
                        {dayjs(batchData.start_date).format("DD/MM/YYYY HH:mm")}{" "}
                        - {dayjs(batchData.end_date).format("DD/MM/YYYY HH:mm")}
                      </Tag>
                    ) : (
                      <Text type="secondary">Chưa thiết lập</Text>
                    )}
                  </div>
                </div>

                {/* Deadline */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Hạn nộp báo cáo
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {batchData.deadline ? (
                      <Tag icon={<ClockCircleOutlined />} color="orange">
                        {dayjs(batchData.deadline).format("DD/MM/YYYY HH:mm")}
                      </Tag>
                    ) : (
                      <Text type="secondary">Không có hạn</Text>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <Row gutter={8} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <div
                      style={{
                        background: "#e6f7ff",
                        padding: 10,
                        borderRadius: 6,
                        textAlign: "center"
                      }}>
                      <Text
                        type="secondary"
                        style={{ fontSize: 10, display: "block" }}>
                        Hoạt động
                      </Text>
                      <Text strong style={{ fontSize: 20, color: "#1890ff" }}>
                        {fullBatchDetail?.activities?.length ||
                          selectedBatchDetail.required_response_count ||
                          0}
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        background: "#f6ffed",
                        padding: 10,
                        borderRadius: 6,
                        textAlign: "center"
                      }}>
                      <Text
                        type="secondary"
                        style={{ fontSize: 10, display: "block" }}>
                        ĐV phối hợp
                      </Text>
                      <Text strong style={{ fontSize: 20, color: "#52c41a" }}>
                        {(() => {
                          if (fullBatchDetail?.activities) {
                            const uniqueOrgs = new Set<string>()
                            fullBatchDetail.activities.forEach((a: any) => {
                              a.collaborating_organizations?.forEach(
                                (org: any) => {
                                  uniqueOrgs.add(org.id)
                                }
                              )
                            })
                            return uniqueOrgs.size
                          }
                          return (
                            selectedBatchDetail.required_response_count || 0
                          )
                        })()}
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        background: "#fff7e6",
                        padding: 10,
                        borderRadius: 6,
                        textAlign: "center"
                      }}>
                      <Text
                        type="secondary"
                        style={{ fontSize: 10, display: "block" }}>
                        Phản hồi
                      </Text>
                      <Text strong style={{ fontSize: 20, color: "#fa8c16" }}>
                        {fullBatchDetail?.collaborator_responses?.length ||
                          selectedBatchDetail.response_count ||
                          0}
                      </Text>
                    </div>
                  </Col>
                </Row>

                {/* Description */}
                {(fullBatchDetail?.description ||
                  selectedBatchDetail.description) && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Mô tả
                    </Text>
                    <div
                      style={{
                        marginTop: 4,
                        padding: "8px 12px",
                        background: "#fff",
                        borderRadius: 4,
                        border: "1px solid #f0f0f0"
                      }}>
                      <Text>
                        {fullBatchDetail?.description ||
                          selectedBatchDetail.description}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Owner Files */}
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      border: "1px solid #d9d9d9",
                      borderRadius: 8,
                      overflow: "hidden"
                    }}>
                    <div
                      style={{
                        background: "#e6f7ff",
                        padding: "8px 12px",
                        borderBottom: "1px solid #d9d9d9",
                        fontWeight: 500
                      }}>
                      <Space>
                        <UserIcon />
                        <span>Văn bản giao nhiệm vụ</span>
                      </Space>
                    </div>
                    <div style={{ padding: 12 }}>
                      {ownerFilesForBatch.length > 0 ? (
                        ownerFilesForBatch.map((file) => (
                          <div
                            key={file.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              background: "#fafafa",
                              borderRadius: 4,
                              marginBottom: 4
                            }}>
                            <Space>
                              {getFileIcon(file.file_type)}
                              <div>
                                <Text strong style={{ fontSize: 13 }}>
                                  {file.title || "Văn bản giao nhiệm vụ"}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {file.file_name} ({file.file_size_formatted})
                                </Text>
                              </div>
                            </Space>
                            <Tooltip title="Tải xuống">
                              <Button
                                type="text"
                                icon={<DownloadIcon />}
                                onClick={() => handleDownloadBatchFile(file)}
                              />
                            </Tooltip>
                          </div>
                        ))
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Chưa có văn bản giao nhiệm vụ"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column - Activities & Responses */}
            <Col span={14}>
              <div
                style={{
                  height: "100%",
                  minHeight: 450,
                  display: "flex",
                  flexDirection: "column"
                }}>
                {/* Activities List */}
                <div
                  style={{
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    overflow: "hidden",
                    flex: 1,
                    marginBottom: 12
                  }}>
                  <div
                    style={{
                      background: "#e6f7ff",
                      padding: "8px 12px",
                      borderBottom: "1px solid #d9d9d9",
                      fontWeight: 500
                    }}>
                    <Space>
                      <UnorderedListOutlined />
                      <span>Danh sách hoạt động</span>
                      <Badge
                        count={fullBatchDetail?.activities?.length || 0}
                        style={{ backgroundColor: "#1890ff" }}
                      />
                    </Space>
                  </div>

                  <div style={{ height: 180, overflow: "auto", padding: 8 }}>
                    {fullBatchDetail?.activities &&
                    fullBatchDetail.activities.length > 0 ? (
                      fullBatchDetail.activities.map(
                        (activityItem: any, idx: number) => (
                          <div
                            key={activityItem.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              padding: "8px 10px",
                              background: idx % 2 === 0 ? "#fafafa" : "#fff",
                              borderRadius: 4,
                              marginBottom: 4,
                              border: "1px solid #f0f0f0"
                            }}>
                            <Text
                              type="secondary"
                              style={{ width: 24, flexShrink: 0 }}>
                              {idx + 1}.
                            </Text>
                            <div style={{ flex: 1 }}>
                              <Text strong style={{ fontSize: 13 }}>
                                {activityItem.title}
                              </Text>
                              <div style={{ marginTop: 4 }}>
                                <Space size={4} wrap>
                                  <Tag
                                    color="blue"
                                    style={{ fontSize: 10, margin: 0 }}>
                                    {activityItem.lead_organization
                                      ?.short_name ||
                                      activityItem.lead_organization?.name}
                                  </Tag>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 10 }}>
                                    {dayjs(activityItem.start_date).format(
                                      "DD/MM/YY"
                                    )}{" "}
                                    -{" "}
                                    {dayjs(activityItem.end_date).format(
                                      "DD/MM/YY"
                                    )}
                                  </Text>
                                  <Tag
                                    color={
                                      activityItem.status === "COMPLETED"
                                        ? "success"
                                        : activityItem.status === "IN_PROGRESS"
                                          ? "processing"
                                          : activityItem.status === "APPROVED"
                                            ? "blue"
                                            : "default"
                                    }
                                    style={{ fontSize: 10, margin: 0 }}>
                                    {activityItem.status}
                                  </Tag>
                                </Space>
                              </div>
                              {activityItem.collaborating_organizations &&
                                activityItem.collaborating_organizations
                                  .length > 0 && (
                                  <div
                                    style={{
                                      marginTop: 4,
                                      padding: "4px 8px",
                                      background: "#f6ffed",
                                      borderRadius: 4,
                                      border: "1px solid #b7eb8f"
                                    }}>
                                    <TeamOutlined
                                      style={{
                                        fontSize: 10,
                                        color: "#52c41a",
                                        marginRight: 4
                                      }}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: "#52c41a",
                                        fontWeight: 500
                                      }}>
                                      Đơn vị phối hợp:
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: "#389e0d"
                                      }}>
                                      {" "}
                                      {activityItem.collaborating_organizations
                                        .map(
                                          (org: any) =>
                                            org.short_name || org.name
                                        )
                                        .join(", ")}
                                    </Text>
                                  </div>
                                )}
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có hoạt động"
                      />
                    )}
                  </div>
                </div>

                {/* Collaborator Responses - Grouped by Activity */}
                <div
                  style={{
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    overflow: "hidden",
                    flex: 1
                  }}>
                  <div
                    style={{
                      background: "#f6ffed",
                      padding: "8px 12px",
                      borderBottom: "1px solid #d9d9d9",
                      fontWeight: 500
                    }}>
                    <Space>
                      <TeamOutlined style={{ color: "#52c41a" }} />
                      <span>Phản hồi từ đơn vị phối hợp (theo hoạt động)</span>
                      <Badge
                        count={
                          fullBatchDetail?.collaborator_responses?.length ||
                          selectedBatchDetail.response_count ||
                          0
                        }
                        style={{ backgroundColor: "#52c41a" }}
                      />
                    </Space>
                  </div>

                  <div style={{ height: 200, overflow: "auto", padding: 8 }}>
                    {fullBatchDetail?.collaborator_responses &&
                    fullBatchDetail.collaborator_responses.length > 0 ? (
                      // Group responses by activity
                      (() => {
                        const groupedByActivity =
                          fullBatchDetail.collaborator_responses.reduce(
                            (acc: any, response: any) => {
                              const activityId = response.activity_id
                              if (!acc[activityId]) {
                                acc[activityId] = {
                                  activity: response.activity,
                                  responses: []
                                }
                              }
                              acc[activityId].responses.push(response)
                              return acc
                            },
                            {} as Record<
                              string,
                              {
                                activity?: { id: string; title: string }
                                responses: any[]
                              }
                            >
                          )

                        return Object.entries(groupedByActivity).map(
                          ([activityId, group]: [string, any]) => (
                            <div key={activityId} style={{ marginBottom: 12 }}>
                              {/* Activity header */}
                              <div
                                style={{
                                  background: "#e6f7ff",
                                  padding: "6px 10px",
                                  borderRadius: "4px 4px 0 0",
                                  borderBottom: "1px solid #91d5ff",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}>
                                <div>
                                  <Text strong style={{ fontSize: 12 }}>
                                    <FileOutlined style={{ marginRight: 6 }} />
                                    {group.activity?.title ||
                                      "Hoạt động không xác định"}
                                  </Text>
                                  <Badge
                                    count={group.responses.length}
                                    size="small"
                                    style={{
                                      backgroundColor: "#52c41a",
                                      marginLeft: 8
                                    }}
                                  />
                                </div>
                                <Tooltip title="Xem chi tiết phản hồi">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={
                                      <ExpandOutlined
                                        style={{ fontSize: 12 }}
                                      />
                                    }
                                    onClick={() => {
                                      setSelectedResponseActivityTitle(
                                        group.activity?.title ||
                                          "Hoạt động không xác định"
                                      )
                                      setSelectedResponsesForDetail(
                                        group.responses
                                      )
                                      setResponseDetailVisible(true)
                                    }}
                                    style={{ padding: "0 6px", height: 22 }}
                                  />
                                </Tooltip>
                              </div>
                              {/* Responses for this activity */}
                              <div
                                style={{
                                  border: "1px solid #f0f0f0",
                                  borderTop: "none",
                                  borderRadius: "0 0 4px 4px"
                                }}>
                                {group.responses.map(
                                  (response: any, idx: number) => (
                                    <div
                                      key={response.id}
                                      style={{
                                        padding: "8px 10px",
                                        background:
                                          idx % 2 === 0 ? "#fafafa" : "#fff",
                                        borderBottom:
                                          idx < group.responses.length - 1
                                            ? "1px solid #f0f0f0"
                                            : "none"
                                      }}>
                                      <div style={{ marginBottom: 4 }}>
                                        <Tag
                                          color="green"
                                          style={{
                                            marginRight: 6,
                                            fontSize: 10
                                          }}>
                                          {response.organization?.short_name ||
                                            response.organization?.name}
                                        </Tag>
                                        {response.is_overdue_submission && (
                                          <Tag
                                            color="orange"
                                            style={{
                                              marginRight: 6,
                                              fontSize: 10
                                            }}>
                                            Nộp quá hạn
                                          </Tag>
                                        )}
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: 10 }}>
                                          {response.submitter && (
                                            <>
                                              <UserOutlined
                                                style={{ marginRight: 2 }}
                                              />
                                              {response.submitter.first_name}{" "}
                                              {response.submitter.last_name}
                                              {" • "}
                                            </>
                                          )}
                                          {response.submitted_at
                                            ? dayjs(
                                                response.submitted_at
                                              ).format("DD/MM/YY HH:mm")
                                            : dayjs(response.created_at).format(
                                                "DD/MM/YY HH:mm"
                                              )}
                                        </Text>
                                      </div>
                                      <div
                                        style={{
                                          padding: "4px 8px",
                                          background: "#fff",
                                          borderRadius: 4,
                                          borderLeft: `2px solid ${response.is_overdue_submission ? "#fa8c16" : "#52c41a"}`
                                        }}>
                                        <Text
                                          strong
                                          style={{
                                            fontSize: 10,
                                            display: "block",
                                            marginBottom: 2
                                          }}>
                                          Nội dung báo cáo:
                                        </Text>
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            whiteSpace: "pre-wrap"
                                          }}>
                                          {response.content}
                                        </Text>
                                        {response.difficulties && (
                                          <div style={{ marginTop: 6 }}>
                                            <Text
                                              strong
                                              style={{
                                                fontSize: 10,
                                                color: "#d46b08"
                                              }}>
                                              Khó khăn/vướng mắc:
                                            </Text>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                whiteSpace: "pre-wrap",
                                                display: "block"
                                              }}>
                                              {response.difficulties}
                                            </Text>
                                          </div>
                                        )}
                                        {response.recommendations && (
                                          <div style={{ marginTop: 6 }}>
                                            <Text
                                              strong
                                              style={{
                                                fontSize: 10,
                                                color: "#1890ff"
                                              }}>
                                              Đề xuất/kiến nghị:
                                            </Text>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                whiteSpace: "pre-wrap",
                                                display: "block"
                                              }}>
                                              {response.recommendations}
                                            </Text>
                                          </div>
                                        )}
                                        {response.explanation && (
                                          <div style={{ marginTop: 6 }}>
                                            <Text
                                              strong
                                              style={{
                                                fontSize: 10,
                                                color: "#fa541c"
                                              }}>
                                              Giải trình:
                                            </Text>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                whiteSpace: "pre-wrap",
                                                display: "block"
                                              }}>
                                              {response.explanation}
                                            </Text>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )
                        )
                      })()
                    ) : selectedBatchDetail.responses.length > 0 ? (
                      selectedBatchDetail.responses.map((response, idx) => (
                        <div
                          key={response.id}
                          style={{
                            padding: "10px 12px",
                            background: idx % 2 === 0 ? "#fafafa" : "#fff",
                            borderRadius: 4,
                            marginBottom: 8,
                            border: "1px solid #f0f0f0"
                          }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 6
                            }}>
                            <Space>
                              <Tag color="green" style={{ margin: 0 }}>
                                {response.organization?.short_name ||
                                  response.organization?.name}
                              </Tag>
                              {response.is_overdue_submission && (
                                <Tag color="error" style={{ margin: 0 }}>
                                  Quá hạn
                                </Tag>
                              )}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {response.submitter &&
                                `${response.submitter.first_name} ${response.submitter.last_name}`}
                              {response.submitted_at &&
                                ` - ${dayjs(response.submitted_at).format("DD/MM/YY HH:mm")}`}
                            </Text>
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <Text style={{ whiteSpace: "pre-wrap" }}>
                              {response.content}
                            </Text>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có phản hồi nào"
                      />
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Spin>
      </Modal>
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
      styles={{
        body: {
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          padding: "12px 24px"
        }
      }}
      maskClosable={false}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "info",
            label: (
              <span>
                <FlagOutlined />
                Thông tin
              </span>
            ),
            children: isEditing ? renderInfoEdit() : renderInfoView()
          },
          {
            key: "files",
            label: (
              <Badge
                count={files.length + pendingFiles.length}
                size="small"
                offset={[8, 0]}>
                <span>
                  <FileOutlined />
                  Tài liệu
                </span>
              </Badge>
            ),
            children: renderFilesTab()
          },
          readOnly
            ? null
            : {
                key: "participants",
                label: (
                  <Badge
                    count={participantsSummary?.total || 0}
                    size="small"
                    offset={[8, 0]}>
                    <span>
                      <TeamOutlined />
                      Người tham dự
                    </span>
                  </Badge>
                ),
                children: renderParticipantsTab()
              },
          readOnly
            ? null
            : {
                key: "history",
                label: (
                  <span>
                    <HistoryOutlined />
                    Lịch sử
                  </span>
                ),
                children: activity ? (
                  <ActivityLogTimeline
                    activityId={activity.id}
                    visible={activeTab === "history"}
                  />
                ) : null
              },
          // Report batches tab - only for lead organization STAFF/MANAGER
          !canViewReportBatches()
            ? null
            : {
                key: "report-batches",
                label: (
                  <Badge
                    count={reportBatches.length}
                    size="small"
                    offset={[8, 0]}>
                    <span>
                      <ContainerOutlined />
                      Đợt báo cáo
                    </span>
                  </Badge>
                ),
                children: renderReportBatchesTab()
              }
        ].filter((item) => item !== null)}
      />

      {/* Cancel Activity Modal */}
      <Modal
        title={
          <Space>
            <StopOutlined style={{ color: "#ff4d4f" }} /> Hủy hoạt động
          </Space>
        }
        open={showCancelModal}
        onCancel={() => {
          setShowCancelModal(false)
          setCancelReason("")
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowCancelModal(false)
              setCancelReason("")
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
            disabled={!cancelReason.trim()}>
            Xác nhận hủy
          </Button>
        ]}
        width={500}>
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
            help="Vui lòng nhập lý do hủy hoạt động">
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

      {/* Share Links Manager Modal */}
      {activity && (
        <ShareLinksManager
          activityId={activity.id}
          activityName={activity.title}
          visible={showShareLinksModal}
          onClose={() => setShowShareLinksModal(false)}
        />
      )}

      {/* Report Batch Detail Modal */}
      {renderBatchDetailModal()}

      {/* Response Detail Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: "#52c41a" }} />
            <span>Chi tiết phản hồi</span>
            {selectedResponseActivityTitle && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                - {selectedResponseActivityTitle}
              </Text>
            )}
          </Space>
        }
        open={responseDetailVisible}
        onCancel={() => {
          setResponseDetailVisible(false)
          setSelectedResponsesForDetail([])
          setSelectedResponseActivityTitle("")
        }}
        width={900}
        centered
        footer={
          <Button
            onClick={() => {
              setResponseDetailVisible(false)
              setSelectedResponsesForDetail([])
              setSelectedResponseActivityTitle("")
            }}>
            Đóng
          </Button>
        }>
        <div style={{ maxHeight: 500, overflow: "auto" }}>
          {selectedResponsesForDetail.length > 0 ? (
            selectedResponsesForDetail.map((response: any, idx: number) => (
              <div
                key={response.id}
                style={{
                  padding: 16,
                  background: idx % 2 === 0 ? "#fafafa" : "#fff",
                  borderRadius: 8,
                  marginBottom: 12,
                  border: "1px solid #f0f0f0"
                }}>
                <div
                  style={{
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                  <Space>
                    <Tag color="green" style={{ fontSize: 12 }}>
                      {response.organization?.short_name ||
                        response.organization?.name}
                    </Tag>
                    {response.is_overdue_submission && (
                      <Tag color="orange" style={{ fontSize: 12 }}>
                        Nộp quá hạn
                      </Tag>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {response.submitter && (
                      <>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {response.submitter.first_name}{" "}
                        {response.submitter.last_name}
                        {" • "}
                      </>
                    )}
                    {response.submitted_at
                      ? dayjs(response.submitted_at).format("DD/MM/YYYY HH:mm")
                      : dayjs(response.created_at).format("DD/MM/YYYY HH:mm")}
                  </Text>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Text
                    strong
                    style={{
                      fontSize: 13,
                      color: "#1890ff",
                      display: "block",
                      marginBottom: 6
                    }}>
                    Nội dung báo cáo:
                  </Text>
                  <div
                    style={{
                      padding: 12,
                      background: "#fff",
                      borderRadius: 6,
                      border: "1px solid #e8e8e8",
                      borderLeft: `3px solid ${response.is_overdue_submission ? "#fa8c16" : "#52c41a"}`
                    }}>
                    <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                      {response.content}
                    </Text>
                  </div>
                </div>

                {response.difficulties && (
                  <div style={{ marginBottom: 12 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: "#d46b08",
                        display: "block",
                        marginBottom: 6
                      }}>
                      Khó khăn/vướng mắc:
                    </Text>
                    <div
                      style={{
                        padding: 12,
                        background: "#fff7e6",
                        borderRadius: 6,
                        border: "1px solid #ffd591"
                      }}>
                      <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                        {response.difficulties}
                      </Text>
                    </div>
                  </div>
                )}

                {response.recommendations && (
                  <div style={{ marginBottom: 12 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: "#1890ff",
                        display: "block",
                        marginBottom: 6
                      }}>
                      Đề xuất/kiến nghị:
                    </Text>
                    <div
                      style={{
                        padding: 12,
                        background: "#e6f7ff",
                        borderRadius: 6,
                        border: "1px solid #91d5ff"
                      }}>
                      <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                        {response.recommendations}
                      </Text>
                    </div>
                  </div>
                )}

                {response.explanation && (
                  <div style={{ marginBottom: 12 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: "#fa541c",
                        display: "block",
                        marginBottom: 6
                      }}>
                      Giải trình:
                    </Text>
                    <div
                      style={{
                        padding: 12,
                        background: "#fff1f0",
                        borderRadius: 6,
                        border: "1px solid #ffa39e"
                      }}>
                      <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                        {response.explanation}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty description="Không có phản hồi" />
          )}
        </div>
      </Modal>
    </Modal>
  )
}

export default ActivityDetailModal
