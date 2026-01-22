import { API_CONFIG } from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// Types - Status is now calculated from dates (upcoming, ongoing, completed)
export type BatchStatus = 'upcoming' | 'ongoing' | 'completed'

export interface CollaboratorResponse {
  id: string
  report_batch_id: string
  organization_id: string
  activity_id: string
  submitted_by: string | null
  content: string
  submitted_at: string | null
  created_at: string
  updated_at: string
  organization?: {
    id: string
    name: string
    short_name?: string
  }
  activity?: {
    id: string
    title: string
  }
  submitter?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
}

export interface ReportBatch {
  id: string
  organization_id: string
  created_by: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  deadline: string | null
  status: BatchStatus
  notes: string | null
  created_at: string
  updated_at: string
  activities_count?: number
  collaborator_responses_count?: number
  creator?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  activities?: BatchActivity[]
  collaborator_responses?: CollaboratorResponse[]
}

export interface CollaboratingOrganization {
  id: string
  name: string
  short_name?: string
}

export interface BatchActivity {
  id: string
  title: string
  description?: string
  status: string
  start_date: string
  end_date: string
  lead_organization?: {
    id: string
    name: string
    short_name?: string
  }
  collaborating_organizations?: CollaboratingOrganization[]
  kpis?: Array<{
    id: string
    code?: string
    title: string
  }>
  pivot?: {
    order_number: number
    notes?: string
  }
}

export interface BatchListFilters {
  status?: BatchStatus | 'all'
  search?: string
  per_page?: number
  page?: number
}

export interface BatchListResponse {
  success: boolean
  data: ReportBatch[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface BatchDetailResponse {
  success: boolean
  data: ReportBatch
}

export interface CreateBatchData {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  deadline?: string
  notes?: string
  activity_ids?: string[]
}

export interface UpdateBatchData extends Partial<CreateBatchData> {
  // status is now calculated from dates, not editable
}

export interface AvailableActivitiesFilters {
  start_date?: string
  end_date?: string
  search?: string
  exclude_batch_id?: string
}

export interface AvailableActivitiesResponse {
  success: boolean
  data: BatchActivity[]
}

// KPI structure for activity selection
export interface KpiActivityItem {
  id: string
  title: string
  status: string
  start_date: string
  end_date: string
  lead_organization?: {
    id: string
    name: string
    short_name?: string
  }
  collaborating_organizations?: CollaboratingOrganization[]
}

export interface KpiWithActivities {
  id: string
  code: string | null
  title: string
  activities: KpiActivityItem[]
}

export interface KpiCategoryWithActivities {
  id: string
  name: string
  kpis: KpiWithActivities[]
}

export interface ActivitiesByKpiResponse {
  success: boolean
  data: KpiCategoryWithActivities[]
}

// Status labels for display (status is calculated from dates)
export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  upcoming: 'Sắp tới',
  ongoing: 'Đang diễn ra',
  completed: 'Kết thúc',
}

export const BATCH_STATUS_COLORS: Record<BatchStatus, string> = {
  upcoming: 'default',
  ongoing: 'processing',
  completed: 'success',
}

/**
 * Get list of report batches
 */
export const getReportBatches = async (filters: BatchListFilters = {}): Promise<BatchListResponse> => {
  const params = new URLSearchParams()
  // status is now calculated from dates, no need to filter by status
  if (filters.search) params.append('search', filters.search)
  if (filters.per_page) params.append('per_page', String(filters.per_page))
  if (filters.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/reports/batches${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách đợt báo cáo')
  }

  return response.json()
}

/**
 * Get single report batch with activities
 */
export const getReportBatch = async (id: string): Promise<BatchDetailResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải thông tin đợt báo cáo')
  }

  return response.json()
}

/**
 * Create new report batch
 */
export const createReportBatch = async (data: CreateBatchData): Promise<BatchDetailResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tạo đợt báo cáo')
  }

  return response.json()
}

/**
 * Update report batch
 */
export const updateReportBatch = async (id: string, data: UpdateBatchData): Promise<BatchDetailResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể cập nhật đợt báo cáo')
  }

  return response.json()
}

/**
 * Delete report batch
 */
export const deleteReportBatch = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xóa đợt báo cáo')
  }

  return response.json()
}

/**
 * Get available activities for adding to batch
 */
