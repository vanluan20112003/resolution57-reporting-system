<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImpersonationSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'impersonated_user_id',
        'token_id',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    /**
     * Get the admin user
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Get the impersonated user
     */
    public function impersonatedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonated_user_id');
    }

    /**
     * Check if session is active
     */
    public function isActive(): bool
    {
        return $this->ended_at === null;
    }

    /**
     * End the impersonation session
     */
    public function end(): void
    {
        $this->ended_at = now();
        $this->save();
    }
}
