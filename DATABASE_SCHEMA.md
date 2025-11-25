# DATABASE SCHEMA - HỆ THỐNG QUẢN LÝ HOẠT ĐỘNG NQ57

## Tổng quan hệ thống

Hệ thống quản lý và theo dõi các hoạt động triển khai Nghị quyết 57 tại ĐHQG TP.HCM, bao gồm:
- Quản lý người dùng và phân quyền
- Quản lý đơn vị/tổ chức
- Tạo và phê duyệt hoạt động
- Theo dõi KPI và báo cáo
- Quản lý người tham gia và minh chứng

**Tổng số bảng:** 14 bảng  
**Database Engine:** MySQL 8.0+  
**Character Set:** utf8mb4  
**Collation:** utf8mb4_unicode_ci

---

## PHASE 1: CORE SYSTEM (7 bảng)

### 1. users
**Nghiệp vụ:** Quản lý tài khoản người dùng trong hệ thống. Hỗ trợ cả đăng nhập SSO (email @vnuhcm.edu.vn) và đăng nhập thông thường bằng mật khẩu. Mỗi user có một vai trò cụ thể (GUEST, STAFF, MANAGER, OPERATOR, ADMIN) và thuộc về một đơn vị. STAFF cần có người quản lý trực tiếp (MANAGER).

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email đăng nhập |
| password_hash | VARCHAR(255) | NULL | NULL nếu đăng nhập SSO |
| first_name | VARCHAR(100) | NOT NULL | Tên |
| last_name | VARCHAR(100) | NOT NULL | Họ |
| phone | VARCHAR(20) | NULL | Số điện thoại |
| avatar_url | VARCHAR(500) | NULL | URL ảnh đại diện |
| is_vnuhcm | TINYINT(1) | DEFAULT 0 | Thuộc ĐHQG hay không |
| status | VARCHAR(20) | NOT NULL | active, inactive, locked |
| employee_id | VARCHAR(50) | NULL | Mã nhân viên |
| role | VARCHAR(20) | NOT NULL | GUEST, STAFF, MANAGER, OPERATOR, ADMIN |
| organization_id | CHAR(36) | NULL | FK, NULL cho OPERATOR/ADMIN |
| manager_id | CHAR(36) | NULL | FK, NULL trừ STAFF |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| last_login_at | DATETIME | NULL | |
| created_by | CHAR(36) | NULL | FK |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_email (email),
INDEX idx_employee_id (employee_id),
INDEX idx_status_role (status, role),
INDEX idx_organization_id (organization_id),
INDEX idx_manager_id (manager_id)
```

**Business Rules:**
- STAFF bắt buộc có manager_id
- GUEST/STAFF/MANAGER bắt buộc có organization_id
- OPERATOR/ADMIN có organization_id = NULL

---

### 2. organizations
**Nghiệp vụ:** Quản lý các đơn vị thuộc ĐHQG (trường, viện, trung tâm) và đơn vị bên ngoài. Hỗ trợ cấu trúc phân cấp (đơn vị con thuộc đơn vị cha). Mỗi hoạt động sẽ do một đơn vị chủ trì và có thể có các đơn vị phối hợp.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Mã đơn vị (HCMUT, UIT...) |
| name | VARCHAR(255) | NOT NULL | Tên đầy đủ |
| short_name | VARCHAR(100) | NULL | Tên viết tắt |
| type | VARCHAR(50) | NOT NULL | UNIVERSITY, INSTITUTE, CENTER, OFFICE, EXTERNAL, OTHER |
| parent_id | CHAR(36) | NULL | FK, NULL nếu cấp cao nhất |
| is_vnuhcm | TINYINT(1) | DEFAULT 1 | Thuộc ĐHQG |
| contact_email | VARCHAR(255) | NULL | |
| contact_phone | VARCHAR(20) | NULL | |
| address | TEXT | NULL | |
| website | VARCHAR(500) | NULL | |
| description | TEXT | NULL | |
| status | VARCHAR(20) | NOT NULL | active, inactive |
| display_order | INT | DEFAULT 0 | Thứ tự hiển thị |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| created_by | CHAR(36) | NULL | FK |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_code (code),
INDEX idx_parent_id (parent_id),
INDEX idx_type (type),
INDEX idx_vnuhcm_status (is_vnuhcm, status)
```

**Business Rules:**
- Đơn vị ngoài ĐHQG: is_vnuhcm = 0, type = EXTERNAL
- Cấu trúc cây: parent_id tạo quan hệ cha-con

---

