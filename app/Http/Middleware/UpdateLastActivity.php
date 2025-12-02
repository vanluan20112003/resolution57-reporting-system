<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastActivity
{
    /**
     * Thời gian tối thiểu giữa các lần cập nhật (giây)
     * Để tránh cập nhật database quá thường xuyên
     */
    protected const UPDATE_INTERVAL = 60; // 1 phút

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Chỉ cập nhật nếu user đã đăng nhập
        if (Auth::check()) {
            $this->updateLastActivity(Auth::user());
        }

        return $response;
    }

    /**
     * Cập nhật thời gian hoạt động cuối cùng của user
     */
    protected function updateLastActivity($user): void
    {
        $cacheKey = 'user_last_activity_' . $user->id;

        // Kiểm tra xem có cần cập nhật không (tránh cập nhật quá thường xuyên)
        $lastUpdate = Cache::get($cacheKey);

        if ($lastUpdate && now()->diffInSeconds($lastUpdate) < self::UPDATE_INTERVAL) {
            // Chưa đủ thời gian, không cập nhật
            return;
        }

        // Cập nhật cache
        Cache::put($cacheKey, now(), self::UPDATE_INTERVAL * 2);

        // Cập nhật database
        $user->update([
            'last_login_at' => now(),
        ]);
    }
}
