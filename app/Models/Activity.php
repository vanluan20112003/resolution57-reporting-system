<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Activity extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'activities';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'code',
        'title',
        'description',
        'activity_type_id',
        'activity_field_id',
        'status',
        'lead_organization_id',
        'leader_names',
        'start_date',
        'end_date',
        'actual_start_date',
        'actual_end_date',
        'budget',
        'budget_source',
        'location',
        'external_url',
        'created_by',
        'approved_by',
        'approved_at',
        'updated_by',
        'is_locked',
        'locked_at',
        'locked_by',
        'completion_percentage',
        'result_summary',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_end_date' => 'datetime',
        'budget' => 'decimal:2',
        'approved_at' => 'datetime',
        'is_locked' => 'boolean',
        'locked_at' => 'datetime',
        'completion_percentage' => 'integer',
        'leader_names' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function activityType(): BelongsTo
    {
        return $this->belongsTo(ActivityType::class);
    }

    public function activityField(): BelongsTo
    {
        return $this->belongsTo(ActivityField::class);
    }

    public function leadOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'lead_organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function locker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function activityKpis(): HasMany
    {
        return $this->hasMany(ActivityKpi::class);
    }

    public function kpis(): BelongsToMany
    {
        return $this->belongsToMany(Kpi::class, 'activity_kpis')
            ->using(ActivityKpi::class)
            ->withPivot('contribution_description', 'target_value', 'actual_value')
            ->withTimestamps();
    }

    public function activityOrganizations(): HasMany
    {
        return $this->hasMany(ActivityOrganization::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'activity_organizations')
            ->withPivot('role', 'description')
            ->withTimestamps();
    }

    public function files(): HasMany
    {
        return $this->hasMany(ActivityFile::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ActivityParticipant::class);
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('status', 'DRAFT');
    }

    public function scopePendingApproval($query)
    {
        return $query->where('status', 'PENDING_APPROVAL');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'IN_PROGRESS');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'COMPLETED');
    }

    public function scopeLocked($query)
    {
        return $query->where('is_locked', true);
    }

    public function scopeUnlocked($query)
    {
        return $query->where('is_locked', false);
    }
}
