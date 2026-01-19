import { useState, useEffect, useCallback, useMemo } from 'react'
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
import AdvancedFilter, { FilterField, FilterValues } from '../../shared/components/AdvancedFilter'
import ColumnToggle, { ToggleableColumn } from '../../shared/components/ColumnToggle'
import { ImportExcelModal } from '../../shared/components/ImportExcelModal'
import { FileExcelOutlined } from '@ant-design/icons'
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

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: '',
    role: undefined,
    status: undefined,
    organization_id: undefined,
    is_vnuhcm: undefined,
  })

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Detect mobile view for responsive column visibility
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768)

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'email', 'name', 'organization', 'role', 'status', 'is_vnuhcm', 'last_login_at', 'created_at', 'actions'
  ])

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

  // Advanced filter fields configuration
  const filterFields: FilterField[] = useMemo(() => {
    const fields: FilterField[] = [
      {
        key: 'search',
        label: 'Tìm kiếm',
        type: 'text',
        placeholder: 'Tìm theo tên, email, số điện thoại...',
        span: 8,
      },
      {
        key: 'role',
        label: 'Vai trò',
        type: 'select',
        span: 4,
        options: [
          { value: 'ADMIN', label: 'ADMIN', color: 'red' },
          { value: 'OPERATOR', label: 'OPERATOR', color: 'purple' },
          { value: 'MANAGER', label: 'MANAGER', color: 'blue' },
          { value: 'STAFF', label: 'STAFF', color: 'green' },
          { value: 'GUEST', label: 'GUEST' },
        ],
      },
      {
        key: 'status',
        label: 'Trạng thái',
        type: 'select',
        span: 4,
        options: [
          { value: 'active', label: 'Hoạt động', color: 'success' },
          { value: 'inactive', label: 'Không hoạt động', color: 'warning' },
          { value: 'locked', label: 'Khóa', color: 'error' },
        ],
      },
      {
        key: 'organization_id',
        label: 'Đơn vị',
        type: 'select',
        span: 6,
        showSearch: true,
        placeholder: 'Tìm và chọn đơn vị...',
        options: organizations.map((org) => ({
          value: org.id,
          label: org.short_name ? `${org.short_name} - ${org.name}` : org.name,
        })),
      },
      {
        key: 'is_vnuhcm',
        label: 'VNUHCM',
        type: 'boolean',
        span: 4,
      },
    ]
    return fields
  }, [organizations])

  // Handle filter change
  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues)
  }

  // Handle filter search
  const handleFilterSearch = () => {
    fetchUsers(1, pagination.pageSize) // Reset to page 1 when searching
  }

  // Handle filter reset
  const handleFilterReset = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const fetchUsers = async (page: number = 1, pageSize: number = 10) => {
    setLoading(true)
    try {
      const response = await userApi.getUsers({
        search: filterValues.search || undefined,
        role: filterValues.role,
        status: filterValues.status,
        organization_id: filterValues.organization_id,
        is_vnuhcm: filterValues.is_vnuhcm,
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

  // Toggleable columns configuration
  const toggleableColumns: ToggleableColumn[] = useMemo(() => [
    { key: 'email', title: 'Email', fixed: true },
    { key: 'name', title: 'Họ và tên', defaultVisible: true },
    { key: 'organization', title: 'Đơn vị', defaultVisible: true },
    { key: 'role', title: 'Vai trò', defaultVisible: true },
    { key: 'status', title: 'Trạng thái', defaultVisible: true },
    { key: 'is_vnuhcm', title: 'VNUHCM', defaultVisible: true },
    { key: 'last_login_at', title: 'Hoạt động cuối', defaultVisible: true },
    { key: 'created_at', title: 'Ngày tạo', defaultVisible: true },
    { key: 'actions', title: 'Thao tác', fixed: true },
  ], [])

  const allColumns: ColumnsType<User> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      fixed: isMobile ? false : 'left',
      width: isMobile ? 180 : 250,
      ellipsis: true,
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: 'Họ và tên',
      key: 'name',
      width: isMobile ? 150 : 200,
      ellipsis: true,
      sorter: (a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`
        const nameB = `${b.first_name} ${b.last_name}`
        return nameA.localeCompare(nameB)
      },
      render: (_, record) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Đơn vị',
      key: 'organization',
      width: isMobile ? 120 : 180,
      ellipsis: true,
      sorter: (a, b) => {
        const orgA = a.organization?.short_name || a.organization?.name || ''
        const orgB = b.organization?.short_name || b.organization?.name || ''
        return orgA.localeCompare(orgB)
      },
      render: (_, record) => {
        if (!record.organization) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Chưa gán</Text>
        }
        return (
          <Tooltip title={record.organization.name}>
            <Tag color="blue" icon={<TeamOutlined />}>
              {record.organization.short_name || record.organization.name}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      sorter: (a, b) => (a.role || '').localeCompare(b.role || ''),
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
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
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
      sorter: (a, b) => (a.is_vnuhcm ? 1 : 0) - (b.is_vnuhcm ? 1 : 0),
      render: (isVnuhcm: boolean) => (
        <Tag color={isVnuhcm ? 'blue' : 'default'}>
          {isVnuhcm ? 'Có' : 'Không'}
        </Tag>
      ),
    },
    {
      title: 'Hoạt động cuối',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 140,
      className: isMobile ? 'ant-table-cell-mobile-hide' : '',
      sorter: (a, b) => new Date(a.last_login_at || 0).getTime() - new Date(b.last_login_at || 0).getTime(),
      render: (date: string) => {
        if (!date) {
          return <Text type="secondary">Chưa đăng nhập</Text>
        }
        const lastLogin = new Date(date)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60))

        // Online: within 2 minutes
        if (diffMinutes < 2) {
          return <Tag color="green">Đang hoạt động</Tag>
        }
        // Recently active: within 1 hour
        if (diffMinutes < 60) {
          return <Tag color="blue">{diffMinutes} phút trước</Tag>
        }
        // Within 24 hours
        const diffHours = Math.floor(diffMinutes / 60)
        if (diffHours < 24) {
          return <Tag color="default">{diffHours} giờ trước</Tag>
        }
        // Show date
        return (
          <Tooltip title={lastLogin.toLocaleString('vi-VN')}>
            <Text type="secondary">{lastLogin.toLocaleDateString('vi-VN')}</Text>
          </Tooltip>
        )
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      className: isMobile ? 'ant-table-cell-mobile-hide' : '',
      sorter: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
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

  // Filter columns based on visibility
  const columns = useMemo(() =>
    allColumns.filter(col => visibleColumns.includes(col.key as string)),
    [allColumns, visibleColumns]
  )

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
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <UserOutlined style={{ fontSize: 24 }} />
          <Title level={3} style={{ margin: 0 }}>Quản lý người dùng</Title>
        </Space>
      </Card>

      {/* Advanced Filter */}
      <AdvancedFilter
        fields={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        onSearch={handleFilterSearch}
        onReset={handleFilterReset}
        loading={loading}
        storageKey="user_management_filters"
        showPresets={true}
        collapsible={true}
        defaultExpanded={true}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
              Làm mới
            </Button>
            <ColumnToggle
              columns={toggleableColumns}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
              storageKey="user_management"
            />
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              Import Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedUser(null)
                form.resetFields()
                setEditModalVisible(true)
              }}
            >
              Thêm người dùng
            </Button>
          </Space>
        }
      />

      {/* Table */}
      <Card style={{ position: 'relative' }}>
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

      {/* Import Excel Modal */}
      <ImportExcelModal
        open={importModalVisible}
        type="users"
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => fetchUsers(pagination.current, pagination.pageSize)}
      />
      </Card>
    </div>
  )
}

export default UserManagement
