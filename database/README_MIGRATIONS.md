# 🗄️ NQ57 Database Migrations

## ✅ Đã tạo thành công!

### 📦 Files đã tạo:

1. **nq57_complete_schema.sql** - SQL script hoàn chỉnh (14 bảng)
2. **MIGRATION_COMMANDS.md** - Hướng dẫn chi tiết
3. **13 migration files Laravel** (2025_11_25_*)

---

## 🚀 Cách sử dụng - 2 Options

### ⚡ Option 1: Import SQL trực tiếp (NHANH NHẤT)

**Qua phpMyAdmin:**
```
1. Mở http://localhost:8080
2. Login: root / root_password
3. Chọn database: nq57_portal
4. Tab "Import"
5. Chọn file: nq57_complete_schema.sql
6. Click "Go"
```

**Qua Command Line:**
```bash
mysql -u nq57_user -pnq57_password nq57_portal < database/nq57_complete_schema.sql
```

### 🔧 Option 2: Dùng Laravel Migrations

```bash
# 1. Chạy tất cả migrations
php artisan migrate

# 2. Hoặc fresh start
php artisan migrate:fresh

# 3. Với seed data
php artisan migrate:fresh --seed
```

---

## 📊 Database Schema Overview

### PHASE 1: Core System (7 bảng)
✅ `organizations` - Đơn vị (trường, viện, trung tâm)
✅ `nq57_users` - Người dùng (GUEST, STAFF, MANAGER, OPERATOR, ADMIN)
✅ `activity_types` - Loại hoạt động
✅ `activity_fields` - Lĩnh vực
✅ `kpis` - Chỉ tiêu KPI
✅ `file_types` - Loại file
✅ `settings` - Cấu hình hệ thống

### PHASE 2: Activity Management (4 bảng)
✅ `activities` - Hoạt động chính
✅ `activity_kpis` - Liên kết hoạt động - KPI
✅ `activity_organizations` - Đơn vị tham gia
✅ `activity_files` - File đính kèm

### PHASE 3: Collaboration (1 bảng)
✅ `activity_participants` - Người tham gia

### PHASE 4: Reporting & Notification (2 bảng)
✅ `notifications` - Thông báo
✅ `reports` - Báo cáo

**Tổng cộng: 14 bảng**

---

## 🔑 Key Features

### UUID Primary Keys
Tất cả bảng dùng UUID (CHAR(36)) thay vì auto-increment INT

### Foreign Keys
Đầy đủ quan hệ giữa các bảng với ON DELETE CASCADE/SET NULL

### Indexes
Đã tạo indexes cho:
- Foreign keys
- Các cột thường query (status, type, email...)
- Composite indexes cho query phức tạp

### Timestamps
Tất cả bảng có `created_at` và `updated_at`

---

## 📝 Kiểm tra sau khi import

```sql
-- Xem tất cả bảng
SHOW TABLES;

-- Kiểm tra cấu trúc
DESCRIBE organizations;
DESCRIBE activities;

-- Đếm số bảng
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'nq57_portal';
-- Kết quả: 14 bảng

-- Kiểm tra Foreign Keys
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM
  information_schema.KEY_COLUMN_USAGE
WHERE
  TABLE_SCHEMA = 'nq57_portal'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## 🎯 Next Steps

### 1. Tạo Seeders (Master Data)

```bash
php artisan make:seeder DatabaseSeeder
php artisan make:seeder OrganizationSeeder
php artisan make:seeder ActivityTypeSeeder
php artisan make:seeder ActivityFieldSeeder
php artisan make:seeder KpiSeeder
php artisan make:seeder FileTypeSeeder
php artisan make:seeder UserSeeder
```

### 2. Tạo Models

```bash
php artisan make:model Organization
php artisan make:model Activity
php artisan make:model ActivityType
php artisan make:model ActivityField
php artisan make:model Kpi
php artisan make:model FileType
php artisan make:model ActivityKpi
php artisan make:model ActivityOrganization
php artisan make:model ActivityFile
php artisan make:model ActivityParticipant
php artisan make:model Notification
php artisan make:model Report
```

### 3. Define Relationships trong Models

Example: `Organization.php`
```php
public function users()
{
    return $this->hasMany(User::class);
}

public function activities()
{
    return $this->hasMany(Activity::class, 'lead_organization_id');
}

public function parent()
{
    return $this->belongsTo(Organization::class, 'parent_id');
}

public function children()
{
    return $this->hasMany(Organization::class, 'parent_id');
}
```

### 4. Tạo API Controllers & Routes

```bash
php artisan make:controller API/OrganizationController --api
php artisan make:controller API/ActivityController --api
php artisan make:controller API/KpiController --api
```

---

## 🔧 Troubleshooting

### Lỗi: Foreign key constraint fails

**Nguyên nhân:** Tạo bảng sai thứ tự

**Giải pháp:**
```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Import script
SET FOREIGN_KEY_CHECKS = 1;
```

### Lỗi: Table already exists

**Giải pháp:**
```sql
-- Drop tất cả bảng cũ
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS activity_participants;
DROP TABLE IF EXISTS activity_files;
DROP TABLE IF EXISTS activity_organizations;
DROP TABLE IF EXISTS activity_kpis;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS kpis;
DROP TABLE IF EXISTS file_types;
DROP TABLE IF EXISTS activity_fields;
DROP TABLE IF EXISTS activity_types;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS nq57_users;
DROP TABLE IF EXISTS organizations;

-- Rồi import lại
```

### Migration Laravel không chạy

**Kiểm tra:**
```bash
# Xem status
php artisan migrate:status

# Rollback
php artisan migrate:rollback

# Fresh start
php artisan migrate:fresh
```

---

## 📚 Tài liệu tham khảo

- **DATABASE_SCHEMA.md** - Mô tả chi tiết từng bảng
- **MIGRATION_COMMANDS.md** - Lệnh chi tiết
- **nq57_complete_schema.sql** - SQL script hoàn chỉnh

---

## ✅ Checklist

- [ ] Import SQL script vào database
- [ ] Kiểm tra 14 bảng đã tạo
- [ ] Kiểm tra Foreign Keys
- [ ] Tạo Seeders cho master data
- [ ] Tạo Models
- [ ] Define Relationships
- [ ] Tạo Controllers & Routes
- [ ] Test CRUD operations

---

**🎉 Chúc mừng! Database schema đã sẵn sàng!**
