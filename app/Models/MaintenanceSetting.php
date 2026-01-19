<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MaintenanceSetting extends Model
{
    protected $fillable = [
        'is_enabled',
        'secret_key',
        'title',
        'message',
        'notification_type',
        'estimated_end_time',
        'show_countdown',
        'allow_admin_access',
        'allowed_ips',
        'enabled_by',
        'enabled_at',
        'disabled_by',
        'disabled_at',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'show_countdown' => 'boolean',
        'allow_admin_access' => 'boolean',
        'allowed_ips' => 'array',
        'estimated_end_time' => 'datetime',
        'enabled_at' => 'datetime',
        'disabled_at' => 'datetime',
    ];

    /**
     * Get the user who enabled maintenance
     */
    public function enabledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enabled_by');
    }

    /**
     * Get the user who disabled maintenance
     */
    public function disabledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disabled_by');
    }

    /**
     * Get or create singleton settings
     */
    public static function getSettings(): self
    {
        $settings = self::first();

        if (!$settings) {
            $settings = self::create([
                'is_enabled' => false,
                'secret_key' => Str::random(32),
                'title' => 'Hệ thống đang bảo trì',
                'message' => 'Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau.',
                'notification_type' => 'info',
                'show_countdown' => true,
                'allow_admin_access' => true,
                'allowed_ips' => [],
            ]);
        }

        return $settings;
    }

    /**
     * Check if maintenance mode is active
     */
    public static function isMaintenanceMode(): bool
    {
        $settings = self::getSettings();
        return $settings->is_enabled;
    }

    /**
     * Enable maintenance mode
     */
    public static function enable(string $userId, array $options = []): self
    {
        $settings = self::getSettings();

        $oldSettings = $settings->toArray();

        $settings->update(array_merge([
            'is_enabled' => true,
            'enabled_by' => $userId,
            'enabled_at' => now(),
            'disabled_by' => null,
            'disabled_at' => null,
        ], $options));

        // Generate new secret key if not provided
        if (empty($settings->secret_key)) {
            $settings->update(['secret_key' => Str::random(32)]);
        }

        // Log the action
        MaintenanceLog::create([
            'action' => 'enabled',
            'user_id' => $userId,
            'user_name' => User::find($userId)?->full_name,
            'old_settings' => $oldSettings,
            'new_settings' => $settings->fresh()->toArray(),
            'ip_address' => request()->ip(),
        ]);

        return $settings->fresh();
    }

    /**
     * Disable maintenance mode
     */
    public static function disable(string $userId): self
    {
        $settings = self::getSettings();

        $oldSettings = $settings->toArray();

        $settings->update([
            'is_enabled' => false,
            'disabled_by' => $userId,
            'disabled_at' => now(),
        ]);

        // Log the action
        MaintenanceLog::create([
            'action' => 'disabled',
            'user_id' => $userId,
            'user_name' => User::find($userId)?->full_name,
            'old_settings' => $oldSettings,
            'new_settings' => $settings->fresh()->toArray(),
            'ip_address' => request()->ip(),
        ]);

        return $settings->fresh();
    }

    /**
     * Update maintenance settings
     */
    public static function updateSettings(string $userId, array $data): self
    {
        $settings = self::getSettings();

        $oldSettings = $settings->toArray();

        // Filter only allowed fields
        $allowedFields = [
            'title', 'message', 'notification_type',
            'estimated_end_time', 'show_countdown',
            'allow_admin_access', 'allowed_ips'
        ];

        $filteredData = array_intersect_key($data, array_flip($allowedFields));

        $settings->update($filteredData);

        // Log the action
        MaintenanceLog::create([
            'action' => 'settings_updated',
            'user_id' => $userId,
            'user_name' => User::find($userId)?->full_name,
            'old_settings' => $oldSettings,
            'new_settings' => $settings->fresh()->toArray(),
            'ip_address' => request()->ip(),
        ]);

        return $settings->fresh();
    }

    /**
     * Regenerate secret key
     */
    public function regenerateSecretKey(): string
    {
        $newKey = Str::random(32);
        $this->update(['secret_key' => $newKey]);
        return $newKey;
    }

    /**
     * Check if IP is allowed
     */
    public function isIpAllowed(string $ip): bool
    {
        if (empty($this->allowed_ips)) {
            return false;
        }

        return in_array($ip, $this->allowed_ips);
    }

    /**
     * Check if secret key is valid
     */
    public function isValidSecretKey(string $key): bool
    {
        return $this->secret_key === $key;
    }

    /**
     * Get bypass URL
     */
    public function getBypassUrl(): string
    {
        return url('/maintenance-bypass/' . $this->secret_key);
    }

    /**
     * Get public maintenance info (for non-admin users)
     */
    public function getPublicInfo(): array
    {
        return [
            'is_enabled' => $this->is_enabled,
            'title' => $this->title,
            'message' => $this->message,
            'notification_type' => $this->notification_type,
            'estimated_end_time' => $this->estimated_end_time?->toISOString(),
            'show_countdown' => $this->show_countdown,
        ];
    }
}
