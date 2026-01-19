<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== User Management: Fetch Users ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['search', 'role', 'status', 'organization_id', 'per_page', 'page']),
        ]);

        try {
            // Permission check handled by middleware
            $query = User::query()->with(['organization:id,name,short_name']);

            // Filter by role
            if ($request->has('role')) {
                $query->where('role', $request->role);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by organization
            if ($request->has('organization_id')) {
                $query->where('organization_id', $request->organization_id);
            }

            // Search by email or name
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 20);
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('Users fetched successfully', [
                'total_users' => $users->total(),
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $users->items(),
                'pagination' => [
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch users', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== User Management: Create User ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'new_user_data' => $request->only(['email', 'first_name', 'last_name', 'role', 'status', 'is_vnuhcm']),
        ]);

        try {
            // Permission check handled by middleware
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:nq57_users,email',
                'first_name' => 'required|string|max:100',
                'last_name' => 'required|string|max:100',
                'phone' => 'nullable|string|max:20',
                'role' => 'required|in:GUEST,STAFF,MANAGER,OPERATOR,ADMIN',
                'status' => 'required|in:active,inactive,locked',
                'is_vnuhcm' => 'boolean',
                'organization_id' => 'nullable|exists:organizations,id',
                'password' => 'nullable|string|min:8',
            ]);

            if ($validator->fails()) {
                Log::warning('User creation validation failed', [
                    'errors' => $validator->errors(),
                    'input' => $request->only(['email', 'first_name', 'last_name', 'role']),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // OPERATOR không được tạo ADMIN hoặc OPERATOR khác
            if ($request->user()->isOperator() && in_array($request->role, ['ADMIN', 'OPERATOR'])) {
                Log::warning('OPERATOR attempted to create ADMIN/OPERATOR user', [
                    'operator_id' => $request->user()->id,
                    'operator_email' => $request->user()->email,
                    'attempted_role' => $request->role,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'OPERATOR cannot create ADMIN or OPERATOR users. Only ADMIN can do this.',
                ], 403);
            }

            $user = User::create([
                'id' => (string) Str::uuid(),
                'email' => $request->email,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'phone' => $request->phone,
                'password_hash' => $request->password ? Hash::make($request->password) : Hash::make(Str::random(32)),
                'role' => $request->role,
                'status' => $request->status,
                'is_vnuhcm' => $request->is_vnuhcm ?? false,
                'organization_id' => $request->organization_id,
                'created_by' => $request->user()->id,
            ]);

            Log::info('User created successfully', [
                'created_user_id' => $user->id,
                'created_user_email' => $user->email,
                'created_user_role' => $user->role,
                'created_by' => $request->user()->email,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => $user,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'input' => $request->only(['email', 'first_name', 'last_name', 'role']),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified user
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== User Management: Show User ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'target_user_id' => $id,
        ]);

        try {
            // Permission check handled by middleware
            $user = User::find($id);

            if (!$user) {
                Log::warning('User not found', [
                    'target_user_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            Log::info('User details fetched successfully', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            return response()->json([
                'success' => true,
                'data' => $user,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch user', [
                'target_user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== User Management: Update User ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'target_user_id' => $id,
            'update_data' => $request->only(['email', 'first_name', 'last_name', 'role', 'status', 'is_vnuhcm']),
        ]);

        try {
            // Permission check handled by middleware
            $user = User::find($id);

            if (!$user) {
                Log::warning('User update failed: User not found', [
                    'target_user_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'email' => 'sometimes|email|unique:nq57_users,email,' . $id . ',id',
                'first_name' => 'sometimes|string|max:100',
                'last_name' => 'sometimes|string|max:100',
                'phone' => 'nullable|string|max:20',
                'role' => 'sometimes|in:GUEST,STAFF,MANAGER,OPERATOR,ADMIN',
                'status' => 'sometimes|in:active,inactive,locked',
                'is_vnuhcm' => 'boolean',
                'organization_id' => 'nullable|exists:organizations,id',
                'password' => 'nullable|string|min:8',
            ]);

            if ($validator->fails()) {
                Log::warning('User update validation failed', [
                    'errors' => $validator->errors(),
                    'target_user_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // OPERATOR restrictions
            if ($request->user()->isOperator()) {
                // OPERATOR cannot edit other OPERATOR or ADMIN users (except themselves)
                if (in_array($user->role, ['ADMIN', 'OPERATOR']) && $user->id !== $request->user()->id) {
                    Log::warning('OPERATOR attempted to edit another ADMIN/OPERATOR user', [
                        'operator_id' => $request->user()->id,
                        'operator_email' => $request->user()->email,
                        'target_user_id' => $id,
                        'target_user_role' => $user->role,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'OPERATOR không được chỉnh sửa thông tin của ADMIN hoặc OPERATOR khác.',
                    ], 403);
                }

                // OPERATOR cannot change their own role
                if ($user->id === $request->user()->id && $request->has('role') && $request->role !== $user->role) {
                    Log::warning('OPERATOR attempted to change their own role', [
                        'operator_id' => $request->user()->id,
                        'attempted_role' => $request->role,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'OPERATOR không được thay đổi vai trò của chính mình.',
                    ], 403);
                }

                // OPERATOR cannot change any user TO ADMIN or OPERATOR role
                if ($request->has('role') && in_array($request->role, ['ADMIN', 'OPERATOR']) && $user->role !== $request->role) {
                    Log::warning('OPERATOR attempted to update user to ADMIN/OPERATOR role', [
                        'operator_id' => $request->user()->id,
                        'operator_email' => $request->user()->email,
                        'target_user_id' => $id,
                        'attempted_role' => $request->role,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'OPERATOR không được gán vai trò ADMIN hoặc OPERATOR. Chỉ ADMIN mới có quyền này.',
                    ], 403);
                }
            }

            $updateData = $request->only([
                'email',
                'first_name',
                'last_name',
                'phone',
                'role',
                'status',
                'is_vnuhcm',
            ]);

            // Handle organization_id separately to allow setting it to null
            // $request->has() returns true even when value is null, which is what we want
            if ($request->has('organization_id')) {
                $updateData['organization_id'] = $request->input('organization_id');
                Log::info('Updating organization_id', [
                    'user_id' => $id,
                    'new_organization_id' => $request->input('organization_id'),
                ]);
            }

            if ($request->has('password') && $request->password) {
                $updateData['password_hash'] = Hash::make($request->password);
            }

            $oldData = $user->only(['email', 'role', 'status']);
            $user->update($updateData);

            Log::info('User updated successfully', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'old_data' => $oldData,
                'new_data' => $user->only(['email', 'role', 'status']),
                'updated_by' => $request->user()->email,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'target_user_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified user
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== User Management: Delete User ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'target_user_id' => $id,
        ]);

        try {
            // Permission check handled by middleware

            // Prevent user from deleting themselves
            if ($request->user()->id === $id) {
                Log::warning('User attempted to delete their own account', [
                    'user_id' => $request->user()->id,
                    'user_email' => $request->user()->email,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account',
                ], 400);
            }

            $user = User::find($id);

            if (!$user) {
                Log::warning('User deletion failed: User not found', [
                    'target_user_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            $deletedUserData = [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
            ];

            $user->delete();

            Log::info('User deleted successfully', [
                'deleted_user' => $deletedUserData,
                'deleted_by' => $request->user()->email,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'target_user_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Impersonate a user (Admin only)
     */
    public function impersonate(Request $request, string $id): JsonResponse
    {
        Log::info('=== User Management: Impersonate User ===', [
            'admin_id' => $request->user()->id,
            'admin_email' => $request->user()->email,
            'target_user_id' => $id,
        ]);

        try {
            // Permission check handled by middleware (role:ADMIN)

            // Cannot impersonate yourself
            if ($request->user()->id === $id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot impersonate yourself',
                ], 400);
            }

            $targetUser = User::find($id);

            if (!$targetUser) {
                Log::warning('Impersonation failed: User not found', [
                    'target_user_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            // Store original admin info in session/token
            $adminUser = $request->user();

            // Create new token for impersonated user
            $newToken = $targetUser->createToken('impersonation', ['*']);
            $token = $newToken->plainTextToken;

            // Store impersonation session in database for security tracking
            \App\Models\ImpersonationSession::create([
                'admin_id' => $adminUser->id,
                'impersonated_user_id' => $targetUser->id,
                'token_id' => $newToken->accessToken->id,
                'started_at' => now(),
            ]);

            Log::info('User impersonation started', [
                'admin_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'impersonated_user_id' => $targetUser->id,
                'impersonated_user_email' => $targetUser->email,
                'token_id' => $newToken->accessToken->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Impersonation started',
                'data' => [
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'user' => $targetUser,
                    'original_admin' => [
                        'id' => $adminUser->id,
                        'email' => $adminUser->email,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to impersonate user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'target_user_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to impersonate user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stop impersonation and return to admin account
     * SECURITY FIX: Now verifies the impersonation session is legitimate
     */
    public function stopImpersonate(Request $request): JsonResponse
    {
        Log::info('=== User Management: Stop Impersonation ===', [
            'current_user_id' => $request->user()->id,
            'current_user_email' => $request->user()->email,
            'current_user_role' => $request->user()->role,
        ]);

        try {
            $currentUser = $request->user();
            $currentTokenId = $request->user()->currentAccessToken()->id;

            // SECURITY: Find the legitimate impersonation session for this token
            $impersonationSession = \App\Models\ImpersonationSession::where('token_id', $currentTokenId)
                ->whereNull('ended_at')
                ->first();

            // Verify this is a legitimate impersonation session
            if (!$impersonationSession) {
                Log::warning('Stop impersonation failed: No active impersonation session found', [
                    'current_user_id' => $currentUser->id,
                    'token_id' => $currentTokenId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No active impersonation session found. You are not currently being impersonated.',
                ], 403);
            }

            // SECURITY: Verify the current user matches the impersonated user in the session
            if ($impersonationSession->impersonated_user_id !== $currentUser->id) {
                Log::error('SECURITY ALERT: Impersonation session mismatch', [
                    'current_user_id' => $currentUser->id,
                    'session_impersonated_user_id' => $impersonationSession->impersonated_user_id,
                    'token_id' => $currentTokenId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Security error: Session mismatch',
                ], 403);
            }

            // Get the original admin from the session
            $adminUser = User::find($impersonationSession->admin_id);

            if (!$adminUser || !$adminUser->isAdmin()) {
                Log::error('Stop impersonation failed: Original admin not found', [
                    'admin_id' => $impersonationSession->admin_id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Original admin not found',
                ], 404);
            }

            // Mark the impersonation session as ended
            $impersonationSession->end();

            // Revoke current impersonation token
            $request->user()->currentAccessToken()->delete();

            // Create new token for admin
            $token = $adminUser->createToken('admin-session', ['*'])->plainTextToken;

            Log::info('User impersonation stopped successfully', [
                'impersonated_user_id' => $currentUser->id,
                'impersonated_user_email' => $currentUser->email,
                'admin_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'session_id' => $impersonationSession->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Impersonation stopped',
                'data' => [
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'user' => $adminUser,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to stop impersonation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to stop impersonation',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
