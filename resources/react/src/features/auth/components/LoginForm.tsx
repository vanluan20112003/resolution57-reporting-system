/**
 * Login Form Component
 * Handles email/password authentication
 */

import { Form, Input, Button } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'
import { LoadingOverlay } from '../../../shared/components'

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onSuccess?: () => void
}

function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation()
  const { login, loading } = useLogin()
  const [form] = Form.useForm()

  const handleSubmit = async (values: LoginFormData) => {
    await login(values)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <>
      <LoadingOverlay loading={loading} message="Đang đăng nhập..." />
      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          name="email"
          rules={[
            {
              required: true,
              message: '📧 Vui lòng nhập địa chỉ email của bạn'
            },
            {
              type: 'email',
              message: '❌ Email không đúng định dạng. Ví dụ: user@vnuhcm.edu.vn'
            },
          ]}
          validateTrigger={['onBlur', 'onChange']}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Nhập email của bạn"
            autoComplete="email"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: '🔐 Vui lòng nhập mật khẩu của bạn'
            },
            {
              min: 6,
              message: '⚠️ Mật khẩu phải có ít nhất 6 ký tự'
            }
          ]}
          validateTrigger={['onBlur', 'onChange']}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            disabled={loading}
          />
        </Form.Item>

        {/* Forgot Password Link */}
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link
            to="/forgot-password"
            style={{
              color: '#667eea',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            disabled={loading}
            style={{
              height: 45,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderColor: '#667eea',
              fontWeight: 500,
              boxShadow: '0 4px 15px 0 rgba(102, 126, 234, 0.35)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(102, 126, 234, 0.45)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                e.currentTarget.style.boxShadow = '0 4px 15px 0 rgba(102, 126, 234, 0.35)'
              }
            }}
          >
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

export default LoginForm
