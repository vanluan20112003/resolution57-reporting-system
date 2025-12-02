/**
 * Activity Management API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// ============== Interfaces ==============

export interface Activity {
  id: string
  code: string
  title: string
  description?: string
  activity_type_id: string
  activity_field_id?: string
  status: ActivityStatus
  lead_organization_id: string
  start_date?: string
  end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  budget?: number
  budget_source?: string
  location?: string
  external_url?: string
  completion_percentage: number
  result_summary?: string
  is_locked: boolean
  created_by: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  // Relations
  activity_type?: {
    id: string
    name: string
  }
  activity_field?: {
    id: string
    name: string
  }
  lead_organization?: {
    id: string
    name: string
    short_name?: string
  }
  creator?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  approver?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  kpis?: KpiItem[]
}

export type ActivityStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'COMPLETED'

export interface KpiItem {
  id: string
  source: 'CENTRAL' | 'VNU'
  code: string
  title: string
  category?: string
}

export interface ActivityListResponse {
  success: boolean
  data: Activity[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface ActivityResponse {
  success: boolean
  data: Activity
  message?: string
}

export interface ActivityFormData {
  activity_types: {
    id: string
    name: string
    description?: string
  }[]
  activity_fields: {
    id: string
    name: string
    description?: string
  }[]
  kpis: {
    central: KpiItem[]
    vnu: KpiItem[]
  }
  user_organization: {
    id: string
    name: string
    short_name?: string
  } | null
  statuses: {
    value: ActivityStatus
    label: string
  }[]
}

export interface ActivityFormDataResponse {
  success: boolean
  data: ActivityFormData
}

export interface CreateActivityRequest {
  title: string
  description?: string
  activity_type_id: string
  activity_field_id?: string
  start_date?: string
  end_date?: string
  budget?: number
  budget_source?: string
  location?: string
  external_url?: string
  kpi_ids?: string[]
}

export interface UpdateActivityRequest {
  title?: string
  description?: string
  activity_type_id?: string
  activity_field_id?: string
  status?: ActivityStatus
  start_date?: string
  end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  budget?: number
  budget_source?: string
  location?: string
  external_url?: string
  completion_percentage?: number
  result_summary?: string
  kpi_ids?: string[]
}

export interface ActivityFilters {
  status?: ActivityStatus
  activity_type_id?: string
  activity_field_id?: string
  search?: string
  per_page?: number
  page?: number
}

// ============== API Functions ==============

/**
 * Get form data (activity types, fields, kpis) for creating/editing activities
 */
export const getActivityFormData = async (): Promise<ActivityFormDataResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/form-data`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch form data: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all Activities with filtering
 */
export const getActivities = async (filters?: ActivityFilters): Promise<ActivityListResponse> => {
  const params = new URLSearchParams()

  if (filters?.status) params.append('status', filters.status)
  if (filters?.activity_type_id) params.append('activity_type_id', filters.activity_type_id)
  if (filters?.activity_field_id) params.append('activity_field_id', filters.activity_field_id)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activities${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single Activity by ID
 */
export const getActivityById = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch activity: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new Activity
 */
export const createActivity = async (data: CreateActivityRequest): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create activity')
  }

  return response.json()
}

/**
 * Update an existing Activity
 */
export const updateActivity = async (id: string, data: UpdateActivityRequest): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update activity')
  }

  return response.json()
}

/**
 * Delete an Activity
 */
export const deleteActivity = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete activity')
  }

  return response.json()
}

/**
 * Submit activity for approval
 */
export const submitActivityForApproval = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to submit activity for approval')
  }

  return response.json()
}

/**
 * Review an activity - Step 1 of approval
 */
export const reviewActivity = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/review`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to review activity')
  }

  return response.json()
}

/**
 * Approve/Confirm an activity - Step 2 of approval (final)
 */
export const approveActivity = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to approve activity')
  }

  return response.json()
}

/**
 * Reject an activity - return to draft or delete
 */
export interface RejectActivityRequest {
  action: 'return_to_draft' | 'delete'
  reason?: string
}

export const rejectActivity = async (id: string, data: RejectActivityRequest): Promise<ActivityResponse | { success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to reject activity')
  }

  return response.json()
}

/**
 * Lock an activity (prevent further edits)
 */
export const lockActivity = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/lock`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to lock activity')
  }

  return response.json()
}

/**
 * Unlock an activity (OPERATOR/ADMIN only)
 */
export const unlockActivity = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/unlock`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to unlock activity')
  }

  return response.json()
}

/**
 * Get badge counts for notifications
 */
export interface BadgeCounts {
  pending_approval: number
  draft: number
}

export interface BadgeCountsResponse {
  success: boolean
  data: BadgeCounts
}

export const getBadgeCounts = async (): Promise<BadgeCountsResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/badge-counts`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch badge counts')
  }

  return response.json()
}

// ============== Helper Functions ==============

/**
 * Get display label for status
 */
export const getStatusLabel = (status: ActivityStatus): string => {
  const statusLabels: Record<ActivityStatus, string> = {
    'DRAFT': 'Nháp',
    'PENDING_APPROVAL': 'Chờ phê duyệt',
    'IN_PROGRESS': 'Đang thực hiện',
    'ON_HOLD': 'Tạm hoãn',
    'CANCELLED': 'Đã hủy',
    'COMPLETED': 'Hoàn thành',
  }
  return statusLabels[status] || status
}

/**
 * Get color for status badge
 */
export const getStatusColor = (status: ActivityStatus): string => {
  const statusColors: Record<ActivityStatus, string> = {
    'DRAFT': 'default',
    'PENDING_APPROVAL': 'warning',
    'IN_PROGRESS': 'processing',
    'ON_HOLD': 'orange',
    'CANCELLED': 'error',
    'COMPLETED': 'success',
  }
  return statusColors[status] || 'default'
}
