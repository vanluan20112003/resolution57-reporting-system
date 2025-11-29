/**
 * Mock Data for NQ57 Portal
 * Based on database structure: organizations, activity_types, activity_fields, kpis, activities
 */

// Organization Types
export enum OrganizationType {
  UNIVERSITY_SYSTEM = 'UNIVERSITY_SYSTEM',  // Đại học Quốc gia
  UNIVERSITY = 'UNIVERSITY',                // Trường thành viên
  RESEARCH_INSTITUTE = 'RESEARCH_INSTITUTE', // Viện nghiên cứu
  CENTER = 'CENTER',                        // Trung tâm
  DEPARTMENT = 'DEPARTMENT',                // Phòng ban
  EXTERNAL = 'EXTERNAL',                    // Đơn vị ngoài
}

// Organization Status
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

// Organizations (from database table: organizations)
export const mockOrganizations = [
  {
    id: '1',
    code: 'VNUHCM',
    name: 'Đại học Quốc gia TP.HCM',
    short_name: 'ĐHQG-HCM',
    type: OrganizationType.UNIVERSITY_SYSTEM,
    parent_id: null,
    is_vnuhcm: true,
    contact_email: 'info@vnuhcm.edu.vn',
    contact_phone: '028 3724 4652',
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://vnuhcm.edu.vn',
    description: 'Đại học Quốc gia Thành phố Hồ Chí Minh',
    status: OrganizationStatus.ACTIVE,
    display_order: 1,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '2',
    code: 'HCMUS',
    name: 'Trường Đại học Khoa học Tự nhiên',
    short_name: 'KHTN',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@hcmus.edu.vn',
    contact_phone: '028 3822 4269',
    address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
    website: 'https://hcmus.edu.vn',
    description: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 2,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '3',
    code: 'HCMUT',
    name: 'Trường Đại học Bách Khoa',
    short_name: 'BK',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@hcmut.edu.vn',
    contact_phone: '028 3865 4448',
    address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh',
    website: 'https://hcmut.edu.vn',
    description: 'Trường Đại học Bách Khoa - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 3,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '4',
    code: 'UIT',
    name: 'Trường Đại học Công nghệ Thông tin',
    short_name: 'CNTT',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@uit.edu.vn',
    contact_phone: '028 3724 7256',
    address: 'Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://uit.edu.vn',
    description: 'Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 4,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '5',
    code: 'UEL',
    name: 'Trường Đại học Kinh tế - Luật',
    short_name: 'UEL',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@uel.edu.vn',
    contact_phone: '028 3724 6578',
    address: 'Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://uel.edu.vn',
    description: 'Trường Đại học Kinh tế - Luật - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 5,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '6',
    code: 'USSH',
    name: 'Trường Đại học Khoa học Xã hội và Nhân văn',
    short_name: 'KHXH&NV',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@ussh.edu.vn',
    contact_phone: '028 3829 6670',
    address: '10-12 Đinh Tiên Hoàng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    website: 'https://ussh.edu.vn',
    description: 'Trường Đại học Khoa học Xã hội và Nhân văn - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 6,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '7',
    code: 'IU',
    name: 'Trường Đại học Quốc tế',
    short_name: 'IU',
    type: OrganizationType.UNIVERSITY,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@hcmiu.edu.vn',
    contact_phone: '028 3724 4270',
    address: 'Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://hcmiu.edu.vn',
    description: 'Trường Đại học Quốc tế - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 7,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '8',
    code: 'VNUHCM-IAST',
    name: 'Viện Khoa học Ứng dụng và Công nghệ',
    short_name: 'IAST',
    type: OrganizationType.RESEARCH_INSTITUTE,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'info@iast.edu.vn',
    contact_phone: '028 3724 4652',
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://iast.edu.vn',
    description: 'Viện Khoa học Ứng dụng và Công nghệ - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 8,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '9',
    code: 'VNUHCM-CIE',
    name: 'Trung tâm Đổi mới sáng tạo và Khởi nghiệp',
    short_name: 'CIE',
    type: OrganizationType.CENTER,
    parent_id: '1',
    is_vnuhcm: true,
    contact_email: 'cie@vnuhcm.edu.vn',
    contact_phone: '028 3724 4652',
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    website: 'https://cie.vnuhcm.edu.vn',
    description: 'Trung tâm Đổi mới sáng tạo và Khởi nghiệp - ĐHQG TP.HCM',
    status: OrganizationStatus.ACTIVE,
    display_order: 9,
    created_at: '2024-01-01T00:00:00',
  },
  {
    id: '10',
    code: 'EXTERNAL-MOET',
    name: 'Bộ Giáo dục và Đào tạo',
    short_name: 'BGD&ĐT',
    type: OrganizationType.EXTERNAL,
    parent_id: null,
    is_vnuhcm: false,
    contact_email: 'moet@moet.gov.vn',
    contact_phone: '024 3869 4153',
    address: '49 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
    website: 'https://moet.gov.vn',
    description: 'Bộ Giáo dục và Đào tạo Việt Nam',
    status: OrganizationStatus.ACTIVE,
    display_order: 100,
    created_at: '2024-01-01T00:00:00',
  },
]

