import { useEffect, useState } from 'react'
import { Spin, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { exchangeGoogleCode } from '../features/auth/api/authApi'

const { Title, Text } = Typography

function GoogleCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [statusMessage, setStatusMessage] = useState('')

  // Set initial message after translation is ready
  useEffect(() => {
    setStatusMessage(t('login.processingLogin'))
  }, [t])

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search)
      const code = params.get('code')
      const error = params.get('error')
      const message = params.get('message')

      // Debug logging
      console.log('GoogleCallbackPage - All params:', Object.fromEntries(params))
      console.log('GoogleCallbackPage - code:', code ? 'present' : 'missing')
      console.log('GoogleCallbackPage - error:', error)

      // Check for errors from backend
      if (error) {
        console.error('Google login error:', error)
        const errorMessage = message ? decodeURIComponent(message) : error
        navigate('/login?error=' + encodeURIComponent(errorMessage))
        return
      }

      // SECURITY: New flow - Exchange authorization code for token
      if (code) {
        try {
          setStatusMessage(t('login.authenticating'))

          // Exchange code for token using API layer
          const data = await exchangeGoogleCode(code)

          if (data.success && data.data) {
            // Store token and user data
            localStorage.setItem('access_token', data.data.access_token)
            localStorage.setItem('user', JSON.stringify(data.data.user))
            localStorage.setItem('token_type', 'Bearer')

            setStatusMessage(t('login.loginSuccess'))

            // Redirect to dashboard
            setTimeout(() => {
              navigate('/dashboard')
              window.location.reload()
            }, 500)
          } else {
            console.error('Code exchange failed:', data.message)
            navigate('/login?error=' + encodeURIComponent(data.message || t('login.errors.authFailed')))
          }
        } catch (err) {
          console.error('Failed to exchange code:', err)
          navigate('/login?error=' + encodeURIComponent(t('login.errors.authError')))
        }
      } else {
        console.error('No code provided in callback')
        navigate('/login?error=missing_code')
      }
    }

    handleCallback()
  }, [location, navigate, t])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: '20px'
    }}>
      <Spin size="large" />
      <Title level={4}>{statusMessage}</Title>
      <Text type="secondary">{t('login.doNotClosePage')}</Text>
    </div>
  )
}

export default GoogleCallbackPage
