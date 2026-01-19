import React, { useState, useEffect } from 'react'
import {
  Card,
  Switch,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Tooltip,
  Modal,
  Table,
  message,
  Spin,
  Row,
  Col,
  Popconfirm,
  Badge,
  Result,
} from 'antd'
import {
  ToolOutlined,
  SaveOutlined,
  ReloadOutlined,
  CopyOutlined,
  KeyOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as maintenanceApi from '../../services/maintenanceApi'
import type { MaintenanceSettings as MaintenanceSettingsType, MaintenanceLog } from '../../services/maintenanceApi'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const MaintenanceSettings: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [settings, setSettings] = useState<MaintenanceSettingsType | null>(null)
  const [bypassUrl, setBypassUrl] = useState('')
  const [enabledBy, setEnabledBy] = useState<{ id: string; name: string } | null>(null)
  const [disabledBy, setDisabledBy] = useState<{ id: string; name: string } | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('')

  const [logsVisible, setLogsVisible] = useState(false)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPagination, setLogsPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [previewVisible, setPreviewVisible] = useState(false)

  const [form] = Form.useForm()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setAccessDenied(false)
    try {
      const data = await maintenanceApi.getMaintenanceSettings()

      // Validate response structure
      if (!data || !data.settings) {
        throw new Error('Invalid response format')
      }

      setSettings(data.settings)
      setBypassUrl(data.bypass_url || '')
      setEnabledBy(data.enabled_by || null)
      setDisabledBy(data.disabled_by || null)

      form.setFieldsValue({
        title: data.settings.title || 'Hệ thống đang bảo trì',
        message: data.settings.message || '',
        notification_type: data.settings.notification_type || 'info',
        estimated_end_time: data.settings.estimated_end_time
          ? dayjs(data.settings.estimated_end_time)
          : null,
        show_countdown: data.settings.show_countdown ?? true,
        allow_admin_access: data.settings.allow_admin_access ?? true,
        allowed_ips: data.settings.allowed_ips?.join(', ') || '',
      })
    } catch (error: any) {
      console.error('Maintenance settings fetch error:', error)

      const status = error.response?.status
      const errorMessage = error.response?.data?.message || error.message

      if (status === 403) {
        setAccessDenied(true)
        setAccessDeniedMessage(errorMessage || 'Bạn không có quyền truy cập tính năng này')
      } else if (status === 401) {
        // Unauthenticated - don't show error, user will be redirected to login
        setAccessDenied(true)
        setAccessDeniedMessage('Vui lòng đăng nhập để tiếp tục')
      } else {
        message.error(errorMessage || 'Không thể tải cài đặt bảo trì')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (values: any) => {
    setSaving(true)
    try {
      const data: any = {
        title: values.title,
        message: values.message,
        notification_type: values.notification_type,
        show_countdown: values.show_countdown,
        allow_admin_access: values.allow_admin_access,
        estimated_end_time: values.estimated_end_time
          ? values.estimated_end_time.toISOString()
          : null,
        allowed_ips: values.allowed_ips
          ? values.allowed_ips.split(',').map((ip: string) => ip.trim()).filter(Boolean)
          : [],
      }

      const updated = await maintenanceApi.updateMaintenanceSettings(data)
      setSettings(updated)
      message.success('Đã lưu cài đặt bảo trì')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleMaintenance = async () => {
    if (!settings) return

    setToggling(true)
    try {
      if (settings.is_enabled) {
        // Disable
        const updated = await maintenanceApi.disableMaintenance()
        setSettings(updated)
        message.success('Đã tắt chế độ bảo trì')
      } else {
        // Enable with current form values
        const values = form.getFieldsValue()
        const result = await maintenanceApi.enableMaintenance({
          title: values.title,
          message: values.message,
          notification_type: values.notification_type,
          estimated_end_time: values.estimated_end_time
            ? values.estimated_end_time.toISOString()
            : undefined,
          show_countdown: values.show_countdown,
        })
        setSettings(result.settings)
        setBypassUrl(result.bypass_url)
        message.success('Đã bật chế độ bảo trì')
      }
      fetchSettings()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể thay đổi trạng thái bảo trì')
    } finally {
      setToggling(false)
    }
  }

  const handleRegenerateKey = async () => {
    try {
      const result = await maintenanceApi.regenerateSecretKey()
      setSettings((prev) => prev ? { ...prev, secret_key: result.secret_key } : null)
      setBypassUrl(result.bypass_url)
      message.success('Đã tạo mới secret key')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tạo mới secret key')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    message.success(`Đã sao chép ${label}`)
  }

  const fetchLogs = async (page: number = 1) => {
    setLogsLoading(true)
    try {
      const result = await maintenanceApi.getMaintenanceLogs(page, logsPagination.pageSize)
      setLogs(result.data)
      setLogsPagination({
        current: result.meta.current_page,
        pageSize: result.meta.per_page,
        total: result.meta.total,
      })
    } catch (error: any) {
      message.error('Không thể tải lịch sử')
    } finally {
      setLogsLoading(false)
    }
  }

  const showLogs = () => {
    setLogsVisible(true)
    fetchLogs()
  }

  const logsColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => dayjs(time).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (action: string) => {
        const config: Record<string, { color: string; label: string }> = {
          enabled: { color: 'red', label: 'Bật bảo trì' },
          disabled: { color: 'green', label: 'Tắt bảo trì' },
          settings_updated: { color: 'blue', label: 'Cập nhật cài đặt' },
          key_regenerated: { color: 'orange', label: 'Tạo mới key' },
        }
        const { color, label } = config[action] || { color: 'default', label: action }
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (name: string) => name || 'N/A',
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
  ]

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Đang tải cài đặt...</div>
        </div>
      </Card>
    )
  }

  if (accessDenied) {
    return (
      <Card>
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle={accessDeniedMessage || 'Chỉ ADMIN mới có quyền quản lý chế độ bảo trì'}
        />
      </Card>
    )
  }

  return (
    <div>
      {/* Status Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space size="large">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: settings?.is_enabled
                    ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                    : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ToolOutlined style={{ fontSize: 28, color: '#fff' }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Chế độ bảo trì
                </Title>
                <Space>
                  <Badge
                    status={settings?.is_enabled ? 'error' : 'success'}
                    text={settings?.is_enabled ? 'Đang bật' : 'Đang tắt'}
                  />
                  {settings?.is_enabled && settings.enabled_at && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      • Bật lúc {dayjs(settings.enabled_at).format('HH:mm DD/MM/YYYY')}
                      {enabledBy && ` bởi ${enabledBy.name}`}
                    </Text>
                  )}
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<HistoryOutlined />} onClick={showLogs}>
                Lịch sử
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setPreviewVisible(true)}
              >
                Xem trước
              </Button>
              <Popconfirm
                title={settings?.is_enabled ? 'Tắt chế độ bảo trì?' : 'Bật chế độ bảo trì?'}
                description={
                  settings?.is_enabled
                    ? 'Người dùng sẽ có thể truy cập hệ thống bình thường.'
                    : 'Người dùng sẽ không thể truy cập hệ thống (trừ admin).'
                }
                onConfirm={handleToggleMaintenance}
                okText="Xác nhận"
                cancelText="Hủy"
              >
                <Button
                  type="primary"
                  danger={!settings?.is_enabled}
                  loading={toggling}
                  icon={settings?.is_enabled ? <CheckCircleOutlined /> : <ToolOutlined />}
                  style={{
                    background: settings?.is_enabled ? '#52c41a' : undefined,
                    borderColor: settings?.is_enabled ? '#52c41a' : undefined,
                  }}
                >
                  {settings?.is_enabled ? 'Tắt bảo trì' : 'Bật bảo trì'}
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        {settings?.is_enabled && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Hệ thống đang ở chế độ bảo trì"
            description="Người dùng thông thường sẽ không thể truy cập. Admin vẫn có thể sử dụng bình thường."
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Bypass Key Card */}
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>Mã truy cập bảo trì (Bypass Key)</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
        extra={
          <Popconfirm
            title="Tạo mới secret key?"
            description="Key cũ sẽ không còn hoạt động. Bạn cần chia sẻ key mới cho những người cần truy cập."
            onConfirm={handleRegenerateKey}
            okText="Tạo mới"
            cancelText="Hủy"
          >
            <Button icon={<ReloadOutlined />} size="small">
              Tạo mới
            </Button>
          </Popconfirm>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Secret Key:</Text>
            <Input.Group compact style={{ marginTop: 8 }}>
              <Input
                value={settings?.secret_key || ''}
                readOnly
                style={{ width: 'calc(100% - 80px)' }}
                addonBefore={<KeyOutlined />}
              />
              <Tooltip title="Sao chép">
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(settings?.secret_key || '', 'Secret Key')}
                />
              </Tooltip>
            </Input.Group>
          </div>

          <div>
            <Text type="secondary">URL Bypass:</Text>
            <Input.Group compact style={{ marginTop: 8 }}>
              <Input
                value={bypassUrl}
                readOnly
                style={{ width: 'calc(100% - 80px)' }}
                addonBefore={<GlobalOutlined />}
              />
              <Tooltip title="Sao chép">
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(bypassUrl, 'URL')}
                />
              </Tooltip>
            </Input.Group>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Chia sẻ URL này cho những người cần truy cập trong lúc bảo trì
            </Text>
          </div>
        </Space>
      </Card>

      {/* Settings Form */}
      <Card
        title={
          <Space>
            <ToolOutlined />
            <span>Cài đặt trang bảo trì</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={{
            notification_type: 'info',
            show_countdown: true,
            allow_admin_access: true,
          }}
        >
          <Row gutter={24}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tiêu đề"
                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
              >
                <Input placeholder="Hệ thống đang bảo trì" maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="notification_type"
                label="Loại thông báo"
              >
                <Select>
                  <Option value="info">
                    <Space>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      Thông tin
                    </Space>
                  </Option>
                  <Option value="warning">
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      Cảnh báo
                    </Space>
                  </Option>
                  <Option value="error">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      Quan trọng
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="message"
            label="Nội dung thông báo"
          >
            <TextArea
              rows={4}
              placeholder="Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau."
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="estimated_end_time"
                label="Thời gian dự kiến hoàn thành"
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="allowed_ips"
                label="IP được phép truy cập (whitelist)"
                tooltip="Nhập các địa chỉ IP cách nhau bằng dấu phẩy"
              >
                <Input placeholder="192.168.1.1, 10.0.0.1" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="show_countdown"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <span>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    Hiển thị đếm ngược
                  </span>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="allow_admin_access"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <span>
                    <UserOutlined style={{ marginRight: 8 }} />
                    Cho phép Admin truy cập
                  </span>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                Lưu cài đặt
              </Button>
              <Button onClick={fetchSettings}>
                Hủy thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Logs Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>Lịch sử bảo trì</span>
          </Space>
        }
        open={logsVisible}
        onCancel={() => setLogsVisible(false)}
        footer={<Button onClick={() => setLogsVisible(false)}>Đóng</Button>}
        width={800}
      >
        <Table
          dataSource={logs}
          columns={logsColumns}
          rowKey="id"
          loading={logsLoading}
          pagination={{
            ...logsPagination,
            onChange: fetchLogs,
          }}
          size="small"
        />
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Xem trước trang bảo trì"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={<Button onClick={() => setPreviewVisible(false)}>Đóng</Button>}
        width={700}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: 24,
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Card
            style={{
              maxWidth: 480,
              width: '100%',
              borderRadius: 16,
            }}
            bodyStyle={{ textAlign: 'center', padding: '32px 24px' }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <ToolOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>
            <Title level={3}>{form.getFieldValue('title') || 'Hệ thống đang bảo trì'}</Title>
            <Paragraph type="secondary">
              {form.getFieldValue('message') ||
                'Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn.'}
            </Paragraph>
            {form.getFieldValue('show_countdown') && form.getFieldValue('estimated_end_time') && (
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginTop: 16 }}>
                <Text type="secondary">Dự kiến hoàn thành:</Text>
                <br />
                <Text strong>
                  {dayjs(form.getFieldValue('estimated_end_time')).format('HH:mm DD/MM/YYYY')}
                </Text>
              </div>
            )}
          </Card>
        </div>
      </Modal>
    </div>
  )
}

export default MaintenanceSettings
