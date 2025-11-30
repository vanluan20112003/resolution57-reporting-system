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
    DELETE: (id: string) => `${getApiBaseUrl()}/activities/${id}`
  },

  ORGANIZATIONS: {
    LIST: `${getApiBaseUrl()}/organizations`,
    GET: (id: string) => `${getApiBaseUrl()}/organizations/${id}`,
    CREATE: `${getApiBaseUrl()}/organizations`,
    UPDATE: (id: string) => `${getApiBaseUrl()}/organizations/${id}`,
    DELETE: (id: string) => `${getApiBaseUrl()}/organizations/${id}`
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
