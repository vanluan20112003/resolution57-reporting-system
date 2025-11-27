-- =====================================================
-- NQ57 PORTAL - COMPLETE DATABASE SCHEMA
-- Database: nq57_portal
-- Engine: MySQL 8.0+
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- Total Tables: 14
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- PHASE 1: CORE SYSTEM (7 tables)
-- =====================================================

-- 1. organizations
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã đơn vị: HCMUT, UIT...',
  `name` VARCHAR(255) NOT NULL COMMENT 'Tên đầy đủ',
  `short_name` VARCHAR(100) DEFAULT NULL COMMENT 'Tên viết tắt',
  `type` VARCHAR(50) NOT NULL COMMENT 'UNIVERSITY, INSTITUTE, CENTER, OFFICE, EXTERNAL, OTHER',
  `parent_id` CHAR(36) DEFAULT NULL COMMENT 'Đơn vị cha',
  `is_vnuhcm` TINYINT(1) DEFAULT 1 COMMENT 'Thuộc ĐHQG',
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `contact_phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `website` VARCHAR(500) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, inactive',
  `display_order` INT DEFAULT 0 COMMENT 'Thứ tự hiển thị',
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_code` (`code`),
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_vnuhcm_status` (`is_vnuhcm`, `status`),

  FOREIGN KEY (`parent_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý đơn vị (trường, viện, trung tâm)';

-- 2. users (cập nhật bảng có sẵn)
DROP TABLE IF EXISTS `nq57_users`;
CREATE TABLE `nq57_users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) DEFAULT NULL COMMENT 'NULL nếu SSO',
  `first_name` VARCHAR(100) NOT NULL COMMENT 'Tên',
  `last_name` VARCHAR(100) NOT NULL COMMENT 'Họ',
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT 'Avatar URL từ Google',
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `google_id` VARCHAR(255) DEFAULT NULL COMMENT 'Google OAuth User ID',
  `is_vnuhcm` TINYINT(1) DEFAULT 0 COMMENT 'Thuộc ĐHQG',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, inactive, locked',
  `employee_id` VARCHAR(50) DEFAULT NULL COMMENT 'Mã nhân viên',
  `role` VARCHAR(20) NOT NULL COMMENT 'GUEST, STAFF, MANAGER, OPERATOR, ADMIN',
  `organization_id` CHAR(36) DEFAULT NULL COMMENT 'NULL cho OPERATOR/ADMIN',
  `manager_id` CHAR(36) DEFAULT NULL COMMENT 'NULL trừ STAFF',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_email` (`email`),
  INDEX `idx_google_id` (`google_id`),
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_status_role` (`status`, `role`),
  INDEX `idx_organization_id` (`organization_id`),
  INDEX `idx_manager_id` (`manager_id`),

  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`manager_id`) REFERENCES `nq57_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý người dùng';

