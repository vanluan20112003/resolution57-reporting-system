# Hướng dẫn Quy trình Quản lý Hoạt động

## Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Các trạng thái hoạt động](#2-các-trạng-thái-hoạt-động)
3. [Quy trình chi tiết](#3-quy-trình-chi-tiết)
4. [Quy trình mời tham gia](#4-quy-trình-mời-tham-gia)
5. [Quy trình hoãn và hủy hoạt động](#5-quy-trình-hoãn-và-hủy-hoạt-động)
6. [Phân quyền theo vai trò](#6-phân-quyền-theo-vai-trò)
7. [Các tình huống phát sinh](#7-các-tình-huống-phát-sinh)
8. [Quy trình đánh giá và báo cáo](#8-quy-trình-đánh-giá-và-báo-cáo)
9. [Quản lý tài liệu đính kèm](#9-quản-lý-tài-liệu-đính-kèm)
10. [Đề xuất cải tiến](#10-đề-xuất-cải-tiến)

---

## 1. Tổng quan

### 1.1. Mục đích
Hệ thống quản lý hoạt động được thiết kế để:
- Theo dõi các hoạt động thực hiện Nghị quyết 57-NQ/TW của ĐHQG-HCM
- Đảm bảo quy trình phê duyệt minh bạch, có trách nhiệm
- Liên kết hoạt động với các chỉ số KPI để đánh giá hiệu quả
- Lưu trữ minh chứng và tài liệu liên quan

### 1.2. Các bên liên quan
| Vai trò | Mô tả | Phạm vi |
|---------|-------|---------|
| **STAFF** | Chuyên viên | Tạo và quản lý hoạt động của đơn vị mình |
| **MANAGER** | Quản lý đơn vị | Phê duyệt hoạt động trong đơn vị |
| **OPERATOR** | Điều hành hệ thống | Quản lý toàn bộ hoạt động, mở khóa |
| **ADMIN** | Quản trị viên | Toàn quyền hệ thống |
| **GUEST** | Khách | Chỉ xem hoạt động đã duyệt |

---

## 2. Các trạng thái hoạt động

### 2.1. Sơ đồ trạng thái (Đề xuất cải tiến)

```
                                    ┌─────────────┐
                                    │   REJECTED  │ (Mới)
                                    │  (Từ chối)  │
                                    └──────┬──────┘
                                           │ Chỉnh sửa & gửi lại
                                           ▼
┌─────────┐    Gửi duyệt    ┌──────────────────┐    Xét duyệt    ┌──────────────┐
│  DRAFT  │ ───────────────►│ PENDING_APPROVAL │ ───────────────►│   REVIEWED   │
│ (Nháp)  │                 │  (Chờ phê duyệt) │                 │  (Đã xét)    │
└────┬────┘                 └────────┬─────────┘                 └──────┬───────┘
     │                               │                                   │
     │ Xóa                           │ Từ chối                           │ Phê duyệt
     ▼                               ▼                                   ▼
┌─────────┐                 ┌──────────────┐                    ┌─────────────────┐
│ DELETED │                 │   REJECTED   │                    │   APPROVED      │
│ (Đã xóa)│                 │  (Từ chối)   │                    │   (Đã duyệt)    │
└─────────┘                 └──────────────┘                    └────────┬────────┘
                                                                         │
                                                                         │ Gửi lời mời
                                                                         ▼
                                                                ┌─────────────────┐
                                                                │INVITATIONS_SENT │
                                                                │(Đã gửi lời mời) │
                                                                └────────┬────────┘
                                                                         │
                                                                         │ Bắt đầu thực hiện
                                                                         ▼
                                                                ┌─────────────────┐
                                                                │   IN_PROGRESS   │
                                                                │(Đang thực hiện) │
                                                                └────────┬────────┘
                                                                         │
                            ┌────────────────────────────────────────────┼────────────────┐
                            │                                            │                │
                            ▼                                            ▼                ▼
                   ┌─────────────────┐                          ┌─────────────┐  ┌─────────────┐
                   │   POSTPONED     │◄────────────────────────►│  COMPLETED  │  │  CANCELLED  │
                   │   (Hoãn lại)    │                          │ (Hoàn thành)│  │  (Hủy bỏ)   │
                   └─────────────────┘                          └─────────────┘  └─────────────┘
```

**Ghi chú về sơ đồ:**
- APPROVED: Hoạt động đã được phê duyệt, sẵn sàng gửi lời mời
- INVITATIONS_SENT: Đã gửi lời mời cho khách tham gia, đang chờ phản hồi
- POSTPONED: Hoạt động bị hoãn (thay thế ON_HOLD) - có thể tiếp tục hoặc hủy

### 2.2. Mô tả chi tiết các trạng thái

| Trạng thái | Mã | Mô tả | Ai có thể chỉnh sửa |
|------------|-----|-------|---------------------|
| **Nháp** | DRAFT | Hoạt động mới tạo, chưa gửi duyệt | Người tạo, MANAGER+ |
| **Chờ phê duyệt** | PENDING_APPROVAL | Đã gửi, đang chờ xét duyệt | Không ai (chỉ xem) |
| **Đã xét** | REVIEWED | Manager đã xem xét, chờ phê duyệt cuối | Không ai (chỉ xem) |
| **Từ chối** | REJECTED | Bị từ chối, cần chỉnh sửa | Người tạo |
| **Đã duyệt** | APPROVED | Đã được phê duyệt, sẵn sàng mời khách | Chỉ thêm danh sách khách mời |
| **Đã gửi lời mời** | INVITATIONS_SENT | Đã gửi lời mời, đang chờ phản hồi | Chỉ xem phản hồi, gửi thêm |
| **Đang thực hiện** | IN_PROGRESS | Đã bắt đầu triển khai | Chỉ cập nhật tiến độ |
| **Hoãn lại** | POSTPONED | Tạm hoãn vì lý do nào đó | Chỉ cập nhật lý do, ngày mới |
| **Hoàn thành** | COMPLETED | Đã kết thúc thành công | Chỉ bổ sung kết quả |
| **Hủy bỏ** | CANCELLED | Đã hủy, không thực hiện | Không ai |

### 2.3. Quy tắc chuyển trạng thái

```
DRAFT             → PENDING_APPROVAL   : Gửi duyệt (STAFF+)
PENDING_APPROVAL  → REVIEWED           : Xét duyệt bước 1 (MANAGER+)
PENDING_APPROVAL  → REJECTED           : Từ chối (MANAGER+)
REVIEWED          → APPROVED           : Phê duyệt cuối (MANAGER+)
REVIEWED          → REJECTED           : Từ chối (MANAGER+)
REJECTED          → PENDING_APPROVAL   : Gửi lại sau khi sửa (STAFF+)

# Flow mời tham gia
APPROVED          → INVITATIONS_SENT   : Gửi lời mời (STAFF+)
INVITATIONS_SENT  → IN_PROGRESS        : Bắt đầu thực hiện (MANAGER+)
APPROVED          → IN_PROGRESS        : Bắt đầu trực tiếp không cần mời (MANAGER+)

# Flow thực hiện
IN_PROGRESS       → COMPLETED          : Hoàn thành (MANAGER+)
IN_PROGRESS       → POSTPONED          : Hoãn lại (MANAGER+)
IN_PROGRESS       → CANCELLED          : Hủy bỏ (OPERATOR+)

# Flow hoãn/hủy
POSTPONED         → IN_PROGRESS        : Tiếp tục thực hiện (MANAGER+)
POSTPONED         → CANCELLED          : Hủy bỏ vĩnh viễn (OPERATOR+)
APPROVED          → POSTPONED          : Hoãn trước khi bắt đầu (MANAGER+)
APPROVED          → CANCELLED          : Hủy trước khi bắt đầu (OPERATOR+)
INVITATIONS_SENT  → POSTPONED          : Hoãn sau khi đã mời (MANAGER+)
INVITATIONS_SENT  → CANCELLED          : Hủy sau khi đã mời (OPERATOR+)
```

---

## 3. Quy trình chi tiết

### 3.1. Giai đoạn 1: Khởi tạo hoạt động

**Người thực hiện:** STAFF, MANAGER

**Bước 1.1: Tạo hoạt động mới**
1. Truy cập menu "Quản lý hoạt động"
2. Nhấn "Thêm hoạt động mới"
3. Điền thông tin bắt buộc:
   - Tên hoạt động (tối đa 500 ký tự)
   - Loại hoạt động (chọn từ danh mục)
   - Lĩnh vực hoạt động (nếu có)
   - Đơn vị chủ trì (mặc định là đơn vị của người tạo)

**Bước 1.2: Bổ sung thông tin chi tiết**
- Mô tả chi tiết hoạt động
- Thời gian dự kiến: ngày bắt đầu, ngày kết thúc
- Địa điểm tổ chức
- Kinh phí dự kiến và nguồn kinh phí
- Link tài liệu bên ngoài (nếu có)

**Bước 1.3: Liên kết KPI**
- Chọn các KPI mà hoạt động này đóng góp
- Mô tả cách thức đóng góp cho từng KPI
- Đặt giá trị mục tiêu cho từng KPI (nếu có)

**Bước 1.4: Đính kèm tài liệu**
- Upload các tài liệu liên quan (kế hoạch, công văn, etc.)
- Chọn loại tài liệu phù hợp

**Lưu ý quan trọng:**
- Hoạt động ở trạng thái DRAFT có thể chỉnh sửa thoải mái
- Nên hoàn thiện đầy đủ thông tin trước khi gửi duyệt
- Có thể lưu nháp và quay lại chỉnh sửa sau

### 3.2. Giai đoạn 2: Gửi phê duyệt

**Người thực hiện:** STAFF, MANAGER (người tạo)

**Điều kiện gửi duyệt:**
- Hoạt động phải ở trạng thái DRAFT hoặc REJECTED
- Các trường bắt buộc phải được điền đầy đủ
- Thời gian bắt đầu phải sau thời điểm hiện tại (đối với hoạt động mới)

**Quy trình:**
1. Mở hoạt động cần gửi duyệt
2. Kiểm tra lại toàn bộ thông tin
3. Nhấn nút "Gửi phê duyệt"
4. Xác nhận gửi
5. Hoạt động chuyển sang trạng thái PENDING_APPROVAL

**Sau khi gửi:**
- Không thể chỉnh sửa hoạt động
- Manager sẽ nhận thông báo có hoạt động chờ duyệt
- Badge "Chờ phê duyệt" sẽ hiển thị số lượng

### 3.3. Giai đoạn 3: Xét duyệt (2 bước)

#### Bước 1: Xét duyệt sơ bộ (MANAGER)

**Người thực hiện:** MANAGER của đơn vị

**Quy trình:**
1. Vào menu "Chờ phê duyệt"
2. Chọn hoạt động cần xét duyệt
3. Xem chi tiết toàn bộ thông tin
4. Đánh giá:
   - Tính khả thi của hoạt động
   - Ngân sách có hợp lý không
   - Thời gian có phù hợp không
   - KPI liên kết có đúng không

**Quyết định:**
- **Chấp nhận → REVIEWED**: Nếu thông tin đầy đủ, hợp lệ
- **Từ chối → REJECTED**: Nếu cần chỉnh sửa, kèm lý do

#### Bước 2: Phê duyệt cuối cùng (MANAGER/OPERATOR)

**Người thực hiện:** MANAGER (nếu có quyền phê duyệt cuối) hoặc OPERATOR

**Quy trình:**
1. Xem lại hoạt động đã được xét duyệt (REVIEWED)
2. Kiểm tra nhận xét từ bước xét duyệt trước
3. Quyết định cuối cùng

**Quyết định:**
- **Phê duyệt → IN_PROGRESS**: Hoạt động được phép triển khai
- **Từ chối → REJECTED**: Vẫn có vấn đề, cần làm lại

**Khi phê duyệt:**
- Hoạt động tự động bị KHÓA (is_locked = true)
- Ghi nhận người phê duyệt và thời gian
- Ngày bắt đầu thực tế được đặt (nếu chưa có)
- Gửi thông báo cho người tạo

### 3.4. Giai đoạn 4: Triển khai và theo dõi

**Người thực hiện:** STAFF (người tạo), MANAGER

**Trong quá trình triển khai:**
1. Cập nhật tiến độ hoàn thành (%)
2. Ghi nhận các sự kiện quan trọng
3. Upload minh chứng, tài liệu
4. Cập nhật ngày bắt đầu/kết thúc thực tế

**Các trường có thể cập nhật khi IN_PROGRESS:**
- completion_percentage (0-100%)
- result_summary (tóm tắt kết quả)
- actual_start_date
- actual_end_date
- Tài liệu đính kèm

**Không thể thay đổi:**
- Tên hoạt động
- Loại hoạt động
- Lĩnh vực
- Kinh phí dự kiến
- Thời gian dự kiến

### 3.5. Giai đoạn 5: Hoàn thành và đánh giá

---

## 4. Quy trình mời tham gia

### 4.1. Tổng quan quy trình mời

Quy trình gửi lời mời cho khách tham gia hoạt động được thực hiện **sau khi hoạt động đã được phê duyệt** (APPROVED) và **trước khi bắt đầu thực hiện** (IN_PROGRESS).

```
APPROVED → Thêm danh sách khách mời → Gửi lời mời → INVITATIONS_SENT → Thu thập phản hồi → IN_PROGRESS
```

### 4.2. Các loại khách mời

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| **Nội bộ** | Người trong tổ chức | Cán bộ, giảng viên, sinh viên |
| **Khách VIP** | Lãnh đạo, quan chức | Giám đốc, Hiệu trưởng, đại biểu |
| **Khách mời** | Đối tác bên ngoài | Doanh nghiệp, chuyên gia |
| **Diễn giả** | Người trình bày | Báo cáo viên, MC |
| **Tài trợ** | Nhà tài trợ | Đơn vị hỗ trợ kinh phí |
| **Truyền thông** | Báo chí | Phóng viên, biên tập viên |

### 4.3. Quy trình chi tiết gửi lời mời

#### Bước 1: Chuẩn bị danh sách khách mời

**Người thực hiện:** STAFF, MANAGER

1. Mở hoạt động đã được duyệt (APPROVED)
2. Vào tab "Khách mời" hoặc "Participants"
3. Thêm khách mời theo từng loại:
   - **Khách có tài khoản trong hệ thống**: Chọn từ danh sách user
   - **Khách bên ngoài**: Nhập thông tin mới
     - Họ tên (bắt buộc)
     - Email (bắt buộc)
     - Số điện thoại
     - Đơn vị công tác
     - Chức danh
     - Loại khách (chọn từ danh mục)
4. Ghi chú vai trò của từng khách trong hoạt động

#### Bước 2: Soạn nội dung lời mời

**Mẫu lời mời chuẩn:**

```
Kính gửi: [Họ tên khách mời]

[Tên đơn vị] trân trọng kính mời Quý ông/bà tham dự:

📌 Hoạt động: [Tên hoạt động]
📅 Thời gian: [Ngày giờ bắt đầu] - [Ngày giờ kết thúc]
📍 Địa điểm: [Địa điểm]

Mô tả: [Mô tả ngắn về hoạt động]

Vui lòng xác nhận tham dự trước ngày [Hạn chót] qua:
- Link xác nhận: [Link]
- Hoặc phản hồi email này

Trân trọng cảm ơn!
[Tên người gửi]
[Đơn vị]
```

#### Bước 3: Gửi lời mời

**Người thực hiện:** STAFF, MANAGER

1. Chọn danh sách khách cần gửi lời mời
2. Chọn kênh gửi:
   - **Email**: Gửi email tự động từ hệ thống
   - **Thông báo hệ thống**: Cho user nội bộ
   - **Manual**: Đánh dấu đã gửi thủ công (in giấy mời, gọi điện)
3. Xem trước nội dung lời mời
4. Xác nhận gửi
5. Hệ thống chuyển trạng thái hoạt động → **INVITATIONS_SENT**

#### Bước 4: Theo dõi phản hồi

**Trạng thái phản hồi của từng khách:**

| Trạng thái | Mã | Mô tả |
|------------|-----|-------|
| Chưa gửi | NOT_SENT | Lời mời chưa được gửi |
| Đã gửi | SENT | Lời mời đã gửi, chờ phản hồi |
| Xác nhận tham dự | CONFIRMED | Khách xác nhận sẽ tham dự |
| Từ chối | DECLINED | Khách từ chối tham dự |
| Chưa chắc | TENTATIVE | Khách chưa chắc chắn |
| Không phản hồi | NO_RESPONSE | Quá hạn mà không phản hồi |

**Hành động theo dõi:**
1. Xem dashboard thống kê phản hồi
2. Gửi nhắc nhở cho khách chưa phản hồi
3. Gửi lại lời mời nếu cần
4. Cập nhật thông tin khách thay đổi

#### Bước 5: Chốt danh sách và bắt đầu

**Điều kiện để chuyển sang IN_PROGRESS:**
- Đã gửi lời mời cho tất cả khách trong danh sách
- Đã thu thập đủ phản hồi (theo yêu cầu)
- Đã chuẩn bị đầy đủ cho hoạt động

**Người thực hiện:** MANAGER, OPERATOR

1. Xem tổng hợp danh sách khách mời
2. Xác nhận chốt danh sách
3. Chuyển trạng thái → **IN_PROGRESS**

### 4.4. Các tình huống đặc biệt với lời mời

#### 4.4.1. Khách hủy tham dự sau khi xác nhận

**Xử lý:**
1. Cập nhật trạng thái khách → DECLINED
2. Ghi nhận lý do hủy
3. Quyết định có mời khách thay thế không
4. Cập nhật số lượng tham dự dự kiến

#### 4.4.2. Cần bổ sung khách mời sau khi đã gửi

**Xử lý:**
1. Thêm khách mới vào danh sách
2. Soạn và gửi lời mời riêng
3. Theo dõi phản hồi khách mới

#### 4.4.3. Sai thông tin trong lời mời đã gửi

**Xử lý:**
1. Soạn email/thông báo đính chính
2. Gửi thông tin cập nhật cho tất cả khách
3. Ghi nhận trong lịch sử hoạt động

#### 4.4.4. Hoạt động bị hoãn/hủy sau khi đã gửi lời mời

**Xử lý:**
1. Gửi thông báo hoãn/hủy cho tất cả khách đã mời
2. Nêu rõ lý do hoãn/hủy
3. Thông báo kế hoạch mới (nếu hoãn)
4. Cập nhật trạng thái hoạt động

### 4.5. Cấu trúc dữ liệu đề xuất

```sql
-- Bảng khách mời hoạt động
CREATE TABLE activity_participants (
    id UUID PRIMARY KEY,
    activity_id UUID REFERENCES activities(id),

    -- Thông tin khách
    user_id UUID NULL REFERENCES users(id),  -- Nếu là user nội bộ
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NULL,
    organization VARCHAR(200) NULL,          -- Đơn vị công tác
    position VARCHAR(100) NULL,              -- Chức danh

    -- Phân loại
    participant_type ENUM('INTERNAL', 'VIP', 'GUEST', 'SPEAKER', 'SPONSOR', 'MEDIA') DEFAULT 'GUEST',
    role_in_activity VARCHAR(200) NULL,      -- Vai trò trong hoạt động

    -- Trạng thái lời mời
    invitation_status ENUM('NOT_SENT', 'SENT', 'CONFIRMED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE') DEFAULT 'NOT_SENT',
    invitation_sent_at TIMESTAMP NULL,
    invitation_sent_via ENUM('EMAIL', 'SYSTEM', 'MANUAL') NULL,
    response_at TIMESTAMP NULL,
    decline_reason TEXT NULL,

    -- Tracking
    attendance_confirmed BOOLEAN DEFAULT FALSE,  -- Đã điểm danh
    notes TEXT NULL,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lịch sử gửi lời mời
CREATE TABLE invitation_logs (
    id UUID PRIMARY KEY,
    participant_id UUID REFERENCES activity_participants(id),
    activity_id UUID REFERENCES activities(id),

    action ENUM('SENT', 'RESENT', 'REMINDER', 'CANCELLED', 'UPDATED') NOT NULL,
    sent_via ENUM('EMAIL', 'SYSTEM', 'MANUAL') NOT NULL,
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    email_content TEXT NULL,
    notes TEXT NULL
);
```

---

## 5. Quy trình hoãn và hủy hoạt động

### 5.1. Phân biệt hoãn và hủy

| Tiêu chí | Hoãn (POSTPONED) | Hủy (CANCELLED) |
|----------|------------------|-----------------|
| **Định nghĩa** | Tạm dừng, dự kiến tiếp tục sau | Chấm dứt vĩnh viễn |
| **Có thể khôi phục** | Có | Không |
| **Quyền thực hiện** | MANAGER+ | OPERATOR+ |
| **Ảnh hưởng KPI** | Tạm tính | Không tính |
| **Thông báo khách** | Thông báo hoãn + kế hoạch mới | Thông báo hủy |

### 5.2. Quy trình hoãn hoạt động (POSTPONED)

#### 5.2.1. Các lý do hoãn phổ biến

| Lý do | Mô tả | Thời gian hoãn thông thường |
|-------|-------|----------------------------|
| **Thời tiết** | Mưa bão, thiên tai | 1-7 ngày |
| **Dịch bệnh** | COVID, cúm | 2-4 tuần |
| **Thiếu nguồn lực** | Chờ kinh phí, nhân sự | 1-4 tuần |
| **Xung đột lịch** | Trùng sự kiện quan trọng | 1-2 tuần |
| **Chờ phê duyệt bổ sung** | Cần xin thêm ý kiến | 1-2 tuần |
| **Yêu cầu thay đổi** | Cần điều chỉnh nội dung | 1-4 tuần |
| **Khách VIP không tham dự** | Chờ lịch khách quan trọng | 1-4 tuần |

#### 5.2.2. Quy trình hoãn chi tiết

**Bước 1: Đánh giá và quyết định hoãn**

**Người thực hiện:** MANAGER

1. Đánh giá tình huống:
   - Lý do hoãn có hợp lý không?
   - Thời gian hoãn dự kiến bao lâu?
   - Ảnh hưởng đến các bên liên quan như thế nào?
2. Tham vấn OPERATOR nếu cần
3. Quyết định hoãn

**Bước 2: Thiết lập thông tin hoãn**

**Thông tin cần ghi nhận:**
- Lý do hoãn (chọn từ danh mục + mô tả chi tiết)
- Ngày dự kiến tiếp tục (nếu biết)
- Người quyết định hoãn
- Ngày quyết định hoãn

**Bước 3: Thông báo các bên liên quan**

1. **Thông báo nội bộ:**
   - Người tạo hoạt động
   - Các thành viên liên quan
   - OPERATOR (nếu MANAGER hoãn)

2. **Thông báo khách mời (nếu đã gửi lời mời):**

```
Kính gửi: [Họ tên khách mời]

Trân trọng thông báo về việc hoãn hoạt động:

📌 Hoạt động: [Tên hoạt động]
📅 Thời gian ban đầu: [Ngày giờ cũ]
⏸️ Trạng thái: TẠM HOÃN

Lý do: [Lý do hoãn]
Thời gian dự kiến mới: [Ngày giờ mới hoặc "Sẽ thông báo sau"]

Chúng tôi rất tiếc vì sự bất tiện này và sẽ cập nhật thông tin
khi có lịch mới.

Trân trọng!
[Tên người gửi]
```

**Bước 4: Cập nhật hệ thống**

1. Chuyển trạng thái → **POSTPONED**
2. Lưu lý do và thông tin hoãn
3. Cập nhật lịch sử hoạt động
4. Đánh dấu các lời mời đã gửi là "Đã hoãn"

#### 5.2.3. Tiếp tục hoạt động sau khi hoãn

**Điều kiện tiếp tục:**
- Lý do hoãn đã được giải quyết
- Có ngày bắt đầu mới
- Đã cập nhật thông tin cho các bên

**Quy trình:**
1. MANAGER xác nhận tiếp tục
2. Cập nhật ngày giờ mới
3. Gửi thông báo cập nhật cho khách mời
4. Chuyển trạng thái → **IN_PROGRESS** (hoặc **APPROVED** nếu cần mời lại)

### 5.3. Quy trình hủy hoạt động (CANCELLED)

#### 5.3.1. Các lý do hủy phổ biến

| Lý do | Mô tả | Yêu cầu biên bản |
|-------|-------|-----------------|
| **Thiếu kinh phí** | Không có nguồn tài trợ | Có |
| **Không đủ người tham gia** | Số đăng ký quá ít | Có |
| **Thay đổi chính sách** | Lãnh đạo quyết định không tổ chức | Có |
| **Bất khả kháng** | Thiên tai, dịch bệnh kéo dài | Có |
| **Trùng lặp hoạt động** | Có hoạt động tương tự khác | Không |
| **Không còn phù hợp** | Mục tiêu thay đổi | Có |

#### 5.3.2. Quy trình hủy chi tiết

**Bước 1: Đề xuất hủy**

**Người thực hiện:** MANAGER

1. Lập đề xuất hủy hoạt động
2. Nêu rõ lý do hủy
3. Đánh giá tác động:
   - Kinh phí đã chi
   - Cam kết với khách mời
   - Ảnh hưởng đến KPI
4. Gửi đề xuất cho OPERATOR/ADMIN

**Bước 2: Xét duyệt hủy**

**Người thực hiện:** OPERATOR/ADMIN

1. Xem xét đề xuất hủy
2. Đánh giá có phương án thay thế không
3. Quyết định:
   - **Duyệt hủy**: Tiến hành các bước tiếp theo
   - **Từ chối**: Yêu cầu tiếp tục hoặc hoãn thay vì hủy

**Bước 3: Xử lý các vấn đề liên quan**

1. **Kinh phí:**
   - Hoàn trả kinh phí chưa sử dụng
   - Thanh toán các cam kết đã ký
   - Lập biên bản tài chính

2. **Khách mời:**
   - Gửi thông báo hủy chính thức
   - Gửi lời xin lỗi nếu cần
   - Lưu phản hồi của khách

3. **Tài liệu:**
   - Lưu trữ các tài liệu đã chuẩn bị
   - Đánh dấu "Đã hủy" trên các văn bản liên quan

**Mẫu thông báo hủy:**

```
Kính gửi: [Họ tên khách mời]

Trân trọng thông báo về việc hủy hoạt động:

📌 Hoạt động: [Tên hoạt động]
📅 Thời gian dự kiến: [Ngày giờ cũ]
❌ Trạng thái: ĐÃ HỦY

Lý do: [Lý do hủy]

Chúng tôi chân thành xin lỗi vì sự bất tiện này.
[Nếu có hoạt động thay thế: "Thay vào đó, chúng tôi xin giới thiệu..."]

Trân trọng!
[Tên người gửi]
```

**Bước 4: Hoàn tất hủy**

1. Chuyển trạng thái → **CANCELLED**
2. Ghi nhận đầy đủ thông tin:
   - Lý do hủy chi tiết
   - Người quyết định hủy
   - Ngày hủy
   - Biên bản hủy (nếu có)
3. Cập nhật các KPI liên kết (không tính)
4. Lưu vào lịch sử để tra cứu

#### 5.3.3. Sau khi hủy

- Hoạt động **KHÔNG THỂ** được khôi phục
- Có thể **tạo hoạt động mới** dựa trên hoạt động đã hủy (copy)
- Dữ liệu được lưu để báo cáo và phân tích
- KPI liên kết không được tính vào kết quả

### 5.4. So sánh các trạng thái kết thúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CÁC CÁCH KẾT THÚC HOẠT ĐỘNG                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  COMPLETED (Hoàn thành)    POSTPONED (Hoãn)     CANCELLED (Hủy)    │
│  ✅ Thành công             ⏸️ Tạm dừng          ❌ Chấm dứt         │
│  ─────────────────         ──────────────       ─────────────      │
│  • Đạt mục tiêu            • Chưa hoàn thành    • Không thực hiện  │
│  • KPI được tính           • Có thể tiếp tục    • KPI không tính   │
│  • Có báo cáo kết quả      • Chờ điều kiện mới  • Có biên bản hủy  │
│  • Đóng vĩnh viễn          • Mở để xử lý tiếp   • Đóng vĩnh viễn   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5. Cấu trúc dữ liệu đề xuất cho hoãn/hủy

```sql
-- Bảng lịch sử hoãn/hủy
CREATE TABLE activity_status_changes (
    id UUID PRIMARY KEY,
    activity_id UUID REFERENCES activities(id),

    -- Thông tin thay đổi
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,

    -- Lý do
    reason_type ENUM(
        'WEATHER', 'EPIDEMIC', 'RESOURCE', 'SCHEDULE_CONFLICT',
        'APPROVAL_PENDING', 'CHANGE_REQUEST', 'VIP_UNAVAILABLE',
        'BUDGET_ISSUE', 'LOW_PARTICIPATION', 'POLICY_CHANGE',
        'FORCE_MAJEURE', 'DUPLICATION', 'NO_LONGER_RELEVANT', 'OTHER'
    ) NOT NULL,
    reason_detail TEXT NOT NULL,

    -- Kế hoạch mới (cho hoãn)
    new_planned_start_date DATE NULL,
    new_planned_end_date DATE NULL,

    -- Tracking
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Tài liệu đính kèm
    attachment_path VARCHAR(500) NULL,  -- Biên bản

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm cột vào bảng activities
ALTER TABLE activities ADD COLUMN postponed_count INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN last_postponed_at TIMESTAMP NULL;
ALTER TABLE activities ADD COLUMN cancelled_at TIMESTAMP NULL;
ALTER TABLE activities ADD COLUMN cancelled_by UUID REFERENCES users(id);
ALTER TABLE activities ADD COLUMN cancellation_reason TEXT NULL;
```

---

## 6. Phân quyền theo vai trò

### 6.1. Ma trận quyền hạn chi tiết

| Hành động | GUEST | STAFF | MANAGER | OPERATOR | ADMIN |
|-----------|-------|-------|---------|----------|-------|
| Xem hoạt động đã duyệt | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem hoạt động đơn vị | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem tất cả hoạt động | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tạo hoạt động | ❌ | ✅* | ✅* | ✅ | ✅ |
| Sửa hoạt động nháp | ❌ | ✅** | ✅* | ✅ | ✅ |
| Gửi duyệt | ❌ | ✅** | ✅* | ✅ | ✅ |
| Xét duyệt (bước 1) | ❌ | ❌ | ✅* | ✅ | ✅ |
| Phê duyệt (bước 2) | ❌ | ❌ | ✅* | ✅ | ✅ |
| Từ chối | ❌ | ❌ | ✅* | ✅ | ✅ |
| Cập nhật tiến độ | ❌ | ✅** | ✅* | ✅ | ✅ |
| Khóa hoạt động | ❌ | ❌ | ✅* | ✅ | ✅ |
| Mở khóa hoạt động | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tạm dừng/Tiếp tục | ❌ | ❌ | ✅* | ✅ | ✅ |
| Hoàn thành | ❌ | ❌ | ✅* | ✅ | ✅ |
| Hủy bỏ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xóa vĩnh viễn | ❌ | ✅** | ✅* | ✅ | ✅ |

**Ghi chú:**
- ✅* : Chỉ trong phạm vi đơn vị của mình
- ✅** : Chỉ hoạt động do mình tạo

### 6.2. Quy tắc đặc biệt

**STAFF:**
- Chỉ có thể sửa/xóa hoạt động mình tạo
- Chỉ khi trạng thái là DRAFT hoặc REJECTED
- Không thể tự phê duyệt hoạt động của mình
- Có thể thêm khách mời và gửi lời mời

**MANAGER:**
- Có thể sửa bất kỳ hoạt động nào trong đơn vị
- Không nên tự phê duyệt hoạt động mình tạo (best practice)
- Có thể ủy quyền xét duyệt cho MANAGER khác
- Có quyền hoãn hoạt động trong đơn vị mình

**OPERATOR/ADMIN:**
- Có quyền can thiệp vào bất kỳ hoạt động nào
- Là người duy nhất có thể mở khóa hoạt động đã duyệt
- Có thể hủy bỏ hoạt động đang triển khai
- Quyền phê duyệt/từ chối yêu cầu hủy từ MANAGER

### 6.3. Quyền liên quan đến lời mời và hoãn/hủy

| Hành động | GUEST | STAFF | MANAGER | OPERATOR | ADMIN |
|-----------|-------|-------|---------|----------|-------|
| Thêm khách mời | ❌ | ✅** | ✅* | ✅ | ✅ |
| Gửi lời mời | ❌ | ✅** | ✅* | ✅ | ✅ |
| Theo dõi phản hồi | ❌ | ✅** | ✅* | ✅ | ✅ |
| Hoãn hoạt động | ❌ | ❌ | ✅* | ✅ | ✅ |
| Đề xuất hủy | ❌ | ❌ | ✅* | ✅ | ✅ |
| Phê duyệt hủy | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tiếp tục sau hoãn | ❌ | ❌ | ✅* | ✅ | ✅ |

---

## 7. Các tình huống phát sinh

### 7.1. Hoạt động bị từ chối

**Tình huống:** Manager từ chối hoạt động với lý do cần bổ sung thông tin.

**Xử lý:**
1. Người tạo nhận thông báo từ chối kèm lý do
2. Mở hoạt động (đang ở trạng thái REJECTED)
3. Chỉnh sửa theo góp ý
4. Gửi lại phê duyệt
5. Lặp lại quy trình xét duyệt

**Lưu ý:**
- Lịch sử từ chối được lưu lại
- Có thể xem các lần từ chối trước đó
- Nên ghi chú những gì đã sửa khi gửi lại

### 7.2. Cần thay đổi thông tin sau khi đã duyệt

**Tình huống:** Hoạt động đã được duyệt (IN_PROGRESS) nhưng phát hiện sai sót quan trọng.

**Xử lý:**
1. Liên hệ OPERATOR/ADMIN
2. Yêu cầu mở khóa hoạt động với lý do
3. OPERATOR/ADMIN xem xét và mở khóa
4. Chỉnh sửa thông tin cần thiết
5. Khóa lại hoạt động

**Quy tắc:**
- Chỉ mở khóa khi thực sự cần thiết
- Ghi nhận lý do mở khóa
- Không nên thay đổi mục tiêu/KPI sau khi đã triển khai

### 7.3. Hoạt động cần tạm hoãn

**Tình huống:** Hoạt động đang triển khai nhưng gặp trở ngại cần tạm hoãn.

**Xử lý:**
Xem chi tiết tại **Section 5 - Quy trình hoãn và hủy hoạt động**.

### 7.4. Hoạt động cần hủy bỏ

**Tình huống:** Hoạt động không thể tiếp tục và cần hủy.

**Xử lý:**
Xem chi tiết tại **Section 5 - Quy trình hoãn và hủy hoạt động**.

### 7.5. Hoạt động trễ deadline

**Tình huống:** Hoạt động không hoàn thành đúng thời hạn dự kiến.

**Xử lý:**
1. Hệ thống tự động đánh dấu hoạt động "Trễ hạn"
2. Gửi cảnh báo cho người tạo và MANAGER
3. MANAGER yêu cầu giải trình
4. Cập nhật ngày kết thúc thực tế
5. Ghi nhận trong đánh giá hiệu quả

### 7.6. Chuyển giao hoạt động

**Tình huống:** Người tạo hoạt động nghỉ việc hoặc chuyển công tác.

**Xử lý:**
1. MANAGER/OPERATOR chỉ định người tiếp nhận mới
2. Cập nhật thông tin người phụ trách
3. Người mới có quyền như người tạo ban đầu
4. Ghi nhận việc chuyển giao trong lịch sử

### 7.7. Hoạt động liên đơn vị

**Tình huống:** Hoạt động có sự tham gia của nhiều đơn vị.

**Xử lý:**
1. Xác định đơn vị chủ trì (lead_organization)
2. Thêm các đơn vị phối hợp vào danh sách
3. Mỗi đơn vị có vai trò và trách nhiệm riêng
4. Đơn vị chủ trì chịu trách nhiệm báo cáo chung

---

## 8. Quy trình đánh giá và báo cáo

### 8.1. Đánh giá trong quá trình triển khai

**Tần suất:** Hàng tuần hoặc theo mốc quan trọng

**Nội dung cập nhật:**
- Tiến độ hoàn thành (%)
- Các hoạt động đã thực hiện
- Khó khăn, vướng mắc (nếu có)
- Dự kiến công việc tiếp theo

### 8.2. Đánh giá khi hoàn thành

**Checklist hoàn thành:**
- [ ] Tiến độ đạt 100%
- [ ] Có tóm tắt kết quả chi tiết
- [ ] Có ngày bắt đầu/kết thúc thực tế
- [ ] Đã upload đầy đủ minh chứng
- [ ] Đã cập nhật giá trị thực tế cho KPI
- [ ] Có đánh giá hiệu quả tổng thể

**Nội dung đánh giá:**
1. **Mức độ hoàn thành mục tiêu**: Đạt / Không đạt / Vượt
2. **Đóng góp KPI**: Giá trị đạt được so với mục tiêu
3. **Hiệu quả sử dụng nguồn lực**: Kinh phí thực tế vs dự kiến
4. **Bài học kinh nghiệm**: Những điểm cần cải thiện
5. **Đề xuất**: Cho các hoạt động tương tự trong tương lai

### 8.3. Báo cáo tổng hợp

**Báo cáo theo đơn vị:**
- Số lượng hoạt động theo trạng thái
- Tỷ lệ hoàn thành đúng hạn
- Tổng đóng góp KPI
- Top hoạt động nổi bật

**Báo cáo toàn hệ thống:**
- Dashboard tổng quan
- So sánh giữa các đơn vị
- Xu hướng theo thời gian
- Cảnh báo hoạt động trễ hạn

---

## 9. Quản lý tài liệu đính kèm

### 9.1. Các loại tài liệu

| Loại tài liệu | Mô tả | Giai đoạn upload |
|---------------|-------|------------------|
| Kế hoạch | Kế hoạch triển khai chi tiết | Tạo hoạt động |
| Công văn | Văn bản phê duyệt, chỉ đạo | Tạo/Triển khai |
| Biên bản | Biên bản họp, nghiệm thu | Triển khai/Hoàn thành |
| Hình ảnh | Ảnh chụp hoạt động | Triển khai/Hoàn thành |
| Báo cáo | Báo cáo kết quả | Hoàn thành |
| Minh chứng | Các tài liệu chứng minh | Hoàn thành |
| Khác | Tài liệu khác | Bất kỳ |

### 9.2. Quy định upload

**Định dạng được chấp nhận:**
- Tài liệu: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Hình ảnh: JPG, PNG, GIF
- Video: MP4 (có giới hạn dung lượng)
- Nén: ZIP, RAR

**Giới hạn:**
- Dung lượng mỗi file: 10MB
- Tổng dung lượng/hoạt động: 100MB
- Tên file: Không chứa ký tự đặc biệt

### 9.3. Tài liệu bắt buộc

**Khi tạo hoạt động:**
- Kế hoạch hoặc đề xuất (khuyến nghị)

**Khi hoàn thành:**
- Báo cáo kết quả (bắt buộc)
- Minh chứng thực hiện (bắt buộc)
- Hình ảnh hoạt động (khuyến nghị)

---

## 10. Đề xuất cải tiến

### 10.1. Cải tiến quy trình

**10.1.1. Thêm trạng thái REJECTED**
- Hiện tại: Từ chối → Quay về DRAFT
- Đề xuất: Từ chối → REJECTED (trạng thái riêng)
- Lợi ích: Phân biệt rõ hoạt động mới vs hoạt động bị từ chối

**10.1.2. Lưu lịch sử từ chối**
- Thêm bảng `activity_rejections`
- Lưu: lý do, người từ chối, thời gian
- Hiển thị trong chi tiết hoạt động

**10.1.3. Quy trình xét duyệt 2 bước**
- Bước 1 (REVIEWED): Manager xét duyệt sơ bộ
- Bước 2 (APPROVED): Phê duyệt cuối cùng
- Phù hợp với tổ chức có quy trình nghiêm ngặt

### 10.2. Cải tiến tính năng

**10.2.1. Theo dõi tiến độ chi tiết**
```
activity_milestones:
- id
- activity_id
- title (tên mốc)
- target_date (ngày dự kiến)
- actual_date (ngày thực tế)
- status (pending/completed/delayed)
- notes
```

**10.2.2. Bình luận/Thảo luận**
```
activity_comments:
- id
- activity_id
- user_id
- content
- created_at
- parent_id (cho reply)
```

**10.2.3. Lịch sử thay đổi**
```
activity_history:
- id
- activity_id
- user_id
- action (created/updated/status_changed/etc)
- old_value
- new_value
- created_at
```

**10.2.4. Thông báo tự động**
- Email khi có hoạt động chờ duyệt
- Email khi hoạt động bị từ chối
- Email nhắc nhở khi gần deadline
- Email khi hoạt động trễ hạn

### 10.3. Cải tiến giao diện

**10.3.1. Dashboard hoạt động**
- Biểu đồ trạng thái (pie chart)
- Timeline hoạt động
- Calendar view
- Kanban board

**10.3.2. Batch actions**
- Duyệt nhiều hoạt động cùng lúc
- Export danh sách hoạt động
- Gửi thông báo hàng loạt

**10.3.3. Mobile responsive**
- Giao diện tối ưu cho mobile
- App notification
- Quick actions

---

## Phụ lục

### A. Mẫu tên hoạt động

**Cấu trúc:** [Loại] - [Nội dung chính] - [Thời gian/Đối tượng]

**Ví dụ:**
- Đào tạo - Tập huấn công nghệ AI cho giảng viên - Học kỳ 1/2024
- Nghiên cứu - Đề tài cấp cơ sở về năng lượng tái tạo - 2024
- Hội thảo - Hội thảo quốc tế về CNTT - 12/2024
- Hợp tác - Ký kết MOU với ĐH Stanford - Q2/2024

### B. Checklist tạo hoạt động

- [ ] Tên hoạt động rõ ràng, đúng format
- [ ] Loại hoạt động phù hợp
- [ ] Lĩnh vực hoạt động chính xác
- [ ] Mô tả chi tiết, đầy đủ
- [ ] Thời gian bắt đầu/kết thúc hợp lý
- [ ] Kinh phí có cơ sở
- [ ] KPI liên kết đúng
- [ ] Tài liệu đính kèm đầy đủ

### C. Quy ước mã hoạt động

**Format:** ACT-YYYY-NNN

- ACT: Prefix cố định
- YYYY: Năm tạo
- NNN: Số thứ tự (auto-increment)

**Ví dụ:** ACT-2024-001, ACT-2024-002, ...

---

*Tài liệu này được cập nhật lần cuối: Tháng 12/2024*
*Phiên bản: 2.0*

**Lịch sử phiên bản:**
- v1.0: Tạo mới - Quy trình cơ bản
- v2.0: Bổ sung quy trình gửi lời mời tham gia, quy trình hoãn và hủy hoạt động chi tiết
