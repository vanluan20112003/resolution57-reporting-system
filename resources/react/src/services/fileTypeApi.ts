import API_CONFIG from "../config/api"

// ==========================================
// File Type Types
// ==========================================

export interface FileType {
  id: string
  code: string
  name: string
  activity_files_count?: number
  created_at: string
  updated_at: string
}

export interface CreateFileTypeRequest {
  code: string
  name: string
}

export interface UpdateFileTypeRequest {
  code?: string
  name?: string
}

export interface FileTypeListResponse {
  success: boolean
  data: FileType[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number | null
    to: number | null
  }
}

export interface FileTypeResponse {
  success: boolean
  data: FileType
  message?: string
}

export interface DeleteFileTypeResponse {
  success: boolean
  message: string
}

// ==========================================
// Helper Functions
// ==========================================

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }
}

// ==========================================
// File Type API Functions
// ==========================================

/**
 * Get list of file types with optional filtering
 */
export const getFileTypes = async (params?: {
  search?: string
  page?: number
  per_page?: number
}): Promise<FileTypeListResponse> => {
  const queryParams = new URLSearchParams()

  if (params?.search) queryParams.append("search", params.search)
  if (params?.page) queryParams.append("page", params.page.toString())
  if (params?.per_page) queryParams.append("per_page", params.per_page.toString())

  const url = `${API_CONFIG.FILE_TYPES.LIST}?${queryParams.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Không thể tải danh sách loại tập tin")
  }

  return response.json()
}

/**
 * Get a single file type by ID
 */
export const getFileType = async (id: string): Promise<FileTypeResponse> => {
  const response = await fetch(API_CONFIG.FILE_TYPES.GET(id), {
    method: "GET",
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Không thể tải loại tập tin")
  }

  return response.json()
}

/**
 * Create a new file type
 */
export const createFileType = async (
  data: CreateFileTypeRequest
): Promise<FileTypeResponse> => {
  const response = await fetch(API_CONFIG.FILE_TYPES.CREATE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Không thể tạo loại tập tin")
  }

  return response.json()
}

/**
 * Update an existing file type
 */
export const updateFileType = async (
  id: string,
  data: UpdateFileTypeRequest
): Promise<FileTypeResponse> => {
  const response = await fetch(API_CONFIG.FILE_TYPES.UPDATE(id), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Không thể cập nhật loại tập tin")
  }

  return response.json()
}

/**
 * Delete a file type
 */
export const deleteFileType = async (id: string): Promise<DeleteFileTypeResponse> => {
  const response = await fetch(API_CONFIG.FILE_TYPES.DELETE(id), {
    method: "DELETE",
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Không thể xóa loại tập tin")
  }

  return response.json()
}
