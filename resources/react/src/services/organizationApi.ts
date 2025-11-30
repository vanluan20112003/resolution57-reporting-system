import API_CONFIG from "../config/api"

export enum OrganizationType {
  UNIVERSITY_SYSTEM = "UNIVERSITY_SYSTEM",
  UNIVERSITY = "UNIVERSITY",
  RESEARCH_INSTITUTE = "RESEARCH_INSTITUTE",
  CENTER = "CENTER",
  DEPARTMENT = "DEPARTMENT",
  EXTERNAL = "EXTERNAL"
}

export enum OrganizationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive"
}

export interface Organization {
  id: string
  code: string
  name: string
  short_name: string | null
  type: OrganizationType
  parent_id: string | null
  is_vnuhcm: boolean
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  website: string | null
  description: string | null
  status: OrganizationStatus
  display_order: number
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateOrganizationRequest {
  code: string
  name: string
  short_name?: string
  type: OrganizationType
  parent_id?: string
  is_vnuhcm: boolean
  contact_email?: string
  contact_phone?: string
  address?: string
  website?: string
  status: OrganizationStatus
  display_order?: number
  description?: string
}

export interface UpdateOrganizationRequest extends CreateOrganizationRequest {}

export interface DeleteOrganizationResponse {
  success: boolean
  message: string
}

export interface OrganizationListResponse {
  success: boolean
  data: Organization[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface OrganizationResponse {
  success: boolean
  data: Organization
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }
}

export const getOrganizationList = async (filters: {
  status?: OrganizationStatus
  is_vnuhcm?: boolean
  type?: OrganizationType
  search?: string
  per_page: number
  page: number
}): Promise<OrganizationListResponse> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  const response = await fetch(
    `${API_CONFIG.ORGANIZATIONS.LIST}?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders()
    }
  )
  if (!response.ok) {
    throw new Error("Failed to fetch organization list")
  }
  const data = await response.json()
  return data
}

export const createOrganization = async (
  organization: CreateOrganizationRequest
): Promise<OrganizationResponse> => {
  const response = await fetch(API_CONFIG.ORGANIZATIONS.CREATE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(organization)
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to create organization")
  }
  const data = await response.json()
  return data
}

export const updateOrganization = async (
  id: string,
  organization: UpdateOrganizationRequest
): Promise<OrganizationResponse> => {
  const response = await fetch(API_CONFIG.ORGANIZATIONS.UPDATE(id), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(organization)
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to update organization")
  }
  const data = await response.json()
  return data
}

export const deleteOrganization = async (
  id: string
): Promise<DeleteOrganizationResponse> => {
  const response = await fetch(API_CONFIG.ORGANIZATIONS.DELETE(id), {
    method: "DELETE",
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to delete organization")
  }
  return response.json()
}
