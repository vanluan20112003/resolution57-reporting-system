<?php

namespace App\Exports;

use App\Models\ReportBatch;
use App\Models\BatchCollaboratorResponse;
use App\Models\ReportBatchFile;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Carbon\Carbon;

class ReportBatchExport implements FromArray, WithStyles, WithColumnWidths, WithTitle, WithEvents
{
    protected $batch;
    protected $currentUserId;
    protected $activities;
    protected $responses;
    protected $ownerFile;
    protected $shareFileUrl;
    protected $activityRows = [];
    protected $headerRowIndex = 4;

    // Column configuration matching the sample file
    protected static $columns = [
        'stt' => ['label' => 'STT', 'width' => 6],
        'ma_nhiem_vu' => ['label' => 'Mã nhiệm vụ', 'width' => 18],
        'ten_nhiem_vu' => ['label' => 'Tên nhiệm vụ', 'width' => 50],
        'ten_nhom_nhiem_vu' => ['label' => 'Tên nhóm nhiệm vụ', 'width' => 45],
        'don_vi_cap_nhat' => ['label' => 'Đơn vị cập nhật báo cáo', 'width' => 25],
        'van_ban_giao_nhiem_vu' => ['label' => 'Văn bản giao nhiệm vụ', 'width' => 30],
        'ket_qua' => ['label' => 'Kết quả', 'width' => 16],
        'cac_van_ban_trien_khai' => ['label' => "Các văn bản/hoạt động triển khai\n(từ ngày bắt đầu-kết thúc đợt)", 'width' => 60],
        'kho_khan_vuong_mac' => ['label' => 'Khó khăn/vướng mắc', 'width' => 40],
        'de_xuat_kien_nghi' => ['label' => 'Đề xuất/kiến nghị', 'width' => 40],
        'file_so_cu' => ['label' => 'File sở cứ', 'width' => 35],
        'noi_dung_giai_trinh' => ['label' => 'Nội dung giải trình', 'width' => 35],
    ];

    public function __construct(ReportBatch $batch, $currentUserId = null)
    {
        $this->batch = $batch;
        $this->currentUserId = $currentUserId;
        $this->loadData();
    }

    protected function loadData()
    {
        // Load activities with relations
        $this->activities = $this->batch->activities()
            ->with([
                'leadOrganization',
                'collaboratingOrganizations',
                'kpis.tasks' => function ($query) {
                    $query->where('is_active', true)->orderBy('order_number');
                },
            ])
            ->get();

        // Load all responses for this batch
        $this->responses = BatchCollaboratorResponse::with([
            'organization',
            'submitter',
            'activity',
        ])
            ->where('report_batch_id', $this->batch->id)
            ->get()
            ->groupBy('activity_id');

        // Load owner file (văn bản giao nhiệm vụ)
        $this->ownerFile = ReportBatchFile::where('report_batch_id', $this->batch->id)
            ->where('file_source', 'owner')
            ->first();

        // Generate share file URL using config app.url to avoid nginx port issues
        $this->shareFileUrl = $this->batch->share_token
            ? config('app.url') . "/batch-files/{$this->batch->share_token}"
            : '';
    }

