import { Card, Space, Input, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { ActivityStatus } from '../../../data/mockData'

const { Search } = Input

interface ActivityFiltersProps {
  searchText: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  typeFilter?: string
  onTypeChange?: (value: string) => void
  activityTypes?: Array<{ id: string; name: string }>
  showTypeFilter?: boolean
  extraFilters?: React.ReactNode
}

function ActivityFilters({
  searchText,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  activityTypes = [],
  showTypeFilter = false,
  extraFilters,
}: ActivityFiltersProps) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Search
            placeholder="Tìm kiếm theo tên hoặc mã hoạt động..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            prefix={<SearchOutlined />}
          />

          <Select
            style={{ width: 180 }}
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={onStatusChange}
          >
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value={ActivityStatus.DRAFT}>Mở mới</Select.Option>
            <Select.Option value={ActivityStatus.PENDING_APPROVAL}>Chờ phê duyệt</Select.Option>
            <Select.Option value={ActivityStatus.IN_PROGRESS}>Đang thực hiện</Select.Option>
            <Select.Option value={ActivityStatus.ON_HOLD}>Hoãn</Select.Option>
            <Select.Option value={ActivityStatus.CANCELLED}>Huỷ</Select.Option>
            <Select.Option value={ActivityStatus.COMPLETED}>Hoàn thành</Select.Option>
          </Select>

          {showTypeFilter && typeFilter !== undefined && onTypeChange && (
            <Select
              style={{ width: 180 }}
              placeholder="Loại hoạt động"
              value={typeFilter}
              onChange={onTypeChange}
            >
              <Select.Option value="all">Tất cả loại</Select.Option>
              {activityTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          )}
        </Space>

        {extraFilters}
      </Space>
    </Card>
  )
}

export default ActivityFilters
