<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityParticipant extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'activity_participants';
    protected $keyType = 'string';
    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'activity_id',
        'user_id',
        'external_name',
        'external_email',
        'external_phone',
        'external_organization',
        'role',
        'invitation_status',
        'responded_at',
        'attended',
        'attendance_time',
        'notes',
    ];

    protected $casts = [
        'attended' => 'boolean',
        'invited_at' => 'datetime',
        'responded_at' => 'datetime',
        'attendance_time' => 'datetime',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePending($query)
    {
        return $query->where('invitation_status', 'PENDING');
    }

    public function scopeAccepted($query)
    {
        return $query->where('invitation_status', 'ACCEPTED');
    }

    public function scopeAttended($query)
    {
        return $query->where('attended', true);
    }

    public function scopeExternal($query)
    {
        return $query->whereNull('user_id');
    }

    public function scopeInternal($query)
    {
        return $query->whereNotNull('user_id');
    }
}