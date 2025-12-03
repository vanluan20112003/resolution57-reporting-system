<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityType;
use App\Models\ActivityField;
use App\Models\Organization;
use App\Models\Kpi;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    /**
     * Activity Status Constants
     * Workflow: DRAFT -> PENDING_APPROVAL -> REVIEWED -> IN_PROGRESS (locked)
     */
    const STATUS_DRAFT = 'DRAFT';
    const STATUS_PENDING_APPROVAL = 'PENDING_APPROVAL';
    const STATUS_REVIEWED = 'REVIEWED'; // Step 1: Manager reviewed, waiting for final confirmation
    const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    const STATUS_ON_HOLD = 'ON_HOLD';
    const STATUS_CANCELLED = 'CANCELLED';
    const STATUS_COMPLETED = 'COMPLETED';

    /**
     * Check if user can access activity based on organization and status
     * Returns array with 'allowed' boolean and 'reason' string for error message
     */
    private function canAccessActivity(Request $request, Activity $activity): array
    {
        $user = $request->user();
        $role = $user->role;

        // ADMIN and OPERATOR can access all activities
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return ['allowed' => true, 'reason' => ''];
        }

        // User must have an organization
        if (!$user->organization_id) {
            return ['allowed' => false, 'reason' => 'Bạn chưa thuộc đơn vị nào. Vui lòng liên hệ quản trị viên để được gán vào đơn vị.'];
        }

        // Check if activity belongs to user's organization
        $isOwnOrg = $activity->lead_organization_id === $user->organization_id;

        // GUEST can only view approved activities (IN_PROGRESS, COMPLETED) from their organization
        if ($role === 'GUEST') {
            if (!$isOwnOrg) {
                return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn.'];
            }
            $approvedStatuses = [self::STATUS_IN_PROGRESS, self::STATUS_ON_HOLD, self::STATUS_COMPLETED];
            if (!in_array($activity->status, $approvedStatuses)) {
                return ['allowed' => false, 'reason' => 'Bạn chỉ có thể xem các hoạt động đã được phê duyệt.'];
            }
            return ['allowed' => true, 'reason' => ''];
        }

        // STAFF and MANAGER can access all activities from their organization
        if (in_array($role, ['STAFF', 'MANAGER'])) {
            if (!$isOwnOrg) {
                return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn.'];
            }
            return ['allowed' => true, 'reason' => ''];
        }

        return ['allowed' => false, 'reason' => 'Bạn không có quyền truy cập hoạt động này.'];
    }

    /**
     * Check if user can manage activities (create/update/delete)
     */
    private function canManageActivities(Request $request): bool
    {
        $user = $request->user();
        $role = $user->role;

        // ADMIN and OPERATOR can manage all
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return true;
        }

        // STAFF and MANAGER with organization can manage their organization's activities
        if (in_array($role, ['STAFF', 'MANAGER']) && $user->organization_id) {
            return true;
        }

        return false;
    }

    /**
     * Get user's organization ID for filtering/creating
     * Returns null for ADMIN/OPERATOR (they can see/create for any org)
     */
    private function getUserOrganizationId(Request $request): ?string
    {
        $user = $request->user();
        $role = $user->role;

        // ADMIN and OPERATOR don't have organization restriction
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return null;
        }

        return $user->organization_id;
    }

    /**
     * Display a listing of activities
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== Activity Management: Fetch Activities ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'requester_organization' => $request->user()->organization_id,
            'filters' => $request->only(['status', 'activity_type_id', 'activity_field_id', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = Activity::query()
                ->with([
                    'activityType:id,name',
                    'activityField:id,name',
                    'leadOrganization:id,name,short_name',
                    'creator:id,email,first_name,last_name',
                ]);

            // Security: Filter by organization for STAFF/MANAGER
            $userOrgId = $this->getUserOrganizationId($request);
            if ($userOrgId) {
                $query->where('lead_organization_id', $userOrgId);
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by activity type
            if ($request->has('activity_type_id') && $request->activity_type_id) {
                $query->where('activity_type_id', $request->activity_type_id);
            }

            // Filter by activity field
            if ($request->has('activity_field_id') && $request->activity_field_id) {
                $query->where('activity_field_id', $request->activity_field_id);
            }

            // Search by code or title
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%' . $search . '%')
                      ->orWhere('title', 'like', '%' . $search . '%');
                });
            }

            // Order by created_at desc
            $query->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 15);
            $activities = $query->paginate($perPage);

            Log::info('Activity fetch successful', [
                'total' => $activities->total(),
                'per_page' => $activities->perPage(),
                'current_page' => $activities->currentPage(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $activities->items(),
                'pagination' => [
                    'total' => $activities->total(),
                    'per_page' => $activities->perPage(),
                    'current_page' => $activities->currentPage(),
                    'last_page' => $activities->lastPage(),
                    'from' => $activities->firstItem(),
                    'to' => $activities->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Activity fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created activity
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== Activity Management: Create Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->except(['password']),
        ]);

        if (!$this->canManageActivities($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo hoạt động',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:500',
            'description' => 'nullable|string',
            'activity_type_id' => 'required|uuid|exists:activity_types,id',
            'activity_field_id' => 'nullable|uuid|exists:activity_fields,id',
            'start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'budget_source' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:500',
            'external_url' => 'nullable|url|max:1000',
            'kpi_ids' => 'nullable|array',
            'kpi_ids.*' => 'uuid|exists:kpis,id',
        ], [
            'title.required' => 'Tên hoạt động là bắt buộc',
            'title.max' => 'Tên hoạt động không được vượt quá 500 ký tự',
            'activity_type_id.required' => 'Loại hoạt động là bắt buộc',
            'activity_type_id.exists' => 'Loại hoạt động không tồn tại',
            'activity_field_id.exists' => 'Lĩnh vực hoạt động không tồn tại',
            'end_date.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
            'budget.min' => 'Kinh phí không được âm',
            'external_url.url' => 'Đường dẫn không hợp lệ',
        ]);

        if ($validator->fails()) {
            Log::warning('Activity creation validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Determine organization
            $user = $request->user();
            $organizationId = $user->organization_id;

            // STAFF/MANAGER must use their own organization
            if (in_array($user->role, ['STAFF', 'MANAGER']) && !$organizationId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn phải thuộc một đơn vị để tạo hoạt động',
                ], 400);
            }

            // Generate activity code
            $code = $this->generateActivityCode();

            $activity = Activity::create([
                'code' => $code,
                'title' => $request->title,
                'description' => $request->description,
                'activity_type_id' => $request->activity_type_id,
                'activity_field_id' => $request->activity_field_id,
                'status' => self::STATUS_DRAFT,
                'lead_organization_id' => $organizationId,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'budget' => $request->budget,
                'budget_source' => $request->budget_source,
                'location' => $request->location,
                'external_url' => $request->external_url,
                'created_by' => $user->id,
                'completion_percentage' => 0,
            ]);

            // Attach KPIs if provided
            if ($request->has('kpi_ids') && is_array($request->kpi_ids)) {
                $activity->kpis()->attach($request->kpi_ids);
            }

            Notification::create([
                "user_id" => $user->id,
                "title" => "Tạo hoạt động thành công",
                "message" => "Bạn đã tạo hoạt động {$code} thành công",
                "category" => "activity",
                "notification_type" => "activity_created",
                "icon" => "PlusCircleOutlined",
                "color" => "primary",
                "action_url" => "/dashboard?tab=activity-management",
                "actor_id" => $user->id,
                "is_read" => false,
                "priority" => "normal"
            ]);

            DB::commit();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'kpis:id,source,code,title',
            ]);

            Log::info('Activity created successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'activity_title' => $activity->title,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được tạo thành công',
                'data' => $activity,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Activity creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified activity
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Show Activity ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        try {
            $activity = Activity::with([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'approver:id,email,first_name,last_name',
                'kpis:id,source,code,title',
            ])->findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (!$accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            Log::info('Activity fetched successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
            ]);

            return response()->json([
                'success' => true,
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity not found', ['activity_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Activity fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified activity
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Update Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
            'data' => $request->except(['password']),
        ]);

        try {
            $activity = Activity::findOrFail($id);
            $user = $request->user();

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (!$accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // STAFF can only edit their own activities
            if ($user->role === 'STAFF' && $activity->created_by !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể chỉnh sửa hoạt động do chính mình tạo.',
                ], 403);
            }

            // Check if activity is locked
            if ($activity->is_locked) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hoạt động đã bị khóa, không thể chỉnh sửa. Vui lòng tạo hoạt động mới.',
                ], 400);
            }

            // Check if activity is already approved - only allow updating progress/result
            $approvedStatuses = [self::STATUS_IN_PROGRESS, self::STATUS_ON_HOLD, self::STATUS_COMPLETED];
            if (in_array($activity->status, $approvedStatuses)) {
                // Only allow updating completion_percentage, result_summary, actual dates, and status
                $allowedFields = ['completion_percentage', 'result_summary', 'actual_start_date', 'actual_end_date', 'status'];
                $requestFields = array_keys($request->except(['_method', '_token']));
                $disallowedFields = array_diff($requestFields, $allowedFields);

                if (!empty($disallowedFields)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hoạt động đã được phê duyệt. Chỉ có thể cập nhật tiến độ, kết quả và trạng thái. Nếu cần thay đổi thông tin khác, vui lòng khóa hoạt động này và tạo mới.',
                    ], 400);
                }
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:500',
                'description' => 'nullable|string',
                'activity_type_id' => 'sometimes|required|uuid|exists:activity_types,id',
                'activity_field_id' => 'nullable|uuid|exists:activity_fields,id',
                'status' => 'sometimes|in:DRAFT,PENDING_APPROVAL,IN_PROGRESS,ON_HOLD,CANCELLED,COMPLETED',
                'start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
                'end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:start_date',
                'actual_start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
                'actual_end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:actual_start_date',
                'budget' => 'nullable|numeric|min:0',
                'budget_source' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:500',
                'external_url' => 'nullable|url|max:1000',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'result_summary' => 'nullable|string',
                'kpi_ids' => 'nullable|array',
                'kpi_ids.*' => 'uuid|exists:kpis,id',
            ]);

            if ($validator->fails()) {
                Log::warning('Activity update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            $activity->update($request->only([
                'title',
                'description',
                'activity_type_id',
                'activity_field_id',
                'status',
                'start_date',
                'end_date',
                'actual_start_date',
                'actual_end_date',
                'budget',
                'budget_source',
                'location',
                'external_url',
                'completion_percentage',
                'result_summary',
            ]));

            $activity->updated_by = $request->user()->id;
            $activity->save();

            // Update KPIs if provided
            if ($request->has('kpi_ids')) {
                $activity->kpis()->sync($request->kpi_ids ?? []);
            }

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'kpis:id,source,code,title',
            ]);

            Log::info('Activity updated successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
            ]);

            if($activity->status === self::STATUS_PENDING_APPROVAL){
                $orgManagers = User::where("organization_id", $activity->lead_organization_id)->where("role", "MANAGER")->get();
                $notifications = [];
                foreach ($orgManagers as $manager) {
                    $notifications[] = [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $manager->id,
                        "title" => "Chỉnh sửa hoạt động PENDING",
                        "message" => "{$activity->creator->getNameAttribute()} đã cập nhật hoạt động {$activity->code} đang chờ duyệt",
                        "category" => "activity",
                        "notification_type" => "activity_updated",
                        "icon" => "EditOutlined",
                        "color" => "primary",
                        "action_url" => "/dashboard?tab=pending-approval",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "normal",
                        "created_at" => now(),
                        "updated_at" => now()
                    ];
                }
                DB::table('notifications')->insert($notifications);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được cập nhật thành công',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Activity not found for update', ['activity_id' => $id]);
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Activity update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified activity
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Delete Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        DB::beginTransaction();
        try {
            $activity = Activity::findOrFail($id);
            $user = $request->user();

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (!$accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // STAFF can only delete their own activities
            if ($user->role === 'STAFF' && $activity->created_by !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể xóa hoạt động do chính mình tạo.',
                ], 403);
            }

            // Only allow deletion of DRAFT or PENDING_APPROVAL activities
            if (!in_array($activity->status, [self::STATUS_DRAFT, self::STATUS_PENDING_APPROVAL])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể xóa hoạt động ở trạng thái Nháp hoặc Chờ phê duyệt. Với hoạt động đã phê duyệt, hãy khóa lại thay vì xóa.',
                ], 400);
            }

            $activityCode = $activity->code;
            $activityTitle = $activity->title;

            // Delete related data
            $activity->kpis()->detach();
            $activity->delete();

            Log::info('Activity deleted successfully', [
                'activity_id' => $id,
                'activity_code' => $activityCode,
            ]);

            if($activity->status === self::STATUS_PENDING_APPROVAL) {
                $orgManagers = User::where("organization_id", $activity->lead_organization_id)->where("role", "MANAGER")->get();
                $notifications = [];
                foreach ($orgManagers as $manager) {
                    $notifications[] = [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $manager->id,
                        "title" => "Xóa hoạt động PENDING",
                        "message" => "{$activity->creator->getNameAttribute()} đã rút lại hoạt động {$activity->code}",
                        "category" => "activity",
                        "notification_type" => "activity_withdrawn",
                        "icon" => "RollbackOutlined",
                        "color" => "warning",
                        "action_url" => "/dashboard?tab=activity-management",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "normal",
                        "created_at" => now(),
                        "updated_at" => now()
                    ];
                }
                DB::table('notifications')->insert($notifications);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            Log::warning('Activity not found for deletion', ['activity_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Activity deletion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit activity for approval
     */
    public function submitForApproval(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Submit for Approval ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (!$accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Only DRAFT can be submitted
            if ($activity->status !== self::STATUS_DRAFT) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể gửi phê duyệt hoạt động ở trạng thái Nháp',
                ], 400);
            }

            $activity->status = self::STATUS_PENDING_APPROVAL;
            $activity->updated_by = $request->user()->id;
            $activity->save();

            Log::info('Activity submitted for approval', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
            ]);
            

            $organization = Organization::find($activity->lead_organization_id);

            $orgManagers = User::where("organization_id", $activity->lead_organization_id)
            ->where("role", "MANAGER")
            ->get();

            $operatorAdmins = User::whereIn("role", ["ADMIN", "OPERATOR"])->get();  
            $notifications = [[
                "id" => Str::uuid()->toString(),
                "user_id" => $request->user()->id,
                "title" => "Gửi yêu cầu phê duyệt",
                "message" => "Bạn đã gửi hoạt động {$activity->code} để phê duyệt",
                "category" => "activity",
                "notification_type" => "activity_submitted",
                "icon" => "SendOutlined",
                "color" => "processing",
                "action_url" => "/dashboard?tab=activity-management",
                "actor_id" => $activity->created_by,
                "is_read" => false,
                "priority" => "normal",
                "data" => json_encode([
                    "activity_id" => $activity->id,
                    "activity_code" => $activity->code,
                    "activity_title" => $activity->title,
                    "organization_id" => $organization ? $organization->id : null,
                    "organization_name" => $organization ? $organization->name : null,
                    "submitter_id" => $request->user()->id,
                    "submitter_name" => $request->user()->name,
                ]),
                "created_at" => now(),
                "updated_at" => now()
            ]];
            foreach ($orgManagers as $manager) {
                $notifications[] = [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $manager->id,
                    "title" => "Có hoạt động chờ duyệt",
                    "message" => "{$request->user()->name} đã gửi hoạt động {$activity->code} chờ phê duyệt",
                    "category" => "activity",
                    "notification_type" => "activity_pending_approval",
                    "icon" => "ClockCircleOutlined",
                    "color" => "warning",
                    "action_url" => "/dashboard?tab=pending-approval",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "high",
                    "data" => json_encode([
                    "activity_id" => $activity->id,
                    "activity_code" => $activity->code,
                    "activity_title" => $activity->title,
                    "organization_id" => $organization ? $organization->id : null,
                    "organization_name" => $organization ? $organization->name : null,
                    "submitter_id" => $request->user()->id,
                    "submitter_name" => $request->user()->name,
                ]),
                    "created_at" => now(),
                    "updated_at" => now(),
                ];
            }

            foreach ($operatorAdmins as $admin) {
                $notifications[] = [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $admin->id,
                    "title" => "Có hoạt động chờ duyệt",
                    "message" => "Có hoạt động mới {$activity->code} từ {$organization->code} chờ phê duyệt",
                    "category" => "activity",
                    "notification_type" => "activity_pending_approval",
                    "icon" => "ClockCircleOutlined",
                    "color" => "warning",
                    "action_url" => "/dashboard?tab=pending-approval",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "normal",
                    "data" => json_encode([
                        "activity_id" => $activity->id,
                        "activity_code" => $activity->code,
                        "activity_title" => $activity->title,
                        "organization_id" => $organization ? $organization->id : null,
                        "organization_name" => $organization ? $organization->name : null,
                        "submitter_id" => $request->user()->id,
                        "submitter_name" => $request->user()->name,
                    ]),
                    "created_at" => now(),
                    "updated_at" => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được gửi phê duyệt',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Submit for approval failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi phê duyệt',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Review activity - Step 1 of approval (MANAGER, OPERATOR, ADMIN only)
     * Changes status from PENDING_APPROVAL to REVIEWED
     */
    public function review(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Review Activity (Step 1) ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only MANAGER, OPERATOR, ADMIN can review
        if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem xét hoạt động',
            ], 403);
        }

        try {
            $activity = Activity::findOrFail($id);

            // Security check for MANAGER
            if ($user->role === 'MANAGER' && $activity->lead_organization_id !== $user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể xem xét hoạt động của đơn vị mình',
                ], 403);
            }

            // Only PENDING_APPROVAL can be reviewed
            if ($activity->status !== self::STATUS_PENDING_APPROVAL) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể xem xét hoạt động đang chờ phê duyệt',
                ], 400);
            }

            $activity->status = self::STATUS_REVIEWED;
            $activity->updated_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
            ]);

            Log::info('Activity reviewed (Step 1)', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'reviewed_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã xem xét hoạt động. Vui lòng xác nhận phê duyệt để hoàn tất.',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Review failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xem xét hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve/Confirm activity (MANAGER, OPERATOR, ADMIN only)
     * Changes status from PENDING_APPROVAL to IN_PROGRESS and auto-locks the activity
     * The review step is done via the Approval Wizard modal in frontend
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Approve Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only MANAGER, OPERATOR, ADMIN can approve
        if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền phê duyệt hoạt động',
            ], 403);
        }

        try {
            DB::beginTransaction();
            $activity = Activity::findOrFail($id);

            // Security check for MANAGER
            if ($user->role === 'MANAGER' && $activity->lead_organization_id !== $user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể phê duyệt hoạt động của đơn vị mình',
                ], 403);
            }

            // Only PENDING_APPROVAL can be approved
            if ($activity->status !== self::STATUS_PENDING_APPROVAL) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể phê duyệt hoạt động đang chờ phê duyệt.',
                ], 400);
            }

            $activity->status = self::STATUS_IN_PROGRESS;
            $activity->approved_by = $user->id;
            $activity->approved_at = now();
            $activity->actual_start_date = $activity->actual_start_date ?? now();
            // Auto-lock after approval
            $activity->is_locked = true;
            $activity->locked_at = now();
            $activity->locked_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'approver:id,email,first_name,last_name'
            ]);

            Log::info('Activity approved and locked', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'approved_by' => $user->id,
            ]);

            $orgMembers = User::where("organization_id", $activity->lead_organization_id)->whereIn("role", ["STAFF", "GUEST"])->get();

            $notifications = [
                [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $activity->created_by,
                    "title" => "Hoạt động đã được phê duyệt",
                    "message" => "Hoạt động {$activity->code} đã được {$user->getNameAttribute()} phê duyệt",
                    "category" => "activity",
                    "notification_type" => "activity_approved",
                    "icon" => "CheckCircleOutlined",
                    "color" => "success",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "high",
                    "data" => json_encode([
                        "activity_id" => $activity->id,
                        "activity_code" => $activity->code,
                        "activity_title" => $activity->title,
                        "approver_id" => $user->id,
                        "approver_name" => $user->getNameAttribute(),
                        "approved_at" => $activity->approved_at,
                        "is_auto_locked" => true,
                    ]),
                    "created_at" => now(),
                    "updated_at" => now()
                ],
                [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $activity->created_by,
                    "title" => "Hoạt động đã khóa",
                    "message" => "Hoạt động {$activity->code} đã được khóa sau khi phê duyệt",
                    "category" => "activity",
                    "notification_type" => "activity_locked",
                    "icon" => "LockOutlined",
                    "color" => "warning",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "normal",
                    "data" => null,
                    "created_at" => now(),
                    "updated_at" => now()
                ],
                [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $user->id,
                    "title" => "Xác nhận phê duyệt",
                    "message" => "Bạn đã phê duyệt hoạt động {$activity->code}",
                    "category" => "activity",
                    "notification_type" => "activity_approved_confirm",
                    "icon" => "CheckOutlined",
                    "color" => "success",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "low",
                    "data" => null,
                    "created_at" => now(),
                    "updated_at" => now()
                ]
            ];

            foreach ($orgMembers as $member) {
                $notifications[] = [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $member->id,
                    "title" => "Hoạt động mới của phòng ban",
                    "message" => "Phòng ban có hoạt động mới: {$activity->title}",
                    "category" => "activity",
                    "notification_type" => "department_activity_approved",
                    "icon" => "TeamOutlined",
                    "color" => "success",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "normal",
                    "data" => json_encode([
                        "activity_id" => $activity->id,
                        "activity_code" => $activity->code,
                        "activity_title" => $activity->title,
                        "activity_type" => $activity->activityType ? $activity->activityType->name : null,
                        "organization_id" => $activity->leadOrganization ? $activity->leadOrganization->id : null,
                        "organization_name" => $activity->leadOrganization ? $activity->leadOrganization->name : null,
                        "creator_id" => $activity->creator ? $activity->creator->id : null,
                        "creator_name" => $activity->creator ? $activity->creator->first_name . ' ' . $activity->creator->last_name : null,
                        "start_date" => $activity->start_date,
                        "end_date" => $activity->end_date,
                    ]),
                    "created_at" => now(),
                    "updated_at" => now()
                ];
            }

            DB::table('notifications')->insert($notifications);
            

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được phê duyệt và khóa thành công',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Approval failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể phê duyệt hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject activity - Return to DRAFT status (MANAGER, OPERATOR, ADMIN only)
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Reject Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only MANAGER, OPERATOR, ADMIN can reject
        if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối hoạt động',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
            'action' => 'required|in:return_to_draft,delete',
        ], [
            'action.required' => 'Vui lòng chọn hành động (trả về nháp hoặc xóa)',
            'action.in' => 'Hành động không hợp lệ',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check for MANAGER
            if ($user->role === 'MANAGER' && $activity->lead_organization_id !== $user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể từ chối hoạt động của đơn vị mình',
                ], 403);
            }

            // Only PENDING_APPROVAL can be rejected
            if ($activity->status !== self::STATUS_PENDING_APPROVAL) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể từ chối hoạt động đang chờ phê duyệt',
                ], 400);
            }

            $action = $request->input('action');
            $reason = $request->input('reason', '');

            if ($action === 'delete') {
                // Delete the activity
                $activityCode = $activity->code;
                $activity->kpis()->detach();
                $activity->delete();

                $notifications = [
                    [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $activity->created_by,
                        "title" => "Hoạt động đã bị xóa",
                        "message" => "Hoạt động {$activity->code} bị từ chối và xóa. Lý do: {$reason}",
                        "category" => "activity",
                        "notification_type" => "activity_rejected_deleted",
                        "icon" => "DeleteOutlined",
                        "color" => "error",
                        "action_url" => "/dashboard?tab=activity-management",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "high",
                        "data" => json_encode([
                            "activity_id" => $activity->id,
                            "activity_code" => $activity->code,
                            "activity_title" => $activity->title,
                            "rejector_id" => $user->id,
                            "rejector_name" => $user->getNameAttribute(),
                            "rejected_at" => now(),
                            "reason" => $reason,
                            "action" => "delete",
                        ]),
                        "created_at" => now(),
                        "updated_at" => now()
                    ],
                    [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $user->id,
                        "title" => "Xác nhận xóa",
                        "message" => "Bạn đã từ chối và xóa hoạt động {$activity->code}",
                        "category" => "activity",
                        "notification_type" => "activity_deleted_confirm",
                        "icon" => "DeleteOutlined",
                        "color" => "error",
                        "action_url" => "/dashboard?tab=activity-management",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "low",
                        "data" => null,
                        "created_at" => now(),
                        "updated_at" => now()
                    ]
                ];

                DB::table('notifications')->insert($notifications);

                DB::commit();

                Log::info('Activity rejected and deleted', [
                    'activity_id' => $id,
                    'activity_code' => $activityCode,
                    'rejected_by' => $user->id,
                    'reason' => $reason,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Hoạt động đã bị từ chối và xóa',
                ]);
            } else {
                // Return to draft
                $activity->status = self::STATUS_DRAFT;
                $activity->updated_by = $user->id;
                $activity->save();

                $activity->load([
                    'activityType:id,name',
                    'activityField:id,name',
                    'leadOrganization:id,name,short_name',
                    'creator:id,email,first_name,last_name',
                ]);

                Log::info('Activity rejected and returned to draft', [
                    'activity_id' => $activity->id,
                    'activity_code' => $activity->code,
                    'rejected_by' => $user->id,
                    'reason' => $reason,
                ]);

                $notifications = [
                    [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $activity->created_by,
                        "title" => "Hoạt động bị trả về",
                        "message" => "Hoạt động {$activity->code} bị từ chối và trả về nháp. Lý do: {$reason}",
                        "category" => "activity",
                        "notification_type" => "activity_rejected_draft",
                        "icon" => "CloseCircleOutlined",
                        "color" => "error",
                        "action_url" => "/dashboard?tab=activity-management",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "high",
                        "data" => json_encode([
                            "activity_id" => $activity->id,
                            "activity_code" => $activity->code,
                            "activity_title" => $activity->title,
                            "rejector_id" => $user->id,
                            "rejector_name" => $user->getNameAttribute(),
                            "rejected_at" => now(),
                            "reason" => $reason,
                            "action" => "return_to_draft",
                        ]),
                        "created_at" => now(),
                        "updated_at" => now()
                    ],
                    [
                        "id" => Str::uuid()->toString(),
                        "user_id" => $user->id,
                        "title" => "Xác nhận từ chối",
                        "message" => "Bạn đã từ chối hoạt động {$activity->code}",
                        "category" => "activity",
                        "notification_type" => "activity_rejected_confirm",
                        "icon" => "CloseCircleOutlined",
                        "color" => "error",
                        "action_url" => "/dashboard?tab=activity-management",
                        "actor_id" => $activity->created_by,
                        "is_read" => false,
                        "priority" => "low",
                        "data" => null,
                        "created_at" => now(),
                        "updated_at" => now()
                    ]
                ];

                DB::table('notifications')->insert($notifications);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Hoạt động đã bị từ chối và trả về trạng thái Nháp',
                    'data' => $activity,
                ]);
            }
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể từ chối hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get form data (activity types, fields, kpis) for creating/editing activities
     */
    public function getFormData(Request $request): JsonResponse
    {
        try {
            $activityTypes = ActivityType::where('is_active', true)
                ->orderBy('display_order')
                ->get(['id', 'name', 'description']);

            $activityFields = ActivityField::where('is_active', true)
                ->orderBy('display_order')
                ->get(['id', 'name', 'description']);

            // Get KPIs grouped by source
            $kpisCentral = Kpi::where('is_active', true)
                ->where('source', 'CENTRAL')
                ->orderBy('order_number')
                ->get(['id', 'source', 'code', 'title', 'category']);

            $kpisVNU = Kpi::where('is_active', true)
                ->where('source', 'VNU')
                ->orderBy('order_number')
                ->get(['id', 'source', 'code', 'title', 'category']);

            // Get user's organization for STAFF/MANAGER
            $userOrganization = null;
            $user = $request->user();
            if (in_array($user->role, ['STAFF', 'MANAGER']) && $user->organization_id) {
                $userOrganization = Organization::find($user->organization_id, ['id', 'name', 'short_name']);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'activity_types' => $activityTypes,
                    'activity_fields' => $activityFields,
                    'kpis' => [
                        'central' => $kpisCentral,
                        'vnu' => $kpisVNU,
                    ],
                    'user_organization' => $userOrganization,
                    'statuses' => [
                        ['value' => 'DRAFT', 'label' => 'Nháp'],
                        ['value' => 'PENDING_APPROVAL', 'label' => 'Chờ phê duyệt'],
                        ['value' => 'IN_PROGRESS', 'label' => 'Đang thực hiện'],
                        ['value' => 'ON_HOLD', 'label' => 'Tạm hoãn'],
                        ['value' => 'CANCELLED', 'label' => 'Đã hủy'],
                        ['value' => 'COMPLETED', 'label' => 'Hoàn thành'],
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get form data failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải dữ liệu form',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate unique activity code
     */
    private function generateActivityCode(): string
    {
        $year = date('Y');
        $lastActivity = Activity::where('code', 'like', "ACT-{$year}-%")
            ->orderBy('code', 'desc')
            ->first();

        if ($lastActivity) {
            $lastNumber = (int) substr($lastActivity->code, -3);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf("ACT-%s-%03d", $year, $newNumber);
    }

    /**
     * Lock an activity (MANAGER, OPERATOR, ADMIN only)
     * Locked activities cannot be edited anymore
     */
    public function lock(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Lock Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only MANAGER, OPERATOR, ADMIN can lock
        if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Quản lý (MANAGER) trở lên mới có quyền khóa hoạt động',
            ], 403);
        }

        try {

            DB::beginTransaction();
            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (!$accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Check if already locked
            if ($activity->is_locked) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hoạt động này đã được khóa trước đó',
                ], 400);
            }

            // Only approved activities can be locked
            $lockableStatuses = [self::STATUS_IN_PROGRESS, self::STATUS_ON_HOLD, self::STATUS_COMPLETED, self::STATUS_CANCELLED];
            if (!in_array($activity->status, $lockableStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể khóa hoạt động đã được phê duyệt (đang thực hiện, tạm hoãn, hoàn thành hoặc đã hủy)',
                ], 400);
            }

            $activity->is_locked = true;
            $activity->locked_at = now();
            $activity->locked_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'locker:id,email,first_name,last_name',
            ]);

            Log::info('Activity locked successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'locked_by' => $user->id,
            ]);

            Notification::create([
                "user_id" => $activity->created_by,
                "title" => "Khóa hoạt động",
                "message" => "Hoạt động {$activity->code} đã bị khóa bởi {$user->getNameAttribute()}",
                "category" => "activity",
                "notification_type" => "activity_locked",
                "icon" => "LockOutlined",
                "color" => "warning",
                "action_url" => "/dashboard?tab=activity-management",
                "actor_id" => $activity->created_by,
                "is_read" => false,
                "priority" => "normal"
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được khóa thành công. Không thể chỉnh sửa nữa.',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lock activity failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể khóa hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get activity counts for badge notifications
     * - MANAGER: count of PENDING_APPROVAL activities in their organization
     * - STAFF: count of DRAFT activities they created
     */
    public function getBadgeCounts(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->role;

        try {
            $counts = [
                'pending_approval' => 0,
                'draft' => 0,
            ];

            // MANAGER sees count of pending approval activities in their organization
            if (in_array($role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
                $pendingQuery = Activity::where('status', self::STATUS_PENDING_APPROVAL);

                // MANAGER only sees their organization's activities
                if ($role === 'MANAGER' && $user->organization_id) {
                    $pendingQuery->where('lead_organization_id', $user->organization_id);
                }

                $counts['pending_approval'] = $pendingQuery->count();
            }

            // STAFF sees count of their own draft activities
            if (in_array($role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                $query = Activity::where('status', self::STATUS_DRAFT);

                // STAFF only sees their own drafts
                if ($role === 'STAFF') {
                    $query->where('created_by', $user->id);
                } elseif ($role === 'MANAGER' && $user->organization_id) {
                    // MANAGER sees all drafts in their organization
                    $query->where('lead_organization_id', $user->organization_id);
                }

                $counts['draft'] = $query->count();
            }

            return response()->json([
                'success' => true,
                'data' => $counts,
            ]);
        } catch (\Exception $e) {
            Log::error('Get badge counts failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải số lượng thông báo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unlock an activity (OPERATOR, ADMIN only)
     */
    public function unlock(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Unlock Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only OPERATOR, ADMIN can unlock
        if (!in_array($user->role, ['OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Điều hành viên (OPERATOR) hoặc Quản trị viên (ADMIN) mới có quyền mở khóa hoạt động',
            ], 403);
        }

        try {
            DB::beginTransaction();
            $activity = Activity::findOrFail($id);

            // Check if not locked
            if (!$activity->is_locked) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hoạt động này chưa bị khóa',
                ], 400);
            }

            $activity->is_locked = false;
            $activity->locked_at = null;
            $activity->locked_by = null;
            $activity->save();

            Log::info('Activity unlocked successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'unlocked_by' => $user->id,
            ]);

            $OrgManagers = User::where("orgazination_id",$activity->lead_organization_id)->where("role","MANAGER")->get();

            $notifications = [
                [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $activity->created_by,
                    "title" => "Mở khóa hoạt động",
                    "message" => "Hoạt động {$activity->code} đã bị mở khóa bởi {$user->getNameAttribute()}",
                    "category" => "activity",
                    "notification_type" => "activity_unlocked",
                    "icon" => "UnlockOutlined",
                    "color" => "success",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "normal",
                    "created_at" => now(),
                    "updated_at" => now()
                ]
                ];

            foreach($OrgManagers as $manager) {
                $notifications[] = [
                    "id" => Str::uuid()->toString(),
                    "user_id" => $manager->id,
                    "title" => "Mở khóa hoạt động",
                    "message" => "Hoạt động {$activity->code} đã bị được mở khóa}",
                    "category" => "activity",
                    "notification_type" => "activity_unlocked",
                    "icon" => "UnlockOutlined",
                    "color" => "success",
                    "action_url" => "/dashboard?tab=activity-management",
                    "actor_id" => $activity->created_by,
                    "is_read" => false,
                    "priority" => "normal",
                    "created_at" => now(),
                    "updated_at" => now()
                ];
            }

            DB::table('notifications')->insert($notifications);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được mở khóa thành công',
                'data' => $activity,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unlock activity failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể mở khóa hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
