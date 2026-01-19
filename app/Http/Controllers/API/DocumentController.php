<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    /**
     * Get list of documents
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $perPage = $request->get('per_page', 20);

            $query = Document::with(['uploader:id,first_name,last_name,email', 'organization:id,name,short_name'])
                ->active()
                ->accessibleBy($user);

            // Filter by category
            if ($request->has('category') && $request->category) {
                $query->where('category', $request->category);
            }

            // Filter by visibility
            if ($request->has('visibility') && $request->visibility) {
                $query->where('visibility', $request->visibility);
            }

            // Filter by organization
            if ($request->has('organization_id') && $request->organization_id) {
                $query->where('organization_id', $request->organization_id);
            }

            // Filter by file type
            if ($request->has('file_type') && $request->file_type) {
                $query->where('file_type', 'like', $request->file_type . '%');
            }

            // Filter by uploader
            if ($request->has('uploaded_by') && $request->uploaded_by) {
                $query->where('uploaded_by', $request->uploaded_by);
            }

            // Search by title or description
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('file_name', 'like', "%{$search}%");
                });
            }

            // Filter by tags
            if ($request->has('tags') && $request->tags) {
                $tags = is_array($request->tags) ? $request->tags : explode(',', $request->tags);
                $query->where(function ($q) use ($tags) {
                    foreach ($tags as $tag) {
                        $q->orWhereJsonContains('tags', trim($tag));
                    }
                });
            }

            // Order
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $documents = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $documents->items(),
                'pagination' => [
                    'total' => $documents->total(),
                    'per_page' => $documents->perPage(),
                    'current_page' => $documents->currentPage(),
                    'last_page' => $documents->lastPage(),
                    'from' => $documents->firstItem(),
                    'to' => $documents->lastItem(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single document
     */
    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();

            $document = Document::with(['uploader:id,first_name,last_name,email', 'organization:id,name,short_name'])
                ->where('id', $id)
                ->first();

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài liệu không tồn tại'
                ], 404);
            }

            if (!$document->canBeViewedBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xem tài liệu này'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $document
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải thông tin tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload a new document
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            // Check permission - ADMIN, OPERATOR, STAFF, MANAGER can upload
            if (!in_array($user->role, ['ADMIN', 'OPERATOR', 'STAFF', 'MANAGER'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền upload tài liệu'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:51200', // Max 50MB
                'title' => 'required|string|max:500',
                'description' => 'nullable|string',
                'category' => 'nullable|string|max:255',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:100',
                'organization_id' => 'nullable|uuid|exists:organizations,id',
                'visibility' => 'nullable|in:PUBLIC,ORGANIZATION,PRIVATE',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $fileSize = $file->getSize();

            // Generate unique file name
            $fileName = Str::uuid() . '.' . $extension;

            // Store file in documents folder
            $filePath = $file->storeAs('documents', $fileName, 'public');

            // Determine organization_id
            $organizationId = $request->organization_id;
            $visibility = $request->visibility ?? Document::VISIBILITY_PUBLIC;

            // If visibility is ORGANIZATION but no org specified, use user's org
            if ($visibility === Document::VISIBILITY_ORGANIZATION && !$organizationId) {
                $organizationId = $user->organization_id;
            }

            $document = Document::create([
                'title' => $request->title,
                'description' => $request->description,
                'file_path' => $filePath,
                'file_name' => $originalName,
                'file_type' => $mimeType,
                'file_size' => $fileSize,
                'category' => $request->category,
                'tags' => $request->tags,
                'organization_id' => $organizationId,
                'visibility' => $visibility,
                'uploaded_by' => $user->id,
                'is_active' => true,
            ]);

            $document->load(['uploader:id,first_name,last_name,email', 'organization:id,name,short_name']);

            return response()->json([
                'success' => true,
                'message' => 'Upload tài liệu thành công',
                'data' => $document
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error uploading document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi upload tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update document metadata
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();

            $document = Document::find($id);

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài liệu không tồn tại'
                ], 404);
            }

            // Only uploader or admin can update
            if ($user->id !== $document->uploaded_by && $user->role !== 'ADMIN') {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền cập nhật tài liệu này'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:500',
                'description' => 'nullable|string',
                'category' => 'nullable|string|max:255',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:100',
                'organization_id' => 'nullable|uuid|exists:organizations,id',
                'visibility' => 'nullable|in:PUBLIC,ORGANIZATION,PRIVATE',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $document->update($request->only([
                'title',
                'description',
                'category',
                'tags',
                'organization_id',
                'visibility',
                'is_active',
            ]));

            $document->load(['uploader:id,first_name,last_name,email', 'organization:id,name,short_name']);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật tài liệu thành công',
                'data' => $document
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a document
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();

            $document = Document::find($id);

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài liệu không tồn tại'
                ], 404);
            }

            if (!$document->canBeDeletedBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xóa tài liệu này'
                ], 403);
            }

            // Delete file from storage
            if (Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }

            // Soft delete the document
            $document->delete();

            return response()->json([
                'success' => true,
                'message' => 'Xóa tài liệu thành công'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download a document
     */
    public function download(Request $request, $id)
    {
        try {
            $user = $request->user();

            $document = Document::find($id);

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài liệu không tồn tại'
                ], 404);
            }

            if (!$document->canBeViewedBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền tải tài liệu này'
                ], 403);
            }

            $filePath = Storage::disk('public')->path($document->file_path);

            if (!file_exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File không tồn tại trên server'
                ], 404);
            }

            return response()->download($filePath, $document->file_name, [
                'Content-Type' => $document->file_type,
            ]);
        } catch (\Exception $e) {
            Log::error('Error downloading document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải tài liệu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get list of categories
     */
    public function categories(Request $request)
    {
        try {
            $user = $request->user();

            $categories = Document::active()
                ->accessibleBy($user)
                ->whereNotNull('category')
                ->distinct()
                ->pluck('category')
                ->filter()
                ->values();

            return response()->json([
                'success' => true,
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document categories: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách danh mục',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all tags used
     */
    public function tags(Request $request)
    {
        try {
            $user = $request->user();

            $documents = Document::active()
                ->accessibleBy($user)
                ->whereNotNull('tags')
                ->pluck('tags');

            $allTags = [];
            foreach ($documents as $tags) {
                if (is_array($tags)) {
                    $allTags = array_merge($allTags, $tags);
                }
            }

            $uniqueTags = array_values(array_unique($allTags));
            sort($uniqueTags);

            return response()->json([
                'success' => true,
                'data' => $uniqueTags
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document tags: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách tags',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
