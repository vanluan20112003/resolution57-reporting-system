import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Space, Typography, Button } from 'antd'
import {
  HomeOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  MenuOutlined,
  UserOutlined,
  BellOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import ResolutionList from '../components/Dashboard/ResolutionList'
import ActivityList from '../components/Dashboard/ActivityList'
import { UserManagement } from '../components/UserManagement'
import { UserDropdown } from '../features/user'
import { useAuth } from '../shared/hooks'
import { ImpersonationBanner } from '../shared/components'
import '../styles/DashboardPage.css'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

// Tab mapping constants (outside component to prevent re-creation)
const TAB_TO_KEY: Record<string, string> = {
  'activities': '1',
  'home': '2',
  'reports': '3',
  'kpi': '4',
  'analytics': '5',
  'users': '6',
}

const KEY_TO_TAB: Record<string, string> = {
  '1': 'activities',
  '2': 'home',
  '3': 'reports',
  '4': 'kpi',
  '5': 'analytics',
  '6': 'users',
}

function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<boolean>(false)

  // Get initial menu from URL query params or localStorage (only on mount)
  const getInitialMenu = () => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')

    // If tab name in URL, convert to key
    if (tab && TAB_TO_KEY[tab]) {
      return TAB_TO_KEY[tab]
    }

    return localStorage.getItem('dashboard_selected_menu') || '2'
  }

  const [selectedMenu, setSelectedMenu] = useState<string>(getInitialMenu())
  const { user, isLoading } = useAuth()

  // Check if user is OPERATOR or ADMIN
  const canManageUsers = useMemo(() => {
    return user?.role === 'OPERATOR' || user?.role === 'ADMIN'
  }, [user?.role])

  // Handle menu change with URL update
  const handleMenuChange = useCallback((key: string) => {
    setSelectedMenu(key)
    const tabName = KEY_TO_TAB[key] || 'home'
    navigate(`/dashboard?tab=${tabName}`, { replace: true })
    localStorage.setItem('dashboard_selected_menu', key)
  }, [navigate])

  // Validate selected menu based on user permissions
  useEffect(() => {
    // Only validate after user data is loaded (not during loading)
    if (isLoading) return

    // If user is not OPERATOR/ADMIN and trying to access menu '6' (User Management)
    if (selectedMenu === '6' && !canManageUsers) {
      handleMenuChange('2') // Redirect to home
    }
  }, [selectedMenu, canManageUsers, isLoading, handleMenuChange])

  // Build menu items based on user role
  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: '1',
        icon: <BellOutlined />,
        label: 'Hoạt động',
      },
      {
        key: '2',
        icon: <HomeOutlined />,
        label: 'Trang chủ',
      },
      {
        key: '3',
        icon: <DatabaseOutlined />,
        label: 'Báo cáo',
      },
      {
        key: '4',
        icon: <ApiOutlined />,
        label: 'KPI',
      },
      {
        key: '5',
        icon: <FileTextOutlined />,
        label: 'Phân tích',
      },
    ]

    // Add User Management menu for OPERATOR and ADMIN only
    if (canManageUsers) {
      items.push({
        key: '6',
        icon: <UserOutlined />,
        label: 'Quản lý người dùng',
      })
    }

    return items
  }, [canManageUsers])

  // Check if impersonating
  const isImpersonating = localStorage.getItem('impersonation_admin_id') !== null

  return (
    <Layout className="dashboard-layout">
      {/* Impersonation Banner */}
      {isImpersonating && user && <ImpersonationBanner currentUserEmail={user.email} />}

      {/* Header - Fixed at top, above everything */}
      <Header className="dashboard-header">
        <div className="header-left">
          <div className="vietnam-flag">
            <img
              src="https://nq57.vn/static/appbuilder/images/nq57_logo.png"
              alt="NQ57 Logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <Title level={4} className="header-title" style={{ margin: 0 }}>
            HỆ THỐNG THÔNG TIN GIÁM SÁT, ĐÁNH GIÁ VIỆC THỰC HIỆN NGHỊ QUYẾT SỐ 57-NQ/TW CỦA ĐHQG-TPHCM
          </Title>
        </div>

        <div className="header-right">
          {!isLoading && user ? (
            <UserDropdown user={user} />
          ) : (
            <Space>
              <Text style={{ color: '#fff' }}>Đang tải...</Text>
            </Space>
          )}
        </div>
      </Header>

      {/* Content area with Sidebar and Main content */}
      <Layout className="dashboard-body" style={{ marginTop: isImpersonating ? 48 : 0 }}>
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
          {/* Toggle button inside sidebar */}
          <div className="sidebar-toggle-wrapper">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-toggle-btn"
            />
          </div>

          <div className="dashboard-logo">
            <div className="logo-icon">
              <img src="https://pms.vnuhcm.edu.vn/logo.png" alt="Logo" />
            </div>
            {!collapsed && (
              <Text strong className="logo-text">
                NQ57 Portal
              </Text>
            )}
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
            {selectedMenu === '1' && (
              <div className="activity-content">
                <ActivityList />
              </div>
            )}
            {selectedMenu === '2' && <ResolutionList />}
            {selectedMenu === '3' && (
              <div className="empty-content">
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">Báo cáo - Đang phát triển</Text>
              </div>
            )}
            {selectedMenu === '4' && (
              <div className="empty-content">
                <ApiOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">KPI - Đang phát triển</Text>
              </div>
            )}
            {selectedMenu === '5' && (
              <div className="empty-content">
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">Phân tích - Đang phát triển</Text>
              </div>
            )}
            {selectedMenu === '6' && canManageUsers && <UserManagement />}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardPage
