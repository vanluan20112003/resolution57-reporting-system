<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ActivityField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ActivityFieldController extends Controller
{
    /**
     * Display a listing of Activity Fields
     * Accessible by: OPERATOR, ADMIN
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== Activity Field Management: Fetch Activity Fields ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['is_active', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = ActivityField::query();

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
            $activityFields = $query->paginate($perPage);

            Log::info('Activity Field fetch successful', [
                'total' => $activityFields->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $activityFields->items(),
                'pagination' => [
                    'total' => $activityFields->total(),
                    'per_page' => $activityFields->perPage(),
                    'current_page' => $activityFields->currentPage(),
                    'last_page' => $activityFields->lastPage(),
                    'from' => $activityFields->firstItem(),
                    'to' => $activityFields->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Activity Field fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách lĩnh vực hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created Activity Field
     * Accessible by: OPERATOR, ADMIN
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== Activity Field Management: Create Activity Field ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->all(),
        ]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:activity_fields,name',
            'description' => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Tên lĩnh vực là bắt buộc',
            'name.unique' => 'Tên lĩnh vực đã tồn tại',
            'name.max' => 'Tên lĩnh vực không được vượt quá 255 ký tự',
        ]);

        if ($validator->fails()) {
            Log::warning('Activity Field creation validation failed', [
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
            $displayOrder = $request->display_order ?? (ActivityField::max('display_order') + 1);

            $activityField = ActivityField::create([
                'name' => $request->name,
                'description' => $request->description,
                'display_order' => $displayOrder,
                'is_active' => $request->input('is_active', true),
            ]);

            Log::info('Activity Field created successfully', [
                'activity_field_id' => $activityField->id,
                'activity_field_name' => $activityField->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lĩnh vực hoạt động đã được tạo thành công',
                'data' => $activityField,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Activity Field creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo lĩnh vực hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified Activity Field
     * Accessible by: OPERATOR, ADMIN
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Field Management: Show Activity Field ===', [
            'requester_id' => $request->user()->id,
            'activity_field_id' => $id,
        ]);

        try {
            $activityField = ActivityField::withCount('activities')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $activityField,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Field not found', ['activity_field_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lĩnh vực hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Field fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lĩnh vực hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified Activity Field
     * Accessible by: OPERATOR, ADMIN
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Field Management: Update Activity Field ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_field_id' => $id,
            'data' => $request->all(),
        ]);

        try {
            $activityField = ActivityField::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255|unique:activity_fields,name,' . $id,
                'description' => 'nullable|string|max:500',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ], [
                'name.required' => 'Tên lĩnh vực là bắt buộc',
                'name.unique' => 'Tên lĩnh vực đã tồn tại',
                'name.max' => 'Tên lĩnh vực không được vượt quá 255 ký tự',
            ]);

            if ($validator->fails()) {
                Log::warning('Activity Field update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $activityField->update($request->only([
                'name',
                'description',
                'display_order',
                'is_active',
            ]));

            Log::info('Activity Field updated successfully', [
                'activity_field_id' => $activityField->id,
                'activity_field_name' => $activityField->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lĩnh vực hoạt động đã được cập nhật thành công',
                'data' => $activityField,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Field not found for update', ['activity_field_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lĩnh vực hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Field update failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật lĩnh vực hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified Activity Field
     * Accessible by: OPERATOR, ADMIN
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Field Management: Delete Activity Field ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_field_id' => $id,
        ]);

        try {
            $activityField = ActivityField::withCount('activities')->findOrFail($id);

            // Check if Activity Field is associated with any activities
            if ($activityField->activities_count > 0) {
                Log::warning('Cannot delete Activity Field with associated activities', [
                    'activity_field_id' => $id,
                    'activities_count' => $activityField->activities_count,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Không thể xóa lĩnh vực vì đang được sử dụng bởi {$activityField->activities_count} hoạt động",
                ], 400);
            }

            $activityFieldName = $activityField->name;
            $activityField->delete();

            Log::info('Activity Field deleted successfully', [
                'activity_field_id' => $id,
                'activity_field_name' => $activityFieldName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lĩnh vực hoạt động đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity Field not found for deletion', ['activity_field_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lĩnh vực hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity Field deletion failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa lĩnh vực hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