-- 3. activity_types
DROP TABLE IF EXISTS `activity_types`;
CREATE TABLE `activity_types` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên loại hoạt động',
  `description` TEXT DEFAULT NULL,
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_name` (`name`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loại hoạt động (Chương trình, Đề án, Dự án...)';

-- 4. activity_fields
DROP TABLE IF EXISTS `activity_fields`;
CREATE TABLE `activity_fields` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Tên lĩnh vực',
  `description` TEXT DEFAULT NULL,
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_name` (`name`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lĩnh vực hoạt động (AI, Bán dẫn, Sinh học...)';

-- 5. kpis
DROP TABLE IF EXISTS `kpis`;
CREATE TABLE `kpis` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `source` VARCHAR(50) NOT NULL COMMENT 'CENTRAL (Trung ương), VNU (ĐHQG)',
  `code` VARCHAR(100) DEFAULT NULL COMMENT 'Mã KPI',
  `title` VARCHAR(500) NOT NULL COMMENT 'Tiêu đề KPI',
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(255) DEFAULT NULL COMMENT 'Nhóm KPI',
  `order_number` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_source` (`source`),
  INDEX `idx_code` (`code`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chỉ tiêu KPI từ Trung ương và ĐHQG';

-- 6. file_types
DROP TABLE IF EXISTS `file_types`;
CREATE TABLE `file_types` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã loại file',
  `name` VARCHAR(100) NOT NULL COMMENT 'Tên loại',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loại file (Minh chứng, Điểm danh, Báo cáo...)';

-- 7. settings
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `key` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Key cấu hình',
  `value` TEXT DEFAULT NULL COMMENT 'Giá trị',
  `value_type` VARCHAR(50) NOT NULL COMMENT 'string, number, boolean, json',
  `category` VARCHAR(100) DEFAULT NULL COMMENT 'Nhóm cấu hình',
  `description` TEXT DEFAULT NULL,
  `is_public` TINYINT(1) DEFAULT 0 COMMENT 'Hiển thị public',
  `updated_by` CHAR(36) DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_key` (`key`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cấu hình hệ thống';

-- =====================================================
-- PHASE 2: ACTIVITY MANAGEMENT (4 tables)
-- =====================================================

-- 8. activities
DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã hoạt động',
  `title` VARCHAR(500) NOT NULL COMMENT 'Tên hoạt động',
  `description` TEXT DEFAULT NULL,
  `activity_type_id` CHAR(36) NOT NULL,
  `activity_field_id` CHAR(36) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, PENDING_APPROVAL, IN_PROGRESS, ON_HOLD, CANCELLED, COMPLETED',
  `lead_organization_id` CHAR(36) NOT NULL COMMENT 'Đơn vị chủ trì',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `actual_start_date` DATE DEFAULT NULL,
  `actual_end_date` DATE DEFAULT NULL,
  `budget` DECIMAL(15,2) DEFAULT NULL COMMENT 'Kinh phí (VND)',
  `budget_source` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(500) DEFAULT NULL,
  `external_url` VARCHAR(1000) DEFAULT NULL COMMENT 'Link PMS/hệ thống ngoài',
  `created_by` CHAR(36) NOT NULL COMMENT 'Người tạo (STAFF)',
  `approved_by` CHAR(36) DEFAULT NULL COMMENT 'Người phê duyệt (MANAGER)',
  `approved_at` DATETIME DEFAULT NULL,
  `updated_by` CHAR(36) DEFAULT NULL,
  `is_locked` TINYINT(1) DEFAULT 0 COMMENT 'Khóa chỉnh sửa',
  `locked_at` DATETIME DEFAULT NULL,
  `locked_by` CHAR(36) DEFAULT NULL,
  `completion_percentage` INT DEFAULT 0 COMMENT '% hoàn thành (0-100)',
  `result_summary` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_code` (`code`),
  INDEX `idx_status_type` (`status`, `activity_type_id`),
  INDEX `idx_lead_org` (`lead_organization_id`),
  INDEX `idx_creator` (`created_by`, `created_at`),
  INDEX `idx_dates` (`start_date`, `end_date`),
  INDEX `idx_field` (`activity_field_id`),
  INDEX `idx_status` (`status`),

  FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`),
  FOREIGN KEY (`activity_field_id`) REFERENCES `activity_fields`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`lead_organization_id`) REFERENCES `organizations`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hoạt động triển khai NQ57';

-- 9. activity_kpis
DROP TABLE IF EXISTS `activity_kpis`;
CREATE TABLE `activity_kpis` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `activity_id` CHAR(36) NOT NULL,
  `kpi_id` CHAR(36) NOT NULL,
  `contribution_description` TEXT DEFAULT NULL COMMENT 'Mô tả cách đóng góp',
  `target_value` VARCHAR(255) DEFAULT NULL COMMENT 'Chỉ tiêu',
  `actual_value` VARCHAR(255) DEFAULT NULL COMMENT 'Kết quả',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_activity` (`activity_id`),
  INDEX `idx_kpi` (`kpi_id`),
  UNIQUE INDEX `idx_activity_kpi` (`activity_id`, `kpi_id`),

  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`kpi_id`) REFERENCES `kpis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Liên kết hoạt động với KPI';