### 3. activity_types
**Nghiệp vụ:** Phân loại các hoạt động theo bản chất (Chương trình, Đề án, Dự án, Hội thảo, Hợp tác, Tập huấn, Đào tạo, Sự kiện). Master data được quản lý bởi OPERATOR/ADMIN, ít thay đổi.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Tên loại hoạt động |
| description | TEXT | NULL | |
| display_order | INT | DEFAULT 0 | |
| is_active | TINYINT(1) | DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_name (name),
INDEX idx_is_active (is_active)
```

---

### 4. activity_fields
**Nghiệp vụ:** Lĩnh vực chuyên môn của hoạt động (Công nghệ bán dẫn, AI, Sinh học, Kinh tế...). Dùng để phân loại và thống kê hoạt động theo lĩnh vực. Master data với 20 lĩnh vực chuẩn từ ĐHQG.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Tên lĩnh vực |
| description | TEXT | NULL | |
| display_order | INT | DEFAULT 0 | |
| is_active | TINYINT(1) | DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_name (name),
INDEX idx_is_active (is_active)
```

---

### 5. kpis
**Nghiệp vụ:** Chỉ tiêu đánh giá thành tích (KPI) từ hai nguồn: Trung ương (Chính phủ) và ĐHQG. Mỗi hoạt động được map với một hoặc nhiều KPI để theo dõi đóng góp vào mục tiêu chung. Hiện tại dùng cấu trúc phẳng (flat) để đơn giản, có thể mở rộng thành cấu trúc cây sau này.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| source | VARCHAR(50) | NOT NULL | CENTRAL (Trung ương), VNU (ĐHQG) |
| code | VARCHAR(100) | NULL | Mã KPI (VD: TW-01, VNU-I-1) |
| title | VARCHAR(500) | NOT NULL | Tiêu đề KPI |
| description | TEXT | NULL | Mô tả chi tiết |
| category | VARCHAR(255) | NULL | Nhóm KPI (Đào tạo, Nghiên cứu...) |
| order_number | INT | NULL | Số thứ tự |
| is_active | TINYINT(1) | DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| created_by | CHAR(36) | NULL | FK |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_source (source),
INDEX idx_code (code),
INDEX idx_is_active (is_active),
INDEX idx_category (category)
```

---

### 6. file_types
**Nghiệp vụ:** Phân loại file đính kèm theo mục đích sử dụng (Minh chứng, Điểm danh, Báo cáo, Ảnh...). Dùng để quản lý và lọc file dễ dàng. Master data với 7 loại file chuẩn.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Mã loại file |
| name | VARCHAR(100) | NOT NULL | Tên loại |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_code (code)
```

**Note:** File extension validation được xử lý trong code

---

