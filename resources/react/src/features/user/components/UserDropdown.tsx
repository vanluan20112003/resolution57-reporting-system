/**
 * User Dropdown Component
 * Displays user menu with avatar, profile info, and actions
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dropdown, Avatar, Typography, message } from 'antd'
import { UserOutlined, LogoutOutlined, LockOutlined, QuestionCircleOutlined } from '@ant-design/icons'
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
  organization_id?: string | null
  organization_name?: string | null
  organization_full_name?: string | null
}

interface UserDropdownProps {
  user: UserData
}

function UserDropdown({ user }: UserDropdownProps) {
  const navigate = useNavigate()
  const { logout, loading } = useLogout()
  const [changePasswordVisible, setChangePasswordVisible] = useState(false)

  const handleProfile = () => {
    navigate('/dashboard?tab=profile')
  }

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

  // Get avatar URL with proper path handling
  const getAvatarUrl = () => {
    if (user.avatar) {
      // If avatar starts with http/https (Google avatar), use it directly
      if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
        return user.avatar
      }
      // If avatar is a relative path, prepend the base URL
      if (user.avatar.startsWith('avatars/')) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        return `${apiUrl.replace('/api/v1', '')}/storage/${user.avatar}`
      }
      return user.avatar
    }
    if (user.avatar_url) {
      return user.avatar_url
    }
    return null
  }

  const userInitials = getUserInitials(user.name)
  const avatarUrl = getAvatarUrl()
  const hasAvatar = !!avatarUrl

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar
              size={56}
              src={avatarUrl || undefined}
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
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
      onClick: handleProfile,
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
            src={avatarUrl || undefined}
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
    </>
  )
}

export default UserDropdown
