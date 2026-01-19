<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BatchCollaboratorResponse extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'report_batch_id',
        'organization_id',
        'activity_id',
        'submitted_by',
        'content',
        'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    /**
     * Get the report batch this response belongs to
     */
    public function reportBatch(): BelongsTo
    {
        return $this->belongsTo(ReportBatch::class, 'report_batch_id');
    }

    /**
     * Get the organization that submitted this response
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the user who submitted this response
     */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * Get the activity this response is for
     */
    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Scope: By batch
     */
    public function scopeByBatch($query, string $batchId)
    {
        return $query->where('report_batch_id', $batchId);
    }

    /**
     * Scope: By organization
     */
    public function scopeByOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope: By activity
     */
    public function scopeByActivity($query, string $activityId)
    {
        return $query->where('activity_id', $activityId);
    }
}
