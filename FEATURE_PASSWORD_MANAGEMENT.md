# Tính năng Quản lý Mật khẩu

## Tổng quan

Hệ thống đã được bổ sung các tính năng quản lý mật khẩu sau:

1. **Quên mật khẩu** - Gửi email khôi phục mật khẩu
2. **Đặt lại mật khẩu** - Đặt lại mật khẩu qua link email
3. **Đổi mật khẩu** - Đổi mật khẩu cho người dùng đã đăng nhập

## Cấu hình Email

### Gmail SMTP
File `.env` đã được cấu hình với thông tin Gmail:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=nq57@vnuhcm.edu.vn
MAIL_PASSWORD="bpdq yqvs bcib yhiu"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="nq57@vnuhcm.edu.vn"
MAIL_FROM_NAME="${APP_NAME}"
```

**Lưu ý**: App Password `bpdq yqvs bcib yhiu` cần được nhập không có khoảng trắng khi cấu hình trong Gmail.

## Database Migration

Migration đã được tạo cho bảng `password_resets`:

```bash
php artisan migrate
```

Cấu trúc bảng:
- `email` - Email người dùng (indexed)
- `token` - Token được hash để reset mật khẩu
- `created_at` - Thời gian tạo token (expires sau 60 phút)

## API Endpoints

### 1. Quên mật khẩu (Forgot Password)

**Endpoint**: `POST /api/v1/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@vnuhcm.edu.vn"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Email hướng dẫn đặt lại mật khẩu đã được gửi đến địa chỉ email của bạn."
}
```

**Chức năng**:
- Kiểm tra email có tồn tại trong hệ thống
- Tạo token ngẫu nhiên và lưu vào database (hashed)
- Gửi email chứa link reset password đến người dùng
- Link có dạng: `http://localhost:5000/reset-password?token=xxx&email=xxx`

### 2. Đặt lại mật khẩu (Reset Password)

**Endpoint**: `POST /api/v1/auth/reset-password`

**Request Body**:
```json
{
  "email": "user@vnuhcm.edu.vn",
  "token": "abc123...",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới."
}
```

**Validation**:
- Token phải hợp lệ và chưa expire (60 phút)
- Email phải tồn tại
- Mật khẩu phải >= 6 ký tự
- `password_confirmation` phải khớp với `password`

### 3. Đổi mật khẩu (Change Password)

**Endpoint**: `POST /api/v1/auth/change-password`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request Body**:
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123",
  "new_password_confirmation": "newpassword123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Mật khẩu đã được thay đổi thành công."
}
```

**Validation**:
- Yêu cầu authentication (Bearer token)
- `current_password` phải đúng
- `new_password` phải khác `current_password`
- `new_password` phải >= 6 ký tự
- `new_password_confirmation` phải khớp với `new_password`

## Frontend Components

### 1. ForgotPasswordPage
**Route**: `/forgot-password`

**Tính năng**:
- Form nhập email
- Hiển thị thông báo success/error
- Link quay lại trang login

**File**: `resources/react/src/pages/ForgotPasswordPage.tsx`

### 2. ResetPasswordPage
**Route**: `/reset-password?token=xxx&email=xxx`

**Tính năng**:
- Form nhập mật khẩu mới và xác nhận
- Validate token và email từ URL
- Hiển thị thông báo success/error
- Auto redirect về login sau khi thành công

**File**: `resources/react/src/pages/ResetPasswordPage.tsx`

### 3. ChangePasswordModal
**Component**: Modal trong UserDropdown

**Tính năng**:
- Modal form đổi mật khẩu
- Validate mật khẩu hiện tại
- Validate mật khẩu mới và xác nhận
- Hiển thị toast notification

**File**: `resources/react/src/components/ChangePasswordModal.tsx`

### 4. LoginForm Update
**Tính năng mới**:
- Thêm link "Quên mật khẩu?" phía dưới form password
- Link dẫn đến `/forgot-password`

**File**: `resources/react/src/features/auth/components/LoginForm.tsx`

### 5. UserDropdown Update
**Tính năng mới**:
- Menu item "Đổi mật khẩu" mở ChangePasswordModal
- Icon khóa (LockOutlined)

**File**: `resources/react/src/features/user/components/UserDropdown.tsx`

## Email Template

Email được gửi khi người dùng yêu cầu reset password:

**Subject**: Khôi phục mật khẩu - NQ57 Portal

**Nội dung**:
```
Xin chào!

Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

[Button: Đặt lại mật khẩu]

Link này sẽ hết hạn sau 60 phút.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ NQ57 Portal
```

## Testing

### Test Forgot Password
1. Truy cập `http://localhost:5000/login`
2. Click "Quên mật khẩu?"
3. Nhập email: `admin@vnuhcm.edu.vn`
4. Click "Gửi email khôi phục"
5. Kiểm tra email tại `nq57@vnuhcm.edu.vn`

### Test Reset Password
1. Mở email nhận được
2. Click button "Đặt lại mật khẩu"
3. Nhập mật khẩu mới (>= 6 ký tự)
4. Xác nhận mật khẩu
5. Click "Đặt lại mật khẩu"
6. Đăng nhập với mật khẩu mới

### Test Change Password
1. Đăng nhập vào hệ thống
2. Click avatar ở góc phải trên
3. Click "Đổi mật khẩu"
4. Nhập mật khẩu hiện tại
5. Nhập mật khẩu mới và xác nhận
6. Click "Đổi mật khẩu"

## Security Features

1. **Token Hashing**: Token được hash trước khi lưu vào database
2. **Token Expiration**: Token tự động expire sau 60 phút
3. **Password Hashing**: Mật khẩu được hash bằng bcrypt
4. **No Email Enumeration**: API không tiết lộ email có tồn tại hay không
5. **Old Token Cleanup**: Token cũ bị xóa khi tạo token mới
6. **Logged Events**: Tất cả operations được log để audit

## Files Changed

### Backend (PHP/Laravel)
- `app/Http/Controllers/API/AuthController.php` - Added 3 methods
- `app/Notifications/ResetPasswordNotification.php` - Email notification
- `database/migrations/2025_11_27_140603_create_password_resets_table.php` - Migration
- `routes/api.php` - Added 3 routes
- `.env` - Updated MAIL configuration

### Frontend (React)
- `resources/react/src/pages/ForgotPasswordPage.tsx` - New page
- `resources/react/src/pages/ResetPasswordPage.tsx` - New page
- `resources/react/src/components/ChangePasswordModal.tsx` - New modal
- `resources/react/src/features/auth/components/LoginForm.tsx` - Added forgot password link
- `resources/react/src/features/user/components/UserDropdown.tsx` - Added change password menu
- `resources/react/src/config/api.ts` - Added 3 API endpoints
- `resources/react/src/App.jsx` - Added 2 routes

## Troubleshooting

### Email không gửi được
1. Kiểm tra Gmail SMTP settings trong `.env`
2. Đảm bảo App Password được nhập đúng (không có khoảng trắng)
3. Kiểm tra Gmail có bật "Less secure app access" hoặc "2-Step Verification"
4. Xem Laravel logs: `storage/logs/laravel.log`

### Token không hợp lệ
1. Token có thể đã expire (60 phút)
2. Yêu cầu forgot password lại để nhận token mới

### Không nhận được email
1. Kiểm tra spam folder
2. Kiểm tra email address có đúng không
3. Xem Laravel logs để debug