    public function array(): array
    {
        $rows = [];
        $colCount = count(self::$columns);

        // Row 1: Title
        $batchName = $this->batch->name;
        $rows[] = $this->padRow(["Báo cáo {$batchName}"], $colCount);

        // Row 2: Period info
        $periodInfo = $this->getPeriodInfo();
        $rows[] = $this->padRow([$periodInfo], $colCount);

        // Row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Row 4: Column headers
        $headerRow = [];
        foreach (self::$columns as $col => $config) {
            $headerRow[] = $config['label'];
        }
        $rows[] = $headerRow;

        $currentRow = 5; // Data starts at row 5
        $stt = 1;

        foreach ($this->activities as $activity) {
            $activityResponses = $this->responses->get($activity->id, collect());
            $collaboratingOrgs = $activity->collaboratingOrganizations;

            // Get KPI tasks (nhóm nhiệm vụ con)
            $kpiTasksText = $this->getKpiTasksText($activity);

            // Get owner file title (văn bản giao nhiệm vụ)
            $ownerFileTitle = $this->ownerFile ? $this->ownerFile->title : '';

            // Get activity status text
            $statusText = $this->getStatusText($activity->status);

            // Get activity code (mã nhiệm vụ)
            $activityCode = $activity->code ?? '';

            // Collect all collaborating org names (comma-separated)
            $orgNames = $collaboratingOrgs->map(fn($org) => $org->short_name ?? $org->name)->implode(', ');

            // Collect all responses into single strings (each org on new line)
            $responseLines = [];
            $difficultiesLines = [];
            $recommendationsLines = [];
            $explanationLines = [];

            foreach ($collaboratingOrgs as $org) {
                $response = $activityResponses->where('organization_id', $org->id)->first();
                $orgName = $org->short_name ?? $org->name;

                if ($response) {
                    if ($response->content) {
                        $responseLines[] = "{$orgName}: {$response->content}";
                    }
                    if ($response->difficulties) {
                        $difficultiesLines[] = "{$orgName}: {$response->difficulties}";
                    }
                    if ($response->recommendations) {
                        $recommendationsLines[] = "{$orgName}: {$response->recommendations}";
                    }
                    if ($response->explanation) {
                        $explanationLines[] = "{$orgName}: {$response->explanation}";
                    }
                }
            }

            // Build single row for this activity
            $rows[] = $this->buildActivityRow(
                $stt,
                $activityCode,
                $activity->title,
                $kpiTasksText,
                $orgNames,
                $ownerFileTitle,
                $statusText,
                implode("\n", $responseLines),
                implode("\n", $difficultiesLines),
                implode("\n", $recommendationsLines),
                $this->shareFileUrl,
                implode("\n", $explanationLines)
            );
            $this->activityRows[] = $currentRow;
            $currentRow++;
            $stt++;
        }

        if ($this->activities->isEmpty()) {
            $rows[] = $this->padRow(['Không có hoạt động nào trong đợt báo cáo này'], $colCount);
        }

        // Statistics section
        $rows[] = $this->padRow([''], $colCount);
        $rows = array_merge($rows, $this->buildStatistics($colCount));

        return $rows;
    }

    protected function getPeriodInfo(): string
    {
        $parts = [];

        if ($this->batch->start_date && $this->batch->end_date) {
            $parts[] = 'Thời gian: ' . Carbon::parse($this->batch->start_date)->format('d/m/Y')
                . ' - ' . Carbon::parse($this->batch->end_date)->format('d/m/Y');
        }

        if ($this->batch->deadline) {
            $parts[] = 'Hạn nộp: ' . Carbon::parse($this->batch->deadline)->format('d/m/Y H:i');
        }

        if ($this->batch->organization) {
            $parts[] = 'Đơn vị: ' . ($this->batch->organization->short_name ?? $this->batch->organization->name);
        }

        return implode(' | ', $parts);
    }

    protected function getKpiTasksText($activity): string
    {
        $allTasks = [];

        foreach ($activity->kpis as $kpi) {
            if ($kpi->tasks && $kpi->tasks->isNotEmpty()) {
                foreach ($kpi->tasks as $task) {
                    $allTasks[] = $task->title;
                }
            }
        }

        if (empty($allTasks)) {
            // If no tasks, return KPI titles
            $kpiTitles = $activity->kpis->map(function ($kpi) {
                return $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
            })->toArray();
            return implode("\n", $kpiTitles);
        }

        return implode("\n", $allTasks);
    }

