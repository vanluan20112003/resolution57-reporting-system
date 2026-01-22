<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportBatchFile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'report_batch_files';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'report_batch_id',
        'organization_id',
        'uploaded_by',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'title',
        'description',
        'file_source',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // File source constants
    const SOURCE_OWNER = 'owner';
    const SOURCE_COLLABORATOR = 'collaborator';

    // Relationships
    public function reportBatch(): BelongsTo
    {
        return $this->belongsTo(ReportBatch::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // Scopes
    public function scopeByBatch($query, $batchId)
    {
        return $query->where('report_batch_id', $batchId);
    }

    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeOwnerFiles($query)
    {
        return $query->where('file_source', self::SOURCE_OWNER);
    }

    public function scopeCollaboratorFiles($query)
    {
        return $query->where('file_source', self::SOURCE_COLLABORATOR);
    }

    // Helpers
    public function getFileSizeFormattedAttribute(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

    public function isOwnerFile(): bool
    {
        return $this->file_source === self::SOURCE_OWNER;
    }

    public function isCollaboratorFile(): bool
    {
        return $this->file_source === self::SOURCE_COLLABORATOR;
    }
}
