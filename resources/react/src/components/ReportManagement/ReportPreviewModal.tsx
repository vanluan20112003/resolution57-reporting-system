import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Card,
  Typography,
  Empty,
  Button,
  message,
  Tooltip,
  Alert,
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as reportApi from '../../services/reportApi'
import type { PreviewRow, PreviewActivityRow, PreviewFilters, PeriodType, ViewMode, ExportColumn } from '../../services/reportApi'

const { Text, Title } = Typography

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
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
  }>({ total: 0, by_status: {} })
  const [organization, setOrganization] = useState<{ name: string; short_name?: string } | null>(null)

  // Excluded activities (user can remove from export)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    setLoading(true)
    try {
      const filters: PreviewFilters = {
        periodType,
        year,
      }

      if (periodType === 'month' && month) {
        filters.month = month
      }
      if (periodType === 'quarter' && quarter) {
        filters.quarter = quarter
      }

      const response = await reportApi.getReportPreview(filters)
      setRows(response.data.rows)
      setSummary(response.data.summary)
      setOrganization(response.data.organization)
    } catch (error: any) {
      console.error('Failed to fetch preview:', error)
      message.error('Không thể tải xem trước báo cáo')
    } finally {
      setLoading(false)
    }
  }, [periodType, month, quarter, year])

  // Fetch when modal opens
  useEffect(() => {
    if (visible) {
      fetchPreview()
    }
  }, [visible, fetchPreview])

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setExcludedIds(new Set())
    }
  }, [visible])

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
    if (!value) return ''
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  // Build table columns based on selectedColumns
  const buildColumns = (): ColumnsType<PreviewRow> => {
    const cols: ColumnsType<PreviewRow> = []

    // Action column (exclude/include)
    cols.push({
      title: '',
      key: 'action',
      width: 40,
      fixed: 'left',
      render: (_, record) => {
        if (record.type === 'category') return null
        const activityRow = record as PreviewActivityRow
        const isExcluded = excludedIds.has(activityRow.id)
        return (
          <Tooltip title={isExcluded ? 'Thêm vào báo cáo' : 'Loại khỏi báo cáo'}>
            <Button
              type="text"
              size="small"
              danger={!isExcluded}
              icon={isExcluded ? <UndoOutlined /> : <DeleteOutlined />}
              onClick={() => toggleExclude(activityRow.id)}
            />
          </Tooltip>
        )
      },
    })

    // Build columns based on selectedColumns
    selectedColumns.forEach((colKey) => {
      const label = columnLabels[colKey] || colKey

      switch (colKey) {
        case 'stt':
          cols.push({
            title: label,
            key: 'stt',
            width: 50,
            align: 'center',
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return row.stt || ''
            },
          })
          break

        case 'nhiem_vu_trong_tam':
          cols.push({
            title: label,
            key: 'nhiem_vu_trong_tam',
            width: 250,
            render: (_, record) => {
              if (record.type === 'category') {
                return (
                  <Text strong style={{ fontSize: 13 }}>
                    {record.roman_numeral}. {record.category_name}
                  </Text>
                )
              }
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 12 }}>{row.nhiem_vu_trong_tam}</Text>
            },
          })
          break

        case 'noi_dung_cu_the':
          cols.push({
            title: label,
            key: 'noi_dung_cu_the',
            width: 180,
            ellipsis: true,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 12 }}>{row.noi_dung_cu_the || '-'}</Text>
            },
          })
          break

        case 'phuong_an_de_xuat':
          cols.push({
            title: label,
            key: 'phuong_an_de_xuat',
            width: 200,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 12 }} strong>{row.phuong_an_de_xuat}</Text>
            },
          })
          break

        case 'time_period':
          cols.push({
            title: label,
            key: 'time_period',
            width: 100,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.time_period || '-'}</Text>
            },
          })
          break

        case 'budget':
          cols.push({
            title: label,
            key: 'budget',
            width: 100,
            align: 'right',
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{formatCurrency(row.budget)}</Text>
            },
          })
          break

        case 'qualitative_target':
          cols.push({
            title: label,
            key: 'qualitative_target',
            width: 150,
            ellipsis: true,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.qualitative_target || '-'}</Text>
            },
          })
          break

        case 'quantitative_target':
          cols.push({
            title: label,
            key: 'quantitative_target',
            width: 150,
            ellipsis: true,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.quantitative_target || '-'}</Text>
            },
          })
          break

        case 'implementation_content':
          cols.push({
            title: label,
            key: 'implementation_content',
            width: 180,
            ellipsis: true,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.implementation_content || '-'}</Text>
            },
          })
          break

        case 'updated_at':
          cols.push({
            title: label,
            key: 'updated_at',
            width: 90,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.updated_at || '-'}</Text>
            },
          })
          break

        case 'evidence_link':
          cols.push({
            title: label,
            key: 'evidence_link',
            width: 100,
            render: (_, record) => {
              if (record.type === 'category') return null
              return <Text style={{ fontSize: 11, color: '#999' }}>(Tự động tạo)</Text>
            },
          })
          break

        case 'leader':
          cols.push({
            title: label,
            key: 'leader',
            width: 120,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.leader || '-'}</Text>
            },
          })
          break

        case 'organization':
          cols.push({
            title: label,
            key: 'organization',
            width: 100,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.organization || '-'}</Text>
            },
          })
          break

        case 'partner_organizations':
          cols.push({
            title: label,
            key: 'partner_organizations',
            width: 120,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.partner_organizations || '-'}</Text>
            },
          })
          break

        case 'completion_date':
          cols.push({
            title: label,
            key: 'completion_date',
            width: 90,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.completion_date || '-'}</Text>
            },
          })
          break

        case 'result_evaluation':
          cols.push({
            title: label,
            key: 'result_evaluation',
            width: 180,
            ellipsis: true,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              return <Text style={{ fontSize: 11 }}>{row.result_evaluation || '-'}</Text>
            },
          })
          break
      }
    })

    // Status column (for reference)
    cols.push({
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        if (record.type === 'category') return null
        const row = record as PreviewActivityRow
        const config = statusConfig[row.status] || { label: row.status, color: 'default' }
        return <Tag color={config.color} style={{ fontSize: 10 }}>{config.label}</Tag>
      },
    })

    return cols
  }

  // Count excluded activities
  const activityRows = rows.filter((r): r is PreviewActivityRow => r.type === 'activity')
  const totalIncluded = activityRows.length - excludedIds.size

  // Get row key
  const getRowKey = (record: PreviewRow, index: number): string => {
    if (record.type === 'category') {
      return `category-${record.category_id || index}`
    }
    return record.id
  }

  // Get row class name
  const getRowClassName = (record: PreviewRow): string => {
    if (record.type === 'category') {
      return 'category-row'
    }
    const activityRow = record as PreviewActivityRow
    if (excludedIds.has(activityRow.id)) {
      return 'excluded-row'
    }
    return ''
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
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
          {getPeriodLabel()} - Đơn vị: {organization?.short_name || organization?.name || '...'}
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

      {/* Preview Table */}
      <Table
        columns={buildColumns()}
        dataSource={rows}
        rowKey={getRowKey}
        loading={loading}
        rowClassName={getRowClassName}
        pagination={false}
        scroll={{ x: 1600, y: 400 }}
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
        .category-row {
          background-color: #e6f7ff !important;
        }
        .category-row td {
          font-weight: bold;
        }
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
