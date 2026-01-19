<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ReportBatchActivity extends Pivot
{
    use HasUuids;

    protected $table = 'report_batch_activities';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'report_batch_id',
        'activity_id',
        'order_number',
        'notes',
    ];
}
