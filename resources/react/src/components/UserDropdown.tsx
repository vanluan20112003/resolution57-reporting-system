import { useState } from 'react'
import { Dropdown, Avatar, Space, Typography, Divider, message } from 'antd'
import { UserOutlined, LogoutOutlined, LockOutlined, QuestionCircleOutlined, BellOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import API_CONFIG from '../config/api'

const { Text } = Typography

interface UserDropdownProps {
  user: {
    id: string
    name: string
    email: string
    avatar?: string | null
    avatar_url?: string | null
    role?: string
  }
}

function UserDropdown({ user }: UserDropdownProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      // Call logout API (don't wait for response)
      if (token) {
        fetch(API_CONFIG.AUTH.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => console.error('Logout API error:', err))
      }

      // Clear local storage immediately
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      localStorage.removeItem('token_type')

      // Force redirect to login page with page reload
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)

      // Even if error, still clear and redirect
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  const handleChangePassword = () => {
    message.info('Chức năng đổi mật khẩu đang được phát triển')
  }

  const handleHelp = () => {
    message.info('Chức năng hỗ trợ đang được phát triển')
  }

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              size={48}
              src={user.avatar_url || user.avatar}
              icon={!user.avatar_url && !user.avatar ? <UserOutlined /> : undefined}
              style={{ backgroundColor: '#1890ff' }}
            />
            <div>
              <Text strong style={{ display: 'block', fontSize: 15 }}>
                {user.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {user.email}
              </Text>
            </div>
          </div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Hỗ trợ',
      onClick: handleHelp,
    },
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: 'Đổi mật khẩu',
      onClick: handleChangePassword,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Notification Icon */}
      <div
        style={{
          cursor: 'pointer',
          fontSize: 20,
          color: '#fff',
          position: 'relative'
        }}
      >
        <BellOutlined />
        {/* Notification badge */}
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ff4d4f',
            border: '2px solid #1890ff',
          }}
        />
      </div>

      {/* User Dropdown */}
      <Dropdown
        menu={{ items }}
        trigger={['click']}
        placement="bottomRight"
        overlayStyle={{ minWidth: 280 }}
      >
        <div
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Avatar
            size={32}
            src={user.avatar_url || user.avatar}
            icon={!user.avatar_url && !user.avatar ? <UserOutlined /> : undefined}
            style={{ backgroundColor: '#fff', color: '#1890ff' }}
          />
          <Text style={{ color: '#fff', fontSize: 14 }}>
            {user.name.split(' ')[0]}
          </Text>
        </div>
      </Dropdown>
    </div>
  )
}

export default UserDropdown
