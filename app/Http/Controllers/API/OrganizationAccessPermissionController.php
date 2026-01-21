<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\OrganizationAccessPermission;
use App\Models\OrganizationViewScope;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class OrganizationAccessPermissionController extends Controller
{
    /**
     * Get all permissions (Admin/Operator only).
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            // Only Admin and Operator can view all permissions
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only Admin/Operator can view all permissions.'
                ], 403);
            }

            $query = OrganizationAccessPermission::with([
                'organization',
                'viewScope',
                'targetOrganization'
            ]);

            // Filter by organization if provided
            if ($request->has('organization_id')) {
                $query->where('organization_id', $request->organization_id);
            }

            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by scope if provided
            if ($request->has('view_scope_id')) {
                $query->where('view_scope_id', $request->view_scope_id);
            }

            $permissions = $query->orderBy('created_at', 'desc')->get();

            // Debug: Log permissions without viewScope
            foreach ($permissions as $permission) {
                if (!$permission->viewScope) {
                    Log::warning('Permission without viewScope', [
                        'permission_id' => $permission->id,
                        'view_scope_id' => $permission->view_scope_id,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching permissions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get permissions for current user's organization.
     */
    public function getMyOrganizationPermissions(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to any organization'
                ], 400);
            }

            $permissions = OrganizationAccessPermission::with([
                'organization',
                'viewScope',
                'targetOrganization'
            ])
                ->where('organization_id', $user->organization_id)
                ->active()
                ->valid()
                ->get();

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching organization permissions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get accessible organization IDs for current user.
     */
    public function getAccessibleOrganizations(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user->organization_id) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'own_organization_id' => null,
                        'accessible_organization_ids' => [],
                        'can_view_all' => false
                    ]
                ]);
            }

            // ADMIN và OPERATOR có quyền xem tất cả phòng ban
            if (in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                $allOrgIds = Organization::where('status', 'active')->pluck('id')->toArray();
                return response()->json([
                    'success' => true,
                    'data' => [
                        'own_organization_id' => $user->organization_id,
                        'accessible_organization_ids' => $allOrgIds,
                        'can_view_all' => true,
                        'permissions_count' => 1 // Always has permission for ADMIN/OPERATOR
                    ]
                ]);
            }

            // Only MANAGER and STAFF can use extended permissions from database
            if (!in_array($user->role, ['MANAGER', 'STAFF'])) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'own_organization_id' => $user->organization_id,
                        'accessible_organization_ids' => [$user->organization_id],
                        'can_view_all' => false,
                        'permissions_count' => 0
                    ]
                ]);
            }

            $permissions = OrganizationAccessPermission::with('viewScope')
                ->where('organization_id', $user->organization_id)
                ->active()
                ->valid()
                ->get();

            $accessibleOrgIds = [$user->organization_id]; // Always include own organization
            $canViewAll = false;
            $effectivePermissionsCount = 0; // Count permissions that apply to this user's role

            foreach ($permissions as $permission) {
                // Check if user's role is allowed
                if (!$permission->isRoleAllowed($user->role)) {
                    continue;
                }

                $effectivePermissionsCount++;
                $scope = $permission->viewScope;

                if ($scope && $scope->name === 'ALL_ORGANIZATIONS') {
                    $canViewAll = true;
                    $accessibleOrgIds = Organization::active()->pluck('id')->toArray();
                    break; // No need to check other permissions
                }

                $orgIds = $permission->getAccessibleOrganizationIds();
                $accessibleOrgIds = array_merge($accessibleOrgIds, $orgIds);
            }

            $accessibleOrgIds = array_unique($accessibleOrgIds);

            return response()->json([
                'success' => true,
                'data' => [
                    'own_organization_id' => $user->organization_id,
                    'accessible_organization_ids' => array_values($accessibleOrgIds),
                    'can_view_all' => $canViewAll,
                    'permissions_count' => $effectivePermissionsCount // Only count permissions for user's role
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting accessible organizations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error getting accessible organizations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new permission (Admin/Operator only).
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            // Only Admin and Operator can create permissions
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only Admin/Operator can create permissions.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'organization_id' => 'required|uuid|exists:organizations,id',
                'view_scope_id' => 'required|uuid|exists:organization_view_scopes,id',
                'target_organization_id' => 'nullable|uuid|exists:organizations,id',
                'target_organization_ids' => 'nullable|array',
                'target_organization_ids.*' => 'uuid|exists:organizations,id',
                'allowed_roles' => 'nullable|array',
                'allowed_roles.*' => 'in:MANAGER,STAFF',
                'can_view_details' => 'boolean',
                'can_view_files' => 'boolean',
                'can_export' => 'boolean',
                'can_view_participants' => 'boolean',
                'can_view_budget' => 'boolean',
                'valid_from' => 'nullable|date',
                'valid_until' => 'nullable|date|after:valid_from',
                'reason' => 'nullable|string',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if scope requires specific organization
            $scope = OrganizationViewScope::find($request->view_scope_id);
            $hasTargetOrgs = $request->target_organization_id ||
                ($request->target_organization_ids && count($request->target_organization_ids) > 0);

            if ($scope->requires_specific_orgs && !$hasTargetOrgs) {
                return response()->json([
                    'success' => false,
                    'message' => 'This scope requires at least one target organization'
                ], 422);
            }

            // Check for duplicate permission (same org - only one permission per org)
            $existing = OrganizationAccessPermission::where('organization_id', $request->organization_id)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phòng ban này đã được cấp quyền. Vui lòng chỉnh sửa permission hiện có thay vì tạo mới.'
                ], 422);
            }

            $data = $request->all();
            $data['created_by'] = $user->id;
            $data['status'] = 'active';

            $permission = OrganizationAccessPermission::create($data);

            $permission->load(['organization', 'viewScope', 'targetOrganization']);

            return response()->json([
                'success' => true,
                'message' => 'Permission created successfully',
                'data' => $permission
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating permission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update permission (Admin/Operator only).
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();

            // Only Admin and Operator can update permissions
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only Admin/Operator can update permissions.'
                ], 403);
            }

            $permission = OrganizationAccessPermission::find($id);

            if (!$permission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Permission not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'target_organization_ids' => 'nullable|array',
                'target_organization_ids.*' => 'uuid|exists:organizations,id',
                'allowed_roles' => 'nullable|array',
                'allowed_roles.*' => 'in:MANAGER,STAFF',
                'can_view_details' => 'boolean',
                'can_view_files' => 'boolean',
                'can_export' => 'boolean',
                'can_view_participants' => 'boolean',
                'can_view_budget' => 'boolean',
                'valid_from' => 'nullable|date',
                'valid_until' => 'nullable|date',
                'status' => 'in:active,inactive,expired',
                'reason' => 'nullable|string',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            $data['updated_by'] = $user->id;

            $permission->update($data);

            $permission->load(['organization', 'viewScope', 'targetOrganization']);

            return response()->json([
                'success' => true,
                'message' => 'Permission updated successfully',
                'data' => $permission
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating permission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete permission (Admin/Operator only).
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();

            // Only Admin and Operator can delete permissions
            if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only Admin/Operator can delete permissions.'
                ], 403);
            }

            $permission = OrganizationAccessPermission::find($id);

            if (!$permission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Permission not found'
                ], 404);
            }

            $permission->delete();

            return response()->json([
                'success' => true,
                'message' => 'Permission deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting permission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available view scopes.
     */
    public function getViewScopes(Request $request)
    {
        try {
            $scopes = OrganizationViewScope::active()->get();

            // Log for debugging
            Log::info('View scopes fetched', ['count' => $scopes->count(), 'scopes' => $scopes->pluck('name', 'id')]);

            return response()->json([
                'success' => true,
                'data' => $scopes,
                'debug' => [
                    'total_count' => OrganizationViewScope::count(),
                    'active_count' => $scopes->count(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching view scopes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching view scopes',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
