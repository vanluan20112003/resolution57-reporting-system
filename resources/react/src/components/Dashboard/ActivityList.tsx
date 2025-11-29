// Activity List Component - Version 1.1 with Three View Modes (List, Card, Table)
import { useState, useEffect } from 'react'
import { Card, List, Tag, Typography, Space, Input, Select, DatePicker, Progress, Descriptions, Button, Table, Row, Col, Segmented } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  LockOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
  LinkOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  TableOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const { Text, Title } = Typography
const { Search } = Input
const { RangePicker } = DatePicker

// Activity type mapping (based on typical activity types)
const activityTypes = {
  'type-1': 'Hội nghị - Hội thảo',
  'type-2': 'Đào tạo - Tập huấn',
  'type-3': 'Nghiên cứu khoa học',
  'type-4': 'Chương trình hợp tác',
  'type-5': 'Xây dựng cơ sở vật chất',
}

// Activity field mapping
const activityFields = {
  'field-1': 'Khoa học công nghệ',
  'field-2': 'Đào tạo nguồn nhân lực',
  'field-3': 'Hợp tác quốc tế',
  'field-4': 'Phát triển cơ sở hạ tầng',
  'field-5': 'Chuyển đổi số',
}

// Organization mapping
const organizations = {
  'org-1': 'Trường Đại học Khoa học Tự nhiên',
  'org-2': 'Trường Đại học Khoa học Xã hội và Nhân văn',
  'org-3': 'Trường Đại học Công nghệ Thông tin',
  'org-4': 'Trường Đại học Bách khoa',
  'org-5': 'Trường Đại học Quốc tế',
}

// Activity interface
interface Activity {
  id: string
  code: string
  title: string
  description: string
  activity_type: string
  activity_field: string
  status: string
  lead_organization: string
  start_date: string
  end_date: string
  actual_start_date: string | null
  actual_end_date: string | null
  budget: number
  budget_source: string
  location: string
  completion_percentage: number
  created_at: string
  updated_at: string
  is_locked: boolean
  external_url?: string
  result_summary?: string
  created_by?: string
  approved_by?: string
  approved_at?: string
}

