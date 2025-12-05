import { useState, useEffect } from 'react'
import {
  Modal,
  Steps,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Divider,
  Progress,
  Input,
  Alert,
  Popconfirm,
  Table,
  Empty,
  Spin,
  Tooltip,
  Tabs,
} from 'antd'
import {
  FileSearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  LockOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined,
  GlobalOutlined,
  BankOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  LinkOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Activity, ActivityFile, FileType } from '../../services/activityApi'
import * as activityApi from '../../services/activityApi'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface ApprovalWizardModalProps {
  visible: boolean
  activity: Activity | null
  onClose: () => void
  onApproved: () => void
  onRejected: () => void
}

// Get file icon based on extension
const getFileIcon = (extension?: string) => {
  const ext = (extension || '').toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#1890ff', fontSize: 18 }} />
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImageOutlined style={{ color: '#722ed1', fontSize: 18 }} />
    case 'zip':
    case 'rar':
    case '7z':
      return <FileZipOutlined style={{ color: '#faad14', fontSize: 18 }} />
    default:
      return <FileOutlined style={{ fontSize: 18 }} />
  }
}

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ApprovalWizardModal({
  visible,
  activity,
  onClose,
  onApproved,
  onRejected,
}: ApprovalWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Files state
  const [files, setFiles] = useState<ActivityFile[]>([])
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  // Fetch files when modal opens
  useEffect(() => {
    if (visible && activity) {
      fetchActivityFiles(activity.id)
    }
  }, [visible, activity])

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

  // Reset state when modal opens
  const handleAfterOpen = () => {
    setCurrentStep(0)
    setRejectReason('')
  }

  // Get status tag color
  const getStatusTag = (status: string) => {
    return (
      <Tag color={activityApi.getStatusColor(status as any)}>
        {activityApi.getStatusLabel(status as any)}
      </Tag>
    )
  }

  // Calculate duration between dates
  const calculateDuration = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return null
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    if (!start.isValid() || !end.isValid()) return null

    const diffDays = end.diff(start, 'day')
    const diffHours = end.diff(start, 'hour') % 24

    let text = ''
    if (diffDays > 0) text += `${diffDays} ngày `
    if (diffHours > 0) text += `${diffHours} giờ`
    return text || 'Cùng thời điểm'
  }

  // Handle approve
  const handleApprove = async () => {
    if (!activity) return
    setLoading(true)
    try {
      await activityApi.approveActivity(activity.id)
      onApproved()
      onClose()
    } catch (error: any) {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  // Handle reject - return to draft
  const handleRejectToDraft = async () => {
    if (!activity) return
    setLoading(true)
    try {
      await activityApi.rejectActivity(activity.id, {
        action: 'return_to_draft',
        reason: rejectReason,
      })
      onRejected()
      onClose()
    } catch (error: any) {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  // Handle reject - delete
  const handleRejectDelete = async () => {
    if (!activity) return
    setLoading(true)
    try {
      await activityApi.rejectActivity(activity.id, {
        action: 'delete',
        reason: rejectReason,
      })
      onRejected()
      onClose()
    } catch (error: any) {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  // Files table columns
  const fileColumns: ColumnsType<ActivityFile> = [
    {
      title: 'Tập tin',
      key: 'file',
      render: (_, record) => (
        <Space>
          {record.source_type === 'link' ? (
            <GlobalOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          ) : (
            getFileIcon(record.file_extension)
          )}
          <div>
            <Text strong>{record.file_name}</Text>
            {record.file_size && (
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {formatFileSize(record.file_size)}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Loại tài liệu',
      key: 'file_type',
      width: 150,
      render: (_, record) => (
        record.file_type ? (
          <Tag color="blue">{record.file_type.name}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Nguồn',
      key: 'source_type',
      width: 100,
      render: (_, record) => (
        <Tag color={record.source_type === 'link' ? 'blue' : 'green'}>
          {record.source_type === 'link' ? 'Liên kết' : 'Tập tin'}
        </Tag>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          {record.source_type === 'link' && record.file_url && (
            <Tooltip title="Mở liên kết">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => window.open(record.file_url, '_blank')}
              />
            </Tooltip>
          )}
          {record.source_type === 'upload' && record.download_url && (
            <Tooltip title="Tải xuống">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => window.open(record.download_url, '_blank')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // Step 1: Review activity details
  const renderStep1 = () => (
    <div style={{ padding: '16px 0' }}>
      <Alert
        type="info"
        showIcon
        icon={<FileSearchOutlined />}
        message="Bước 1: Xem xét thông tin hoạt động"
        description="Vui lòng xem xét kỹ các thông tin bên dưới trước khi tiến hành phê duyệt hoặc từ chối."
        style={{ marginBottom: 24 }}
      />

      {activity && (
        <div className="approval-activity-details">
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Mã hoạt động</Text>
            <Title level={4} style={{ margin: '4px 0 8px' }}>
              {activity.code}
            </Title>
            <Space>
              {getStatusTag(activity.status)}
              <Progress
                percent={activity.completion_percentage || 0}
                size="small"
                style={{ width: 150 }}
              />
              {activity.is_locked && (
                <Tag color="warning" icon={<LockOutlined />}>Đã khóa</Tag>
              )}
            </Space>
          </div>

          <Divider />

          {/* Title and Description */}
          <div style={{ marginBottom: 16 }}>
            <Title level={5}>{activity.title}</Title>
            <Paragraph type="secondary">
              {activity.description || 'Không có mô tả'}
            </Paragraph>
          </div>

          {/* Details Grid */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text type="secondary">
                <TeamOutlined style={{ marginRight: 4 }} /> Loại hoạt động
              </Text>
              <div>
                <Tag color="blue">{activity.activity_type?.name || '-'}</Tag>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                <GlobalOutlined style={{ marginRight: 4 }} /> Lĩnh vực
              </Text>
              <div>
                <Tag>{activity.activity_field?.name || '-'}</Tag>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                <BankOutlined style={{ marginRight: 4 }} /> Đơn vị chủ trì
              </Text>
              <div>
                <Text strong>{activity.lead_organization?.name || '-'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                <UserOutlined style={{ marginRight: 4 }} /> Người tạo
              </Text>
              <div>
                <Text>
                  {activity.creator
                    ? `${activity.creator.first_name} ${activity.creator.last_name}`
                    : '-'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                <CalendarOutlined style={{ marginRight: 4 }} /> Thời gian
              </Text>
              <div>
                <Text>
                  {activity.start_date
                    ? `${dayjs(activity.start_date).format('DD/MM/YYYY HH:mm')} - ${
                        activity.end_date
                          ? dayjs(activity.end_date).format('DD/MM/YYYY HH:mm')
                          : '...'
                      }`
                    : '-'}
                </Text>
                {activity.start_date && activity.end_date && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Thời lượng: {calculateDuration(activity.start_date, activity.end_date)})
                    </Text>
                  </div>
                )}
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">
                <EnvironmentOutlined style={{ marginRight: 4 }} /> Địa điểm
              </Text>
              <div>
                <Text>{activity.location || '-'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Kinh phí</Text>
              <div>
                <Text>
                  {activity.budget
                    ? `${activity.budget.toLocaleString('vi-VN')} VNĐ`
                    : '-'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Nguồn kinh phí</Text>
              <div>
                <Text>{activity.budget_source || '-'}</Text>
              </div>
            </Col>
          </Row>

          {/* KPIs - Separated into tabs by source */}
          {activity.kpis && activity.kpis.length > 0 && (
            <>
              <Divider />
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  <GlobalOutlined style={{ marginRight: 4 }} />
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
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
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
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
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
            </>
          )}

          {/* External URL */}
          {activity.external_url && (
            <>
              <Divider />
              <div>
                <Text type="secondary">Đường dẫn tham khảo</Text>
                <div>
                  <a href={activity.external_url} target="_blank" rel="noopener noreferrer">
                    {activity.external_url}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  // Step 2: Review files/documents
  const renderStep2 = () => (
    <div style={{ padding: '16px 0' }}>
      <Alert
        type="info"
        showIcon
        icon={<FileOutlined />}
        message="Bước 2: Xem xét tài liệu đính kèm"
        description="Xem các tài liệu, văn bản liên quan đã được đính kèm cho hoạt động này."
        style={{ marginBottom: 24 }}
      />

      {filesLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Đang tải tài liệu...</Text>
          </div>
        </div>
      ) : files.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text type="secondary">Chưa có tài liệu nào được đính kèm</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hoạt động này chưa có tài liệu liên quan. Bạn vẫn có thể phê duyệt nếu thông tin đã đầy đủ.
              </Text>
            </div>
          }
          style={{ padding: '40px 0' }}
        />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text strong>
              <FileOutlined style={{ marginRight: 8 }} />
              Tổng số: {files.length} tài liệu
            </Text>
          </div>
          <Table
            columns={fileColumns}
            dataSource={files}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </>
      )}
    </div>
  )

  // Step 3: Decision
  const renderStep3 = () => (
    <div style={{ padding: '16px 0' }}>
      <Alert
        type="warning"
        showIcon
        icon={<CheckCircleOutlined />}
        message="Bước 3: Quyết định phê duyệt"
        description="Bạn đã xem xét thông tin và tài liệu của hoạt động. Vui lòng chọn phê duyệt hoặc từ chối."
        style={{ marginBottom: 24 }}
      />

      {activity && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Title level={4} style={{ marginBottom: 8 }}>
            {activity.title}
          </Title>
          <Text type="secondary">
            Mã: {activity.code} | Đơn vị: {activity.lead_organization?.name || '-'}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Tag color={files.length > 0 ? 'green' : 'orange'}>
              <FileOutlined style={{ marginRight: 4 }} />
              {files.length} tài liệu đính kèm
            </Tag>
          </div>

          <Divider />

          {/* Reason input */}
          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            <Text strong>Ghi chú (tùy chọn):</Text>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối hoặc ghi chú khi phê duyệt..."
              rows={3}
              maxLength={1000}
              showCount
              style={{ marginTop: 8 }}
            />
          </div>

          <Divider />

          {/* Decision buttons */}
          <Space size="large" direction="vertical" style={{ width: '100%' }}>
            {/* Approve button */}
            <Popconfirm
              title="Xác nhận phê duyệt hoạt động?"
              description={
                <div>
                  <p>Hoạt động sẽ chuyển sang trạng thái <Tag color="processing">Đang thực hiện</Tag> và <Tag color="warning">Tự động khóa</Tag></p>
                </div>
              }
              onConfirm={handleApprove}
              okText="Phê duyệt"
              cancelText="Hủy"
              okButtonProps={{ loading }}
            >
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                style={{
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a',
                  width: '100%',
                  height: 50,
                }}
                loading={loading}
              >
                PHÊ DUYỆT HOẠT ĐỘNG
              </Button>
            </Popconfirm>

            <Divider>hoặc</Divider>

            {/* Reject buttons */}
            <Row gutter={16}>
              <Col span={12}>
                <Popconfirm
                  title="Trả về trạng thái Nháp?"
                  description="Hoạt động sẽ được trả về cho người tạo để chỉnh sửa."
                  onConfirm={handleRejectToDraft}
                  okText="Trả về Nháp"
                  cancelText="Hủy"
                  okButtonProps={{ loading }}
                >
                  <Button
                    size="large"
                    icon={<CloseCircleOutlined />}
                    style={{ width: '100%', height: 50 }}
                    loading={loading}
                  >
                    Trả về Nháp
                  </Button>
                </Popconfirm>
              </Col>
              <Col span={12}>
                <Popconfirm
                  title="Xóa hoạt động này?"
                  description="Hoạt động sẽ bị xóa vĩnh viễn và không thể khôi phục."
                  onConfirm={handleRejectDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading }}
                >
                  <Button
                    danger
                    size="large"
                    icon={<CloseCircleOutlined />}
                    style={{ width: '100%', height: 50 }}
                    loading={loading}
                  >
                    Từ chối & Xóa
                  </Button>
                </Popconfirm>
              </Col>
            </Row>
          </Space>
        </div>
      )}
    </div>
  )

  const steps = [
    {
      title: 'Xem thông tin',
      icon: <FileSearchOutlined />,
    },
    {
      title: 'Xem tài liệu',
      icon: <FileOutlined />,
    },
    {
      title: 'Quyết định',
      icon: <CheckCircleOutlined />,
    },
  ]

  // Render footer based on current step
  const renderFooter = () => {
    if (currentStep === 0) {
      return (
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => setCurrentStep(1)}
          >
            Tiếp theo - Xem tài liệu
          </Button>
        </Space>
      )
    } else if (currentStep === 1) {
      return (
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setCurrentStep(0)}
          >
            Quay lại
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => setCurrentStep(2)}
          >
            Tiếp theo - Quyết định
          </Button>
        </Space>
      )
    } else {
      return (
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setCurrentStep(1)}
          >
            Quay lại xem tài liệu
          </Button>
        </Space>
      )
    }
  }

  return (
    <Modal
      title={
        <Space>
          <FileSearchOutlined />
          <span>Phê duyệt hoạt động</span>
          {activity && <Tag color="blue">{activity.code}</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      afterOpenChange={(open) => {
        if (open) handleAfterOpen()
      }}
      width={900}
      footer={renderFooter()}
      styles={{ body: { maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' } }}
    >
      {/* Steps indicator */}
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 16 }}
      />

      {/* Step content */}
      {currentStep === 0 && renderStep1()}
      {currentStep === 1 && renderStep2()}
      {currentStep === 2 && renderStep3()}
    </Modal>
  )
}

export default ApprovalWizardModal
