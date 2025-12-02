import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Typography,
  Space,
  Button,
  Badge,
  Descriptions,
  Divider,
  Tag,
  Input,
  Select,
  Table,
  message,
  Modal,
  Progress,
  Tooltip,
  Row,
  Col,
} from 'antd'
import {
  FileTextOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ApartmentOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  GlobalOutlined,
  BankOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { useAuth } from '../../shared/hooks'
import * as activityApi from '../../services/activityApi'
import type {
  Activity,
  ActivityStatus,
  ActivityFormData,
} from '../../services/activityApi'

dayjs.locale('vi')

const { Text, Title, Paragraph } = Typography
const { Option } = Select

function DepartmentActivitiesList() {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [formData, setFormData] = useState<ActivityFormData | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const { user } = useAuth()
  const hasOrganization = user?.organization_id

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await activityApi.getActivities({
        status: statusFilter,
        activity_type_id: typeFilter,
        search: searchText || undefined,
        page: pagination.current,
        per_page: pagination.pageSize,
      })

      setActivities(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách hoạt động')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, searchText, pagination.current, pagination.pageSize])

  // Fetch form data (dropdowns)
  const fetchFormData = async () => {
    try {
      const response = await activityApi.getActivityFormData()
      setFormData(response.data)
    } catch (error: any) {
      console.error('Failed to fetch form data:', error)
    }
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

  const handleView = async (activity: Activity) => {
    try {
      const response = await activityApi.getActivityById(activity.id)
      setSelectedActivity(response.data)
      setViewModalVisible(true)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin hoạt động')
    }
  }

  // Get status tag
  const getStatusTag = (status: ActivityStatus) => (
    <Tag color={activityApi.getStatusColor(status)}>
      {activityApi.getStatusLabel(status)}
    </Tag>
  )

  // Calculate statistics
  const stats = {
    total: pagination.total,
    completed: activities.filter(a => a.status === 'COMPLETED').length,
    inProgress: activities.filter(a => a.status === 'IN_PROGRESS').length,
    pending: activities.filter(a => a.status === 'PENDING_APPROVAL').length,
  }

  const columns: ColumnsType<Activity> = [
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
      render: (name: string) =>
        name ? <Tag color="blue">{name}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status: ActivityStatus) => getStatusTag(status),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'completion_percentage',
      key: 'completion_percentage',
      width: 100,
      align: 'center',
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
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Activity) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            Xem
          </Button>
        </Tooltip>
      ),
    },
  ]

  // No organization warning
  if (!hasOrganization) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <ApartmentOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            Bạn chưa thuộc đơn vị nào
          </Title>
          <Text type="secondary">
            Vui lòng liên hệ quản trị viên để được gán vào đơn vị
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Space align="center" style={{ marginBottom: 8 }}>
              <ApartmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                Hoạt động của {formData?.user_organization?.short_name || user?.organization_name || 'Đơn vị'}
              </Title>
            </Space>
            {formData?.user_organization?.name && (
              <div style={{ marginLeft: 32, marginBottom: 8 }}>
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                  <TeamOutlined /> {formData.user_organization.name}
                </Tag>
              </div>
            )}
            <Text type="secondary" style={{ marginLeft: 32, display: 'block' }}>
              Hiển thị các hoạt động do đơn vị của bạn chủ trì
            </Text>
          </div>

          {/* Statistics */}
          <Space size="large" wrap>
            <Badge count={stats.total} showZero color="blue">
              <Text strong>Tổng số: </Text>
            </Badge>
            <Badge count={stats.completed} showZero color="green">
              <Text strong>Hoàn thành: </Text>
            </Badge>
            <Badge count={stats.inProgress} showZero color="orange">
              <Text strong>Đang thực hiện: </Text>
            </Badge>
            <Badge count={stats.pending} showZero color="gold">
              <Text strong>Chờ duyệt: </Text>
            </Badge>
          </Space>

          {/* Filters */}
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Tìm kiếm theo mã hoặc tên..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {formData?.statuses.map((s) => (
                  <Option key={s.value} value={s.value}>
                    {s.label}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder="Loại hoạt động"
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {formData?.activity_types.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText('')
                  setStatusFilter(undefined)
                  setTypeFilter(undefined)
                  fetchActivities()
                }}
              >
                Làm mới
              </Button>
            </Col>
          </Row>

          {/* Empty State */}
          {activities.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <Title level={4} type="secondary">Chưa có hoạt động nào</Title>
              <Text type="secondary">
                Đơn vị chưa có hoạt động nào được tạo
              </Text>
            </div>
          )}

          {/* Table */}
          {(activities.length > 0 || loading) && (
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
              scroll={{ x: 1200 }}
            />
          )}
        </Space>
      </Card>

      {/* View Modal */}
      <Modal
        title="Chi tiết hoạt động"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSelectedActivity(null)
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedActivity && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Header */}
            <div>
              <Text type="secondary">Mã hoạt động</Text>
              <Title level={4} style={{ margin: '4px 0 8px' }}>
                {selectedActivity.code}
              </Title>
              <Space>
                {getStatusTag(selectedActivity.status)}
                <Progress
                  percent={selectedActivity.completion_percentage || 0}
                  size="small"
                  style={{ width: 150 }}
                />
              </Space>
            </div>

            <Divider />

            {/* Title and Description */}
            <div>
              <Title level={5}>{selectedActivity.title}</Title>
              <Paragraph type="secondary">
                {selectedActivity.description || 'Không có mô tả'}
              </Paragraph>
            </div>

            {/* Details Grid */}
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Loại hoạt động</Text>
                <div>
                  <Tag color="blue">{selectedActivity.activity_type?.name || '-'}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Lĩnh vực</Text>
                <div>
                  <Tag>{selectedActivity.activity_field?.name || '-'}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Đơn vị chủ trì</Text>
                <div>
                  <Text strong>{selectedActivity.lead_organization?.name || '-'}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Người tạo</Text>
                <div>
                  <Text>
                    {selectedActivity.creator
                      ? `${selectedActivity.creator.first_name} ${selectedActivity.creator.last_name}`
                      : '-'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Thời gian</Text>
                <div>
                  <Text>
                    {selectedActivity.start_date
                      ? `${dayjs(selectedActivity.start_date).format('DD/MM/YYYY HH:mm')} - ${
                          selectedActivity.end_date
                            ? dayjs(selectedActivity.end_date).format('DD/MM/YYYY HH:mm')
                            : '...'
                        }`
                      : '-'}
                  </Text>
                  {selectedActivity.start_date && selectedActivity.end_date && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (Thời lượng: {(() => {
                          const start = dayjs(selectedActivity.start_date)
                          const end = dayjs(selectedActivity.end_date)
                          const diffDays = end.diff(start, 'day')
                          const diffHours = end.diff(start, 'hour') % 24
                          let text = ''
                          if (diffDays > 0) text += `${diffDays} ngày `
                          if (diffHours > 0) text += `${diffHours} giờ`
                          return text || 'Cùng thời điểm'
                        })()})
                      </Text>
                    </div>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Địa điểm</Text>
                <div>
                  <Text>{selectedActivity.location || '-'}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Kinh phí</Text>
                <div>
                  <Text>
                    {selectedActivity.budget
                      ? `${selectedActivity.budget.toLocaleString('vi-VN')} VNĐ`
                      : '-'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Nguồn kinh phí</Text>
                <div>
                  <Text>{selectedActivity.budget_source || '-'}</Text>
                </div>
              </Col>
            </Row>

            {/* KPIs */}
            {selectedActivity.kpis && selectedActivity.kpis.length > 0 && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Chỉ tiêu KPI liên quan</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedActivity.kpis.map((kpi) => (
                      <Tag key={kpi.id} color={kpi.source === 'CENTRAL' ? 'blue' : 'purple'}>
                        {kpi.source === 'CENTRAL' ? <GlobalOutlined /> : <BankOutlined />}
                        {' '}
                        {kpi.code ? `[${kpi.code}] ` : ''}
                        {kpi.title}
                      </Tag>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Result Summary */}
            {selectedActivity.result_summary && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Tóm tắt kết quả</Text>
                  <Paragraph>{selectedActivity.result_summary}</Paragraph>
                </div>
              </>
            )}

            {/* Approval Info */}
            {selectedActivity.approved_by && (
              <>
                <Divider />
                <div>
                  <Text type="secondary">Thông tin phê duyệt</Text>
                  <div>
                    <Text>
                      Người phê duyệt:{' '}
                      {selectedActivity.approver
                        ? `${selectedActivity.approver.first_name} ${selectedActivity.approver.last_name}`
                        : '-'}
                    </Text>
                    <br />
                    <Text>
                      Thời gian:{' '}
                      {selectedActivity.approved_at
                        ? dayjs(selectedActivity.approved_at).format('DD/MM/YYYY HH:mm')
                        : '-'}
                    </Text>
                  </div>
                </div>
              </>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default DepartmentActivitiesList
