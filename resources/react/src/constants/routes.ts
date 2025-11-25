/**
 * Application Route Constants
 * Centralized route paths for easy management
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Protected routes
  DASHBOARD: '/dashboard',

  // Resolution routes
  RESOLUTIONS: '/resolutions',
  RESOLUTION_DETAIL: '/resolutions/:id',
  RESOLUTION_CREATE: '/resolutions/create',
  RESOLUTION_EDIT: '/resolutions/:id/edit',

  // Report routes
  REPORTS: '/reports',
  REPORTS_OVERVIEW: '/reports/overview',
  REPORTS_ANALYTICS: '/reports/analytics',

  // KPI routes
  KPI: '/kpi',
  KPI_DASHBOARD: '/kpi/dashboard',
  KPI_SETTINGS: '/kpi/settings',

  // Analysis routes
  ANALYSIS: '/analysis',
  ANALYSIS_TRENDS: '/analysis/trends',
  ANALYSIS_STATISTICS: '/analysis/statistics',

  // User routes
  PROFILE: '/profile',
  SETTINGS: '/settings',
  USERS: '/users',
  USER_DETAIL: '/users/:id',

  // Other routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/401',
  SERVER_ERROR: '/500',
} as const

/**
 * Generate dynamic route path with parameters
 * @example
 * generatePath(ROUTES.RESOLUTION_DETAIL, { id: '123' })
 * // Returns: '/resolutions/123'
 */
export const generatePath = (path: string, params: Record<string, string | number>): string => {
  let generatedPath = path

  Object.entries(params).forEach(([key, value]) => {
    generatedPath = generatedPath.replace(`:${key}`, String(value))
  })

  return generatedPath
}

// Export type for route keys
export type RouteKey = keyof typeof ROUTES
export type RoutePath = typeof ROUTES[RouteKey]
