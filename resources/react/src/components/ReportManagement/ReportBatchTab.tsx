import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Typography,
  Tag,
  Popconfirm,
  Tooltip,
  Empty,
  Row,
  Col,
  Select,
  Divider,
  Badge,
  List,
  Checkbox,
  Spin,
  Segmented,
  Popover,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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
  ApartmentOutlined,
  RightOutlined,
  DownOutlined,
  FormOutlined,
  BellOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  HistoryOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import * as reportBatchApi from '../../services/reportBatchApi'
import type {
  ReportBatch,
  BatchActivity,
  BatchStatus,
  CreateBatchData,
  UpdateBatchData,
  KpiCategoryWithActivities,
  KpiActivityItem,
  CollaboratorResponse,
  CollaboratorSummary,
  ExportHistoryItem,
  ExportPreviewResponse,
  ActivityPreview,
  CollaboratorResponseGrouped,
  ExportPreviewStatistics,
} from '../../services/reportBatchApi'
import CollaboratorReportView from './CollaboratorReportView'
import BatchFilesSection from './BatchFilesSection'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker
const { Option } = Select

type ViewMode = 'my_batches' | 'need_to_report'

// Helper component to render collaborating organizations with "see more" popover
interface CollaboratingOrgsDisplayProps {
  organizations: Array<{ id: string; name: string; short_name?: string }>
  maxShow?: number
  fontSize?: number
  iconSize?: number
}

