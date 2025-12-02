# Hệ Thống Thông Báo - Quản Lý Hoạt Động Phòng Ban

## 1. Tổng Quan Luồng Hoạt Động

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACTIVITY WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────────────┐     ┌─────────────┐                │
│   │  DRAFT   │────▶│ PENDING_APPROVAL │────▶│ IN_PROGRESS │                │
│   │  (Nháp)  │     │ (Chờ phê duyệt)  │     │ (Đang thực  │                │
│   └──────────┘     └──────────────────┘     │    hiện)    │                │
│        │                   │                └─────────────┘                │
│        │                   │                      │                        │
│        │                   ▼                      ▼                        │
│        │           ┌──────────────┐        ┌───────────┐                   │
│        │           │ RETURN_DRAFT │        │ COMPLETED │                   │
│        │           │ (Trả về nháp)│        │(Hoàn thành)│                   │
│        │           └──────────────┘        └───────────┘                   │
│        │                   │                      │                        │
│        ▼                   ▼                      ▼                        │
│   ┌──────────┐      ┌──────────┐          ┌───────────┐                   │
│   │  DELETE  │      │  DELETE  │          │  ON_HOLD  │                   │
│   │  (Xóa)   │      │  (Xóa)   │          │ (Tạm hoãn)│                   │
│   └──────────┘      └──────────┘          └───────────┘                   │
│                                                  │                        │
│                                                  ▼                        │
│                                           ┌───────────┐                   │
│                                           │ CANCELLED │                   │
│                                           │ (Đã hủy)  │                   │
│                                           └───────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Vai Trò Người Dùng (Roles)

| Role | Mô tả | Quyền hạn |
|------|-------|-----------|
| **GUEST** | Khách | Chỉ xem hoạt động công khai |
| **STAFF** | Nhân viên | Tạo, sửa, xóa hoạt động **của mình**; Gửi yêu cầu phê duyệt |
| **MANAGER** | Quản lý phòng ban | Phê duyệt/Từ chối hoạt động **của phòng mình**; Khóa hoạt động |
| **OPERATOR** | Vận hành hệ thống | Phê duyệt/Từ chối **tất cả** hoạt động; Mở khóa hoạt động |
| **ADMIN** | Quản trị viên | Toàn quyền hệ thống |

---

## 3. Các Trường Hợp Gửi Thông Báo

### 3.1. Khi STAFF Tạo Hoạt Động Mới

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Tạo hoạt động thành công | STAFF (người tạo) | `activity_created` | "Bạn đã tạo hoạt động {code} thành công" | normal |

**Lưu ý:** Không gửi thông báo cho MANAGER vì hoạt động còn ở trạng thái DRAFT.

---

### 3.2. Khi STAFF Gửi Yêu Cầu Phê Duyệt

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Gửi yêu cầu phê duyệt | STAFF (người tạo) | `activity_submitted` | "Bạn đã gửi hoạt động {code} để phê duyệt" | normal |
| 2 | Có hoạt động chờ duyệt | MANAGER (cùng phòng ban) | `activity_pending_approval` | "{staff_name} đã gửi hoạt động {code} chờ phê duyệt" | high |
| 3 | Có hoạt động chờ duyệt | OPERATOR, ADMIN | `activity_pending_approval` | "Có hoạt động mới {code} từ {organization} chờ phê duyệt" | normal |

```
DRAFT ──[Gửi phê duyệt]──▶ PENDING_APPROVAL
         │
         ├─▶ Thông báo cho STAFF (người gửi)
         ├─▶ Thông báo cho MANAGER (phòng ban)
         └─▶ Thông báo cho OPERATOR/ADMIN
```

---

### 3.3. Khi MANAGER Phê Duyệt Hoạt Động

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Hoạt động được phê duyệt | STAFF (người tạo) | `activity_approved` | "Hoạt động {code} đã được {manager_name} phê duyệt" | high |
| 2 | Hoạt động đã khóa | STAFF (người tạo) | `activity_locked` | "Hoạt động {code} đã được khóa sau khi phê duyệt" | normal |
| 3 | Xác nhận phê duyệt | MANAGER (người duyệt) | `activity_approved_confirm` | "Bạn đã phê duyệt hoạt động {code}" | low |
| 4 | Hoạt động mới của phòng ban | GUEST, STAFF (cùng phòng) | `department_activity_approved` | "Phòng ban có hoạt động mới: {title}" | normal |