### 7. settings
**Nghiệp vụ:** Cấu hình hệ thống dạng key-value cho các thiết lập như tên hệ thống, timeout, kích thước file tối đa, email gửi đi... Cho phép thay đổi cấu hình mà không cần deploy lại code.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| `key` | VARCHAR(255) | UNIQUE, NOT NULL | Key cấu hình |
| value | TEXT | NULL | Giá trị |
| value_type | VARCHAR(50) | NOT NULL | string, number, boolean, json |
| category | VARCHAR(100) | NULL | Nhóm cấu hình |
| description | TEXT | NULL | |
| is_public | TINYINT(1) | DEFAULT 0 | Hiển thị public |
| updated_by | CHAR(36) | NULL | FK |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_key (`key`),
INDEX idx_category (category)
```

---

## PHASE 2: ACTIVITY MANAGEMENT (4 bảng)

### 8. activities
**Nghiệp vụ:** Bảng chính lưu thông tin hoạt động triển khai NQ57. Quy trình: STAFF tạo (DRAFT) → Submit phê duyệt (PENDING_APPROVAL) → MANAGER phê duyệt (IN_PROGRESS) → Thực hiện → Cập nhật minh chứng → Hoàn thành (COMPLETED). Hoạt động đã phê duyệt được khóa (is_locked=1) để tránh chỉnh sửa, chỉ MANAGER mới có thể mở khóa khi cần thiết.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| code | VARCHAR(100) | UNIQUE, NOT NULL | Mã hoạt động (ACT-YYYYMMDD-00001) |
| title | VARCHAR(500) | NOT NULL | Tên hoạt động |
| description | TEXT | NULL | Mô tả chi tiết |
| activity_type_id | CHAR(36) | NOT NULL | FK |
| activity_field_id | CHAR(36) | NULL | FK |
| status | VARCHAR(50) | NOT NULL | DRAFT, PENDING_APPROVAL, IN_PROGRESS, ON_HOLD, CANCELLED, COMPLETED |
| lead_organization_id | CHAR(36) | NOT NULL | FK |
| start_date | DATE | NULL | Ngày bắt đầu (kế hoạch) |
| end_date | DATE | NULL | Ngày kết thúc (kế hoạch) |
| actual_start_date | DATE | NULL | Ngày bắt đầu (thực tế) |
| actual_end_date | DATE | NULL | Ngày kết thúc (thực tế) |
| budget | DECIMAL(15,2) | NULL | Kinh phí (VND) |
| budget_source | VARCHAR(255) | NULL | Nguồn kinh phí |
| location | VARCHAR(500) | NULL | Địa điểm |
| external_url | VARCHAR(1000) | NULL | Link PMS/hệ thống ngoài |
| created_by | CHAR(36) | NOT NULL | FK - Người tạo (STAFF) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| approved_by | CHAR(36) | NULL | FK - Người phê duyệt (MANAGER) |
| approved_at | DATETIME | NULL | |
| updated_by | CHAR(36) | NULL | FK |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| is_locked | TINYINT(1) | DEFAULT 0 | Khóa chỉnh sửa |
| locked_at | DATETIME | NULL | |
| locked_by | CHAR(36) | NULL | FK |
| completion_percentage | INT | DEFAULT 0 | % hoàn thành (0-100) |
| result_summary | TEXT | NULL | Tóm tắt kết quả |

**Indexes:**
```sql
PRIMARY KEY (id),
UNIQUE INDEX idx_code (code),
INDEX idx_status_type (status, activity_type_id),
INDEX idx_lead_org (lead_organization_id),
INDEX idx_creator (created_by, created_at),
INDEX idx_dates (start_date, end_date),
INDEX idx_field (activity_field_id),
INDEX idx_status (status)
```

**Business Rules:**
- Status = DRAFT hoặc PENDING_APPROVAL: có thể sửa/xóa
- Status = IN_PROGRESS trở đi: is_locked = 1, không sửa được
- MANAGER có thể unlock để sửa nếu cần

---

### 9. activity_kpis
**Nghiệp vụ:** Liên kết hoạt động với các KPI mà nó đóng góp. Một hoạt động có thể đóng góp vào nhiều KPI, và một KPI có thể được nhiều hoạt động đóng góp. Lưu cả chỉ tiêu mục tiêu và kết quả thực tế để so sánh hiệu quả.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| activity_id | CHAR(36) | NOT NULL | FK |
| kpi_id | CHAR(36) | NOT NULL | FK |
| contribution_description | TEXT | NULL | Mô tả cách đóng góp |
| target_value | VARCHAR(255) | NULL | Chỉ tiêu (VD: "150 sinh viên") |
| actual_value | VARCHAR(255) | NULL | Kết quả (VD: "120 sinh viên") |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_activity (activity_id),
INDEX idx_kpi (kpi_id),
UNIQUE INDEX idx_activity_kpi (activity_id, kpi_id)
```

---

### 10. activity_organizations
**Nghiệp vụ:** Quản lý các đơn vị tham gia hoạt động ngoài đơn vị chủ trì. Một hoạt động có thể có đồng chủ trì (CO_LEAD) và các đơn vị đối tác (PARTNER). Dùng để theo dõi sự phối hợp liên đơn vị.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| activity_id | CHAR(36) | NOT NULL | FK |
| organization_id | CHAR(36) | NOT NULL | FK |
| role | VARCHAR(20) | NOT NULL | LEAD, CO_LEAD, PARTNER |
| description | TEXT | NULL | Mô tả vai trò cụ thể |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_activity (activity_id),
INDEX idx_organization (organization_id),
UNIQUE INDEX idx_activity_org (activity_id, organization_id)
```

---

### 11. activity_files
**Nghiệp vụ:** Quản lý file đính kèm của hoạt động (minh chứng, điểm danh, báo cáo, ảnh...). File thực tế được lưu trên storage (S3/MinIO), database chỉ lưu metadata. Hỗ trợ phân quyền xem file (public/private).

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| activity_id | CHAR(36) | NOT NULL | FK |
| file_type_id | CHAR(36) | NOT NULL | FK |
| file_name | VARCHAR(500) | NOT NULL | Tên file gốc |
| file_path | VARCHAR(1000) | NOT NULL | Đường dẫn storage |
| file_size | BIGINT | NOT NULL | Kích thước (bytes) |
| file_extension | VARCHAR(20) | NOT NULL | Phần mở rộng (.pdf, .xlsx...) |
| mime_type | VARCHAR(100) | NOT NULL | MIME type |
| description | TEXT | NULL | Mô tả file |
| uploaded_by | CHAR(36) | NOT NULL | FK |
| uploaded_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| is_public | TINYINT(1) | DEFAULT 0 | Public hay cần phân quyền |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_activity_type (activity_id, file_type_id),
INDEX idx_uploader (uploaded_by, uploaded_at)
```

