<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationAccessPermission extends Model
{
    use HasFactory, HasUuids;

    /**
     * The table associated with the model.
     */
    protected $table = 'organization_access_permissions';

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
        'organization_id',
        'view_scope_id',
        'target_organization_id',
        'target_organization_ids',
        'allowed_roles',
        'can_view_details',
        'can_view_files',
        'can_export',
        'can_view_participants',
        'can_view_budget',
        'valid_from',
        'valid_until',
        'status',
        'reason',
        'notes',
        'created_by',
        'updated_by',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = ['targetOrganizations'];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'allowed_roles' => 'array',
        'target_organization_ids' => 'array',
        'can_view_details' => 'boolean',
        'can_view_files' => 'boolean',
        'can_export' => 'boolean',
        'can_view_participants' => 'boolean',
        'can_view_budget' => 'boolean',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the organization that owns this permission.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the view scope for this permission.
     */
    public function viewScope(): BelongsTo
    {
        return $this->belongsTo(OrganizationViewScope::class, 'view_scope_id');
    }

    /**
     * Get the target organization (single - backward compatibility).
     */
    public function targetOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'target_organization_id');
    }

    /**
     * Get target organizations (multiple).
     */
    public function getTargetOrganizationsAttribute()
    {
        if (!$this->target_organization_ids || empty($this->target_organization_ids)) {
            return collect([]);
        }

        return Organization::whereIn('id', $this->target_organization_ids)->get();
    }

    /**
     * Scope a query to only include active permissions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include valid permissions (within date range).
     */
    public function scopeValid($query)
    {
        $now = now();
        return $query->where(function ($q) use ($now) {
            $q->whereNull('valid_from')
                ->orWhere('valid_from', '<=', $now);
        })->where(function ($q) use ($now) {
            $q->whereNull('valid_until')
                ->orWhere('valid_until', '>=', $now);
        });
    }

    /**
     * Scope a query for a specific organization.
     */
    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Check if permission is currently valid.
     */
    public function isValid(): bool
    {
        $now = now();

        if ($this->valid_from && $this->valid_from > $now) {
            return false;
        }

        if ($this->valid_until && $this->valid_until < $now) {
            return false;
        }

        return $this->status === 'active';
    }

    /**
     * Check if a specific role is allowed.
     */
    public function isRoleAllowed(string $role): bool
    {
        if (!$this->allowed_roles) {
            return true; // No restriction
        }

        return in_array($role, $this->allowed_roles);
    }

    /**
     * Get all accessible organization IDs based on this permission.
     */
    public function getAccessibleOrganizationIds(): array
    {
        // Load the view scope
        $scope = $this->viewScope;

        if (!$scope) {
            return [];
        }

        // ALL_ORGANIZATIONS scope
        if ($scope->name === 'ALL_ORGANIZATIONS') {
            return Organization::active()->pluck('id')->toArray();
        }

        // PARENT_AND_CHILDREN scope
        if ($scope->name === 'PARENT_AND_CHILDREN') {
            $org = $this->organization;
            if (!$org) {
                return [];
            }

            $ids = [$org->id];

            // Get all children recursively
            $this->getAllChildrenIds($org, $ids);

            return $ids;
        }

        // SPECIFIC_ORGANIZATIONS scope
        if ($scope->name === 'SPECIFIC_ORGANIZATIONS') {
            $ids = [];

            // Support multiple target organizations
            if ($this->target_organization_ids && !empty($this->target_organization_ids)) {
                $ids = array_merge($ids, $this->target_organization_ids);
            }

            // Backward compatibility: also check single target_organization_id
            if ($this->target_organization_id) {
                $ids[] = $this->target_organization_id;
            }

            return array_unique($ids);
        }

        return [];
    }

    /**
     * Recursively get all children organization IDs.
     */
    private function getAllChildrenIds(Organization $org, array &$ids): void
    {
        $children = $org->children;

        foreach ($children as $child) {
            if (!in_array($child->id, $ids)) {
                $ids[] = $child->id;
                $this->getAllChildrenIds($child, $ids);
            }
        }
    }
}
