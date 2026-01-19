<?php

namespace App\Http\Middleware;

use App\Models\MaintenanceSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenance
{
    /**
     * Routes that should be excluded from maintenance check
     */
    protected array $excludedRoutes = [
        'api/v1/maintenance/status',
        'api/v1/maintenance/bypass/*',
        'api/v1/auth/login',
        'api/v1/auth/logout',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip maintenance check for excluded routes
        if ($this->isExcludedRoute($request)) {
            return $next($request);
        }

        $settings = MaintenanceSetting::getSettings();

        // If maintenance is not enabled, continue
        if (!$settings->is_enabled) {
            return $next($request);
        }

        // Check if user has bypass access
        if ($this->hasBypassAccess($request, $settings)) {
            // Add header to indicate bypass mode
            $response = $next($request);
            $response->headers->set('X-Maintenance-Bypass', 'true');
            return $response;
        }

        // Return maintenance response for API requests
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => $settings->title,
                'error' => 'maintenance_mode',
                'data' => $settings->getPublicInfo(),
            ], 503);
        }

        // Return maintenance view for web requests
        return response()->view('errors.503', [
            'settings' => $settings->getPublicInfo(),
        ], 503);
    }

    /**
     * Check if current route is excluded from maintenance check
     */
    protected function isExcludedRoute(Request $request): bool
    {
        $path = $request->path();

        foreach ($this->excludedRoutes as $route) {
            // Check exact match
            if ($path === $route) {
                return true;
            }

            // Check wildcard match
            if (str_ends_with($route, '*')) {
                $prefix = rtrim($route, '*');
                if (str_starts_with($path, $prefix)) {
                    return true;
                }
            }
        }

        return false;
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
     */
    protected function isAdmin(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        // Role is stored as uppercase in database (ADMIN, OPERATOR, etc.)
        return strtoupper($user->role) === 'ADMIN';
    }
}
