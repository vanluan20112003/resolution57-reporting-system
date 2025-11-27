<?php

namespace App\Traits;

/**
 * Trait HasPermissions
 *
 * Cung cấp các helper methods để kiểm tra permissions trong Model hoặc Controller
 *
 * Usage trong Model:
 * class User extends Model {
 *     use HasPermissions;
 * }
 *
 * Sử dụng:
 * $user->hasRole('ADMIN');
 * $user->hasAnyRole(['ADMIN', 'OPERATOR']);
 * $user->hasPermission('users.create');
 * $user->can('users.update');
 */
trait HasPermissions
{
    /**
     * Mapping permissions theo role
     * Nên sync với CheckPermission middleware
     */
    protected static array $rolePermissionsMap = [
        'ADMIN' => ['*'], // All permissions
        'OPERATOR' => [
            'users.view', 'users.create', 'users.update', 'users.delete',
            'activities.view', 'activities.create', 'activities.update',
            'organizations.view', 'organizations.create', 'organizations.update',
            'projects.view', 'projects.create', 'projects.update',
            'reports.view', 'reports.create',
        ],
        'MANAGER' => [
            'users.view',
            'activities.view', 'activities.create', 'activities.update',
            'organizations.view',
            'projects.view', 'projects.create', 'projects.update',
            'reports.view', 'reports.create',
        ],
        'STAFF' => [
            'activities.view', 'activities.create',
            'projects.view',
            'reports.view',
        ],
        'GUEST' => [
            'activities.view',
            'projects.view',
        ],
    ];

    /**
     * Kiểm tra user có role cụ thể không
     *
     * @param  string  $role
     * @return bool
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Kiểm tra user có bất kỳ role nào trong danh sách không
     *
     * @param  array  $roles
     * @return bool
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Kiểm tra user có tất cả roles trong danh sách không
     *
     * @param  array  $roles
     * @return bool
     */
    public function hasAllRoles(array $roles): bool
    {
        // Vì mỗi user chỉ có 1 role, method này chỉ return true nếu danh sách có 1 role
        return count($roles) === 1 && $this->hasRole($roles[0]);
    }

    /**
     * Kiểm tra user có permission cụ thể không
     *
     * @param  string  $permission
     * @return bool
     */
    public function hasPermission(string $permission): bool
    {
        $userPermissions = self::$rolePermissionsMap[$this->role] ?? [];

        // ADMIN có wildcard
        if (in_array('*', $userPermissions)) {
            return true;
        }

        return in_array($permission, $userPermissions);
    }

    /**
     * Kiểm tra permission với cú pháp tương tự Laravel's can()
     * Sử dụng: $user->canDo('users.create')
     *
     * @param  string  $permission
     * @return bool
     */
    public function canDo(string $permission): bool
    {
        return $this->hasPermission($permission);
    }

    /**
     * Kiểm tra user có bất kỳ permission nào trong danh sách không
     *
     * @param  array  $permissions
     * @return bool
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra user có tất cả permissions trong danh sách không
     *
     * @param  array  $permissions
     * @return bool
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Lấy tất cả permissions của user hiện tại
     *
     * @return array
     */
    public function getPermissions(): array
    {
        return self::$rolePermissionsMap[$this->role] ?? [];
    }

    /**
     * Kiểm tra user có phải ADMIN không
     *
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('ADMIN');
    }

    /**
     * Kiểm tra user có phải OPERATOR không
     *
     * @return bool
     */
    public function isOperator(): bool
    {
        return $this->hasRole('OPERATOR');
    }

    /**
     * Kiểm tra user có phải MANAGER không
     *
     * @return bool
     */
    public function isManager(): bool
    {
        return $this->hasRole('MANAGER');
    }

    /**
     * Kiểm tra user có quyền quản lý users không
     *
     * @return bool
     */
    public function canManageUsers(): bool
    {
        return $this->hasAnyRole(['ADMIN', 'OPERATOR']);
    }

    /**
     * Kiểm tra user có quyền quản lý activities không
     *
     * @return bool
     */
    public function canManageActivities(): bool
    {
        return $this->hasPermission('activities.update');
    }

    /**
     * Kiểm tra user có quyền tạo projects không
     *
     * @return bool
     */
    public function canCreateProjects(): bool
    {
        return $this->hasPermission('projects.create');
    }
}
