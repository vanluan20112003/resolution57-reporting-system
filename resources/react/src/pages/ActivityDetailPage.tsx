import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Typography, Space, Button, Descriptions, Divider, Tag, Spin, message, Empty } from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  UserOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { getActivityById, Activity, getStatusLabel, getStatusColor } from '../services/activityApi'
import { statusConfig, formatBudget } from '../shared/config/activityColumns'

dayjs.locale('vi')

const { Header, Content } = Layout
const { Text, Title, Paragraph } = Typography

function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivity = async () => {
      if (!id) {
        setError('ID hoạt động không hợp lệ')
        setLoading(false)
        return
      }

      try {
        const response = await getActivityById(id)
        if (response.success) {
          setActivity(response.data)
        } else {
          setError('Không thể tải thông tin hoạt động')
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin hoạt động')
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [id])

  const handleBack = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Đang tải thông tin hoạt động..." />
        </Content>
      </Layout>
    )
  }

  if (error || !activity) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card style={{ maxWidth: 500, textAlign: 'center' }}>
            <Empty
              description={error || 'Không tìm thấy hoạt động'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Space style={{ marginTop: 16 }}>
              <Button onClick={handleBack}>Quay lại</Button>
              <Button type="primary" onClick={handleGoHome}>Về trang chủ</Button>
            </Space>
          </Card>
        </Content>
      </Layout>
    )
  }

  const config = statusConfig[activity.status] || {
    color: 'default',
    icon: null,
    label: activity.status,
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <Header style={{
        background: '#001529',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ color: '#fff', marginRight: 16 }}
        >
          Quay lại
        </Button>
        <Title level={4} style={{ margin: 0, color: '#fff' }}>
          Chi tiết hoạt động
        </Title>
      </Header>

      {/* Content */}
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Card>
          {/* Activity Header */}
          <div style={{ marginBottom: 24 }}>
            <Space align="start" wrap>
              <Title level={2} style={{ margin: 0 }}>
                {activity.title}
              </Title>
              <Tag
                color={config.color}
                icon={config.icon}
                style={{ fontSize: '16px', padding: '6px 16px' }}
              >
                {config.label}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginTop: 8 }}>
              Mã hoạt động: <Text strong>{activity.code}</Text>
            </Text>
          </div>

          <Divider />

          {/* Main Info */}
          <Descriptions
            title="Thông tin chung"
            column={{ xs: 1, sm: 2 }}
            bordered
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label={<><TeamOutlined /> Đơn vị chủ trì</>} span={2}>
              <Text strong>{activity.lead_organization?.name || 'N/A'}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Loại hoạt động">
              <Tag color="blue">{activity.activity_type?.name || 'N/A'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Lĩnh vực">
              {activity.activity_field?.name ? (
                <Tag color="cyan">{activity.activity_field.name}</Tag>
              ) : (
                <Text type="secondary">Không xác định</Text>
              )}
            </Descriptions.Item>

            {activity.description && (
              <Descriptions.Item label="Mô tả" span={2}>
                <Paragraph style={{ margin: 0 }}>{activity.description}</Paragraph>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Timeline */}
          <Descriptions
            title={<><CalendarOutlined /> Thời gian</>}
            column={{ xs: 1, sm: 2 }}
            bordered
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Ngày bắt đầu">
              {activity.start_date
                ? dayjs(activity.start_date).format('DD/MM/YYYY HH:mm')
                : 'Chưa xác định'}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày kết thúc">
              {activity.end_date
                ? dayjs(activity.end_date).format('DD/MM/YYYY HH:mm')
                : 'Chưa xác định'}
            </Descriptions.Item>

            {activity.actual_start_date && (
              <>
                <Descriptions.Item label="Bắt đầu thực tế">
                  {dayjs(activity.actual_start_date).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>

                <Descriptions.Item label="Kết thúc thực tế">
                  {activity.actual_end_date
                    ? dayjs(activity.actual_end_date).format('DD/MM/YYYY HH:mm')
                    : 'Đang thực hiện'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          {/* Location & Budget */}
          {(activity.location || activity.budget) && (
            <Descriptions
              title="Địa điểm & Kinh phí"
              column={{ xs: 1, sm: 2 }}
              bordered
              style={{ marginBottom: 24 }}
            >
              {activity.location && (
                <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm</>} span={2}>
                  {activity.location}
                </Descriptions.Item>
              )}

              {activity.budget && (
                <Descriptions.Item label={<><DollarOutlined /> Kinh phí</>}>
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {formatBudget(activity.budget)}
                  </Text>
                </Descriptions.Item>
              )}

              {activity.budget_source && (
                <Descriptions.Item label="Nguồn kinh phí">
                  {activity.budget_source}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}

          {/* Progress & Results */}
          <Descriptions
            title="Tiến độ & Kết quả"
            column={{ xs: 1, sm: 2 }}
            bordered
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Tiến độ hoàn thành">
              <Space>
                <div style={{ width: '150px', background: '#f0f0f0', borderRadius: '4px', height: '20px' }}>
                  <div
                    style={{
                      width: `${activity.completion_percentage}%`,
                      background: activity.completion_percentage === 100 ? '#52c41a' : '#1890ff',
                      height: '100%',
                      borderRadius: '4px',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <Text strong style={{ fontSize: '16px' }}>{activity.completion_percentage}%</Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <Tag color={config.color} icon={config.icon} style={{ fontSize: '14px', padding: '4px 12px' }}>
                {config.label}
              </Tag>
            </Descriptions.Item>

            {activity.result_summary && (
              <Descriptions.Item label="Tóm tắt kết quả" span={2}>
                <Paragraph style={{ margin: 0 }}>{activity.result_summary}</Paragraph>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* External URL */}
          {activity.external_url && (
            <Descriptions
              title={<><LinkOutlined /> Liên kết</>}
              column={1}
              bordered
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="URL">
                <a href={activity.external_url} target="_blank" rel="noopener noreferrer">
                  {activity.external_url}
                </a>
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* Creator Info */}
          <Descriptions
            title={<><UserOutlined /> Thông tin tạo</>}
            column={{ xs: 1, sm: 2 }}
            bordered
          >
            <Descriptions.Item label="Người tạo">
              {activity.creator
                ? `${activity.creator.last_name} ${activity.creator.first_name} (${activity.creator.email})`
                : 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {dayjs(activity.created_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>

            {activity.approved_by && activity.approver && (
              <>
                <Descriptions.Item label="Người phê duyệt">
                  {`${activity.approver.last_name} ${activity.approver.first_name}`}
                </Descriptions.Item>

                <Descriptions.Item label="Ngày phê duyệt">
                  {activity.approved_at
                    ? dayjs(activity.approved_at).format('DD/MM/YYYY HH:mm')
                    : 'N/A'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>
      </Content>
    </Layout>
  )
}

export default ActivityDetailPage
