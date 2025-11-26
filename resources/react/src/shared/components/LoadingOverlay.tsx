/**
 * Loading Overlay Component
 * Full-screen loading overlay for async operations
 */

import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface LoadingOverlayProps {
  loading: boolean
  message?: string
  size?: 'small' | 'default' | 'large'
  fullScreen?: boolean
}

function LoadingOverlay({
  loading,
  message = 'Đang xử lý...',
  size = 'large',
  fullScreen = true
}: LoadingOverlayProps) {
  if (!loading) return null

  const spinIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'default' ? 32 : 24 }} spin />

  return (
    <div
      style={{
        position: fullScreen ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 9999,
        gap: 16,
      }}
    >
      <Spin indicator={spinIcon} size={size} />
      {message && (
        <div
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: 500,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}

export default LoadingOverlay
