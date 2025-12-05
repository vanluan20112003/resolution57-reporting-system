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
  leader_names?: string[]
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

// Activity Status Workflow:
// DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED
// IN_PROGRESS and COMPLETED are computed dynamically from APPROVED based on dates
// POSTPONED: Temporarily postponed - allows editing dates, auto-returns to APPROVED after saving
export type ActivityStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS' // Computed: APPROVED + within date range
  | 'POSTPONED' // Temporarily postponed - allows editing dates
  | 'CANCELLED'
  | 'COMPLETED' // Computed: APPROVED + past end_date

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

// Note: Database stores lowercase values (pending, accepted, declined)
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface UserInvitation {
  id: string
  role: string
  invitation_status: InvitationStatus
  responded_at?: string
  notes?: string
}

export interface ActivityResponse {
  success: boolean
  data: Activity
  user_invitation?: UserInvitation | null
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
  code?: string
  title: string
  description?: string
  activity_type_id: string
  activity_field_id?: string
  leader_names?: string[]
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
  leader_names?: string[]
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

export interface AllActivitiesFilters {
  organization_id?: string
  activity_type_id?: string
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
 * Get all approved activities from all organizations (public view)
 * Returns only APPROVED, IN_PROGRESS, COMPLETED, POSTPONED, CANCELLED activities
 * Sorted by IN_PROGRESS first, then by start_date desc
 */
export const getAllApprovedActivities = async (filters?: AllActivitiesFilters): Promise<ActivityListResponse> => {
  const params = new URLSearchParams()

  if (filters?.organization_id) params.append('organization_id', filters.organization_id)
  if (filters?.activity_type_id) params.append('activity_type_id', filters.activity_type_id)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activities/all${queryString ? `?${queryString}` : ''}`

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
 * Postpone an activity (MANAGER/OPERATOR/ADMIN only)
 * Changes status to POSTPONED - allows editing dates
 * After saving new dates, auto-returns to APPROVED and resends invitations
 */
export interface PostponeActivityRequest {
  reason?: string
}

export const postponeActivity = async (id: string, data?: PostponeActivityRequest): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/postpone`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data || {}),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to postpone activity')
  }

  return response.json()
}

/**
 * Cancel an activity (MANAGER/OPERATOR/ADMIN only)
 * Changes status to CANCELLED - cannot be undone
 */
export interface CancelActivityRequest {
  reason: string
}

export const cancelActivity = async (id: string, data: CancelActivityRequest): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to cancel activity')
  }

  return response.json()
}

/**
 * Uncancel a cancelled activity (ADMIN only)
 * Changes status back to APPROVED
 */
export const uncancelActivity = async (id: string): Promise<ActivityResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${id}/uncancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to uncancel activity')
  }

  return response.json()
}

/**
 * Get badge counts for notifications
 */
export interface BadgeCounts {
  pending_approval: number
  draft: number
  needs_action: number
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

// ============== Activity Files Interfaces ==============

export interface ActivityFile {
  id: string
  activity_id: string
  file_type_id?: string
  file_name: string
  file_path?: string
  file_url?: string
  source_type: 'upload' | 'link'
  file_size?: number
  file_extension?: string
  mime_type?: string
  description?: string
  uploaded_by?: string
  is_public: boolean
  uploaded_at: string
  download_url?: string
  file_type?: {
    id: string
    code: string
    name: string
  }
  uploader?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface FileType {
  id: string
  code: string
  name: string
}

export interface ActivityFilesResponse {
  success: boolean
  data: {
    files: ActivityFile[]
    file_types: FileType[]
  }
}

export interface ActivityFileResponse {
  success: boolean
  data: ActivityFile
  message?: string
}

export interface AddLinkRequest {
  file_url: string
  file_name: string
  file_type_id?: string
  description?: string
}

export interface UpdateFileRequest {
  file_name?: string
  file_type_id?: string
  description?: string
  file_url?: string
}

export interface BatchAddFilesRequest {
  files: {
    source_type: 'link'
    file_type_id?: string
    file_name: string
    file_url: string
    description?: string
  }[]
}

// ============== Activity Files API Functions ==============

/**
 * Get all files for an activity
 */
export const getActivityFiles = async (activityId: string): Promise<ActivityFilesResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.FILES(activityId), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch activity files')
  }

  return response.json()
}

/**
 * Upload a file for an activity
 */
export const uploadActivityFile = async (
  activityId: string,
  file: File,
  fileTypeId?: string,
  description?: string
): Promise<ActivityFileResponse> => {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)
  if (fileTypeId) formData.append('file_type_id', fileTypeId)
  if (description) formData.append('description', description)

  const response = await fetch(API_CONFIG.ACTIVITIES.UPLOAD_FILE(activityId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to upload file')
  }

  return response.json()
}

