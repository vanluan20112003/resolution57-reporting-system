<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Organization;
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
