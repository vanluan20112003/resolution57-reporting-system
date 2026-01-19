import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Switch,
  DatePicker,
  Input,
  message,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as permissionsApi from '../../services/organizationPermissionsApi'
import { getOrganizationList } from '../../services/organizationApi'

const { TextArea } = Input
const { RangePicker } = DatePicker
const { Option } = Select

type ViewScope = permissionsApi.ViewScope
type Organization = permissionsApi.Organization
type Permission = permissionsApi.Permission

export function OrganizationPermissionsManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [viewScopes, setViewScopes] = useState<ViewScope[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchPermissions()
    fetchViewScopes()
    fetchOrganizations()
  }, [])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await permissionsApi.getAllPermissions()
      if (response.success) {
        setPermissions(response.data)
      }
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách permissions')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchViewScopes = async () => {
    try {
      const response = await permissionsApi.getViewScopes()
      console.log('View scopes response:', response)
      if (response.success) {
        setViewScopes(response.data)
        if (response.data.length === 0) {
          message.warning('Không có view scopes trong hệ thống. Vui lòng chạy migration.')
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch view scopes:', error)
      message.error('Không thể tải danh sách phạm vi xem')
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await getOrganizationList({})
      if (response.success) {
        setOrganizations(response.data)
      }
    } catch (error: any) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const handleCreate = () => {
    setEditingPermission(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Permission) => {
    setEditingPermission(record)
    form.setFieldsValue({
      organization_id: record.organization_id,
      view_scope_id: record.view_scope_id,
      target_organization_ids: record.target_organization_ids || (record.target_organization_id ? [record.target_organization_id] : []),
      allowed_roles: record.allowed_roles,
      can_view_details: record.can_view_details,
      can_view_files: record.can_view_files,
      can_export: record.can_export,
      can_view_participants: record.can_view_participants,
      can_view_budget: record.can_view_budget,
      validity: record.valid_from && record.valid_until
        ? [dayjs(record.valid_from), dayjs(record.valid_until)]
        : undefined,
      reason: record.reason,
      notes: record.notes,
      status: record.status,
    })
    setModalVisible(true)
  }

  const handleDelete = (record: Permission) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa quyền của ${record.organization?.name || 'phòng ban này'}?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await permissionsApi.deletePermission(record.id)
          message.success('Đã xóa permission thành công')
          fetchPermissions()
        } catch (error: any) {
          message.error(error.message || 'Không thể xóa permission')
          console.error(error)
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload: any = {
        ...values,
      }

      // Xử lý thời hạn
      if (values.validity && values.validity[0] && values.validity[1]) {
        payload.valid_from = values.validity[0].format('YYYY-MM-DD HH:mm:ss')
        payload.valid_until = values.validity[1].format('YYYY-MM-DD HH:mm:ss')
      } else {
        // Nếu không có thời hạn, gửi null để xóa giá trị cũ
        payload.valid_from = null
        payload.valid_until = null
      }
      // Xóa field validity khỏi payload
      delete payload.validity

      if (editingPermission) {
        await permissionsApi.updatePermission(editingPermission.id, payload)
        message.success('Đã cập nhật permission thành công')
      } else {
        await permissionsApi.createPermission(payload)
        message.success('Đã tạo permission thành công')
      }

      setModalVisible(false)
      form.resetFields()
      fetchPermissions()
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra')
      console.error(error)
    }
  }

  const selectedScope = Form.useWatch('view_scope_id', form)
  const requiresTargetOrg = viewScopes.find(s => s.id === selectedScope)?.requires_specific_orgs

  const columns: ColumnsType<Permission> = [
    {
      title: 'Phòng ban được cấp quyền',
      dataIndex: ['organization', 'name'],
      key: 'organization',
      width: 200,
    },
    {
      title: 'Loại phạm vi',
      dataIndex: ['viewScope', 'display_name'],
      key: 'scope',
      width: 180,
      render: (text, record) => {
        const scopeName = record.viewScope?.name
        let color = 'blue'
        let displayText = text || record.viewScope?.display_name || 'Không xác định'

        if (scopeName === 'ALL_ORGANIZATIONS') {
          color = 'green'
        } else if (scopeName === 'SPECIFIC_ORGANIZATIONS') {
          color = 'orange'
        } else if (scopeName === 'PARENT_AND_CHILDREN') {
          color = 'purple'
        }

        return (
          <Tooltip title={record.viewScope?.description}>
            <Tag color={color}>{displayText}</Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Phòng ban được xem',
      key: 'target',
      width: 200,
      render: (_, record) => {
        const scopeName = record.viewScope?.name

        // Nếu scope là ALL_ORGANIZATIONS
        if (scopeName === 'ALL_ORGANIZATIONS') {
          return <Tag color="green">Tất cả phòng ban</Tag>
        }

        // Nếu scope là PARENT_AND_CHILDREN
        if (scopeName === 'PARENT_AND_CHILDREN') {
          return <Tag color="purple">Phòng ban con</Tag>
        }

        // Nếu có nhiều target organizations
        if (record.targetOrganizations && record.targetOrganizations.length > 0) {
          return (
            <Space size={[0, 4]} wrap>
              {record.targetOrganizations.map(org => (
                <Tag key={org.id} color="cyan">{org.name}</Tag>
              ))}
            </Space>
          )
        }

        // Backward compatibility: single target organization
        if (record.targetOrganization) {
          return <Tag color="cyan">{record.targetOrganization.name}</Tag>
        }

        return <Tag color="default">Chưa chỉ định</Tag>
      },
    },
    {
      title: 'Roles',
      dataIndex: 'allowed_roles',
      key: 'roles',
      width: 120,
      render: (roles: string[]) =>
        roles && roles.length > 0 ? (
          <Space size={[0, 4]} wrap>
            {roles.map(role => (
              <Tag key={role} color="purple">{role}</Tag>
            ))}
          </Space>
        ) : (
          <Tag>Tất cả</Tag>
        ),
    },
    {
      title: 'Quyền hạn',
      key: 'permissions',
      width: 150,
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.can_view_details && <Tag icon={<EyeOutlined />}>Chi tiết</Tag>}
          {record.can_view_files && <Tag icon={<FileTextOutlined />}>Files</Tag>}
          {record.can_export && <Tag>Export</Tag>}
          {record.can_view_participants && <Tag icon={<TeamOutlined />}>Người tham gia</Tag>}
          {record.can_view_budget && <Tag color="orange">Ngân sách</Tag>}
        </Space>
      ),
    },
    {
      title: 'Thời hạn',
      key: 'validity',
      width: 200,
      render: (_, record) => {
        if (!record.valid_from && !record.valid_until) {
          return <Tag color="green">Vô thời hạn</Tag>
        }
        return (
          <Space direction="vertical" size={0}>
            {record.valid_from && <div><small>Từ: {dayjs(record.valid_from).format('DD/MM/YYYY')}</small></div>}
            {record.valid_until && <div><small>Đến: {dayjs(record.valid_until).format('DD/MM/YYYY')}</small></div>}
          </Space>
        )
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Hoạt động' : status}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const activePermissions = permissions.filter(p => p.status === 'active')
  const allOrganizationsPermissions = permissions.filter(
    p => p.viewScope?.name === 'ALL_ORGANIZATIONS' && p.status === 'active'
  )

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng số permissions"
              value={permissions.length}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Permissions đang hoạt động"
              value={activePermissions.length}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Xem tất cả phòng ban"
              value={allOrganizationsPermissions.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Phòng ban được cấp quyền"
              value={new Set(permissions.map(p => p.organization_id)).size}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Quản Lý Quyền Truy Cập Phòng Ban"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tạo Permission Mới
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} permissions`,
          }}
        />
      </Card>

      <Modal
        title={editingPermission ? 'Chỉnh Sửa Permission' : 'Tạo Permission Mới'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={700}
        okText={editingPermission ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="organization_id"
            label="Phòng ban được cấp quyền"
            rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}
          >
            <Select
              showSearch
              placeholder="Tìm theo tên, mã hoặc tên viết tắt..."
              filterOption={(input, option) => {
                const org = organizations.find(o => o.id === option?.value)
                if (!org) return false
                const searchText = input.toLowerCase()
                return (
                  org.name.toLowerCase().includes(searchText) ||
                  (org.short_name?.toLowerCase().includes(searchText) ?? false) ||
                  (org.code?.toLowerCase().includes(searchText) ?? false)
                )
              }}
              options={organizations.map(org => ({
                value: org.id,
                label: org.short_name ? `${org.name} (${org.short_name})` : org.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="view_scope_id"
            label="Loại phạm vi xem"
            rules={[{ required: true, message: 'Vui lòng chọn scope' }]}
          >
            <Select
              placeholder="Chọn scope"
              options={viewScopes.map(scope => ({
                value: scope.id,
                label: scope.display_name,
              }))}
              optionRender={(option) => {
                const scope = viewScopes.find(s => s.id === option.value)
                return (
                  <div>
                    <div>{option.label}</div>
                    <small style={{ color: '#888' }}>{scope?.description}</small>
                  </div>
                )
              }}
            />
          </Form.Item>

          {requiresTargetOrg && (
            <Form.Item
              name="target_organization_ids"
              label="Phòng ban được phép xem"
              rules={[{ required: true, message: 'Vui lòng chọn ít nhất một phòng ban' }]}
            >
              <Select
                mode="multiple"
                showSearch
                placeholder="Tìm theo tên, mã hoặc tên viết tắt..."
                filterOption={(input, option) => {
                  const org = organizations.find(o => o.id === option?.value)
                  if (!org) return false
                  const searchText = input.toLowerCase()
                  return (
                    org.name.toLowerCase().includes(searchText) ||
                    (org.short_name?.toLowerCase().includes(searchText) ?? false) ||
                    (org.code?.toLowerCase().includes(searchText) ?? false)
                  )
                }}
                options={organizations.map(org => ({
                  value: org.id,
                  label: org.short_name ? `${org.name} (${org.short_name})` : org.name,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="allowed_roles" label="Các role được phép">
            <Select mode="multiple" placeholder="Chọn roles (để trống = tất cả)">
              <Option value="MANAGER">MANAGER</Option>
              <Option value="STAFF">STAFF</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="can_view_details" label="Xem chi tiết" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="can_view_files" label="Xem files" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="can_export" label="Xuất báo cáo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="can_view_participants" label="Xem người tham gia" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="can_view_budget" label="Xem ngân sách" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="validity"
            label="Thời hạn có hiệu lực"
            help="Để trống = Không giới hạn thời gian"
          >
            <RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder={['Từ ngày (không bắt buộc)', 'Đến ngày (không bắt buộc)']}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="reason" label="Lý do cấp quyền">
            <TextArea rows={2} placeholder="Nhập lý do cấp quyền" />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} placeholder="Ghi chú bổ sung" />
          </Form.Item>

          {editingPermission && (
            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Option value="active">Hoạt động</Option>
                <Option value="inactive">Không hoạt động</Option>
                <Option value="expired">Hết hạn</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default OrganizationPermissionsManagement
