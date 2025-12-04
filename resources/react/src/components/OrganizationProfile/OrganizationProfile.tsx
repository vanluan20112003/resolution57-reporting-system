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
  Tabs,
  Table,
  Select,
  Popconfirm,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
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
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FlagOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons'
import {
  Organization,
  OrganizationMember,
  getMyOrganization,
  updateMyOrganization,
  uploadOrganizationAvatar,
  deleteOrganizationAvatar,
  getMyOrganizationMembers,
  updateMemberRole,
  removeMember,
  UpdateMyOrganizationRequest,
} from '../../services/organizationApi'
import { useAuth } from '../../shared/hooks'
import AddMemberModal from './AddMemberModal'
import './OrganizationProfile.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function OrganizationProfile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('info')

  // Members state
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersPagination, setMembersPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [membersSearch, setMembersSearch] = useState('')
  const [membersRoleFilter, setMembersRoleFilter] = useState<string | undefined>()
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganization()
  }, [])

  useEffect(() => {
    if (activeTab === 'members' && organization) {
      fetchMembers()
    }
  }, [activeTab, membersPagination.current, membersSearch, membersRoleFilter])

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

  const fetchMembers = async () => {
    try {
      setMembersLoading(true)
      const response = await getMyOrganizationMembers({
        search: membersSearch || undefined,
        role: membersRoleFilter,
        per_page: membersPagination.pageSize,
        page: membersPagination.current,
      })
      setMembers(response.data)
      setMembersPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách thành viên')
    } finally {
      setMembersLoading(false)
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

  const handleUpdateMemberRole = async (memberId: string, newRole: 'GUEST' | 'STAFF') => {
    try {
      setUpdatingMemberId(memberId)
      await updateMemberRole(memberId, newRole)
      message.success(`Đã ${newRole === 'STAFF' ? 'thăng cấp' : 'hạ cấp'} thành viên thành công`)
      fetchMembers()
    } catch (error: any) {
      message.error(error.message || 'Không thể cập nhật vai trò')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      setRemovingMemberId(memberId)
      await removeMember(memberId)
      message.success('Đã xóa thành viên khỏi đơn vị')
      fetchMembers()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa thành viên')
    } finally {
      setRemovingMemberId(null)
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

  // Simplified role display for organization members
  // Only show: Quản lý, Nhân viên (STAFF), Thành viên (GUEST, OPERATOR, ADMIN)
  const getRoleLabel = (role: string) => {
    if (role === 'MANAGER') return 'Quản lý'
    if (role === 'STAFF') return 'Nhân viên'
    // GUEST, OPERATOR, ADMIN all show as "Thành viên"
    return 'Thành viên'
  }

  const getRoleColor = (role: string) => {
    if (role === 'MANAGER') return 'green'
    if (role === 'STAFF') return 'blue'
    // GUEST, OPERATOR, ADMIN all use default color
    return 'default'
  }

  const getLastActivityDisplay = (dateStr?: string) => {
    if (!dateStr) return <Text type="secondary">Chưa hoạt động</Text>

    const date = new Date(dateStr)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 2) return <Tag color="green">Đang hoạt động</Tag>
    if (diffMinutes < 60) return <Tag color="blue">{diffMinutes} phút trước</Tag>

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return <Tag color="cyan">{diffHours} giờ trước</Tag>

    return <Text type="secondary">{date.toLocaleDateString('vi-VN')}</Text>
  }

  // Can current user edit organization info? (STAFF, MANAGER, OPERATOR, ADMIN - not GUEST)
  const canEdit = user && ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'].includes(user.role || '')

  // Can current user change member roles? (MANAGER, OPERATOR, ADMIN)
  const canChangeRoles = user && ['MANAGER', 'OPERATOR', 'ADMIN'].includes(user.role || '')

  const memberColumns: ColumnsType<OrganizationMember> = [
    {
      title: 'Thành viên',
      key: 'member',
      render: (_, record) => (
        <Space>
          <Avatar
            size={40}
            src={record.avatar_url}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <Text strong>{`${record.first_name} ${record.last_name}`}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hoạt động cuối',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 130,
      render: (date: string) => getLastActivityDisplay(date),
    },
    ...(canChangeRoles ? [{
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_: any, record: OrganizationMember) => {
        // Cannot change own record
        if (record.id === user?.id) {
          return <Text type="secondary">-</Text>
        }

        const isUpdating = updatingMemberId === record.id
        const isRemoving = removingMemberId === record.id
        const canChangeThisRole = ['GUEST', 'STAFF'].includes(record.role)
        // MANAGER cannot remove other MANAGERs
        const canRemoveThis = record.role !== 'MANAGER' || user?.role !== 'MANAGER'

        return (
          <Space size="small">
            {canChangeThisRole && (
              record.role === 'GUEST' ? (
                <Popconfirm
                  title="Thăng cấp thành viên"
                  description={`Bạn có chắc muốn thăng cấp ${record.first_name} ${record.last_name} lên Nhân viên?`}
                  onConfirm={() => handleUpdateMemberRole(record.id, 'STAFF')}
                  okText="Thăng cấp"
                  cancelText="Hủy"
                >
                  <Tooltip title="Thăng cấp lên Nhân viên">
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      loading={isUpdating}
                      style={{ color: '#52c41a' }}
                    />
                  </Tooltip>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="Hạ cấp nhân viên"
                  description={`Bạn có chắc muốn hạ cấp ${record.first_name} ${record.last_name} xuống Thành viên?`}
                  onConfirm={() => handleUpdateMemberRole(record.id, 'GUEST')}
                  okText="Hạ cấp"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Hạ cấp xuống Thành viên">
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      loading={isUpdating}
                      danger
                    />
                  </Tooltip>
                </Popconfirm>
              )
            )}
            {canRemoveThis && (
              <Popconfirm
                title="Xóa thành viên"
                description={`Bạn có chắc muốn xóa ${record.first_name} ${record.last_name} khỏi đơn vị?`}
                onConfirm={() => handleRemoveMember(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa khỏi đơn vị">
                  <Button
                    type="link"
                    size="small"
                    icon={<UserDeleteOutlined />}
                    loading={isRemoving}
                    danger
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        )
      },
    }] : []),
  ]

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

  const renderInfoTab = () => (
    <Card className="org-info-card">
      <div className="org-info-header">
        <Title level={4} style={{ margin: 0 }}>
          <BankOutlined /> Thông tin đơn vị
        </Title>
        {canEdit && (
          !isEditing ? (
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
          )
        )}
      </div>

      <Divider />

      {!isEditing ? (
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
  )

  const renderMembersTab = () => (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <Space wrap>
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={membersSearch}
            onChange={(e) => {
              setMembersSearch(e.target.value)
              setMembersPagination(prev => ({ ...prev, current: 1 }))
            }}
            allowClear
          />
          <Select
            placeholder="Lọc theo vai trò"
            style={{ width: 150 }}
            value={membersRoleFilter}
            onChange={(value) => {
              setMembersRoleFilter(value)
              setMembersPagination(prev => ({ ...prev, current: 1 }))
            }}
            allowClear
          >
            <Select.Option value="MANAGER">Quản lý</Select.Option>
            <Select.Option value="STAFF">Nhân viên</Select.Option>
            <Select.Option value="GUEST">Thành viên</Select.Option>
          </Select>
        </Space>
        {canEdit && (
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setAddMemberModalOpen(true)}
          >
            Thêm thành viên
          </Button>
        )}
      </div>

      <Table
        columns={memberColumns}
        dataSource={members}
        rowKey="id"
        loading={membersLoading}
        pagination={{
          current: membersPagination.current,
          pageSize: membersPagination.pageSize,
          total: membersPagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} thành viên`,
          onChange: (page, pageSize) => {
            setMembersPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || 10,
            }))
          },
        }}
      />

      <AddMemberModal
        open={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        onSuccess={() => fetchMembers()}
      />
    </Card>
  )

  const renderActivitiesTab = () => (
    <Card>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FlagOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
        <Title level={4} type="secondary">
          Quản lý hoạt động đơn vị
        </Title>
        <Text type="secondary">
          Chức năng này đang được phát triển. Vui lòng truy cập menu "Quản lý hoạt động" để xem danh sách hoạt động.
        </Text>
      </div>
    </Card>
  )

  const tabItems = [
    {
      key: 'info',
      label: (
        <span>
          <BankOutlined />
          Thông tin
        </span>
      ),
      children: renderInfoTab(),
    },
    {
      key: 'members',
      label: (
        <span>
          <TeamOutlined />
          Thành viên ({membersPagination.total || '...'})
        </span>
      ),
      children: renderMembersTab(),
    },
    {
      key: 'activities',
      label: (
        <span>
          <FlagOutlined />
          Hoạt động
        </span>
      ),
      children: renderActivitiesTab(),
    },
  ]

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
            {canEdit && (
              <>
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
              </>
            )}
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

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: 16 }}
      />
    </div>
  )
}

export default OrganizationProfile
