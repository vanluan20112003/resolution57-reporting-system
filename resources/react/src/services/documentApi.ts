/**
 * Document Library API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

const getAuthHeadersForUpload = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Authorization': `Bearer ${token}`,
  }
}

export type DocumentVisibility = 'PUBLIC' | 'ORGANIZATION' | 'PRIVATE'

export interface DocumentUploader {
  id: string
  first_name?: string
  last_name?: string
  email: string
}

export interface DocumentOrganization {
  id: string
  name: string
  short_name?: string
}

export interface Document {
  id: string
  title: string
  description?: string
  file_path: string
  file_name: string
  file_type?: string
  file_size: number
  category?: string
  tags?: string[]
  organization_id?: string
  organization?: DocumentOrganization
  visibility: DocumentVisibility
  uploaded_by: string
  uploader?: DocumentUploader
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface DocumentListResponse {
  success: boolean
  data: Document[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface DocumentResponse {
  success: boolean
  data: Document
  message?: string
}

export interface DocumentFilters {
  category?: string
  visibility?: DocumentVisibility
  organization_id?: string
  file_type?: string
  uploaded_by?: string
  search?: string
  tags?: string[]
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

export interface UploadDocumentRequest {
  file: File
  title: string
  description?: string
  category?: string
  tags?: string[]
  organization_id?: string
  visibility?: DocumentVisibility
}

export interface UpdateDocumentRequest {
  title?: string
  description?: string
  category?: string
  tags?: string[]
  organization_id?: string
  visibility?: DocumentVisibility
  is_active?: boolean
}

/**
 * Get list of documents with filtering
 */
export const getDocuments = async (filters?: DocumentFilters): Promise<DocumentListResponse> => {
  const params = new URLSearchParams()

  if (filters?.category) params.append('category', filters.category)
  if (filters?.visibility) params.append('visibility', filters.visibility)
  if (filters?.organization_id) params.append('organization_id', filters.organization_id)
  if (filters?.file_type) params.append('file_type', filters.file_type)
  if (filters?.uploaded_by) params.append('uploaded_by', filters.uploaded_by)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','))
  if (filters?.sort_by) params.append('sort_by', filters.sort_by)
  if (filters?.sort_order) params.append('sort_order', filters.sort_order)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/documents${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single document by ID
 */
export const getDocumentById = async (id: string): Promise<DocumentResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Upload a new document
 */
export const uploadDocument = async (data: UploadDocumentRequest): Promise<DocumentResponse> => {
  const formData = new FormData()
  formData.append('file', data.file)
  formData.append('title', data.title)

  if (data.description) formData.append('description', data.description)
  if (data.category) formData.append('category', data.category)
  if (data.tags && data.tags.length > 0) {
    data.tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag)
    })
  }
  if (data.organization_id) formData.append('organization_id', data.organization_id)
  if (data.visibility) formData.append('visibility', data.visibility)

  const response = await fetch(`${API_CONFIG.BASE_URL}/documents`, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to upload document')
  }

  return response.json()
}

/**
 * Update document metadata
 */
export const updateDocument = async (id: string, data: UpdateDocumentRequest): Promise<DocumentResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update document')
  }

  return response.json()
}

/**
 * Delete a document
 */
export const deleteDocument = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete document')
  }

  return response.json()
}

/**
 * Download a document
 */
export const downloadDocument = async (id: string, fileName: string): Promise<void> => {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${id}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to download document')
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
 * Get list of document categories
 */
export const getDocumentCategories = async (): Promise<{ success: boolean; data: string[] }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/categories`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch document categories: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get list of document tags
 */
export const getDocumentTags = async (): Promise<{ success: boolean; data: string[] }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/documents/tags`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch document tags: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB'
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB'
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB'
  } else {
    return bytes + ' bytes'
  }
}

/**
 * Get file icon based on MIME type
 */
export const getFileIcon = (fileType?: string): string => {
  if (!fileType) return 'file'

  if (fileType.startsWith('image/')) return 'file-image'
  if (fileType.startsWith('video/')) return 'video-camera'
  if (fileType.startsWith('audio/')) return 'sound'
  if (fileType === 'application/pdf') return 'file-pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'file-word'
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'file-excel'
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'file-ppt'
  if (fileType.includes('zip') || fileType.includes('compressed') || fileType.includes('archive')) return 'file-zip'
  if (fileType.startsWith('text/')) return 'file-text'

  return 'file'
}

/**
 * Visibility label mapping
 */
export const getVisibilityLabel = (visibility: DocumentVisibility): string => {
  switch (visibility) {
    case 'PUBLIC':
      return 'Công khai'
    case 'ORGANIZATION':
      return 'Trong tổ chức'
    case 'PRIVATE':
      return 'Riêng tư'
    default:
      return visibility
  }
}

/**
 * Visibility color mapping for UI
 */
export const getVisibilityColor = (visibility: DocumentVisibility): string => {
  switch (visibility) {
    case 'PUBLIC':
      return 'green'
    case 'ORGANIZATION':
      return 'blue'
    case 'PRIVATE':
      return 'orange'
    default:
      return 'default'
  }
}