export const getAvailableActivities = async (filters: AvailableActivitiesFilters = {}): Promise<AvailableActivitiesResponse> => {
  const params = new URLSearchParams()
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  if (filters.search) params.append('search', filters.search)
  if (filters.exclude_batch_id) params.append('exclude_batch_id', filters.exclude_batch_id)

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/reports/batches/available-activities${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách hoạt động')
  }

  return response.json()
}

/**
 * Get activities grouped by KPI structure for selection
 */
export const getActivitiesByKpi = async (): Promise<ActivitiesByKpiResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/activities-by-kpi`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách hoạt động theo KPI')
  }

  return response.json()
}

/**
 * Add activities to batch
 */
export const addActivitiesToBatch = async (batchId: string, activityIds: string[]): Promise<BatchDetailResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/activities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ activity_ids: activityIds }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể thêm hoạt động vào đợt báo cáo')
  }

  return response.json()
}

/**
 * Remove activity from batch
 */
export const removeActivityFromBatch = async (batchId: string, activityId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/activities/${activityId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xóa hoạt động khỏi đợt báo cáo')
  }

  return response.json()
}

/**
 * Reorder activities in batch
 */
export const reorderBatchActivities = async (batchId: string, activityIds: string[]): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/reorder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ activity_ids: activityIds }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể cập nhật thứ tự hoạt động')
  }

  return response.json()
}

// ==================== Collaborator Responses API ====================

export interface CollaboratorResponsesResponse {
  success: boolean
  data: CollaboratorResponse[]
}

export interface SubmitResponseData {
  activity_id: string
  content: string
}

/**
 * Get collaborator responses for a batch
 */
export const getCollaboratorResponses = async (batchId: string): Promise<CollaboratorResponsesResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/responses`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách phản hồi')
  }

  return response.json()
}

/**
 * Submit collaborator response for a batch
 */
export const submitCollaboratorResponse = async (batchId: string, data: SubmitResponseData): Promise<{ success: boolean; data: CollaboratorResponse; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/responses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể gửi phản hồi')
  }

  return response.json()
}

/**
 * Delete collaborator response
 */
export const deleteCollaboratorResponse = async (batchId: string, responseId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/responses/${responseId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xóa phản hồi')
  }

  return response.json()
}

// ==================== Collaborator Organization APIs ====================

export interface MyResponseStats {
  total_required: number
  submitted: number
  pending: number
}

export interface CollaboratorBatch extends ReportBatch {
  organization?: {
    id: string
    name: string
    short_name?: string
  }
  my_response_stats?: MyResponseStats
  is_overdue?: boolean
}

export interface CollaboratorBatchListResponse {
  success: boolean
  data: CollaboratorBatch[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CollaboratorSummary {
  pending: number
  overdue: number
  completed: number
  total: number
}

export interface CollaboratorSummaryResponse {
  success: boolean
  data: CollaboratorSummary
}

export interface CollaboratorActivityResponse {
  id: string
  content: string
  submitted_at: string | null
  submitted_by?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
}

export interface CollaboratorBatchActivity extends BatchActivity {
  my_response?: CollaboratorActivityResponse | null
  can_submit?: boolean
}

export interface CollaboratorBatchDetail extends Omit<ReportBatch, 'activities'> {
  organization?: {
    id: string
    name: string
    short_name?: string
  }
  activities?: CollaboratorBatchActivity[]
  my_response_stats?: MyResponseStats
  is_overdue?: boolean
  can_submit?: boolean
}

export interface CollaboratorBatchDetailResponse {
  success: boolean
  data: CollaboratorBatchDetail
}

/**
 * Get list of batches where current user's organization is a collaborator
 */
export const getCollaboratorBatches = async (filters: BatchListFilters = {}): Promise<CollaboratorBatchListResponse> => {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters.search) params.append('search', filters.search)
  if (filters.per_page) params.append('per_page', String(filters.per_page))
  if (filters.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/reports/batches/collaborator${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách đợt báo cáo cần hoàn thành')
  }

  return response.json()
}

/**
 * Get summary statistics for collaborator batches
 */
export const getCollaboratorSummary = async (): Promise<CollaboratorSummaryResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/collaborator/summary`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải thống kê đợt báo cáo')
  }

  return response.json()
}

/**
 * Get batch detail for collaborating organization (read-only view)
 */
export const getCollaboratorBatchDetail = async (id: string): Promise<CollaboratorBatchDetailResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/collaborator/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải thông tin đợt báo cáo')
  }

  return response.json()
}

// ==================== Export Batch Report APIs ====================

export interface ActivityPreview {
  id: string
  title: string
  kpis: string
  lead_organization: string
  collaborating_organizations: string
  status: string
  completion_percentage: number
  start_date: string
  end_date: string
}

export interface ResponsePreview {
  organization_id: string
  organization_name: string
  has_response: boolean
  content: string | null
  submitter: string | null
  submitted_at: string | null
}

export interface CollaboratorResponseGrouped {
  activity_id: string
  activity_title: string
  kpis: string
  total_collaborators: number
  submitted_count: number
  responses: ResponsePreview[]
}

export interface ExportPreviewStatistics {
  total_activities: number
  activities_with_collaborators: number
  total_required_responses: number
  total_submitted: number
  completion_percentage: number
}

export interface ExportPreviewResponse {
  success: boolean
  data: {
    batch: {
      id: string
      name: string
      description: string | null
      start_date: string | null
      end_date: string | null
      deadline: string | null
      organization?: {
        id: string
        name: string
        short_name?: string
      }
    }
    activities: ActivityPreview[]
    collaborator_responses: CollaboratorResponseGrouped[]
    statistics: ExportPreviewStatistics
  }
}

export interface ExportHistoryItem {
  id: string
  file_name: string
  file_size: number
  file_size_formatted?: string
  activity_count?: number
  exporter?: {
    id: string
    name: string
    email: string
  } | null
  exported_at: string
  download_url?: string
}

export interface ExportHistoryResponse {
  success: boolean
  data: ExportHistoryItem[]
}

export interface ExportBatchResponse {
  success: boolean
  message: string
  data: {
    export_id: string
    file_name: string
    download_url: string
  }
}

/**
 * Preview batch report before exporting
 * Only accessible by the organization that created the batch
 */
export const previewBatchExport = async (batchId: string): Promise<ExportPreviewResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/export/preview`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xem trước báo cáo')
  }

