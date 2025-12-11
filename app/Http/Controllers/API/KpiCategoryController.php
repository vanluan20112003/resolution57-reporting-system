<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\KpiCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class KpiCategoryController extends Controller
{
    /**
     * Display a listing of KPI Categories
     * Accessible by: OPERATOR, ADMIN
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== KPI Category Management: Fetch KPI Categories ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['is_active', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = KpiCategory::query()->withCount('kpis');

            // Filter by active status
            if ($request->has('is_active')) {
                $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            // Search by code, name or description
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%' . $search . '%')
                      ->orWhere('name', 'like', '%' . $search . '%')
                      ->orWhere('description', 'like', '%' . $search . '%');
                });
            }

            // Order by display_order and created_at
            $query->orderBy('display_order', 'asc')->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 50);
            $categories = $query->paginate($perPage);

            Log::info('KPI Category fetch successful', [
                'total' => $categories->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $categories->items(),
                'pagination' => [
                    'total' => $categories->total(),
                    'per_page' => $categories->perPage(),
                    'current_page' => $categories->currentPage(),
                    'last_page' => $categories->lastPage(),
                    'from' => $categories->firstItem(),
                    'to' => $categories->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('KPI Category fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách loại KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created KPI Category
     * Accessible by: OPERATOR, ADMIN
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== KPI Category Management: Create KPI Category ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->all(),
        ]);

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:kpi_categories,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ], [
            'code.required' => 'Mã loại KPI là bắt buộc',
            'code.unique' => 'Mã loại KPI đã tồn tại',
            'code.max' => 'Mã loại KPI không được vượt quá 50 ký tự',
            'name.required' => 'Tên loại KPI là bắt buộc',
            'name.max' => 'Tên loại KPI không được vượt quá 255 ký tự',
        ]);

        if ($validator->fails()) {
            Log::warning('KPI Category creation validation failed', [
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
            $displayOrder = $request->display_order ?? (KpiCategory::max('display_order') + 1);

            $category = KpiCategory::create([
                'code' => strtoupper($request->code),
                'name' => $request->name,
                'description' => $request->description,
                'display_order' => $displayOrder,
                'is_active' => $request->input('is_active', true),
            ]);

            Log::info('KPI Category created successfully', [
                'category_id' => $category->id,
                'category_code' => $category->code,
                'category_name' => $category->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại KPI đã được tạo thành công',
                'data' => $category,
            ], 201);
        } catch (\Exception $e) {
            Log::error('KPI Category creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo loại KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified KPI Category
     * Accessible by: OPERATOR, ADMIN
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Category Management: Show KPI Category ===', [
            'requester_id' => $request->user()->id,
            'category_id' => $id,
        ]);

        try {
            $category = KpiCategory::withCount('kpis')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $category,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI Category not found', ['category_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI Category fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải loại KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified KPI Category
     * Accessible by: OPERATOR, ADMIN
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Category Management: Update KPI Category ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'category_id' => $id,
            'data' => $request->all(),
        ]);

        try {
            $category = KpiCategory::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'code' => 'sometimes|required|string|max:50|unique:kpi_categories,code,' . $id,
                'name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ], [
                'code.required' => 'Mã loại KPI là bắt buộc',
                'code.unique' => 'Mã loại KPI đã tồn tại',
                'code.max' => 'Mã loại KPI không được vượt quá 50 ký tự',
                'name.required' => 'Tên loại KPI là bắt buộc',
                'name.max' => 'Tên loại KPI không được vượt quá 255 ký tự',
            ]);

            if ($validator->fails()) {
                Log::warning('KPI Category update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $updateData = $request->only([
                'name',
                'description',
                'display_order',
                'is_active',
            ]);

            if ($request->has('code')) {
                $updateData['code'] = strtoupper($request->code);
            }

            $category->update($updateData);

            Log::info('KPI Category updated successfully', [
                'category_id' => $category->id,
                'category_code' => $category->code,
                'category_name' => $category->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại KPI đã được cập nhật thành công',
                'data' => $category,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI Category not found for update', ['category_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI Category update failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật loại KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified KPI Category
     * Accessible by: OPERATOR, ADMIN
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Category Management: Delete KPI Category ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'category_id' => $id,
        ]);

        try {
            $category = KpiCategory::withCount('kpis')->findOrFail($id);

            // Check if Category is associated with any KPIs
            if ($category->kpis_count > 0) {
                Log::warning('Cannot delete KPI Category with associated KPIs', [
                    'category_id' => $id,
                    'kpis_count' => $category->kpis_count,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Không thể xóa loại KPI vì đang được sử dụng bởi {$category->kpis_count} chỉ tiêu KPI",
                ], 400);
            }

            $categoryName = $category->name;
            $category->delete();

            Log::info('KPI Category deleted successfully', [
                'category_id' => $id,
                'category_name' => $categoryName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại KPI đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI Category not found for deletion', ['category_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI Category deletion failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa loại KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
