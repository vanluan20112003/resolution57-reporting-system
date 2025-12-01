import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Avatar,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Spin,
  Modal,
} from 'antd'
import {
  UserOutlined,
  UploadOutlined,
  SaveOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '../../services/profileService'
import { useAuth } from '../../shared/hooks'

const { Title, Text } = Typography

export default function UserProfile() {
  const { user: authUser, refreshUser } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Load user profile
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await getProfile()

      const profileData = response.success ? response.data : response

      setUser(profileData)
      form.setFieldsValue({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
      })
    } catch (error: any) {
      console.error('Profile load error:', error)
      message.error(error.message || 'Không thể tải thông tin người dùng')
    } finally {
      setLoading(false)
    }
  }

  // Handle profile update
  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true)
      const response = await updateProfile(values)

      const updatedData = response.success ? response.data : response

      message.success('Cập nhật thông tin thành công')
      setUser(updatedData)

      // Update localStorage user data
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        const updatedUser = { ...userData, ...updatedData }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }

      // Refresh auth user context
      if (refreshUser) {
        await refreshUser()
      }
    } catch (error: any) {
      console.error('Profile update error:', error)
      message.error(error.message || 'Không thể cập nhật thông tin')
    } finally {
      setLoading(false)
    }
  }

  // Handle avatar upload
  const handleAvatarUpload = async (file: any) => {
    // Ant Design modifies the File object directly
    let actualFile: File

    if (file.originFileObj) {
      actualFile = file.originFileObj
    } else {
      const arrayBuffer = await file.arrayBuffer()
      actualFile = new File([arrayBuffer], file.name, {
        type: file.type,
        lastModified: file.lastModified
      })
    }

    // Validate file type
    const isImage = actualFile.type.startsWith('image/')
    if (!isImage) {
      message.error('Vui lòng chỉ tải lên file hình ảnh!')
      return false
    }

    // Validate file size (2MB)
    const isLt2M = actualFile.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('Kích thước ảnh phải nhỏ hơn 2MB!')
      return false
    }

    try {
      setUploading(true)
      const response = await uploadAvatar(actualFile)

      const updatedData = response.success ? response.data.user : response.user

      message.success('Tải lên ảnh đại diện thành công')
      setUser(updatedData)

      // Update localStorage user data
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        const updatedUser = { ...userData, ...updatedData }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }

      // Refresh auth user context
      if (refreshUser) {
        await refreshUser()
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      const errorMsg = error.errors?.avatar?.[0] || error.message || 'Không thể tải lên ảnh đại diện'
      message.error(errorMsg)
    } finally {
      setUploading(false)
    }

    return false // Prevent default upload behavior
  }

  // Handle avatar delete
  const handleDeleteAvatar = () => {
    Modal.confirm({
      title: 'Xóa ảnh đại diện',
      content: 'Bạn có chắc chắn muốn xóa ảnh đại diện?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          setUploading(true)
          const response = await deleteAvatar()

          const updatedData = response.success ? response.data : response

          message.success('Xóa ảnh đại diện thành công')
          setUser(updatedData)

          // Update localStorage user data
          const userStr = localStorage.getItem('user')
          if (userStr) {
            const userData = JSON.parse(userStr)
            const updatedUser = { ...userData, avatar: null, avatar_url: null }
            localStorage.setItem('user', JSON.stringify(updatedUser))
          }

          // Refresh auth user context
          if (refreshUser) {
            await refreshUser()
          }
        } catch (error: any) {
          console.error('Avatar delete error:', error)
          message.error(error.message || 'Không thể xóa ảnh đại diện')
        } finally {
          setUploading(false)
        }
      },
    })
  }

  // Get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      // If avatar starts with http/https (Google avatar), use it directly
      if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
        return user.avatar
      }
      // If avatar is a relative path, prepend the base URL
      if (user.avatar.startsWith('avatars/')) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        return `${apiUrl.replace('/api/v1', '')}/storage/${user.avatar}`
      }
      return user.avatar
    }
    if (user?.avatar_url) {
      return user.avatar_url
    }
    return null
  }

  // Get organization name
  const getOrganizationName = () => {
    if (user?.organization) {
      return user.organization.name || user.organization.code || user.organization_id
    }
    if (user?.organization_id) {
      return user.organization_id
    }
    return 'Chưa có thông tin'
  }

  if (loading && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '0', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <UserOutlined /> Thông tin cá nhân
      </Title>

      <Row gutter={24}>
        {/* Avatar Section */}
        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={150}
                src={getAvatarUrl()}
                icon={<UserOutlined />}
                style={{
                  marginBottom: '16px',
                  border: '4px solid #f0f0f0'
                }}
              />
              <Title level={4} style={{ marginBottom: '8px', marginTop: '16px' }}>
                {user?.first_name} {user?.last_name}
              </Title>
              <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '16px' }}>
                {user?.email}
              </Text>

              <Divider />

              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Upload
                  showUploadList={false}
                  beforeUpload={handleAvatarUpload}
                  accept="image/*"
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={uploading}
                    block
                    size="large"
                    type="primary"
                  >
                    Tải lên ảnh đại diện
                  </Button>
                </Upload>

                {user?.avatar && !user.avatar.startsWith('http') && (
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={handleDeleteAvatar}
                    loading={uploading}
                    block
                    size="large"
                  >
                    Xóa ảnh đại diện
                  </Button>
                )}

                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  Kích thước tối đa: 2MB
                  <br />
                  Định dạng: JPG, PNG, GIF
                </Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontSize: '18px', fontWeight: 600 }}>Thông tin chi tiết</span>}
            bordered={false}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {/* Read-only information */}
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    <MailOutlined /> Email:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>{user?.email}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    (Không thể thay đổi)
                  </Text>
                </div>

                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    <TeamOutlined /> Vai trò:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>
                    {user?.role === 'ADMIN' && 'Quản trị viên'}
                    {user?.role === 'OPERATOR' && 'Điều hành'}
                    {user?.role === 'MANAGER' && 'Quản lý'}
                    {user?.role === 'STAFF' && 'Chuyên viên'}
                    {user?.role === 'GUEST' && 'Khách'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    (Không thể thay đổi)
                  </Text>
                </div>

                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    <BankOutlined /> Đơn vị:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>{getOrganizationName()}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    (Không thể thay đổi)
                  </Text>
                </div>
              </Space>
            </div>

            <Divider orientation="left">Thông tin có thể chỉnh sửa</Divider>

            {/* Editable form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Họ và tên đệm"
                    name="first_name"
                    rules={[
                      { required: true, message: 'Vui lòng nhập họ và tên đệm' },
                      { max: 100, message: 'Tối đa 100 ký tự' },
                    ]}
                  >
                    <Input placeholder="Nguyễn Văn" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tên"
                    name="last_name"
                    rules={[
                      { required: true, message: 'Vui lòng nhập tên' },
                      { max: 100, message: 'Tối đa 100 ký tự' },
                    ]}
                  >
                    <Input placeholder="A" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[
                  { max: 20, message: 'Tối đa 20 ký tự' },
                  { pattern: /^[0-9+\-\s()]*$/, message: 'Số điện thoại không hợp lệ' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="0123456789"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  Lưu thay đổi
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
