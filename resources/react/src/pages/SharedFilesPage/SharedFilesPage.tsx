import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Layout,
  Card,
  Typography,
  Spin,
  Result,
  Tree,
  List,
  Button,
  Space,
  Tag,
  Tooltip,
  Breadcrumb,
  message,
} from 'antd'
import {
  FolderOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  LinkOutlined,
  DownloadOutlined,
  HomeOutlined,
  CalendarOutlined,
  TeamOutlined,
  CopyOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { accessSharedFiles, SharedFilesData, SharedFile, GroupedFiles } from '../../services/shareApi'
import { useAuth } from '../../shared/hooks'
import logoNQ57 from '../../assets/images/cobualiem.png'
import './SharedFilesPage.css'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

// Map file extension to icon
const getFileIcon = (file: SharedFile) => {
  if (file.source_type === 'link') {
    return <LinkOutlined style={{ color: '#1890ff' }} />
  }

  const ext = file.file_extension?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#2f54eb' }} />
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#52c41a' }} />
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: '#fa8c16' }} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImageOutlined style={{ color: '#13c2c2' }} />
    case 'zip':
    case 'rar':
    case '7z':
      return <FileZipOutlined style={{ color: '#722ed1' }} />
    default:
      return <FileOutlined style={{ color: '#595959' }} />
  }
}

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function SharedFilesPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SharedFilesData | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  useEffect(() => {
    if (token) {
      loadSharedFiles()
    }
  }, [token])

  const loadSharedFiles = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)
      const result = await accessSharedFiles(token)
      setData(result)

      // Auto expand all folders
      const keys = result.grouped_files.map((g) => g.file_type.code || 'OTHER')
      setExpandedKeys(keys)

      // Select first folder by default
      if (result.grouped_files.length > 0) {
        setSelectedFolder(result.grouped_files[0].file_type.code || 'OTHER')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // Build tree data for folder navigation
  const buildTreeData = (): DataNode[] => {
    if (!data) return []

    return data.grouped_files.map((group) => ({
      key: group.file_type.code || 'OTHER',
      title: (
        <Space>
          <span>{group.file_type.name}</span>
          <Tag color="blue">{group.count}</Tag>
        </Space>
      ),
      icon: <FolderOutlined style={{ color: '#faad14' }} />,
    }))
  }

  // Get files for selected folder
  const getSelectedFiles = (): SharedFile[] => {
    if (!data || !selectedFolder) return []

    const group = data.grouped_files.find(
      (g) => (g.file_type.code || 'OTHER') === selectedFolder
    )
    return group?.files || []
  }

  // Get selected folder name
  const getSelectedFolderName = (): string => {
    if (!data || !selectedFolder) return ''

    const group = data.grouped_files.find(
      (g) => (g.file_type.code || 'OTHER') === selectedFolder
    )
    return group?.file_type.name || ''
  }

  // Handle file download/open
  const handleFileClick = (file: SharedFile) => {
    if (file.download_url) {
      window.open(file.download_url, '_blank')
    } else {
      message.warning('Không thể tải file này')
    }
  }

  // Copy current link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    message.success('Đã sao chép link')
  }

  // Render loading
  if (loading) {
    return (
      <Layout className="shared-files-layout">
        <div className="shared-files-loading">
          <Spin size="large" tip="Đang tải tài liệu..." />
        </div>
      </Layout>
    )
  }

  // Render error
  if (error) {
    return (
      <Layout className="shared-files-layout">
        <Content className="shared-files-content">
          <Result
            status="error"
            title="Không thể truy cập"
            subTitle={error}
            extra={[
              <Button key="home" type="primary" onClick={() => navigate('/')}>
                Về trang chủ
              </Button>,
            ]}
          />
        </Content>
      </Layout>
    )
  }

  // Render auth loading
  if (authLoading) {
    return (
      <Layout className="shared-files-layout">
        <div className="shared-files-loading">
          <Spin size="large" tip="Đang kiểm tra đăng nhập..." />
        </div>
      </Layout>
    )
  }

  // Render not logged in
  if (!user) {
    return (
      <Layout className="shared-files-layout">
        <Content className="shared-files-content">
          <Result
            status="warning"
            title="Vui lòng đăng nhập"
            subTitle="Bạn cần đăng nhập để xem tài liệu được chia sẻ"
            extra={[
              <Button key="login" type="primary" onClick={() => navigate('/login')}>
                Đăng nhập
              </Button>,
            ]}
          />
        </Content>
      </Layout>
    )
  }

  return (
    <Layout className="shared-files-layout">
      {/* Header */}
      <Header className="shared-files-header">
        <div className="header-left">
          <img src={logoNQ57} alt="Logo" className="header-logo" onClick={() => navigate('/')} />
          <Title level={4} className="header-title">
            Tài liệu chia sẻ
          </Title>
        </div>
        <div className="header-right">
          <Space>
            <Tooltip title="Sao chép link">
              <Button icon={<CopyOutlined />} onClick={handleCopyLink} />
            </Tooltip>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="shared-files-main">
        {/* Activity Info Card */}
        <Card className="activity-info-card" size="small">
          <div className="activity-info">
            <div className="activity-name">
              <Title level={4}>{data?.activity.name}</Title>
              {data?.share_link.description && (
                <Text type="secondary">{data.share_link.description}</Text>
              )}
            </div>
            <div className="activity-meta">
              <Space size="large">
                {data?.activity.organization && (
                  <Space>
                    <TeamOutlined />
                    <Text>{data.activity.organization.short_name || data.activity.organization.name}</Text>
                  </Space>
                )}
                {data?.activity.start_date && (
                  <Space>
                    <CalendarOutlined />
                    <Text>
                      {formatDate(data.activity.start_date)}
                      {data.activity.end_date && ` - ${formatDate(data.activity.end_date)}`}
                    </Text>
                  </Space>
                )}
                <Tag color="blue">{data?.activity.total_files} tài liệu</Tag>
              </Space>
            </div>
          </div>
        </Card>

        {/* Main Content - File Explorer */}
        <div className="file-explorer">
          {/* Folder Tree */}
          <Card className="folder-tree-card" size="small" title="Thư mục">
            {data?.grouped_files.length === 0 ? (
              <Text type="secondary">Không có tài liệu nào</Text>
            ) : (
              <Tree
                showIcon
                defaultExpandAll
                selectedKeys={selectedFolder ? [selectedFolder] : []}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                onSelect={(keys) => {
                  if (keys.length > 0) {
                    setSelectedFolder(keys[0] as string)
                  }
                }}
                treeData={buildTreeData()}
              />
            )}
          </Card>

          {/* File List */}
          <Card
            className="file-list-card"
            size="small"
            title={
              <Breadcrumb>
                <Breadcrumb.Item>
                  <HomeOutlined />
                </Breadcrumb.Item>
                {selectedFolder && (
                  <Breadcrumb.Item>{getSelectedFolderName()}</Breadcrumb.Item>
                )}
              </Breadcrumb>
            }
          >
            {!selectedFolder ? (
              <Text type="secondary">Chọn thư mục để xem tài liệu</Text>
            ) : getSelectedFiles().length === 0 ? (
              <Text type="secondary">Thư mục trống</Text>
            ) : (
              <List
                dataSource={getSelectedFiles()}
                renderItem={(file) => (
                  <List.Item
                    className="file-list-item"
                    actions={[
                      <Tooltip key="download" title={file.source_type === 'link' ? 'Mở liên kết' : 'Tải về'}>
                        <Button
                          type="link"
                          icon={file.source_type === 'link' ? <LinkOutlined /> : <DownloadOutlined />}
                          onClick={() => handleFileClick(file)}
                        />
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getFileIcon(file)}
                      title={
                        <a onClick={() => handleFileClick(file)} className="file-name">
                          {file.file_name}
                        </a>
                      }
                      description={
                        <Space size="small" split={<span>•</span>}>
                          {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                          {file.uploaded_at && <span>{formatDate(file.uploaded_at)}</span>}
                          {file.uploader && (
                            <span>
                              {file.uploader.first_name} {file.uploader.last_name}
                            </span>
                          )}
                          {file.description && (
                            <Tooltip title={file.description}>
                              <span className="file-description">{file.description}</span>
                            </Tooltip>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  )
}

export default SharedFilesPage
