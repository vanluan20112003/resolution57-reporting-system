import { useState, useEffect } from 'react'
import {
  Modal,
  Steps,
  Button,
  Form,
  Input,
  Upload,
  Table,
  Space,
  Typography,
  Alert,
  message,
  Spin,
  Card,
  Tag,
  Checkbox,
  Empty,
  Tooltip,
  Row,
  Col,
  Statistic,
  Select,
  Divider,
  List,
  InputNumber,
  Slider,
} from 'antd'
import type { UploadProps, UploadFile } from 'antd'
import {
  CheckCircleOutlined,
  FileExcelOutlined,
  UploadOutlined,
  FileTextOutlined,
  TeamOutlined,
  InboxOutlined,
  UserOutlined,
  MailOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import * as activityApi from '../../services/activityApi'
import type { Activity, ActivityParticipant, ParticipantsSummary, ActivityFile, FileType } from '../../services/activityApi'
import * as XLSX from 'xlsx'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Dragger } = Upload
const { Option } = Select

interface ActivityCompletionModalProps {
  visible: boolean
  activity: Activity | null
  onClose: () => void
  onSuccess: (activity: Activity) => void
}

interface AttendanceRecord {
  email: string
  name?: string
  phone?: string
  organization?: string
  matched: boolean
  participant?: ActivityParticipant
  selected?: boolean // For adding new participants
}

