import React, { useEffect, useState } from 'react'
import { Typography, Button, Input, message } from 'antd'
import {
  ReloadOutlined,
  KeyOutlined,
  MailOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { MaintenanceStatus } from '../services/maintenanceApi'
import { bypassMaintenance } from '../services/maintenanceApi'

const { Title, Text } = Typography

interface MaintenancePageProps {
  status: MaintenanceStatus
  onBypassSuccess?: () => void
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ status, onBypassSuccess }) => {
  const [bypassKey, setBypassKey] = useState('')
  const [bypassLoading, setBypassLoading] = useState(false)
  const [showBypassInput, setShowBypassInput] = useState(false)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [hasReloaded, setHasReloaded] = useState(false)

  // Calculate countdown
  useEffect(() => {
    if (!status.show_countdown || !status.estimated_end_time) return

    const calculateCountdown = () => {
      const endTime = new Date(status.estimated_end_time!).getTime()
      const now = Date.now()
      const diff = Math.max(0, endTime - now)

      // Chỉ reload một lần khi countdown kết thúc
      if (diff === 0 && !hasReloaded) {
        setHasReloaded(true)
        // Đợi 1 giây rồi reload để tránh reload loop
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ hours, minutes, seconds })
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 1000)
    return () => clearInterval(interval)
  }, [status.show_countdown, status.estimated_end_time, hasReloaded])

  // Auto refresh every 2 minutes (only if countdown not active or has ended)
  useEffect(() => {
    // Không tự động reload nếu đang có countdown chạy
    if (status.show_countdown && status.estimated_end_time) {
      const endTime = new Date(status.estimated_end_time).getTime()
      if (endTime > Date.now()) {
        return // Countdown đang chạy, không cần auto refresh
      }
    }

    const interval = setInterval(() => {
      window.location.reload()
    }, 120000) // 2 phút thay vì 1 phút
    return () => clearInterval(interval)
  }, [status.show_countdown, status.estimated_end_time])

  const handleBypass = async () => {
    if (!bypassKey.trim()) {
      message.warning('Vui lòng nhập mã truy cập')
      return
    }

    setBypassLoading(true)
    try {
      await bypassMaintenance(bypassKey)
      message.success('Truy cập thành công!')
      if (onBypassSuccess) {
        onBypassSuccess()
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      message.error(error.message || 'Mã truy cập không hợp lệ')
    } finally {
      setBypassLoading(false)
    }
  }

  const endTime = status.estimated_end_time ? new Date(status.estimated_end_time).getTime() : null
  const showCountdown = status.show_countdown && endTime && endTime > Date.now()

  return (
    <div className="maintenance-page">
      <div className="maintenance-container">
        {/* Animated Background Elements */}
        <div className="bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        {/* Main Content */}
        <div className="maintenance-content">
          {/* Logo */}
          <div className="logo-section">
            <img
              src="/VNUHCM_logo.png"
              alt="VNUHCM"
              className="logo"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>

          {/* Animated Icon */}
          <div className="icon-wrapper">
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" className="gear-icon">
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
          </div>

          {/* Status Badge */}
          <div className={`status-badge ${status.notification_type}`}>
            <span className="status-dot"></span>
            <span>
              {status.notification_type === 'error'
                ? 'Bảo trì khẩn cấp'
                : status.notification_type === 'warning'
                ? 'Bảo trì theo lịch'
                : 'Đang nâng cấp'}
            </span>
          </div>

          {/* Title */}
          <Title level={1} className="maintenance-title">
            {status.title || 'Hệ thống đang bảo trì'}
          </Title>

          {/* Message */}
          <Text className="maintenance-message">
            {status.message || 'Chúng tôi đang nâng cấp hệ thống để mang đến trải nghiệm tốt hơn cho bạn. Vui lòng quay lại sau ít phút.'}
          </Text>

          {/* Countdown Timer */}
          {showCountdown && (
            <div className="countdown-section">
              <div className="countdown-label">
                <ClockCircleOutlined />
                <span>Dự kiến hoàn thành trong</span>
              </div>
              <div className="countdown-timer">
                <div className="time-block">
                  <span className="time-value">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="time-label">Giờ</span>
                </div>
                <span className="time-separator">:</span>
                <div className="time-block">
                  <span className="time-value">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="time-label">Phút</span>
                </div>
                <span className="time-separator">:</span>
                <div className="time-block">
                  <span className="time-value">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="time-label">Giây</span>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>

          {/* Actions */}
          <div className="actions-section">
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              className="reload-btn"
            >
              Kiểm tra lại
            </Button>

            {showBypassInput ? (
              <div className="bypass-input-group">
                <Input
                  placeholder="Nhập mã truy cập..."
                  value={bypassKey}
                  onChange={(e) => setBypassKey(e.target.value)}
                  onPressEnter={handleBypass}
                  prefix={<KeyOutlined style={{ color: '#9ca3af' }} />}
                  className="bypass-input"
                />
                <Button
                  type="primary"
                  loading={bypassLoading}
                  onClick={handleBypass}
                  className="bypass-submit-btn"
                >
                  Xác nhận
                </Button>
              </div>
            ) : (
              <button
                className="bypass-link"
                onClick={() => setShowBypassInput(true)}
              >
                <KeyOutlined />
                <span>Có mã truy cập?</span>
              </button>
            )}
          </div>

          {/* Contact */}
          <div className="contact-section">
            <Text className="contact-text">
              Cần hỗ trợ gấp? Liên hệ{' '}
              <a href="mailto:nq57@vnuhcm.edu.vn" className="contact-link">
                <MailOutlined /> nq57@vnuhcm.edu.vn
              </a>
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div className="maintenance-footer">
          <Text className="footer-text">
            NQ57 Portal - Đại học Quốc gia TP.HCM © {new Date().getFullYear()}
          </Text>
        </div>
      </div>

      <style>{`
        .maintenance-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .maintenance-container {
          width: 100%;
          max-width: 520px;
          position: relative;
          z-index: 1;
        }

        /* Animated Background Shapes */
        .bg-shapes {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.5;
          filter: blur(60px);
        }

        .shape-1 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          top: -100px;
          right: -100px;
          animation: float 20s ease-in-out infinite;
        }

        .shape-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          bottom: -50px;
          left: -50px;
          animation: float 25s ease-in-out infinite reverse;
        }

        .shape-3 {
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse-bg 15s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -30px); }
          50% { transform: translate(-20px, 20px); }
          75% { transform: translate(20px, 30px); }
        }

        @keyframes pulse-bg {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.2); }
        }

        /* Main Content */
        .maintenance-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          text-align: center;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            0 20px 25px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        /* Logo */
        .logo-section {
          margin-bottom: 32px;
        }

        .logo {
          height: 48px;
          opacity: 0.9;
        }

        /* Animated Icon */
        .icon-wrapper {
          position: relative;
          width: 88px;
          height: 88px;
          margin: 0 auto 28px;
        }

        .icon-circle {
          width: 88px;
          height: 88px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          box-shadow: 0 10px 30px -5px rgba(59, 130, 246, 0.5);
        }

        .gear-icon {
          width: 40px;
          height: 40px;
          color: white;
          animation: rotate 8s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pulse-ring {
          position: absolute;
          inset: -8px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse-ring 2s ease-out infinite;
        }

        .pulse-ring.delay-1 {
          animation-delay: 1s;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        /* Status Badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .status-badge.info {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-badge.warning {
          background: #fef3c7;
          color: #b45309;
        }

        .status-badge.error {
          background: #fee2e2;
          color: #b91c1c;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: blink 1.5s ease-in-out infinite;
        }

        .status-badge.info .status-dot { background: #3b82f6; }
        .status-badge.warning .status-dot { background: #f59e0b; }
        .status-badge.error .status-dot { background: #ef4444; }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Title & Message */
        .maintenance-title {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: #111827 !important;
          margin: 0 0 12px 0 !important;
          line-height: 1.3 !important;
        }

        .maintenance-message {
          display: block;
          font-size: 15px;
          color: #6b7280;
          line-height: 1.7;
          margin-bottom: 28px;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Countdown */
        .countdown-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 28px;
          border: 1px solid #e2e8f0;
        }

        .countdown-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .countdown-timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .time-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .time-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e40af;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .time-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          margin-top: 4px;
          letter-spacing: 0.5px;
        }

        .time-separator {
          font-size: 28px;
          font-weight: 600;
          color: #cbd5e1;
          margin-top: -16px;
        }

        /* Progress Bar */
        .progress-wrapper {
          margin-bottom: 28px;
        }

        .progress-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          width: 30%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8, #3b82f6);
          background-size: 200% 100%;
          border-radius: 2px;
          animation: shimmer 2s linear infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; transform: translateX(-100%); }
          100% { background-position: -200% 0; transform: translateX(400%); }
        }

        /* Actions */
        .actions-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .reload-btn {
          height: 44px !important;
          padding: 0 28px !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
          border: none !important;
          box-shadow: 0 4px 14px -3px rgba(59, 130, 246, 0.5) !important;
          transition: all 0.2s ease !important;
        }

        .reload-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px -3px rgba(59, 130, 246, 0.6) !important;
        }

        .bypass-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .bypass-link:hover {
          color: #3b82f6;
          background: #f3f4f6;
        }

        .bypass-input-group {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 320px;
        }

        .bypass-input {
          flex: 1;
          height: 40px !important;
          border-radius: 8px !important;
        }

        .bypass-submit-btn {
          height: 40px !important;
          border-radius: 8px !important;
        }

        /* Contact */
        .contact-section {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }

        .contact-text {
          font-size: 13px;
          color: #9ca3af;
        }

        .contact-link {
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .contact-link:hover {
          color: #1d4ed8;
        }

        /* Footer */
        .maintenance-footer {
          text-align: center;
          margin-top: 24px;
        }

        .footer-text {
          font-size: 12px;
          color: #9ca3af;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .maintenance-content {
            padding: 32px 24px;
          }

          .maintenance-title {
            font-size: 22px !important;
          }

          .time-value {
            font-size: 26px;
          }

          .time-block {
            min-width: 50px;
          }

          .icon-wrapper {
            width: 72px;
            height: 72px;
          }

          .icon-circle {
            width: 72px;
            height: 72px;
          }

          .gear-icon {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  )
}

export default MaintenancePage