-- 10. activity_organizations
DROP TABLE IF EXISTS `activity_organizations`;
CREATE TABLE `activity_organizations` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `activity_id` CHAR(36) NOT NULL,
  `organization_id` CHAR(36) NOT NULL,
  `role` VARCHAR(20) NOT NULL COMMENT 'LEAD, CO_LEAD, PARTNER',
  `description` TEXT DEFAULT NULL COMMENT 'Mô tả vai trò cụ thể',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_activity` (`activity_id`),
  INDEX `idx_organization` (`organization_id`),
  UNIQUE INDEX `idx_activity_org` (`activity_id`, `organization_id`),

  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đơn vị tham gia hoạt động';

-- 11. activity_files
DROP TABLE IF EXISTS `activity_files`;
CREATE TABLE `activity_files` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `activity_id` CHAR(36) NOT NULL,
  `file_type_id` CHAR(36) NOT NULL,
  `file_name` VARCHAR(500) NOT NULL COMMENT 'Tên file gốc',
  `file_path` VARCHAR(1000) NOT NULL COMMENT 'Đường dẫn storage',
  `file_size` BIGINT NOT NULL COMMENT 'Kích thước (bytes)',
  `file_extension` VARCHAR(20) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `uploaded_by` CHAR(36) NOT NULL,
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_public` TINYINT(1) DEFAULT 0,

  INDEX `idx_activity_type` (`activity_id`, `file_type_id`),
  INDEX `idx_uploader` (`uploaded_by`, `uploaded_at`),

  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`file_type_id`) REFERENCES `file_types`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File đính kèm hoạt động';

-- =====================================================
-- PHASE 3: COLLABORATION (1 table)
-- =====================================================

-- 12. activity_participants
DROP TABLE IF EXISTS `activity_participants`;
CREATE TABLE `activity_participants` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `activity_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL COMMENT 'NULL nếu người ngoài',
  `external_name` VARCHAR(255) DEFAULT NULL,
  `external_email` VARCHAR(255) DEFAULT NULL,
  `external_phone` VARCHAR(50) DEFAULT NULL,
  `external_organization` VARCHAR(255) DEFAULT NULL,
  `role` VARCHAR(20) NOT NULL COMMENT 'COORDINATOR, MEMBER, SPEAKER, ATTENDEE',
  `invited_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `invitation_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, ACCEPTED, DECLINED',
  `responded_at` DATETIME DEFAULT NULL,
  `attended` TINYINT(1) DEFAULT NULL,
  `attendance_time` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,

  INDEX `idx_activity_user` (`activity_id`, `user_id`),
  INDEX `idx_activity_status` (`activity_id`, `invitation_status`),
  INDEX `idx_external_email` (`external_email`),

  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người tham gia hoạt động';

-- =====================================================
-- PHASE 4: REPORTING & NOTIFICATION (2 tables)
-- =====================================================

-- 13. notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT 'Người nhận',
  `title` VARCHAR(500) NOT NULL,
  `message` TEXT NOT NULL,
  `notification_type` VARCHAR(100) NOT NULL COMMENT 'ACTIVITY_CREATED, APPROVAL_REQUEST...',
  `related_entity_type` VARCHAR(100) DEFAULT NULL COMMENT 'activity, user, kpi...',
  `related_entity_id` CHAR(36) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_user_read` (`user_id`, `is_read`, `created_at`),
  INDEX `idx_type` (`notification_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo trong app';

-- 14. reports
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `title` VARCHAR(500) NOT NULL,
  `report_type` VARCHAR(100) NOT NULL COMMENT 'ACTIVITY_SUMMARY, KPI_PROGRESS...',
  `organization_id` CHAR(36) DEFAULT NULL COMMENT 'NULL = báo cáo toàn ĐHQG',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `filters` JSON DEFAULT NULL COMMENT 'Bộ lọc áp dụng',
  `file_path` VARCHAR(1000) DEFAULT NULL,
  `generated_by` CHAR(36) NOT NULL,
  `generated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, COMPLETED, FAILED',

  INDEX `idx_org` (`organization_id`, `generated_at`),
  INDEX `idx_generator` (`generated_by`, `generated_at`),
  INDEX `idx_status` (`status`, `generated_at`),

  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử báo cáo';

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- =====================================================

-- Đã tạo các indexes trong từng bảng ở trên

-- =====================================================
-- COMPLETE!
-- =====================================================
