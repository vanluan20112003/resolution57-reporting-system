-- =====================================================
-- Seed Users for Testing
-- =====================================================

USE nq57_portal;

-- Insert sample users (password for all is 'password123')
-- Password hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- 1. Admin User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'admin@vnuhcm.edu.vn',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Quản Trị',
    'Hệ Thống',
    '0901234567',
    NULL,
    NULL,
    NULL,
    1,
    'active',
    'ADMIN001',
    'ADMIN',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 2. Operator User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'operator@vnuhcm.edu.vn',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Vận Hành',
    'Viên',
    '0901234568',
    NULL,
    NULL,
    NULL,
    1,
    'active',
    'OP001',
    'OPERATOR',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 3. Manager User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'manager@vnuhcm.edu.vn',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Quản Lý',
    'Phòng Ban',
    '0901234569',
    NULL,
    NULL,
    NULL,
    1,
    'active',
    'MGR001',
    'MANAGER',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 4. Staff User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'staff@vnuhcm.edu.vn',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Nhân Viên',
    'Văn Phòng',
    '0901234570',
    NULL,
    NULL,
    NULL,
    1,
    'active',
    'STAFF001',
    'STAFF',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 5. Guest User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'guest@example.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Khách',
    'Mời',
    '0901234571',
    NULL,
    NULL,
    NULL,
    0,
    'active',
    NULL,
    'GUEST',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 6. Inactive User
INSERT INTO `nq57_users` (
    `id`,
    `email`,
    `password_hash`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `avatar_url`,
    `google_id`,
    `is_vnuhcm`,
    `status`,
    `employee_id`,
    `role`,
    `organization_id`,
    `manager_id`,
    `last_login_at`,
    `created_by`,
    `created_at`,
    `updated_at`
) VALUES (
    UUID(),
    'inactive@vnuhcm.edu.vn',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Tài Khoản',
    'Không Hoạt Động',
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    'inactive',
    'INACTIVE001',
    'STAFF',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

SELECT
    'Users seeded successfully!' as message,
    COUNT(*) as total_users
FROM nq57_users;

-- Show all users
SELECT
    email,
    CONCAT(first_name, ' ', last_name) as full_name,
    role,
    status,
    is_vnuhcm,
    created_at
FROM nq57_users
ORDER BY created_at DESC;
