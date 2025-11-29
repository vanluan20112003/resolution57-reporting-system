import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Space, Typography, Button } from 'antd'
import { Menu } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import ResolutionList from '../components/Dashboard/ResolutionList'
import ActivityList from '../components/Dashboard/ActivityList'
import AllActivitiesList from '../components/Dashboard/AllActivitiesList'
import DepartmentActivitiesList from '../components/Dashboard/DepartmentActivitiesList'
import { UserManagement } from '../components/UserManagement'
import { KpiManagement } from '../components/KpiManagement'
import { OrganizationManagement } from '../components/OrganizationManagement'
import { UserProfile } from '../components/UserProfile'
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

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Get initial collapsed state from localStorage
  const getInitialCollapsed = () => {
    const saved = localStorage.getItem('dashboard_sidebar_collapsed')
    return saved === 'true'
  }

  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed())
  const { user, isLoading } = useAuth()

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

  // Build menu items based on user role
  const menuItems: MenuProps['items'] = useMemo(() => {
    if (!user) return []
    return getMenuItemsForRole(user.role)
  }, [user])

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

      case 'activities':
        return <DepartmentActivitiesList />

      case 'my-activities':
        return (
          <div className="empty-content">
            <Title level={3}>Hoạt động của tôi</Title>
            <Text type="secondary">Danh sách các hoạt động do bạn tạo - Đang phát triển</Text>
          </div>
        )

      case 'pending-approval':
        return (
          <div className="empty-content">
            <Title level={3}>Chờ phê duyệt</Title>
            <Text type="secondary">Danh sách hoạt động chờ bạn phê duyệt - Đang phát triển</Text>
          </div>
        )

      case 'reports':
        return (
          <div className="empty-content">
            <Title level={3}>Báo cáo</Title>
            <Text type="secondary">Xem và tạo báo cáo - Đang phát triển</Text>
          </div>
        )

      case 'kpi':
        return (
          <div className="empty-content">
            <Title level={3}>Chỉ số KPI</Title>
            <Text type="secondary">Theo dõi các chỉ số KPI - Đang phát triển</Text>
          </div>
        )

      case 'kpi-management':
        return <KpiManagement />

      case 'analytics':
        return (
          <div className="empty-content">
            <Title level={3}>Phân tích & Thống kê</Title>
            <Text type="secondary">Biểu đồ và phân tích dữ liệu - Đang phát triển</Text>
          </div>
        )

      case 'users':
        return <UserManagement />

      case 'organizations':
        return <OrganizationManagement />

      case 'system':
        return (
          <div className="empty-content">
            <Title level={3}>Quản trị hệ thống</Title>
            <Text type="secondary">Cấu hình và quản trị hệ thống - Đang phát triển</Text>
          </div>
        )

      case 'profile':
        return <UserProfile />

      default:
        return (
          <div className="empty-content">
            <Title level={3}>{menuItem?.label || 'Trang'}</Title>
            <Text type="secondary">{menuItem?.description || 'Đang phát triển'}</Text>
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
              src="https://nq57.vn/static/appbuilder/images/nq57_logo.png"
              alt="NQ57 Logo"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <Title level={4} className="header-title" style={{ margin: 0 }}>
            HỆ THỐNG THÔNG TIN GIÁM SÁT, ĐÁNH GIÁ VIỆC THỰC HIỆN NGHỊ QUYẾT SỐ 57-NQ/TW CỦA ĐHQG-TPHCM
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
              <Text style={{ color: '#fff' }}>Đang tải...</Text>
            </Space>
          )}
        </div>
      </Header>

      {/* Content area with Sidebar and Main content */}
      <Layout className="dashboard-body" style={{ marginTop: isImpersonating ? 48 : 0 }}>
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
            overflow: 'auto',
            height: isImpersonating ? 'calc(100vh - 112px)' : 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: isImpersonating ? 112 : 64,
            bottom: 0,
          }}
        >
          {/* Logo at the top */}
          <div className="dashboard-logo">
            <div className="logo-icon">
              <img src="/vnuhcm.png" alt="ĐHQG-HCM Logo" />
            </div>
          </div>

          {/* Toggle button below logo */}
          <div className="sidebar-toggle-wrapper">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-toggle-btn"
            />
          </div>

          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[selectedMenu]}
            items={menuItems}
            onClick={({ key }) => handleMenuChange(key)}
          />
        </Sider>

        {/* Main Content */}
        <Content
          className="dashboard-content"
          style={{ marginLeft: collapsed ? 80 : 280, transition: 'margin-left 0.2s' }}
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
