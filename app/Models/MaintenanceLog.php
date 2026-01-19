<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model
{
    protected $fillable = [
        'action',
        'user_id',
        'user_name',
        'old_settings',
        'new_settings',
        'ip_address',
        'note',
    ];

    protected $casts = [
        'old_settings' => 'array',
        'new_settings' => 'array',
    ];

    /**
     * Get the user who performed the action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get action label in Vietnamese
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'enabled' => 'Bật bảo trì',
            'disabled' => 'Tắt bảo trì',
            'settings_updated' => 'Cập nhật cài đặt',
            default => $this->action,
        };
    }

    /**
     * Get formatted changes between old and new settings
     */
    public function getChangesAttribute(): array
    {
        if (!$this->old_settings || !$this->new_settings) {
            return [];
        }

        $changes = [];
        $fieldLabels = [
            'is_enabled' => 'Trạng thái',
            'title' => 'Tiêu đề',
            'message' => 'Thông báo',
            'notification_type' => 'Loại thông báo',
            'estimated_end_time' => 'Thời gian dự kiến',
            'show_countdown' => 'Hiện đếm ngược',
            'allow_admin_access' => 'Cho phép admin',
            'allowed_ips' => 'IP được phép',
        ];

        foreach ($this->new_settings as $key => $newValue) {
            $oldValue = $this->old_settings[$key] ?? null;

            if ($oldValue !== $newValue && isset($fieldLabels[$key])) {
                $changes[] = [
                    'field' => $fieldLabels[$key],
                    'old' => $this->formatValue($key, $oldValue),
                    'new' => $this->formatValue($key, $newValue),
                ];
            }
        }

        return $changes;
    }

    /**
     * Format value for display
     */
    protected function formatValue(string $key, mixed $value): string
    {
        if ($value === null) {
            return 'N/A';
        }

        if (is_bool($value)) {
            return $value ? 'Có' : 'Không';
        }

        if (is_array($value)) {
            return implode(', ', $value) ?: 'Trống';
        }

        if ($key === 'notification_type') {
            return match ($value) {
                'info' => 'Thông tin',
                'warning' => 'Cảnh báo',
                'error' => 'Lỗi',
                default => $value,
            };
        }

        return (string) $value;
    }
}
