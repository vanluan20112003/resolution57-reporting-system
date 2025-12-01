<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Login with email and password
     */
    public function login(Request $request): JsonResponse
    {
        Log::info('=== Email/Password login attempt ===', [
            'email' => $request->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            Log::warning('Login validation failed', [
                'email' => $request->email,
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Find user by email
            $user = User::where('email', $request->email)->first();

            // Check if user exists and password is correct
            if (!$user || !Hash::check($request->password, $user->password_hash)) {
                Log::warning('=== LOGIN FAILED: Invalid credentials ===', [
                    'email' => $request->email,
                    'user_exists' => $user ? 'yes' : 'no',
                    'ip_address' => $request->ip(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Email hoặc mật khẩu không chính xác',
                ], 401);
            }

            // Check if user is active
            if ($user->status !== 'active') {
                Log::warning('=== LOGIN BLOCKED: Account inactive ===', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'status' => $user->status,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản của bạn đã bị vô hiệu hóa',
                ], 403);
            }

            // Update last login
            $user->last_login_at = now();
            $user->save();

            // Create Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;

            Log::info('=== LOGIN SUCCESS ===', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'ip_address' => $request->ip(),
            ]);

            // Load organization relationship if user has one
            $organizationName = null;
            if ($user->organization_id) {
                $organization = \App\Models\Organization::find($user->organization_id);
                $organizationName = $organization ? ($organization->short_name ?? $organization->name) : null;
            }

            return response()->json([
                'success' => true,
                'message' => 'Đăng nhập thành công',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'avatar' => $user->avatar,
                        'avatar_url' => $user->avatar_url,
                        'role' => $user->role,
                        'is_vnuhcm' => $user->is_vnuhcm,
                        'organization_id' => $user->organization_id,
                        'organization_name' => $organizationName,
                    ],
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('=== LOGIN ERROR ===', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đăng nhập thất bại',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            Log::info('=== LOGOUT ===', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip_address' => $request->ip(),
            ]);

            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Đăng xuất thành công',
            ]);
        } catch (\Exception $e) {
            Log::error('=== LOGOUT ERROR ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đăng xuất thất bại',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current authenticated user
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            Log::info('=== GET USER INFO ===', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'avatar' => $user->avatar,
                    'avatar_url' => $user->avatar_url,
                    'role' => $user->role,
                    'is_vnuhcm' => $user->is_vnuhcm,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('=== GET USER INFO ERROR ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy thông tin người dùng',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                // Don't reveal if user exists or not for security
                return response()->json([
                    'success' => true,
                    'message' => 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.',
                ]);
            }

            // Delete old reset tokens for this email
            DB::table('password_resets')->where('email', $request->email)->delete();

            // Create new token
            $token = Str::random(64);

            // Save token to database
            DB::table('password_resets')->insert([
                'email' => $request->email,
                'token' => Hash::make($token),
                'created_at' => now(),
            ]);

            // Send email notification
            $user->notify(new ResetPasswordNotification($token, $request->email));

            Log::info('=== PASSWORD RESET REQUESTED ===', [
                'email' => $request->email,
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email hướng dẫn đặt lại mật khẩu đã được gửi đến địa chỉ email của bạn.',
            ]);
        } catch (\Exception $e) {
            Log::error('=== FORGOT PASSWORD ERROR ===', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Find the password reset record
            $resetRecord = DB::table('password_resets')
                ->where('email', $request->email)
                ->first();

            if (!$resetRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token không hợp lệ hoặc đã hết hạn.',
                ], 400);
            }

            // Check if token matches
            if (!Hash::check($request->token, $resetRecord->token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token không hợp lệ.',
                ], 400);
            }

            // Check if token is expired (60 minutes)
            $createdAt = \Carbon\Carbon::parse($resetRecord->created_at);
            if ($createdAt->addMinutes(60)->isPast()) {
                DB::table('password_resets')->where('email', $request->email)->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.',
                ], 400);
            }

            // Find user and update password
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy người dùng.',
                ], 404);
            }

            // Update password
            $user->password_hash = Hash::make($request->password);
            $user->save();

            // Delete the used token
            DB::table('password_resets')->where('email', $request->email)->delete();

            Log::info('=== PASSWORD RESET SUCCESS ===', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.',
            ]);
        } catch (\Exception $e) {
            Log::error('=== RESET PASSWORD ERROR ===', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Change password for authenticated user
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();

            // Check if current password is correct
            if (!Hash::check($request->current_password, $user->password_hash)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mật khẩu hiện tại không chính xác.',
                ], 400);
            }

            // Check if new password is different from current
            if (Hash::check($request->new_password, $user->password_hash)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mật khẩu mới phải khác mật khẩu hiện tại.',
                ], 400);
            }

            // Update password
            $user->password_hash = Hash::make($request->new_password);
            $user->save();

            Log::info('=== PASSWORD CHANGED ===', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Mật khẩu đã được thay đổi thành công.',
            ]);
        } catch (\Exception $e) {
            Log::error('=== CHANGE PASSWORD ERROR ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra. Vui lòng thử lại sau.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
