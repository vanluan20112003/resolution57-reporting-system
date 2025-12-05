# Cấu Trúc Database - Hệ Thống NQ57

## Tổng Quan

Hệ thống NQ57 sử dụng MySQL với các bảng chính để quản lý hoạt động, người dùng, tổ chức và các KPI. Tất cả các bảng chính sử dụng UUID làm primary key.

---

## 1. Bảng Users (`nq57_users`)

Quản lý thông tin người dùng trong hệ thống.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID (PK) | ID người dùng |
| `email` | VARCHAR(255) | Email đăng nhập (unique) |
| `google_id` | VARCHAR(255) | Google OAuth User ID (nullable) |
| `password_hash` | VARCHAR(255) | Mật khẩu đã hash (nullable) |
| `first_name` | VARCHAR(100) | Tên |
| `last_name` | VARCHAR(100) | Họ và tên đệm |
| `phone` | VARCHAR(20) | Số điện thoại (nullable) |
| `avatar` | VARCHAR(255) | Avatar URL (deprecated) |
| `avatar_url` | VARCHAR(500) | Avatar URL từ Google hoặc upload |
| `is_vnuhcm` | BOOLEAN | Là thành viên ĐHQG-HCM |
| `employee_id` | VARCHAR(50) | Mã nhân viên (nullable) |
| `status` | VARCHAR(20) | Trạng thái: `active`, `inactive`, `suspended` |
| `role` | VARCHAR(20) | Vai trò: `ADMIN`, `OPERATOR`, `MANAGER`, `USER`, `VIEWER` |
| `organization_id` | UUID (FK) | ID đơn vị |
| `manager_id` | UUID (FK) | ID người quản lý |
| `last_login_at` | DATETIME | Lần đăng nhập cuối |
| `created_by` | UUID | Người tạo |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

**Indexes:** `status`, `employee_id`, `organization_id`, `manager_id`

---

## 2. Bảng Organizations (`organizations`)

Quản lý thông tin các đơn vị/tổ chức.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `code` | VARCHAR(50) | Mã đơn vị: HCMUT, UIT... (unique) |
| `name` | VARCHAR(255) | Tên đầy đủ |
| `short_name` | VARCHAR(100) | Tên viết tắt (nullable) |
| `type` | VARCHAR(50) | Loại: `UNIVERSITY`, `INSTITUTE`, `CENTER`, `OFFICE`, `EXTERNAL`, `OTHER` |
| `parent_id` | CHAR(36) (FK) | Đơn vị cha (nullable) |
| `is_vnuhcm` | BOOLEAN | Thuộc ĐHQG |
| `contact_email` | VARCHAR(255) | Email liên hệ (nullable) |
| `contact_phone` | VARCHAR(20) | SĐT liên hệ (nullable) |
| `address` | TEXT | Địa chỉ (nullable) |
| `website` | VARCHAR(500) | Website (nullable) |
| `avatar` | VARCHAR(500) | Logo/Avatar của tổ chức (nullable) |
| `cover_image` | VARCHAR(500) | Ảnh bìa của tổ chức (nullable) |
| `description` | TEXT | Mô tả (nullable) |
| `status` | VARCHAR(20) | Trạng thái: `active`, `inactive` |
| `display_order` | INTEGER | Thứ tự hiển thị |
| `created_by` | CHAR(36) | Người tạo |
| `created_at` | TIMESTAMP | Thời gian tạo |
| `updated_at` | TIMESTAMP | Thời gian cập nhật |

**Indexes:** `code`, `parent_id`, `type`, `(is_vnuhcm, status)`

**Foreign Keys:** `parent_id` → `organizations.id`

---

## 3. Bảng Activity Types (`activity_types`)

Danh mục loại hoạt động.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `name` | VARCHAR(100) | Tên loại hoạt động (unique) |
| `description` | TEXT | Mô tả chi tiết (nullable) |
| `display_order` | INTEGER | Thứ tự sắp xếp |
| `is_active` | BOOLEAN | Đang sử dụng |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

**Indexes:** `name`, `is_active`

---

## 4. Bảng Activity Fields (`activity_fields`)

Danh mục lĩnh vực hoạt động.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `name` | VARCHAR(255) | Tên lĩnh vực hoạt động (unique) |
| `description` | TEXT | Mô tả chi tiết (nullable) |
| `display_order` | INTEGER | Thứ tự sắp xếp |
| `is_active` | BOOLEAN | Đang sử dụng |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

**Indexes:** `name`, `is_active`

---

## 5. Bảng Activities (`activities`)