// Sample activity data matching database structure
const mockActivities: Activity[] = [
  {
    id: '1',
    code: 'NQ57-2025-001',
    title: 'Phát bảng tốt nghiệp đại học đợt tháng 10/2025',
    description: 'Tổ chức lễ phát bảng tốt nghiệp cho sinh viên tốt nghiệp đợt tháng 10/2025, dự kiến 500 sinh viên tham dự',
    activity_type: 'type-2',
    activity_field: 'field-2',
    status: 'IN_PROGRESS',
    lead_organization: 'org-1',
    start_date: '2025-10-15',
    end_date: '2025-10-20',
    actual_start_date: '2025-10-15',
    actual_end_date: null,
    budget: 50000000,
    budget_source: 'Ngân sách nhà nước',
    location: 'Hội trường A, Trường Đại học Khoa học Tự nhiên',
    completion_percentage: 75,
    created_at: dayjs().subtract(5, 'day').toISOString(),
    updated_at: dayjs().subtract(2, 'hour').toISOString(),
    is_locked: false,
    external_url: 'https://vnuhcm.edu.vn/tot-nghiep-2025',
    result_summary: 'Đã hoàn thành chuẩn bị hội trường và in ấn bảng tốt nghiệp. Đang trong quá trình thông báo cho sinh viên.',
    created_by: 'Nguyễn Văn A (phongdaotao@vnuhcm.edu.vn)',
    approved_by: 'Trần Thị B (hieutruong@vnuhcm.edu.vn)',
    approved_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    id: '2',
    code: 'NQ57-2025-002',
    title: 'Hội thảo khoa học quốc tế về Trí tuệ nhân tạo',
    description: 'Tổ chức hội thảo quốc tế với sự tham gia của các chuyên gia hàng đầu trong lĩnh vực AI, dự kiến có 200 đại biểu',
    activity_type: 'type-1',
    activity_field: 'field-1',
    status: 'APPROVED',
    lead_organization: 'org-3',
    start_date: '2025-12-01',
    end_date: '2025-12-03',
    actual_start_date: null,
    actual_end_date: null,
    budget: 300000000,
    budget_source: 'Quỹ phát triển khoa học công nghệ',
    location: 'Trung tâm Hội nghị Quốc tế, ĐHQG-HCM',
    completion_percentage: 30,
    created_at: dayjs().subtract(10, 'day').toISOString(),
    updated_at: dayjs().subtract(1, 'day').toISOString(),
    is_locked: false,
    external_url: 'https://ai-conference.vnuhcm.edu.vn',
    result_summary: 'Đã gửi thư mời tới các chuyên gia. Đang chuẩn bị nội dung chương trình và tài liệu hội thảo.',
    created_by: 'Lê Văn C (khoacntt@vnuhcm.edu.vn)',
    approved_by: 'Phạm Thị D (hieutruong@vnuhcm.edu.vn)',
    approved_at: dayjs().subtract(8, 'day').toISOString(),
  },
  {
    id: '3',
    code: 'NQ57-2025-003',
    title: 'Chương trình đào tạo nghiệp vụ cho giảng viên trẻ',
    description: 'Tập huấn kỹ năng giảng dạy, nghiên cứu khoa học và quản lý lớp học cho 100 giảng viên trẻ',
    activity_type: 'type-2',
    activity_field: 'field-2',
    status: 'COMPLETED',
    lead_organization: 'org-2',
    start_date: '2025-09-01',
    end_date: '2025-09-30',
    actual_start_date: '2025-09-01',
    actual_end_date: '2025-09-28',
    budget: 150000000,
    budget_source: 'Ngân sách nhà nước',
    location: 'Trung tâm Đào tạo, ĐHQG-HCM',
    completion_percentage: 100,
    created_at: dayjs().subtract(60, 'day').toISOString(),
    updated_at: dayjs().subtract(30, 'day').toISOString(),
    is_locked: true,
  },
  {
    id: '4',
    code: 'NQ57-2025-004',
    title: 'Dự án xây dựng phòng thí nghiệm IoT',
    description: 'Xây dựng và trang bị phòng thí nghiệm IoT hiện đại phục vụ nghiên cứu và đào tạo',
    activity_type: 'type-5',
    activity_field: 'field-4',
    status: 'IN_PROGRESS',
    lead_organization: 'org-3',
    start_date: '2025-08-01',
    end_date: '2025-12-31',
    actual_start_date: '2025-08-01',
    actual_end_date: null,
    budget: 2000000000,
    budget_source: 'Vốn đầu tư phát triển',
    location: 'Tòa nhà B, Trường ĐH Công nghệ Thông tin',
    completion_percentage: 60,
    created_at: dayjs().subtract(120, 'day').toISOString(),
    updated_at: dayjs().subtract(3, 'day').toISOString(),
    is_locked: false,
  },
  {
    id: '5',
    code: 'NQ57-2025-005',
    title: 'Chương trình hợp tác với ĐH Stanford',
    description: 'Triển khai chương trình trao đổi sinh viên và nghiên cứu chung với Đại học Stanford, Hoa Kỳ',
    activity_type: 'type-4',
    activity_field: 'field-3',
    status: 'APPROVED',
    lead_organization: 'org-5',
    start_date: '2026-01-15',
    end_date: '2026-06-30',
    actual_start_date: null,
    actual_end_date: null,
    budget: 500000000,
    budget_source: 'Quỹ hợp tác quốc tế',
    location: 'ĐH Quốc tế, Stanford University',
    completion_percentage: 15,
    created_at: dayjs().subtract(15, 'day').toISOString(),
    updated_at: dayjs().subtract(5, 'day').toISOString(),
    is_locked: false,
  },
  {
    id: '6',
    code: 'NQ57-2024-098',
    title: 'Hội nghị tổng kết năm học 2024-2025',
    description: 'Tổng kết các hoạt động trong năm học 2024-2025, đề ra phương hướng cho năm học mới',
    activity_type: 'type-1',
    activity_field: 'field-2',
    status: 'COMPLETED',
    lead_organization: 'org-1',
    start_date: '2025-07-20',
    end_date: '2025-07-21',
    actual_start_date: '2025-07-20',
    actual_end_date: '2025-07-21',
    budget: 80000000,
    budget_source: 'Ngân sách nhà nước',
    location: 'Hội trường lớn, ĐHQG-HCM',
    completion_percentage: 100,
    created_at: dayjs().subtract(130, 'day').toISOString(),
    updated_at: dayjs().subtract(120, 'day').toISOString(),
    is_locked: true,
  },
  {
    id: '7',
    code: 'NQ57-2025-006',
    title: 'Triển khai hệ thống quản lý học tập trực tuyến',
    description: 'Phát triển và triển khai hệ thống LMS cho toàn trường, hỗ trợ học tập trực tuyến và hybrid',
    activity_type: 'type-5',
    activity_field: 'field-5',
    status: 'IN_PROGRESS',
    lead_organization: 'org-3',
    start_date: '2025-06-01',
    end_date: '2025-12-31',
    actual_start_date: '2025-06-01',
    actual_end_date: null,
    budget: 800000000,
    budget_source: 'Quỹ chuyển đổi số',
    location: 'Online và các cơ sở ĐHQG-HCM',
    completion_percentage: 45,
    created_at: dayjs().subtract(150, 'day').toISOString(),
    updated_at: dayjs().subtract(1, 'hour').toISOString(),
    is_locked: false,
  },
  {
    id: '8',
    code: 'NQ57-2025-007',
    title: 'Dự án nghiên cứu về Blockchain trong giáo dục',
    description: 'Nghiên cứu ứng dụng công nghệ Blockchain trong quản lý bằng cấp và chứng chỉ',
    activity_type: 'type-3',
    activity_field: 'field-1',
    status: 'DRAFT',
    lead_organization: 'org-3',
    start_date: '2026-02-01',
    end_date: '2026-12-31',
    actual_start_date: null,
    actual_end_date: null,
    budget: 400000000,
    budget_source: 'Quỹ nghiên cứu khoa học',
    location: 'Phòng Lab 401, Trường ĐH CNTT',
    completion_percentage: 0,
    created_at: dayjs().subtract(7, 'day').toISOString(),
    updated_at: dayjs().subtract(6, 'day').toISOString(),
    is_locked: false,
  },
  {
    id: '9',
    code: 'NQ57-2025-008',
    title: 'Chương trình trao đổi sinh viên với Nhật Bản',
    description: 'Tổ chức chương trình trao đổi 50 sinh viên sang học tập và thực tập tại các trường đại học Nhật Bản',
    activity_type: 'type-4',
    activity_field: 'field-3',
    status: 'APPROVED',
    lead_organization: 'org-5',
    start_date: '2025-09-01',
    end_date: '2026-03-31',
    actual_start_date: null,
    actual_end_date: null,
    budget: 1200000000,
    budget_source: 'Quỹ hợp tác quốc tế, Học bổng Chính phủ Nhật',
    location: 'Các trường ĐH tại Tokyo, Osaka',
    completion_percentage: 20,
    created_at: dayjs().subtract(20, 'day').toISOString(),
    updated_at: dayjs().subtract(8, 'day').toISOString(),
    is_locked: false,
  },
  {
    id: '10',
    code: 'NQ57-2024-095',
    title: 'Workshop về Phương pháp nghiên cứu khoa học',
    description: 'Tổ chức workshop hướng dẫn phương pháp nghiên cứu cho học viên cao học và nghiên cứu sinh',
    activity_type: 'type-2',
    activity_field: 'field-1',
    status: 'COMPLETED',
    lead_organization: 'org-4',
    start_date: '2025-05-10',
    end_date: '2025-05-12',
    actual_start_date: '2025-05-10',
    actual_end_date: '2025-05-12',
    budget: 30000000,
    budget_source: 'Ngân sách trường',
    location: 'Phòng hội thảo 201, Trường ĐH Bách khoa',
    completion_percentage: 100,
    created_at: dayjs().subtract(200, 'day').toISOString(),
    updated_at: dayjs().subtract(190, 'day').toISOString(),
    is_locked: true,
  },
]

