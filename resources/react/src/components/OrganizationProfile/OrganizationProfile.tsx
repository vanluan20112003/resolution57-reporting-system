import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  message,
  Avatar,
  Spin,
  Descriptions,
  Tag,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  BankOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import {
  Organization,
  getMyOrganization,
  updateMyOrganization,
  uploadOrganizationAvatar,
  deleteOrganizationAvatar,
  UpdateMyOrganizationRequest,
} from '../../services/organizationApi'
import './OrganizationProfile.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function OrganizationProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrganization()
  }, [])

  const fetchOrganization = async () => {
    try {
      setLoading(true)
      const response = await getMyOrganization()
      setOrganization(response.data)
      form.setFieldsValue(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải thông tin đơn vị')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    form.setFieldsValue(organization)
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.setFieldsValue(organization)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const updateData: UpdateMyOrganizationRequest = {
        name: values.name,
        short_name: values.short_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        address: values.address,
        website: values.website,
        description: values.description,
      }

      const response = await updateMyOrganization(updateData)
      setOrganization(response.data)
      setIsEditing(false)
      message.success('Đã cập nhật thông tin đơn vị thành công')
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || 'Có lỗi xảy ra khi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('Vui lòng chọn file ảnh (JPEG, PNG, GIF, WebP)')
      return
    }

    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const response = await uploadOrganizationAvatar(file)
      setOrganization(prev => prev ? {
        ...prev,
        avatar: response.data.avatar,
        avatar_url: response.data.avatar_url,
      } : null)
      message.success('Đã cập nhật logo đơn vị')
    } catch (error: any) {
      message.error(error.message || 'Không thể upload logo')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      setUploadingAvatar(true)
      await deleteOrganizationAvatar()
      setOrganization(prev => prev ? {
        ...prev,
        avatar: null,
        avatar_url: null,
      } : null)
      message.success('Đã xóa logo đơn vị')
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa logo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getOrganizationTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      UNIVERSITY_SYSTEM: 'Đại học Quốc gia',
      UNIVERSITY: 'Trường thành viên',
      RESEARCH_INSTITUTE: 'Viện nghiên cứu',
      CENTER: 'Trung tâm',
      DEPARTMENT: 'Phòng ban',
      EXTERNAL: 'Đơn vị ngoài',
    }
    return typeLabels[type] || type
  }

  const getOrganizationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      UNIVERSITY_SYSTEM: 'purple',
      UNIVERSITY: 'blue',
      RESEARCH_INSTITUTE: 'cyan',
      CENTER: 'green',
      DEPARTMENT: 'orange',
      EXTERNAL: 'default',
    }
    return colors[type] || 'default'
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Đang tải thông tin đơn vị...</Text>
          </div>
        </div>
      </Card>
    )
  }

  if (!organization) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <BankOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            Bạn chưa được gán vào đơn vị nào
          </Title>
          <Text type="secondary">
            Vui lòng liên hệ quản trị viên để được gán vào đơn vị phù hợp
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <div className="organization-profile">
      {/* Header Section with Avatar */}
      <Card className="org-header-card">
        <div className="org-header-section">
          <div className="org-avatar-wrapper">
            <Spin spinning={uploadingAvatar}>
              <Avatar
                size={100}
                src={organization.avatar_url}
                icon={<BankOutlined />}
                className="org-avatar"
              />
            </Spin>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div className="org-avatar-actions">
              <Button
                type="primary"
                size="small"
                icon={<UploadOutlined />}
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                Đổi logo
              </Button>
              {organization.avatar && (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteAvatar}
                  disabled={uploadingAvatar}
                >
                  Xóa
                </Button>
              )}
            </div>
          </div>

          <div className="org-header-info">
            <Title level={3} style={{ marginBottom: 4 }}>
              {organization.name}
            </Title>
            <Space wrap>
              <Tag color={getOrganizationTypeColor(organization.type)}>
                {getOrganizationTypeLabel(organization.type)}
              </Tag>
              <Tag color={organization.is_vnuhcm ? 'blue' : 'default'}>
                {organization.is_vnuhcm ? 'ĐHQG-HCM' : 'Đơn vị ngoài'}
              </Tag>
              <Tag color={organization.status === 'active' ? 'success' : 'default'}>
                {organization.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
              </Tag>
            </Space>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="org-info-card">
        <div className="org-info-header">
          <Title level={4} style={{ margin: 0 }}>
            <BankOutlined /> Thông tin đơn vị
          </Title>
          {!isEditing ? (
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              Chỉnh sửa
            </Button>
          ) : (
            <Space>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                Hủy
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                Lưu thay đổi
              </Button>
            </Space>
          )}
        </div>

        <Divider />

        {!isEditing ? (
          // View Mode
          <Descriptions column={{ xs: 1, sm: 2 }} bordered>
            <Descriptions.Item label="Mã đơn vị">
              <Text strong style={{ color: '#1890ff' }}>{organization.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên viết tắt">
              {organization.short_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tên đầy đủ" span={2}>
              {organization.name}
            </Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> Email liên hệ</>}>
              {organization.contact_email ? (
                <a href={`mailto:${organization.contact_email}`}>{organization.contact_email}</a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined /> Điện thoại</>}>
              {organization.contact_phone ? (
                <a href={`tel:${organization.contact_phone}`}>{organization.contact_phone}</a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={<><GlobalOutlined /> Website</>} span={2}>
              {organization.website ? (
                <a href={organization.website} target="_blank" rel="noopener noreferrer">
                  {organization.website}
                </a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={<><EnvironmentOutlined /> Địa chỉ</>} span={2}>
              {organization.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>
              <Paragraph style={{ marginBottom: 0 }}>
                {organization.description || 'Chưa có mô tả'}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          // Edit Mode
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="name"
                  label="Tên đầy đủ"
                  rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}
                >
                  <Input placeholder="Nhập tên đầy đủ của đơn vị" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="short_name" label="Tên viết tắt">
                  <Input placeholder="VD: KHTN" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="contact_email"
                  label="Email liên hệ"
                  rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="contact_phone" label="Điện thoại">
                  <Input prefix={<PhoneOutlined />} placeholder="028 xxxx xxxx" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="website"
              label="Website"
              rules={[{ type: 'url', message: 'URL không hợp lệ' }]}
            >
              <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
            </Form.Item>

            <Form.Item name="address" label="Địa chỉ">
              <Input prefix={<EnvironmentOutlined />} placeholder="Nhập địa chỉ đơn vị" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả">
              <TextArea rows={4} placeholder="Nhập mô tả về đơn vị..." />
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  )
}

export default OrganizationProfile
