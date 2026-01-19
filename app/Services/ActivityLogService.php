<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Activity;
use Illuminate\Http\Request;

class ActivityLogService
{
    /**
     * Log activity creation
     */
    public static function logCreated(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_CREATED,
            organizationId: $activity->lead_organization_id,
            description: "Tạo hoạt động mới: {$activity->title}",
            newValues: [
                'code' => $activity->code,
                'title' => $activity->title,
                'status' => $activity->status,
            ],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity update
     */
    public static function logUpdated(Activity $activity, array $oldValues, array $newValues, Request $request, ?string $description = null): ActivityLog
    {
        // Filter only changed values
        $changes = [];
        foreach ($newValues as $key => $value) {
            if (isset($oldValues[$key]) && $oldValues[$key] != $value) {
                $changes[$key] = [
                    'old' => $oldValues[$key],
                    'new' => $value,
                ];
            }
        }

        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_UPDATED,
            organizationId: $activity->lead_organization_id,
            description: $description ?? "Cập nhật hoạt động: {$activity->title}",
            oldValues: $oldValues,
            newValues: $newValues,
            metadata: ['changes' => $changes],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity deletion
     */
    public static function logDeleted(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_DELETED,
            organizationId: $activity->lead_organization_id,
            description: "Xóa hoạt động: {$activity->title}",
            oldValues: [
                'code' => $activity->code,
                'title' => $activity->title,
                'status' => $activity->status,
            ],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log submission for approval
     */
    public static function logSubmitted(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_SUBMITTED,
            organizationId: $activity->lead_organization_id,
            description: "Gửi yêu cầu phê duyệt: {$activity->title}",
            newValues: ['status' => 'PENDING_APPROVAL'],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity approval
     */
    public static function logApproved(Activity $activity, Request $request, ?string $notes = null): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_APPROVED,
            organizationId: $activity->lead_organization_id,
            description: "Phê duyệt hoạt động: {$activity->title}" . ($notes ? " - Ghi chú: {$notes}" : ''),
            newValues: ['status' => 'APPROVED'],
            metadata: $notes ? ['notes' => $notes] : null,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity rejection
     */
    public static function logRejected(Activity $activity, Request $request, ?string $reason = null): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_REJECTED,
            organizationId: $activity->lead_organization_id,
            description: "Từ chối hoạt động: {$activity->title}" . ($reason ? " - Lý do: {$reason}" : ''),
            newValues: ['status' => 'REJECTED'],
            metadata: $reason ? ['reason' => $reason] : null,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity lock
     */
    public static function logLocked(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_LOCKED,
            organizationId: $activity->lead_organization_id,
            description: "Khóa hoạt động: {$activity->title}",
            newValues: ['is_locked' => true],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity unlock
     */
    public static function logUnlocked(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_UNLOCKED,
            organizationId: $activity->lead_organization_id,
            description: "Mở khóa hoạt động: {$activity->title}",
            newValues: ['is_locked' => false],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity postpone
     */
    public static function logPostponed(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_POSTPONED,
            organizationId: $activity->lead_organization_id,
            description: "Tạm hoãn hoạt động: {$activity->title}",
            newValues: ['status' => 'POSTPONED'],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity cancellation
     */
    public static function logCancelled(Activity $activity, Request $request, ?string $reason = null): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_CANCELLED,
            organizationId: $activity->lead_organization_id,
            description: "Hủy hoạt động: {$activity->title}" . ($reason ? " - Lý do: {$reason}" : ''),
            newValues: ['status' => 'CANCELLED'],
            metadata: $reason ? ['reason' => $reason] : null,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log activity uncancellation
     */
    public static function logUncancelled(Activity $activity, Request $request): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_UNCANCELLED,
            organizationId: $activity->lead_organization_id,
            description: "Khôi phục hoạt động: {$activity->title}",
            newValues: ['status' => 'APPROVED'],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log file upload
     */
    public static function logFileUploaded(Activity $activity, Request $request, string $fileName, ?string $fileType = null): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_FILE_UPLOADED,
            organizationId: $activity->lead_organization_id,
            description: "Tải lên file: {$fileName}",
            metadata: [
                'file_name' => $fileName,
                'file_type' => $fileType,
            ],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log file deletion
     */
    public static function logFileDeleted(Activity $activity, Request $request, string $fileName): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_FILE_DELETED,
            organizationId: $activity->lead_organization_id,
            description: "Xóa file: {$fileName}",
            metadata: ['file_name' => $fileName],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log participant added
     */
    public static function logParticipantAdded(Activity $activity, Request $request, string $participantName, int $count = 1): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_PARTICIPANT_ADDED,
            organizationId: $activity->lead_organization_id,
            description: $count > 1
                ? "Thêm {$count} người tham gia vào hoạt động"
                : "Thêm người tham gia: {$participantName}",
            metadata: [
                'participant_name' => $participantName,
                'count' => $count,
            ],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log participant removed
     */
    public static function logParticipantRemoved(Activity $activity, Request $request, string $participantName): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_PARTICIPANT_REMOVED,
            organizationId: $activity->lead_organization_id,
            description: "Xóa người tham gia: {$participantName}",
            metadata: ['participant_name' => $participantName],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log KPI linked
     */
    public static function logKpiLinked(Activity $activity, Request $request, array $kpiTitles): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_KPI_LINKED,
            organizationId: $activity->lead_organization_id,
            description: "Liên kết KPI: " . implode(', ', $kpiTitles),
            metadata: ['kpi_titles' => $kpiTitles],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Log collaborator added
     */
    public static function logCollaboratorAdded(Activity $activity, Request $request, string $orgName): ActivityLog
    {
        return ActivityLog::log(
            activityId: $activity->id,
            userId: $request->user()->id,
            action: ActivityLog::ACTION_COLLABORATOR_ADDED,
            organizationId: $activity->lead_organization_id,
            description: "Thêm đơn vị phối hợp: {$orgName}",
            metadata: ['organization_name' => $orgName],
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }
}
