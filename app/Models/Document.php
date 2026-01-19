<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'documents';
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Visibility constants
     */
    public const VISIBILITY_PUBLIC = 'PUBLIC';
    public const VISIBILITY_ORGANIZATION = 'ORGANIZATION';
    public const VISIBILITY_PRIVATE = 'PRIVATE';

    protected $fillable = [
        'title',
        'description',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'category',
        'tags',
        'organization_id',
        'visibility',
        'uploaded_by',
        'is_active',
    ];

    protected $casts = [
        'tags' => 'array',
        'file_size' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user who uploaded the document
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'id');
    }

    /**
     * Get the organization this document belongs to
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }

    /**
     * Scope for active documents
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for public documents
     */
    public function scopePublic($query)
    {
        return $query->where('visibility', self::VISIBILITY_PUBLIC);
    }

    /**
     * Scope to filter by category
     */
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to filter by organization
     */
    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to get documents accessible by a user
     */
    public function scopeAccessibleBy($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            // Public documents
            $q->where('visibility', self::VISIBILITY_PUBLIC);

            // Documents in user's organization
            if ($user->organization_id) {
                $q->orWhere(function ($subQ) use ($user) {
                    $subQ->where('visibility', self::VISIBILITY_ORGANIZATION)
                         ->where('organization_id', $user->organization_id);
                });
            }

            // User's own private documents
            $q->orWhere(function ($subQ) use ($user) {
                $subQ->where('visibility', self::VISIBILITY_PRIVATE)
                     ->where('uploaded_by', $user->id);
            });
        });
    }

    /**
     * Get visibility label
     */
    public function getVisibilityLabel(): string
    {
        return match ($this->visibility) {
            self::VISIBILITY_PUBLIC => 'Công khai',
            self::VISIBILITY_ORGANIZATION => 'Trong tổ chức',
            self::VISIBILITY_PRIVATE => 'Riêng tư',
            default => $this->visibility,
        };
    }

    /**
     * Get file size formatted
     */
    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    /**
     * Check if user can view this document
     */
    public function canBeViewedBy(User $user): bool
    {
        // Public documents can be viewed by everyone
        if ($this->visibility === self::VISIBILITY_PUBLIC) {
            return true;
        }

        // Organization documents can be viewed by members
        if ($this->visibility === self::VISIBILITY_ORGANIZATION) {
            return $user->organization_id === $this->organization_id;
        }

        // Private documents can only be viewed by the uploader
        return $user->id === $this->uploaded_by;
    }

    /**
     * Check if user can delete this document
     */
    public function canBeDeletedBy(User $user): bool
    {
        // Admin can delete anything
        if ($user->role === 'ADMIN') {
            return true;
        }

        // Uploader can delete their own documents
        return $user->id === $this->uploaded_by;
    }
}
