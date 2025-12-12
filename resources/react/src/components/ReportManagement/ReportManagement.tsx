import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Space,
  Table,
  Select,
  Modal,
  Form,
  Checkbox,
  Input,
  message,
  Typography,
  Tabs,
  Tag,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
} from 'antd'
import {
  DownloadOutlined,
  HistoryOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../../shared/hooks'
import * as reportApi from '../../services/reportApi'
import type {
  ReportPeriod,
  ExportColumn,
  ExportHistoryItem,
  ViewMode,
  PeriodType,
} from '../../services/reportApi'
import ReportPreviewModal from './ReportPreviewModal'
import './ReportManagement.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

function ReportManagement() {
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export')

  // Export form state
  const [periods, setPeriods] = useState<ReportPeriod[]>([])
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<ViewMode>('activities')
  const [availableColumns, setAvailableColumns] = useState<ExportColumn[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [reportName, setReportName] = useState('')
  const [organization, setOrganization] = useState<{ id: string; name: string; short_name?: string } | null>(null)

  // Preview modal state
  const [previewVisible, setPreviewVisible] = useState(false)

  // Available years (last 5 years + current)
  const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  // History state
  const [history, setHistory] = useState<ExportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // Stats state
  const [stats, setStats] = useState<{
    activity_stats: Record<string, number>
    total_activities: number
    exports_this_month: number
    last_export: { id: string; file_name: string; exported_at: string; period: string } | null
  } | null>(null)

  // Check permission
  const canExport = currentUser && ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser.role)
  const canDeleteHistory = currentUser && ['MANAGER', 'OPERATOR', 'ADMIN'].includes(currentUser.role)

  // Fetch initial data
  useEffect(() => {
    if (canExport) {
      fetchPeriods()
      fetchStats()
    }
  }, [canExport])

  // Fetch columns when view mode changes
  useEffect(() => {
    if (canExport && viewMode) {
      fetchColumns(viewMode)
    }
  }, [canExport, viewMode])

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'history' && canExport) {
      fetchHistory()
    }
  }, [activeTab, historyPagination.current, canExport])

  const fetchPeriods = async () => {
    try {
      const response = await reportApi.getReportPeriods()
      setPeriods(response.data.periods)
      setOrganization(response.data.organization)

      // Auto-select current month
      if (response.data.periods.length > 0) {
        const current = response.data.periods[0]
        setSelectedMonth(current.month)
        setSelectedYear(current.year)
      }
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách kỳ báo cáo')
    }
  }

  const fetchColumns = async (mode: ViewMode) => {
    try {
      const response = await reportApi.getExportColumns(mode)
      setAvailableColumns(response.data.columns)
      // Auto-select default columns
      setSelectedColumns(response.data.columns.filter(c => c.default).map(c => c.key))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách cột')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await reportApi.getReportStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await reportApi.getExportHistory({
        page: historyPagination.current,
        per_page: historyPagination.pageSize,
      })
      setHistory(response.data)
      setHistoryPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải lịch sử xuất báo cáo')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleExport = async () => {
    // Validate based on period type
    if (periodType === 'month' && !selectedMonth) {
      message.warning('Vui lòng chọn tháng')
      return
    }
    if (periodType === 'quarter' && !selectedQuarter) {
      message.warning('Vui lòng chọn quý')
      return
    }
    if (!selectedYear) {
      message.warning('Vui lòng chọn năm')
      return
    }

    if (selectedColumns.length === 0) {
      message.warning('Vui lòng chọn ít nhất một cột để xuất')
      return
    }

    setExportLoading(true)
    try {
      await reportApi.exportActivityReport({
        periodType,
        month: periodType === 'month' ? selectedMonth || undefined : undefined,
        quarter: periodType === 'quarter' ? selectedQuarter || undefined : undefined,
        year: selectedYear,
        viewMode,
        columns: selectedColumns,
        notes: notes || undefined,
        reportName: reportName || undefined,
      })
      message.success('Xuất báo cáo thành công!')

      // Refresh stats and history
      fetchStats()
      if (activeTab === 'history') {
        fetchHistory()
      }
    } catch (error: any) {
      message.error(error.message || 'Không thể xuất báo cáo')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await reportApi.deleteExportHistory(id)
      message.success('Đã xóa bản ghi')
      fetchHistory()
      fetchStats()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa bản ghi')
    }
  }

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map(c => c.key))
  }

  const handleDeselectAllColumns = () => {
    setSelectedColumns([])
  }

  const handleSelectDefaultColumns = () => {
    setSelectedColumns(availableColumns.filter(c => c.default).map(c => c.key))
  }

  // History table columns
  const historyColumns: ColumnsType<ExportHistoryItem> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => (historyPagination.current - 1) * historyPagination.pageSize + index + 1,
    },
    {
      title: 'Kỳ báo cáo',
      key: 'period',
      width: 120,
      render: (_, record) => (
        <Tag icon={<CalendarOutlined />} color="blue">
          Tháng {record.month}/{record.year}
        </Tag>
      ),
    },
    {
      title: 'Chế độ xem',
      dataIndex: 'view_mode',
      key: 'view_mode',
      width: 130,
      render: (mode: ViewMode) => (
        <Tag color={mode === 'kpis' ? 'purple' : 'green'}>
          {mode === 'kpis' ? 'Theo KPI' : 'Theo hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Tên file',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <Text ellipsis style={{ maxWidth: 200 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Số hoạt động',
      dataIndex: 'activity_count',
      key: 'activity_count',
      width: 110,
      align: 'center',
      render: (count: number) => <Tag>{count}</Tag>,
    },
    {
      title: 'Người xuất',
      key: 'exporter',
      width: 150,
      render: (_, record) => {
        if (record.exporter) {
          const fullName = [record.exporter.first_name, record.exporter.last_name]
            .filter(Boolean)
            .join(' ')
          return fullName || record.exporter.email || '-'
        }
        return '-'
      },
    },
    {
      title: 'Thời gian',
      dataIndex: 'exported_at',
      key: 'exported_at',
      width: 150,
      render: (date: string) => {
        const d = new Date(date)
        return d.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      render: (notes: string | null) => notes || '-',
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        canDeleteHistory && (
          <Popconfirm
            title="Xóa bản ghi này?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDeleteHistory(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        )
      ),
    },
  ]

  if (!canExport) {
    return (
      <Card>
        <Empty
          description="Bạn không có quyền truy cập chức năng xuất báo cáo"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  return (
    <div className="report-management">
      <div className="report-header">
        <Title level={3}>
          <FileTextOutlined /> Quản lý Báo cáo
        </Title>
        {organization && (
          <Text type="secondary">
            Đơn vị: <Text strong>{organization.name}</Text>
          </Text>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} className="report-stats">
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Hoạt động tháng này"
                value={stats.total_activities}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Đã xuất tháng này"
                value={stats.exports_this_month}
                prefix={<DownloadOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Đang chờ duyệt"
                value={stats.activity_stats['PENDING_APPROVAL'] || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Đã hoàn thành"
                value={stats.activity_stats['COMPLETED'] || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'export' | 'history')}
        items={[
          {
            key: 'export',
            label: (
              <span>
                <DownloadOutlined /> Xuất báo cáo
              </span>
            ),
            children: (
              <Card className="export-card">
                <Row gutter={24}>
                  {/* Left: Options */}
                  <Col xs={24} md={12}>
                    <div className="export-options">
                      <div className="option-group">
                        <Text strong>Tên báo cáo (tùy chọn):</Text>
                        <Input
                          style={{ marginTop: 8 }}
                          placeholder="Nhập tên báo cáo tùy chỉnh..."
                          value={reportName}
                          onChange={(e) => setReportName(e.target.value)}
                          maxLength={100}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Để trống để sử dụng tên mặc định
                        </Text>
                      </div>

                      <div className="option-group">
                        <Text strong>Loại kỳ báo cáo:</Text>
                        <Select
                          style={{ width: '100%', marginTop: 8 }}
                          value={periodType}
                          onChange={(value) => {
                            setPeriodType(value)
                            // Reset selections when changing type
                            if (value === 'quarter') {
                              setSelectedQuarter(Math.ceil((new Date().getMonth() + 1) / 3))
                            }
                          }}
                        >
                          <Option value="month">Theo tháng</Option>
                          <Option value="quarter">Theo quý</Option>
                          <Option value="year">Theo năm</Option>
                        </Select>
                      </div>

                      <div className="option-group">
                        <Text strong>Kỳ báo cáo:</Text>
                        <Row gutter={8} style={{ marginTop: 8 }}>
                          {periodType === 'month' && (
                            <Col span={12}>
                              <Select
                                style={{ width: '100%' }}
                                placeholder="Chọn tháng"
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                  const period = periods.find(p => p.month === month && p.year === selectedYear)
                                  return (
                                    <Option key={month} value={month}>
                                      Tháng {month} {period ? `(${period.activity_count} HĐ)` : ''}
                                    </Option>
                                  )
                                })}
                              </Select>
                            </Col>
                          )}
                          {periodType === 'quarter' && (
                            <Col span={12}>
                              <Select
                                style={{ width: '100%' }}
                                placeholder="Chọn quý"
                                value={selectedQuarter}
                                onChange={setSelectedQuarter}
                              >
                                <Option value={1}>Quý 1 (T1-T3)</Option>
                                <Option value={2}>Quý 2 (T4-T6)</Option>
                                <Option value={3}>Quý 3 (T7-T9)</Option>
                                <Option value={4}>Quý 4 (T10-T12)</Option>
                              </Select>
                            </Col>
                          )}
                          <Col span={periodType === 'year' ? 24 : 12}>
                            <Select
                              style={{ width: '100%' }}
                              placeholder="Chọn năm"
                              value={selectedYear}
                              onChange={setSelectedYear}
                            >
                              {availableYears.map((year) => (
                                <Option key={year} value={year}>
                                  Năm {year}
                                </Option>
                              ))}
                            </Select>
                          </Col>
                        </Row>
                      </div>

                      <div className="option-group">
                        <Text strong>Chế độ xem:</Text>
                        <Select
                          style={{ width: '100%', marginTop: 8 }}
                          value={viewMode}
                          onChange={(value) => setViewMode(value)}
                        >
                          <Option value="activities">Theo hoạt động</Option>
                          <Option value="kpis">Theo KPI</Option>
                        </Select>
                      </div>

                      <div className="option-group">
                        <Text strong>Ghi chú (tùy chọn):</Text>
                        <TextArea
                          style={{ marginTop: 8 }}
                          rows={2}
                          placeholder="Nhập ghi chú cho lần xuất này..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          maxLength={500}
                          showCount
                        />
                      </div>
                    </div>
                  </Col>

                  {/* Right: Columns Selection */}
                  <Col xs={24} md={12}>
                    <div className="columns-selection">
                      <div className="columns-header">
                        <Text strong>Chọn cột hiển thị:</Text>
                        <Space size="small">
                          <Button size="small" type="link" onClick={handleSelectAllColumns}>
                            Chọn tất cả
                          </Button>
                          <Button size="small" type="link" onClick={handleDeselectAllColumns}>
                            Bỏ chọn
                          </Button>
                          <Button size="small" type="link" onClick={handleSelectDefaultColumns}>
                            Mặc định
                          </Button>
                        </Space>
                      </div>
                      <div className="columns-list">
                        <Checkbox.Group
                          value={selectedColumns}
                          onChange={(values) => setSelectedColumns(values as string[])}
                        >
                          <Row>
                            {availableColumns.map((column) => (
                              <Col key={column.key} xs={24} sm={12}>
                                <Checkbox value={column.key}>
                                  {column.label}
                                  {column.default && (
                                    <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                                      Mặc định
                                    </Tag>
                                  )}
                                </Checkbox>
                              </Col>
                            ))}
                          </Row>
                        </Checkbox.Group>
                      </div>
                    </div>
                  </Col>
                </Row>

                <div className="export-actions">
                  <Space size="middle">
                    <Button
                      size="large"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewVisible(true)}
                      disabled={
                        !selectedYear ||
                        (periodType === 'month' && !selectedMonth) ||
                        (periodType === 'quarter' && !selectedQuarter)
                      }
                    >
                      Xem trước
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      icon={<DownloadOutlined />}
                      loading={exportLoading}
                      onClick={handleExport}
                      disabled={
                        selectedColumns.length === 0 ||
                        !selectedYear ||
                        (periodType === 'month' && !selectedMonth) ||
                        (periodType === 'quarter' && !selectedQuarter)
                      }
                    >
                      Xuất báo cáo Excel
                    </Button>
                  </Space>
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    {selectedColumns.length} cột được chọn
                  </Text>
                </div>
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Lịch sử xuất ({stats?.exports_this_month || 0})
              </span>
            ),
            children: (
              <Card
                className="history-card"
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchHistory}
                    loading={historyLoading}
                  >
                    Làm mới
                  </Button>
                }
              >
                <Table
                  columns={historyColumns}
                  dataSource={history}
                  rowKey="id"
                  loading={historyLoading}
                  pagination={{
                    ...historyPagination,
                    showSizeChanger: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} bản ghi`,
                    onChange: (page, pageSize) => {
                      setHistoryPagination((prev) => ({
                        ...prev,
                        current: page,
                        pageSize,
                      }))
                    },
                  }}
                  scroll={{ x: 1000 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có lịch sử xuất báo cáo"
                      />
                    ),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Preview Modal */}
      <ReportPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        periodType={periodType}
        month={selectedMonth}
        quarter={selectedQuarter}
        year={selectedYear}
      />
    </div>
  )
}

export default ReportManagement
