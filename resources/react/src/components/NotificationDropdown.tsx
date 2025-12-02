import { useState } from 'react'
import { Badge, Dropdown, List, Avatar, Typography, Button, Empty, Tabs, Divider, Tag, Skeleton, Tooltip } from 'antd'
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
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import '../styles/NotificationDropdown.css'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const { Text } = Typography

// ============== Interfaces matching database schema ==============

export type NotificationType =
  | 'activity_created'
  | 'activity_submitted'
  | 'activity_pending_approval'
  | 'activity_approved'
  | 'activity_rejected_draft'
  | 'activity_rejected_deleted'
  | 'department_activity_approved'
  | 'activity_deadline_reminder'
  | 'activity_overdue'
  | 'activity_completed'
  | 'activity_locked'
  | 'system_announcement'
  | 'user_role_changed'

export type NotificationCategory = 'activity' | 'reminder' | 'system' | 'user'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'cyan' | 'gray'

export interface NotificationData {
  activity_id?: string
  activity_title?: string
  activity_code?: string
  organization_id?: string
  organization_name?: string
  old_status?: string
  new_status?: string
  reason?: string
  deadline?: string
  days_remaining?: number
  days_overdue?: number
  old_role?: string
  new_role?: string
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

const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: 'user-1',
    notification_type: 'activity_pending_approval',
    category: 'activity',
    title: 'Hoạt động chờ phê duyệt',
    message: 'Hoạt động "Hội thảo KHCN 2025" đã được gửi chờ phê duyệt',
    icon: 'ClockCircleOutlined',
    color: 'orange',
    action_url: '/dashboard?tab=pending-approval',
    data: {
      activity_id: 'act-001',
      activity_title: 'Hội thảo KHCN 2025',
      activity_code: 'HD-2025-001',
      organization_name: 'Phòng Khoa học Công nghệ',
    },
    actor: {
      id: 'user-2',
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@vnuhcm.edu.vn',
    },
    is_read: false,
    priority: 'high',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 phút trước
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: 'user-1',
    notification_type: 'activity_approved',
    category: 'activity',
    title: 'Hoạt động đã được phê duyệt',
    message: 'Hoạt động "Tập huấn chuyển đổi số" đã được phê duyệt và chuyển sang trạng thái Đang thực hiện',
    icon: 'CheckCircleOutlined',
    color: 'green',
    action_url: '/dashboard?tab=activity-management',
    data: {
      activity_id: 'act-002',
      activity_title: 'Tập huấn chuyển đổi số',
      activity_code: 'HD-2025-002',
      old_status: 'PENDING_APPROVAL',
      new_status: 'IN_PROGRESS',
    },
    actor: {
      id: 'user-3',
      name: 'Trần Thị B',
      email: 'tranthib@vnuhcm.edu.vn',
      avatar: '/avatars/user-3.jpg',
    },
    is_read: false,
    priority: 'normal',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 phút trước
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: 'user-1',
    notification_type: 'activity_rejected_draft',
    category: 'activity',
    title: 'Hoạt động bị từ chối',
    message: 'Hoạt động "Đề án nghiên cứu AI" đã bị từ chối và chuyển về trạng thái Nháp',
    icon: 'CloseCircleOutlined',
    color: 'red',
    action_url: '/dashboard?tab=activity-management',
    data: {
      activity_id: 'act-003',
      activity_title: 'Đề án nghiên cứu AI',
      activity_code: 'HD-2025-003',
      reason: 'Thiếu thông tin ngân sách chi tiết',
      old_status: 'PENDING_APPROVAL',
      new_status: 'DRAFT',
    },
    actor: {
      id: 'user-3',
      name: 'Trần Thị B',
      email: 'tranthib@vnuhcm.edu.vn',
    },
    is_read: false,
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 giờ trước
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user_id: 'user-1',
    notification_type: 'department_activity_approved',
    category: 'activity',
    title: 'Hoạt động mới của phòng ban',
    message: 'Phòng ban có hoạt động mới được phê duyệt: "Dự án xây dựng CSDL"',
    icon: 'TeamOutlined',
    color: 'blue',
    action_url: '/dashboard?tab=department-activities',
    data: {
      activity_id: 'act-004',
      activity_title: 'Dự án xây dựng CSDL',
      activity_code: 'HD-2025-004',
      organization_id: 'org-1',
      organization_name: 'Phòng CNTT',
    },
    is_read: true,
    read_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    priority: 'normal',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 giờ trước
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    user_id: 'user-1',
    notification_type: 'activity_deadline_reminder',
    category: 'reminder',
    title: 'Nhắc nhở deadline',
    message: 'Hoạt động "Báo cáo tiến độ Q4" sẽ đến hạn trong 3 ngày',
    icon: 'ClockCircleOutlined',
    color: 'orange',
    action_url: '/dashboard?tab=activity-management',
    data: {
      activity_id: 'act-005',
      activity_title: 'Báo cáo tiến độ Q4',
      activity_code: 'HD-2025-005',
      deadline: '2025-12-05',
      days_remaining: 3,
    },
    is_read: false,
    priority: 'high',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 giờ trước
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    user_id: 'user-1',
    notification_type: 'activity_overdue',
    category: 'reminder',
    title: 'Hoạt động quá hạn',
    message: 'Hoạt động "Hoàn thiện hồ sơ đề tài" đã quá hạn 2 ngày',
    icon: 'ExclamationCircleOutlined',
    color: 'red',
    action_url: '/dashboard?tab=activity-management',
    data: {
      activity_id: 'act-006',
      activity_title: 'Hoàn thiện hồ sơ đề tài',
      activity_code: 'HD-2025-006',
      days_overdue: 2,
    },
    is_read: true,
    read_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    priority: 'urgent',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 ngày trước
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    user_id: 'user-1',
    notification_type: 'activity_completed',
    category: 'activity',
    title: 'Hoạt động hoàn thành',
    message: 'Hoạt động "Seminar KHCN tháng 11" đã được đánh dấu hoàn thành',
    icon: 'CheckCircleOutlined',
    color: 'green',
    action_url: '/dashboard?tab=department-activities',
    data: {
      activity_id: 'act-007',
      activity_title: 'Seminar KHCN tháng 11',
      activity_code: 'HD-2025-007',
    },
    is_read: true,
    read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 ngày trước
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '8',
    user_id: 'user-1',
    notification_type: 'system_announcement',
    category: 'system',
    title: 'Thông báo hệ thống',
    message: 'Hệ thống sẽ bảo trì vào 22:00 ngày 05/12/2025',
    icon: 'SettingOutlined',
    color: 'cyan',
    priority: 'normal',
    is_read: true,
    read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 ngày trước
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '9',
    user_id: 'user-1',
    notification_type: 'user_role_changed',
    category: 'user',
    title: 'Thay đổi vai trò',
    message: 'Vai trò của bạn đã được thay đổi từ STAFF thành MANAGER',
    icon: 'UserOutlined',
    color: 'purple',
    data: {
      old_role: 'STAFF',
      new_role: 'MANAGER',
    },
    actor: {
      id: 'admin-1',
      name: 'Admin System',
    },
    is_read: true,
    read_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày trước
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '10',
    user_id: 'user-1',
    notification_type: 'activity_submitted',
    category: 'activity',
    title: 'Hoạt động đã gửi',
    message: 'Bạn đã gửi hoạt động "Chương trình đào tạo 2025" để phê duyệt',
    icon: 'SendOutlined',
    color: 'blue',
    action_url: '/dashboard?tab=activity-management',
    data: {
      activity_id: 'act-010',
      activity_title: 'Chương trình đào tạo 2025',
      activity_code: 'HD-2025-010',
    },
    is_read: true,
    read_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'normal',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 ngày trước
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============== Helper Functions ==============

// Icon mapping based on notification_type
const getNotificationIcon = (type: NotificationType, color?: NotificationColor) => {
  const colorValue = getColorValue(color)

  const iconMap: Record<NotificationType, React.ReactNode> = {
    'activity_created': <FileTextOutlined style={{ color: colorValue }} />,
    'activity_submitted': <SendOutlined style={{ color: colorValue }} />,
    'activity_pending_approval': <ClockCircleOutlined style={{ color: colorValue }} />,
    'activity_approved': <CheckCircleOutlined style={{ color: colorValue }} />,
    'activity_rejected_draft': <CloseCircleOutlined style={{ color: colorValue }} />,
    'activity_rejected_deleted': <DeleteOutlined style={{ color: colorValue }} />,
    'department_activity_approved': <TeamOutlined style={{ color: colorValue }} />,
    'activity_deadline_reminder': <ClockCircleOutlined style={{ color: colorValue }} />,
    'activity_overdue': <ExclamationCircleOutlined style={{ color: colorValue }} />,
    'activity_completed': <CheckCircleOutlined style={{ color: colorValue }} />,
    'activity_locked': <EyeOutlined style={{ color: colorValue }} />,
    'system_announcement': <SettingOutlined style={{ color: colorValue }} />,
    'user_role_changed': <UserOutlined style={{ color: colorValue }} />,
  }

  return iconMap[type] || <BellOutlined style={{ color: colorValue }} />
}

// Color value mapping
const getColorValue = (color?: NotificationColor): string => {
  const colorMap: Record<NotificationColor, string> = {
    'blue': '#1890ff',
    'green': '#52c41a',
    'red': '#ff4d4f',
    'orange': '#faad14',
    'purple': '#722ed1',
    'cyan': '#13c2c2',
    'gray': '#8c8c8c',
  }
  return color ? colorMap[color] : '#1890ff'
}

// Priority tag colors
const getPriorityTag = (priority: NotificationPriority) => {
  const config: Record<NotificationPriority, { color: string; label: string }> = {
    'low': { color: 'default', label: 'Thấp' },
    'normal': { color: 'blue', label: 'Bình thường' },
    'high': { color: 'orange', label: 'Cao' },
    'urgent': { color: 'red', label: 'Khẩn cấp' },
  }
  return config[priority]
}

// Category labels
const getCategoryLabel = (category: NotificationCategory): string => {
  const labels: Record<NotificationCategory, string> = {
    'activity': 'Hoạt động',
    'reminder': 'Nhắc nhở',
    'system': 'Hệ thống',
    'user': 'Người dùng',
  }
  return labels[category]
}

// Tab type for filtering
type TabKey = 'all' | 'unread' | 'activity' | 'reminder'

// ============== Component ==============

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [loading, setLoading] = useState(false)

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read && !n.archived_at).length

  // Count by category (excluding archived)
  const activityCount = notifications.filter(n => n.category === 'activity' && !n.archived_at).length
  const reminderCount = notifications.filter(n => n.category === 'reminder' && !n.archived_at).length

  // Filter notifications based on active tab (excluding archived)
  const getFilteredNotifications = (): Notification[] => {
    const nonArchived = notifications.filter(n => !n.archived_at)

    switch (activeTab) {
      case 'unread':
        return nonArchived.filter(n => !n.is_read)
      case 'activity':
        return nonArchived.filter(n => n.category === 'activity')
      case 'reminder':
        return nonArchived.filter(n => n.category === 'reminder')
      default:
        return nonArchived
    }
  }

  const filteredNotifications = getFilteredNotifications()

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    )
  }

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
    )
  }

  // Archive notification
  const archiveNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, archived_at: new Date().toISOString() } : n))
    )
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
    <div style={{ padding: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <Skeleton.Avatar active size={40} />
          <div style={{ flex: 1 }}>
            <Skeleton.Input active size="small" style={{ width: '60%', marginBottom: '8px' }} />
            <Skeleton.Input active size="small" style={{ width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  )

  const dropdownContent = (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-header">
        <Text strong style={{ fontSize: '16px' }}>
          Thông báo
        </Text>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              onClick={markAllAsRead}
              style={{ padding: 0, fontSize: '13px' }}
            >
              Đánh dấu đã đọc tất cả
            </Button>
          )}
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        size="small"
        items={[
          {
            key: 'all',
            label: `Tất cả`,
          },
          {
            key: 'unread',
            label: (
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                <span>Chưa đọc</span>
              </Badge>
            ),
          },
          {
            key: 'activity',
            label: `Hoạt động (${activityCount})`,
          },
          {
            key: 'reminder',
            label: (
              <Badge count={reminderCount} size="small" offset={[8, 0]} style={{ backgroundColor: '#faad14' }}>
                <span>Nhắc nhở</span>
              </Badge>
            ),
          },
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
              activeTab === 'unread'
                ? 'Không có thông báo chưa đọc'
                : activeTab === 'activity'
                ? 'Không có thông báo hoạt động'
                : activeTab === 'reminder'
                ? 'Không có nhắc nhở'
                : 'Không có thông báo nào'
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification) => {
              const priorityConfig = getPriorityTag(notification.priority)

              return (
                <List.Item
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} priority-${notification.priority}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    cursor: notification.action_url ? 'pointer' : 'default',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      notification.actor?.avatar ? (
                        <Avatar src={notification.actor.avatar} size={40} />
                      ) : (
                        <Avatar
                          icon={getNotificationIcon(notification.notification_type, notification.color)}
                          size={40}
                          style={{ backgroundColor: '#f5f5f5' }}
                        />
                      )
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Text strong={!notification.is_read} style={{ fontSize: '14px' }}>
                            {notification.title}
                          </Text>
                          {notification.priority !== 'normal' && (
                            <Tag
                              color={priorityConfig.color}
                              style={{ marginLeft: '8px', fontSize: '11px', padding: '0 4px' }}
                            >
                              {priorityConfig.label}
                            </Tag>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {!notification.is_read && <span className="unread-indicator" />}
                          <Tooltip title="Lưu trữ">
                            <Button
                              type="text"
                              size="small"
                              icon={<InboxOutlined />}
                              onClick={(e) => archiveNotification(notification.id, e)}
                              className="archive-btn"
                            />
                          </Tooltip>
                        </div>
                      </div>
                    }
                    description={
                      <div>
                        <Text style={{ fontSize: '13px', color: '#595959' }}>
                          {notification.message}
                        </Text>
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatTime(notification.created_at)}
                          </Text>
                          <Tag style={{ fontSize: '11px', margin: 0 }} color="default">
                            {getCategoryLabel(notification.category)}
                          </Tag>
                          {notification.actor && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              • {notification.actor.name}
                            </Text>
                          )}
                          {notification.data?.activity_code && (
                            <Tag style={{ fontSize: '11px', margin: 0 }} color="blue">
                              {notification.data.activity_code}
                            </Tag>
                          )}
                        </div>
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
          <Divider style={{ margin: '0' }} />
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
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayStyle={{ width: '480px', maxWidth: '90vw' }}
    >
      <Badge count={unreadCount} offset={[-4, 4]} size="small">
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '18px' }} />}
          style={{
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40px',
            width: '40px',
          }}
        />
      </Badge>
    </Dropdown>
  )
}
