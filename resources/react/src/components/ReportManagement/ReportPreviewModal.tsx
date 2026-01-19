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
  Tabs,
  Progress,
  Badge,
  Descriptions,
  Collapse,
} from 'antd'
import type { MenuProps, TabsProps } from 'antd'
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
  TableOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  EditOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  RocketOutlined,
  AuditOutlined,
  BankOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as reportApi from '../../services/reportApi'
import type { PreviewRow, PreviewActivityRow, PreviewFilters, PeriodType, ViewMode, ExportColumn, AccessibleOrganization } from '../../services/reportApi'

const { Text, Title, Paragraph } = Typography
const { Panel } = Collapse

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
  // Multi-org props
  isMultiOrgMode?: boolean
  selectedOrganizationIds?: string[]
  accessibleOrganizations?: AccessibleOrganization[]
}

// Status labels, colors and icons
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  DRAFT: { label: 'Nháp', color: 'default', icon: <EditOutlined />, bgColor: '#f5f5f5' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: 'orange', icon: <AuditOutlined />, bgColor: '#fff7e6' },
  APPROVED: { label: 'Đã duyệt', color: 'cyan', icon: <CheckCircleOutlined />, bgColor: '#e6fffb' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'blue', icon: <RocketOutlined />, bgColor: '#e6f7ff' },
  COMPLETED: { label: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined />, bgColor: '#f6ffed' },
  POSTPONED: { label: 'Tạm hoãn', color: 'gold', icon: <PauseCircleOutlined />, bgColor: '#fffbe6' },
  CANCELLED: { label: 'Đã hủy', color: 'red', icon: <StopOutlined />, bgColor: '#fff1f0' },
}