```
PENDING_APPROVAL ──[Phê duyệt]──▶ IN_PROGRESS (Auto-locked)
                    │
                    ├─▶ Thông báo cho STAFF (người tạo)
                    ├─▶ Thông báo cho MANAGER (người duyệt)
                    └─▶ Thông báo cho GUEST/STAFF khác trong phòng ban
```

> **Lưu ý về thông báo cho GUEST:**
> - GUEST là thành viên phòng ban, cần biết các hoạt động đang diễn ra
> - Chỉ thông báo hoạt động **đã được duyệt** (IN_PROGRESS), không thông báo DRAFT/PENDING
> - Người dùng có thể tắt thông báo này trong `notification_preferences`

---

### 3.4. Khi MANAGER Từ Chối Hoạt Động

#### 3.4.1. Trả về Nháp (Return to Draft)

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Hoạt động bị trả về | STAFF (người tạo) | `activity_rejected_draft` | "Hoạt động {code} bị từ chối và trả về nháp. Lý do: {reason}" | high |
| 2 | Xác nhận từ chối | MANAGER (người từ chối) | `activity_rejected_confirm` | "Bạn đã từ chối hoạt động {code}" | low |

```
PENDING_APPROVAL ──[Từ chối - Trả về nháp]──▶ DRAFT
                    │
                    ├─▶ Thông báo cho STAFF (cần chỉnh sửa)
                    └─▶ Thông báo cho MANAGER (xác nhận)
```

#### 3.4.2. Từ Chối và Xóa (Reject & Delete)

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Hoạt động bị xóa | STAFF (người tạo) | `activity_rejected_deleted` | "Hoạt động {code} bị từ chối và xóa. Lý do: {reason}" | high |
| 2 | Xác nhận xóa | MANAGER (người từ chối) | `activity_deleted_confirm` | "Bạn đã từ chối và xóa hoạt động {code}" | low |

```
PENDING_APPROVAL ──[Từ chối - Xóa]──▶ DELETED
                    │
                    ├─▶ Thông báo cho STAFF (hoạt động bị xóa)
                    └─▶ Thông báo cho MANAGER (xác nhận)
```

---

### 3.5. Khi STAFF Chỉnh Sửa Hoạt Động

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Chỉnh sửa hoạt động DRAFT | Không gửi | - | - | - |
| 2 | Chỉnh sửa hoạt động PENDING | MANAGER (cùng phòng) | `activity_updated` | "{staff_name} đã cập nhật hoạt động {code} đang chờ duyệt" | normal |

---

### 3.6. Khi STAFF Xóa Hoạt Động

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Xóa hoạt động DRAFT | Không gửi | - | - | - |
| 2 | Xóa hoạt động PENDING | MANAGER (cùng phòng) | `activity_withdrawn` | "{staff_name} đã rút lại hoạt động {code}" | normal |

---

### 3.7. Khi Khóa/Mở Khóa Hoạt Động

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên |
|---|---------|------------|----------------|----------|---------|
| 1 | Khóa hoạt động | STAFF (người tạo) | `activity_locked` | "Hoạt động {code} đã bị khóa bởi {manager_name}" | normal |
| 2 | Mở khóa hoạt động | STAFF (người tạo) | `activity_unlocked` | "Hoạt động {code} đã được mở khóa bởi {admin_name}" | normal |
| 3 | Mở khóa hoạt động | MANAGER (cùng phòng) | `activity_unlocked` | "Hoạt động {code} đã được mở khóa" | normal |

---

### 3.8. Nhắc Nhở Tự Động (Scheduled Notifications)

| # | Sự kiện | Người nhận | Loại thông báo | Nội dung | Ưu tiên | Thời điểm |
|---|---------|------------|----------------|----------|---------|-----------|
| 1 | Hoạt động sắp đến hạn | STAFF (người tạo) | `activity_deadline_reminder` | "Hoạt động {code} sẽ kết thúc trong {days} ngày" | high | 7 ngày, 3 ngày, 1 ngày trước |
| 2 | Hoạt động quá hạn | STAFF + MANAGER | `activity_overdue` | "Hoạt động {code} đã quá hạn {days} ngày" | urgent | Hàng ngày |
| 3 | Hoạt động chờ duyệt lâu | MANAGER | `approval_pending_reminder` | "Có {count} hoạt động chờ duyệt hơn {days} ngày" | high | 3 ngày, 7 ngày |
| 4 | DRAFT không gửi duyệt | STAFF | `draft_reminder` | "Bạn có {count} hoạt động nháp chưa gửi duyệt" | normal | 7 ngày |

