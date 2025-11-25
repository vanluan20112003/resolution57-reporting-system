/**
 * API Constants
 * API endpoints, methods, status codes
 */

// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    SSO_LOGIN: '/auth/sso/login',
    SSO_CALLBACK: '/auth/sso/callback',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // User endpoints
  USERS: {
    LIST: '/users',
    DETAIL: '/users/:id',
    CREATE: '/users',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },

  // Resolution endpoints
  RESOLUTIONS: {
    LIST: '/resolutions',
    DETAIL: '/resolutions/:id',
    CREATE: '/resolutions',
    UPDATE: '/resolutions/:id',
    DELETE: '/resolutions/:id',
    SEARCH: '/resolutions/search',
    EXPORT: '/resolutions/export',
    IMPORT: '/resolutions/import',
    STATS: '/resolutions/stats',
  },

  // Report endpoints
  REPORTS: {
    LIST: '/reports',
    DETAIL: '/reports/:id',
    GENERATE: '/reports/generate',
    EXPORT: '/reports/:id/export',
    DOWNLOAD: '/reports/:id/download',
  },

  // KPI endpoints
  KPI: {
    LIST: '/kpi',
    DETAIL: '/kpi/:id',
    CREATE: '/kpi',
    UPDATE: '/kpi/:id',
    DELETE: '/kpi/:id',
    DASHBOARD: '/kpi/dashboard',
  },

  // Analysis endpoints
  ANALYSIS: {
    TRENDS: '/analysis/trends',
    STATISTICS: '/analysis/statistics',
    CHARTS: '/analysis/charts',
  },

  // System endpoints
  SYSTEM: {
    STATUS: '/status',
    HEALTH: '/health',
    CONFIG: '/config',
  },
} as const

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirect
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// Request Headers
export const REQUEST_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  X_CSRF_TOKEN: 'X-CSRF-Token',
  X_REQUEST_ID: 'X-Request-ID',
} as const

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  PDF: 'application/pdf',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV: 'text/csv',
} as const

// API Request Timeout (ms)
export const API_TIMEOUT = {
  DEFAULT: 30000,  // 30 seconds
  UPLOAD: 60000,   // 60 seconds
  DOWNLOAD: 120000, // 120 seconds
  LONG: 300000,    // 5 minutes
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const

// API Response Keys
export const API_RESPONSE_KEYS = {
  DATA: 'data',
  MESSAGE: 'message',
  STATUS: 'status',
  ERROR: 'error',
  ERRORS: 'errors',
  META: 'meta',
  PAGINATION: 'pagination',
  TOTAL: 'total',
  PAGE: 'page',
  PAGE_SIZE: 'page_size',
  TOTAL_PAGES: 'total_pages',
} as const

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRES_AT: 'token_expires_at',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  REMEMBER_ME: 'remember_me',
} as const

// Query Keys (for React Query)
export const QUERY_KEYS = {
  AUTH: 'auth',
  USER: 'user',
  USERS: 'users',
  RESOLUTIONS: 'resolutions',
  RESOLUTION: 'resolution',
  REPORTS: 'reports',
  REPORT: 'report',
  KPI: 'kpi',
  ANALYSIS: 'analysis',
  SYSTEM: 'system',
} as const

// Cache Time (ms)
export const CACHE_TIME = {
  DEFAULT: 5 * 60 * 1000,     // 5 minutes
  SHORT: 1 * 60 * 1000,       // 1 minute
  LONG: 30 * 60 * 1000,       // 30 minutes
  INFINITE: Infinity,          // Never expire
} as const

// Export types
export type ApiEndpoint = typeof API_ENDPOINTS
export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES]
