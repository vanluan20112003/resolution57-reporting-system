/**
 * Activity Types & Fields Management API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// ============== Activity Type Interfaces ==============

export interface ActivityType {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  activities_count?: number
  created_at: string
  updated_at: string
}

export interface ActivityTypeListResponse {
  success: boolean
  data: ActivityType[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface ActivityTypeResponse {
  success: boolean
  data: ActivityType
  message?: string
}

export interface CreateActivityTypeRequest {
  name: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface UpdateActivityTypeRequest {
  name?: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface ActivityTypeFilters {
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

// ============== Activity Field Interfaces ==============

export interface ActivityField {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  activities_count?: number
  created_at: string
  updated_at: string
}

export interface ActivityFieldListResponse {
  success: boolean
  data: ActivityField[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface ActivityFieldResponse {
  success: boolean
  data: ActivityField
  message?: string
}

export interface CreateActivityFieldRequest {
  name: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface UpdateActivityFieldRequest {
  name?: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface ActivityFieldFilters {
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

// ============== Activity Type API Functions ==============

/**
 * Get all Activity Types (read-only, for all authenticated users)
 * Used for filters and dropdowns
 */
export const getActivityTypesList = async (filters?: ActivityTypeFilters): Promise<ActivityTypeListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-types/list${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Types: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all Activity Types with filtering (OPERATOR/ADMIN only)
 */
export const getActivityTypes = async (filters?: ActivityTypeFilters): Promise<ActivityTypeListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-types${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Types: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single Activity Type by ID
 */
export const getActivityTypeById = async (id: string): Promise<ActivityTypeResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-types/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Type: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new Activity Type
 */
export const createActivityType = async (data: CreateActivityTypeRequest): Promise<ActivityTypeResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-types`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create Activity Type')
  }

  return response.json()
}

/**
 * Update an existing Activity Type
 */
export const updateActivityType = async (id: string, data: UpdateActivityTypeRequest): Promise<ActivityTypeResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-types/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update Activity Type')
  }

  return response.json()
}

/**
 * Delete an Activity Type
 */
export const deleteActivityType = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-types/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete Activity Type')
  }

  return response.json()
}

// ============== Activity Field API Functions ==============

/**
 * Get all Activity Fields (read-only, for all authenticated users)
 * Used for filters and dropdowns
 */
export const getActivityFieldsList = async (filters?: ActivityFieldFilters): Promise<ActivityFieldListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-fields/list${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Fields: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all Activity Fields with filtering (OPERATOR/ADMIN only)
 */
export const getActivityFields = async (filters?: ActivityFieldFilters): Promise<ActivityFieldListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/activity-fields${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Fields: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single Activity Field by ID
 */
export const getActivityFieldById = async (id: string): Promise<ActivityFieldResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-fields/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Activity Field: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new Activity Field
 */
export const createActivityField = async (data: CreateActivityFieldRequest): Promise<ActivityFieldResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-fields`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create Activity Field')
  }

  return response.json()
}

/**
 * Update an existing Activity Field
 */
export const updateActivityField = async (id: string, data: UpdateActivityFieldRequest): Promise<ActivityFieldResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-fields/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update Activity Field')
  }

  return response.json()
}

/**
 * Delete an Activity Field
 */
export const deleteActivityField = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/activity-fields/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete Activity Field')
  }

  return response.json()
}
