/**
 * Share Link API Service
 * Manage activity file sharing links
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

export interface ShareLink {
  id: string
  activity_id: string
  share_token: string
  created_by: string
  expires_at?: string
  is_active: boolean
  access_count: number
  last_accessed_at?: string
  description?: string
  created_at: string
  updated_at: string
  share_url: string
  is_expired: boolean
  creator?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface CreateShareLinkData {
  description?: string
  expires_at?: string
}

export interface UpdateShareLinkData {
  description?: string
  expires_at?: string
  is_active?: boolean
}

export interface SharedFileType {
  id: string | null
  code: string
  name: string
}

export interface SharedFile {
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
  file_type?: SharedFileType
  uploader?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface GroupedFiles {
  file_type: SharedFileType
  files: SharedFile[]
  count: number
}

export interface SharedFilesData {
  share_link: {
    id: string
    description?: string
    expires_at?: string
    created_at: string
  }
  activity: {
    id: string
    name: string
    description?: string
    start_date?: string
    end_date?: string
    organization?: {
      id: string
      name: string
      short_name?: string
    }
    activity_type?: {
      id: string
      name: string
      code: string
    }
    total_files: number
  }
  grouped_files: GroupedFiles[]
  file_types: SharedFileType[]
}

// ============== API Functions ==============

/**
 * Get all share links for an activity
 */
export const getActivityShareLinks = async (activityId: string): Promise<ShareLink[]> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/share-links`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy danh sách link chia sẻ')
  }

  return data.data
}

/**
 * Create a new share link for an activity
 */
export const createShareLink = async (
  activityId: string,
  shareData: CreateShareLinkData
): Promise<ShareLink> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/share-links`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(shareData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tạo link chia sẻ')
  }

  return data.data
}

/**
 * Update a share link
 */
export const updateShareLink = async (
  activityId: string,
  linkId: string,
  updateData: UpdateShareLinkData
): Promise<ShareLink> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/share-links/${linkId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Không thể cập nhật link chia sẻ')
  }

  return data.data
}

/**
 * Delete a share link
 */
export const deleteShareLink = async (activityId: string, linkId: string): Promise<void> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activities/${activityId}/share-links/${linkId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Không thể xóa link chia sẻ')
  }
}

/**
 * Access shared files using a share token
 */
export const accessSharedFiles = async (token: string): Promise<SharedFilesData> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/shared/files/${token}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Không thể truy cập tài liệu chia sẻ')
  }

  return data.data
}