function ActivityCompletionModal({
  visible,
  activity,
  onClose,
  onSuccess,
}: ActivityCompletionModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // Step 1: Result summary
  const [resultSummary, setResultSummary] = useState('')
  const [difficulties, setDifficulties] = useState('')
  const [completionPercentage, setCompletionPercentage] = useState(0)

  // Step 2: Files
  const [files, setFiles] = useState<ActivityFile[]>([])
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [selectedFileTypeId, setSelectedFileTypeId] = useState<string | undefined>(undefined)
  const [uploading, setUploading] = useState(false)

  // Step 3: Attendance
  const [participants, setParticipants] = useState<ActivityParticipant[]>([])
  const [participantsSummary, setParticipantsSummary] = useState<ParticipantsSummary | null>(null)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [uploadingAttendance, setUploadingAttendance] = useState(false)
  const [attendanceProcessed, setAttendanceProcessed] = useState(false)
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null)
  const [newParticipantsToAdd, setNewParticipantsToAdd] = useState<string[]>([]) // emails of new participants to add
  const [savingAttendance, setSavingAttendance] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (visible && activity) {
      setCurrentStep(0)
      setResultSummary(activity.result_summary || '')
      setDifficulties(activity.difficulties || '')
      setCompletionPercentage(activity.completion_percentage || 0)
      setAttendanceRecords([])
      setSelectedAttendees([])
      setAttendanceProcessed(false)
      setAttendanceFile(null)
      setNewParticipantsToAdd([])
      form.setFieldsValue({
        result_summary: activity.result_summary || '',
        difficulties: activity.difficulties || '',
        completion_percentage: activity.completion_percentage || 0,
      })

      // Load files
      fetchFiles(activity.id)

      // Load participants
      fetchParticipants(activity.id)
    }
  }, [visible, activity])

  // Fetch files
  const fetchFiles = async (activityId: string) => {
    setFilesLoading(true)
    try {
      const response = await activityApi.getActivityFiles(activityId)
      setFiles(response.data.files)
      setFileTypes(response.data.file_types)
    } catch (error) {
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
      setParticipantsSummary(response.data.summary)

      // Pre-select already attended participants
      const alreadyAttended = response.data.participants
        .filter(p => p.attended)
        .map(p => p.id)
      setSelectedAttendees(alreadyAttended)
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setParticipantsLoading(false)
    }
  }

  // Handle Step 1: Save result summary
  const handleSaveResultSummary = async () => {
    if (!activity) return

    setLoading(true)
    try {
      const response = await activityApi.updateActivity(activity.id, {
        result_summary: resultSummary,
        difficulties: difficulties,
        completion_percentage: completionPercentage,
      })
      message.success('Đã lưu kết quả hoạt động')
      onSuccess(response.data)
      setCurrentStep(1)
    } catch (error: any) {
      message.error(error.message || 'Không thể lưu kết quả')
    } finally {
      setLoading(false)
    }
  }

  // Handle Step 2: Upload file
  const handleFileUpload = async (file: File): Promise<boolean> => {
    if (!activity || !selectedFileTypeId) {
      message.warning('Vui lòng chọn loại tài liệu trước khi upload')
      return false
    }

    setUploading(true)
    try {
      await activityApi.uploadActivityFile(activity.id, file, selectedFileTypeId)
      message.success(`Đã tải lên: ${file.name}`)
      await fetchFiles(activity.id)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải lên file')
    } finally {
      setUploading(false)
    }

    return false // Prevent default upload
  }

  // Handle delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!activity) return

    try {
      await activityApi.deleteActivityFile(activity.id, fileId)
      message.success('Đã xóa file')
      await fetchFiles(activity.id)
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa file')
    }
  }

  // Handle Step 3: Process attendance Excel
  const handleAttendanceUpload = async (file: File): Promise<boolean> => {
    const isExcel =
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')

    if (!isExcel) {
      message.error('Chỉ chấp nhận file Excel (.xlsx, .xls)')
      return false
    }

    setUploadingAttendance(true)
    setAttendanceFile(file)
    try {
      // Read Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet)

      // Find columns (case-insensitive)
      const findColumn = (row: Record<string, any>, keywords: string[]): string | null => {
        for (const key of Object.keys(row)) {
          const lowerKey = key.toLowerCase()
          for (const keyword of keywords) {
            if (lowerKey.includes(keyword.toLowerCase())) {
              return key
            }
          }
        }
        return null
      }

      let emailColumn: string | null = null
      let nameColumn: string | null = null
      let phoneColumn: string | null = null
      let orgColumn: string | null = null

      if (jsonData.length > 0) {
        const firstRow = jsonData[0]
        emailColumn = findColumn(firstRow, ['email', 'e-mail', 'mail'])
        nameColumn = findColumn(firstRow, ['họ tên', 'ho ten', 'name', 'tên', 'ten', 'fullname'])
        phoneColumn = findColumn(firstRow, ['phone', 'điện thoại', 'dien thoai', 'sdt', 'số điện thoại'])
        orgColumn = findColumn(firstRow, ['tổ chức', 'to chuc', 'organization', 'đơn vị', 'don vi', 'company'])
      }

      if (!emailColumn) {
        message.error('Không tìm thấy cột Email trong file. Vui lòng đảm bảo file có cột chứa "Email"')
        setUploadingAttendance(false)
        return false
      }

      // Extract records and match with participants
      const records: AttendanceRecord[] = []
      const matchedParticipantIds: string[] = []
      const unmatchedEmails: string[] = []

      for (const row of jsonData) {
        const email = row[emailColumn]?.toString()?.trim()?.toLowerCase()
        if (!email) continue

        // Try to match with participant
        const participant = participants.find(
          p => (p.user?.email?.toLowerCase() === email) || (p.external_email?.toLowerCase() === email)
        )

        const record: AttendanceRecord = {
          email: row[emailColumn]?.toString()?.trim(),
          name: nameColumn ? row[nameColumn]?.toString()?.trim() : undefined,
          phone: phoneColumn ? row[phoneColumn]?.toString()?.trim() : undefined,
          organization: orgColumn ? row[orgColumn]?.toString()?.trim() : undefined,
          matched: !!participant,
          participant,
          selected: !participant, // Pre-select unmatched for adding
        }

        records.push(record)

        if (participant) {
          matchedParticipantIds.push(participant.id)
        } else {
          unmatchedEmails.push(email)
        }
      }

      setAttendanceRecords(records)
      setSelectedAttendees(prev => [...new Set([...prev, ...matchedParticipantIds])])
      setNewParticipantsToAdd(unmatchedEmails)
      setAttendanceProcessed(true)

      const matchedCount = records.filter(r => r.matched).length
      const unmatchedCount = records.filter(r => !r.matched).length

      if (unmatchedCount > 0) {
        message.info(`Đã xử lý ${records.length} bản ghi: ${matchedCount} khớp, ${unmatchedCount} người mới (có thể thêm vào DS tham dự)`)
      } else {
        message.success(`Đã xử lý ${records.length} bản ghi, tất cả đều khớp với danh sách tham dự`)
      }
    } catch (error: any) {
      message.error('Không thể đọc file Excel: ' + error.message)
    } finally {
      setUploadingAttendance(false)
    }

    return false // Prevent default upload
  }

  // Toggle new participant selection
  const toggleNewParticipant = (email: string, checked: boolean) => {
    if (checked) {
      setNewParticipantsToAdd(prev => [...prev, email])
    } else {
      setNewParticipantsToAdd(prev => prev.filter(e => e !== email))
    }
  }

  // Handle Step 3: Save attendance with optional new participants
  const handleSaveAttendance = async () => {
    if (!activity) return

    setSavingAttendance(true)
    try {
      // Get unmatched records that user wants to add
      const newParticipants = attendanceRecords
        .filter(r => !r.matched && newParticipantsToAdd.includes(r.email.toLowerCase()))
        .map(r => ({
          email: r.email,
          name: r.name || '',
          phone: r.phone || '',
          organization: r.organization || '',
        }))

      // Call API to process attendance
      const response = await activityApi.processAttendanceWithNewParticipants(
        activity.id,
        selectedAttendees,
        newParticipants,
        attendanceFile || undefined
      )

      message.success(response.message || 'Đã cập nhật điểm danh')

      // Refresh participants list
      await fetchParticipants(activity.id)
      await fetchFiles(activity.id)

      // Reset attendance state
      setAttendanceProcessed(false)
      setAttendanceRecords([])
      setNewParticipantsToAdd([])
      setAttendanceFile(null)
    } catch (error: any) {
      message.error(error.message || 'Không thể cập nhật điểm danh')
    } finally {
      setSavingAttendance(false)
    }
  }

  // Handle complete
  const handleComplete = () => {
    message.success('Đã hoàn tất cập nhật hoạt động')
    // Dispatch event to refresh badge counts
    window.dispatchEvent(new CustomEvent('activity-status-changed'))
    onClose()
  }

  // Skip step
  const handleSkip = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  // Close modal
  const handleClose = () => {
    setCurrentStep(0)
    setResultSummary('')
    setAttendanceRecords([])
    setSelectedAttendees([])
    setAttendanceProcessed(false)
    setAttendanceFile(null)
    setNewParticipantsToAdd([])
    onClose()
  }

  // Get file type name
  const getFileTypeName = (fileTypeId?: string) => {
    if (!fileTypeId) return 'Không phân loại'
    const ft = fileTypes.find(t => t.id === fileTypeId)
    return ft ? ft.name : 'Không xác định'
  }

  // Attendance table columns for comparison results
  const attendanceColumns = [
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: any, record: AttendanceRecord) => {
        if (record.matched) {
          return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        }
        return (
          <Checkbox
            checked={newParticipantsToAdd.includes(record.email.toLowerCase())}
            onChange={(e) => toggleNewParticipant(record.email.toLowerCase(), e.target.checked)}
          />
        )
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: AttendanceRecord) => (
        <Space>
          <MailOutlined />
          <Text>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => name || '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 200,
      render: (_: any, record: AttendanceRecord) => {
        if (record.matched && record.participant) {
          const name = record.participant.user
            ? `${record.participant.user.last_name} ${record.participant.user.first_name}`
            : record.participant.external_name || 'N/A'
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Có trong DS: {name}
            </Tag>
          )
        }
        if (newParticipantsToAdd.includes(record.email.toLowerCase())) {
          return (
            <Tag color="blue" icon={<UserAddOutlined />}>
              Sẽ thêm vào DS
            </Tag>
          )
        }
        return (
          <Tag color="orange" icon={<ExclamationCircleOutlined />}>
            Chưa có trong DS
          </Tag>
        )
      },
    },
  ]

  // Participants table columns for manual selection
  const participantColumns = [
    {
      title: 'Email',
      key: 'email',
      render: (_: any, record: ActivityParticipant) => (
        <Space>
          <MailOutlined />
          {record.user ? record.user.email : record.external_email}
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
      title: 'Phản hồi',
      key: 'response',
      width: 120,
      render: (_: any, record: ActivityParticipant) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: 'Chờ phản hồi' },
          accepted: { color: 'success', text: 'Đã chấp nhận' },
          declined: { color: 'error', text: 'Đã từ chối' },
        }
        const config = statusConfig[record.invitation_status] || statusConfig.pending
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: 'Đã tham dự',
      key: 'attended',
      width: 100,
      render: (_: any, record: ActivityParticipant) => (
        record.attended ? (
          <Tag color="success" icon={<CheckOutlined />}>Có</Tag>
        ) : (
          <Tag color="default">Chưa</Tag>
        )
      ),
    },
  ]

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        const hasExistingResult = activity?.result_summary && activity.result_summary.trim() !== ''
        return (
          <div>
            <Alert
              type={hasExistingResult ? "success" : "info"}
              message={hasExistingResult ? "Bước 1: Chỉnh sửa kết quả" : "Bước 1: Cập nhật kết quả"}
              description={hasExistingResult
                ? "Bạn có thể chỉnh sửa hoặc bổ sung thêm thông tin vào tóm tắt kết quả đã có."
                : "Nhập tóm tắt kết quả thực hiện hoạt động, tỉ lệ hoàn thành và các khó khăn vướng mắc (nếu có)."
              }
              style={{ marginBottom: 16 }}
              showIcon
              icon={hasExistingResult ? <CheckCircleOutlined /> : <FileTextOutlined />}
            />
            <Form form={form} layout="vertical">
              {/* Completion percentage */}
              <Form.Item
                name="completion_percentage"
                label="Tỉ lệ hoàn thành (%)"
                style={{ marginBottom: 16 }}
              >
                <Row gutter={16} align="middle">
                  <Col span={18}>
                    <Slider
                      min={0}
                      max={100}
                      value={completionPercentage}
                      onChange={(value) => setCompletionPercentage(value)}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <InputNumber
                      min={0}
                      max={100}
                      value={completionPercentage}
                      onChange={(value) => setCompletionPercentage(value || 0)}
                      formatter={(value) => `${value}%`}
                      parser={(value) => parseInt(value!.replace('%', '')) as any}
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
              </Form.Item>

              {/* Result summary */}
              <Form.Item
                name="result_summary"
                label="Tóm tắt kết quả"
                rules={[{ required: true, message: 'Vui lòng nhập tóm tắt kết quả' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Nhập tóm tắt kết quả thực hiện hoạt động..."
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  showCount
                  maxLength={2000}
                />
              </Form.Item>

              {/* Difficulties */}
              <Form.Item
                name="difficulties"
                label="Khó khăn, vướng mắc"
              >
                <TextArea
                  rows={3}
                  placeholder="Nhập các khó khăn, vướng mắc gặp phải trong quá trình thực hiện (nếu có)..."
                  value={difficulties}
                  onChange={(e) => setDifficulties(e.target.value)}
                  showCount
                  maxLength={2000}
                />
              </Form.Item>
            </Form>
          </div>
        )

      case 1:
        return (
          <div>
            <Alert
              type="info"
              message="Bước 2: Cập nhật tài liệu"
              description="Tải lên các tài liệu liên quan như báo cáo kết quả, hình ảnh, video, biên bản họp, v.v. Bạn có thể bỏ qua bước này."
              style={{ marginBottom: 16 }}
              showIcon
              icon={<FileExcelOutlined />}
            />

            {filesLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="Đang tải thông tin tài liệu..." />
              </div>
            ) : (
              <>
                {/* Upload section */}
                <Card size="small" title="Tải lên tài liệu mới" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      placeholder="Chọn loại tài liệu"
                      style={{ width: '100%' }}
                      value={selectedFileTypeId}
                      onChange={setSelectedFileTypeId}
                      allowClear
                    >
                      {fileTypes.map(ft => (
                        <Option key={ft.id} value={ft.id}>{ft.name} ({ft.code})</Option>
                      ))}
                    </Select>

                    <Dragger
                      name="file"
                      multiple
                      showUploadList={false}
                      beforeUpload={handleFileUpload}
                      disabled={uploading || !selectedFileTypeId}
                    >
                      <p className="ant-upload-drag-icon">
                        {uploading ? <Spin /> : <InboxOutlined />}
                      </p>
                      <p className="ant-upload-text">
                        {selectedFileTypeId
                          ? 'Kéo thả file vào đây hoặc nhấp để chọn'
                          : 'Vui lòng chọn loại tài liệu trước'}
                      </p>
                    </Dragger>
                  </Space>
                </Card>

                {/* Existing files */}
                <Card size="small" title={`Tài liệu đã có (${files.length})`}>
                  {files.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tài liệu" />
                  ) : (
                    <List
                      size="small"
                      dataSource={files}
                      renderItem={(file) => (
                        <List.Item
                          actions={[
                            file.download_url && (
                              <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                href={file.download_url}
                                target="_blank"
                              >
                                Tải
                              </Button>
                            ),
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              Xóa
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<FileOutlined />}
                            title={file.file_name}
                            description={
                              <Space>
                                <Tag>{getFileTypeName(file.file_type_id)}</Tag>
                                {file.file_extension && <Text type="secondary">.{file.file_extension}</Text>}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </>
            )}
          </div>
        )

      case 2:
        return (
          <div>
            <Alert
              type="info"
              message="Bước 3: Điểm danh"
              description={
                <span>
                  Tải lên file Excel điểm danh để so sánh với danh sách tham dự.
                  <br />
                  • Người có trong file điểm danh và DS tham dự sẽ được đánh dấu "Đã tham dự"
                  <br />
                  • Người có trong file điểm danh nhưng chưa có trong DS tham dự có thể được thêm vào
                </span>
              }
              style={{ marginBottom: 16 }}
              showIcon
              icon={<TeamOutlined />}
            />

            {participantsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="Đang tải danh sách người tham dự..." />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                {participantsSummary && (
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="Tổng DS tham dự" value={participantsSummary.total} />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="Đã chấp nhận"
                          value={participantsSummary.accepted}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="Đã từ chối"
                          value={participantsSummary.declined}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="Đã điểm danh"
                          value={participants.filter(p => p.attended).length}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* Upload attendance file */}
                {!attendanceProcessed && (
                  <Card size="small" title="Tải lên file điểm danh" style={{ marginBottom: 16 }}>
                    <Dragger
                      name="file"
                      accept=".xlsx,.xls"
                      showUploadList={false}
                      beforeUpload={handleAttendanceUpload}
                      disabled={uploadingAttendance}
                    >
                      <p className="ant-upload-drag-icon">
                        {uploadingAttendance ? <Spin /> : <InboxOutlined />}
                      </p>
                      <p className="ant-upload-text">
                        Kéo thả file Excel điểm danh vào đây hoặc nhấp để chọn
                      </p>
                      <p className="ant-upload-hint">
                        File cần có cột "Email". Các cột tùy chọn: Họ tên, Điện thoại, Đơn vị
                      </p>
                    </Dragger>
                  </Card>
                )}

                {/* Attendance comparison results */}
                {attendanceProcessed && attendanceRecords.length > 0 && (
                  <Card
                    title={
                      <Space>
                        <FileExcelOutlined />
                        <span>Kết quả so sánh điểm danh</span>
                        <Tag color="green">{attendanceRecords.filter(r => r.matched).length} có trong DS</Tag>
                        <Tag color="orange">{attendanceRecords.filter(r => !r.matched).length} chưa có</Tag>
                        {newParticipantsToAdd.length > 0 && (
                          <Tag color="blue">{newParticipantsToAdd.length} sẽ thêm</Tag>
                        )}
                      </Space>
                    }
                    size="small"
                    style={{ marginBottom: 16 }}
                    extra={
                      <Button size="small" onClick={() => {
                        setAttendanceProcessed(false)
                        setAttendanceRecords([])
                        setNewParticipantsToAdd([])
                        setAttendanceFile(null)
                      }}>
                        Tải file khác
                      </Button>
                    }
                  >
                    {attendanceRecords.filter(r => !r.matched).length > 0 && (
                      <Alert
                        type="warning"
                        message={
                          <Space>
                            <span>Có {attendanceRecords.filter(r => !r.matched).length} người chưa có trong danh sách tham dự.</span>
                            <Button
                              size="small"
                              type="link"
                              onClick={() => {
                                const unmatched = attendanceRecords.filter(r => !r.matched).map(r => r.email.toLowerCase())
                                setNewParticipantsToAdd(unmatched)
                              }}
                            >
                              Chọn tất cả để thêm
                            </Button>
                            <Button
                              size="small"
                              type="link"
                              onClick={() => setNewParticipantsToAdd([])}
                            >
                              Bỏ chọn tất cả
                            </Button>
                          </Space>
                        }
                        style={{ marginBottom: 12 }}
                        showIcon
                      />
                    )}
                    <Table
                      columns={attendanceColumns}
                      dataSource={attendanceRecords}
                      rowKey="email"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      rowClassName={(record) => record.matched ? '' : 'ant-table-row-warning'}
                    />
                  </Card>
                )}

                {/* Current participants list */}
                {participants.length > 0 && !attendanceProcessed && (
                  <Card
                    title={
                      <Space>
                        <TeamOutlined />
                        <span>Danh sách người tham dự hiện tại</span>
                      </Space>
                    }
                    size="small"
                  >
                    <Table
                      columns={participantColumns}
                      dataSource={participants}
                      rowKey="id"
                      size="small"
                      rowSelection={{
                        selectedRowKeys: selectedAttendees,
                        onChange: (keys) => setSelectedAttendees(keys as string[]),
                      }}
                      pagination={{ pageSize: 10 }}
                    />
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <Button
                        type="primary"
                        loading={loading}
                        onClick={async () => {
                          if (!activity) return
                          setLoading(true)
                          try {
                            const response = await activityApi.updateParticipantsAttendance(
                              activity.id,
                              selectedAttendees
                            )
                            message.success(response.message || 'Đã cập nhật điểm danh')
                            await fetchParticipants(activity.id)
                          } catch (error: any) {
                            message.error(error.message || 'Không thể cập nhật điểm danh')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        disabled={selectedAttendees.length === 0}
                      >
                        Lưu điểm danh thủ công ({selectedAttendees.length})
                      </Button>
                    </div>
                  </Card>
                )}

                {participants.length === 0 && !attendanceProcessed && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có người tham dự. Bạn có thể tải file điểm danh để thêm người tham dự."
                  />
                )}
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Render footer buttons
  const renderFooter = () => {
    const buttons = []

    // Close button
    buttons.push(
      <Button key="close" onClick={handleClose}>
        Đóng
      </Button>
    )

    // Skip button
    buttons.push(
      <Button key="skip" onClick={handleSkip}>
        Bỏ qua
      </Button>
    )

    // Back button
    if (currentStep > 0) {
      buttons.push(
        <Button key="back" onClick={() => setCurrentStep(currentStep - 1)}>
          Quay lại
        </Button>
      )
    }

    // Action button based on step
    switch (currentStep) {
      case 0:
        buttons.push(
          <Button
            key="save"
            type="primary"
            loading={loading}
            onClick={handleSaveResultSummary}
            disabled={!resultSummary.trim()}
          >
            Lưu & Tiếp tục
          </Button>
        )
        break
      case 1:
        buttons.push(
          <Button
            key="next"
            type="primary"
            onClick={() => setCurrentStep(2)}
          >
            Tiếp tục
          </Button>
        )
        break
      case 2:
        if (attendanceProcessed) {
          const matchedCount = attendanceRecords.filter(r => r.matched).length
          const newCount = newParticipantsToAdd.length
          buttons.push(
            <Button
              key="save-attendance"
              type="primary"
              loading={savingAttendance}
              onClick={handleSaveAttendance}
              icon={<CheckCircleOutlined />}
            >
              Lưu điểm danh ({matchedCount} + {newCount} mới)
            </Button>
          )
        }
        buttons.push(
          <Button
            key="complete"
            type="primary"
            onClick={handleComplete}
            icon={<CheckCircleOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Hoàn tất
          </Button>
        )
        break
    }

    return buttons
  }

  if (!activity) return null

  const getModalTitle = () => {
    if (activity.status === 'COMPLETED') {
      return 'Cập nhật sau hoàn thành'
    } else if (activity.status === 'IN_PROGRESS') {
      return 'Cập nhật tiến độ thực hiện'
    } else {
      return 'Cập nhật tiến độ'
    }
  }

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: activity.status === 'COMPLETED' ? '#52c41a' : '#1890ff' }} />
          <span>{getModalTitle()}</span>
          <Tag color={activity.status === 'COMPLETED' ? 'success' : 'processing'}>{activity.code}</Tag>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={1000}
      footer={renderFooter()}
      styles={{ body: { maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' } }}
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          {
            title: 'Kết quả',
            icon: <FileTextOutlined />,
            description: 'Tóm tắt kết quả',
          },
          {
            title: 'Tài liệu',
            icon: <FileExcelOutlined />,
            description: 'Upload file',
          },
          {
            title: 'Điểm danh',
            icon: <TeamOutlined />,
            description: 'So sánh & cập nhật',
          },
        ]}
      />

      {renderStepContent()}
    </Modal>
  )
}

export default ActivityCompletionModal