---

## 4. Bảng Tổng Hợp Notification Types

| Type | Category | Icon | Color | Mô tả |
|------|----------|------|-------|-------|
| `activity_created` | activity | `PlusCircleOutlined` | primary | Tạo hoạt động mới |
| `activity_submitted` | activity | `SendOutlined` | processing | Gửi yêu cầu phê duyệt |
| `activity_pending_approval` | activity | `ClockCircleOutlined` | warning | Có hoạt động chờ duyệt |
| `activity_approved` | activity | `CheckCircleOutlined` | success | Hoạt động được phê duyệt |
| `department_activity_approved` | activity | `TeamOutlined` | success | Phòng ban có hoạt động mới được duyệt |
| `activity_rejected_draft` | activity | `CloseCircleOutlined` | error | Bị từ chối, trả về nháp |
| `activity_rejected_deleted` | activity | `DeleteOutlined` | error | Bị từ chối và xóa |
| `activity_updated` | activity | `EditOutlined` | primary | Hoạt động được cập nhật |
| `activity_withdrawn` | activity | `RollbackOutlined` | warning | Rút lại hoạt động |
| `activity_locked` | activity | `LockOutlined` | warning | Hoạt động bị khóa |
| `activity_unlocked` | activity | `UnlockOutlined` | success | Hoạt động được mở khóa |
| `activity_deadline_reminder` | reminder | `BellOutlined` | warning | Nhắc nhở sắp đến hạn |
| `activity_overdue` | reminder | `ExclamationCircleOutlined` | error | Hoạt động quá hạn |
| `approval_pending_reminder` | reminder | `AlertOutlined` | warning | Nhắc duyệt hoạt động |
| `draft_reminder` | reminder | `FileTextOutlined` | primary | Nhắc gửi hoạt động nháp |

---

## 5. Ma Trận Quyền Nhận Thông Báo

| Notification Type | GUEST | STAFF | MANAGER | OPERATOR | ADMIN |
|-------------------|-------|-------|---------|----------|-------|
| activity_created | - | ✓ (tự mình) | - | - | - |
| activity_submitted | - | ✓ (tự mình) | - | - | - |
| activity_pending_approval | - | - | ✓ (phòng mình) | ✓ | ✓ |
| activity_approved | - | ✓ (tự mình) | ✓ (xác nhận) | - | - |
| **department_activity_approved** | **✓ (phòng mình)** | **✓ (phòng mình)** | - | - | - |
| activity_rejected_draft | - | ✓ (tự mình) | ✓ (xác nhận) | - | - |
| activity_rejected_deleted | - | ✓ (tự mình) | ✓ (xác nhận) | - | - |
| activity_updated | - | - | ✓ (phòng mình) | - | - |
| activity_withdrawn | - | - | ✓ (phòng mình) | - | - |
| activity_locked | - | ✓ (tự mình) | - | - | - |
| activity_unlocked | - | ✓ (tự mình) | ✓ (phòng mình) | - | - |
| activity_deadline_reminder | - | ✓ (tự mình) | - | - | - |
| activity_overdue | - | ✓ (tự mình) | ✓ (phòng mình) | ✓ | ✓ |
| approval_pending_reminder | - | - | ✓ (phòng mình) | ✓ | ✓ |
| draft_reminder | - | ✓ (tự mình) | - | - | - |

> **Ghi chú:**
> - `department_activity_approved`: Gửi cho tất cả GUEST và STAFF trong cùng phòng ban (trừ người tạo hoạt động - đã nhận `activity_approved`)
> - Người dùng có thể tắt nhận thông báo này trong cài đặt `notification_preferences`

---

## 6. Cấu Trúc Data JSON Cho Từng Loại Thông Báo

### 6.1. activity_submitted / activity_pending_approval
```json
{
  "activity_id": "uuid",
  "activity_code": "HĐ-2024-001",
  "activity_title": "Hội thảo khoa học",
  "organization_id": "uuid",
  "organization_name": "Phòng KHCN",
  "submitter_id": "uuid",
  "submitter_name": "Nguyễn Văn A"
}
```

