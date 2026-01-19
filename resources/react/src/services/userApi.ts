/**
 * User Management API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'GUEST' | 'STAFF' | 'MANAGER' | 'OPERATOR' | 'ADMIN'
  status: 'active' | 'inactive' | 'locked'
  is_vnuhcm: boolean
  organization_id?: string
  organization?: {
    id: string
    name: string
    short_name?: string
  }
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  success: boolean
  data: User[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface UserResponse {
  success: boolean
  data: User
  message?: string
}

export interface CreateUserRequest {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  status: string
  is_vnuhcm?: boolean
  organization_id?: string
  password?: string
}

export interface UpdateUserRequest {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: string
  status?: string
  is_vnuhcm?: boolean
  organization_id?: string
  password?: string
}

/**
 * Get list of users with optional filters
 */
export const getUsers = async (params?: {
  search?: string
  role?: string
  status?: string
  organization_id?: string
  per_page?: number
  page?: number
}): Promise<UserListResponse> => {
  const queryParams = new URLSearchParams()

  if (params?.search) queryParams.append('search', params.search)
  if (params?.role) queryParams.append('role', params.role)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.organization_id) queryParams.append('organization_id', params.organization_id)
  if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const url = `${API_CONFIG.BASE_URL}/users?${queryParams.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch users')
  }

  return response.json()
}

/**
 * Get a single user by ID
 */
export const getUser = async (id: string): Promise<UserResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch user')
  }

  return response.json()
}

/**
 * Create a new user
 */
export const createUser = async (data: CreateUserRequest): Promise<UserResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()

    // Handle validation errors (422 status)
    if (error.errors && typeof error.errors === 'object') {
      // Convert errors object to array of messages
      const errorMessages = Object.entries(error.errors)
        .map(([field, messages]) => {
          const msgs = Array.isArray(messages) ? messages : [messages]
          return msgs.join(', ')
        })
        .join('; ')
      throw new Error(errorMessages)
    }

    throw new Error(error.message || 'Failed to create user')
  }

  return response.json()
}

/**
 * Update an existing user
 */
export const updateUser = async (id: string, data: UpdateUserRequest): Promise<UserResponse> => {
  // Ensure organization_id is explicitly sent as null when clearing
  // This is important because backend needs to know the intent to clear vs not changing
  const payload = {
    ...data,
    // Explicitly set organization_id to null if it's undefined or empty string
    organization_id: data.organization_id === undefined || data.organization_id === ''
      ? null
      : data.organization_id,
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()

    // Handle validation errors (422 status)
    if (error.errors && typeof error.errors === 'object') {
      // Convert errors object to array of messages
      const errorMessages = Object.entries(error.errors)
        .map(([field, messages]) => {
          const msgs = Array.isArray(messages) ? messages : [messages]
          return msgs.join(', ')
        })
        .join('; ')
      throw new Error(errorMessages)
    }

    throw new Error(error.message || 'Failed to update user')
  }

  return response.json()
}

/**
 * Delete a user
 */
export const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to delete user')
  }

  return response.json()
}

export interface ImpersonateResponse {
  success: boolean
  message: string
  data: {
    access_token: string
    token_type: string
    user: User
    original_admin: {
      id: string
      email: string
    }
  }
}

/**
 * Impersonate a user (Admin only)
 */
export const impersonateUser = async (id: string): Promise<ImpersonateResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/${id}/impersonate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to impersonate user')
  }

  return response.json()
}

export interface StopImpersonateResponse {
  success: boolean
  message: string
  data: {
    access_token: string
    token_type: string
    user: User
  }
}

/**
 * Stop impersonation and return to admin account
 */
export const stopImpersonate = async (adminId: string): Promise<StopImpersonateResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/users/stop-impersonate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ admin_id: adminId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to stop impersonation')
  }

  return response.json()
}
