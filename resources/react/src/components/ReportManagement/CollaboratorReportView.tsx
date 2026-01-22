import { useState, useEffect, useCallback } from 'react'
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
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as reportBatchApi from '../../services/reportBatchApi'
import BatchFilesSection from './BatchFilesSection'
import type {
  CollaboratorBatch,
  CollaboratorSummary,
  CollaboratorBatchDetail,
  CollaboratorBatchActivity,
  BatchStatus,
} from '../../services/reportBatchApi'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function CollaboratorReportView() {
  // List state
  const [batches, setBatches] = useState<CollaboratorBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [searchText, setSearchText] = useState('')

  // Summary state
  const [summary, setSummary] = useState<CollaboratorSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailBatch, setDetailBatch] = useState<CollaboratorBatchDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Response form state
  const [responseModalVisible, setResponseModalVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<CollaboratorBatchActivity | null>(null)
  const [responseContent, setResponseContent] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const response = await reportBatchApi.getCollaboratorSummary()
      setSummary(response.data)
    } catch (error: any) {
      console.error('Failed to fetch summary:', error)
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
    fetchSummary()
    fetchBatches()
  }, [fetchBatches, fetchSummary])

  // Fetch batch detail
  const fetchBatchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await reportBatchApi.getCollaboratorBatchDetail(id)
      setDetailBatch(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin đợt báo cáo')
    } finally {
      setDetailLoading(false)
    }
  }

  // Open detail modal
  const handleViewDetail = (record: CollaboratorBatch) => {
    setDetailVisible(true)
    fetchBatchDetail(record.id)
  }

  // Open response form
  const handleOpenResponseForm = (activity: CollaboratorBatchActivity) => {
    setSelectedActivity(activity)
    setResponseContent(activity.my_response?.content || '')
    setResponseModalVisible(true)
  }

  // Submit response
  const handleSubmitResponse = async () => {
    if (!detailBatch || !selectedActivity) return

    if (!responseContent.trim()) {
      message.warning('Vui lòng nhập nội dung báo cáo')
      return
    }

    setSubmittingResponse(true)
    try {
      await reportBatchApi.submitCollaboratorResponse(detailBatch.id, {
        activity_id: selectedActivity.id,
        content: responseContent.trim(),
      })
      message.success('Đã gửi báo cáo thành công')
      setResponseModalVisible(false)
      setSelectedActivity(null)
      setResponseContent('')
      // Refresh detail
      fetchBatchDetail(detailBatch.id)
      // Refresh summary
      fetchSummary()
      fetchBatches()
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi báo cáo')
    } finally {
      setSubmittingResponse(false)
    }
  }

  // Status tag colors
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
  const columns: ColumnsType<CollaboratorBatch> = [
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
          <Space>
            <Text strong style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(record)}>
              {name}
            </Text>
            {record.my_response_stats && record.my_response_stats.pending > 0 && !record.is_overdue && (
              <Badge dot color="orange" />
            )}
            {record.is_overdue && record.my_response_stats && record.my_response_stats.pending > 0 && (
              <Badge dot color="red" />
            )}
          </Space>
          {record.organization && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              <TeamOutlined style={{ marginRight: 4 }} />
              {record.organization.short_name || record.organization.name}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Hạn nộp',
      key: 'deadline',
      width: 130,
      render: (_, record) => {
        if (!record.deadline) return <Text type="secondary">Không có hạn</Text>
        const isOverdue = dayjs().isAfter(dayjs(record.deadline))
        return (
          <Tooltip title={dayjs(record.deadline).format('DD/MM/YYYY HH:mm')}>
            <Tag
              icon={isOverdue ? <ExclamationCircleOutlined /> : <CalendarOutlined />}
              color={isOverdue ? 'error' : 'warning'}
            >
              {dayjs(record.deadline).format('DD/MM/YY HH:mm')}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 150,
      render: (_, record) => {
        if (!record.my_response_stats) return '-'
        const { submitted, total_required, pending } = record.my_response_stats
        const percent = total_required > 0 ? Math.round((submitted / total_required) * 100) : 0
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={percent === 100 ? 'success' : record.is_overdue ? 'exception' : 'active'}
              format={() => `${submitted}/${total_required}`}
            />
            {pending > 0 && (
              <Text type={record.is_overdue ? 'danger' : 'warning'} style={{ fontSize: 11 }}>
                {record.is_overdue ? 'Quá hạn' : `Còn ${pending} chưa nộp`}
              </Text>
            )}
          </div>
        )
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: BatchStatus) => getStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết & Nhập báo cáo">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleViewDetail(record)}
              disabled={record.is_overdue && record.my_response_stats?.pending === 0}
            >
              Báo cáo
            </Button>
          </Tooltip>
        </Space>
      ),
    },
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
              valueStyle={{ color: '#faad14' }}
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
              valueStyle={{ color: '#ff4d4f' }}
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
              valueStyle={{ color: '#52c41a' }}
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
              loading={loading}
            >
              Làm mới
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
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đợt`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
              }))
            },
          }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có đợt báo cáo nào cần bạn nhập"
              />
            ),
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
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
        styles={{ body: { padding: '16px 24px' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Đơn vị yêu cầu: <Text strong>{detailBatch?.organization?.short_name || detailBatch?.organization?.name}</Text>
            </Text>
            <Button onClick={() => setDetailVisible(false)}>Đóng</Button>
          </div>
        }
      >
        <Spin spinning={detailLoading}>
          {detailBatch && (
            <>
              {/* Overdue Alert */}
              {detailBatch.is_overdue && (
                <Alert
                  type="error"
                  message="Đã quá hạn nộp báo cáo"
                  description={`Hạn nộp: ${dayjs(detailBatch.deadline).format('DD/MM/YYYY HH:mm')}. Bạn không thể nộp thêm báo cáo.`}
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              <Row gutter={24}>
                {/* Left Column - Batch Info (Read-only) */}
                <Col span={8}>
                  <div style={{
                    background: '#fafafa',
                    padding: 16,
                    borderRadius: 8,
                    height: '100%'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <Title level={5} style={{ margin: 0 }}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        Thông tin đợt
                      </Title>
                      {getStatusTag(detailBatch.status)}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Tên đợt báo cáo</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text strong>{detailBatch.name}</Text>
                      </div>
                    </div>

                    {detailBatch.start_date && detailBatch.end_date && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Thời gian</Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag icon={<CalendarOutlined />} color="blue">
                            {dayjs(detailBatch.start_date).format('DD/MM/YYYY HH:mm')} - {dayjs(detailBatch.end_date).format('DD/MM/YYYY HH:mm')}
                          </Tag>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Hạn nộp</Text>
                      <div style={{ marginTop: 4 }}>
                        {detailBatch.deadline ? (
                          <Tag
                            icon={detailBatch.is_overdue ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
                            color={detailBatch.is_overdue ? 'error' : 'orange'}
                          >
                            {dayjs(detailBatch.deadline).format('DD/MM/YYYY HH:mm')}
                            {detailBatch.is_overdue && ' (Quá hạn)'}
                          </Tag>
                        ) : (
                          <Text type="secondary">Không có hạn</Text>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {detailBatch.my_response_stats && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Tiến độ của bạn</Text>
                        <div style={{ marginTop: 8 }}>
                          <Progress
                            percent={Math.round((detailBatch.my_response_stats.submitted / detailBatch.my_response_stats.total_required) * 100)}
                            status={detailBatch.my_response_stats.pending === 0 ? 'success' : 'active'}
                          />
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Đã nộp {detailBatch.my_response_stats.submitted}/{detailBatch.my_response_stats.total_required} hoạt động
                          </Text>
                        </div>
                      </div>
                    )}

                    {detailBatch.description && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Mô tả</Text>
                        <div style={{ marginTop: 4, padding: '8px', background: '#fff', borderRadius: 4, fontSize: 12 }}>
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

                    {/* Batch Files Section */}
                    <BatchFilesSection
                      batchId={detailBatch.id}
                      isOwner={false}
                      isCollaborator={true}
                      canEdit={!detailBatch.is_overdue}
                    />
                  </div>
                </Col>

                {/* Right Column - Activities to Report */}
                <Col span={16}>
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    <div style={{
                      background: '#e6f7ff',
                      padding: '10px 14px',
                      borderBottom: '1px solid #d9d9d9',
                      fontWeight: 500
                    }}>
                      <Space>
                        <UnorderedListOutlined />
                        <span>Các hoạt động cần báo cáo</span>
                        <Badge
                          count={detailBatch.activities?.length || 0}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      </Space>
                    </div>

                    <div style={{ maxHeight: 450, overflow: 'auto' }}>
                      {detailBatch.activities && detailBatch.activities.length > 0 ? (
                        detailBatch.activities.map((activity, idx) => (
                          <div
                            key={activity.id}
                            style={{
                              padding: '12px 14px',
                              background: idx % 2 === 0 ? '#fafafa' : '#fff',
                              borderBottom: idx < detailBatch.activities!.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <Space>
                                  <Text strong style={{ fontSize: 13 }}>{idx + 1}. {activity.title}</Text>
                                  {activity.my_response ? (
                                    <Tag color="success" icon={<CheckCircleOutlined />}>Đã nộp</Tag>
                                  ) : (
                                    <Tag color="warning" icon={<ClockCircleOutlined />}>Chưa nộp</Tag>
                                  )}
                                </Space>
                                <div style={{ marginTop: 4 }}>
                                  <Space size={8}>
                                    <Tag color="blue" style={{ fontSize: 10 }}>
                                      {activity.lead_organization?.short_name || activity.lead_organization?.name}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      {dayjs(activity.start_date).format('DD/MM/YY')} - {dayjs(activity.end_date).format('DD/MM/YY')}
                                    </Text>
                                  </Space>
                                </div>

                                {/* Show existing response */}
                                {activity.my_response && (
                                  <div style={{
                                    marginTop: 8,
                                    padding: '8px 10px',
                                    background: '#f6ffed',
                                    borderRadius: 4,
                                    borderLeft: '3px solid #52c41a'
                                  }}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        <UserOutlined style={{ marginRight: 4 }} />
                                        {activity.my_response.submitted_by?.first_name} {activity.my_response.submitted_by?.last_name}
                                        {' • '}
                                        {dayjs(activity.my_response.submitted_at).format('DD/MM/YY HH:mm')}
                                      </Text>
                                    </div>
                                    <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{activity.my_response.content}</Text>
                                  </div>
                                )}
                              </div>

                              <div>
                                {activity.can_submit ? (
                                  <Button
                                    type={activity.my_response ? 'default' : 'primary'}
                                    size="small"
                                    icon={activity.my_response ? <EditOutlined /> : <SendOutlined />}
                                    onClick={() => handleOpenResponseForm(activity)}
                                  >
                                    {activity.my_response ? 'Sửa' : 'Nhập báo cáo'}
                                  </Button>
                                ) : (
                                  <Tooltip title="Đã quá hạn nộp">
                                    <Button size="small" disabled icon={<ExclamationCircleOutlined />}>
                                      Quá hạn
                                    </Button>
                                  </Tooltip>
                                )}
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
            <SendOutlined style={{ color: '#52c41a' }} />
            <span>{selectedActivity?.my_response ? 'Chỉnh sửa báo cáo' : 'Nhập nội dung báo cáo'}</span>
          </Space>
        }
        open={responseModalVisible}
        onCancel={() => {
          setResponseModalVisible(false)
          setSelectedActivity(null)
          setResponseContent('')
        }}
        width={600}
        centered
        okText={selectedActivity?.my_response ? 'Cập nhật' : 'Gửi báo cáo'}
        okButtonProps={{ loading: submittingResponse, icon: <SendOutlined /> }}
        onOk={handleSubmitResponse}
        cancelText="Hủy"
      >
        {selectedActivity && (
          <div>
            {/* Activity Info */}
            <div style={{
              background: '#e6f7ff',
              padding: '10px 12px',
              borderRadius: 4,
              marginBottom: 16
            }}>
              <Text strong style={{ fontSize: 13 }}>{selectedActivity.title}</Text>
              <div style={{ marginTop: 4 }}>
                <Space>
                  <Tag color="blue" style={{ fontSize: 10 }}>
                    {selectedActivity.lead_organization?.short_name || selectedActivity.lead_organization?.name}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(selectedActivity.start_date).format('DD/MM/YYYY')} - {dayjs(selectedActivity.end_date).format('DD/MM/YYYY')}
                  </Text>
                </Space>
              </div>
            </div>

            {/* Response Input */}
            <div>
              <Text style={{ marginBottom: 8, display: 'block' }}>Nội dung báo cáo:</Text>
              <TextArea
                rows={6}
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Nhập nội dung kết quả hoạt động mà đơn vị bạn đã thực hiện..."
                maxLength={5000}
                showCount
              />
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
