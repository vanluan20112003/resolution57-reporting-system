<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ReportBatch extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'report_batches';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'organization_id',
        'created_by',
        'name',
        'description',
        'start_date',
        'end_date',
        'deadline',
        'notes',
        'share_token',
    ];

    protected static function boot()
    {
        parent::boot();

        // Auto-generate share_token when creating new batch
        static::creating(function ($batch) {
            if (empty($batch->share_token)) {
                $batch->share_token = Str::random(32);
            }
        });
    }

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'deadline' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Append computed attributes to JSON
    protected $appends = ['status'];

    // Status constants (calculated from dates, not stored)
    const STATUS_UPCOMING = 'upcoming';
    const STATUS_ONGOING = 'ongoing';
    const STATUS_COMPLETED = 'completed';

    public static $statuses = [
        self::STATUS_UPCOMING => 'Sắp tới',
        self::STATUS_ONGOING => 'Đang diễn ra',
        self::STATUS_COMPLETED => 'Kết thúc',
    ];

    // Relationships
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activities(): BelongsToMany
    {
        return $this->belongsToMany(Activity::class, 'report_batch_activities')
            ->using(ReportBatchActivity::class)
            ->withPivot(['id', 'order_number', 'notes'])
            ->withTimestamps()
            ->orderByPivot('order_number');
    }

    public function collaboratorResponses(): HasMany
    {
        return $this->hasMany(BatchCollaboratorResponse::class, 'report_batch_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(ReportBatchFile::class, 'report_batch_id');
    }

    public function ownerFile(): HasMany
    {
        return $this->hasMany(ReportBatchFile::class, 'report_batch_id')
            ->where('file_source', ReportBatchFile::SOURCE_OWNER);
    }

    public function collaboratorFiles(): HasMany
    {
        return $this->hasMany(ReportBatchFile::class, 'report_batch_id')
            ->where('file_source', ReportBatchFile::SOURCE_COLLABORATOR);
    }

    // Scopes
    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    // Helpers
    /**
     * Calculate status based on dates
     */
    public function getStatusAttribute(): string
    {
        $today = now()->startOfDay();

        // If end_date is set and has passed
        if ($this->end_date && $today->gt($this->end_date)) {
            return self::STATUS_COMPLETED;
        }

        // If start_date is set and hasn't arrived yet
        if ($this->start_date && $today->lt($this->start_date)) {
            return self::STATUS_UPCOMING;
        }

        // Otherwise, it's ongoing (between start and end, or no dates set)
        return self::STATUS_ONGOING;
    }

    public function getStatusLabelAttribute(): string
    {
        return self::$statuses[$this->status] ?? $this->status;
    }

    public function getActivityCountAttribute(): int
    {
        return $this->activities()->count();
    }

    public function getResponseCountAttribute(): int
    {
        return $this->collaboratorResponses()->count();
    }

    public function getPeriodLabelAttribute(): string
    {
        if ($this->start_date && $this->end_date) {
            return $this->start_date->format('d/m/Y') . ' - ' . $this->end_date->format('d/m/Y');
        }
        if ($this->start_date) {
            return 'Từ ' . $this->start_date->format('d/m/Y');
        }
        if ($this->end_date) {
            return 'Đến ' . $this->end_date->format('d/m/Y');
        }
        return '-';
    }

    public function isEditable(): bool
    {
        // Only editable if not completed (upcoming or ongoing)
        return $this->status !== self::STATUS_COMPLETED;
    }
}
