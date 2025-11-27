<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

/**
 * Middleware kiểm tra vai trò (role) của user
 *
 * Sử dụng:
 * Route::middleware(['auth:sanctum', 'role:ADMIN,OPERATOR'])->group(function () {
 *     // Chỉ ADMIN và OPERATOR được truy cập
 * });
 */
class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Danh sách các role được phép (ADMIN, OPERATOR, MANAGER, STAFF, GUEST)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Kiểm tra user đã đăng nhập chưa
        if (!$request->user()) {
            Log::warning('CheckRole: Unauthenticated access attempt', [
                'path' => $request->path(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated. Please login first.',
            ], 401);
        }

        $userRole = $request->user()->role;

        // Kiểm tra role của user có trong danh sách cho phép không
        if (!in_array($userRole, $roles)) {
            Log::warning('CheckRole: Unauthorized access attempt', [
                'user_id' => $request->user()->id,
                'user_email' => $request->user()->email,
                'user_role' => $userRole,
                'required_roles' => $roles,
                'path' => $request->path(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. You do not have permission to access this resource.',
                'required_roles' => $roles,
                'your_role' => $userRole,
            ], 403);
        }

        Log::info('CheckRole: Access granted', [
            'user_id' => $request->user()->id,
            'user_role' => $userRole,
            'path' => $request->path(),
        ]);

        return $next($request);
    }
}
