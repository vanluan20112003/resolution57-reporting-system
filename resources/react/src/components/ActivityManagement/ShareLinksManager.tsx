import { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  Table,
  Space,
  Form,
  Input,
  DatePicker,
  Switch,
  Popconfirm,
  message,
  Typography,
  Tag,
  Tooltip,
  Empty,
  Alert,
} from 'antd'
import {
  ShareAltOutlined,
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  ShareLink,
  getActivityShareLinks,
  createShareLink,
  updateShareLink,
  deleteShareLink,
} from '../../services/shareApi'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface ShareLinksManagerProps {
  activityId: string
  activityName: string
  visible: boolean
  onClose: () => void
}

function ShareLinksManager({
  activityId,
  activityName,
  visible,
  onClose,
}: ShareLinksManagerProps) {
  const [loading, setLoading] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedLink, setSelectedLink] = useState<ShareLink | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible && activityId) {
      loadShareLinks()
    }
  }, [visible, activityId])

  const loadShareLinks = async () => {
    try {
      setLoading(true)
      const data = await getActivityShareLinks(activityId)
      setShareLinks(data)
    } catch (error: any) {
      message.error(error.message || 'Không thể tải danh sách link chia sẻ')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      await createShareLink(activityId, {
        description: values.description,
        expires_at: values.expires_at?.toISOString(),
      })

      message.success('Tạo link chia sẻ thành công')
      setCreateModalVisible(false)
      form.resetFields()
      loadShareLinks()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Không thể tạo link chia sẻ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedLink) return

    try {
      const values = await form.validateFields()
      setSubmitting(true)

      await updateShareLink(activityId, selectedLink.id, {
        description: values.description,
        expires_at: values.expires_at?.toISOString() || null,
        is_active: values.is_active,
      })

      message.success('Cập nhật thành công')
      setEditModalVisible(false)
      setSelectedLink(null)
      form.resetFields()
      loadShareLinks()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.message || 'Không thể cập nhật link chia sẻ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (link: ShareLink) => {
    try {
      await deleteShareLink(activityId, link.id)
      message.success('Đã xóa link chia sẻ')
      loadShareLinks()
    } catch (error: any) {
      message.error(error.message || 'Không thể xóa link chia sẻ')
    }
  }

  const handleCopyLink = (link: ShareLink) => {
    navigator.clipboard.writeText(link.share_url)
    message.success('Đã sao chép link vào clipboard')
  }

  const openEditModal = (link: ShareLink) => {
    setSelectedLink(link)
    form.setFieldsValue({
      description: link.description,
      expires_at: link.expires_at ? dayjs(link.expires_at) : null,
      is_active: link.is_active,
    })
    setEditModalVisible(true)
  }

  const columns: ColumnsType<ShareLink> = [
    {
      title: 'Link chia sẻ',
      key: 'link',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <LinkOutlined />
            <Text
              copyable={{
                text: record.share_url,
                tooltips: ['Sao chép link', 'Đã sao chép'],
              }}
            >
              {record.share_url.length > 50
                ? record.share_url.substring(0, 50) + '...'
                : record.share_url}
            </Text>
          </Space>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (!record.is_active) {
          return (
            <Tag icon={<CloseCircleOutlined />} color="default">
              Đã tắt
            </Tag>
          )
        }
        if (record.is_expired) {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Hết hạn
            </Tag>
          )
        }
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Hoạt động
          </Tag>
        )
      },
    },
    {
      title: 'Hết hạn',
      key: 'expires_at',
      width: 120,
      render: (_, record) => {
        if (!record.expires_at) {
          return <Text type="secondary">Không giới hạn</Text>
        }
        return (
          <Text type={record.is_expired ? 'danger' : undefined}>
            {dayjs(record.expires_at).format('DD/MM/YYYY HH:mm')}
          </Text>
        )
      },
    },
    {
      title: 'Lượt truy cập',
      dataIndex: 'access_count',
      key: 'access_count',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Sao chép link">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyLink(record)}
            />
          </Tooltip>
          <Tooltip title="Mở link">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => window.open(record.share_url, '_blank')}
              disabled={!record.is_active || record.is_expired}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa link chia sẻ này?"
            description="Link sẽ không còn hoạt động"
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button type="link" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Modal
        title={
          <Space>
            <ShareAltOutlined />
            <span>Chia sẻ tài liệu</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        <Alert
          message={`Hoạt động: ${activityName}`}
          description="Tạo link chia sẻ để người có tài khoản có thể xem tài liệu của hoạt động này. Link chia sẻ sẽ hiển thị tất cả file được nhóm theo loại tài liệu."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields()
              setCreateModalVisible(true)
            }}
          >
            Tạo link mới
          </Button>
        </div>

        {shareLinks.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có link chia sẻ nào"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields()
                setCreateModalVisible(true)
              }}
            >
              Tạo link đầu tiên
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={shareLinks}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Tạo link chia sẻ mới"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Tạo link"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="description"
            label="Mô tả (không bắt buộc)"
            extra="Mô tả ngắn về mục đích chia sẻ"
          >
            <TextArea rows={2} placeholder="VD: Chia sẻ cho đối tác dự án" />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label="Thời gian hết hạn (không bắt buộc)"
            extra="Để trống nếu muốn link không có thời hạn"
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày hết hạn"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa link chia sẻ"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setSelectedLink(null)
          form.resetFields()
        }}
        onOk={handleUpdate}
        confirmLoading={submitting}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea rows={2} placeholder="Mô tả mục đích chia sẻ" />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label="Thời gian hết hạn"
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày hết hạn"
              style={{ width: '100%' }}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Đã tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default ShareLinksManager
