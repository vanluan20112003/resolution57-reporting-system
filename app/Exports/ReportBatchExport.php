<?php

namespace App\Exports;

use App\Models\ReportBatch;
use App\Models\Activity;
use App\Models\KpiCategory;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReportBatchExport implements WithMultipleSheets
{
    protected $batch;
    protected $currentUserId;

    public function __construct(ReportBatch $batch, $currentUserId = null)
    {
        $this->batch = $batch;
        $this->currentUserId = $currentUserId;
    }

    public function sheets(): array
    {
        return [
            new ReportBatchActivitiesSheet($this->batch, $this->currentUserId),
            new ReportBatchCollaboratorSheet($this->batch),
        ];
    }
}
