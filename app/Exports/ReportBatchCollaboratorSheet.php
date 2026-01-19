<?php

namespace App\Exports;

use App\Models\ReportBatch;
use App\Models\BatchCollaboratorResponse;
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

class ReportBatchCollaboratorSheet implements FromArray, WithStyles, WithColumnWidths, WithTitle, WithEvents
{
    protected $batch;
    protected $activityRows = [];

    // Column configuration
    protected static $columns = [
        'stt' => ['label' => 'STT', 'width' => 6],
        'kpi' => ['label' => 'KPI', 'width' => 40],
        'activity' => ['label' => 'Hoạt động', 'width' => 40],
        'organization' => ['label' => 'Đơn vị phối hợp', 'width' => 25],
        'content' => ['label' => 'Nội dung báo cáo', 'width' => 60],
        'submitter' => ['label' => 'Người nộp', 'width' => 20],
        'submitted_at' => ['label' => 'Thời gian nộp', 'width' => 18],
    ];

    public function __construct(ReportBatch $batch)
    {
        $this->batch = $batch;
    }

    public function array(): array
    {
        $rows = [];
        $colCount = count(self::$columns);

        // Header row 1: Title
        $rows[] = $this->padRow(['BÁO CÁO TỪ ĐƠN VỊ PHỐI HỢP - ĐỢT: ' . strtoupper($this->batch->name)], $colCount);

        // Header row 2: Info
        $info = [];
        if ($this->batch->deadline) {
            $info[] = 'Hạn nộp: ' . Carbon::parse($this->batch->deadline)->format('d/m/Y H:i');
        }
        if ($this->batch->organization) {
            $info[] = 'Đơn vị tạo đợt: ' . ($this->batch->organization->short_name ?? $this->batch->organization->name);
        }
        $rows[] = $this->padRow([implode(' | ', $info)], $colCount);

        // Header row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Header row 4: Column headers
        $headerRow = [];
        foreach (self::$columns as $col => $config) {
            $headerRow[] = $config['label'];
        }
        $rows[] = $headerRow;

        $currentRow = 5;

        // Load activities with their KPIs and collaborator responses
        $activities = $this->batch->activities()
            ->with([
                'kpis',
                'collaboratingOrganizations',
            ])
            ->get();

        // Load all responses for this batch
        $responses = BatchCollaboratorResponse::with([
            'organization',
            'submitter',
            'activity',
        ])
            ->where('report_batch_id', $this->batch->id)
            ->get()
            ->groupBy('activity_id');

        $stt = 1;

        foreach ($activities as $activity) {
            // Get KPI info
            $kpiText = '';
            if ($activity->kpis->isNotEmpty()) {
                $kpiTexts = $activity->kpis->map(function($kpi) {
                    return $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
                })->toArray();
                $kpiText = implode("\n", $kpiTexts);
            }

            // Get collaborating organizations for this activity
            $collaboratingOrgs = $activity->collaboratingOrganizations;

            if ($collaboratingOrgs->isEmpty()) {
                continue; // Skip activities without collaborating orgs
            }

            // Activity header row
            $this->activityRows[] = $currentRow;
            $rows[] = $this->buildActivityHeaderRow($stt, $kpiText, $activity->title, $collaboratingOrgs->count());
            $currentRow++;

            // Responses for this activity
            $activityResponses = $responses->get($activity->id, collect());

            // Map responses by organization
            $responsesByOrg = $activityResponses->keyBy('organization_id');

            foreach ($collaboratingOrgs as $org) {
                $response = $responsesByOrg->get($org->id);

                $rows[] = $this->buildResponseRow(
                    $org->short_name ?? $org->name,
                    $response ? $response->content : '(Chưa nộp)',
                    $response && $response->submitter
                        ? trim(($response->submitter->first_name ?? '') . ' ' . ($response->submitter->last_name ?? ''))
                        : '',
                    $response && $response->submitted_at
                        ? Carbon::parse($response->submitted_at)->format('d/m/Y H:i')
                        : ''
                );
                $currentRow++;
            }

            $stt++;
        }

        if ($activities->isEmpty() || $stt === 1) {
            $rows[] = $this->padRow(['Không có hoạt động nào có đơn vị phối hợp trong đợt báo cáo này'], $colCount);
        }

        // Statistics
        $rows[] = $this->padRow([''], $colCount);
        $rows = array_merge($rows, $this->buildStatistics($colCount, $activities, $responses));

        return $rows;
    }

    protected function buildActivityHeaderRow($stt, $kpiText, $activityTitle, $collabCount): array
    {
        return [
            $stt,
            $kpiText,
            $activityTitle,
            "({$collabCount} đơn vị phối hợp)",
            '',
            '',
            '',
        ];
    }

    protected function buildResponseRow($orgName, $content, $submitter, $submittedAt): array
    {
        return [
            '',
            '',
            '',
            $orgName,
            $content,
            $submitter,
            $submittedAt,
        ];
    }

    protected function buildStatistics($colCount, $activities, $responses): array
    {
        $rows = [];

        $totalActivities = $activities->count();
        $activitiesWithCollab = $activities->filter(fn($a) => $a->collaboratingOrganizations->isNotEmpty())->count();

        // Count total required responses
        $totalRequired = 0;
        foreach ($activities as $activity) {
            $totalRequired += $activity->collaboratingOrganizations->count();
        }

        // Count submitted responses
        $totalSubmitted = $responses->flatten()->count();

        $rows[] = $this->padRow(['THỐNG KÊ'], $colCount);
        $rows[] = $this->padRow(['', "Tổng số hoạt động trong đợt: {$totalActivities}"], $colCount);
        $rows[] = $this->padRow(['', "Hoạt động có đơn vị phối hợp: {$activitiesWithCollab}"], $colCount);
        $rows[] = $this->padRow(['', "Tổng số báo cáo cần nộp: {$totalRequired}"], $colCount);
        $rows[] = $this->padRow(['', "Đã nộp: {$totalSubmitted}"], $colCount);
        $rows[] = $this->padRow(['', "Chưa nộp: " . ($totalRequired - $totalSubmitted)], $colCount);

        if ($totalRequired > 0) {
            $percentage = round(($totalSubmitted / $totalRequired) * 100, 1);
            $rows[] = $this->padRow(['', "Tỷ lệ hoàn thành: {$percentage}%"], $colCount);
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
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '52C41A']],
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
        return 'Bao cao don vi phoi hop';
    }

    public function registerEvents(): array
    {
        $activityRows = $this->activityRows;
        $colCount = count(self::$columns);
        $lastCol = chr(ord('A') + $colCount - 1);

        return [
            AfterSheet::class => function (AfterSheet $event) use ($activityRows, $lastCol) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // Merge title cells
                $sheet->mergeCells("A1:{$lastCol}1");
                $sheet->mergeCells("A2:{$lastCol}2");

                // Apply borders to data area
                $sheet->getStyle("A4:{$lastCol}{$highestRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                ]);

                // Style activity header rows
                foreach ($activityRows as $row) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 10],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F6FFED']],
                    ]);
                }

                // Center STT column
                $sheet->getStyle("A5:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Row heights
                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(35);

                // Freeze panes
                $sheet->freezePane('A5');
            },
        ];
    }
}
