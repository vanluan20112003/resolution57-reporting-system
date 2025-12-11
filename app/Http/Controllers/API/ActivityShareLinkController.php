<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityShareLink;
use App\Models\FileType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ActivityShareLinkController extends Controller
{
    /**
     * Get all share links for an activity
     */
    public function index(Request $request, string $activityId): JsonResponse
    {
        try {
            $user = $request->user();

            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy hoạt động',
                ], 404);
            }

            // Check access permission
            if (!$this->canManageShareLinks($user, $activity)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xem link chia sẻ của hoạt động này',
                ], 403);
            }

            $shareLinks = ActivityShareLink::where('activity_id', $activityId)
                ->with('creator:id,email,first_name,last_name')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $shareLinks,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching share links', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy danh sách link chia sẻ',
            ], 500);
        }
    }

    /**
     * Create a new share link for an activity
     */
    public function store(Request $request, string $activityId): JsonResponse
    {
        try {
            $user = $request->user();

            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy hoạt động',
                ], 404);
            }

            // Check access permission
            if (!$this->canManageShareLinks($user, $activity)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tạo link chia sẻ cho hoạt động này',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'description' => 'nullable|string|max:500',
                'expires_at' => 'nullable|date|after:now',
            ], [
                'expires_at.after' => 'Thời gian hết hạn phải sau thời điểm hiện tại',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $shareLink = ActivityShareLink::create([
                'activity_id' => $activityId,
                'created_by' => $user->id,
                'description' => $request->description,
                'expires_at' => $request->expires_at,
                'is_active' => true,
            ]);

            $shareLink->load('creator:id,email,first_name,last_name');

            Log::info('Share link created', [
                'share_link_id' => $shareLink->id,
                'activity_id' => $activityId,
                'created_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tạo link chia sẻ thành công',
                'data' => $shareLink,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating share link', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo link chia sẻ',
            ], 500);
        }
    }

    /**
     * Update a share link (deactivate or change expiry)
     */
    public function update(Request $request, string $activityId, string $linkId): JsonResponse
    {
        try {
            $user = $request->user();

            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy hoạt động',
                ], 404);
            }

            $shareLink = ActivityShareLink::where('id', $linkId)
                ->where('activity_id', $activityId)
                ->first();

            if (!$shareLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy link chia sẻ',
                ], 404);
            }

            // Check access permission
            if (!$this->canManageShareLinks($user, $activity)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền cập nhật link chia sẻ này',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'description' => 'nullable|string|max:500',
                'expires_at' => 'nullable|date',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $updateData = [];
            if ($request->has('description')) {
                $updateData['description'] = $request->description;
            }
            if ($request->has('expires_at')) {
                $updateData['expires_at'] = $request->expires_at;
            }
            if ($request->has('is_active')) {
                $updateData['is_active'] = $request->is_active;
            }

            $shareLink->update($updateData);
            $shareLink->load('creator:id,email,first_name,last_name');

            Log::info('Share link updated', [
                'share_link_id' => $linkId,
                'activity_id' => $activityId,
                'updated_by' => $user->id,
                'changes' => $updateData,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật link chia sẻ thành công',
                'data' => $shareLink,
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating share link', [
                'link_id' => $linkId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật link chia sẻ',
            ], 500);
        }
    }

    /**
     * Delete a share link
     */
    public function destroy(Request $request, string $activityId, string $linkId): JsonResponse
    {
        try {
            $user = $request->user();

            $activity = Activity::find($activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy hoạt động',
                ], 404);
            }

            $shareLink = ActivityShareLink::where('id', $linkId)
                ->where('activity_id', $activityId)
                ->first();

            if (!$shareLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy link chia sẻ',
                ], 404);
            }

            // Check access permission
            if (!$this->canManageShareLinks($user, $activity)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xóa link chia sẻ này',
                ], 403);
            }

            $shareLink->delete();

            Log::info('Share link deleted', [
                'share_link_id' => $linkId,
                'activity_id' => $activityId,
                'deleted_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Xóa link chia sẻ thành công',
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting share link', [
                'link_id' => $linkId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa link chia sẻ',
            ], 500);
        }
    }

    /**
     * Access shared files via token (requires authentication)
     * Returns activity info and files grouped by file type
     */
    public function accessSharedFiles(Request $request, string $token): JsonResponse
    {
        try {
            $user = $request->user();

            $shareLink = ActivityShareLink::where('share_token', $token)->first();

            if (!$shareLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'Link chia sẻ không tồn tại hoặc đã bị xóa',
                ], 404);
            }

            // Check if link is valid
            if (!$shareLink->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Link chia sẻ đã bị vô hiệu hóa',
                ], 403);
            }

            if ($shareLink->is_expired) {
                return response()->json([
                    'success' => false,
                    'message' => 'Link chia sẻ đã hết hạn',
                ], 403);
            }

            // Record access
            $shareLink->recordAccess();

            // Load activity with files
            $activity = Activity::with([
                'files' => function ($query) {
                    $query->with(['fileType', 'uploader:id,email,first_name,last_name'])
                        ->orderBy('uploaded_at', 'desc');
                },
                'leadOrganization:id,name,short_name',
                'activityType:id,name',
            ])->find($shareLink->activity_id);

            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hoạt động không còn tồn tại',
                ], 404);
            }

            // Get all file types for grouping
            $fileTypes = FileType::orderBy('name')
                ->get(['id', 'code', 'name']);

            // Group files by file type
            $groupedFiles = [];
            foreach ($fileTypes as $fileType) {
                $filesInType = $activity->files->filter(function ($file) use ($fileType) {
                    return $file->file_type_id === $fileType->id;
                })->values();

                if ($filesInType->count() > 0) {
                    $groupedFiles[] = [
                        'file_type' => $fileType,
                        'files' => $filesInType,
                        'count' => $filesInType->count(),
                    ];
                }
            }

            // Add files without file type (Other)
            $otherFiles = $activity->files->filter(function ($file) {
                return $file->file_type_id === null;
            })->values();

            if ($otherFiles->count() > 0) {
                $groupedFiles[] = [
                    'file_type' => [
                        'id' => null,
                        'code' => 'OTHER',
                        'name' => 'Khác',
                    ],
                    'files' => $otherFiles,
                    'count' => $otherFiles->count(),
                ];
            }

            Log::info('Shared files accessed', [
                'share_link_id' => $shareLink->id,
                'activity_id' => $activity->id,
                'accessed_by' => $user->id,
                'access_count' => $shareLink->access_count,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'share_link' => [
                        'id' => $shareLink->id,
                        'description' => $shareLink->description,
                        'expires_at' => $shareLink->expires_at,
                        'created_at' => $shareLink->created_at,
                    ],
                    'activity' => [
                        'id' => $activity->id,
                        'name' => $activity->title,
                        'description' => $activity->description,
                        'start_date' => $activity->start_date,
                        'end_date' => $activity->end_date,
                        'organization' => $activity->leadOrganization,
                        'activity_type' => $activity->activityType,
                        'total_files' => $activity->files->count(),
                    ],
                    'grouped_files' => $groupedFiles,
                    'file_types' => $fileTypes,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error accessing shared files', [
                'token' => $token,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi truy cập tài liệu',
                'debug' => config('app.debug') ? [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null,
            ], 500);
        }
    }

    /**
     * Check if user can manage share links for an activity
     */
    private function canManageShareLinks($user, Activity $activity): bool
    {
        $role = $user->role;

        // ADMIN and OPERATOR can manage all
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return true;
        }

        // User must belong to the activity's organization
        if ($user->organization_id !== $activity->lead_organization_id) {
            return false;
        }

        // MANAGER and STAFF of the organization can manage
        if (in_array($role, ['MANAGER', 'STAFF'])) {
            return true;
        }

        // Activity creator can manage
        if ($activity->created_by === $user->id) {
            return true;
        }

        return false;
    }
}
