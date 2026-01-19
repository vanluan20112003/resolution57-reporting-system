<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganizationViewScope extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     */
    protected $table = 'organization_view_scopes';

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
        'name',
        'display_name',
        'description',
        'is_system',
        'requires_specific_orgs',
        'scope_type',
        'status',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_system' => 'boolean',
        'requires_specific_orgs' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the permissions using this scope.
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(OrganizationAccessPermission::class, 'view_scope_id');
    }

    /**
     * Scope a query to only include active scopes.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include system scopes.
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope a query to only include custom scopes.
     */
    public function scopeCustom($query)
    {
        return $query->where('is_system', false);
    }

    /**
     * Check if this is the ALL_ORGANIZATIONS scope.
     */
    public function isAllOrganizationsScope(): bool
    {
        return $this->name === 'ALL_ORGANIZATIONS';
    }

    /**
     * Check if this scope requires specific organizations.
     */
    public function requiresSpecificOrganizations(): bool
    {
        return $this->requires_specific_orgs;
    }
}
