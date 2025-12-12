import { API_CONFIG } from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export type ViewMode = 'activities' | 'kpis'
export type PeriodType = 'month' | 'quarter' | 'year'

export interface ReportPeriod {
  month: number
  year: number
  label: string
  activity_count: number
}

export interface ReportPeriodsResponse {
  success: boolean
  data: {
    periods: ReportPeriod[]
    organization: {
      id: string
      name: string
      short_name?: string
    }
  }
}

export interface ExportColumn {
  key: string
  label: string
  default: boolean
}

export interface ExportColumnsResponse {
  success: boolean
  data: {
    view_mode: ViewMode
    columns: ExportColumn[]
  }
}

export interface EditedRowData {
  id: string
  edits: Record<string, string | number | null>
}

export interface ExportOptions {
  periodType?: PeriodType
  month?: number
  quarter?: number
  year?: number
  viewMode?: ViewMode
  columns?: string[]
  notes?: string
  reportName?: string
  excludedIds?: string[]
  editedRows?: EditedRowData[]
}

// Export History interfaces
export interface ExportHistoryItem {
  id: string
  organization_id: string
  exported_by: string
  report_type: string
  view_mode: ViewMode
  month: number
  year: number
  selected_columns: string[] | null
  file_name: string
  file_path: string | null
  file_size: number | null
  activity_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  notes: string | null
  error_message: string | null
  exported_at: string
  created_at: string
  updated_at: string
  // Relations
  exporter?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
}

export interface ExportHistoryFilters {
  month?: number
  year?: number
  view_mode?: ViewMode
  per_page?: number
  page?: number
}

export interface ExportHistoryResponse {
  success: boolean
  data: ExportHistoryItem[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface ReportStatsResponse {
  success: boolean
  data: {
    activity_stats: Record<string, number>
    total_activities: number
    exports_this_month: number
    last_export: {
      id: string
      file_name: string
      exported_at: string
      period: string
    } | null
  }
}

/**
 * Get available report periods
 */
export const getReportPeriods = async (): Promise<ReportPeriodsResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/periods`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách kỳ báo cáo')
  }

  return response.json()
}

/**
 * Get available export columns for a view mode
 */
export const getExportColumns = async (viewMode: ViewMode = 'activities'): Promise<ExportColumnsResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/columns?view_mode=${viewMode}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải danh sách cột')
  }

  return response.json()
}

/**
 * Get export history for current user's organization
 */
export const getExportHistory = async (filters: ExportHistoryFilters = {}): Promise<ExportHistoryResponse> => {
  const params = new URLSearchParams()
  if (filters.month) params.append('month', String(filters.month))
  if (filters.year) params.append('year', String(filters.year))
  if (filters.view_mode) params.append('view_mode', filters.view_mode)
  if (filters.per_page) params.append('per_page', String(filters.per_page))
  if (filters.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/reports/history${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
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
 * Get report statistics for dashboard
 */
export const getReportStats = async (): Promise<ReportStatsResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải thống kê báo cáo')
  }

  return response.json()
}

/**
 * Delete an export history record
 */
export const deleteExportHistory = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể xóa bản ghi')
  }

  return response.json()
}

/**
 * Download a previously exported report from history
 */
export const downloadExportHistory = async (id: string, fileName: string): Promise<void> => {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_CONFIG.BASE_URL}/reports/history/${id}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Không thể tải file')
    }
    throw new Error('Không thể tải file báo cáo')
  }

  // Download the file
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

/**
 * Export activity report - downloads Excel file
 * Uses POST to support sending editedRows data
 */
export const exportActivityReport = async (options: ExportOptions = {}): Promise<void> => {
  const { periodType = 'month', month, quarter, year, viewMode = 'activities', columns, notes, reportName, excludedIds, editedRows } = options

  const url = `${API_CONFIG.BASE_URL}/reports/export`
  const token = localStorage.getItem('access_token')

  // Build request body
  const body: Record<string, unknown> = {
    period_type: periodType,
    view_mode: viewMode,
  }
  if (month) body.month = month
  if (quarter) body.quarter = quarter
  if (year) body.year = year
  if (columns && columns.length > 0) body.columns = columns
  if (notes) body.notes = notes
  if (reportName) body.report_name = reportName
  if (excludedIds && excludedIds.length > 0) body.excluded_ids = excludedIds
  if (editedRows && editedRows.length > 0) body.edited_rows = editedRows

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Try to parse error message
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Không thể xuất báo cáo')
    }
    throw new Error('Không thể xuất báo cáo')
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition')
  const viewModeLabel = viewMode === 'kpis' ? 'KPI' : 'HD'
  let filename = `BaoCao_NQ57_${viewModeLabel}_T${month}_${year}.xlsx`

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '')
    }
  }

  // Download the file
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

// Preview interfaces - matching Excel export structure
export interface PreviewCategoryRow {
  type: 'category'
  roman_numeral: string
  category_name: string
  category_id: string | null
}

export interface PreviewActivityRow {
  type: 'activity'
  id: string
  stt: number | null
  nhiem_vu_trong_tam: string
  noi_dung_cu_the: string
  phuong_an_de_xuat: string
  time_period: string
  budget: number | null
  qualitative_target: string
  quantitative_target: string
  implementation_content: string
  updated_at: string
  evidence_link: string
  leader: string
  organization: string
  partner_organizations: string
  completion_date: string
  result_evaluation: string
  status: string
  kpi_id: string | null
}

export type PreviewRow = PreviewCategoryRow | PreviewActivityRow

export interface PreviewFilters {
  periodType?: PeriodType
  month?: number
  quarter?: number
  year?: number
}

export interface PreviewResponse {
  success: boolean
  data: {
    rows: PreviewRow[]
    summary: {
      total: number
      by_status: Record<string, number>
    }
    organization: {
      id: string
      name: string
      short_name?: string
    }
  }
}

/**
 * Get preview of activities for report (structured like Excel export)
 */
export const getReportPreview = async (filters: PreviewFilters = {}): Promise<PreviewResponse> => {
  const params = new URLSearchParams()
  if (filters.periodType) params.append('period_type', filters.periodType)
  if (filters.month) params.append('month', String(filters.month))
  if (filters.quarter) params.append('quarter', String(filters.quarter))
  if (filters.year) params.append('year', String(filters.year))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/reports/preview${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tải xem trước báo cáo')
  }

  return response.json()
}
