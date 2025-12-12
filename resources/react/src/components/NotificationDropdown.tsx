import { useEffect, useMemo, useState } from "react"
import {
  Badge,
  Dropdown,
  List,
  Avatar,
  Typography,
  Button,
  Empty,
  Tabs,
  Divider,
  Tag,
  Skeleton,
  Tooltip
} from "antd"
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  UserOutlined,
  DeleteOutlined,
  EyeOutlined,
  InboxOutlined,
  CalendarOutlined,
  StopOutlined,
  CheckOutlined,
  LoadingOutlined,
  LockOutlined,
  UnlockOutlined,
  RollbackOutlined
} from "@ant-design/icons"
import { message } from "antd"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/vi"
import "../styles/NotificationDropdown.css"
import {
  getNotificationList,
  readAllNotifications,
  readNotification,
  respondToInvitation
} from "@/services/notificationApi"

dayjs.extend(relativeTime)
dayjs.locale("vi")

const { Text } = Typography

// ============== Interfaces matching database schema ==============

export type NotificationType =
  | "activity_created"
  | "activity_submitted"
  | "activity_pending_approval"
  | "activity_approved"
  | "activity_approved_confirm"
  | "activity_rejected_draft"
  | "activity_rejected_deleted"
  | "department_activity_approved"
  | "activity_deadline_reminder"
  | "activity_overdue"
  | "activity_completed"
  | "activity_completed_with_result"
  | "activity_locked"
  | "activity_unlocked"
  | "activity_invitation"
  | "activity_postponed"
  | "activity_cancelled"
  | "activity_withdrawn"
  | "system_announcement"
  | "user_role_changed"

export type NotificationCategory = "activity" | "reminder" | "system" | "user"

export type NotificationPriority = "low" | "normal" | "high" | "urgent"

export type NotificationColor =
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "cyan"
  | "gray"

export interface NotificationData {
  activity_id?: string
  activity_title?: string
  activity_code?: string
  organization_id?: string
  organization_name?: string
  organization_avatar?: string
  organization_short_name?: string
  old_status?: string
  new_status?: string
  reason?: string
  deadline?: string
  days_remaining?: number
  days_overdue?: number
  old_role?: string
  new_role?: string
  invitation_status?: 'pending' | 'accepted' | 'declined'
  start_date?: string
  end_date?: string
  location?: string
  [key: string]: any
}

export interface NotificationActor {
  id: string
  name: string
  email?: string
  avatar?: string
}

export interface Notification {
  id: string
  user_id: string
  notification_type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  icon?: string
  color?: NotificationColor
  action_url?: string
  data?: NotificationData
  actor?: NotificationActor
  is_read: boolean
  read_at?: string
  seen_at?: string
  archived_at?: string
  priority: NotificationPriority
  created_at: string
  updated_at: string
}

// ============== Mock Data matching database structure ==============