Bảng chính lưu trữ thông tin hoạt động.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `code` | VARCHAR(100) | Mã hoạt động (unique) |
| `title` | VARCHAR(500) | Tiêu đề hoạt động |
| `description` | TEXT | Mô tả chi tiết (nullable) |
| `activity_type_id` | CHAR(36) (FK) | Loại hoạt động |
| `activity_field_id` | CHAR(36) (FK) | Lĩnh vực hoạt động (nullable) |
| `status` | VARCHAR(50) | Trạng thái (xem bên dưới) |
| `lead_organization_id` | CHAR(36) (FK) | Đơn vị chủ trì |
| `start_date` | DATETIME | Ngày bắt đầu dự kiến (nullable) |
| `end_date` | DATETIME | Ngày kết thúc dự kiến (nullable) |
| `actual_start_date` | DATETIME | Ngày bắt đầu thực tế (nullable) |
| `actual_end_date` | DATETIME | Ngày kết thúc thực tế (nullable) |
| `budget` | DECIMAL(15,2) | Ngân sách VND (nullable) |
| `budget_source` | VARCHAR(255) | Nguồn ngân sách (nullable) |
| `location` | VARCHAR(500) | Địa điểm thực hiện (nullable) |
| `external_url` | VARCHAR(1000) | Link tài liệu bên ngoài (nullable) |
| `created_by` | CHAR(36) | Người tạo |
| `approved_by` | CHAR(36) | Người phê duyệt (nullable) |
| `approved_at` | DATETIME | Thời điểm phê duyệt (nullable) |
| `updated_by` | CHAR(36) | Người cập nhật cuối (nullable) |
| `is_locked` | BOOLEAN | Đã khóa chỉnh sửa |
| `locked_at` | DATETIME | Thời điểm khóa (nullable) |
| `locked_by` | CHAR(36) | Người khóa (nullable) |
| `completion_percentage` | INTEGER | Phần trăm hoàn thành (0-100) |
| `result_summary` | TEXT | Tóm tắt kết quả (nullable) |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

### Trạng thái hoạt động (Status)

| Giá trị DB | Giá trị hiển thị | Mô tả |
|------------|------------------|-------|
| `DRAFT` | Bản nháp | Hoạt động mới tạo, chưa gửi |
| `PENDING_APPROVAL` | Chờ duyệt | Đã gửi, đang chờ phê duyệt |
| `APPROVED` | Đã duyệt | Đã được phê duyệt |
| `POSTPONED` | Tạm hoãn | Hoạt động bị hoãn |
| `CANCELLED` | Đã hủy | Hoạt động bị hủy |

> **Lưu ý quan trọng:** `IN_PROGRESS` (Đang thực hiện) và `COMPLETED` (Hoàn thành) là **trạng thái được tính toán động** từ `APPROVED` dựa trên ngày hiện tại và `start_date`/`end_date`.

**Indexes:** `code`, `(status, activity_type_id)`, `lead_organization_id`, `(created_by, created_at)`, `(start_date, end_date)`, `activity_field_id`, `status`

**Foreign Keys:**
- `activity_type_id` → `activity_types.id` (RESTRICT)
- `activity_field_id` → `activity_fields.id` (SET NULL)
- `lead_organization_id` → `organizations.id` (RESTRICT)

---

## 6. Bảng KPIs (`kpis`)

Danh mục các chỉ tiêu KPI.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `source` | VARCHAR(50) | Nguồn KPI: `NQ57`, `internal`, etc. |
| `code` | VARCHAR(100) | Mã chỉ tiêu (nullable) |
| `title` | VARCHAR(500) | Tên chỉ tiêu |
| `description` | TEXT | Mô tả chi tiết (nullable) |
| `category` | VARCHAR(255) | Nhóm/phân loại KPI (nullable) |
| `order_number` | INTEGER | Số thứ tự (nullable) |
| `is_active` | BOOLEAN | Đang sử dụng |
| `created_by` | CHAR(36) | Người tạo (nullable) |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

**Indexes:** `source`, `code`, `is_active`, `category`

---

## 7. Bảng Activity KPIs (`activity_kpis`)

Liên kết hoạt động với KPI (N-N relationship).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `activity_id` | CHAR(36) (FK) | ID hoạt động |
| `kpi_id` | CHAR(36) (FK) | ID chỉ tiêu KPI |
| `contribution_description` | TEXT | Mô tả đóng góp của hoạt động vào KPI (nullable) |
| `target_value` | VARCHAR(255) | Giá trị mục tiêu (nullable) |
| `actual_value` | VARCHAR(255) | Giá trị thực tế (nullable) |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

**Indexes:** `(activity_id, kpi_id)`, `activity_id`, `kpi_id`

**Foreign Keys:**
- `activity_id` → `activities.id` (CASCADE)
- `kpi_id` → `kpis.id` (CASCADE)

---

## 8. Bảng Notifications (`notifications`)