// Column key to display name mapping (matches Excel export)
const columnLabels: Record<string, string> = {
  stt: 'STT',
  nhiem_vu_trong_tam: 'Nhiệm vụ trọng tâm',
  noi_dung_cu_the: 'Nội dung cụ thể',
  noi_dung_hoat_dong: 'Nội dung hoạt động',
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
  // Multi-org props
  isMultiOrgMode = false,
  selectedOrganizationIds = [],
  accessibleOrganizations = [],
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
    by_organization?: Record<string, { name: string; count: number }>
  }>({ total: 0, by_status: {} })
  const [organization, setOrganization] = useState<{ name: string; short_name?: string } | null>(null)
  const [multiOrgOrganizations, setMultiOrgOrganizations] = useState<{ id: string; name: string; short_name?: string }[]>([])

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
      if (isMultiOrgMode && selectedOrganizationIds.length > 0) {
        // Multi-org preview
        const response = await reportApi.getMultiOrgReportPreview({
          organization_ids: selectedOrganizationIds,
          periodType,
          month: periodType === 'month' && month ? month : undefined,
          quarter: periodType === 'quarter' && quarter ? quarter : undefined,
          year,
        })
        setRows(response.data.rows)
        setSummary(response.data.summary)
        setOrganization(response.data.exporter_organization)
        setMultiOrgOrganizations(response.data.organizations || [])
      } else {
        // Single org preview
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
        setMultiOrgOrganizations([])
      }
    } catch (error: any) {
      console.error('Failed to fetch preview:', error)
      message.error('Không thể tải xem trước báo cáo')
    } finally {
      setLoading(false)
    }
  }, [periodType, month, quarter, year, isMultiOrgMode, selectedOrganizationIds])

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
            width: 200,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              // Display KPI Tasks as bordered rows
              const content = rowWithEdits.noi_dung_cu_the || ''

              // Parse content into individual tasks (numbered list format: "1. task\n2. task\n...")
              const tasks = content ? content.split('\n').filter(t => t.trim()) : []

              if (tasks.length === 0) {
                return renderEditableCell(
                  row,
                  'noi_dung_cu_the',
                  <Text style={{ fontSize: 12 }}>-</Text>
                )
              }

              // Render each task in a bordered row
              return renderEditableCell(
                row,
                'noi_dung_cu_the',
                <div className="kpi-tasks-container">
                  {tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="kpi-task-row"
                      style={{
                        padding: '4px 6px',
                        borderBottom: idx < tasks.length - 1 ? '1px solid #e8e8e8' : 'none',
                        background: idx % 2 === 0 ? '#fafafa' : '#fff',
                      }}
                    >
                      <Text style={{ fontSize: 11 }}>{task}</Text>
                    </div>
                  ))}
                </div>
              )
            },
          })
          break

        case 'noi_dung_hoat_dong':
          cols.push({
            title: label,
            key: 'noi_dung_hoat_dong',
            width: 180,
            render: (_, record) => {
              if (record.type === 'category') return null
              const row = record as PreviewActivityRow
              const rowWithEdits = getRowWithEdits(row)
              return renderEditableCell(
                row,
                'noi_dung_hoat_dong',
                <Text style={{ fontSize: 12 }}>{rowWithEdits.noi_dung_hoat_dong || '-'}</Text>
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

  // Calculate completion percentage
  const completedCount = summary.by_status['COMPLETED'] || 0
  const inProgressCount = summary.by_status['IN_PROGRESS'] || 0
  const completionPercentage = summary.total > 0 ? Math.round((completedCount / summary.total) * 100) : 0
  const progressPercentage = summary.total > 0 ? Math.round(((completedCount + inProgressCount) / summary.total) * 100) : 0

  // Get categories summary from rows
  const categorySummary = useMemo(() => {
    const categories: { name: string; count: number }[] = []
    let currentCategory = ''
    let currentCount = 0

    rows.forEach((row) => {
      if (row.type === 'category') {
        if (currentCategory && currentCount > 0) {
          categories.push({ name: currentCategory, count: currentCount })
        }
        currentCategory = `${row.roman_numeral}. ${row.category_name}`
        currentCount = 0
      } else {
        currentCount++
      }
    })

    if (currentCategory && currentCount > 0) {
      categories.push({ name: currentCategory, count: currentCount })
    }

    return categories
  }, [rows])

  // Tab for Overview/Statistics
  const renderOverviewTab = () => (
    <div style={{ padding: '0 0 16px 0' }}>
      {/* Main Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Tổng hoạt động</Text>}
              value={summary.total}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              border: 'none',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Sẽ xuất</Text>}
              value={totalIncluded}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<FileExcelOutlined />}
              suffix={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>/ {summary.total}</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
              border: 'none',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Hoàn thành</Text>}
              value={completedCount}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<CheckCircleOutlined />}
              suffix={<Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>({completionPercentage}%)</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #1890ff 0%, #69c0ff 100%)',
              border: 'none',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Đang thực hiện</Text>}
              value={inProgressCount}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress and Status breakdown */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={<><BarChartOutlined /> Tiến độ tổng thể</>}
            size="small"
          >
            <div style={{ marginBottom: 16 }}>
              <Text>Tỷ lệ hoàn thành</Text>
              <Progress
                percent={completionPercentage}
                status={completionPercentage === 100 ? 'success' : 'active'}
                strokeColor={{ '0%': '#52c41a', '100%': '#95de64' }}
              />
            </div>
            <div>
              <Text>Tỷ lệ đang xử lý</Text>
              <Progress
                percent={progressPercentage}
                status="active"
                strokeColor={{ '0%': '#1890ff', '100%': '#69c0ff' }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<><InfoCircleOutlined /> Phân bổ theo trạng thái</>}
            size="small"
          >
            <Row gutter={[8, 8]}>
              {Object.entries(summary.by_status).map(([status, count]) => {
                const config = statusConfig[status] || { label: status, color: 'default', icon: null, bgColor: '#f5f5f5' }
                const percent = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
                return (
                  <Col span={12} key={status}>
                    <div
                      style={{
                        padding: '8px 12px',
                        background: config.bgColor,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Space size={4}>
                        {config.icon}
                        <Text style={{ fontSize: 12 }}>{config.label}</Text>
                      </Space>
                      <Badge
                        count={count}
                        style={{ backgroundColor: config.color === 'default' ? '#8c8c8c' : undefined }}
                        showZero
                        overflowCount={999}
                      />
                    </div>
                  </Col>
                )
              })}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Multi-org summary - shown when in multi-org mode */}
      {isMultiOrgMode && summary.by_organization && Object.keys(summary.by_organization).length > 0 && (
        <Card
          title={
            <Space>
              <GlobalOutlined style={{ color: '#1890ff' }} />
              <span>Phân bổ theo đơn vị ({multiOrgOrganizations.length} đơn vị)</span>
            </Space>
          }
          size="small"
          style={{ marginTop: 16 }}
          extra={
            <Tag color="blue" icon={<BankOutlined />}>
              Báo cáo đa đơn vị
            </Tag>
          }
        >
          <Row gutter={[8, 8]}>
            {Object.entries(summary.by_organization).map(([orgId, data]) => (
              <Col xs={24} sm={12} md={8} key={orgId}>
                <div
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                    borderRadius: 8,
                    borderLeft: '4px solid #1890ff',
                  }}
                >
                  <Space>
                    <BankOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                    <Text strong ellipsis style={{ display: 'block', fontSize: 13, maxWidth: 200 }}>
                      {data.name}
                    </Text>
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      count={data.count}
                      style={{ backgroundColor: '#52c41a' }}
                      showZero
                      overflowCount={999}
                    />
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>hoạt động</Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Categories summary */}
      {categorySummary.length > 0 && (
        <Card
          title={<><TeamOutlined /> Phân bổ theo nhóm nhiệm vụ</>}
          size="small"
          style={{ marginTop: 16 }}
        >
          <Row gutter={[8, 8]}>
            {categorySummary.map((cat, idx) => (
              <Col xs={24} sm={12} md={8} key={idx}>
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#f6f8fa',
                    borderRadius: 6,
                    borderLeft: '3px solid #1890ff',
                  }}
                >
                  <Text ellipsis style={{ display: 'block', fontSize: 12 }}>{cat.name}</Text>
                  <Text strong style={{ color: '#1890ff' }}>{cat.count} hoạt động</Text>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Export info */}
      <Card
        title={<><FileExcelOutlined /> Thông tin xuất báo cáo</>}
        size="small"
        style={{ marginTop: 16 }}
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Tên file">
            <Text code>{reportName || `BaoCao_NQ57_${isMultiOrgMode ? 'DaDonVi_' : ''}${getPeriodLabel()}`}.xlsx</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Kỳ báo cáo">
            <Tag icon={<CalendarOutlined />} color="blue">{getPeriodLabel()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={isMultiOrgMode ? 'Đơn vị xuất' : 'Đơn vị'}>
            {organization?.short_name || organization?.name || '-'}
          </Descriptions.Item>
          {isMultiOrgMode && (
            <Descriptions.Item label="Số đơn vị">
              <Tag icon={<BankOutlined />} color="purple">{multiOrgOrganizations.length} đơn vị</Tag>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Số cột">
            {selectedColumns.length} cột
          </Descriptions.Item>
          <Descriptions.Item label="Số hoạt động xuất">
            <Text type={excludedIds.size > 0 ? 'warning' : undefined}>
              {totalIncluded} / {activityRows.length}
            </Text>
          </Descriptions.Item>
          {excludedIds.size > 0 && (
            <Descriptions.Item label="Đã loại bỏ">
              <Text type="danger">{excludedIds.size} hoạt động</Text>
            </Descriptions.Item>
          )}
          {editedRows.size > 0 && (
            <Descriptions.Item label="Đã chỉnh sửa">
              <Text type="warning">{editedRows.size} dòng</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* List of organizations for multi-org mode */}
        {isMultiOrgMode && multiOrgOrganizations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Các đơn vị trong báo cáo: </Text>
            <div style={{ marginTop: 4 }}>
              {multiOrgOrganizations.map((org) => (
                <Tag key={org.id} icon={<BankOutlined />} color="blue" style={{ marginBottom: 4 }}>
                  {org.short_name || org.name}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Columns preview */}
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Các cột sẽ xuất: </Text>
          <div style={{ marginTop: 4 }}>
            {selectedColumns.map((col) => (
              <Tag key={col} style={{ marginBottom: 4 }}>{columnLabels[col] || col}</Tag>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )

  // Tab for Data Table
  const renderDataTab = () => (
    <div>
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
            label: (
              <Space size={4}>
                {config.icon}
                {config.label}
              </Space>
            ),
          }))}
        />

        <Divider type="vertical" style={{ height: 24 }} />

        {/* Bulk Actions */}
        <Tooltip title="Chọn tất cả (thêm vào báo cáo)">
          <Button
            size="small"
            icon={<CheckSquareOutlined />}
            onClick={selectAllVisible}
          >
            Chọn tất cả
          </Button>
        </Tooltip>

        <Tooltip title="Bỏ chọn tất cả (loại khỏi báo cáo)">
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
            <Tag color="blue" icon={<EditOutlined />}>
              Đã chỉnh sửa {editedRows.size} dòng
            </Tag>
          </>
        )}

        {/* Filter indicator */}
        {(searchText || statusFilter) && (
          <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>
            <FilterOutlined /> Đang hiển thị {filteredRows.filter(r => r.type === 'activity').length} / {activityRows.length} hoạt động
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
        scroll={{ x: 1600, y: 380 }}
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

      {/* Help text */}
      <Alert
        message={
          <Space>
            <InfoCircleOutlined />
            <Text style={{ fontSize: 12 }}>
              Click vào ô để chỉnh sửa nội dung trước khi xuất. Nhấn nút <DeleteOutlined /> để loại hoạt động khỏi báo cáo.
            </Text>
          </Space>
        }
        type="info"
        style={{ marginTop: 12 }}
        showIcon={false}
      />
    </div>
  )

  // Tab items - Data first, Overview second
  const tabItems: TabsProps['items'] = [
    {
      key: 'data',
      label: (
        <span>
          <TableOutlined /> Dữ liệu ({totalIncluded})
        </span>
      ),
      children: renderDataTab(),
    },
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined /> Thống kê
        </span>
      ),
      children: renderOverviewTab(),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <span>Xem trước báo cáo - {getPeriodLabel()}</span>
          {isMultiOrgMode && (
            <Tag color="blue" icon={<GlobalOutlined />} style={{ marginLeft: 8 }}>
              {multiOrgOrganizations.length} đơn vị
            </Tag>
          )}
          {excludedIds.size > 0 && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              {excludedIds.size} loại trừ
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
      centered
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: '12px 24px',
        }
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary">
              <FileTextOutlined /> {totalIncluded} hoạt động |
              <span style={{ marginLeft: 8 }}><TableOutlined /> {selectedColumns.length} cột</span>
              {isMultiOrgMode && (
                <span style={{ marginLeft: 8, color: '#1890ff' }}>
                  | <BankOutlined /> {multiOrgOrganizations.length} đơn vị
                </span>
              )}
              {excludedIds.size > 0 && (
                <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                  | <ExclamationCircleOutlined /> {excludedIds.size} loại bỏ
                </span>
              )}
            </Text>
          </div>
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={() => {
                const editedRowsArray: EditedRow[] = Array.from(editedRows.entries()).map(
                  ([id, edits]) => ({ id, edits })
                )
                onExport(Array.from(excludedIds), editedRowsArray)
              }}
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
                border: 'none',
              }}
            >
              {isMultiOrgMode ? `Xuất báo cáo ${multiOrgOrganizations.length} đơn vị` : 'Xuất báo cáo Excel'}
            </Button>
          </Space>
        </div>
      }
    >
      {/* Report Header */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          background: isMultiOrgMode
            ? 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 8,
        }}
      >
        <Title level={5} style={{ textAlign: 'center', margin: 0, color: '#1a1a2e' }}>
          BÁO CÁO TIẾN ĐỘ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT 57-NQ/TW
          {isMultiOrgMode && (
            <Tag color="blue" icon={<GlobalOutlined />} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
              ĐA ĐƠN VỊ
            </Tag>
          )}
        </Title>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Tag icon={<CalendarOutlined />} color="blue">{getPeriodLabel()}</Tag>
          {isMultiOrgMode ? (
            <Tag icon={<BankOutlined />} color="purple">{multiOrgOrganizations.length} đơn vị</Tag>
          ) : (
            <Tag icon={<TeamOutlined />} color="purple">{organization?.short_name || organization?.name || '...'}</Tag>
          )}
          {reportName && (
            <Tag icon={<FileTextOutlined />} color="default">{reportName}.xlsx</Tag>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="data"
        items={tabItems}
        size="small"
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
        .ant-modal-content {
          border-radius: 12px;
        }
        .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
        .kpi-tasks-container {
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          overflow: hidden;
        }
        .kpi-task-row {
          transition: background-color 0.2s;
        }
        .kpi-task-row:hover {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </Modal>
  )
}

export default ReportPreviewModal