// const mockNotifications: Notification[] = [
//   {
//     id: "1",
//     user_id: "user-1",
//     notification_type: "activity_pending_approval",
//     category: "activity",
//     title: "Hoạt động chờ phê duyệt",
//     message: 'Hoạt động "Hội thảo KHCN 2025" đã được gửi chờ phê duyệt',
//     icon: "ClockCircleOutlined",
//     color: "orange",
//     action_url: "/dashboard?tab=pending-approval",
//     data: {
//       activity_id: "act-001",
//       activity_title: "Hội thảo KHCN 2025",
//       activity_code: "HD-2025-001",
//       organization_name: "Phòng Khoa học Công nghệ"
//     },
//     actor: {
//       id: "user-2",
//       name: "Nguyễn Văn A",
//       email: "nguyenvana@vnuhcm.edu.vn"
//     },
//     is_read: false,
//     priority: "high",
//     created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 phút trước
//     updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
//   },
//   {
//     id: "2",
//     user_id: "user-1",
//     notification_type: "activity_approved",
//     category: "activity",
//     title: "Hoạt động đã được phê duyệt",
//     message:
//       'Hoạt động "Tập huấn chuyển đổi số" đã được phê duyệt và chuyển sang trạng thái Đang thực hiện',
//     icon: "CheckCircleOutlined",
//     color: "green",
//     action_url: "/dashboard?tab=activity-management",
//     data: {
//       activity_id: "act-002",
//       activity_title: "Tập huấn chuyển đổi số",
//       activity_code: "HD-2025-002",
//       old_status: "PENDING_APPROVAL",
//       new_status: "IN_PROGRESS"
//     },
//     actor: {
//       id: "user-3",
//       name: "Trần Thị B",
//       email: "tranthib@vnuhcm.edu.vn",
//       avatar: "/avatars/user-3.jpg"
//     },
//     is_read: false,
//     priority: "normal",
//     created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 phút trước
//     updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
//   },
//   {
//     id: "3",
//     user_id: "user-1",
//     notification_type: "activity_rejected_draft",
//     category: "activity",
//     title: "Hoạt động bị từ chối",
//     message:
//       'Hoạt động "Đề án nghiên cứu AI" đã bị từ chối và chuyển về trạng thái Nháp',
//     icon: "CloseCircleOutlined",
//     color: "red",
//     action_url: "/dashboard?tab=activity-management",
//     data: {
//       activity_id: "act-003",
//       activity_title: "Đề án nghiên cứu AI",
//       activity_code: "HD-2025-003",
//       reason: "Thiếu thông tin ngân sách chi tiết",
//       old_status: "PENDING_APPROVAL",
//       new_status: "DRAFT"
//     },
//     actor: {
//       id: "user-3",
//       name: "Trần Thị B",
//       email: "tranthib@vnuhcm.edu.vn"
//     },
//     is_read: false,
//     priority: "high",
//     created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 giờ trước
//     updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "4",
//     user_id: "user-1",
//     notification_type: "department_activity_approved",
//     category: "activity",
//     title: "Hoạt động mới của phòng ban",
//     message: 'Phòng ban có hoạt động mới được phê duyệt: "Dự án xây dựng CSDL"',
//     icon: "TeamOutlined",
//     color: "blue",
//     action_url: "/dashboard?tab=department-activities",
//     data: {
//       activity_id: "act-004",
//       activity_title: "Dự án xây dựng CSDL",
//       activity_code: "HD-2025-004",
//       organization_id: "org-1",
//       organization_name: "Phòng CNTT"
//     },
//     is_read: true,
//     read_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
//     priority: "normal",
//     created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 giờ trước
//     updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "5",
//     user_id: "user-1",
//     notification_type: "activity_deadline_reminder",
//     category: "reminder",
//     title: "Nhắc nhở deadline",
//     message: 'Hoạt động "Báo cáo tiến độ Q4" sẽ đến hạn trong 3 ngày',
//     icon: "ClockCircleOutlined",
//     color: "orange",
//     action_url: "/dashboard?tab=activity-management",
//     data: {
//       activity_id: "act-005",
//       activity_title: "Báo cáo tiến độ Q4",
//       activity_code: "HD-2025-005",
//       deadline: "2025-12-05",
//       days_remaining: 3
//     },
//     is_read: false,
//     priority: "high",
//     created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 giờ trước
//     updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "6",
//     user_id: "user-1",
//     notification_type: "activity_overdue",
//     category: "reminder",
//     title: "Hoạt động quá hạn",
//     message: 'Hoạt động "Hoàn thiện hồ sơ đề tài" đã quá hạn 2 ngày',
//     icon: "ExclamationCircleOutlined",
//     color: "red",
//     action_url: "/dashboard?tab=activity-management",
//     data: {
//       activity_id: "act-006",
//       activity_title: "Hoàn thiện hồ sơ đề tài",
//       activity_code: "HD-2025-006",
//       days_overdue: 2
//     },
//     is_read: true,
//     read_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
//     priority: "urgent",
//     created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 ngày trước
//     updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "7",
//     user_id: "user-1",
//     notification_type: "activity_completed",
//     category: "activity",
//     title: "Hoạt động hoàn thành",
//     message: 'Hoạt động "Seminar KHCN tháng 11" đã được đánh dấu hoàn thành',
//     icon: "CheckCircleOutlined",
//     color: "green",
//     action_url: "/dashboard?tab=department-activities",
//     data: {
//       activity_id: "act-007",
//       activity_title: "Seminar KHCN tháng 11",
//       activity_code: "HD-2025-007"
//     },
//     is_read: true,
//     read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//     priority: "low",
//     created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 ngày trước
//     updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "8",
//     user_id: "user-1",
//     notification_type: "system_announcement",
//     category: "system",
//     title: "Thông báo hệ thống",
//     message: "Hệ thống sẽ bảo trì vào 22:00 ngày 05/12/2025",
//     icon: "SettingOutlined",
//     color: "cyan",
//     priority: "normal",
//     is_read: true,
//     read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
//     created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 ngày trước
//     updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "9",
//     user_id: "user-1",
//     notification_type: "user_role_changed",
//     category: "user",
//     title: "Thay đổi vai trò",
//     message: "Vai trò của bạn đã được thay đổi từ STAFF thành MANAGER",
//     icon: "UserOutlined",
//     color: "purple",
//     data: {
//       old_role: "STAFF",
//       new_role: "MANAGER"
//     },
//     actor: {
//       id: "admin-1",
//       name: "Admin System"
//     },
//     is_read: true,
//     read_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
//     priority: "high",
//     created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày trước
//     updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
//   },
//   {
//     id: "10",
//     user_id: "user-1",
//     notification_type: "activity_submitted",
//     category: "activity",
//     title: "Hoạt động đã gửi",
//     message: 'Bạn đã gửi hoạt động "Chương trình đào tạo 2025" để phê duyệt',
//     icon: "SendOutlined",
//     color: "blue",
//     action_url: "/dashboard?tab=activity-management",
//     data: {
//       activity_id: "act-010",
//       activity_title: "Chương trình đào tạo 2025",
//       activity_code: "HD-2025-010"
//     },
//     is_read: true,
//     read_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
//     priority: "normal",
//     created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 ngày trước
//     updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
//   }
// ]