  return response.json()
}

/**
 * Export batch report to Excel
 * Only accessible by the organization that created the batch
 */
export const exportBatch = async (batchId: string): Promise<ExportBatchResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/export`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xuất báo cáo')
  }

  return response.json()
}

/**
 * Get export history for a batch
 * Only accessible by the organization that created the batch
 */
export const getBatchExportHistory = async (batchId: string): Promise<ExportHistoryResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/export/history`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải lịch sử xuất báo cáo')
  }

  return response.json()
}

/**
 * Download exported batch report file
 */
export const downloadBatchExport = async (batchId: string, exportId: string): Promise<Blob> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/export/${exportId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải file báo cáo')
  }

  return response.blob()
}

// ===== BATCH FILES API =====

export interface BatchFile {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number
  file_size_formatted: string
  title: string | null
  description: string | null
  file_source: 'owner' | 'collaborator'
  organization: {
    id: string
    name: string
    short_name?: string
  } | null
  uploader: {
    id: string
    name: string
    email: string
  } | null
  created_at: string
}

export interface CollaboratorFileGroup {
  organization: {
    id: string
    name: string
    short_name?: string
  }
  files: BatchFile[]
}

export interface BatchFilesResponse {
  success: boolean
  data: {
    owner_files: BatchFile[]
    collaborator_files: CollaboratorFileGroup[]
    total_files: number
  }
}

export interface UploadFileResponse {
  success: boolean
  message: string
  data: {
    id: string
    file_name: string
    file_size: number
    file_size_formatted: string
  }
}

/**
 * Get files for a batch
 */
export const getBatchFiles = async (batchId: string): Promise<BatchFilesResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/files`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách file')
  }

  return response.json()
}

/**
 * Upload owner file (single file, replaces existing)
 */
export const uploadOwnerFile = async (
  batchId: string,
  file: File,
  title?: string,
  description?: string
): Promise<UploadFileResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (description) formData.append('description', description)

  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/files/owner`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể upload file')
  }

  return response.json()
}

/**
 * Upload collaborator file (multiple files allowed)
 */
export const uploadCollaboratorFile = async (
  batchId: string,
  file: File,
  title?: string,
  description?: string
): Promise<UploadFileResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (description) formData.append('description', description)

  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/files/collaborator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể upload file')
  }

  return response.json()
}

/**
 * Download batch file
 */
export const downloadBatchFile = async (batchId: string, fileId: string, fileName: string): Promise<void> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/files/${fileId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải file')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Delete batch file
 */
export const deleteBatchFile = async (batchId: string, fileId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/batches/${batchId}/files/${fileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xóa file')
  }

  return response.json()
}
