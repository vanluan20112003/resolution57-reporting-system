<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Kpi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class KpiController extends Controller
{
    /**
     * Display a listing of KPIs
     * Accessible by: OPERATOR, ADMIN
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== KPI Management: Fetch KPIs ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['source', 'category', 'is_active', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = Kpi::query()->with('creator:id,email');

            // Filter by source (CENTRAL or VNU)
            if ($request->has('source') && in_array($request->source, [Kpi::SOURCE_CENTRAL, Kpi::SOURCE_VNU])) {
                $query->bySource($request->source);
            }

            // Filter by category
            if ($request->has('category') && $request->category) {
                $query->byCategory($request->category);
            }

            // Filter by active status
            if ($request->has('is_active')) {
                $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            // Search by code or title
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%' . $search . '%')
                      ->orWhere('title', 'like', '%' . $search . '%')
                      ->orWhere('description', 'like', '%' . $search . '%');
                });
            }

            // Order by order_number and created_at
            $query->orderBy('order_number', 'asc')->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 15);
            $kpis = $query->paginate($perPage);

            Log::info('KPI fetch successful', [
                'total' => $kpis->total(),
                'per_page' => $kpis->perPage(),
                'current_page' => $kpis->currentPage(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $kpis->items(),
                'pagination' => [
                    'total' => $kpis->total(),
                    'per_page' => $kpis->perPage(),
                    'current_page' => $kpis->currentPage(),
                    'last_page' => $kpis->lastPage(),
                    'from' => $kpis->firstItem(),
                    'to' => $kpis->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('KPI fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created KPI
     * Accessible by: OPERATOR, ADMIN
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== KPI Management: Create KPI ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->except(['password']),
        ]);

        $validator = Validator::make($request->all(), [
            'source' => 'required|in:' . Kpi::SOURCE_CENTRAL . ',' . Kpi::SOURCE_VNU,
            'code' => 'nullable|string|max:100|unique:kpis,code',
            'title' => 'required|string|max:500',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'order_number' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            Log::warning('KPI creation validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $kpi = Kpi::create([
                'source' => $request->source,
                'code' => $request->code,
                'title' => $request->title,
                'description' => $request->description,
                'category' => $request->category,
                'order_number' => $request->order_number ?? 0,
                'is_active' => $request->input('is_active', true),
                'created_by' => $request->user()->id,
            ]);

            $kpi->load('creator:id,email');

            Log::info('KPI created successfully', [
                'kpi_id' => $kpi->id,
                'kpi_code' => $kpi->code,
                'kpi_title' => $kpi->title,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'KPI đã được tạo thành công',
                'data' => $kpi,
            ], 201);
        } catch (\Exception $e) {
            Log::error('KPI creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified KPI
     * Accessible by: OPERATOR, ADMIN
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Management: Show KPI ===', [
            'requester_id' => $request->user()->id,
            'kpi_id' => $id,
        ]);

        try {
            $kpi = Kpi::with('creator:id,email')->findOrFail($id);

            Log::info('KPI fetched successfully', [
                'kpi_id' => $kpi->id,
                'kpi_code' => $kpi->code,
            ]);

            return response()->json([
                'success' => true,
                'data' => $kpi,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI not found', ['kpi_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified KPI
     * Accessible by: OPERATOR, ADMIN
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Management: Update KPI ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'kpi_id' => $id,
            'data' => $request->except(['password']),
        ]);

        try {
            $kpi = Kpi::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'source' => 'sometimes|required|in:' . Kpi::SOURCE_CENTRAL . ',' . Kpi::SOURCE_VNU,
                'code' => 'sometimes|nullable|string|max:100|unique:kpis,code,' . $id,
                'title' => 'sometimes|required|string|max:500',
                'description' => 'nullable|string',
                'category' => 'nullable|string|max:255',
                'order_number' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                Log::warning('KPI update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $kpi->update($request->only([
                'source',
                'code',
                'title',
                'description',
                'category',
                'order_number',
                'is_active',
            ]));

            $kpi->load('creator:id,email');

            Log::info('KPI updated successfully', [
                'kpi_id' => $kpi->id,
                'kpi_code' => $kpi->code,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'KPI đã được cập nhật thành công',
                'data' => $kpi,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI not found for update', ['kpi_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified KPI
     * Accessible by: OPERATOR, ADMIN
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== KPI Management: Delete KPI ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'kpi_id' => $id,
        ]);

        try {
            $kpi = Kpi::findOrFail($id);

            // Check if KPI is associated with any activities
            $activitiesCount = $kpi->activities()->count();

            if ($activitiesCount > 0) {
                Log::warning('Cannot delete KPI with associated activities', [
                    'kpi_id' => $id,
                    'activities_count' => $activitiesCount,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Không thể xóa KPI vì đang được sử dụng bởi {$activitiesCount} hoạt động",
                ], 400);
            }

            $kpiCode = $kpi->code;
            $kpiTitle = $kpi->title;
            $kpi->delete();

            Log::info('KPI deleted successfully', [
                'kpi_id' => $id,
                'kpi_code' => $kpiCode,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'KPI đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('KPI not found for deletion', ['kpi_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy KPI',
            ], 404);
        } catch (\Exception $e) {
            Log::error('KPI deletion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get KPI categories
     * Accessible by: OPERATOR, ADMIN
     */
    public function categories(Request $request): JsonResponse
    {
        try {
            $categories = Kpi::select('category')
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->pluck('category');

            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            Log::error('KPI categories fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh mục KPI',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