---

## PHASE 3: COLLABORATION (1 bảng)

### 12. activity_participants
**Nghiệp vụ:** Quản lý người tham gia hoạt động. Hỗ trợ cả người trong hệ thống (user_id) và người ngoài (external_*). Quy trình: Mời (PENDING) → Người được mời phản hồi (ACCEPTED/DECLINED) → Điểm danh (attended). Phân vai trò: Điều phối viên (COORDINATOR), Thành viên (MEMBER), Diễn giả (SPEAKER), Người tham dự (ATTENDEE).

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| activity_id | CHAR(36) | NOT NULL | FK |
| user_id | CHAR(36) | NULL | FK - NULL nếu người ngoài |
| external_name | VARCHAR(255) | NULL | Tên người ngoài |
| external_email | VARCHAR(255) | NULL | Email người ngoài |
| external_phone | VARCHAR(50) | NULL | SĐT người ngoài |
| external_organization | VARCHAR(255) | NULL | Đơn vị người ngoài |
| role | VARCHAR(20) | NOT NULL | COORDINATOR, MEMBER, SPEAKER, ATTENDEE |
| invited_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày gửi lời mời |
| invitation_status | VARCHAR(20) | NOT NULL | PENDING, ACCEPTED, DECLINED |
| responded_at | DATETIME | NULL | Ngày phản hồi |
| attended | TINYINT(1) | NULL | Có tham dự thực tế không |
| attendance_time | DATETIME | NULL | Thời gian điểm danh |
| notes | TEXT | NULL | Ghi chú |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_activity_user (activity_id, user_id),
INDEX idx_activity_status (activity_id, invitation_status),
INDEX idx_external_email (external_email)
```

**Business Rules:**
- Người trong hệ thống: user_id NOT NULL, external_* = NULL
- Người ngoài: user_id = NULL, external_name NOT NULL

---

## PHASE 4: REPORTING & NOTIFICATION (2 bảng)

### 13. notifications
**Nghiệp vụ:** Thông báo trong app cho người dùng về các sự kiện quan trọng: hoạt động mới, yêu cầu phê duyệt, lời mời tham gia, thay đổi trạng thái... Hỗ trợ đánh dấu đã đọc và link đến entity liên quan.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| user_id | CHAR(36) | NOT NULL | FK - Người nhận |
| title | VARCHAR(500) | NOT NULL | Tiêu đề |
| message | TEXT | NOT NULL | Nội dung |
| notification_type | VARCHAR(100) | NOT NULL | ACTIVITY_CREATED, APPROVAL_REQUEST... |
| related_entity_type | VARCHAR(100) | NULL | activity, user, kpi... |
| related_entity_id | CHAR(36) | NULL | ID của entity liên quan |
| is_read | TINYINT(1) | DEFAULT 0 | |
| read_at | DATETIME | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_user_read (user_id, is_read, created_at),
INDEX idx_type (notification_type, created_at)
```

---

### 14. reports
**Nghiệp vụ:** Lưu lịch sử các báo cáo đã tạo (thống kê hoạt động, tiến độ KPI, báo cáo đơn vị...). File báo cáo được export ra Excel/PDF và lưu trên storage, database chỉ lưu metadata và link download.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|-------------|-----------|-------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| title | VARCHAR(500) | NOT NULL | Tiêu đề báo cáo |
| report_type | VARCHAR(100) | NOT NULL | ACTIVITY_SUMMARY, KPI_PROGRESS... |
| organization_id | CHAR(36) | NULL | FK - NULL = báo cáo toàn ĐHQG |
| start_date | DATE | NULL | Từ ngày |
| end_date | DATE | NULL | Đến ngày |
| filters | JSON | NULL | Bộ lọc áp dụng |
| file_path | VARCHAR(1000) | NULL | Đường dẫn file báo cáo |
| generated_by | CHAR(36) | NOT NULL | FK |
| generated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| status | VARCHAR(20) | NOT NULL | PENDING, COMPLETED, FAILED |

**Indexes:**
```sql
PRIMARY KEY (id),
INDEX idx_org (organization_id, generated_at),
INDEX idx_generator (generated_by, generated_at),
INDEX idx_status (status, generated_at)
```

