import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tooltip,
  Typography,
  Row,
  Col,
  Divider,
  Switch,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  LoginOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../../shared/hooks'
import * as userApi from '../../services/userApi'
import * as organizationApi from '../../services/organizationApi'
import type { User } from '../../services/userApi'
import type { Organization, OrganizationStatus } from '../../services/organizationApi'
import './UserManagement.css'

const { Title, Text } = Typography
const { Option } = Select

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  OPERATOR: 'purple',
  MANAGER: 'blue',
  STAFF: 'green',
  GUEST: 'default',
}

const statusColors: Record<string, string> = {
  active: 'success',
  inactive: 'warning',
  locked: 'error',
}

function UserManagement() {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  // Load pagination from localStorage, default to page 1
  const [pagination, setPagination] = useState(() => {
    const saved = localStorage.getItem('user_management_pagination')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { current: 1, pageSize: 10, total: 0 }
      }
    }
    return { current: 1, pageSize: 10, total: 0 }
  })
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(false)
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Detect mobile view for responsive column visibility
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768)

  // Check if current user can manage users
  const canManage = currentUser?.role === 'OPERATOR' || currentUser?.role === 'ADMIN'

  // Window resize listener for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Save pagination to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('user_management_pagination', JSON.stringify(pagination))
  }, [pagination])

  // Initial load
  useEffect(() => {
    if (canManage) {
      fetchUsers(pagination.current, pagination.pageSize)
      fetchOrganizations()
    }
  }, [canManage])

  // Fetch organizations for dropdown
  const fetchOrganizations = async () => {
    setLoadingOrganizations(true)
    try {
      const response = await organizationApi.getOrganizationList({
        status: 'active' as OrganizationStatus,
        per_page: 100,
        page: 1,
      })
      if (response.success) {
        setOrganizations(response.data)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrganizations(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    if (!canManage) return

    const timeoutId = setTimeout(() => {
      fetchUsers(1, pagination.pageSize) // Reset to page 1 when filters change
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchText, roleFilter, statusFilter, canManage, pagination.pageSize])

  const fetchUsers = async (page: number = 1, pageSize: number = 10) => {
    setLoading(true)
    try {
      const response = await userApi.getUsers({
        search: searchText || undefined,
        role: roleFilter,
        status: statusFilter,
        per_page: pageSize,
        page: page,
      })

      if (response.success) {
        setUsers(response.data)
        setPagination({
          current: response.pagination.current_page,
          pageSize: response.pagination.per_page,
          total: response.pagination.total,
        })
      } else {
        message.error(response.message || 'Không thể tải danh sách người dùng')
      }
    } catch (error: any) {
      // Display specific error message from API
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải danh sách người dùng'
      message.error(errorMessage, 5) // Show for 5 seconds
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    // Set form values, converting is_vnuhcm to boolean for Switch
    form.setFieldsValue({
      ...user,
      is_vnuhcm: user.is_vnuhcm ? true : false,
    })
    setEditModalVisible(true)
  }

  const handleDelete = (userId: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa người dùng này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const response = await userApi.deleteUser(userId)
          if (response.success) {
            message.success(response.message || 'Xóa người dùng thành công')
            fetchUsers(pagination.current, pagination.pageSize)
          } else {
            message.error(response.message || 'Không thể xóa người dùng')
          }
        } catch (error: any) {
          // Display specific error message from API
          const errorMessage = error.message || 'Có lỗi xảy ra khi xóa người dùng'
          message.error(errorMessage, 5) // Show for 5 seconds
          console.error('Error deleting user:', error)
        }
      },
    })
  }

  const handleImpersonate = (user: User) => {
    Modal.confirm({
      title: 'Xác nhận đăng nhập với tư cách người dùng khác',
      content: (
        <div>
          <p>Bạn có chắc chắn muốn đăng nhập với tư cách:</p>
          <p><strong>{user.first_name} {user.last_name}</strong> ({user.email})?</p>
          <p style={{ color: '#faad14', marginTop: 10 }}>
            ⚠️ Phiên đăng nhập hiện tại của bạn sẽ được thay thế.
          </p>
        </div>
      ),
      okText: 'Đăng nhập',
      okType: 'primary',
      cancelText: 'Hủy',
      onOk: async () => {
        setActionLoading(true)
        try {
          const response = await userApi.impersonateUser(user.id)
          if (response.success) {
            // Update user data in localStorage with impersonated user's data
            const impersonatedUserData = {
              id: response.data.user.id,
              name: `${response.data.user.first_name} ${response.data.user.last_name}`.trim(),
              email: response.data.user.email,
              avatar: null,
              avatar_url: null,
              role: response.data.user.role,
            }

            // Store all data synchronously before reload
            localStorage.setItem('impersonation_admin_id', response.data.original_admin.id)
            localStorage.setItem('impersonation_admin_email', response.data.original_admin.email)
            localStorage.setItem('access_token', response.data.access_token)
            localStorage.setItem('user', JSON.stringify(impersonatedUserData))

            // Show success message
            message.success(`Đã đăng nhập với tư cách ${response.data.user.email}`)

            // Delay reload to ensure localStorage is saved and message is shown
            setTimeout(() => {
              window.location.href = '/dashboard?tab=home'
            }, 500)
          } else {
            message.error(response.message || 'Không thể đăng nhập với tư cách người dùng khác')
            setActionLoading(false)
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Có lỗi xảy ra khi đăng nhập'
          message.error(errorMessage, 5)
          console.error('Error impersonating user:', error)
          setActionLoading(false)
        }
      },
    })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      setActionLoading(true)

      if (selectedUser) {
        // Update existing user
        const updateData = { ...values }

        // OPERATOR restrictions:
        // 1. Cannot change role of any OPERATOR/ADMIN (including themselves)
        // 2. Cannot assign OPERATOR/ADMIN role to anyone
        if (currentUser?.role === 'OPERATOR') {
          // If editing OPERATOR/ADMIN user, don't send role
          if (['ADMIN', 'OPERATOR'].includes(selectedUser.role)) {
            delete updateData.role
          }
          // If trying to set role to OPERATOR/ADMIN, don't send role
          if (['ADMIN', 'OPERATOR'].includes(updateData.role)) {
            delete updateData.role
          }
        }

        const response = await userApi.updateUser(selectedUser.id, updateData)
        if (response.success) {
          message.success(response.message || 'Cập nhật người dùng thành công')
          setEditModalVisible(false)
          form.resetFields()
          setSelectedUser(null)
          fetchUsers(pagination.current, pagination.pageSize)
        } else {
          message.error(response.message || 'Không thể cập nhật người dùng')
        }
      } else {
        // Create new user
        const response = await userApi.createUser(values)
        if (response.success) {
          message.success(response.message || 'Thêm người dùng thành công')
          setEditModalVisible(false)
          form.resetFields()
          setSelectedUser(null)
          fetchUsers(1, pagination.pageSize) // Go to first page
        } else {
          message.error(response.message || 'Không thể thêm người dùng')
        }
      }
    } catch (error: any) {
      // Display specific error message from API
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu người dùng'
      message.error(errorMessage, 5) // Show for 5 seconds
      console.error('Error saving user:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<User> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      fixed: isMobile ? false : 'left',
      width: isMobile ? 180 : 250,
      ellipsis: true,
    },
    {
      title: 'Họ và tên',
      key: 'name',
      width: isMobile ? 150 : 200,
      ellipsis: true,
      render: (_, record) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={roleColors[role] || 'default'}>{role}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      className: isMobile ? 'ant-table-cell-mobile-hide' : '',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status === 'active' ? 'Hoạt động' : status === 'inactive' ? 'Không hoạt động' : 'Khóa'}
        </Tag>
      ),
    },
    {
      title: 'VNUHCM',
      dataIndex: 'is_vnuhcm',
      key: 'is_vnuhcm',
      width: 80,
      className: isMobile ? 'ant-table-cell-mobile-hide' : '',
      render: (isVnuhcm: boolean) => (
        <Tag color={isVnuhcm ? 'blue' : 'default'}>
          {isVnuhcm ? 'Có' : 'Không'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      className: isMobile ? 'ant-table-cell-mobile-hide' : '',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: isMobile ? false : 'right',
      width: isMobile ? 120 : 150,
      render: (_, record) => (
        <Space size={isMobile ? 2 : 8} direction={isMobile ? 'horizontal' : 'horizontal'}>
          <Tooltip title={
            // OPERATOR cannot edit other OPERATOR/ADMIN
            currentUser?.role === 'OPERATOR' &&
            ['ADMIN', 'OPERATOR'].includes(record.role) &&
            record.id !== currentUser?.id
              ? 'OPERATOR không được sửa ADMIN/OPERATOR khác'
              : 'Chỉnh sửa'
          }>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={
                !canManage ||
                // OPERATOR cannot edit other OPERATOR/ADMIN (except themselves)
                (currentUser?.role === 'OPERATOR' &&
                  ['ADMIN', 'OPERATOR'].includes(record.role) &&
                  record.id !== currentUser?.id)
              }
              size={isMobile ? 'small' : 'middle'}
            />
          </Tooltip>
          {currentUser?.role === 'ADMIN' && record.id !== currentUser?.id && (
            <Tooltip title="Đăng nhập với tư cách người dùng này">
              <Button
                type="text"
                icon={<LoginOutlined />}
                onClick={() => handleImpersonate(record)}
                style={{ color: '#1890ff' }}
                size={isMobile ? 'small' : 'middle'}
              />
            </Tooltip>
          )}
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              disabled={!canManage || record.id === currentUser?.id}
              size={isMobile ? 'small' : 'middle'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // Check if impersonating
  const isImpersonating = localStorage.getItem('impersonation_admin_id') !== null

  if (!canManage) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <UserOutlined style={{ fontSize: '48px', color: '#ccc' }} />
          <Title level={4}>Không có quyền truy cập</Title>
          <Text type="secondary">
            {isImpersonating
              ? 'Bạn đang impersonate user không có quyền quản lý người dùng. Chỉ OPERATOR và ADMIN mới có quyền này.'
              : 'Bạn không có quyền quản lý người dùng. Chỉ OPERATOR và ADMIN mới có quyền này.'}
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <Card
      style={{ position: 'relative' }}
      title={
        <Space>
          <UserOutlined />
          <span>Quản lý người dùng</span>
        </Space>
      }
      extra={
        <Space className="user-management-card-header" wrap>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
          />
          <Select
            placeholder="Vai trò"
            allowClear
            style={{ width: isMobile ? '100%' : 120 }}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="ADMIN">ADMIN</Option>
            <Option value="OPERATOR">OPERATOR</Option>
            <Option value="MANAGER">MANAGER</Option>
            <Option value="STAFF">STAFF</Option>
            <Option value="GUEST">GUEST</Option>
          </Select>
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: isMobile ? '100%' : 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="active">Hoạt động</Option>
            <Option value="inactive">Không hoạt động</Option>
            <Option value="locked">Khóa</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchUsers(pagination.current, pagination.pageSize)}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            {isMobile ? 'Làm mới' : 'Làm mới'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedUser(null)
              form.resetFields()
              setEditModalVisible(true)
            }}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Thêm người dùng
          </Button>
        </Space>
      }
    >
      <div className="user-management-table">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: isMobile ? 600 : 1200 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} người dùng`,
            onChange: (page, pageSize) => {
              fetchUsers(page, pageSize)
            },
            responsive: true,
            size: isMobile ? 'small' : 'default',
          }}
        />
      </div>

      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: '#1890ff' }} />
            <span>{selectedUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</span>
          </Space>
        }
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setEditModalVisible(false)
          form.resetFields()
          setSelectedUser(null)
        }}
        width={isMobile ? '100%' : 700}
        okText={selectedUser ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        className="user-management-modal"
        destroyOnClose
        confirmLoading={actionLoading}
        centered={!isMobile}
        style={isMobile ? { top: 20, maxWidth: 'calc(100vw - 32px)' } : {}}
      >
        <Form form={form} layout="vertical">
          {/* Thông tin cơ bản */}
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <IdcardOutlined />
              <Text strong>Thông tin cơ bản</Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="first_name"
                label="Họ"
                rules={[{ required: true, message: 'Vui lòng nhập họ' }]}
              >
                <Input placeholder="Nguyễn Văn" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="last_name"
                label="Tên"
                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              >
                <Input placeholder="A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input
                  placeholder="email@vnuhcm.edu.vn"
                  prefix={<MailOutlined />}
                  disabled={!!selectedUser}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input placeholder="0123456789" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          {/* Mật khẩu */}
          <Divider orientation="left">
            <Space>
              <LockOutlined />
              <Text strong>Mật khẩu</Text>
            </Space>
          </Divider>

          <Form.Item
            name="password"
            label={selectedUser ? "Mật khẩu mới (tùy chọn)" : "Mật khẩu"}
            rules={[
              { required: !selectedUser, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
            ]}
            extra={selectedUser ? "Để trống nếu không muốn đổi mật khẩu" : "Mật khẩu tối thiểu 8 ký tự"}
          >
            <Input.Password
              placeholder={selectedUser ? "Nhập mật khẩu mới (nếu muốn đổi)" : "Nhập mật khẩu"}
              prefix={<LockOutlined />}
              visibilityToggle
              autoComplete="new-password"
            />
          </Form.Item>

          {/* Phân quyền */}
          <Divider orientation="left">
            <Space>
              <IdcardOutlined />
              <Text strong>Phân quyền & Trạng thái</Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="role"
                label="Vai trò"
                rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                extra={
                  selectedUser &&
                  currentUser?.role === 'OPERATOR' &&
                  ['ADMIN', 'OPERATOR'].includes(selectedUser.role)
                    ? 'OPERATOR không được thay đổi vai trò của ADMIN hoặc OPERATOR khác'
                    : undefined
                }
              >
                <Select
                  placeholder="Chọn vai trò"
                  size="large"
                  disabled={
                    // OPERATOR cannot change role of ADMIN or OPERATOR users
                    selectedUser &&
                    currentUser?.role === 'OPERATOR' &&
                    ['ADMIN', 'OPERATOR'].includes(selectedUser.role)
                  }
                >
                  <Option value="GUEST">
                    <Tag color="default">GUEST</Tag> - Khách
                  </Option>
                  <Option value="STAFF">
                    <Tag color="green">STAFF</Tag> - Nhân viên
                  </Option>
                  <Option value="MANAGER">
                    <Tag color="blue">MANAGER</Tag> - Quản lý
                  </Option>
                  <Option value="OPERATOR" disabled={currentUser?.role === 'OPERATOR'}>
                    <Tag color="purple">OPERATOR</Tag> - Vận hành
                    {currentUser?.role === 'OPERATOR' && ' (Chỉ ADMIN)'}
                  </Option>
                  <Option value="ADMIN" disabled={currentUser?.role !== 'ADMIN'}>
                    <Tag color="red">ADMIN</Tag> - Quản trị
                    {currentUser?.role !== 'ADMIN' && ' (Chỉ ADMIN)'}
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="status"
                label="Trạng thái"
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
              >
                <Select placeholder="Chọn trạng thái" size="large">
                  <Option value="active">
                    <Tag color="success">Hoạt động</Tag>
                  </Option>
                  <Option value="inactive">
                    <Tag color="warning">Không hoạt động</Tag>
                  </Option>
                  <Option value="locked">
                    <Tag color="error">Khóa</Tag>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="organization_id"
                label={
                  <Space>
                    <TeamOutlined />
                    <span>Đơn vị/Phòng ban</span>
                  </Space>
                }
                extra={
                  selectedUser?.organization_id
                    ? "Chọn đơn vị khác hoặc bấm X để xóa khỏi đơn vị hiện tại"
                    : "Tìm kiếm và chọn đơn vị cho người dùng"
                }
              >
                <Select
                  placeholder="Tìm kiếm đơn vị..."
                  size="large"
                  allowClear
                  showSearch
                  loading={loadingOrganizations}
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    const label = option?.label as string
                    const searchValue = option?.['data-search'] as string
                    return (
                      label?.toLowerCase().includes(input.toLowerCase()) ||
                      searchValue?.toLowerCase().includes(input.toLowerCase())
                    )
                  }}
                  notFoundContent={
                    loadingOrganizations ? "Đang tải..." : "Không tìm thấy đơn vị"
                  }
                  options={organizations.map((org) => ({
                    value: org.id,
                    label: org.short_name || org.name,
                    'data-search': `${org.name} ${org.short_name || ''} ${org.code || ''}`,
                  }))}
                  optionRender={(option) => {
                    const org = organizations.find(o => o.id === option.value)
                    return (
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>{org?.short_name || org?.name}</Text>
                        {org?.short_name && org?.name !== org?.short_name && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {org.name}
                          </Text>
                        )}
                      </Space>
                    )
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="is_vnuhcm"
                label="Thuộc ĐHQG-HCM"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch
                  checkedChildren="Có"
                  unCheckedChildren="Không"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  )
}

export default UserManagement
