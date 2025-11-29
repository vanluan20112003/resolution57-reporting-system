/**
 * KPI Management API Service
 */

import API_CONFIG from '../config/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export interface Kpi {
  id: string
  source: 'CENTRAL' | 'VNU'
  code?: string
  title: string
  description?: string
  category?: string
  order_number?: number
  is_active: boolean
  created_by?: string
  creator?: {
    id: string
    email: string
    full_name: string
  }
  created_at: string
  updated_at: string
}

export interface KpiListResponse {
  success: boolean
  data: Kpi[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface KpiResponse {
  success: boolean
  data: Kpi
  message?: string
}

export interface CreateKpiRequest {
  source: 'CENTRAL' | 'VNU'
  code?: string
  title: string
  description?: string
  category?: string
  order_number?: number
  is_active?: boolean
}

export interface UpdateKpiRequest {
  source?: 'CENTRAL' | 'VNU'
  code?: string
  title?: string
  description?: string
  category?: string
  order_number?: number
  is_active?: boolean
}

export interface KpiFilters {
  source?: 'CENTRAL' | 'VNU'
  category?: string
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

/**
 * Get all KPIs with filtering
 */
export const getKpis = async (filters?: KpiFilters): Promise<KpiListResponse> => {
  const params = new URLSearchParams()

  if (filters?.source) params.append('source', filters.source)
  if (filters?.category) params.append('category', filters.category)
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/kpis${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPIs: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single KPI by ID
 */
export const getKpiById = async (id: string): Promise<KpiResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new KPI
 */
export const createKpi = async (data: CreateKpiRequest): Promise<KpiResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create KPI')
  }

  return response.json()
}

/**
 * Update an existing KPI
 */
export const updateKpi = async (id: string, data: UpdateKpiRequest): Promise<KpiResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update KPI')
  }

  return response.json()
}

/**
 * Delete a KPI
 */
export const deleteKpi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete KPI')
  }

  return response.json()
}

/**
 * Get all KPI categories
 */
export const getKpiCategories = async (): Promise<{ success: boolean; data: string[] }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis/categories`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI categories: ${response.statusText}`)
  }

  return response.json()
}
