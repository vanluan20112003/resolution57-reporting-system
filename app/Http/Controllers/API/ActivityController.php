<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityField;
use App\Models\ActivityFile;
use App\Models\ActivityParticipant;
use App\Models\ActivityType;
use App\Models\FileType;
use App\Models\Kpi;
use App\Models\Notification;
use App\Models\Organization;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    /**
     * Activity Status Constants
     * Workflow: DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED
     * - If REJECTED, activity goes back to DRAFT
     * - APPROVED can be POSTPONED or CANCELLED
     * - POSTPONED allows editing dates, then auto-returns to APPROVED
     * - IN_PROGRESS and COMPLETED are computed dynamically from APPROVED based on dates
     */
    const STATUS_DRAFT = 'DRAFT';

    const STATUS_PENDING_APPROVAL = 'PENDING_APPROVAL';

    const STATUS_APPROVED = 'APPROVED'; // Manager approved - IN_PROGRESS/COMPLETED computed from this

    const STATUS_REJECTED = 'REJECTED'; // Manager rejected - will be reset to DRAFT

    const STATUS_POSTPONED = 'POSTPONED'; // Temporarily postponed - allows editing dates

    const STATUS_IN_PROGRESS = 'IN_PROGRESS'; // Computed: APPROVED + within date range

    const STATUS_CANCELLED = 'CANCELLED';

    const STATUS_COMPLETED = 'COMPLETED'; // Computed: APPROVED + past end_date

    /**
     * Check if user can access activity based on organization and status
     * Returns array with 'allowed' boolean and 'reason' string for error message
     */
    private function canViewActivity(Request $request, Activity $activity): array
    {
        $user = $request->user();
        $role = $user->role;

        // ADMIN and OPERATOR can access all activities
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return ['allowed' => true, 'reason' => ''];
        }

        // User must have an organization
        if (! $user->organization_id) {
            return ['allowed' => false, 'reason' => 'Bạn chưa thuộc đơn vị nào. Vui lòng liên hệ quản trị viên để được gán vào đơn vị.'];
        }

        // Check lead organization or collaborator organization

        $isLeadOrg = $activity->lead_organization_id === $user->organization_id;

        $isCollaboratorOrg = $activity->collaboratingOrganizations()
            ->where('organization_id', $user->organization_id)
            ->exists();

        $isOwnOrg = $isLeadOrg || $isCollaboratorOrg;

        // GUEST can only view approved activities (IN_PROGRESS, COMPLETED) from their organization
        if ($role === 'GUEST') {
            if (! $isOwnOrg) {
                return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn.'];
            }
            // Use computed status for access check
            $computedStatus = $this->getComputedStatus($activity);
            $approvedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_POSTPONED, self::STATUS_COMPLETED];
            if (! in_array($computedStatus, $approvedStatuses)) {
                return ['allowed' => false, 'reason' => 'Bạn chỉ có thể xem các hoạt động đã được phê duyệt.'];
            }

            return ['allowed' => true, 'reason' => ''];
        }

        // STAFF and MANAGER can access all activities from their organization
        if (in_array($role, ['STAFF', 'MANAGER'])) {
            if ($isOwnOrg) {
                return ['allowed' => true, 'reason' => ''];
            }

            // Check if user has cross-organization permission to view this activity
            $hasPermission = $this->hasOrganizationAccessPermission($user, $activity->lead_organization_id);
            if ($hasPermission) {
                // Only allow viewing approved/completed activities from other organizations
                $approvedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_POSTPONED, self::STATUS_COMPLETED, self::STATUS_CANCELLED];
                if (in_array($activity->status, $approvedStatuses)) {
                    return ['allowed' => true, 'reason' => ''];
                }

                return ['allowed' => false, 'reason' => 'Bạn chỉ có thể xem các hoạt động đã được phê duyệt từ đơn vị khác.'];
            }

            return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn và bạn chưa được cấp quyền xem.'];
        }

        return ['allowed' => false, 'reason' => 'Bạn không có quyền truy cập hoạt động này.'];
    }

    private function canAccessActivity(Request $request, Activity $activity): array
    {
        $user = $request->user();
        $role = $user->role;

        // ADMIN and OPERATOR can access all activities
        if (in_array($role, ['ADMIN', 'OPERATOR'])) {
            return ['allowed' => true, 'reason' => ''];
        }

        // User must have an organization
        if (! $user->organization_id) {
            return ['allowed' => false, 'reason' => 'Bạn chưa thuộc đơn vị nào. Vui lòng liên hệ quản trị viên để được gán vào đơn vị.'];
        }

        // Check lead organization

        $isOwnOrg = $activity->lead_organization_id === $user->organization_id;

        // GUEST can only view approved activities (IN_PROGRESS, COMPLETED) from their organization
        if ($role === 'GUEST') {
            if (! $isOwnOrg) {
                return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn.'];
            }
            // Use computed status for access check
            $computedStatus = $this->getComputedStatus($activity);
            $approvedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_POSTPONED, self::STATUS_COMPLETED];
            if (! in_array($computedStatus, $approvedStatuses)) {
                return ['allowed' => false, 'reason' => 'Bạn chỉ có thể xem các hoạt động đã được phê duyệt.'];
            }

            return ['allowed' => true, 'reason' => ''];
        }

        // STAFF and MANAGER can access all activities from their organization
        if (in_array($role, ['STAFF', 'MANAGER'])) {
            if ($isOwnOrg) {
                return ['allowed' => true, 'reason' => ''];
            }

            // Check if user has cross-organization permission to view this activity
            $hasPermission = $this->hasOrganizationAccessPermission($user, $activity->lead_organization_id);
            if ($hasPermission) {
                // Only allow viewing approved/completed activities from other organizations
                $approvedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_POSTPONED, self::STATUS_COMPLETED, self::STATUS_CANCELLED];
                if (in_array($activity->status, $approvedStatuses)) {
                    return ['allowed' => true, 'reason' => ''];
                }

                return ['allowed' => false, 'reason' => 'Bạn chỉ có thể xem các hoạt động đã được phê duyệt từ đơn vị khác.'];
            }

            return ['allowed' => false, 'reason' => 'Hoạt động này không thuộc đơn vị của bạn và bạn chưa được cấp quyền xem.'];
        }

        return ['allowed' => false, 'reason' => 'Bạn không có quyền truy cập hoạt động này.'];
    }

    /**
     * Check if user has permission to view activities from another organization
     * via OrganizationAccessPermission
     */
    private function hasOrganizationAccessPermission($user, string $targetOrganizationId): bool
    {
        // User must have an organization
        if (! $user->organization_id) {
            return false;
        }

        // Get all active and valid permissions for user's organization
        $permissions = \App\Models\OrganizationAccessPermission::with('viewScope')
            ->where('organization_id', $user->organization_id)
            ->active()
            ->valid()
            ->get();

        foreach ($permissions as $permission) {
            // Check if user's role is allowed
            if (! $permission->isRoleAllowed($user->role)) {
                continue;
            }

            $scope = $permission->viewScope;

            // ALL_ORGANIZATIONS scope - can view any organization
            if ($scope && $scope->name === 'ALL_ORGANIZATIONS') {
                return true;
            }

            // Check if target organization is in the accessible list
            $accessibleOrgIds = $permission->getAccessibleOrganizationIds();
            if (in_array($targetOrganizationId, $accessibleOrgIds)) {
                return true;
            }
        }

        return false;
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
     * Compute dynamic status based on APPROVED status and dates
     * - If status = APPROVED and now() is between start_date and end_date → IN_PROGRESS
     * - If status = APPROVED and now() is past end_date → COMPLETED
     * - Otherwise, return original status
     */
    private function getComputedStatus(Activity $activity): string
    {
        // Only compute for APPROVED or REVIEWED status (indicating manager has approved)
        // We use REVIEWED as the "approved" state that triggers dynamic calculation
        if ($activity->status !== self::STATUS_APPROVED) {
            return $activity->status;
        }

        $now = now();
        $startDate = $activity->start_date ? \Carbon\Carbon::parse($activity->start_date) : null;
        $endDate = $activity->end_date ? \Carbon\Carbon::parse($activity->end_date) : null;

        // If no dates defined, keep as REVIEWED
        if (! $startDate && ! $endDate) {
            return self::STATUS_APPROVED;
        }

        // COMPLETED: past end_date
        if ($endDate && $now->gt($endDate)) {
            return self::STATUS_COMPLETED;
        }

        // IN_PROGRESS: within start_date and end_date range
        if ($startDate && $now->gte($startDate)) {
            // If no end_date, it's in progress if we're past start_date
            if (! $endDate || $now->lte($endDate)) {
                return self::STATUS_IN_PROGRESS;
            }
        }

        // Before start_date, keep as REVIEWED (approved but not started)
        return self::STATUS_APPROVED;
    }

    /**
     * Get suggested completion percentage based on status
     * Returns null if percentage should not be auto-updated (user can override)
     */
    private function getCompletionPercentageForStatus(string $status): ?int
    {
        return match ($status) {
            self::STATUS_DRAFT => 0,
            self::STATUS_PENDING_APPROVAL => 10,
            self::STATUS_APPROVED => 20,
            self::STATUS_IN_PROGRESS => 50,  // Default 50%, user can manually adjust
            self::STATUS_COMPLETED => 100,
            self::STATUS_CANCELLED => null,  // Keep current value
            self::STATUS_POSTPONED => null,  // Keep current value
            self::STATUS_REJECTED => 0,
            default => null,
        };
    }

    /**
     * Auto-update completion_percentage based on status change
     * Only updates if new percentage is higher (to avoid regression)
     */
    private function autoUpdateCompletionPercentage(Activity $activity, string $newStatus): void
    {
        $suggestedPercentage = $this->getCompletionPercentageForStatus($newStatus);

        if ($suggestedPercentage === null) {
            return; // Don't auto-update for CANCELLED, POSTPONED
        }

        // For COMPLETED, always set to 100%
        if ($newStatus === self::STATUS_COMPLETED) {
            if ($activity->completion_percentage != 100) {
                $activity->completion_percentage = 100;
            }

            return;
        }

        // For DRAFT and REJECTED, reset to suggested value
        if (in_array($newStatus, [self::STATUS_DRAFT, self::STATUS_REJECTED])) {
            $activity->completion_percentage = $suggestedPercentage;

            return;
        }

        // For other statuses, only update if current is lower than suggested
        // This prevents regression when status moves forward
        $currentPercentage = $activity->completion_percentage ?? 0;
        if ($currentPercentage < $suggestedPercentage) {
            $activity->completion_percentage = $suggestedPercentage;
        }
    }

    /**
     * Apply computed status to activity data
     * Also saves completion_percentage to database if changed
     */
    private function applyComputedStatus($activity, bool $saveToDb = true): void
    {
        if ($activity instanceof Activity) {
            $computedStatus = $this->getComputedStatus($activity);
            $originalPercentage = $activity->completion_percentage;

            // Auto-update completion percentage based on computed status
            $this->autoUpdateCompletionPercentage($activity, $computedStatus);

            // Save to database if completion_percentage changed and saveToDb is true
            if ($saveToDb && $originalPercentage !== $activity->completion_percentage) {
                $activity->saveQuietly(); // Use saveQuietly to avoid triggering events
            }

            $activity->status = $computedStatus;
        }
    }

    /**
     * Apply computed status to a collection of activities
     */
    private function applyComputedStatusToCollection($activities): void
    {
        foreach ($activities as $activity) {
            $this->applyComputedStatus($activity);
        }
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
                    'leadOrganization:id,name,short_name,code,avatar',
                    'creator:id,email,first_name,last_name',
                    'collaboratingOrganizations:id,name,short_name',
                ]);

            // Security: Filter by organization for STAFF/MANAGER
            $userOrgId = $this->getUserOrganizationId($request);
            if ($userOrgId) {
                // STAFF/MANAGER: Always filter by their organization
                $query->where('lead_organization_id', $userOrgId);
            } elseif ($request->has('organization_id') && $request->organization_id) {
                // ADMIN/OPERATOR: Can optionally filter by specific organization
                $query->where('lead_organization_id', $request->organization_id);
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
                    $q->where('code', 'like', '%'.$search.'%')
                        ->orWhere('title', 'like', '%'.$search.'%');
                });
            }

            // Order by created_at desc
            $query->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 15);
            $activities = $query->paginate($perPage);

            // Apply computed status to all activities
            $this->applyComputedStatusToCollection($activities->items());

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
     * Get all approved activities from all organizations (public view)
     * Only returns activities with status APPROVED, IN_PROGRESS, COMPLETED, POSTPONED, CANCELLED
     * Can be filtered by organization
     */
    public function allApproved(Request $request): JsonResponse
    {
        Log::info('=== Activity Management: Fetch All Approved Activities ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'filters' => $request->only(['organization_id', 'activity_type_id', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = Activity::query()
                ->with([
                    'activityType:id,name',
                    'activityField:id,name',
                    'leadOrganization:id,name,short_name',
                    'creator:id,email,first_name,last_name',
                ]);

            // Only show approved+ activities (not DRAFT, PENDING_APPROVAL, REJECTED)
            $query->whereIn('status', [
                self::STATUS_APPROVED,
                self::STATUS_POSTPONED,
                self::STATUS_CANCELLED,
            ]);

            // Filter by organization if provided
            if ($request->has('organization_id') && $request->organization_id) {
                $query->where('lead_organization_id', $request->organization_id);
            }

            // Filter by activity type
            if ($request->has('activity_type_id') && $request->activity_type_id) {
                $query->where('activity_type_id', $request->activity_type_id);
            }

            // Search by code or title
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%'.$search.'%')
                        ->orWhere('title', 'like', '%'.$search.'%');
                });
            }

            // Order by start_date desc (most recent first)
            $query->orderBy('start_date', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 50);
            $activities = $query->paginate($perPage);

            // Apply computed status to all activities
            $this->applyComputedStatusToCollection($activities->items());

            // Sort: IN_PROGRESS first, then by start_date desc
            $items = collect($activities->items())->sortBy(function ($activity) {
                // IN_PROGRESS gets priority 0, others get priority 1
                $statusPriority = $activity->status === self::STATUS_IN_PROGRESS ? 0 : 1;
                // Use negative timestamp to sort desc within each priority group
                $timestamp = $activity->start_date ? strtotime($activity->start_date) : 0;

                return [$statusPriority, -$timestamp];
            })->values()->all();

            Log::info('All approved activities fetch successful', [
                'total' => $activities->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $items,
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
            Log::error('All approved activities fetch failed', [
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

        if (! $this->canManageActivities($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo hoạt động',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'nullable|string|max:50|unique:activities,code',
            'title' => 'required|string|max:500',
            'description' => 'nullable|string',
            'qualitative_target' => 'nullable|string',
            'quantitative_target' => 'nullable|string',
            'activity_type_id' => 'required|uuid|exists:activity_types,id',
            'activity_field_id' => 'nullable|uuid|exists:activity_fields,id',
            'start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'budget_source' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:500',
            'external_url' => 'nullable|url|max:1000',
            'leader_names' => 'nullable|array',
            'leader_names.*' => 'string|max:255',
            'kpi_ids' => 'nullable|array',
            'kpi_ids.*' => 'uuid|exists:kpis,id',
        ], [
            'code.max' => 'Mã hoạt động không được vượt quá 50 ký tự',
            'code.unique' => 'Mã hoạt động đã tồn tại',
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
            if (in_array($user->role, ['STAFF', 'MANAGER']) && ! $organizationId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn phải thuộc một đơn vị để tạo hoạt động',
                ], 400);
            }

            // Use provided code or generate one
            $code = $request->code ?: $this->generateActivityCode();

            $activity = Activity::create([
                'code' => $code,
                'title' => $request->title,
                'description' => $request->description,
                'focus_content' => $request->focus_content,
                'qualitative_target' => $request->qualitative_target,
                'quantitative_target' => $request->quantitative_target,
                'activity_type_id' => $request->activity_type_id,
                'activity_field_id' => $request->activity_field_id,
                'status' => self::STATUS_DRAFT,
                'lead_organization_id' => $organizationId,
                'leader_names' => $request->leader_names,
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

            // Attach collaborating organizations if provided
            $collaboratingOrgIds = [];
            if ($request->has('collaborating_organization_ids') && is_array($request->collaborating_organization_ids)) {
                $collaboratingOrgIds = $request->collaborating_organization_ids;
                $activity->collaboratingOrganizations()->attach($collaboratingOrgIds);
            }

            // Notification for creator
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Tạo hoạt động thành công',
                'message' => "Bạn đã tạo hoạt động {$activity->title} thành công",
                'category' => 'activity',
                'notification_type' => 'activity_created',
                'icon' => 'PlusCircleOutlined',
                'color' => 'primary',
                'action_url' => '/dashboard?tab=activity-management',
                'actor_id' => $user->id,
                'related_organization_id' => $organizationId,
                'is_read' => false,
                'priority' => 'normal',
            ]);

            // Send notifications to STAFF and MANAGER of collaborating organizations
            if (! empty($collaboratingOrgIds)) {
                $leadOrgName = $user->organization ? $user->organization->short_name ?? $user->organization->name : 'Đơn vị chủ trì';

                // Get all STAFF and MANAGER users from collaborating organizations
                $collaboratingUsers = User::whereIn('organization_id', $collaboratingOrgIds)
                    ->whereIn('role', ['STAFF', 'MANAGER'])
                    ->where('status', 'active')
                    ->get();

                foreach ($collaboratingUsers as $collaboratingUser) {
                    Notification::create([
                        'user_id' => $collaboratingUser->id,
                        'title' => 'Phối hợp hoạt động mới',
                        'message' => "Đơn vị {$leadOrgName} đã tạo hoạt động \"{$activity->title}\" có đơn vị bạn phối hợp",
                        'category' => 'activity',
                        'notification_type' => 'activity_collaboration',
                        'icon' => 'TeamOutlined',
                        'color' => 'blue',
                        'action_url' => "/dashboard?tab=department-activities",
                        'actor_id' => $user->id,
                        'related_organization_id' => $collaboratingUser->organization_id,
                        'is_read' => false,
                        'priority' => 'normal',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'lead_organization_id' => $organizationId,
                        ]),
                    ]);
                }

                Log::info('Sent collaboration notifications', [
                    'activity_id' => $activity->id,
                    'collaborating_org_ids' => $collaboratingOrgIds,
                    'notified_users_count' => $collaboratingUsers->count(),
                ]);
            }

            // Log activity creation
            ActivityLogService::logCreated($activity, $request);

            DB::commit();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'kpis:id,source,code,title',
                'collaboratingOrganizations:id,name,short_name',
            ]);

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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
                'collaboratingOrganizations:id,name,short_name',
            ])->findOrFail($id);

            // Security check
            $accessCheck = $this->canViewActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Apply computed status
            $this->applyComputedStatus($activity);

            // Check if current user has a pending invitation to this activity
            $userInvitation = null;
            $participant = ActivityParticipant::where('activity_id', $activity->id)
                ->where('user_id', $request->user()->id)
                ->first();

            if ($participant) {
                $userInvitation = [
                    'id' => $participant->id,
                    'role' => $participant->role,
                    'invitation_status' => $participant->invitation_status,
                    'responded_at' => $participant->responded_at,
                    'notes' => $participant->notes,
                ];
            }

            Log::info('Activity fetched successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'user_invitation' => $userInvitation,
            ]);

            return response()->json([
                'success' => true,
                'data' => $activity,
                'user_invitation' => $userInvitation,
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

            // Store old values for logging
            $oldResultSummary = $activity->result_summary;
            $oldStatus = $activity->status;
            $oldValues = $activity->only([
                'title', 'description', 'focus_content', 'qualitative_target', 'quantitative_target',
                'activity_type_id', 'activity_field_id', 'status', 'start_date', 'end_date',
                'actual_start_date', 'actual_end_date', 'budget', 'budget_source', 'location',
                'external_url', 'leader_names', 'completion_percentage', 'result_summary', 'difficulties',
            ]);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // All STAFF in the same organization have equal permissions on activities
            // No need to check creator or assignment - organization membership is sufficient

            // Define allowed fields for locked/approved activities
            $completionAllowedFields = ['completion_percentage', 'result_summary', 'difficulties', 'actual_start_date', 'actual_end_date', 'status'];
            $requestFields = array_keys($request->except(['_method', '_token']));

            // Check if activity is POSTPONED - allow editing dates only
            if ($activity->status === self::STATUS_POSTPONED) {
                $allowedFields = ['start_date', 'end_date'];
                $disallowedFields = array_diff($requestFields, $allowedFields);

                if (! empty($disallowedFields)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hoạt động đang tạm hoãn. Chỉ có thể cập nhật ngày bắt đầu và ngày kết thúc.',
                    ], 400);
                }
            }
            // Check if activity is locked - allow certain fields for completion updates
            elseif ($activity->is_locked) {
                $disallowedFields = array_diff($requestFields, $completionAllowedFields);

                if (! empty($disallowedFields)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hoạt động đã bị khóa. Chỉ có thể cập nhật tiến độ, kết quả và trạng thái.',
                    ], 400);
                }
            }
            // Check if activity is already approved - only allow updating progress/result
            // Use computed status for the check
            else {
                $computedStatus = $this->getComputedStatus($activity);
                $approvedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED];
                if (in_array($computedStatus, $approvedStatuses)) {
                    // Only allow updating completion_percentage, result_summary, actual dates, and status
                    $disallowedFields = array_diff($requestFields, $completionAllowedFields);

                    if (! empty($disallowedFields)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Hoạt động đã được phê duyệt. Chỉ có thể cập nhật tiến độ, kết quả và trạng thái. Nếu cần thay đổi ngày, vui lòng chuyển sang trạng thái Tạm hoãn.',
                        ], 400);
                    }
                }
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:500',
                'description' => 'nullable|string',
                'focus_content' => 'nullable|string',
                'qualitative_target' => 'nullable|string',
                'quantitative_target' => 'nullable|string',
                'activity_type_id' => 'sometimes|required|uuid|exists:activity_types,id',
                'activity_field_id' => 'nullable|uuid|exists:activity_fields,id',
                'status' => 'sometimes|in:DRAFT,PENDING_APPROVAL,APPROVED,REJECTED,POSTPONED,CANCELLED',
                'start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
                'end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:start_date',
                'actual_start_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d',
                'actual_end_date' => 'nullable|date_format:Y-m-d H:i:s,Y-m-d\TH:i:s,Y-m-d H:i,Y-m-d|after_or_equal:actual_start_date',
                'budget' => 'nullable|numeric|min:0',
                'budget_source' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:500',
                'external_url' => 'nullable|url|max:1000',
                'leader_names' => 'nullable|array',
                'leader_names.*' => 'string|max:255',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'result_summary' => 'nullable|string',
                'difficulties' => 'nullable|string',
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

            // Track if this is a POSTPONED activity being updated with new dates
            $wasPostponed = $activity->status === self::STATUS_POSTPONED;
            $hasNewDates = $request->has('start_date') || $request->has('end_date');

            $activity->update($request->only([
                'title',
                'description',
                'focus_content',
                'qualitative_target',
                'quantitative_target',
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
                'leader_names',
                'completion_percentage',
                'result_summary',
                'difficulties',
            ]));

            $activity->updated_by = $request->user()->id;
            $activity->save();

            // If activity was POSTPONED and dates were updated, auto-return to APPROVED and resend invitations
            $invitationsSent = 0;
            if ($wasPostponed && $hasNewDates) {
                // Auto-return to APPROVED status
                $activity->status = self::STATUS_APPROVED;
                $this->autoUpdateCompletionPercentage($activity, self::STATUS_APPROVED);
                $activity->save();

                Log::info('Activity auto-returned to APPROVED from POSTPONED', [
                    'activity_id' => $activity->id,
                    'activity_code' => $activity->code,
                ]);

                // Resend invitations to all participants with user_id
                $participantsToNotify = DB::table('activity_participants')
                    ->where('activity_id', $activity->id)
                    ->whereNotNull('user_id')
                    ->get();

                foreach ($participantsToNotify as $participant) {
                    // Update invited_at to now
                    DB::table('activity_participants')
                        ->where('id', $participant->id)
                        ->update(['invited_at' => now(), 'updated_at' => now()]);

                    // Create notification for the participant
                    DB::table('notifications')->insert([
                        'id' => Str::uuid()->toString(),
                        'user_id' => $participant->user_id,
                        'title' => 'Hoạt động đã được cập nhật lịch mới',
                        'message' => "Hoạt động {$activity->code} đã được cập nhật lịch mới sau khi tạm hoãn. Vui lòng xác nhận tham dự.",
                        'category' => 'activity',
                        'notification_type' => 'activity_rescheduled',
                        'icon' => 'CalendarOutlined',
                        'color' => 'warning',
                        'action_url' => '/dashboard?tab=my-activities',
                        'actor_id' => $request->user()->id,
                        'is_read' => false,
                        'priority' => 'high',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'activity_title' => $activity->title,
                            'new_start_date' => $activity->start_date,
                            'new_end_date' => $activity->end_date,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $invitationsSent++;
                }

                Log::info('Resent invitations after rescheduling', [
                    'activity_id' => $activity->id,
                    'invitations_sent' => $invitationsSent,
                ]);
            }

            // Update KPIs if provided
            if ($request->has('kpi_ids')) {
                $activity->kpis()->sync($request->kpi_ids ?? []);
            }

            // Update collaborating organizations if provided
            if ($request->has('collaborating_organization_ids')) {
                $newCollabOrgIds = $request->collaborating_organization_ids ?? [];
                $oldCollabOrgIds = $activity->collaboratingOrganizations()->pluck('organizations.id')->toArray();

                // Find newly added organizations
                $addedOrgIds = array_diff($newCollabOrgIds, $oldCollabOrgIds);

                $activity->collaboratingOrganizations()->sync($newCollabOrgIds);

                // Send notifications to STAFF and MANAGER of newly added collaborating organizations
                if (! empty($addedOrgIds)) {
                    $leadOrgName = $activity->leadOrganization ? $activity->leadOrganization->short_name ?? $activity->leadOrganization->name : 'Đơn vị chủ trì';

                    $newCollabUsers = User::whereIn('organization_id', $addedOrgIds)
                        ->whereIn('role', ['STAFF', 'MANAGER'])
                        ->where('status', 'active')
                        ->get();

                    foreach ($newCollabUsers as $collabUser) {
                        Notification::create([
                            'user_id' => $collabUser->id,
                            'title' => 'Phối hợp hoạt động mới',
                            'message' => "Đơn vị {$leadOrgName} đã thêm đơn vị bạn vào hoạt động phối hợp \"{$activity->title}\"",
                            'category' => 'activity',
                            'notification_type' => 'activity_collaboration',
                            'icon' => 'TeamOutlined',
                            'color' => 'blue',
                            'action_url' => "/dashboard?tab=department-activities",
                            'actor_id' => $user->id,
                            'related_organization_id' => $collabUser->organization_id,
                            'is_read' => false,
                            'priority' => 'normal',
                            'data' => json_encode([
                                'activity_id' => $activity->id,
                                'activity_code' => $activity->code,
                                'lead_organization_id' => $activity->lead_organization_id,
                            ]),
                        ]);
                    }

                    Log::info('Sent collaboration notifications for updated activity', [
                        'activity_id' => $activity->id,
                        'added_org_ids' => $addedOrgIds,
                        'notified_users_count' => $newCollabUsers->count(),
                    ]);
                }
            }

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'kpis:id,source,code,title',
                'collaboratingOrganizations:id,name,short_name',
            ]);

            Log::info('Activity updated successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
            ]);

            // Log activity update
            $newValues = $activity->only([
                'title', 'description', 'focus_content', 'qualitative_target', 'quantitative_target',
                'activity_type_id', 'activity_field_id', 'status', 'start_date', 'end_date',
                'actual_start_date', 'actual_end_date', 'budget', 'budget_source', 'location',
                'external_url', 'leader_names', 'completion_percentage', 'result_summary', 'difficulties',
            ]);
            ActivityLogService::logUpdated($activity, $oldValues, $newValues, $request);

            if ($activity->status === self::STATUS_PENDING_APPROVAL) {
                $orgManagers = User::where('organization_id', $activity->lead_organization_id)->where('role', 'MANAGER')->get();
                $notifications = [];
                foreach ($orgManagers as $manager) {
                    $notifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $manager->id,
                        'title' => 'Chỉnh sửa hoạt động PENDING',
                        'message' => "{$activity->creator->getNameAttribute()} đã cập nhật hoạt động {$activity->code} đang chờ duyệt",
                        'category' => 'activity',
                        'notification_type' => 'activity_updated',
                        'icon' => 'EditOutlined',
                        'color' => 'primary',
                        'action_url' => '/dashboard?tab=pending-approval',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'normal',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                DB::table('notifications')->insert($notifications);
            }

            // Send notification to department members when COMPLETED activity gets result_summary for first time
            $newResultSummary = $activity->result_summary;
            $computedStatus = $this->getComputedStatus($activity);
            $wasEmptyResult = empty($oldResultSummary) || trim($oldResultSummary) === '';
            $hasNewResult = ! empty($newResultSummary) && trim($newResultSummary) !== '';

            if ($computedStatus === self::STATUS_COMPLETED && $wasEmptyResult && $hasNewResult) {
                // Get all members in the department (exclude the creator to avoid duplicate notification)
                $departmentMembers = User::where('organization_id', $activity->lead_organization_id)
                    ->where('id', '!=', $activity->created_by)
                    ->whereIn('role', ['STAFF', 'MANAGER', 'GUEST'])
                    ->get();

                $leadOrg = $activity->leadOrganization;
                $completionNotifications = [];
                foreach ($departmentMembers as $member) {
                    $completionNotifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $member->id,
                        'title' => 'Hoạt động đã hoàn thành',
                        'message' => "Hoạt động \"{$activity->title}\" ({$activity->code}) đã hoàn thành. Xem kết quả đạt được.",
                        'category' => 'activity',
                        'notification_type' => 'activity_completed_with_result',
                        'icon' => 'CheckCircleOutlined',
                        'color' => 'success',
                        'action_url' => "/activities/{$activity->id}",
                        'actor_id' => $user->id,
                        'is_read' => false,
                        'priority' => 'normal',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'activity_title' => $activity->title,
                            'organization_id' => $leadOrg ? $leadOrg->id : null,
                            'organization_name' => $leadOrg ? $leadOrg->name : null,
                            'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                            'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                if (! empty($completionNotifications)) {
                    DB::table('notifications')->insert($completionNotifications);

                    Log::info('Sent completion notifications to department members', [
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'notifications_sent' => count($completionNotifications),
                    ]);
                }
            }

            DB::commit();

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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
            if (! $accessCheck['allowed']) {
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
            if (! in_array($activity->status, [self::STATUS_DRAFT, self::STATUS_PENDING_APPROVAL])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể xóa hoạt động ở trạng thái Nháp hoặc Chờ phê duyệt. Với hoạt động đã phê duyệt, hãy khóa lại thay vì xóa.',
                ], 400);
            }

            $activityCode = $activity->code;
            $activityTitle = $activity->title;

            // Log activity deletion before deleting (because we need activity_id for foreign key)
            ActivityLogService::logDeleted($activity, $request);

            // Delete related data
            $activity->kpis()->detach();
            $activity->delete();

            Log::info('Activity deleted successfully', [
                'activity_id' => $id,
                'activity_code' => $activityCode,
            ]);

            if ($activity->status === self::STATUS_PENDING_APPROVAL) {
                $orgManagers = User::where('organization_id', $activity->lead_organization_id)->where('role', 'MANAGER')->get();
                $notifications = [];
                foreach ($orgManagers as $manager) {
                    $notifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $manager->id,
                        'title' => 'Xóa hoạt động PENDING',
                        'message' => "{$activity->creator->getNameAttribute()} đã rút lại hoạt động {$activity->code}",
                        'category' => 'activity',
                        'notification_type' => 'activity_withdrawn',
                        'icon' => 'RollbackOutlined',
                        'color' => 'warning',
                        'action_url' => '/dashboard?tab=activity-management',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'normal',
                        'created_at' => now(),
                        'updated_at' => now(),
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
            if (! $accessCheck['allowed']) {
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
            $this->autoUpdateCompletionPercentage($activity, self::STATUS_PENDING_APPROVAL);
            $activity->updated_by = $request->user()->id;
            $activity->save();

            // Log submit for approval
            ActivityLogService::logSubmitted($activity, $request);

            Log::info('Activity submitted for approval', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
            ]);

            $organization = Organization::find($activity->lead_organization_id);

            $orgManagers = User::where('organization_id', $activity->lead_organization_id)
                ->where('role', 'MANAGER')
                ->get();

            $operatorAdmins = User::whereIn('role', ['ADMIN', 'OPERATOR'])->get();
            $notifications = [[
                'id' => Str::uuid()->toString(),
                'user_id' => $request->user()->id,
                'title' => 'Gửi yêu cầu phê duyệt',
                'message' => "Bạn đã gửi hoạt động {$activity->code} để phê duyệt",
                'category' => 'activity',
                'notification_type' => 'activity_submitted',
                'icon' => 'SendOutlined',
                'color' => 'processing',
                'action_url' => '/dashboard?tab=activity-management',
                'actor_id' => $activity->created_by,
                'is_read' => false,
                'priority' => 'normal',
                'data' => json_encode([
                    'activity_id' => $activity->id,
                    'activity_code' => $activity->code,
                    'activity_title' => $activity->title,
                    'organization_id' => $organization ? $organization->id : null,
                    'organization_name' => $organization ? $organization->name : null,
                    'submitter_id' => $request->user()->id,
                    'submitter_name' => $request->user()->name,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]];
            foreach ($orgManagers as $manager) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $manager->id,
                    'title' => 'Có hoạt động chờ duyệt',
                    'message' => "{$request->user()->name} đã gửi hoạt động {$activity->code} chờ phê duyệt",
                    'category' => 'activity',
                    'notification_type' => 'activity_pending_approval',
                    'icon' => 'ClockCircleOutlined',
                    'color' => 'warning',
                    'action_url' => '/dashboard?tab=pending-approval',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $organization ? $organization->id : null,
                        'organization_name' => $organization ? $organization->name : null,
                        'submitter_id' => $request->user()->id,
                        'submitter_name' => $request->user()->name,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            foreach ($operatorAdmins as $admin) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $admin->id,
                    'title' => 'Có hoạt động chờ duyệt',
                    'message' => "Có hoạt động mới {$activity->code} từ {$organization->code} chờ phê duyệt",
                    'category' => 'activity',
                    'notification_type' => 'activity_pending_approval',
                    'icon' => 'ClockCircleOutlined',
                    'color' => 'warning',
                    'action_url' => '/dashboard?tab=pending-approval',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $organization ? $organization->id : null,
                        'organization_name' => $organization ? $organization->name : null,
                        'submitter_id' => $request->user()->id,
                        'submitter_name' => $request->user()->name,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            DB::commit();

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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
        if (! in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
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

            $activity->status = self::STATUS_APPROVED;
            $this->autoUpdateCompletionPercentage($activity, self::STATUS_APPROVED);
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

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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
        if (! in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
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

            // Set to REVIEWED - IN_PROGRESS and COMPLETED will be computed dynamically based on dates
            $activity->status = self::STATUS_APPROVED;
            $this->autoUpdateCompletionPercentage($activity, self::STATUS_APPROVED);
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
                'approver:id,email,first_name,last_name',
            ]);

            // Apply computed status for response
            $this->applyComputedStatus($activity);

            // Log approval and lock
            ActivityLogService::logApproved($activity, $request);
            ActivityLogService::logLocked($activity, $request);

            Log::info('Activity approved and locked', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'approved_by' => $user->id,
            ]);

            $orgMembers = User::where('organization_id', $activity->lead_organization_id)->whereIn('role', ['STAFF', 'GUEST'])->get();
            $leadOrg = $activity->leadOrganization;

            $notifications = [
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Hoạt động đã được phê duyệt',
                    'message' => "Hoạt động {$activity->code} đã được {$user->getNameAttribute()} phê duyệt",
                    'category' => 'activity',
                    'notification_type' => 'activity_approved',
                    'icon' => 'CheckCircleOutlined',
                    'color' => 'success',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'approver_id' => $user->id,
                        'approver_name' => $user->getNameAttribute(),
                        'approved_at' => $activity->approved_at,
                        'is_auto_locked' => true,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Hoạt động đã khóa',
                    'message' => "Hoạt động {$activity->code} đã được khóa sau khi phê duyệt",
                    'category' => 'activity',
                    'notification_type' => 'activity_locked',
                    'icon' => 'LockOutlined',
                    'color' => 'warning',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $user->id,
                    'title' => 'Xác nhận phê duyệt',
                    'message' => "Bạn đã phê duyệt hoạt động {$activity->code}",
                    'category' => 'activity',
                    'notification_type' => 'activity_approved_confirm',
                    'icon' => 'CheckOutlined',
                    'color' => 'success',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'low',
                    'data' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            foreach ($orgMembers as $member) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $member->id,
                    'title' => 'Hoạt động mới của phòng ban',
                    'message' => "Phòng ban có hoạt động mới: {$activity->title}",
                    'category' => 'activity',
                    'notification_type' => 'department_activity_approved',
                    'icon' => 'TeamOutlined',
                    'color' => 'success',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'activity_type' => $activity->activityType ? $activity->activityType->name : null,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'creator_id' => $activity->creator ? $activity->creator->id : null,
                        'creator_name' => $activity->creator ? $activity->creator->first_name.' '.$activity->creator->last_name : null,
                        'start_date' => $activity->start_date,
                        'end_date' => $activity->end_date,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            // Check if activity has participants and should send invitations
            $shouldSendInvitations = str_contains($activity->notes ?? '', '[SEND_INVITATIONS_AFTER_APPROVAL]');
            $participantCount = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->whereNull('invited_at')
                ->count();

            $invitationsSent = 0;
            if ($participantCount > 0) {
                // Auto-send invitations to participants
                $participants = DB::table('activity_participants')
                    ->where('activity_id', $id)
                    ->whereNotNull('user_id')
                    ->whereNull('invited_at')
                    ->get();

                $invitationNotifications = [];
                foreach ($participants as $participant) {
                    $participantUser = User::find($participant->user_id);
                    if (! $participantUser) {
                        continue;
                    }

                    $leadOrg = $activity->leadOrganization;
                    $invitationNotifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $participantUser->id,
                        'title' => 'Lời mời tham dự hoạt động',
                        'message' => "Bạn được mời tham dự hoạt động \"{$activity->title}\" vào ngày ".
                            ($activity->start_date ? date('d/m/Y H:i', strtotime($activity->start_date)) : 'chưa xác định'),
                        'category' => 'activity',
                        'notification_type' => 'activity_invitation',
                        'icon' => 'CalendarOutlined',
                        'color' => 'blue',
                        'action_url' => "/activities/{$activity->id}",
                        'actor_id' => $user->id,
                        'is_read' => false,
                        'priority' => 'high',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'activity_title' => $activity->title,
                            'activity_type' => $activity->activityType ? $activity->activityType->name : null,
                            'organization_id' => $leadOrg ? $leadOrg->id : null,
                            'organization_name' => $leadOrg ? $leadOrg->name : null,
                            'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                            'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                            'start_date' => $activity->start_date,
                            'end_date' => $activity->end_date,
                            'location' => $activity->location,
                            'participant_id' => $participant->id,
                            'invitation_status' => 'pending',
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $invitationsSent++;
                }

                if (! empty($invitationNotifications)) {
                    DB::table('notifications')->insert($invitationNotifications);

                    // Update invited_at for participants
                    DB::table('activity_participants')
                        ->where('activity_id', $id)
                        ->whereNotNull('user_id')
                        ->whereNull('invited_at')
                        ->update(['invited_at' => now()]);
                }

                Log::info('Sent invitations after approval', [
                    'activity_id' => $id,
                    'invitations_sent' => $invitationsSent,
                ]);
            }

            DB::commit();

            // Apply computed status for response (already applied earlier, but ensure consistency)
            $this->applyComputedStatus($activity);

            $message = 'Hoạt động đã được phê duyệt và khóa thành công';
            if ($invitationsSent > 0) {
                $message .= ". Đã gửi {$invitationsSent} lời mời tham dự.";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $activity,
                'invitations_sent' => $invitationsSent,
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
        if (! in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
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
                // Get organization info before deleting
                $leadOrg = $activity->leadOrganization;

                // Log rejection before deleting
                ActivityLogService::logRejected($activity, $request, $reason);

                // Delete the activity
                $activityCode = $activity->code;
                $activity->kpis()->detach();
                $activity->delete();

                $notifications = [
                    [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $activity->created_by,
                        'title' => 'Hoạt động đã bị xóa',
                        'message' => "Hoạt động {$activity->code} bị từ chối và xóa. Lý do: {$reason}",
                        'category' => 'activity',
                        'notification_type' => 'activity_rejected_deleted',
                        'icon' => 'DeleteOutlined',
                        'color' => 'error',
                        'action_url' => '/dashboard?tab=activity-management',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'high',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'activity_title' => $activity->title,
                            'rejector_id' => $user->id,
                            'rejector_name' => $user->getNameAttribute(),
                            'rejected_at' => now(),
                            'reason' => $reason,
                            'action' => 'delete',
                            'organization_id' => $leadOrg ? $leadOrg->id : null,
                            'organization_name' => $leadOrg ? $leadOrg->name : null,
                            'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                            'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $user->id,
                        'title' => 'Xác nhận xóa',
                        'message' => "Bạn đã từ chối và xóa hoạt động {$activity->code}",
                        'category' => 'activity',
                        'notification_type' => 'activity_deleted_confirm',
                        'icon' => 'DeleteOutlined',
                        'color' => 'error',
                        'action_url' => '/dashboard?tab=activity-management',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'low',
                        'data' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
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
                $this->autoUpdateCompletionPercentage($activity, self::STATUS_DRAFT);
                $activity->updated_by = $user->id;
                $activity->save();

                // Log rejection
                ActivityLogService::logRejected($activity, $request, $reason);

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

                $leadOrg = $activity->leadOrganization;
                $notifications = [
                    [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $activity->created_by,
                        'title' => 'Hoạt động bị trả về',
                        'message' => "Hoạt động {$activity->code} bị từ chối và trả về nháp. Lý do: {$reason}",
                        'category' => 'activity',
                        'notification_type' => 'activity_rejected_draft',
                        'icon' => 'CloseCircleOutlined',
                        'color' => 'error',
                        'action_url' => '/dashboard?tab=activity-management',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'high',
                        'data' => json_encode([
                            'activity_id' => $activity->id,
                            'activity_code' => $activity->code,
                            'activity_title' => $activity->title,
                            'rejector_id' => $user->id,
                            'rejector_name' => $user->getNameAttribute(),
                            'rejected_at' => now(),
                            'reason' => $reason,
                            'action' => 'return_to_draft',
                            'organization_id' => $leadOrg ? $leadOrg->id : null,
                            'organization_name' => $leadOrg ? $leadOrg->name : null,
                            'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                            'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $user->id,
                        'title' => 'Xác nhận từ chối',
                        'message' => "Bạn đã từ chối hoạt động {$activity->code}",
                        'category' => 'activity',
                        'notification_type' => 'activity_rejected_confirm',
                        'icon' => 'CloseCircleOutlined',
                        'color' => 'error',
                        'action_url' => '/dashboard?tab=activity-management',
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'low',
                        'data' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                ];

                DB::table('notifications')->insert($notifications);

                DB::commit();

                // Apply computed status for response
                $this->applyComputedStatus($activity);

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
     * Postpone activity - Move from APPROVED/IN_PROGRESS/COMPLETED to POSTPONED status
     * This allows editing dates, then auto-returns to APPROVED when dates are updated
     */
    public function postpone(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Postpone Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
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

            // Security check:
            // - STAFF can only postpone their own activities
            // - MANAGER can postpone activities in their organization
            // - OPERATOR/ADMIN can postpone any activity
            if ($user->role === 'STAFF') {
                if ($activity->created_by !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn chỉ có thể tạm hoãn hoạt động do chính bạn tạo',
                    ], 403);
                }
            } elseif ($user->role === 'MANAGER') {
                if ($activity->lead_organization_id !== $user->organization_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn chỉ có thể tạm hoãn hoạt động của đơn vị mình',
                    ], 403);
                }
            } elseif (! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tạm hoãn hoạt động',
                ], 403);
            }

            // Only APPROVED activities (including computed IN_PROGRESS/COMPLETED) can be postponed
            $computedStatus = $this->getComputedStatus($activity);
            $allowedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED];
            if (! in_array($computedStatus, $allowedStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể tạm hoãn hoạt động đã được phê duyệt.',
                ], 400);
            }

            $reason = $request->input('reason', '');

            // Change status to POSTPONED (keep current completion_percentage)
            $activity->status = self::STATUS_POSTPONED;
            // Note: Don't auto-update completion_percentage for POSTPONED - keep current value
            $activity->updated_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'approver:id,email,first_name,last_name',
            ]);

            // Log postpone action
            ActivityLogService::logPostponed($activity, $request);

            Log::info('Activity postponed', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'postponed_by' => $user->id,
                'reason' => $reason,
            ]);

            // Notify creator and participants
            $leadOrg = $activity->leadOrganization;
            $notifications = [
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Hoạt động đã bị tạm hoãn',
                    'message' => "Hoạt động {$activity->code} đã bị tạm hoãn bởi {$user->getNameAttribute()}.".($reason ? " Lý do: {$reason}" : ''),
                    'category' => 'activity',
                    'notification_type' => 'activity_postponed',
                    'icon' => 'PauseCircleOutlined',
                    'color' => 'orange',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'postponed_by' => $user->id,
                        'postponed_by_name' => $user->getNameAttribute(),
                        'reason' => $reason,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            // Notify all participants with user_id
            $participants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->get();

            foreach ($participants as $participant) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $participant->user_id,
                    'title' => 'Hoạt động đã bị tạm hoãn',
                    'message' => "Hoạt động {$activity->code} đã bị tạm hoãn. Lịch mới sẽ được thông báo sau.",
                    'category' => 'activity',
                    'notification_type' => 'activity_postponed',
                    'icon' => 'PauseCircleOutlined',
                    'color' => 'orange',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được tạm hoãn. Bạn có thể cập nhật ngày bắt đầu/kết thúc mới.',
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
            Log::error('Postpone failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạm hoãn hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel activity - Move from APPROVED/POSTPONED to CANCELLED status
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Cancel Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:1000',
        ], [
            'reason.required' => 'Vui lòng nhập lý do hủy hoạt động',
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

            // Security check:
            // - STAFF can only cancel their own activities
            // - MANAGER can cancel activities in their organization
            // - OPERATOR/ADMIN can cancel any activity
            if ($user->role === 'STAFF') {
                if ($activity->created_by !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn chỉ có thể hủy hoạt động do chính bạn tạo',
                    ], 403);
                }
            } elseif ($user->role === 'MANAGER') {
                if ($activity->lead_organization_id !== $user->organization_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn chỉ có thể hủy hoạt động của đơn vị mình',
                    ], 403);
                }
            } elseif (! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền hủy hoạt động',
                ], 403);
            }

            // Only APPROVED or POSTPONED can be cancelled
            $computedStatus = $this->getComputedStatus($activity);
            $allowedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED, self::STATUS_POSTPONED];
            if (! in_array($computedStatus, $allowedStatuses) && $activity->status !== self::STATUS_POSTPONED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể hủy hoạt động đã được phê duyệt hoặc đang tạm hoãn.',
                ], 400);
            }

            $reason = $request->input('reason');

            // Change status to CANCELLED (keep current completion_percentage)
            $activity->status = self::STATUS_CANCELLED;
            // Note: Don't auto-update completion_percentage for CANCELLED - keep current value
            $activity->updated_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'approver:id,email,first_name,last_name',
            ]);

            // Apply computed status for response
            $this->applyComputedStatus($activity);

            // Log cancel action
            ActivityLogService::logCancelled($activity, $request, $reason);

            Log::info('Activity cancelled', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'cancelled_by' => $user->id,
                'reason' => $reason,
            ]);

            // Notify creator and participants
            $leadOrg = $activity->leadOrganization;
            $notifications = [
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Hoạt động đã bị hủy',
                    'message' => "Hoạt động {$activity->code} đã bị hủy bởi {$user->getNameAttribute()}. Lý do: {$reason}",
                    'category' => 'activity',
                    'notification_type' => 'activity_cancelled',
                    'icon' => 'CloseCircleOutlined',
                    'color' => 'red',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'cancelled_by' => $user->id,
                        'cancelled_by_name' => $user->getNameAttribute(),
                        'reason' => $reason,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            // Notify all participants with user_id
            $participants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->get();

            foreach ($participants as $participant) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $participant->user_id,
                    'title' => 'Hoạt động đã bị hủy',
                    'message' => "Hoạt động {$activity->code} đã bị hủy. Lý do: {$reason}",
                    'category' => 'activity',
                    'notification_type' => 'activity_cancelled',
                    'icon' => 'CloseCircleOutlined',
                    'color' => 'red',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'reason' => $reason,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã bị hủy.',
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
            Log::error('Cancel failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy hoạt động',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Uncancel a cancelled activity (ADMIN only)
     * Changes status back to APPROVED
     */
    public function uncancel(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Management: Uncancel Activity ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'activity_id' => $id,
        ]);

        $user = $request->user();

        // Only ADMIN can uncancel
        if ($user->role !== 'ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ ADMIN mới có quyền khôi phục hoạt động đã hủy',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Only CANCELLED activities can be uncancelled
            if ($activity->status !== self::STATUS_CANCELLED) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể khôi phục hoạt động đã bị hủy.',
                ], 400);
            }

            // Change status back to APPROVED
            $activity->status = self::STATUS_APPROVED;
            $this->autoUpdateCompletionPercentage($activity, self::STATUS_APPROVED);
            $activity->updated_by = $user->id;
            $activity->save();

            $activity->load([
                'activityType:id,name',
                'activityField:id,name',
                'leadOrganization:id,name,short_name',
                'creator:id,email,first_name,last_name',
                'approver:id,email,first_name,last_name',
            ]);

            // Apply computed status for response
            $this->applyComputedStatus($activity);

            Log::info('Activity uncancelled', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'uncancelled_by' => $user->id,
            ]);

            // Notify creator
            $notification = [
                'id' => Str::uuid()->toString(),
                'user_id' => $activity->created_by,
                'title' => 'Hoạt động đã được khôi phục',
                'message' => "Hoạt động {$activity->code} đã được khôi phục bởi {$user->getNameAttribute()}.",
                'category' => 'activity',
                'notification_type' => 'activity_uncancelled',
                'icon' => 'UndoOutlined',
                'color' => 'success',
                'action_url' => '/dashboard?tab=activity-management',
                'actor_id' => $user->id,
                'is_read' => false,
                'priority' => 'normal',
                'data' => json_encode([
                    'activity_id' => $activity->id,
                    'activity_code' => $activity->code,
                    'activity_title' => $activity->title,
                    'uncancelled_by' => $user->id,
                    'uncancelled_by_name' => $user->getNameAttribute(),
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table('notifications')->insert($notification);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoạt động đã được khôi phục.',
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
            Log::error('Uncancel failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể khôi phục hoạt động',
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

            // Get all organizations for collaborating selection (exclude user's own organization)
            $organizations = Organization::where('status', 'active')
                ->when($user->organization_id, function ($q) use ($user) {
                    return $q->where('id', '!=', $user->organization_id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'short_name']);

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
                    'organizations' => $organizations, // For collaborating organizations selection
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

        return sprintf('ACT-%s-%03d', $year, $newNumber);
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
        if (! in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
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
            if (! $accessCheck['allowed']) {
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
            // Note: IN_PROGRESS, COMPLETED are computed from APPROVED based on dates
            // Database stores: APPROVED, POSTPONED, CANCELLED
            $lockableStatuses = [self::STATUS_APPROVED, self::STATUS_POSTPONED, self::STATUS_CANCELLED];
            $computedStatus = $this->getComputedStatus($activity);
            $lockableComputedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_POSTPONED, self::STATUS_COMPLETED, self::STATUS_CANCELLED];

            if (! in_array($activity->status, $lockableStatuses) && ! in_array($computedStatus, $lockableComputedStatuses)) {
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

            // Log lock action
            ActivityLogService::logLocked($activity, $request);

            Log::info('Activity locked successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'locked_by' => $user->id,
            ]);

            $leadOrg = $activity->leadOrganization;
            Notification::create([
                'user_id' => $activity->created_by,
                'title' => 'Khóa hoạt động',
                'message' => "Hoạt động {$activity->code} đã bị khóa bởi {$user->getNameAttribute()}",
                'category' => 'activity',
                'notification_type' => 'activity_locked',
                'icon' => 'LockOutlined',
                'color' => 'warning',
                'action_url' => '/dashboard?tab=activity-management',
                'actor_id' => $activity->created_by,
                'is_read' => false,
                'priority' => 'normal',
                'data' => json_encode([
                    'activity_id' => $activity->id,
                    'activity_code' => $activity->code,
                    'activity_title' => $activity->title,
                    'organization_id' => $leadOrg ? $leadOrg->id : null,
                    'organization_name' => $leadOrg ? $leadOrg->name : null,
                    'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                    'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                ]),
            ]);

            DB::commit();

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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
     * - needs_action: count of COMPLETED activities that need result_summary update
     */
    public function getBadgeCounts(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->role;

        try {
            $counts = [
                'pending_approval' => 0,
                'draft' => 0,
                'needs_action' => 0,
            ];

            // MANAGER/OPERATOR/ADMIN sees count of pending approval activities in their organization
            if (in_array($role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
                $pendingQuery = Activity::where('status', self::STATUS_PENDING_APPROVAL);

                // Filter by user's organization if they have one
                if ($user->organization_id) {
                    $pendingQuery->where('lead_organization_id', $user->organization_id);
                }

                $counts['pending_approval'] = $pendingQuery->count();
            }

            // All users see count of draft activities in their organization
            if (in_array($role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                $query = Activity::where('status', self::STATUS_DRAFT);

                // All staff in organization can see organization's drafts
                if ($user->organization_id) {
                    $query->where('lead_organization_id', $user->organization_id);
                }

                $counts['draft'] = $query->count();
            }

            // Count COMPLETED activities that need action (result_summary is empty)
            // These are activities with APPROVED status that have passed end_date
            if (in_array($role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                $needsActionQuery = Activity::where('status', self::STATUS_APPROVED)
                    ->where('end_date', '<', now())
                    ->where(function ($q) {
                        $q->whereNull('result_summary')
                            ->orWhere('result_summary', '');
                    });

                // All staff in organization can see organization's activities needing action
                if ($user->organization_id) {
                    $needsActionQuery->where('lead_organization_id', $user->organization_id);
                }

                $counts['needs_action'] = $needsActionQuery->count();
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
        if (! in_array($user->role, ['OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Điều hành viên (OPERATOR) hoặc Quản trị viên (ADMIN) mới có quyền mở khóa hoạt động',
            ], 403);
        }

        try {
            DB::beginTransaction();
            $activity = Activity::findOrFail($id);

            // Check if not locked
            if (! $activity->is_locked) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hoạt động này chưa bị khóa',
                ], 400);
            }

            $activity->is_locked = false;
            $activity->locked_at = null;
            $activity->locked_by = null;
            $activity->save();

            // Log unlock action
            ActivityLogService::logUnlocked($activity, $request);

            Log::info('Activity unlocked successfully', [
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'unlocked_by' => $user->id,
            ]);

            $OrgManagers = User::where('organization_id', $activity->lead_organization_id)->where('role', 'MANAGER')->get();
            $leadOrg = $activity->leadOrganization;

            $notificationData = json_encode([
                'activity_id' => $activity->id,
                'activity_code' => $activity->code,
                'activity_title' => $activity->title,
                'organization_id' => $leadOrg ? $leadOrg->id : null,
                'organization_name' => $leadOrg ? $leadOrg->name : null,
                'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
            ]);

            $notifications = [
                [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Mở khóa hoạt động',
                    'message' => "Hoạt động {$activity->code} đã được mở khóa bởi {$user->getNameAttribute()}",
                    'category' => 'activity',
                    'notification_type' => 'activity_unlocked',
                    'icon' => 'UnlockOutlined',
                    'color' => 'success',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => $notificationData,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            foreach ($OrgManagers as $manager) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $manager->id,
                    'title' => 'Mở khóa hoạt động',
                    'message' => "Hoạt động {$activity->code} đã được mở khóa bởi {$user->getNameAttribute()}",
                    'category' => 'activity',
                    'notification_type' => 'activity_unlocked',
                    'icon' => 'UnlockOutlined',
                    'color' => 'success',
                    'action_url' => '/dashboard?tab=activity-management',
                    'actor_id' => $user->id,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => $notificationData,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('notifications')->insert($notifications);

            DB::commit();

            // Apply computed status for response
            $this->applyComputedStatus($activity);

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

    /**
     * Get all files for an activity
     */
    public function getFiles(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Files: Get Files ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        try {
            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            $files = ActivityFile::where('activity_id', $id)
                ->with(['fileType:id,code,name', 'uploader:id,email,first_name,last_name'])
                ->orderBy('uploaded_at', 'desc')
                ->get();

            // Get all file types for reference
            $fileTypes = FileType::orderBy('name')->get(['id', 'code', 'name']);

            return response()->json([
                'success' => true,
                'data' => [
                    'files' => $files,
                    'file_types' => $fileTypes,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Get activity files failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload a file for an activity
     */
    public function uploadFile(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Files: Upload File ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        // Allowed MIME types for security
        $allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
        ];

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,webp,txt,csv,mp4,webm,mp3,wav', // 50MB max
            'file_type_id' => 'nullable|uuid|exists:file_types,id',
            'description' => 'nullable|string|max:500',
        ], [
            'file.required' => 'Vui lòng chọn tập tin để tải lên',
            'file.max' => 'Tập tin không được vượt quá 50MB',
            'file.mimes' => 'Loại tập tin không được phép. Chỉ chấp nhận: PDF, Word, Excel, PowerPoint, hình ảnh, văn bản, video, audio',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $activity = Activity::findOrFail($id);
            $user = $request->user();

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // For file upload: Allow for APPROVED, IN_PROGRESS, COMPLETED even when locked
            // Only truly block if activity is CANCELLED or REJECTED
            $computedStatus = $this->getComputedStatus($activity);
            $allowedFileUploadStatuses = [
                self::STATUS_DRAFT,
                self::STATUS_PENDING_APPROVAL,
                self::STATUS_APPROVED,
                self::STATUS_IN_PROGRESS,
                self::STATUS_COMPLETED,
                self::STATUS_POSTPONED,
            ];

            if (! \in_array($computedStatus, $allowedFileUploadStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể thêm tập tin cho hoạt động ở trạng thái này',
                ], 400);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $fileSize = $file->getSize();

            // Security: Validate actual MIME type (not just extension)
            if (! \in_array($mimeType, $allowedMimes, true)) {
                Log::warning('File upload rejected: Invalid MIME type', [
                    'activity_id' => $id,
                    'file_name' => $originalName,
                    'mime_type' => $mimeType,
                    'user_id' => $user->id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Loại tập tin không được phép',
                ], 422);
            }

            // Generate unique filename
            $fileName = pathinfo($originalName, PATHINFO_FILENAME);
            $uniqueName = Str::slug($fileName).'_'.time().'.'.$extension;

            // Store file in activities/{activity_id}/ directory
            $path = $file->storeAs(
                'public/activities/'.$id,
                $uniqueName
            );

            // Create database record
            $activityFile = ActivityFile::create([
                'activity_id' => $id,
                'file_type_id' => $request->input('file_type_id'),
                'file_name' => $originalName,
                'file_path' => $path,
                'file_url' => null,
                'source_type' => 'upload',
                'file_size' => $fileSize,
                'file_extension' => $extension,
                'mime_type' => $mimeType,
                'description' => $request->input('description'),
                'uploaded_by' => $user->id,
                'is_public' => true,
            ]);

            $activityFile->load(['fileType:id,code,name', 'uploader:id,email,first_name,last_name']);

            Log::info('Activity file uploaded', [
                'activity_id' => $id,
                'file_id' => $activityFile->id,
                'file_name' => $originalName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tải tập tin lên thành công',
                'data' => $activityFile,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Upload file failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải tập tin lên',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add a link for an activity
     */
    public function addLink(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Files: Add Link ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        $validator = Validator::make($request->all(), [
            'file_url' => 'required|url|max:1000',
            'file_name' => 'required|string|max:255',
            'file_type_id' => 'nullable|uuid|exists:file_types,id',
            'description' => 'nullable|string|max:500',
        ], [
            'file_url.required' => 'Vui lòng nhập đường dẫn',
            'file_url.url' => 'Đường dẫn không hợp lệ',
            'file_name.required' => 'Vui lòng nhập tên tài liệu',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $activity = Activity::findOrFail($id);
            $user = $request->user();

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // For adding links: Allow for APPROVED, IN_PROGRESS, COMPLETED even when locked
            $computedStatus = $this->getComputedStatus($activity);
            $allowedFileUploadStatuses = [
                self::STATUS_DRAFT,
                self::STATUS_PENDING_APPROVAL,
                self::STATUS_APPROVED,
                self::STATUS_IN_PROGRESS,
                self::STATUS_COMPLETED,
                self::STATUS_POSTPONED,
            ];

            if (! \in_array($computedStatus, $allowedFileUploadStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể thêm liên kết cho hoạt động ở trạng thái này',
                ], 400);
            }

            // Create database record
            $activityFile = ActivityFile::create([
                'activity_id' => $id,
                'file_type_id' => $request->input('file_type_id'),
                'file_name' => $request->input('file_name'),
                'file_path' => null,
                'file_url' => $request->input('file_url'),
                'source_type' => 'link',
                'file_size' => null,
                'file_extension' => null,
                'mime_type' => null,
                'description' => $request->input('description'),
                'uploaded_by' => $user->id,
                'is_public' => true,
            ]);

            $activityFile->load(['fileType:id,code,name', 'uploader:id,email,first_name,last_name']);

            Log::info('Activity link added', [
                'activity_id' => $id,
                'file_id' => $activityFile->id,
                'file_url' => $request->input('file_url'),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Thêm liên kết thành công',
                'data' => $activityFile,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Add link failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể thêm liên kết',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an activity file/link
     */
    public function updateFile(Request $request, string $id, string $fileId): JsonResponse
    {
        Log::info('=== Activity Files: Update File ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
            'file_id' => $fileId,
        ]);

        $validator = Validator::make($request->all(), [
            'file_name' => 'sometimes|required|string|max:255',
            'file_type_id' => 'nullable|uuid|exists:file_types,id',
            'description' => 'nullable|string|max:500',
            'file_url' => 'sometimes|url|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $activity = Activity::findOrFail($id);
            $file = ActivityFile::where('activity_id', $id)->findOrFail($fileId);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // For editing files: Allow for APPROVED, IN_PROGRESS, COMPLETED even when locked
            // COMPLETED status: only ADMIN can edit files
            $user = $request->user();
            $computedStatus = $this->getComputedStatus($activity);
            $allowedFileEditStatuses = [
                self::STATUS_DRAFT,
                self::STATUS_PENDING_APPROVAL,
                self::STATUS_APPROVED,
                self::STATUS_IN_PROGRESS,
                self::STATUS_COMPLETED,
                self::STATUS_POSTPONED,
            ];

            if (! \in_array($computedStatus, $allowedFileEditStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể chỉnh sửa tập tin cho hoạt động ở trạng thái này',
                ], 400);
            }

            // COMPLETED status: only ADMIN can edit
            if ($computedStatus === self::STATUS_COMPLETED && $user->role !== 'ADMIN') {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ quản trị viên mới có thể chỉnh sửa tập tin của hoạt động đã hoàn thành',
                ], 403);
            }

            // Update allowed fields
            $updateData = [];
            if ($request->has('file_name')) {
                $updateData['file_name'] = $request->input('file_name');
            }
            if ($request->has('file_type_id')) {
                $updateData['file_type_id'] = $request->input('file_type_id');
            }
            if ($request->has('description')) {
                $updateData['description'] = $request->input('description');
            }
            if ($request->has('file_url') && $file->source_type === 'link') {
                $updateData['file_url'] = $request->input('file_url');
            }

            $file->update($updateData);
            $file->load(['fileType:id,code,name', 'uploader:id,email,first_name,last_name']);

            Log::info('Activity file updated', [
                'activity_id' => $id,
                'file_id' => $fileId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thành công',
                'data' => $file,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động hoặc tập tin',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update file failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an activity file/link
     */
    public function deleteFile(Request $request, string $id, string $fileId): JsonResponse
    {
        Log::info('=== Activity Files: Delete File ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
            'file_id' => $fileId,
        ]);

        try {
            $activity = Activity::findOrFail($id);
            $file = ActivityFile::where('activity_id', $id)->findOrFail($fileId);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // For deleting files: Allow for APPROVED, IN_PROGRESS, COMPLETED even when locked
            // COMPLETED status: only ADMIN can delete files
            $user = $request->user();
            $computedStatus = $this->getComputedStatus($activity);
            $allowedFileDeleteStatuses = [
                self::STATUS_DRAFT,
                self::STATUS_PENDING_APPROVAL,
                self::STATUS_APPROVED,
                self::STATUS_IN_PROGRESS,
                self::STATUS_COMPLETED,
                self::STATUS_POSTPONED,
            ];

            if (! \in_array($computedStatus, $allowedFileDeleteStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể xóa tập tin cho hoạt động ở trạng thái này',
                ], 400);
            }

            // COMPLETED status: allow creator, MANAGER of the organization, OPERATOR, ADMIN to delete
            if ($computedStatus === self::STATUS_COMPLETED) {
                $isCreator = $activity->created_by === $user->id;
                $isOrgManager = $user->role === 'MANAGER' && $activity->lead_organization_id === $user->organization_id;
                $isOperatorAdmin = in_array($user->role, ['OPERATOR', 'ADMIN']);

                if (! $isCreator && ! $isOrgManager && ! $isOperatorAdmin) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không có quyền xóa tập tin của hoạt động đã hoàn thành',
                    ], 403);
                }
            }

            // Delete physical file if it's an upload
            if ($file->source_type === 'upload' && $file->file_path) {
                Storage::delete($file->file_path);
            }

            $file->delete();

            Log::info('Activity file deleted', [
                'activity_id' => $id,
                'file_id' => $fileId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động hoặc tập tin',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete file failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Batch add files/links for an activity (used when creating activity with files)
     */
    public function batchAddFiles(Request $request, string $id): JsonResponse
    {
        Log::info('=== Activity Files: Batch Add ===', [
            'requester_id' => $request->user()->id,
            'activity_id' => $id,
        ]);

        $validator = Validator::make($request->all(), [
            'files' => 'required|array',
            'files.*.source_type' => 'required|in:upload,link',
            'files.*.file_type_id' => 'nullable|uuid|exists:file_types,id',
            'files.*.file_name' => 'required|string|max:255',
            'files.*.file_url' => 'required_if:files.*.source_type,link|url|max:1000',
            'files.*.description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $activity = Activity::findOrFail($id);
            $user = $request->user();

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            DB::beginTransaction();

            $createdFiles = [];
            foreach ($request->input('files') as $fileData) {
                if ($fileData['source_type'] === 'link') {
                    $activityFile = ActivityFile::create([
                        'activity_id' => $id,
                        'file_type_id' => $fileData['file_type_id'] ?? null,
                        'file_name' => $fileData['file_name'],
                        'file_path' => null,
                        'file_url' => $fileData['file_url'],
                        'source_type' => 'link',
                        'description' => $fileData['description'] ?? null,
                        'uploaded_by' => $user->id,
                        'is_public' => true,
                    ]);
                    $createdFiles[] = $activityFile;
                }
            }

            DB::commit();

            // Load relationships
            foreach ($createdFiles as $file) {
                $file->load(['fileType:id,code,name', 'uploader:id,email,first_name,last_name']);
            }

            Log::info('Batch files added', [
                'activity_id' => $id,
                'count' => count($createdFiles),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Thêm tài liệu thành công',
                'data' => $createdFiles,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Batch add files failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể thêm tài liệu',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ============================================
    // ACTIVITY PARTICIPANTS ENDPOINTS
    // ============================================

    /**
     * Get participants for an activity
     */
    public function getParticipants(Request $request, string $id): JsonResponse
    {
        try {
            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            $participants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->get();

            // Lookup users for internal participants
            $userIds = $participants->pluck('user_id')->filter()->unique()->toArray();
            $users = User::whereIn('id', $userIds)->get()->keyBy('id');

            $result = $participants->map(function ($p) use ($users) {
                $data = (array) $p;
                if ($p->user_id && isset($users[$p->user_id])) {
                    $user = $users[$p->user_id];
                    $data['user'] = [
                        'id' => $user->id,
                        'email' => $user->email,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'name' => $user->first_name.' '.$user->last_name,
                    ];
                }

                return $data;
            });

            // Get attendance file (DSTT)
            $dsttFile = ActivityFile::where('activity_id', $id)
                ->whereHas('fileType', function ($q) {
                    $q->where('code', 'DSTT');
                })
                ->with('fileType:id,code,name')
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'participants' => $result,
                    'attendance_file' => $dsttFile,
                    'summary' => [
                        'total' => $participants->count(),
                        'internal' => $participants->whereNotNull('user_id')->count(),
                        'external' => $participants->whereNull('user_id')->count(),
                        'pending' => $participants->where('invitation_status', 'pending')->count(),
                        'accepted' => $participants->where('invitation_status', 'accepted')->count(),
                        'declined' => $participants->where('invitation_status', 'declined')->count(),
                        'attended' => $participants->where('attended', true)->count(),
                    ],
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Get participants failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách tham dự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload attendance list Excel file (DSTT)
     * Validates: Excel format, requires 'email' column
     * Only ONE file allowed per activity
     */
    public function uploadAttendanceList(Request $request, string $id): JsonResponse
    {
        Log::info('=== Upload Attendance List ===', [
            'activity_id' => $id,
            'requester_id' => $request->user()->id,
        ]);

        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Validate file
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
                'send_invitations' => 'nullable|boolean', // whether to send invitations after approval
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'File không hợp lệ. Chỉ chấp nhận file Excel (.xlsx, .xls)',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Get DSTT file type
            $dsttFileType = FileType::where('code', 'DSTT')->first();
            if (! $dsttFileType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Loại tập tin DSTT chưa được cấu hình trong hệ thống',
                ], 500);
            }

            // Check if DSTT file already exists - only ONE allowed
            $existingDstt = ActivityFile::where('activity_id', $id)
                ->where('file_type_id', $dsttFileType->id)
                ->first();

            if ($existingDstt) {
                // Delete old file
                if ($existingDstt->file_path) {
                    Storage::delete($existingDstt->file_path);
                }
                $existingDstt->delete();

                // Also clear old participants from this file
                DB::table('activity_participants')
                    ->where('activity_id', $id)
                    ->delete();
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();

            // Read and validate Excel content
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (count($rows) < 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'File Excel phải có ít nhất 1 hàng tiêu đề và 1 hàng dữ liệu',
                ], 422);
            }

            // Find email column (case-insensitive, supports various formats)
            $headers = array_map('strtolower', array_map('trim', $rows[0]));
            $emailColIndex = false;

            // Try to find email column with various formats
            foreach ($headers as $index => $header) {
                // Clean header: remove (*), parentheses, extra spaces
                $cleanHeader = preg_replace('/\s*\(\*\)\s*|\s*\*\s*/', '', $header);
                $cleanHeader = preg_replace('/\s+/', ' ', trim($cleanHeader));

                if (in_array($cleanHeader, ['email', 'e-mail', 'email address', 'địa chỉ email'])) {
                    $emailColIndex = $index;
                    break;
                }
            }

            if ($emailColIndex === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'File Excel phải có cột "email" để xác định người tham dự',
                    'hint' => 'Các cột tìm thấy: '.implode(', ', $rows[0]),
                ], 422);
            }

            // Parse participants from Excel
            $participants = [];
            $errors = [];

            // Find name column (supports various formats)
            $nameColIndex = false;
            foreach ($headers as $index => $header) {
                $cleanHeader = preg_replace('/\s*\(\*\)\s*|\s*\*\s*/', '', $header);
                $cleanHeader = preg_replace('/\s+/', ' ', trim($cleanHeader));
                if (in_array($cleanHeader, ['name', 'họ tên', 'ho ten', 'full name', 'tên', 'ho va ten'])) {
                    $nameColIndex = $index;
                    break;
                }
            }

            // Find phone column (supports various formats)
            $phoneColIndex = false;
            foreach ($headers as $index => $header) {
                $cleanHeader = preg_replace('/\s*\(\*\)\s*|\s*\*\s*/', '', $header);
                $cleanHeader = preg_replace('/\s+/', ' ', trim($cleanHeader));
                if (in_array($cleanHeader, ['phone', 'số điện thoại', 'so dien thoai', 'điện thoại', 'dien thoai', 'sdt', 'mobile'])) {
                    $phoneColIndex = $index;
                    break;
                }
            }

            // Find organization column (supports various formats)
            $orgColIndex = false;
            foreach ($headers as $index => $header) {
                $cleanHeader = preg_replace('/\s*\(\*\)\s*|\s*\*\s*/', '', $header);
                $cleanHeader = preg_replace('/\s+/', ' ', trim($cleanHeader));
                if (in_array($cleanHeader, ['organization', 'đơn vị', 'don vi', 'cơ quan', 'co quan', 'company', 'tổ chức'])) {
                    $orgColIndex = $index;
                    break;
                }
            }

            // Find notes column (supports various formats)
            $notesColIndex = false;
            foreach ($headers as $index => $header) {
                $cleanHeader = preg_replace('/\s*\(\*\)\s*|\s*\*\s*/', '', $header);
                $cleanHeader = preg_replace('/\s+/', ' ', trim($cleanHeader));
                if (in_array($cleanHeader, ['notes', 'ghi chú', 'ghi chu', 'note', 'comment'])) {
                    $notesColIndex = $index;
                    break;
                }
            }

            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $email = isset($row[$emailColIndex]) ? trim($row[$emailColIndex]) : null;

                if (empty($email)) {
                    continue; // Skip empty rows
                }

                // Validate email format
                if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = [
                        'row' => $i + 1,
                        'email' => $email,
                        'error' => 'Email không hợp lệ',
                    ];

                    continue;
                }

                $name = $nameColIndex !== false && isset($row[$nameColIndex]) ? trim($row[$nameColIndex]) : null;
                $phone = $phoneColIndex !== false && isset($row[$phoneColIndex]) ? trim($row[$phoneColIndex]) : null;
                $org = $orgColIndex !== false && isset($row[$orgColIndex]) ? trim($row[$orgColIndex]) : null;

                // Check if user exists in system
                $user = User::where('email', $email)->first();

                $participants[] = [
                    'id' => Str::uuid()->toString(),
                    'activity_id' => $id,
                    'user_id' => $user ? $user->id : null,
                    'external_name' => $user ? null : $name,
                    'external_email' => $user ? null : $email,
                    'external_phone' => $user ? null : $phone,
                    'external_organization' => $user ? null : $org,
                    'role' => 'attendee',
                    'invited_at' => null, // Will be set after approval
                    'invitation_status' => 'pending',
                    'responded_at' => null,
                    'attended' => false,
                    'attendance_time' => null,
                    'notes' => $user ? null : 'Không tìm thấy trong hệ thống',
                ];
            }

            if (empty($participants)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy người tham dự hợp lệ trong file Excel',
                    'errors' => $errors,
                ], 422);
            }

            // Save file
            $directory = 'public/activities/'.$id;
            $fileName = 'DSTT_'.date('YmdHis').'.'.$extension;
            $path = $file->storeAs($directory, $fileName);

            // Create activity file record
            $activityFile = ActivityFile::create([
                'id' => Str::uuid()->toString(),
                'activity_id' => $id,
                'file_type_id' => $dsttFileType->id,
                'file_name' => $originalName,
                'file_path' => $path,
                'file_url' => null,
                'source_type' => 'upload',
                'file_size' => $size,
                'file_extension' => $extension,
                'mime_type' => $mimeType,
                'description' => 'Danh sách tham dự - '.count($participants).' người',
                'uploaded_by' => $request->user()->id,
                'is_public' => false,
            ]);

            // Insert participants
            DB::table('activity_participants')->insert($participants);

            // Update activity to mark that it has attendance list
            $activity->update([
                'updated_by' => $request->user()->id,
            ]);

            // Store send_invitations preference
            if ($request->has('send_invitations')) {
                // Store in activity data or separate field
                DB::table('activities')
                    ->where('id', $id)
                    ->update([
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\n[SEND_INVITATIONS_AFTER_APPROVAL]')"),
                    ]);
            }

            $activityFile->load('fileType:id,code,name');

            DB::commit();

            // Summarize
            $internalCount = collect($participants)->whereNotNull('user_id')->count();
            $externalCount = collect($participants)->whereNull('user_id')->count();

            return response()->json([
                'success' => true,
                'message' => 'Đã tải lên danh sách tham dự thành công',
                'data' => [
                    'file' => $activityFile,
                    'summary' => [
                        'total' => count($participants),
                        'internal' => $internalCount,
                        'external' => $externalCount,
                        'will_receive_invitation' => $internalCount,
                        'not_in_system' => $externalCount,
                    ],
                    'errors' => $errors,
                ],
            ], 201);
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.',
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Upload attendance list failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lên danh sách tham dự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete attendance list for an activity
     */
    public function deleteAttendanceList(Request $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Only allow deletion if activity is still DRAFT
            if ($activity->status !== self::STATUS_DRAFT) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể xóa danh sách tham dự khi hoạt động ở trạng thái Nháp',
                ], 400);
            }

            // Get DSTT file type
            $dsttFileType = FileType::where('code', 'DSTT')->first();

            if ($dsttFileType) {
                $dsttFile = ActivityFile::where('activity_id', $id)
                    ->where('file_type_id', $dsttFileType->id)
                    ->first();

                if ($dsttFile) {
                    if ($dsttFile->file_path) {
                        Storage::delete($dsttFile->file_path);
                    }
                    $dsttFile->delete();
                }
            }

            // Delete all participants
            DB::table('activity_participants')
                ->where('activity_id', $id)
                ->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa danh sách tham dự',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Delete attendance list failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa danh sách tham dự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send invitation notifications to all participants
     * Called after activity is approved
     */
    public function sendInvitations(Request $request, string $id): JsonResponse
    {
        Log::info('=== Send Invitations to Participants ===', [
            'activity_id' => $id,
            'requester_id' => $request->user()->id,
        ]);

        try {
            DB::beginTransaction();

            $activity = Activity::with(['leadOrganization', 'activityType'])->findOrFail($id);

            // Only approved/in_progress activities can send invitations (not completed)
            // Check computed status (APPROVED becomes IN_PROGRESS or COMPLETED based on dates)
            $computedStatus = $this->getComputedStatus($activity);
            if (! in_array($computedStatus, [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS])) {
                $errorMessage = $computedStatus === self::STATUS_COMPLETED
                    ? 'Không thể gửi lời mời cho hoạt động đã hoàn thành'
                    : 'Chỉ có thể gửi lời mời cho hoạt động đã được phê duyệt';

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                ], 400);
            }

            // Get participants who haven't been invited yet
            $participants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->whereNull('invited_at')
                ->get();

            if ($participants->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không có người tham dự mới cần gửi lời mời',
                    'data' => ['sent' => 0, 'failed' => 0],
                ]);
            }

            $notifications = [];
            $sentCount = 0;
            $failedCount = 0;
            $failedEmails = [];

            foreach ($participants as $participant) {
                // Check if user still exists
                $user = User::find($participant->user_id);
                if (! $user) {
                    $failedCount++;
                    $failedEmails[] = [
                        'user_id' => $participant->user_id,
                        'reason' => 'Người dùng không tồn tại trong hệ thống',
                    ];

                    continue;
                }

                // Create notification
                $leadOrg = $activity->leadOrganization;
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $user->id,
                    'title' => 'Lời mời tham dự hoạt động',
                    'message' => "Bạn được mời tham dự hoạt động \"{$activity->title}\" vào ngày ".
                        ($activity->start_date ? date('d/m/Y H:i', strtotime($activity->start_date)) : 'chưa xác định'),
                    'category' => 'activity',
                    'notification_type' => 'activity_invitation',
                    'icon' => 'CalendarOutlined',
                    'color' => 'blue',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $request->user()->id,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'activity_type' => $activity->activityType ? $activity->activityType->name : null,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'start_date' => $activity->start_date,
                        'end_date' => $activity->end_date,
                        'location' => $activity->location,
                        'participant_id' => $participant->id,
                        'invitation_status' => 'pending',
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $sentCount++;
            }

            // Insert notifications
            if (! empty($notifications)) {
                DB::table('notifications')->insert($notifications);
            }

            // Update participants with invited_at
            DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->whereNull('invited_at')
                ->update(['invited_at' => now()]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã gửi {$sentCount} lời mời tham dự",
                'data' => [
                    'sent' => $sentCount,
                    'failed' => $failedCount,
                    'failed_details' => $failedEmails,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Send invitations failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi lời mời',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resend invitation to specific participants (update invited_at instead of creating new)
     */
    public function resendInvitation(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'required|string',
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

            $activity = Activity::with(['leadOrganization', 'activityType'])->findOrFail($id);

            // Only approved/in_progress activities can send invitations (not completed)
            // Check computed status (APPROVED becomes IN_PROGRESS or COMPLETED based on dates)
            $computedStatus = $this->getComputedStatus($activity);
            if (! in_array($computedStatus, [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS])) {
                $errorMessage = $computedStatus === self::STATUS_COMPLETED
                    ? 'Không thể gửi lại lời mời cho hoạt động đã hoàn thành'
                    : 'Chỉ có thể gửi lời mời cho hoạt động đã được phê duyệt';

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                ], 400);
            }

            $participantIds = $request->input('participant_ids');

            // Get participants to resend
            $participants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereIn('id', $participantIds)
                ->whereNotNull('user_id')
                ->get();

            if ($participants->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy người tham dự hợp lệ để gửi lại lời mời',
                ], 422);
            }

            $notifications = [];
            $sentCount = 0;
            $now = now();

            foreach ($participants as $participant) {
                $user = User::find($participant->user_id);
                if (! $user) {
                    continue;
                }

                // Create notification
                $leadOrg = $activity->leadOrganization;
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $user->id,
                    'title' => 'Lời mời tham dự hoạt động (nhắc nhở)',
                    'message' => "Bạn được mời tham dự hoạt động \"{$activity->title}\" vào ngày ".
                        ($activity->start_date ? date('d/m/Y H:i', strtotime($activity->start_date)) : 'chưa xác định'),
                    'category' => 'activity',
                    'notification_type' => 'activity_invitation',
                    'icon' => 'CalendarOutlined',
                    'color' => 'orange',
                    'action_url' => "/activities/{$activity->id}",
                    'actor_id' => $request->user()->id,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        'activity_id' => $activity->id,
                        'activity_code' => $activity->code,
                        'activity_title' => $activity->title,
                        'activity_type' => $activity->activityType ? $activity->activityType->name : null,
                        'organization_id' => $leadOrg ? $leadOrg->id : null,
                        'organization_name' => $leadOrg ? $leadOrg->name : null,
                        'organization_short_name' => $leadOrg ? $leadOrg->short_name : null,
                        'organization_avatar' => $leadOrg && $leadOrg->avatar ? asset('storage/'.$leadOrg->avatar) : null,
                        'start_date' => $activity->start_date,
                        'end_date' => $activity->end_date,
                        'location' => $activity->location,
                        'participant_id' => $participant->id,
                        'invitation_status' => 'pending',
                        'is_reminder' => true,
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                // Update invited_at to track resend time
                DB::table('activity_participants')
                    ->where('id', $participant->id)
                    ->update([
                        'invited_at' => $now,
                        'updated_at' => $now,
                    ]);

                $sentCount++;
            }

            // Insert notifications
            if (! empty($notifications)) {
                DB::table('notifications')->insert($notifications);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã gửi lại {$sentCount} lời mời tham dự",
                'data' => [
                    'sent' => $sentCount,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Resend invitation failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi lại lời mời',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Respond to invitation (accept/decline)
     */
    public function respondToInvitation(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'response' => 'required|in:accepted,declined',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();

            $participant = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (! $participant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có trong danh sách tham dự hoạt động này',
                ], 404);
            }

            // Check if user has already responded to prevent double response
            if ($participant->invitation_status !== 'pending') {
                $statusMessage = $participant->invitation_status === 'accepted'
                    ? 'đã xác nhận tham dự'
                    : 'đã từ chối';

                return response()->json([
                    'success' => false,
                    'message' => "Bạn đã phản hồi lời mời này rồi (${statusMessage})",
                    'already_responded' => true,
                    'current_status' => $participant->invitation_status,
                ], 409); // 409 Conflict
            }

            DB::table('activity_participants')
                ->where('id', $participant->id)
                ->update([
                    'invitation_status' => $request->response,
                    'responded_at' => now(),
                    'notes' => $request->notes,
                ]);

            // Update the original invitation notification to reflect the response
            // Find notifications of type 'activity_invitation' for this user and activity
            $invitationNotifications = DB::table('notifications')
                ->where('user_id', $user->id)
                ->where('notification_type', 'activity_invitation')
                ->get();

            foreach ($invitationNotifications as $notification) {
                $data = json_decode($notification->data, true);
                if (isset($data['activity_id']) && $data['activity_id'] === $id) {
                    // Update the invitation_status in notification data
                    $data['invitation_status'] = $request->response;
                    DB::table('notifications')
                        ->where('id', $notification->id)
                        ->update([
                            'data' => json_encode($data),
                            'is_read' => true,
                            'read_at' => now(),
                        ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => $request->response === 'accepted'
                    ? 'Bạn đã xác nhận tham dự hoạt động'
                    : 'Bạn đã từ chối tham dự hoạt động',
            ]);
        } catch (\Exception $e) {
            Log::error('Respond to invitation failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể phản hồi lời mời',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download attendance list template (Excel)
     */
    public function downloadAttendanceTemplate(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Danh sách tham dự');

        // Set headers
        $headers = ['email', 'ho_ten', 'so_dien_thoai', 'don_vi', 'ghi_chu'];
        $headerTitles = ['Email (*)', 'Họ tên', 'Số điện thoại', 'Đơn vị', 'Ghi chú'];

        foreach ($headers as $col => $header) {
            $cell = chr(65 + $col).'1';
            $sheet->setCellValue($cell, $headerTitles[$col]);

            // Style header
            $sheet->getStyle($cell)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1890FF'],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
            ]);

            // Auto width
            $sheet->getColumnDimension(chr(65 + $col))->setAutoSize(true);
        }

        // Add sample data rows
        $sampleData = [
            ['nguyen.vana@example.com', 'Nguyễn Văn A', '0901234567', 'Phòng Kỹ thuật', ''],
            ['tran.thib@example.com', 'Trần Thị B', '0912345678', 'Phòng Nhân sự', 'Đến muộn 15 phút'],
            ['le.vanc@example.com', 'Lê Văn C', '', 'Phòng Kinh doanh', ''],
        ];

        $row = 2;
        foreach ($sampleData as $data) {
            foreach ($data as $col => $value) {
                $sheet->setCellValue(chr(65 + $col).$row, $value);
            }
            $row++;
        }

        // Add note about required field
        $sheet->setCellValue('A6', '(*) Cột email là bắt buộc. Các cột khác có thể để trống.');
        $sheet->getStyle('A6')->applyFromArray([
            'font' => [
                'italic' => true,
                'color' => ['rgb' => '888888'],
            ],
        ]);
        $sheet->mergeCells('A6:E6');

        // Add note about internal users
        $sheet->setCellValue('A7', 'Lưu ý: Chỉ những email có trong hệ thống mới nhận được thông báo mời tham dự.');
        $sheet->getStyle('A7')->applyFromArray([
            'font' => [
                'italic' => true,
                'color' => ['rgb' => 'FF6600'],
            ],
        ]);
        $sheet->mergeCells('A7:E7');

        // Create temp file
        $fileName = 'mau_danh_sach_tham_du.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'attendance_template_');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export participants list to Excel
     */
    public function exportParticipants(string $id): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $activity = Activity::with(['leadOrganization'])->find($id);

        if (! $activity) {
            abort(404, 'Không tìm thấy hoạt động');
        }

        $participants = ActivityParticipant::where('activity_id', $id)
            ->with(['user:id,first_name,last_name,email,phone,organization_id', 'user.organization:id,name,short_name'])
            ->orderBy('created_at', 'asc')
            ->get();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Danh sách tham dự');

        // Headers
        $headers = [
            'STT',
            'Họ và tên',
            'Email',
            'Số điện thoại',
            'Đơn vị',
            'Vai trò',
            'Trạng thái mời',
            'Thời gian phản hồi',
            'Đã điểm danh',
            'Thời gian điểm danh',
            'Ghi chú',
        ];

        // Style headers
        foreach ($headers as $col => $header) {
            $cell = chr(65 + $col).'1';
            $sheet->setCellValue($cell, $header);
            $sheet->getStyle($cell)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1890FF'],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
            ]);
            $sheet->getColumnDimension(chr(65 + $col))->setAutoSize(true);
        }

        // Data rows
        $row = 2;
        $stt = 1;
        foreach ($participants as $participant) {
            // Determine name and other info
            if ($participant->user_id && $participant->user) {
                $name = trim($participant->user->first_name.' '.$participant->user->last_name);
                $email = $participant->user->email;
                $phone = $participant->user->phone ?? '';
                $organization = $participant->user->organization ?
                    ($participant->user->organization->short_name ?? $participant->user->organization->name) : '';
            } else {
                $name = $participant->external_name ?? '';
                $email = $participant->external_email ?? '';
                $phone = $participant->external_phone ?? '';
                $organization = $participant->external_organization ?? '';
            }

            // Map invitation status
            $statusMap = [
                'pending' => 'Chờ phản hồi',
                'accepted' => 'Đã xác nhận',
                'declined' => 'Đã từ chối',
            ];
            $invitationStatus = $statusMap[strtolower($participant->invitation_status ?? 'pending')] ?? $participant->invitation_status;

            // Map role
            $roleMap = [
                'participant' => 'Người tham dự',
                'speaker' => 'Diễn giả',
                'organizer' => 'Ban tổ chức',
                'guest' => 'Khách mời',
            ];
            $role = $roleMap[strtolower($participant->role ?? 'participant')] ?? $participant->role;

            $sheet->setCellValue('A'.$row, $stt);
            $sheet->setCellValue('B'.$row, $name);
            $sheet->setCellValue('C'.$row, $email);
            $sheet->setCellValue('D'.$row, $phone);
            $sheet->setCellValue('E'.$row, $organization);
            $sheet->setCellValue('F'.$row, $role);
            $sheet->setCellValue('G'.$row, $invitationStatus);
            $sheet->setCellValue('H'.$row, $participant->responded_at ? date('d/m/Y H:i', strtotime($participant->responded_at)) : '');
            $sheet->setCellValue('I'.$row, $participant->attended ? 'Có' : 'Không');
            $sheet->setCellValue('J'.$row, $participant->attendance_time ? date('d/m/Y H:i', strtotime($participant->attendance_time)) : '');
            $sheet->setCellValue('K'.$row, $participant->notes ?? '');

            $row++;
            $stt++;
        }

        // Add summary at the bottom
        $summaryRow = $row + 1;
        $totalParticipants = $participants->count();
        $acceptedCount = $participants->where('invitation_status', 'accepted')->count();
        $declinedCount = $participants->where('invitation_status', 'declined')->count();
        $pendingCount = $participants->where('invitation_status', 'pending')->count();
        $attendedCount = $participants->where('attended', true)->count();

        $sheet->setCellValue('A'.$summaryRow, 'THỐNG KÊ:');
        $sheet->getStyle('A'.$summaryRow)->getFont()->setBold(true);
        $sheet->setCellValue('A'.($summaryRow + 1), "Tổng số: {$totalParticipants} | Xác nhận: {$acceptedCount} | Từ chối: {$declinedCount} | Chờ phản hồi: {$pendingCount} | Đã điểm danh: {$attendedCount}");
        $sheet->mergeCells('A'.($summaryRow + 1).':K'.($summaryRow + 1));

        // Activity info header
        $infoRow = $summaryRow + 3;
        $sheet->setCellValue('A'.$infoRow, 'THÔNG TIN HOẠT ĐỘNG:');
        $sheet->getStyle('A'.$infoRow)->getFont()->setBold(true);
        $sheet->setCellValue('A'.($infoRow + 1), "Mã hoạt động: {$activity->code}");
        $sheet->setCellValue('A'.($infoRow + 2), "Tên hoạt động: {$activity->title}");
        $sheet->setCellValue('A'.($infoRow + 3), 'Đơn vị chủ trì: '.($activity->leadOrganization ? $activity->leadOrganization->name : 'N/A'));
        $sheet->setCellValue('A'.($infoRow + 4), 'Thời gian: '.
            ($activity->start_date ? date('d/m/Y H:i', strtotime($activity->start_date)) : 'N/A').
            ' - '.
            ($activity->end_date ? date('d/m/Y H:i', strtotime($activity->end_date)) : 'N/A'));

        // Create file
        $fileName = "danh_sach_tham_du_{$activity->code}_".date('Ymd_His').'.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'participants_export_');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Get attendance template info (columns and descriptions)
     */
    public function getAttendanceTemplateInfo(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'columns' => [
                    [
                        'name' => 'email',
                        'title' => 'Email',
                        'required' => true,
                        'description' => 'Địa chỉ email của người tham dự (bắt buộc)',
                    ],
                    [
                        'name' => 'ho_ten',
                        'title' => 'Họ tên',
                        'required' => false,
                        'description' => 'Họ và tên người tham dự',
                    ],
                    [
                        'name' => 'so_dien_thoai',
                        'title' => 'Số điện thoại',
                        'required' => false,
                        'description' => 'Số điện thoại liên hệ',
                    ],
                    [
                        'name' => 'don_vi',
                        'title' => 'Đơn vị',
                        'required' => false,
                        'description' => 'Đơn vị/tổ chức của người tham dự',
                    ],
                    [
                        'name' => 'ghi_chu',
                        'title' => 'Ghi chú',
                        'required' => false,
                        'description' => 'Ghi chú thêm',
                    ],
                ],
                'notes' => [
                    'Cột email là bắt buộc',
                    'Chỉ những email có trong hệ thống mới nhận được thông báo mời tham dự',
                    'File Excel hỗ trợ định dạng .xlsx và .xls',
                ],
            ],
        ]);
    }

    /**
     * Get available user groups from organizations for adding as participants
     * Can specify organization_id in query param, otherwise returns all organizations
     */
    public function getOrganizationUserGroups(Request $request, string $id): JsonResponse
    {
        try {
            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Get existing participant user_ids to exclude
            $existingUserIds = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->pluck('user_id')
                ->toArray();

            // Get organization_id from query param or use activity's lead_organization
            $organizationId = $request->query('organization_id', $activity->lead_organization_id);

            // Get all organizations for dropdown
            $allOrganizations = Organization::orderBy('name')
                ->get(['id', 'name', 'code'])
                ->map(function ($org) {
                    return [
                        'id' => $org->id,
                        'name' => $org->name,
                        'code' => $org->code,
                    ];
                });

            // If no organization selected, return list of organizations
            if (! $organizationId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'organization' => null,
                        'organizations' => $allOrganizations,
                        'groups' => [],
                        'existing_participants_count' => count($existingUserIds),
                    ],
                ]);
            }

            // Get organization info
            $organization = Organization::find($organizationId);
            if (! $organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy tổ chức',
                ], 404);
            }

            // Count users by role in this organization (excluding existing participants)
            $userGroups = [];

            // All members
            $allMembersCount = User::where('organization_id', $organizationId)
                ->whereNotIn('id', $existingUserIds)
                ->count();

            $userGroups[] = [
                'key' => 'all',
                'label' => 'Tất cả thành viên',
                'description' => 'Tất cả user thuộc tổ chức',
                'count' => $allMembersCount,
                'disabled' => $allMembersCount === 0,
            ];

            // By role
            $roles = ['MANAGER', 'STAFF', 'GUEST'];
            $roleLabels = [
                'MANAGER' => 'Quản lý (Manager)',
                'STAFF' => 'Nhân viên (Staff)',
                'GUEST' => 'Khách (Guest)',
            ];

            foreach ($roles as $role) {
                $count = User::where('organization_id', $organizationId)
                    ->where('role', $role)
                    ->whereNotIn('id', $existingUserIds)
                    ->count();

                $userGroups[] = [
                    'key' => strtolower($role),
                    'label' => $roleLabels[$role],
                    'description' => "User với vai trò {$role}",
                    'count' => $count,
                    'disabled' => $count === 0,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'organization' => [
                        'id' => $organization->id,
                        'name' => $organization->name,
                        'code' => $organization->code,
                    ],
                    'organizations' => $allOrganizations,
                    'groups' => $userGroups,
                    'existing_participants_count' => count($existingUserIds),
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Get organization user groups failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy danh sách nhóm user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add participants from organization user groups
     */
    public function addParticipantsFromGroup(Request $request, string $id): JsonResponse
    {
        Log::info('=== Add Participants From Group ===', [
            'activity_id' => $id,
            'requester_id' => $request->user()->id,
            'groups' => $request->input('groups'),
            'organization_id' => $request->input('organization_id'),
        ]);

        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'groups' => 'required|array|min:1',
                'groups.*' => 'required|string|in:all,manager,staff,guest',
                'organization_id' => 'required|string|exists:organizations,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Get organization_id from request (can be any organization)
            $organizationId = $request->input('organization_id');

            // Get existing participant user_ids to exclude
            $existingUserIds = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotNull('user_id')
                ->pluck('user_id')
                ->toArray();

            // Build query based on selected groups
            $groups = $request->input('groups');
            $query = User::where('organization_id', $organizationId)
                ->whereNotIn('id', $existingUserIds);

            if (! in_array('all', $groups)) {
                // Filter by specific roles
                $roles = array_map('strtoupper', $groups);
                $query->whereIn('role', $roles);
            }

            $users = $query->get(['id', 'email', 'first_name', 'last_name', 'role']);

            if ($users->isEmpty()) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy user mới để thêm. Có thể tất cả user đã có trong danh sách tham dự.',
                ], 422);
            }

            // Create participants
            $participants = [];
            $now = now();

            foreach ($users as $user) {
                $participants[] = [
                    'id' => Str::uuid()->toString(),
                    'activity_id' => $id,
                    'user_id' => $user->id,
                    'external_name' => null,
                    'external_email' => null,
                    'external_phone' => null,
                    'external_organization' => null,
                    'role' => 'attendee',
                    'invited_at' => null,
                    'invitation_status' => 'pending',
                    'responded_at' => null,
                    'attended' => false,
                    'attendance_time' => null,
                    'notes' => 'Thêm từ nhóm: '.implode(', ', $groups),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Insert participants
            DB::table('activity_participants')->insert($participants);

            // Update activity
            $activity->update([
                'updated_by' => $request->user()->id,
            ]);

            DB::commit();

            // Get updated summary
            $summary = $this->getParticipantsSummary($id);

            return response()->json([
                'success' => true,
                'message' => 'Đã thêm '.count($participants).' người tham dự từ tổ chức',
                'data' => [
                    'added_count' => count($participants),
                    'groups_added' => $groups,
                    'summary' => $summary,
                ],
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Add participants from group failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể thêm người tham dự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Get participants summary for an activity
     */
    private function getParticipantsSummary(string $activityId): array
    {
        $participants = DB::table('activity_participants')
            ->where('activity_id', $activityId)
            ->get();

        return [
            'total' => $participants->count(),
            'internal' => $participants->whereNotNull('user_id')->count(),
            'external' => $participants->whereNull('user_id')->count(),
            'pending' => $participants->where('invitation_status', 'pending')->count(),
            'accepted' => $participants->where('invitation_status', 'accepted')->count(),
            'declined' => $participants->where('invitation_status', 'declined')->count(),
            'invited' => $participants->whereNotNull('invited_at')->count(),
            'not_invited' => $participants->whereNull('invited_at')->count(),
            'attended' => $participants->where('attended', true)->count(),
        ];
    }

    /**
     * Update attendance for participants (mark who attended)
     * Used for post-completion attendance recording
     */
    public function updateParticipantsAttendance(Request $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Allow attendance update for COMPLETED, IN_PROGRESS, APPROVED activities
            // Note: IN_PROGRESS, COMPLETED are computed from APPROVED based on dates
            $computedStatus = $this->getComputedStatus($activity);
            $allowedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED];
            if (! in_array($computedStatus, $allowedStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể cập nhật điểm danh khi hoạt động đã được phê duyệt hoặc hoàn thành',
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'participant_ids' => 'required|array',
                'participant_ids.*' => 'string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $participantIds = $request->input('participant_ids', []);
            $now = now();

            // First, reset all participants attendance for this activity
            DB::table('activity_participants')
                ->where('activity_id', $id)
                ->update([
                    'attended' => false,
                    'attendance_time' => null,
                    'updated_at' => $now,
                ]);

            // Then mark selected participants as attended
            if (! empty($participantIds)) {
                DB::table('activity_participants')
                    ->where('activity_id', $id)
                    ->whereIn('id', $participantIds)
                    ->update([
                        'attended' => true,
                        'attendance_time' => $now,
                        'updated_at' => $now,
                    ]);
            }

            // Update activity
            $activity->update([
                'updated_by' => $request->user()->id,
            ]);

            DB::commit();

            // Get updated counts
            $totalParticipants = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->count();
            $attendedCount = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->where('attended', true)
                ->count();

            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật điểm danh: {$attendedCount}/{$totalParticipants} người tham dự",
                'data' => [
                    'updated_count' => count($participantIds),
                    'attended_count' => $attendedCount,
                    'total_count' => $totalParticipants,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Update participants attendance failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật điểm danh',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process attendance with new participants and optional file upload
     * - Mark existing participants as attended
     * - Add new external participants and mark as attended
     * - Upload attendance file with file type ĐD (Điểm Danh)
     */
    public function processAttendance(Request $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $activity = Activity::findOrFail($id);

            // Security check
            $accessCheck = $this->canAccessActivity($request, $activity);
            if (! $accessCheck['allowed']) {
                return response()->json([
                    'success' => false,
                    'message' => $accessCheck['reason'],
                ], 403);
            }

            // Allow for COMPLETED, IN_PROGRESS, APPROVED activities
            // Note: IN_PROGRESS, COMPLETED are computed from APPROVED based on dates
            $computedStatus = $this->getComputedStatus($activity);
            $allowedStatuses = [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED];
            if (! in_array($computedStatus, $allowedStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể cập nhật điểm danh khi hoạt động đã được phê duyệt hoặc hoàn thành',
                ], 400);
            }

            $user = $request->user();
            $now = now();

            // Parse JSON data from form
            $attendedParticipantIds = json_decode($request->input('attended_participant_ids', '[]'), true) ?: [];
            $newParticipants = json_decode($request->input('new_participants', '[]'), true) ?: [];

            // Track new participant IDs for marking attendance
            $newParticipantIds = [];

            // Add new external participants
            foreach ($newParticipants as $participant) {
                $email = trim($participant['email'] ?? '');
                if (empty($email)) {
                    continue;
                }

                // Check if already exists
                $existing = DB::table('activity_participants')
                    ->where('activity_id', $id)
                    ->where('external_email', $email)
                    ->first();

                if (! $existing) {
                    $participantId = (string) \Illuminate\Support\Str::uuid();
                    DB::table('activity_participants')->insert([
                        'id' => $participantId,
                        'activity_id' => $id,
                        'user_id' => null,
                        'external_email' => $email,
                        'external_name' => $participant['name'] ?? null,
                        'external_phone' => $participant['phone'] ?? null,
                        'external_organization' => $participant['organization'] ?? null,
                        'role' => 'participant',
                        'invitation_status' => 'accepted', // Auto-accept since they attended
                        'attended' => true,
                        'attendance_time' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $newParticipantIds[] = $participantId;
                } else {
                    $newParticipantIds[] = $existing->id;
                }
            }

            // Reset all participants attendance (except new ones we just added)
            DB::table('activity_participants')
                ->where('activity_id', $id)
                ->whereNotIn('id', $newParticipantIds)
                ->update([
                    'attended' => false,
                    'attendance_time' => null,
                    'updated_at' => $now,
                ]);

            // Mark attended participants (from existing list)
            if (! empty($attendedParticipantIds)) {
                DB::table('activity_participants')
                    ->where('activity_id', $id)
                    ->whereIn('id', $attendedParticipantIds)
                    ->update([
                        'attended' => true,
                        'attendance_time' => $now,
                        'updated_at' => $now,
                    ]);
            }

            // Handle file upload
            $fileUploaded = false;
            if ($request->hasFile('attendance_file')) {
                $file = $request->file('attendance_file');

                // Find file type ĐD (Điểm Danh)
                $attendanceFileType = DB::table('file_types')
                    ->where('code', 'ĐD')
                    ->first();

                if ($attendanceFileType) {
                    // Generate unique filename
                    $originalName = $file->getClientOriginalName();
                    $extension = $file->getClientOriginalExtension();
                    $mimeType = $file->getMimeType();
                    $storedName = 'attendance_'.$id.'_'.time().'.'.$extension;

                    // Store file
                    $path = $file->storeAs('activity_files/'.$id, $storedName, 'public');

                    // Create file record (activity_files table has no timestamps)
                    DB::table('activity_files')->insert([
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'activity_id' => $id,
                        'file_type_id' => $attendanceFileType->id,
                        'file_name' => $originalName,
                        'file_path' => $path,
                        'file_extension' => $extension,
                        'mime_type' => $mimeType,
                        'file_size' => $file->getSize(),
                        'source_type' => 'upload',
                        'uploaded_by' => $user->id,
                    ]);

                    $fileUploaded = true;
                }
            }

            // Update activity
            $activity->update([
                'updated_by' => $user->id,
            ]);

            DB::commit();

            // Get updated counts
            $attendedCount = DB::table('activity_participants')
                ->where('activity_id', $id)
                ->where('attended', true)
                ->count();

            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật điểm danh: {$attendedCount} người tham dự".
                    (count($newParticipantIds) > 0 ? ', thêm '.count($newParticipantIds).' người mới' : '').
                    ($fileUploaded ? ', đã lưu file điểm danh' : ''),
                'data' => [
                    'attended_count' => $attendedCount,
                    'new_participants_count' => count($newParticipantIds),
                    'file_uploaded' => $fileUploaded,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Process attendance failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xử lý điểm danh',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get activities from accessible organizations based on permissions
     * Only STAFF/MANAGER with granted permissions can access this
     */
    public function getAccessibleActivities(Request $request): JsonResponse
    {
        Log::info('=== Activity Management: Fetch Accessible Activities ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
        ]);

        try {
            $user = $request->user();

            // Only STAFF, MANAGER, OPERATOR, ADMIN can use this endpoint
            if (! in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền truy cập chức năng này',
                ], 403);
            }

            $accessibleOrgIds = [];
            $canViewAll = false;

            // ADMIN and OPERATOR can view all organizations
            if (in_array($user->role, ['OPERATOR', 'ADMIN'])) {
                $canViewAll = true;
            } else {
                // STAFF and MANAGER need organization and permissions
                if (! $user->organization_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn chưa thuộc đơn vị nào',
                    ], 400);
                }

                // Get accessible organization IDs based on permissions
                $permissions = \App\Models\OrganizationAccessPermission::with('viewScope')
                    ->where('organization_id', $user->organization_id)
                    ->active()
                    ->valid()
                    ->get();

                foreach ($permissions as $permission) {
                    // Check if user's role is allowed
                    if (! $permission->isRoleAllowed($user->role)) {
                        continue;
                    }

                    $scope = $permission->viewScope;

                    if ($scope->name === 'ALL_ORGANIZATIONS') {
                        $canViewAll = true;
                        break; // No need to check other permissions
                    }

                    $orgIds = $permission->getAccessibleOrganizationIds();
                    $accessibleOrgIds = array_merge($accessibleOrgIds, $orgIds);
                }

                // If no permissions found and not view all
                if (! $canViewAll && empty($accessibleOrgIds)) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Bạn chưa được cấp quyền xem hoạt động của phòng ban khác',
                        'data' => [],
                        'pagination' => [
                            'total' => 0,
                            'per_page' => 15,
                            'current_page' => 1,
                            'last_page' => 1,
                            'from' => null,
                            'to' => null,
                        ],
                    ]);
                }

                $accessibleOrgIds = array_unique($accessibleOrgIds);
            }

            // Build query
            $query = Activity::query()
                ->with([
                    'activityType:id,name',
                    'activityField:id,name',
                    'leadOrganization:id,name,short_name,code,avatar',
                    'creator:id,email,first_name,last_name',
                    'collaboratingOrganizations:id,name,short_name',
                ]);

            // Filter by accessible organizations
            if (! $canViewAll) {
                $query->whereIn('lead_organization_id', $accessibleOrgIds);
            }

            // Exclude user's own organization activities (they can see those in their regular view)
            // Only apply if user has an organization (ADMIN/OPERATOR may not have one)
            if ($user->organization_id) {
                $query->where('lead_organization_id', '!=', $user->organization_id);
            }

            // Only show approved/completed activities (not DRAFT, PENDING_APPROVAL, REJECTED)
            $query->whereIn('status', [
                self::STATUS_APPROVED,
                self::STATUS_IN_PROGRESS,
                self::STATUS_COMPLETED,
                self::STATUS_POSTPONED,
                self::STATUS_CANCELLED,
            ]);

            // Filter by organization if provided
            if ($request->has('organization_id') && $request->organization_id) {
                $query->where('lead_organization_id', $request->organization_id);
            }

            // Filter by activity type
            if ($request->has('activity_type_id') && $request->activity_type_id) {
                $query->where('activity_type_id', $request->activity_type_id);
            }

            // Filter by activity field
            if ($request->has('activity_field_id') && $request->activity_field_id) {
                $query->where('activity_field_id', $request->activity_field_id);
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Search by code or title
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%'.$search.'%')
                        ->orWhere('title', 'like', '%'.$search.'%');
                });
            }

            // Filter by date range
            if ($request->has('date_from') && $request->date_from) {
                $query->where('start_date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && $request->date_to) {
                $query->where('end_date', '<=', $request->date_to);
            }

            // Order by start_date desc
            $query->orderBy('start_date', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 15);
            $activities = $query->paginate($perPage);

            // Apply computed status to all activities
            $this->applyComputedStatusToCollection($activities->items());

            Log::info('Accessible activities fetch successful', [
                'total' => $activities->total(),
                'can_view_all' => $canViewAll,
                'accessible_orgs_count' => count($accessibleOrgIds),
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
                'meta' => [
                    'can_view_all' => $canViewAll,
                    'accessible_organizations_count' => $canViewAll ? 'all' : count($accessibleOrgIds),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Accessible activities fetch failed', [
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
     * Get activities where user's organization is a collaborating organization (phối hợp)
     * Returns activities where the user's org is NOT the lead but IS in collaborating_organizations
     */
    public function getCoordinatingActivities(Request $request): JsonResponse
    {
        Log::info('=== Activity Management: Fetch Coordinating Activities ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
        ]);

        try {
            $user = $request->user();

            // User must have an organization
            if (! $user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chưa thuộc đơn vị nào',
                ], 400);
            }

            // Build query for activities where user's org is a collaborating organization
            $query = Activity::query()
                ->with([
                    'activityType:id,name',
                    'activityField:id,name',
                    'leadOrganization:id,name,short_name,code,avatar',
                    'creator:id,email,first_name,last_name',
                    'collaboratingOrganizations:id,name,short_name',
                ])
                ->whereHas('collaboratingOrganizations', function ($q) use ($user) {
                    $q->where('organizations.id', $user->organization_id);
                });

            // Exclude activities where user's org is also the lead (to avoid duplicates)
            $query->where('lead_organization_id', '!=', $user->organization_id);

            // Filter by activity type
            if ($request->has('activity_type_id') && $request->activity_type_id) {
                $query->where('activity_type_id', $request->activity_type_id);
            }

            // Filter by activity field
            if ($request->has('activity_field_id') && $request->activity_field_id) {
                $query->where('activity_field_id', $request->activity_field_id);
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Search by code or title
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%'.$search.'%')
                        ->orWhere('title', 'like', '%'.$search.'%');
                });
            }

            // Filter by date range
            if ($request->has('date_from') && $request->date_from) {
                $query->where('start_date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && $request->date_to) {
                $query->where('end_date', '<=', $request->date_to);
            }

            // Order by start_date desc
            $query->orderBy('start_date', 'desc');

            // Pagination
            $perPage = $request->input('per_page', 15);
            $activities = $query->paginate($perPage);

            // Apply computed status to all activities
            $this->applyComputedStatusToCollection($activities->items());

            Log::info('Coordinating activities fetch successful', [
                'total' => $activities->total(),
                'organization_id' => $user->organization_id,
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
            Log::error('Coordinating activities fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách hoạt động phối hợp',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get report batches for an activity
     * Only lead organization (STAFF/MANAGER) can view this
     */
    public function getActivityReportBatches(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        // Find activity
        $activity = Activity::find($id);
        if (! $activity) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hoạt động',
            ], 404);
        }

        // Check permission: only lead organization can view report batches
        // ADMIN and OPERATOR can also view
        $canView = in_array($user->role, ['ADMIN', 'OPERATOR']) ||
            ($activity->lead_organization_id === $user->organization_id &&
             in_array($user->role, ['STAFF', 'MANAGER']));

        if (! $canView) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem lịch sử đợt báo cáo của hoạt động này',
            ], 403);
        }

        // Get report batches for this activity
        $batches = $activity->reportBatches()
            ->with([
                'organization:id,name,short_name',
                'creator:id,first_name,last_name,email',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Get collaborator responses for this activity in each batch
        $batchesWithResponses = $batches->map(function ($batch) use ($activity) {
            $batchData = $batch->toArray();

            // Get responses for this specific activity in this batch
            $responses = \App\Models\BatchCollaboratorResponse::with([
                'organization:id,name,short_name',
                'submitter:id,first_name,last_name,email',
            ])
                ->where('report_batch_id', $batch->id)
                ->where('activity_id', $activity->id)
                ->get();

            $batchData['responses'] = $responses;
            $batchData['response_count'] = $responses->count();

            // Count required responses (number of collaborating orgs)
            $collaboratingOrgsCount = $activity->collaboratingOrganizations()->count();
            $batchData['required_response_count'] = $collaboratingOrgsCount;

            return $batchData;
        });

        return response()->json([
            'success' => true,
            'data' => $batchesWithResponses,
            'total' => $batchesWithResponses->count(),
        ]);
    }
}
