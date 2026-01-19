import api from './api'

// Types
export interface MaintenanceSettings {
  id: number
  is_enabled: boolean
  secret_key: string
  title: string
  message: string | null
  notification_type: 'info' | 'warning' | 'error'
  estimated_end_time: string | null
  show_countdown: boolean
  allow_admin_access: boolean
  allowed_ips: string[]
  enabled_by: string | null
  enabled_at: string | null
  disabled_by: string | null
  disabled_at: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceStatus {
  is_maintenance: boolean
  has_bypass: boolean
  is_enabled: boolean
  title: string
  message: string | null
  notification_type: 'info' | 'warning' | 'error'
  estimated_end_time: string | null
  show_countdown: boolean
}

export interface MaintenanceLog {
  id: number
  action: string
  action_label: string
  user_id: string | null
  user_name: string | null
  old_settings: Record<string, unknown> | null
  new_settings: Record<string, unknown> | null
  ip_address: string | null
  note: string | null
  changes: Array<{
    field: string
    old: string
    new: string
  }>
  created_at: string
}

export interface MaintenanceSettingsResponse {
  success: boolean
  data: {
    settings: MaintenanceSettings
    bypass_url: string
    enabled_by: { id: string; name: string } | null
    disabled_by: { id: string; name: string } | null
  }
}

export interface EnableMaintenanceResponse {
  success: boolean
  message: string
  data: {
    settings: MaintenanceSettings
    bypass_url: string
    secret_key: string
  }
}

export interface MaintenanceLogsResponse {
  success: boolean
  data: MaintenanceLog[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// API Functions
// Note: api.js interceptor already unwraps response.data, so we receive the raw JSON body directly

/**
 * Check maintenance status (public - always accessible)
 */
export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const response: any = await api.get('/maintenance/status')
  return response.data
}

/**
 * Get full maintenance settings (admin only)
 */
export const getMaintenanceSettings = async (): Promise<MaintenanceSettingsResponse['data']> => {
  const response: any = await api.get('/maintenance/settings')
  return response.data
}

/**
 * Update maintenance settings
 */
export const updateMaintenanceSettings = async (
  data: Partial<Pick<MaintenanceSettings,
    'title' | 'message' | 'notification_type' | 'estimated_end_time' |
    'show_countdown' | 'allow_admin_access' | 'allowed_ips'
  >>
): Promise<MaintenanceSettings> => {
  const response: any = await api.put('/maintenance/settings', data)
  return response.data
}

/**
 * Enable maintenance mode
 */
export const enableMaintenance = async (
  options?: {
    title?: string
    message?: string
    notification_type?: 'info' | 'warning' | 'error'
    estimated_end_time?: string
    show_countdown?: boolean
  }
): Promise<EnableMaintenanceResponse['data']> => {
  const response: any = await api.post('/maintenance/enable', options || {})
  return response.data
}

/**
 * Disable maintenance mode
 */
export const disableMaintenance = async (): Promise<MaintenanceSettings> => {
  const response: any = await api.post('/maintenance/disable')
  return response.data
}

/**
 * Toggle maintenance mode
 */
export const toggleMaintenance = async (
  options?: {
    title?: string
    message?: string
    notification_type?: 'info' | 'warning' | 'error'
    estimated_end_time?: string
    show_countdown?: boolean
  }
): Promise<MaintenanceSettings | EnableMaintenanceResponse['data']> => {
  const response: any = await api.post('/maintenance/toggle', options || {})
  return response.data
}

/**
 * Regenerate secret key
 */
export const regenerateSecretKey = async (): Promise<{ secret_key: string; bypass_url: string }> => {
  const response: any = await api.post('/maintenance/regenerate-key')
  return response.data
}

/**
 * Get maintenance logs
 */
export const getMaintenanceLogs = async (
  page: number = 1,
  perPage: number = 20
): Promise<MaintenanceLogsResponse> => {
  const response: any = await api.get('/maintenance/logs', {
    params: { page, per_page: perPage }
  })
  // This API returns { success, data: [...], meta: {...} }
  return response
}

/**
 * Bypass maintenance with secret key
 */
export const bypassMaintenance = async (secretKey: string): Promise<{ valid_until: string }> => {
  const response: any = await api.post(`/maintenance/bypass/${secretKey}`)
  return response.data
}

/**
 * Check bypass status
 */
export const checkBypassStatus = async (): Promise<{
  has_bypass: boolean
  is_admin: boolean
  maintenance_enabled: boolean
}> => {
  const response: any = await api.get('/maintenance/check-bypass')
  return response.data
}
