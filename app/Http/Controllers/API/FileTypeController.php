<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FileType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FileTypeController extends Controller
{
    /**
     * Display a listing of File Types
     * Accessible by: OPERATOR, ADMIN
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('=== File Type Management: Fetch File Types ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'filters' => $request->only(['is_active', 'search', 'per_page', 'page']),
        ]);

        try {
            $query = FileType::query();

            // Search by code or name
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%' . $search . '%')
                      ->orWhere('name', 'like', '%' . $search . '%');
                });
            }

            // Order by name
            $query->orderBy('name', 'asc');

            // Add count of related activity_files
            $query->withCount('activityFiles');

            // Pagination
            $perPage = $request->input('per_page', 50);
            $fileTypes = $query->paginate($perPage);

            Log::info('File Type fetch successful', [
                'total' => $fileTypes->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $fileTypes->items(),
                'pagination' => [
                    'total' => $fileTypes->total(),
                    'per_page' => $fileTypes->perPage(),
                    'current_page' => $fileTypes->currentPage(),
                    'last_page' => $fileTypes->lastPage(),
                    'from' => $fileTypes->firstItem(),
                    'to' => $fileTypes->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('File Type fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách loại tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created File Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('=== File Type Management: Create File Type ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'data' => $request->all(),
        ]);

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:file_types,code',
            'name' => 'required|string|max:100',
        ], [
            'code.required' => 'Mã loại tập tin là bắt buộc',
            'code.unique' => 'Mã loại tập tin đã tồn tại',
            'code.max' => 'Mã loại tập tin không được vượt quá 50 ký tự',
            'name.required' => 'Tên loại tập tin là bắt buộc',
            'name.max' => 'Tên loại tập tin không được vượt quá 100 ký tự',
        ]);

        if ($validator->fails()) {
            Log::warning('File Type creation validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $fileType = FileType::create([
                'code' => strtoupper($request->code),
                'name' => $request->name,
            ]);

            Log::info('File Type created successfully', [
                'file_type_id' => $fileType->id,
                'file_type_code' => $fileType->code,
                'file_type_name' => $fileType->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại tập tin đã được tạo thành công',
                'data' => $fileType,
            ], 201);
        } catch (\Exception $e) {
            Log::error('File Type creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo loại tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified File Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function show(Request $request, string $id): JsonResponse
    {
        Log::info('=== File Type Management: Show File Type ===', [
            'requester_id' => $request->user()->id,
            'file_type_id' => $id,
        ]);

        try {
            $fileType = FileType::withCount('activityFiles')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $fileType,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('File Type not found', ['file_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại tập tin',
            ], 404);
        } catch (\Exception $e) {
            Log::error('File Type fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải loại tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified File Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function update(Request $request, string $id): JsonResponse
    {
        Log::info('=== File Type Management: Update File Type ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'file_type_id' => $id,
            'data' => $request->all(),
        ]);

        try {
            $fileType = FileType::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'code' => 'sometimes|required|string|max:50|unique:file_types,code,' . $id,
                'name' => 'sometimes|required|string|max:100',
            ], [
                'code.required' => 'Mã loại tập tin là bắt buộc',
                'code.unique' => 'Mã loại tập tin đã tồn tại',
                'code.max' => 'Mã loại tập tin không được vượt quá 50 ký tự',
                'name.required' => 'Tên loại tập tin là bắt buộc',
                'name.max' => 'Tên loại tập tin không được vượt quá 100 ký tự',
            ]);

            if ($validator->fails()) {
                Log::warning('File Type update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Prepare update data
            $updateData = $request->only(['name']);

            // Uppercase code if provided
            if ($request->has('code')) {
                $updateData['code'] = strtoupper($request->code);
            }

            $fileType->update($updateData);

            Log::info('File Type updated successfully', [
                'file_type_id' => $fileType->id,
                'file_type_code' => $fileType->code,
                'file_type_name' => $fileType->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại tập tin đã được cập nhật thành công',
                'data' => $fileType,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('File Type not found for update', ['file_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại tập tin',
            ], 404);
        } catch (\Exception $e) {
            Log::error('File Type update failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật loại tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified File Type
     * Accessible by: OPERATOR, ADMIN
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        Log::info('=== File Type Management: Delete File Type ===', [
            'requester_id' => $request->user()->id,
            'requester_role' => $request->user()->role,
            'file_type_id' => $id,
        ]);

        try {
            $fileType = FileType::withCount('activityFiles')->findOrFail($id);

            // Check if File Type is associated with any activity files
            if ($fileType->activity_files_count > 0) {
                Log::warning('Cannot delete File Type with associated activity files', [
                    'file_type_id' => $id,
                    'activity_files_count' => $fileType->activity_files_count,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Không thể xóa loại tập tin vì đang được sử dụng bởi {$fileType->activity_files_count} tập tin hoạt động",
                ], 400);
            }

            $fileTypeName = $fileType->name;
            $fileType->delete();

            Log::info('File Type deleted successfully', [
                'file_type_id' => $id,
                'file_type_name' => $fileTypeName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loại tập tin đã được xóa thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('File Type not found for deletion', ['file_type_id' => $id]);

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy loại tập tin',
            ], 404);
        } catch (\Exception $e) {
            Log::error('File Type deletion failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa loại tập tin',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
