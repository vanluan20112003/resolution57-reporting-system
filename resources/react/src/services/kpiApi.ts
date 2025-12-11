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

export interface KpiCategory {
  id: string
  code: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  kpis_count?: number
  created_at: string
  updated_at: string
}

export interface Kpi {
  id: string
  source: 'CENTRAL' | 'VNU'
  code?: string
  title: string
  description?: string
  category?: string
  category_id?: string
  kpi_category?: KpiCategory
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
  category_id?: string
  order_number?: number
  is_active?: boolean
}

export interface UpdateKpiRequest {
  source?: 'CENTRAL' | 'VNU'
  code?: string
  title?: string
  description?: string
  category?: string
  category_id?: string
  order_number?: number
  is_active?: boolean
}

export interface CreateKpiCategoryRequest {
  code: string
  name: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface UpdateKpiCategoryRequest {
  code?: string
  name?: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface KpiCategoryListResponse {
  success: boolean
  data: KpiCategory[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    from: number
    to: number
  }
}

export interface KpiCategoryResponse {
  success: boolean
  data: KpiCategory
  message?: string
}

export interface KpiFilters {
  source?: 'CENTRAL' | 'VNU'
  category?: string
  category_id?: string
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
  if (filters?.category_id) params.append('category_id', filters.category_id)
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
 * Get all KPI categories (legacy - returns string array)
 */
export const getKpiCategoriesLegacy = async (): Promise<{ success: boolean; data: string[] }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpis/categories`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI categories: ${response.statusText}`)
  }

  return response.json()
}

// ==================== KPI Category Management API ====================

export interface KpiCategoryFilters {
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

/**
 * Get all KPI categories with pagination
 */
export const getKpiCategories = async (filters?: KpiCategoryFilters): Promise<KpiCategoryListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.search) params.append('search', filters.search)
  if (filters?.per_page) params.append('per_page', String(filters.per_page))
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString()
  const url = `${API_CONFIG.BASE_URL}/kpi-categories${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI categories: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single KPI category by ID
 */
export const getKpiCategoryById = async (id: string): Promise<KpiCategoryResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpi-categories/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI category: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new KPI category
 */
export const createKpiCategory = async (data: CreateKpiCategoryRequest): Promise<KpiCategoryResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpi-categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create KPI category')
  }

  return response.json()
}

/**
 * Update an existing KPI category
 */
export const updateKpiCategory = async (id: string, data: UpdateKpiCategoryRequest): Promise<KpiCategoryResponse> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpi-categories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update KPI category')
  }

  return response.json()
}

/**
 * Delete a KPI category
 */
export const deleteKpiCategory = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/kpi-categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to delete KPI category')
  }

  return response.json()
}
