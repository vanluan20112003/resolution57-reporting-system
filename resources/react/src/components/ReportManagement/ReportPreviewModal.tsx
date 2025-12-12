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
  Empty,
  Button,
  message,
  Tooltip,
  Spin,
  Alert,
} from 'antd'
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as reportApi from '../../services/reportApi'
import type { PreviewActivity, PreviewFilters, PeriodType, ViewMode, ExportColumn } from '../../services/reportApi'

const { Text, Title } = Typography
const { Option } = Select
const { TextArea } = Input

interface ReportPreviewModalProps {
  visible: boolean
  onClose: () => void
  periodType: PeriodType
  month: number | null
  quarter: number | null
  year: number
  viewMode: ViewMode
  selectedColumns: string[]
  availableColumns: ExportColumn[]
  notes?: string
  reportName?: string
  onExport: (excludedIds: string[]) => void
  exportLoading: boolean
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

// Column key to display name mapping (matches Excel export)
const columnLabels: Record<string, string> = {
  stt: 'STT',
  nhiem_vu_trong_tam: 'Nhiệm vụ trọng tâm',
  noi_dung_cu_the: 'Nội dung cụ thể',
  phuong_an_de_xuat: 'Phương án đề xuất',
  time_period: 'Thời gian thực hiện',
  budget: 'Dự toán',
  qualitative_target: 'Mục tiêu định tính',
  quantitative_target: 'Mục tiêu định lượng',
  implementation_content: 'Nội dung thực hiện',
  updated_at: 'Cập nhật',
  evidence_link: 'Link minh chứng',
  leader: 'Lãnh đạo phụ trách',
  organization: 'Đơn vị chủ trì',
  partner_organizations: 'Đơn vị phối hợp',
  completion_date: 'Ngày hoàn thành',
  result_evaluation: 'Kết quả đánh giá',
}

function ReportPreviewModal({
  visible,
  onClose,
  periodType,
  month,
  quarter,
  year,
  viewMode,
  selectedColumns,
  availableColumns,
  notes,
  reportName,
  onExport,
  exportLoading,
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<PreviewActivity[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  })
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
  }>({ total: 0, by_status: {} })

