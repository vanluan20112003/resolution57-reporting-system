<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

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
}
