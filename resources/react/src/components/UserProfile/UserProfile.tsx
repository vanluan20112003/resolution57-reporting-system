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
  GlobalOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '../../services/profileService'
import { useAuth } from '../../shared/hooks'
import LanguageSwitcher from '../LanguageSwitcher'

const { Title, Text } = Typography

export default function UserProfile() {
  const { t } = useTranslation()
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
      message.error(error.message || t('profile.errors.loadFailed'))
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

      message.success(t('profile.success.updateSuccess'))
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
      message.error(error.message || t('profile.errors.updateFailed'))
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
      message.error(t('profile.errors.onlyImageAllowed'))
      return false
    }

    // Validate file size (2MB)
    const isLt2M = actualFile.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error(t('profile.errors.imageTooLarge'))
      return false
    }

    try {
      setUploading(true)
      const response = await uploadAvatar(actualFile)

      const updatedData = response.success ? response.data.user : response.user

      message.success(t('profile.success.uploadSuccess'))
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
      const errorMsg = error.errors?.avatar?.[0] || error.message || t('profile.errors.uploadFailed')
      message.error(errorMsg)
    } finally {
      setUploading(false)
    }

    return false // Prevent default upload behavior
  }

  // Handle avatar delete
  const handleDeleteAvatar = () => {
    Modal.confirm({
      title: t('profile.deleteAvatarConfirmTitle'),
      content: t('profile.deleteAvatarConfirmContent'),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setUploading(true)
          const response = await deleteAvatar()

          const updatedData = response.success ? response.data : response

          message.success(t('profile.success.deleteSuccess'))
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
          message.error(error.message || t('profile.errors.deleteFailed'))
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
    return t('profile.noInfo')
  }

  // Get translated role name
  const getRoleName = (role: string) => {
    const roleKey = `profile.roles.${role}` as const
    return t(roleKey)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <UserOutlined /> {t('profile.title')}
        </Title>
        <Space>
          <GlobalOutlined style={{ fontSize: 16 }} />
          <LanguageSwitcher />
        </Space>
      </div>

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
                    {t('profile.uploadAvatar')}
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
                    {t('profile.deleteAvatar')}
                  </Button>
                )}

                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  {t('profile.avatarMaxSize')}
                  <br />
                  {t('profile.avatarFormats')}
                </Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontSize: '18px', fontWeight: 600 }}>{t('profile.detailedInfo')}</span>}
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
                    <MailOutlined /> {t('profile.email')}:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>{user?.email}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    ({t('profile.cannotChange')})
                  </Text>
                </div>

                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    <TeamOutlined /> {t('profile.role')}:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>
                    {user?.role && getRoleName(user.role)}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    ({t('profile.cannotChange')})
                  </Text>
                </div>

                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    <BankOutlined /> {t('profile.organization')}:
                  </Text>{' '}
                  <Text style={{ fontSize: '14px' }}>{getOrganizationName()}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '20px' }}>
                    ({t('profile.cannotChange')})
                  </Text>
                </div>
              </Space>
            </div>

            <Divider orientation="left">{t('profile.editableInfo')}</Divider>

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
                    label={t('profile.firstName')}
                    name="first_name"
                    rules={[
                      { required: true, message: t('profile.errors.firstNameRequired') },
                      { max: 100, message: t('profile.errors.maxLength100') },
                    ]}
                  >
                    <Input placeholder={t('profile.firstNamePlaceholder')} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={t('profile.lastName')}
                    name="last_name"
                    rules={[
                      { required: true, message: t('profile.errors.lastNameRequired') },
                      { max: 100, message: t('profile.errors.maxLength100') },
                    ]}
                  >
                    <Input placeholder={t('profile.lastNamePlaceholder')} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={t('profile.phone')}
                name="phone"
                rules={[
                  { max: 20, message: t('profile.errors.maxLength20') },
                  { pattern: /^[0-9+\-\s()]*$/, message: t('profile.errors.invalidPhone') },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder={t('profile.phonePlaceholder')}
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
                  {t('profile.saveChanges')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
