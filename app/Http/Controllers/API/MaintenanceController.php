<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceSetting;
use App\Models\MaintenanceLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cookie;
use Laravel\Sanctum\PersonalAccessToken;

class MaintenanceController extends Controller
{
    /**
     * Get current maintenance status (public endpoint)
     */
    public function status(Request $request): JsonResponse
    {
        $settings = MaintenanceSetting::getSettings();

        // Check if user has bypass cookie or is admin
        $hasBypass = $this->hasBypassAccess($request, $settings);

        return response()->json([
            'success' => true,
            'data' => [
                'is_maintenance' => $settings->is_enabled && !$hasBypass,
                'has_bypass' => $hasBypass,
                ...$settings->getPublicInfo(),
            ],
        ]);
    }

    /**
     * Get full maintenance settings (admin only)
     */
    public function getSettings(): JsonResponse
    {
        $this->authorizeAdmin();

        $settings = MaintenanceSetting::getSettings();

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $settings,
                'bypass_url' => $settings->getBypassUrl(),
                'enabled_by' => $settings->enabledByUser ? [
                    'id' => $settings->enabledByUser->id,
                    'name' => $settings->enabledByUser->full_name,
                ] : null,
                'disabled_by' => $settings->disabledByUser ? [
                    'id' => $settings->disabledByUser->id,
                    'name' => $settings->disabledByUser->full_name,
                ] : null,
            ],
        ]);
    }

    /**
     * Update maintenance settings (admin only)
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'message' => 'sometimes|nullable|string|max:2000',
            'notification_type' => 'sometimes|in:info,warning,error',
            'estimated_end_time' => 'sometimes|nullable|date',
            'show_countdown' => 'sometimes|boolean',
            'allow_admin_access' => 'sometimes|boolean',
            'allowed_ips' => 'sometimes|array',
            'allowed_ips.*' => 'ip',
        ]);

        $settings = MaintenanceSetting::updateSettings(
            auth()->id(),
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật cài đặt bảo trì thành công',
            'data' => $settings,
        ]);
    }

    /**
     * Enable maintenance mode (admin only)
     */
    public function enable(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'message' => 'sometimes|nullable|string|max:2000',
            'notification_type' => 'sometimes|in:info,warning,error',
            'estimated_end_time' => 'sometimes|nullable|date',
            'show_countdown' => 'sometimes|boolean',
        ]);

        $settings = MaintenanceSetting::enable(auth()->id(), $validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã bật chế độ bảo trì',
            'data' => [
                'settings' => $settings,
                'bypass_url' => $settings->getBypassUrl(),
                'secret_key' => $settings->secret_key,
            ],
        ]);
    }

    /**
     * Disable maintenance mode (admin only)
     */
    public function disable(): JsonResponse
    {
        $this->authorizeAdmin();

        $settings = MaintenanceSetting::disable(auth()->id());

        return response()->json([
            'success' => true,
            'message' => 'Đã tắt chế độ bảo trì',
            'data' => $settings,
        ]);
    }

    /**
     * Toggle maintenance mode (admin only)
     */
    public function toggle(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $settings = MaintenanceSetting::getSettings();

        if ($settings->is_enabled) {
            return $this->disable();
        } else {
            return $this->enable($request);
        }
    }

    /**
     * Regenerate bypass secret key (admin only)
     */
    public function regenerateKey(): JsonResponse
    {
        $this->authorizeAdmin();

        $settings = MaintenanceSetting::getSettings();
        $newKey = $settings->regenerateSecretKey();

        // Log the action
        MaintenanceLog::create([
            'action' => 'key_regenerated',
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->full_name,
            'ip_address' => request()->ip(),
            'note' => 'Secret key đã được tạo mới',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo mới secret key',
            'data' => [
                'secret_key' => $newKey,
                'bypass_url' => $settings->getBypassUrl(),
            ],
        ]);
    }

    /**
     * Get maintenance logs (admin only)
     */
    public function getLogs(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $perPage = $request->input('per_page', 20);

        $logs = MaintenanceLog::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Bypass maintenance mode with secret key
     */
    public function bypass(Request $request, string $secretKey): JsonResponse
    {
        $settings = MaintenanceSetting::getSettings();

        if (!$settings->isValidSecretKey($secretKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Secret key không hợp lệ',
            ], 403);
        }

        // Set bypass cookie (valid for 24 hours)
        $cookie = Cookie::make(
            'maintenance_bypass',
            $secretKey,
            60 * 24, // 24 hours
            '/',
            null,
            false,
            true // httpOnly
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã bypass chế độ bảo trì',
            'data' => [
                'valid_until' => now()->addHours(24)->toISOString(),
            ],
        ])->withCookie($cookie);
    }

    /**
     * Check bypass status
     */
    public function checkBypass(Request $request): JsonResponse
    {
        $settings = MaintenanceSetting::getSettings();
        $hasBypass = $this->hasBypassAccess($request, $settings);

        return response()->json([
            'success' => true,
            'data' => [
                'has_bypass' => $hasBypass,
                'is_admin' => $this->isAdmin(),
                'maintenance_enabled' => $settings->is_enabled,
            ],
        ]);
    }

    /**
     * Check if request has bypass access
     */
    protected function hasBypassAccess(Request $request, MaintenanceSetting $settings): bool
    {
        // Check if user is admin and admin access is allowed
        if ($settings->allow_admin_access && $this->isAdmin($request)) {
            return true;
        }

        // Check bypass cookie
        $bypassKey = $request->cookie('maintenance_bypass');
        if ($bypassKey && $settings->isValidSecretKey($bypassKey)) {
            return true;
        }

        // Check if IP is whitelisted
        if ($settings->isIpAllowed($request->ip())) {
            return true;
        }

        // Check query parameter (for initial bypass)
        $queryKey = $request->query('bypass_key');
        if ($queryKey && $settings->isValidSecretKey($queryKey)) {
            return true;
        }

        return false;
    }

    /**
     * Check if current user is admin
     * Works with or without auth middleware by manually checking token
     */
    protected function isAdmin(?Request $request = null): bool
    {
        // First try normal auth
        $user = auth()->user();

        // If no user from normal auth, try to get from token manually
        // This is needed for public endpoints that don't have auth middleware
        if (!$user && $request) {
            $user = $this->getUserFromToken($request);
        }

        if (!$user) {
            return false;
        }

        // Role is stored as uppercase in database (ADMIN, OPERATOR, etc.)
        return strtoupper($user->role) === 'ADMIN';
    }

    /**
     * Get user from Bearer token manually (for public endpoints)
     */
    protected function getUserFromToken(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return null;
        }

        return $accessToken->tokenable;
    }

    /**
     * Authorize admin access
     */
    protected function authorizeAdmin(): void
    {
        if (!$this->isAdmin()) {
            abort(403, 'Chỉ admin mới có quyền quản lý chế độ bảo trì');
        }
    }
}
