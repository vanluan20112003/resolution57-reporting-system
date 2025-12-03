<?php

namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller {
  function show(Request $request){
    Log::info('=== Notification Management: Fetch Notifications ===', [
        'requester_id' => $request->user()->id,
        'requester_email' => $request->user()->email,
        'requester_role' => $request->user()->role,
        'filters' => $request->only(['category', 'is_read']),
    ]);

    try {
        $query = Notification::where('user_id', $request->user()->id);

        // filter category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // filter is_read với boolean convert
        if ($request->filled('is_read')) {
            $isRead = filter_var($request->is_read, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_read', $isRead);
        }

        $notifications = $query->with("actor:id,first_name,last_name,avatar,avatar_url")->orderBy('created_at', 'desc')->get();

        Log::info('Notifications fetched successfully', [
          'notifiacations' => $notifications,
        ]);

        return response()->json([
            'success' => true,
            'data' => $notifications,
        ]);

    } catch (\Exception $e) {
        Log::error('Failed to fetch notifications', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch notifications',
        ], 500);
    }
  }

    public function read(Request $request, $id){
        Log::info('=== Notification Management: Read Notification ===', [
            'requester_id' => $request->user()->id,
            'requester_email' => $request->user()->email,
            'requester_role' => $request->user()->role,
            'notification_id' => $id,
        ]);

        try {
            // Chỉ lấy notification thuộc quyền user
            $notification = Notification::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->first();

            if (!$notification) {

                Log::warning('Unauthorized notification access attempt', [
                    'requester_id' => $request->user()->id,
                    'notification_id' => $id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Notification không thuộc quyền của bạn.'
                ], 403);
            }

            // Mark as read
            $notification->is_read = true;
            $notification->save();

            Log::info('Notification marked as read successfully', [
                'notification_id' => $notification->id,
                'user_id' => $notification->user_id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $notification
            ]);

        } catch (\Exception $e) {

            Log::error('Failed to mark notification as read', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'notification_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification as read',
            ], 500);
        }
    }

    public function readAll(Request $request)
{
    Log::info('=== Notification Management: Read All Notifications ===', [
        'requester_id' => $request->user()->id,
        'requester_email' => $request->user()->email,
        'requester_role' => $request->user()->role,
    ]);

    try {
        // Lấy tất cả notification của user
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, "read_at"=>now()]);

        Log::info('All notifications marked as read successfully', [
            'user_id' => $request->user()->id,
            'updated_count' => $count
        ]);

        return response()->json([
            'success' => true,
            'data' => $count
        ]);

    } catch (\Exception $e) {

        Log::error('Failed to mark all notifications as read', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to read all notifications',
        ], 500);
    }
}



}