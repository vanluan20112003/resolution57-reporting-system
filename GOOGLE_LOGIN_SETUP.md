# 🔐 Google Login Setup - Complete Guide

## ✅ Đã hoàn thành

### 1. Backend (Laravel)
- ✅ Cài đặt Laravel Socialite package
- ✅ Cấu hình Google OAuth credentials trong `.env`
- ✅ Tạo `config/services.php` với Google config
- ✅ Thêm `google_id` và `avatar` columns vào bảng `nq57_users`
- ✅ Update User Model để map đúng bảng `nq57_users`
- ✅ Tạo `GoogleAuthController` với các methods:
  - `redirectToGoogle()` - Lấy Google OAuth URL
  - `handleGoogleCallbackWeb()` - Xử lý callback từ Google
  - `logout()` - Đăng xuất
  - `me()` - Lấy thông tin user hiện tại
- ✅ Tạo API routes tại `/api/v1/auth/google/*`

### 2. Frontend (React)
- ✅ Thêm nút "Đăng nhập bằng Google" vào LoginPage
- ✅ Tạo GoogleCallbackPage để xử lý callback
- ✅ Update App.jsx với routes cho callback
- ✅ Styling cho Google button (màu đỏ Google brand)

---

## 🔧 Cấu hình hiện tại

### Google OAuth Credentials
```env
GOOGLE_CLIENT_ID=your-google-client-id-from-google-cloud-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-google-cloud-console
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

**⚠️ QUAN TRỌNG**:
- Không bao giờ commit Client ID và Client Secret thật vào Git
- Sử dụng giá trị thật trong file `.env` (file này đã được gitignore)
- File này chỉ là ví dụ, thay thế bằng credentials thật của bạn từ Google Cloud Console

### Authorized Redirect URIs trên Google Cloud Console
```
http://localhost:5000/auth/google/callback
http://localhost:5000/auth/callback
http://localhost:8000/auth/google/callback
```

### Authorized JavaScript Origins
```
http://localhost
http://localhost:5000
http://localhost:8000
```

---

## 🚀 Cách test Google Login

### Bước 1: Đảm bảo services đang chạy

```bash
# Kiểm tra Docker containers
docker compose ps

# Nên thấy tất cả containers đang UP:
# - nq57_frontend (port 5000)
# - nq57_nginx (port 8000)
# - nq57_mysql (port 3306)
# - nq57_app (PHP-FPM)
```

### Bước 2: Truy cập trang Login

1. Mở trình duyệt: `http://localhost:5000`
2. Hoặc trực tiếp: `http://localhost:5000/login`

### Bước 3: Click nút "Đăng nhập bằng Google"

Flow sẽ diễn ra như sau:

```
1. User click "Đăng nhập bằng Google"
   ↓
2. Frontend gọi: GET http://localhost:8000/api/v1/auth/google/redirect
   ↓
3. Backend trả về Google OAuth URL
   ↓
4. Frontend redirect user đến Google login page
   ↓
5. User đăng nhập với Google account
   ↓
6. Google redirect về: http://localhost:8000/api/v1/auth/google/callback?code=...
   ↓
7. Backend (GoogleAuthController):
   - Exchange code for access token
   - Get user info from Google
   - Tạo/Update user trong bảng nq57_users
   - Tạo Sanctum token
   ↓
8. Backend redirect về: http://localhost:5000/auth/callback?token=xxx&user=...
   ↓
9. Frontend (GoogleCallbackPage):
   - Lưu token vào localStorage
   - Lưu user info
   - Redirect đến /dashboard
```

### Bước 4: Kiểm tra kết quả

#### Trong Browser
- Mở DevTools → Application → Local Storage → `http://localhost:5000`
- Nên thấy:
  - `access_token`: Bearer token từ Sanctum
  - `user`: JSON object với thông tin user

#### Trong Database
```bash
# Vào MySQL container
docker compose exec mysql mysql -u nq57_user -pnq57_password nq57_portal

# Kiểm tra user vừa tạo
SELECT id, email, google_id, first_name, last_name, role, status
FROM nq57_users
ORDER BY created_at DESC
LIMIT 1;
```

Nên thấy user mới với:
- `email`: Email Google của bạn
- `google_id`: Google user ID (dạng số dài)
- `first_name`, `last_name`: Từ Google account name
- `role`: GUEST
- `status`: active

---

## 🐛 Troubleshooting

### Lỗi: "redirect_uri_mismatch"

**Nguyên nhân:** Redirect URI trong code không khớp với Google Cloud Console

**Giải pháp:**
1. Vào https://console.cloud.google.com/
2. APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Kiểm tra "Authorized redirect URIs" có đúng:
   - `http://localhost:8000/api/v1/auth/google/callback`

### Lỗi: "CORS policy"

**Nguyên nhân:** Backend không cho phép request từ Frontend

**Giải pháp:**
Kiểm tra `config/cors.php` có:
```php
'allowed_origins' => ['http://localhost:5000'],
```

### Lỗi: "SQLSTATE[42S22]: Column not found: google_id"

**Nguyên nhân:** Chưa có column `google_id` trong bảng `nq57_users`

**Giải pháp:**
```bash
docker compose exec -T mysql mysql -u nq57_user -pnq57_password nq57_portal -e "
ALTER TABLE nq57_users
ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email,
ADD COLUMN avatar VARCHAR(255) NULL AFTER google_id;
"
```

### Lỗi: "Unauthenticated" khi vào Dashboard

**Nguyên nhân:** Token không được gửi kèm request

**Giải pháp:**
Frontend cần thêm header:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
}
```

---

## 📝 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/google/redirect` | Lấy Google OAuth URL |
| GET | `/api/v1/auth/google/callback` | Callback từ Google (xử lý code) |

### Protected Endpoints (cần Bearer token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/me` | Lấy thông tin user hiện tại |
| POST | `/api/v1/auth/logout` | Đăng xuất (xóa token) |

---

## 🔒 Security Notes

1. **HTTPS trong Production:**
   - Khi deploy production, PHẢI dùng HTTPS
   - Update Google OAuth redirect URIs sang HTTPS
   - Update `FRONTEND_URL` và `GOOGLE_REDIRECT_URI` trong `.env`

2. **Client Secret:**
   - KHÔNG commit `.env` vào Git
   - Client Secret đã được gitignore

3. **Token Storage:**
   - Hiện tại dùng localStorage (OK cho development)
   - Production nên dùng httpOnly cookies

4. **CORS:**
   - Chỉ cho phép origins cần thiết
   - Production: chỉ domain chính thức

---

## ✅ Checklist Test

- [ ] Click "Đăng nhập bằng Google" → Redirect đến Google
- [ ] Đăng nhập Google thành công
- [ ] Redirect về `/auth/callback` với token
- [ ] Token được lưu vào localStorage
- [ ] User info được lưu vào localStorage
- [ ] Redirect đến `/dashboard` thành công
- [ ] Dashboard hiển thị thông tin user
- [ ] User được tạo trong database `nq57_users`
- [ ] `google_id` và `avatar` được lưu đúng
- [ ] Logout thành công và xóa token

---

## 🎉 Hoàn thành!

Google Login đã được tích hợp hoàn toàn vào NQ57 Portal.

**Next Steps:**
1. Test flow từ đầu đến cuối
2. Kiểm tra user trong database
3. Test logout
4. Thêm role-based access control nếu cần
