import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Input,
  Select,
  Divider,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  UndoOutlined,
  SearchOutlined,
  FilterOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  ClearOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as reportApi from '../../services/reportApi'
import type { PreviewRow, PreviewActivityRow, PreviewFilters, PeriodType, ViewMode, ExportColumn } from '../../services/reportApi'

const { Text, Title } = Typography

export interface EditedRow {
  id: string
  edits: Record<string, string | number | null>
}

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
  onExport: (excludedIds: string[], editedRows: EditedRow[]) => void
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

  // Search and filter state
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editedRows, setEditedRows] = useState<Map<string, Partial<PreviewActivityRow>>>(new Map())

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
      setSearchText('')
      setStatusFilter(null)
      setEditingCell(null)
      setEditedRows(new Map())
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

  // Get row with edits applied
  const getRowWithEdits = (row: PreviewActivityRow): PreviewActivityRow => {
    const edits = editedRows.get(row.id)
    if (!edits) return row
    return { ...row, ...edits }
  }

  // Handle cell edit
  const handleCellEdit = (id: string, field: string, value: string | number) => {
    setEditedRows((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(id) || {}
      newMap.set(id, { ...existing, [field]: value })
      return newMap
    })
    setEditingCell(null)
  }

  // Filter rows based on search and status
  const filteredRows = useMemo(() => {
    if (!searchText && !statusFilter) return rows

    return rows.filter((row) => {
      // Always keep category rows visible
      if (row.type === 'category') return true

      const activityRow = row as PreviewActivityRow
      const rowWithEdits = getRowWithEdits(activityRow)

      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const matchesSearch =
          rowWithEdits.nhiem_vu_trong_tam?.toLowerCase().includes(searchLower) ||
          rowWithEdits.noi_dung_cu_the?.toLowerCase().includes(searchLower) ||
          rowWithEdits.phuong_an_de_xuat?.toLowerCase().includes(searchLower) ||
          rowWithEdits.implementation_content?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter && rowWithEdits.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [rows, searchText, statusFilter, editedRows])

  // Bulk actions
  const selectAllVisible = () => {
    // Remove from excluded (include in export)
    const visibleActivityIds = filteredRows
      .filter((r): r is PreviewActivityRow => r.type === 'activity')
      .map((r) => r.id)
    setExcludedIds((prev) => {
      const newSet = new Set(prev)
      visibleActivityIds.forEach((id) => newSet.delete(id))
      return newSet
    })
  }

  const deselectAllVisible = () => {
    // Add to excluded (remove from export)
    const visibleActivityIds = filteredRows
      .filter((r): r is PreviewActivityRow => r.type === 'activity')
      .map((r) => r.id)
    setExcludedIds((prev) => {
      const newSet = new Set(prev)
      visibleActivityIds.forEach((id) => newSet.add(id))
      return newSet
    })
  }

  const clearExclusions = () => {
    setExcludedIds(new Set())
  }

  const excludeByStatus = (status: string) => {
    const idsWithStatus = rows
      .filter((r): r is PreviewActivityRow => r.type === 'activity' && r.status === status)
      .map((r) => r.id)
    setExcludedIds((prev) => {
      const newSet = new Set(prev)
      idsWithStatus.forEach((id) => newSet.add(id))
      return newSet
    })
  }

  // Bulk action menu
  const bulkActionMenuItems: MenuProps['items'] = [
    {
      key: 'exclude-draft',
      label: 'Loại tất cả Nháp',
      onClick: () => excludeByStatus('DRAFT'),
    },
    {
      key: 'exclude-pending',
      label: 'Loại tất cả Chờ duyệt',
      onClick: () => excludeByStatus('PENDING_APPROVAL'),
    },
    {
      key: 'exclude-cancelled',
      label: 'Loại tất cả Đã hủy',
      onClick: () => excludeByStatus('CANCELLED'),
    },
    {
      key: 'exclude-postponed',
      label: 'Loại tất cả Tạm hoãn',
      onClick: () => excludeByStatus('POSTPONED'),
    },
    { type: 'divider' },
    {
      key: 'reset-edits',
      label: 'Hoàn tác tất cả chỉnh sửa',
      onClick: () => setEditedRows(new Map()),
      disabled: editedRows.size === 0,
    },
  ]

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

  // Editable cell renderer
  const renderEditableCell = (
    record: PreviewActivityRow,
    field: keyof PreviewActivityRow,
    displayValue: React.ReactNode,
    inputType: 'text' | 'number' = 'text'
  ) => {
    const rowWithEdits = getRowWithEdits(record)
    const currentValue = rowWithEdits[field] as string | number | null
    const isEditing = editingCell?.id === record.id && editingCell?.field === field
    const hasEdit = editedRows.has(record.id) && editedRows.get(record.id)?.[field] !== undefined

    if (isEditing) {
      return (
        <Input
          size="small"
          type={inputType}
          defaultValue={currentValue ?? ''}
          autoFocus
          onBlur={(e) => {
            const val = inputType === 'number' ? Number(e.target.value) : e.target.value
            if (val !== record[field]) {
              handleCellEdit(record.id, field, val)
            } else {
              setEditingCell(null)
            }
          }}
          onPressEnter={(e) => {
            const val = inputType === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value
            if (val !== record[field]) {
              handleCellEdit(record.id, field, val)
            } else {
              setEditingCell(null)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingCell(null)
            }
          }}
          style={{ width: '100%' }}
        />
      )
    }

    return (
      <div
        onClick={() => setEditingCell({ id: record.id, field })}
        style={{
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 2,
          background: hasEdit ? '#e6f7ff' : 'transparent',
          border: hasEdit ? '1px dashed #1890ff' : '1px solid transparent',
          minHeight: 20,
        }}
        title="Click để chỉnh sửa"
      >
        {displayValue}
      </div>
    )
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
              const row = getRowWithEdits(record as PreviewActivityRow)
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'nhiem_vu_trong_tam',
                <Text style={{ fontSize: 12 }}>{rowWithEdits.nhiem_vu_trong_tam || '-'}</Text>
              )
            },
          })
          break

        case 'noi_dung_cu_the':
          cols.push({
            title: label,
            key: 'noi_dung_cu_the',
            width: 180,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'noi_dung_cu_the',
                <Text style={{ fontSize: 12 }}>{rowWithEdits.noi_dung_cu_the || '-'}</Text>
              )
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'phuong_an_de_xuat',
                <Text style={{ fontSize: 12 }} strong>{rowWithEdits.phuong_an_de_xuat || '-'}</Text>
              )
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'time_period',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.time_period || '-'}</Text>
              )
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'budget',
                <Text style={{ fontSize: 11 }}>{formatCurrency(rowWithEdits.budget)}</Text>,
                'number'
              )
            },
          })
          break

        case 'qualitative_target':
          cols.push({
            title: label,
            key: 'qualitative_target',
            width: 150,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'qualitative_target',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.qualitative_target || '-'}</Text>
              )
            },
          })
          break

        case 'quantitative_target':
          cols.push({
            title: label,
            key: 'quantitative_target',
            width: 150,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'quantitative_target',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.quantitative_target || '-'}</Text>
              )
            },
          })
          break

        case 'implementation_content':
          cols.push({
            title: label,
            key: 'implementation_content',
            width: 180,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'implementation_content',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.implementation_content || '-'}</Text>
              )
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
              const row = getRowWithEdits(record as PreviewActivityRow)
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'leader',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.leader || '-'}</Text>
              )
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
              const row = getRowWithEdits(record as PreviewActivityRow)
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'partner_organizations',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.partner_organizations || '-'}</Text>
              )
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
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'completion_date',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.completion_date || '-'}</Text>
              )
            },
          })
          break

        case 'result_evaluation':
          cols.push({
            title: label,
            key: 'result_evaluation',
            width: 180,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'result_evaluation',
                <Text style={{ fontSize: 11 }}>{rowWithEdits.result_evaluation || '-'}</Text>
              )
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
        const row = getRowWithEdits(record as PreviewActivityRow)
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
              onClick={() => {
                const editedRowsArray: EditedRow[] = Array.from(editedRows.entries()).map(
                  ([id, edits]) => ({ id, edits })
                )
                onExport(Array.from(excludedIds), editedRowsArray)
              }}
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

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 12,
        padding: '8px 12px',
        background: '#fafafa',
        borderRadius: 6,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 200 }}
          size="small"
        />

        {/* Status Filter */}
        <Select
          placeholder="Lọc trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 150 }}
          size="small"
          options={Object.entries(statusConfig).map(([key, config]) => ({
            value: key,
            label: config.label,
          }))}
        />

        <Divider type="vertical" style={{ height: 24 }} />

        {/* Bulk Actions */}
        <Tooltip title="Chọn tất cả (hiển thị)">
          <Button
            size="small"
            icon={<CheckSquareOutlined />}
            onClick={selectAllVisible}
          >
            Chọn tất cả
          </Button>
        </Tooltip>

        <Tooltip title="Bỏ chọn tất cả (hiển thị)">
          <Button
            size="small"
            icon={<CloseSquareOutlined />}
            onClick={deselectAllVisible}
          >
            Bỏ chọn tất cả
          </Button>
        </Tooltip>

        {excludedIds.size > 0 && (
          <Tooltip title="Bỏ tất cả loại trừ">
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={clearExclusions}
              type="link"
              danger
            >
              Xóa loại trừ ({excludedIds.size})
            </Button>
          </Tooltip>
        )}

        <Divider type="vertical" style={{ height: 24 }} />

        {/* More Actions Dropdown */}
        <Dropdown menu={{ items: bulkActionMenuItems }} trigger={['click']}>
          <Button size="small" icon={<MoreOutlined />}>
            Thao tác khác
          </Button>
        </Dropdown>

        {/* Edit indicator */}
        {editedRows.size > 0 && (
          <>
            <Divider type="vertical" style={{ height: 24 }} />
            <Tag color="blue">
              Đã chỉnh sửa {editedRows.size} dòng
            </Tag>
          </>
        )}

        {/* Filter indicator */}
        {(searchText || statusFilter) && (
          <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>
            Đang hiển thị {filteredRows.filter(r => r.type === 'activity').length} / {activityRows.length} hoạt động
          </Text>
        )}
      </div>

      {/* Preview Table */}
      <Table
        columns={buildColumns()}
        dataSource={filteredRows}
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
