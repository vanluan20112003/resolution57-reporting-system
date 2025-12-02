import { useState, useEffect } from 'react'
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
  Typography,
  Tabs,
  Switch,
  InputNumber,
  Row,
  Col,
  Popconfirm,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  TagsOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../../shared/hooks'
import * as activityConfigApi from '../../services/activityConfigApi'
import type {
  ActivityType,
  ActivityField,
  CreateActivityTypeRequest,
  UpdateActivityTypeRequest,
  CreateActivityFieldRequest,
  UpdateActivityFieldRequest,
} from '../../services/activityConfigApi'
import './ActivityConfigManagement.css'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

function ActivityConfigManagement() {
  // Common state
  const [activeTab, setActiveTab] = useState<'types' | 'fields'>('types')
  const { user: currentUser } = useAuth()

  // Activity Types state
  const [typesLoading, setTypesLoading] = useState(false)
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [typesPagination, setTypesPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [typesSearchText, setTypesSearchText] = useState('')
  const [typesActiveFilter, setTypesActiveFilter] = useState<boolean | undefined>()
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
  const [typeActionLoading, setTypeActionLoading] = useState(false)
  const [typeForm] = Form.useForm()

  // Activity Fields state
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [activityFields, setActivityFields] = useState<ActivityField[]>([])
  const [fieldsPagination, setFieldsPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [fieldsSearchText, setFieldsSearchText] = useState('')
  const [fieldsActiveFilter, setFieldsActiveFilter] = useState<boolean | undefined>()
  const [fieldModalVisible, setFieldModalVisible] = useState(false)
  const [selectedField, setSelectedField] = useState<ActivityField | null>(null)
  const [fieldActionLoading, setFieldActionLoading] = useState(false)
  const [fieldForm] = Form.useForm()

  // Check if current user can manage (OPERATOR or ADMIN only)
  const canManage = currentUser?.role === 'OPERATOR' || currentUser?.role === 'ADMIN'

  // Fetch Activity Types
  const fetchActivityTypes = async () => {
    setTypesLoading(true)
    try {
      const response = await activityConfigApi.getActivityTypes({
        search: typesSearchText || undefined,
        is_active: typesActiveFilter,
        page: typesPagination.current,
        per_page: typesPagination.pageSize,
      })

      setActivityTypes(response.data)
      setTypesPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách loại hoạt động')
    } finally {
      setTypesLoading(false)
    }
  }

  // Fetch Activity Fields
  const fetchActivityFields = async () => {
    setFieldsLoading(true)
    try {
      const response = await activityConfigApi.getActivityFields({
        search: fieldsSearchText || undefined,
        is_active: fieldsActiveFilter,
        page: fieldsPagination.current,
        per_page: fieldsPagination.pageSize,
      })

      setActivityFields(response.data)
      setFieldsPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách lĩnh vực hoạt động')
    } finally {
      setFieldsLoading(false)
    }
  }

  useEffect(() => {
    if (canManage && activeTab === 'types') {
      fetchActivityTypes()
    }
  }, [activeTab, typesSearchText, typesActiveFilter, typesPagination.current, canManage])

  useEffect(() => {
    if (canManage && activeTab === 'fields') {
      fetchActivityFields()
    }
  }, [activeTab, fieldsSearchText, fieldsActiveFilter, fieldsPagination.current, canManage])

  // ============== Activity Types Handlers ==============

  const handleTypesTableChange = (newPagination: any) => {
    setTypesPagination({
      ...typesPagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleAddType = () => {
    setSelectedType(null)
    typeForm.resetFields()
    typeForm.setFieldsValue({ is_active: true })
    setTypeModalVisible(true)
  }

  const handleEditType = (type: ActivityType) => {
    setSelectedType(type)
    typeForm.setFieldsValue(type)
    setTypeModalVisible(true)
  }

  const handleDeleteType = async (id: string) => {
    setTypeActionLoading(true)
    try {
      await activityConfigApi.deleteActivityType(id)
      message.success('Đã xóa loại hoạt động thành công')
      fetchActivityTypes()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa loại hoạt động')
    } finally {
      setTypeActionLoading(false)
    }
  }

  const handleTypeModalOk = async () => {
    try {
      const values = await typeForm.validateFields()
      setTypeActionLoading(true)

      if (selectedType) {
        await activityConfigApi.updateActivityType(selectedType.id, values as UpdateActivityTypeRequest)
        message.success('Đã cập nhật loại hoạt động thành công')
      } else {
        await activityConfigApi.createActivityType(values as CreateActivityTypeRequest)
        message.success('Đã tạo loại hoạt động thành công')
      }

      setTypeModalVisible(false)
      typeForm.resetFields()
      fetchActivityTypes()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setTypeActionLoading(false)
    }
  }

  const handleTypeModalCancel = () => {
    setTypeModalVisible(false)
    setSelectedType(null)
    typeForm.resetFields()
  }

  // ============== Activity Fields Handlers ==============

  const handleFieldsTableChange = (newPagination: any) => {
    setFieldsPagination({
      ...fieldsPagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleAddField = () => {
    setSelectedField(null)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ is_active: true })
    setFieldModalVisible(true)
  }

  const handleEditField = (field: ActivityField) => {
    setSelectedField(field)
    fieldForm.setFieldsValue(field)
    setFieldModalVisible(true)
  }

  const handleDeleteField = async (id: string) => {
    setFieldActionLoading(true)
    try {
      await activityConfigApi.deleteActivityField(id)
      message.success('Đã xóa lĩnh vực hoạt động thành công')
      fetchActivityFields()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa lĩnh vực hoạt động')
    } finally {
      setFieldActionLoading(false)
    }
  }

  const handleFieldModalOk = async () => {
    try {
      const values = await fieldForm.validateFields()
      setFieldActionLoading(true)

      if (selectedField) {
        await activityConfigApi.updateActivityField(selectedField.id, values as UpdateActivityFieldRequest)
        message.success('Đã cập nhật lĩnh vực hoạt động thành công')
      } else {
        await activityConfigApi.createActivityField(values as CreateActivityFieldRequest)
        message.success('Đã tạo lĩnh vực hoạt động thành công')
      }

      setFieldModalVisible(false)
      fieldForm.resetFields()
      fetchActivityFields()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setFieldActionLoading(false)
    }
  }

  const handleFieldModalCancel = () => {
    setFieldModalVisible(false)
    setSelectedField(null)
    fieldForm.resetFields()
  }

  // ============== Activity Types Columns ==============

  const typeColumns: ColumnsType<ActivityType> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (typesPagination.current - 1) * typesPagination.pageSize + index + 1,
    },
    {
      title: 'Tên loại hoạt động',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => <Text type="secondary">{desc || '-'}</Text>,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.display_order || 0) - (b.display_order || 0),
      render: (order: number) => <Text>{order || 0}</Text>,
    },
    {
      title: 'Số hoạt động',
      dataIndex: 'activities_count',
      key: 'activities_count',
      width: 120,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: ActivityType) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditType(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={
              record.activities_count && record.activities_count > 0
                ? `Loại hoạt động này đang có ${record.activities_count} hoạt động liên quan. Bạn có chắc muốn xóa?`
                : 'Bạn có chắc chắn muốn xóa loại hoạt động này?'
            }
            onConfirm={() => handleDeleteType(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ============== Activity Fields Columns ==============

  const fieldColumns: ColumnsType<ActivityField> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (fieldsPagination.current - 1) * fieldsPagination.pageSize + index + 1,
    },
    {
      title: 'Tên lĩnh vực',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => <Text type="secondary">{desc || '-'}</Text>,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.display_order || 0) - (b.display_order || 0),
      render: (order: number) => <Text>{order || 0}</Text>,
    },
    {
      title: 'Số hoạt động',
      dataIndex: 'activities_count',
      key: 'activities_count',
      width: 120,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: ActivityField) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditField(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={
              record.activities_count && record.activities_count > 0
                ? `Lĩnh vực này đang có ${record.activities_count} hoạt động liên quan. Bạn có chắc muốn xóa?`
                : 'Bạn có chắc chắn muốn xóa lĩnh vực này?'
            }
            onConfirm={() => handleDeleteField(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Access denied view
  if (!canManage) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <SettingOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            Bạn không có quyền truy cập
          </Title>
          <Text type="secondary">
            Chỉ OPERATOR và ADMIN mới có quyền quản lý cấu hình hoạt động
          </Text>
        </div>
      </Card>
    )
  }

  const tabItems = [
    {
      key: 'types',
      label: (
        <span>
          <AppstoreOutlined />
          Loại hoạt động
        </span>
      ),
      children: (
        <>
          {/* Types Filters and Actions */}
          <Space wrap style={{ marginBottom: 16, width: '100%' }}>
            <Input
              placeholder="Tìm kiếm theo tên..."
              prefix={<SearchOutlined />}
              value={typesSearchText}
              onChange={e => setTypesSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />

            <Select
              placeholder="Trạng thái"
              value={typesActiveFilter}
              onChange={setTypesActiveFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value={true}>Hoạt động</Option>
              <Option value={false}>Tạm dừng</Option>
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setTypesSearchText('')
                setTypesActiveFilter(undefined)
                setTypesPagination(prev => ({ ...prev, current: 1 }))
                fetchActivityTypes()
              }}
            >
              Làm mới
            </Button>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddType}>
              Thêm loại hoạt động
            </Button>
          </Space>

          {/* Types Table */}
          <Table
            columns={typeColumns}
            dataSource={activityTypes}
            loading={typesLoading}
            rowKey="id"
            pagination={{
              ...typesPagination,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} loại hoạt động`,
            }}
            onChange={handleTypesTableChange}
            scroll={{ x: 1000 }}
          />
        </>
      ),
    },
    {
      key: 'fields',
      label: (
        <span>
          <TagsOutlined />
          Lĩnh vực hoạt động
        </span>
      ),
      children: (
        <>
          {/* Fields Filters and Actions */}
          <Space wrap style={{ marginBottom: 16, width: '100%' }}>
            <Input
              placeholder="Tìm kiếm theo tên..."
              prefix={<SearchOutlined />}
              value={fieldsSearchText}
              onChange={e => setFieldsSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />

            <Select
              placeholder="Trạng thái"
              value={fieldsActiveFilter}
              onChange={setFieldsActiveFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value={true}>Hoạt động</Option>
              <Option value={false}>Tạm dừng</Option>
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setFieldsSearchText('')
                setFieldsActiveFilter(undefined)
                setFieldsPagination(prev => ({ ...prev, current: 1 }))
                fetchActivityFields()
              }}
            >
              Làm mới
            </Button>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
              Thêm lĩnh vực
            </Button>
          </Space>

          {/* Fields Table */}
          <Table
            columns={fieldColumns}
            dataSource={activityFields}
            loading={fieldsLoading}
            rowKey="id"
            pagination={{
              ...fieldsPagination,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} lĩnh vực`,
            }}
            onChange={handleFieldsTableChange}
            scroll={{ x: 1000 }}
          />
        </>
      ),
    },
  ]

  return (
    <div style={{ padding: '0' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Title level={3}>
              <SettingOutlined /> Cấu hình hoạt động
            </Title>
            <Text type="secondary">
              Quản lý loại hoạt động và lĩnh vực hoạt động trong hệ thống
            </Text>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'types' | 'fields')}
            items={tabItems}
          />
        </Space>
      </Card>

      {/* Activity Type Modal */}
      <Modal
        title={selectedType ? 'Chỉnh sửa loại hoạt động' : 'Thêm loại hoạt động mới'}
        open={typeModalVisible}
        onOk={handleTypeModalOk}
        onCancel={handleTypeModalCancel}
        confirmLoading={typeActionLoading}
        width={600}
        okText={selectedType ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={typeForm} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item
            name="name"
            label="Tên loại hoạt động"
            rules={[
              { required: true, message: 'Vui lòng nhập tên loại hoạt động' },
              { max: 100, message: 'Tên không được vượt quá 100 ký tự' },
            ]}
          >
            <Input placeholder="VD: Đào tạo, Nghiên cứu, Hội thảo..." />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 500, message: 'Mô tả không được vượt quá 500 ký tự' }]}
          >
            <TextArea rows={3} placeholder="Nhập mô tả chi tiết về loại hoạt động" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="display_order"
                label="Thứ tự hiển thị"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Activity Field Modal */}
      <Modal
        title={selectedField ? 'Chỉnh sửa lĩnh vực hoạt động' : 'Thêm lĩnh vực hoạt động mới'}
        open={fieldModalVisible}
        onOk={handleFieldModalOk}
        onCancel={handleFieldModalCancel}
        confirmLoading={fieldActionLoading}
        width={600}
        okText={selectedField ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={fieldForm} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item
            name="name"
            label="Tên lĩnh vực"
            rules={[
              { required: true, message: 'Vui lòng nhập tên lĩnh vực' },
              { max: 100, message: 'Tên không được vượt quá 100 ký tự' },
            ]}
          >
            <Input placeholder="VD: Khoa học tự nhiên, Công nghệ thông tin..." />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 500, message: 'Mô tả không được vượt quá 500 ký tự' }]}
          >
            <TextArea rows={3} placeholder="Nhập mô tả chi tiết về lĩnh vực hoạt động" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="display_order"
                label="Thứ tự hiển thị"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default ActivityConfigManagement
