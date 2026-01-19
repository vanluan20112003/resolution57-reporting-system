<?php

namespace App\Exports;

use App\Models\Activity;
use App\Models\ActivityShareLink;
use App\Models\KpiCategory;
use App\Models\Organization;
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

/**
 * Multi-Organization Activity Report Export
 * For users with permission to view activities from multiple organizations
 */
class MultiOrgActivityReportExport implements FromArray, WithStyles, WithColumnWidths, WithTitle, WithEvents
{
    protected $organizationIds; // Array of organization IDs to include
    protected $organizationNames; // Map of org ID => name for display
    protected $exporterOrgName; // Name of the exporter's organization
    protected $month;
    protected $endMonth;
    protected $year;
    protected $activities;
    protected $viewMode;
    protected $selectedColumns;
    protected $categoryRows = [];
    protected $kpiRows = [];
    protected $activityShareLinks = [];
    protected $currentUserId;
    protected $excludedIds = [];
    protected $editedRowsMap = [];

    // Available columns - includes organization column
    public static $availableColumns = [
        'activities' => [
            'stt' => ['label' => 'STT', 'width' => 6],
            'nhiem_vu_trong_tam' => ['label' => 'Nhiệm vụ trọng tâm', 'width' => 55],
            'noi_dung_cu_the' => ['label' => 'Nội dung cụ thể', 'width' => 45],
            'noi_dung_hoat_dong' => ['label' => 'Nội dung hoạt động', 'width' => 40],
            'phuong_an_de_xuat' => ['label' => 'Phương án đề xuất', 'width' => 45],
            'organization' => ['label' => 'Đơn vị chủ trì', 'width' => 22],
            'time_period' => ['label' => 'Thời gian thực hiện', 'width' => 18],
            'budget' => ['label' => 'Dự toán', 'width' => 16],
            'qualitative_target' => ['label' => 'Mục tiêu định tính', 'width' => 35],
            'quantitative_target' => ['label' => 'Mục tiêu định lượng', 'width' => 35],
            'implementation_content' => ['label' => 'Nội dung thực hiện trọng tâm', 'width' => 40],
            'updated_at' => ['label' => 'Thời gian cập nhật', 'width' => 14],
            'evidence_link' => ['label' => 'Link minh chứng', 'width' => 22],
            'leader' => ['label' => 'Lãnh đạo phụ trách', 'width' => 18],
            'partner_organizations' => ['label' => 'Đơn vị phối hợp', 'width' => 18],
            'completion_date' => ['label' => 'Thời gian hoàn thành', 'width' => 14],
            'result_evaluation' => ['label' => 'Kết quả đạt được', 'width' => 40],
        ],
        'kpis' => [
            'stt' => ['label' => 'STT', 'width' => 6],
            'nhiem_vu_trong_tam' => ['label' => 'Nhiệm vụ trọng tâm', 'width' => 55],
            'noi_dung_cu_the' => ['label' => 'Nội dung cụ thể', 'width' => 45],
            'noi_dung_hoat_dong' => ['label' => 'Nội dung hoạt động', 'width' => 40],
            'phuong_an_de_xuat' => ['label' => 'Phương án đề xuất', 'width' => 45],
            'organization' => ['label' => 'Đơn vị chủ trì', 'width' => 22],
            'time_period' => ['label' => 'Thời gian thực hiện', 'width' => 18],
            'budget' => ['label' => 'Dự toán', 'width' => 16],
            'qualitative_target' => ['label' => 'Mục tiêu định tính', 'width' => 35],
            'quantitative_target' => ['label' => 'Mục tiêu định lượng', 'width' => 35],
            'implementation_content' => ['label' => 'Nội dung thực hiện trọng tâm', 'width' => 40],
            'updated_at' => ['label' => 'Thời gian cập nhật', 'width' => 14],
            'evidence_link' => ['label' => 'Link minh chứng', 'width' => 22],
            'leader' => ['label' => 'Lãnh đạo phụ trách', 'width' => 18],
            'partner_organizations' => ['label' => 'Đơn vị phối hợp', 'width' => 18],
            'completion_date' => ['label' => 'Thời gian hoàn thành', 'width' => 14],
            'result_evaluation' => ['label' => 'Kết quả đạt được', 'width' => 40],
        ],
    ];

