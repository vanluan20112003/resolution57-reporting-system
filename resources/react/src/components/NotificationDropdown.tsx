import { useState } from 'react'
import { Badge, Dropdown, List, Avatar, Typography, Button, Empty, Tabs, Divider } from 'antd'
import {
  BellOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  UserAddOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { mockNotifications, NotificationType, type Notification } from '../data/mockData'
import '../styles/NotificationDropdown.css'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const { Text } = Typography

// Notification icon mapping
const getNotificationIcon = (type: NotificationType) => {
  const iconMap = {
    [NotificationType.ACTIVITY_APPROVED]: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    [NotificationType.ACTIVITY_REJECTED]: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    [NotificationType.ACTIVITY_UPDATED]: <FileTextOutlined style={{ color: '#1890ff' }} />,
    [NotificationType.ACTIVITY_COMPLETED]: <CheckOutlined style={{ color: '#52c41a' }} />,
    [NotificationType.ACTIVITY_ASSIGNED]: <UserAddOutlined style={{ color: '#722ed1' }} />,
    [NotificationType.KPI_DEADLINE]: <ClockCircleOutlined style={{ color: '#faad14' }} />,
    [NotificationType.REPORT_DUE]: <WarningOutlined style={{ color: '#fa8c16' }} />,
    [NotificationType.USER_MENTION]: <NotificationOutlined style={{ color: '#1890ff' }} />,
    [NotificationType.SYSTEM_ANNOUNCEMENT]: <NotificationOutlined style={{ color: '#13c2c2' }} />,
  }
  return iconMap[type] || <BellOutlined />
}

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
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

  const dropdownContent = (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-header">
        <Text strong style={{ fontSize: '16px' }}>
          Thông báo
        </Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={markAllAsRead}
            style={{ padding: 0 }}
          >
            Đánh dấu đã đọc tất cả
          </Button>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | 'unread')}
        size="small"
        items={[
          {
            key: 'all',
            label: `Tất cả (${notifications.length})`,
          },
          {
            key: 'unread',
            label: `Chưa đọc (${unreadCount})`,
          },
        ]}
        style={{ marginBottom: 0 }}
      />

      {/* Notification List */}
      <div className="notification-list">
        {filteredNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === 'unread'
                ? 'Không có thông báo chưa đọc'
                : 'Không có thông báo nào'
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification) => (
              <List.Item
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
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
                        icon={getNotificationIcon(notification.type)}
                        size={40}
                        style={{ backgroundColor: '#f0f0f0' }}
                      />
                    )
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong={!notification.is_read} style={{ fontSize: '14px' }}>
                        {notification.title}
                      </Text>
                      {!notification.is_read && (
                        <span className="unread-indicator" />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Text style={{ fontSize: '13px', color: '#595959' }}>
                        {notification.message}
                      </Text>
                      <div style={{ marginTop: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatTime(notification.created_at)}
                        </Text>
                        {notification.actor && (
                          <>
                            {' • '}
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {notification.actor.name}
                            </Text>
                          </>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
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
      overlayStyle={{ width: '420px', maxWidth: '90vw' }}
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