/**
 * Add a link for an activity
 */
export const addActivityLink = async (
  activityId: string,
  data: AddLinkRequest
): Promise<ActivityFileResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.ADD_LINK(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to add link')
  }

  return response.json()
}

/**
 * Batch add files/links for an activity
 */
export const batchAddActivityFiles = async (
  activityId: string,
  data: BatchAddFilesRequest
): Promise<{ success: boolean; data: ActivityFile[]; message?: string }> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.BATCH_ADD_FILES(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to batch add files')
  }

  return response.json()
}

/**
 * Update an activity file/link
 */
export const updateActivityFile = async (
  activityId: string,
  fileId: string,
  data: UpdateFileRequest
): Promise<ActivityFileResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.UPDATE_FILE(activityId, fileId), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update file')
  }

  return response.json()
}

/**
 * Delete an activity file/link
 */
export const deleteActivityFile = async (
  activityId: string,
  fileId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.DELETE_FILE(activityId, fileId), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete file')
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
    'APPROVED': 'Đã phê duyệt',
    'REJECTED': 'Từ chối',
    'IN_PROGRESS': 'Đang thực hiện',
    'POSTPONED': 'Tạm hoãn',
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
    'APPROVED': 'success',
    'REJECTED': 'error',
    'IN_PROGRESS': 'processing',
    'POSTPONED': 'orange',
    'CANCELLED': 'error',
    'COMPLETED': 'success',
  }
  return statusColors[status] || 'default'
}

// ============== Activity Participants Interfaces ==============

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface ActivityParticipant {
  id: string
  activity_id: string
  user_id?: string
  external_name?: string
  external_email?: string
  external_phone?: string
  external_organization?: string
  role?: string
  invited_at?: string
  invitation_status: InvitationStatus
  responded_at?: string
  attended?: boolean
  attendance_time?: string
  notes?: string
  created_at: string
  updated_at: string
  // User info if internal
  user?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface AttendanceFile {
  id: string
  file_name: string
  file_path?: string
  uploaded_at: string
  uploader?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface ParticipantsSummary {
  total: number
  internal: number
  external: number
  pending: number
  accepted: number
  declined: number
  invited: number
  not_invited: number
}

export interface ActivityParticipantsResponse {
  success: boolean
  data: {
    participants: ActivityParticipant[]
    attendance_file: AttendanceFile | null
    summary: ParticipantsSummary
  }
}

export interface UploadAttendanceResponse {
  success: boolean
  message: string
  data: {
    file: AttendanceFile
    participants_count: number
    internal_users: number
    external_users: number
  }
}

export interface SendInvitationsResponse {
  success: boolean
  message: string
  data: {
    invitations_sent: number
    already_invited: number
  }
}

export interface RespondInvitationResponse {
  success: boolean
  message: string
  data: {
    status: InvitationStatus
    responded_at: string
  }
}

// ============== Activity Participants API Functions ==============

/**
 * Get participants for an activity
 */
export const getActivityParticipants = async (activityId: string): Promise<ActivityParticipantsResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.PARTICIPANTS(activityId), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch participants')
  }

  return response.json()
}

/**
 * Upload attendance list (Excel file with email column)
 */
export const uploadAttendanceList = async (
  activityId: string,
  file: File
): Promise<UploadAttendanceResponse> => {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(API_CONFIG.ACTIVITIES.UPLOAD_ATTENDANCE(activityId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to upload attendance list')
  }

  return response.json()
}

/**
 * Delete attendance list (only for DRAFT activities)
 */
export const deleteAttendanceList = async (
  activityId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.DELETE_ATTENDANCE(activityId), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete attendance list')
  }

  return response.json()
}

/**
 * Send invitations to participants
 */
export const sendInvitations = async (
  activityId: string
): Promise<SendInvitationsResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.SEND_INVITATIONS(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to send invitations')
  }

  return response.json()
}

/**
 * Resend invitation to specific participants
 */
export const resendInvitation = async (
  activityId: string,
  participantIds: string[]
): Promise<{ success: boolean; message: string; data: { sent: number } }> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.RESEND_INVITATION(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ participant_ids: participantIds }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to resend invitation')
  }

  return response.json()
}

/**
 * Respond to invitation (accept/decline)
 */
export const respondToInvitation = async (
  activityId: string,
  status: 'accepted' | 'declined'
): Promise<RespondInvitationResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.RESPOND_INVITATION(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    // Include already_responded and current_status for conflict handling
    const error: any = new Error(errorData.message || 'Failed to respond to invitation')
    if (errorData.already_responded) {
      error.already_responded = true
      error.current_status = errorData.current_status
    }
    throw error
  }

  return response.json()
}

