import { useState } from 'react'
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
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Activity } from '../../services/activityApi'
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

          {/* KPIs */}
          {activity.kpis && activity.kpis.length > 0 && (
            <>
              <Divider />
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Chỉ tiêu KPI liên quan ({activity.kpis.length} chỉ tiêu)
                </Text>
                <div>
                  {activity.kpis.map((kpi) => (
                    <Tag
                      key={kpi.id}
                      color={kpi.source === 'CENTRAL' ? 'blue' : 'purple'}
                      style={{ marginBottom: 4 }}
                    >
                      {kpi.code ? `[${kpi.code}] ` : ''}
                      {kpi.title}
                    </Tag>
                  ))}
                </div>
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

  // Step 2: Decision
  const renderStep2 = () => (
    <div style={{ padding: '16px 0' }}>
      <Alert
        type="warning"
        showIcon
        icon={<CheckCircleOutlined />}
        message="Bước 2: Quyết định phê duyệt"
        description="Bạn đã xem xét thông tin hoạt động. Vui lòng chọn phê duyệt hoặc từ chối."
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
      title: 'Xem xét',
      icon: <FileSearchOutlined />,
    },
    {
      title: 'Quyết định',
      icon: <CheckCircleOutlined />,
    },
  ]

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
      width={800}
      footer={
        currentStep === 0 ? (
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => setCurrentStep(1)}
            >
              Tiếp theo - Quyết định
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setCurrentStep(0)}
            >
              Quay lại xem xét
            </Button>
          </Space>
        )
      }
      styles={{ body: { maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' } }}
    >
      {/* Steps indicator */}
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 16 }}
      />

      {/* Step content */}
      {currentStep === 0 ? renderStep1() : renderStep2()}
    </Modal>
  )
}

export default ApprovalWizardModal
