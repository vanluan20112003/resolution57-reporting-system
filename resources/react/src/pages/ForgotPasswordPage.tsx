import { useState } from 'react'
import { Form, Input, Button, Typography, Alert } from 'antd'
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import API_CONFIG from '../config/api'
import LanguageSwitcher from '../components/LanguageSwitcher'
import '../styles/LoginPage.css'

const { Title, Text } = Typography

interface ForgotPasswordFormData {
  email: string
}

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: ForgotPasswordFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(API_CONFIG.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        form.resetFields()
      } else {
        setError(data.message || t('forgotPassword.errors.serverError'))
      }
    } catch (err) {
      setError(t('forgotPassword.errors.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Language Switcher - góc phải trên màn hình */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      <div className="login-box" style={{ maxWidth: 500 }}>
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
          {t('forgotPassword.title')}
        </Title>

        <Text type="secondary" style={{ display: 'block', marginBottom: 24, textAlign: 'center' }}>
          {t('forgotPassword.description')}
        </Text>

        {/* Success Message */}
        {success && (
          <Alert
            message={t('forgotPassword.successTitle')}
            description={t('forgotPassword.successDescription')}
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Error Message */}
        {error && (
          <Alert
            message={t('forgotPassword.errorTitle')}
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Form */}
        <Form
          form={form}
          name="forgot-password"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              {
                required: true,
                message: t('forgotPassword.errors.emailRequired')
              },
              {
                type: 'email',
                message: t('forgotPassword.errors.emailInvalid')
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('forgotPassword.emailPlaceholder')}
              autoComplete="email"
              disabled={loading}
            />
          </Form.Item>

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
            >
              {t('forgotPassword.submitButton')}
            </Button>
          </Form.Item>
        </Form>

        {/* Back to Login Link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#667eea', fontWeight: 500 }}>
            <ArrowLeftOutlined style={{ marginRight: 8 }} />
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
