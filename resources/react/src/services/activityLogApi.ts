/**
 * Activity Log API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// Types
export interface ActivityLogUser {
  id: string
  email: string
  first_name: string
  last_name: string
}

export interface ActivityLogActivity {
  id: string
  code: string
  title: string
  status: string
}

export interface ActivityLog {
  id: string
  activity_id: string
  user_id: string
  organization_id: string | null
  action: string
  action_label: string
  description: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
  user?: ActivityLogUser
  activity?: ActivityLogActivity
}

export interface ActivityLogFilters {
  activity_id?: string
  user_id?: string
  action?: string
  from_date?: string
  to_date?: string
  search?: string
  organization_id?: string
  per_page?: number
  page?: number
}

export interface ActivityLogPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ActivityLogResponse {
  success: boolean
  data: ActivityLog[]
  pagination: ActivityLogPagination
  message?: string
}

export interface ActivityLogForActivityResponse {
  success: boolean
  data: ActivityLog[]
  activity: ActivityLogActivity
  message?: string
}

export interface OrganizationFeedResponse {
  success: boolean
  data: Record<string, ActivityLog[]>
  summary: {
    total_logs: number
    unique_users: number
    unique_activities: number
    actions_breakdown: Record<string, number>
  }
  message?: string
}

export interface ActionTypesResponse {
  success: boolean
  data: Record<string, string>
}

// API Functions

/**
 * Get activity logs with filters and pagination
 */
export const getActivityLogs = async (
  filters: ActivityLogFilters = {}
): Promise<ActivityLogResponse> => {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  })

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-logs${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch activity logs')
  }

  return response.json()
}

/**
 * Get logs for a specific activity
 */
export const getActivityLogsForActivity = async (
  activityId: string
): Promise<ActivityLogForActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-logs/activity/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch activity logs for activity')
  }

  return response.json()
}

/**
 * Get organization activity feed (grouped by date)
 */
export const getOrganizationFeed = async (
  options: { days?: number; limit?: number; organization_id?: string } = {}
): Promise<OrganizationFeedResponse> => {
  const params = new URLSearchParams()

  if (options.days) params.append('days', String(options.days))
  if (options.limit) params.append('limit', String(options.limit))
  if (options.organization_id) params.append('organization_id', options.organization_id)

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-logs/feed${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch organization feed')
  }

  return response.json()
}

/**
 * Get action types for filter dropdown
 */
export const getActionTypes = async (): Promise<ActionTypesResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-logs/action-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch action types')
  }

  return response.json()
}

// Action type constants (matching backend)
export const ACTION_TYPES = {
  created: 'Tạo hoạt động',
  updated: 'Cập nhật hoạt động',
  deleted: 'Xóa hoạt động',
  submitted: 'Gửi yêu cầu phê duyệt',
  approved: 'Phê duyệt hoạt động',
  rejected: 'Từ chối hoạt động',
  locked: 'Khóa hoạt động',
  unlocked: 'Mở khóa hoạt động',
  postponed: 'Tạm hoãn hoạt động',
  cancelled: 'Hủy hoạt động',
  uncancelled: 'Khôi phục hoạt động',
  file_uploaded: 'Tải lên file',
  file_deleted: 'Xóa file',
  participant_added: 'Thêm người tham gia',
  participant_removed: 'Xóa người tham gia',
  kpi_linked: 'Liên kết KPI',
  kpi_unlinked: 'Hủy liên kết KPI',
  collaborator_added: 'Thêm đơn vị phối hợp',
  collaborator_removed: 'Xóa đơn vị phối hợp',
} as const

// Action icons and colors for UI
export const ACTION_UI_CONFIG: Record<string, { icon: string; color: string }> = {
  created: { icon: 'PlusCircleOutlined', color: '#52c41a' },
  updated: { icon: 'EditOutlined', color: '#1890ff' },
  deleted: { icon: 'DeleteOutlined', color: '#ff4d4f' },
  submitted: { icon: 'SendOutlined', color: '#722ed1' },
  approved: { icon: 'CheckCircleOutlined', color: '#52c41a' },
  rejected: { icon: 'CloseCircleOutlined', color: '#ff4d4f' },
  locked: { icon: 'LockOutlined', color: '#faad14' },
  unlocked: { icon: 'UnlockOutlined', color: '#52c41a' },
  postponed: { icon: 'PauseCircleOutlined', color: '#faad14' },
  cancelled: { icon: 'StopOutlined', color: '#ff4d4f' },
  uncancelled: { icon: 'UndoOutlined', color: '#52c41a' },
  file_uploaded: { icon: 'UploadOutlined', color: '#1890ff' },
  file_deleted: { icon: 'FileExcelOutlined', color: '#ff4d4f' },
  participant_added: { icon: 'UserAddOutlined', color: '#52c41a' },
  participant_removed: { icon: 'UserDeleteOutlined', color: '#ff4d4f' },
  kpi_linked: { icon: 'LinkOutlined', color: '#1890ff' },
  kpi_unlinked: { icon: 'DisconnectOutlined', color: '#ff4d4f' },
  collaborator_added: { icon: 'TeamOutlined', color: '#52c41a' },
  collaborator_removed: { icon: 'UsergroupDeleteOutlined', color: '#ff4d4f' },
}

export default {
  getActivityLogs,
  getActivityLogsForActivity,
  getOrganizationFeed,
  getActionTypes,
}
