<?php

namespace App\Exports;

use App\Models\ReportBatch;
use App\Models\Activity;
use App\Models\ActivityShareLink;
use App\Models\KpiCategory;
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

class ReportBatchActivitiesSheet implements FromArray, WithStyles, WithColumnWidths, WithTitle, WithEvents
{
    protected $batch;
    protected $activities;
    protected $currentUserId;
    protected $categoryRows = [];
    protected $activityShareLinks = [];

    // Column configuration
    protected static $columns = [
        'stt' => ['label' => 'STT', 'width' => 6],
        'nhiem_vu_trong_tam' => ['label' => 'Nhiệm vụ trọng tâm (KPI)', 'width' => 50],
        'noi_dung_cu_the' => ['label' => 'Nội dung cụ thể', 'width' => 45],
        'phuong_an_de_xuat' => ['label' => 'Hoạt động', 'width' => 45],
        'time_period' => ['label' => 'Thời gian', 'width' => 18],
        'organization' => ['label' => 'Đơn vị chủ trì', 'width' => 18],
        'partner_organizations' => ['label' => 'Đơn vị phối hợp', 'width' => 25],
        'status' => ['label' => 'Trạng thái', 'width' => 15],
        'completion_percentage' => ['label' => 'Tiến độ', 'width' => 12],
        'evidence_link' => ['label' => 'Link minh chứng', 'width' => 25],
    ];

    public function __construct(ReportBatch $batch, $currentUserId = null)
    {
        $this->batch = $batch;
        $this->currentUserId = $currentUserId;
        $this->loadActivities();
    }

    protected function loadActivities()
    {
        $this->activities = $this->batch->activities()
            ->with([
                'leadOrganization',
                'collaboratingOrganizations',
                'kpis.kpiCategory',
                'kpis.tasks' => function($query) {
                    $query->where('is_active', true)->orderBy('order_number');
                },
            ])
            ->get();
    }

