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
      <LoadingOverlay loading={loading} message={t('login.loggingIn')} />
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
              message: t('login.errors.emailRequired')
            },
            {
              type: 'email',
              message: t('login.errors.emailInvalid')
            },
          ]}
          validateTrigger={['onBlur', 'onChange']}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('login.emailPlaceholder')}
            autoComplete="email"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: t('login.errors.passwordRequired')
            },
            {
              min: 6,
              message: t('login.errors.passwordMinLength')
            }
          ]}
          validateTrigger={['onBlur', 'onChange']}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('login.passwordPlaceholder')}
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
            {t('login.forgotPassword')}
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
            {t('login.loginButton')}
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

export default LoginForm