### 6.2. activity_approved
```json
{
  "activity_id": "uuid",
  "activity_code": "HĐ-2024-001",
  "activity_title": "Hội thảo khoa học",
  "approver_id": "uuid",
  "approver_name": "Trần Văn B",
  "approved_at": "2024-12-02T10:30:00Z",
  "is_auto_locked": true
}
```

### 6.2.1. department_activity_approved (Thông báo cho GUEST/STAFF cùng phòng ban)
```json
{
  "activity_id": "uuid",
  "activity_code": "HĐ-2024-001",
  "activity_title": "Hội thảo khoa học",
  "activity_type": "Hội thảo",
  "organization_id": "uuid",
  "organization_name": "Phòng KHCN",
  "creator_id": "uuid",
  "creator_name": "Nguyễn Văn A",
  "start_date": "2024-12-15",
  "end_date": "2024-12-16"
}
```

### 6.3. activity_rejected_draft / activity_rejected_deleted
```json
{
  "activity_id": "uuid",
  "activity_code": "HĐ-2024-001",
  "activity_title": "Hội thảo khoa học",
  "rejector_id": "uuid",
  "rejector_name": "Trần Văn B",
  "rejected_at": "2024-12-02T10:30:00Z",
  "reason": "Thiếu thông tin về nguồn kinh phí",
  "action": "return_to_draft" | "delete"
}
```

### 6.4. activity_deadline_reminder / activity_overdue
```json
{
  "activity_id": "uuid",
  "activity_code": "HĐ-2024-001",
  "activity_title": "Hội thảo khoa học",
  "end_date": "2024-12-10",
  "days_remaining": 3,  // hoặc days_overdue: -2
  "completion_percentage": 60
}
```

---

## 7. Action URL Patterns

| Notification Type | Action URL | Action Type |
|-------------------|------------|-------------|
| activity_* | `/dashboard?tab=activity-management&id={activity_id}` | navigate |
| activity_pending_approval | `/dashboard?tab=pending-approval&id={activity_id}` | navigate |
| approval_pending_reminder | `/dashboard?tab=pending-approval` | navigate |
| draft_reminder | `/dashboard?tab=activity-management&status=DRAFT` | navigate |

---

## 8. Kênh Gửi Thông Báo

| Notification Type | In-App | Email | Push |
|-------------------|--------|-------|------|
| activity_created | ✓ | - | - |
| activity_submitted | ✓ | - | - |
| activity_pending_approval | ✓ | ✓ | ✓ |
| activity_approved | ✓ | ✓ | ✓ |
| **department_activity_approved** | **✓** | **-** | **-** |
| activity_rejected_* | ✓ | ✓ | ✓ |
| activity_updated | ✓ | - | - |
| activity_locked/unlocked | ✓ | - | - |
| activity_deadline_reminder | ✓ | ✓ | ✓ |
| activity_overdue | ✓ | ✓ | ✓ |
| approval_pending_reminder | ✓ | ✓ | - |
| draft_reminder | ✓ | - | - |

> **Ghi chú:** `department_activity_approved` chỉ gửi In-App để tránh spam email cho GUEST/STAFF. Người dùng có thể bật email trong cài đặt nếu muốn.

---

## 9. Diagram Luồng Chi Tiết

### 9.1. Luồng Tạo và Gửi Phê Duyệt

```
┌──────────┐                                    ┌──────────┐
│  STAFF   │                                    │ MANAGER  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ 1. Tạo hoạt động                              │
     ├──────────────────┐                            │
     │                  ▼                            │
     │         ┌───────────────┐                     │
     │         │ Activity:DRAFT│                     │
     │         └───────────────┘                     │
     │                  │                            │
     │ 2. Gửi phê duyệt │                            │
     ├──────────────────┘                            │
     │                                               │
     │         ┌────────────────────┐                │
     │         │Activity:PENDING    │                │
     │         └────────────────────┘                │
     │                  │                            │
     │                  │ 3. Thông báo ──────────────▶
     │                  │    pending_approval        │
     │                  │                            │
     │                  │◀──────────────────────────┤
     │                  │ 4. Xem xét (Step 1)       │
     │                  │                            │
     │                  │◀──────────────────────────┤
     │                  │ 5. Phê duyệt (Step 2)     │
     │                  │                            │
     │         ┌────────────────────┐                │
     │         │Activity:IN_PROGRESS│                │
     │         │   (Auto-locked)    │                │
     │         └────────────────────┘                │
     │                  │                            │
     │◀─────────────────┤ 6. Thông báo              │
     │  activity_approved│    approved               │
     │                  │                            │
     ▼                  ▼                            ▼
```

