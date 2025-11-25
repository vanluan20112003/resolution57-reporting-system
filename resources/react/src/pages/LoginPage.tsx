import { useState } from 'react'
import { Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import type { LoginFormData } from '../types/auth'
import '../styles/LoginPage.css'

const { Title, Text, Link } = Typography

interface LoginPageProps {
  onLoginSuccess?: () => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true)
    try {
      // Tạm thời chỉ log form data (chưa kết nối backend)
      console.log('Login form submitted:', values)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      message.success('Đăng nhập thành công!')

      // Mock token data
      const mockTokenData = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        user: {
          email: values.email,
          name: 'Test User',
          sub: '12345'
        }
      }

      // Store in localStorage (temporary)
      localStorage.setItem('access_token', mockTokenData.access_token)
      localStorage.setItem('refresh_token', mockTokenData.refresh_token || '')
      localStorage.setItem('token_expires_at', String(Date.now() + mockTokenData.expires_in * 1000))

      if (onLoginSuccess) {
        onLoginSuccess()
      }

      // Refresh page to update auth state
      window.location.reload()
    } catch (error) {
      console.error('Login error:', error)
      message.error('Đăng nhập thất bại. Vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  const handleSSOLogin = () => {
    // Redirect to SSO login endpoint
    window.location.href = '/api/v1/auth/sso/login'
  }

  return (
    <div className="login-page">
      <div className="login-box">
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
          CỔNG THÔNG TIN NGHỊ QUYẾT 57
        </Title>

        <Title level={3} className="login-subtitle">
          ĐĂNG NHẬP
        </Title>

        {/* Register link */}
        <div className="login-register">
          <Text>Chưa có tài khoản? </Text>
          <Link href="#">Tạo tài khoản</Link>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          className="login-form"
          layout="vertical"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <div className="login-forgot">
            <Link href="#">Quên mật khẩu?</Link>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-btn"
            >
              Đăng nhập
            </Button>
          </Form.Item>

          <div className="login-divider"></div>

          <Form.Item>
            <Button
              type="default"
              onClick={handleSSOLogin}
              block
              className="sso-btn"
            >
              Đăng nhập bằng tài khoản VNUHCM
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
