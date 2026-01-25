import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Segmented,
  Tooltip,
  Tag,
  Breadcrumb,
  message,
  Result,
  Divider,
} from 'antd'
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  CalendarOutlined,
  BankOutlined,
} from '@ant-design/icons'
import {
  getPublicBatchFiles,
  downloadPublicBatchFile,
  PublicBatchFilesResponse,
  ExplorerFile,
  ExplorerOrganizationFolder,
  ExplorerActivityFolder,
} from '../services/reportBatchApi'
import dayjs from 'dayjs'
import FileViewer, { type FileViewerFile } from '../shared/components/FileViewer/FileViewer'
import { EyeOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

type ViewMode = 'by_organization' | 'by_activity'
type FolderLevel = 'root' | 'owner_files' | 'evidence_root' | 'organization' | 'activity' | 'org_activity' | 'act_organization'

interface NavigationState {
  level: FolderLevel
  organizationId?: string
  organizationName?: string
  activityId?: string | null
  activityTitle?: string
}

const PublicBatchFilesPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicBatchFilesResponse['data'] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by_organization')
  const [navigation, setNavigation] = useState<NavigationState>({ level: 'root' })

  // FileViewer state
  const [fileViewerVisible, setFileViewerVisible] = useState(false)
  const [viewingFile, setViewingFile] = useState<FileViewerFile | null>(null)
  const [viewingFiles, setViewingFiles] = useState<FileViewerFile[]>([])

  // Load data
  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await getPublicBatchFiles(token)
      setData(response.data)
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get file icon
  const getFileIcon = (fileType?: string | null, size: number = 24) => {
    const style = { fontSize: size }
    if (!fileType) return <FileOutlined style={{ ...style, color: '#8c8c8c' }} />
    if (fileType.includes('pdf')) return <FilePdfOutlined style={{ ...style, color: '#f5222d' }} />
    if (fileType.includes('word') || fileType.includes('document')) return <FileWordOutlined style={{ ...style, color: '#2f54eb' }} />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileExcelOutlined style={{ ...style, color: '#52c41a' }} />
    if (fileType.startsWith('image/')) return <FileImageOutlined style={{ ...style, color: '#1890ff' }} />
    return <FileOutlined style={{ ...style, color: '#8c8c8c' }} />
  }

  // Handle download
  const handleDownload = async (file: ExplorerFile) => {
    if (!token) return
    try {
      await downloadPublicBatchFile(token, file.id, file.file_name)
      message.success('Tải file thành công')
    } catch (err: any) {
      message.error(err.message || 'Tải file thất bại')
    }
  }

  // Handle view file
  const handleViewFile = (file: ExplorerFile, allFiles?: ExplorerFile[]) => {
    if (!token) return
    const fileExtension = file.file_name?.split('.').pop()?.toLowerCase() || ''

    // Public files use a different URL pattern
    const baseUrl = window.location.origin
    const fileUrl = `${baseUrl}/api/v1/batch-files/${token}/download/${file.id}`

    const viewerFile: FileViewerFile = {
      id: file.id,
      file_name: file.file_name,
      file_url: fileUrl,
      download_url: fileUrl,
      file_extension: fileExtension,
    }

    // If allFiles provided, convert all for navigation
    if (allFiles && allFiles.length > 0) {
      const files: FileViewerFile[] = allFiles.map(f => ({
        id: f.id,
        file_name: f.file_name,
        file_url: `${baseUrl}/api/v1/batch-files/${token}/download/${f.id}`,
        download_url: `${baseUrl}/api/v1/batch-files/${token}/download/${f.id}`,
        file_extension: f.file_name?.split('.').pop()?.toLowerCase() || '',
      }))
      setViewingFiles(files)
    } else {
      setViewingFiles([viewerFile])
    }

    setViewingFile(viewerFile)
    setFileViewerVisible(true)
  }

  // Navigate functions
  const goBack = () => {
    if (navigation.level === 'owner_files' || navigation.level === 'evidence_root') {
      setNavigation({ level: 'root' })
    } else if (navigation.level === 'organization' || navigation.level === 'activity') {
      setNavigation({ level: 'evidence_root' })
    } else if (navigation.level === 'org_activity') {
      setNavigation({
        level: 'organization',
        organizationId: navigation.organizationId,
        organizationName: navigation.organizationName
      })
    } else if (navigation.level === 'act_organization') {
      setNavigation({
        level: 'activity',
        activityId: navigation.activityId,
        activityTitle: navigation.activityTitle
      })
    }
  }

  // Render folder item
  const renderFolderItem = (
    name: string,
    count: number,
    onClick: () => void,
    icon?: React.ReactNode
  ) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: 8,
        marginBottom: 8,
        cursor: 'pointer',
        border: '1px solid #f0f0f0',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#e6f7ff'
        e.currentTarget.style.borderColor = '#91d5ff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fafafa'
        e.currentTarget.style.borderColor = '#f0f0f0'
      }}
    >
      {icon || <FolderOutlined style={{ fontSize: 32, color: '#faad14' }} />}
      <div style={{ marginLeft: 12, flex: 1 }}>
        <Text strong style={{ fontSize: 14 }}>{name}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>{count} file</Text>
      </div>
    </div>
  )

  // Render file item
  const renderFileItem = (file: ExplorerFile, allFilesInFolder?: ExplorerFile[]) => (
    <div
      key={file.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#fff',
        borderRadius: 8,
        marginBottom: 6,
        border: '1px solid #f0f0f0',
      }}
    >
      {getFileIcon(file.file_type, 28)}
      <div style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
        <Tooltip title={file.title || file.file_name}>
          <Text strong style={{
            fontSize: 13,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {file.title || file.file_name}
          </Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {file.file_name} • {file.file_size_formatted}
        </Text>
      </div>
      <Space size={0}>
        <Tooltip title="Xem file">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewFile(file, allFilesInFolder)}
            style={{ color: '#1890ff' }}
          />
        </Tooltip>
        <Tooltip title="Tải xuống">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(file)}
          />
        </Tooltip>
      </Space>
    </div>
  )

  // Render breadcrumb
  const renderBreadcrumb = () => {
    if (!data) return null

    const items: { title: React.ReactNode; onClick?: () => void }[] = [
      {
        title: <><HomeOutlined /> {data.batch.name}</>,
        onClick: () => setNavigation({ level: 'root' })
      }
    ]

    if (navigation.level === 'owner_files') {
      items.push({ title: 'Văn bản giao nhiệm vụ' })
    } else if (navigation.level !== 'root') {
      items.push({
        title: 'Minh chứng',
        onClick: () => setNavigation({ level: 'evidence_root' })
      })

      if (navigation.level === 'organization' || navigation.level === 'org_activity') {
        items.push({
          title: navigation.organizationName,
          onClick: navigation.level === 'org_activity'
            ? () => setNavigation({
                level: 'organization',
                organizationId: navigation.organizationId,
                organizationName: navigation.organizationName
              })
            : undefined
        })
        if (navigation.level === 'org_activity') {
          items.push({ title: navigation.activityTitle })
        }
      } else if (navigation.level === 'activity' || navigation.level === 'act_organization') {
        items.push({
          title: navigation.activityTitle,
          onClick: navigation.level === 'act_organization'
            ? () => setNavigation({
                level: 'activity',
                activityId: navigation.activityId,
                activityTitle: navigation.activityTitle
              })
            : undefined
        })
        if (navigation.level === 'act_organization') {
          items.push({ title: navigation.organizationName })
        }
      }
    }

    return (
      <Breadcrumb
        items={items.map((item, idx) => ({
          title: item.onClick && idx < items.length - 1 ? (
            <a onClick={item.onClick}>{item.title}</a>
          ) : item.title
        }))}
        style={{ marginBottom: 16 }}
      />
    )
  }

  // Render content
  const renderContent = () => {
    if (!data) return null

    // Root level
    if (navigation.level === 'root') {
      return (
        <div>
          {renderFolderItem(
            'Văn bản giao nhiệm vụ',
            data.owner_files.length,
            () => setNavigation({ level: 'owner_files' }),
            <FolderOutlined style={{ fontSize: 32, color: '#1890ff' }} />
          )}
          {renderFolderItem(
            'Minh chứng từ đơn vị phối hợp',
            data.statistics.collaborator_files_count,
            () => setNavigation({ level: 'evidence_root' }),
            <FolderOutlined style={{ fontSize: 32, color: '#52c41a' }} />
          )}
        </div>
      )
    }

    // Owner files
    if (navigation.level === 'owner_files') {
      if (data.owner_files.length === 0) {
        return <Empty description="Chưa có văn bản giao nhiệm vụ" />
      }
      return <div>{data.owner_files.map(f => renderFileItem(f, data.owner_files))}</div>
    }

    // Evidence root
    if (navigation.level === 'evidence_root') {
      const folders = viewMode === 'by_organization' ? data.by_organization : data.by_activity

      if (folders.length === 0) {
        return <Empty description="Chưa có file minh chứng" />
      }

      return (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { label: <><TeamOutlined /> Theo đơn vị</>, value: 'by_organization' },
                { label: <><UnorderedListOutlined /> Theo hoạt động</>, value: 'by_activity' },
              ]}
            />
          </div>

          {viewMode === 'by_organization' ? (
            (data.by_organization as ExplorerOrganizationFolder[]).map(org => (
              <div key={org.organization_id}>
                {renderFolderItem(
                  org.organization_name,
                  org.total_files,
                  () => setNavigation({
                    level: 'organization',
                    organizationId: org.organization_id,
                    organizationName: org.organization_name
                  }),
                  <FolderOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                )}
              </div>
            ))
          ) : (
            (data.by_activity as ExplorerActivityFolder[]).map(act => (
              <div key={act.activity_id || 'general'}>
                {renderFolderItem(
                  act.activity_title,
                  act.total_files,
                  () => setNavigation({
                    level: 'activity',
                    activityId: act.activity_id,
                    activityTitle: act.activity_title
                  }),
                  <FolderOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                )}
              </div>
            ))
          )}
        </div>
      )
    }

    // Organization folder
    if (navigation.level === 'organization') {
      const org = data.by_organization.find(o => o.organization_id === navigation.organizationId)
      if (!org || org.activities.length === 0) {
        return <Empty description="Không có file" />
      }
      return (
        <div>
          {org.activities.map(act => (
            <div key={act.activity_id || 'general'}>
              {renderFolderItem(
                act.activity_title,
                act.files.length,
                () => setNavigation({
                  level: 'org_activity',
                  organizationId: navigation.organizationId,
                  organizationName: navigation.organizationName,
                  activityId: act.activity_id,
                  activityTitle: act.activity_title
                }),
                <FolderOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              )}
            </div>
          ))}
        </div>
      )
    }

    // Activity folder
    if (navigation.level === 'activity') {
      const act = data.by_activity.find(a => a.activity_id === navigation.activityId)
      if (!act || act.organizations.length === 0) {
        return <Empty description="Không có file" />
      }
      return (
        <div>
          {act.organizations.map(org => (
            <div key={org.organization_id}>
              {renderFolderItem(
                org.organization_name,
                org.files.length,
                () => setNavigation({
                  level: 'act_organization',
                  activityId: navigation.activityId,
                  activityTitle: navigation.activityTitle,
                  organizationId: org.organization_id,
                  organizationName: org.organization_name
                }),
                <FolderOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              )}
            </div>
          ))}
        </div>
      )
    }

    // Organization > Activity files
    if (navigation.level === 'org_activity') {
      const org = data.by_organization.find(o => o.organization_id === navigation.organizationId)
      const act = org?.activities.find(a => a.activity_id === navigation.activityId)
      if (!act || act.files.length === 0) {
        return <Empty description="Không có file" />
      }
      return <div>{act.files.map(f => renderFileItem(f, act.files))}</div>
    }

    // Activity > Organization files
    if (navigation.level === 'act_organization') {
      const act = data.by_activity.find(a => a.activity_id === navigation.activityId)
      const org = act?.organizations.find(o => o.organization_id === navigation.organizationId)
      if (!org || org.files.length === 0) {
        return <Empty description="Không có file" />
      }
      return <div>{org.files.map(f => renderFileItem(f, org.files))}</div>
    }

    return null
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5'
      }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5'
      }}>
        <Result
          status="error"
          title="Không thể tải dữ liệu"
          subTitle={error}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5'
      }}>
        <Result
          status="404"
          title="Không tìm thấy"
          subTitle="Link không hợp lệ hoặc đã hết hạn"
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FolderOpenOutlined style={{ fontSize: 32, color: '#faad14', marginRight: 12 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{data.batch.name}</Title>
                {data.batch.owner_organization && (
                  <Text type="secondary">
                    <BankOutlined style={{ marginRight: 4 }} />
                    {data.batch.owner_organization.short_name || data.batch.owner_organization.name}
                  </Text>
                )}
              </div>
            </div>

            {data.batch.description && (
              <Text type="secondary">{data.batch.description}</Text>
            )}

            <Divider style={{ margin: '12px 0' }} />

            <Space wrap>
              {data.batch.start_date && data.batch.end_date && (
                <Tag icon={<CalendarOutlined />}>
                  {dayjs(data.batch.start_date).format('DD/MM/YYYY')} - {dayjs(data.batch.end_date).format('DD/MM/YYYY')}
                </Tag>
              )}
              <Tag color="blue">{data.statistics.total_files} file</Tag>
              <Tag color="green">{data.statistics.organizations_count} đơn vị</Tag>
              <Tag>{data.statistics.activities_count} hoạt động</Tag>
            </Space>
          </Space>
        </Card>

        {/* Files Explorer */}
        <Card>
          {/* Back button */}
          {navigation.level !== 'root' && (
            <div style={{ marginBottom: 12 }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={goBack}
              >
                Quay lại
              </Button>
            </div>
          )}

          {/* Breadcrumb */}
          {renderBreadcrumb()}

          {/* Content */}
          {renderContent()}
        </Card>
      </div>

      {/* File Viewer Modal */}
      <FileViewer
        visible={fileViewerVisible}
        file={viewingFile}
        files={viewingFiles}
        onClose={() => {
          setFileViewerVisible(false)
          setViewingFile(null)
          setViewingFiles([])
        }}
        onNavigate={(file) => setViewingFile(file)}
      />
    </div>
  )
}

export default PublicBatchFilesPage
