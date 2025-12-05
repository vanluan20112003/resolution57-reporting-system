import { useState, useEffect } from 'react'
import {
  Modal,
  Steps,
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
  Tabs,
  Checkbox,
  Divider,
  Card,
  message,
  Result,
  Upload,
  Table,
  Empty,
  Spin,
  Popconfirm,
} from 'antd'
import type { UploadProps } from 'antd'
import {
  FlagOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  GlobalOutlined,
  BankOutlined,
  SendOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  TeamOutlined,
  UploadOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as activityApi from '../../services/activityApi'
import { getMyOrganizationMembers, type OrganizationMember } from '../../services/organizationApi'
import { useAuth } from '../../shared/hooks'
import type {
  Activity,
  ActivityFormData,
  CreateActivityRequest,
  UpdateActivityRequest,
  KpiItem,
  ActivityFile,
  FileType,
  ActivityParticipant,
  AttendanceFile,
  ParticipantsSummary,
  OrganizationUserGroup,
  OrganizationOption,
} from '../../services/activityApi'
import ActivityFilesStep, { PendingFile } from './ActivityFilesStep'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

interface ActivityWizardModalProps {
  visible: boolean
  activity?: Activity | null // For editing
  formData: ActivityFormData | null
  onClose: () => void
  onSuccess: (activity: Activity, submitted: boolean) => void
}

function ActivityWizardModal({
  visible,
  activity,
  formData,
  onClose,
  onSuccess,
}: ActivityWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([])
  const [leaderNames, setLeaderNames] = useState<string[]>([])

  // Staff assignment state (for MANAGER+)
  const [staffList, setStaffList] = useState<OrganizationMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined)
  const [loadingStaff, setLoadingStaff] = useState(false)
  const { user: currentUser } = useAuth()

  // Files state
  const [files, setFiles] = useState<ActivityFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  // For confirmation step
  const [savedActivity, setSavedActivity] = useState<Activity | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Attendance list state
  const [attendanceFile, setAttendanceFile] = useState<AttendanceFile | null>(null)
  const [participants, setParticipants] = useState<ActivityParticipant[]>([])
  const [participantsSummary, setParticipantsSummary] = useState<ParticipantsSummary | null>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  // Organization groups state
  const [organizationGroups, setOrganizationGroups] = useState<OrganizationUserGroup[]>([])
  const [organizationInfo, setOrganizationInfo] = useState<{ id: string; name: string; code: string } | null>(null)
  const [organizationsList, setOrganizationsList] = useState<OrganizationOption[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(undefined)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [addingFromGroup, setAddingFromGroup] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)

  // Watch dates for duration calculation
  const watchStartDate = Form.useWatch('start_date', form)
  const watchEndDate = Form.useWatch('end_date', form)

  // Fetch staff list for assignment (MANAGER+ only)
  const fetchStaffList = async () => {
    if (!currentUser || !['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser.role)) {
      return
    }
    setLoadingStaff(true)
    try {
      const response = await getMyOrganizationMembers({
        role: 'STAFF', // Only fetch STAFF users
        per_page: 100,
      })
      setStaffList(response.data)
    } catch (error) {
      console.error('Failed to fetch staff list:', error)
    } finally {
      setLoadingStaff(false)
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentStep(0)
      setSavedActivity(null)
      setPendingFiles([])
      setAttendanceFile(null)
      setParticipants([])
      setParticipantsSummary(null)
      setOrganizationGroups([])
      setOrganizationInfo(null)
      setOrganizationsList([])
      setSelectedOrganizationId(undefined)
      setSelectedGroups([])
      setStaffList([])
      setSelectedStaffId(undefined)

      if (activity) {
        // Editing existing activity
        const kpiIds = activity.kpis?.map(k => k.id) || []
        setSelectedKpiIds(kpiIds)
        setLeaderNames(activity.leader_names || [])
        setSelectedStaffId(activity.assigned_to || undefined)
        form.setFieldsValue({
          code: activity.code,
          title: activity.title,
          description: activity.description,
          activity_type_id: activity.activity_type_id,
          activity_field_id: activity.activity_field_id,
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
      } else {
        // Creating new activity
        setSelectedKpiIds([])
        setLeaderNames([])
        setSelectedStaffId(undefined)
        setFiles([])
        form.resetFields()
      }

      // Fetch file types
      fetchFileTypes()
      // Fetch staff list for MANAGER+
      fetchStaffList()
    }
  }, [visible, activity, currentUser])

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

  // Fetch file types
  const fetchFileTypes = async () => {
    try {
      // Use the files API which returns file_types
      if (!activity) {
        // For new activity, we need to get file types from form data endpoint
        // For now, fileTypes will be populated when files are fetched
        // Or we can add a separate API call
      }
    } catch (error: any) {
      console.error('Failed to fetch file types:', error)
    }
  }

  // Fetch participants
  const fetchParticipants = async (activityId: string) => {
    setAttendanceLoading(true)
    try {
      const response = await activityApi.getActivityParticipants(activityId)
      setParticipants(response.data.participants)
      setAttendanceFile(response.data.attendance_file)
      setParticipantsSummary(response.data.summary)
    } catch (error: any) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  // Upload attendance list
  const handleUploadAttendance = async (file: File) => {
    const activityId = savedActivity?.id || activity?.id
    if (!activityId) {
      message.error('Vui lòng lưu hoạt động trước khi upload danh sách tham dự')
      return false
    }

    // Validate file type
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
      const response = await activityApi.uploadAttendanceList(activityId, file)
      message.success(response.message)
      setAttendanceFile(response.data.file)
      // Refetch participants to get the updated list
      await fetchParticipants(activityId)
    } catch (error: any) {
      message.error(error.message || 'Không thể upload danh sách tham dự')
    } finally {
      setUploadingAttendance(false)
    }
    return false
  }

  // Delete attendance list
  const handleDeleteAttendance = async () => {
    const activityId = savedActivity?.id || activity?.id
    if (!activityId) return

    setAttendanceLoading(true)
    try {
      await activityApi.deleteAttendanceList(activityId)
      message.success('Đã xóa danh sách tham dự')
      setAttendanceFile(null)
      setParticipants([])
      setParticipantsSummary(null)
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa danh sách tham dự')
    } finally {
      setAttendanceLoading(false)
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

  // Fetch organization user groups
  const fetchOrganizationGroups = async (activityId: string, organizationId?: string) => {
    setLoadingGroups(true)
    try {
      const response = await activityApi.getOrganizationUserGroups(activityId, organizationId)
      setOrganizationGroups(response.data.groups)
      setOrganizationInfo(response.data.organization)
      setOrganizationsList(response.data.organizations)
      // Set selected organization if we got organization info
      if (response.data.organization && !selectedOrganizationId) {
        setSelectedOrganizationId(response.data.organization.id)
      }
    } catch (error: any) {
      console.error('Failed to fetch organization groups:', error)
      // Don't show error message - activity might not have organization
    } finally {
      setLoadingGroups(false)
    }
  }

  // Handle organization change
  const handleOrganizationChange = async (organizationId: string) => {
    const activityId = savedActivity?.id || activity?.id
    if (!activityId) return

    setSelectedOrganizationId(organizationId)
    setSelectedGroups([]) // Clear selected groups when changing organization
    await fetchOrganizationGroups(activityId, organizationId)
  }

  // Add participants from selected groups
  const handleAddFromGroups = async () => {
    const activityId = savedActivity?.id || activity?.id
    if (!activityId || selectedGroups.length === 0) {
      message.warning('Vui lòng chọn ít nhất một nhóm')
      return
    }

    if (!selectedOrganizationId) {
      message.warning('Vui lòng chọn tổ chức')
      return
    }

    setAddingFromGroup(true)
    try {
      const response = await activityApi.addParticipantsFromGroup(activityId, selectedOrganizationId, selectedGroups)
      message.success(response.message)
      setSelectedGroups([])
      // Refetch participants and groups
      await Promise.all([
        fetchParticipants(activityId),
        fetchOrganizationGroups(activityId, selectedOrganizationId),
      ])
    } catch (error: any) {
      message.error(error.message || 'Không thể thêm người tham dự')
    } finally {
      setAddingFromGroup(false)
    }
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

  // Save activity (Step 1 -> Step 2)
  const handleSaveBasicInfo = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const start_date = values.start_date ? values.start_date.format('YYYY-MM-DD HH:mm:ss') : undefined
      const end_date = values.end_date ? values.end_date.format('YYYY-MM-DD HH:mm:ss') : undefined

      const requestData = {
        code: values.code || undefined,
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
        leader_names: leaderNames.length > 0 ? leaderNames : undefined,
        assigned_to: selectedStaffId || null, // Staff assigned to manage this activity
        kpi_ids: selectedKpiIds,
      }

      let savedAct: Activity

      if (activity) {
        // Update existing activity
        const response = await activityApi.updateActivity(activity.id, {
          ...requestData,
          completion_percentage: values.completion_percentage,
          result_summary: values.result_summary,
        } as UpdateActivityRequest)
        savedAct = response.data
        message.success('Đã cập nhật thông tin hoạt động')
      } else {
        // Create new activity
        const response = await activityApi.createActivity(requestData as CreateActivityRequest)
        savedAct = response.data
        message.success('Đã tạo hoạt động')
        // Fetch files to get file types
        await fetchActivityFiles(savedAct.id)
      }

      setSavedActivity(savedAct)
      setCurrentStep(1)
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // Go to step 3 (attendance list)
  const handleGoToAttendance = async () => {
    // Fetch participants and organization groups if we have an activity
    const activityId = savedActivity?.id || activity?.id
    if (activityId) {
      await Promise.all([
        fetchParticipants(activityId),
        fetchOrganizationGroups(activityId),
      ])
    }
    setCurrentStep(2)
  }

  // Go to step 4 (confirmation)
  const handleGoToConfirmation = () => {
    setCurrentStep(3)
  }

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!savedActivity) return

    setIsSubmitting(true)
    try {
      await activityApi.submitActivityForApproval(savedActivity.id)
      message.success('Đã gửi yêu cầu phê duyệt thành công')
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
      onSuccess(savedActivity, true)
      handleClose()
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi yêu cầu phê duyệt')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save as draft
  const handleSaveAsDraft = () => {
    if (savedActivity) {
      message.success('Hoạt động đã được lưu dưới dạng Nháp')
      window.dispatchEvent(new CustomEvent('activity-status-changed'))
      onSuccess(savedActivity, false)
      handleClose()
    }
  }

  // Close modal
  const handleClose = () => {
    setCurrentStep(0)
    setSavedActivity(null)
    setFiles([])
    setPendingFiles([])
    setSelectedKpiIds([])
    setLeaderNames([])
    setAttendanceFile(null)
    setParticipants([])
    setParticipantsSummary(null)
    setOrganizationGroups([])
    setOrganizationInfo(null)
    setOrganizationsList([])
    setSelectedOrganizationId(undefined)
    setSelectedGroups([])
    form.resetFields()
    onClose()
  }

  // Go back to previous step
  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  // Steps content
  const steps = [
    {
      title: 'Thông tin cơ bản',
      icon: <FlagOutlined />,
    },
    {
      title: 'Tài liệu',
      icon: <FileOutlined />,
    },
    {
      title: 'Danh sách tham dự',
      icon: <TeamOutlined />,
    },
    {
      title: 'Xác nhận',
      icon: <CheckCircleOutlined />,
    },
  ]

  // Render Step 1: Basic Info
  const renderBasicInfoStep = () => (
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

          {/* Code & Title */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="code"
                label="Mã hoạt động"
                style={{ marginBottom: 12 }}
                tooltip="Để trống để tự động tạo mã (VD: ACT-2025-001)"
              >
                <Input placeholder="Nhập mã hoặc để trống" maxLength={50} disabled={!!activity} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tên hoạt động"
                rules={[{ required: true, message: 'Vui lòng nhập tên hoạt động' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="Nhập tên hoạt động" maxLength={500} />
              </Form.Item>
            </Col>
          </Row>

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

          {/* Leader Names & Staff Assignment */}
          <Row gutter={12}>
            <Col span={currentUser && ['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser.role) ? 16 : 24}>
              <Form.Item label="Người chủ trì" style={{ marginBottom: 12 }}>
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  placeholder="Nhập tên người chủ trì và nhấn Enter để thêm"
                  value={leaderNames}
                  onChange={setLeaderNames}
                  tokenSeparators={[',']}
                  notFoundContent={null}
                  suffixIcon={<TeamOutlined />}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Nhập tên và nhấn Enter hoặc dấu phẩy (,) để thêm nhiều người chủ trì
                </Text>
              </Form.Item>
            </Col>
            {/* Staff Assignment - Only for MANAGER+ */}
            {currentUser && ['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser.role) && (
              <Col span={8}>
                <Form.Item
                  label="Nhân viên phụ trách"
                  style={{ marginBottom: 12 }}
                  tooltip="Chọn nhân viên được phân công quản lý hoạt động này"
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn nhân viên"
                    value={selectedStaffId}
                    onChange={setSelectedStaffId}
                    loading={loadingStaff}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {staffList.map((staff) => (
                      <Option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} ({staff.email})
                      </Option>
                    ))}
                  </Select>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Nhân viên này sẽ có quyền chỉnh sửa hoạt động
                  </Text>
                </Form.Item>
              </Col>
            )}
          </Row>

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
          {activity && (
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
  )

  // Render Step 2: Files
  const renderFilesStep = () => (
    <ActivityFilesStep
      activityId={savedActivity?.id}
      files={files}
      pendingFiles={pendingFiles}
      fileTypes={fileTypes}
      onFilesChange={setFiles}
      onPendingFilesChange={setPendingFiles}
      loading={filesLoading}
      disabled={false}
    />
  )

  // Render Step 3: Attendance List
  const renderAttendanceStep = () => {
    const uploadProps: UploadProps = {
      name: 'file',
      accept: '.xlsx,.xls',
      showUploadList: false,
      beforeUpload: handleUploadAttendance,
    }

    const participantColumns = [
      {
        title: 'STT',
        key: 'index',
        width: 60,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Email',
        key: 'email',
        render: (_: any, record: ActivityParticipant) => (
          <Space>
            {record.user ? (
              <Text>{record.user.email}</Text>
            ) : (
              <Space>
                <Text>{record.external_email}</Text>
                <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                  Chưa có tài khoản
                </Tag>
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
            return `${record.user.last_name} ${record.user.first_name}`
          }
          return record.external_name || '-'
        },
      },
      {
        title: 'Trạng thái',
        key: 'status',
        width: 150,
        render: (_: any, record: ActivityParticipant) => {
          if (!record.user_id) {
            return <Tag color="red">Không tìm thấy</Tag>
          }
          return <Tag color="blue">Sẵn sàng gửi</Tag>
        },
      },
    ]

    return (
      <div style={{ padding: '16px 0' }}>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message="Danh sách tham dự hoạt động"
          description={
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Tải lên file Excel chứa danh sách email người tham dự</li>
              <li>File Excel phải có cột <strong>email</strong> (bắt buộc)</li>
              <li>Có thể bỏ qua bước này và thêm danh sách sau</li>
              <li>Sau khi hoạt động được phê duyệt, hệ thống sẽ tự động gửi lời mời đến người tham dự có tài khoản</li>
            </ul>
          }
          style={{ marginBottom: 20 }}
        />

        {attendanceLoading || uploadingAttendance ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" tip={uploadingAttendance ? 'Đang xử lý danh sách...' : 'Đang tải...'} />
          </div>
        ) : (
          <>
            {/* Add participants section */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              {/* Option 1: Add from organization */}
              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <TeamOutlined />
                      <span>Thêm từ tổ chức</span>
                    </Space>
                  }
                  size="small"
                  style={{ height: '100%' }}
                >
                  {loadingGroups ? (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Spin tip="Đang tải danh sách nhóm..." />
                    </div>
                  ) : organizationsList.length > 0 ? (
                    <div>
                      {/* Organization selector dropdown */}
                      <div style={{ marginBottom: 12 }}>
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
                      </div>

                      {/* User groups checkboxes */}
                      {organizationGroups.length > 0 ? (
                        <>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Chọn nhóm người dùng:
                          </Text>
                          <Checkbox.Group
                            value={selectedGroups}
                            onChange={(values) => setSelectedGroups(values as string[])}
                            style={{ width: '100%' }}
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              {organizationGroups.map((group) => (
                                <Checkbox
                                  key={group.key}
                                  value={group.key}
                                  disabled={group.disabled}
                                >
                                  <Space>
                                    <span>{group.label}</span>
                                    <Tag color={group.disabled ? 'default' : 'blue'}>
                                      {group.count} người
                                    </Tag>
                                  </Space>
                                </Checkbox>
                              ))}
                            </Space>
                          </Checkbox.Group>
                          <Divider style={{ margin: '12px 0' }} />
                          <Button
                            type="primary"
                            icon={<TeamOutlined />}
                            onClick={handleAddFromGroups}
                            loading={addingFromGroup}
                            disabled={selectedGroups.length === 0}
                            block
                          >
                            Thêm người tham dự từ nhóm đã chọn
                          </Button>
                        </>
                      ) : selectedOrganizationId ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Tổ chức này không có thành viên mới để thêm"
                        />
                      ) : (
                        <Text type="secondary">Vui lòng chọn tổ chức để xem danh sách nhóm</Text>
                      )}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Không có tổ chức nào trong hệ thống"
                    />
                  )}
                </Card>
              </Col>

              {/* Option 2: Upload Excel */}
              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <FileExcelOutlined />
                      <span>Tải lên từ Excel</span>
                    </Space>
                  }
                  size="small"
                  style={{ height: '100%' }}
                >
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <Space direction="vertical" size="middle">
                      <Upload {...uploadProps}>
                        <Button
                          type="primary"
                          icon={<UploadOutlined />}
                          loading={uploadingAttendance}
                        >
                          Tải lên danh sách (Excel)
                        </Button>
                      </Upload>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Chỉ chấp nhận file .xlsx hoặc .xls
                        </Text>
                      </div>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadTemplate}
                        loading={downloadingTemplate}
                        size="small"
                      >
                        Tải mẫu Excel
                      </Button>
                    </Space>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Show file info if attendance file exists */}
            {attendanceFile && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <div>
                        <Text strong>{attendanceFile.file_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Tải lên: {attendanceFile.uploaded_at ? dayjs(attendanceFile.uploaded_at).format('DD/MM/YYYY HH:mm') : '-'}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />} loading={uploadingAttendance}>
                          Thay thế
                        </Button>
                      </Upload>
                      <Popconfirm
                        title="Xóa danh sách tham dự?"
                        description="Tất cả người tham dự sẽ bị xóa khỏi hoạt động này."
                        onConfirm={handleDeleteAttendance}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          Xóa
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Summary - show when there are participants */}
            {participantsSummary && participantsSummary.total > 0 && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card size="small">
                    <Text type="secondary">Tổng số</Text>
                    <Title level={3} style={{ margin: 0 }}>{participantsSummary.total}</Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Text type="secondary">Có tài khoản</Text>
                    <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{participantsSummary.internal}</Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Text type="secondary">Chưa có tài khoản</Text>
                    <Title level={3} style={{ margin: 0, color: '#faad14' }}>{participantsSummary.external}</Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Text type="secondary">Sẽ gửi lời mời</Text>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{participantsSummary.internal}</Title>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Participants table - show when there are participants */}
            {participants.length > 0 && (
              <Table
                columns={participantColumns}
                dataSource={participants}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'Chưa có người tham dự' }}
              />
            )}

            {/* Note about sending invitations */}
            <Alert
              type="warning"
              message="Lưu ý"
              description="Lời mời tham dự sẽ được gửi tự động đến những người có tài khoản trong hệ thống sau khi hoạt động được phê duyệt. Những email không có trong hệ thống sẽ không nhận được lời mời."
              style={{ marginTop: 16 }}
              showIcon
            />
          </>
        )}
      </div>
    )
  }

  // Render Step 4: Confirmation
  const renderConfirmationStep = () => {
    if (!savedActivity) return null

    return (
      <div style={{ padding: '20px 0' }}>
        <Result
          status="success"
          title="Hoạt động đã sẵn sàng!"
          subTitle={
            <div style={{ textAlign: 'left', maxWidth: 600, margin: '20px auto' }}>
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Mã hoạt động:</Text>
                    <Text strong style={{ marginLeft: 8 }}>{savedActivity.code}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Tên hoạt động:</Text>
                    <Text strong style={{ marginLeft: 8 }}>{savedActivity.title}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Trạng thái:</Text>
                    <Tag color="default" style={{ marginLeft: 8 }}>Nháp</Tag>
                  </div>
                  <div>
                    <Text type="secondary">Tài liệu đính kèm:</Text>
                    <Text style={{ marginLeft: 8 }}>{files.length + pendingFiles.length} tài liệu</Text>
                  </div>
                  <div>
                    <Text type="secondary">Người tham dự:</Text>
                    <Text style={{ marginLeft: 8 }}>
                      {participantsSummary ? (
                        <>
                          {participantsSummary.total} người
                          {participantsSummary.internal > 0 && (
                            <Text type="success"> ({participantsSummary.internal} sẽ nhận lời mời)</Text>
                          )}
                        </>
                      ) : (
                        'Chưa có'
                      )}
                    </Text>
                  </div>
                </Space>
              </Card>

              <Alert
                type="info"
                message="Bạn muốn làm gì tiếp theo?"
                description={
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li><strong>Gửi yêu cầu phê duyệt:</strong> Hoạt động sẽ chuyển sang trạng thái "Chờ phê duyệt" và được gửi đến Manager để xem xét.</li>
                    <li><strong>Lưu nháp:</strong> Hoạt động sẽ được lưu dưới dạng "Nháp" và bạn có thể chỉnh sửa hoặc gửi phê duyệt sau.</li>
                  </ul>
                }
              />
            </div>
          }
          extra={[
            <Button
              key="draft"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveAsDraft}
            >
              Lưu nháp
            </Button>,
            <Button
              key="submit"
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={isSubmitting}
              onClick={handleSubmitForApproval}
            >
              Gửi yêu cầu phê duyệt
            </Button>,
          ]}
        />
      </div>
    )
  }

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep()
      case 1:
        return renderFilesStep()
      case 2:
        return renderAttendanceStep()
      case 3:
        return renderConfirmationStep()
      default:
        return null
    }
  }

  // Render footer buttons
  const renderFooter = () => {
    if (currentStep === 3) {
      // Confirmation step has its own buttons in the content
      return [
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>,
      ]
    }

    return [
      <Button key="cancel" onClick={handleClose}>
        Hủy
      </Button>,
      currentStep > 0 && (
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
      ),
      currentStep === 0 && (
        <Button
          key="next"
          type="primary"
          loading={loading}
          onClick={handleSaveBasicInfo}
          icon={<ArrowRightOutlined />}
        >
          {activity ? 'Cập nhật & Tiếp tục' : 'Tạo & Tiếp tục'}
        </Button>
      ),
      currentStep === 1 && (
        <Button
          key="next"
          type="primary"
          onClick={handleGoToAttendance}
          icon={<ArrowRightOutlined />}
        >
          Tiếp tục
        </Button>
      ),
      currentStep === 2 && (
        <Button
          key="next"
          type="primary"
          onClick={handleGoToConfirmation}
          icon={<ArrowRightOutlined />}
        >
          Tiếp tục
        </Button>
      ),
    ].filter(Boolean)
  }

  return (
    <Modal
      title={
        <Space>
          <FlagOutlined />
          <span>{activity ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới'}</span>
          {formData?.user_organization && (
            <Tag color="blue">{formData.user_organization.short_name || formData.user_organization.name}</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={1200}
      footer={renderFooter()}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 24px' } }}
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 24 }}
      />

      {renderStepContent()}
    </Modal>
  )
}

export default ActivityWizardModal