### 9.2. Luồng Từ Chối

```
┌──────────┐                                    ┌──────────┐
│  STAFF   │                                    │ MANAGER  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │         ┌────────────────────┐                │
     │         │Activity:PENDING    │◀───────────────┤
     │         └────────────────────┘                │
     │                  │                            │
     │                  │ Xem xét (Step 1)           │
     │                  │                            │
     │                  │ Từ chối (Step 2)           │
     │                  │                            │
     │                  ├────────┬───────────────────┤
     │                  │        │                   │
     │                  ▼        ▼                   │
     │    ┌─────────────┐  ┌──────────┐              │
     │    │Return Draft │  │  Delete  │              │
     │    └─────────────┘  └──────────┘              │
     │           │              │                    │
     │           ▼              ▼                    │
     │    ┌───────────┐   ┌──────────┐               │
     │    │  DRAFT    │   │ DELETED  │               │
     │    │(cần sửa)  │   │          │               │
     │    └───────────┘   └──────────┘               │
     │           │              │                    │
     │◀──────────┴──────────────┘                    │
     │  Thông báo rejected                           │
     │  (có lý do)                                   │
     ▼                                               ▼
```

---

## 10. Implementation Checklist

### Backend (Laravel)

- [ ] Tạo Model `Notification`
- [ ] Tạo Model `NotificationPreference`
- [ ] Tạo Model `NotificationTemplate`
- [ ] Tạo Service `NotificationService`
- [ ] Tạo Event `ActivitySubmitted`
- [ ] Tạo Event `ActivityApproved`
- [ ] Tạo Event `ActivityRejected`
- [ ] Tạo Listener cho các Events
- [ ] Tạo API endpoints:
  - [ ] GET `/notifications` - Lấy danh sách thông báo
  - [ ] GET `/notifications/unread-count` - Đếm chưa đọc
  - [ ] PUT `/notifications/{id}/read` - Đánh dấu đã đọc
  - [ ] PUT `/notifications/read-all` - Đọc tất cả
  - [ ] DELETE `/notifications/{id}` - Xóa thông báo
  - [ ] GET `/notification-preferences` - Lấy cài đặt
  - [ ] PUT `/notification-preferences` - Cập nhật cài đặt
- [ ] Tích hợp vào ActivityController:
  - [ ] `submitForApproval()` - Gửi thông báo
  - [ ] `approve()` - Gửi thông báo
  - [ ] `reject()` - Gửi thông báo
  - [ ] `lock()` / `unlock()` - Gửi thông báo
- [ ] Tạo Scheduled Job cho reminder notifications
- [ ] Tích hợp Email (optional)
- [ ] Tích hợp Push notification (optional)

### Frontend (React)

- [ ] Tạo Service `notificationApi.ts`
- [ ] Tạo Component `NotificationDropdown` (đã có)
- [ ] Tạo Component `NotificationList`
- [ ] Tạo Component `NotificationItem`
- [ ] Tạo Component `NotificationSettings`
- [ ] Tích hợp WebSocket/Polling cho real-time
- [ ] Hiển thị badge count trên header
- [ ] Điều hướng khi click thông báo
- [ ] Mark as read khi click
- [ ] Mark all as read

---

## 11. Database Schema Reference

Xem file migration: `2025_12_02_160000_update_notifications_table_structure.php`

### notifications table
- `id` (UUID)
- `user_id` (UUID) - Người nhận
- `notification_type` (string) - Loại thông báo
- `category` (string) - Nhóm: activity, reminder, system
- `actor_id` (UUID) - Người thực hiện action
- `related_entity_type` (string) - Model liên quan
- `related_entity_id` (UUID) - ID của entity
- `title` (string) - Tiêu đề
- `message` (text) - Nội dung
- `icon` (string) - Icon hiển thị
- `color` (string) - Màu sắc
- `action_url` (string) - URL điều hướng
- `data` (JSON) - Dữ liệu bổ sung
- `is_read` (boolean) - Đã đọc
- `read_at` (datetime) - Thời điểm đọc
- `priority` (enum) - Độ ưu tiên
- `created_at` (datetime)

---

*Document Version: 1.0*
*Last Updated: 2024-12-02*
