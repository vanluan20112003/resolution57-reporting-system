import {
  HomeOutlined,
  BellOutlined,
  ApiOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  FlagOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { UserRole } from './roles'
import type { MenuProps } from 'antd'

export interface MenuItem {
  key: string
  icon: React.ReactNode
  labelKey: string // i18n translation key for label
  descriptionKey?: string // i18n translation key for description
  tab: string
  roles: UserRole[] // Roles that can see this menu item
  children?: MenuItem[] // For submenu items
  requiresOrganization?: boolean // If true, only show if user has organization_id
  // Legacy fields for backward compatibility (will be removed)
  label?: string
  description?: string
}

/**
 * All available menu items with submenu structure
 */
export const ALL_MENU_ITEMS: MenuItem[] = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    labelKey: 'menu.home',
    descriptionKey: 'menu.homeDescription',
    tab: 'home',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
  },
  {
    key: 'activities-menu',
    icon: <ApartmentOutlined />,
    labelKey: 'menu.activitiesMenu', // Will be replaced with organization name dynamically
    descriptionKey: 'menu.activitiesDescription',
    tab: 'activities',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    requiresOrganization: true, // Entire menu requires organization
    children: [
      {
        key: 'department-activities',
        icon: <BellOutlined />,
        labelKey: 'menu.allActivities',
        descriptionKey: 'menu.allActivitiesDescription',
        tab: 'department-activities',
        roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        requiresOrganization: true,
      },
      {
        key: 'activity-management',
        icon: <FlagOutlined />,
        labelKey: 'menu.activityManagement',
        descriptionKey: 'menu.activityManagementDescription',
        tab: 'activity-management',
        roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        requiresOrganization: true,
      },
      {
        key: 'pending-approval',
        icon: <CheckCircleOutlined />,
        labelKey: 'menu.pendingApproval',
        descriptionKey: 'menu.pendingApprovalDescription',
        tab: 'pending-approval',
        roles: [UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        requiresOrganization: true,
      },
      {
        key: 'organization-profile',
        icon: <BankOutlined />,
        labelKey: 'menu.organizationProfile',
        descriptionKey: 'menu.organizationProfileDescription',
        tab: 'organization-profile',
        roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        requiresOrganization: true,
      },
    ],
  },
  {
    key: 'reports-menu',
    icon: <BarChartOutlined />,
    labelKey: 'menu.reportsMenu',
    descriptionKey: 'menu.reportsDescription',
    tab: 'reports',
    roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
    requiresOrganization: true,
    children: [
      {
        key: 'reports',
        icon: <FileDoneOutlined />,
        labelKey: 'menu.reports',
        descriptionKey: 'menu.reportsViewDescription',
        tab: 'reports',
        roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
        requiresOrganization: true,
      },
      {
        key: 'kpi',
        icon: <ApiOutlined />,
        labelKey: 'menu.kpiIndicators',
        descriptionKey: 'menu.kpiIndicatorsDescription',
        tab: 'kpi',
        roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
      },
      {
        key: 'kpi-management',
        icon: <BarChartOutlined />,
        labelKey: 'menu.kpiManagement',
        descriptionKey: 'menu.kpiManagementDescription',
        tab: 'kpi-management',
        roles: [UserRole.OPERATOR, UserRole.ADMIN],
      },
      {
        key: 'analytics',
        icon: <BarChartOutlined />,
        labelKey: 'menu.analytics',
        descriptionKey: 'menu.analyticsDescription',
        tab: 'analytics',
        roles: [UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
      },
    ],
  },
  {
    key: 'management-menu',
    icon: <SettingOutlined />,
    labelKey: 'menu.managementMenu',
    descriptionKey: 'menu.managementDescription',
    tab: 'management',
    roles: [UserRole.OPERATOR, UserRole.ADMIN],
    children: [
      {
        key: 'users',
        icon: <UserOutlined />,
        labelKey: 'menu.userManagement',
        descriptionKey: 'menu.userManagementDescription',
        tab: 'users',
        roles: [UserRole.OPERATOR, UserRole.ADMIN],
      },
      {
        key: 'organizations',
        icon: <TeamOutlined />,
        labelKey: 'menu.organizationManagement',
        descriptionKey: 'menu.organizationManagementDescription',
        tab: 'organizations',
        roles: [UserRole.OPERATOR, UserRole.ADMIN],
      },
      {
        key: 'activity-config',
        icon: <AppstoreOutlined />,
        labelKey: 'menu.activityConfig',
        descriptionKey: 'menu.activityConfigDescription',
        tab: 'activity-config',
        roles: [UserRole.OPERATOR, UserRole.ADMIN],
      },
      {
        key: 'system',
        icon: <SettingOutlined />,
        labelKey: 'menu.systemAdmin',
        descriptionKey: 'menu.systemAdminDescription',
        tab: 'system',
        roles: [UserRole.ADMIN],
      },
    ],
  },
  {
    key: 'profile',
    icon: <IdcardOutlined />,
    labelKey: 'menu.profile',
    descriptionKey: 'menu.profileDescription',
    tab: 'profile',
    roles: [UserRole.GUEST, UserRole.STAFF, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ADMIN],
  },
]

/**
 * Translation function type
 */
export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string

/**
 * Get menu items for a specific role with submenu support
 * @param role - User's role
 * @param organizationId - User's organization ID (optional)
 * @param organizationName - User's organization name (optional) - used to customize menu labels
 * @param t - Translation function from useTranslation hook
 * @param organizationAvatarUrl - Organization's avatar URL (optional) - used for submenu icon
 */
export const getMenuItemsForRole = (
  role: UserRole | string,
  organizationId?: string | null,
  organizationName?: string | null,
  t?: TranslateFunction,
  organizationAvatarUrl?: string | null
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
        // Get translated label
        let label: string | React.ReactNode
        let icon: React.ReactNode = item.icon

        if (t) {
          // Customize label for activities-menu with organization name and avatar
          if (item.key === 'activities-menu' && organizationName) {
            const orgLabel = t('menu.activitiesMenuWithOrg', { orgName: organizationName })
            label = orgLabel
            // Create icon with organization avatar (for collapsed state)
            if (organizationAvatarUrl) {
              icon = (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                  }}
                >
                  <img
                    src={organizationAvatarUrl}
                    alt={organizationName}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      objectFit: 'cover',
                      border: '1px solid #e8e8e8',
                    }}
                  />
                </span>
              )
            }
            // else: keep default icon (ApartmentOutlined) from item.icon
          } else {
            label = t(item.labelKey)
          }
        } else {
          // Fallback for when t is not provided
          label = item.labelKey
        }

        const menuItem: any = {
          key: item.key,
          icon: icon,
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
