<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'activity_logs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'activity_id',
        'user_id',
        'organization_id',
        'action',
        'action_label',
        'description',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Action constants
    const ACTION_CREATED = 'created';
    const ACTION_UPDATED = 'updated';
    const ACTION_DELETED = 'deleted';
    const ACTION_SUBMITTED = 'submitted';
    const ACTION_APPROVED = 'approved';
    const ACTION_REJECTED = 'rejected';
    const ACTION_LOCKED = 'locked';
    const ACTION_UNLOCKED = 'unlocked';
    const ACTION_POSTPONED = 'postponed';
    const ACTION_CANCELLED = 'cancelled';
    const ACTION_UNCANCELLED = 'uncancelled';
    const ACTION_FILE_UPLOADED = 'file_uploaded';
    const ACTION_FILE_DELETED = 'file_deleted';
    const ACTION_PARTICIPANT_ADDED = 'participant_added';
    const ACTION_PARTICIPANT_REMOVED = 'participant_removed';
    const ACTION_KPI_LINKED = 'kpi_linked';
    const ACTION_KPI_UNLINKED = 'kpi_unlinked';
    const ACTION_COLLABORATOR_ADDED = 'collaborator_added';
    const ACTION_COLLABORATOR_REMOVED = 'collaborator_removed';

    // Action labels in Vietnamese
    const ACTION_LABELS = [
        self::ACTION_CREATED => 'Tạo hoạt động',
        self::ACTION_UPDATED => 'Cập nhật hoạt động',
        self::ACTION_DELETED => 'Xóa hoạt động',
        self::ACTION_SUBMITTED => 'Gửi yêu cầu phê duyệt',
        self::ACTION_APPROVED => 'Phê duyệt hoạt động',
        self::ACTION_REJECTED => 'Từ chối hoạt động',
        self::ACTION_LOCKED => 'Khóa hoạt động',
        self::ACTION_UNLOCKED => 'Mở khóa hoạt động',
        self::ACTION_POSTPONED => 'Tạm hoãn hoạt động',
        self::ACTION_CANCELLED => 'Hủy hoạt động',
        self::ACTION_UNCANCELLED => 'Khôi phục hoạt động',
        self::ACTION_FILE_UPLOADED => 'Tải lên file',
        self::ACTION_FILE_DELETED => 'Xóa file',
        self::ACTION_PARTICIPANT_ADDED => 'Thêm người tham gia',
        self::ACTION_PARTICIPANT_REMOVED => 'Xóa người tham gia',
        self::ACTION_KPI_LINKED => 'Liên kết KPI',
        self::ACTION_KPI_UNLINKED => 'Hủy liên kết KPI',
        self::ACTION_COLLABORATOR_ADDED => 'Thêm đơn vị phối hợp',
        self::ACTION_COLLABORATOR_REMOVED => 'Xóa đơn vị phối hợp',
    ];

    // Relationships
    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    // Helper method to get action label
    public function getActionLabelAttribute(): string
    {
        return self::ACTION_LABELS[$this->action] ?? $this->action;
    }

    // Static helper to create a log entry
    public static function log(
        string $activityId,
        string $userId,
        string $action,
        ?string $organizationId = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): self {
        return self::create([
            'activity_id' => $activityId,
            'user_id' => $userId,
            'organization_id' => $organizationId,
            'action' => $action,
            'action_label' => self::ACTION_LABELS[$action] ?? $action,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    // Scopes
    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForActivity($query, string $activityId)
    {
        return $query->where('activity_id', $activityId);
    }

    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