function CollaboratingOrgsDisplay({
  organizations,
  maxShow = 2,
  fontSize = 10,
  iconSize = 10
}: CollaboratingOrgsDisplayProps) {
  if (!organizations || organizations.length === 0) return null

  const visibleOrgs = organizations.slice(0, maxShow)
  const hiddenOrgs = organizations.slice(maxShow)
  const hasMore = hiddenOrgs.length > 0

  const fullListContent = (
    <div style={{ maxWidth: 300 }}>
      <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
        <TeamOutlined style={{ marginRight: 4 }} />
        Danh sách đơn vị phối hợp ({organizations.length})
      </Text>
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {organizations.map((org, idx) => (
          <Tag
            key={org.id}
            color="green"
            style={{ margin: '2px 4px 2px 0', fontSize: 11 }}
          >
            {idx + 1}. {org.short_name || org.name}
          </Tag>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: 2 }}>
      <TeamOutlined style={{ fontSize: iconSize, color: '#52c41a', marginRight: 2 }} />
      <Text type="secondary" style={{ fontSize, color: '#52c41a' }}>
        {visibleOrgs.map(org => org.short_name || org.name).join(', ')}
      </Text>
      {hasMore && (
        <Popover
          content={fullListContent}
          title={null}
          trigger="click"
          placement="right"
        >
          <Tag
            color="green"
            style={{
              fontSize: fontSize - 1,
              cursor: 'pointer',
              marginLeft: 4,
              padding: '0 4px',
              lineHeight: '16px'
            }}
          >
            +{hiddenOrgs.length}
          </Tag>
        </Popover>
      )}
    </div>
  )
}

interface ReportBatchTabProps {
  canDelete?: boolean
}

function ReportBatchTab({ canDelete = false }: ReportBatchTabProps) {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('report_batch_view_mode')
    return (saved as ViewMode) || 'my_batches'
  })

  // Collaborator summary for badge
  const [collaboratorSummary, setCollaboratorSummary] = useState<CollaboratorSummary | null>(null)

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('report_batch_view_mode', viewMode)
  }, [viewMode])

  // Fetch collaborator summary for badge
  useEffect(() => {
    const fetchCollaboratorSummary = async () => {
      try {
        const response = await reportBatchApi.getCollaboratorSummary()
        setCollaboratorSummary(response.data)
      } catch (error) {
        console.error('Failed to fetch collaborator summary:', error)
      }
    }
    fetchCollaboratorSummary()
  }, [])

  // List state
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  // statusFilter is no longer used since status is calculated from dates
  const [searchText, setSearchText] = useState('')

  // Form state
  const [formVisible, setFormVisible] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ReportBatch | null>(null)
  const [form] = Form.useForm()

  // File upload state for owner document
  const [ownerFileList, setOwnerFileList] = useState<UploadFile[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailBatch, setDetailBatch] = useState<ReportBatch | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Activity selection state
  const [availableActivities, setAvailableActivities] = useState<BatchActivity[]>([])
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([])
  const [activitySearchText, setActivitySearchText] = useState('')
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // View mode for activity selector: 'list' or 'kpi'
  const [activityViewMode, setActivityViewMode] = useState<'list' | 'kpi'>('kpi')
  const [kpiCategories, setKpiCategories] = useState<KpiCategoryWithActivities[]>([])
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [expandedKpis, setExpandedKpis] = useState<string[]>([])

  // Export states
  const [exportPreviewVisible, setExportPreviewVisible] = useState(false)
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false)
  const [exportPreviewData, setExportPreviewData] = useState<ExportPreviewResponse['data'] | null>(null)
  const [activePreviewTab, setActivePreviewTab] = useState<'activities' | 'responses'>('activities')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportHistoryVisible, setExportHistoryVisible] = useState(false)
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([])
  const [exportHistoryLoading, setExportHistoryLoading] = useState(false)
  const [currentExportBatchId, setCurrentExportBatchId] = useState<string>('')

  // Helper: Get all activities from both sources (list view + KPI view)
  const getAllActivitiesMap = useCallback((): Map<string, BatchActivity | KpiActivityItem> => {
    const map = new Map<string, BatchActivity | KpiActivityItem>()

    // From list view
    availableActivities.forEach(a => map.set(a.id, a))

    // From KPI view
    kpiCategories.forEach(category => {
      category.kpis.forEach(kpi => {
        kpi.activities.forEach(a => {
          if (!map.has(a.id)) {
            map.set(a.id, a)
          }
        })
      })
    })

    return map
  }, [availableActivities, kpiCategories])

  // Get selected activities with full data
  const getSelectedActivities = useCallback((): (BatchActivity | KpiActivityItem)[] => {
    const activitiesMap = getAllActivitiesMap()
    return selectedActivityIds
      .map(id => activitiesMap.get(id))
      .filter((a): a is BatchActivity | KpiActivityItem => a !== undefined)
  }, [selectedActivityIds, getAllActivitiesMap])

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const response = await reportBatchApi.getReportBatches({
        search: searchText || undefined,
        page: pagination.current,
        per_page: pagination.pageSize,
      })
      setBatches(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách đợt báo cáo')
    } finally {
      setLoading(false)
    }
  }, [searchText, pagination.current, pagination.pageSize])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Fetch batch detail
  const fetchBatchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await reportBatchApi.getReportBatch(id)
      setDetailBatch(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin đợt báo cáo')
    } finally {
      setDetailLoading(false)
    }
  }

  // Fetch available activities (list view)
  const fetchAvailableActivities = async () => {
    setActivitiesLoading(true)
    try {
      const response = await reportBatchApi.getAvailableActivities({
        search: activitySearchText || undefined,
        exclude_batch_id: editingBatch?.id,
      })
      setAvailableActivities(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động')
    } finally {
      setActivitiesLoading(false)
    }
  }

  // Fetch activities by KPI (KPI view)
  const fetchActivitiesByKpi = async () => {
    setActivitiesLoading(true)
    try {
      const response = await reportBatchApi.getActivitiesByKpi()
      setKpiCategories(response.data)
      // Expand all categories by default
      setExpandedCategories(response.data.map(c => c.id))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động theo KPI')
    } finally {
      setActivitiesLoading(false)
    }
  }

  // Load activities when form modal opens
  useEffect(() => {
    if (formVisible) {
      if (activityViewMode === 'list') {
        fetchAvailableActivities()
      } else {
        fetchActivitiesByKpi()
      }
    }
  }, [formVisible, activityViewMode])

  // Search activities in list view
  useEffect(() => {
    if (formVisible && activityViewMode === 'list') {
      const timer = setTimeout(() => {
        fetchAvailableActivities()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [activitySearchText])

  // Handle create/edit
  const handleSubmit = async (values: any) => {
    setFormLoading(true)
    try {
      const data: CreateBatchData | UpdateBatchData = {
        name: values.name,
        description: values.description,
        notes: values.notes,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
        deadline: values.deadline?.format('YYYY-MM-DD HH:mm:ss'),
      }

      let batchId: string

      if (editingBatch) {
        // Update (status is now calculated from dates, not editable)
        const updateData: UpdateBatchData = {
          ...data,
          activity_ids: selectedActivityIds,
        }
        await reportBatchApi.updateReportBatch(editingBatch.id, updateData)
        batchId = editingBatch.id
        message.success('Đã cập nhật đợt báo cáo')
      } else {
        // Create
        const createData: CreateBatchData = {
          ...data,
          activity_ids: selectedActivityIds,
        }
        const response = await reportBatchApi.createReportBatch(createData)
        batchId = response.data.id
        message.success('Đã tạo đợt báo cáo')
      }

      // Upload owner file if selected
      if (ownerFileList.length > 0 && ownerFileList[0].originFileObj) {
        try {
          setUploadingFile(true)
          await reportBatchApi.uploadOwnerFile(
            batchId,
            ownerFileList[0].originFileObj as File,
            documentTitle.trim() || undefined
          )
          message.success('Đã upload văn bản giao nhiệm vụ')
        } catch (uploadError: any) {
          message.warning(uploadError.message || 'Không thể upload file, vui lòng thử lại sau')
        } finally {
          setUploadingFile(false)
        }
      }

      setFormVisible(false)
      form.resetFields()
      setEditingBatch(null)
      setSelectedActivityIds([])
      setOwnerFileList([])
      setDocumentTitle('')
      fetchBatches()
    } catch (error: any) {
      message.error(error.message || 'Không thể lưu đợt báo cáo')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await reportBatchApi.deleteReportBatch(id)
      message.success('Đã xóa đợt báo cáo')
      fetchBatches()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa đợt báo cáo')
    }
  }

  // Open edit form - fetch full batch details first to get activities
  const handleEdit = async (record: ReportBatch) => {
    setFormLoading(true)
    try {
      // Fetch full batch details including activities
      const response = await reportBatchApi.getReportBatch(record.id)
      const batch = response.data

      setEditingBatch(batch)
      form.setFieldsValue({
        name: batch.name,
        description: batch.description,
        notes: batch.notes,
        // status is now calculated from dates, not editable
        dateRange: batch.start_date && batch.end_date
          ? [dayjs(batch.start_date), dayjs(batch.end_date)]
          : undefined,
        deadline: batch.deadline ? dayjs(batch.deadline) : undefined,
      })
      setSelectedActivityIds(batch.activities?.map(a => a.id) || [])
      setFormVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin đợt báo cáo')
    } finally {
      setFormLoading(false)
    }
  }

  // Open detail modal
  const handleViewDetail = (record: ReportBatch) => {
    setDetailVisible(true)
    fetchBatchDetail(record.id)
  }

  // Preview export
  const handlePreviewExport = async (batchId: string) => {
    setExportPreviewLoading(true)
    setExportPreviewVisible(true)
    setActivePreviewTab('activities')
    try {
      const response = await reportBatchApi.previewBatchExport(batchId)
      setExportPreviewData(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể xem trước báo cáo')
      setExportPreviewVisible(false)
    } finally {
      setExportPreviewLoading(false)
    }
  }

  // Export batch report
  const handleExportBatch = async (batchId: string) => {
    setExportLoading(true)
    try {
      const response = await reportBatchApi.exportBatch(batchId)
      message.success(response.message || 'Đã xuất báo cáo thành công')

      // Download the file
      const blob = await reportBatchApi.downloadBatchExport(batchId, response.data.export_id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.data.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Close preview if open
      setExportPreviewVisible(false)
    } catch (error: any) {
      message.error(error.message || 'Không thể xuất báo cáo')
    } finally {
      setExportLoading(false)
    }
  }

  // Fetch export history
  const handleViewExportHistory = async (batchId: string) => {
    setCurrentExportBatchId(batchId)
    setExportHistoryVisible(true)
    setExportHistoryLoading(true)
    try {
      const response = await reportBatchApi.getBatchExportHistory(batchId)
      setExportHistory(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải lịch sử xuất báo cáo')
    } finally {
      setExportHistoryLoading(false)
    }
  }

  // Download from export history
  const handleDownloadFromHistory = async (exportItem: ExportHistoryItem) => {
    if (!currentExportBatchId) {
      message.error('Không tìm thấy thông tin đợt báo cáo')
      return
    }
    try {
      const blob = await reportBatchApi.downloadBatchExport(currentExportBatchId, exportItem.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportItem.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải file')
    }
  }

  // Status tag colors (status is now calculated from dates)
  const getStatusTag = (status: BatchStatus) => {
    const config: Record<BatchStatus, { color: string; icon: React.ReactNode; label: string }> = {
      upcoming: { color: 'default', icon: <ClockCircleOutlined />, label: 'Sắp tới' },
      ongoing: { color: 'processing', icon: <ClockCircleOutlined />, label: 'Đang diễn ra' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, label: 'Kết thúc' },
    }
    const { color, icon, label } = config[status] || config.upcoming
    return <Tag color={color} icon={icon}>{label}</Tag>
  }

  // Table columns
  const columns: ColumnsType<ReportBatch> = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Tên đợt báo cáo',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <Text strong style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(record)}>
            {name}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'period',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.start_date && record.end_date ? (
            <Tooltip title={`${dayjs(record.start_date).format('DD/MM/YYYY HH:mm')} - ${dayjs(record.end_date).format('DD/MM/YYYY HH:mm')}`}>
              <Tag icon={<CalendarOutlined />} color="blue">
                {dayjs(record.start_date).format('DD/MM/YY')} - {dayjs(record.end_date).format('DD/MM/YY')}
              </Tag>
            </Tooltip>
          ) : (
            <Text type="secondary">-</Text>
          )}
          {record.deadline && (
            <Tooltip title={dayjs(record.deadline).format('DD/MM/YYYY HH:mm')}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Hạn: {dayjs(record.deadline).format('DD/MM/YY HH:mm')}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Hoạt động',
      key: 'activities',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Badge
          count={record.activities_count || 0}
          showZero
          style={{ backgroundColor: '#1890ff' }}
          overflowCount={999}
        />
      ),
    },
    {
      title: 'Phản hồi',
      key: 'responses',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Số phản hồi từ đơn vị phối hợp">
          <Badge
            count={record.collaborator_responses_count || 0}
            showZero
            style={{ backgroundColor: '#52c41a' }}
            overflowCount={999}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: BatchStatus) => getStatusTag(status),
    },
    {
      title: 'Người tạo',
      key: 'creator',
      width: 140,
      render: (_, record) => {
        if (record.creator) {
          const fullName = [record.creator.first_name, record.creator.last_name]
            .filter(Boolean)
            .join(' ')
          return (
            <Space size={4}>
              <UserOutlined style={{ color: '#8c8c8c' }} />
              <Text ellipsis style={{ maxWidth: 100 }}>{fullName || record.creator.email || '-'}</Text>
            </Space>
          )
        }
        return '-'
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.status !== 'completed' && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {canDelete && record.status === 'upcoming' && (
            <Popconfirm
              title="Xóa đợt báo cáo này?"
              description="Dữ liệu sẽ bị xóa vĩnh viễn"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // Calculate pending count for badge
  const pendingCount = (collaboratorSummary?.pending || 0) + (collaboratorSummary?.overdue || 0)

  return (
    <div>
      {/* View Mode Selector */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as ViewMode)}
          options={[
            {
              value: 'my_batches',
              label: (
                <Space>
                  <FileTextOutlined />
                  <span>Đợt báo cáo của đơn vị</span>
                </Space>
              ),
            },
            {
              value: 'need_to_report',
              label: (
                <Space>
                  <FormOutlined />
                  <span>Cần nhập báo cáo</span>
                  {pendingCount > 0 && (
                    <Badge
                      count={pendingCount}
                      style={{ backgroundColor: '#ff4d4f' }}
                      size="small"
                    />
                  )}
                </Space>
              ),
            },
          ]}
          block
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* Render based on view mode */}
      {viewMode === 'need_to_report' ? (
        <CollaboratorReportView />
      ) : (
        <>
          {/* Toolbar */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="Tìm kiếm theo tên..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchBatches}
                    loading={loading}
                  >
                    Làm mới
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingBatch(null)
                      form.resetFields()
                      setSelectedActivityIds([])
                      setFormVisible(true)
                    }}
                  >
                    Tạo đợt báo cáo
                  </Button>
                </Space>
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
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đợt`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
              }))
            },
          }}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có đợt báo cáo nào"
              />
            ),
          }}
        />
      </Card>

      {/* Create/Edit Modal - Two Column Layout */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{editingBatch ? 'Chỉnh sửa đợt báo cáo' : 'Tạo đợt báo cáo mới'}</span>
          </Space>
        }
        open={formVisible}
        onCancel={() => {
          setFormVisible(false)
          setEditingBatch(null)
          form.resetFields()
          setSelectedActivityIds([])
          setActivitySearchText('')
          setOwnerFileList([])
          setDocumentTitle('')
        }}
        width={1200}
        centered
        styles={{ body: { padding: '16px 24px' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Đã chọn: <Text strong style={{ color: '#1890ff' }}>{selectedActivityIds.length}</Text> hoạt động
            </Text>
            <Space>
              <Button onClick={() => setFormVisible(false)}>Hủy</Button>
              <Button type="primary" loading={formLoading} onClick={() => form.submit()}>
                {editingBatch ? 'Cập nhật' : 'Tạo đợt báo cáo'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            {/* Left Column - Form Info */}
            <Col span={10}>
              <div style={{
                background: '#fafafa',
                padding: 16,
                borderRadius: 8,
                height: '100%',
                minHeight: 500
              }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  Thông tin đợt báo cáo
                </Title>

                <Form.Item
                  name="name"
                  label="Tên đợt báo cáo"
                  rules={[{ required: true, message: 'Vui lòng nhập tên đợt báo cáo' }]}
                >
                  <Input placeholder="VD: Đợt báo cáo tháng 1/2026" maxLength={255} />
                </Form.Item>

                <Form.Item
                  name="dateRange"
                  label={
                    <Space>
                      <span>Thời gian báo cáo</span>
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                        onClick={() => {
                          const today = dayjs()
                          form.setFieldsValue({
                            dateRange: [today.startOf('day'), today.endOf('day')],
                          })
                        }}
                      >
                        Hôm nay
                      </Button>
                    </Space>
                  }
                >
                  <RangePicker
                    style={{ width: '100%' }}
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    placeholder={['Từ ngày giờ', 'Đến ngày giờ']}
                  />
                </Form.Item>

                <Form.Item
                  name="deadline"
                  label={
                    <Space>
                      <span>Hạn nộp báo cáo</span>
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                        onClick={() => {
                          form.setFieldsValue({
                            deadline: dayjs().endOf('day'),
                          })
                        }}
                      >
                        Cuối ngày hôm nay
                      </Button>
                    </Space>
                  }
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    placeholder="Chọn ngày giờ"
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Mô tả"
                >
                  <TextArea rows={2} placeholder="Mô tả ngắn về đợt báo cáo..." maxLength={1000} />
                </Form.Item>

                <Form.Item
                  name="notes"
                  label="Ghi chú"
                >
                  <TextArea rows={2} placeholder="Ghi chú thêm..." maxLength={2000} />
                </Form.Item>

                {/* Văn bản giao nhiệm vụ */}
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <UploadOutlined style={{ marginRight: 4 }} />
                    Văn bản giao nhiệm vụ
                  </Text>
                  <Input
                    placeholder="Tên văn bản giao nhiệm vụ"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <Upload
                    beforeUpload={() => false}
                    fileList={ownerFileList}
                    onChange={({ fileList }) => setOwnerFileList(fileList.slice(-1))}
                    maxCount={1}
                    listType="text"
                    className="upload-list-inline"
                  >
                    {ownerFileList.length === 0 && (
                      <Button icon={<UploadOutlined />} size="small">
                        Chọn file
                      </Button>
                    )}
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    {editingBatch
                      ? 'Có thể bỏ qua nếu không cần thay đổi file.'
                      : 'Chỉ được upload 1 file văn bản giao nhiệm vụ.'}
                  </Text>
                </div>
              </div>
            </Col>

            {/* Right Column - Activity Selection */}
            <Col span={14}>
              <div style={{ height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
                {/* Activity Selector Header */}
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space.Compact>
                    <Button
                      type={activityViewMode === 'kpi' ? 'primary' : 'default'}
                      icon={<ApartmentOutlined />}
                      onClick={() => setActivityViewMode('kpi')}
                      size="small"
                    >
                      Theo KPI
                    </Button>
                    <Button
                      type={activityViewMode === 'list' ? 'primary' : 'default'}
                      icon={<UnorderedListOutlined />}
                      onClick={() => setActivityViewMode('list')}
                      size="small"
                    >
                      Danh sách
                    </Button>
                  </Space.Compact>

                  {activityViewMode === 'list' && (
                    <Input
                      placeholder="Tìm kiếm hoạt động..."
                      prefix={<SearchOutlined />}
                      value={activitySearchText}
                      onChange={(e) => setActivitySearchText(e.target.value)}
                      style={{ width: 200 }}
                      size="small"
                      allowClear
                    />
                  )}
                </div>

                {/* Activity List (Selectable) */}
                <div style={{
                  flex: 1,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderBottom: '1px solid #d9d9d9',
                    fontWeight: 500
                  }}>
                    <Space>
                      <UnorderedListOutlined />
                      <span>Chọn hoạt động</span>
                      <Badge count={selectedActivityIds.length} style={{ backgroundColor: '#1890ff' }} />
                    </Space>
                  </div>

                  <Spin spinning={activitiesLoading} style={{ flex: 1 }}>
                    <div style={{ height: 220, overflow: 'auto', padding: 8 }}>
                      {/* KPI View */}
                      {activityViewMode === 'kpi' && (
                        <>
                          {kpiCategories.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Không có hoạt động nào"
                            />
                          ) : (
                            kpiCategories.map((category) => (
                              <div key={category.id} style={{ marginBottom: 6 }}>
                                {/* Category Header */}
                                <div
                                  style={{
                                    background: '#e6f7ff',
                                    padding: '6px 10px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: 13,
                                  }}
                                  onClick={() => {
                                    setExpandedCategories(prev =>
                                      prev.includes(category.id)
                                        ? prev.filter(id => id !== category.id)
                                        : [...prev, category.id]
                                    )
                                  }}
                                >
                                  {expandedCategories.includes(category.id) ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
                                  <Text strong style={{ marginLeft: 6, fontSize: 13 }}>{category.name}</Text>
                                  <Badge
                                    count={category.kpis.reduce((sum, k) => sum + k.activities.length, 0)}
                                    style={{ marginLeft: 6, backgroundColor: '#1890ff' }}
                                    size="small"
                                  />
                                </div>

                                {/* KPIs */}
                                {expandedCategories.includes(category.id) && (
                                  <div style={{ marginLeft: 12, marginTop: 4 }}>
                                    {category.kpis.map((kpi) => (
                                      <div key={kpi.id} style={{ marginBottom: 4 }}>
                                        {/* KPI Header */}
                                        <div
                                          style={{
                                            background: '#f5f5f5',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 12,
                                          }}
                                          onClick={() => {
                                            setExpandedKpis(prev =>
                                              prev.includes(kpi.id)
                                                ? prev.filter(id => id !== kpi.id)
                                                : [...prev, kpi.id]
                                            )
                                          }}
                                        >
                                          {expandedKpis.includes(kpi.id) ? <DownOutlined style={{ fontSize: 9 }} /> : <RightOutlined style={{ fontSize: 9 }} />}
                                          <Tag color="purple" style={{ marginLeft: 6, fontSize: 10 }}>
                                            {kpi.code || 'KPI'}
                                          </Tag>
                                          <Text style={{ flex: 1, fontSize: 12 }} ellipsis>{kpi.title}</Text>
                                          <Badge
                                            count={kpi.activities.length}
                                            style={{ backgroundColor: '#722ed1' }}
                                            size="small"
                                          />
                                        </div>

                                        {/* Activities under this KPI */}
                                        {expandedKpis.includes(kpi.id) && (
                                          <div style={{ marginLeft: 16, marginTop: 2 }}>
                                            {kpi.activities.map((activity) => (
                                              <div
                                                key={activity.id}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'flex-start',
                                                  padding: '4px 6px',
                                                  background: selectedActivityIds.includes(activity.id) ? '#e6f7ff' : '#fff',
                                                  borderRadius: 4,
                                                  marginBottom: 2,
                                                  border: '1px solid #f0f0f0',
                                                  fontSize: 12,
                                                }}
                                              >
                                                <Checkbox
                                                  checked={selectedActivityIds.includes(activity.id)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setSelectedActivityIds(prev => [...prev, activity.id])
                                                    } else {
                                                      setSelectedActivityIds(prev => prev.filter(id => id !== activity.id))
                                                    }
                                                  }}
                                                />
                                                <div style={{ marginLeft: 6, flex: 1 }}>
                                                  <Text style={{ fontSize: 12 }}>{activity.title}</Text>
                                                  <div>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                                      {dayjs(activity.start_date).format('DD/MM/YY')} - {dayjs(activity.end_date).format('DD/MM/YY')}
                                                    </Text>
                                                  </div>
                                                  <CollaboratingOrgsDisplay
                                                    organizations={activity.collaborating_organizations || []}
                                                    maxShow={2}
                                                    fontSize={9}
                                                    iconSize={9}
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </>
                      )}

                      {/* List View */}
                      {activityViewMode === 'list' && (
                        <Checkbox.Group
                          value={selectedActivityIds}
                          onChange={(values) => setSelectedActivityIds(values as string[])}
                          style={{ width: '100%' }}
                        >
                          {availableActivities.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Không tìm thấy hoạt động"
                            />
                          ) : (
                            availableActivities.map((activity) => (
                              <div
                                key={activity.id}
                                style={{
                                  padding: '6px 8px',
                                  borderBottom: '1px solid #f0f0f0',
                                  background: selectedActivityIds.includes(activity.id) ? '#e6f7ff' : 'transparent',
                                }}
                              >
                                <Checkbox value={activity.id} style={{ width: '100%' }}>
                                  <div style={{ marginLeft: 6 }}>
                                    <Text style={{ fontSize: 12 }}>{activity.title}</Text>
                                    <div>
                                      <Tag color="blue" style={{ fontSize: 10 }}>
                                        {activity.lead_organization?.short_name || activity.lead_organization?.name}
                                      </Tag>
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        {dayjs(activity.start_date).format('DD/MM/YY')} - {dayjs(activity.end_date).format('DD/MM/YY')}
                                      </Text>
                                    </div>
                                    <CollaboratingOrgsDisplay
                                      organizations={activity.collaborating_organizations || []}
                                      maxShow={3}
                                      fontSize={10}
                                      iconSize={10}
                                    />
                                  </div>
                                </Checkbox>
                              </div>
                            ))
                          )}
                        </Checkbox.Group>
                      )}
                    </div>
                  </Spin>
                </div>

                {/* Selected Activities List */}
                <div style={{
                  marginTop: 12,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden',
                  flex: 1
                }}>
                  <div style={{
                    background: '#f6ffed',
                    padding: '8px 12px',
                    borderBottom: '1px solid #d9d9d9',
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>Hoạt động đã chọn</span>
                      <Badge count={selectedActivityIds.length} style={{ backgroundColor: '#52c41a' }} />
                    </Space>
                    {selectedActivityIds.length > 0 && (
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => setSelectedActivityIds([])}
                      >
                        Bỏ chọn tất cả
                      </Button>
                    )}
                  </div>

                  <div style={{ height: 180, overflow: 'auto', padding: 8 }}>
                    {selectedActivityIds.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa chọn hoạt động nào"
                        style={{ marginTop: 40 }}
                      />
                    ) : (
                      getSelectedActivities().map((activity, idx) => (
                        <div
                          key={activity.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '6px 10px',
                            background: idx % 2 === 0 ? '#fafafa' : '#fff',
                            borderRadius: 4,
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12 }}>{activity.title}</Text>
                            <div>
                              <Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>
                                {activity.lead_organization?.short_name || activity.lead_organization?.name}
                              </Tag>
                              <CollaboratingOrgsDisplay
                                organizations={activity.collaborating_organizations || []}
                                maxShow={2}
                                fontSize={10}
                                iconSize={10}
                              />
                            </div>
                          </div>
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setSelectedActivityIds(prev => prev.filter(id => id !== activity.id))}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal - Two Column Layout like Create/Edit Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Chi tiết đợt báo cáo</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false)
          setDetailBatch(null)
        }}
        width={1200}
        centered
        styles={{ body: { padding: '16px 24px' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Tạo bởi: <Text strong>{detailBatch?.creator?.first_name} {detailBatch?.creator?.last_name}</Text>
              {' • '}
              {detailBatch?.created_at && dayjs(detailBatch.created_at).format('DD/MM/YYYY HH:mm')}
            </Text>
            <Space>
              {detailBatch && (
                <>
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => handleViewExportHistory(detailBatch.id)}
                  >
                    Lịch sử xuất
                  </Button>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewExport(detailBatch.id)}
                  >
                    Xem trước
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    loading={exportLoading}
                    onClick={() => handleExportBatch(detailBatch.id)}
                  >
                    Xuất Excel
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailVisible(false)}>Đóng</Button>
              {detailBatch && detailBatch.status !== 'completed' && (
                <Button type="primary" icon={<EditOutlined />} onClick={() => {
                  setDetailVisible(false)
                  handleEdit(detailBatch)
                }}>
                  Chỉnh sửa
                </Button>
              )}
            </Space>
          </div>
        }
      >
        <Spin spinning={detailLoading}>
          {detailBatch && (
            <Row gutter={24}>
              {/* Left Column - Batch Info */}
              <Col span={10}>
                <div style={{
                  background: '#fafafa',
                  padding: 16,
                  borderRadius: 8,
                  height: '100%',
                  minHeight: 500
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      <FileTextOutlined style={{ marginRight: 8 }} />
                      Thông tin đợt báo cáo
                    </Title>
                    {getStatusTag(detailBatch.status)}
                  </div>

                  {/* Batch Name */}
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Tên đợt báo cáo</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong style={{ fontSize: 16 }}>{detailBatch.name}</Text>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Thời gian báo cáo</Text>
                    <div style={{ marginTop: 4 }}>
                      {detailBatch.start_date && detailBatch.end_date ? (
                        <Tag icon={<CalendarOutlined />} color="blue">
                          {dayjs(detailBatch.start_date).format('DD/MM/YYYY HH:mm')} - {dayjs(detailBatch.end_date).format('DD/MM/YYYY HH:mm')}
                        </Tag>
                      ) : (
                        <Text type="secondary">Chưa thiết lập</Text>
                      )}
                    </div>
                  </div>

                  {/* Deadline */}
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Hạn nộp báo cáo</Text>
                    <div style={{ marginTop: 4 }}>
                      {detailBatch.deadline ? (
                        <Tag icon={<ClockCircleOutlined />} color="orange">
                          {dayjs(detailBatch.deadline).format('DD/MM/YYYY HH:mm')}
                        </Tag>
                      ) : (
                        <Text type="secondary">Không có hạn</Text>
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <div style={{ background: '#e6f7ff', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Hoạt động</Text>
                        <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                          {detailBatch.activities?.length || 0}
                        </Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      {(() => {
                        // Collect unique collaborating organizations
                        const uniqueOrgsMap = new Map<string, { id: string; name: string; short_name?: string }>()
                        detailBatch.activities?.forEach(a => {
                          a.collaborating_organizations?.forEach(org => {
                            if (!uniqueOrgsMap.has(org.id)) {
                              uniqueOrgsMap.set(org.id, org)
                            }
                          })
                        })
                        const uniqueOrgs = Array.from(uniqueOrgsMap.values())
                        const orgCount = uniqueOrgs.length

                        const fullOrgsList = (
                          <div style={{ maxWidth: 300 }}>
                            <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              <TeamOutlined style={{ marginRight: 4 }} />
                              Danh sách đơn vị phối hợp ({orgCount})
                            </Text>
                            <div style={{ maxHeight: 250, overflow: 'auto' }}>
                              {uniqueOrgs.map((org, idx) => (
                                <Tag
                                  key={org.id}
                                  color="green"
                                  style={{ margin: '2px 4px 2px 0', fontSize: 11 }}
                                >
                                  {idx + 1}. {org.short_name || org.name}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )

                        return (
                          <Popover
                            content={orgCount > 0 ? fullOrgsList : <Text type="secondary">Không có đơn vị phối hợp</Text>}
                            title={null}
                            trigger="click"
                            placement="bottom"
                          >
                            <div style={{ background: '#f6ffed', padding: 10, borderRadius: 6, textAlign: 'center', cursor: 'pointer' }}>
                              <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>ĐV phối hợp</Text>
                              <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
                                {orgCount}
                              </Text>
                            </div>
                          </Popover>
                        )
                      })()}
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#fff7e6', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Phản hồi</Text>
                        <Text strong style={{ fontSize: 20, color: '#fa8c16' }}>
                          {detailBatch.collaborator_responses?.length || 0}
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  {/* Description */}
                  {detailBatch.description && (
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Mô tả</Text>
                      <div style={{ marginTop: 4, padding: '8px 12px', background: '#fff', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                        <Text>{detailBatch.description}</Text>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {detailBatch.notes && (
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú</Text>
                      <div style={{ marginTop: 4, padding: '8px 12px', background: '#fff', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                        <Text>{detailBatch.notes}</Text>
                      </div>
                    </div>
                  )}

                  {/* Batch Files Section */}
                  <div style={{ marginTop: 8 }}>
                    <BatchFilesSection
                      batchId={detailBatch.id}
                      isOwner={true}
                      isCollaborator={false}
                      canEdit={detailBatch.status !== 'completed'}
                    />
                  </div>
                </div>
              </Col>

              {/* Right Column - Activities & Responses */}
              <Col span={14}>
                <div style={{ height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
                  {/* Activities List */}
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    flex: 1,
                    marginBottom: 12
                  }}>
                    <div style={{
                      background: '#e6f7ff',
                      padding: '8px 12px',
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: 500
                    }}>
                      <Space>
                        <UnorderedListOutlined />
                        <span>Danh sách hoạt động</span>
                        <Badge count={detailBatch.activities?.length || 0} style={{ backgroundColor: '#1890ff' }} />
                      </Space>
                    </div>

                    <div style={{ height: 220, overflow: 'auto', padding: 8 }}>
                      {detailBatch.activities && detailBatch.activities.length > 0 ? (
                        detailBatch.activities.map((activity, idx) => (
                          <div
                            key={activity.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              padding: '8px 10px',
                              background: idx % 2 === 0 ? '#fafafa' : '#fff',
                              borderRadius: 4,
                              marginBottom: 4,
                              border: '1px solid #f0f0f0'
                            }}
                          >
                            <Text type="secondary" style={{ width: 24, flexShrink: 0 }}>{idx + 1}.</Text>
                            <div style={{ flex: 1 }}>
                              <Text strong style={{ fontSize: 13 }}>{activity.title}</Text>
                              <div style={{ marginTop: 4 }}>
                                <Space size={4} wrap>
                                  <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                                    {activity.lead_organization?.short_name || activity.lead_organization?.name}
                                  </Tag>
                                  <Text type="secondary" style={{ fontSize: 10 }}>
                                    {dayjs(activity.start_date).format('DD/MM/YY')} - {dayjs(activity.end_date).format('DD/MM/YY')}
                                  </Text>
                                  <Tag
                                    color={
                                      activity.status === 'COMPLETED' ? 'success' :
                                      activity.status === 'IN_PROGRESS' ? 'processing' :
                                      activity.status === 'APPROVED' ? 'blue' : 'default'
                                    }
                                    style={{ fontSize: 10, margin: 0 }}
                                  >
                                    {activity.status}
                                  </Tag>
                                </Space>
                              </div>
                              {activity.collaborating_organizations && activity.collaborating_organizations.length > 0 && (
                                <div style={{ marginTop: 4, padding: '4px 8px', background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
                                  <TeamOutlined style={{ fontSize: 10, color: '#52c41a', marginRight: 4 }} />
                                  <Text style={{ fontSize: 10, color: '#52c41a', fontWeight: 500 }}>
                                    Đơn vị phối hợp:
                                  </Text>
                                  {activity.collaborating_organizations.length <= 3 ? (
                                    <Text style={{ fontSize: 10, color: '#389e0d' }}>
                                      {' '}{activity.collaborating_organizations.map(org => org.short_name || org.name).join(', ')}
                                    </Text>
                                  ) : (
                                    <>
                                      <Text style={{ fontSize: 10, color: '#389e0d' }}>
                                        {' '}{activity.collaborating_organizations.slice(0, 3).map(org => org.short_name || org.name).join(', ')}
                                      </Text>
                                      <Popover
                                        content={
                                          <div style={{ maxWidth: 300 }}>
                                            <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                                              <TeamOutlined style={{ marginRight: 4 }} />
                                              Danh sách đơn vị phối hợp ({activity.collaborating_organizations.length})
                                            </Text>
                                            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                                              {activity.collaborating_organizations.map((org, idx) => (
                                                <Tag
                                                  key={org.id}
                                                  color="green"
                                                  style={{ margin: '2px 4px 2px 0', fontSize: 11 }}
                                                >
                                                  {idx + 1}. {org.short_name || org.name}
                                                </Tag>
                                              ))}
                                            </div>
                                          </div>
                                        }
                                        title={null}
                                        trigger="click"
                                        placement="right"
                                      >
                                        <Tag
                                          color="green"
                                          style={{
                                            fontSize: 9,
                                            cursor: 'pointer',
                                            marginLeft: 4,
                                            padding: '0 4px',
                                            lineHeight: '16px'
                                          }}
                                        >
                                          +{activity.collaborating_organizations.length - 3}
                                        </Tag>
                                      </Popover>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Chưa có hoạt động nào"
                          style={{ marginTop: 60 }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Collaborator Responses - Grouped by Activity */}
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    flex: 1
                  }}>
                    <div style={{
                      background: '#f6ffed',
                      padding: '8px 12px',
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: 500
                    }}>
                      <Space>
                        <TeamOutlined style={{ color: '#52c41a' }} />
                        <span>Phản hồi từ đơn vị phối hợp (theo hoạt động)</span>
                        <Badge count={detailBatch.collaborator_responses?.length || 0} style={{ backgroundColor: '#52c41a' }} />
                      </Space>
                    </div>

                    <div style={{ height: 200, overflow: 'auto', padding: 8 }}>
                      {detailBatch.collaborator_responses && detailBatch.collaborator_responses.length > 0 ? (
                        // Group responses by activity
                        (() => {
                          const groupedByActivity = detailBatch.collaborator_responses.reduce((acc, response) => {
                            const activityId = response.activity_id
                            if (!acc[activityId]) {
                              acc[activityId] = {
                                activity: response.activity,
                                responses: []
                              }
                            }
                            acc[activityId].responses.push(response)
                            return acc
                          }, {} as Record<string, { activity?: { id: string; title: string }; responses: typeof detailBatch.collaborator_responses }>)

                          return Object.entries(groupedByActivity).map(([activityId, group]) => (
                            <div key={activityId} style={{ marginBottom: 12 }}>
                              {/* Activity header */}
                              <div style={{
                                background: '#e6f7ff',
                                padding: '6px 10px',
                                borderRadius: '4px 4px 0 0',
                                borderBottom: '1px solid #91d5ff'
                              }}>
                                <Text strong style={{ fontSize: 12 }}>
                                  <FileTextOutlined style={{ marginRight: 6 }} />
                                  {group.activity?.title || 'Hoạt động không xác định'}
                                </Text>
                                <Badge
                                  count={group.responses.length}
                                  size="small"
                                  style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                                />
                              </div>
                              {/* Responses for this activity */}
                              <div style={{ border: '1px solid #f0f0f0', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                                {group.responses.map((response, idx) => (
                                  <div
                                    key={response.id}
                                    style={{
                                      padding: '8px 10px',
                                      background: idx % 2 === 0 ? '#fafafa' : '#fff',
                                      borderBottom: idx < group.responses.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}
                                  >
                                    <div style={{ marginBottom: 4 }}>
                                      <Tag color="green" style={{ marginRight: 6, fontSize: 10 }}>
                                        {response.organization?.short_name || response.organization?.name}
                                      </Tag>
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        {response.submitter && (
                                          <>
                                            <UserOutlined style={{ marginRight: 2 }} />
                                            {response.submitter.first_name} {response.submitter.last_name}
                                            {' • '}
                                          </>
                                        )}
                                        {response.submitted_at
                                          ? dayjs(response.submitted_at).format('DD/MM/YY HH:mm')
                                          : dayjs(response.created_at).format('DD/MM/YY HH:mm')
                                        }
                                      </Text>
                                    </div>
                                    <div
                                      style={{
                                        padding: '4px 8px',
                                        background: '#fff',
                                        borderRadius: 4,
                                        borderLeft: '2px solid #52c41a'
                                      }}
                                    >
                                      <Text style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{response.content}</Text>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        })()
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Chưa có phản hồi nào"
                          style={{ marginTop: 50 }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Spin>
      </Modal>

      {/* Export Preview Modal */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <span>Xem trước báo cáo</span>
          </Space>
        }
        open={exportPreviewVisible}
        onCancel={() => {
          setExportPreviewVisible(false)
          setExportPreviewData(null)
        }}
        width={1100}
        centered
        styles={{ body: { padding: '16px 24px', maxHeight: '70vh', overflow: 'auto' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              {exportPreviewData?.batch?.name}
            </Text>
            <Space>
              <Button onClick={() => setExportPreviewVisible(false)}>Đóng</Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                loading={exportLoading}
                onClick={() => exportPreviewData && handleExportBatch(exportPreviewData.batch.id)}
              >
                Xuất Excel
              </Button>
            </Space>
          </div>
        }
      >
        <Spin spinning={exportPreviewLoading}>
          {exportPreviewData && (
            <>
              {/* Statistics Summary */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <div style={{ background: '#e6f7ff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Hoạt động</Text>
                    <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                      {exportPreviewData.statistics.total_activities}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Có đơn vị phối hợp</Text>
                    <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
                      {exportPreviewData.statistics.activities_with_collaborators}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#fff7e6', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Cần nộp / Đã nộp</Text>
                    <Text strong style={{ fontSize: 20, color: '#fa8c16' }}>
                      {exportPreviewData.statistics.total_submitted}/{exportPreviewData.statistics.total_required_responses}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ background: '#f9f0ff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Tỷ lệ hoàn thành</Text>
                    <Text strong style={{ fontSize: 20, color: '#722ed1' }}>
                      {exportPreviewData.statistics.completion_percentage}%
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* Tab Switch */}
              <Segmented
                value={activePreviewTab}
                onChange={(value) => setActivePreviewTab(value as 'activities' | 'responses')}
                options={[
                  { value: 'activities', label: `Sheet 1: Hoạt động (${exportPreviewData.activities.length})` },
                  { value: 'responses', label: `Sheet 2: Báo cáo đơn vị phối hợp (${exportPreviewData.collaborator_responses.length})` },
                ]}
                style={{ marginBottom: 16 }}
                block
              />

              {/* Activities Tab */}
              {activePreviewTab === 'activities' && (
                <div style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#1890ff',
                    color: '#fff',
                    padding: '8px 12px',
                    fontWeight: 500
                  }}>
                    Danh sách hoạt động
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: 400 }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 12
                    }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'left', whiteSpace: 'nowrap' }}>STT</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'left' }}>Hoạt động</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'left' }}>KPIs</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'left' }}>Đơn vị chủ trì</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'left' }}>Đơn vị phối hợp</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ padding: '8px 10px', borderBottom: '2px solid #d9d9d9', textAlign: 'center' }}>Tiến độ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportPreviewData.activities.slice(0, 50).map((activity, idx) => (
                          <tr key={activity.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', maxWidth: 200 }}>
                              <Text style={{ fontSize: 12 }}>{activity.title}</Text>
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', maxWidth: 150 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{activity.kpis || '-'}</Text>
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                              <Tag color="blue" style={{ fontSize: 10 }}>{activity.lead_organization || '-'}</Tag>
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', maxWidth: 150 }}>
                              {activity.collaborating_organizations ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>{activity.collaborating_organizations}</Text>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                              <Tag
                                color={
                                  activity.status === 'COMPLETED' ? 'success' :
                                  activity.status === 'IN_PROGRESS' ? 'processing' :
                                  activity.status === 'APPROVED' ? 'blue' : 'default'
                                }
                                style={{ fontSize: 10 }}
                              >
                                {activity.status}
                              </Tag>
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                              {activity.completion_percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {exportPreviewData.activities.length > 50 && (
                      <div style={{ padding: '12px', textAlign: 'center', background: '#fafafa' }}>
                        <Text type="secondary">
                          Hiển thị 50/{exportPreviewData.activities.length} hoạt động. Xuất Excel để xem đầy đủ.
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collaborator Responses Tab */}
              {activePreviewTab === 'responses' && (
                <div style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#52c41a',
                    color: '#fff',
                    padding: '8px 12px',
                    fontWeight: 500
                  }}>
                    Báo cáo từ đơn vị phối hợp
                  </div>
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    {exportPreviewData.collaborator_responses.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có hoạt động nào có đơn vị phối hợp"
                        style={{ padding: 40 }}
                      />
                    ) : (
                      exportPreviewData.collaborator_responses.map((group, groupIdx) => (
                        <div key={group.activity_id} style={{ borderBottom: groupIdx < exportPreviewData.collaborator_responses.length - 1 ? '2px solid #d9d9d9' : 'none' }}>
                          {/* Activity Header */}
                          <div style={{
                            background: '#f6ffed',
                            padding: '8px 12px',
                            borderBottom: '1px solid #d9d9d9'
                          }}>
                            <Space>
                              <Text strong style={{ fontSize: 12 }}>{group.activity_title}</Text>
                              <Tag color="purple" style={{ fontSize: 10 }}>{group.kpis || 'KPI'}</Tag>
                              <Badge
                                count={`${group.submitted_count}/${group.total_collaborators}`}
                                style={{ backgroundColor: group.submitted_count === group.total_collaborators ? '#52c41a' : '#fa8c16' }}
                              />
                            </Space>
                          </div>
                          {/* Responses */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {group.responses.map((response, respIdx) => (
                                <tr key={response.organization_id} style={{ background: respIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0', width: 150 }}>
                                    <Tag color="green" style={{ fontSize: 10 }}>{response.organization_name}</Tag>
                                  </td>
                                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                    {response.has_response ? (
                                      <div>
                                        <Text style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                                          {response.content && response.content.length > 200
                                            ? <Tooltip title={response.content}>{response.content.substring(0, 200)}...</Tooltip>
                                            : response.content}
                                        </Text>
                                        <div style={{ marginTop: 4 }}>
                                          <Text type="secondary" style={{ fontSize: 10 }}>
                                            <UserOutlined style={{ marginRight: 2 }} />
                                            {response.submitter}
                                            {response.submitted_at && ` • ${dayjs(response.submitted_at).format('DD/MM/YY HH:mm')}`}
                                          </Text>
                                        </div>
                                      </div>
                                    ) : (
                                      <Tag color="default" style={{ fontSize: 10 }}>Chưa nộp</Tag>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Spin>
      </Modal>

      {/* Export History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: '#1890ff' }} />
            <span>Lịch sử xuất báo cáo</span>
          </Space>
        }
        open={exportHistoryVisible}
        onCancel={() => {
          setExportHistoryVisible(false)
          setExportHistory([])
        }}
        width={800}
        centered
        footer={<Button onClick={() => setExportHistoryVisible(false)}>Đóng</Button>}
      >
        <Spin spinning={exportHistoryLoading}>
          {exportHistory.length > 0 ? (
            <List
              dataSource={exportHistory}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="download"
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadFromHistory(item)}
                    >
                      Tải xuống
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                    title={item.file_name}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <UserOutlined style={{ marginRight: 4 }} />
                          {item.exporter
                            ? item.exporter.name || item.exporter.email
                            : 'N/A'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {dayjs(item.exported_at).format('DD/MM/YYYY HH:mm')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Kích thước: {item.file_size_formatted || `${(item.file_size / 1024).toFixed(1)} KB`}
                          {item.activity_count !== undefined && ` • ${item.activity_count} hoạt động`}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có lịch sử xuất báo cáo"
            />
          )}
        </Spin>
      </Modal>
        </>
      )}
    </div>
  )
}

export default ReportBatchTab