// Activity Types (from database table: activity_types)
export const mockActivityTypes = [
  { id: '1', name: 'Chương trình', description: 'Chương trình hoạt động', display_order: 1, is_active: true },
  { id: '2', name: 'Đề án', description: 'Đề án nghiên cứu', display_order: 2, is_active: true },
  { id: '3', name: 'Dự án', description: 'Dự án thực hiện', display_order: 3, is_active: true },
  { id: '4', name: 'Hội thảo', description: 'Hội thảo khoa học', display_order: 4, is_active: true },
  { id: '5', name: 'Hợp tác', description: 'Hoạt động hợp tác', display_order: 5, is_active: true },
  { id: '6', name: 'Tập huấn', description: 'Tập huấn đào tạo', display_order: 6, is_active: true },
  { id: '7', name: 'Sự kiện', description: 'Sự kiện đặc biệt', display_order: 7, is_active: true },
]

// Activity Fields (from database table: activity_fields)
export const mockActivityFields = [
  { id: '1', name: 'Công nghệ sinh học', description: 'Lĩnh vực công nghệ sinh học', display_order: 1, is_active: true },
  { id: '2', name: 'Công nghệ thông tin', description: 'Lĩnh vực CNTT', display_order: 2, is_active: true },
  { id: '3', name: 'Trí tuệ nhân tạo (AI)', description: 'Lĩnh vực AI', display_order: 3, is_active: true },
  { id: '4', name: 'Khoa học Xã hội – nhân văn', description: 'Lĩnh vực khoa học xã hội', display_order: 4, is_active: true },
  { id: '5', name: 'Kinh tế - luật', description: 'Lĩnh vực kinh tế và luật', display_order: 5, is_active: true },
  { id: '6', name: 'Y tế', description: 'Lĩnh vực y tế', display_order: 6, is_active: true },
]

// KPIs (from database table: kpis)
export const mockKPIs = [
  {
    id: '1',
    source: 'NQ57_TC',
    code: 'KPI-TC-01',
    title: 'Top 150 trường đại học hàng đầu Châu Á',
    description: 'Mục tiêu xếp hạng đại học',
    category: 'RANKING',
    order_number: 1,
    is_active: true,
  },
  {
    id: '2',
    source: 'NQ57_TC',
    code: 'KPI-TC-02',
    title: 'Số lĩnh vực xếp hạng 100 của thế giới',
    description: 'Mục tiêu xếp hạng theo lĩnh vực',
    category: 'RANKING',
    order_number: 2,
    is_active: true,
  },
  {
    id: '3',
    source: 'NQ57_TC',
    code: 'KPI-TC-03',
    title: 'Mỗi đại học tạo ra 50 doanh nghiệp khởi nghiệp sáng tạo/năm',
    description: 'Mục tiêu về khởi nghiệp',
    category: 'INNOVATION',
    order_number: 3,
    is_active: true,
  },
  {
    id: '4',
    source: 'NQ57_DHQG',
    code: 'KPI-DHQG-01',
    title: 'Xây dựng, triển khai các chương trình đào tạo phát triển đội ngũ',
    description: 'Phát triển nhân lực',
    category: 'MANAGEMENT',
    order_number: 1,
    is_active: true,
  },
  {
    id: '5',
    source: 'NQ57_DHQG',
    code: 'KPI-DHQG-02',
    title: 'Bồi dưỡng năng lực quản trị đại học',
    description: 'Nâng cao năng lực quản trị',
    category: 'MANAGEMENT',
    order_number: 2,
    is_active: true,
  },
]

