/**
 * Google Login Button Component
 * Handles Google OAuth authentication
 */

import { Button } from 'antd'
import { GoogleOutlined } from '@ant-design/icons'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { LoadingOverlay } from '../../../shared/components'

interface GoogleLoginButtonProps {
  text?: string
  block?: boolean
  style?: React.CSSProperties
}

function GoogleLoginButton({
  text = 'Đăng nhập bằng tài khoản VNUHCM',
  block = true,
  style
}: GoogleLoginButtonProps) {
  const { loginWithGoogle, loading } = useGoogleAuth()

  return (
    <>
      <LoadingOverlay loading={loading} message="Đang chuyển đến Google..." />
      <Button
        icon={<GoogleOutlined />}
        onClick={loginWithGoogle}
        loading={loading}
        disabled={loading}
        block={block}
        style={{
          height: 45,
          background: 'linear-gradient(135deg, #4285f4 0%, #357ae8 100%)',
          borderColor: '#4285f4',
          color: '#fff',
          fontWeight: 500,
          fontSize: '15px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px 0 rgba(66, 133, 244, 0.25)',
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #357ae8 0%, #2a5dcc 100%)'
            e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(66, 133, 244, 0.35)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #4285f4 0%, #357ae8 100%)'
            e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(66, 133, 244, 0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        {text}
      </Button>
    </>
  )
}

export default GoogleLoginButton
