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
  TrophyOutlined,
  BankOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../../shared/hooks'
import * as kpiApi from '../../services/kpiApi'
import type { Kpi, CreateKpiRequest, UpdateKpiRequest } from '../../services/kpiApi'
import './KpiManagement.css'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

function KpiManagement() {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()
  const [activeTab, setActiveTab] = useState<'CENTRAL' | 'VNU'>('CENTRAL')
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Check if current user can manage KPIs (OPERATOR or ADMIN only)
  const canManage = currentUser?.role === 'OPERATOR' || currentUser?.role === 'ADMIN'

  useEffect(() => {
    if (canManage) {
      fetchKpis()
      fetchCategories()
    }
  }, [activeTab, searchText, categoryFilter, activeFilter, pagination.current, canManage])

  const fetchKpis = async () => {
    setLoading(true)
    try {
      const response = await kpiApi.getKpis({
        source: activeTab,
        search: searchText || undefined,
        category: categoryFilter,
        is_active: activeFilter,
        page: pagination.current,
        per_page: pagination.pageSize,
      })

      setKpis(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách KPI')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await kpiApi.getKpiCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'CENTRAL' | 'VNU')
    setPagination({ ...pagination, current: 1 })
    setSearchText('')
    setCategoryFilter(undefined)
    setActiveFilter(undefined)
  }

  const handleAdd = () => {
    setSelectedKpi(null)
    form.resetFields()
    form.setFieldsValue({ source: activeTab, is_active: true })
    setEditModalVisible(true)
  }

  const handleEdit = (kpi: Kpi) => {
    setSelectedKpi(kpi)
    form.setFieldsValue(kpi)
    setEditModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      await kpiApi.deleteKpi(id)
      message.success('Đã xóa KPI thành công')
      fetchKpis()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa KPI')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setActionLoading(true)

      if (selectedKpi) {
        // Update existing KPI
        await kpiApi.updateKpi(selectedKpi.id, values as UpdateKpiRequest)
        message.success('Đã cập nhật KPI thành công')
      } else {
        // Create new KPI
        await kpiApi.createKpi(values as CreateKpiRequest)
        message.success('Đã tạo KPI thành công')
      }

      setEditModalVisible(false)
      form.resetFields()
      fetchKpis()
    } catch (error: any) {
      if (error.errorFields) {
        // Validation error
        return
      }
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalCancel = () => {
    setEditModalVisible(false)
    setSelectedKpi(null)
    form.resetFields()
  }

  const columns: ColumnsType<Kpi> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã KPI',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {code || '-'}
        </Text>
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => <Text>{title}</Text>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) =>
        category ? <Tag color="blue">{category}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.order_number || 0) - (b.order_number || 0),
      render: (order: number) => <Text>{order || 0}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      align: 'center',
      filters: [
        { text: 'Hoạt động', value: true },
        { text: 'Không hoạt động', value: false },
      ],
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Người tạo',
      dataIndex: ['creator', 'email'],
      key: 'creator',
      width: 150,
      render: (email: string) => <Text type="secondary">{email || '-'}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Kpi) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa KPI này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDelete(record.id)}
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

  if (!canManage) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            Bạn không có quyền truy cập
          </Title>
          <Text type="secondary">
            Chỉ OPERATOR và ADMIN mới có quyền quản lý KPI
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Title level={3}>
              <TrophyOutlined /> Quản lý KPI
            </Title>
            <Text type="secondary">
              Quản lý các chỉ tiêu KPI của Nghị quyết 57
            </Text>
          </div>

          {/* Tabs for CENTRAL and VNU */}
          <Tabs activeKey={activeTab} onChange={handleTabChange}>
            <TabPane
              tab={
                <span>
                  <GlobalOutlined />
                  Trung ương
                </span>
              }
              key="CENTRAL"
            >
              {/* Filters and Actions */}
              <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                <Input
                  placeholder="Tìm kiếm theo mã hoặc tiêu đề..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />

                <Select
                  placeholder="Danh mục"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  style={{ width: 180 }}
                  allowClear
                >
                  {categories.map(cat => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>

                <Select
                  placeholder="Trạng thái"
                  value={activeFilter}
                  onChange={setActiveFilter}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value={true}>Hoạt động</Option>
                  <Option value={false}>Không hoạt động</Option>
                </Select>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchText('')
                    setCategoryFilter(undefined)
                    setActiveFilter(undefined)
                    fetchKpis()
                  }}
                >
                  Làm mới
                </Button>

                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm KPI mới
                </Button>
              </Space>

              {/* Table */}
              <Table
                columns={columns}
                dataSource={kpis}
                loading={loading}
                rowKey="id"
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng ${total} KPI`,
                }}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <BankOutlined />
                  ĐHQG-HCM
                </span>
              }
              key="VNU"
            >
              {/* Filters and Actions */}
              <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                <Input
                  placeholder="Tìm kiếm theo mã hoặc tiêu đề..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />

                <Select
                  placeholder="Danh mục"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  style={{ width: 180 }}
                  allowClear
                >
                  {categories.map(cat => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>

                <Select
                  placeholder="Trạng thái"
                  value={activeFilter}
                  onChange={setActiveFilter}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value={true}>Hoạt động</Option>
                  <Option value={false}>Không hoạt động</Option>
                </Select>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchText('')
                    setCategoryFilter(undefined)
                    setActiveFilter(undefined)
                    fetchKpis()
                  }}
                >
                  Làm mới
                </Button>

                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm KPI mới
                </Button>
              </Space>

              {/* Table */}
              <Table
                columns={columns}
                dataSource={kpis}
                loading={loading}
                rowKey="id"
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showTotal: (total) => `Tổng ${total} KPI`,
                }}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
              />
            </TabPane>
          </Tabs>
        </Space>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={selectedKpi ? 'Chỉnh sửa KPI' : 'Thêm KPI mới'}
        open={editModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={700}
        okText={selectedKpi ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="source"
                label="Nguồn"
                rules={[{ required: true, message: 'Vui lòng chọn nguồn' }]}
              >
                <Select disabled={!!selectedKpi}>
                  <Option value="CENTRAL">Trung ương</Option>
                  <Option value="VNU">ĐHQG-HCM</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="code" label="Mã KPI">
                <Input placeholder="VD: KPI-TC-01" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề KPI" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Nhập mô tả chi tiết" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục">
                <Select placeholder="Chọn danh mục" allowClear showSearch>
                  {categories.map(cat => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                  <Option value="RANKING">Xếp hạng</Option>
                  <Option value="INNOVATION">Đổi mới sáng tạo</Option>
                  <Option value="MANAGEMENT">Quản trị</Option>
                  <Option value="RESEARCH">Nghiên cứu</Option>
                  <Option value="TRAINING">Đào tạo</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="order_number" label="Thứ tự hiển thị">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default KpiManagement
