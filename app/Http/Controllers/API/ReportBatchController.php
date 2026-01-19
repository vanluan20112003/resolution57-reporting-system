<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ReportBatch;
use App\Models\Activity;
use App\Models\KpiCategory;
use App\Models\BatchCollaboratorResponse;
use App\Models\ReportExport;
use App\Exports\ReportBatchExport;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

class ReportBatchController extends Controller
{
    /**
     * Get list of report batches for current user's organization
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $perPage = $request->input('per_page', 20);
        $query = ReportBatch::with(['creator:id,first_name,last_name,email'])
            ->withCount(['activities', 'collaboratorResponses'])
            ->byOrganization($user->organization_id)
            ->orderBy('created_at', 'desc');

        // Note: status is now calculated from dates, no need to filter by status column

        // Search by name
        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $batches = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $batches->items(),
            'pagination' => [
                'current_page' => $batches->currentPage(),
                'last_page' => $batches->lastPage(),
                'per_page' => $batches->perPage(),
                'total' => $batches->total(),
            ],
        ]);
    }

    /**
     * Get single report batch with activities
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::with([
            'creator:id,first_name,last_name,email',
            'activities' => function ($query) {
                $query->with([
                    'leadOrganization:id,name,short_name',
                    'kpis:id,code,title',
                    'collaboratingOrganizations:id,name,short_name',
                ]);
            },
            'collaboratorResponses' => function ($query) {
                $query->with([
                    'organization:id,name,short_name',
                    'submitter:id,first_name,last_name,email',
                    'activity:id,title',
                ])->orderBy('activity_id')->orderBy('submitted_at', 'desc');
            },
        ])
            ->withCount('collaboratorResponses')
            ->byOrganization($user->organization_id)
            ->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $batch,
        ]);
    }

    /**
     * Create new report batch
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'activity_ids' => 'nullable|array',
            'activity_ids.*' => 'uuid|exists:activities,id',
        ], [
            'name.required' => 'Vui lòng nhập tên đợt báo cáo',
            'name.max' => 'Tên đợt báo cáo không quá 255 ký tự',
            'end_date.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $batch = ReportBatch::create([
            'organization_id' => $user->organization_id,
            'created_by' => $user->id,
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'deadline' => $request->input('deadline'),
            'notes' => $request->input('notes'),
        ]);

        // Attach activities if provided
        if ($request->has('activity_ids') && is_array($request->input('activity_ids'))) {
            $activityIds = $request->input('activity_ids');
            $pivotData = [];
            foreach ($activityIds as $index => $activityId) {
                $pivotData[$activityId] = ['order_number' => $index + 1];
            }
            $batch->activities()->attach($pivotData);
        }

        $batch->load(['creator:id,first_name,last_name,email', 'activities']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo đợt báo cáo thành công',
            'data' => $batch,
        ], 201);
    }

    /**
     * Update report batch
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        if (!$batch->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Đợt báo cáo này không thể chỉnh sửa',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'activity_ids' => 'nullable|array',
            'activity_ids.*' => 'uuid|exists:activities,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Update basic fields (status is calculated from dates, not stored)
        $batch->fill($request->only([
            'name',
            'description',
            'start_date',
            'end_date',
            'deadline',
            'notes',
        ]));
        $batch->save();

        // Sync activities if provided
        if ($request->has('activity_ids')) {
            $activityIds = $request->input('activity_ids') ?? [];
            $pivotData = [];
            foreach ($activityIds as $index => $activityId) {
                $pivotData[$activityId] = ['order_number' => $index + 1];
            }
            $batch->activities()->sync($pivotData);
        }

        $batch->load(['creator:id,first_name,last_name,email', 'activities']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật đợt báo cáo',
            'data' => $batch,
        ]);
    }

    /**
     * Delete report batch
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        // Only allow deleting upcoming batches (not started yet)
        if ($batch->status !== ReportBatch::STATUS_UPCOMING) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa đợt báo cáo chưa bắt đầu (sắp tới)',
            ], 400);
        }

        $batch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa đợt báo cáo',
        ]);
    }

    /**
     * Get available activities for adding to batch
     */
    public function getAvailableActivities(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $query = Activity::with([
            'leadOrganization:id,name,short_name',
            'kpis:id,code,title',
            'collaboratingOrganizations:id,name,short_name',
        ])
            ->where('lead_organization_id', $user->organization_id)
            ->whereIn('status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS']);

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $query->where('start_date', '>=', $startDate);
        }
        if ($request->has('end_date')) {
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
            $query->where('end_date', '<=', $endDate);
        }

        // Search by title
        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Exclude activities already in a batch
        if ($request->has('exclude_batch_id')) {
            $batchId = $request->input('exclude_batch_id');
            $query->whereDoesntHave('reportBatches', function ($q) use ($batchId) {
                $q->where('report_batches.id', $batchId);
            });
        }

        $activities = $query->orderBy('start_date', 'desc')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /**
     * Add activities to batch
     */
    public function addActivities(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        if (!$batch->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Đợt báo cáo này không thể chỉnh sửa',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'activity_ids' => 'required|array|min:1',
            'activity_ids.*' => 'uuid|exists:activities,id',
        ], [
            'activity_ids.required' => 'Vui lòng chọn ít nhất một hoạt động',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $activityIds = $request->input('activity_ids');
        $maxOrder = $batch->activities()->max('order_number') ?? 0;

        $pivotData = [];
        foreach ($activityIds as $index => $activityId) {
            $pivotData[$activityId] = ['order_number' => $maxOrder + $index + 1];
        }

        // Use syncWithoutDetaching to add new ones without removing existing
        $batch->activities()->syncWithoutDetaching($pivotData);

        $batch->load('activities');

        return response()->json([
            'success' => true,
            'message' => 'Đã thêm hoạt động vào đợt báo cáo',
            'data' => $batch,
        ]);
    }

    /**
     * Remove activity from batch
     */
    public function removeActivity(Request $request, string $id, string $activityId): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        if (!$batch->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Đợt báo cáo này không thể chỉnh sửa',
            ], 400);
        }

        $batch->activities()->detach($activityId);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hoạt động khỏi đợt báo cáo',
        ]);
    }

    /**
     * Update activity order in batch
     */
    public function reorderActivities(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        if (!$batch->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Đợt báo cáo này không thể chỉnh sửa',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'activity_ids' => 'required|array',
            'activity_ids.*' => 'uuid',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $activityIds = $request->input('activity_ids');

        foreach ($activityIds as $index => $activityId) {
            $batch->activities()->updateExistingPivot($activityId, [
                'order_number' => $index + 1,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thứ tự hoạt động',
        ]);
    }

    /**
     * Get activities grouped by KPI structure for selection
     */
    public function getActivitiesByKpi(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get all activities for this organization
        $activities = Activity::with([
            'leadOrganization:id,name,short_name',
            'kpis:id,code,title,category_id',
            'collaboratingOrganizations:id,name,short_name',
        ])
            ->where('lead_organization_id', $user->organization_id)
            ->whereIn('status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'])
            ->orderBy('start_date', 'desc')
            ->get();

        // Get all KPI categories with KPIs
        $categories = KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) {
                $query->where('is_active', true)
                    ->orderBy('order_number')
                    ->select('id', 'category_id', 'code', 'title', 'order_number');
            }])
            ->get(['id', 'name', 'display_order']);

        // Build KPI -> Activities map
        $kpiActivitiesMap = [];
        $activitiesWithoutKpi = [];

        foreach ($activities as $activity) {
            $activityData = [
                'id' => $activity->id,
                'title' => $activity->title,
                'status' => $activity->status,
                'start_date' => $activity->start_date,
                'end_date' => $activity->end_date,
                'lead_organization' => $activity->leadOrganization,
                'collaborating_organizations' => $activity->collaboratingOrganizations->map(function ($org) {
                    return [
                        'id' => $org->id,
                        'name' => $org->name,
                        'short_name' => $org->short_name,
                    ];
                })->values(),
            ];

            if ($activity->kpis->isEmpty()) {
                $activitiesWithoutKpi[] = $activityData;
            } else {
                foreach ($activity->kpis as $kpi) {
                    if (!isset($kpiActivitiesMap[$kpi->id])) {
                        $kpiActivitiesMap[$kpi->id] = [];
                    }
                    $kpiActivitiesMap[$kpi->id][] = $activityData;
                }
            }
        }

        // Build response structure
        $result = [];
        foreach ($categories as $category) {
            $categoryData = [
                'id' => $category->id,
                'name' => $category->name,
                'kpis' => [],
            ];

            foreach ($category->kpis as $kpi) {
                $kpiActivities = $kpiActivitiesMap[$kpi->id] ?? [];
                if (!empty($kpiActivities)) {
                    $categoryData['kpis'][] = [
                        'id' => $kpi->id,
                        'code' => $kpi->code,
                        'title' => $kpi->title,
                        'activities' => $kpiActivities,
                    ];
                }
            }

            // Only include category if it has KPIs with activities
            if (!empty($categoryData['kpis'])) {
                $result[] = $categoryData;
            }
        }

        // Add activities without KPI
        if (!empty($activitiesWithoutKpi)) {
            $result[] = [
                'id' => 'no-kpi',
                'name' => 'Hoạt động chưa gắn KPI',
                'kpis' => [
                    [
                        'id' => 'no-kpi',
                        'code' => null,
                        'title' => 'Hoạt động chưa liên kết KPI',
                        'activities' => $activitiesWithoutKpi,
                    ]
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Submit collaborator response for a batch
     * (Đơn vị phối hợp gửi phản hồi)
     */
    public function submitCollaboratorResponse(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Find the batch (không cần kiểm tra organization vì đơn vị phối hợp có thể khác)
        $batch = ReportBatch::find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        // Check deadline - only allow submission before deadline
        if ($batch->deadline && now()->gt($batch->deadline)) {
            return response()->json([
                'success' => false,
                'message' => 'Đã quá hạn nộp báo cáo. Hạn nộp: ' . Carbon::parse($batch->deadline)->format('d/m/Y H:i'),
            ], 400);
        }

        // Validate input
        $validator = Validator::make($request->all(), [
            'activity_id' => 'required|uuid|exists:activities,id',
            'content' => 'required|string|max:5000',
        ], [
            'activity_id.required' => 'Vui lòng chọn hoạt động',
            'activity_id.exists' => 'Hoạt động không tồn tại',
            'content.required' => 'Vui lòng nhập nội dung phản hồi',
            'content.max' => 'Nội dung phản hồi không được vượt quá 5000 ký tự',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $activityId = $request->input('activity_id');

        // Verify activity is in this batch
        $activityInBatch = $batch->activities()->where('activities.id', $activityId)->exists();
        if (!$activityInBatch) {
            return response()->json([
                'success' => false,
                'message' => 'Hoạt động không thuộc đợt báo cáo này',
            ], 400);
        }

        // Verify user's organization is a collaborator in this activity
        $activity = Activity::with('collaboratingOrganizations')->find($activityId);
        $isCollaborator = $activity->collaboratingOrganizations
            ->contains('id', $user->organization_id);

        if (!$isCollaborator) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn vị của bạn không phải là đơn vị phối hợp trong hoạt động này',
            ], 403);
        }

        // Check if response already exists (update) or create new
        $response = BatchCollaboratorResponse::updateOrCreate(
            [
                'report_batch_id' => $batch->id,
                'organization_id' => $user->organization_id,
                'activity_id' => $activityId,
            ],
            [
                'content' => $request->input('content'),
                'submitted_by' => $user->id,
                'submitted_at' => now(),
            ]
        );

        // Load relationships
        $response->load([
            'organization:id,name,short_name',
            'submitter:id,first_name,last_name,email',
            'activity:id,title',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phản hồi thành công',
            'data' => $response,
        ]);
    }

    /**
     * Get collaborator responses for a batch
     */
    public function getCollaboratorResponses(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        $responses = BatchCollaboratorResponse::with([
            'organization:id,name,short_name',
            'submitter:id,first_name,last_name,email',
            'activity:id,title',
        ])
            ->where('report_batch_id', $batch->id)
            ->orderBy('activity_id')
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $responses,
        ]);
    }

    /**
     * Delete collaborator response
     */
    public function deleteCollaboratorResponse(Request $request, string $id, string $responseId): JsonResponse
    {
        $user = $request->user();

        $response = BatchCollaboratorResponse::find($responseId);

        if (!$response) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phản hồi',
            ], 404);
        }

        // Only allow delete if user is from the same organization or is batch owner
        $batch = ReportBatch::find($id);
        $canDelete = $response->organization_id === $user->organization_id ||
            ($batch && $batch->organization_id === $user->organization_id);

        if (!$canDelete) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa phản hồi này',
            ], 403);
        }

        $response->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phản hồi',
        ]);
    }

    // ==================== Collaborator Organization APIs ====================

    /**
     * Get list of batches where current user's organization is a collaborator
     * (Staff/Manager from collaborating orgs can see batches they need to report on)
     */
    public function collaboratorBatches(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $perPage = $request->input('per_page', 20);

        // Find batches where any activity has user's organization as collaborator
        $query = ReportBatch::with([
            'creator:id,first_name,last_name,email',
            'organization:id,name,short_name',
        ])
            ->withCount(['activities', 'collaboratorResponses'])
            ->whereHas('activities', function ($q) use ($user) {
                $q->whereHas('collaboratingOrganizations', function ($sq) use ($user) {
                    $sq->where('organizations.id', $user->organization_id);
                });
            })
            // Exclude batches owned by user's own organization
            ->where('organization_id', '!=', $user->organization_id)
            ->orderBy('deadline', 'asc')
            ->orderBy('created_at', 'desc');

        // Filter by status (calculated)
        if ($request->has('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            $today = now()->startOfDay();

            if ($status === 'upcoming') {
                $query->where(function ($q) use ($today) {
                    $q->whereNotNull('start_date')
                        ->where('start_date', '>', $today);
                });
            } elseif ($status === 'ongoing') {
                $query->where(function ($q) use ($today) {
                    $q->where(function ($sq) use ($today) {
                        $sq->whereNull('start_date')
                            ->orWhere('start_date', '<=', $today);
                    })->where(function ($sq) use ($today) {
                        $sq->whereNull('end_date')
                            ->orWhere('end_date', '>=', $today);
                    });
                });
            } elseif ($status === 'completed') {
                $query->where(function ($q) use ($today) {
                    $q->whereNotNull('end_date')
                        ->where('end_date', '<', $today);
                });
            }
        }

        // Search by name
        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $batches = $query->paginate($perPage);

        // Add response stats for each batch
        $batchItems = collect($batches->items())->map(function ($batch) use ($user) {
            $batchData = $batch->toArray();

            // Get activities where user's org is collaborator
            $collaboratorActivities = $batch->activities()
                ->whereHas('collaboratingOrganizations', function ($q) use ($user) {
                    $q->where('organizations.id', $user->organization_id);
                })
                ->pluck('activities.id');

            // Get responses from user's organization for this batch
            $responses = BatchCollaboratorResponse::where('report_batch_id', $batch->id)
                ->where('organization_id', $user->organization_id)
                ->get();

            $totalRequired = $collaboratorActivities->count();
            $submittedCount = $responses->whereIn('activity_id', $collaboratorActivities)->count();

            $batchData['my_response_stats'] = [
                'total_required' => $totalRequired,
                'submitted' => $submittedCount,
                'pending' => $totalRequired - $submittedCount,
            ];

            // Check if deadline has passed
            $batchData['is_overdue'] = $batch->deadline && now()->gt($batch->deadline);

            return $batchData;
        });

        return response()->json([
            'success' => true,
            'data' => $batchItems,
            'pagination' => [
                'current_page' => $batches->currentPage(),
                'last_page' => $batches->lastPage(),
                'per_page' => $batches->perPage(),
                'total' => $batches->total(),
            ],
        ]);
    }

    /**
     * Get summary statistics for collaborator batches
     * (Count of pending, overdue, completed batches for current user's organization)
     */
    public function collaboratorSummary(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $today = now()->startOfDay();

        // Get all batches where user's org is a collaborator
        $batches = ReportBatch::whereHas('activities', function ($q) use ($user) {
            $q->whereHas('collaboratingOrganizations', function ($sq) use ($user) {
                $sq->where('organizations.id', $user->organization_id);
            });
        })
            ->where('organization_id', '!=', $user->organization_id)
            ->get();

        $pending = 0;       // Batches with pending responses (not overdue)
        $overdue = 0;       // Batches with pending responses and past deadline
        $completed = 0;     // Batches where all responses submitted

        foreach ($batches as $batch) {
            // Get activities where user's org is collaborator
            $collaboratorActivityIds = $batch->activities()
                ->whereHas('collaboratingOrganizations', function ($q) use ($user) {
                    $q->where('organizations.id', $user->organization_id);
                })
                ->pluck('activities.id');

            // Get submitted responses
            $submittedCount = BatchCollaboratorResponse::where('report_batch_id', $batch->id)
                ->where('organization_id', $user->organization_id)
                ->whereIn('activity_id', $collaboratorActivityIds)
                ->count();

            $totalRequired = $collaboratorActivityIds->count();
            $hasPending = $submittedCount < $totalRequired;
            $isOverdue = $batch->deadline && now()->gt($batch->deadline);

            if (!$hasPending) {
                $completed++;
            } elseif ($isOverdue) {
                $overdue++;
            } else {
                $pending++;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'pending' => $pending,
                'overdue' => $overdue,
                'completed' => $completed,
                'total' => $batches->count(),
            ],
        ]);
    }

    /**
     * Get batch detail for collaborating organization (read-only view)
     * Only shows activities where user's org is collaborator
     */
    public function showForCollaborator(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $batch = ReportBatch::with([
            'creator:id,first_name,last_name,email',
            'organization:id,name,short_name',
        ])->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        // Check if user's organization is a collaborator in any activity of this batch
        $isCollaborator = $batch->activities()
            ->whereHas('collaboratingOrganizations', function ($q) use ($user) {
                $q->where('organizations.id', $user->organization_id);
            })
            ->exists();

        if (!$isCollaborator) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn vị của bạn không phải là đơn vị phối hợp trong đợt báo cáo này',
            ], 403);
        }

        // Get only activities where user's org is collaborator
        $activities = $batch->activities()
            ->with([
                'leadOrganization:id,name,short_name',
                'kpis:id,code,title',
                'collaboratingOrganizations:id,name,short_name',
            ])
            ->whereHas('collaboratingOrganizations', function ($q) use ($user) {
                $q->where('organizations.id', $user->organization_id);
            })
            ->get();

        // Get user's organization's responses for this batch
        $myResponses = BatchCollaboratorResponse::with([
            'submitter:id,first_name,last_name,email',
            'activity:id,title',
        ])
            ->where('report_batch_id', $batch->id)
            ->where('organization_id', $user->organization_id)
            ->get()
            ->keyBy('activity_id');

        // Merge activities with response status
        $activitiesWithStatus = $activities->map(function ($activity) use ($myResponses, $batch) {
            $activityData = $activity->toArray();
            $response = $myResponses->get($activity->id);

            $activityData['my_response'] = $response ? [
                'id' => $response->id,
                'content' => $response->content,
                'submitted_at' => $response->submitted_at,
                'submitted_by' => $response->submitter,
            ] : null;

            $activityData['can_submit'] = !$batch->deadline || now()->lte($batch->deadline);

            return $activityData;
        });

        $batchData = $batch->toArray();
        $batchData['activities'] = $activitiesWithStatus;
        $batchData['is_overdue'] = $batch->deadline && now()->gt($batch->deadline);
        $batchData['can_submit'] = !$batch->deadline || now()->lte($batch->deadline);

        // Response stats
        $totalRequired = $activities->count();
        $submittedCount = $myResponses->count();
        $batchData['my_response_stats'] = [
            'total_required' => $totalRequired,
            'submitted' => $submittedCount,
            'pending' => $totalRequired - $submittedCount,
        ];

        return response()->json([
            'success' => true,
            'data' => $batchData,
        ]);
    }

    // ==================== Export APIs ====================

    /**
     * Get preview data for batch report export
     */
    public function previewExport(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::with([
            'organization:id,name,short_name',
            'activities' => function ($query) {
                $query->with([
                    'leadOrganization:id,name,short_name',
                    'collaboratingOrganizations:id,name,short_name',
                    'kpis:id,code,title',
                ]);
            },
            'collaboratorResponses' => function ($query) {
                $query->with([
                    'organization:id,name,short_name',
                    'submitter:id,first_name,last_name,email',
                    'activity:id,title',
                ]);
            },
        ])
            ->byOrganization($user->organization_id)
            ->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        // Build preview data for Sheet 1: Activities
        $activitiesPreview = $batch->activities->map(function ($activity) {
            $kpiTexts = $activity->kpis->map(function ($kpi) {
                return $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
            })->toArray();

            $collabOrgs = $activity->collaboratingOrganizations->map(function ($org) {
                return $org->short_name ?? $org->name;
            })->toArray();

            return [
                'id' => $activity->id,
                'title' => $activity->title,
                'kpis' => implode(', ', $kpiTexts),
                'lead_organization' => $activity->leadOrganization
                    ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                    : '',
                'collaborating_organizations' => implode(', ', $collabOrgs),
                'status' => $activity->status,
                'completion_percentage' => $activity->completion_percentage,
                'start_date' => $activity->start_date,
                'end_date' => $activity->end_date,
            ];
        });

        // Build preview data for Sheet 2: Collaborator Responses
        $responsesGrouped = [];
        foreach ($batch->activities as $activity) {
            $activityResponses = $batch->collaboratorResponses->where('activity_id', $activity->id);
            $collabOrgs = $activity->collaboratingOrganizations;

            if ($collabOrgs->isEmpty()) continue;

            $orgResponses = [];
            foreach ($collabOrgs as $org) {
                $response = $activityResponses->where('organization_id', $org->id)->first();
                $orgResponses[] = [
                    'organization_id' => $org->id,
                    'organization_name' => $org->short_name ?? $org->name,
                    'has_response' => $response !== null,
                    'content' => $response ? $response->content : null,
                    'submitter' => $response && $response->submitter
                        ? trim(($response->submitter->first_name ?? '') . ' ' . ($response->submitter->last_name ?? ''))
                        : null,
                    'submitted_at' => $response ? $response->submitted_at : null,
                ];
            }

            $responsesGrouped[] = [
                'activity_id' => $activity->id,
                'activity_title' => $activity->title,
                'kpis' => $activity->kpis->map(fn($k) => $k->code ?? $k->title)->implode(', '),
                'total_collaborators' => $collabOrgs->count(),
                'submitted_count' => $activityResponses->count(),
                'responses' => $orgResponses,
            ];
        }

        // Statistics
        $totalActivities = $batch->activities->count();
        $activitiesWithCollab = $batch->activities->filter(fn($a) => $a->collaboratingOrganizations->isNotEmpty())->count();

        $totalRequired = 0;
        foreach ($batch->activities as $activity) {
            $totalRequired += $activity->collaboratingOrganizations->count();
        }
        $totalSubmitted = $batch->collaboratorResponses->count();

        return response()->json([
            'success' => true,
            'data' => [
                'batch' => [
                    'id' => $batch->id,
                    'name' => $batch->name,
                    'description' => $batch->description,
                    'start_date' => $batch->start_date,
                    'end_date' => $batch->end_date,
                    'deadline' => $batch->deadline,
                    'organization' => $batch->organization,
                ],
                'activities' => $activitiesPreview,
                'collaborator_responses' => $responsesGrouped,
                'statistics' => [
                    'total_activities' => $totalActivities,
                    'activities_with_collaborators' => $activitiesWithCollab,
                    'total_required_responses' => $totalRequired,
                    'total_submitted' => $totalSubmitted,
                    'completion_percentage' => $totalRequired > 0
                        ? round(($totalSubmitted / $totalRequired) * 100, 1)
                        : 0,
                ],
            ],
        ]);
    }

    /**
     * Export batch report to Excel and save to history
     */
    public function exportBatch(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::with([
            'organization:id,name,short_name',
            'activities' => function ($query) {
                $query->with([
                    'leadOrganization:id,name,short_name',
                    'collaboratingOrganizations:id,name,short_name',
                    'kpis.kpiCategory',
                    'kpis.tasks' => function($q) {
                        $q->where('is_active', true)->orderBy('order_number');
                    },
                ]);
            },
            'collaboratorResponses' => function ($query) {
                $query->with([
                    'organization:id,name,short_name',
                    'submitter:id,first_name,last_name,email',
                    'activity:id,title',
                ]);
            },
        ])
            ->byOrganization($user->organization_id)
            ->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        try {
            // Generate file name
            $timestamp = Carbon::now()->format('Ymd_His');
            $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $batch->name);
            $fileName = "BC_Dot_{$safeName}_{$timestamp}.xlsx";
            $filePath = "exports/batches/{$batch->id}/{$fileName}";

            // Create export
            $export = new ReportBatchExport($batch, $user->id);

            // Store file
            Excel::store($export, $filePath, 'local');

            // Get file size
            $fullPath = Storage::disk('local')->path($filePath);
            $fileSize = file_exists($fullPath) ? filesize($fullPath) : 0;

            // Save to export history
            $exportRecord = ReportExport::create([
                'organization_id' => $user->organization_id,
                'exported_by' => $user->id,
                'report_type' => 'batch',
                'view_mode' => 'batch_report',
                'month' => $batch->start_date ? Carbon::parse($batch->start_date)->month : null,
                'year' => $batch->start_date ? Carbon::parse($batch->start_date)->year : Carbon::now()->year,
                'selected_columns' => null,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'file_size' => $fileSize,
                'activity_count' => $batch->activities->count(),
                'status' => 'completed',
                'notes' => "Đợt báo cáo: {$batch->name}",
                'exported_at' => Carbon::now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã xuất báo cáo thành công',
                'data' => [
                    'export_id' => $exportRecord->id,
                    'file_name' => $fileName,
                    'file_size' => $fileSize,
                    'download_url' => route('api.reports.batches.download', ['id' => $batch->id, 'exportId' => $exportRecord->id]),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to export batch report', [
                'batch_id' => $batch->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xuất báo cáo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download exported batch report file
     */
    public function downloadExport(Request $request, string $id, string $exportId)
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        $exportRecord = ReportExport::where('id', $exportId)
            ->where('organization_id', $user->organization_id)
            ->first();

        if (!$exportRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy bản ghi xuất báo cáo',
            ], 404);
        }

        if (!Storage::disk('local')->exists($exportRecord->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File không tồn tại',
            ], 404);
        }

        return Storage::disk('local')->download(
            $exportRecord->file_path,
            $exportRecord->file_name,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]
        );
    }

    /**
     * Get export history for a batch
     */
    public function exportHistory(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $batch = ReportBatch::byOrganization($user->organization_id)->find($id);

        if (!$batch) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đợt báo cáo',
            ], 404);
        }

        $exports = ReportExport::where('organization_id', $user->organization_id)
            ->where('report_type', 'batch')
            ->where('notes', 'like', "%{$batch->name}%")
            ->with(['exporter:id,first_name,last_name,email'])
            ->orderBy('exported_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $exports->map(function ($export) use ($id) {
                return [
                    'id' => $export->id,
                    'file_name' => $export->file_name,
                    'file_size' => $export->file_size,
                    'file_size_formatted' => $export->file_size_formatted,
                    'activity_count' => $export->activity_count,
                    'exporter' => $export->exporter ? [
                        'id' => $export->exporter->id,
                        'name' => trim(($export->exporter->first_name ?? '') . ' ' . ($export->exporter->last_name ?? '')),
                        'email' => $export->exporter->email,
                    ] : null,
                    'exported_at' => $export->exported_at,
                    'download_url' => route('api.reports.batches.download', ['id' => $id, 'exportId' => $export->id]),
                ];
            }),
        ]);
    }
}