/**
 * Download attendance list template (Excel file)
 */
export const downloadAttendanceTemplate = async (): Promise<void> => {
  const token = localStorage.getItem('access_token')

  const response = await fetch(API_CONFIG.ACTIVITIES.ATTENDANCE_TEMPLATE, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to download template')
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = 'mau_danh_sach_tham_du.xlsx'
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '')
    }
  }

  // Create blob and download
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Export participants list to Excel
 */
export const exportParticipants = async (activityId: string): Promise<void> => {
  const token = localStorage.getItem('access_token')

  const response = await fetch(API_CONFIG.ACTIVITIES.EXPORT_PARTICIPANTS(activityId), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to export participants')
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = `danh_sach_tham_du_${activityId}.xlsx`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match && match[1]) {
      filename = decodeURIComponent(match[1].replace(/['"]/g, ''))
    }
  }

  // Create blob and download
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Get attendance template info
 */
export const getAttendanceTemplateInfo = async (): Promise<{
  success: boolean
  data: {
    columns: {
      name: string
      title: string
      required: boolean
      description: string
    }[]
    notes: string[]
  }
}> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.ATTENDANCE_TEMPLATE_INFO, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to get template info')
  }

  return response.json()
}

// ============== Organization User Groups Interfaces ==============

export interface OrganizationUserGroup {
  key: string // 'all', 'manager', 'staff', 'guest'
  label: string
  description: string
  count: number
  disabled: boolean
}

export interface OrganizationOption {
  id: string
  name: string
  code: string
}

export interface OrganizationGroupsResponse {
  success: boolean
  data: {
    organization: {
      id: string
      name: string
      code: string
    } | null
    organizations: OrganizationOption[]
    groups: OrganizationUserGroup[]
    existing_participants_count: number
  }
}

export interface AddFromGroupResponse {
  success: boolean
  message: string
  data: {
    added_count: number
    groups_added: string[]
    summary: ParticipantsSummary
  }
}

// ============== Organization User Groups API Functions ==============

/**
 * Get available user groups from organizations
 * Can specify organization_id to get groups for a specific organization
 */
export const getOrganizationUserGroups = async (
  activityId: string,
  organizationId?: string
): Promise<OrganizationGroupsResponse> => {
  let url = API_CONFIG.ACTIVITIES.ORGANIZATION_GROUPS(activityId)
  if (organizationId) {
    url += `?organization_id=${organizationId}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to get organization groups')
  }

  return response.json()
}

/**
 * Add participants from organization user groups
 */
export const addParticipantsFromGroup = async (
  activityId: string,
  organizationId: string,
  groups: string[]
): Promise<AddFromGroupResponse> => {
  const response = await fetch(API_CONFIG.ACTIVITIES.ADD_FROM_GROUP(activityId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ organization_id: organizationId, groups }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to add participants from group')
  }

  return response.json()
}

// ============== Attendance Update API ==============

export interface UpdateAttendanceResponse {
  success: boolean
  message: string
  data: {
    updated_count: number
    attended_count: number
  }
}

/**
 * Update attendance for participants (mark who attended)
 */
export const updateParticipantsAttendance = async (
  activityId: string,
  participantIds: string[]
): Promise<UpdateAttendanceResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/participants/attendance`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ participant_ids: participantIds }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update attendance')
  }

  return response.json()
}

export interface NewParticipantData {
  email: string
  name: string
  phone?: string
  organization?: string
}

export interface ProcessAttendanceResponse {
  success: boolean
  message: string
  data: {
    attended_count: number
    new_participants_count: number
    file_uploaded: boolean
  }
}

/**
 * Process attendance with optional new participants and file upload
 */
export const processAttendanceWithNewParticipants = async (
  activityId: string,
  attendedParticipantIds: string[],
  newParticipants: NewParticipantData[],
  attendanceFile?: File
): Promise<ProcessAttendanceResponse> => {
  const formData = new FormData()
  formData.append('attended_participant_ids', JSON.stringify(attendedParticipantIds))
  formData.append('new_participants', JSON.stringify(newParticipants))

  if (attendanceFile) {
    formData.append('attendance_file', attendanceFile)
  }

  const token = localStorage.getItem('access_token')
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/participants/process-attendance`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to process attendance')
  }

  return response.json()
}

// ============== Completion Status Check ==============

/**
 * Check if a COMPLETED activity needs post-completion action
 * Returns true if:
 * - Activity is COMPLETED
 * - result_summary is empty OR attendance not recorded
 */
export const needsCompletionAction = (activity: Activity): boolean => {
  if (activity.status !== 'COMPLETED') return false

  // Check if result_summary is empty
  if (!activity.result_summary || activity.result_summary.trim() === '') {
    return true
  }

  return false
}
