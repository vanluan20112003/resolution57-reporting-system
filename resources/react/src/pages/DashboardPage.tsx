import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography } from 'antd'
import {
  HomeOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  BellOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import ResolutionList from '../components/Dashboard/ResolutionList'
import '../styles/DashboardPage.css'

const { Header, Sider, Content } = Layout
const { Text } = Typography

function DashboardPage() {
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<string>('1')

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')

    // Redirect to login
    window.location.href = '/login'
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Thông tin cá nhân',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  const menuItems: MenuProps['items'] = [
    {
      key: '1',
      icon: <HomeOutlined />,
      label: 'Người dùng',
    },
    {
      key: '2',
      icon: <DatabaseOutlined />,
      label: 'Báo cáo',
    },
    {
      key: '3',
      icon: <ApiOutlined />,
      label: 'KPI',
    },
    {
      key: '4',
      icon: <FileTextOutlined />,
      label: 'Phân tích',
    },
  ]

  return (
    <Layout className="dashboard-layout">
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={250}
        className="dashboard-sider"
      >
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
          onClick={({ key }) => setSelectedMenu(key)}
        />
      </Sider>

      {/* Main Content */}
      <Layout>
        {/* Header */}
        <Header className="dashboard-header">
          <div className="header-left">
            <Text strong className="header-title">
              Người dùng
            </Text>
          </div>

          <div className="header-right">
            <Space size="large">
              {/* Notifications */}
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: '18px' }} />}
                className="header-icon-btn"
              />

              {/* User Dropdown */}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space className="user-dropdown" style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <Space size={4}>
                    <Text strong>DHQGHCM</Text>
                    <Text type="secondary">+@gphuc@...</Text>
                  </Space>
                  <DownOutlined style={{ fontSize: '12px' }} />
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>

        {/* Content */}
        <Content className="dashboard-content">
          <div className="content-wrapper">
            {selectedMenu === '1' && <ResolutionList />}
            {selectedMenu === '2' && (
              <div className="empty-content">
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">Báo cáo - Đang phát triển</Text>
              </div>
            )}
            {selectedMenu === '3' && (
              <div className="empty-content">
                <ApiOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">KPI - Đang phát triển</Text>
              </div>
            )}
            {selectedMenu === '4' && (
              <div className="empty-content">
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <Text type="secondary">Phân tích - Đang phát triển</Text>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardPage
