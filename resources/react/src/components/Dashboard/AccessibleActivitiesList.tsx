import { useState, useEffect } from "react"
import {
  Card,
  Table,
  Tag,
  Input,
  Select,
  Space,
  Button,
  message,
  Empty,
  Alert,
  Row,
  Col,
  Statistic,
  Spin,
  Typography,
  Tooltip,
  DatePicker,
  Divider,
  Modal,
  Descriptions,
  Progress,
  Segmented,
  List,
  Avatar,
  Badge
} from "antd"
import {
  EyeOutlined,
  TeamOutlined,
  SafetyOutlined,
  ReloadOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  ClearOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ArrowLeftOutlined,
  BankOutlined
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"
import type { Dayjs } from "dayjs"
import { getAccessibleOrganizations } from "../../services/organizationPermissionsApi"
import { getOrganizationListSimple } from "../../services/organizationApi"
import {
  getActivityTypesList,
  getActivityFieldsList,
  ActivityType,
  ActivityField
} from "../../services/activityConfigApi"
import API_CONFIG from "../../config/api"
import { t } from "i18next"

const { Search } = Input

// Helper function to construct full avatar URL
const getAvatarUrl = (
  avatarPath: string | null | undefined
): string | undefined => {
  if (!avatarPath) return undefined
  // If already a full URL, return as-is
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath
  }
  // Construct full URL from relative path
  // In production, use relative path; in dev, use localhost
  const baseUrl = import.meta.env.PROD
    ? window.location.origin
    : import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
      "http://localhost:8000"
  return `${baseUrl}/storage/${avatarPath}`
}
const { Option } = Select
const { Title, Text } = Typography
const { RangePicker } = DatePicker

// View mode type
type ViewMode = "organizations" | "activities"

// LocalStorage key for saving view mode preference
const VIEW_MODE_STORAGE_KEY = "accessible_activities_view_mode"

interface Activity {
  id: string
  code: string
  title: string
  status: string
  start_date: string
  end_date: string
  lead_organization_id: string
  activity_type_id: string
  lead_organization: {
    id: string
    name: string
    short_name?: string
  }
  activity_type: {
    id: string
    name: string
  }
  activity_field?: {
    id: string
    name: string
  }
  description?: string
  focus_content?: string
  qualitative_target?: string
  quantitative_target?: string
  location?: string
  budget?: number
  budget_source?: string
  completion_percentage?: number
  result_summary?: string
  actual_start_date?: string
  actual_end_date?: string
  leader_names?: string[]
  creator?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface AccessibleInfo {
  own_organization_id: string
  accessible_organization_ids: string[]
  can_view_all: boolean
  permissions_count: number
}

interface Organization {
  id: string
  name: string
  short_name?: string | null
  code?: string
  type?: string
  avatar?: string
}

interface OrganizationStats {
  organization: Organization
  activity_count: number
}

interface Filters {
  search: string
  organization_id: string | undefined
  status: string | undefined
  activity_type_id: string | undefined
  activity_field_id: string | undefined
  date_from: string | undefined
  date_to: string | undefined
}

export function AccessibleActivitiesList() {
  // View mode state - load from localStorage or default to 'organizations'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return (saved as ViewMode) || "organizations"
  })
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null)

  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [accessibleInfo, setAccessibleInfo] = useState<AccessibleInfo | null>(
    null
  )
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationStats, setOrganizationStats] = useState<
    OrganizationStats[]
  >([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [activityFields, setActivityFields] = useState<ActivityField[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0
  })
  const [filters, setFilters] = useState<Filters>({
    search: "",
    organization_id: undefined,
    status: undefined,
    activity_type_id: undefined,
    activity_field_id: undefined,
    date_from: undefined,
    date_to: undefined
  })
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  )
  const [detailLoading, setDetailLoading] = useState(false)

  // Organization search/filter state
  const [orgSearchText, setOrgSearchText] = useState("")
  const [orgSortBy, setOrgSortBy] = useState<"name" | "activity_count">(
    "activity_count"
  )

  // Save view mode preference when it changes
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true)
      await Promise.all([
        fetchAccessibleInfo(),
        fetchOrganizations(),
        fetchActivityTypes(),
        fetchActivityFields()
      ])
      setInitialLoading(false)
    }
    init()
  }, [])

  // Fetch organization stats when in organizations view mode
  useEffect(() => {
    if (
      accessibleInfo &&
      accessibleInfo.permissions_count > 0 &&
      viewMode === "organizations" &&
      !selectedOrganization
    ) {
      fetchOrganizationStats()
    }
  }, [accessibleInfo, viewMode, selectedOrganization])

  // Fetch activities when in activities view mode or when an organization is selected
  useEffect(() => {
    if (accessibleInfo && accessibleInfo.permissions_count > 0) {
      if (viewMode === "activities" || selectedOrganization) {
        fetchActivities()
      }
    }
  }, [
    accessibleInfo,
    pagination.current,
    pagination.pageSize,
    filters,
    viewMode,
    selectedOrganization
  ])

  const fetchAccessibleInfo = async () => {
    try {
      const response = await getAccessibleOrganizations()
      if (response.success) {
        setAccessibleInfo(response.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch accessible info:", error)
      message.error("Không thể kiểm tra quyền truy cập")
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await getOrganizationListSimple()
      if (response.success && response.data) {
        const orgsData = Array.isArray(response.data) ? response.data : []
        setOrganizations(orgsData)
      }
    } catch (error: any) {
      console.error("Failed to fetch organizations:", error)
    }
  }

  const fetchOrganizationStats = async () => {
    setLoadingStats(true)
    try {
      const token = localStorage.getItem("access_token")
      const orgMap = new Map<string, { org: Organization; count: number }>()

      // 1. Fetch accessible activities from other organizations
      const accessibleResponse = await fetch(
        `${API_CONFIG.BASE_URL}/activities/accessible/all?per_page=1000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (accessibleResponse.ok) {
        const data = await accessibleResponse.json()
        if (data.success && data.data) {
          data.data.forEach((activity: any) => {
            if (activity.lead_organization) {
              const orgId = activity.lead_organization.id
              if (orgMap.has(orgId)) {
                orgMap.get(orgId)!.count++
              } else {
                orgMap.set(orgId, {
                  org: {
                    id: activity.lead_organization.id,
                    name: activity.lead_organization.name,
                    short_name: activity.lead_organization.short_name,
                    code: activity.lead_organization.code,
                    avatar:
                      activity.lead_organization.avatar ||
                      activity.lead_organization.logo
                  },
                  count: 1
                })
              }
            }
          })
        }
      }

      // 2. Fetch own organization's activities
      const ownResponse = await fetch(
        `${API_CONFIG.BASE_URL}/activities?per_page=1000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (ownResponse.ok) {
        const ownData = await ownResponse.json()
        if (ownData.success && ownData.data) {
          ownData.data.forEach((activity: any) => {
            if (activity.lead_organization) {
              const orgId = activity.lead_organization.id
              if (orgMap.has(orgId)) {
                orgMap.get(orgId)!.count++
              } else {
                orgMap.set(orgId, {
                  org: {
                    id: activity.lead_organization.id,
                    name: activity.lead_organization.name,
                    short_name: activity.lead_organization.short_name,
                    code: activity.lead_organization.code,
                    avatar:
                      activity.lead_organization.avatar ||
                      activity.lead_organization.logo
                  },
                  count: 1
                })
              }
            }
          })
        }
      }

      // Convert to stats array
      const stats: OrganizationStats[] = Array.from(orgMap.values()).map(
        (item) => ({
          organization: item.org,
          activity_count: item.count
        })
      )

      // Sort by activity count descending
      setOrganizationStats(
        stats.sort((a, b) => b.activity_count - a.activity_count)
      )
    } catch (error: any) {
      console.error("Failed to fetch organization stats:", error)
      setOrganizationStats([])
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchActivityTypes = async () => {
    try {
      const response = await getActivityTypesList({ is_active: true })
      if (response.success) {
        setActivityTypes(response.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch activity types:", error)
    }
  }

  const fetchActivityFields = async () => {
    try {
      const response = await getActivityFieldsList({ is_active: true })
      if (response.success) {
        setActivityFields(response.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch activity fields:", error)
    }
  }

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const params: Record<string, string> = {
        page: String(pagination.current),
        per_page: String(pagination.pageSize)
      }

      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.activity_type_id)
        params.activity_type_id = filters.activity_type_id
      if (filters.activity_field_id)
        params.activity_field_id = filters.activity_field_id
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to

      // Determine which organization to filter by
      const targetOrgId = selectedOrganization?.id || filters.organization_id

      // Check if target org is own organization
      const isOwnOrg = targetOrgId === accessibleInfo?.own_organization_id

      let apiUrl: string
      if (isOwnOrg) {
        // Use regular activities API for own organization
        apiUrl = `${API_CONFIG.BASE_URL}/activities`
      } else {
        // Use accessible activities API for other organizations
        apiUrl = `${API_CONFIG.BASE_URL}/activities/accessible/all`
        if (targetOrgId) {
          params.organization_id = targetOrgId
        }
      }

      const url = new URL(apiUrl)
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value)
      })

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          message.warning("Bạn chưa được cấp quyền xem hoạt động này")
        } else {
          message.error("Không thể tải danh sách hoạt động")
        }
        return
      }

      const data = await response.json()
      if (data.success) {
        setActivities(data.data)
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0
        }))
      }
    } catch (error: any) {
      message.error("Không thể tải danh sách hoạt động")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total
    })
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleOrganizationChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, organization_id: value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleStatusChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, status: value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleActivityTypeChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, activity_type_id: value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleActivityFieldChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, activity_field_id: value }))
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        date_from: dates[0]!.format("YYYY-MM-DD"),
        date_to: dates[1]!.format("YYYY-MM-DD")
      }))
    } else {
      setFilters((prev) => ({
        ...prev,
        date_from: undefined,
        date_to: undefined
      }))
    }
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleClearFilters = () => {
    setFilters({
      search: "",
      organization_id: undefined,
      status: undefined,
      activity_type_id: undefined,
      activity_field_id: undefined,
      date_from: undefined,
      date_to: undefined
    })
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleRefresh = () => {
    fetchAccessibleInfo()
    if (accessibleInfo && accessibleInfo.permissions_count > 0) {
      if (viewMode === "organizations" && !selectedOrganization) {
        fetchOrganizationStats()
      } else {
        fetchActivities()
      }
    }
  }

  const handleViewDetail = async (activity: Activity) => {
    setSelectedActivity(activity)
    setDetailModalVisible(true)
    setDetailLoading(true)

    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/activities/${activity.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 403) {
          message.error("Bạn không có quyền xem chi tiết hoạt động này")
        } else {
          message.error("Không thể tải chi tiết hoạt động")
        }
        setDetailModalVisible(false)
        return
      }

      const data = await response.json()
      if (data.success) {
        setSelectedActivity(data.data)
      }
    } catch (error: any) {
      message.error("Không thể tải chi tiết hoạt động")
      console.error(error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseModal = () => {
    setDetailModalVisible(false)
    setSelectedActivity(null)
  }

  const handleViewModeChange = (value: ViewMode) => {
    setViewMode(value)
    setSelectedOrganization(null)
    setPagination((prev) => ({ ...prev, current: 1 }))
    setFilters({
      search: "",
      organization_id: undefined,
      status: undefined,
      activity_type_id: undefined,
      activity_field_id: undefined,
      date_from: undefined,
      date_to: undefined
    })
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleBackToOrganizations = () => {
    setSelectedOrganization(null)
    setActivities([])
    setPagination((prev) => ({ ...prev, current: 1, total: 0 }))
  }

  const formatCurrency = (value?: number) => {
    if (!value) return "-"
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value)
  }

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.organization_id ||
      filters.status ||
      filters.activity_type_id ||
      filters.activity_field_id ||
      filters.date_from ||
      filters.date_to
    )
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      APPROVED: "green",
      IN_PROGRESS: "blue",
      COMPLETED: "purple",
      CANCELLED: "red",
      POSTPONED: "orange"
    }
    return statusColors[status] || "default"
  }

  const getStatusText = (status: string) => {
    const statusTexts: Record<string, string> = {
      APPROVED: "Đã duyệt",
      IN_PROGRESS: "Đang thực hiện",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
      POSTPONED: "Hoãn lại"
    }
    return statusTexts[status] || status
  }

  const columns: ColumnsType<Activity> = [
    {
      title: "Mã hoạt động",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (code: string) => <Text strong>{code}</Text>
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <span>{title}</span>
        </Tooltip>
      )
    },
    {
      title: "Phòng ban",
      dataIndex: ["lead_organization", "short_name"],
      key: "organization",
      width: 150,
      render: (text, record) => (
        <Tag icon={<ApartmentOutlined />} color="blue">
          {text || record.lead_organization?.name || "N/A"}
        </Tag>
      )
    },
    {
      title: "Loại hoạt động",
      dataIndex: ["activity_type", "name"],
      key: "type",
      width: 150,
      ellipsis: true,
      render: (text) => text || "N/A"
    },
    {
      title: "Lĩnh vực",
      dataIndex: ["activity_field", "name"],
      key: "field",
      width: 150,
      ellipsis: true,
      render: (text) =>
        text ? <Tag color="cyan">{text}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: "Thời gian",
      key: "dates",
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.start_date && (
            <div>
              <small>
                Bắt đầu: {dayjs(record.start_date).format("DD/MM/YYYY")}
              </small>
            </div>
          )}
          {record.end_date && (
            <div>
              <small>
                Kết thúc: {dayjs(record.end_date).format("DD/MM/YYYY")}
              </small>
            </div>
          )}
        </Space>
      )
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: "Hành động",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}>
          Xem
        </Button>
      )
    }
  ]

  // Filter organizations by accessible IDs (exclude own org)
  const accessibleOrganizations = organizations.filter((org) => {
    if (org.id === accessibleInfo?.own_organization_id) return false
    if (accessibleInfo?.can_view_all) return true
    return (
      accessibleInfo?.accessible_organization_ids?.includes(org.id) ?? false
    )
  })

  const organizationsForFilter =
    accessibleOrganizations.length > 0
      ? accessibleOrganizations
      : activities
          .filter(
            (act) =>
              act.lead_organization &&
              act.lead_organization.id !== accessibleInfo?.own_organization_id
          )
          .reduce((acc, act) => {
            if (
              !acc.find((o) => o.id === act.lead_organization?.id) &&
              act.lead_organization
            ) {
              acc.push({
                id: act.lead_organization.id,
                name: act.lead_organization.name,
                short_name: act.lead_organization.short_name || undefined
              })
            }
            return acc
          }, [] as Organization[])

  // Loading state
  if (initialLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Đang kiểm tra quyền truy cập...</Text>
        </div>
      </div>
    )
  }

  // No permission state
  if (!accessibleInfo || accessibleInfo.permissions_count === 0) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert
          message="Chưa được cấp quyền"
          description={
            <div>
              <p>
                Bạn chưa được cấp quyền xem hoạt động của các phòng ban khác.
              </p>
              <p>Vui lòng liên hệ Admin/Operator để được cấp quyền truy cập.</p>
            </div>
          }
          type="warning"
          showIcon
          icon={<SafetyOutlined />}
          style={{ marginBottom: 24 }}
        />
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Bạn cần được cấp quyền để xem hoạt động của phòng ban khác.
                <br />
                Liên hệ người quản trị hệ thống.
              </span>
            }
          />
        </Card>
      </div>
    )
  }

  // Filter and sort organizations
  const filteredOrganizationStats = organizationStats
    .filter((item) => {
      if (!orgSearchText) return true
      const searchLower = orgSearchText.toLowerCase()
      return (
        item.organization.name?.toLowerCase().includes(searchLower) ||
        item.organization.short_name?.toLowerCase().includes(searchLower) ||
        item.organization.code?.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      if (orgSortBy === "name") {
        const nameA = a.organization.short_name || a.organization.name || ""
        const nameB = b.organization.short_name || b.organization.name || ""
        return nameA.localeCompare(nameB, "vi")
      }
      return b.activity_count - a.activity_count
    })

  // Render organizations list view
  const renderOrganizationsView = () => (
    <Card
      title={
        <Space>
          <BankOutlined />
          <span>Danh Sách Phòng Ban</span>
          {organizationStats.length > 0 && (
            <Tag color="blue">{organizationStats.length} phòng ban</Tag>
          )}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loadingStats}>
          {t("common.refresh")}
        </Button>
      }>
      {/* Search and Filter */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Search
            placeholder="Tìm phòng ban..."
            allowClear
            value={orgSearchText}
            onChange={(e) => setOrgSearchText(e.target.value)}
            onSearch={(value) => setOrgSearchText(value)}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Select
            value={orgSortBy}
            onChange={(value) => setOrgSortBy(value)}
            style={{ width: "100%" }}>
            <Option value="activity_count">Sắp xếp theo số hoạt động</Option>
            <Option value="name">Sắp xếp theo tên</Option>
          </Select>
        </Col>
        {orgSearchText && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setOrgSearchText("")}>
              Xóa tìm kiếm
            </Button>
          </Col>
        )}
      </Row>

      {loadingStats ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Đang tải danh sách phòng ban...</Text>
          </div>
        </div>
      ) : filteredOrganizationStats.length === 0 ? (
        <Empty
          description={
            orgSearchText
              ? `Không tìm thấy phòng ban "${orgSearchText}"`
              : "Không có phòng ban nào"
          }
        />
      ) : (
        <>
          {orgSearchText && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Tìm thấy {filteredOrganizationStats.length} /{" "}
                {organizationStats.length} phòng ban
              </Text>
            </div>
          )}
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
            dataSource={filteredOrganizationStats}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleSelectOrganization(item.organization)}
                  style={{ textAlign: "center" }}>
                  <Avatar
                    size={64}
                    icon={<BankOutlined />}
                    src={getAvatarUrl(item.organization.avatar)}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.organization.short_name || item.organization.name}
                    </Text>
                  </div>
                  {item.organization.short_name && item.organization.name && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.organization.name}
                      </Text>
                    </div>
                  )}
                  {item.organization.code && (
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="blue">{item.organization.code}</Tag>
                    </div>
                  )}
                  <Badge
                    count={item.activity_count}
                    showZero
                    style={{
                      backgroundColor:
                        item.activity_count > 0 ? "#52c41a" : "#d9d9d9"
                    }}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      hoạt động
                    </Text>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  )

  // Render activities table view
  const renderActivitiesView = () => (
    <Card
      title={
        <Space>
          {selectedOrganization && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBackToOrganizations}
              type="text"
            />
          )}
          <GlobalOutlined />
          <span>
            {selectedOrganization
              ? `Hoạt Động Của ${selectedOrganization.short_name || selectedOrganization.name}`
              : "Hoạt Động Của Các Phòng Ban Khác"}
          </span>
          {selectedOrganization && (
            <Tag color="blue">{selectedOrganization.code}</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          {!selectedOrganization && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              type={showAdvancedFilters ? "primary" : "default"}>
              Bộ lọc nâng cao
            </Button>
          )}
          {hasActiveFilters() && (
            <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </Space>
      }>
      {/* Basic Filters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Search
            placeholder="Tìm theo mã hoặc tiêu đề"
            onSearch={handleSearch}
            allowClear
            value={filters.search}
            onChange={(e) =>
              !e.target.value && setFilters((prev) => ({ ...prev, search: "" }))
            }
          />
        </Col>
        {!selectedOrganization && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Chọn phòng ban"
              onChange={handleOrganizationChange}
              style={{ width: "100%" }}
              allowClear
              showSearch
              optionFilterProp="children"
              value={filters.organization_id}>
              {organizationsForFilter.map((org) => (
                <Option key={org.id} value={org.id}>
                  {org.short_name || org.name}
                </Option>
              ))}
            </Select>
          </Col>
        )}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Select
            placeholder="Trạng thái"
            onChange={handleStatusChange}
            style={{ width: "100%" }}
            allowClear
            value={filters.status}>
            <Option value="APPROVED">Đã duyệt</Option>
            <Option value="IN_PROGRESS">Đang thực hiện</Option>
            <Option value="COMPLETED">Hoàn thành</Option>
            <Option value="POSTPONED">Hoãn lại</Option>
            <Option value="CANCELLED">Đã hủy</Option>
          </Select>
        </Col>
      </Row>

      {/* Advanced Filters */}
      {showAdvancedFilters && !selectedOrganization && (
        <>
          <Divider style={{ margin: "16px 0" }} />
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Loại hoạt động"
                onChange={handleActivityTypeChange}
                style={{ width: "100%" }}
                allowClear
                showSearch
                optionFilterProp="children"
                value={filters.activity_type_id}>
                {activityTypes.map((type) => (
                  <Option key={type.id} value={type.id}>
                    {type.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Lĩnh vực"
                onChange={handleActivityFieldChange}
                style={{ width: "100%" }}
                allowClear
                showSearch
                optionFilterProp="children"
                value={filters.activity_field_id}>
                {activityFields.map((field) => (
                  <Option key={field.id} value={field.id}>
                    {field.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <RangePicker
                placeholder={["Từ ngày", "Đến ngày"]}
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                onChange={handleDateRangeChange}
                value={
                  filters.date_from && filters.date_to
                    ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                    : null
                }
              />
            </Col>
          </Row>
        </>
      )}

      <Table
        columns={columns}
        dataSource={activities}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} hoạt động`,
          pageSizeOptions: ["10", "15", "20", "50"]
        }}
        onChange={handleTableChange}
        scroll={{ x: 1300 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                hasActiveFilters()
                  ? "Không tìm thấy hoạt động phù hợp với bộ lọc"
                  : "Chưa có hoạt động từ các phòng ban khác"
              }
            />
          )
        }}
      />
    </Card>
  )

  // Calculate total activities from organization stats
  const totalActivitiesFromStats = organizationStats.reduce(
    (sum, item) => sum + item.activity_count,
    0
  )
  const totalOrganizations = organizationStats.length

  return (
    <div style={{ padding: "24px" }}>
      {/* Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Quyền xem"
              value={
                accessibleInfo.can_view_all
                  ? "Tất cả"
                  : accessibleInfo.accessible_organization_ids.length - 1
              }
              suffix={accessibleInfo.can_view_all ? "" : "phòng ban"}
              prefix={<GlobalOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Tổng hoạt động"
              value={
                viewMode === "organizations" && !selectedOrganization
                  ? totalActivitiesFromStats
                  : pagination.total
              }
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Phòng ban"
              value={totalOrganizations}
              prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Phạm vi"
              value={accessibleInfo.can_view_all ? "Toàn hệ thống" : "Giới hạn"}
              valueStyle={{
                fontSize: 14,
                color: accessibleInfo.can_view_all ? "#52c41a" : "#faad14"
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* View Mode Switcher & Permission Info */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={16}>
          <Alert
            message={
              accessibleInfo.can_view_all
                ? "Bạn có quyền xem hoạt động của TẤT CẢ phòng ban trong hệ thống"
                : `Bạn có quyền xem hoạt động của ${accessibleInfo.accessible_organization_ids.length - 1} phòng ban khác`
            }
            type="info"
            showIcon
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
            <Segmented
              value={viewMode}
              onChange={(value) => handleViewModeChange(value as ViewMode)}
              options={[
                {
                  label: (
                    <Space>
                      <AppstoreOutlined />
                      <span>Theo phòng ban</span>
                    </Space>
                  ),
                  value: "organizations"
                },
                {
                  label: (
                    <Space>
                      <UnorderedListOutlined />
                      <span>Danh sách</span>
                    </Space>
                  ),
                  value: "activities"
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content - Based on View Mode */}
      {viewMode === "organizations" && !selectedOrganization
        ? renderOrganizationsView()
        : renderActivitiesView()}

      {/* Activity Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Chi tiết hoạt động</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Đóng
          </Button>
        ]}
        width={900}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}>
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Đang tải thông tin...</Text>
            </div>
          </div>
        ) : selectedActivity ? (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={24}>
                  <Title level={4} style={{ marginBottom: 8 }}>
                    {selectedActivity.title}
                  </Title>
                </Col>
                <Col xs={12} md={8}>
                  <Text style={{ color: "#595959", fontWeight: 500 }}>
                    Mã hoạt động:
                  </Text>
                  <div>
                    <Text strong>{selectedActivity.code}</Text>
                  </div>
                </Col>
                <Col xs={12} md={8}>
                  <Text style={{ color: "#595959", fontWeight: 500 }}>
                    Trạng thái:
                  </Text>
                  <div>
                    <Tag color={getStatusColor(selectedActivity.status)}>
                      {getStatusText(selectedActivity.status)}
                    </Tag>
                  </div>
                </Col>
                <Col xs={12} md={8}>
                  <Text style={{ color: "#595959", fontWeight: 500 }}>
                    Tiến độ:
                  </Text>
                  <div>
                    <Progress
                      percent={selectedActivity.completion_percentage || 0}
                      size="small"
                      status={
                        selectedActivity.status === "COMPLETED"
                          ? "success"
                          : "active"
                      }
                    />
                  </div>
                </Col>
              </Row>
            </Card>

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, md: 2 }}
              style={{ marginBottom: 16 }}
              labelStyle={{
                fontWeight: 500,
                color: "#262626",
                backgroundColor: "#fafafa"
              }}>
              <Descriptions.Item
                label={
                  <>
                    <ApartmentOutlined style={{ color: "#1890ff" }} /> Phòng ban
                  </>
                }>
                {selectedActivity.lead_organization?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Loại hoạt động">
                {selectedActivity.activity_type?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Lĩnh vực">
                {selectedActivity.activity_field?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Người tạo">
                {selectedActivity.creator
                  ? `${selectedActivity.creator.first_name} ${selectedActivity.creator.last_name}`
                  : "-"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, md: 4 }}
              style={{ marginBottom: 16 }}
              labelStyle={{
                fontWeight: 500,
                color: "#262626",
                backgroundColor: "#fafafa"
              }}
              title={
                <>
                  <CalendarOutlined style={{ color: "#1890ff" }} />{" "}
                  <span style={{ fontWeight: 600, color: "#262626" }}>
                    Thời gian
                  </span>
                </>
              }>
              <Descriptions.Item label="Ngày bắt đầu (KH)">
                {selectedActivity.start_date
                  ? dayjs(selectedActivity.start_date).format("DD/MM/YYYY")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc (KH)">
                {selectedActivity.end_date
                  ? dayjs(selectedActivity.end_date).format("DD/MM/YYYY")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu (TT)">
                {selectedActivity.actual_start_date
                  ? dayjs(selectedActivity.actual_start_date).format(
                      "DD/MM/YYYY"
                    )
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc (TT)">
                {selectedActivity.actual_end_date
                  ? dayjs(selectedActivity.actual_end_date).format("DD/MM/YYYY")
                  : "-"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              style={{ marginBottom: 16 }}
              labelStyle={{
                fontWeight: 500,
                color: "#262626",
                backgroundColor: "#fafafa"
              }}>
              <Descriptions.Item
                label={
                  <>
                    <DollarOutlined style={{ color: "#52c41a" }} /> Kinh phí
                  </>
                }>
                {formatCurrency(selectedActivity.budget)}
              </Descriptions.Item>
              <Descriptions.Item label="Nguồn kinh phí">
                {selectedActivity.budget_source || "-"}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <EnvironmentOutlined style={{ color: "#fa8c16" }} /> Địa
                    điểm
                  </>
                }
                span={2}>
                {selectedActivity.location || "-"}
              </Descriptions.Item>
            </Descriptions>

            {selectedActivity.description && (
              <Card
                size="small"
                title={
                  <span style={{ fontWeight: 600, color: "#262626" }}>
                    Mô tả
                  </span>
                }
                style={{ marginBottom: 16 }}
                styles={{ header: { backgroundColor: "#fafafa" } }}>
                <Text>{selectedActivity.description}</Text>
              </Card>
            )}

            {selectedActivity.focus_content && (
              <Card
                size="small"
                title={
                  <span style={{ fontWeight: 600, color: "#262626" }}>
                    Nội dung trọng tâm
                  </span>
                }
                style={{ marginBottom: 16 }}
                styles={{ header: { backgroundColor: "#fafafa" } }}>
                <Text>{selectedActivity.focus_content}</Text>
              </Card>
            )}

            {(selectedActivity.qualitative_target ||
              selectedActivity.quantitative_target) && (
              <Card
                size="small"
                title={
                  <span style={{ fontWeight: 600, color: "#262626" }}>
                    Mục tiêu
                  </span>
                }
                style={{ marginBottom: 16 }}
                styles={{ header: { backgroundColor: "#fafafa" } }}>
                {selectedActivity.qualitative_target && (
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ color: "#595959", fontWeight: 500 }}>
                      Mục tiêu định tính:
                    </Text>
                    <div>
                      <Text>{selectedActivity.qualitative_target}</Text>
                    </div>
                  </div>
                )}
                {selectedActivity.quantitative_target && (
                  <div>
                    <Text style={{ color: "#595959", fontWeight: 500 }}>
                      Mục tiêu định lượng:
                    </Text>
                    <div>
                      <Text>{selectedActivity.quantitative_target}</Text>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {selectedActivity.result_summary && (
              <Card
                size="small"
                title={
                  <span style={{ fontWeight: 600, color: "#262626" }}>
                    Kết quả
                  </span>
                }
                style={{ marginBottom: 16 }}
                styles={{ header: { backgroundColor: "#fafafa" } }}>
                <Text>{selectedActivity.result_summary}</Text>
              </Card>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default AccessibleActivitiesList
