<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

use function Laravel\Prompts\table;

class Notification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:notification';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try{
            $expiringActivities = Activity::select('*', DB::raw('DATEDIFF(end_date, CURDATE()) as days_left'))
                ->whereIn(DB::raw('DATEDIFF(end_date, CURDATE())'), [7, 3, 1])
                ->whereNotNull("approved_at")
                ->where("result_summary",null)
                ->get(); 

            $expiredActivities = Activity::select('*', DB::raw('DATEDIFF(CURDATE(), end_date) as days_overdue'))
                ->where('end_date', '<', now())
                ->whereNotNull("approved_at")
                ->where("result_summary",null)
                ->get();

            $pendingActivities = Activity::select('lead_organization_id', DB::raw('COUNT(*) as total'))
                ->where('status', 'PENDING_APPROVAL')
                ->whereNull('approved_at')
                ->where(DB::raw('DATEDIFF(CURDATE(), created_at)'), '>', 3)
                ->groupBy('lead_organization_id')
                ->get();

            $draftCountsByUser = Activity::where('status', 'DRAFT')
                ->where('created_at', '<', now()->subDays(7))
                ->groupBy('created_by')
                ->select('created_by', DB::raw('COUNT(*) as draft_count'))
                ->get();

            $notifications = [];
            
            foreach($expiringActivities as $activity) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $activity->created_by,
                    'title' => 'Hoạt động sắp đến hạn',
                    'message' => "Hoạt động {$activity->code} sẽ kết thúc trong {$activity->days_left} ngày",
                    'category' => 'reminder',
                    'notification_type' => 'activity_deadline_reminder',
                    'icon' => 'BellOutlined',
                    'color' => 'warning',
                    'action_url' => "/dashboard?tab=activity-management",
                    'actor_id' => $activity->created_by,
                    'is_read' => false,
                    'priority' => 'high',
                    'data' => json_encode([
                        "activity_id" => $activity->id,
                        "activity_code" => $activity->code,
                        "activity_title" => $activity->title,
                        "end_date" => $activity->end_date,
                        "days_remaining" => $activity->days_left,
                        "completion_percentage" => $activity->completion_percentage
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            foreach($expiredActivities as $activity){
                $users = User::where("organization_id",$activity->lead_organization_id)->whereIn("role",["MANAGER","STAFF"])->get();
                foreach($users as $user) {
                    $notifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $user->id,
                        'title' => 'Hoạt động quá hạn',
                        'message' => "Hoạt động {$activity->code} đã quá hạn {$activity->days_overdue} ngày",
                        'category' => 'reminder',
                        'notification_type' => 'activity_overdue',
                        'icon' => 'ExclamationCircleOutlined',
                        'color' => 'error',
                        'action_url' => "/dashboard?tab=activity-management",
                        'actor_id' => $activity->created_by,
                        'is_read' => false,
                        'priority' => 'urgent',
                        'data' => json_encode([
                            "activity_id" => $activity->id,
                            "activity_code" => $activity->code,
                            "activity_title" => $activity->title,
                            "end_date" => $activity->end_date,
                            "days_overdue" => $activity->days_overdue,
                            "completion_percentage" => $activity->completion_percentage
                        ]), 
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            foreach($pendingActivities as $item){
                $users = User::where("organization_id", $item->lead_organization_id)->where("role","MANAGER")->get();
                foreach($users as $user){
                    $notifications[] = [
                        'id' => Str::uuid()->toString(),
                        'user_id' => $user->id,
                        'title' => 'Hoạt động chờ duyệt lâu',
                        'message' => "Có {$item->total} hoạt động chờ duyệt hơn 3 ngày",
                        'category' => 'reminder',
                        'notification_type' => 'approval_pending_reminder',
                        'icon' => 'AlertOutlined',
                        'color' => 'warning',
                        'action_url' => "/dashboard?tab=pending-approval",
                        'actor_id' => null,
                        'is_read' => false,
                        'priority' => 'high',
                        'data' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

            }

            foreach($draftCountsByUser as $item) {
                $notifications[] = [
                    'id' => Str::uuid()->toString(),
                    'user_id' => $item->created_by,
                    'title' => 'DRAFT không gửi duyệt',
                    'message' => "Bạn có {$item->draft_count} hoạt động nháp chưa gửi duyệt",
                    'category' => 'reminder',
                    'notification_type' => 'draft_reminder',
                    'icon' => 'FileTextOutlined',
                    'color' => 'primary',
                    'action_url' => "/dashboard?tab=activity-management",
                    'actor_id' => null,
                    'is_read' => false,
                    'priority' => 'normal',
                    'data' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }


            DB::table('notifications')->insert($notifications);
        
        
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error("Scheduled notification failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
}
}