// Status mapping with Vietnamese labels
const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'DRAFT': {
    label: 'Nháp',
    color: 'default',
    icon: <EditOutlined />,
  },
  'APPROVED': {
    label: 'Đã duyệt',
    color: 'blue',
    icon: <CheckCircleOutlined />,
  },
  'IN_PROGRESS': {
    label: 'Đang thực hiện',
    color: 'processing',
    icon: <ClockCircleOutlined />,
  },
  'COMPLETED': {
    label: 'Hoàn thành',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  'CANCELLED': {
    label: 'Đã hủy',
    color: 'error',
    icon: <ExclamationCircleOutlined />,
  },
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

type ViewMode = 'list' | 'card' | 'table'

function ActivityList() {
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Get saved view mode from localStorage, default to 'list'
    const saved = localStorage.getItem('activityViewMode')
    return (saved as ViewMode) || 'list'
  })

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activityViewMode', viewMode)
  }, [viewMode])

  // Filter activities
  const filteredActivities = mockActivities.filter(activity => {
    const matchSearch =
      activity.code.toLowerCase().includes(searchText.toLowerCase()) ||
      activity.title.toLowerCase().includes(searchText.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchText.toLowerCase())

    const matchStatus = filterStatus === 'all' || activity.status === filterStatus
    const matchType = filterType === 'all' || activity.activity_type === filterType

    return matchSearch && matchStatus && matchType
  })

  // Handle view detail
  const handleViewDetail = (activity: Activity) => {
    setSelectedActivity(activity)
  }

  // Handle back to list
  const handleBackToList = () => {
    setSelectedActivity(null)
  }

  // Render Card View
  const renderCardView = () => (
    <Row gutter={[16, 16]}>
      {filteredActivities.map((item) => (
        <Col xs={24} sm={12} lg={8} key={item.id}>
          <Card
            hoverable
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%', flex: 1 }}>
              {/* Tags */}
              <Space wrap size={[4, 4]}>
                <Tag color="blue">{item.code}</Tag>
                <Tag color={statusMap[item.status]?.color || 'default'}>
                  {statusMap[item.status]?.icon} {statusMap[item.status]?.label}
                </Tag>
                {item.is_locked && (
                  <Tag icon={<LockOutlined />} color="warning">Đã khóa</Tag>
                )}
              </Space>

              {/* Title */}
              <Title level={5} style={{ margin: 0, minHeight: '48px' }}>
                {item.title}
              </Title>

              {/* Description */}
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </Text>
              </div>

              {/* Key Info */}
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={4}>
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <Text ellipsis style={{ fontSize: '13px' }}>
                    {organizations[item.lead_organization as keyof typeof organizations]}
                  </Text>
                </Space>
                <Space size={4}>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <Text style={{ fontSize: '13px' }}>
                    {dayjs(item.start_date).format('DD/MM/YYYY')}
                  </Text>
                </Space>
                <Space size={4}>
                  <DollarOutlined style={{ color: '#faad14' }} />
                  <Text strong style={{ fontSize: '13px' }}>{formatCurrency(item.budget)}</Text>
                </Space>
              </Space>

              {/* Progress */}
              {item.status === 'IN_PROGRESS' && (
                <Progress percent={item.completion_percentage} size="small" />
              )}

              {/* Actions */}
              <Button
                type="primary"
                block
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(item)}
              >
                Xem chi tiết
              </Button>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  )

  // Render Table View
  const renderTableView = () => {
    const columns = [
      {
        title: 'Mã',
        dataIndex: 'code',
        key: 'code',
        width: 140,
        fixed: 'left' as const,
        render: (text: string) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: 'Tiêu đề',
        dataIndex: 'title',
        key: 'title',
        width: 300,
        ellipsis: true,
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 150,
        render: (status: string) => (
          <Tag color={statusMap[status]?.color || 'default'}>
            {statusMap[status]?.icon} {statusMap[status]?.label}
          </Tag>
        ),
      },
      {
        title: 'Loại',
        dataIndex: 'activity_type',
        key: 'activity_type',
        width: 180,
        render: (type: string) => (
          <Tag>{activityTypes[type as keyof typeof activityTypes]}</Tag>
        ),
      },
      {
        title: 'Đơn vị chủ trì',
        dataIndex: 'lead_organization',
        key: 'lead_organization',
        width: 250,
        ellipsis: true,
        render: (org: string) => (
          <Space size={4}>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <Text>{organizations[org as keyof typeof organizations]}</Text>
          </Space>
        ),
      },
      {
        title: 'Thời gian',
        key: 'time',
        width: 200,
        render: (_: any, record: Activity) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '12px' }}>
              Bắt đầu: {dayjs(record.start_date).format('DD/MM/YYYY')}
            </Text>
            <Text style={{ fontSize: '12px' }}>
              Kết thúc: {dayjs(record.end_date).format('DD/MM/YYYY')}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Kinh phí',
        dataIndex: 'budget',
        key: 'budget',
        width: 150,
        align: 'right' as const,
        render: (budget: number) => (
          <Text strong style={{ fontSize: '13px' }}>{formatCurrency(budget)}</Text>
        ),
      },
      {
        title: 'Tiến độ',
        dataIndex: 'completion_percentage',
        key: 'completion_percentage',
        width: 120,
        render: (percent: number, record: Activity) =>
          record.status === 'IN_PROGRESS' ? (
            <Progress percent={percent} size="small" style={{ margin: 0 }} />
          ) : (
            <Tag color="cyan">{percent}%</Tag>
          ),
      },
      {
        title: 'Thao tác',
        key: 'action',
        fixed: 'right' as const,
        width: 120,
        render: (_: any, record: Activity) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            Chi tiết
          </Button>
        ),
      },
    ]

    return (
      <Table
        columns={columns}
        dataSource={filteredActivities}
        rowKey="id"
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Tổng số ${total} hoạt động`,
        }}
      />
    )
  }

  // Render List View (Full Summary)
  const renderListView = () => (
    <List
      itemLayout="vertical"
      dataSource={filteredActivities}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Tổng số ${total} hoạt động`,
      }}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          style={{
            padding: '24px',
            marginBottom: '16px',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            background: '#fafafa',
          }}
        >
          {/* Header Section */}
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Title and Tags */}
            <div>
              <Space wrap size={[8, 8]} style={{ marginBottom: '12px' }}>
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {item.code}
                </Tag>
                <Tag
                  color={statusMap[item.status]?.color || 'default'}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {statusMap[item.status]?.icon}{' '}
                  {statusMap[item.status]?.label || item.status}
                </Tag>
                {item.is_locked && (
                  <Tag icon={<LockOutlined />} color="warning" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    Đã khóa
                  </Tag>
                )}
                {item.completion_percentage > 0 && (
                  <Tag color="cyan" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {item.completion_percentage}% hoàn thành
                  </Tag>
                )}
              </Space>
              <Title level={4} style={{ margin: 0 }}>
                {item.title}
              </Title>
            </div>

            {/* Description */}
            <Text style={{ fontSize: '15px', lineHeight: '1.6' }}>
              {item.description}
            </Text>

            {/* Full Information Grid */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Loại hoạt động</Text>
                  <Tag>{activityTypes[item.activity_type as keyof typeof activityTypes]}</Tag>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Lĩnh vực</Text>
                  {item.activity_field && (
                    <Tag color="purple">
                      {activityFields[item.activity_field as keyof typeof activityFields]}
                    </Tag>
                  )}
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Đơn vị chủ trì</Text>
                  <Space size={4}>
                    <TeamOutlined style={{ color: '#1890ff' }} />
                    <Text>{organizations[item.lead_organization as keyof typeof organizations]}</Text>
                  </Space>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Thời gian kế hoạch</Text>
                  <Space size={4}>
                    <CalendarOutlined style={{ color: '#52c41a' }} />
                    <Text>
                      {dayjs(item.start_date).format('DD/MM/YYYY')} - {dayjs(item.end_date).format('DD/MM/YYYY')}
                    </Text>
                  </Space>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Kinh phí</Text>
                  <Space size={4}>
                    <DollarOutlined style={{ color: '#faad14' }} />
                    <Text strong>{formatCurrency(item.budget)}</Text>
                  </Space>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Nguồn kinh phí</Text>
                  <Tag color="geekblue">{item.budget_source}</Tag>
                </Space>
              </Col>
              <Col xs={24}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Địa điểm</Text>
                  <Space size={4}>
                    <EnvironmentOutlined style={{ color: '#eb2f96' }} />
                    <Text>{item.location}</Text>
                  </Space>
                </Space>
              </Col>
              {item.result_summary && (
                <Col xs={24}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Tóm tắt kết quả</Text>
                    <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>{item.result_summary}</Text>
                  </Space>
                </Col>
              )}
            </Row>

            {/* Progress Bar for In Progress items */}
            {item.status === 'IN_PROGRESS' && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Tiến độ thực hiện
                </Text>
                <Progress
                  percent={item.completion_percentage}
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <Space>
              <Button type="primary" icon={<EyeOutlined />} onClick={() => handleViewDetail(item)}>
                Xem chi tiết
              </Button>
              {item.external_url && (
                <Button icon={<LinkOutlined />} href={item.external_url} target="_blank">
                  Liên kết ngoài
                </Button>
              )}
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                Cập nhật {dayjs(item.updated_at).fromNow()}
              </Text>
            </Space>
          </Space>
        </List.Item>
      )}
    />
  )

  // If activity is selected, show detail view
  if (selectedActivity) {
    return (
      <div style={{ padding: '24px' }}>
        {/* Back button */}
        <Button
          icon={<FileTextOutlined />}
          onClick={handleBackToList}
          style={{ marginBottom: '24px' }}
        >
          Quay lại danh sách
        </Button>

        {/* Header with tags */}
        <Space wrap style={{ marginBottom: '24px' }}>
          <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
            {selectedActivity.code}
          </Tag>
          <Tag
            color={statusMap[selectedActivity.status]?.color || 'default'}
            style={{ fontSize: '14px', padding: '4px 12px' }}
          >
            {statusMap[selectedActivity.status]?.icon}{' '}
            {statusMap[selectedActivity.status]?.label || selectedActivity.status}
          </Tag>
          {selectedActivity.is_locked && (
            <Tag icon={<LockOutlined />} color="warning" style={{ fontSize: '14px', padding: '4px 12px' }}>
              Đã khóa
            </Tag>
          )}
        </Space>

        {/* Title */}
        <Title level={2} style={{ marginBottom: '24px' }}>
          {selectedActivity.title}
        </Title>

        {/* Progress */}
        {selectedActivity.status === 'IN_PROGRESS' && (
          <Card style={{ marginBottom: '24px' }}>
            <Text strong>Tiến độ thực hiện:</Text>
            <Progress
              percent={selectedActivity.completion_percentage}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              style={{ marginTop: '8px' }}
            />
          </Card>
        )}

        {/* Details */}
        <Card>
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label="Mô tả" span={2}>
              {selectedActivity.description}
            </Descriptions.Item>

            <Descriptions.Item label="Loại hoạt động">
              <Tag>{activityTypes[selectedActivity.activity_type as keyof typeof activityTypes]}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Lĩnh vực">
              {selectedActivity.activity_field && (
                <Tag color="purple">
                  {activityFields[selectedActivity.activity_field as keyof typeof activityFields]}
                </Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Đơn vị chủ trì" span={2}>
              <Space>
                <TeamOutlined style={{ color: '#1890ff' }} />
                {organizations[selectedActivity.lead_organization as keyof typeof organizations]}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian kế hoạch">
              <Space direction="vertical" size={4}>
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <Text>Bắt đầu: {dayjs(selectedActivity.start_date).format('DD/MM/YYYY')}</Text>
                </Space>
                <Space>
                  <CalendarOutlined style={{ color: '#ff4d4f' }} />
                  <Text>Kết thúc: {dayjs(selectedActivity.end_date).format('DD/MM/YYYY')}</Text>
                </Space>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian thực tế">
              <Space direction="vertical" size={4}>
                {selectedActivity.actual_start_date ? (
                  <Space>
                    <CalendarOutlined style={{ color: '#52c41a' }} />
                    <Text>Bắt đầu: {dayjs(selectedActivity.actual_start_date).format('DD/MM/YYYY')}</Text>
                  </Space>
                ) : (
                  <Text type="secondary">Chưa bắt đầu</Text>
                )}
                {selectedActivity.actual_end_date ? (
                  <Space>
                    <CalendarOutlined style={{ color: '#ff4d4f' }} />
                    <Text>Kết thúc: {dayjs(selectedActivity.actual_end_date).format('DD/MM/YYYY')}</Text>
                  </Space>
                ) : selectedActivity.status === 'COMPLETED' ? (
                  <Text type="secondary">Chưa cập nhật</Text>
                ) : (
                  <Text type="secondary">Đang thực hiện</Text>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Kinh phí">
              <Space>
                <DollarOutlined style={{ color: '#faad14' }} />
                <Text strong>{formatCurrency(selectedActivity.budget)}</Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Nguồn kinh phí">
              <Tag color="geekblue">{selectedActivity.budget_source}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Địa điểm" span={2}>
              <Space>
                <EnvironmentOutlined style={{ color: '#eb2f96' }} />
                {selectedActivity.location}
              </Space>
            </Descriptions.Item>

            {selectedActivity.external_url && (
              <Descriptions.Item label="Liên kết ngoài" span={2}>
                <Button
                  type="link"
                  icon={<LinkOutlined />}
                  href={selectedActivity.external_url}
                  target="_blank"
                  style={{ padding: 0 }}
                >
                  {selectedActivity.external_url}
                </Button>
              </Descriptions.Item>
            )}

            {selectedActivity.result_summary && (
              <Descriptions.Item label="Tóm tắt kết quả" span={2}>
                {selectedActivity.result_summary}
              </Descriptions.Item>
            )}

            {selectedActivity.created_by && (
              <Descriptions.Item label="Người tạo">
                {selectedActivity.created_by}
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedActivity.created_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>

            {selectedActivity.approved_by && (
              <Descriptions.Item label="Người duyệt">
                {selectedActivity.approved_by}
              </Descriptions.Item>
            )}

            {selectedActivity.approved_at && (
              <Descriptions.Item label="Ngày duyệt">
                {dayjs(selectedActivity.approved_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Cập nhật lần cuối" span={2}>
              {dayjs(selectedActivity.updated_at).fromNow()} •{' '}
              {dayjs(selectedActivity.updated_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    )
  }

  // Show list view
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined style={{ marginRight: '12px' }} />
          Hoạt động thực hiện Nghị quyết 57
        </Title>
        <Text type="secondary">
          Danh sách các hoạt động, dự án triển khai thực hiện Nghị quyết số 57-NQ/TW
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap style={{ width: '100%' }}>
            <Search
              placeholder="Tìm theo mã, tiêu đề hoặc mô tả..."
              allowClear
              style={{ width: 350 }}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              placeholder="Trạng thái"
              style={{ width: 200 }}
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Select.Option value="all">Tất cả trạng thái</Select.Option>
              <Select.Option value="DRAFT">Nháp</Select.Option>
              <Select.Option value="APPROVED">Đã duyệt</Select.Option>
              <Select.Option value="IN_PROGRESS">Đang thực hiện</Select.Option>
              <Select.Option value="COMPLETED">Hoàn thành</Select.Option>
              <Select.Option value="CANCELLED">Đã hủy</Select.Option>
            </Select>

            <Select
              placeholder="Loại hoạt động"
              style={{ width: 200 }}
              value={filterType}
              onChange={setFilterType}
            >
              <Select.Option value="all">Tất cả loại</Select.Option>
              {Object.entries(activityTypes).map(([key, value]) => (
                <Select.Option key={key} value={key}>{value}</Select.Option>
              ))}
            </Select>

            <RangePicker placeholder={['Từ ngày', 'Đến ngày']} />
          </Space>

          {/* View Mode Selector */}
          <Space align="center">
            <Text strong>Chế độ xem:</Text>
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                {
                  label: 'Danh sách',
                  value: 'list',
                  icon: <UnorderedListOutlined />,
                },
                {
                  label: 'Thẻ',
                  value: 'card',
                  icon: <AppstoreOutlined />,
                },
                {
                  label: 'Bảng',
                  value: 'table',
                  icon: <TableOutlined />,
                },
              ]}
            />

          </Space>
        </Space>
      </Card>

      {/* Activity List - Conditional rendering based on view mode */}
      {viewMode === 'table' ? (
        <Card>{renderTableView()}</Card>
      ) : viewMode === 'card' ? (
        renderCardView()
      ) : (
        <Card>{renderListView()}</Card>
      )}
    </div>
  )
}

export default ActivityList
