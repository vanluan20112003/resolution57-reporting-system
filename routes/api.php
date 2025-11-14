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
            $baseUrl = 'https://sso.vnuhcm.edu.vn/auth';
            $realm = 'Production';
            $clientId = 'webapp-nq57';
            $redirectUri = 'https://nq57.vnuhcm.edu.vn/api/v1/auth/sso/callback';

            $authUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/auth?" . http_build_query([
                'client_id' => $clientId,
                'redirect_uri' => $redirectUri,
                'response_type' => 'code',
                'scope' => 'openid profile email',
            ]);

            return redirect($authUrl);
        });

        // Callback from Keycloak
        Route::get('/callback', function (Request $request) {
            $code = $request->query('code');

            if (!$code) {
                return response()->json([
                    'error' => 'No authorization code received',
                    'query' => $request->query()
                ], 400);
            }

            return response()->json([
                'message' => 'SSO Callback received successfully!',
                'code' => $code,
                'next_step' => 'Exchange code for token'
            ]);
        });
    });
});
