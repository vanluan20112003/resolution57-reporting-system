# 🗄️ Hướng dẫn chạy Migrations cho NQ57 Database Schema

## 📋 Tổng quan

Hệ thống gồm **14 bảng** chia thành 4 phases:
- **Phase 1:** Core System (7 bảng)
- **Phase 2:** Activity Management (4 bảng)
- **Phase 3:** Collaboration (1 bảng)
- **Phase 4:** Reporting & Notification (2 bảng)

## 🚀 Các bước thực hiện

### Bước 1: Xóa migrations cũ (nếu cần)

```bash
# Rollback tất cả migrations
php artisan migrate:rollback --step=100

# Hoặc reset toàn bộ
php artisan migrate:reset

# Fresh start (xóa hết và tạo lại)
php artisan migrate:fresh
```

### Bước 2: Chạy migrations

```bash
# Chạy tất cả migrations
php artisan migrate

# Với seed data
php artisan migrate --seed

# Fresh migrate với seed
php artisan migrate:fresh --seed
```

### Bước 3: Kiểm tra

```bash
# Xem status migrations
php artisan migrate:status

# Kiểm tra database
mysql -u nq57_user -p nq57_portal
SHOW TABLES;
```

## 📦 Danh sách Migration Files (Đã tạo)

```
database/migrations/
├── 2014_10_12_000000_create_users_table.php (có sẵn)
├── 2014_10_12_100000_create_password_reset_tokens_table.php (có sẵn)
├── 2019_08_19_000000_create_failed_jobs_table.php (có sẵn)
├── 2019_12_14_000001_create_personal_access_tokens_table.php (có sẵn)
│
├── 2025_11_25_210613_create_organizations_table.php ✅
├── 2025_11_25_210614_create_activity_types_table.php ✅
├── 2025_11_25_210614_create_activity_fields_table.php ✅
├── 2025_11_25_210615_create_kpis_table.php ✅
├── 2025_11_25_210615_create_file_types_table.php ✅
├── 2025_11_25_210616_create_settings_table.php ✅
│
├── 2025_11_25_210626_create_activities_table.php ✅
├── 2025_11_25_210627_create_activity_kpis_table.php ✅
├── 2025_11_25_210627_create_activity_organizations_table.php ✅
├── 2025_11_25_210628_create_activity_files_table.php ✅
│
├── 2025_11_25_210629_create_activity_participants_table.php ✅
│
├── 2025_11_25_210629_create_notifications_table.php ✅
└── 2025_11_25_210630_create_reports_table.php ✅
```

## 🛠️ Lệnh tạo migrations (Đã chạy)

```bash
# Phase 1: Core System
php artisan make:migration create_organizations_table
php artisan make:migration create_activity_types_table
php artisan make:migration create_activity_fields_table
php artisan make:migration create_kpis_table
php artisan make:migration create_file_types_table
php artisan make:migration create_settings_table

# Phase 2: Activity Management
php artisan make:migration create_activities_table
php artisan make:migration create_activity_kpis_table
php artisan make:migration create_activity_organizations_table
php artisan make:migration create_activity_files_table

# Phase 3: Collaboration
php artisan make:migration create_activity_participants_table

# Phase 4: Reporting & Notification
php artisan make:migration create_notifications_table
php artisan make:migration create_reports_table
```

## 📝 Nội dung Migration (Xem file riêng)

Tôi đã tạo file SQL script riêng để bạn có thể:
1. Import trực tiếp vào MySQL
2. Hoặc copy vào các migration file Laravel

**File SQL:** `database/nq57_complete_schema.sql`

## 🔄 Quy trình làm việc khuyến nghị

### Option 1: Dùng Migration Files (Laravel)

```bash
# 1. Xóa migrations cũ không cần
cd D:\NQ57\database\migrations
# Giữ lại 4 file Laravel mặc định và các file NQ57 mới tạo

# 2. Copy nội dung từ SQL script vào migration files

# 3. Chạy migrations
php artisan migrate:fresh
```

### Option 2: Import trực tiếp từ SQL (Nhanh hơn)

```bash
# 1. Qua phpMyAdmin
# - Vào http://localhost:8080
# - Chọn database nq57_portal
# - Import tab → Chọn file nq57_complete_schema.sql

# 2. Hoặc qua command line
mysql -u nq57_user -pnq57_password nq57_portal < database/nq57_complete_schema.sql

# 3. Cập nhật migrations table để Laravel biết đã migrate
php artisan migrate:install
```

## ⚠️ Lưu ý quan trọng

1. **Foreign Keys:**
   - Phải tạo bảng cha trước bảng con
   - Migrations đã được sắp xếp theo thứ tự đúng

2. **UUID:**
   - Tất cả bảng dùng UUID làm primary key
   - Dùng `$table->uuid('id')->primary()` trong Laravel

3. **Timestamps:**
   - Mặc định có `created_at` và `updated_at`
   - Dùng `$table->timestamps()`

4. **Soft Deletes (Optional):**
   - Nếu cần soft delete, thêm: `$table->softDeletes()`

## 🎯 Next Steps

Sau khi tạo migrations xong:

1. **Tạo Seeders:**
   ```bash
   php artisan make:seeder OrganizationSeeder
   php artisan make:seeder ActivityTypeSeeder
   php artisan make:seeder ActivityFieldSeeder
   php artisan make:seeder KpiSeeder
   php artisan make:seeder FileTypeSeeder
   ```

2. **Tạo Models:**
   ```bash
   php artisan make:model Organization
   php artisan make:model Activity
   php artisan make:model ActivityType
   # ...
   ```

3. **Tạo Relationships trong Models**

4. **Tạo API Controllers & Routes**

---

**Tôi sẽ tạo file SQL script hoàn chỉnh trong file tiếp theo!**