---

## SƠ ĐỒ QUAN HỆ

```
users
  ├─ role (GUEST, STAFF, MANAGER, OPERATOR, ADMIN)
  ├─ organization_id → organizations
  └─ manager_id → users

organizations
  ├─ type (UNIVERSITY, INSTITUTE, CENTER...)
  └─ parent_id → organizations

activities
  ├─ activity_type_id → activity_types
  ├─ activity_field_id → activity_fields
  ├─ status (DRAFT, PENDING_APPROVAL, IN_PROGRESS...)
  ├─ lead_organization_id → organizations
  ├─ created_by → users
  └─ approved_by → users

activity_kpis
  ├─ activity_id → activities
  └─ kpi_id → kpis

activity_participants
  ├─ activity_id → activities
  └─ user_id → users

activity_files
  ├─ activity_id → activities
  ├─ file_type_id → file_types
  └─ uploaded_by → users

notifications
  └─ user_id → users

reports
  ├─ organization_id → organizations
  └─ generated_by → users
```

---

## ENUMS ĐƯỢC HARDCODE TRONG CODE

### User Roles
```typescript
enum UserRole {
  GUEST = 'GUEST',       // Xem hoạt động
  STAFF = 'STAFF',       // Tạo hoạt động
  MANAGER = 'MANAGER',   // Phê duyệt
  OPERATOR = 'OPERATOR', // Điều hành hệ thống
  ADMIN = 'ADMIN'        // Toàn quyền
}

// Hierarchy: GUEST < STAFF < MANAGER < ADMIN
//            GUEST < OPERATOR < ADMIN
```

### Activity Status
```typescript
enum ActivityStatus {
  DRAFT = 'DRAFT',                      // Mở mới
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Chờ phê duyệt
  IN_PROGRESS = 'IN_PROGRESS',          // Đang thực hiện
  ON_HOLD = 'ON_HOLD',                  // Tạm hoãn
  CANCELLED = 'CANCELLED',              // Đã hủy
  COMPLETED = 'COMPLETED'               // Hoàn thành
}
```

---

## LOGGING STRATEGY

**File-based logging** thay vì lưu trong database để giảm tải và tăng performance.

### Cấu trúc thư mục:
```
/logs
  ├── /system
  │   ├── YYYY-MM-DD-info.log
  │   ├── YYYY-MM-DD-error.log
  │   └── YYYY-MM-DD-combined.log
  │
  ├── /activities
  │   └── YYYY-MM-DD-activity-audit.log
  │
  └── /access
      └── YYYY-MM-DD-access.log
```

### Rotation:
- Daily rotation
- Keep 90 days
- Compress after 7 days

---

## INDEXES STRATEGY

### Foreign Keys
```sql
-- Ví dụ với bảng activities
ALTER TABLE activities
  ADD CONSTRAINT fk_activities_type 
    FOREIGN KEY (activity_type_id) REFERENCES activity_types(id),
  ADD CONSTRAINT fk_activities_field 
    FOREIGN KEY (activity_field_id) REFERENCES activity_fields(id),
  ADD CONSTRAINT fk_activities_lead_org 
    FOREIGN KEY (lead_organization_id) REFERENCES organizations(id),
  ADD CONSTRAINT fk_activities_creator 
    FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_activities_approver 
    FOREIGN KEY (approved_by) REFERENCES users(id);
```

---

## PERFORMANCE EXPECTATIONS

### Database Size (1 năm vận hành)

| Bảng | Số bản ghi | Kích thước |
|------|-----------|-----------|
| users | 2,000 | ~3 MB |
| organizations | 50 | 100 KB |
| activities | 5,000 | ~50 MB |
| activity_participants | 50,000 | ~30 MB |
| activity_files | 10,000 | ~10 MB |
| notifications | 50,000 | ~30 MB |
| **TỔNG** | **117,000+** | **~123 MB** |

**File storage:** ~500 GB (files thực tế)  
**Logs:** ~500 MB/year

---

## SECURITY

### Data Encryption
- Passwords: bcrypt/argon2
- Sensitive data: AES-256
- Files: Encrypted at rest
- Connections: SSL/TLS only

### Application-Level Security
- STAFF chỉ thấy hoạt động của mình hoặc đơn vị
- MANAGER thấy hoạt động của đơn vị
- OPERATOR/ADMIN thấy tất cả
- Implement trong middleware/service layer

---

**Document Version:** 2.0  
**Database Engine:** MySQL 8.0+  
**Total Tables:** 14  
**Last Updated:** 2024-11-20
