import { useState, useEffect, useMemo, useCallback } from "react"
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
  Divider,
  List,
  Tooltip
} from "antd"
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
  BankOutlined,
  GlobalOutlined,
  FolderOutlined,
  OrderedListOutlined,
  MinusCircleOutlined
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import { useAuth } from "../../shared/hooks"
import * as kpiApi from "../../services/kpiApi"
import type {
  Kpi,
  KpiCategory,
  KpiTask,
  CreateKpiRequest,
  UpdateKpiRequest
} from "../../services/kpiApi"
import AdvancedFilter, {
  FilterField,
  FilterValues
} from "../../shared/components/AdvancedFilter"
import ColumnToggle, {
  ToggleableColumn
} from "../../shared/components/ColumnToggle"
import { ImportExcelModal } from "../../shared/components/ImportExcelModal"
import { FileExcelOutlined } from "@ant-design/icons"
import KpiCategoryManagement from "./KpiCategoryManagement"
import "./KpiManagement.css"
import { t } from "i18next"

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

function KpiManagement() {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0
  })
  const [activeTab, setActiveTab] = useState<"CENTRAL" | "VNU">("CENTRAL")
  const [mainTab, setMainTab] = useState<"kpis" | "categories">("kpis")
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null)
  const [categories, setCategories] = useState<KpiCategory[]>([])
  const [kpiTasks, setKpiTasks] = useState<
    Array<Partial<KpiTask> & { _tempId?: string; _delete?: boolean }>
  >([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [form] = Form.useForm()
  const { user: currentUser } = useAuth()

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "index",
    "code",
    "title",
    "category",
    "order_number",
    "is_active",
    "creator",
    "actions"
  ])

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: "",
    category_id: undefined,
    is_active: undefined
  })

  // Check if current user can manage KPIs (OPERATOR or ADMIN only)
  const canManage =
    currentUser?.role === "OPERATOR" || currentUser?.role === "ADMIN"

  // Advanced filter fields configuration
  const filterFields: FilterField[] = useMemo(() => {
    return [
      {
        key: "search",
        label: "Tìm kiếm",
        type: "text",
        placeholder: "Tìm theo mã hoặc tiêu đề...",
        span: 10
      },
      {
        key: "category_id",
        label: "Loại KPI",
        type: "select",
        span: 8,
        options: categories.map((cat) => ({
          value: cat.id,
          label: cat.name
        }))
      },
      {
        key: "is_active",
        label: "Trạng thái",
        type: "boolean",
        span: 6
      }
    ]
  }, [categories])

  // Handle filter change
  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues)
  }

  // Handle filter search
  const handleFilterSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchKpis()
  }

  // Handle filter reset
  const handleFilterReset = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  useEffect(() => {
    if (canManage) {
      fetchKpis()
      fetchCategories()
    }
  }, [activeTab, pagination.current, canManage])

  const fetchKpis = async () => {
    setLoading(true)
    try {
      const response = await kpiApi.getKpis({
        source: activeTab,
        search: filterValues.search || undefined,
        category_id: filterValues.category_id,
        is_active: filterValues.is_active,
        page: pagination.current,
        per_page: pagination.pageSize
      })

      setKpis(response.data)
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total
      }))
    } catch (error: any) {
      message.error(error.message || "Không thể tải danh sách KPI")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = useCallback(async () => {
    try {
      const response = await kpiApi.getKpiCategories({
        is_active: true,
        per_page: 100
      })
      setCategories(response.data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }, [])

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    })
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key as "CENTRAL" | "VNU")
    setPagination({ ...pagination, current: 1 })
    setFilterValues({
      search: "",
      category_id: undefined,
      is_active: undefined
    })
  }

  const handleMainTabChange = (key: string) => {
    setMainTab(key as "kpis" | "categories")
  }

  const handleAdd = () => {
    setSelectedKpi(null)
    setKpiTasks([])
    form.resetFields()
    form.setFieldsValue({ source: activeTab, is_active: true })
    setEditModalVisible(true)
  }

  const handleEdit = async (kpi: Kpi) => {
    setSelectedKpi(kpi)
    form.setFieldsValue(kpi)
    setEditModalVisible(true)

    // Load tasks for this KPI
    setTasksLoading(true)
    try {
      const response = await kpiApi.getKpiTasks(kpi.id)
      setKpiTasks(response.data || [])
    } catch (error) {
      console.error("Failed to load KPI tasks:", error)
      setKpiTasks([])
    } finally {
      setTasksLoading(false)
    }
  }

  // KPI Tasks management functions
  const handleAddTask = () => {
    const newTask: Partial<KpiTask> & { _tempId: string } = {
      _tempId: `temp_${Date.now()}`,
      title: "",
      code: "",
      description: "",
      target_value: "",
      unit: "",
      order_number: kpiTasks.filter((t) => !t._delete).length + 1,
      is_active: true
    }
    setKpiTasks([...kpiTasks, newTask])
  }

  const handleUpdateTask = (index: number, field: string, value: any) => {
    const updatedTasks = [...kpiTasks]
    updatedTasks[index] = { ...updatedTasks[index], [field]: value }
    setKpiTasks(updatedTasks)
  }

  const handleRemoveTask = (index: number) => {
    const task = kpiTasks[index]
    if (task.id) {
      // Mark existing task for deletion
      const updatedTasks = [...kpiTasks]
      updatedTasks[index] = { ...task, _delete: true }
      setKpiTasks(updatedTasks)
    } else {
      // Remove new task directly
      setKpiTasks(kpiTasks.filter((_, i) => i !== index))
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      await kpiApi.deleteKpi(id)
      message.success("Đã xóa KPI thành công")
      fetchKpis()
    } catch (error: any) {
      message.error(error.message || "Không thể xóa KPI")
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()

      // Validate tasks - check if any task has empty title
      const activeTasks = kpiTasks.filter((t) => !t._delete)
      const invalidTask = activeTasks.find((t) => !t.title?.trim())
      if (invalidTask) {
        message.error("Vui lòng nhập tiêu đề cho tất cả nhiệm vụ")
        return
      }

      setActionLoading(true)

      let kpiId: string

      if (selectedKpi) {
        // Update existing KPI
        await kpiApi.updateKpi(selectedKpi.id, values as UpdateKpiRequest)
        kpiId = selectedKpi.id
        message.success("Đã cập nhật KPI thành công")
      } else {
        // Create new KPI
        const response = await kpiApi.createKpi(values as CreateKpiRequest)
        kpiId = response.data.id
        message.success("Đã tạo KPI thành công")
      }

      // Save tasks if any
      if (kpiTasks.length > 0) {
        const tasksToSave = kpiTasks.map((task, index) => ({
          id: task.id,
          code: task.code || "",
          title: task.title || "",
          description: task.description || "",
          target_value: task.target_value || "",
          unit: task.unit || "",
          order_number: index + 1,
          is_active: task.is_active ?? true,
          _delete: task._delete
        }))

        try {
          await kpiApi.batchUpdateKpiTasks(kpiId, { tasks: tasksToSave })
        } catch (taskError: any) {
          console.error("Failed to save tasks:", taskError)
          message.warning("KPI đã được lưu, nhưng có lỗi khi lưu nhiệm vụ")
        }
      }

      setEditModalVisible(false)
      setKpiTasks([])
      form.resetFields()
      fetchKpis()
    } catch (error: any) {
      if (error.errorFields) {
        // Validation error
        return
      }
      message.error(error.message || "Có lỗi xảy ra")
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalCancel = () => {
    setEditModalVisible(false)
    setSelectedKpi(null)
    setKpiTasks([])
    form.resetFields()
  }

  // Toggleable columns configuration
  const toggleableColumns: ToggleableColumn[] = useMemo(
    () => [
      { key: "index", title: "STT", fixed: true },
      { key: "code", title: "Mã KPI", defaultVisible: true },
      { key: "title", title: "Tiêu đề", fixed: true },
      { key: "category", title: "Danh mục", defaultVisible: true },
      { key: "order_number", title: "Thứ tự", defaultVisible: true },
      { key: "is_active", title: "Trạng thái", defaultVisible: true },
      { key: "creator", title: "Người tạo", defaultVisible: true },
      { key: "actions", title: t("common.actions"), fixed: true }
    ],
    []
  )

  const allColumns: ColumnsType<Kpi> = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_: any, __: any, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1
    },
    {
      title: "Mã KPI",
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: (a, b) => (a.code || "").localeCompare(b.code || ""),
      render: (code: string) => (
        <Text strong style={{ color: "#1890ff" }}>
          {code || "-"}
        </Text>
      )
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
      render: (title: string) => <Text>{title}</Text>
    },
    {
      title: "Loại KPI",
      dataIndex: "kpi_category",
      key: "category",
      width: 180,
      sorter: (a, b) =>
        (a.kpi_category?.name || a.category || "").localeCompare(
          b.kpi_category?.name || b.category || ""
        ),
      render: (_: any, record: Kpi) => {
        const categoryName = record.kpi_category?.name || record.category
        return categoryName ? (
          <Tag color="blue">{categoryName}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
      }
    },
    {
      title: "Thứ tự",
      dataIndex: "order_number",
      key: "order_number",
      width: 80,
      align: "center",
      sorter: (a, b) => (a.order_number || 0) - (b.order_number || 0),
      render: (order: number) => <Text>{order || 0}</Text>
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      align: "center",
      sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
      filters: [
        { text: "Hoạt động", value: true },
        { text: "Không hoạt động", value: false }
      ],
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Hoạt động" : "Không hoạt động"}
        </Tag>
      )
    },
    {
      title: "Người tạo",
      dataIndex: ["creator", "email"],
      key: "creator",
      width: 150,
      sorter: (a, b) =>
        (a.creator?.email || "").localeCompare(b.creator?.email || ""),
      render: (email: string) => <Text type="secondary">{email || "-"}</Text>
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 150,
      fixed: "right",
      align: "center",
      render: (_: any, record: Kpi) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa KPI này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}>
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Filter columns based on visibility
  const columns = useMemo(
    () =>
      allColumns.filter((col) => visibleColumns.includes(col.key as string)),
    [allColumns, visibleColumns]
  )

  if (!canManage) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <TrophyOutlined
            style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }}
          />
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
    <div style={{ padding: "0" }}>
      <Card>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            <TrophyOutlined /> Quản lý KPI
          </Title>
          <Text type="secondary">
            Quản lý các chỉ tiêu KPI của Nghị quyết 57
          </Text>
        </div>

        {/* Main Tabs: KPI List and KPI Categories */}
        <Tabs
          activeKey={mainTab}
          onChange={handleMainTabChange}
          style={{ marginBottom: 16 }}>
          <TabPane
            tab={
              <span>
                <TrophyOutlined />
                Danh sách KPI
              </span>
            }
            key="kpis">
            {/* Advanced Filter */}
            <AdvancedFilter
              fields={filterFields}
              values={filterValues}
              onChange={handleFilterChange}
              onSearch={handleFilterSearch}
              onReset={handleFilterReset}
              loading={loading}
              storageKey={`kpi_management_${activeTab}_filters`}
              showPresets={true}
              collapsible={true}
              defaultExpanded={true}
              extra={
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchKpis}
                    loading={loading}>
                    {t("common.refresh")}
                  </Button>
                  <ColumnToggle
                    columns={toggleableColumns}
                    visibleColumns={visibleColumns}
                    onChange={setVisibleColumns}
                    storageKey={`kpi_management_${activeTab}`}
                  />
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={() => setImportModalVisible(true)}>
                    Import Excel
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}>
                    Thêm KPI mới
                  </Button>
                </Space>
              }
            />

            {/* Tabs for CENTRAL and VNU */}
            <div style={{ marginBottom: 16 }}>
              <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <TabPane
                  tab={
                    <span>
                      <GlobalOutlined />
                      Trung ương
                    </span>
                  }
                  key="CENTRAL"
                />
                <TabPane
                  tab={
                    <span>
                      <BankOutlined />
                      ĐHQG-HCM
                    </span>
                  }
                  key="VNU"
                />
              </Tabs>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              dataSource={kpis}
              loading={loading}
              rowKey="id"
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} KPI`
              }}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FolderOutlined />
                Quản lý loại KPI
              </span>
            }
            key="categories">
            <KpiCategoryManagement onCategoriesChange={fetchCategories} />
          </TabPane>
        </Tabs>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={selectedKpi ? "Chỉnh sửa KPI" : "Thêm KPI mới"}
        open={editModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={900}
        okText={selectedKpi ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}>
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="source"
                label="Nguồn"
                rules={[{ required: true, message: "Vui lòng chọn nguồn" }]}>
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
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
            <Input placeholder="Nhập tiêu đề KPI" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả chi tiết" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category_id" label="Loại KPI">
                <Select
                  placeholder="Chọn loại KPI"
                  allowClear
                  showSearch
                  optionFilterProp="children">
                  {categories.map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="order_number" label="Thứ tự hiển thị">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Trạng thái"
            valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>

          {/* KPI Tasks Section */}
          <Divider orientation="left">
            <Space>
              <OrderedListOutlined />
              <span>
                Nhiệm vụ con ({kpiTasks.filter((t) => !t._delete).length})
              </span>
            </Space>
          </Divider>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Thêm các nhiệm vụ nhỏ để theo dõi tiến độ thực hiện KPI này
            </Text>
          </div>

          {tasksLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Text type="secondary">Đang tải nhiệm vụ...</Text>
            </div>
          ) : (
            <>
              {kpiTasks.filter((t) => !t._delete).length > 0 && (
                <List
                  dataSource={kpiTasks.map((task, index) => ({
                    ...task,
                    _index: index
                  }))}
                  renderItem={(task) => {
                    if (task._delete) return null
                    const index = task._index
                    return (
                      <List.Item
                        style={{
                          padding: "12px",
                          marginBottom: 8,
                          backgroundColor: "#fafafa",
                          borderRadius: 8,
                          border: "1px solid #f0f0f0"
                        }}>
                        <div style={{ width: "100%" }}>
                          <Row gutter={[12, 8]} align="middle">
                            <Col xs={24} md={6}>
                              <Input
                                placeholder="Mã nhiệm vụ"
                                value={task.code || ""}
                                onChange={(e) =>
                                  handleUpdateTask(
                                    index,
                                    "code",
                                    e.target.value
                                  )
                                }
                                size="small"
                              />
                            </Col>
                            <Col xs={24} md={14}>
                              <Input
                                placeholder="Tiêu đề nhiệm vụ *"
                                value={task.title || ""}
                                onChange={(e) =>
                                  handleUpdateTask(
                                    index,
                                    "title",
                                    e.target.value
                                  )
                                }
                                size="small"
                                status={
                                  !task.title?.trim() ? "error" : undefined
                                }
                              />
                            </Col>
                            <Col xs={24} md={4} style={{ textAlign: "right" }}>
                              <Tooltip title="Xóa nhiệm vụ">
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => handleRemoveTask(index)}
                                  size="small"
                                />
                              </Tooltip>
                            </Col>
                          </Row>
                          <Row gutter={[12, 8]} style={{ marginTop: 8 }}>
                            <Col xs={24} md={12}>
                              <Input
                                placeholder="Giá trị mục tiêu"
                                value={task.target_value || ""}
                                onChange={(e) =>
                                  handleUpdateTask(
                                    index,
                                    "target_value",
                                    e.target.value
                                  )
                                }
                                size="small"
                                addonBefore="Mục tiêu"
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <Input
                                placeholder="Đơn vị đo lường"
                                value={task.unit || ""}
                                onChange={(e) =>
                                  handleUpdateTask(
                                    index,
                                    "unit",
                                    e.target.value
                                  )
                                }
                                size="small"
                                addonBefore="Đơn vị"
                              />
                            </Col>
                          </Row>
                          <Row style={{ marginTop: 8 }}>
                            <Col span={24}>
                              <Input.TextArea
                                placeholder="Mô tả chi tiết (tùy chọn)"
                                value={task.description || ""}
                                onChange={(e) =>
                                  handleUpdateTask(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                rows={2}
                                size="small"
                              />
                            </Col>
                          </Row>
                        </div>
                      </List.Item>
                    )
                  }}
                />
              )}

              <Button
                type="dashed"
                onClick={handleAddTask}
                icon={<PlusOutlined />}
                style={{ width: "100%", marginTop: 8 }}>
                Thêm nhiệm vụ mới
              </Button>
            </>
          )}
        </Form>
      </Modal>

      {/* Import Excel Modal */}
      <ImportExcelModal
        open={importModalVisible}
        type="kpis"
        onClose={() => setImportModalVisible(false)}
        onSuccess={fetchKpis}
      />
    </div>
  )
}

export default KpiManagement
