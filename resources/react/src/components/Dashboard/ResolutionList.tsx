import { useState } from "react"
import { Table, Input, Select, Button, Space, Tag, DatePicker } from "antd"
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"
import { t } from "i18next"

const { RangePicker } = DatePicker

interface ResolutionData {
  key: string
  stt: number
  title: string
  category: string
  issuer: string
  issueDate: string
  implementer: string
  deadline: string
  status: "active" | "pending" | "completed"
}

function ResolutionList() {
  const [searchText, setSearchText] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedIssuer, setSelectedIssuer] = useState<string>("all")
  const [selectedImplementer, setSelectedImplementer] = useState<string>("all")

  // Mock data - giống như trong hình
  const mockData: ResolutionData[] = [
    {
      key: "1",
      stt: 1,
      title:
        "Thăng, giảm bậc luận cuộc học của người học; công nhận, đình hoặc công nhận, đình hoặc hủy bỏ văn bằng thực công nhận, đình hoặc công nhận, đình hoặc hủy thực chuyển đổi cử cớ chật trình khóa học, có nghĩa, đóc máp cấu tạo",
      category: "Thông báo",
      issuer: "Ban Chỉ đạo Trung ương",
      issueDate: "08/11/2025",
      implementer: "Võ Thúm Hằng",
      deadline: "08/11/2025",
      status: "active"
    },
    {
      key: "2",
      stt: 2,
      title:
        "KẾT HOẠCH TỔCHỨC SỬ ĐIỀM hiếu Các: công nhận, đình hoặc trường tắc thống các công nhận, đình hoặc xử máy công nghĩa còn túng đổi không áp cấp công nhận khách sử thống đón cấp công nhận, đình hoặc hủy bỏ 2010/2025",
      category: "Kế hoạch",
      issuer: "Ban Chỉ đạo Trung ương",
      issueDate: "20/10/2025",
      implementer: "Võ Thúm Hằng",
      deadline: "20/10/2025",
      status: "active"
    }
  ]

  const columns: ColumnsType<ResolutionData> = [
    {
      title: "Số hiệu/Trích yếu",
      dataIndex: "stt",
      key: "stt",
      width: 60,
      render: (stt: number) => <span>{stt}</span>
    },
    {
      title: "Trích yếu",
      dataIndex: "title",
      key: "title",
      width: 300,
      render: (text: string) => <div className="resolution-title">{text}</div>
    },
    {
      title: "Loại văn bản",
      dataIndex: "category",
      key: "category",
      width: 120
    },
    {
      title: "Cơ quan ban hành",
      dataIndex: "issuer",
      key: "issuer",
      width: 180
    },
    {
      title: "Ngày ký",
      dataIndex: "issueDate",
      key: "issueDate",
      width: 120,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      )
    },
    {
      title: "Thời gian ban hành",
      dataIndex: "deadline",
      key: "deadline",
      width: 150,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      )
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 100,
      fixed: "right",
      render: () => (
        <Button type="link" icon={<EyeOutlined />} className="action-btn">
          Xem
        </Button>
      )
    }
  ]

  return (
    <div className="resolution-list">
      {/* Filters */}
      <div className="list-filters">
        <Space size="middle" wrap>
          <div className="filter-item">
            <label>Số hiệu/Trích yếu</label>
            <Input
              placeholder="Nhập số hiệu/Trích yếu"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
          </div>

          <div className="filter-item">
            <label>Loại văn bản</label>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 200 }}
              placeholder="Chọn loại">
              <Select.Option value="all">Tất cả</Select.Option>
              <Select.Option value="thongbao">Thông báo</Select.Option>
              <Select.Option value="kehoach">Kế hoạch</Select.Option>
              <Select.Option value="quyet-dinh">Quyết định</Select.Option>
            </Select>
          </div>

          <div className="filter-item">
            <label>Cơ quan ban hành</label>
            <Select
              value={selectedIssuer}
              onChange={setSelectedIssuer}
              style={{ width: 200 }}
              placeholder="Chọn cơ quan">
              <Select.Option value="all">Tất cả</Select.Option>
              <Select.Option value="bcd">Ban Chỉ đạo Trung ương</Select.Option>
            </Select>
          </div>

          <div className="filter-item">
            <label>Thời gian ban hành</label>
            <Select
              value={selectedImplementer}
              onChange={setSelectedImplementer}
              style={{ width: 200 }}
              placeholder="Chọn người thực hiện">
              <Select.Option value="all">Tất cả</Select.Option>
              <Select.Option value="vo-thum-hang">Võ Thúm Hằng</Select.Option>
            </Select>
          </div>

          <Button type="primary" icon={<SearchOutlined />}>
            Tìm kiếm
          </Button>
        </Space>
      </div>

      {/* Table title */}
      <div className="table-header">
        <h3>Danh sách văn bản</h3>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={mockData}
        pagination={{
          pageSize: 20,
          showTotal: (total) => `Tổng số: ${total} văn bản`,
          showSizeChanger: true,
          showQuickJumper: true
        }}
        scroll={{ x: 1200 }}
        className="resolution-table"
      />
    </div>
  )
}

export default ResolutionList