Hệ thống thông báo.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | CHAR(36) (PK) | UUID |
| `user_id` | CHAR(36) | ID người nhận thông báo |
| `title` | VARCHAR(500) | Tiêu đề thông báo |
| `message` | TEXT | Nội dung chi tiết |
| `icon` | VARCHAR(50) | Icon: `CheckCircleOutlined`, `WarningOutlined`, etc. |
| `color` | VARCHAR(20) | Màu: `success`, `warning`, `error`, `info`, `primary` |
| `action_url` | VARCHAR(500) | URL điều hướng khi click (nullable) |
| `action_type` | VARCHAR(50) | Loại action: `navigate`, `modal`, `external_link` (nullable) |
| `data` | JSON | Dữ liệu bổ sung dạng JSON (nullable) |
| `notification_type` | VARCHAR(100) | Loại thông báo (xem bên dưới) |
| `category` | VARCHAR(50) | Nhóm: `activity`, `user`, `system`, `report` |
| `related_entity_type` | VARCHAR(100) | Loại entity: `Activity`, `User`, `Organization` (nullable) |
| `related_entity_id` | CHAR(36) | ID của entity liên quan (nullable) |
| `actor_id` | CHAR(36) | ID người thực hiện hành động (nullable = system) |
| `is_read` | BOOLEAN | Đã đọc chưa |
| `read_at` | DATETIME | Thời điểm đọc (nullable) |
| `seen_at` | TIMESTAMP | Thời điểm xem chi tiết (nullable) |
| `archived_at` | TIMESTAMP | Thời điểm archive (nullable) |
| `priority` | ENUM | Độ ưu tiên: `low`, `normal`, `high`, `urgent` |
| `expires_at` | TIMESTAMP | Thời điểm hết hạn (nullable) |
| `email_sent` | BOOLEAN | Đã gửi email chưa |
| `email_sent_at` | TIMESTAMP | Thời điểm gửi email (nullable) |
| `push_sent` | BOOLEAN | Đã gửi push notification chưa |
| `push_sent_at` | TIMESTAMP | Thời điểm gửi push (nullable) |
| `group_key` | VARCHAR(100) | Key để gom nhóm thông báo (nullable) |
| `group_count` | INTEGER | Số lượng trong nhóm |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | TIMESTAMP | Thời gian cập nhật |
| `deleted_at` | TIMESTAMP | Soft delete (nullable) |

### Các loại thông báo (notification_type)

| Loại | Mô tả |
|------|-------|
| `activity_created` | Hoạt động mới được tạo |
| `activity_submitted` | Hoạt động được gửi duyệt |
| `activity_approved` | Hoạt động được phê duyệt |
| `activity_approved_confirm` | Xác nhận phê duyệt cho người tạo |
| `activity_rejected_draft` | Hoạt động bị từ chối - chuyển về nháp |
| `activity_rejected_deleted` | Hoạt động bị từ chối - xóa |
| `activity_locked` | Hoạt động bị khóa |
| `activity_unlocked` | Hoạt động được mở khóa |
| `activity_completed_with_result` | Hoạt động hoàn thành với kết quả |
| `activity_withdrawn` | Hoạt động bị rút lại |
| `activity_invitation` | Lời mời tham gia hoạt động |
| `activity_postponed` | Hoạt động bị hoãn |
| `activity_cancelled` | Hoạt động bị hủy |
| `department_activity_approved` | Thông báo cho đơn vị về hoạt động được duyệt |

**Indexes:** `(user_id, is_read, created_at)`, `(notification_type, created_at)`, `category`, `created_at`, `(user_id, is_read)`, `(user_id, created_at)`

---

## 9. Bảng File Types (`file_types`)

Danh mục loại tệp tin.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BIGINT (PK) | ID tự tăng |
| `code` | VARCHAR(50) | Mã loại file (unique) |
| `name` | VARCHAR(100) | Tên loại file |
| `description` | TEXT | Mô tả (nullable) |
| `display_order` | INTEGER | Thứ tự hiển thị |
| `is_active` | BOOLEAN | Đang sử dụng |
| `created_at` | TIMESTAMP | Thời gian tạo |
| `updated_at` | TIMESTAMP | Thời gian cập nhật |

---

## 10. Bảng Activity Files (`activity_files`)

