import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Typography, Space, Tag, Alert, Spin } from 'antd'
import {
  DashboardOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { Title, Paragraph, Text } = Typography

function HomePage() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemStatus()
  }, [])

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get('/api/v1/status')
      console.log('API Response:', response)
      setSystemStatus(response.data)
    } catch (error) {
      console.error('Error fetching system status:', error)
      console.error('Error details:', error.response || error.message)
      // Set default data nếu lỗi
      setSystemStatus({
        status: 'error',
        message: 'Không thể kết nối đến API',
        version: '1.0.0',
        database: {
          status: 'disconnected',
          connection: 'mysql',
          tables: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Đang tải...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2}>
          <DashboardOutlined /> Cổng thông tin Nghị quyết 57 - Hệ thống báo cáo
        </Title>
        <Paragraph type="secondary">
          Hệ thống tổng hợp, quản lý và báo cáo các hoạt động triển khai Nghị quyết 57 - Version 2.0
        </Paragraph>
      </div>

      {/* System Status Alert */}
      {systemStatus && (
        <Alert
          message="Trạng thái hệ thống"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> API: {systemStatus.message}
              </Text>
              <Text>
                <DatabaseOutlined style={{ color: systemStatus.database?.status === 'connected' ? '#52c41a' : '#ff4d4f' }} />
                {' '}Database: {systemStatus.database?.status || 'unknown'}
              </Text>
              <Text type="secondary">
                <ClockCircleOutlined /> Cập nhật lúc: {new Date(systemStatus.timestamp).toLocaleString('vi-VN')}
              </Text>
            </Space>
          }
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Phiên bản API"
              value={systemStatus?.version || '1.0.0'}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Kết nối Database"
              value={systemStatus?.database?.connection || 'MySQL'}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Số bảng dữ liệu"
              value={systemStatus?.database?.tables || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Trạng thái"
              value={systemStatus?.database?.status === 'connected' ? 'Hoạt động' : 'Lỗi'}
              prefix={systemStatus?.database?.status === 'connected' ?
                <CheckCircleOutlined /> : <SyncOutlined spin />}
              valueStyle={{
                color: systemStatus?.database?.status === 'connected' ? '#3f8600' : '#cf1322'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Information Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Về Nghị quyết 57"
            bordered={false}
            headStyle={{ backgroundColor: '#f0f5ff' }}
          >
            <Paragraph>
              Nghị quyết 57 là văn bản quan trọng hướng đến mục tiêu phát triển bền vững
              và cải thiện chất lượng cuộc sống của người dân.
            </Paragraph>
            <Paragraph>
              <Text strong>Mục tiêu chính:</Text>
            </Paragraph>
            <ul>
              <li>Tổng hợp và quản lý các hoạt động triển khai</li>
              <li>Theo dõi tiến độ thực hiện</li>
              <li>Báo cáo kết quả định kỳ</li>
              <li>Phối hợp giữa các đơn vị</li>
            </ul>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Tính năng hệ thống"
            bordered={false}
            headStyle={{ backgroundColor: '#f6ffed' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="blue">Quản lý hoạt động</Tag>
              <Tag color="green">Báo cáo thống kê</Tag>
              <Tag color="orange">Theo dõi tiến độ</Tag>
              <Tag color="purple">Quản lý người dùng</Tag>
              <Tag color="cyan">Phân quyền hệ thống</Tag>
              <Tag color="magenta">Xuất báo cáo</Tag>
            </Space>
            <Paragraph style={{ marginTop: 16 }}>
              <Text type="secondary">
                Hệ thống đang trong quá trình phát triển và hoàn thiện.
              </Text>
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card
        title="Truy cập nhanh"
        style={{ marginTop: 16 }}
        headStyle={{ backgroundColor: '#fff7e6' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <a href="/api/v1/status" target="_blank" rel="noopener noreferrer">
              📊 Xem trạng thái API
            </a>
          </Col>
          <Col span={8}>
            <a href="/api/v1/health" target="_blank" rel="noopener noreferrer">
              ❤️ Kiểm tra sức khỏe hệ thống
            </a>
          </Col>
          <Col span={8}>
            <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">
              🗄️ Quản lý Database (phpMyAdmin)
            </a>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default HomePage
