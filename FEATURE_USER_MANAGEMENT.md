# User Management Feature - NQ57 Portal

## 📋 Tổng quan

Tính năng quản lý người dùng cho phép OPERATOR và ADMIN quản lý tất cả người dùng trong hệ thống NQ57 Portal.

## ✅ Đã hoàn thành

### 1. **Backend - Laravel API**

#### Controller: `app/Http/Controllers/API/UserController.php`
- ✅ Đầy đủ logging cho mọi hoạt động (Log::info, Log::warning, Log::error)
- ✅ Kiểm tra quyền truy cập (chỉ OPERATOR và ADMIN)
- ✅ Validation đầy đủ cho tất cả input
- ✅ Error handling với try-catch

**API Endpoints:**
```
GET    /api/v1/users           - Lấy danh sách users (có filter, search, pagination)
POST   /api/v1/users           - Tạo user mới
GET    /api/v1/users/{id}      - Chi tiết 1 user
PUT    /api/v1/users/{id}      - Update user
DELETE /api/v1/users/{id}      - Xóa user
```

**Tính năng:**
- Phân trang (pagination)
- Tìm kiếm theo email, first_name, last_name
- Lọc theo role, status, organization_id
- Ngăn user tự xóa chính mình
- Log đầy đủ mọi hành động (create, update, delete, fetch)

#### Routes: `routes/api.php`
```php
Route::middleware('auth:sanctum')->prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::post('/', [UserController::class, 'store']);
    Route::get('/{id}', [UserController::class, 'show']);
    Route::put('/{id}', [UserController::class, 'update']);
    Route::delete('/{id}', [UserController::class, 'destroy']);
});
```

### 2. **Frontend - React + TypeScript**

#### Component: `resources/react/src/components/UserManagement/UserManagement.tsx`
- ✅ Table hiển thị danh sách users với pagination
- ✅ Tìm kiếm real-time với debounce (500ms)
- ✅ Lọc theo role và status
- ✅ Modal form để thêm/sửa user
- ✅ Xác nhận trước khi xóa
- ✅ Tags màu cho role và status
- ✅ Loading states
- ✅ Error handling với notifications

**Tính năng UI:**
- Search bar với icon
- Dropdown filters (Role, Status)
- Buttons: Thêm, Sửa, Xóa, Làm mới
- Pagination với showSizeChanger
- Modal form với validation
- Responsive design

#### API Service: `resources/react/src/services/userApi.ts`
- ✅ TypeScript types đầy đủ
- ✅ Functions: getUsers, getUser, createUser, updateUser, deleteUser
- ✅ Authentication headers tự động
- ✅ Error handling

#### Dashboard Integration: `resources/react/src/pages/DashboardPage.tsx`
- ✅ Menu item "Quản lý người dùng" chỉ hiện với OPERATOR/ADMIN
- ✅ Sử dụng `useMemo` để check quyền động
- ✅ Icon UserOutlined
- ✅ Render UserManagement component khi chọn menu

### 3. **Database**

#### Schema Update: `database/nq57_complete_schema.sql`
Đã thêm các trường cho Google OAuth:
```sql
`avatar` VARCHAR(500) DEFAULT NULL COMMENT 'Avatar URL từ Google'
`google_id` VARCHAR(255) DEFAULT NULL COMMENT 'Google OAuth User ID'
INDEX `idx_google_id` (`google_id`)
```

#### Migration: `database/migrations/add_google_oauth_fields_to_users.sql`
Script để cập nhật bảng hiện có trên production:
```sql
ALTER TABLE `nq57_users`
ADD COLUMN IF NOT EXISTS `google_id` VARCHAR(255) DEFAULT NULL COMMENT 'Google OAuth User ID';
ADD COLUMN IF NOT EXISTS `avatar` VARCHAR(500) DEFAULT NULL COMMENT 'Avatar URL từ Google';
ADD INDEX IF NOT EXISTS `idx_google_id` (`google_id`);
```

#### Seed Data: `database/seeders/seed_users.sql`
Dữ liệu mẫu cho testing:
- Admin User (admin@vnuhcm.edu.vn)
- Operator User (operator@vnuhcm.edu.vn)
- Manager User (manager@vnuhcm.edu.vn)
- Staff User (staff@vnuhcm.edu.vn)
- Guest User (guest@example.com)
- Inactive User (inactive@vnuhcm.edu.vn)

**Password mặc định:** `password123`

## 🔒 Bảo mật

1. **Authorization:**
   - Chỉ OPERATOR và ADMIN có quyền truy cập
   - Check quyền ở cả frontend và backend
   - Không thể tự xóa chính mình

2. **Validation:**
   - Email phải unique
   - Email phải hợp lệ (format)
   - Password tối thiểu 8 ký tự
   - Role phải thuộc: GUEST, STAFF, MANAGER, OPERATOR, ADMIN
   - Status phải thuộc: active, inactive, locked

