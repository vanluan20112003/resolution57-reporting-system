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
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderColor: '#f093fb',
          color: '#fff',
          fontWeight: 500,
          boxShadow: '0 4px 15px 0 rgba(245, 87, 108, 0.35)',
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)'
            e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(245, 87, 108, 0.45)'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            e.currentTarget.style.boxShadow = '0 4px 15px 0 rgba(245, 87, 108, 0.35)'
          }
        }}
      >
        {text}
      </Button>
    </>
  )
}

export default GoogleLoginButton