    protected function getStatusText($status): string
    {
        $statusLabels = [
            'DRAFT' => 'Nháp',
            'PENDING_APPROVAL' => 'Chờ duyệt',
            'APPROVED' => 'Đã duyệt',
            'IN_PROGRESS' => 'Đang thực hiện',
            'COMPLETED' => 'Đã hoàn thành',
        ];

        return $statusLabels[$status] ?? $status;
    }

    protected function buildActivityRow(
        $stt,
        $code,
        $title,
        $kpiTasks,
        $orgName,
        $ownerFileTitle,
        $status,
        $responseContent,
        $difficulties,
        $recommendations,
        $shareFileUrl,
        $explanation
    ): array {
        return [
            $stt,
            $code,
            $title,
            $kpiTasks,
            $orgName,
            $ownerFileTitle,
            $status,
            $responseContent,
            $difficulties,
            $recommendations,
            $shareFileUrl,
            $explanation,
        ];
    }

    protected function buildStatistics($colCount): array
    {
        $rows = [];

        $totalActivities = $this->activities->count();
        $completed = $this->activities->where('status', 'COMPLETED')->count();
        $inProgress = $this->activities->where('status', 'IN_PROGRESS')->count();

        // Count required vs submitted responses
        $totalRequired = 0;
        foreach ($this->activities as $activity) {
            $totalRequired += $activity->collaboratingOrganizations->count();
        }
        $totalSubmitted = $this->responses->flatten()->count();

        $rows[] = $this->padRow(['THỐNG KÊ'], $colCount);
        $rows[] = $this->padRow(['', "Tổng số nhiệm vụ: {$totalActivities}"], $colCount);
        $rows[] = $this->padRow(['', "Đã hoàn thành: {$completed} | Đang thực hiện: {$inProgress}"], $colCount);
        $rows[] = $this->padRow(['', "Báo cáo cần thu: {$totalRequired} | Đã nhận: {$totalSubmitted}"], $colCount);

        if ($totalRequired > 0) {
            $percentage = round(($totalSubmitted / $totalRequired) * 100, 1);
            $rows[] = $this->padRow(['', "Tỷ lệ thu báo cáo: {$percentage}%"], $colCount);
        }

        $rows[] = $this->padRow([''], $colCount);
        $rows[] = $this->padRow(['', "Xuất báo cáo lúc: " . Carbon::now()->format('d/m/Y H:i:s')], $colCount);

        return $rows;
    }

    protected function padRow($row, $colCount): array
    {
        while (count($row) < $colCount) {
            $row[] = '';
        }
        return $row;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 14],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ],
            2 => [
                'font' => ['bold' => true, 'size' => 11],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            4 => [
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '000000']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFC000']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
            ],
        ];
    }

    public function columnWidths(): array
    {
        $widths = [];
        $colLetter = 'A';
        foreach (self::$columns as $config) {
            $widths[$colLetter] = $config['width'];
            $colLetter++;
        }
        return $widths;
    }

    public function title(): string
    {
        return 'Bao cao dot';
    }

    public function registerEvents(): array
    {
        $activityRows = $this->activityRows;
        $colCount = count(self::$columns);
        $lastCol = chr(ord('A') + $colCount - 1);

        return [
            AfterSheet::class => function (AfterSheet $event) use ($activityRows, $lastCol, $colCount) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // Merge title cells
                $sheet->mergeCells("A1:{$lastCol}1");
                $sheet->mergeCells("A2:{$lastCol}2");

                // Apply borders to data area (from row 4)
                $sheet->getStyle("A4:{$lastCol}{$highestRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                ]);

                // Style activity rows (first row of each activity)
                foreach ($activityRows as $row) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F5F5']],
                    ]);
                }

                // Center STT column
                $sheet->getStyle("A5:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Row heights
                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(40);

                // Freeze panes - freeze header row
                $sheet->freezePane('A5');

                // Make file link column clickable (column K = file_so_cu)
                // Note: Excel hyperlinks would need additional handling
            },
        ];
    }
}
