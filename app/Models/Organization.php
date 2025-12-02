<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     */
    protected $table = 'organizations';

    /**
     * The primary key type.
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'code',
        'name',
        'short_name',
        'type',
        'parent_id',
        'is_vnuhcm',
        'contact_email',
        'contact_phone',
        'address',
        'website',
        'avatar',
        'cover_image',
        'description',
        'status',
        'display_order',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_vnuhcm' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the parent organization.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'parent_id');
    }

    /**
     * Get the child organizations.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Organization::class, 'parent_id');
    }

    /**
     * Get the users for this organization.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'organization_id');
    }

    /**
     * Get the activities led by this organization.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'lead_organization_id');
    }

    /**
     * Get the activity organizations.
     */
    public function activityOrganizations(): HasMany
    {
        return $this->hasMany(ActivityOrganization::class);
    }

    /**
     * Get the reports for this organization.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Scope a query to only include active organizations.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include VNUHCM organizations.
     */
    public function scopeVnuhcm($query)
    {
        return $query->where('is_vnuhcm', true);
    }

    /**
     * Scope a query to only include external organizations.
     */
    public function scopeExternal($query)
    {
        return $query->where('is_vnuhcm', false);
    }
}
