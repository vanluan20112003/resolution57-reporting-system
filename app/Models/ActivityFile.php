<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ActivityFile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'activity_files';
    protected $keyType = 'string';
    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'activity_id',
        'file_type_id',
        'file_name',
        'file_path',
        'file_url',
        'source_type',
        'file_size',
        'file_extension',
        'mime_type',
        'description',
        'uploaded_by',
        'is_public',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'is_public' => 'boolean',
        'uploaded_at' => 'datetime',
    ];

    protected $appends = ['download_url'];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function fileType(): BelongsTo
    {
        return $this->belongsTo(FileType::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Get the download URL for the file
     */
    public function getDownloadUrlAttribute(): ?string
    {
        if ($this->source_type === 'link') {
            return $this->file_url;
        }

        if ($this->file_path) {
            return Storage::url($this->file_path);
        }

        return null;
    }

    /**
     * Check if file is an external link
     */
    public function isLink(): bool
    {
        return $this->source_type === 'link';
    }

    /**
     * Check if file is an uploaded file
     */
    public function isUpload(): bool
    {
        return $this->source_type === 'upload';
    }
}