// Activity Status
export enum ActivityStatus {
  DRAFT = 'DRAFT',                 // Mở mới
  PENDING_APPROVAL = 'PENDING_APPROVAL',  // Đang phê duyệt
  IN_PROGRESS = 'IN_PROGRESS',     // Đang thực hiện
  ON_HOLD = 'ON_HOLD',             // Hoãn
  CANCELLED = 'CANCELLED',          // Huỷ
  COMPLETED = 'COMPLETED',          // Hoàn thành
}

// Activities (from database table: activities)
export const mockActivities = [
  {
    id: '1',
    code: 'ACT-2025-001',
    title: 'Hội thảo Khoa học Quốc tế về Trí tuệ Nhân tạo 2025',
    description: 'Tổ chức hội thảo khoa học quốc tế về AI với sự tham gia của các chuyên gia hàng đầu trong lĩnh vực',
    activity_type_id: '4', // Hội thảo
    activity_field_id: '3', // AI
    status: ActivityStatus.IN_PROGRESS,
    lead_organization_id: '4', // UIT
    start_date: '2025-03-01',
    end_date: '2025-03-03',
    actual_start_date: '2025-03-01',
    actual_end_date: null,
    budget: 500000000,
    budget_source: 'ĐHQG-HCM',
    location: 'Trường ĐH Công nghệ Thông tin, ĐHQG-HCM',
    completion_percentage: 45,
    created_at: '2025-01-15T08:00:00Z',
  },
  {
    id: '2',
    code: 'ACT-2025-002',
    title: 'Dự án Nghiên cứu phát triển thuật toán Machine Learning cho Y tế',
    description: 'Nghiên cứu và phát triển các thuật toán ML ứng dụng trong chẩn đoán bệnh',
    activity_type_id: '3', // Dự án
    activity_field_id: '6', // Y tế
    status: ActivityStatus.PENDING_APPROVAL,
    lead_organization_id: '2', // HCMUS
    start_date: '2025-04-01',
    end_date: '2025-12-31',
    actual_start_date: null,
    actual_end_date: null,
    budget: 2000000000,
    budget_source: 'Bộ Khoa học và Công nghệ',
    location: 'Trường ĐH Khoa học Tự nhiên',
    completion_percentage: 0,
    created_at: '2025-02-10T10:30:00Z',
  },
  {
    id: '3',
    code: 'ACT-2025-003',
    title: 'Chương trình Hợp tác Quốc tế với Stanford University',
    description: 'Chương trình trao đổi giảng viên và sinh viên với đại học Stanford',
    activity_type_id: '5', // Hợp tác
    activity_field_id: '2', // CNTT
    status: ActivityStatus.DRAFT,
    lead_organization_id: '3', // HCMUT
    start_date: '2025-09-01',
    end_date: '2026-08-31',
    actual_start_date: null,
    actual_end_date: null,
    budget: 5000000000,
    budget_source: 'Quỹ Phát triển KHCN',
    location: 'ĐHQG-HCM & Stanford University',
    completion_percentage: 0,
    created_at: '2025-02-20T14:00:00Z',
  },
  {
    id: '4',
    code: 'ACT-2024-015',
    title: 'Hội thảo Ứng dụng Công nghệ Sinh học trong Nông nghiệp',
    description: 'Hội thảo về ứng dụng công nghệ sinh học vào sản xuất nông nghiệp bền vững',
    activity_type_id: '4', // Hội thảo
    activity_field_id: '1', // Công nghệ sinh học
    status: ActivityStatus.COMPLETED,
    lead_organization_id: '2', // HCMUS
    start_date: '2024-11-15',
    end_date: '2024-11-16',
    actual_start_date: '2024-11-15',
    actual_end_date: '2024-11-16',
    budget: 150000000,
    budget_source: 'ĐHQG-HCM',
    location: 'Hội trường A, ĐHQG-HCM',
    completion_percentage: 100,
    result_summary: 'Hội thảo thành công với 200 đại biểu tham dự, 15 báo cáo khoa học',
    created_at: '2024-09-01T09:00:00Z',
  },
  {
    id: '5',
    code: 'ACT-2025-004',
    title: 'Tập huấn Kỹ năng Nghiên cứu Khoa học cho Giảng viên trẻ',
    description: 'Chương trình tập huấn nâng cao kỹ năng nghiên cứu cho giảng viên trẻ',
    activity_type_id: '6', // Tập huấn
    activity_field_id: '4', // Khoa học xã hội
    status: ActivityStatus.IN_PROGRESS,
    lead_organization_id: '5', // UEL
    start_date: '2025-02-15',
    end_date: '2025-02-20',
    actual_start_date: '2025-02-15',
    actual_end_date: null,
    budget: 80000000,
    budget_source: 'ĐHQG-HCM',
    location: 'Trường ĐH Kinh tế - Luật',
    completion_percentage: 70,
    created_at: '2025-01-10T11:00:00Z',
  },
]

