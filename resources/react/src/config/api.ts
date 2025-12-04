/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // Check if running in production
  if (import.meta.env.PROD) {
    // In production, use relative path (same domain as frontend)
    return "/api/v1"
  }

  // In development, use localhost
  return import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
}

// Determine frontend base URL
const getFrontendBaseUrl = (): string => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_FRONTEND_URL || window.location.origin
  }

  return import.meta.env.VITE_FRONTEND_URL || "http://localhost:5000"
}

export const API_CONFIG = {
  // Base URLs
  BASE_URL: getApiBaseUrl(),
  FRONTEND_URL: getFrontendBaseUrl(),

  // Authentication Endpoints
  AUTH: {
    LOGIN: `${getApiBaseUrl()}/auth/login`,
    LOGOUT: `${getApiBaseUrl()}/auth/logout`,
    ME: `${getApiBaseUrl()}/auth/me`,
    GOOGLE_REDIRECT: `${getApiBaseUrl()}/auth/google/redirect`,
    GOOGLE_CALLBACK: `${getApiBaseUrl()}/auth/google/callback`,
    GOOGLE_EXCHANGE_CODE: `${getApiBaseUrl()}/auth/google/exchange-code`,
    FORGOT_PASSWORD: `${getApiBaseUrl()}/auth/forgot-password`,
    RESET_PASSWORD: `${getApiBaseUrl()}/auth/reset-password`,
    CHANGE_PASSWORD: `${getApiBaseUrl()}/auth/change-password`
  },

  // Other endpoints can be added here
  ACTIVITIES: {
    LIST: `${getApiBaseUrl()}/activities`,
    CREATE: `${getApiBaseUrl()}/activities`,
    UPDATE: (id: string) => `${getApiBaseUrl()}/activities/${id}`,
    DELETE: (id: string) => `${getApiBaseUrl()}/activities/${id}`,
    // Activity Files
    FILES: (id: string) => `${getApiBaseUrl()}/activities/${id}/files`,
    UPLOAD_FILE: (id: string) => `${getApiBaseUrl()}/activities/${id}/files/upload`,
    ADD_LINK: (id: string) => `${getApiBaseUrl()}/activities/${id}/files/link`,
    BATCH_ADD_FILES: (id: string) => `${getApiBaseUrl()}/activities/${id}/files/batch`,
    UPDATE_FILE: (activityId: string, fileId: string) => `${getApiBaseUrl()}/activities/${activityId}/files/${fileId}`,
    DELETE_FILE: (activityId: string, fileId: string) => `${getApiBaseUrl()}/activities/${activityId}/files/${fileId}`,
    // Activity Participants
    PARTICIPANTS: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants`,
    UPLOAD_ATTENDANCE: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/upload`,
    DELETE_ATTENDANCE: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants`,
    SEND_INVITATIONS: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/send-invitations`,
    RESEND_INVITATION: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/resend-invitation`,
    RESPOND_INVITATION: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/respond`,
    ATTENDANCE_TEMPLATE: `${getApiBaseUrl()}/activities/participants/template`,
    ATTENDANCE_TEMPLATE_INFO: `${getApiBaseUrl()}/activities/participants/template-info`,
    EXPORT_PARTICIPANTS: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/export`,
    // Add participants from organization groups
    ORGANIZATION_GROUPS: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/organization-groups`,
    ADD_FROM_GROUP: (id: string) => `${getApiBaseUrl()}/activities/${id}/participants/add-from-group`
  },

  ORGANIZATIONS: {
    LIST: `${getApiBaseUrl()}/organizations`,
    GET: (id: string) => `${getApiBaseUrl()}/organizations/${id}`,
    CREATE: `${getApiBaseUrl()}/organizations`,
    UPDATE: (id: string) => `${getApiBaseUrl()}/organizations/${id}`,
    DELETE: (id: string) => `${getApiBaseUrl()}/organizations/${id}`
  },

  NOTIFICATIONS: {
    LIST: `${getApiBaseUrl()}/notifications`,
    READ: (id: string) => `${getApiBaseUrl()}/notifications/${id}/read`,
    READ_ALL: `${getApiBaseUrl()}/notifications/readAll`
  },

  // My Organization (for STAFF/MANAGER to manage their own org)
  MY_ORGANIZATION: {
    GET: `${getApiBaseUrl()}/my-organization`,
    UPDATE: `${getApiBaseUrl()}/my-organization`,
    UPLOAD_AVATAR: `${getApiBaseUrl()}/my-organization/avatar`,
    DELETE_AVATAR: `${getApiBaseUrl()}/my-organization/avatar`,
    UPLOAD_COVER: `${getApiBaseUrl()}/my-organization/cover`,
    MEMBERS: `${getApiBaseUrl()}/my-organization/members`,
    UPDATE_MEMBER_ROLE: (memberId: string) => `${getApiBaseUrl()}/my-organization/members/${memberId}/role`,
    ADD_MEMBER: `${getApiBaseUrl()}/my-organization/members`,
    REMOVE_MEMBER: (memberId: string) => `${getApiBaseUrl()}/my-organization/members/${memberId}`,
    IMPORT_MEMBERS_TEMPLATE_INFO: `${getApiBaseUrl()}/my-organization/members/import/template-info`,
    IMPORT_MEMBERS_TEMPLATE: `${getApiBaseUrl()}/my-organization/members/import/template`,
    IMPORT_MEMBERS: `${getApiBaseUrl()}/my-organization/members/import`
  },

  // Import Excel
  IMPORT: {
    TEMPLATE_INFO: `${getApiBaseUrl()}/import/template-info`,
    TEMPLATE: `${getApiBaseUrl()}/import/template`,
    IMPORT: `${getApiBaseUrl()}/import`
  },

  // File Types Management
  FILE_TYPES: {
    LIST: `${getApiBaseUrl()}/file-types`,
    GET: (id: string) => `${getApiBaseUrl()}/file-types/${id}`,
    CREATE: `${getApiBaseUrl()}/file-types`,
    UPDATE: (id: string) => `${getApiBaseUrl()}/file-types/${id}`,
    DELETE: (id: string) => `${getApiBaseUrl()}/file-types/${id}`
  },

  STATUS: `${getApiBaseUrl()}/status`,
  HEALTH: `${getApiBaseUrl()}/health`
}

// Helper function to get full URL
export const getFullUrl = (path: string): string => {
  if (path.startsWith("http")) {
    return path
  }

  return `${API_CONFIG.BASE_URL}${path}`
}

// Helper function to build URL with query parameters
export const buildUrl = (
  baseUrl: string,
  params?: Record<string, any>
): string => {
  if (!params) return baseUrl

  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = String(value)
      }
      return acc
    }, {} as Record<string, string>)
  ).toString()

  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

export default API_CONFIG
