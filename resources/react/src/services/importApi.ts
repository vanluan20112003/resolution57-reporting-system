import API_CONFIG from '../config/api'

// Types
export type ImportType = 'users' | 'organizations' | 'kpis' | 'activity_types' | 'activity_fields'

export interface ColumnInfo {
  field: string
  label: string
  required: boolean
  description: string
  example: string
}

export interface TemplateInfo {
  name: string
  filename: string
  columns: ColumnInfo[]
  unique_fields: string[]
}

export interface ImportResultItem {
  row: number
  status: 'created' | 'duplicate' | 'error'
  message: string
  data: Record<string, any>
}

export interface ImportResults {
  total: number
  success: number
  failed: number
  skipped: number
  errors: ImportResultItem[]
  created: ImportResultItem[]
  duplicates: ImportResultItem[]
}

export interface ImportResponse {
  success: boolean
  message: string
  data: ImportResults
}

export interface TemplateInfoResponse {
  success: boolean
  data: TemplateInfo | Record<string, TemplateInfo>
}

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('access_token')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

/**
 * Get template info for a specific type or all types
 */
export const getTemplateInfo = async (type?: ImportType): Promise<TemplateInfoResponse> => {
  const url = type
    ? `${API_CONFIG.IMPORT.TEMPLATE_INFO}?type=${type}`
    : API_CONFIG.IMPORT.TEMPLATE_INFO

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch template info')
  }

  return response.json()
}

/**
 * Download template file for a specific type
 */
export const downloadTemplate = async (type: ImportType): Promise<void> => {
  const token = localStorage.getItem('access_token')
  const url = `${API_CONFIG.IMPORT.TEMPLATE}?type=${type}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to download template')
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = `import_${type}_template.xlsx`
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '')
    }
  }

  // Create blob and download
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

/**
 * Import data from Excel file
 */
export const importExcel = async (type: ImportType, file: File): Promise<ImportResponse> => {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetch(API_CONFIG.IMPORT.IMPORT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to import data')
  }

  return response.json()
}

/**
 * Get display name for import type
 */
export const getImportTypeName = (type: ImportType): string => {
  const names: Record<ImportType, string> = {
    users: 'Người dùng',
    organizations: 'Đơn vị',
    kpis: 'Chỉ tiêu KPI',
    activity_types: 'Loại hoạt động',
    activity_fields: 'Lĩnh vực hoạt động',
  }
  return names[type] || type
}