// Users (sample data based on roles)
export const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@vnuhcm.edu.vn',
    full_name: 'Nguyễn Văn Admin',
    role: 'ADMIN',
    organization_id: '1',
    organization: mockOrganizations[0],
  },
  {
    id: '2',
    username: 'operator1',
    email: 'operator@vnuhcm.edu.vn',
    full_name: 'Trần Thị Operator',
    role: 'OPERATOR',
    organization_id: '1',
    organization: mockOrganizations[0],
  },
  {
    id: '3',
    username: 'manager.hcmus',
    email: 'manager@hcmus.edu.vn',
    full_name: 'Lê Văn Manager',
    role: 'MANAGER',
    organization_id: '2',
    organization: mockOrganizations[1],
  },
  {
    id: '4',
    username: 'staff.uit',
    email: 'staff@uit.edu.vn',
    full_name: 'Phạm Thị Staff',
    role: 'STAFF',
    organization_id: '4',
    organization: mockOrganizations[3],
    manager_id: '3',
  },
  {
    id: '5',
    username: 'guest.user',
    email: 'guest@vnuhcm.edu.vn',
    full_name: 'Hoàng Văn Guest',
    role: 'GUEST',
    organization_id: '3',
    organization: mockOrganizations[2],
  },
]

// Helper function to get organization by ID
export const getOrganizationById = (id: string) => {
  return mockOrganizations.find(org => org.id === id)
}

// Helper function to get activity type by ID
export const getActivityTypeById = (id: string) => {
  return mockActivityTypes.find(type => type.id === id)
}

// Helper function to get activity field by ID
export const getActivityFieldById = (id: string) => {
  return mockActivityFields.find(field => field.id === id)
}

// Helper function to get KPI by ID
export const getKPIById = (id: string) => {
  return mockKPIs.find(kpi => kpi.id === id)
}

// Reports mock data
export const mockReports = [
  {
    id: '1',
    title: 'Báo cáo tổng hợp hoạt động Quý 1/2025',
    organization_id: '1',
    report_period: 'Q1-2025',
    total_activities: 45,
    completed_activities: 12,
    in_progress_activities: 28,
    pending_activities: 5,
    created_at: '2025-04-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Báo cáo KPI Năm 2024',
    organization_id: '1',
    report_period: '2024',
    total_kpis: 15,
    achieved_kpis: 10,
    in_progress_kpis: 4,
    not_achieved_kpis: 1,
    created_at: '2025-01-15T14:00:00Z',
  },
]
