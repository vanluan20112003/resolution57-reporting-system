<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Public API routes
Route::prefix('v1')->group(function () {
    Route::get('/status', function () {
        try {
            // Test database connection
            DB::connection()->getPdo();
            $dbStatus = 'connected';
            $tables = DB::select('SHOW TABLES');
            $tableCount = count($tables);
        } catch (\Exception $e) {
            $dbStatus = 'disconnected';
            $tableCount = 0;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'NQ57 Portal API is running',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'connection' => config('database.default'),
                'tables' => $tableCount,
            ],
        ]);
    });

    // Health check
    Route::get('/health', function () {
        try {
            DB::connection()->getPdo();
            $dbHealth = 'up';
        } catch (\Exception $e) {
            $dbHealth = 'down';
        }

        return response()->json([
            'status' => 'healthy',
            'services' => [
                'api' => 'up',
                'database' => $dbHealth,
                'cache' => 'up',
            ],
            'timestamp' => now()->toIso8601String()
        ]);
    });

    // Example: Activities routes (sẽ implement sau)
    Route::prefix('activities')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'data' => [],
                'message' => 'Danh sách hoạt động (chưa có dữ liệu)',
                'total' => 0
            ]);
        });
    });

    // SSO Authentication Routes (Simple Test)
    Route::prefix('auth/sso')->group(function () {
        // Test Keycloak realms
        Route::get('/test-realms', function () {
            $baseUrl = 'https://sso.vnuhcm.edu.vn';
            $possibleRealms = ['Production', 'production', 'PRODUCTION', 'master', 'vnuhcm', 'VNUHCM'];

            $results = [];
            foreach ($possibleRealms as $realm) {
                $url = "{$baseUrl}/realms/{$realm}/.well-known/openid-configuration";
                $results[$realm] = [
                    'url' => $url,
                    'exists' => '❓ Check manually'
                ];
            }

            return response()->json([
                'message' => 'Test these URLs to find the correct realm',
                'realms' => $results,
                'instruction' => 'Try opening each URL in browser. The one that returns JSON (not 404) is the correct realm.'
            ]);
        });

        // Redirect to Keycloak
        Route::get('/login', function () {
            $baseUrl = env('KEYCLOAK_BASE_URL', 'https://sso.vnuhcm.edu.vn/auth');
            $realm = env('KEYCLOAK_REALM', 'Production');
            $clientId = env('KEYCLOAK_CLIENT_ID', 'webapp-nq57');
            $redirectUri = env('KEYCLOAK_REDIRECT_URI', 'https://nq57.vnuhcm.edu.vn/api/v1/auth/sso/callback');

            $authUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/auth?" . http_build_query([
                'client_id' => $clientId,
                'redirect_uri' => $redirectUri,
                'response_type' => 'code',
                'scope' => 'openid profile email',
            ]);

            return redirect($authUrl);
        });

        // Debug endpoint to see error details
        Route::get('/callback-debug', function (Request $request) {
            $code = $request->query('code');

            if (!$code) {
                return response()->json(['error' => 'No code provided']);
            }

            $baseUrl = env('KEYCLOAK_BASE_URL', 'https://sso.vnuhcm.edu.vn/auth');
            $realm = env('KEYCLOAK_REALM', 'Production');
            $clientId = env('KEYCLOAK_CLIENT_ID', 'webapp-nq57');
            $clientSecret = env('KEYCLOAK_CLIENT_SECRET');
            $redirectUri = env('KEYCLOAK_REDIRECT_URI', 'https://nq57.vnuhcm.edu.vn/api/v1/auth/sso/callback');
            $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

            $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, [
                'grant_type' => 'authorization_code',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]);

            return response()->json([
                'status' => $response->status(),
                'success' => $response->successful(),
                'body' => $response->json(),
                'raw_body' => $response->body(),
            ]);
        });

        // Callback from Keycloak
        Route::get('/callback', function (Request $request) {
            $code = $request->query('code');

            if (!$code) {
                return redirect(env('FRONTEND_URL', 'http://localhost:5000') . '?error=no_code');
            }

            try {
                // Exchange code for token
                $baseUrl = env('KEYCLOAK_BASE_URL', 'https://sso.vnuhcm.edu.vn/auth');
                $realm = env('KEYCLOAK_REALM', 'Production');
                $clientId = env('KEYCLOAK_CLIENT_ID', 'webapp-nq57');
                $clientSecret = env('KEYCLOAK_CLIENT_SECRET');
                $redirectUri = env('KEYCLOAK_REDIRECT_URI', 'https://nq57.vnuhcm.edu.vn/api/v1/auth/sso/callback');

                $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

                $tokenParams = [
                    'grant_type' => 'authorization_code',
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'code' => $code,
                    'redirect_uri' => $redirectUri,
                ];

                $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, $tokenParams);

                if (!$response->successful()) {
                    \Log::error('Token exchange failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'error' => $response->json()
                    ]);

                    // Return detailed error in development
                    if (env('APP_DEBUG')) {
                        return response()->json([
                            'error' => 'token_exchange_failed',
                            'status' => $response->status(),
                            'details' => $response->json()
                        ], 400);
                    }

                    return redirect(env('FRONTEND_URL', 'http://localhost:5000') . '?error=token_exchange_failed');
                }

                $tokenData = $response->json();
                $accessToken = $tokenData['access_token'];

                // Get user info from Keycloak
                $userInfoUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/userinfo";
                $userInfoResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)->get($userInfoUrl);

                if (!$userInfoResponse->successful()) {
                    \Log::error('User info fetch failed', [
                        'status' => $userInfoResponse->status(),
                        'body' => $userInfoResponse->body()
                    ]);
                    return redirect(env('FRONTEND_URL', 'http://localhost:5000') . '?error=userinfo_failed');
                }

                $userInfo = $userInfoResponse->json();

                // Store user info in session
                session([
                    'user' => $userInfo,
                    'access_token' => $accessToken,
                    'refresh_token' => $tokenData['refresh_token'] ?? null,
                ]);

                // Redirect to frontend with success
                $frontendUrl = env('FRONTEND_URL', 'http://localhost:5000');
                return redirect($frontendUrl . '?sso_success=1');

            } catch (\Exception $e) {
                \Log::error('SSO callback error', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return redirect(env('FRONTEND_URL', 'http://localhost:5000') . '?error=server_error');
            }
        });

        // Get current user info
        Route::get('/user', function (Request $request) {
            $user = session('user');
            $accessToken = session('access_token');

            if (!$user) {
                return response()->json([
                    'authenticated' => false,
                    'user' => null
                ]);
            }

            return response()->json([
                'authenticated' => true,
                'user' => $user,
                'token' => $accessToken
            ]);
        });

        // Logout
        Route::post('/logout', function (Request $request) {
            session()->flush();
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        });
    });
});
