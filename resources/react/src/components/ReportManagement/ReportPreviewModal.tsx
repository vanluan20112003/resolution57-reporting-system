import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Card,
  Typography,
  Progress,
  Empty,
  Button,
} from 'antd'
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as reportApi from '../../services/reportApi'
import type { PreviewActivity, PreviewFilters, PeriodType } from '../../services/reportApi'

const { Text } = Typography
const { Option } = Select

interface ReportPreviewModalProps {
  visible: boolean
  onClose: () => void
  periodType: PeriodType
  month: number | null
  quarter: number | null
  year: number
}

// Status labels and colors
const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: 'orange' },
  APPROVED: { label: 'Đã duyệt', color: 'cyan' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'blue' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  POSTPONED: { label: 'Tạm hoãn', color: 'gold' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
}

function ReportPreviewModal({
  visible,
  onClose,
  periodType,
  month,
  quarter,
  year,
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<PreviewActivity[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
  }>({ total: 0, by_status: {} })

  // Filters
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    setLoading(true)
    try {
      const filters: PreviewFilters = {
        periodType,
        year,
        page: pagination.current,
        per_page: pagination.pageSize,
      }

      if (periodType === 'month' && month) {
        filters.month = month
      }
      if (periodType === 'quarter' && quarter) {
        filters.quarter = quarter
      }
      if (searchText) {
        filters.search = searchText
      }
      if (statusFilter) {
        filters.status = statusFilter
      }

      const response = await reportApi.getReportPreview(filters)
      setActivities(response.data.activities)
      setSummary(response.data.summary)
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }))
    } catch (error: any) {
      console.error('Failed to fetch preview:', error)
    } finally {
      setLoading(false)
    }
  }, [periodType, month, quarter, year, pagination.current, pagination.pageSize, searchText, statusFilter])

  // Fetch when modal opens or filters change
  useEffect(() => {
    if (visible) {
      fetchPreview()
    }
  }, [visible, fetchPreview])

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchText('')
      setStatusFilter(undefined)
      setPagination((prev) => ({ ...prev, current: 1 }))
    }
  }, [visible])

  // Handle search
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchPreview()
  }

  // Handle table change
  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  // Get period label
  const getPeriodLabel = () => {
    if (periodType === 'month' && month) {
      return `Tháng ${month}/${year}`
    }
    if (periodType === 'quarter' && quarter) {
      return `Quý ${quarter}/${year}`
    }
    return `Năm ${year}`
  }

  // Table columns
  const columns: ColumnsType<PreviewActivity> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => <Text code>{code || '-'}</Text>,
    },
    {
      title: 'Tên hoạt động',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Loại',
      dataIndex: ['activity_type', 'name'],
      key: 'activity_type',
      width: 130,
      render: (name: string) => name ? <Tag color="blue">{name}</Tag> : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'default' }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: 'Tiến độ',
      dataIndex: 'completion_percentage',
      key: 'completion_percentage',
      width: 100,
      render: (percent: number) => (
        <Progress percent={percent || 0} size="small" status={percent === 100 ? 'success' : 'active'} />
      ),
    },
    {
      title: 'Thời gian',
      key: 'date_range',
      width: 180,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.start_date
            ? `${dayjs(record.start_date).format('DD/MM/YYYY')} - ${
                record.end_date ? dayjs(record.end_date).format('DD/MM/YYYY') : '...'
              }`
            : '-'}
        </Text>
      ),
    },
    {
      title: 'KPIs',
      key: 'kpis',
      width: 120,
      render: (_, record) => {
        if (!record.kpis || record.kpis.length === 0) {
          return <Text type="secondary">-</Text>
        }
        return (
          <Space wrap size={2}>
            {record.kpis.slice(0, 2).map((kpi) => (
              <Tag key={kpi.id} style={{ fontSize: 10 }}>
                {kpi.code || kpi.title.slice(0, 10)}
              </Tag>
            ))}
            {record.kpis.length > 2 && (
              <Tag style={{ fontSize: 10 }}>+{record.kpis.length - 2}</Tag>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Xem trước báo cáo - {getPeriodLabel()}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1100}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Tổng hoạt động"
              value={summary.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Hoàn thành"
              value={summary.by_status['COMPLETED'] || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Đang thực hiện"
              value={summary.by_status['IN_PROGRESS'] || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Chờ duyệt"
              value={summary.by_status['PENDING_APPROVAL'] || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Input
            placeholder="Tìm theo mã hoặc tên hoạt động..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        <Col span={8}>
          <Select
            style={{ width: '100%' }}
            placeholder="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPagination((prev) => ({ ...prev, current: 1 }))
            }}
            allowClear
          >
            {Object.entries(statusConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                <Tag color={config.color}>{config.label}</Tag>
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={6}>
          <Button icon={<FilterOutlined />} onClick={handleSearch}>
            Lọc
          </Button>
        </Col>
      </Row>

      {/* Activities Table */}
      <Table
        columns={columns}
        dataSource={activities}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} hoạt động`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
        size="small"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có hoạt động nào trong kỳ báo cáo này"
            />
          ),
        }}
      />
    </Modal>
  )
}

export default ReportPreviewModal
