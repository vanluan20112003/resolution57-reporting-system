<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     */
    public function redirectToGoogle(): JsonResponse
    {
        try {
            $url = Socialite::driver('google')
                ->stateless()
                ->redirect()
                ->getTargetUrl();

            return response()->json([
                'success' => true,
                'url' => $url,
                'message' => 'Redirect to Google OAuth',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate Google OAuth',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Google OAuth callback
     */
    public function handleGoogleCallback(Request $request): JsonResponse
    {
        try {
            // Get user info from Google
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();

            // Find or create user
            $user = User::where('email', $googleUser->getEmail())->first();

            if (!$user) {
                // Extract first and last name
                $fullName = $googleUser->getName();
                $nameParts = explode(' ', $fullName, 2);
                $firstName = $nameParts[0] ?? '';
                $lastName = $nameParts[1] ?? '';

                // Create new user
                $user = User::create([
                    'id' => (string) Str::uuid(),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $googleUser->getEmail(),
                    'password_hash' => Hash::make(Str::random(32)), // Random password
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'avatar_url' => $googleUser->getAvatar(),
                    'role' => 'GUEST', // Default role
                    'status' => 'active',
                    'is_vnuhcm' => false,
                ]);
            } else {
                // Update Google ID and avatar if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                        'avatar_url' => $googleUser->getAvatar(),
                    ]);
                }
            }

            // Create Sanctum token
            $token = $user->createToken('google-auth-token')->plainTextToken;

            // Return user data and token
            return response()->json([
                'success' => true,
                'message' => 'Google login successful',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'avatar' => $user->avatar,
                        'role' => $user->role,
                    ],
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Google authentication failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Google OAuth callback for web (redirect to frontend)
     */
    public function handleGoogleCallbackWeb(Request $request)
    {
        Log::info('=== Google callback started ===', [
            'query_params' => $request->query(),
            'url' => $request->fullUrl(),
            'timestamp' => now()->toDateTimeString(),
        ]);

        try {
            // Get user info from Google
            $googleUser = Socialite::driver('google')->stateless()->user();

            Log::info('=== Google user data retrieved ===', [
                'email' => $googleUser->getEmail(),
                'name' => $googleUser->getName(),
                'id' => $googleUser->getId(),
            ]);

            $email = $googleUser->getEmail();

            // Find user in database
            $user = User::where('email', $email)->first();

            Log::info('=== Database user lookup ===', [
                'email' => $email,
                'user_found' => $user ? 'yes' : 'no',
                'user_id' => $user?->id ?? null,
            ]);

            // Check email domain for authorization
            $isVNUHCMEmail = str_ends_with($email, '@vnuhcm.edu.vn');

            Log::info('=== Email domain check ===', [
                'email' => $email,
                'is_vnuhcm' => $isVNUHCMEmail ? 'yes' : 'no',
            ]);

            if (!$user) {
                // User doesn't exist in database
                // Only allow VNUHCM emails to auto-register
                if (!$isVNUHCMEmail) {
                    Log::warning('=== UNAUTHORIZED: Email not authorized ===', [
                        'email' => $email,
                        'reason' => 'Email not in database and not @vnuhcm.edu.vn domain'
                    ]);

                    // Redirect to login page with error message
                    $frontendUrl = env('FRONTEND_URL', 'http://localhost:5000');
                    $errorMessage = urlencode('Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng sử dụng email @vnuhcm.edu.vn hoặc liên hệ quản trị viên.');
                    $redirectUrl = $frontendUrl . '/login?error=unauthorized&message=' . $errorMessage;

                    Log::warning('=== REDIRECTING TO LOGIN WITH ERROR ===', [
                        'redirect_url' => $redirectUrl,
                        'status_code' => 302,
                    ]);

                    return redirect($redirectUrl);
                }

                // Create new user for VNUHCM email
                $fullName = $googleUser->getName();
                $nameParts = explode(' ', $fullName, 2);
                $firstName = $nameParts[0] ?? '';
                $lastName = $nameParts[1] ?? '';

                Log::info('Creating new VNUHCM user:', [
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]);

                try {
                    $user = User::create([
                        'id' => (string) Str::uuid(),
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $email,
                        'password_hash' => Hash::make(Str::random(32)),
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                        'avatar_url' => $googleUser->getAvatar(),
                        'role' => 'GUEST',
                        'status' => 'active',
                        'is_vnuhcm' => true,
                    ]);
                    Log::info('User created successfully:', ['user_id' => $user->id]);
                } catch (\Exception $e) {
                    Log::error('Failed to create user:', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    throw $e;
                }
            } else {
                // User exists in database - allow login regardless of email domain
                Log::info('User exists in database:', ['user_id' => $user->id, 'email' => $email]);

                // Update Google ID and avatar if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                        'avatar_url' => $googleUser->getAvatar(),
                    ]);
                }

                // Update is_vnuhcm flag if email is VNUHCM
                if ($isVNUHCMEmail && !$user->is_vnuhcm) {
                    $user->update(['is_vnuhcm' => true]);
                }
            }

            // Create Sanctum token
            $token = $user->createToken('google-auth-token')->plainTextToken;

            // Redirect to frontend with token
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5000');
            $redirectUrl = $frontendUrl . '/auth/callback?token=' . urlencode($token) . '&user=' . urlencode(json_encode([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'role' => $user->role,
            ]));

            return redirect($redirectUrl);
        } catch (\Exception $e) {
            Log::error('Google callback error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            // Redirect to frontend with error
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5000');
            return redirect($frontendUrl . '/login?error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Logout successful',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current user
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'role' => $user->role,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
