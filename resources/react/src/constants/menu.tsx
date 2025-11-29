import {
  HomeOutlined,
  BellOutlined,
  FileTextOutlined,
  ApiOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import { UserRole, canManageUsers, canManageActivities, canApproveActivities, canManageKPI } from './roles'
import type { MenuProps } from 'antd'

export interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  tab: string
  roles: UserRole[] // Roles that can see this menu item
  description?: string
}

/**
 * All available menu items
 */
export const ALL_MENU_ITEMS: MenuItem[] = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    label: 'Trang chủ',
    tab: 'home',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Tổng quan hệ thống',
  },
  {
    key: 'activities',
    icon: <BellOutlined />,
    label: 'Danh sách hoạt động',
    tab: 'activities',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Xem tất cả hoạt động',
  },
  {
    key: 'my-activities',
    icon: <FolderOpenOutlined />,
    label: 'Hoạt động của tôi',
    tab: 'my-activities',
    roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
    description: 'Quản lý hoạt động do bạn tạo',
  },
  {
    key: 'pending-approval',
    icon: <CheckCircleOutlined />,
    label: 'Chờ phê duyệt',
    tab: 'pending-approval',
    roles: [UserRole.MANAGER, UserRole.ADMIN],
    description: 'Danh sách hoạt động chờ phê duyệt',
  },
  {
    key: 'reports',
    icon: <FileDoneOutlined />,
    label: 'Báo cáo',
    tab: 'reports',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Xem và tạo báo cáo',
  },
  {
    key: 'kpi',
    icon: <ApiOutlined />,
    label: 'Chỉ số KPI',
    tab: 'kpi',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Theo dõi các chỉ số KPI',
  },
  {
    key: 'kpi-management',
    icon: <BarChartOutlined />,
    label: 'Quản lý KPI',
    tab: 'kpi-management',
    roles: [UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Xây dựng và quản lý KPI',
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: 'Phân tích & Thống kê',
    tab: 'analytics',
    roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Biểu đồ và phân tích dữ liệu',
  },
  {
    key: 'users',
    icon: <UserOutlined />,
    label: 'Quản lý người dùng',
    tab: 'users',
    roles: [UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Phân công vị trí và quản lý người dùng',
  },
  {
    key: 'organizations',
    icon: <TeamOutlined />,
    label: 'Quản lý đơn vị',
    tab: 'organizations',
    roles: [UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Quản lý các đơn vị trong ĐHQG',
  },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: 'Quản trị hệ thống',
    tab: 'system',
    roles: [UserRole.ADMIN],
    description: 'Cấu hình và quản trị hệ thống',
  },
  {
    key: 'profile',
    icon: <IdcardOutlined />,
    label: 'Thông tin cá nhân',
    tab: 'profile',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Quản lý thông tin cá nhân',
  },
]

/**
 * Get menu items for a specific role
 */
export const getMenuItemsForRole = (role: UserRole | string): MenuProps['items'] => {
  return ALL_MENU_ITEMS
    .filter(item => item.roles.includes(role as UserRole))
    .map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }))
}

/**
 * Get menu item by key
 */
export const getMenuItemByKey = (key: string): MenuItem | undefined => {
  return ALL_MENU_ITEMS.find(item => item.key === key)
}

/**
 * Get menu item by tab
 */
export const getMenuItemByTab = (tab: string): MenuItem | undefined => {
  return ALL_MENU_ITEMS.find(item => item.tab === tab)
}

/**
 * Check if a role can access a menu item
 */
export const canAccessMenuItem = (role: UserRole | string, menuKey: string): boolean => {
  const menuItem = getMenuItemByKey(menuKey)
  if (!menuItem) return false
  return menuItem.roles.includes(role as UserRole)
}

/**
 * Get default menu key for a role
 */
export const getDefaultMenuKey = (role: UserRole | string): string => {
  // Default to 'home' for all roles
  return 'home'
}

/**
 * Tab to Menu Key mapping
 */
export const TAB_TO_KEY: Record<string, string> = ALL_MENU_ITEMS.reduce((acc, item) => {
  acc[item.tab] = item.key
  return acc
}, {} as Record<string, string>)

/**
 * Menu Key to Tab mapping
 */
export const KEY_TO_TAB: Record<string, string> = ALL_MENU_ITEMS.reduce((acc, item) => {
  acc[item.key] = item.tab
  return acc
}, {} as Record<string, string>)