3. **Logging:**
   - Log mọi hành động: fetch, create, update, delete
   - Log thông tin user thực hiện
   - Log data trước và sau khi update
   - Log unauthorized attempts
   - Log validation failures
   - Log errors với stack trace

## 📊 Logging Format

### Fetch Users:
```
[INFO] === User Management: Fetch Users ===
- requester_id, requester_email, requester_role
- filters (search, role, status, etc.)
- total_users, current_page, per_page
```

### Create User:
```
[INFO] === User Management: Create User ===
- requester info
- new_user_data
- created_user_id, created_user_email, created_user_role
```

### Update User:
```
[INFO] === User Management: Update User ===
- requester info
- target_user_id
- old_data vs new_data
- updated_by
```

### Delete User:
```
[INFO] === User Management: Delete User ===
- requester info
- deleted_user info (id, email, role, status)
- deleted_by
```

## 🎨 UI/UX

### Colors:
- **Roles:**
  - ADMIN: red
  - OPERATOR: purple
  - MANAGER: blue
  - STAFF: green
  - GUEST: default (gray)

- **Status:**
  - active: success (green)
  - inactive: warning (orange)
  - locked: error (red)

### Table Columns:
1. Email
2. Họ và tên (first_name + last_name)
3. Vai trò (Tag với màu)
4. Trạng thái (Tag với màu)
5. VNUHCM (Tag: Có/Không)
6. Ngày tạo
7. Thao tác (Edit, Delete buttons)

## 🚀 Deployment

### Trên Server Ubuntu:

1. **Update database:**
```bash
mysql -u nq57_user -p nq57_portal < database/migrations/add_google_oauth_fields_to_users.sql
```

2. **Seed sample users:**
```bash
mysql -u nq57_user -p nq57_portal < database/seeders/seed_users.sql
```

3. **Clear Laravel cache:**
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

4. **Rebuild React frontend:**
```bash
cd resources/react
npm run build
```

5. **Check logs:**
```bash
tail -f storage/logs/laravel.log
```

## 🧪 Testing

### API Testing với curl:

1. **Login để lấy token:**
```bash
curl -X POST https://nq57.vnuhcm.edu.vn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vnuhcm.edu.vn","password":"password123"}'
```

2. **Get users list:**
```bash
curl https://nq57.vnuhcm.edu.vn/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Search users:**
```bash
curl "https://nq57.vnuhcm.edu.vn/api/v1/users?search=admin&role=ADMIN" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Create user:**
```bash
curl -X POST https://nq57.vnuhcm.edu.vn/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@vnuhcm.edu.vn",
    "first_name":"New",
    "last_name":"User",
    "role":"STAFF",
    "status":"active",
    "is_vnuhcm":true,
    "password":"password123"
  }'
```

5. **Update user:**
```bash
curl -X PUT https://nq57.vnuhcm.edu.vn/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

6. **Delete user:**
```bash
curl -X DELETE https://nq57.vnuhcm.edu.vn/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Notes

1. **Password mặc định:** Nếu không cung cấp password khi tạo user, hệ thống sẽ tự generate random password
2. **Pagination:** Mặc định 10 users/page, có thể thay đổi (10, 20, 50, 100)
3. **Search:** Debounce 500ms để tránh gọi API quá nhiều
4. **Filters:** Áp dụng ngay lập tức khi thay đổi
5. **Logs:** Xem trong `storage/logs/laravel.log`

## 🔧 Troubleshooting

### Lỗi 403 Unauthorized:
- Kiểm tra role của user đang login (phải là OPERATOR hoặc ADMIN)
- Kiểm tra token có hợp lệ không

### Lỗi 422 Validation:
- Kiểm tra email đã tồn tại chưa
- Kiểm tra format email
- Kiểm tra password tối thiểu 8 ký tự

### Không thấy menu "Quản lý người dùng":
- Đảm bảo user đang login có role OPERATOR hoặc ADMIN
- Rebuild frontend: `npm run build`

### API không trả về data:
- Kiểm tra database có data không (chạy seed_users.sql)
- Kiểm tra logs: `tail -f storage/logs/laravel.log`
- Kiểm tra CORS settings

## 📚 Files liên quan

### Backend:
- `app/Http/Controllers/API/UserController.php` - Controller
- `routes/api.php` - Routes
- `app/Models/User.php` - Model

### Frontend:
- `resources/react/src/components/UserManagement/UserManagement.tsx` - Component
- `resources/react/src/components/UserManagement/index.ts` - Export
- `resources/react/src/services/userApi.ts` - API Service
- `resources/react/src/pages/DashboardPage.tsx` - Integration

### Database:
- `database/nq57_complete_schema.sql` - Schema
- `database/migrations/add_google_oauth_fields_to_users.sql` - Migration
- `database/seeders/seed_users.sql` - Seed data

---

**Tạo bởi:** Claude AI
**Ngày:** 2025-11-27
**Version:** 1.0
