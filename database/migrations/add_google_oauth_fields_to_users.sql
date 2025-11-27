-- =====================================================
-- Migration: Add Google OAuth fields to nq57_users table
-- Date: 2025-11-26
-- Description: Thêm các trường google_id và avatar cho Google OAuth
-- =====================================================

USE nq57_portal;

-- Thêm cột google_id nếu chưa có
ALTER TABLE `nq57_users`
ADD COLUMN IF NOT EXISTS `google_id` VARCHAR(255) DEFAULT NULL COMMENT 'Google OAuth User ID' AFTER `avatar_url`;

-- Thêm cột avatar nếu chưa có
ALTER TABLE `nq57_users`
ADD COLUMN IF NOT EXISTS `avatar` VARCHAR(500) DEFAULT NULL COMMENT 'Avatar URL từ Google' AFTER `phone`;

-- Thêm index cho google_id
ALTER TABLE `nq57_users`
ADD INDEX IF NOT EXISTS `idx_google_id` (`google_id`);

-- Hiển thị cấu trúc bảng sau khi cập nhật
DESCRIBE `nq57_users`;

-- Verify
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'nq57_portal'
  AND TABLE_NAME = 'nq57_users'
  AND COLUMN_NAME IN ('google_id', 'avatar')
ORDER BY ORDINAL_POSITION;
