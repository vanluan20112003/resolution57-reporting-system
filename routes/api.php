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
});