Quản lý tệp tin đính kèm của hoạt động.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID (PK) | UUID |
| `activity_id` | UUID (FK) | ID hoạt động |
| `file_type_id` | UUID (FK) | ID loại file (nullable) |
| `file_name` | VARCHAR(255) | Tên file |
| `file_path` | VARCHAR(500) | Đường dẫn file upload (nullable) |
| `file_url` | VARCHAR(1000) | URL file bên ngoài (nullable) |
| `source_type` | ENUM | Nguồn file: `upload`, `link` |
| `file_size` | BIGINT UNSIGNED | Kích thước file (nullable) |
| `file_extension` | VARCHAR(20) | Phần mở rộng file (nullable) |
| `mime_type` | VARCHAR(100) | MIME type (nullable) |
| `description` | TEXT | Mô tả file (nullable) |
| `uploaded_by` | UUID (FK) | Người upload (nullable) |
| `is_public` | BOOLEAN | File công khai |
| `uploaded_at` | TIMESTAMP | Thời gian upload |

**Indexes:** `activity_id`, `file_type_id`

**Foreign Keys:**
- `activity_id` → `activities.id` (CASCADE)
- `file_type_id` → `file_types.id` (SET NULL)
- `uploaded_by` → `users.id` (SET NULL)

---

## 11. Bảng Impersonation Sessions (`impersonation_sessions`)

Quản lý phiên giả lập người dùng (Admin impersonation).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BIGINT (PK) | ID tự tăng |
| `admin_id` | CHAR(36) (FK) | UUID của admin gốc |
| `impersonated_user_id` | CHAR(36) (FK) | UUID của user bị giả lập |
| `token_id` | BIGINT UNSIGNED (FK) | Reference đến personal_access_tokens.id |
| `started_at` | TIMESTAMP | Thời điểm bắt đầu |
| `ended_at` | TIMESTAMP | Thời điểm kết thúc (nullable) |
| `created_at` | TIMESTAMP | Thời gian tạo |
| `updated_at` | TIMESTAMP | Thời gian cập nhật |

**Indexes:** `admin_id`, `impersonated_user_id`, `token_id`

**Foreign Keys:**
- `admin_id` → `nq57_users.id` (CASCADE)
- `impersonated_user_id` → `nq57_users.id` (CASCADE)
- `token_id` → `personal_access_tokens.id` (CASCADE)

---

## Sơ đồ quan hệ (Entity Relationship)

```
┌─────────────────┐       ┌─────────────────┐
│   nq57_users    │       │  organizations  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ parent_id (FK)  │──┐
│ organization_id │───────►│ id (PK)         │  │
│ manager_id      │──┐    │                 │◄─┘
└─────────────────┘  │    └─────────────────┘
         ▲           │              │
         │           │              │
         └───────────┘              │
                                    │
┌─────────────────┐                 │
│   activities    │◄────────────────┘
├─────────────────┤     (lead_organization_id)
│ id (PK)         │
│ activity_type_id│───────►┌─────────────────┐
│ activity_field_id│──────►│ activity_types  │
│ created_by      │───────►├─────────────────┤
│ approved_by     │───────►│ id (PK)         │
└─────────────────┘        └─────────────────┘
         │                          │
         │                 ┌─────────────────┐
         │                 │ activity_fields │
         │                 ├─────────────────┤
         │                 │ id (PK)         │
         │                 └─────────────────┘
         │
         ▼
┌─────────────────┐        ┌─────────────────┐
│  activity_kpis  │───────►│      kpis       │
├─────────────────┤        ├─────────────────┤
│ activity_id (FK)│        │ id (PK)         │
│ kpi_id (FK)     │        └─────────────────┘
└─────────────────┘
         │
┌─────────────────┐        ┌─────────────────┐
│ activity_files  │───────►│   file_types    │
├─────────────────┤        ├─────────────────┤
│ activity_id (FK)│        │ id (PK)         │
│ file_type_id(FK)│        └─────────────────┘
│ uploaded_by(FK) │
└─────────────────┘

┌─────────────────┐
│  notifications  │
├─────────────────┤
│ user_id         │───────► nq57_users.id
│ actor_id        │───────► nq57_users.id
│ related_entity  │───────► (polymorphic)
└─────────────────┘
```

---

## Các bảng hệ thống khác

### Personal Access Tokens (`personal_access_tokens`)
Bảng Sanctum để quản lý API tokens.

### Password Reset Tokens (`password_reset_tokens`)
Bảng lưu token reset mật khẩu.

### OAuth Codes (`oauth_codes`)
Bảng lưu OAuth authorization codes.

---

## Ghi chú

1. **UUID vs Auto-increment:** Các bảng chính sử dụng UUID (char(36)) để đảm bảo tính unique khi scale.

2. **Soft Delete:** Bảng `notifications` hỗ trợ soft delete qua cột `deleted_at`.

3. **Computed Status:** Trạng thái `IN_PROGRESS` và `COMPLETED` được tính toán runtime, không lưu trong DB.

4. **Polymorphic Relationship:** Bảng `notifications` sử dụng polymorphic relationship qua `related_entity_type` và `related_entity_id`.

---

*Cập nhật lần cuối: 2025-12-05*
