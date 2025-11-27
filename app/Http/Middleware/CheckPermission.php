<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

/**
 * Middleware kiểm tra quyền hạn chi tiết của user
 *
 * Định nghĩa permissions theo format: resource.action
 * Ví dụ: users.create, users.update, users.delete, activities.manage, etc.
 *
 * Sử dụng:
 * Route::middleware(['auth:sanctum', 'permission:users.create'])->post('/users', ...);
 * Route::middleware(['auth:sanctum', 'permission:users.update,users.delete'])->group(...);
 */
class CheckPermission
{
    /**
     * Mapping permissions theo role
     * Có thể chuyển sang database hoặc config file sau này
     */
    protected array $rolePermissions = [
        'ADMIN' => [
            '*', // ADMIN có tất cả quyền
        ],
        'OPERATOR' => [
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'activities.view',
            'activities.create',
            'activities.update',
            'organizations.view',
            'organizations.create',
            'organizations.update',
            'projects.view',
            'projects.create',
            'projects.update',
            'reports.view',
            'reports.create',
        ],
        'MANAGER' => [
            'users.view',
            'activities.view',
            'activities.create',
            'activities.update',
            'organizations.view',
            'projects.view',
            'projects.create',
            'projects.update',
            'reports.view',
            'reports.create',
        ],
        'STAFF' => [
            'activities.view',
            'activities.create',
            'projects.view',
            'reports.view',
        ],
        'GUEST' => [
            'activities.view',
            'projects.view',
        ],
    ];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions  Danh sách permissions cần kiểm tra
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        // Kiểm tra user đã đăng nhập chưa
        if (!$request->user()) {
            Log::warning('CheckPermission: Unauthenticated access attempt', [
                'path' => $request->path(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated. Please login first.',
            ], 401);
        }

        $userRole = $request->user()->role;
        $userPermissions = $this->rolePermissions[$userRole] ?? [];

        // ADMIN có tất cả quyền (wildcard *)
        if (in_array('*', $userPermissions)) {
            Log::info('CheckPermission: Access granted (ADMIN wildcard)', [
                'user_id' => $request->user()->id,
                'user_role' => $userRole,
                'path' => $request->path(),
            ]);
            return $next($request);
        }

        // Kiểm tra user có ít nhất 1 permission được yêu cầu không
        $hasPermission = false;
        foreach ($permissions as $permission) {
            if (in_array($permission, $userPermissions)) {
                $hasPermission = true;
                break;
            }
        }

        if (!$hasPermission) {
            Log::warning('CheckPermission: Unauthorized access attempt', [
                'user_id' => $request->user()->id,
                'user_email' => $request->user()->email,
                'user_role' => $userRole,
                'user_permissions' => $userPermissions,
                'required_permissions' => $permissions,
                'path' => $request->path(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. You do not have the required permissions.',
                'required_permissions' => $permissions,
                'your_role' => $userRole,
            ], 403);
        }

        Log::info('CheckPermission: Access granted', [
            'user_id' => $request->user()->id,
            'user_role' => $userRole,
            'granted_permissions' => array_intersect($permissions, $userPermissions),
            'path' => $request->path(),
        ]);

        return $next($request);
    }

    /**
     * Lấy danh sách permissions của một role
     *
     * @param  string  $role
     * @return array
     */
    public function getRolePermissions(string $role): array
    {
        return $this->rolePermissions[$role] ?? [];
    }

    /**
     * Kiểm tra một role có permission cụ thể không
     *
     * @param  string  $role
     * @param  string  $permission
     * @return bool
     */
    public function roleHasPermission(string $role, string $permission): bool
    {
        $permissions = $this->rolePermissions[$role] ?? [];

        // Wildcard check
        if (in_array('*', $permissions)) {
            return true;
        }

        return in_array($permission, $permissions);
    }
}
