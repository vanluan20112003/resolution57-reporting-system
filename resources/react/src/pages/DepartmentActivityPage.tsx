import { useState } from 'react'
import { Card, Tabs, Typography } from 'antd'
import {
  FlagOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useAuth } from '../shared/hooks'
import ActivityManagement from '../components/ActivityManagement/ActivityManagement'
import OrganizationProfile from '../components/OrganizationProfile'

const { Title, Text } = Typography

/**
 * DepartmentActivityPage
 *
 * Trang quản lý hoạt động của phòng ban dành cho STAFF và MANAGER
 * Bao gồm 2 tab:
 * 1. Hoạt động: Quản lý các hoạt động của đơn vị
 * 2. Thông tin đơn vị: Xem và chỉnh sửa thông tin cơ bản của đơn vị
 */
function DepartmentActivityPage() {
  const [activeTab, setActiveTab] = useState('activities')
  const { user } = useAuth()

  // Check if user can see organization profile tab
  const canManageOrganization = user?.organization_id && ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'].includes(user?.role || '')

  const tabItems = [
    {
      key: 'activities',
      label: (
        <span>
          <FlagOutlined />
          Hoạt động
        </span>
      ),
      children: <ActivityManagement />,
    },
  ]

  // Add organization tab for users with organization
  if (canManageOrganization) {
    tabItems.push({
      key: 'organization',
      label: (
        <span>
          <BankOutlined />
          Thông tin đơn vị
        </span>
      ),
      children: <OrganizationProfile />,
    })
  }

  return (
    <div style={{ padding: '0' }}>
      <Card>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            <FlagOutlined /> Hoạt động Phòng ban
          </Title>
          <Text type="secondary">
            Quản lý hoạt động và thông tin đơn vị của bạn
          </Text>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  )
}

export default DepartmentActivityPage
