<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class OrganizationController extends Controller
{
    /**
     * Validate parent_id to prevent circular reference
     */
    private function validateParentId($parentId, $currentId = null)
    {
        if (!$parentId) {
            return true;
        }

        // Cannot be parent of itself
        if ($currentId && $parentId === $currentId) {
            return false;
        }

        // Check for circular reference
        $checkId = $parentId;
        $visited = [];

        while ($checkId) {
            if (in_array($checkId, $visited)) {
                return false; // Circular reference detected
            }
            $visited[] = $checkId;

            $parent = Organization::find($checkId);
            if (!$parent) {
                return false; // Parent not found
            }

            if ($currentId && $parent->parent_id === $currentId) {
                return false; // Would create circular reference
            }

            $checkId = $parent->parent_id;
        }

        return true;
    }

    /**
     * Get simple list of organizations for all authenticated users (for filters/dropdowns)
     * Only returns id, name, short_name - no permission required
     */
    public function listSimple(Request $request)
    {
        try {
            $organizations = Organization::select('id', 'name', 'short_name', 'code')
                ->where('status', 'active')
                ->orderBy('display_order')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $organizations,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch simple organizations list', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch organizations',
            ], 500);
        }
    }

    function index(Request $request){
        Log::info('=== Organization Management: Fetch Organizations ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['search', 'type', 'status', 'is_vnuhcm', 'per_page', 'page']),
        ]);

        try{
            $query = Organization::query();
            if($request->filled('search')){
                $search = trim($request->input('search'));
                // Sanitize search input to prevent SQL injection
                $search = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $query->where(function($q) use ($search){
                    $q->where('name','like',"%{$search}%")
                      ->orWhere('code','like',"%{$search}%")
                      ->orWhere('short_name','like',"%{$search}%");
                });
            }
            if($request->has('type')){
                $query->where('type',$request->input('type'));
            }
            if($request->has('status')){
                $query->where('status',$request->input('status'));
            }
            if($request->has('is_vnuhcm')){
                $isVnuhcm = filter_var($request->input('is_vnuhcm'), FILTER_VALIDATE_BOOLEAN);
                $query->where('is_vnuhcm', $isVnuhcm);
            }
            $perPage = min($request->get('per_page', 20), 100); // Limit max to 100
            $organizations = $query->orderBy("display_order")->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('Organizations fetched successfully', [
                'total_users' => $organizations->total(),
                'current_page' => $organizations->currentPage(),
                'per_page' => $organizations->perPage()
            ]);
        
            return response()->json([
                'success' => true,
                'data' => $organizations->items(),
                'pagination' => [
                    'total' => $organizations->total(),
                    'per_page' => $organizations->perPage(),
                    'current_page' => $organizations->currentPage(),
                    'last_page' => $organizations->lastPage()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch organizations', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch organizations',
            ], 500);
        }
    }

    public function show(Request $request, $id){
        Log::info('=== Organization Management: Fetch Organization Details ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'organization_id' => $id,
        ]);

        try{
            $organization = Organization::find($id);

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            Log::info('Organization details fetched successfully', [
                'organization_id' => $organization->id,
                'organization_code' => $organization->code,
            ]);

            return response()->json([
                'success' => true,
                'data' => $organization,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch organization details', [
                'organization_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch organization details',
            ], 500);
        }
    }

    public function store(Request $request){
        Log::info('=== Organization Management: Create Organization ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'input_data' => $request->only(["code", "name", "short_name", "type"]),
        ]);

        try{
            $validator = Validator::make($request->all(),[
              'code' => 'required|string|max:50|unique:organizations,code',
              'name' => 'required|string|max:255',
              'short_name' => 'nullable|string|max:100',
              'type' => 'required|string|in:UNIVERSITY_SYSTEM,UNIVERSITY,RESEARCH_INSTITUTE,CENTER,DEPARTMENT,EXTERNAL',
              'parent_id' => 'nullable|uuid|exists:organizations,id',
              'is_vnuhcm' => 'boolean',
              'contact_phone' => 'nullable|string|max:20',
              'address' => 'nullable|string',
              'website' => 'nullable|url|max:500',
              'description' => 'nullable|string',
              'status' => 'string|in:active,inactive',
              'display_order' => 'integer',
              'contact_email' => 'nullable|email|max:255',
            ]);

            if ($validator->fails()) {
                Log::warning('Organization creation validation failed', [
                    'errors' => $validator->errors(),
                    'input' => $request->only(["code", "name", "short_name", "type"]),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Validate parent_id to prevent circular reference
            $parentId = $request->input('parent_id');
            if ($parentId && !$this->validateParentId($parentId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid parent organization',
                    'errors' => ['parent_id' => ['Parent organization is invalid or would create circular reference']],
                ], 422);
            }

            $organization = Organization::create(array_merge($validator->validated(), [
                'created_by' => $request->user()->id,
            ]));

            Log::info('Organization created successfully', [
                'organization_id' => $organization->id,
                'organization_code' => $organization->code,
            ]);

            return response()->json([
                'success' => true,
                'data' => $organization,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create organization', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create organization',
            ], 500);
        }
    }

    public function update(Request $request, $id){
        Log::info('=== Organization Management: Update Organization ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'organization_id' => $id,
            'input_data' => $request->only(["code", "name", "short_name", "type"]),
        ]);

        try{
            $organization = Organization::find($id);
            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            $validator = Validator::make($request->all(),[
                'name' => 'required|string|max:255',
                'short_name' => 'nullable|string|max:100',
                'type' => 'required|string|in:UNIVERSITY_SYSTEM,UNIVERSITY,RESEARCH_INSTITUTE,CENTER,DEPARTMENT,EXTERNAL',
                'parent_id' => 'nullable|uuid|exists:organizations,id',
                'is_vnuhcm' => 'boolean',
                'contact_phone' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'website' => 'nullable|url|max:500',
                'description' => 'nullable|string',
                'status' => 'string|in:active,inactive',
                'display_order' => 'integer',
                'contact_email' => 'nullable|email|max:255',
                'code' => 'required|string|max:50|unique:organizations,code,'.$id,
            ]);

            if ($validator->fails()) {
                Log::warning('Organization update validation failed', [
                    'organization_id' => $id,
                    'errors' => $validator->errors(),
                    'input' => $request->all(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Validate parent_id to prevent circular reference
            $parentId = $request->input('parent_id');
            if ($parentId && !$this->validateParentId($parentId, $id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid parent organization',
                    'errors' => ['parent_id' => ['Cannot set parent to itself or create circular reference']],
                ], 422);
            }

            $oldData = $organization->toArray();
            $organization->update($validator->validated());

            Log::info('Organization updated successfully', [
                'organization_id' => $organization->id,
                'organization_code' => $organization->code,
                'old_data' => $oldData,
                'new_data' => $organization->toArray(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $organization,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update organization', [
                'organization_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update organization',
            ], 500);
        }
    }

    public function destroy(Request $request, $id){
        Log::info('=== Organization Management: Delete Organization ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'organization_id' => $id,
        ]);

        try{
            $organization = Organization::find($id);
            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            // Check for child organizations
            $childCount = Organization::where('parent_id', $id)->count();
            if ($childCount > 0) {
                Log::warning('Cannot delete organization with children', [
                    'organization_id' => $id,
                    'child_count' => $childCount,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete organization. It has {$childCount} child organization(s). Please reassign or delete them first.",
                ], 422);
            }

            // Soft delete by setting status to inactive
            $organization->update(['status' => 'inactive']);

            Log::info('Organization deleted successfully', [
                'organization_id' => $id,
                'organization_code' => $organization->code,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Organization deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete organization', [
                'organization_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete organization',
            ], 500);
        }
    }

    /**
     * Get organization profile for STAFF/MANAGER
     * User can only view their own organization
     */
    public function getMyOrganization(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $organization = Organization::find($user->organization_id);

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            // Add avatar URL if exists
            $orgData = $organization->toArray();
            if ($organization->avatar) {
                $orgData['avatar_url'] = url('storage/' . $organization->avatar);
            }
            if ($organization->cover_image) {
                $orgData['cover_image_url'] = url('storage/' . $organization->cover_image);
            }

            Log::info('My organization profile viewed', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $orgData,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch my organization', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch organization',
            ], 500);
        }
    }

    /**
     * Update organization profile for STAFF/MANAGER
     * Only STAFF and MANAGER of the organization can update
     */
    public function updateMyOrganization(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has permission (STAFF or MANAGER)
            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to update organization',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $organization = Organization::find($user->organization_id);

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            Log::info('My organization update attempt', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'organization_id' => $organization->id,
            ]);

            // STAFF/MANAGER can only update basic info, not code, type, status, parent_id
            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'short_name' => 'nullable|string|max:100',
                'contact_email' => 'nullable|email|max:255',
                'contact_phone' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'website' => 'nullable|url|max:500',
                'description' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $oldData = $organization->only(['name', 'short_name', 'contact_email', 'contact_phone', 'address', 'website', 'description']);
            $organization->update($validator->validated());

            // Add avatar URL if exists
            $orgData = $organization->fresh()->toArray();
            if ($organization->avatar) {
                $orgData['avatar_url'] = url('storage/' . $organization->avatar);
            }
            if ($organization->cover_image) {
                $orgData['cover_image_url'] = url('storage/' . $organization->cover_image);
            }

            Log::info('My organization updated successfully', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
                'old_data' => $oldData,
                'new_data' => $validator->validated(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Organization updated successfully',
                'data' => $orgData,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update my organization', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update organization',
            ], 500);
        }
    }

    /**
     * Upload organization avatar
     * Only STAFF and MANAGER of the organization can upload
     */
    public function uploadAvatar(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has permission
            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to upload avatar',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $organization = Organization::find($user->organization_id);

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            Log::info('Organization avatar upload attempt', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ]);

            // Validate uploaded file
            $validator = Validator::make($request->all(), [
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Max 5MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Delete old avatar if exists
            if ($organization->avatar && Storage::disk('public')->exists($organization->avatar)) {
                Storage::disk('public')->delete($organization->avatar);
                Log::info('Old organization avatar deleted', [
                    'organization_id' => $organization->id,
                    'old_avatar' => $organization->avatar,
                ]);
            }

            // Store new avatar in storage/app/public/organizations/{org_id}/
            $file = $request->file('avatar');
            $filename = 'avatar_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('organizations/' . $organization->id, $filename, 'public');

            // Update organization avatar path
            $organization->update([
                'avatar' => $path,
            ]);

            // Generate public URL
            $avatarUrl = url('storage/' . $path);

            Log::info('Organization avatar uploaded successfully', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
                'avatar_path' => $path,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar uploaded successfully',
                'data' => [
                    'avatar' => $path,
                    'avatar_url' => $avatarUrl,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to upload organization avatar', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar',
            ], 500);
        }
    }

    /**
     * Upload organization cover image
     * Only STAFF and MANAGER of the organization can upload
     */
    public function uploadCoverImage(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has permission
            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to upload cover image',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $organization = Organization::find($user->organization_id);

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            Log::info('Organization cover image upload attempt', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ]);

            // Validate uploaded file
            $validator = Validator::make($request->all(), [
                'cover_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // Max 10MB for cover
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Delete old cover if exists
            if ($organization->cover_image && Storage::disk('public')->exists($organization->cover_image)) {
                Storage::disk('public')->delete($organization->cover_image);
            }

            // Store new cover image
            $file = $request->file('cover_image');
            $filename = 'cover_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('organizations/' . $organization->id, $filename, 'public');

            // Update organization cover_image path
            $organization->update([
                'cover_image' => $path,
            ]);

            // Generate public URL
            $coverUrl = url('storage/' . $path);

            Log::info('Organization cover image uploaded successfully', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
                'cover_path' => $path,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cover image uploaded successfully',
                'data' => [
                    'cover_image' => $path,
                    'cover_image_url' => $coverUrl,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to upload organization cover image', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload cover image',
            ], 500);
        }
    }

    /**
     * Get members of current user's organization
     * Only STAFF, MANAGER, OPERATOR, ADMIN can view
     */
    public function getMyOrganizationMembers(Request $request)
    {
        try {
            $user = $request->user();

            // All users with organization can view members (including GUEST)
            // No role restriction needed here

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $query = User::where('organization_id', $user->organization_id);

            // Search filter
            if ($request->filled('search')) {
                $search = trim($request->input('search'));
                $search = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $query->where(function($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                      ->orWhere('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            // Role filter
            if ($request->filled('role')) {
                $query->where('role', $request->input('role'));
            }

            // Status filter
            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $perPage = min($request->get('per_page', 20), 100);
            $members = $query->orderBy('role', 'asc')
                           ->orderBy('first_name', 'asc')
                           ->paginate($perPage);

            Log::info('Organization members fetched', [
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'total_members' => $members->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $members->items(),
                'pagination' => [
                    'total' => $members->total(),
                    'per_page' => $members->perPage(),
                    'current_page' => $members->currentPage(),
                    'last_page' => $members->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch organization members', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch members',
            ], 500);
        }
    }

    /**
     * Update member role (Manager can promote GUEST to STAFF or demote STAFF to GUEST)
     */
    public function updateMemberRole(Request $request, $memberId)
    {
        try {
            $user = $request->user();

            // Check if user has permission (MANAGER, OPERATOR, ADMIN)
            if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to change member roles',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            // Find the member
            $member = User::where('id', $memberId)
                         ->where('organization_id', $user->organization_id)
                         ->first();

            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'Member not found in your organization',
                ], 404);
            }

            // Validate new role
            $validator = Validator::make($request->all(), [
                'role' => 'required|string|in:GUEST,STAFF',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $newRole = $request->input('role');

            // MANAGER can only change between GUEST and STAFF
            if ($user->role === 'MANAGER') {
                if (!in_array($member->role, ['GUEST', 'STAFF'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You can only change roles between GUEST and STAFF',
                    ], 403);
                }
            }

            // Cannot change own role
            if ($member->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot change your own role',
                ], 403);
            }

            $oldRole = $member->role;
            $member->update(['role' => $newRole]);

            Log::info('Member role updated', [
                'updater_id' => $user->id,
                'member_id' => $member->id,
                'old_role' => $oldRole,
                'new_role' => $newRole,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Member role updated successfully',
                'data' => $member->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update member role', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update member role',
            ], 500);
        }
    }

    /**
     * Add a single member to organization by email
     * Only STAFF, MANAGER can add (user must not have org and not be ADMIN/OPERATOR)
     */
    public function addMember(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has permission (STAFF, MANAGER, OPERATOR, ADMIN)
            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền thêm thành viên',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chưa được gán vào đơn vị nào',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $email = strtolower(trim($request->input('email')));

            // Find the user by email
            $targetUser = User::where('email', $email)->first();

            if (!$targetUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy người dùng với email: ' . $email,
                ], 404);
            }

            // Check if user is ADMIN or OPERATOR
            if (in_array($targetUser->role, ['ADMIN', 'OPERATOR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể thêm người dùng có vai trò ADMIN hoặc OPERATOR vào đơn vị',
                ], 422);
            }

            // Check if user already has an organization
            if ($targetUser->organization_id) {
                if ($targetUser->organization_id === $user->organization_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Người dùng đã là thành viên của đơn vị này',
                    ], 422);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Người dùng đã thuộc về một đơn vị khác',
                ], 422);
            }

            // Add user to organization with GUEST role
            $targetUser->update([
                'organization_id' => $user->organization_id,
                'role' => 'GUEST',
            ]);

            Log::info('Member added to organization', [
                'added_by' => $user->id,
                'member_id' => $targetUser->id,
                'member_email' => $targetUser->email,
                'organization_id' => $user->organization_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã thêm thành viên thành công',
                'data' => $targetUser->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to add member', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi thêm thành viên',
            ], 500);
        }
    }

    /**
     * Import members from Excel file
     * Only STAFF, MANAGER can import
     */
    public function importMembers(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has permission
            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền import thành viên',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chưa được gán vào đơn vị nào',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:xlsx,xls|max:10240', // Max 10MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $file = $request->file('file');

            // Use PhpSpreadsheet to read Excel
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Skip header row
            $header = array_shift($rows);

            // Find email column (case-insensitive)
            $emailColumnIndex = null;
            foreach ($header as $index => $columnName) {
                if (strtolower(trim($columnName ?? '')) === 'email') {
                    $emailColumnIndex = $index;
                    break;
                }
            }

            if ($emailColumnIndex === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy cột "email" trong file Excel',
                ], 422);
            }

            $results = [
                'total' => 0,
                'success' => 0,
                'skipped' => 0,
                'failed' => 0,
                'created' => [],
                'duplicates' => [],
                'errors' => [],
            ];

            foreach ($rows as $rowIndex => $row) {
                $rowNumber = $rowIndex + 2; // +2 because we skipped header and array is 0-indexed
                $email = isset($row[$emailColumnIndex]) ? strtolower(trim($row[$emailColumnIndex])) : null;

                if (empty($email)) {
                    continue; // Skip empty rows
                }

                $results['total']++;

                // Validate email format
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'message' => "Email không hợp lệ: {$email}",
                        'data' => ['email' => $email],
                    ];
                    continue;
                }

                // Find the user by email
                $targetUser = User::where('email', $email)->first();

                if (!$targetUser) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'message' => "Không tìm thấy người dùng với email: {$email}",
                        'data' => ['email' => $email],
                    ];
                    continue;
                }

                // Check if user is ADMIN or OPERATOR
                if (in_array($targetUser->role, ['ADMIN', 'OPERATOR'])) {
                    $results['skipped']++;
                    $results['duplicates'][] = [
                        'row' => $rowNumber,
                        'message' => 'Không thể thêm ADMIN/OPERATOR vào đơn vị',
                        'data' => ['email' => $email],
                    ];
                    continue;
                }

                // Check if user already has an organization
                if ($targetUser->organization_id) {
                    $results['skipped']++;
                    $results['duplicates'][] = [
                        'row' => $rowNumber,
                        'message' => $targetUser->organization_id === $user->organization_id
                            ? 'Đã là thành viên của đơn vị'
                            : 'Đã thuộc về đơn vị khác',
                        'data' => ['email' => $email],
                    ];
                    continue;
                }

                // Add user to organization with GUEST role
                $targetUser->update([
                    'organization_id' => $user->organization_id,
                    'role' => 'GUEST',
                ]);

                $results['success']++;
                $results['created'][] = [
                    'row' => $rowNumber,
                    'data' => [
                        'email' => $email,
                        'name' => $targetUser->first_name . ' ' . $targetUser->last_name,
                    ],
                ];
            }

            Log::info('Members imported to organization', [
                'imported_by' => $user->id,
                'organization_id' => $user->organization_id,
                'results' => [
                    'total' => $results['total'],
                    'success' => $results['success'],
                    'skipped' => $results['skipped'],
                    'failed' => $results['failed'],
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => "Đã import {$results['success']}/{$results['total']} thành viên",
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to import members', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi import: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get template info for member import
     */
    public function getMemberImportTemplateInfo()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'type' => 'organization_members',
                'name' => 'Thành viên đơn vị',
                'description' => 'Import thành viên vào đơn vị từ file Excel',
                'columns' => [
                    [
                        'name' => 'email',
                        'label' => 'Email',
                        'required' => true,
                        'description' => 'Email của người dùng đã có trong hệ thống',
                        'example' => 'nguyen.van.a@hcmus.edu.vn',
                    ],
                ],
                'unique_fields' => ['email'],
                'notes' => [
                    'Người dùng phải đã tồn tại trong hệ thống',
                    'Người dùng chưa thuộc về đơn vị nào',
                    'Không thể thêm ADMIN hoặc OPERATOR',
                    'Thành viên mới sẽ có vai trò mặc định là "Thành viên" (GUEST)',
                ],
            ],
        ]);
    }

    /**
     * Download template for member import
     */
    public function downloadMemberImportTemplate()
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $sheet->setCellValue('A1', 'email');

        // Add example data
        $sheet->setCellValue('A2', 'nguyen.van.a@hcmus.edu.vn');
        $sheet->setCellValue('A3', 'tran.thi.b@hcmus.edu.vn');

        // Style header
        $sheet->getStyle('A1')->getFont()->setBold(true);
        $sheet->getStyle('A1')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setRGB('4472C4');
        $sheet->getStyle('A1')->getFont()->getColor()->setRGB('FFFFFF');

        // Auto-size column
        $sheet->getColumnDimension('A')->setAutoSize(true);

        // Create response
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);

        $filename = 'template_import_members.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Remove a member from organization
     */
    public function removeMember(Request $request, $memberId)
    {
        try {
            $user = $request->user();

            // Check if user has permission (MANAGER, OPERATOR, ADMIN)
            if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xóa thành viên',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chưa được gán vào đơn vị nào',
                ], 404);
            }

            // Find the member
            $member = User::where('id', $memberId)
                         ->where('organization_id', $user->organization_id)
                         ->first();

            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thành viên trong đơn vị của bạn',
                ], 404);
            }

            // Cannot remove self
            if ($member->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không thể xóa chính mình khỏi đơn vị',
                ], 403);
            }

            // Cannot remove MANAGER (only OPERATOR/ADMIN can)
            if ($member->role === 'MANAGER' && $user->role === 'MANAGER') {
                return response()->json([
                    'success' => false,
                    'message' => 'Quản lý không thể xóa Quản lý khác',
                ], 403);
            }

            // Remove from organization
            $member->update([
                'organization_id' => null,
                'role' => 'GUEST', // Reset to GUEST when removed
            ]);

            Log::info('Member removed from organization', [
                'removed_by' => $user->id,
                'member_id' => $member->id,
                'member_email' => $member->email,
                'organization_id' => $user->organization_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa thành viên khỏi đơn vị',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to remove member', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa thành viên',
            ], 500);
        }
    }

    /**
     * Delete organization avatar
     */
    public function deleteAvatar(Request $request)
    {
        try {
            $user = $request->user();

            if (!in_array($user->role, ['STAFF', 'MANAGER', 'OPERATOR', 'ADMIN'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission',
                ], 403);
            }

            if (!$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not assigned to any organization',
                ], 404);
            }

            $organization = Organization::find($user->organization_id);

            if (!$organization || !$organization->avatar) {
                return response()->json([
                    'success' => false,
                    'message' => 'No avatar to delete',
                ], 400);
            }

            // Delete avatar file
            if (Storage::disk('public')->exists($organization->avatar)) {
                Storage::disk('public')->delete($organization->avatar);
            }

            $organization->update(['avatar' => null]);

            Log::info('Organization avatar deleted', [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete organization avatar', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete avatar',
            ], 500);
        }
    }
}
