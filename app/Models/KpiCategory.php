<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiCategory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'kpi_categories';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'code',
        'name',
        'description',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all KPIs in this category
     */
    public function kpis(): HasMany
    {
        return $this->hasMany(Kpi::class, 'category_id');
    }

    /**
     * Scope to get only active categories
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by display_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }
}
