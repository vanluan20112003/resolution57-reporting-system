<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Kpi extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'kpis';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'source',
        'code',
        'title',
        'description',
        'category',
        'category_id',
        'order_number',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order_number' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * KPI Sources
     */
    public const SOURCE_CENTRAL = 'CENTRAL';  // Trung ương
    public const SOURCE_VNU = 'VNU';          // ĐHQG-HCM

    public function activityKpis(): HasMany
    {
        return $this->hasMany(ActivityKpi::class);
    }

    public function activities(): BelongsToMany
    {
        return $this->belongsToMany(Activity::class, 'activity_kpis')
            ->withPivot('contribution_description', 'target_value', 'actual_value')
            ->withTimestamps();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    /**
     * Get the category this KPI belongs to
     */
    public function kpiCategory(): BelongsTo
    {
        return $this->belongsTo(KpiCategory::class, 'category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCentral($query)
    {
        return $query->where('source', self::SOURCE_CENTRAL);
    }

    public function scopeVnu($query)
    {
        return $query->where('source', self::SOURCE_VNU);
    }

    public function scopeBySource($query, $source)
    {
        return $query->where('source', $source);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Check if KPI is from central government
     */
    public function isCentral(): bool
    {
        return $this->source === self::SOURCE_CENTRAL;
    }

    /**
     * Check if KPI is from VNU
     */
    public function isVnu(): bool
    {
        return $this->source === self::SOURCE_VNU;
    }

    /**
     * Get source label
     */
    public function getSourceLabel(): string
    {
        return match($this->source) {
            self::SOURCE_CENTRAL => 'Trung ương',
            self::SOURCE_VNU => 'ĐHQG-HCM',
            default => $this->source,
        };
    }
}