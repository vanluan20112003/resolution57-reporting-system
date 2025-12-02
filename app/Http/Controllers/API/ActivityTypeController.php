<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ActivityType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ActivityTypeController extends Controller
{
    /**
     * Display a listing of Activity Types
     * Accessible by: OPERATOR, ADMIN
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== Activity Type Management: Fetch Activity Types ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['is_active', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = ActivityType::query();

            // Filter by active status
            if ($request->has('is_active')) {
                $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            // Search by name or description
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                      ->orWhere('description', 'like', '%' . $search . '%');
                });
            }

            // Order by display_order and created_at
            $query->orderBy('display_order', 'asc')->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 50);
            $activityTypes = $query->paginate($perPage);

            Log::info('Activity Type fetch successful', [
                'total' => $activityTypes->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $activityTypes->items(),
                'pagination' => [
                    'total' => $activityTypes->total(),
                    'per_page' => $activityTypes->perPage(),
                    'current_page' => $activityTypes->currentPage(),
                    'last_page' => $activityTypes->lastPage(),
                    'from' => $activityTypes->firstItem(),
                    'to' => $activityTypes->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Activity Type fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách loại hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created Activity Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== Activity Type Management: Create Activity Type ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->all(),
        ]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:activity_types,name',
            'description' => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Tên loại hoạt động là bắt buộc',
            'name.unique' => 'Tên loại hoạt động đã tồn tại',
            'name.max' => 'Tên loại hoạt động không được vượt quá 100 ký tự',
        ]);

        if ($validator->fails()) {
            Log::warning('Activity Type creation validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Auto calculate display_order if not provided
            $displayOrder = $request->display_order ?? (ActivityType::max('display_order') + 1);

            $activityType = ActivityType::create([
                'name' => $request->name,
                'description' => $request->description,
                'display_order' => $displayOrder,
                'is_active' => $request->input('is_active', true),
            ]);

            Log::info('Activity Type created successfully', [
                'activity_type_id' => $activityType->id,
                'activity_type_name' => $activityType->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại hoạt động đã được tạo thành công',
                'data' => $activityType,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Activity Type creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo loại hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified Activity Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Type Management: Show Activity Type ===', [
            'requester_id' => $request->user()->id,
            'activity_type_id' => $id,
        ]);

        try {
            $activityType = ActivityType::withCount('activities')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $activityType,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Type not found', ['activity_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Type fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải loại hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified Activity Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Type Management: Update Activity Type ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_type_id' => $id,
            'data' => $request->all(),
        ]);

        try {
            $activityType = ActivityType::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:100|unique:activity_types,name,' . $id,
                'description' => 'nullable|string|max:500',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ], [
                'name.required' => 'Tên loại hoạt động là bắt buộc',
                'name.unique' => 'Tên loại hoạt động đã tồn tại',
                'name.max' => 'Tên loại hoạt động không được vượt quá 100 ký tự',
            ]);

            if ($validator->fails()) {
                Log::warning('Activity Type update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $activityType->update($request->only([
                'name',
                'description',
                'display_order',
                'is_active',
            ]));

            Log::info('Activity Type updated successfully', [
                'activity_type_id' => $activityType->id,
                'activity_type_name' => $activityType->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại hoạt động đã được cập nhật thành công',
                'data' => $activityType,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Type not found for update', ['activity_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Type update failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật loại hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified Activity Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Type Management: Delete Activity Type ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_type_id' => $id,
        ]);

        try {
            $activityType = ActivityType::withCount('activities')->findOrFail($id);

            // Check if Activity Type is associated with any activities
            if ($activityType->activities_count > 0) {
                Log::warning('Cannot delete Activity Type with associated activities', [
                    'activity_type_id' => $id,
                    'activities_count' => $activityType->activities_count,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Không thể xóa loại hoạt động vì đang được sử dụng bởi {$activityType->activities_count} hoạt động",
                ], 400);
            }

            $activityTypeName = $activityType->name;
            $activityType->delete();

            Log::info('Activity Type deleted successfully', [
                'activity_type_id' => $id,
                'activity_type_name' => $activityTypeName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại hoạt động đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Type not found for deletion', ['activity_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Type deletion failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa loại hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
