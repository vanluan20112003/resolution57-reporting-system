import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
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
  Input,
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
  CopyOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import {
  getFilesExplorer,
  downloadBatchFile,
  FilesExplorerResponse,
  ExplorerFile,
  ExplorerOrganizationFolder,
  ExplorerActivityFolder,
} from '../../services/reportBatchApi'

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

interface BatchFilesExplorerProps {
  visible: boolean
  batchId: string
  batchName: string
  onClose: () => void
}

const BatchFilesExplorer: React.FC<BatchFilesExplorerProps> = ({
  visible,
  batchId,
  batchName,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FilesExplorerResponse['data'] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by_organization')
  const [navigation, setNavigation] = useState<NavigationState>({ level: 'root' })

  // Load data
  const loadData = useCallback(async () => {
    if (!batchId || !visible) return
    setLoading(true)
    try {
      const response = await getFilesExplorer(batchId)
      setData(response.data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải dữ liệu file')
    } finally {
      setLoading(false)
    }
  }, [batchId, visible])

  useEffect(() => {
    if (visible) {
      loadData()
      setNavigation({ level: 'root' })
    }
  }, [visible, loadData])

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
    try {
      await downloadBatchFile(batchId, file.id, file.file_name)
      message.success('Tải file thành công')
    } catch (error: any) {
      message.error(error.message || 'Tải file thất bại')
    }
  }

  // Copy share link
  const handleCopyLink = () => {
    if (data?.batch.share_token) {
      const link = `${window.location.origin}/batch-files/${data.batch.share_token}`
      navigator.clipboard.writeText(link)
      message.success('Đã sao chép link')
    }
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
  const renderFileItem = (file: ExplorerFile) => (
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
      <Tooltip title="Tải xuống">
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(file)}
        />
      </Tooltip>
    </div>
  )

  // Render breadcrumb
  const renderBreadcrumb = () => {
    const items: { title: React.ReactNode; onClick?: () => void }[] = [
      {
        title: <><HomeOutlined /> {batchName}</>,
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

  // Render content based on navigation state
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin tip="Đang tải..." />
        </div>
      )
    }

    if (!data) {
      return <Empty description="Không có dữ liệu" />
    }

    // Root level - show 2 main folders
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
      return <div>{data.owner_files.map(renderFileItem)}</div>
    }

    // Evidence root - show view mode toggle and folders
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

    // Organization folder - show activities
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

    // Activity folder - show organizations
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

    // Organization > Activity - show files
    if (navigation.level === 'org_activity') {
      const org = data.by_organization.find(o => o.organization_id === navigation.organizationId)
      const act = org?.activities.find(a => a.activity_id === navigation.activityId)
      if (!act || act.files.length === 0) {
        return <Empty description="Không có file" />
      }
      return <div>{act.files.map(renderFileItem)}</div>
    }

    // Activity > Organization - show files
    if (navigation.level === 'act_organization') {
      const act = data.by_activity.find(a => a.activity_id === navigation.activityId)
      const org = act?.organizations.find(o => o.organization_id === navigation.organizationId)
      if (!org || org.files.length === 0) {
        return <Empty description="Không có file" />
      }
      return <div>{org.files.map(renderFileItem)}</div>
    }

    return null
  }

  return (
    <Modal
      title={
        <Space>
          <FolderOpenOutlined style={{ color: '#faad14' }} />
          <span>Quản lý file đợt báo cáo</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
      styles={{ body: { padding: '16px 24px', maxHeight: '70vh', overflow: 'auto' } }}
    >
      {/* Header with stats and share link */}
      {data && (
        <div style={{ marginBottom: 16 }}>
          {/* Statistics */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <Space>
              <Tag color="blue">{data.statistics.total_files} file</Tag>
              <Tag color="green">{data.statistics.organizations_count} đơn vị</Tag>
              <Tag>{data.statistics.activities_count} hoạt động</Tag>
            </Space>
          </div>

          {/* Share Link Section */}
          <div style={{
            padding: '12px 16px',
            background: '#e6f7ff',
            borderRadius: 8,
            border: '1px solid #91d5ff',
          }}>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <LinkOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>Link chia sẻ file đợt báo cáo</Text>
              </Space>
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={`${window.location.origin}/batch-files/${data.batch.share_token}`}
                readOnly
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  background: '#fff',
                }}
              />
              <Tooltip title="Sao chép link">
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={handleCopyLink}
                >
                  Sao chép
                </Button>
              </Tooltip>
            </Space.Compact>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
              Gắn link này vào báo cáo để truy cập nhanh đến danh sách file minh chứng
            </Text>
          </div>
        </div>
      )}

      {/* Navigation */}
      {navigation.level !== 'root' && (
        <div style={{ marginBottom: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
            style={{ marginRight: 8 }}
          >
            Quay lại
          </Button>
        </div>
      )}

      {/* Breadcrumb */}
      {renderBreadcrumb()}

      {/* Content */}
      {renderContent()}
    </Modal>
  )
}

export default BatchFilesExplorer
