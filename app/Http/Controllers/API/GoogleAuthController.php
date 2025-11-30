<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        Log::info('=== Google OAuth: Initiate Redirect ===', [
            'timestamp' => now()->toDateTimeString(),
        ]);

        try {
            $url = Socialite::driver('google')
                ->stateless()
                ->redirect()
                ->getTargetUrl();

            Log::info('Google OAuth redirect URL generated', [
                'url_domain' => parse_url($url, PHP_URL_HOST),
            ]);

            return response()->json([
                'success' => true,
                'url' => $url,
                'message' => 'Redirect to Google OAuth',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to initiate Google OAuth', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

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
        Log::info('=== Google OAuth: API Callback ===', [
            'timestamp' => now()->toDateTimeString(),
        ]);

        try {
            // Get user info from Google
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();

            Log::info('Google user info retrieved', [
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
            ]);

            // Find or create user
            $user = User::where('email', $googleUser->getEmail())->first();

            if (!$user) {
                // Extract first and last name
                $fullName = $googleUser->getName();
                $nameParts = explode(' ', $fullName, 2);
                $firstName = $nameParts[0] ?? '';
                $lastName = $nameParts[1] ?? '';

                Log::info('Creating new user from Google OAuth', [
                    'email' => $googleUser->getEmail(),
                    'first_name' => $firstName,
                ]);

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

                Log::info('New user created successfully', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);
            } else {
                Log::info('Existing user found', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);

                // Update Google ID and avatar if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                        'avatar_url' => $googleUser->getAvatar(),
                    ]);
                    Log::info('User Google info updated', ['user_id' => $user->id]);
                }
            }

            // Create Sanctum token
            $token = $user->createToken('google-auth-token')->plainTextToken;

            Log::info('Google OAuth login successful', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ]);

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
            Log::error('Google OAuth callback failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

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

            // SECURITY: Store token temporarily in database to exchange for code
            // Create a temporary one-time code that will be exchanged for the token
            $oneTimeCode = bin2hex(random_bytes(32));
            $expiresAt = now()->addMinutes(5);

            // Store in database (oauth_codes table)
            DB::table('oauth_codes')->insert([
                'code' => $oneTimeCode,
                'token' => $token,
                'user_data' => json_encode([
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'role' => $user->role,
                ]),
                'expires_at' => $expiresAt,
                'created_at' => now(),
            ]);

            // Clean up expired codes
            DB::table('oauth_codes')->where('expires_at', '<', now())->delete();

            Log::info('One-time auth code generated', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'code_hash' => hash('sha256', $oneTimeCode),
                'code_length' => strlen($oneTimeCode),
                'code_preview' => substr($oneTimeCode, 0, 10) . '...',
                'expires_at' => $expiresAt->toDateTimeString(),
            ]);

            // Redirect with one-time code instead of token
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5000');
            // NOTE: No need to urlencode because code is hex string (only 0-9a-f)
            $redirectUrl = $frontendUrl . '/auth/callback?code=' . $oneTimeCode;

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
        Log::info('=== Google OAuth: Logout ===', [
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
        ]);

        try {
            $request->user()->currentAccessToken()->delete();

            Log::info('Logout successful', [
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Logout successful',
            ]);
        } catch (\Exception $e) {
            Log::error('Logout failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

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

            Log::info('=== Get current user info ===', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

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
            Log::error('Failed to get user info', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exchange one-time auth code for access token
     * SECURITY: This endpoint exchanges the one-time code from URL for the actual token
     */
    public function exchangeCode(Request $request): JsonResponse
    {
        Log::info('=== Exchange auth code for token ===', [
            'has_code' => $request->has('code'),
            'timestamp' => now()->toDateTimeString(),
        ]);

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'code' => 'required|string',
        ]);

        if ($validator->fails()) {
            Log::warning('Code exchange validation failed', [
                'errors' => $validator->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $code = $request->input('code');

            Log::info('DEBUG: Checking oauth code in database', [
                'code_length' => strlen($code),
                'code_preview' => substr($code, 0, 10) . '...',
            ]);

            // Retrieve data from database
            $oauthCode = DB::table('oauth_codes')
                ->where('code', $code)
                ->where('expires_at', '>', now())
                ->first();

            if (!$oauthCode) {
                Log::warning('Invalid or expired auth code', [
                    'code_hash' => hash('sha256', $code),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired authorization code',
                ], 400);
            }

            // Parse user data
            $userData = json_decode($oauthCode->user_data, true);

            // Delete the one-time code (can only be used once)
            DB::table('oauth_codes')->where('code', $code)->delete();

            Log::info('Auth code exchanged successfully', [
                'user_id' => $userData['id'],
                'user_email' => $userData['email'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Authentication successful',
                'data' => [
                    'access_token' => $oauthCode->token,
                    'token_type' => 'Bearer',
                    'user' => $userData,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Code exchange failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to exchange authorization code',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
