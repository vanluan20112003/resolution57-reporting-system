/**
 * User Roles in NQ57 Portal System
 */
export enum UserRole {
  GUEST = 'GUEST',       // Xem hoạt động, nhận lời mời, phản hồi tham gia
  STAFF = 'STAFF',       // Tạo hoạt động, cập nhật minh chứng, xuất báo cáo
  MANAGER = 'MANAGER',   // Phê duyệt hoạt động, quản lý STAFF
  OPERATOR = 'OPERATOR', // Phân công vị trí, quản lý KPI
  ADMIN = 'ADMIN',       // Quản trị hệ thống, toàn quyền
}

/**
 * Permission Actions
 */
export enum Permission {
  // Activity permissions
  VIEW_ACTIVITIES = 'activities.view',
  CREATE_ACTIVITIES = 'activities.create',
  UPDATE_ACTIVITIES = 'activities.update',
  DELETE_ACTIVITIES = 'activities.delete',
  APPROVE_ACTIVITIES = 'activities.approve',
  LOCK_ACTIVITIES = 'activities.lock',

  // Activity evidence & results
  UPDATE_EVIDENCE = 'activities.update_evidence',
  EXPORT_REPORT = 'activities.export_report',

  // Invitation permissions
  RECEIVE_INVITATIONS = 'invitations.receive',
  RESPOND_INVITATIONS = 'invitations.respond',
  SEND_INVITATIONS = 'invitations.send',

  // User management
  MANAGE_USERS = 'users.manage',
  ASSIGN_ROLES = 'users.assign_roles',

  // KPI management
  MANAGE_KPI = 'kpi.manage',
  VIEW_KPI = 'kpi.view',

  // Reports
  VIEW_REPORTS = 'reports.view',
  CREATE_REPORTS = 'reports.create',
  EXPORT_REPORTS = 'reports.export',

  // System administration
  SYSTEM_ADMIN = 'system.admin',
}

/**
 * Base permissions for each role (without inheritance)
 */
const GUEST_PERMISSIONS: Permission[] = [
  Permission.VIEW_ACTIVITIES,
  Permission.RECEIVE_INVITATIONS,
  Permission.RESPOND_INVITATIONS,
  Permission.VIEW_KPI,
  Permission.VIEW_REPORTS,
]

const STAFF_BASE_PERMISSIONS: Permission[] = [
  Permission.CREATE_ACTIVITIES,
  Permission.UPDATE_ACTIVITIES,
  Permission.DELETE_ACTIVITIES,
  Permission.UPDATE_EVIDENCE,
  Permission.EXPORT_REPORT,
  Permission.SEND_INVITATIONS,
  Permission.CREATE_REPORTS,
  Permission.EXPORT_REPORTS,
]

const MANAGER_BASE_PERMISSIONS: Permission[] = [
  Permission.APPROVE_ACTIVITIES,
  Permission.LOCK_ACTIVITIES,
]

const OPERATOR_BASE_PERMISSIONS: Permission[] = [
  Permission.MANAGE_USERS,
  Permission.ASSIGN_ROLES,
  Permission.MANAGE_KPI,
]

/**
 * Role-based permissions mapping (with inheritance)
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: GUEST_PERMISSIONS,

  [UserRole.STAFF]: [
    ...GUEST_PERMISSIONS,
    ...STAFF_BASE_PERMISSIONS,
  ],

  [UserRole.MANAGER]: [
    ...GUEST_PERMISSIONS,
    ...STAFF_BASE_PERMISSIONS,
    ...MANAGER_BASE_PERMISSIONS,
  ],

  [UserRole.OPERATOR]: [
    ...GUEST_PERMISSIONS,
    ...OPERATOR_BASE_PERMISSIONS,
  ],

  [UserRole.ADMIN]: [
    Permission.VIEW_ACTIVITIES,
    Permission.CREATE_ACTIVITIES,
    Permission.UPDATE_ACTIVITIES,
    Permission.DELETE_ACTIVITIES,
    Permission.APPROVE_ACTIVITIES,
    Permission.LOCK_ACTIVITIES,
    Permission.UPDATE_EVIDENCE,
    Permission.EXPORT_REPORT,
    Permission.RECEIVE_INVITATIONS,
    Permission.RESPOND_INVITATIONS,
    Permission.SEND_INVITATIONS,
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.MANAGE_KPI,
    Permission.VIEW_KPI,
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.SYSTEM_ADMIN,
  ],
}

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: UserRole | string, permission: Permission): boolean => {
  const userRole = role as UserRole
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

/**
 * Check if a role can access user management
 */
export const canManageUsers = (role: UserRole | string): boolean => {
  return role === UserRole.OPERATOR || role === UserRole.ADMIN
}

/**
 * Check if a role can manage activities (create, edit, delete)
 */
export const canManageActivities = (role: UserRole | string): boolean => {
  return [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN].includes(role as UserRole)
}

/**
 * Check if a role can approve activities
 */
export const canApproveActivities = (role: UserRole | string): boolean => {
  return [UserRole.MANAGER, UserRole.ADMIN].includes(role as UserRole)
}

/**
 * Check if a role can manage KPI
 */
export const canManageKPI = (role: UserRole | string): boolean => {
  return [UserRole.OPERATOR, UserRole.ADMIN].includes(role as UserRole)
}

/**
 * Role display names
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.GUEST]: 'Khách',
  [UserRole.STAFF]: 'Chuyên viên',
  [UserRole.MANAGER]: 'Quản lý',
  [UserRole.OPERATOR]: 'Điều hành',
  [UserRole.ADMIN]: 'Quản trị viên',
}

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.GUEST]: 'Xem hoạt động, nhận lời mời tham gia và phản hồi',
  [UserRole.STAFF]: 'Tạo hoạt động, cập nhật minh chứng, xuất báo cáo',
  [UserRole.MANAGER]: 'Phê duyệt hoạt động, quản lý nhân sự',
  [UserRole.OPERATOR]: 'Phân công công việc, quản lý KPI',
  [UserRole.ADMIN]: 'Quản trị hệ thống, toàn quyền',
}
