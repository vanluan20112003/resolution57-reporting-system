import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  Upload,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Tooltip,
  Empty,
} from 'antd'
import {
  UploadOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  EyeOutlined,
  GlobalOutlined,
  TeamOutlined,
  LockOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../shared/hooks'
import {
  getDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentCategories,
  formatFileSize,
  getVisibilityLabel,
  getVisibilityColor,
  Document,
  DocumentFilters,
  DocumentVisibility,
} from '../services/documentApi'
import { getOrganizationListSimple, SimpleOrganization } from '../services/organizationApi'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const DocumentLibraryPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth()

  // State
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    current: 1,
    pageSize: 20,
  })

  // Filters
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [visibilityFilter, setVisibilityFilter] = useState<DocumentVisibility | undefined>()
  const [organizationFilter, setOrganizationFilter] = useState<string | undefined>()

  // Options
  const [categories, setCategories] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>([])

  // Modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Check if user can upload
  const canUpload = user && ['ADMIN', 'OPERATOR', 'STAFF', 'MANAGER'].includes(user.role)

  // Load documents
  const loadDocuments = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const filters: DocumentFilters = {
        page,
        per_page: pagination.pageSize,
        search: searchText || undefined,
        category: categoryFilter,
        visibility: visibilityFilter,
        organization_id: organizationFilter,
        sort_by: 'created_at',
        sort_order: 'desc',
      }

      const response = await getDocuments(filters)
      setDocuments(response.data)
      setPagination({
        ...pagination,
        total: response.pagination.total,
        current: response.pagination.current_page,
      })
    } catch (error) {
      console.error('Failed to load documents:', error)
      message.error('Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }, [searchText, categoryFilter, visibilityFilter, organizationFilter, pagination.pageSize])

  // Load filter options
  const loadFilterOptions = async () => {
    // Load categories
    try {
      const categoriesRes = await getDocumentCategories()
      setCategories(categoriesRes.data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }

    // Load organizations separately to not block categories
    try {
      const orgsRes = await getOrganizationListSimple()
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  useEffect(() => {
    loadDocuments()
    loadFilterOptions()
  }, [])

  useEffect(() => {
    loadDocuments(1)
  }, [searchText, categoryFilter, visibilityFilter, organizationFilter])

  // Get file icon component
  const getFileIconComponent = (fileType?: string) => {
    if (!fileType) return <FileOutlined />
    if (fileType.startsWith('image/')) return <FileImageOutlined style={{ color: '#1890ff' }} />
    if (fileType.startsWith('video/')) return <VideoCameraOutlined style={{ color: '#722ed1' }} />
    if (fileType.startsWith('audio/')) return <SoundOutlined style={{ color: '#eb2f96' }} />
    if (fileType === 'application/pdf') return <FilePdfOutlined style={{ color: '#f5222d' }} />
    if (fileType.includes('word') || fileType.includes('document')) return <FileWordOutlined style={{ color: '#2f54eb' }} />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FilePptOutlined style={{ color: '#fa8c16' }} />
    if (fileType.includes('zip') || fileType.includes('compressed') || fileType.includes('archive')) return <FileZipOutlined style={{ color: '#faad14' }} />
    if (fileType.startsWith('text/')) return <FileTextOutlined style={{ color: '#8c8c8c' }} />
    return <FileOutlined />
  }

  // Get visibility icon
  const getVisibilityIcon = (visibility: DocumentVisibility) => {
    switch (visibility) {
      case 'PUBLIC':
        return <GlobalOutlined />
      case 'ORGANIZATION':
        return <TeamOutlined />
      case 'PRIVATE':
        return <LockOutlined />
      default:
        return <EyeOutlined />
    }
  }

  // Handle upload
  const handleUpload = async (values: {
    title: string
    description?: string
    category?: string
    visibility: DocumentVisibility
  }) => {
    if (fileList.length === 0) {
      message.error('Vui lòng chọn file để upload')
      return
    }

    setUploading(true)
    try {
      await uploadDocument({
        file: fileList[0].originFileObj as File,
        title: values.title,
        description: values.description,
        category: values.category,
        visibility: values.visibility,
        organization_id: user?.organization_id,
      })

      message.success('Upload tài liệu thành công')
      setUploadModalVisible(false)
      form.resetFields()
      setFileList([])
      loadDocuments()
      loadFilterOptions()
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message || 'Upload thất bại')
      } else {
        message.error('Upload thất bại')
      }
    } finally {
      setUploading(false)
    }
  }

  // Handle edit
  const handleEdit = async (doc: Document) => {
    setEditingDocument(doc)
    editForm.setFieldsValue({
      title: doc.title,
      description: doc.description,
      category: doc.category,
      visibility: doc.visibility,
    })
    setEditModalVisible(true)
  }

  // Handle save edit
  const handleSaveEdit = async (values: {
    title: string
    description?: string
    category?: string
    visibility: DocumentVisibility
  }) => {
    if (!editingDocument) return

    try {
      await updateDocument(editingDocument.id, values)
      message.success('Cập nhật tài liệu thành công')
      setEditModalVisible(false)
      editForm.resetFields()
      setEditingDocument(null)
      loadDocuments(pagination.current)
      loadFilterOptions()
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message || 'Cập nhật thất bại')
      } else {
        message.error('Cập nhật thất bại')
      }
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      message.success('Xóa tài liệu thành công')
      loadDocuments(pagination.current)
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message || 'Xóa thất bại')
      } else {
        message.error('Xóa thất bại')
      }
    }
  }

  // Handle download
  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocument(doc.id, doc.file_name)
      message.success('Tải xuống thành công')
    } catch (error) {
      message.error('Tải xuống thất bại')
    }
  }

  // Check if user can edit/delete document
  const canModify = (doc: Document) => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return doc.uploaded_by === user.id
  }

  // Table columns
  const columns: ColumnsType<Document> = [
    {
      title: 'Tài liệu',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <Space>
          {getFileIconComponent(record.file_type)}
          <div>
            <Text strong>{title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.file_name}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: 'Kích thước',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size) => formatFileSize(size),
    },
    {
      title: 'Phạm vi',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 130,
      render: (visibility: DocumentVisibility) => (
        <Tag icon={getVisibilityIcon(visibility)} color={getVisibilityColor(visibility)}>
          {getVisibilityLabel(visibility)}
        </Tag>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'organization',
      key: 'organization',
      width: 150,
      render: (org) => org ? (
        <Tooltip title={org.name}>
          <Tag color="blue">{org.short_name || org.name}</Tag>
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Người đăng',
      dataIndex: 'uploader',
      key: 'uploader',
      width: 150,
      render: (uploader) => uploader ? `${uploader.first_name || ''} ${uploader.last_name || ''}`.trim() || '-' : '-',
    },
    {
      title: 'Ngày đăng',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Tải xuống">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          {canModify(record) && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Bạn có chắc muốn xóa tài liệu này?"
                onConfirm={() => handleDelete(record.id)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Tooltip title="Xóa">
                  <Button type="text" icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Kho tài liệu
            </Title>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadDocuments(pagination.current)}>
                Làm mới
              </Button>
              {canUpload && (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setUploadModalVisible(true)}
                >
                  Upload tài liệu
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm kiếm tài liệu..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Phòng ban"
              value={organizationFilter}
              onChange={setOrganizationFilter}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {organizations.map((org) => (
                <Option key={org.id} value={org.id}>
                  {org.short_name || org.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Danh mục"
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
              style={{ width: '100%' }}
            >
              {categories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Phạm vi"
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="PUBLIC">Công khai</Option>
              <Option value="ORGANIZATION">Trong tổ chức</Option>
              <Option value="PRIVATE">Riêng tư</Option>
            </Select>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} tài liệu`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
              loadDocuments(page)
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có tài liệu nào"
              />
            ),
          }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload tài liệu"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          form.resetFields()
          setFileList([])
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item label="Chọn file" required>
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList.slice(-1))}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Kích thước tối đa: 50MB
            </Text>
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề tài liệu" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả tài liệu" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục">
                <Select
                  placeholder="Chọn hoặc nhập danh mục"
                  allowClear
                  showSearch
                  mode="tags"
                  maxCount={1}
                >
                  {categories.map((cat) => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Phạm vi"
                initialValue="PUBLIC"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="PUBLIC">
                    <GlobalOutlined /> Công khai
                  </Option>
                  <Option value="ORGANIZATION">
                    <TeamOutlined /> Trong tổ chức
                  </Option>
                  <Option value="PRIVATE">
                    <LockOutlined /> Riêng tư
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setUploadModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={uploading}>
                Upload
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa tài liệu"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          editForm.resetFields()
          setEditingDocument(null)
        }}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề tài liệu" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả tài liệu" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục">
                <Select
                  placeholder="Chọn hoặc nhập danh mục"
                  allowClear
                  showSearch
                  mode="tags"
                  maxCount={1}
                >
                  {categories.map((cat) => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Phạm vi"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="PUBLIC">
                    <GlobalOutlined /> Công khai
                  </Option>
                  <Option value="ORGANIZATION">
                    <TeamOutlined /> Trong tổ chức
                  </Option>
                  <Option value="PRIVATE">
                    <LockOutlined /> Riêng tư
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DocumentLibraryPage
