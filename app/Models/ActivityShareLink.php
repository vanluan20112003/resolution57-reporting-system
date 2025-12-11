<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ActivityShareLink extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'activity_share_links';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'activity_id',
        'share_token',
        'created_by',
        'expires_at',
        'is_active',
        'access_count',
        'last_accessed_at',
        'description',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_accessed_at' => 'datetime',
        'is_active' => 'boolean',
        'access_count' => 'integer',
    ];

    protected $appends = ['share_url', 'is_expired'];

    /**
     * Boot method to auto-generate share token
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->share_token)) {
                $model->share_token = self::generateUniqueToken();
            }
        });
    }

    /**
     * Generate a unique share token
     */
    public static function generateUniqueToken(): string
    {
        do {
            // Tạo token 16 ký tự (dễ chia sẻ hơn UUID)
            $token = Str::random(16);
        } while (self::where('share_token', $token)->exists());

        return $token;
    }

    /**
     * Relationship: Activity
     */
    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Relationship: Creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the share URL
     */
    public function getShareUrlAttribute(): string
    {
        // Use frontend URL (port 5000) instead of API URL
        $frontendUrl = config('app.frontend_url', 'http://localhost:5000');
        return "{$frontendUrl}/shared/files/{$this->share_token}";
    }

    /**
     * Check if link is expired
     */
    public function getIsExpiredAttribute(): bool
    {
        if (!$this->expires_at) {
            return false;
        }
        return $this->expires_at->isPast();
    }

    /**
     * Check if link is valid (active and not expired)
     */
    public function isValid(): bool
    {
        return $this->is_active && !$this->is_expired;
    }

    /**
     * Increment access count
     */
    public function recordAccess(): void
    {
        $this->increment('access_count');
        $this->update(['last_accessed_at' => now()]);
    }

    /**
     * Scope: Active links only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Valid links (active and not expired)
     */
    public function scopeValid($query)
    {
        return $query->active()
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Scope: Permanent links (no expiration)
     */
    public function scopePermanent($query)
    {
        return $query->active()->whereNull('expires_at');
    }

    /**
     * Get or create a permanent share link for an activity
     * Used for reports - creates system-generated permanent links
     *
     * @param string $activityId
     * @param string|null $createdBy User ID who creates the link (null for system)
     * @return self
     */
    public static function getOrCreatePermanent(string $activityId, ?string $createdBy = null): self
    {
        // First, try to find an existing permanent (no expiration) active link
        $existingLink = self::where('activity_id', $activityId)
            ->permanent()
            ->first();

        if ($existingLink) {
            return $existingLink;
        }

        // Create a new permanent link
        return self::create([
            'activity_id' => $activityId,
            'created_by' => $createdBy,
            'expires_at' => null, // Permanent - never expires
            'is_active' => true,
            'description' => 'Link tự động tạo cho báo cáo',
        ]);
    }
}