  // Filters
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  // Excluded activities (user can remove from export)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

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
      message.error('Không thể tải xem trước báo cáo')
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
      setExcludedIds(new Set())
    }
  }, [visible])

  // Handle search
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Handle table change
  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  // Toggle exclude activity
  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
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

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  // Build dynamic columns based on selectedColumns
  const buildColumns = (): ColumnsType<PreviewActivity> => {
    const cols: ColumnsType<PreviewActivity> = []

    // Always add action column first
    cols.push({
      title: '',
      key: 'action',
      width: 40,
      fixed: 'left',
      render: (_, record) => (
        <Tooltip title={excludedIds.has(record.id) ? 'Thêm vào báo cáo' : 'Loại khỏi báo cáo'}>
          <Button
            type="text"
            size="small"
            danger={!excludedIds.has(record.id)}
            icon={excludedIds.has(record.id) ? <EditOutlined /> : <DeleteOutlined />}
            onClick={() => toggleExclude(record.id)}
          />
        </Tooltip>
      ),
    })

    selectedColumns.forEach((colKey, index) => {
      const label = columnLabels[colKey] || colKey

      switch (colKey) {
        case 'stt':
          cols.push({
            title: label,
            key: 'stt',
            width: 50,
            align: 'center',
            render: (_, __, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1,
          })
          break

        case 'nhiem_vu_trong_tam':
          cols.push({
            title: label,
            key: 'nhiem_vu_trong_tam',
            width: 200,
            render: (_, record) => (
              <Text style={{ fontSize: 12 }}>
                {record.kpis && record.kpis.length > 0
                  ? record.kpis.map((k) => k.title).join('; ')
                  : '-'}
              </Text>
            ),
          })
          break

        case 'noi_dung_cu_the':
          cols.push({
            title: label,
            dataIndex: 'description',
            key: 'noi_dung_cu_the',
            width: 180,
            ellipsis: true,
            render: (val: string) => <Text style={{ fontSize: 12 }}>{val || '-'}</Text>,
          })
          break

        case 'phuong_an_de_xuat':
          cols.push({
            title: label,
            dataIndex: 'title',
            key: 'phuong_an_de_xuat',
            width: 200,
            render: (val: string) => <Text style={{ fontSize: 12 }} strong>{val}</Text>,
          })
          break

        case 'time_period':
          cols.push({
            title: label,
            key: 'time_period',
            width: 120,
            render: (_, record) => (
              <Text style={{ fontSize: 11 }}>
                {record.start_date
                  ? `${dayjs(record.start_date).format('DD/MM/YY')} - ${
                      record.end_date ? dayjs(record.end_date).format('DD/MM/YY') : '...'
                    }`
                  : '-'}
              </Text>
            ),
          })
          break

        case 'budget':
          cols.push({
            title: label,
            dataIndex: 'budget',
            key: 'budget',
            width: 100,
            align: 'right',
            render: (val: number) => <Text style={{ fontSize: 11 }}>{formatCurrency(val)}</Text>,
          })
          break

        case 'qualitative_target':
          cols.push({
            title: label,
            dataIndex: 'qualitative_target',
            key: 'qualitative_target',
            width: 150,
            ellipsis: true,
            render: (val: string) => <Text style={{ fontSize: 11 }}>{val || '-'}</Text>,
          })
          break

        case 'quantitative_target':
          cols.push({
            title: label,
            dataIndex: 'quantitative_target',
            key: 'quantitative_target',
            width: 150,
            ellipsis: true,
            render: (val: string) => <Text style={{ fontSize: 11 }}>{val || '-'}</Text>,
          })
          break

        case 'implementation_content':
          cols.push({
            title: label,
            dataIndex: 'focus_content',
            key: 'implementation_content',
            width: 180,
            ellipsis: true,
            render: (val: string) => <Text style={{ fontSize: 11 }}>{val || '-'}</Text>,
          })
          break

        case 'updated_at':
          cols.push({
            title: label,
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 90,
            render: (val: string) => (
              <Text style={{ fontSize: 11 }}>{val ? dayjs(val).format('DD/MM/YY') : '-'}</Text>
            ),
          })
          break

        case 'leader':
          cols.push({
            title: label,
            key: 'leader',
            width: 120,
            render: (_, record: any) => (
              <Text style={{ fontSize: 11 }}>
                {record.participants
                  ?.filter((p: any) => p.role === 'LEADER')
                  .map((p: any) => p.user?.first_name + ' ' + p.user?.last_name)
                  .join(', ') || '-'}
              </Text>
            ),
          })
          break

        case 'organization':
          cols.push({
            title: label,
            key: 'organization',
            width: 100,
            render: (_, record) => (
              <Text style={{ fontSize: 11 }}>
                {record.lead_organization?.short_name || record.lead_organization?.name || '-'}
              </Text>
            ),
          })
          break

        case 'partner_organizations':
          cols.push({
            title: label,
            key: 'partner_organizations',
            width: 120,
            render: (_, record: any) => (
              <Text style={{ fontSize: 11 }}>
                {record.collaborating_organizations
                  ?.map((o: any) => o.short_name || o.name)
                  .join(', ') || '-'}
              </Text>
            ),
          })
          break

        case 'completion_date':
          cols.push({
            title: label,
            dataIndex: 'end_date',
            key: 'completion_date',
            width: 90,
            render: (val: string) => (
              <Text style={{ fontSize: 11 }}>{val ? dayjs(val).format('DD/MM/YY') : '-'}</Text>
            ),
          })
          break

        case 'result_evaluation':
          cols.push({
            title: label,
            dataIndex: 'result',
            key: 'result_evaluation',
            width: 180,
            ellipsis: true,
            render: (val: string) => <Text style={{ fontSize: 11 }}>{val || '-'}</Text>,
          })
          break

        default:
          // For any other columns
          cols.push({
            title: label,
            dataIndex: colKey,
            key: colKey,
            width: 100,
            render: (val: any) => <Text style={{ fontSize: 11 }}>{val || '-'}</Text>,
          })
      }
    })

    // Add status column (for reference, not in Excel)
    cols.push({
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'right',
      render: (status: string) => {
        const config = statusConfig[status] || { label: status, color: 'default' }
        return <Tag color={config.color} style={{ fontSize: 10 }}>{config.label}</Tag>
      },
    })

    return cols
  }

  // Filter out excluded activities for count
  const includedCount = activities.filter((a) => !excludedIds.has(a.id)).length
  const totalIncluded = summary.total - excludedIds.size

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>Xem trước nội dung báo cáo Excel - {getPeriodLabel()}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      footer={[
        <Space key="footer" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">
            {excludedIds.size > 0 && (
              <span style={{ color: '#ff4d4f' }}>
                Đã loại {excludedIds.size} hoạt động khỏi báo cáo.{' '}
              </span>
            )}
            Sẽ xuất {totalIncluded} hoạt động với {selectedColumns.length} cột
          </Text>
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={() => onExport(Array.from(excludedIds))}
            >
              Xuất báo cáo Excel
            </Button>
          </Space>
        </Space>,
      ]}
    >
      {/* Report Header Preview */}
      <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
        <Title level={5} style={{ textAlign: 'center', margin: 0 }}>
          BÁO CÁO TIẾN ĐỘ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT 57-NQ/TW
        </Title>
        <Text style={{ display: 'block', textAlign: 'center' }}>
          {getPeriodLabel()} - Chế độ: {viewMode === 'kpis' ? 'Theo KPI' : 'Theo hoạt động'}
        </Text>
        {reportName && (
          <Text style={{ display: 'block', textAlign: 'center' }} type="secondary">
            Tên file: {reportName}
          </Text>
        )}
      </Card>

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
              title="Sẽ xuất"
              value={totalIncluded}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#1890ff' }}
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
      </Row>

      {/* Info about columns */}
      <Alert
        message={
          <Space>
            <span>Các cột sẽ xuất:</span>
            {selectedColumns.slice(0, 6).map((col) => (
              <Tag key={col}>{columnLabels[col] || col}</Tag>
            ))}
            {selectedColumns.length > 6 && <Tag>+{selectedColumns.length - 6} cột khác</Tag>}
          </Space>
        }
        type="info"
        style={{ marginBottom: 16 }}
      />

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

      {/* Activities Table - Excel Preview */}
      <Table
        columns={buildColumns()}
        dataSource={activities}
        rowKey="id"
        loading={loading}
        rowClassName={(record) => (excludedIds.has(record.id) ? 'excluded-row' : '')}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: (total) => `Tổng ${total} hoạt động`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1600 }}
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

      <style>{`
        .excluded-row {
          background-color: #fff1f0 !important;
          opacity: 0.6;
        }
        .excluded-row td {
          text-decoration: line-through;
        }
      `}</style>
    </Modal>
  )
}

export default ReportPreviewModal
