import { useState, useEffect, useMemo } from 'react'
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
  AppstoreOutlined,
  TagsOutlined,
  SettingOutlined,
  FileOutlined,
  ReloadOutlined,
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
import * as fileTypeApi from '../../services/fileTypeApi'
import type {
  FileType,
  CreateFileTypeRequest,
  UpdateFileTypeRequest,
} from '../../services/fileTypeApi'
import AdvancedFilter, { FilterField, FilterValues } from '../../shared/components/AdvancedFilter'
import { ImportExcelModal } from '../../shared/components/ImportExcelModal'
import type { ImportType } from '../../shared/components/ImportExcelModal'
import { FileExcelOutlined } from '@ant-design/icons'
import './ActivityConfigManagement.css'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

function ActivityConfigManagement() {
  // Common state
  const [activeTab, setActiveTab] = useState<'types' | 'fields' | 'fileTypes'>('types')
  const { user: currentUser } = useAuth()

  // Activity Types state
  const [typesLoading, setTypesLoading] = useState(false)
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [typesPagination, setTypesPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [typesFilterValues, setTypesFilterValues] = useState<FilterValues>({
    search: '',
    is_active: undefined,
  })
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
  const [typeActionLoading, setTypeActionLoading] = useState(false)
  const [typeForm] = Form.useForm()

  // Activity Fields state
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [activityFields, setActivityFields] = useState<ActivityField[]>([])
  const [fieldsPagination, setFieldsPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [fieldsFilterValues, setFieldsFilterValues] = useState<FilterValues>({
    search: '',
    is_active: undefined,
  })
  const [fieldModalVisible, setFieldModalVisible] = useState(false)
  const [selectedField, setSelectedField] = useState<ActivityField | null>(null)
  const [fieldActionLoading, setFieldActionLoading] = useState(false)
  const [fieldForm] = Form.useForm()

  // File Types state
  const [fileTypesLoading, setFileTypesLoading] = useState(false)
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [fileTypesPagination, setFileTypesPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [fileTypesFilterValues, setFileTypesFilterValues] = useState<FilterValues>({
    search: '',
  })
  const [fileTypeModalVisible, setFileTypeModalVisible] = useState(false)
  const [selectedFileType, setSelectedFileType] = useState<FileType | null>(null)
  const [fileTypeActionLoading, setFileTypeActionLoading] = useState(false)
  const [fileTypeForm] = Form.useForm()

  // Import modal state
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importType, setImportType] = useState<ImportType>('activity_types')

  // Check if current user can manage (OPERATOR or ADMIN only)
  const canManage = currentUser?.role === 'OPERATOR' || currentUser?.role === 'ADMIN'

  // Filter fields configuration for Types
  const typesFilterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'text',
      placeholder: 'Tìm theo tên loại hoạt động...',
      span: 16,
    },
    {
      key: 'is_active',
      label: 'Trạng thái',
      type: 'boolean',
      span: 8,
    },
  ], [])

  // Filter fields configuration for Fields
  const fieldsFilterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'text',
      placeholder: 'Tìm theo tên lĩnh vực...',
      span: 16,
    },
    {
      key: 'is_active',
      label: 'Trạng thái',
      type: 'boolean',
      span: 8,
    },
  ], [])

  // Filter fields configuration for File Types
  const fileTypesFilterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'text',
      placeholder: 'Tìm theo mã hoặc tên loại tập tin...',
      span: 24,
    },
  ], [])

  // Filter handlers for Types
  const handleTypesFilterChange = (newValues: FilterValues) => {
    setTypesFilterValues(newValues)
  }

  const handleTypesFilterSearch = () => {
    setTypesPagination((prev) => ({ ...prev, current: 1 }))
    fetchActivityTypes()
  }

  const handleTypesFilterReset = () => {
    setTypesPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Filter handlers for Fields
  const handleFieldsFilterChange = (newValues: FilterValues) => {
    setFieldsFilterValues(newValues)
  }

  const handleFieldsFilterSearch = () => {
    setFieldsPagination((prev) => ({ ...prev, current: 1 }))
    fetchActivityFields()
  }

  const handleFieldsFilterReset = () => {
    setFieldsPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Filter handlers for File Types
  const handleFileTypesFilterChange = (newValues: FilterValues) => {
    setFileTypesFilterValues(newValues)
  }

  const handleFileTypesFilterSearch = () => {
    setFileTypesPagination((prev) => ({ ...prev, current: 1 }))
    fetchFileTypes()
  }

  const handleFileTypesFilterReset = () => {
    setFileTypesPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Fetch Activity Types
  const fetchActivityTypes = async () => {
    setTypesLoading(true)
    try {
      const response = await activityConfigApi.getActivityTypes({
        search: typesFilterValues.search || undefined,
        is_active: typesFilterValues.is_active,
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
        search: fieldsFilterValues.search || undefined,
        is_active: fieldsFilterValues.is_active,
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
  }, [activeTab, typesFilterValues, typesPagination.current, canManage])

  useEffect(() => {
    if (canManage && activeTab === 'fields') {
      fetchActivityFields()
    }
  }, [activeTab, fieldsFilterValues, fieldsPagination.current, canManage])

  // Fetch File Types
  const fetchFileTypes = async () => {
    setFileTypesLoading(true)
    try {
      const response = await fileTypeApi.getFileTypes({
        search: fileTypesFilterValues.search || undefined,
        page: fileTypesPagination.current,
        per_page: fileTypesPagination.pageSize,
      })

      setFileTypes(response.data)
      setFileTypesPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách loại tập tin')
    } finally {
      setFileTypesLoading(false)
    }
  }

  useEffect(() => {
    if (canManage && activeTab === 'fileTypes') {
      fetchFileTypes()
    }
  }, [activeTab, fileTypesFilterValues, fileTypesPagination.current, canManage])

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

  // ============== File Types Handlers ==============

  const handleFileTypesTableChange = (newPagination: any) => {
    setFileTypesPagination({
      ...fileTypesPagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleAddFileType = () => {
    setSelectedFileType(null)
    fileTypeForm.resetFields()
    setFileTypeModalVisible(true)
  }

  const handleEditFileType = (fileType: FileType) => {
    setSelectedFileType(fileType)
    fileTypeForm.setFieldsValue(fileType)
    setFileTypeModalVisible(true)
  }

  const handleDeleteFileType = async (id: string) => {
    setFileTypeActionLoading(true)
    try {
      await fileTypeApi.deleteFileType(id)
      message.success('Đã xóa loại tập tin thành công')
      fetchFileTypes()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa loại tập tin')
    } finally {
      setFileTypeActionLoading(false)
    }
  }

  const handleFileTypeModalOk = async () => {
    try {
      const values = await fileTypeForm.validateFields()
      setFileTypeActionLoading(true)

      if (selectedFileType) {
        await fileTypeApi.updateFileType(selectedFileType.id, values as UpdateFileTypeRequest)
        message.success('Đã cập nhật loại tập tin thành công')
      } else {
        await fileTypeApi.createFileType(values as CreateFileTypeRequest)
        message.success('Đã tạo loại tập tin thành công')
      }

      setFileTypeModalVisible(false)
      fileTypeForm.resetFields()
      fetchFileTypes()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setFileTypeActionLoading(false)
    }
  }

  const handleFileTypeModalCancel = () => {
    setFileTypeModalVisible(false)
    setSelectedFileType(null)
    fileTypeForm.resetFields()
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

  // ============== File Types Columns ==============

  const fileTypeColumns: ColumnsType<FileType> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (fileTypesPagination.current - 1) * fileTypesPagination.pageSize + index + 1,
    },
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <Text strong style={{ fontFamily: 'monospace' }}>{code}</Text>,
    },
    {
      title: 'Tên loại tập tin',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Số lượng sử dụng',
      dataIndex: 'activity_files_count',
      key: 'activity_files_count',
      width: 150,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: FileType) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditFileType(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={
              record.activity_files_count && record.activity_files_count > 0
                ? `Loại tập tin này đang được sử dụng bởi ${record.activity_files_count} tập tin. Bạn có chắc muốn xóa?`
                : 'Bạn có chắc chắn muốn xóa loại tập tin này?'
            }
            onConfirm={() => handleDeleteFileType(record.id)}
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

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div>
          <Title level={3}>
            <SettingOutlined /> Cấu hình hoạt động
          </Title>
          <Text type="secondary">
            Quản lý loại hoạt động, lĩnh vực hoạt động và loại tập tin trong hệ thống
          </Text>
        </div>
      </Card>

      {/* Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'types' | 'fields' | 'fileTypes')}
          items={[
            {
              key: 'types',
              label: (
                <span>
                  <AppstoreOutlined />
                  Loại hoạt động
                </span>
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
            },
            {
              key: 'fileTypes',
              label: (
                <span>
                  <FileOutlined />
                  Loại tập tin
                </span>
              ),
            },
          ]}
        />
      </Card>

      {/* Advanced Filter - based on active tab */}
      {activeTab === 'types' && (
        <>
          <AdvancedFilter
            fields={typesFilterFields}
            values={typesFilterValues}
            onChange={handleTypesFilterChange}
            onSearch={handleTypesFilterSearch}
            onReset={handleTypesFilterReset}
            loading={typesLoading}
            storageKey="activity_config_types_filters"
            showPresets={true}
            collapsible={true}
            defaultExpanded={true}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchActivityTypes} loading={typesLoading}>
                  Làm mới
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => {
                    setImportType('activity_types')
                    setImportModalVisible(true)
                  }}
                >
                  Import Excel
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddType}>
                  Thêm loại hoạt động
                </Button>
              </Space>
            }
          />

          {/* Types Table */}
          <Card>
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
          </Card>
        </>
      )}

      {activeTab === 'fields' && (
        <>
          <AdvancedFilter
            fields={fieldsFilterFields}
            values={fieldsFilterValues}
            onChange={handleFieldsFilterChange}
            onSearch={handleFieldsFilterSearch}
            onReset={handleFieldsFilterReset}
            loading={fieldsLoading}
            storageKey="activity_config_fields_filters"
            showPresets={true}
            collapsible={true}
            defaultExpanded={true}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchActivityFields} loading={fieldsLoading}>
                  Làm mới
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => {
                    setImportType('activity_fields')
                    setImportModalVisible(true)
                  }}
                >
                  Import Excel
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
                  Thêm lĩnh vực
                </Button>
              </Space>
            }
          />

          {/* Fields Table */}
          <Card>
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
          </Card>
        </>
      )}

      {activeTab === 'fileTypes' && (
        <>
          <AdvancedFilter
            fields={fileTypesFilterFields}
            values={fileTypesFilterValues}
            onChange={handleFileTypesFilterChange}
            onSearch={handleFileTypesFilterSearch}
            onReset={handleFileTypesFilterReset}
            loading={fileTypesLoading}
            storageKey="activity_config_file_types_filters"
            showPresets={false}
            collapsible={true}
            defaultExpanded={true}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchFileTypes} loading={fileTypesLoading}>
                  Làm mới
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFileType}>
                  Thêm loại tập tin
                </Button>
              </Space>
            }
          />

          {/* File Types Table */}
          <Card>
            <Table
              columns={fileTypeColumns}
              dataSource={fileTypes}
              loading={fileTypesLoading}
              rowKey="id"
              pagination={{
                ...fileTypesPagination,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} loại tập tin`,
              }}
              onChange={handleFileTypesTableChange}
              scroll={{ x: 800 }}
            />
          </Card>
        </>
      )}

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

      {/* File Type Modal */}
      <Modal
        title={selectedFileType ? 'Chỉnh sửa loại tập tin' : 'Thêm loại tập tin mới'}
        open={fileTypeModalVisible}
        onOk={handleFileTypeModalOk}
        onCancel={handleFileTypeModalCancel}
        confirmLoading={fileTypeActionLoading}
        width={500}
        okText={selectedFileType ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={fileTypeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="code"
                label="Mã loại tập tin"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã loại tập tin' },
                  { max: 50, message: 'Mã không được vượt quá 50 ký tự' },
                ]}
              >
                <Input
                  placeholder="VD: PDF, DOC..."
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Tên loại tập tin"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên loại tập tin' },
                  { max: 100, message: 'Tên không được vượt quá 100 ký tự' },
                ]}
              >
                <Input placeholder="VD: Tài liệu PDF, Bảng tính Excel..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Import Excel Modal */}
      <ImportExcelModal
        open={importModalVisible}
        type={importType}
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => {
          if (importType === 'activity_types') {
            fetchActivityTypes()
          } else {
            fetchActivityFields()
          }
        }}
      />
    </div>
  )
}

export default ActivityConfigManagement