    protected function getActivityShareLinkUrl($activity): string
    {
        if (!$activity || !$activity->id) {
            return '';
        }

        if (isset($this->activityShareLinks[$activity->id])) {
            return $this->activityShareLinks[$activity->id];
        }

        try {
            $shareLink = ActivityShareLink::getOrCreatePermanent($activity->id, $this->currentUserId);
            $url = $shareLink->share_url;
            $this->activityShareLinks[$activity->id] = $url;
            return $url;
        } catch (\Exception $e) {
            \Log::warning('Failed to get/create share link for activity', [
                'activity_id' => $activity->id,
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    public function array(): array
    {
        $rows = [];
        $colCount = count(self::$columns);
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        // Header row 1: Title
        $rows[] = $this->padRow(['BÁO CÁO ĐỢT BÁO CÁO: ' . strtoupper($this->batch->name)], $colCount);

        // Header row 2: Subtitle
        $periodInfo = $this->getPeriodInfo();
        $rows[] = $this->padRow([$periodInfo], $colCount);

        // Header row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Header row 4: Column headers
        $headerRow = [];
        foreach (self::$columns as $col => $config) {
            $headerRow[] = $config['label'];
        }
        $rows[] = $headerRow;

        $currentRow = 5; // After header rows

        // Build KPI -> Activities map
        $kpiActivitiesMap = [];
        foreach ($this->activities as $activity) {
            foreach ($activity->kpis as $kpi) {
                if (!isset($kpiActivitiesMap[$kpi->id])) {
                    $kpiActivitiesMap[$kpi->id] = [
                        'kpi' => $kpi,
                        'activities' => [],
                    ];
                }
                $kpiActivitiesMap[$kpi->id]['activities'][] = $activity;
            }
        }

        // Get KPI Categories
        $categories = KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) use ($kpiActivitiesMap) {
                $query->where('is_active', true)
                    ->whereIn('id', array_keys($kpiActivitiesMap))
                    ->orderBy('order_number');
            }])
            ->get();

        $categoryIndex = 0;
        $kpiIndex = 1;

        foreach ($categories as $category) {
            if ($category->kpis->isEmpty()) continue;

            // Check if any KPI in this category has activities
            $hasActivities = false;
            foreach ($category->kpis as $kpi) {
                if (!empty($kpiActivitiesMap[$kpi->id])) {
                    $hasActivities = true;
                    break;
                }
            }
            if (!$hasActivities) continue;

            // Category header row
            $romanNumeral = $romanNumerals[$categoryIndex] ?? ($categoryIndex + 1);
            $categoryRow = $this->buildCategoryRow($romanNumeral, $category->name);
            $rows[] = $categoryRow;
            $this->categoryRows[] = $currentRow;
            $currentRow++;
            $categoryIndex++;

            // KPIs under this category
            foreach ($category->kpis as $kpi) {
                $kpiData = $kpiActivitiesMap[$kpi->id] ?? null;
                if (!$kpiData) continue;

                $kpiActivities = $kpiData['activities'];
                $firstActivity = array_shift($kpiActivities);

                // First activity row with KPI info
                $rows[] = $this->buildActivityRowWithKpi($kpiIndex, $kpi, $firstActivity);
                $currentRow++;

                // Additional activities
                foreach ($kpiActivities as $activity) {
                    $rows[] = $this->buildActivityRowOnly($activity);
                    $currentRow++;
                }

                $kpiIndex++;
            }
        }

        // Unlinked activities
        $unlinkedActivities = $this->activities->filter(fn($a) => $a->kpis->isEmpty());
        if ($unlinkedActivities->isNotEmpty()) {
            $rows[] = $this->buildCategoryRow('*', 'Hoạt động chưa liên kết KPI');
            $this->categoryRows[] = $currentRow;
            $currentRow++;

            foreach ($unlinkedActivities as $activity) {
                $rows[] = $this->buildActivityRowOnly($activity);
                $currentRow++;
            }
        }

        if ($this->activities->isEmpty()) {
            $rows[] = $this->padRow(['Không có hoạt động nào trong đợt báo cáo này'], $colCount);
        }

        // Statistics
        $rows[] = $this->padRow([''], $colCount);
        $rows = array_merge($rows, $this->buildStatistics($colCount));

        return $rows;
    }

    protected function getPeriodInfo(): string
    {
        $parts = [];

        if ($this->batch->start_date && $this->batch->end_date) {
            $parts[] = 'Thời gian: ' . Carbon::parse($this->batch->start_date)->format('d/m/Y H:i')
                     . ' - ' . Carbon::parse($this->batch->end_date)->format('d/m/Y H:i');
        }

        if ($this->batch->deadline) {
            $parts[] = 'Hạn nộp: ' . Carbon::parse($this->batch->deadline)->format('d/m/Y H:i');
        }

        if ($this->batch->organization) {
            $parts[] = 'Đơn vị: ' . ($this->batch->organization->short_name ?? $this->batch->organization->name);
        }

        return implode(' | ', $parts);
    }

    protected function buildCategoryRow($numeral, $categoryName): array
    {
        $row = [];
        $cols = array_keys(self::$columns);
        foreach ($cols as $col) {
            if ($col === 'stt') {
                $row[] = $numeral;
            } elseif ($col === 'nhiem_vu_trong_tam') {
                $row[] = $categoryName;
            } else {
                $row[] = '';
            }
        }
        return $row;
    }

    protected function buildActivityRowWithKpi($kpiIndex, $kpi, $activity): array
    {
        $kpiText = $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;

        // KPI Tasks
        $kpiTasksText = '';
        if ($kpi->tasks && $kpi->tasks->isNotEmpty()) {
            $lines = [];
            $index = 1;
            foreach ($kpi->tasks as $task) {
                $lines[] = "{$index}. {$task->title}";
                $index++;
            }
            $kpiTasksText = implode("\n", $lines);
        }

        return $this->buildRow($kpiIndex, $kpiText, $kpiTasksText, $activity);
    }

    protected function buildActivityRowOnly($activity): array
    {
        return $this->buildRow('', '', '', $activity);
    }

    protected function buildRow($stt, $kpiText, $kpiTasks, $activity): array
    {
        $row = [];
        $cols = array_keys(self::$columns);

        foreach ($cols as $col) {
            switch ($col) {
                case 'stt':
                    $row[] = $stt;
                    break;
                case 'nhiem_vu_trong_tam':
                    $row[] = $kpiText;
                    break;
                case 'noi_dung_cu_the':
                    $row[] = $kpiTasks;
                    break;
                case 'phuong_an_de_xuat':
                    $row[] = $activity ? $activity->title : '';
                    break;
                case 'time_period':
                    $timePeriod = '';
                    if ($activity && $activity->start_date && $activity->end_date) {
                        $timePeriod = Carbon::parse($activity->start_date)->format('d/m/Y')
                                    . ' - ' . Carbon::parse($activity->end_date)->format('d/m/Y');
                    }
                    $row[] = $timePeriod;
                    break;
                case 'organization':
                    $row[] = $activity && $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'partner_organizations':
                    $partnerOrgs = '';
                    if ($activity && $activity->collaboratingOrganizations && $activity->collaboratingOrganizations->count() > 0) {
                        $partnerOrgs = $activity->collaboratingOrganizations
                            ->map(fn($org) => $org->short_name ?? $org->name)
                            ->implode(', ');
                    }
                    $row[] = $partnerOrgs;
                    break;
                case 'status':
                    $statusLabels = [
                        'DRAFT' => 'Nháp',
                        'PENDING_APPROVAL' => 'Chờ duyệt',
                        'APPROVED' => 'Đã duyệt',
                        'IN_PROGRESS' => 'Đang thực hiện',
                        'COMPLETED' => 'Hoàn thành',
                    ];
                    $row[] = $activity ? ($statusLabels[$activity->status] ?? $activity->status) : '';
                    break;
                case 'completion_percentage':
                    $row[] = $activity && $activity->completion_percentage !== null
                        ? $activity->completion_percentage . '%'
                        : '';
                    break;
                case 'evidence_link':
                    $row[] = $activity ? $this->getActivityShareLinkUrl($activity) : '';
                    break;
                default:
                    $row[] = '';
            }
        }
        return $row;
    }

    protected function buildStatistics($colCount): array
    {
        $rows = [];
        $total = $this->activities->count();
        $completed = $this->activities->where('status', 'COMPLETED')->count();
        $inProgress = $this->activities->where('status', 'IN_PROGRESS')->count();
        $approved = $this->activities->where('status', 'APPROVED')->count();
        $pending = $this->activities->where('status', 'PENDING_APPROVAL')->count();
        $draft = $this->activities->where('status', 'DRAFT')->count();
        $avg = $total > 0 ? round($this->activities->avg('completion_percentage') ?? 0, 1) : 0;

        $rows[] = $this->padRow(['THỐNG KÊ'], $colCount);
        $rows[] = $this->padRow(['', "Tổng số hoạt động: {$total}"], $colCount);
        $rows[] = $this->padRow(['', "- Hoàn thành: {$completed}", "- Đang thực hiện: {$inProgress}", "- Đã duyệt: {$approved}"], $colCount);
        $rows[] = $this->padRow(['', "- Chờ duyệt: {$pending}", "- Nháp: {$draft}"], $colCount);
        $rows[] = $this->padRow(['', "Tiến độ trung bình: {$avg}%"], $colCount);
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
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
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
        return 'Danh sach hoat dong';
    }

    public function registerEvents(): array
    {
        $categoryRows = $this->categoryRows;
        $colCount = count(self::$columns);
        $lastCol = chr(ord('A') + $colCount - 1);

        return [
            AfterSheet::class => function (AfterSheet $event) use ($categoryRows, $lastCol) {
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

                // Style category rows
                foreach ($categoryRows as $row) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 11],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
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
