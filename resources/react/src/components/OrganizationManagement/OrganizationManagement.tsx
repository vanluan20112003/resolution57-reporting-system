import { useEffect, useState } from "react"
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Typography,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Switch
} from "antd"
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  BankOutlined,
  EyeOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  LinkOutlined
} from "@ant-design/icons"
import type { ColumnsType, TablePaginationConfig } from "antd/es/table"
import {
  createOrganization,
  deleteOrganization,
  getOrganizationList,
  Organization,
  OrganizationStatus,
  OrganizationType,
  updateOrganization
} from "@/services/organizationApi"

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

function OrganizationManagement() {
  const [organizationList, setOrganizationList] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [typeFilter, setTypeFilter] = useState<OrganizationType | undefined>()
  const [statusFilter, setStatusFilter] = useState<
    OrganizationStatus | undefined
  >()
  const [isVnuhcmFilter, setIsVnuhcmFilter] = useState<boolean | undefined>()
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [form] = Form.useForm()

  // Pagination
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    total: organizationList.length
  })

  // Filter organizationList
  // const filteredOrganizations = organizationList.filter((org) => {
  //   const matchSearch = searchText
  //     ? org.name.toLowerCase().includes(searchText.toLowerCase()) ||
  //       org.code.toLowerCase().includes(searchText.toLowerCase()) ||
  //       org.short_name?.toLowerCase().includes(searchText.toLowerCase())
  //     : true
  //   const matchType = typeFilter ? org.type === typeFilter : true
  //   const matchStatus = statusFilter ? org.status === statusFilter : true
  //   const matchIsVnuhcm =
  //     isVnuhcmFilter !== undefined ? org.is_vnuhcm === isVnuhcmFilter : true
  //   return matchSearch && matchType && matchStatus && matchIsVnuhcm
  // })

  // Get organization type label
  const getOrganizationTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      [OrganizationType.UNIVERSITY_SYSTEM]: "Đại học Quốc gia",
      [OrganizationType.UNIVERSITY]: "Trường thành viên",
      [OrganizationType.RESEARCH_INSTITUTE]: "Viện nghiên cứu",
      [OrganizationType.CENTER]: "Trung tâm",
      [OrganizationType.DEPARTMENT]: "Phòng ban",
      [OrganizationType.EXTERNAL]: "Đơn vị ngoài"
    }

    return typeLabels[type] || type
  }

  // Get organization type color
  const getOrganizationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      [OrganizationType.UNIVERSITY_SYSTEM]: "purple",
      [OrganizationType.UNIVERSITY]: "blue",
      [OrganizationType.RESEARCH_INSTITUTE]: "cyan",
      [OrganizationType.CENTER]: "green",
      [OrganizationType.DEPARTMENT]: "orange",
      [OrganizationType.EXTERNAL]: "default"
    }
    return colors[type] || "default"
  }

  // Get parent organization name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-"
    const parent = organizationList.find((org) => org.id === parentId)
    return parent ? parent.code : "-"
  }

  // Handle table change
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination(newPagination)
  }

  // Handle add
  const handleAdd = () => {
    setSelectedOrganization(null)
    form.resetFields()
    setEditModalVisible(true)
  }

  // Handle edit
  const handleEdit = (organization: Organization) => {
    setSelectedOrganization(organization)
    form.setFieldsValue(organization)
    setEditModalVisible(true)
  }

  // Handle view
  const handleView = (organization: Organization) => {
    setSelectedOrganization(organization)
    setViewModalVisible(true)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const data = await deleteOrganization(id)
      if (data.success) {
        message.success("Đã xóa đơn vị thành công")
        await fetchOrganizations(
          pagination.pageSize!,
          organizationList.length === 1
            ? pagination.current! - 1
            : pagination.current!
        )
      } else {
        message.error("Có lỗi xảy ra khi xóa đơn vị")
      }
    } catch (error) {
      console.error("Error deleting organization:", error)
      message.error("Có lỗi xảy ra khi xóa đơn vị")
    }
  }

  // Handle modal OK
  const handleModalOk = async () => {
    try {
      setActionLoading(true)
      const values = await form.validateFields()
      if (selectedOrganization) {
        const data = await updateOrganization(selectedOrganization.id, values)
        if (data.success) {
          message.success("Đã cập nhật đơn vị thành công")
          await fetchOrganizations(pagination.pageSize!, pagination.current!)
        } else {
          message.error("Có lỗi xảy ra khi cập nhật đơn vị")
        }
      } else {
        const data = await createOrganization(values)
        if (data.success) {
          message.success("Đã thêm đơn vị mới thành công")
          await fetchOrganizations(pagination.pageSize!, pagination.current!)
        } else {
          message.error("Có lỗi xảy ra khi thêm đơn vị mới")
        }
      }
      setEditModalVisible(false)
      setSelectedOrganization(null)
      form.resetFields()
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle modal cancel
  const handleModalCancel = () => {
    setEditModalVisible(false)
    setViewModalVisible(false)
    form.resetFields()
  }

  // Columns
  const columns: ColumnsType<Organization> = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (code: string) => (
        <Text strong style={{ color: "#1890ff" }}>
          {code}
        </Text>
      )
    },
    {
      title: "Tên đơn vị",
      dataIndex: "name",
      key: "name",
      width: 250,
      ellipsis: true,
      render: (name: string, record: Organization) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.short_name}
          </Text>
        </div>
      )
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 150,
      render: (type: string) => (
        <Tag color={getOrganizationTypeColor(type)}>
          {getOrganizationTypeLabel(type)}
        </Tag>
      )
    },
    {
      title: "Đơn vị cha",
      dataIndex: "parent_id",
      key: "parent_id",
      width: 120,
      render: (parentId: string | null) => (
        <Text type={parentId ? "default" : "secondary"}>
          {getParentName(parentId)}
        </Text>
      )
    },
    {
      title: "ĐHQG-HCM",
      dataIndex: "is_vnuhcm",
      key: "is_vnuhcm",
      width: 100,
      align: "center",
      render: (isVnuhcm: boolean) => (
        <Tag color={isVnuhcm ? "green" : "default"}>
          {isVnuhcm ? "Có" : "Không"}
        </Tag>
      )
    },
    {
      title: "Liên hệ",
      key: "contact",
      width: 200,
      ellipsis: true,
      render: (_: any, record: Organization) => (
        <Space direction="vertical" size={0}>
          {record.contact_email && (
            <Text style={{ fontSize: "12px" }}>
              <MailOutlined /> {record.contact_email}
            </Text>
          )}
          {record.contact_phone && (
            <Text style={{ fontSize: "12px" }}>
              <PhoneOutlined /> {record.contact_phone}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: "Website",
      dataIndex: "website",
      key: "website",
      width: 150,
      ellipsis: true,
      render: (website: string) =>
        website ? (
          <a href={website} target="_blank" rel="noopener noreferrer">
            <LinkOutlined /> Link
          </a>
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      fixed: "right",
      render: (status: string) => (
        <Tag
          color={status === OrganizationStatus.ACTIVE ? "success" : "default"}>
          {status === OrganizationStatus.ACTIVE
            ? "Hoạt động"
            : "Không hoạt động"}
        </Tag>
      )
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_: any, record: Organization) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa đơn vị này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  const fetchOrganizations = async (per_page: number, page: number) => {
    try {
      setLoading(true)
      const data = await getOrganizationList({
        is_vnuhcm: isVnuhcmFilter,
        type: typeFilter,
        status: statusFilter,
        search: searchText,
        page,
        per_page
      })
      setOrganizationList(data.data)
      setPagination({
        pageSize: data.pagination.per_page,
        total: data.pagination.total,
        current: data.pagination.current_page
      })
    } catch (error: any) {
      const errorMessage =
        error.message || "Có lỗi xảy ra khi tải danh sách đơn vị"
      message.error(errorMessage, 5) // Show for 5 seconds
      console.error("Error fetching organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations(pagination.pageSize!, 1)
  }, [])

  useEffect(() => {
    fetchOrganizations(pagination.pageSize!, 1)
  }, [typeFilter, statusFilter, isVnuhcmFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrganizations(pagination.pageSize!, 1)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchText])

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div>
            <Title level={3}>
              <BankOutlined /> Quản lý Đơn vị
            </Title>
            <Text type="secondary">
              Quản lý thông tin các đơn vị trong hệ thống ĐHQG-HCM
            </Text>
          </div>

          {/* Filters and Actions */}
          <Space
            wrap
            style={{ width: "100%", justifyContent: "space-between" }}>
            <Space wrap>
              <Input
                placeholder="Tìm kiếm theo mã, tên đơn vị..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />

              <Select
                placeholder="Loại đơn vị"
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 180 }}
                allowClear>
                <Option value={OrganizationType.UNIVERSITY_SYSTEM}>
                  Đại học Quốc gia
                </Option>
                <Option value={OrganizationType.UNIVERSITY}>
                  Trường thành viên
                </Option>
                <Option value={OrganizationType.RESEARCH_INSTITUTE}>
                  Viện nghiên cứu
                </Option>
                <Option value={OrganizationType.CENTER}>Trung tâm</Option>
                <Option value={OrganizationType.DEPARTMENT}>Phòng ban</Option>
                <Option value={OrganizationType.EXTERNAL}>Đơn vị ngoài</Option>
              </Select>

              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                allowClear>
                <Option value={OrganizationStatus.ACTIVE}>Hoạt động</Option>
                <Option value={OrganizationStatus.INACTIVE}>
                  Không hoạt động
                </Option>
              </Select>

              <Select
                placeholder="Thuộc ĐHQG-HCM"
                value={isVnuhcmFilter}
                onChange={setIsVnuhcmFilter}
                style={{ width: 150 }}
                allowClear>
                <Option value={true}>Có</Option>
                <Option value={false}>Không</Option>
              </Select>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText("")
                  setTypeFilter(undefined)
                  setStatusFilter(undefined)
                  setIsVnuhcmFilter(undefined)
                  fetchOrganizations(pagination.pageSize!, 1)
                }}>
                Làm mới
              </Button>
            </Space>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm đơn vị mới
            </Button>
          </Space>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={organizationList}
            loading={loading}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} đơn vị`,
              onChange: (page, pageSize) => {
                fetchOrganizations(pageSize, page)
              }
            }}
            onChange={handleTableChange}
            scroll={{ x: 1400 }}
            bordered
          />
        </Space>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={selectedOrganization ? "Chỉnh sửa đơn vị" : "Thêm đơn vị mới"}
        open={editModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={800}
        okText={selectedOrganization ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: OrganizationStatus.ACTIVE,
            is_vnuhcm: true
          }}>
          <Form.Item
            label="Mã đơn vị"
            name="code"
            rules={[{ required: true, message: "Vui lòng nhập mã đơn vị" }]}>
            <Input placeholder="Ví dụ: HCMUS" />
          </Form.Item>

          <Form.Item
            label="Tên đầy đủ"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên đơn vị" }]}>
            <Input placeholder="Ví dụ: Trường Đại học Khoa học Tự nhiên" />
          </Form.Item>

          <Form.Item
            label="Tên viết tắt"
            name="short_name"
            rules={[{ required: true, message: "Vui lòng nhập tên viết tắt" }]}>
            <Input placeholder="Ví dụ: KHTN" />
          </Form.Item>

          <Space style={{ width: "100%" }} size="large">
            <Form.Item
              label="Loại đơn vị"
              name="type"
              rules={[{ required: true, message: "Vui lòng chọn loại đơn vị" }]}
              style={{ width: 350 }}>
              <Select placeholder="Chọn loại đơn vị">
                <Option value={OrganizationType.UNIVERSITY_SYSTEM}>
                  Đại học Quốc gia
                </Option>
                <Option value={OrganizationType.UNIVERSITY}>
                  Trường thành viên
                </Option>
                <Option value={OrganizationType.RESEARCH_INSTITUTE}>
                  Viện nghiên cứu
                </Option>
                <Option value={OrganizationType.CENTER}>Trung tâm</Option>
                <Option value={OrganizationType.DEPARTMENT}>Phòng ban</Option>
                <Option value={OrganizationType.EXTERNAL}>Đơn vị ngoài</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Đơn vị cha"
              name="parent_id"
              style={{ width: 350 }}>
              <Select placeholder="Chọn đơn vị cha" allowClear>
                {organizationList.map((org) => (
                  <Option key={org.id} value={org.id}>
                    {org.code}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="large">
            <Form.Item
              label="Email liên hệ"
              name="contact_email"
              style={{ width: 350 }}>
              <Input placeholder="email@example.com" />
            </Form.Item>

            <Form.Item
              label="Điện thoại"
              name="contact_phone"
              style={{ width: 350 }}>
              <Input placeholder="028 xxxx xxxx" />
            </Form.Item>
          </Space>

          <Form.Item
            label="Website"
            name="website"
            rules={[
              {
                pattern: /^(https?:\/\/)[\w.-]+(\.[\w.-]+)+[^\s]*$/,
                message: "Vui lòng nhập URL hợp lệ"
              }
            ]}>
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <TextArea rows={2} placeholder="Nhập địa chỉ đơn vị" />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <TextArea rows={3} placeholder="Nhập mô tả về đơn vị" />
          </Form.Item>

          <Space style={{ width: "100%" }} size="large">
            <Form.Item
              label="Thuộc ĐHQG-HCM"
              name="is_vnuhcm"
              valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              label="Trạng thái"
              name="status"
              rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}>
              <Select style={{ width: 200 }}>
                <Option value={OrganizationStatus.ACTIVE}>Hoạt động</Option>
                <Option value={OrganizationStatus.INACTIVE}>
                  Không hoạt động
                </Option>
              </Select>
            </Form.Item>

            <Form.Item label="Thứ tự hiển thị" name="display_order">
              <Input type="number" placeholder="0" style={{ width: 150 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        title={
          <Space>
            <BankOutlined />
            <span>Chi tiết đơn vị</span>
          </Space>
        }
        open={viewModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button key="close" onClick={handleModalCancel}>
            Đóng
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setViewModalVisible(false)
              if (selectedOrganization) {
                handleEdit(selectedOrganization)
              }
            }}>
            Chỉnh sửa
          </Button>
        ]}
        width={700}>
        {selectedOrganization && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Mã đơn vị:</Text>
              <br />
              <Text strong style={{ fontSize: "16px" }}>
                {selectedOrganization.code}
              </Text>
            </div>

            <div>
              <Text type="secondary">Tên đơn vị:</Text>
              <br />
              <Title level={4} style={{ margin: 0 }}>
                {selectedOrganization.name}
              </Title>
              <Text type="secondary">({selectedOrganization.short_name})</Text>
            </div>

            <Space wrap>
              <div>
                <Text type="secondary">Loại:</Text>
                <br />
                <Tag
                  color={getOrganizationTypeColor(selectedOrganization.type)}>
                  {getOrganizationTypeLabel(selectedOrganization.type)}
                </Tag>
              </div>

              {selectedOrganization.parent_id && (
                <div>
                  <Text type="secondary">Đơn vị cha:</Text>
                  <br />
                  <Text strong>
                    {getParentName(selectedOrganization.parent_id)}
                  </Text>
                </div>
              )}

              <div>
                <Text type="secondary">Thuộc ĐHQG-HCM:</Text>
                <br />
                <Tag
                  color={selectedOrganization.is_vnuhcm ? "green" : "default"}>
                  {selectedOrganization.is_vnuhcm ? "Có" : "Không"}
                </Tag>
              </div>

              <div>
                <Text type="secondary">Trạng thái:</Text>
                <br />
                <Tag
                  color={
                    selectedOrganization.status === OrganizationStatus.ACTIVE
                      ? "success"
                      : "default"
                  }>
                  {selectedOrganization.status === OrganizationStatus.ACTIVE
                    ? "Hoạt động"
                    : "Không hoạt động"}
                </Tag>
              </div>
            </Space>

            {selectedOrganization.description && (
              <div>
                <Text type="secondary">Mô tả:</Text>
                <br />
                <Text>{selectedOrganization.description}</Text>
              </div>
            )}

            <div>
              <Text type="secondary">Liên hệ:</Text>
              <br />
              <Space direction="vertical" size={0}>
                {selectedOrganization.contact_email && (
                  <Text>
                    <MailOutlined /> {selectedOrganization.contact_email}
                  </Text>
                )}
                {selectedOrganization.contact_phone && (
                  <Text>
                    <PhoneOutlined /> {selectedOrganization.contact_phone}
                  </Text>
                )}
              </Space>
            </div>

            {selectedOrganization.address && (
              <div>
                <Text type="secondary">Địa chỉ:</Text>
                <br />
                <Text>
                  <EnvironmentOutlined /> {selectedOrganization.address}
                </Text>
              </div>
            )}

            {selectedOrganization.website && (
              <div>
                <Text type="secondary">Website:</Text>
                <br />
                <a
                  href={selectedOrganization.website}
                  target="_blank"
                  rel="noopener noreferrer">
                  <GlobalOutlined /> {selectedOrganization.website}
                </a>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default OrganizationManagement
