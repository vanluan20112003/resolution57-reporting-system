import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Upload,
  Input,
  Select,
  Modal,
  Form,
  message,
  Typography,
  Tag,
  Tabs,
  Empty,
  Popconfirm,
  Tooltip,
} from 'antd'
import {
  UploadOutlined,
  LinkOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  PlusOutlined,
  CloudUploadOutlined,
  GlobalOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import * as activityApi from '../../services/activityApi'
import type { ActivityFile, FileType } from '../../services/activityApi'
import { FileViewer, FileViewerFile } from '../../shared/components/FileViewer'

const { Text, Title } = Typography
const { TextArea } = Input
const { Option } = Select

interface ActivityFilesStepProps {
  activityId?: string // If provided, files are fetched from the server (editing existing activity)
  files: ActivityFile[]
  pendingFiles: PendingFile[] // Files to be added when saving
  fileTypes: FileType[]
  onFilesChange: (files: ActivityFile[]) => void
  onPendingFilesChange: (pendingFiles: PendingFile[]) => void
  loading?: boolean
  disabled?: boolean
}

export interface PendingFile {
  id: string // Temporary client-side ID
  source_type: 'upload' | 'link'
  file_type_id?: string
  file_name: string
  file_url?: string
  description?: string
  file?: File // For upload type
  file_size?: number
  file_extension?: string
}

// Get file icon based on extension
const getFileIcon = (extension?: string) => {
  const ext = (extension || '').toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#1890ff', fontSize: 20 }} />
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImageOutlined style={{ color: '#722ed1', fontSize: 20 }} />
    case 'zip':
    case 'rar':
    case '7z':
      return <FileZipOutlined style={{ color: '#faad14', fontSize: 20 }} />
    default:
      return <FileOutlined style={{ fontSize: 20 }} />
  }
}

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ActivityFilesStep({
  activityId,
  files,
  pendingFiles,
  fileTypes,
  onFilesChange,
  onPendingFilesChange,
  loading = false,
  disabled = false,
}: ActivityFilesStepProps) {
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ActivityFile | null>(null)
  const [selectedPendingFile, setSelectedPendingFile] = useState<PendingFile | null>(null)
  const [addType, setAddType] = useState<'link' | 'upload'>('link')
  const [uploading, setUploading] = useState(false)
  const [uploadedFilesInSession, setUploadedFilesInSession] = useState<string[]>([]) // Track files uploaded in current session
  const [selectedFileTypeId, setSelectedFileTypeId] = useState<string | undefined>(undefined)
  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerFile, setViewerFile] = useState<FileViewerFile | null>(null)
  const [form] = Form.useForm()

  // Check if selected file type is attendance list (Danh sách tham dự)
  const selectedFileType = fileTypes.find(ft => ft.id === selectedFileTypeId)
  const isAttendanceList = selectedFileType?.code === 'attendance_list' ||
    selectedFileType?.name?.toLowerCase().includes('danh sách tham dự')

  // Group files by file type
  const groupedFiles = fileTypes.map(ft => ({
    fileType: ft,
    files: files.filter(f => f.file_type_id === ft.id),
    pendingFiles: pendingFiles.filter(f => f.file_type_id === ft.id),
  }))

  // Files without type
  const otherFiles = files.filter(f => !f.file_type_id)
  const otherPendingFiles = pendingFiles.filter(f => !f.file_type_id)

  // Handle add link
  const handleAddLink = async () => {
    try {
      const values = await form.validateFields()

      if (activityId) {
        // Add to server directly
        setUploading(true)
        await activityApi.addActivityLink(activityId, {
          file_url: values.file_url,
          file_name: values.file_name,
          file_type_id: values.file_type_id,
          description: values.description,
        })

        // Refresh files
        const response = await activityApi.getActivityFiles(activityId)
        onFilesChange(response.data.files)
        message.success('Thêm liên kết thành công')
      } else {
        // Add to pending files
        const newPendingFile: PendingFile = {
          id: `pending-${Date.now()}`,
          source_type: 'link',
          file_type_id: values.file_type_id,
          file_name: values.file_name,
          file_url: values.file_url,
          description: values.description,
        }
        onPendingFilesChange([...pendingFiles, newPendingFile])
        message.success('Đã thêm liên kết vào danh sách')
      }

      setAddModalVisible(false)
      form.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setUploading(false)
    }
  }

  // Handle file upload
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    const uploadFile = file as File

    // Check if current file type is attendance list
    const currentFileTypeId = form.getFieldValue('file_type_id')
    const currentFileType = fileTypes.find(ft => ft.id === currentFileTypeId)
    const isCurrentAttendanceList = currentFileType?.code === 'attendance_list' ||
      currentFileType?.name?.toLowerCase().includes('danh sách tham dự')

    if (activityId) {
      // Upload to server directly
      setUploading(true)
      try {
        const response = await activityApi.uploadActivityFile(
          activityId,
          uploadFile,
          currentFileTypeId,
          form.getFieldValue('description')
        )

        // Refresh files
        const filesResponse = await activityApi.getActivityFiles(activityId)
        onFilesChange(filesResponse.data.files)

        // Track uploaded file in session
        setUploadedFilesInSession(prev => [...prev, uploadFile.name])
        message.success(`Đã tải lên: ${uploadFile.name}`)
        onSuccess?.(response)

        // Only close modal if it's attendance list (single file only)
        if (isCurrentAttendanceList) {
          setAddModalVisible(false)
          form.resetFields()
          setUploadedFilesInSession([])
          setSelectedFileTypeId(undefined)
        }
      } catch (error: any) {
        message.error(error.message || 'Tải tập tin lên thất bại')
        onError?.(error)
      } finally {
        setUploading(false)
      }
    } else {
      // Add to pending files
      const extension = uploadFile.name.split('.').pop() || ''
      const newPendingFile: PendingFile = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source_type: 'upload',
        file_type_id: currentFileTypeId,
        file_name: uploadFile.name,
        description: form.getFieldValue('description'),
        file: uploadFile,
        file_size: uploadFile.size,
        file_extension: extension,
      }
      onPendingFilesChange([...pendingFiles, newPendingFile])

      // Track uploaded file in session
      setUploadedFilesInSession(prev => [...prev, uploadFile.name])
      message.success(`Đã thêm: ${uploadFile.name}`)
      onSuccess?.(newPendingFile)

      // Only close modal if it's attendance list (single file only)
      if (isCurrentAttendanceList) {
        setAddModalVisible(false)
        form.resetFields()
        setUploadedFilesInSession([])
        setSelectedFileTypeId(undefined)
      }
    }
  }

  // Handle delete file
  const handleDeleteFile = async (file: ActivityFile) => {
    if (!activityId) return

    try {
      await activityApi.deleteActivityFile(activityId, file.id)
      const response = await activityApi.getActivityFiles(activityId)
      onFilesChange(response.data.files)
      message.success('Đã xóa tập tin')
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa tập tin')
    }
  }

  // Handle delete pending file
  const handleDeletePendingFile = (file: PendingFile) => {
    onPendingFilesChange(pendingFiles.filter(f => f.id !== file.id))
    message.success('Đã xóa khỏi danh sách')
  }

  // Handle edit file
  const handleEditFile = async () => {
    if (!selectedFile || !activityId) return

    try {
      const values = await form.validateFields()
      setUploading(true)

      await activityApi.updateActivityFile(activityId, selectedFile.id, {
        file_name: values.file_name,
        file_type_id: values.file_type_id,
        description: values.description,
        file_url: selectedFile.source_type === 'link' ? values.file_url : undefined,
      })

      const response = await activityApi.getActivityFiles(activityId)
      onFilesChange(response.data.files)
      message.success('Cập nhật thành công')
      setEditModalVisible(false)
      setSelectedFile(null)
      form.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setUploading(false)
    }
  }

  // Handle edit pending file
  const handleEditPendingFile = async () => {
    if (!selectedPendingFile) return

    try {
      const values = await form.validateFields()

      const updatedFile: PendingFile = {
        ...selectedPendingFile,
        file_name: values.file_name,
        file_type_id: values.file_type_id,
        description: values.description,
        file_url: selectedPendingFile.source_type === 'link' ? values.file_url : undefined,
      }

      onPendingFilesChange(pendingFiles.map(f => f.id === selectedPendingFile.id ? updatedFile : f))
      message.success('Đã cập nhật')
      setEditModalVisible(false)
      setSelectedPendingFile(null)
      form.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Có lỗi xảy ra')
    }
  }

  // Open edit modal for existing file
  const openEditModal = (file: ActivityFile) => {
    setSelectedFile(file)
    setSelectedPendingFile(null)
    form.setFieldsValue({
      file_name: file.file_name,
      file_type_id: file.file_type_id,
      description: file.description,
      file_url: file.file_url,
    })
    setEditModalVisible(true)
  }

  // Open edit modal for pending file
  const openEditPendingModal = (file: PendingFile) => {
    setSelectedPendingFile(file)
    setSelectedFile(null)
    form.setFieldsValue({
      file_name: file.file_name,
      file_type_id: file.file_type_id,
      description: file.description,
      file_url: file.file_url,
    })
    setEditModalVisible(true)
  }

  // Columns for files table
  const columns: ColumnsType<ActivityFile | PendingFile> = [
    {
      title: 'Tập tin',
      key: 'file',
      render: (_, record) => (
        <Space>
          {'source_type' in record && record.source_type === 'link' ? (
            <GlobalOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          ) : (
            getFileIcon('file_extension' in record ? record.file_extension : undefined)
          )}
          <div>
            <Text strong>{record.file_name}</Text>
            {'file_size' in record && record.file_size && (
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {formatFileSize(record.file_size)}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      width: 120,
      render: (_, record) => (
        <Tag color={record.source_type === 'link' ? 'blue' : 'green'}>
          {record.source_type === 'link' ? 'Liên kết' : 'Tập tin'}
        </Tag>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        // Check if file can be previewed (only for uploaded files, not pending)
        const canPreview = 'download_url' in record && record.download_url &&
          !record.id.startsWith('pending-')
        const fileUrl = 'download_url' in record ? record.download_url : ('file_url' in record ? record.file_url : undefined)

        return (
          <Space>
            {/* Preview button for uploaded files */}
            {canPreview && (
              <Tooltip title="Xem">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setViewerFile({
                      id: record.id,
                      file_name: record.file_name,
                      file_url: 'file_url' in record ? record.file_url : undefined,
                      download_url: 'download_url' in record ? record.download_url : undefined,
                      file_extension: 'file_extension' in record ? record.file_extension : record.file_name?.split('.').pop(),
                      source_type: record.source_type,
                    })
                    setViewerVisible(true)
                  }}
                />
              </Tooltip>
            )}
            {record.source_type === 'link' && 'file_url' in record && record.file_url && (
              <Tooltip title="Mở liên kết">
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => window.open(record.file_url, '_blank')}
                />
              </Tooltip>
            )}
            {record.source_type === 'upload' && 'download_url' in record && record.download_url && (
              <Tooltip title="Tải xuống">
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(record.download_url, '_blank')}
                />
              </Tooltip>
            )}
            {!disabled && (
              <>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      if ('id' in record && typeof record.id === 'string' && !record.id.startsWith('pending-')) {
                        openEditModal(record as ActivityFile)
                      } else {
                        openEditPendingModal(record as PendingFile)
                      }
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Xóa tài liệu này?"
                  onConfirm={() => {
                    if ('id' in record && typeof record.id === 'string' && !record.id.startsWith('pending-')) {
                      handleDeleteFile(record as ActivityFile)
                    } else {
                      handleDeletePendingFile(record as PendingFile)
                    }
                  }}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Tooltip title="Xóa">
                    <Button type="link" size="small" icon={<DeleteOutlined />} danger />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </Space>
        )
      },
    },
  ]

  // Create tab items
  const tabItems = [
    ...groupedFiles
      .filter(g => g.files.length > 0 || g.pendingFiles.length > 0)
      .map(g => ({
        key: g.fileType.id,
        label: (
          <span>
            {g.fileType.name} ({g.files.length + g.pendingFiles.length})
          </span>
        ),
        children: (
          <Table
            columns={columns}
            dataSource={[...g.files, ...g.pendingFiles]}
            rowKey="id"
            size="small"
            pagination={false}
          />
        ),
      })),
    ...(otherFiles.length > 0 || otherPendingFiles.length > 0
      ? [
          {
            key: 'other',
            label: `Khác (${otherFiles.length + otherPendingFiles.length})`,
            children: (
              <Table
                columns={columns}
                dataSource={[...otherFiles, ...otherPendingFiles]}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ),
          },
        ]
      : []),
  ]

  const totalFiles = files.length + pendingFiles.length

  return (
    <div className="activity-files-step">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            <FileOutlined style={{ marginRight: 8 }} />
            Tài liệu liên quan
          </Title>
          <Text type="secondary">
            Thêm các tài liệu, văn bản liên quan đến hoạt động
          </Text>
        </div>
        {!disabled && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields()
              setAddType('link')
              setAddModalVisible(true)
            }}
          >
            Thêm tài liệu
          </Button>
        )}
      </div>

      {totalFiles === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có tài liệu nào"
        >
          {!disabled && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields()
                setAddType('link')
                setAddModalVisible(true)
              }}
            >
              Thêm tài liệu đầu tiên
            </Button>
          )}
        </Empty>
      ) : (
        <Tabs
          items={[
            {
              key: 'all',
              label: `Tất cả (${totalFiles})`,
              children: (
                <Table
                  columns={columns}
                  dataSource={[...files, ...pendingFiles]}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  loading={loading}
                />
              ),
            },
            ...tabItems,
          ]}
        />
      )}

      {/* Add Modal */}
      <Modal
        title="Thêm tài liệu"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false)
          form.resetFields()
          setUploadedFilesInSession([])
          setSelectedFileTypeId(undefined)
        }}
        footer={null}
        width={500}
      >
        <Tabs
          activeKey={addType}
          onChange={(key) => {
            setAddType(key as 'link' | 'upload')
            form.resetFields()
          }}
          items={[
            {
              key: 'link',
              label: (
                <span>
                  <LinkOutlined /> Thêm liên kết
                </span>
              ),
              children: (
                <Form form={form} layout="vertical" onFinish={handleAddLink}>
                  <Form.Item
                    name="file_name"
                    label="Tên tài liệu"
                    rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu' }]}
                  >
                    <Input placeholder="VD: Kế hoạch tổ chức sự kiện" />
                  </Form.Item>
                  <Form.Item
                    name="file_url"
                    label="Đường dẫn"
                    rules={[
                      { required: true, message: 'Vui lòng nhập đường dẫn' },
                      { type: 'url', message: 'Đường dẫn không hợp lệ' },
                    ]}
                  >
                    <Input prefix={<LinkOutlined />} placeholder="https://..." />
                  </Form.Item>
                  <Form.Item name="file_type_id" label="Loại tài liệu">
                    <Select placeholder="Chọn loại tài liệu" allowClear>
                      {fileTypes.map((ft) => (
                        <Option key={ft.id} value={ft.id}>
                          {ft.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label="Mô tả">
                    <TextArea rows={2} placeholder="Mô tả ngắn gọn về tài liệu" />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={() => setAddModalVisible(false)}>Hủy</Button>
                      <Button type="primary" htmlType="submit" loading={uploading}>
                        Thêm liên kết
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'upload',
              label: (
                <span>
                  <UploadOutlined /> Tải lên tập tin
                </span>
              ),
              children: (
                <Form form={form} layout="vertical">
                  <Form.Item name="file_type_id" label="Loại tài liệu">
                    <Select
                      placeholder="Chọn loại tài liệu"
                      allowClear
                      onChange={(value) => {
                        // Update selected file type and reset uploaded files when file type changes
                        setSelectedFileTypeId(value)
                        setUploadedFilesInSession([])
                      }}
                    >
                      {fileTypes.map((ft) => (
                        <Option key={ft.id} value={ft.id}>
                          {ft.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label="Mô tả">
                    <TextArea rows={2} placeholder="Mô tả ngắn gọn về tài liệu (áp dụng cho tất cả file)" />
                  </Form.Item>
                  <Form.Item label="Tập tin">
                    <Upload.Dragger
                      name="file"
                      customRequest={handleUpload}
                      multiple={!isAttendanceList}
                      maxCount={isAttendanceList ? 1 : undefined}
                      showUploadList={false}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar"
                      disabled={uploading}
                    >
                      <p className="ant-upload-drag-icon">
                        <CloudUploadOutlined />
                      </p>
                      <p className="ant-upload-text">
                        {isAttendanceList
                          ? 'Kéo thả tập tin vào đây hoặc nhấp để chọn'
                          : 'Kéo thả nhiều tập tin vào đây hoặc nhấp để chọn'}
                      </p>
                      <p className="ant-upload-hint">
                        Hỗ trợ: PDF, Word, Excel, PowerPoint, Image, ZIP (tối đa 50MB)
                        {!isAttendanceList && <><br />Có thể tải lên nhiều file liên tục</>}
                      </p>
                    </Upload.Dragger>
                  </Form.Item>

                  {/* Show uploaded files in this session */}
                  {uploadedFilesInSession.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Đã tải lên ({uploadedFilesInSession.length} file):
                      </Text>
                      <div style={{ maxHeight: 150, overflowY: 'auto', padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
                        {uploadedFilesInSession.map((fileName, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <FileOutlined style={{ color: '#52c41a' }} />
                            <Text ellipsis style={{ flex: 1 }}>{fileName}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Done button for multi-file upload */}
                  {uploadedFilesInSession.length > 0 && !isAttendanceList && (
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                      <Button
                        type="primary"
                        onClick={() => {
                          setAddModalVisible(false)
                          form.resetFields()
                          setUploadedFilesInSession([])
                          setSelectedFileTypeId(undefined)
                          message.success(`Đã tải lên ${uploadedFilesInSession.length} tập tin`)
                        }}
                      >
                        Hoàn tất
                      </Button>
                    </Form.Item>
                  )}
                </Form>
              ),
            },
          ]}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa tài liệu"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setSelectedFile(null)
          setSelectedPendingFile(null)
          form.resetFields()
        }}
        onOk={() => {
          if (selectedFile) {
            handleEditFile()
          } else if (selectedPendingFile) {
            handleEditPendingFile()
          }
        }}
        confirmLoading={uploading}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="file_name"
            label="Tên tài liệu"
            rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu' }]}
          >
            <Input />
          </Form.Item>
          {((selectedFile && selectedFile.source_type === 'link') ||
            (selectedPendingFile && selectedPendingFile.source_type === 'link')) && (
            <Form.Item
              name="file_url"
              label="Đường dẫn"
              rules={[
                { required: true, message: 'Vui lòng nhập đường dẫn' },
                { type: 'url', message: 'Đường dẫn không hợp lệ' },
              ]}
            >
              <Input prefix={<LinkOutlined />} />
            </Form.Item>
          )}
          <Form.Item name="file_type_id" label="Loại tài liệu">
            <Select placeholder="Chọn loại tài liệu" allowClear>
              {fileTypes.map((ft) => (
                <Option key={ft.id} value={ft.id}>
                  {ft.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* File Viewer Modal */}
      <FileViewer
        visible={viewerVisible}
        file={viewerFile}
        files={files.map(f => ({
          id: f.id,
          file_name: f.file_name,
          file_url: f.file_url,
          download_url: f.download_url,
          file_extension: f.file_extension,
          source_type: f.source_type,
        }))}
        onClose={() => {
          setViewerVisible(false)
          setViewerFile(null)
        }}
        onNavigate={(file) => setViewerFile(file)}
      />
    </div>
  )
}

export default ActivityFilesStep
