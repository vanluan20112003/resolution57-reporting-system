<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportExport extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'report_exports';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'organization_id',
        'exported_by',
        'report_type',
        'view_mode',
        'month',
        'year',
        'selected_columns',
        'file_name',
        'file_path',
        'file_size',
        'activity_count',
        'status',
        'notes',
        'error_message',
        'exported_at',
    ];

    protected $casts = [
        'selected_columns' => 'array',
        'month' => 'integer',
        'year' => 'integer',
        'file_size' => 'integer',
        'activity_count' => 'integer',
        'exported_at' => 'datetime',
    ];

    // Relationships
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function exporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'exported_by');
    }

    // Scopes
    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('exported_by', $userId);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    // Helpers
    public function getPeriodLabelAttribute(): string
    {
        return "Tháng {$this->month}/{$this->year}";
    }

    public function getViewModeLabelAttribute(): string
    {
        return $this->view_mode === 'kpis' ? 'Theo KPI' : 'Theo hoạt động';
    }

    public function getFileSizeFormattedAttribute(): string
    {
        if (!$this->file_size) return '-';

        $bytes = $this->file_size;
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }
}
