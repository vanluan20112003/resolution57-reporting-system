import React, { useState, useEffect } from 'react'
import {
  Card,
  Upload,
  Button,
  Space,
  Typography,
  message,
  Popconfirm,
  List,
  Tag,
  Input,
  Tooltip,
  Divider,
  Empty,
  Spin,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  getBatchFiles,
  uploadOwnerFile,
  uploadCollaboratorFile,
  downloadBatchFile,
  deleteBatchFile,
  BatchFile,
  CollaboratorFileGroup,
} from '../../services/reportBatchApi'

const { Text, Title } = Typography

interface BatchFilesSectionProps {
  batchId: string
  isOwner: boolean // true nếu là đơn vị tạo đợt báo cáo
  isCollaborator: boolean // true nếu là đơn vị phối hợp
  canEdit?: boolean // có thể upload/delete file không
  onFilesChange?: () => void // callback khi files thay đổi
}

const BatchFilesSection: React.FC<BatchFilesSectionProps> = ({
  batchId,
  isOwner,
  isCollaborator,
  canEdit = true,
  onFilesChange,
}) => {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [ownerFiles, setOwnerFiles] = useState<BatchFile[]>([])
  const [collaboratorFiles, setCollaboratorFiles] = useState<CollaboratorFileGroup[]>([])

  // Owner file upload state
  const [ownerFileList, setOwnerFileList] = useState<UploadFile[]>([])
  const [documentTitle, setDocumentTitle] = useState('')

  // Collaborator file upload state
  const [collaboratorFileList, setCollaboratorFileList] = useState<UploadFile[]>([])
  const [collaboratorFileTitle, setCollaboratorFileTitle] = useState('')

  // Load files
  const loadFiles = async () => {
    setLoading(true)
    try {
      const response = await getBatchFiles(batchId)
      if (response.success) {
        setOwnerFiles(response.data.owner_files)
        setCollaboratorFiles(response.data.collaborator_files)
      }
    } catch (error) {
      console.error('Failed to load batch files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (batchId) {
      loadFiles()
    }
  }, [batchId])

  // Get file icon
  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <FileOutlined />
    if (fileType.includes('pdf')) return <FilePdfOutlined style={{ color: '#f5222d' }} />
    if (fileType.includes('word') || fileType.includes('document')) return <FileWordOutlined style={{ color: '#2f54eb' }} />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />
    if (fileType.startsWith('image/')) return <FileImageOutlined style={{ color: '#1890ff' }} />
    return <FileOutlined />
  }

  // Handle owner file upload
  const handleOwnerUpload = async () => {
    if (ownerFileList.length === 0) {
      message.warning('Vui lòng chọn file để upload')
      return
    }

    if (!documentTitle.trim()) {
      message.warning('Vui lòng nhập tên văn bản giao nhiệm vụ')
      return
    }

    setUploading(true)
    try {
      const file = ownerFileList[0].originFileObj as File
      await uploadOwnerFile(batchId, file, documentTitle.trim())
      message.success('Upload văn bản giao nhiệm vụ thành công')
      setOwnerFileList([])
      setDocumentTitle('')
      loadFiles()
      onFilesChange?.()
    } catch (error: any) {
      message.error(error.message || 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  // Handle collaborator file upload
  const handleCollaboratorUpload = async () => {
    if (collaboratorFileList.length === 0) {
      message.warning('Vui lòng chọn file để upload')
      return
    }

    setUploading(true)
    try {
      const file = collaboratorFileList[0].originFileObj as File
      await uploadCollaboratorFile(batchId, file, collaboratorFileTitle.trim() || undefined)
      message.success('Upload file minh chứng thành công')
      setCollaboratorFileList([])
      setCollaboratorFileTitle('')
      loadFiles()
      onFilesChange?.()
    } catch (error: any) {
      message.error(error.message || 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  // Handle download
  const handleDownload = async (file: BatchFile) => {
    try {
      await downloadBatchFile(batchId, file.id, file.file_name)
      message.success('Tải file thành công')
    } catch (error: any) {
      message.error(error.message || 'Tải file thất bại')
    }
  }

  // Handle delete
  const handleDelete = async (file: BatchFile) => {
    try {
      await deleteBatchFile(batchId, file.id)
      message.success('Xóa file thành công')
      loadFiles()
      onFilesChange?.()
    } catch (error: any) {
      message.error(error.message || 'Xóa file thất bại')
    }
  }

  if (loading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin tip="Đang tải danh sách file..." />
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* Văn bản giao nhiệm vụ (Owner file) */}
      <Card
        size="small"
        title={
          <Space>
            <UserOutlined />
            <span>Văn bản giao nhiệm vụ</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {ownerFiles.length > 0 ? (
          <List
            dataSource={ownerFiles}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Tooltip title="Tải xuống" key="download">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(file)}
                    />
                  </Tooltip>,
                  canEdit && isOwner && (
                    <Popconfirm
                      key="delete"
                      title="Bạn có chắc muốn xóa file này?"
                      onConfirm={() => handleDelete(file)}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <Button type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getFileIcon(file.file_type)}
                  title={
                    <Space>
                      <Text strong>{file.title || 'Văn bản giao nhiệm vụ'}</Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {file.file_name} ({file.file_size_formatted})
                      </Text>
                      {file.organization && (
                        <Tag color="blue" style={{ marginTop: 4 }}>
                          {file.organization.short_name || file.organization.name}
                        </Tag>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có văn bản giao nhiệm vụ"
          />
        )}

        {/* Owner upload form */}
        {canEdit && isOwner && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="Tên văn bản giao nhiệm vụ *"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
              <Space>
                <Upload
                  beforeUpload={() => false}
                  fileList={ownerFileList}
                  onChange={({ fileList }) => setOwnerFileList(fileList.slice(-1))}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Chọn file</Button>
                </Upload>
                <Button
                  type="primary"
                  onClick={handleOwnerUpload}
                  loading={uploading}
                  disabled={ownerFileList.length === 0 || !documentTitle.trim()}
                >
                  {ownerFiles.length > 0 ? 'Thay thế file' : 'Upload'}
                </Button>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Chỉ được upload 1 file văn bản giao nhiệm vụ. Upload mới sẽ thay thế file cũ.
              </Text>
            </Space>
          </>
        )}
      </Card>

      {/* File minh chứng từ đơn vị phối hợp */}
      <Card
        size="small"
        title={
          <Space>
            <TeamOutlined />
            <span>File minh chứng từ đơn vị phối hợp</span>
            <Tag>{collaboratorFiles.reduce((sum, g) => sum + g.files.length, 0)} file</Tag>
          </Space>
        }
      >
        {collaboratorFiles.length > 0 ? (
          collaboratorFiles.map((group) => (
            <div key={group.organization.id} style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 8 }}>
                <Tag color="green">{group.organization.short_name || group.organization.name}</Tag>
              </Title>
              <List
                size="small"
                dataSource={group.files}
                renderItem={(file) => (
                  <List.Item
                    actions={[
                      <Tooltip title="Tải xuống" key="download">
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(file)}
                        />
                      </Tooltip>,
                      canEdit && file.organization?.id === group.organization.id && (
                        <Popconfirm
                          key="delete"
                          title="Bạn có chắc muốn xóa file này?"
                          onConfirm={() => handleDelete(file)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                      ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={getFileIcon(file.file_type)}
                      title={file.title || file.file_name}
                      description={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {file.file_name} ({file.file_size_formatted})
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có file minh chứng từ đơn vị phối hợp"
          />
        )}

        {/* Collaborator upload form */}
        {canEdit && isCollaborator && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="Mô tả file (tùy chọn)"
                value={collaboratorFileTitle}
                onChange={(e) => setCollaboratorFileTitle(e.target.value)}
              />
              <Space>
                <Upload
                  beforeUpload={() => false}
                  fileList={collaboratorFileList}
                  onChange={({ fileList }) => setCollaboratorFileList(fileList.slice(-1))}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>Chọn file</Button>
                </Upload>
                <Button
                  type="primary"
                  onClick={handleCollaboratorUpload}
                  loading={uploading}
                  disabled={collaboratorFileList.length === 0}
                >
                  Upload minh chứng
                </Button>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Bạn có thể upload nhiều file minh chứng cho đợt báo cáo này.
              </Text>
            </Space>
          </>
        )}
      </Card>
    </div>
  )
}

export default BatchFilesSection
