import { useState, useEffect, useMemo } from "react"
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Modal,
  Form,
  message,
  Typography,
  Switch,
  InputNumber,
  Row,
  Col,
  Popconfirm
} from "antd"
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  FolderOutlined
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import * as kpiApi from "../../services/kpiApi"
import type {
  KpiCategory,
  CreateKpiCategoryRequest,
  UpdateKpiCategoryRequest
} from "../../services/kpiApi"
import { t } from "i18next"

const { Text } = Typography
const { TextArea } = Input

interface KpiCategoryManagementProps {
  onCategoriesChange?: () => void
}

function KpiCategoryManagement({
  onCategoriesChange
}: KpiCategoryManagementProps) {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [categories, setCategories] = useState<KpiCategory[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  })
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<KpiCategory | null>(
    null
  )
  const [searchText, setSearchText] = useState("")
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCategories()
  }, [pagination.current])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await kpiApi.getKpiCategories({
        search: searchText || undefined,
        page: pagination.current,
        per_page: pagination.pageSize
      })

      setCategories(response.data)
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total
      }))
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách loại KPI")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchCategories()
  }

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    })
  }

  const handleAdd = () => {
    setSelectedCategory(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setEditModalVisible(true)
  }

  const handleEdit = (category: KpiCategory) => {
    setSelectedCategory(category)
    form.setFieldsValue(category)
    setEditModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      await kpiApi.deleteKpiCategory(id)
      message.success("Đã xóa loại KPI thành công")
      fetchCategories()
      onCategoriesChange?.()
    } catch (error: any) {
      message.error(error.message || "Không thể xóa loại KPI")
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setActionLoading(true)

      if (selectedCategory) {
        await kpiApi.updateKpiCategory(
          selectedCategory.id,
          values as UpdateKpiCategoryRequest
        )
        message.success("Đã cập nhật loại KPI thành công")
      } else {
        await kpiApi.createKpiCategory(values as CreateKpiCategoryRequest)
        message.success("Đã tạo loại KPI thành công")
      }

      setEditModalVisible(false)
      form.resetFields()
      fetchCategories()
      onCategoriesChange?.()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || "Có lỗi xảy ra")
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalCancel = () => {
    setEditModalVisible(false)
    setSelectedCategory(null)
    form.resetFields()
  }

  const columns: ColumnsType<KpiCategory> = useMemo(
    () => [
      {
        title: "STT",
        key: "index",
        width: 60,
        align: "center",
        render: (_: any, __: any, index: number) =>
          (pagination.current - 1) * pagination.pageSize + index + 1
      },
      {
        title: "Mã loại",
        dataIndex: "code",
        key: "code",
        width: 120,
        sorter: (a, b) => (a.code || "").localeCompare(b.code || ""),
        render: (code: string) => (
          <Text strong style={{ color: "#1890ff" }}>
            {code}
          </Text>
        )
      },
      {
        title: "Tên loại KPI",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        render: (name: string) => <Text>{name}</Text>
      },
      {
        title: "Mô tả",
        dataIndex: "description",
        key: "description",
        ellipsis: true,
        render: (desc: string) => <Text type="secondary">{desc || "-"}</Text>
      },
      {
        title: "Thứ tự",
        dataIndex: "display_order",
        key: "display_order",
        width: 80,
        align: "center",
        sorter: (a, b) => (a.display_order || 0) - (b.display_order || 0),
        render: (order: number) => <Text>{order || 0}</Text>
      },
      {
        title: "Số KPI",
        dataIndex: "kpis_count",
        key: "kpis_count",
        width: 80,
        align: "center",
        sorter: (a, b) => (a.kpis_count || 0) - (b.kpis_count || 0),
        render: (count: number) => (
          <Tag color={count > 0 ? "blue" : "default"}>{count || 0}</Tag>
        )
      },
      {
        title: "Trạng thái",
        dataIndex: "is_active",
        key: "is_active",
        width: 100,
        align: "center",
        filters: [
          { text: "Hoạt động", value: true },
          { text: "Không hoạt động", value: false }
        ],
        render: (isActive: boolean) => (
          <Tag color={isActive ? "success" : "default"}>
            {isActive ? "Hoạt động" : "Tắt"}
          </Tag>
        )
      },
      {
        title: t("common.actions"),
        key: "actions",
        width: 150,
        fixed: "right",
        align: "center",
        render: (_: any, record: KpiCategory) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa?"
              description={
                record.kpis_count && record.kpis_count > 0
                  ? `Loại KPI này đang được sử dụng bởi ${record.kpis_count} chỉ tiêu. Không thể xóa.`
                  : "Hành động này không thể hoàn tác."
              }
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{
                danger: true,
                disabled:
                  record.kpis_count !== undefined && record.kpis_count > 0
              }}>
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={
                  record.kpis_count !== undefined && record.kpis_count > 0
                }>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [pagination.current, pagination.pageSize]
  )

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
        <Space>
          <Input.Search
            placeholder="Tìm theo mã hoặc tên..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchCategories}
            loading={loading}>
            {t("common.refresh")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm loại KPI
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={categories}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} loại KPI`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={
          <Space>
            <FolderOutlined />
            {selectedCategory ? "Chỉnh sửa loại KPI" : "Thêm loại KPI mới"}
          </Space>
        }
        open={editModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={600}
        okText={selectedCategory ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true, display_order: 0 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã loại KPI"
                rules={[
                  { required: true, message: "Vui lòng nhập mã loại KPI" },
                  { max: 50, message: "Mã không được vượt quá 50 ký tự" }
                ]}>
                <Input
                  placeholder="VD: QTDH, DT, KHCN..."
                  style={{ textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="display_order" label="Thứ tự hiển thị">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Tên loại KPI"
            rules={[
              { required: true, message: "Vui lòng nhập tên loại KPI" },
              { max: 255, message: "Tên không được vượt quá 255 ký tự" }
            ]}>
            <Input placeholder="Nhập tên loại KPI" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[
              { max: 1000, message: "Mô tả không được vượt quá 1000 ký tự" }
            ]}>
            <TextArea rows={3} placeholder="Nhập mô tả chi tiết (tùy chọn)" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Trạng thái"
            valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default KpiCategoryManagement
