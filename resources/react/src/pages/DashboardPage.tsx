import { useState } from 'react'
import { Layout, Menu, Space, Typography, Button } from 'antd'
import {
  HomeOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import ResolutionList from '../components/Dashboard/ResolutionList'
import { UserDropdown } from '../features/user'
import { useAuth } from '../shared/hooks'
import '../styles/DashboardPage.css'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

function DashboardPage() {
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<string>('1')
  const { user, isLoading } = useAuth()

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
      <Layout className="dashboard-body">
        {/* Fixed Sidebar */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={280}
          className="dashboard-sider"
          style={{
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: 64,
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
            onClick={({ key }) => setSelectedMenu(key)}
          />
        </Sider>

        {/* Main Content */}
        <Content
          className="dashboard-content"
          style={{ marginLeft: collapsed ? 80 : 280, transition: 'margin-left 0.2s' }}
        >
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
