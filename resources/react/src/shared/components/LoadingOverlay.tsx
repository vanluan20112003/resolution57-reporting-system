/**
 * Loading Overlay Component
 * Full-screen loading overlay for async operations
 * Uses React Portal to ensure it renders at document body level
 */

import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { createPortal } from 'react-dom'

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

  const overlay = (
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

  // Use portal to render at document body level for fullScreen mode
  if (fullScreen) {
    return createPortal(overlay, document.body)
  }

  return overlay
}

export default LoadingOverlay
