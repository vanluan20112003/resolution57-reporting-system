<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ActivityCollaborator extends Pivot
{
    use HasUuids;

    protected $table = 'activity_collaborators';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'activity_id',
        'organization_id',
        'notes',
    ];
}
