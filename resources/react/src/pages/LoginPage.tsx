import { useEffect, useRef } from 'react'
import { Typography, notification } from 'antd'
import { CloseCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { LoginForm, GoogleLoginButton } from '../features/auth'
import '../styles/LoginPage.css'

const { Title } = Typography

interface LoginPageProps {
  onLoginSuccess?: () => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [api, contextHolder] = notification.useNotification()
  const notificationShownRef = useRef(false)

  useEffect(() => {
    // Only show notification once using ref to avoid double notification in React Strict Mode
    if (notificationShownRef.current) return

    // Parse URL parameters manually
    const params = new URLSearchParams(location.search)
    const error = params.get('error')
    const msg = params.get('message')

    if (error === 'unauthorized' && msg) {
      const decodedMsg = decodeURIComponent(msg)

      // Mark as shown immediately before showing notification
      notificationShownRef.current = true

      // Show notification
      api.error({
        message: 'Không có quyền truy cập',
        description: decodedMsg,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 10,
        placement: 'topRight',
        style: {
          width: 450,
        },
      })

      // Clear URL params after showing notification
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 100)
    } else if (error) {
      // Mark as shown immediately before showing notification
      notificationShownRef.current = true

      api.error({
        message: 'Lỗi đăng nhập',
        description: 'Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.',
        duration: 8,
        placement: 'topRight',
      })

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 100)
    }
  }, [location.search, api, navigate])

  return (
    <div className="login-page">
      {contextHolder}
      <div className="login-box">
        {/* Language Switcher */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="login-logo">
          <img
            src="https://pms.vnuhcm.edu.vn/logo.png"
            alt="VNUHCM Logo"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* Title */}
        <Title level={2} className="login-title">
          {t('login.subtitle')}
        </Title>

        <Title level={3} className="login-subtitle">
          {t('login.title')}
        </Title>

        {/* Login Form - Using feature component */}
        <div className="login-form">
          <LoginForm onSuccess={onLoginSuccess} />

          <div className="login-divider">
            <span>{t('login.orLoginWith')}</span>
          </div>

          {/* Google Login Button - Using feature component */}
          <GoogleLoginButton text="Đăng nhập bằng tài khoản VNUHCM" />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
