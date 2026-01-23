import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
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
  Descriptions,
  Badge,
  Divider,
  Progress
} from "antd"
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
  EyeOutlined,
  UserOutlined,
  FileDoneOutlined,
  CloudDownloadOutlined,
  TableOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  BankOutlined,
  GlobalOutlined
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import { useAuth } from "../../shared/hooks"
import * as reportApi from "../../services/reportApi"
import type {
  ReportPeriod,
  ExportColumn,
  ExportHistoryItem,
  ViewMode,
  PeriodType,
  AccessibleOrganization
} from "../../services/reportApi"
import ReportPreviewModal, { type EditedRow } from "./ReportPreviewModal"
import ReportBatchTab from "./ReportBatchTab"
import "./ReportManagement.css"
import { t } from "i18next"

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// Valid sub-tabs for reports page
type ReportSubTab = "export" | "history" | "batches"
const VALID_SUB_TABS: ReportSubTab[] = ["export", "history", "batches"]

function ReportManagement() {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Get initial sub-tab from URL or localStorage
  const getInitialSubTab = (): ReportSubTab => {
    const urlSubTab = searchParams.get("subtab") as ReportSubTab
    if (urlSubTab && VALID_SUB_TABS.includes(urlSubTab)) {
      return urlSubTab
    }
    const savedSubTab = localStorage.getItem(
      "reports_active_tab"
    ) as ReportSubTab
    if (savedSubTab && VALID_SUB_TABS.includes(savedSubTab)) {
      return savedSubTab
    }
    return "export"
  }

  const [activeTab, setActiveTab] = useState<ReportSubTab>(getInitialSubTab)

  // Handle tab change with URL and localStorage persistence
  const handleTabChange = useCallback(
    (key: string) => {
      const newTab = key as ReportSubTab
      setActiveTab(newTab)
      // Update URL with subtab parameter while preserving other params
      const newParams = new URLSearchParams(searchParams)
      newParams.set("subtab", newTab)
      setSearchParams(newParams, { replace: true })
      // Save to localStorage
      localStorage.setItem("reports_active_tab", newTab)
    },
    [searchParams, setSearchParams]
  )

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSubTab = searchParams.get("subtab") as ReportSubTab
    if (
      urlSubTab &&
      VALID_SUB_TABS.includes(urlSubTab) &&
      urlSubTab !== activeTab
    ) {
      setActiveTab(urlSubTab)
      localStorage.setItem("reports_active_tab", urlSubTab)
    }
  }, [searchParams])

  // Export form state
  const [periods, setPeriods] = useState<ReportPeriod[]>([])
  const [periodType, setPeriodType] = useState<PeriodType>("month")
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const [viewMode, setViewMode] = useState<ViewMode>("activities")
  const [availableColumns, setAvailableColumns] = useState<ExportColumn[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [reportName, setReportName] = useState("")
  const [organization, setOrganization] = useState<{
    id: string
    name: string
    short_name?: string
  } | null>(null)

  // Multi-org export state
  const [hasMultiOrgAccess, setHasMultiOrgAccess] = useState(false)
  const [accessibleOrganizations, setAccessibleOrganizations] = useState<
    AccessibleOrganization[]
  >([])
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<
    string[]
  >([])
  const [isMultiOrgMode, setIsMultiOrgMode] = useState(false)
  const [multiOrgLoading, setMultiOrgLoading] = useState(false)

  // Preview modal state
  const [previewVisible, setPreviewVisible] = useState(false)

  // History detail modal state
  const [historyDetailVisible, setHistoryDetailVisible] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<ExportHistoryItem | null>(null)

  // Available years (last 5 years + current)
  const availableYears = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i
  )

  // Generate default file name based on current selections
  const getDefaultFileName = () => {
    const orgName = organization?.short_name || organization?.name || "DonVi"
    const viewModeLabel = viewMode === "kpis" ? "KPI" : "HD"
    let periodLabel = ""

    if (periodType === "month" && selectedMonth) {
      periodLabel = `T${selectedMonth}_${selectedYear}`
    } else if (periodType === "quarter" && selectedQuarter) {
      periodLabel = `Q${selectedQuarter}_${selectedYear}`
    } else if (periodType === "year") {
      periodLabel = `Nam${selectedYear}`
    } else {
      periodLabel = `${selectedYear}`
    }

    return `BaoCao_NQ57_${viewModeLabel}_${orgName}_${periodLabel}`
  }

  // History state
  const [history, setHistory] = useState<ExportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // Stats state
  const [stats, setStats] = useState<{
    activity_stats: Record<string, number>
    total_activities: number
    exports_this_month: number
    last_export: {
      id: string
      file_name: string
      exported_at: string
      period: string
    } | null
  } | null>(null)

  // Check permission
  const canExport =
    currentUser &&
    ["STAFF", "MANAGER", "OPERATOR", "ADMIN"].includes(currentUser.role)
  const canDeleteHistory =
    currentUser && ["MANAGER", "OPERATOR", "ADMIN"].includes(currentUser.role)

  // Fetch initial data
  useEffect(() => {
    if (canExport) {
      fetchPeriods()
      fetchStats()
      fetchAccessibleOrganizations()
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
    if (activeTab === "history" && canExport) {
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
      message.error(error.message || "Không thể tải danh sách kỳ báo cáo")
    }
  }

  const fetchColumns = async (mode: ViewMode) => {
    try {
      const response = await reportApi.getExportColumns(mode)
      setAvailableColumns(response.data.columns)
      // Auto-select default columns
      setSelectedColumns(
        response.data.columns.filter((c) => c.default).map((c) => c.key)
      )
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách cột")
    }
  }

  const fetchStats = async () => {
    try {
      const response = await reportApi.getReportStats()
      setStats(response.data)
    } catch (error: any) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchAccessibleOrganizations = async () => {
    try {
      const response = await reportApi.getAccessibleOrganizations()
      const orgs = response.data.organizations.filter((org) => org.can_export)
      setAccessibleOrganizations(orgs)
      // Chỉ bật chế độ đa đơn vị nếu có nhiều hơn 1 đơn vị có quyền xuất
      // (tức là có đơn vị khác ngoài đơn vị của mình)
      setHasMultiOrgAccess(orgs.length > 1)
    } catch (error: any) {
      console.error("Failed to fetch accessible organizations:", error)
      // Không hiển thị lỗi cho user - feature này optional
    }
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await reportApi.getExportHistory({
        page: historyPagination.current,
        per_page: historyPagination.pageSize
      })
      setHistory(response.data)
      setHistoryPagination((prev) => ({
        ...prev,
        total: response.pagination.total
      }))
    } catch (error: any) {
      message.error(error.message || "Không thể tải lịch sử xuất báo cáo")
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleExport = async (
    excludedIds: string[] = [],
    editedRows: EditedRow[] = []
  ) => {
    // Validate based on period type
    if (periodType === "month" && !selectedMonth) {
      message.warning("Vui lòng chọn tháng")
      return
    }
    if (periodType === "quarter" && !selectedQuarter) {
      message.warning("Vui lòng chọn quý")
      return
    }
    if (!selectedYear) {
      message.warning("Vui lòng chọn năm")
      return
    }

    if (selectedColumns.length === 0) {
      message.warning("Vui lòng chọn ít nhất một cột để xuất")
      return
    }

    // Validate multi-org mode
    if (isMultiOrgMode && selectedOrganizationIds.length === 0) {
      message.warning("Vui lòng chọn ít nhất một đơn vị để xuất báo cáo")
      return
    }

    setExportLoading(true)
    try {
      if (isMultiOrgMode && selectedOrganizationIds.length > 0) {
        // Multi-org export
        await reportApi.exportMultiOrgReport({
          organizationIds: selectedOrganizationIds,
          periodType,
          month:
            periodType === "month" ? selectedMonth || undefined : undefined,
          quarter:
            periodType === "quarter" ? selectedQuarter || undefined : undefined,
          year: selectedYear,
          viewMode,
          columns: selectedColumns,
          notes: notes || undefined,
          reportName: reportName || undefined,
          excludedIds: excludedIds.length > 0 ? excludedIds : undefined,
          editedRows: editedRows.length > 0 ? editedRows : undefined
        })
        message.success(
          `Xuất báo cáo ${selectedOrganizationIds.length} đơn vị thành công!`
        )
      } else {
        // Single org export (own organization)
        await reportApi.exportActivityReport({
          periodType,
          month:
            periodType === "month" ? selectedMonth || undefined : undefined,
          quarter:
            periodType === "quarter" ? selectedQuarter || undefined : undefined,
          year: selectedYear,
          viewMode,
          columns: selectedColumns,
          notes: notes || undefined,
          reportName: reportName || undefined,
          excludedIds: excludedIds.length > 0 ? excludedIds : undefined,
          editedRows: editedRows.length > 0 ? editedRows : undefined
        })
        message.success("Xuất báo cáo thành công!")
      }

      // Close preview modal if open
      setPreviewVisible(false)

      // Refresh stats and history
      fetchStats()
      if (activeTab === "history") {
        fetchHistory()
      }
    } catch (error: any) {
      message.error(error.message || "Không thể xuất báo cáo")
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await reportApi.deleteExportHistory(id)
      message.success("Đã xóa bản ghi")
      fetchHistory()
      fetchStats()
    } catch (error: any) {
      message.error(error.message || "Không thể xóa bản ghi")
    }
  }

  const handleDownloadHistory = async (id: string, fileName: string) => {
    try {
      message.loading({ content: "Đang tải file...", key: "download" })
      await reportApi.downloadExportHistory(id, fileName)
      message.success({ content: "Đã tải file thành công", key: "download" })
    } catch (error: any) {
      message.error({
        content: error.message || "Không thể tải file",
        key: "download"
      })
    }
  }

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map((c) => c.key))
  }

  const handleDeselectAllColumns = () => {
    setSelectedColumns([])
  }

  const handleSelectDefaultColumns = () => {
    setSelectedColumns(
      availableColumns.filter((c) => c.default).map((c) => c.key)
    )
  }

  // Helper to format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "-"
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(2) + " GB"
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(2) + " MB"
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + " KB"
    } else {
      return bytes + " bytes"
    }
  }

  // View history detail
  const handleViewHistoryDetail = (record: ExportHistoryItem) => {
    setSelectedHistoryItem(record)
    setHistoryDetailVisible(true)
  }

  // History table columns
  const historyColumns: ColumnsType<ExportHistoryItem> = [
    {
      title: "STT",
      key: "index",
      width: 50,
      align: "center",
      render: (_, __, index) =>
        (historyPagination.current - 1) * historyPagination.pageSize + index + 1
    },
    {
      title: "Kỳ báo cáo",
      key: "period",
      width: 130,
      render: (_, record) => (
        <Tag icon={<CalendarOutlined />} color="blue">
          {record.month > 0
            ? `Tháng ${record.month}/${record.year}`
            : `Năm ${record.year}`}
        </Tag>
      )
    },
    {
      title: "Tên file",
      dataIndex: "file_name",
      key: "file_name",
      ellipsis: true,
      render: (name: string, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileExcelOutlined style={{ color: "#52c41a", fontSize: 18 }} />
          <div>
            <Text ellipsis style={{ maxWidth: 180, display: "block" }}>
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatFileSize(record.file_size)}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: "Thông tin",
      key: "info",
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag
            color={record.view_mode === "kpis" ? "purple" : "green"}
            style={{ marginBottom: 2 }}>
            {record.view_mode === "kpis" ? "Theo KPI" : "Theo hoạt động"}
          </Tag>
          <Badge
            count={record.activity_count}
            showZero
            style={{ backgroundColor: "#1890ff" }}
            overflowCount={999}
          />
          <Text type="secondary" style={{ fontSize: 10 }}>
            hoạt động
          </Text>
        </Space>
      )
    },
    {
      title: "Người xuất",
      key: "exporter",
      width: 140,
      render: (_, record) => {
        if (record.exporter) {
          const fullName = [
            record.exporter.first_name,
            record.exporter.last_name
          ]
            .filter(Boolean)
            .join(" ")
          return (
            <Space size={4}>
              <UserOutlined style={{ color: "#8c8c8c" }} />
              <Text ellipsis style={{ maxWidth: 100 }}>
                {fullName || record.exporter.email || "-"}
              </Text>
            </Space>
          )
        }
        return "-"
      }
    },
    {
      title: "Thời gian",
      dataIndex: "exported_at",
      key: "exported_at",
      width: 130,
      render: (date: string) => {
        const d = new Date(date)
        return (
          <div>
            <Text style={{ display: "block" }}>
              {d.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
          </div>
        )
      }
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string, record) => {
        const hasFile = !!record.file_path
        if (status === "completed" && hasFile) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Có file
            </Tag>
          )
        } else if (status === "completed") {
          return (
            <Tag color="warning" icon={<ExclamationCircleOutlined />}>
              Không file
            </Tag>
          )
        }
        return <Tag color="default">{status}</Tag>
      }
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewHistoryDetail(record)}
            />
          </Tooltip>
          {record.file_path && (
            <Tooltip title="Tải file">
              <Button
                type="text"
                icon={<CloudDownloadOutlined />}
                size="small"
                style={{ color: "#52c41a" }}
                onClick={() =>
                  handleDownloadHistory(record.id, record.file_name)
                }
              />
            </Tooltip>
          )}
          {canDeleteHistory && (
            <Popconfirm
              title="Xóa bản ghi này?"
              description="File báo cáo sẽ bị xóa vĩnh viễn"
              onConfirm={() => handleDeleteHistory(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}>
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
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
                valueStyle={{ color: "#3f8600" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Đang chờ duyệt"
                value={stats.activity_stats["PENDING_APPROVAL"] || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Đã hoàn thành"
                value={stats.activity_stats["COMPLETED"] || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: "export",
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
                        <Text strong>Tên file báo cáo:</Text>
                        <Input
                          style={{ marginTop: 8 }}
                          placeholder={getDefaultFileName()}
                          value={reportName}
                          onChange={(e) => setReportName(e.target.value)}
                          maxLength={100}
                          suffix=".xlsx"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {reportName
                            ? `File sẽ được lưu: ${reportName}.xlsx`
                            : `File sẽ được lưu: ${getDefaultFileName()}.xlsx`}
                        </Text>
                      </div>

                      <div className="option-group">
                        <Text strong>Loại kỳ báo cáo:</Text>
                        <Select
                          style={{ width: "100%", marginTop: 8 }}
                          value={periodType}
                          onChange={(value) => {
                            setPeriodType(value)
                            // Reset selections when changing type
                            if (value === "quarter") {
                              setSelectedQuarter(
                                Math.ceil((new Date().getMonth() + 1) / 3)
                              )
                            }
                          }}>
                          <Option value="month">Theo tháng</Option>
                          <Option value="quarter">Theo quý</Option>
                          <Option value="year">Theo năm</Option>
                        </Select>
                      </div>

                      <div className="option-group">
                        <Text strong>Kỳ báo cáo:</Text>
                        <Row gutter={8} style={{ marginTop: 8 }}>
                          {periodType === "month" && (
                            <Col span={12}>
                              <Select
                                style={{ width: "100%" }}
                                placeholder="Chọn tháng"
                                value={selectedMonth}
                                onChange={setSelectedMonth}>
                                {Array.from(
                                  { length: 12 },
                                  (_, i) => i + 1
                                ).map((month) => {
                                  const period = periods.find(
                                    (p) =>
                                      p.month === month &&
                                      p.year === selectedYear
                                  )
                                  return (
                                    <Option key={month} value={month}>
                                      Tháng {month}{" "}
                                      {period
                                        ? `(${period.activity_count} HĐ)`
                                        : ""}
                                    </Option>
                                  )
                                })}
                              </Select>
                            </Col>
                          )}
                          {periodType === "quarter" && (
                            <Col span={12}>
                              <Select
                                style={{ width: "100%" }}
                                placeholder="Chọn quý"
                                value={selectedQuarter}
                                onChange={setSelectedQuarter}>
                                <Option value={1}>Quý 1 (T1-T3)</Option>
                                <Option value={2}>Quý 2 (T4-T6)</Option>
                                <Option value={3}>Quý 3 (T7-T9)</Option>
                                <Option value={4}>Quý 4 (T10-T12)</Option>
                              </Select>
                            </Col>
                          )}
                          <Col span={periodType === "year" ? 24 : 12}>
                            <Select
                              style={{ width: "100%" }}
                              placeholder="Chọn năm"
                              value={selectedYear}
                              onChange={setSelectedYear}>
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
                          style={{ width: "100%", marginTop: 8 }}
                          value={viewMode}
                          onChange={(value) => setViewMode(value)}>
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

                      {/* Multi-org export option - only show if user has multi-org access */}
                      {hasMultiOrgAccess && (
                        <div className="option-group" style={{ marginTop: 16 }}>
                          <div
                            style={{
                              background:
                                "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                              padding: 16,
                              borderRadius: 8,
                              border: "1px solid #91d5ff"
                            }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: 12
                              }}>
                              <GlobalOutlined
                                style={{
                                  color: "#1890ff",
                                  fontSize: 18,
                                  marginRight: 8
                                }}
                              />
                              <Text strong style={{ color: "#0050b3" }}>
                                Xuất báo cáo đa đơn vị
                              </Text>
                              <Tooltip title="Bạn có quyền xem hoạt động của các đơn vị khác. Có thể xuất báo cáo tổng hợp nhiều đơn vị.">
                                <InfoCircleOutlined
                                  style={{ color: "#1890ff", marginLeft: 8 }}
                                />
                              </Tooltip>
                            </div>

                            <Checkbox
                              checked={isMultiOrgMode}
                              onChange={(e) => {
                                setIsMultiOrgMode(e.target.checked)
                                if (!e.target.checked) {
                                  setSelectedOrganizationIds([])
                                }
                              }}
                              style={{ marginBottom: 12 }}>
                              <Text>Xuất báo cáo cho nhiều đơn vị</Text>
                            </Checkbox>

                            {isMultiOrgMode && (
                              <div style={{ marginTop: 8 }}>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 12,
                                    display: "block",
                                    marginBottom: 8
                                  }}>
                                  Chọn các đơn vị cần xuất (
                                  {accessibleOrganizations.length} đơn vị có
                                  quyền):
                                </Text>
                                <Select
                                  mode="multiple"
                                  style={{ width: "100%" }}
                                  placeholder="Chọn đơn vị..."
                                  value={selectedOrganizationIds}
                                  onChange={setSelectedOrganizationIds}
                                  maxTagCount={3}
                                  maxTagPlaceholder={(omittedValues) =>
                                    `+${omittedValues.length} đơn vị khác`
                                  }
                                  optionFilterProp="children"
                                  filterOption={(input, option) =>
                                    (option?.children as unknown as string)
                                      ?.toLowerCase()
                                      .includes(input.toLowerCase())
                                  }>
                                  {accessibleOrganizations.map((org) => (
                                    <Option key={org.id} value={org.id}>
                                      <Space>
                                        <BankOutlined />
                                        {org.short_name || org.name}
                                      </Space>
                                    </Option>
                                  ))}
                                </Select>
                                <Space style={{ marginTop: 8 }}>
                                  <Button
                                    size="small"
                                    type="link"
                                    onClick={() =>
                                      setSelectedOrganizationIds(
                                        accessibleOrganizations.map((o) => o.id)
                                      )
                                    }>
                                    Chọn tất cả
                                  </Button>
                                  <Button
                                    size="small"
                                    type="link"
                                    onClick={() =>
                                      setSelectedOrganizationIds([])
                                    }>
                                    Bỏ chọn
                                  </Button>
                                </Space>
                                {selectedOrganizationIds.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <Tag color="blue" icon={<BankOutlined />}>
                                      {selectedOrganizationIds.length} đơn vị
                                      được chọn
                                    </Tag>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Col>

                  {/* Right: Columns Selection */}
                  <Col xs={24} md={12}>
                    <div className="columns-selection">
                      <div className="columns-header">
                        <Text strong>Chọn cột hiển thị:</Text>
                        <Space size="small">
                          <Button
                            size="small"
                            type="link"
                            onClick={handleSelectAllColumns}>
                            Chọn tất cả
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            onClick={handleDeselectAllColumns}>
                            Bỏ chọn
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            onClick={handleSelectDefaultColumns}>
                            Mặc định
                          </Button>
                        </Space>
                      </div>
                      <div className="columns-list">
                        <Checkbox.Group
                          value={selectedColumns}
                          onChange={(values) =>
                            setSelectedColumns(values as string[])
                          }>
                          <Row>
                            {availableColumns.map((column) => (
                              <Col key={column.key} xs={24} sm={12}>
                                <Checkbox value={column.key}>
                                  {column.label}
                                  {column.default && (
                                    <Tag
                                      color="blue"
                                      style={{ marginLeft: 4, fontSize: 10 }}>
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
                      type="primary"
                      size="large"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewVisible(true)}
                      disabled={
                        selectedColumns.length === 0 ||
                        !selectedYear ||
                        (periodType === "month" && !selectedMonth) ||
                        (periodType === "quarter" && !selectedQuarter)
                      }>
                      Xem trước và Xuất
                    </Button>
                  </Space>
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    {selectedColumns.length} cột được chọn
                  </Text>
                </div>
              </Card>
            )
          },
          {
            key: "batches",
            label: (
              <span>
                <FolderOutlined /> Đợt báo cáo
              </span>
            ),
            children: <ReportBatchTab canDelete={canDeleteHistory} />
          },
          {
            key: "history",
            label: (
              <span>
                <HistoryOutlined /> Lịch sử xuất (
                {stats?.exports_this_month || 0})
              </span>
            ),
            children: (
              <Card
                className="history-card"
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchHistory}
                    loading={historyLoading}>
                    {t("common.refresh")}
                  </Button>
                }>
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
                        pageSize
                      }))
                    }
                  }}
                  scroll={{ x: 1000 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có lịch sử xuất báo cáo"
                      />
                    )
                  }}
                />
              </Card>
            )
          }
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
        viewMode={viewMode}
        selectedColumns={selectedColumns}
        availableColumns={availableColumns}
        notes={notes}
        reportName={reportName}
        onExport={(excludedIds) => {
          handleExport(excludedIds)
        }}
        exportLoading={exportLoading}
        // Multi-org props
        isMultiOrgMode={isMultiOrgMode}
        selectedOrganizationIds={selectedOrganizationIds}
        accessibleOrganizations={accessibleOrganizations}
      />

      {/* History Detail Modal */}
      <Modal
        title={
          <Space>
            <FileDoneOutlined style={{ color: "#52c41a" }} />
            <span>Chi tiết báo cáo đã xuất</span>
          </Space>
        }
        open={historyDetailVisible}
        onCancel={() => {
          setHistoryDetailVisible(false)
          setSelectedHistoryItem(null)
        }}
        width={700}
        centered
        footer={
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined /> Đây là dữ liệu lịch sử, không thể chỉnh sửa
            </Text>
            <Space>
              <Button onClick={() => setHistoryDetailVisible(false)}>
                Đóng
              </Button>
              {selectedHistoryItem?.file_path && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    if (selectedHistoryItem) {
                      handleDownloadHistory(
                        selectedHistoryItem.id,
                        selectedHistoryItem.file_name
                      )
                    }
                  }}
                  style={{
                    background:
                      "linear-gradient(135deg, #52c41a 0%, #95de64 100%)",
                    border: "none"
                  }}>
                  Tải file báo cáo
                </Button>
              )}
            </Space>
          </Space>
        }>
        {selectedHistoryItem && (
          <div>
            {/* File info card */}
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)",
                borderRadius: 8
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <FileExcelOutlined style={{ fontSize: 48, color: "#52c41a" }} />
                <div style={{ flex: 1 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    {selectedHistoryItem.file_name}
                  </Title>
                  <Space style={{ marginTop: 4 }}>
                    <Tag color="blue" icon={<CalendarOutlined />}>
                      {selectedHistoryItem.month > 0
                        ? `Tháng ${selectedHistoryItem.month}/${selectedHistoryItem.year}`
                        : `Năm ${selectedHistoryItem.year}`}
                    </Tag>
                    <Tag
                      color={
                        selectedHistoryItem.view_mode === "kpis"
                          ? "purple"
                          : "green"
                      }>
                      {selectedHistoryItem.view_mode === "kpis"
                        ? "Theo KPI"
                        : "Theo hoạt động"}
                    </Tag>
                    {selectedHistoryItem.file_path ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        Có file
                      </Tag>
                    ) : (
                      <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                        Không có file
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Số hoạt động"
                    value={selectedHistoryItem.activity_count}
                    prefix={<TableOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Kích thước file"
                    value={formatFileSize(selectedHistoryItem.file_size)}
                    prefix={<FileExcelOutlined />}
                    valueStyle={{ color: "#52c41a", fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Số cột xuất"
                    value={selectedHistoryItem.selected_columns?.length || "-"}
                    prefix={<BarChartOutlined />}
                    valueStyle={{ color: "#722ed1" }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Details */}
            <Card title="Thông tin chi tiết" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Thời gian xuất">
                  {new Date(selectedHistoryItem.exported_at).toLocaleString(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Người xuất">
                  {selectedHistoryItem.exporter
                    ? `${selectedHistoryItem.exporter.first_name || ""} ${selectedHistoryItem.exporter.last_name || ""}`.trim() ||
                      selectedHistoryItem.exporter.email
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Loại báo cáo">
                  {selectedHistoryItem.report_type === "activity"
                    ? "Báo cáo hoạt động"
                    : selectedHistoryItem.report_type}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={
                      selectedHistoryItem.status === "completed"
                        ? "success"
                        : "processing"
                    }>
                    {selectedHistoryItem.status === "completed"
                      ? "Hoàn thành"
                      : selectedHistoryItem.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              {selectedHistoryItem.notes && (
                <>
                  <Divider style={{ margin: "12px 0" }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Ghi chú:
                    </Text>
                    <div
                      style={{
                        marginTop: 4,
                        padding: "8px 12px",
                        background: "#f5f5f5",
                        borderRadius: 4
                      }}>
                      <Text>{selectedHistoryItem.notes}</Text>
                    </div>
                  </div>
                </>
              )}

              {selectedHistoryItem.selected_columns &&
                selectedHistoryItem.selected_columns.length > 0 && (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Các cột đã xuất:
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {selectedHistoryItem.selected_columns.map(
                          (col, idx) => (
                            <Tag key={idx} style={{ marginBottom: 4 }}>
                              {col}
                            </Tag>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
            </Card>

            {!selectedHistoryItem.file_path && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#fffbe6",
                  border: "1px solid #ffe58f",
                  borderRadius: 8
                }}>
                <Space>
                  <ExclamationCircleOutlined
                    style={{ color: "#faad14", fontSize: 18 }}
                  />
                  <div>
                    <Text strong style={{ color: "#d48806" }}>
                      File không khả dụng
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      File báo cáo này không được lưu lại hoặc đã bị xóa. Bạn có
                      thể xuất lại báo cáo với cùng thông số.
                    </Text>
                  </div>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReportManagement
