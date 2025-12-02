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
  ApartmentOutlined,
  AppstoreOutlined,
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
  children?: MenuItem[] // For submenu items
  requiresOrganization?: boolean // If true, only show if user has organization_id
}

/**
 * All available menu items with submenu structure
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
    key: 'activities-menu',
    icon: <ApartmentOutlined />,
    label: 'Hoạt động đơn vị', // Will be replaced with organization name dynamically
    tab: 'activities',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Quản lý hoạt động của đơn vị',
    requiresOrganization: true, // Entire menu requires organization
    children: [
      {
        key: 'activities',
        icon: <BellOutlined />,
        label: 'Tất cả hoạt động',
        tab: 'activities',
        roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        description: 'Xem tất cả hoạt động của đơn vị',
        requiresOrganization: true,
      },
      {
        key: 'my-activities',
        icon: <FolderOpenOutlined />,
        label: 'Hoạt động của tôi',
        tab: 'my-activities',
        roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN],
        description: 'Quản lý hoạt động do bạn tạo',
        requiresOrganization: true,
      },
      {
        key: 'pending-approval',
        icon: <CheckCircleOutlined />,
        label: 'Chờ phê duyệt',
        tab: 'pending-approval',
        roles: [UserRole.MANAGER, UserRole.ADMIN],
        description: 'Danh sách hoạt động chờ phê duyệt',
        requiresOrganization: true,
      },
    ],
  },
  {
    key: 'reports-menu',
    icon: <BarChartOutlined />,
    label: 'Báo cáo động',
    tab: 'reports',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Báo cáo và phân tích',
    children: [
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
    ],
  },
  {
    key: 'management-menu',
    icon: <SettingOutlined />,
    label: 'Quản lý',
    tab: 'management',
    roles: [UserRole.OPERATOR, UserRole.ADMIN],
    description: 'Quản lý hệ thống',
    children: [
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
        key: 'activity-config',
        icon: <AppstoreOutlined />,
        label: 'Cấu hình hoạt động',
        tab: 'activity-config',
        roles: [UserRole.OPERATOR, UserRole.ADMIN],
        description: 'Quản lý loại hoạt động và lĩnh vực hoạt động',
      },
      {
        key: 'system',
        icon: <SettingOutlined />,
        label: 'Quản trị hệ thống',
        tab: 'system',
        roles: [UserRole.ADMIN],
        description: 'Cấu hình và quản trị hệ thống',
      },
    ],
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
 * Get menu items for a specific role with submenu support
 * @param role - User's role
 * @param organizationId - User's organization ID (optional)
 * @param organizationName - User's organization name (optional) - used to customize menu labels
 */
export const getMenuItemsForRole = (
  role: UserRole | string,
  organizationId?: string | null,
  organizationName?: string | null
): MenuProps['items'] => {
  const filterByRoleAndOrg = (items: MenuItem[]): MenuProps['items'] => {
    return items
      .filter(item => {
        // Check role permission
        if (!item.roles.includes(role as UserRole)) {
          return false
        }
        // Check organization requirement
        if (item.requiresOrganization && !organizationId) {
          return false
        }
        return true
      })
      .map(item => {
        // Customize label for activities-menu with organization name
        let label = item.label
        if (item.key === 'activities-menu' && organizationName) {
          label = `Hoạt động ${organizationName}`
        }

        const menuItem: any = {
          key: item.key,
          icon: item.icon,
          label: label,
        }

        // If item has children, recursively filter them
        if (item.children) {
          const filteredChildren = filterByRoleAndOrg(item.children)
          if (filteredChildren && filteredChildren.length > 0) {
            menuItem.children = filteredChildren
          }
        }

        return menuItem
      })
  }

  return filterByRoleAndOrg(ALL_MENU_ITEMS)
}

/**
 * Get menu item by key (recursive search including children)
 */
export const getMenuItemByKey = (key: string): MenuItem | undefined => {
  const findInItems = (items: MenuItem[]): MenuItem | undefined => {
    for (const item of items) {
      if (item.key === key) {
        return item
      }
      if (item.children) {
        const found = findInItems(item.children)
        if (found) return found
      }
    }
    return undefined
  }

  return findInItems(ALL_MENU_ITEMS)
}

/**
 * Get menu item by tab (recursive search including children)
 */
export const getMenuItemByTab = (tab: string): MenuItem | undefined => {
  const findInItems = (items: MenuItem[]): MenuItem | undefined => {
    for (const item of items) {
      if (item.tab === tab) {
        return item
      }
      if (item.children) {
        const found = findInItems(item.children)
        if (found) return found
      }
    }
    return undefined
  }

  return findInItems(ALL_MENU_ITEMS)
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
 * Build mappings recursively to include children
 */
const buildMappings = (items: MenuItem[]): { tabToKey: Record<string, string>, keyToTab: Record<string, string> } => {
  const tabToKey: Record<string, string> = {}
  const keyToTab: Record<string, string> = {}

  const processItem = (item: MenuItem) => {
    tabToKey[item.tab] = item.key
    keyToTab[item.key] = item.tab

    if (item.children) {
      item.children.forEach(processItem)
    }
  }

  items.forEach(processItem)

  return { tabToKey, keyToTab }
}

const { tabToKey, keyToTab } = buildMappings(ALL_MENU_ITEMS)

/**
 * Tab to Menu Key mapping
 */
export const TAB_TO_KEY: Record<string, string> = tabToKey

/**
 * Menu Key to Tab mapping
 */
export const KEY_TO_TAB: Record<string, string> = keyToTab
