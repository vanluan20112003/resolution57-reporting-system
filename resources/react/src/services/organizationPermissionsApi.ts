/**
 * Organization Access Permissions API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export interface ViewScope {
  id: string
  name: string
  display_name: string
  description: string
  scope_type: string
  requires_specific_orgs: boolean
  is_system: boolean
  status: string
}

export interface Organization {
  id: string
  name: string
  short_name?: string
  type: string
  code: string
}

export interface Permission {
  id: string
  organization_id: string
  view_scope_id: string
  target_organization_id?: string
  target_organization_ids?: string[]
  allowed_roles: string[]
  can_view_details: boolean
  can_view_files: boolean
  can_export: boolean
  can_view_participants: boolean
  can_view_budget: boolean
  valid_from?: string
  valid_until?: string
  status: string
  reason?: string
  notes?: string
  created_at: string
  updated_at: string
  organization: Organization
  viewScope: ViewScope
  targetOrganization?: Organization
  targetOrganizations?: Organization[]
}

export interface PermissionListResponse {
  success: boolean
  data: Permission[]
}

export interface ViewScopeListResponse {
  success: boolean
  data: ViewScope[]
}

export interface AccessibleOrganizationsResponse {
  success: boolean
  data: {
    own_organization_id: string
    accessible_organization_ids: string[]
    can_view_all: boolean
    permissions_count: number
  }
}

export interface CreatePermissionRequest {
  organization_id: string
  view_scope_id: string
  target_organization_id?: string
  target_organization_ids?: string[]
  allowed_roles?: string[]
  can_view_details?: boolean
  can_view_files?: boolean
  can_export?: boolean
  can_view_participants?: boolean
  can_view_budget?: boolean
  valid_from?: string
  valid_until?: string
  reason?: string
  notes?: string
}

export interface UpdatePermissionRequest extends Partial<CreatePermissionRequest> {
  status?: string
}

/**
 * Get all permissions (Admin/Operator only)
 */
export const getAllPermissions = async (filters?: {
  organization_id?: string
  view_scope_id?: string
  status?: string
}): Promise<PermissionListResponse> => {
  const url = new URL(`${API_CONFIG.BASE_URL}/organization-permissions`)
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch permissions')
  }

  return response.json()
}

/**
 * Get view scopes
 */
export const getViewScopes = async (): Promise<ViewScopeListResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/organization-permissions/scopes`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch view scopes')
  }

  return response.json()
}

/**
 * Get accessible organizations for current user
 */
export const getAccessibleOrganizations = async (): Promise<AccessibleOrganizationsResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/organization-permissions/accessible-organizations`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch accessible organizations')
  }

  return response.json()
}

/**
 * Create new permission
 */
export const createPermission = async (data: CreatePermissionRequest): Promise<{ success: boolean; data: Permission; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/organization-permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create permission')
  }

  return response.json()
}

/**
 * Update permission
 */
export const updatePermission = async (id: string, data: UpdatePermissionRequest): Promise<{ success: boolean; data: Permission; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/organization-permissions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update permission')
  }

  return response.json()
}

/**
 * Delete permission
 */
export const deletePermission = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/organization-permissions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to delete permission')
  }

  return response.json()
}
