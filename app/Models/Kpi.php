<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCentral($query)
    {
        return $query->where('source', 'CENTRAL');
    }

    public function scopeVnu($query)
    {
        return $query->where('source', 'VNU');
    }
}