import API_CONFIG from "@/config/api"

export type NotificationType =
  | "activity_created"
  | "activity_submitted"
  | "activity_pending_approval"
  | "activity_approved"
  | "activity_rejected_draft"
  | "activity_rejected_deleted"
  | "department_activity_approved"
  | "activity_deadline_reminder"
  | "activity_overdue"
  | "activity_completed"
  | "activity_locked"
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

export interface NotificationListResponse {
  success: boolean
  data: Notification[]
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }
}

export const getNotificationList =
  async (): Promise<NotificationListResponse> => {
    const response = await fetch(API_CONFIG.NOTIFICATIONS.LIST, {
      method: "GET",
      headers: getAuthHeaders()
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to fetch notifications")
    }
    const data = await response.json()
    return data
  }

export const readNotification = async (id: string): Promise<any> => {
  const response = await fetch(API_CONFIG.NOTIFICATIONS.READ(id), {
    method: "PUT",
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to mark notification as read")
  }

  const data = await response.json()
  return data
}

export const readAllNotifications = async (): Promise<any> => {
  const response = await fetch(API_CONFIG.NOTIFICATIONS.READ_ALL, {
    method: "PUT",
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      errorData.message || "Failed to mark all notifications as read"
    )
  }

  const data = await response.json()
  return data
}