    // Default columns - organization is always included and highlighted
    public static $defaultColumns = [
        'activities' => [
            'stt', 'nhiem_vu_trong_tam', 'noi_dung_cu_the', 'noi_dung_hoat_dong', 'phuong_an_de_xuat',
            'organization', 'time_period', 'budget', 'qualitative_target', 'quantitative_target',
            'implementation_content', 'updated_at', 'evidence_link', 'leader',
            'partner_organizations', 'completion_date', 'result_evaluation'
        ],
        'kpis' => [
            'stt', 'nhiem_vu_trong_tam', 'noi_dung_cu_the', 'noi_dung_hoat_dong', 'phuong_an_de_xuat',
            'organization', 'time_period', 'budget', 'qualitative_target', 'quantitative_target',
            'implementation_content', 'updated_at', 'evidence_link', 'leader',
            'partner_organizations', 'completion_date', 'result_evaluation'
        ],
    ];

    public function __construct(
        array $organizationIds,
        string $exporterOrgName,
        $month = null,
        $year = null,
        $viewMode = 'activities',
        $selectedColumns = null,
        $currentUserId = null,
        $endMonth = null,
        $excludedIds = [],
        $editedRowsMap = []
    ) {
        $this->organizationIds = $organizationIds;
        $this->exporterOrgName = $exporterOrgName;
        $this->month = $month ?? Carbon::now()->month;
        $this->endMonth = $endMonth ?? $this->month;
        $this->year = $year ?? Carbon::now()->year;
        $this->viewMode = $viewMode;
        $this->selectedColumns = $selectedColumns ?? self::$defaultColumns[$viewMode];
        $this->currentUserId = $currentUserId;
        $this->excludedIds = $excludedIds ?? [];
        $this->editedRowsMap = $editedRowsMap ?? [];

        // Ensure 'organization' column is always included for multi-org reports
        if (!in_array('organization', $this->selectedColumns)) {
            // Insert after phuong_an_de_xuat if exists, otherwise at beginning
            $phuongAnIndex = array_search('phuong_an_de_xuat', $this->selectedColumns);
            if ($phuongAnIndex !== false) {
                array_splice($this->selectedColumns, $phuongAnIndex + 1, 0, 'organization');
            } else {
                array_unshift($this->selectedColumns, 'organization');
            }
        }

        $this->loadOrganizationNames();
        $this->loadActivities();
    }

    protected function loadOrganizationNames()
    {
        $orgs = Organization::whereIn('id', $this->organizationIds)->get();
        $this->organizationNames = [];
        foreach ($orgs as $org) {
            $this->organizationNames[$org->id] = $org->short_name ?? $org->name;
        }
    }

    protected function getEditedValue($activityId, string $field, $originalValue)
    {
        if (isset($this->editedRowsMap[$activityId]) && \array_key_exists($field, $this->editedRowsMap[$activityId])) {
            return $this->editedRowsMap[$activityId][$field];
        }
        return $originalValue;
    }

    protected function getPeriodLabel(): string
    {
        if ($this->month === $this->endMonth) {
            return "Tháng {$this->month} năm {$this->year}";
        } elseif ($this->endMonth - $this->month === 2) {
            $quarter = ceil($this->endMonth / 3);
            return "Quý {$quarter} năm {$this->year}";
        } else {
            if ($this->month === 1 && $this->endMonth === 12) {
                return "Năm {$this->year}";
            }
            return "Tháng {$this->month} - Tháng {$this->endMonth} năm {$this->year}";
        }
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

    protected function loadActivities()
    {
        $query = Activity::with([
            'activityType',
            'activityField',
            'leadOrganization',
            'collaboratingOrganizations',
            'kpis.kpiCategory',
            'kpis.tasks' => function($query) {
                $query->where('is_active', true)->orderBy('order_number');
            },
            'creator',
        ])
        ->whereIn('lead_organization_id', $this->organizationIds);

        if ($this->month && $this->year) {
            $startDate = Carbon::create($this->year, $this->month, 1)->startOfMonth();
            $endDate = Carbon::create($this->year, $this->endMonth, 1)->endOfMonth();

            $query->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            });
        }

