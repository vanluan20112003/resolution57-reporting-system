<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get current user's profile
     * SECURITY: User can only view their own profile
     */
    public function show(Request $request): JsonResponse
    {
        try {
            // Get authenticated user from token
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Load organization relationship
            $userData = $user->toArray();
            if ($user->organization_id) {
                $organization = \App\Models\Organization::find($user->organization_id);
                $userData['organization'] = $organization ? [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'short_name' => $organization->short_name,
                    'code' => $organization->code,
                    'avatar' => $organization->avatar,
                    'avatar_url' => $organization->avatar ? url('storage/' . $organization->avatar) : null,
                ] : null;
            }

            Log::info('Profile viewed', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            return response()->json([
                'success' => true,
                'data' => $userData,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch profile', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update current user's profile
     * SECURITY: User can only update their own profile and only allowed fields
     */
    public function update(Request $request): JsonResponse
    {
        try {
            // Get authenticated user from token
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            Log::info('Profile update attempt', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'update_fields' => array_keys($request->all()),
            ]);

            // Validation - only allow safe fields to be updated
            $validator = Validator::make($request->all(), [
                'first_name' => 'sometimes|required|string|max:100',
                'last_name' => 'sometimes|required|string|max:100',
                'phone' => 'nullable|string|max:20',
            ]);

            if ($validator->fails()) {
                Log::warning('Profile update validation failed', [
                    'user_id' => $user->id,
                    'errors' => $validator->errors(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // SECURITY: Only allow updating safe fields
            // Do NOT allow updating: email, role, organization_id, manager_id, google_id, status, employee_id
            $allowedFields = ['first_name', 'last_name', 'phone'];
            $updateData = $request->only($allowedFields);

            if (empty($updateData)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid fields to update',
                ], 400);
            }

            $oldData = $user->only($allowedFields);
            $user->update($updateData);

            Log::info('Profile updated successfully', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'old_data' => $oldData,
                'new_data' => $user->only($allowedFields),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => $user->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update profile', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload user avatar
     * SECURITY: User can only upload their own avatar
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        try {
            // Get authenticated user from token
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            Log::info('Avatar upload attempt', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            // Validate uploaded file
            $validator = Validator::make($request->all(), [
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Max 2MB
            ]);

            if ($validator->fails()) {
                Log::warning('Avatar upload validation failed', [
                    'user_id' => $user->id,
                    'errors' => $validator->errors(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Delete old avatar if exists
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
                Log::info('Old avatar deleted', [
                    'user_id' => $user->id,
                    'old_avatar' => $user->avatar,
                ]);
            }

            // Store new avatar in storage/app/public/avatars/
            $file = $request->file('avatar');
            $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('avatars', $filename, 'public');

            // Update user avatar path
            $user->update([
                'avatar' => $path,
            ]);

            // Generate public URL
            $avatarUrl = url('storage/' . $path);

            Log::info('Avatar uploaded successfully', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'avatar_path' => $path,
                'avatar_url' => $avatarUrl,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar uploaded successfully',
                'data' => [
                    'avatar' => $path,
                    'avatar_url' => $avatarUrl,
                    'user' => $user->fresh(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to upload avatar', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete user avatar
     * SECURITY: User can only delete their own avatar
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        try {
            // Get authenticated user from token
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            Log::info('Avatar deletion attempt', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            if (!$user->avatar) {
                return response()->json([
                    'success' => false,
                    'message' => 'No avatar to delete',
                ], 400);
            }

            // Delete avatar file
            if (Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Update user record
            $oldAvatar = $user->avatar;
            $user->update([
                'avatar' => null,
            ]);

            Log::info('Avatar deleted successfully', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'deleted_avatar' => $oldAvatar,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar deleted successfully',
                'data' => $user->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete avatar', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete avatar',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
