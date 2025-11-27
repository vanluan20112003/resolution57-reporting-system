import { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import API_CONFIG from '../config/api'

interface ChangePasswordModalProps {
  visible: boolean
  onClose: () => void
}

interface ChangePasswordFormData {
  current_password: string
  new_password: string
  new_password_confirmation: string
}

function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: ChangePasswordFormData) => {
    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')

      const response = await fetch(API_CONFIG.AUTH.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        message.success(data.message || 'Đổi mật khẩu thành công!')
        form.resetFields()
        onClose()
      } else {
        message.error(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } catch (err) {
      message.error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="Đổi mật khẩu"
      open={visible}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Đổi mật khẩu"
      cancelText="Hủy"
      width={480}
    >
      <Form
        form={form}
        name="change-password"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="Mật khẩu hiện tại"
          name="current_password"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập mật khẩu hiện tại'
            }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu hiện tại"
            autoComplete="current-password"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="new_password"
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
            placeholder="Nhập mật khẩu mới"
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="new_password_confirmation"
          dependencies={['new_password']}
          rules={[
            {
              required: true,
              message: 'Vui lòng xác nhận mật khẩu mới'
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
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
      </Form>
    </Modal>
  )
}

export default ChangePasswordModal
