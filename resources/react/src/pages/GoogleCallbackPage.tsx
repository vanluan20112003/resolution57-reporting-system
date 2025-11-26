import { useEffect } from 'react'
import { Spin, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'

const { Title } = Typography

function GoogleCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleCallback = () => {
      const params = new URLSearchParams(location.search)
      const token = params.get('token')
      const userStr = params.get('user')
      const error = params.get('error')
      const reason = params.get('reason')

      // Debug logging
      console.log('GoogleCallbackPage - All params:', Object.fromEntries(params))
      console.log('GoogleCallbackPage - reason:', reason)
      console.log('GoogleCallbackPage - token:', token)
      console.log('GoogleCallbackPage - error:', error)

      // Check if this is an unauthorized redirect
      if (reason === 'email_not_authorized') {
        console.log('Redirecting to unauthorized page...')
        navigate('/unauthorized?reason=' + reason)
        return
      }

      if (error) {
        console.error('Google login error:', error)
        navigate('/login?error=' + error)
        return
      }

      if (token && userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr))

          // Store token and user data
          localStorage.setItem('access_token', token)
          localStorage.setItem('user', JSON.stringify(user))
          localStorage.setItem('token_type', 'Bearer')

          // Redirect to dashboard
          navigate('/dashboard')
          window.location.reload()
        } catch (err) {
          console.error('Failed to parse user data:', err)
          navigate('/login?error=invalid_data')
        }
      } else {
        navigate('/login?error=missing_data')
      }
    }

    handleCallback()
  }, [location, navigate])

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
      <Title level={4}>Đang xử lý đăng nhập...</Title>
    </div>
  )
}

export default GoogleCallbackPage
