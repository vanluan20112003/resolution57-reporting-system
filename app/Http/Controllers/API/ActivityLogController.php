<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ActivityLogController extends Controller
{
    /**
     * Get activity logs for an organization
     * Accessible by STAFF, MANAGER, OPERATOR, ADMIN of the organization
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $organizationId = $user->organization_id;

            // Only users with organization can view logs
            if (! $organizationId && ! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không thuộc phòng ban nào',
                ], 403);
            }

            $query = ActivityLog::with([
                'user:id,email,first_name,last_name',
                'activity:id,code,title,status',
            ]);

            // Filter by organization (STAFF/MANAGER only see their org)
            if (in_array($user->role, ['STAFF', 'MANAGER'])) {
                $query->where('organization_id', $organizationId);
            } elseif ($request->has('organization_id') && $request->organization_id) {
                $query->where('organization_id', $request->organization_id);
            }

            // Filter by activity
            if ($request->has('activity_id') && $request->activity_id) {
                $query->where('activity_id', $request->activity_id);
            }

            // Filter by user
            if ($request->has('user_id') && $request->user_id) {
                $query->where('user_id', $request->user_id);
            }

            // Filter by action
            if ($request->has('action') && $request->action) {
                $query->where('action', $request->action);
            }

            // Filter by date range
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Search in description
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhereHas('activity', function ($q2) use ($search) {
                            $q2->where('title', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            }

            // Order by latest first
            $query->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 20);
            $logs = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'pagination' => [
                    'total' => $logs->total(),
                    'per_page' => $logs->perPage(),
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch activity logs', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lịch sử hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get logs for a specific activity
     */
    public function forActivity(Request $request, string $activityId): JsonResponse
    {
        try {
            $user = $request->user();
            $activity = Activity::findOrFail($activityId);

            // Check access permission
            if (! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                // if ($user->organization_id !== $activity->lead_organization_id) {
                //     return response()->json([
                //         'success' => false,
                //         'message' => 'Bạn không có quyền xem lịch sử hoạt động này',
                //     ], 403);
                // }
                $isLeadOrg = $user->organization_id === $activity->lead_organization_id;

                $isCollaboratorOrg = $activity->collaboratingOrganizations()
                    ->where('organization_id', $user->organization_id)
                    ->exists();

                if (! $isLeadOrg && ! $isCollaboratorOrg) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền xem lịch sử hoạt động này',
                    ], 403);
                }
            }

            $logs = ActivityLog::with([
                'user:id,email,first_name,last_name',
            ])
                ->where('activity_id', $activityId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'activity' => [
                    'id' => $activity->id,
                    'code' => $activity->code,
                    'title' => $activity->title,
                    'status' => $activity->status,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch activity logs', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lịch sử hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get organization activity feed (recent actions)
     */
    public function organizationFeed(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $organizationId = $user->organization_id;

            if (! $organizationId && ! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không thuộc phòng ban nào',
                ], 403);
            }

            // Get organization ID from request for OPERATOR/ADMIN
            if (in_array($user->role, ['OPERATOR', 'ADMIN']) && $request->has('organization_id')) {
                $organizationId = $request->organization_id;
            }

            $days = $request->input('days', 7); // Default 7 days
            $limit = $request->input('limit', 50);

            $logs = ActivityLog::with([
                'user:id,email,first_name,last_name',
                'activity:id,code,title,status',
            ])
                ->where('organization_id', $organizationId)
                ->where('created_at', '>=', now()->subDays($days))
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            // Group by date
            $groupedLogs = $logs->groupBy(function ($log) {
                return $log->created_at->format('Y-m-d');
            });

            return response()->json([
                'success' => true,
                'data' => $groupedLogs,
                'summary' => [
                    'total_logs' => $logs->count(),
                    'unique_users' => $logs->pluck('user_id')->unique()->count(),
                    'unique_activities' => $logs->pluck('activity_id')->unique()->count(),
                    'actions_breakdown' => $logs->groupBy('action')->map->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch organization feed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải hoạt động của phòng ban',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available action types for filter
     */
    public function actionTypes(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ActivityLog::ACTION_LABELS,
        ]);
    }
}
