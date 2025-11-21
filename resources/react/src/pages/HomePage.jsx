import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Typography, Space, Tag, Alert, Spin, Button, Avatar, Descriptions, message } from 'antd'
import {
  DashboardOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons'
import api from '../services/api'
import axios from 'axios'

const { Title, Paragraph, Text } = Typography

function HomePage() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    fetchSystemStatus()
    checkSSOCallback()
    fetchUserInfo()
  }, [])

  const checkSSOCallback = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const ssoSuccess = urlParams.get('sso_success')
    const data = urlParams.get('data')
    const error = urlParams.get('error')

    if (ssoSuccess && data) {
      try {
        // Decode base64 data
        const tokenData = JSON.parse(atob(data))

        // Store tokens in localStorage
        localStorage.setItem('access_token', tokenData.access_token)
        if (tokenData.refresh_token) {
          localStorage.setItem('refresh_token', tokenData.refresh_token)
        }
        localStorage.setItem('token_expires_at', Date.now() + (tokenData.expires_in * 1000))

        // Set user data
        setUser(tokenData.user)
        setAuthenticated(true)

        message.success('Đăng nhập SSO thành công!')

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (e) {
        console.error('Error parsing SSO data:', e)
        message.error('Lỗi xử lý dữ liệu SSO')
      }
    } else if (error) {
      message.error(`Lỗi SSO: ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await axios.get('/api/v1/auth/sso/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.data.authenticated) {
        setUser(response.data.user)
        setAuthenticated(true)
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      // Token might be expired, try to refresh
      if (error.response?.status === 401) {
        await tryRefreshToken()
      }
    }
  }

  const tryRefreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return

    try {
      const response = await axios.post('/api/v1/auth/sso/refresh', {
        refresh_token: refreshToken
      })

      // Update tokens
      localStorage.setItem('access_token', response.data.access_token)
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token)
      }
      localStorage.setItem('token_expires_at', Date.now() + (response.data.expires_in * 1000))

      // Retry fetching user info
      await fetchUserInfo()
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Clear tokens and logout
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token_expires_at')
      setAuthenticated(false)
      setUser(null)
    }
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')

    try {
      await axios.post('/api/v1/auth/sso/logout', {
        refresh_token: refreshToken
      })
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      // Clear local storage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token_expires_at')

      setUser(null)
      setAuthenticated(false)
      message.success('Đăng xuất thành công!')
    }
  }

  const fetchSystemStatus = async () => {
    try {
      const response = await api.get('/v1/status')
      console.log('API Response:', response)
      setSystemStatus(response)
    } catch (error) {
      console.error('Error fetching system status:', error)
      console.error('Error details:', error.response || error.message)
      // Set default data nếu lỗi
      setSystemStatus({
        status: 'error',
        message: 'Không thể kết nối đến API',
        version: '1.0.0',
        database: {
          status: 'disconnected',
          connection: 'mysql',
          tables: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Đang tải...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2}>
          <DashboardOutlined /> Cổng thông tin Nghị quyết 57 - Hệ thống báo cáo
        </Title>
        <Paragraph type="secondary">
          Hệ thống tổng hợp, quản lý và báo cáo các hoạt động triển khai Nghị quyết 57 - Version 2.0
        </Paragraph>

        {!authenticated ? (
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            href="/api/v1/auth/sso/login"
            style={{ marginTop: 16 }}
          >
            Đăng nhập bằng SSO VNUHCM
          </Button>
        ) : (
          <Button
            danger
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ marginTop: 16 }}
          >
            Đăng xuất
          </Button>
        )}
      </div>

      {/* User Info Card - Show when authenticated */}
      {authenticated && user && (
        <Card
          title={
            <Space>
              <UserOutlined />
              <span>Thông tin người dùng</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
          headStyle={{ backgroundColor: '#e6f7ff' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {user.name || (user.given_name && user.family_name ? user.given_name + ' ' + user.family_name : 'N/A')}
                </Title>
                <Text type="secondary">{user.email}</Text>
              </div>
            </div>

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="User ID (sub)">
                {user.sub || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Tên đăng nhập">
                {user.username || user.preferred_username || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {user.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Email verified">
                {user.email_verified ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Họ">
                {user.family_name || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Tên">
                {user.given_name || 'N/A'}
              </Descriptions.Item>
              {user.middle_name && (
                <Descriptions.Item label="Tên đệm">
                  {user.middle_name}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Tên đầy đủ">
                {user.name || 'N/A'}
              </Descriptions.Item>
              {user.nickname && (
                <Descriptions.Item label="Nickname">
                  {user.nickname}
                </Descriptions.Item>
              )}
              {user.birthdate && (
                <Descriptions.Item label="Ngày sinh">
                  {user.birthdate}
                </Descriptions.Item>
              )}
              {user.gender && (
                <Descriptions.Item label="Giới tính">
                  {user.gender}
                </Descriptions.Item>
              )}
              {user.phone_number && (
                <Descriptions.Item label="Số điện thoại">
                  {user.phone_number}
                </Descriptions.Item>
              )}
              {user.phone_number_verified !== undefined && (
                <Descriptions.Item label="Phone verified">
                  {user.phone_number_verified ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}
                </Descriptions.Item>
              )}
              {user.address && (
                <Descriptions.Item label="Địa chỉ" span={2}>
                  {typeof user.address === 'object'
                    ? JSON.stringify(user.address)
                    : user.address}
                </Descriptions.Item>
              )}
              {user.department && (
                <Descriptions.Item label="Đơn vị">
                  {user.department}
                </Descriptions.Item>
              )}
              {user.locale && (
                <Descriptions.Item label="Ngôn ngữ">
                  {user.locale === 'vn' ? 'Tiếng Việt' : user.locale}
                </Descriptions.Item>
              )}
              {user.zoneinfo && (
                <Descriptions.Item label="Timezone">
                  {user.zoneinfo}
                </Descriptions.Item>
              )}
              {user.updated_at && (
                <Descriptions.Item label="Cập nhật lần cuối">
                  {new Date(user.updated_at * 1000).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {user.roles && user.roles.length > 0 && (
                <Descriptions.Item label="Roles" span={2}>
                  <Space wrap>
                    {user.roles.map((role, index) => (
                      <Tag color="blue" key={index}>{role}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Raw user data for debugging */}
            <Card
              title="Raw User Data (Debug)"
              size="small"
              style={{ marginTop: 16 }}
              type="inner"
            >
              <pre style={{
                fontSize: '11px',
                maxHeight: '300px',
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px'
              }}>
                {JSON.stringify(user, null, 2)}
              </pre>
            </Card>
          </Space>
        </Card>
      )}

      {/* System Status Alert */}
      {systemStatus && (
        <Alert
          message="Trạng thái hệ thống"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> API: {systemStatus.message}
              </Text>
              <Text>
                <DatabaseOutlined style={{ color: systemStatus.database?.status === 'connected' ? '#52c41a' : '#ff4d4f' }} />
                {' '}Database: {systemStatus.database?.status || 'unknown'}
              </Text>
              <Text type="secondary">
                <ClockCircleOutlined /> Cập nhật lúc: {new Date(systemStatus.timestamp).toLocaleString('vi-VN')}
              </Text>
            </Space>
          }
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Phiên bản API"
              value={systemStatus?.version || '1.0.0'}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Kết nối Database"
              value={systemStatus?.database?.connection || 'MySQL'}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Số bảng dữ liệu"
              value={systemStatus?.database?.tables || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Trạng thái"
              value={systemStatus?.database?.status === 'connected' ? 'Hoạt động' : 'Lỗi'}
              prefix={systemStatus?.database?.status === 'connected' ?
                <CheckCircleOutlined /> : <SyncOutlined spin />}
              valueStyle={{
                color: systemStatus?.database?.status === 'connected' ? '#3f8600' : '#cf1322'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Information Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Về Nghị quyết 57"
            bordered={false}
            headStyle={{ backgroundColor: '#f0f5ff' }}
          >
            <Paragraph>
              Nghị quyết 57 là văn bản quan trọng hướng đến mục tiêu phát triển bền vững
              và cải thiện chất lượng cuộc sống của người dân.
            </Paragraph>
            <Paragraph>
              <Text strong>Mục tiêu chính:</Text>
            </Paragraph>
            <ul>
              <li>Tổng hợp và quản lý các hoạt động triển khai</li>
              <li>Theo dõi tiến độ thực hiện</li>
              <li>Báo cáo kết quả định kỳ</li>
              <li>Phối hợp giữa các đơn vị</li>
            </ul>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Tính năng hệ thống"
            bordered={false}
            headStyle={{ backgroundColor: '#f6ffed' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="blue">Quản lý hoạt động</Tag>
              <Tag color="green">Báo cáo thống kê</Tag>
              <Tag color="orange">Theo dõi tiến độ</Tag>
              <Tag color="purple">Quản lý người dùng</Tag>
              <Tag color="cyan">Phân quyền hệ thống</Tag>
              <Tag color="magenta">Xuất báo cáo</Tag>
            </Space>
            <Paragraph style={{ marginTop: 16 }}>
              <Text type="secondary">
                Hệ thống đang trong quá trình phát triển và hoàn thiện.
              </Text>
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card
        title="Truy cập nhanh"
        style={{ marginTop: 16 }}
        headStyle={{ backgroundColor: '#fff7e6' }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <a href="/api/v1/status" target="_blank" rel="noopener noreferrer">
              📊 Xem trạng thái API
            </a>
          </Col>
          <Col span={12}>
            <a href="/api/v1/health" target="_blank" rel="noopener noreferrer">
              ❤️ Kiểm tra sức khỏe hệ thống
            </a>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default HomePage