// ============== Helper Functions ==============

// Icon mapping based on notification_type
const getNotificationIcon = (
  type: NotificationType,
  color?: NotificationColor
) => {
  const colorValue = getColorValue(color)

  const iconMap: Record<NotificationType, React.ReactNode> = {
    activity_created: <FileTextOutlined style={{ color: colorValue }} />,
    activity_submitted: <SendOutlined style={{ color: colorValue }} />,
    activity_pending_approval: (
      <ClockCircleOutlined style={{ color: colorValue }} />
    ),
    activity_approved: <CheckCircleOutlined style={{ color: colorValue }} />,
    activity_approved_confirm: <CheckOutlined style={{ color: colorValue }} />,
    activity_rejected_draft: (
      <CloseCircleOutlined style={{ color: colorValue }} />
    ),
    activity_rejected_deleted: <DeleteOutlined style={{ color: colorValue }} />,
    department_activity_approved: (
      <TeamOutlined style={{ color: colorValue }} />
    ),
    activity_deadline_reminder: (
      <ClockCircleOutlined style={{ color: colorValue }} />
    ),
    activity_overdue: (
      <ExclamationCircleOutlined style={{ color: colorValue }} />
    ),
    activity_completed: <CheckCircleOutlined style={{ color: colorValue }} />,
    activity_completed_with_result: <CheckCircleOutlined style={{ color: colorValue }} />,
    activity_locked: <LockOutlined style={{ color: colorValue }} />,
    activity_unlocked: <UnlockOutlined style={{ color: colorValue }} />,
    activity_invitation: <CalendarOutlined style={{ color: colorValue }} />,
    activity_postponed: <ClockCircleOutlined style={{ color: colorValue }} />,
    activity_cancelled: <StopOutlined style={{ color: colorValue }} />,
    activity_withdrawn: <RollbackOutlined style={{ color: colorValue }} />,
    system_announcement: <SettingOutlined style={{ color: colorValue }} />,
    user_role_changed: <UserOutlined style={{ color: colorValue }} />
  }

  return iconMap[type] || <BellOutlined style={{ color: colorValue }} />
}

// Color value mapping
const getColorValue = (color?: NotificationColor): string => {
  const colorMap: Record<NotificationColor, string> = {
    blue: "#1890ff",
    green: "#52c41a",
    red: "#ff4d4f",
    orange: "#faad14",
    purple: "#722ed1",
    cyan: "#13c2c2",
    gray: "#8c8c8c"
  }
  return color ? colorMap[color] : "#1890ff"
}

// Priority tag colors
const getPriorityTag = (priority: NotificationPriority) => {
  const config: Record<NotificationPriority, { color: string; label: string }> =
    {
      low: { color: "default", label: "Thấp" },
      normal: { color: "blue", label: "Bình thường" },
      high: { color: "orange", label: "Cao" },
      urgent: { color: "red", label: "Khẩn cấp" }
    }
  return config[priority]
}

// Category labels
const getCategoryLabel = (category: NotificationCategory): string => {
  const labels: Record<NotificationCategory, string> = {
    activity: "Hoạt động",
    reminder: "Nhắc nhở",
    system: "Hệ thống",
    user: "Người dùng"
  }
  return labels[category]
}

// Tab type for filtering
type TabKey = "all" | "unread" | "activity" | "reminder"

// ============== Component ==============

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetNotifiacationList()
  }, [])

  const fetNotifiacationList = async () => {
    setLoading(true)
    try {
      const { data } = await getNotificationList()
      setNotifications(data)
    } finally {
      setLoading(false)
      setInitialLoaded(true)
    }
  }

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read && !n.archived_at).length
  }, [notifications])

  // Count by category (excluding archived)
  const activityCount = useMemo(
    () =>
      notifications.filter((n) => n.category === "activity" && !n.archived_at)
        .length,
    [notifications]
  )
  const reminderCount = useMemo(
    () =>
      notifications.filter((n) => n.category === "reminder" && !n.archived_at)
        .length,
    [notifications]
  )

  // Filter notifications based on active tab (excluding archived)
  const filteredNotifications = useMemo((): Notification[] => {
    const nonArchived = notifications.filter((n) => !n.archived_at)

    switch (activeTab) {
      case "unread":
        return nonArchived.filter((n) => !n.is_read)
      case "activity":
        return nonArchived.filter((n) => n.category === "activity")
      case "reminder":
        return nonArchived.filter((n) => n.category === "reminder")
      default:
        return nonArchived
    }
  }, [activeTab, notifications])

  // Mark notification as read
  const markAsRead = async (id: string) => {
    await readNotification(id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    )
  }

  // Mark all as read
  const markAllAsRead = async () => {
    await readAllNotifications()
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString()
      }))
    )
  }

  // Archive notification
  const archiveNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, archived_at: new Date().toISOString() } : n
      )
    )
  }

  // Handle invitation response (accept/decline)
  const handleInvitationResponse = async (
    notification: Notification,
    response: 'accepted' | 'declined',
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    const activityId = notification.data?.activity_id
    if (!activityId) {
      message.error('Không tìm thấy thông tin hoạt động')
      return
    }

    setRespondingIds(prev => new Set(prev).add(notification.id))

    try {
      await respondToInvitation(activityId, response)

      // Update ALL notifications for this activity to reflect the response
      setNotifications(prev =>
        prev.map(n =>
          // Update current notification AND all other invitation notifications for the same activity
          (n.id === notification.id ||
           (n.notification_type === 'activity_invitation' && n.data?.activity_id === activityId))
            ? {
                ...n,
                data: { ...n.data, invitation_status: response },
                is_read: true,
                read_at: new Date().toISOString()
              }
            : n
        )
      )

      message.success(
        response === 'accepted'
          ? 'Đã xác nhận tham gia hoạt động'
          : 'Đã từ chối tham gia hoạt động'
      )
    } catch (error: any) {
      // Handle already responded case (409 Conflict)
      if (error.already_responded) {
        // Update ALL notifications for this activity to reflect the current status from server
        setNotifications(prev =>
          prev.map(n =>
            (n.id === notification.id ||
             (n.notification_type === 'activity_invitation' && n.data?.activity_id === activityId))
              ? {
                  ...n,
                  data: { ...n.data, invitation_status: error.current_status },
                  is_read: true,
                  read_at: new Date().toISOString()
                }
              : n
          )
        )
        message.warning(error.message || 'Bạn đã phản hồi lời mời này rồi')
      } else {
        message.error(error.message || 'Không thể phản hồi lời mời')
      }
    } finally {
      setRespondingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  // Navigate to activity detail
  const handleViewActivityDetail = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    const activityId = notification.data?.activity_id
    if (activityId) {
      markAsRead(notification.id)
      navigate(`/activities/${activityId}`)
      setOpen(false)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.action_url) {
      navigate(notification.action_url)
      setOpen(false)
    }
  }

  // Format relative time
  const formatTime = (dateString: string) => {
    return dayjs(dateString).fromNow()
  }

  // Render loading skeleton
  const renderSkeleton = () => (
    <div style={{ padding: "16px" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <Skeleton.Avatar active size={40} />
          <div style={{ flex: 1 }}>
            <Skeleton.Input
              active
              size="small"
              style={{ width: "60%", marginBottom: "8px" }}
            />
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          </div>
        </div>
      ))}
    </div>
  )

  const dropdownContent = (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-header">
        <Text strong style={{ fontSize: "16px" }}>
          Thông báo
        </Text>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              onClick={markAllAsRead}
              style={{ padding: 0, fontSize: "13px" }}>
              Đánh dấu đã đọc tất cả
            </Button>
          )}
          {/* Close button for mobile */}
          <Button
            type="text"
            size="small"
            onClick={() => setOpen(false)}
            className="notification-close-btn"
            style={{ fontSize: "18px", padding: "4px 8px" }}>
            ✕
          </Button>
        </div>
      </div>

      <Divider style={{ margin: "8px 0" }} />

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        size="small"
        items={[
          {
            key: "all",
            label: `Tất cả`
          },
          {
            key: "unread",
            label: (
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                <span>Chưa đọc</span>
              </Badge>
            )
          },
          {
            key: "activity",
            label: `Hoạt động (${activityCount})`
          },
          {
            key: "reminder",
            label: (
              <Badge
                count={reminderCount}
                size="small"
                offset={[8, 0]}
                style={{ backgroundColor: "#faad14" }}>
                <span>Nhắc nhở</span>
              </Badge>
            )
          }
        ]}
        style={{ marginBottom: 0 }}
      />

      {/* Notification List */}
      <div className="notification-list">
        {loading ? (
          renderSkeleton()
        ) : filteredNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === "unread"
                ? "Không có thông báo chưa đọc"
                : activeTab === "activity"
                ? "Không có thông báo hoạt động"
                : activeTab === "reminder"
                ? "Không có nhắc nhở"
                : "Không có thông báo nào"
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification) => {
              const priorityConfig = getPriorityTag(notification.priority)
              const isInvitation = notification.notification_type === 'activity_invitation'
              const invitationStatus = notification.data?.invitation_status
              const isRespondingToThis = respondingIds.has(notification.id)
              const hasOrgAvatar = notification.data?.organization_avatar
              const isDepartmentRelated = [
                'department_activity_approved',
                'activity_invitation',
                'activity_postponed',
                'activity_cancelled',
                'activity_approved',
                'activity_locked',
                'activity_unlocked',
                'activity_completed_with_result',
                'activity_rejected_deleted',
                'activity_rejected_draft'
              ].includes(notification.notification_type)

              // Render avatar: organization avatar for department-related, otherwise actor or icon
              const renderAvatar = () => {
                if (isDepartmentRelated && hasOrgAvatar) {
                  return (
                    <Avatar
                      src={notification.data?.organization_avatar}
                      size={40}
                      style={{ border: '1px solid #f0f0f0' }}
                    >
                      {notification.data?.organization_short_name?.[0] || 'O'}
                    </Avatar>
                  )
                }
                if (notification.actor?.avatar) {
                  return <Avatar src={notification.actor.avatar} size={40} />
                }
                return (
                  <Avatar
                    icon={getNotificationIcon(
                      notification.notification_type,
                      notification.color
                    )}
                    size={40}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                )
              }

              return (
                <List.Item
                  className={`notification-item ${
                    !notification.is_read ? "unread" : ""
                  } priority-${notification.priority}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    cursor: notification.action_url || notification.data?.activity_id ? "pointer" : "default",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0"
                  }}>
                  <List.Item.Meta
                    avatar={renderAvatar()}
                    title={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "8px"
                        }}>
                        <div style={{ flex: 1 }}>
                          <Text
                            strong={!notification.is_read}
                            style={{ fontSize: "14px" }}>
                            {notification.title}
                          </Text>
                          {notification.priority !== "normal" && (
                            <Tag
                              color={priorityConfig.color}
                              style={{
                                marginLeft: "8px",
                                fontSize: "11px",
                                padding: "0 4px"
                              }}>
                              {priorityConfig.label}
                            </Tag>
                          )}
                          {/* Show invitation status badge */}
                          {isInvitation && invitationStatus && invitationStatus !== 'pending' && (
                            <Tag
                              color={invitationStatus === 'accepted' ? 'green' : 'red'}
                              style={{
                                marginLeft: "8px",
                                fontSize: "11px",
                                padding: "0 4px"
                              }}>
                              {invitationStatus === 'accepted' ? 'Đã xác nhận' : 'Đã từ chối'}
                            </Tag>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                          {!notification.is_read && (
                            <span className="unread-indicator" />
                          )}
                          <Tooltip title="Lưu trữ">
                            <Button
                              type="text"
                              size="small"
                              icon={<InboxOutlined />}
                              onClick={(e) =>
                                archiveNotification(notification.id, e)
                              }
                              className="archive-btn"
                            />
                          </Tooltip>
                        </div>
                      </div>
                    }
                    description={
                      <div>
                        <Text style={{ fontSize: "13px", color: "#595959" }}>
                          {notification.message}
                        </Text>

                        {/* Show activity info for invitations */}
                        {isInvitation && notification.data?.start_date && (
                          <div style={{ marginTop: "6px", fontSize: "12px", color: "#8c8c8c" }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            {dayjs(notification.data.start_date).format('DD/MM/YYYY HH:mm')}
                            {notification.data.end_date && (
                              <> - {dayjs(notification.data.end_date).format('DD/MM/YYYY HH:mm')}</>
                            )}
                            {notification.data.location && (
                              <span style={{ marginLeft: 8 }}>📍 {notification.data.location}</span>
                            )}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap"
                          }}>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {formatTime(notification.created_at)}
                          </Text>
                          <Tag
                            style={{ fontSize: "11px", margin: 0 }}
                            color="default">
                            {getCategoryLabel(notification.category)}
                          </Tag>
                          {notification.actor && (
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              • {notification.actor.name}
                            </Text>
                          )}
                          {notification.data?.activity_code && (
                            <Tag
                              style={{ fontSize: "11px", margin: 0 }}
                              color="blue">
                              {notification.data.activity_code}
                            </Tag>
                          )}
                        </div>

                        {/* Action buttons for activity notifications */}
                        {notification.data?.activity_id && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {/* View detail button */}
                            <Button
                              type="default"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={(e) => handleViewActivityDetail(notification, e)}
                            >
                              Xem chi tiết
                            </Button>

                            {/* Accept/Decline buttons for pending invitations */}
                            {isInvitation && (!invitationStatus || invitationStatus === 'pending') && (
                              <>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={isRespondingToThis ? <LoadingOutlined /> : <CheckOutlined />}
                                  onClick={(e) => handleInvitationResponse(notification, 'accepted', e)}
                                  disabled={isRespondingToThis}
                                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                >
                                  Xác nhận
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  icon={isRespondingToThis ? <LoadingOutlined /> : <CloseCircleOutlined />}
                                  onClick={(e) => handleInvitationResponse(notification, 'declined', e)}
                                  disabled={isRespondingToThis}
                                >
                                  Từ chối
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <>
          <Divider style={{ margin: "0" }} />
          <div className="notification-footer">
            <Button type="link" block onClick={() => setOpen(false)}>
              Xem tất cả thông báo
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={["click"]}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName="notification-dropdown-overlay"
      overlayStyle={{
        width: "480px",
        maxWidth: "calc(100vw - 16px)",
        position: "fixed",
        right: "8px"
      }}>
      <Badge
        count={initialLoaded ? unreadCount : 0}
        offset={[-4, 4]}
        size="small"
        style={{ transition: 'none' }}
        styles={{
          indicator: { transition: 'none', animation: 'none' }
        }}
      >
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: "18px" }} />}
          style={{
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "40px",
            width: "40px"
          }}
        />
      </Badge>
    </Dropdown>
  )
}
