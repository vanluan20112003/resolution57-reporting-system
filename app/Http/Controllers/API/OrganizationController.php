<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class OrganizationController extends Controller
{
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
                $search = $request->input('search');
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
            $perPage = $request->get('per_page', 20);
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    function show(Request $request, $id){
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    function store(Request $request){
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    function update(Request $request, $id){
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
        }
        catch (\Exception $e) {
            Log::error('Failed to update organization', [
                'organization_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update organization',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    function destroy(Request $request, $id){
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
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
