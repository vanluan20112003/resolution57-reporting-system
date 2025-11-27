/**
 * Impersonation Banner Component
 * Shows a warning banner when admin is impersonating another user
 */

import { Alert, Button, Space } from 'antd'
import { LogoutOutlined, WarningOutlined } from '@ant-design/icons'
import { useState } from 'react'
import * as userApi from '../../services/userApi'
import { message } from 'antd'

interface ImpersonationBannerProps {
  currentUserEmail: string
}

function ImpersonationBanner({ currentUserEmail }: ImpersonationBannerProps) {
  const [loading, setLoading] = useState(false)

  // Check if currently impersonating
  const adminId = localStorage.getItem('impersonation_admin_id')
  const adminEmail = localStorage.getItem('impersonation_admin_email')

  if (!adminId || !adminEmail) {
    return null // Not impersonating
  }

  const handleStopImpersonation = async () => {
    setLoading(true)
    try {
      const response = await userApi.stopImpersonate(adminId)
      if (response.success) {
        // Update user data in localStorage with admin's data
        const adminUserData = {
          id: response.data.user.id,
          name: `${response.data.user.first_name} ${response.data.user.last_name}`.trim(),
          email: response.data.user.email,
          avatar: null,
          avatar_url: null,
          role: response.data.user.role,
        }

        // Clear impersonation data and store admin data synchronously
        localStorage.removeItem('impersonation_admin_id')
        localStorage.removeItem('impersonation_admin_email')
        localStorage.setItem('access_token', response.data.access_token)
        localStorage.setItem('user', JSON.stringify(adminUserData))

        message.success(`Đã quay lại tài khoản ${adminEmail}`)

        // Delay reload to ensure localStorage is saved and message is shown
        setTimeout(() => {
          window.location.href = '/dashboard?tab=home'
        }, 500)
      } else {
        message.error(response.message || 'Không thể kết thúc impersonation')
        setLoading(false)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Có lỗi xảy ra'
      message.error(errorMessage, 5)
      console.error('Error stopping impersonation:', error)
      setLoading(false)
    }
  }

  return (
    <Alert
      message={
        <Space>
          <WarningOutlined />
          <span>
            <strong>Chế độ Impersonation:</strong> Bạn đang đăng nhập với tư cách <strong>{currentUserEmail}</strong>
            {' '}(Tài khoản admin gốc: <strong>{adminEmail}</strong>)
          </span>
        </Space>
      }
      type="warning"
      action={
        <Button
          size="small"
          danger
          icon={<LogoutOutlined />}
          onClick={handleStopImpersonation}
          loading={loading}
        >
          Quay lại tài khoản Admin
        </Button>
      }
      banner
      closable={false}
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        zIndex: 999,
        borderRadius: 0,
      }}
    />
  )
}

export default ImpersonationBanner
