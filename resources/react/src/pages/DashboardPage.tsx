import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Space, Typography, Button, Badge } from 'antd'
import { Menu } from 'antd'
import { MenuOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MenuProps } from 'antd'
import { getBadgeCounts, BadgeCounts } from '../services/activityApi'
import ResolutionList from '../components/Dashboard/ResolutionList'
import ActivityList from '../components/Dashboard/ActivityList'
import AllActivitiesList from '../components/Dashboard/AllActivitiesList'
import DepartmentActivitiesList from '../components/Dashboard/DepartmentActivitiesList'
import { UserManagement } from '../components/UserManagement'
import { KpiManagement } from '../components/KpiManagement'
import { OrganizationManagement } from '../components/OrganizationManagement'
import ActivityConfigManagement from '../components/ActivityConfigManagement'
import { ActivityManagement } from '../components/ActivityManagement'
import { UserProfile } from '../components/UserProfile'
import OrganizationProfile from '../components/OrganizationProfile'
import { UserDropdown } from '../features/user'
import { useAuth } from '../shared/hooks'
import { ImpersonationBanner } from '../shared/components'
import NotificationDropdown from '../components/NotificationDropdown'
import {
  getMenuItemsForRole,
  getMenuItemByKey,
  getMenuItemByTab,
  canAccessMenuItem,
  getDefaultMenuKey,
  TAB_TO_KEY,
  KEY_TO_TAB,
  UserRole,
} from '../constants'
import '../styles/DashboardPage.css'
import logoNQ57 from '../assets/images/cobualiem.png'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // Get initial collapsed state from localStorage
  const getInitialCollapsed = () => {
    const saved = localStorage.getItem('dashboard_sidebar_collapsed')
    return saved === 'true'
  }

  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed())
  const { user, isLoading } = useAuth()
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({ pending_approval: 0, draft: 0 })

  // Fetch badge counts
  const fetchBadgeCounts = useCallback(async () => {
    try {
      const response = await getBadgeCounts()
      if (response.success) {
        setBadgeCounts(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch badge counts:', error)
    }
  }, [])

  // Fetch badge counts on mount and every 30 seconds
  // Also listen for custom event to refresh badges
  useEffect(() => {
    if (user) {
      fetchBadgeCounts()
      const interval = setInterval(fetchBadgeCounts, 30000)

      // Listen for custom event from ActivityManagement
      const handleActivityChange = () => {
        fetchBadgeCounts()
      }
      window.addEventListener('activity-status-changed', handleActivityChange)

      return () => {
        clearInterval(interval)
        window.removeEventListener('activity-status-changed', handleActivityChange)
      }
    }
  }, [user, fetchBadgeCounts])

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  // Get initial menu from URL query params or localStorage
  const getInitialMenu = () => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')

    // If tab name in URL, convert to key
    if (tab && TAB_TO_KEY[tab]) {
      return TAB_TO_KEY[tab]
    }

    // Check localStorage
    const savedMenu = localStorage.getItem('dashboard_selected_menu')
    if (savedMenu) return savedMenu

    // Default to home
    return user ? getDefaultMenuKey(user.role) : 'home'
  }

  const [selectedMenu, setSelectedMenu] = useState<string>(getInitialMenu())

  // Build menu items based on user role and organization
  const menuItems: MenuProps['items'] = useMemo(() => {
    if (!user) return []
    const items = getMenuItemsForRole(user.role, user.organization_id, user.organization_name, t)

    // Add badges to menu items
    const addBadgesToItems = (menuList: MenuProps['items']): MenuProps['items'] => {
      if (!menuList) return []

      return menuList.map((item: any) => {
        if (!item) return item

        let newItem = { ...item }

        // Add badge for "Quản lý hoạt động" - draft count for STAFF
        if (item.key === 'activity-management' && badgeCounts.draft > 0) {
          newItem.label = (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>{item.label}</span>
              <Badge count={badgeCounts.draft} size="small" style={{ backgroundColor: '#ff4d4f' }} />
            </span>
          )
        }

        // Add badge for "Chờ phê duyệt" - pending approval count for MANAGER+
        if (item.key === 'pending-approval') {
          if (badgeCounts.pending_approval > 0) {
            newItem.label = (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.label}</span>
                <Badge count={badgeCounts.pending_approval} size="small" style={{ backgroundColor: '#ff4d4f' }} />
              </span>
            )
          }
        }

        // Add total badge for activities-menu parent
        if (item.key === 'activities-menu') {
          const totalBadge = badgeCounts.draft + badgeCounts.pending_approval
          if (totalBadge > 0) {
            newItem.label = (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.label}</span>
                <Badge count={totalBadge} size="small" style={{ backgroundColor: '#ff4d4f' }} />
              </span>
            )
          }
        }

        // Recursively process children
        if (item.children) {
          newItem.children = addBadgesToItems(item.children)
        }

        return newItem
      })
    }

    return addBadgesToItems(items)
  }, [user, badgeCounts, t])

  // Detect mobile view
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // On mobile, sidebar should be collapsed by default
  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true)
    }
  }, [isMobile])

  // Handle menu change with URL update
  const handleMenuChange = useCallback((key: string) => {
    setSelectedMenu(key)
    const tabName = KEY_TO_TAB[key] || 'home'
    navigate(`/dashboard?tab=${tabName}`, { replace: true })
    localStorage.setItem('dashboard_selected_menu', key)

    // Auto-close sidebar on mobile after selecting menu
    if (isMobile) {
      setCollapsed(true)
    }
  }, [navigate, isMobile])

  // Sync selectedMenu with URL changes (when navigating from other components)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')

    if (tab && TAB_TO_KEY[tab]) {
      const menuKey = TAB_TO_KEY[tab]
      if (menuKey !== selectedMenu) {
        setSelectedMenu(menuKey)
        localStorage.setItem('dashboard_selected_menu', menuKey)
      }
    }
  }, [location.search, selectedMenu])

  // Validate selected menu based on user permissions
  useEffect(() => {
    if (isLoading || !user) return

    // Check if user can access current menu
    if (!canAccessMenuItem(user.role, selectedMenu)) {
      const defaultKey = getDefaultMenuKey(user.role)
      handleMenuChange(defaultKey)
    }
  }, [selectedMenu, user, isLoading, handleMenuChange])

  // Check if impersonating
  const isImpersonating = localStorage.getItem('impersonation_admin_id') !== null

  // Render content based on selected menu
  const renderContent = () => {
    const menuItem = getMenuItemByKey(selectedMenu)

    switch(selectedMenu) {
      case 'home':
        return <AllActivitiesList />

      case 'department-activities':
        // View all activities of department (read-only for GUEST)
        return <DepartmentActivitiesList />

      case 'activity-management':
        // CRUD for STAFF+ of department
        return <ActivityManagement />

      case 'pending-approval':
        // Approval list for MANAGER+
        return <ActivityManagement defaultStatusFilter="PENDING_APPROVAL" showApprovalView />

      case 'activities':
        // Fallback for old route
        return <DepartmentActivitiesList />

      case 'reports':
        return (
          <div className="empty-content">
            <Title level={3}>{t('menu.reports')}</Title>
            <Text type="secondary">{t('menu.reportsViewDescription')} - {t('menu.underDevelopment')}</Text>
          </div>
        )

      case 'kpi':
        return (
          <div className="empty-content">
            <Title level={3}>{t('menu.kpiIndicators')}</Title>
            <Text type="secondary">{t('menu.kpiIndicatorsDescription')} - {t('menu.underDevelopment')}</Text>
          </div>
        )

      case 'kpi-management':
        return <KpiManagement />

      case 'analytics':
        return (
          <div className="empty-content">
            <Title level={3}>{t('menu.analytics')}</Title>
            <Text type="secondary">{t('menu.analyticsDescription')} - {t('menu.underDevelopment')}</Text>
          </div>
        )

      case 'users':
        return <UserManagement />

      case 'organizations':
        return <OrganizationManagement />

      case 'activity-config':
        return <ActivityConfigManagement />

      case 'organization-profile':
        return <OrganizationProfile />

      case 'system':
        return (
          <div className="empty-content">
            <Title level={3}>{t('menu.systemAdmin')}</Title>
            <Text type="secondary">{t('menu.systemAdminDescription')} - {t('menu.underDevelopment')}</Text>
          </div>
        )

      case 'profile':
        return <UserProfile />

      default:
        return (
          <div className="empty-content">
            <Title level={3}>{menuItem?.labelKey ? t(menuItem.labelKey) : t('menu.home')}</Title>
            <Text type="secondary">{menuItem?.descriptionKey ? t(menuItem.descriptionKey) : t('menu.underDevelopment')}</Text>
          </div>
        )
    }
  }

  return (
    <Layout className="dashboard-layout">
      {/* Impersonation Banner */}
      {isImpersonating && user && <ImpersonationBanner currentUserEmail={user.email} />}

      {/* Header - Fixed at top */}
      <Header className="dashboard-header">
        <div className="header-left">
          {/* Mobile Menu Button */}
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                color: '#fff',
                fontSize: '20px',
                marginRight: '12px',
                padding: '4px 8px',
              }}
            />
          )}
          <div className="vietnam-flag">
            <img
              src={logoNQ57}
              alt="NQ57 Logo"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <Title level={4} className="header-title" style={{ margin: 0 }}>
            {t('dashboard.headerTitle')}
          </Title>
        </div>

        <div className="header-right">
          {!isLoading && user ? (
            <Space size="small">
              <NotificationDropdown />
              <UserDropdown user={user} />
            </Space>
          ) : (
            <Space>
              <Text style={{ color: '#fff' }}>{t('common.loading')}</Text>
            </Space>
          )}
        </div>
      </Header>

      {/* Content area with Sidebar and Main content */}
      <Layout className="dashboard-body">
        {/* Mobile Overlay Backdrop */}
        {isMobile && !collapsed && (
          <div
            onClick={() => setCollapsed(true)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 999,
            }}
          />
        )}

        {/* Fixed Sidebar */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={280}
          className="dashboard-sider"
          style={{
            overflow: 'hidden',
            height: isImpersonating ? 'calc(100vh - 112px - 32px)' : 'calc(100vh - 64px - 32px)',
            position: 'fixed',
            left: 16,
            top: isImpersonating ? 128 : 80,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo at the top */}
          <div className={`dashboard-logo ${collapsed ? 'collapsed' : ''}`}>
            <div className="logo-icon">
              <img
                src={collapsed ? "/VNUHCM_logo.png" : "/vnuhcm.png"}
                alt="ĐHQG-HCM Logo"
              />
            </div>
          </div>

          {/* Menu - scrollable */}
          <div className="sidebar-menu-wrapper">
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[selectedMenu]}
              items={menuItems}
              onClick={({ key }) => handleMenuChange(key)}
            />
          </div>

          {/* Toggle button at bottom */}
          <div className="sidebar-toggle-wrapper">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-toggle-btn"
            >
              {!collapsed && <span style={{ marginLeft: 8 }}>{t('menu.collapse')}</span>}
            </Button>
          </div>
        </Sider>

        {/* Main Content */}
        <Content
          className="dashboard-content"
          style={{
            marginLeft: collapsed ? 112 : 312,
            marginRight: 16,
            marginBottom: 16,
            transition: 'margin-left 0.2s'
          }}
        >
          <div className="content-wrapper">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardPage
