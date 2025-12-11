<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\API\GoogleAuthController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\KpiController;
use App\Http\Controllers\API\OrganizationController;
use App\Http\Controllers\API\ProfileController;
use App\Http\Controllers\API\ActivityTypeController;
use App\Http\Controllers\API\ActivityFieldController;
use App\Http\Controllers\API\ActivityController;
use App\Http\Controllers\API\FileTypeController;
use App\Http\Controllers\API\KpiCategoryController;
use App\Http\Controllers\API\ImportController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\ActivityShareLinkController;

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

    // Activity Management Routes
    // All authenticated users can access (security handled in controller based on role/organization)
    Route::middleware('auth:sanctum')->prefix('activities')->group(function () {
        // Get form data (dropdown options) for creating/editing
        Route::get('/form-data', [ActivityController::class, 'getFormData']);

        // Get badge counts for notifications
        Route::get('/badge-counts', [ActivityController::class, 'getBadgeCounts']);

        // Attendance Template (MUST be before routes with {id} parameter)
        Route::get('/participants/template', [ActivityController::class, 'downloadAttendanceTemplate']);
        Route::get('/participants/template-info', [ActivityController::class, 'getAttendanceTemplateInfo']);

        // Export participants list to Excel
        Route::get('/{id}/participants/export', [ActivityController::class, 'exportParticipants']);

        // Get all approved activities from all organizations (public view)
        // MUST be before routes with {id} parameter
        Route::get('/all', [ActivityController::class, 'allApproved']);

        // List activities (filtered by user's organization for STAFF/MANAGER)
        Route::get('/', [ActivityController::class, 'index']);

        // Get single activity
        Route::get('/{id}', [ActivityController::class, 'show']);

        // Create new activity (STAFF, MANAGER, OPERATOR, ADMIN with organization)
        Route::post('/', [ActivityController::class, 'store']);

        // Update activity (security checked in controller)
        Route::put('/{id}', [ActivityController::class, 'update']);

        // Delete activity (only DRAFT status, security checked in controller)
        Route::delete('/{id}', [ActivityController::class, 'destroy']);

        // Submit activity for approval
        Route::post('/{id}/submit', [ActivityController::class, 'submitForApproval']);

        // Review activity - Step 1 (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/review', [ActivityController::class, 'review']);

        // Approve/Confirm activity - Step 2 (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/approve', [ActivityController::class, 'approve']);

        // Reject activity (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/reject', [ActivityController::class, 'reject']);

        // Lock activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/lock', [ActivityController::class, 'lock']);

        // Unlock activity (OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/unlock', [ActivityController::class, 'unlock']);

        // Postpone activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/postpone', [ActivityController::class, 'postpone']);

        // Cancel activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/cancel', [ActivityController::class, 'cancel']);

        // Uncancel activity (ADMIN only - checked in controller)
        Route::post('/{id}/uncancel', [ActivityController::class, 'uncancel']);

        // Activity Files Management
        Route::get('/{id}/files', [ActivityController::class, 'getFiles']);
        Route::post('/{id}/files/upload', [ActivityController::class, 'uploadFile']);
        Route::post('/{id}/files/link', [ActivityController::class, 'addLink']);
        Route::post('/{id}/files/batch', [ActivityController::class, 'batchAddFiles']);
        Route::put('/{id}/files/{fileId}', [ActivityController::class, 'updateFile']);
        Route::delete('/{id}/files/{fileId}', [ActivityController::class, 'deleteFile']);

        // Activity Participants Management
        Route::get('/{id}/participants', [ActivityController::class, 'getParticipants']);
        Route::post('/{id}/participants/upload', [ActivityController::class, 'uploadAttendanceList']);
        Route::delete('/{id}/participants', [ActivityController::class, 'deleteAttendanceList']);
        Route::post('/{id}/participants/send-invitations', [ActivityController::class, 'sendInvitations']);
        Route::post('/{id}/participants/resend-invitation', [ActivityController::class, 'resendInvitation']);
        Route::post('/{id}/participants/respond', [ActivityController::class, 'respondToInvitation']);

        // Add participants from organization groups
        Route::get('/{id}/participants/organization-groups', [ActivityController::class, 'getOrganizationUserGroups']);
        Route::post('/{id}/participants/add-from-group', [ActivityController::class, 'addParticipantsFromGroup']);

        // Update attendance for participants (mark who attended)
        Route::post('/{id}/participants/attendance', [ActivityController::class, 'updateParticipantsAttendance']);

        // Process attendance with new participants and file upload
        Route::post('/{id}/participants/process-attendance', [ActivityController::class, 'processAttendance']);

        // Activity Share Links Management
        Route::get('/{id}/share-links', [ActivityShareLinkController::class, 'index']);
        Route::post('/{id}/share-links', [ActivityShareLinkController::class, 'store']);
        Route::put('/{id}/share-links/{linkId}', [ActivityShareLinkController::class, 'update']);
        Route::delete('/{id}/share-links/{linkId}', [ActivityShareLinkController::class, 'destroy']);
    });

    // Shared Files Access (authenticated users with share token)
    Route::middleware('auth:sanctum')->get('/shared/files/{token}', [ActivityShareLinkController::class, 'accessSharedFiles']);

    // Authentication Routes
    Route::prefix('auth')->group(function () {
        // Email/Password Login
        Route::post('/login', [AuthController::class, 'login']);

        // Password Reset Routes
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);

        // Google OAuth Routes
        Route::prefix('google')->group(function () {
            Route::get('/redirect', [GoogleAuthController::class, 'redirectToGoogle']);
            Route::get('/callback', [GoogleAuthController::class, 'handleGoogleCallbackWeb']);
            Route::post('/exchange-code', [GoogleAuthController::class, 'exchangeCode']);
        });
    });

    // Protected Auth Routes
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // User Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('users')->group(function () {
        // View and list users
        Route::get('/', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::get('/{id}', [UserController::class, 'show'])->middleware('permission:users.view');

        // Create, update, delete users
        Route::post('/', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::put('/{id}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        // Start impersonation (ADMIN only)
        Route::post('/{id}/impersonate', [UserController::class, 'impersonate'])->middleware('role:ADMIN');
    });

    // Stop impersonation - Must be outside role:ADMIN group so impersonated users can call it
    Route::middleware('auth:sanctum')->post('/users/stop-impersonate', [UserController::class, 'stopImpersonate']);

    // User Profile Routes (All authenticated users can access their own profile)
    Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
        // Get current user profile
        Route::get('/', [ProfileController::class, 'show']);

        // Update current user profile (only allowed fields)
        Route::put('/', [ProfileController::class, 'update']);

        // Upload avatar
        Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);

        // Delete avatar
        Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
    });

    // KPI Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('kpis')->group(function () {
        // List all KPIs with filtering
        Route::get('/', [KpiController::class, 'index']);

        // Get KPI categories (deprecated - use /kpi-categories instead)
        Route::get('/categories', [KpiController::class, 'categories']);

        // Get single KPI
        Route::get('/{id}', [KpiController::class, 'show']);

        // Create new KPI
        Route::post('/', [KpiController::class, 'store']);

        // Update KPI
        Route::put('/{id}', [KpiController::class, 'update']);

        // Delete KPI
        Route::delete('/{id}', [KpiController::class, 'destroy']);
    });

    // KPI Category Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('kpi-categories')->group(function () {
        Route::get('/', [KpiCategoryController::class, 'index']);
        Route::get('/{id}', [KpiCategoryController::class, 'show']);
        Route::post('/', [KpiCategoryController::class, 'store']);
        Route::put('/{id}', [KpiCategoryController::class, 'update']);
        Route::delete('/{id}', [KpiCategoryController::class, 'destroy']);
    });

   // Organization Management Routes (OPERATOR and ADMIN only)
    Route::middleware('auth:sanctum', 'role:OPERATOR,ADMIN')->prefix('organizations')->group(function(){
        Route::get("/",[OrganizationController::class,'index'])->middleware('permission:organizations.view');
        Route::get("/{id}",[OrganizationController::class,'show'])->middleware('permission:organizations.view');
        Route::post("/",[OrganizationController::class,'store'])->middleware('permission:organizations.create');
        Route::put("/{id}",[OrganizationController::class,'update'])->middleware('permission:organizations.update');
        Route::delete("/{id}",[OrganizationController::class,'destroy'])->middleware('permission:organizations.update');
    });

    // Notification Management Routes 
    Route::middleware('auth:sanctum')->prefix("notifications")->group(function(){
        Route::get("/", [NotificationController::class, 'show']);
        Route::put("/{id}/read", [NotificationController::class, 'read']);
        Route::put("/readAll", [NotificationController::class, 'readAll']);
    });

    // My Organization Routes (STAFF, MANAGER can view/edit their own organization)
    Route::middleware('auth:sanctum')->prefix('my-organization')->group(function () {
        // Get current user's organization profile
        Route::get('/', [OrganizationController::class, 'getMyOrganization']);

        // Update organization basic info (STAFF, MANAGER only)
        Route::put('/', [OrganizationController::class, 'updateMyOrganization']);

        // Upload organization avatar
        Route::post('/avatar', [OrganizationController::class, 'uploadAvatar']);

        // Delete organization avatar
        Route::delete('/avatar', [OrganizationController::class, 'deleteAvatar']);

        // Upload organization cover image
        Route::post('/cover', [OrganizationController::class, 'uploadCoverImage']);

        // Get organization members (STAFF, MANAGER, OPERATOR, ADMIN)
        Route::get('/members', [OrganizationController::class, 'getMyOrganizationMembers']);

        // Update member role (MANAGER can promote GUEST to STAFF or demote)
        Route::put('/members/{memberId}/role', [OrganizationController::class, 'updateMemberRole']);

        // Add single member by email
        Route::post('/members', [OrganizationController::class, 'addMember']);

        // Remove member from organization
        Route::delete('/members/{memberId}', [OrganizationController::class, 'removeMember']);

        // Import members from Excel
        Route::get('/members/import/template-info', [OrganizationController::class, 'getMemberImportTemplateInfo']);
        Route::get('/members/import/template', [OrganizationController::class, 'downloadMemberImportTemplate']);
        Route::post('/members/import', [OrganizationController::class, 'importMembers']);
    });

    // Activity Type Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('activity-types')->group(function () {
        Route::get('/', [ActivityTypeController::class, 'index']);
        Route::get('/{id}', [ActivityTypeController::class, 'show']);
        Route::post('/', [ActivityTypeController::class, 'store']);
        Route::put('/{id}', [ActivityTypeController::class, 'update']);
        Route::delete('/{id}', [ActivityTypeController::class, 'destroy']);
    });

    // Activity Field Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('activity-fields')->group(function () {
        Route::get('/', [ActivityFieldController::class, 'index']);
        Route::get('/{id}', [ActivityFieldController::class, 'show']);
        Route::post('/', [ActivityFieldController::class, 'store']);
        Route::put('/{id}', [ActivityFieldController::class, 'update']);
        Route::delete('/{id}', [ActivityFieldController::class, 'destroy']);
    });

    // File Type Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('file-types')->group(function () {
        Route::get('/', [FileTypeController::class, 'index']);
        Route::get('/{id}', [FileTypeController::class, 'show']);
        Route::post('/', [FileTypeController::class, 'store']);
        Route::put('/{id}', [FileTypeController::class, 'update']);
        Route::delete('/{id}', [FileTypeController::class, 'destroy']);
    });

    // Import Excel Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('import')->group(function () {
        // Get template info for a type
        Route::get('/template-info', [ImportController::class, 'getTemplateInfo']);

        // Download template file
        Route::get('/template', [ImportController::class, 'downloadTemplate']);

        // Import data from Excel
        Route::post('/', [ImportController::class, 'import']);
    });

    // Report Management Routes (STAFF+ only - users must have organization)
    Route::middleware(['auth:sanctum', 'role:STAFF,MANAGER,OPERATOR,ADMIN'])->prefix('reports')->group(function () {
        // Get available report periods with activity counts
        Route::get('/periods', [ReportController::class, 'getReportPeriods']);

        // Get available export columns for a view mode
        Route::get('/columns', [ReportController::class, 'getExportColumns']);

        // Get export history for current user's organization
        Route::get('/history', [ReportController::class, 'getExportHistory']);

        // Get report statistics for dashboard
        Route::get('/stats', [ReportController::class, 'getReportStats']);

        // Export activity report (creates history record)
        Route::get('/export', [ReportController::class, 'exportActivityReport']);

        // Delete export history record (MANAGER+ only)
        Route::delete('/history/{id}', [ReportController::class, 'deleteExport']);
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
            $baseUrl = config('keycloak.base_url');
            $realm = config('keycloak.realm');
            $clientId = config('keycloak.client_id');
            $redirectUri = config('keycloak.redirect_uri');

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

            $baseUrl = config('keycloak.base_url');
            $realm = config('keycloak.realm');
            $clientId = config('keycloak.client_id');
            $clientSecret = config('keycloak.client_secret');
            $redirectUri = config('keycloak.redirect_uri');
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
            $frontendUrl = config('app.frontend_url', 'https://nq57.vnuhcm.edu.vn');

            if (!$code) {
                return redirect($frontendUrl . '?error=no_code');
            }

            try {
                // Exchange code for token
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $clientId = config('keycloak.client_id');
                $clientSecret = config('keycloak.client_secret');
                $redirectUri = config('keycloak.redirect_uri');

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

                    return redirect($frontendUrl . '?error=token_exchange_failed');
                }

                $tokenData = $response->json();
                $accessToken = $tokenData['access_token'];
                $refreshToken = $tokenData['refresh_token'] ?? null;
                $expiresIn = $tokenData['expires_in'] ?? 300;

                // Get user info from Keycloak
                $userInfoUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/userinfo";
                $userInfoResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)->get($userInfoUrl);

                if (!$userInfoResponse->successful()) {
                    \Log::error('User info fetch failed', [
                        'status' => $userInfoResponse->status(),
                        'body' => $userInfoResponse->body()
                    ]);
                    return redirect($frontendUrl . '?error=userinfo_failed');
                }

                $userInfo = $userInfoResponse->json();

                // Decode JWT to get roles
                $tokenParts = explode('.', $accessToken);
                $roles = [];
                if (count($tokenParts) === 3) {
                    try {
                        $payload = json_decode(base64_decode($tokenParts[1]), true);
                        // Keycloak stores roles in different places
                        $roles = array_merge(
                            $payload['realm_access']['roles'] ?? [],
                            $payload['resource_access'][$clientId]['roles'] ?? []
                        );
                    } catch (\Exception $e) {
                        \Log::warning('Failed to decode JWT roles', ['error' => $e->getMessage()]);
                    }
                }

                // Add roles to user info
                $userInfo['roles'] = $roles;

                // Encode tokens and user info as base64 to pass via URL
                $data = base64_encode(json_encode([
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_in' => $expiresIn,
                    'user' => $userInfo
                ]));

                // Redirect to frontend with token data
                return redirect($frontendUrl . '?sso_success=1&data=' . $data);

            } catch (\Exception $e) {
                \Log::error('SSO callback error', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return redirect($frontendUrl . '?error=server_error');
            }
        });

        // Get current user info by verifying token
        Route::get('/user', function (Request $request) {
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'authenticated' => false,
                    'user' => null,
                    'message' => 'No token provided'
                ]);
            }

            try {
                // Verify token with Keycloak
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $userInfoUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/userinfo";

                $response = \Illuminate\Support\Facades\Http::withToken($token)->get($userInfoUrl);

                if (!$response->successful()) {
                    return response()->json([
                        'authenticated' => false,
                        'user' => null,
                        'message' => 'Invalid or expired token'
                    ], 401);
                }

                $userInfo = $response->json();

                // Decode JWT to get roles
                $roles = [];
                try {
                    $tokenParts = explode('.', $token);
                    if (count($tokenParts) === 3) {
                        $payload = json_decode(base64_decode($tokenParts[1]), true);
                        $clientId = config('keycloak.client_id');
                        // Keycloak stores roles in different places
                        $roles = array_merge(
                            $payload['realm_access']['roles'] ?? [],
                            $payload['resource_access'][$clientId]['roles'] ?? []
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to decode JWT roles', ['error' => $e->getMessage()]);
                }

                // Add roles to user info
                $userInfo['roles'] = $roles;

                return response()->json([
                    'authenticated' => true,
                    'user' => $userInfo
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'authenticated' => false,
                    'user' => null,
                    'message' => 'Token verification failed'
                ], 401);
            }
        });

        // Refresh access token
        Route::post('/refresh', function (Request $request) {
            $refreshToken = $request->input('refresh_token');

            if (!$refreshToken) {
                return response()->json([
                    'error' => 'Refresh token required'
                ], 400);
            }

            try {
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $clientId = config('keycloak.client_id');
                $clientSecret = config('keycloak.client_secret');
                $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

                $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, [
                    'grant_type' => 'refresh_token',
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'refresh_token' => $refreshToken,
                ]);

                if (!$response->successful()) {
                    return response()->json([
                        'error' => 'Token refresh failed'
                    ], 401);
                }

                $tokenData = $response->json();

                return response()->json([
                    'access_token' => $tokenData['access_token'],
                    'refresh_token' => $tokenData['refresh_token'] ?? $refreshToken,
                    'expires_in' => $tokenData['expires_in'] ?? 300,
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Token refresh failed'
                ], 500);
            }
        });

        // Logout - Revoke token with Keycloak
        Route::post('/logout', function (Request $request) {
            $refreshToken = $request->input('refresh_token');

            if ($refreshToken) {
                try {
                    $baseUrl = config('keycloak.base_url');
                    $realm = config('keycloak.realm');
                    $clientId = config('keycloak.client_id');
                    $clientSecret = config('keycloak.client_secret');
                    $logoutUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/logout";

                    // Revoke refresh token
                    \Illuminate\Support\Facades\Http::asForm()->post($logoutUrl, [
                        'client_id' => $clientId,
                        'client_secret' => $clientSecret,
                        'refresh_token' => $refreshToken,
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Keycloak logout failed', ['error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        });
    });
});
