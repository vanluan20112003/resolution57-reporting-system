import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import API_CONFIG from '../config/api'
import '../styles/LoginPage.css'

const { Title, Text } = Typography

interface ResetPasswordFormData {
  password: string
  password_confirmation: string
}

function ResetPasswordPage() {
  const [form] = Form.useForm()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setError('Link không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.')
    }
  }, [token, email])

  const handleSubmit = async (values: ResetPasswordFormData) => {
    if (!token || !email) {
      setError('Link không hợp lệ.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(API_CONFIG.AUTH.RESET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          token: token,
          password: values.password,
          password_confirmation: values.password_confirmation,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        setError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
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
          Đặt lại mật khẩu
        </Title>

        <Text type="secondary" style={{ display: 'block', marginBottom: 24, textAlign: 'center' }}>
          Nhập mật khẩu mới của bạn
        </Text>

        {/* Success Message */}
        {success && (
          <Alert
            message="Đặt lại mật khẩu thành công!"
            description="Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển đến trang đăng nhập..."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Error Message */}
        {error && (
          <Alert
            message="Lỗi"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Form */}
        {!success && token && email && (
          <Form
            form={form}
            name="reset-password"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập mật khẩu mới'
                },
                {
                  min: 6,
                  message: 'Mật khẩu phải có ít nhất 6 ký tự'
                }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Mật khẩu mới"
                autoComplete="new-password"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password_confirmation"
              dependencies={['password']}
              rules={[
                {
                  required: true,
                  message: 'Vui lòng xác nhận mật khẩu mới'
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu mới"
                autoComplete="new-password"
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
                Đặt lại mật khẩu
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Back to Login Link */}
        {!success && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/login" style={{ color: '#667eea', fontWeight: 500 }}>
              Quay lại đăng nhập
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
