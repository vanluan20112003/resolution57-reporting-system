import { useState, useEffect, useMemo } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Input,
  Modal,
  Form,
  message,
  Typography,
  Row,
  Col,
  Popconfirm,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/hooks'
import * as fileTypeApi from '../../services/fileTypeApi'
import type {
  FileType,
  CreateFileTypeRequest,
  UpdateFileTypeRequest,
} from '../../services/fileTypeApi'
import AdvancedFilter, { FilterField, FilterValues } from '../../shared/components/AdvancedFilter'
import './FileTypeManagement.css'

const { Title, Text } = Typography

function FileTypeManagement() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  // State
  const [loading, setLoading] = useState(false)
  const [fileTypes, setFileTypes] = useState<FileType[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: '',
  })
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedFileType, setSelectedFileType] = useState<FileType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [form] = Form.useForm()

  // Check if current user can manage (OPERATOR or ADMIN only)
  const canManage = currentUser?.role === 'OPERATOR' || currentUser?.role === 'ADMIN'

  // Filter fields configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: t('fileTypes.search', 'Tìm kiếm'),
      type: 'text',
      placeholder: t('fileTypes.searchPlaceholder', 'Tìm theo mã hoặc tên loại tập tin...'),
      span: 24,
    },
  ], [t])

  // Filter handlers
  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues)
  }

  const handleFilterSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchFileTypes()
  }

  const handleFilterReset = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  // Fetch file types
  const fetchFileTypes = async () => {
    setLoading(true)
    try {
      const response = await fileTypeApi.getFileTypes({
        search: filterValues.search || undefined,
        page: pagination.current,
        per_page: pagination.pageSize,
      })

      setFileTypes(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
      }))
    } catch (error: any) {
      message.error(error.message || t('fileTypes.fetchError', 'Không thể tải danh sách loại tập tin'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManage) {
      fetchFileTypes()
    }
  }, [filterValues, pagination.current, canManage])

  // Table handlers
  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const handleAdd = () => {
    setSelectedFileType(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (fileType: FileType) => {
    setSelectedFileType(fileType)
    form.setFieldsValue(fileType)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      await fileTypeApi.deleteFileType(id)
      message.success(t('fileTypes.deleteSuccess', 'Đã xóa loại tập tin thành công'))
      fetchFileTypes()
    } catch (error: any) {
      message.error(error.message || t('fileTypes.deleteError', 'Không thể xóa loại tập tin'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setActionLoading(true)

      if (selectedFileType) {
        await fileTypeApi.updateFileType(selectedFileType.id, values as UpdateFileTypeRequest)
        message.success(t('fileTypes.updateSuccess', 'Đã cập nhật loại tập tin thành công'))
      } else {
        await fileTypeApi.createFileType(values as CreateFileTypeRequest)
        message.success(t('fileTypes.createSuccess', 'Đã tạo loại tập tin thành công'))
      }

      setModalVisible(false)
      form.resetFields()
      fetchFileTypes()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || t('fileTypes.saveError', 'Có lỗi xảy ra'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalCancel = () => {
    setModalVisible(false)
    setSelectedFileType(null)
    form.resetFields()
  }

  // Table columns
  const columns: ColumnsType<FileType> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: any, __: any, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: t('fileTypes.code', 'Mã'),
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <Text strong style={{ fontFamily: 'monospace' }}>{code}</Text>,
    },
    {
      title: t('fileTypes.name', 'Tên loại tập tin'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: t('fileTypes.usageCount', 'Số lượng sử dụng'),
      dataIndex: 'activity_files_count',
      key: 'activity_files_count',
      width: 150,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: t('common.actions', 'Thao tác'),
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
            onClick={() => handleEdit(record)}
          >
            {t('common.edit', 'Sửa')}
          </Button>
          <Popconfirm
            title={t('fileTypes.deleteConfirmTitle', 'Xác nhận xóa')}
            description={
              record.activity_files_count && record.activity_files_count > 0
                ? t('fileTypes.deleteConfirmWithUsage', `Loại tập tin này đang được sử dụng bởi ${record.activity_files_count} tập tin. Bạn có chắc muốn xóa?`)
                : t('fileTypes.deleteConfirm', 'Bạn có chắc chắn muốn xóa loại tập tin này?')
            }
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.delete', 'Xóa')}
            cancelText={t('common.cancel', 'Hủy')}
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              {t('common.delete', 'Xóa')}
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
          <FileOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">
            {t('fileTypes.accessDenied', 'Bạn không có quyền truy cập')}
          </Title>
          <Text type="secondary">
            {t('fileTypes.accessDeniedMessage', 'Chỉ OPERATOR và ADMIN mới có quyền quản lý loại tập tin')}
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
            <FileOutlined /> {t('fileTypes.title', 'Quản lý loại tập tin')}
          </Title>
          <Text type="secondary">
            {t('fileTypes.subtitle', 'Quản lý các loại tập tin được sử dụng trong hệ thống hoạt động')}
          </Text>
        </div>
      </Card>

      {/* Filter */}
      <AdvancedFilter
        fields={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        onSearch={handleFilterSearch}
        onReset={handleFilterReset}
        loading={loading}
        storageKey="file_types_filters"
        showPresets={false}
        collapsible={true}
        defaultExpanded={true}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchFileTypes} loading={loading}>
              {t('common.refresh', 'Làm mới')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('fileTypes.add', 'Thêm loại tập tin')}
            </Button>
          </Space>
        }
      />

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={fileTypes}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => t('fileTypes.totalCount', `Tổng ${total} loại tập tin`),
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={selectedFileType
          ? t('fileTypes.editTitle', 'Chỉnh sửa loại tập tin')
          : t('fileTypes.addTitle', 'Thêm loại tập tin mới')
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={actionLoading}
        width={500}
        okText={selectedFileType ? t('common.update', 'Cập nhật') : t('common.create', 'Tạo mới')}
        cancelText={t('common.cancel', 'Hủy')}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="code"
                label={t('fileTypes.code', 'Mã loại tập tin')}
                rules={[
                  { required: true, message: t('fileTypes.codeRequired', 'Vui lòng nhập mã loại tập tin') },
                  { max: 50, message: t('fileTypes.codeMaxLength', 'Mã không được vượt quá 50 ký tự') },
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
                label={t('fileTypes.name', 'Tên loại tập tin')}
                rules={[
                  { required: true, message: t('fileTypes.nameRequired', 'Vui lòng nhập tên loại tập tin') },
                  { max: 100, message: t('fileTypes.nameMaxLength', 'Tên không được vượt quá 100 ký tự') },
                ]}
              >
                <Input placeholder="VD: Tài liệu PDF, Bảng tính Excel..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default FileTypeManagement
