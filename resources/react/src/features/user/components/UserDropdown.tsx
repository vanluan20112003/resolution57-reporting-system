/**
 * User Dropdown Component
 * Displays user menu with avatar, profile info, and actions
 */

import { useState } from 'react'
import { Dropdown, Avatar, Typography, message } from 'antd'
import { UserOutlined, LogoutOutlined, LockOutlined, QuestionCircleOutlined, BellOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLogout } from '../../auth/hooks/useLogout'
import { LoadingOverlay } from '../../../shared/components'
import ChangePasswordModal from '../../../components/ChangePasswordModal'

const { Text } = Typography

export interface UserData {
  id: string
  name: string
  email: string
  avatar?: string | null
  avatar_url?: string | null
  role?: string
}

interface UserDropdownProps {
  user: UserData
}

function UserDropdown({ user }: UserDropdownProps) {
  const { logout, loading } = useLogout()
  const [changePasswordVisible, setChangePasswordVisible] = useState(false)

  const handleChangePassword = () => {
    setChangePasswordVisible(true)
  }

  const handleHelp = () => {
    message.info('Chức năng hỗ trợ đang được phát triển')
  }

  // Get user initials for default avatar
  const getUserInitials = (name: string) => {
    const words = name.trim().split(' ')
    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const userInitials = getUserInitials(user.name)
  const hasAvatar = user.avatar_url || user.avatar

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar
              size={56}
              src={hasAvatar ? (user.avatar_url || user.avatar) : undefined}
              style={{
                backgroundColor: hasAvatar ? '#1890ff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                background: hasAvatar ? '#1890ff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: 22,
                fontWeight: 700,
                border: '3px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              {!hasAvatar && userInitials}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 4 }}>
                {user.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {user.email}
              </Text>
              {user.role && (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#1890ff',
                    backgroundColor: '#e6f7ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    fontWeight: 600
                  }}
                >
                  {user.role}
                </Text>
              )}
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
      onClick: logout,
      danger: true,
    },
  ]

  return (
    <>
      <LoadingOverlay loading={loading} message="Đang đăng xuất..." />
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Notification Icon */}
        <div
          style={{
            cursor: 'pointer',
            fontSize: 20,
            color: '#fff',
            position: 'relative',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#fff'
          }}
        >
          <BellOutlined />
          {/* Notification badge */}
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#ffeb3b',
              border: '2px solid #d32f2f',
            }}
          />
        </div>

        {/* User Dropdown */}
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ minWidth: 320 }}
        >
          <div
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Avatar
              size={36}
              src={hasAvatar ? (user.avatar_url || user.avatar) : undefined}
              style={{
                backgroundColor: hasAvatar ? '#1890ff' : undefined,
                background: hasAvatar ? '#1890ff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: 14,
                fontWeight: 700,
                border: '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              {!hasAvatar && userInitials}
            </Avatar>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
              {user.name.split(' ').slice(0, 2).join(' ')}
            </Text>
          </div>
        </Dropdown>
      </div>
    </>
  )
}

export default UserDropdown