        if (!empty($this->excludedIds)) {
            $query->whereNotIn('id', $this->excludedIds);
        }

        $this->activities = $query->orderBy('lead_organization_id')
            ->orderBy('start_date', 'asc')
            ->get();
    }

    public function array(): array
    {
        return $this->buildActivityView();
    }

    protected function buildActivityView(): array
    {
        $rows = [];
        $cols = $this->selectedColumns;
        $colConfig = self::$availableColumns['activities'];
        $colCount = \count($cols);
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        // Count organizations
        $orgCount = count($this->organizationIds);
        $orgListLabel = $orgCount > 3
            ? "{$orgCount} đơn vị"
            : implode(', ', array_slice(array_values($this->organizationNames), 0, 3));

        // Header row 1: Title
        $rows[] = $this->padRow(['BÁO CÁO TIẾN ĐỘ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT 57-NQ/TW'], $colCount);

        // Header row 2: Subtitle - dynamic based on period
        $periodLabel = $this->getPeriodLabel();
        $rows[] = $this->padRow(["{$periodLabel} - Báo cáo tổng hợp: {$orgListLabel}"], $colCount);

        // Header row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Header row 4-5: Column headers
        $headerRow1 = [];
        $headerRow2 = [];
        foreach ($cols as $col) {
            $label = $colConfig[$col]['label'] ?? $col;
            if ($col === 'qualitative_target') {
                $headerRow1[] = 'Mục tiêu';
                $headerRow2[] = 'Định tính';
            } elseif ($col === 'quantitative_target') {
                $headerRow1[] = '';
                $headerRow2[] = 'Định lượng';
            } else {
                $headerRow1[] = $label;
                $headerRow2[] = '';
            }
        }
        $rows[] = $headerRow1;
        $rows[] = $headerRow2;

        $currentRow = 6;

        // Get KPI Categories
        $categories = KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) {
                $query->where('is_active', true)
                    ->orderBy('order_number')
                    ->with(['tasks' => function($q) {
                        $q->where('is_active', true)->orderBy('order_number');
                    }]);
            }])
            ->get();

        // Build KPI -> Activities map
        $kpiActivitiesMap = [];
        foreach ($this->activities as $activity) {
            foreach ($activity->kpis as $kpi) {
                if (!isset($kpiActivitiesMap[$kpi->id])) {
                    $kpiActivitiesMap[$kpi->id] = [];
                }
                $kpiActivitiesMap[$kpi->id][] = $activity;
            }
        }

        $categoryIndex = 0;
        $kpiIndex = 1;

        foreach ($categories as $category) {
            if ($category->kpis->isEmpty()) continue;

            $hasActivities = false;
            foreach ($category->kpis as $kpi) {
                if (!empty($kpiActivitiesMap[$kpi->id])) {
                    $hasActivities = true;
                    break;
                }
            }
            if (!$hasActivities) continue;

            $romanNumeral = $romanNumerals[$categoryIndex] ?? ($categoryIndex + 1);
            $categoryRow = $this->buildCategoryRow($romanNumeral, $category->name, $cols);
            $rows[] = $categoryRow;
            $this->categoryRows[] = $currentRow;
            $currentRow++;
            $categoryIndex++;

            foreach ($category->kpis as $kpi) {
                $linkedActivities = $kpiActivitiesMap[$kpi->id] ?? [];
                if (empty($linkedActivities)) continue;

                $firstActivity = array_shift($linkedActivities);
                $kpiRowData = $this->buildActivityRowWithKpi($kpiIndex, $kpi, $firstActivity, $cols);
                $rows[] = $kpiRowData;
                $this->kpiRows[] = $currentRow;
                $currentRow++;

                foreach ($linkedActivities as $activity) {
                    $activityRow = $this->buildActivityRowOnly($activity, $cols);
                    $rows[] = $activityRow;
                    $currentRow++;
                }

                $kpiIndex++;
            }
        }

        // Unlinked activities
        $unlinkedActivities = $this->activities->filter(fn($a) => $a->kpis->isEmpty());
        if ($unlinkedActivities->isNotEmpty()) {
            $rows[] = $this->buildCategoryRow('*', 'Hoạt động chưa liên kết KPI', $cols);
            $this->categoryRows[] = $currentRow;
            $currentRow++;

            foreach ($unlinkedActivities as $activity) {
                $rows[] = $this->buildActivityRowOnly($activity, $cols);
                $currentRow++;
            }
        }

        if ($this->activities->isEmpty()) {
            $rows[] = $this->padRow(['Không có hoạt động nào trong kỳ báo cáo'], $colCount);
        }

        // Statistics
        $rows[] = $this->padRow([''], $colCount);
        $rows = array_merge($rows, $this->buildStatistics($colCount));

        return $rows;
    }

    protected function buildCategoryRow($numeral, $categoryName, $cols): array
    {
        $row = [];
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

    protected function buildActivityRowWithKpi($kpiIndex, $kpi, $activity, $cols): array
    {
        $leaderNames = '';
        $timePeriod = '';
        $result = '';
        $activityId = $activity ? $activity->id : null;

        if ($activity) {
            $leaderNames = \is_array($activity->leader_names)
                ? implode(', ', $activity->leader_names)
                : ($activity->leader_names ?? '');

            $timePeriod = $this->getEditedValue($activityId, 'time_period', null);
            if ($timePeriod === null && $activity->start_date && $activity->end_date) {
                $startYear = Carbon::parse($activity->start_date)->format('Y');
                $endYear = Carbon::parse($activity->end_date)->format('Y');
                $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
            }

            $result = $this->getEditedValue($activityId, 'result_evaluation', $activity->result_summary ?? '');
            if ($activity->completion_percentage !== null && $activity->completion_percentage > 0 && !isset($this->editedRowsMap[$activityId]['result_evaluation'])) {
                $result .= ($result ? "\n" : '') . "(Tiến độ: {$activity->completion_percentage}%)";
            }
        }

        $kpiText = $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
        if ($activityId) {
            $kpiText = $this->getEditedValue($activityId, 'nhiem_vu_trong_tam', $kpiText);
        }

        $kpiTasksText = $this->getKpiTasksText($kpi);

        $row = [];
        foreach ($cols as $col) {
            switch ($col) {
                case 'stt':
                    $row[] = $kpiIndex;
                    break;
                case 'nhiem_vu_trong_tam':
                    $row[] = $kpiText;
                    break;
                case 'noi_dung_cu_the':
                    $row[] = $this->getEditedValue($activityId, 'noi_dung_cu_the', $kpiTasksText);
                    break;
                case 'noi_dung_hoat_dong':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'noi_dung_hoat_dong', $activity->description ?? '') : '';
                    break;
                case 'phuong_an_de_xuat':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title) : '';
                    break;
                case 'organization':
                    // Organization name - prominently displayed
                    $row[] = $activity && $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'time_period':
                    $row[] = $timePeriod ?? '';
                    break;
                case 'budget':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'budget', $activity->budget ?? '') : '';
                    break;
                case 'qualitative_target':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'qualitative_target', $activity->qualitative_target ?? '') : '';
                    break;
                case 'quantitative_target':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'quantitative_target', $activity->quantitative_target ?? '') : '';
                    break;
                case 'implementation_content':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'implementation_content', $activity->focus_content ?? '') : '';
                    break;
                case 'updated_at':
                    $row[] = $activity && $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '';
                    break;
                case 'evidence_link':
                    $row[] = $activity ? $this->getActivityShareLinkUrl($activity) : '';
                    break;
                case 'leader':
                    $row[] = $activity ? $this->getEditedValue($activityId, 'leader', $leaderNames) : '';
                    break;
                case 'partner_organizations':
                    $partnerOrgs = '';
                    if ($activity && $activity->collaboratingOrganizations && $activity->collaboratingOrganizations->count() > 0) {
                        $partnerOrgs = $activity->collaboratingOrganizations
                            ->map(fn($org) => $org->short_name ?? $org->name)
                            ->implode(', ');
                    }
                    $row[] = $activity ? $this->getEditedValue($activityId, 'partner_organizations', $partnerOrgs) : '';
                    break;
                case 'completion_date':
                    $completionDate = $activity && $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '';
                    $row[] = $activity ? $this->getEditedValue($activityId, 'completion_date', $completionDate) : '';
                    break;
                case 'result_evaluation':
                    $row[] = $result;
                    break;
                default:
                    $row[] = '';
            }
        }
        return $row;
    }

    protected function getKpiTasksText($kpi): string
    {
        if (!$kpi || !$kpi->tasks || $kpi->tasks->isEmpty()) {
            return '';
        }

        $lines = [];
        $index = 1;
        foreach ($kpi->tasks as $task) {
            $lines[] = "{$index}. {$task->title}";
            $index++;
        }

        return implode("\n", $lines);
    }

    protected function buildActivityRowOnly($activity, $cols): array
    {
        $activityId = $activity->id;

        $leaderNames = \is_array($activity->leader_names)
            ? implode(', ', $activity->leader_names)
            : ($activity->leader_names ?? '');

        $timePeriod = $this->getEditedValue($activityId, 'time_period', null);
        if ($timePeriod === null && $activity->start_date && $activity->end_date) {
            $startYear = Carbon::parse($activity->start_date)->format('Y');
            $endYear = Carbon::parse($activity->end_date)->format('Y');
            $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
        }

        $result = $this->getEditedValue($activityId, 'result_evaluation', $activity->result_summary ?? '');
        if ($activity->completion_percentage !== null && $activity->completion_percentage > 0 && !isset($this->editedRowsMap[$activityId]['result_evaluation'])) {
            $result .= ($result ? "\n" : '') . "(Tiến độ: {$activity->completion_percentage}%)";
        }

        $row = [];
        foreach ($cols as $col) {
            switch ($col) {
                case 'stt':
                    $row[] = '';
                    break;
                case 'nhiem_vu_trong_tam':
                    $row[] = '';
                    break;
                case 'noi_dung_cu_the':
                    $row[] = '';
                    break;
                case 'noi_dung_hoat_dong':
                    $row[] = $this->getEditedValue($activityId, 'noi_dung_hoat_dong', $activity->description ?? '');
                    break;
                case 'phuong_an_de_xuat':
                    $row[] = $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title);
                    break;
                case 'organization':
                    // Organization name - always shown for each activity
                    $row[] = $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'time_period':
                    $row[] = $timePeriod ?? '';
                    break;
                case 'budget':
                    $row[] = $this->getEditedValue($activityId, 'budget', $activity->budget ?? '');
                    break;
                case 'qualitative_target':
                    $row[] = $this->getEditedValue($activityId, 'qualitative_target', $activity->qualitative_target ?? '');
                    break;
                case 'quantitative_target':
                    $row[] = $this->getEditedValue($activityId, 'quantitative_target', $activity->quantitative_target ?? '');
                    break;
                case 'implementation_content':
                    $row[] = $this->getEditedValue($activityId, 'implementation_content', $activity->focus_content ?? '');
                    break;
                case 'updated_at':
                    $row[] = $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '';
                    break;
                case 'evidence_link':
                    $row[] = $this->getActivityShareLinkUrl($activity);
                    break;
                case 'leader':
                    $row[] = $this->getEditedValue($activityId, 'leader', $leaderNames);
                    break;
                case 'partner_organizations':
                    $partnerOrgs = '';
                    if ($activity->collaboratingOrganizations && $activity->collaboratingOrganizations->count() > 0) {
                        $partnerOrgs = $activity->collaboratingOrganizations
                            ->map(fn($org) => $org->short_name ?? $org->name)
                            ->implode(', ');
                    }
                    $row[] = $this->getEditedValue($activityId, 'partner_organizations', $partnerOrgs);
                    break;
                case 'completion_date':
                    $completionDate = $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '';
                    $row[] = $this->getEditedValue($activityId, 'completion_date', $completionDate);
                    break;
                case 'result_evaluation':
                    $row[] = $result;
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

        // Statistics by organization
        $orgStats = $this->activities->groupBy('lead_organization_id')
            ->map(fn($items) => $items->count());

        $rows[] = $this->padRow(['THỐNG KÊ TỔNG HỢP'], $colCount);
        $rows[] = $this->padRow(['', "Tổng số hoạt động: {$total}"], $colCount);
        $rows[] = $this->padRow(['', "- Hoàn thành: {$completed}", "- Đang thực hiện: {$inProgress}", "- Đã duyệt: {$approved}"], $colCount);
        $rows[] = $this->padRow(['', "- Chờ duyệt: {$pending}", "- Nháp: {$draft}"], $colCount);
        $rows[] = $this->padRow(['', "Tiến độ trung bình: {$avg}%"], $colCount);
        $rows[] = $this->padRow([''], $colCount);

        // Per-organization stats
        $rows[] = $this->padRow(['THỐNG KÊ THEO ĐƠN VỊ'], $colCount);
        foreach ($orgStats as $orgId => $count) {
            $orgName = $this->organizationNames[$orgId] ?? 'Không xác định';
            $rows[] = $this->padRow(['', "- {$orgName}: {$count} hoạt động"], $colCount);
        }

        $rows[] = $this->padRow([''], $colCount);
        $rows[] = $this->padRow(['', "Xuất báo cáo bởi: {$this->exporterOrgName}"], $colCount);
        $rows[] = $this->padRow(['', "Thời gian: " . Carbon::now()->format('d/m/Y H:i:s')], $colCount);

        return $rows;
    }

    protected function padRow($row, $colCount): array
    {
        while (\count($row) < $colCount) {
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
                'font' => ['bold' => true, 'size' => 12],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            4 => [
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
            ],
            5 => [
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
        $colConfig = self::$availableColumns[$this->viewMode];
        $colLetter = 'A';

        foreach ($this->selectedColumns as $col) {
            $widths[$colLetter] = $colConfig[$col]['width'] ?? 15;
            $colLetter++;
        }

        return $widths;
    }

    public function title(): string
    {
        $mode = $this->viewMode === 'kpis' ? 'KPI' : 'HĐ';
        return "BC_NQ57_{$mode}_TongHop_T{$this->month}_{$this->year}";
    }

    public function registerEvents(): array
    {
        $categoryRows = $this->categoryRows;
        $colCount = \count($this->selectedColumns);
        $lastCol = \chr(\ord('A') + $colCount - 1);
        $viewMode = $this->viewMode;
        $selectedColumns = $this->selectedColumns;

        return [
            AfterSheet::class => function (AfterSheet $event) use ($categoryRows, $lastCol, $viewMode, $selectedColumns) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                $sheet->mergeCells("A1:{$lastCol}1");
                $sheet->mergeCells("A2:{$lastCol}2");

                $selectedCols = array_values($selectedColumns ?? self::$defaultColumns[$viewMode]);
                $qualIndex = array_search('qualitative_target', $selectedCols);
                $quantIndex = array_search('quantitative_target', $selectedCols);

                if ($qualIndex !== false && $quantIndex !== false) {
                    $qualCol = \chr(\ord('A') + $qualIndex);
                    $quantCol = \chr(\ord('A') + $quantIndex);
                    $sheet->mergeCells("{$qualCol}4:{$quantCol}4");
                }

                $sheet->getStyle("A4:{$lastCol}{$highestRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                ]);

                foreach ($categoryRows as $row) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 11],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
                    ]);
                }

                // Highlight organization column with light yellow background
                $orgIndex = array_search('organization', $selectedCols);
                if ($orgIndex !== false) {
                    $orgCol = \chr(\ord('A') + $orgIndex);
                    $sheet->getStyle("{$orgCol}6:{$orgCol}{$highestRow}")->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFF2CC']],
                        'font' => ['bold' => true],
                    ]);
                }

                $sheet->getStyle("A6:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $budgetIndex = array_search('budget', $selectedCols);
                if ($budgetIndex !== false) {
                    $budgetCol = \chr(\ord('A') + $budgetIndex);
                    $sheet->getStyle("{$budgetCol}6:{$budgetCol}{$highestRow}")
                        ->getNumberFormat()
                        ->setFormatCode('#,##0');
                }

                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(35);
                $sheet->getRowDimension(5)->setRowHeight(25);

                $sheet->freezePane('A6');
                $sheet->setAutoFilter("A5:{$lastCol}5");
            },
        ];
    }
}
