import { useState, useEffect } from 'react'
import {
  Timeline,
  Typography,
  Spin,
  Empty,
  Tag,
  Avatar,
  Space,
  Tooltip,
  Collapse,
} from 'antd'
import {
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  PauseCircleOutlined,
  StopOutlined,
  UndoOutlined,
  UploadOutlined,
  FileExcelOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  LinkOutlined,
  DisconnectOutlined,
  TeamOutlined,
  UsergroupDeleteOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import type { ActivityLog } from '../../services/activityLogApi'
import { getActivityLogsForActivity } from '../../services/activityLogApi'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const { Text, Paragraph } = Typography

interface ActivityLogTimelineProps {
  activityId: string
  visible?: boolean
}

// Action icons mapping
const getActionIcon = (action: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    created: <PlusCircleOutlined style={{ color: '#52c41a' }} />,
    updated: <EditOutlined style={{ color: '#1890ff' }} />,
    deleted: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
    submitted: <SendOutlined style={{ color: '#722ed1' }} />,
    approved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    rejected: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    locked: <LockOutlined style={{ color: '#faad14' }} />,
    unlocked: <UnlockOutlined style={{ color: '#52c41a' }} />,
    postponed: <PauseCircleOutlined style={{ color: '#faad14' }} />,
    cancelled: <StopOutlined style={{ color: '#ff4d4f' }} />,
    uncancelled: <UndoOutlined style={{ color: '#52c41a' }} />,
    file_uploaded: <UploadOutlined style={{ color: '#1890ff' }} />,
    file_deleted: <FileExcelOutlined style={{ color: '#ff4d4f' }} />,
    participant_added: <UserAddOutlined style={{ color: '#52c41a' }} />,
    participant_removed: <UserDeleteOutlined style={{ color: '#ff4d4f' }} />,
    kpi_linked: <LinkOutlined style={{ color: '#1890ff' }} />,
    kpi_unlinked: <DisconnectOutlined style={{ color: '#ff4d4f' }} />,
    collaborator_added: <TeamOutlined style={{ color: '#52c41a' }} />,
    collaborator_removed: <UsergroupDeleteOutlined style={{ color: '#ff4d4f' }} />,
  }
  return iconMap[action] || <ClockCircleOutlined style={{ color: '#666' }} />
}

// Action color mapping
const getActionColor = (action: string): string => {
  const colorMap: Record<string, string> = {
    created: 'green',
    updated: 'blue',
    deleted: 'red',
    submitted: 'purple',
    approved: 'green',
    rejected: 'red',
    locked: 'orange',
    unlocked: 'green',
    postponed: 'orange',
    cancelled: 'red',
    uncancelled: 'green',
    file_uploaded: 'blue',
    file_deleted: 'red',
    participant_added: 'green',
    participant_removed: 'red',
    kpi_linked: 'blue',
    kpi_unlinked: 'red',
    collaborator_added: 'green',
    collaborator_removed: 'red',
  }
  return colorMap[action] || 'gray'
}

// Format changes for display
const formatChanges = (log: ActivityLog) => {
  if (!log.metadata?.changes) return null

  const changes = log.metadata.changes as Record<string, { old: unknown; new: unknown }>
  const fieldLabels: Record<string, string> = {
    title: 'Tiêu đề',
    description: 'Mô tả',
    status: 'Trạng thái',
    start_date: 'Ngày bắt đầu',
    end_date: 'Ngày kết thúc',
    location: 'Địa điểm',
    budget: 'Kinh phí',
    completion_percentage: 'Tiến độ',
    result_summary: 'Kết quả',
    difficulties: 'Khó khăn',
    leader_names: 'Người phụ trách',
  }

  const changeItems = Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => ({
    field: fieldLabels[field] || field,
    old: formatValue(oldVal),
    new: formatValue(newVal),
  }))

  if (changeItems.length === 0) return null

  return (
    <Collapse
      size="small"
      ghost
      items={[
        {
          key: '1',
          label: <Text type="secondary" style={{ fontSize: 12 }}>Xem chi tiết thay đổi</Text>,
          children: (
            <div style={{ fontSize: 12 }}>
              {changeItems.map((item, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <Text strong>{item.field}:</Text>{' '}
                  <Text delete type="secondary">{item.old || '(trống)'}</Text>
                  {' → '}
                  <Text>{item.new || '(trống)'}</Text>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return value.toLocaleString('vi-VN')
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)

  // Check if it's a date string
  const dateStr = String(value)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm')
  }

  return String(value)
}

const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({
  activityId,
  visible = true,
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && activityId) {
      fetchLogs()
    }
  }, [activityId, visible])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await getActivityLogsForActivity(activityId)
      if (response.success) {
        setLogs(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="Đang tải lịch sử..." />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có lịch sử hoạt động"
      />
    )
  }

  return (
    <Timeline
      mode="left"
      items={logs.map((log) => {
        const userName = log.user
          ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() || log.user.email
          : 'Hệ thống'

        return {
          key: log.id,
          dot: getActionIcon(log.action),
          color: getActionColor(log.action),
          children: (
            <div style={{ paddingBottom: 16 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <Tag color={getActionColor(log.action)}>
                    {log.action_label || log.action}
                  </Tag>
                  <Tooltip title={dayjs(log.created_at).format('DD/MM/YYYY HH:mm:ss')}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(log.created_at).fromNow()}
                    </Text>
                  </Tooltip>
                </Space>

                <Space size={4}>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text style={{ fontSize: 13 }}>{userName}</Text>
                </Space>

                {log.description && (
                  <Paragraph
                    style={{ margin: 0, fontSize: 13, color: '#666' }}
                    ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
                  >
                    {log.description}
                  </Paragraph>
                )}

                {log.action === 'updated' && formatChanges(log)}

                {log.metadata && log.action !== 'updated' && (
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {log.metadata.file_name && (
                      <Text type="secondary">File: {log.metadata.file_name as string}</Text>
                    )}
                    {log.metadata.participant_name && (
                      <Text type="secondary">
                        Người tham gia: {log.metadata.participant_name as string}
                      </Text>
                    )}
                    {log.metadata.reason && (
                      <Text type="secondary">Lý do: {log.metadata.reason as string}</Text>
                    )}
                    {log.metadata.notes && (
                      <Text type="secondary">Ghi chú: {log.metadata.notes as string}</Text>
                    )}
                  </div>
                )}
              </Space>
            </div>
          ),
        }
      })}
    />
  )
}

export default ActivityLogTimeline
