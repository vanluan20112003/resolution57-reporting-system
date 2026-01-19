<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\KpiTask;
use App\Models\Kpi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class KpiTaskController extends Controller
{
    /**
     * Get all tasks for a specific KPI
     */
    public function index(Request $request, $kpiId)
    {
        try {
            $kpi = Kpi::find($kpiId);

            if (!$kpi) {
                return response()->json([
                    'success' => false,
                    'message' => 'KPI không tồn tại'
                ], 404);
            }

            $query = KpiTask::where('kpi_id', $kpiId)->ordered();

            // Filter by status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // Search by title or code
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            $tasks = $query->get();

            return response()->json([
                'success' => true,
                'data' => $tasks,
                'kpi' => [
                    'id' => $kpi->id,
                    'title' => $kpi->title,
                    'code' => $kpi->code,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching KPI tasks: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single task
     */
    public function show($kpiId, $taskId)
    {
        try {
            $task = KpiTask::with('kpi')
                ->where('kpi_id', $kpiId)
                ->where('id', $taskId)
                ->first();

            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhiệm vụ không tồn tại'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $task
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching KPI task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải thông tin nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new task for a KPI
     */
    public function store(Request $request, $kpiId)
    {
        try {
            $user = $request->user();

            // Check permission - only ADMIN, OPERATOR can create
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tạo nhiệm vụ KPI'
                ], 403);
            }

            $kpi = Kpi::find($kpiId);
            if (!$kpi) {
                return response()->json([
                    'success' => false,
                    'message' => 'KPI không tồn tại'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'code' => 'nullable|string|max:100',
                'title' => 'required|string|max:500',
                'description' => 'nullable|string',
                'target_value' => 'nullable|string|max:255',
                'unit' => 'nullable|string|max:100',
                'order_number' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get max order_number for this KPI
            $maxOrder = KpiTask::where('kpi_id', $kpiId)->max('order_number') ?? 0;

            $task = KpiTask::create([
                'kpi_id' => $kpiId,
                'code' => $request->code,
                'title' => $request->title,
                'description' => $request->description,
                'target_value' => $request->target_value,
                'unit' => $request->unit,
                'order_number' => $request->order_number ?? ($maxOrder + 1),
                'is_active' => $request->is_active ?? true,
                'created_by' => $user->id,
            ]);

            $task->load('kpi');

            return response()->json([
                'success' => true,
                'message' => 'Tạo nhiệm vụ thành công',
                'data' => $task
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating KPI task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a task
     */
    public function update(Request $request, $kpiId, $taskId)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền cập nhật nhiệm vụ KPI'
                ], 403);
            }

            $task = KpiTask::where('kpi_id', $kpiId)
                ->where('id', $taskId)
                ->first();

            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhiệm vụ không tồn tại'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'code' => 'nullable|string|max:100',
                'title' => 'sometimes|required|string|max:500',
                'description' => 'nullable|string',
                'target_value' => 'nullable|string|max:255',
                'unit' => 'nullable|string|max:100',
                'order_number' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $task->update(array_merge(
                $request->only([
                    'code',
                    'title',
                    'description',
                    'target_value',
                    'unit',
                    'order_number',
                    'is_active',
                ]),
                ['updated_by' => $user->id]
            ));

            $task->load('kpi');

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật nhiệm vụ thành công',
                'data' => $task
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating KPI task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a task
     */
    public function destroy(Request $request, $kpiId, $taskId)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xóa nhiệm vụ KPI'
                ], 403);
            }

            $task = KpiTask::where('kpi_id', $kpiId)
                ->where('id', $taskId)
                ->first();

            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhiệm vụ không tồn tại'
                ], 404);
            }

            $task->delete();

            return response()->json([
                'success' => true,
                'message' => 'Xóa nhiệm vụ thành công'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting KPI task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch create/update tasks for a KPI
     * Useful when editing KPI form with multiple tasks
     */
    public function batchUpdate(Request $request, $kpiId)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền cập nhật nhiệm vụ KPI'
                ], 403);
            }

            $kpi = Kpi::find($kpiId);
            if (!$kpi) {
                return response()->json([
                    'success' => false,
                    'message' => 'KPI không tồn tại'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'tasks' => 'required|array',
                'tasks.*.id' => 'nullable|uuid',
                'tasks.*.code' => 'nullable|string|max:100',
                'tasks.*.title' => 'required|string|max:500',
                'tasks.*.description' => 'nullable|string',
                'tasks.*.target_value' => 'nullable|string|max:255',
                'tasks.*.unit' => 'nullable|string|max:100',
                'tasks.*.order_number' => 'nullable|integer|min:0',
                'tasks.*.is_active' => 'nullable|boolean',
                'tasks.*._delete' => 'nullable|boolean', // Mark for deletion
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tasks = $request->tasks;
            $existingIds = [];
            $results = [
                'created' => 0,
                'updated' => 0,
                'deleted' => 0,
            ];

            foreach ($tasks as $index => $taskData) {
                // Handle deletion
                if (!empty($taskData['_delete']) && !empty($taskData['id'])) {
                    KpiTask::where('id', $taskData['id'])
                        ->where('kpi_id', $kpiId)
                        ->delete();
                    $results['deleted']++;
                    continue;
                }

                if (!empty($taskData['id'])) {
                    // Update existing task
                    $task = KpiTask::where('id', $taskData['id'])
                        ->where('kpi_id', $kpiId)
                        ->first();

                    if ($task) {
                        $task->update([
                            'code' => $taskData['code'] ?? null,
                            'title' => $taskData['title'],
                            'description' => $taskData['description'] ?? null,
                            'target_value' => $taskData['target_value'] ?? null,
                            'unit' => $taskData['unit'] ?? null,
                            'order_number' => $taskData['order_number'] ?? $index,
                            'is_active' => $taskData['is_active'] ?? true,
                            'updated_by' => $user->id,
                        ]);
                        $existingIds[] = $task->id;
                        $results['updated']++;
                    }
                } else {
                    // Create new task
                    $task = KpiTask::create([
                        'kpi_id' => $kpiId,
                        'code' => $taskData['code'] ?? null,
                        'title' => $taskData['title'],
                        'description' => $taskData['description'] ?? null,
                        'target_value' => $taskData['target_value'] ?? null,
                        'unit' => $taskData['unit'] ?? null,
                        'order_number' => $taskData['order_number'] ?? $index,
                        'is_active' => $taskData['is_active'] ?? true,
                        'created_by' => $user->id,
                    ]);
                    $existingIds[] = $task->id;
                    $results['created']++;
                }
            }

            // Load updated tasks
            $updatedTasks = KpiTask::where('kpi_id', $kpiId)->ordered()->get();

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật danh sách nhiệm vụ thành công',
                'data' => $updatedTasks,
                'results' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error batch updating KPI tasks: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reorder tasks
     */
    public function reorder(Request $request, $kpiId)
    {
        try {
            $user = $request->user();

            // Check permission
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền sắp xếp nhiệm vụ KPI'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'task_ids' => 'required|array',
                'task_ids.*' => 'uuid',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            foreach ($request->task_ids as $index => $taskId) {
                KpiTask::where('id', $taskId)
                    ->where('kpi_id', $kpiId)
                    ->update(['order_number' => $index + 1]);
            }

            $tasks = KpiTask::where('kpi_id', $kpiId)->ordered()->get();

            return response()->json([
                'success' => true,
                'message' => 'Sắp xếp nhiệm vụ thành công',
                'data' => $tasks
            ]);
        } catch (\Exception $e) {
            Log::error('Error reordering KPI tasks: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi sắp xếp nhiệm vụ',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
