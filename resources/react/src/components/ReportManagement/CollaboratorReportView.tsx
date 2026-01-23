import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Input,
  message,
  Typography,
  Tag,
  Tooltip,
  Empty,
  Row,
  Col,
  Statistic,
  Badge,
  Spin,
  Alert,
  Progress,
  Form,
  Divider,
  Upload,
  List,
  Popconfirm,
} from 'antd'
import {
  EyeOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  EditOutlined,
  WarningOutlined,
  SendOutlined,
  UploadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import * as reportBatchApi from '../../services/reportBatchApi'
import type {
  CollaboratorBatch,
  CollaboratorSummary,
  CollaboratorBatchDetail,
  CollaboratorBatchActivity,
  BatchStatus,
  BatchFile,
  CollaboratorFilesByActivity,
} from '../../services/reportBatchApi'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// Draft interface for localStorage
interface ResponseDraft {
  content: string
  difficulties: string
  recommendations: string
  explanation: string
  savedAt: string
}

// Helper to get draft key
const getDraftKey = (batchId: string, activityId: string) =>
  `response_draft_${batchId}_${activityId}`

// Helper to save draft to localStorage
const saveDraft = (batchId: string, activityId: string, draft: Omit<ResponseDraft, 'savedAt'>) => {
  const key = getDraftKey(batchId, activityId)
  const data: ResponseDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(key, JSON.stringify(data))
}

// Helper to load draft from localStorage
const loadDraft = (batchId: string, activityId: string): ResponseDraft | null => {
  const key = getDraftKey(batchId, activityId)
  const data = localStorage.getItem(key)
  if (data) {
    try {
      return JSON.parse(data) as ResponseDraft
    } catch {
      return null
    }
  }
  return null
}

// Helper to clear draft from localStorage
const clearDraft = (batchId: string, activityId: string) => {
  const key = getDraftKey(batchId, activityId)
  localStorage.removeItem(key)
}

function CollaboratorReportView() {
  // List state
  const [batches, setBatches] = useState<CollaboratorBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [searchText, setSearchText] = useState("")

  // Summary state
  const [summary, setSummary] = useState<CollaboratorSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailBatch, setDetailBatch] =
    useState<CollaboratorBatchDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Response form state
  const [responseModalVisible, setResponseModalVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<CollaboratorBatchActivity | null>(null)
  const [responseContent, setResponseContent] = useState('')
  const [responseDifficulties, setResponseDifficulties] = useState('')
  const [responseRecommendations, setResponseRecommendations] = useState('')
  const [responseExplanation, setResponseExplanation] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  // File upload state
  const [ownerFiles, setOwnerFiles] = useState<BatchFile[]>([])
  const [activityFiles, setActivityFiles] = useState<CollaboratorFilesByActivity[]>([])
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([])
  const [uploadFileTitle, setUploadFileTitle] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)

  // Draft state
  const [hasDraft, setHasDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isRestoringDraft, setIsRestoringDraft] = useState(false)

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const response = await reportBatchApi.getCollaboratorSummary()
      setSummary(response.data)
    } catch (error: any) {
      console.error("Failed to fetch summary:", error)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const response = await reportBatchApi.getCollaboratorBatches({
        search: searchText || undefined,
        page: pagination.current,
        per_page: pagination.pageSize
      })
      setBatches(response.data)
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total
      }))
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách đợt báo cáo")
    } finally {
      setLoading(false)
    }
  }, [searchText, pagination.current, pagination.pageSize])

  useEffect(() => {
    fetchSummary()
    fetchBatches()
  }, [fetchBatches, fetchSummary])

  // Fetch batch detail
  const fetchBatchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await reportBatchApi.getCollaboratorBatchDetail(id)
      setDetailBatch(response.data)
      // Also fetch files
      const filesResponse = await reportBatchApi.getBatchFiles(id)
      setOwnerFiles(filesResponse.data.owner_files || [])
      setActivityFiles(filesResponse.data.collaborator_files_by_activity || [])
    } catch (error: any) {
      message.error(error.message || "Không thể tải thông tin đợt báo cáo")
    } finally {
      setDetailLoading(false)
    }
  }

  // Open detail modal
  const handleViewDetail = (record: CollaboratorBatch) => {
    setDetailVisible(true)
    setOwnerFiles([])
    setActivityFiles([])
    fetchBatchDetail(record.id)
  }

  // Get files for specific activity
  const getFilesForActivity = (activityId: string): BatchFile[] => {
    const activityGroup = activityFiles.find(g => g.activity_id === activityId)
    if (!activityGroup) return []
    // Get files from all organizations for this activity
    return activityGroup.organizations.flatMap(org => org.files)
  }

  // Get file icon
  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <FileOutlined />
    if (fileType.includes('pdf')) return <FilePdfOutlined style={{ color: '#f5222d' }} />
    if (fileType.includes('word') || fileType.includes('document')) return <FileWordOutlined style={{ color: '#2f54eb' }} />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />
    return <FileOutlined style={{ color: '#1890ff' }} />
  }

  // Upload file for activity
  const handleUploadFile = async () => {
    if (!detailBatch || !selectedActivity || uploadFileList.length === 0) return

    setUploadingFile(true)
    try {
      const file = uploadFileList[0].originFileObj as File
      // Auto generate title if not provided
      const existingFiles = getFilesForActivity(selectedActivity.id)
      const autoTitle = uploadFileTitle.trim() || `Tài liệu ${existingFiles.length + 1}`

      await reportBatchApi.uploadCollaboratorFile(
        detailBatch.id,
        selectedActivity.id,
        file,
        autoTitle
      )
      message.success('Upload file minh chứng thành công')
      setUploadFileList([])
      setUploadFileTitle('')
      // Reload files
      const filesResponse = await reportBatchApi.getBatchFiles(detailBatch.id)
      setActivityFiles(filesResponse.data.collaborator_files_by_activity || [])
    } catch (error: any) {
      message.error(error.message || 'Upload thất bại')
    } finally {
      setUploadingFile(false)
    }
  }

  // Download file
  const handleDownloadFile = async (file: BatchFile) => {
    if (!detailBatch) return
    try {
      await reportBatchApi.downloadBatchFile(detailBatch.id, file.id, file.file_name)
    } catch (error: any) {
      message.error(error.message || 'Tải file thất bại')
    }
  }

  // Delete file
  const handleDeleteFile = async (file: BatchFile) => {
    if (!detailBatch) return
    try {
      await reportBatchApi.deleteBatchFile(detailBatch.id, file.id)
      message.success('Xóa file thành công')
      // Reload files
      const filesResponse = await reportBatchApi.getBatchFiles(detailBatch.id)
      setActivityFiles(filesResponse.data.collaborator_files_by_activity || [])
    } catch (error: any) {
      message.error(error.message || 'Xóa file thất bại')
    }
  }

  // Auto-save draft effect
  useEffect(() => {
    if (!responseModalVisible || !detailBatch || !selectedActivity) return

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Don't auto-save if restoring draft
    if (isRestoringDraft) return

    // Set new timer to save after 2 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(() => {
      // Get the submitted response values (or empty string if not submitted)
      const submittedContent = selectedActivity.my_response?.content || ''
      const submittedDifficulties = selectedActivity.my_response?.difficulties || ''
      const submittedRecommendations = selectedActivity.my_response?.recommendations || ''
      const submittedExplanation = selectedActivity.my_response?.explanation || ''

      // Check if current values are DIFFERENT from submitted values
      const hasChanges =
        responseContent.trim() !== submittedContent ||
        responseDifficulties.trim() !== submittedDifficulties ||
        responseRecommendations.trim() !== submittedRecommendations ||
        responseExplanation.trim() !== submittedExplanation

      // Only save draft if there are actual changes
      if (hasChanges) {
        saveDraft(detailBatch.id, selectedActivity.id, {
          content: responseContent,
          difficulties: responseDifficulties,
          recommendations: responseRecommendations,
          explanation: responseExplanation,
        })
        setDraftSavedAt(new Date().toISOString())
        setHasDraft(true)
      } else {
        // No changes from submitted - clear any existing draft
        clearDraft(detailBatch.id, selectedActivity.id)
        setHasDraft(false)
        setDraftSavedAt(null)
      }
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [responseContent, responseDifficulties, responseRecommendations, responseExplanation,
    responseModalVisible, detailBatch, selectedActivity, isRestoringDraft])

  // Open response form
  const handleOpenResponseForm = (activity: CollaboratorBatchActivity) => {
    if (!detailBatch) return

    setSelectedActivity(activity)
    setIsRestoringDraft(true)

    // Check for existing draft
    const draft = loadDraft(detailBatch.id, activity.id)

    if (draft && !activity.my_response) {
      // Has draft and no submitted response - ask to restore
      Modal.confirm({
        title: 'Khôi phục bản nháp?',
        content: (
          <div>
            <p>Bạn có bản nháp chưa gửi từ {dayjs(draft.savedAt).format('DD/MM/YYYY HH:mm')}.</p>
            <p>Bạn muốn khôi phục bản nháp này không?</p>
          </div>
        ),
        okText: 'Khôi phục',
        cancelText: 'Bỏ qua',
        onOk: () => {
          setResponseContent(draft.content)
          setResponseDifficulties(draft.difficulties)
          setResponseRecommendations(draft.recommendations)
          setResponseExplanation(draft.explanation)
          setHasDraft(true)
          setDraftSavedAt(draft.savedAt)
          setIsRestoringDraft(false)
          setResponseModalVisible(true)
        },
        onCancel: () => {
          // Clear old draft and use empty/existing response
          clearDraft(detailBatch.id, activity.id)
          setResponseContent(activity.my_response?.content || '')
          setResponseDifficulties(activity.my_response?.difficulties || '')
          setResponseRecommendations(activity.my_response?.recommendations || '')
          setResponseExplanation(activity.my_response?.explanation || '')
          setHasDraft(false)
          setDraftSavedAt(null)
          setIsRestoringDraft(false)
          setResponseModalVisible(true)
        },
      })
    } else if (draft && activity.my_response) {
      // Has draft and has submitted response - check if draft is newer
      const draftTime = new Date(draft.savedAt).getTime()
      const submitTime = activity.my_response.submitted_at
        ? new Date(activity.my_response.submitted_at).getTime()
        : 0

      if (draftTime > submitTime) {
        // Draft is newer than submitted response
        Modal.confirm({
          title: 'Khôi phục bản nháp?',
          content: (
            <div>
              <p>Bạn có bản nháp mới hơn báo cáo đã gửi từ {dayjs(draft.savedAt).format('DD/MM/YYYY HH:mm')}.</p>
              <p>Bạn muốn khôi phục bản nháp này không?</p>
            </div>
          ),
          okText: 'Khôi phục',
          cancelText: 'Dùng bản đã gửi',
          onOk: () => {
            setResponseContent(draft.content)
            setResponseDifficulties(draft.difficulties)
            setResponseRecommendations(draft.recommendations)
            setResponseExplanation(draft.explanation)
            setHasDraft(true)
            setDraftSavedAt(draft.savedAt)
            setIsRestoringDraft(false)
            setResponseModalVisible(true)
          },
          onCancel: () => {
            clearDraft(detailBatch.id, activity.id)
            setResponseContent(activity.my_response?.content || '')
            setResponseDifficulties(activity.my_response?.difficulties || '')
            setResponseRecommendations(activity.my_response?.recommendations || '')
            setResponseExplanation(activity.my_response?.explanation || '')
            setHasDraft(false)
            setDraftSavedAt(null)
            setIsRestoringDraft(false)
            setResponseModalVisible(true)
          },
        })
      } else {
        // Submitted response is newer, use it
        clearDraft(detailBatch.id, activity.id)
        setResponseContent(activity.my_response?.content || '')
        setResponseDifficulties(activity.my_response?.difficulties || '')
        setResponseRecommendations(activity.my_response?.recommendations || '')
        setResponseExplanation(activity.my_response?.explanation || '')
        setHasDraft(false)
        setDraftSavedAt(null)
        setIsRestoringDraft(false)
        setResponseModalVisible(true)
      }
    } else {
      // No draft, use existing response or empty
      setResponseContent(activity.my_response?.content || '')
      setResponseDifficulties(activity.my_response?.difficulties || '')
      setResponseRecommendations(activity.my_response?.recommendations || '')
      setResponseExplanation(activity.my_response?.explanation || '')
      setHasDraft(false)
      setDraftSavedAt(null)
      setIsRestoringDraft(false)
      setResponseModalVisible(true)
    }
  }

  // Submit response
  const handleSubmitResponse = async () => {
    if (!detailBatch || !selectedActivity) return

    if (!responseContent.trim()) {
      message.warning("Vui lòng nhập nội dung báo cáo")
      return
    }

    // Check if explanation is required (overdue)
    if (selectedActivity.requires_explanation && !responseExplanation.trim()) {
      message.warning('Vui lòng nhập nội dung giải trình vì đã quá hạn nộp báo cáo')
      return
    }

    setSubmittingResponse(true)
    try {
      await reportBatchApi.submitCollaboratorResponse(detailBatch.id, {
        activity_id: selectedActivity.id,
        content: responseContent.trim(),
        difficulties: responseDifficulties.trim() || undefined,
        recommendations: responseRecommendations.trim() || undefined,
        explanation: responseExplanation.trim() || undefined,
      })
      message.success('Đã gửi báo cáo thành công')
      // Clear draft after successful submit
      clearDraft(detailBatch.id, selectedActivity.id)
      setHasDraft(false)
      setDraftSavedAt(null)
      setResponseModalVisible(false)
      setSelectedActivity(null)
      setResponseContent('')
      setResponseDifficulties('')
      setResponseRecommendations('')
      setResponseExplanation('')
      // Refresh detail
      fetchBatchDetail(detailBatch.id)
      // Refresh summary
      fetchSummary()
      fetchBatches()
    } catch (error: any) {
      message.error(error.message || "Không thể gửi báo cáo")
    } finally {
      setSubmittingResponse(false)
    }
  }

  // Handle close response modal with warnings
  const handleCloseResponseModal = () => {
    // Check if there's a file selected but not uploaded
    if (uploadFileList.length > 0) {
      Modal.confirm({
        title: 'Có file chưa upload',
        content: 'Bạn đã chọn file nhưng chưa upload. File sẽ bị mất nếu đóng form. Bạn có muốn tiếp tục?',
        okText: 'Đóng form',
        cancelText: 'Quay lại',
        okButtonProps: { danger: true },
        onOk: () => {
          closeResponseModal()
        },
      })
      return
    }

    // Check if there are unsaved changes
    const hasUnsavedChanges = detailBatch && selectedActivity && (
      responseContent.trim() !== (selectedActivity.my_response?.content || '') ||
      responseDifficulties.trim() !== (selectedActivity.my_response?.difficulties || '') ||
      responseRecommendations.trim() !== (selectedActivity.my_response?.recommendations || '') ||
      responseExplanation.trim() !== (selectedActivity.my_response?.explanation || '')
    )

    if (hasUnsavedChanges) {
      Modal.confirm({
        title: 'Có thay đổi chưa lưu',
        content: 'Nội dung đã nhập sẽ được lưu tạm. Bạn có thể tiếp tục sau.',
        okText: 'Đóng form',
        cancelText: 'Tiếp tục nhập',
        onOk: () => {
          // Draft is auto-saved, just close
          closeResponseModal()
        },
      })
      return
    }

    closeResponseModal()
  }

  // Actually close the modal
  const closeResponseModal = () => {
    setResponseModalVisible(false)
    setSelectedActivity(null)
    setResponseContent('')
    setResponseDifficulties('')
    setResponseRecommendations('')
    setResponseExplanation('')
    setUploadFileList([])
    setUploadFileTitle('')
    setHasDraft(false)
    setDraftSavedAt(null)
  }

  // Status tag colors
  const getStatusTag = (status: BatchStatus) => {
    const config: Record<
      BatchStatus,
      { color: string; icon: React.ReactNode; label: string }
    > = {
      upcoming: {
        color: "default",
        icon: <ClockCircleOutlined />,
        label: "Sắp tới"
      },
      ongoing: {
        color: "processing",
        icon: <ClockCircleOutlined />,
        label: "Đang diễn ra"
      },
      completed: {
        color: "success",
        icon: <CheckCircleOutlined />,
        label: "Kết thúc"
      }
    }
    const { color, icon, label } = config[status] || config.upcoming
    return (
      <Tag color={color} icon={icon}>
        {label}
      </Tag>
    )
  }

  // Table columns
  const columns: ColumnsType<CollaboratorBatch> = [
    {
      title: "STT",
      key: "index",
      width: 50,
      align: "center",
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1
    },
    {
      title: "Tên đợt báo cáo",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Space>
            <Text
              strong
              style={{ cursor: "pointer" }}
              onClick={() => handleViewDetail(record)}>
              {name}
            </Text>
            {record.my_response_stats &&
              record.my_response_stats.pending > 0 &&
              !record.is_overdue && <Badge dot color="orange" />}
            {record.is_overdue &&
              record.my_response_stats &&
              record.my_response_stats.pending > 0 && <Badge dot color="red" />}
          </Space>
          {record.organization && (
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              <TeamOutlined style={{ marginRight: 4 }} />
              {record.organization.short_name || record.organization.name}
            </Text>
          )}
        </div>
      )
    },
    {
      title: "Hạn nộp",
      key: "deadline",
      width: 130,
      render: (_, record) => {
        if (!record.deadline) return <Text type="secondary">Không có hạn</Text>
        const isOverdue = dayjs().isAfter(dayjs(record.deadline))
        return (
          <Tooltip title={dayjs(record.deadline).format("DD/MM/YYYY HH:mm")}>
            <Tag
              icon={
                isOverdue ? <ExclamationCircleOutlined /> : <CalendarOutlined />
              }
              color={isOverdue ? "error" : "warning"}>
              {dayjs(record.deadline).format("DD/MM/YY HH:mm")}
            </Tag>
          </Tooltip>
        )
      }
    },
    {
      title: "Tiến độ",
      key: "progress",
      width: 150,
      render: (_, record) => {
        if (!record.my_response_stats) return "-"
        const { submitted, total_required, pending } = record.my_response_stats
        const percent =
          total_required > 0
            ? Math.round((submitted / total_required) * 100)
            : 0
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={
                percent === 100
                  ? "success"
                  : record.is_overdue
                    ? "exception"
                    : "active"
              }
              format={() => `${submitted}/${total_required}`}
            />
            {pending > 0 && (
              <Text
                type={record.is_overdue ? "danger" : "warning"}
                style={{ fontSize: 11 }}>
                {record.is_overdue ? "Quá hạn" : `Còn ${pending} chưa nộp`}
              </Text>
            )}
          </div>
        )
      }
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: BatchStatus) => getStatusTag(status)
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết & Nhập báo cáo">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleViewDetail(record)}
              disabled={
                record.is_overdue && record.my_response_stats?.pending === 0
              }>
              Báo cáo
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" loading={summaryLoading}>
            <Statistic
              title={
                <Space>
                  <Badge status="warning" />
                  <span>Cần hoàn thành</span>
                </Space>
              }
              value={summary?.pending || 0}
              valueStyle={{ color: "#faad14" }}
              suffix="đợt"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={summaryLoading}>
            <Statistic
              title={
                <Space>
                  <Badge status="error" />
                  <span>Quá hạn</span>
                </Space>
              }
              value={summary?.overdue || 0}
              valueStyle={{ color: "#ff4d4f" }}
              suffix="đợt"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={summaryLoading}>
            <Statistic
              title={
                <Space>
                  <Badge status="success" />
                  <span>Đã hoàn thành</span>
                </Space>
              }
              value={summary?.completed || 0}
              valueStyle={{ color: "#52c41a" }}
              suffix="đợt"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={summaryLoading}>
            <Statistic
              title={
                <Space>
                  <Badge status="default" />
                  <span>Tổng cộng</span>
                </Space>
              }
              value={summary?.total || 0}
              suffix="đợt"
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm kiếm theo tên đợt báo cáo..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchBatches()
                fetchSummary()
              }}
              loading={loading}>
              {t("common.refresh")}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={batches}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} đợt`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize
              }))
            }
          }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có đợt báo cáo nào cần bạn nhập"
              />
            )
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            <span>Chi tiết đợt báo cáo - Nhập kết quả</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false)
          setDetailBatch(null)
        }}
        width={1100}
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
              Đơn vị yêu cầu:{" "}
              <Text strong>
                {detailBatch?.organization?.short_name ||
                  detailBatch?.organization?.name}
              </Text>
            </Text>
            <Button onClick={() => setDetailVisible(false)}>Đóng</Button>
          </div>
        }>
        <Spin spinning={detailLoading}>
          {detailBatch && (
            <>
              {/* Overdue Alert */}
              {detailBatch.is_overdue && (
                <Alert
                  type="warning"
                  message="Đã quá hạn nộp báo cáo"
                  description={`Hạn nộp: ${dayjs(detailBatch.deadline).format('DD/MM/YYYY HH:mm')}. Bạn vẫn có thể nộp báo cáo nhưng cần nhập nội dung giải trình.`}
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              <Row gutter={24}>
                {/* Left Column - Batch Info (Read-only) */}
                <Col span={8}>
                  <div
                    style={{
                      background: "#fafafa",
                      padding: 16,
                      borderRadius: 8,
                      height: "100%"
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16
                      }}>
                      <Title level={5} style={{ margin: 0 }}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        Thông tin đợt
                      </Title>
                      {getStatusTag(detailBatch.status)}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Tên đợt báo cáo
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text strong>{detailBatch.name}</Text>
                      </div>
                    </div>

                    {detailBatch.start_date && detailBatch.end_date && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Thời gian
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag icon={<CalendarOutlined />} color="blue">
                            {dayjs(detailBatch.start_date).format(
                              "DD/MM/YYYY HH:mm"
                            )}{" "}
                            -{" "}
                            {dayjs(detailBatch.end_date).format(
                              "DD/MM/YYYY HH:mm"
                            )}
                          </Tag>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Hạn nộp
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {detailBatch.deadline ? (
                          <Tag
                            icon={
                              detailBatch.is_overdue ? (
                                <ExclamationCircleOutlined />
                              ) : (
                                <ClockCircleOutlined />
                              )
                            }
                            color={detailBatch.is_overdue ? "error" : "orange"}>
                            {dayjs(detailBatch.deadline).format(
                              "DD/MM/YYYY HH:mm"
                            )}
                            {detailBatch.is_overdue && " (Quá hạn)"}
                          </Tag>
                        ) : (
                          <Text type="secondary">Không có hạn</Text>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {detailBatch.my_response_stats && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Tiến độ của bạn
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          <Progress
                            percent={Math.round(
                              (detailBatch.my_response_stats.submitted /
                                detailBatch.my_response_stats.total_required) *
                                100
                            )}
                            status={
                              detailBatch.my_response_stats.pending === 0
                                ? "success"
                                : "active"
                            }
                          />
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Đã nộp {detailBatch.my_response_stats.submitted}/
                            {detailBatch.my_response_stats.total_required} hoạt
                            động
                          </Text>
                        </div>
                      </div>
                    )}

                    {detailBatch.description && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Mô tả
                        </Text>
                        <div
                          style={{
                            marginTop: 4,
                            padding: "8px",
                            background: "#fff",
                            borderRadius: 4,
                            fontSize: 12
                          }}>
                          {detailBatch.description}
                        </div>
                      </div>
                    )}

                    {detailBatch.notes && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú</Text>
                        <div style={{ marginTop: 4, padding: '8px', background: '#fff', borderRadius: 4, fontSize: 12 }}>
                          {detailBatch.notes}
                        </div>
                      </div>
                    )}

                    {/* Owner Files (Văn bản giao nhiệm vụ) - Read only */}
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <PaperClipOutlined style={{ marginRight: 4 }} />
                        Văn bản giao nhiệm vụ
                      </Text>
                      <div style={{ marginTop: 4, padding: '8px', background: '#fff', borderRadius: 4 }}>
                        {ownerFiles.length > 0 ? (
                          ownerFiles.map(file => (
                            <div key={file.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '4px 0'
                            }}>
                              {getFileIcon(file.file_type)}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Tooltip title={file.title || file.file_name}>
                                  <Text strong style={{
                                    display: 'block',
                                    fontSize: 12,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {file.title || 'Văn bản giao nhiệm vụ'}
                                  </Text>
                                </Tooltip>
                                <Tooltip title={file.file_name}>
                                  <Text type="secondary" style={{
                                    display: 'block',
                                    fontSize: 10,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {file.file_name} ({file.file_size_formatted})
                                  </Text>
                                </Tooltip>
                              </div>
                              <Tooltip title="Tải xuống">
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<DownloadOutlined />}
                                  onClick={() => handleDownloadFile(file)}
                                  style={{ padding: '0 4px' }}
                                />
                              </Tooltip>
                            </div>
                          ))
                        ) : (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Chưa có văn bản giao nhiệm vụ
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Right Column - Activities to Report */}
                <Col span={16}>
                  <div
                    style={{
                      border: "1px solid #d9d9d9",
                      borderRadius: 8,
                      overflow: "hidden",
                      height: "100%"
                    }}>
                    <div
                      style={{
                        background: "#e6f7ff",
                        padding: "10px 14px",
                        borderBottom: "1px solid #d9d9d9",
                        fontWeight: 500
                      }}>
                      <Space>
                        <UnorderedListOutlined />
                        <span>Các hoạt động cần báo cáo</span>
                        <Badge
                          count={detailBatch.activities?.length || 0}
                          style={{ backgroundColor: "#1890ff" }}
                        />
                      </Space>
                    </div>

                    <div style={{ maxHeight: 450, overflow: "auto" }}>
                      {detailBatch.activities &&
                      detailBatch.activities.length > 0 ? (
                        detailBatch.activities.map((activity, idx) => (
                          <div
                            key={activity.id}
                            style={{
                              padding: "12px 14px",
                              background: idx % 2 === 0 ? "#fafafa" : "#fff",
                              borderBottom:
                                idx < detailBatch.activities!.length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none"
                            }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start"
                              }}>
                              <div style={{ flex: 1 }}>
                                <Space>
                                  <Text strong style={{ fontSize: 13 }}>
                                    {idx + 1}. {activity.title}
                                  </Text>
                                  {activity.my_response ? (
                                    <Tag
                                      color="success"
                                      icon={<CheckCircleOutlined />}>
                                      Đã nộp
                                    </Tag>
                                  ) : (
                                    <Tag
                                      color="warning"
                                      icon={<ClockCircleOutlined />}>
                                      Chưa nộp
                                    </Tag>
                                  )}
                                </Space>
                                <div style={{ marginTop: 4 }}>
                                  <Space size={8}>
                                    <Tag color="blue" style={{ fontSize: 10 }}>
                                      {activity.lead_organization?.short_name ||
                                        activity.lead_organization?.name}
                                    </Tag>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: 11 }}>
                                      {dayjs(activity.start_date).format(
                                        "DD/MM/YY"
                                      )}{" "}
                                      -{" "}
                                      {dayjs(activity.end_date).format(
                                        "DD/MM/YY"
                                      )}
                                    </Text>
                                  </Space>
                                </div>

                                {/* Show existing response */}
                                {activity.my_response && (
                                  <div style={{
                                    marginTop: 8,
                                    padding: '8px 10px',
                                    background: activity.my_response.is_overdue_submission ? '#fff2e8' : '#f6ffed',
                                    borderRadius: 4,
                                    borderLeft: `3px solid ${activity.my_response.is_overdue_submission ? '#fa8c16' : '#52c41a'}`
                                  }}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        <UserOutlined style={{ marginRight: 4 }} />
                                        {activity.my_response.submitted_by?.first_name} {activity.my_response.submitted_by?.last_name}
                                        {' • '}
                                        {dayjs(activity.my_response.submitted_at).format('DD/MM/YY HH:mm')}
                                        {activity.my_response.is_overdue_submission && (
                                          <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>Nộp quá hạn</Tag>
                                        )}
                                      </Text>
                                    </div>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text strong style={{ fontSize: 11 }}>Nội dung báo cáo:</Text>
                                      <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>{activity.my_response.content}</Text>
                                    </div>
                                    {activity.my_response.difficulties && (
                                      <div style={{ marginTop: 6 }}>
                                        <Text strong style={{ fontSize: 11, color: '#d46b08' }}>Khó khăn/vướng mắc:</Text>
                                        <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>{activity.my_response.difficulties}</Text>
                                      </div>
                                    )}
                                    {activity.my_response.recommendations && (
                                      <div style={{ marginTop: 6 }}>
                                        <Text strong style={{ fontSize: 11, color: '#1890ff' }}>Đề xuất/kiến nghị:</Text>
                                        <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>{activity.my_response.recommendations}</Text>
                                      </div>
                                    )}
                                    {activity.my_response.explanation && (
                                      <div style={{ marginTop: 6 }}>
                                        <Text strong style={{ fontSize: 11, color: '#fa541c' }}>Giải trình:</Text>
                                        <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>{activity.my_response.explanation}</Text>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Show uploaded files for this activity */}
                                {getFilesForActivity(activity.id).length > 0 && (
                                  <div style={{
                                    marginTop: 8,
                                    padding: '6px 10px',
                                    background: '#fff7e6',
                                    borderRadius: 4,
                                    borderLeft: '3px solid #faad14'
                                  }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
                                      <PaperClipOutlined style={{ marginRight: 4 }} />
                                      File minh chứng ({getFilesForActivity(activity.id).length})
                                    </Text>
                                    {getFilesForActivity(activity.id).map(file => (
                                      <div key={file.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '2px 0'
                                      }}>
                                        {getFileIcon(file.file_type)}
                                        <Tooltip title={file.title || file.file_name}>
                                          <Text style={{
                                            flex: 1,
                                            fontSize: 11,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 180
                                          }}>
                                            {file.title || file.file_name}
                                          </Text>
                                        </Tooltip>
                                        <Tooltip title="Tải xuống">
                                          <Button
                                            type="link"
                                            size="small"
                                            icon={<DownloadOutlined />}
                                            onClick={() => handleDownloadFile(file)}
                                            style={{ padding: 0, height: 'auto' }}
                                          />
                                        </Tooltip>
                                        {activity.can_submit && (
                                          <Popconfirm
                                            title="Xóa file này?"
                                            onConfirm={() => handleDeleteFile(file)}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                          >
                                            <Button
                                              type="link"
                                              size="small"
                                              danger
                                              icon={<DeleteOutlined />}
                                              style={{ padding: 0, height: 'auto' }}
                                            />
                                          </Popconfirm>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <Space direction="vertical" size={4}>
                                  <Button
                                    type={
                                      activity.my_response
                                        ? "default"
                                        : "primary"
                                    }
                                    size="small"
                                    icon={activity.my_response ? <EditOutlined /> : <SendOutlined />}
                                    onClick={() => handleOpenResponseForm(activity)}
                                    danger={activity.requires_explanation && !activity.my_response}
                                  >
                                    {activity.my_response ? 'Sửa' : activity.requires_explanation ? 'Nộp quá hạn' : 'Nhập báo cáo'}
                                  </Button>
                                  {activity.requires_explanation && !activity.my_response && (
                                    <Text type="danger" style={{ fontSize: 10 }}>
                                      <WarningOutlined /> Quá hạn
                                    </Text>
                                  )}
                                </Space>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Không có hoạt động nào cần báo cáo"
                          style={{ marginTop: 80 }}
                        />
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Spin>
      </Modal>

      {/* Response Form Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: "#52c41a" }} />
            <span>
              {selectedActivity?.my_response
                ? "Chỉnh sửa báo cáo"
                : "Nhập nội dung báo cáo"}
            </span>
          </Space>
        }
        open={responseModalVisible}
        onCancel={handleCloseResponseModal}
        width={700}
        centered
        okText={selectedActivity?.my_response ? "Cập nhật" : "Gửi báo cáo"}
        okButtonProps={{ loading: submittingResponse, icon: <SendOutlined /> }}
        onOk={handleSubmitResponse}
        cancelText="Hủy">
        {selectedActivity && (
          <div>
            {/* Activity Info */}
            <div
              style={{
                background: "#e6f7ff",
                padding: "10px 12px",
                borderRadius: 4,
                marginBottom: 16
              }}>
              <Text strong style={{ fontSize: 13 }}>
                {selectedActivity.title}
              </Text>
              <div style={{ marginTop: 4 }}>
                <Space>
                  <Tag color="blue" style={{ fontSize: 10 }}>
                    {selectedActivity.lead_organization?.short_name ||
                      selectedActivity.lead_organization?.name}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(selectedActivity.start_date).format("DD/MM/YYYY")} -{" "}
                    {dayjs(selectedActivity.end_date).format("DD/MM/YYYY")}
                  </Text>
                </Space>
              </div>
            </div>

            {/* Draft Saved Notice */}
            {hasDraft && draftSavedAt && (
              <Alert
                type="info"
                message={
                  <Space>
                    <CheckCircleOutlined />
                    <span>Đã lưu tạm lúc {dayjs(draftSavedAt).format('HH:mm:ss')}</span>
                  </Space>
                }
                style={{ marginBottom: 12, padding: '4px 12px' }}
                banner
              />
            )}

            {/* Overdue Alert */}
            {selectedActivity.requires_explanation && (
              <Alert
                type="warning"
                message="Đã quá hạn nộp báo cáo"
                description="Bạn vẫn có thể nộp báo cáo nhưng cần nhập nội dung giải trình."
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Response Input */}
            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>
                Nội dung báo cáo: <Text type="danger">*</Text>
              </Text>
              <TextArea
                rows={4}
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Nhập nội dung kết quả hoạt động mà đơn vị bạn đã thực hiện..."
                maxLength={5000}
                showCount
              />
            </div>

            {/* Difficulties Input */}
            <div style={{ marginTop: 16 }}>
              <Text style={{ marginBottom: 8, display: 'block' }}>
                Khó khăn/vướng mắc:
              </Text>
              <TextArea
                rows={2}
                value={responseDifficulties}
                onChange={(e) => setResponseDifficulties(e.target.value)}
                placeholder="Nhập các khó khăn, vướng mắc trong quá trình thực hiện (nếu có)..."
                maxLength={3000}
                showCount
              />
            </div>

            {/* Recommendations Input */}
            <div style={{ marginTop: 16 }}>
              <Text style={{ marginBottom: 8, display: 'block' }}>
                Đề xuất/kiến nghị:
              </Text>
              <TextArea
                rows={2}
                value={responseRecommendations}
                onChange={(e) => setResponseRecommendations(e.target.value)}
                placeholder="Nhập các đề xuất, kiến nghị (nếu có)..."
                maxLength={3000}
                showCount
              />
            </div>

            {/* Explanation Input (required if overdue) */}
            {selectedActivity.requires_explanation && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ marginBottom: 8, display: 'block' }}>
                  Nội dung giải trình: <Text type="danger">*</Text>
                </Text>
                <TextArea
                  rows={3}
                  value={responseExplanation}
                  onChange={(e) => setResponseExplanation(e.target.value)}
                  placeholder="Vui lòng giải trình lý do nộp báo cáo quá hạn..."
                  maxLength={3000}
                  showCount
                  status={!responseExplanation.trim() ? 'error' : undefined}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Bắt buộc nhập vì đã quá hạn nộp báo cáo
                </Text>
              </div>
            )}

            {/* File Upload Section */}
            <Divider style={{ margin: '16px 0 12px' }} />
            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>
                <PaperClipOutlined style={{ marginRight: 4 }} />
                File minh chứng cho hoạt động này:
              </Text>

              {/* Existing files for this activity */}
              {getFilesForActivity(selectedActivity.id).length > 0 && (
                <div style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 4,
                  border: '1px solid #f0f0f0'
                }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                    Đã upload ({getFilesForActivity(selectedActivity.id).length} file):
                  </Text>
                  {getFilesForActivity(selectedActivity.id).map(file => (
                    <div key={file.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}>
                      {getFileIcon(file.file_type)}
                      <Tooltip title={file.file_name}>
                        <Text style={{
                          flex: 1,
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {file.title || file.file_name}
                        </Text>
                      </Tooltip>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {file.file_size_formatted}
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadFile(file)}
                        style={{ padding: '0 4px' }}
                      />
                      <Popconfirm
                        title="Xóa file này?"
                        onConfirm={() => handleDeleteFile(file)}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ padding: '0 4px' }}
                        />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new file */}
              <div style={{ marginTop: 8 }}>
                <Input
                  placeholder={`Tên tài liệu (mặc định: Tài liệu ${getFilesForActivity(selectedActivity.id).length + 1})`}
                  value={uploadFileTitle}
                  onChange={(e) => setUploadFileTitle(e.target.value)}
                  style={{ marginBottom: 8 }}
                  size="small"
                />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Upload
                    beforeUpload={() => false}
                    fileList={uploadFileList}
                    onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
                    maxCount={1}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />} size="small">Chọn file</Button>
                  </Upload>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleUploadFile}
                    loading={uploadingFile}
                    disabled={uploadFileList.length === 0}
                  >
                    Upload
                  </Button>
                </div>
                {uploadFileList.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: '#fff7e6',
                    borderRadius: 4,
                    marginTop: 8,
                    border: '1px solid #ffd591'
                  }}>
                    <WarningOutlined style={{ color: '#fa8c16' }} />
                    <FileOutlined style={{ color: '#1890ff' }} />
                    <Tooltip title={uploadFileList[0].name}>
                      <Text style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12
                      }}>
                        {uploadFileList[0].name}
                      </Text>
                    </Tooltip>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleUploadFile}
                      loading={uploadingFile}
                      style={{ fontSize: 11 }}
                    >
                      Upload ngay
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => setUploadFileList([])}
                      style={{ padding: '0 4px', fontSize: 12 }}
                    >
                      Hủy
                    </Button>
                  </div>
                )}
                {uploadFileList.length > 0 && (
                  <Alert
                    type="warning"
                    message="Bạn đã chọn file nhưng chưa upload. Nhấn 'Upload ngay' hoặc file sẽ bị mất khi đóng form."
                    style={{ marginTop: 8, padding: '4px 10px', fontSize: 11 }}
                    banner
                  />
                )}
                {uploadFileList.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                    Có thể upload nhiều file minh chứng cho hoạt động này.
                  </Text>
                )}
              </div>
            </div>

            {selectedActivity.my_response && (
              <Alert
                type="info"
                message="Bạn đã nộp báo cáo trước đó. Nội dung mới sẽ thay thế nội dung cũ."
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CollaboratorReportView
