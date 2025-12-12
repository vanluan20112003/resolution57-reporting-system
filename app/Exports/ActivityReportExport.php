<?php

namespace App\Exports;

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

class ActivityReportExport implements FromArray, WithStyles, WithColumnWidths, WithTitle, WithEvents
{
    protected $organizationId;
    protected $organizationName;
    protected $month;
    protected $endMonth; // For quarter/year reports
    protected $year;
    protected $activities;
    protected $viewMode; // 'activities' or 'kpis'
    protected $selectedColumns;
    protected $categoryRows = [];
    protected $kpiRows = [];
    protected $activityShareLinks = []; // Cache share links by activity_id
    protected $currentUserId; // User ID for creating share links
    protected $excludedIds = []; // Activity IDs to exclude from export
    protected $editedRowsMap = []; // Map of activity ID => edited fields from preview

    // Available columns configuration - matching template structure
    // Nhiệm vụ trọng tâm = Category + KPIs combined
    // Nội dung cụ thể = Activity description
    // Phương án đề xuất = Activity title
    public static $availableColumns = [
        'activities' => [
            'stt' => ['label' => 'STT', 'width' => 6],
            'nhiem_vu_trong_tam' => ['label' => 'Nhiệm vụ trọng tâm', 'width' => 60],
            'noi_dung_cu_the' => ['label' => 'Nội dung cụ thể', 'width' => 50],
            'phuong_an_de_xuat' => ['label' => 'Phương án đề xuất (Chương trình/đề án)', 'width' => 50],
            'time_period' => ['label' => 'Thời gian thực hiện', 'width' => 20],
            'budget' => ['label' => 'Dự toán', 'width' => 18],
            'qualitative_target' => ['label' => 'Mục tiêu định tính', 'width' => 40],
            'quantitative_target' => ['label' => 'Mục tiêu định lượng', 'width' => 40],
            'implementation_content' => ['label' => 'Nội dung thực hiện trọng tâm', 'width' => 45],
            'updated_at' => ['label' => 'Thời gian cập nhật', 'width' => 15],
            'evidence_link' => ['label' => 'Link tài liệu minh chứng', 'width' => 25],
            'leader' => ['label' => 'Lãnh đạo phụ trách', 'width' => 20],
            'organization' => ['label' => 'Đơn vị chủ trì', 'width' => 18],
            'partner_organizations' => ['label' => 'Đơn vị phối hợp', 'width' => 18],
            'completion_date' => ['label' => 'Thời gian hoàn thành', 'width' => 15],
            'result_evaluation' => ['label' => 'Kết quả đạt được, đánh giá hiệu quả', 'width' => 45],
        ],
        'kpis' => [
            'stt' => ['label' => 'STT', 'width' => 6],
            'nhiem_vu_trong_tam' => ['label' => 'Nhiệm vụ trọng tâm', 'width' => 60],
            'noi_dung_cu_the' => ['label' => 'Nội dung cụ thể', 'width' => 50],
            'phuong_an_de_xuat' => ['label' => 'Phương án đề xuất (Chương trình/đề án)', 'width' => 50],
            'time_period' => ['label' => 'Thời gian thực hiện', 'width' => 20],
            'budget' => ['label' => 'Dự toán', 'width' => 18],
            'qualitative_target' => ['label' => 'Mục tiêu định tính', 'width' => 40],
            'quantitative_target' => ['label' => 'Mục tiêu định lượng', 'width' => 40],
            'implementation_content' => ['label' => 'Nội dung thực hiện trọng tâm', 'width' => 45],
            'updated_at' => ['label' => 'Thời gian cập nhật', 'width' => 15],
            'evidence_link' => ['label' => 'Link tài liệu minh chứng', 'width' => 25],
            'leader' => ['label' => 'Lãnh đạo phụ trách', 'width' => 20],
            'organization' => ['label' => 'Đơn vị chủ trì', 'width' => 18],
            'partner_organizations' => ['label' => 'Đơn vị phối hợp', 'width' => 18],
            'completion_date' => ['label' => 'Thời gian hoàn thành', 'width' => 15],
            'result_evaluation' => ['label' => 'Kết quả đạt được, đánh giá hiệu quả', 'width' => 45],
        ],
    ];

    // Default columns for each view mode
    public static $defaultColumns = [
        'activities' => [
            'stt', 'nhiem_vu_trong_tam', 'noi_dung_cu_the', 'phuong_an_de_xuat',
            'time_period', 'budget', 'qualitative_target', 'quantitative_target',
            'implementation_content', 'updated_at', 'evidence_link', 'leader',
            'organization', 'partner_organizations', 'completion_date', 'result_evaluation'
        ],
        'kpis' => [
            'stt', 'nhiem_vu_trong_tam', 'noi_dung_cu_the', 'phuong_an_de_xuat',
            'time_period', 'budget', 'qualitative_target', 'quantitative_target',
            'implementation_content', 'updated_at', 'evidence_link', 'leader',
            'organization', 'partner_organizations', 'completion_date', 'result_evaluation'
        ],
    ];

    public function __construct($organizationId, $organizationName, $month = null, $year = null, $viewMode = 'activities', $selectedColumns = null, $currentUserId = null, $endMonth = null, $excludedIds = [], $editedRowsMap = [])
    {
        $this->organizationId = $organizationId;
        $this->organizationName = $organizationName;
        $this->month = $month ?? Carbon::now()->month;
        $this->endMonth = $endMonth ?? $this->month; // Default to same month (single month report)
        $this->year = $year ?? Carbon::now()->year;
        $this->viewMode = $viewMode;
        $this->selectedColumns = $selectedColumns ?? self::$defaultColumns[$viewMode];
        $this->currentUserId = $currentUserId;
        $this->excludedIds = $excludedIds ?? [];
        $this->editedRowsMap = $editedRowsMap ?? [];

        $this->loadActivities();
    }

    /**
     * Get edited value for an activity field, or original value if not edited
     */
    protected function getEditedValue($activityId, string $field, $originalValue)
    {
        if (isset($this->editedRowsMap[$activityId]) && \array_key_exists($field, $this->editedRowsMap[$activityId])) {
            return $this->editedRowsMap[$activityId][$field];
        }
        return $originalValue;
    }

    /**
     * Get period label for report header based on month range
     */
    protected function getPeriodLabel(): string
    {
        if ($this->month === $this->endMonth) {
            // Single month
            return "Tháng {$this->month} năm {$this->year}";
        } elseif ($this->endMonth - $this->month === 2) {
            // Quarter (3 months)
            $quarter = ceil($this->endMonth / 3);
            return "Quý {$quarter} năm {$this->year}";
        } else {
            // Full year or custom range
            if ($this->month === 1 && $this->endMonth === 12) {
                return "Năm {$this->year}";
            }
            return "Tháng {$this->month} - Tháng {$this->endMonth} năm {$this->year}";
        }
    }

    /**
     * Get or create permanent share link URL for an activity
     * Caches the result to avoid duplicate queries/creations
     */
    protected function getActivityShareLinkUrl($activity): string
    {
        if (!$activity || !$activity->id) {
            return '';
        }

        // Check cache first
        if (isset($this->activityShareLinks[$activity->id])) {
            return $this->activityShareLinks[$activity->id];
        }

        try {
            // Get or create permanent share link (use current user as creator)
            $shareLink = ActivityShareLink::getOrCreatePermanent($activity->id, $this->currentUserId);
            $url = $shareLink->share_url;

            // Cache the result
            $this->activityShareLinks[$activity->id] = $url;

            return $url;
        } catch (\Exception $e) {
            // Log error but don't break the export
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
            'creator',
            'assignedUser',
        ])
        ->where('lead_organization_id', $this->organizationId);

        if ($this->month && $this->year) {
            // Support date range (for quarter/year reports)
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

        // Exclude specific activities (from preview modal)
        if (!empty($this->excludedIds)) {
            $query->whereNotIn('id', $this->excludedIds);
        }

        $this->activities = $query->orderBy('start_date', 'asc')->get();
    }

    public function array(): array
    {
        if ($this->viewMode === 'kpis') {
            return $this->buildKpiView();
        }
        return $this->buildActivityView();
    }

    protected function buildActivityView(): array
    {
        $rows = [];
        $cols = $this->selectedColumns;
        $colConfig = self::$availableColumns['activities'];
        $colCount = \count($cols);
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        // Header row 1: Title
        $rows[] = $this->padRow(['BÁO CÁO TIẾN ĐỘ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT 57-NQ/TW'], $colCount);

        // Header row 2: Subtitle - dynamic based on period
        $periodLabel = $this->getPeriodLabel();
        $rows[] = $this->padRow(["{$periodLabel} - Đơn vị: {$this->organizationName}"], $colCount);

        // Header row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Header row 4-5: Column headers (two-level)
        $headerRow1 = [];
        $headerRow2 = [];
        foreach ($cols as $col) {
            $label = $colConfig[$col]['label'] ?? $col;
            // Split headers with sub-headers
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

        $currentRow = 7; // After header rows

        // Get KPI Categories
        $categories = KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) {
                $query->where('is_active', true)->orderBy('order_number');
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

            // Check if any KPI in this category has activities
            $hasActivities = false;
            foreach ($category->kpis as $kpi) {
                if (!empty($kpiActivitiesMap[$kpi->id])) {
                    $hasActivities = true;
                    break;
                }
            }
            if (!$hasActivities) continue;

            // Category header row (I, II, III with category name)
            $romanNumeral = $romanNumerals[$categoryIndex] ?? ($categoryIndex + 1);
            $categoryRow = $this->buildCategoryRow($romanNumeral, $category->name, $cols);
            $rows[] = $categoryRow;
            $this->categoryRows[] = $currentRow;
            $currentRow++;
            $categoryIndex++;

            // KPIs under this category
            foreach ($category->kpis as $kpi) {
                $linkedActivities = $kpiActivitiesMap[$kpi->id] ?? [];
                if (empty($linkedActivities)) continue;

                // First activity row includes KPI info
                $firstActivity = array_shift($linkedActivities);
                $kpiRowData = $this->buildActivityRowWithKpi($kpiIndex, $kpi, $firstActivity, $cols);
                $rows[] = $kpiRowData;
                $this->kpiRows[] = $currentRow;
                $currentRow++;

                // Additional activity rows (KPI column empty)
                foreach ($linkedActivities as $activity) {
                    $activityRow = $this->buildActivityRowOnly($activity, $cols);
                    $rows[] = $activityRow;
                    $currentRow++;
                }

                $kpiIndex++;
            }
        }

        // Unlinked activities section
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

    /**
     * Build activity row with KPI info (first activity under a KPI)
     * nhiem_vu_trong_tam = KPI title
     * noi_dung_cu_the = Activity description
     * phuong_an_de_xuat = Activity title
     */
    protected function buildActivityRowWithKpi($kpiIndex, $kpi, $activity, $cols): array
    {
        // Prepare activity data
        $leaderNames = '';
        $timePeriod = '';
        $result = '';
        $activityId = $activity ? $activity->id : null;

        if ($activity) {
            $leaderNames = \is_array($activity->leader_names)
                ? implode(', ', $activity->leader_names)
                : ($activity->leader_names ?? '');
            if (empty($leaderNames) && $activity->assignedUser) {
                $leaderNames = $activity->assignedUser->full_name ??
                    ($activity->assignedUser->last_name . ' ' . $activity->assignedUser->first_name);
            }

            // Time period (can be edited)
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

        // KPI text (can be edited via nhiem_vu_trong_tam)
        $kpiText = $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
        if ($activityId) {
            $kpiText = $this->getEditedValue($activityId, 'nhiem_vu_trong_tam', $kpiText);
        }

        $row = [];
        foreach ($cols as $col) {
            switch ($col) {
                case 'stt':
                    $row[] = $kpiIndex;
                    break;
                case 'nhiem_vu_trong_tam':
                    // KPI title
                    $row[] = $kpiText;
                    break;
                case 'noi_dung_cu_the':
                    // Activity description (can be edited)
                    $row[] = $activity ? $this->getEditedValue($activityId, 'noi_dung_cu_the', $activity->description ?? '') : '';
                    break;
                case 'phuong_an_de_xuat':
                    // Activity title (can be edited)
                    $row[] = $activity ? $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title) : '';
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
                case 'organization':
                    $row[] = $activity && $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'partner_organizations':
                    // Lấy tên các đơn vị phối hợp (can be edited)
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

    /**
     * Build activity row only (additional activities under same KPI, no KPI info)
     */
    protected function buildActivityRowOnly($activity, $cols): array
    {
        $activityId = $activity->id;

        $leaderNames = \is_array($activity->leader_names)
            ? implode(', ', $activity->leader_names)
            : ($activity->leader_names ?? '');
        if (empty($leaderNames) && $activity->assignedUser) {
            $leaderNames = $activity->assignedUser->full_name ??
                ($activity->assignedUser->last_name . ' ' . $activity->assignedUser->first_name);
        }

        // Time period (can be edited)
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
                    $row[] = ''; // KPI already shown in previous row
                    break;
                case 'noi_dung_cu_the':
                    $row[] = $this->getEditedValue($activityId, 'noi_dung_cu_the', $activity->description ?? '');
                    break;
                case 'phuong_an_de_xuat':
                    $row[] = $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title);
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
                case 'organization':
                    $row[] = $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'partner_organizations':
                    // Lấy tên các đơn vị phối hợp (can be edited)
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

    // Keep old method for backward compatibility (unused now)
    protected function buildActivityRow($activity, $index, $cols): array
    {
        return $this->buildActivityRowOnly($activity, $cols);
    }

    protected function buildKpiView(): array
    {
        $rows = [];
        $cols = $this->selectedColumns;
        $colConfig = self::$availableColumns['kpis'];
        $colCount = \count($cols);
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        // Header row 1: Title
        $rows[] = $this->padRow(['BÁO CÁO TIẾN ĐỘ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT 57-NQ/TW'], $colCount);

        // Header row 2: Subtitle - dynamic based on period
        $periodLabel = $this->getPeriodLabel();
        $rows[] = $this->padRow(["{$periodLabel} - Đơn vị: {$this->organizationName}"], $colCount);

        // Header row 3: Empty
        $rows[] = $this->padRow([''], $colCount);

        // Header row 4-5: Column headers (two-level like template)
        $headerRow1 = [];
        $headerRow2 = [];
        foreach ($cols as $col) {
            $label = $colConfig[$col]['label'] ?? $col;
            // Split headers with sub-headers
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

        $currentRow = 7; // After header rows

        // Get KPI Categories
        $categories = KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) {
                $query->where('is_active', true)->orderBy('order_number');
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

            // Category header row (like template: I, II, III with category name)
            $romanNumeral = $romanNumerals[$categoryIndex] ?? ($categoryIndex + 1);
            $categoryRow = $this->buildCategoryRow($romanNumeral, $category->name, $cols);
            $rows[] = $categoryRow;
            $this->categoryRows[] = $currentRow;
            $currentRow++;
            $categoryIndex++;

            // KPIs
            foreach ($category->kpis as $kpi) {
                // Get activities for this KPI
                $linkedActivities = $kpiActivitiesMap[$kpi->id] ?? [];

                if (empty($linkedActivities)) {
                    // KPI row without activities
                    $kpiRowData = $this->buildKpiRow($kpiIndex, $category->name, $kpi, null, $cols);
                    $rows[] = $kpiRowData;
                    $this->kpiRows[] = $currentRow;
                    $currentRow++;
                } else {
                    // First activity row includes KPI info
                    $firstActivity = array_shift($linkedActivities);
                    $kpiRowData = $this->buildKpiRow($kpiIndex, $category->name, $kpi, $firstActivity, $cols);
                    $rows[] = $kpiRowData;
                    $this->kpiRows[] = $currentRow;
                    $currentRow++;

                    // Additional activity rows (KPI columns empty, show activity info)
                    foreach ($linkedActivities as $activity) {
                        $activityRow = $this->buildActivityUnderKpiRow($activity, $cols);
                        $rows[] = $activityRow;
                        $currentRow++;
                    }
                }

                $kpiIndex++;
            }
        }

        // Unlinked activities section
        $unlinkedActivities = $this->activities->filter(fn($a) => $a->kpis->isEmpty());
        if ($unlinkedActivities->isNotEmpty()) {
            $rows[] = $this->buildCategoryRow('*', 'Hoạt động chưa liên kết KPI', $cols);
            $this->categoryRows[] = $currentRow;
            $currentRow++;

            foreach ($unlinkedActivities as $activity) {
                $rows[] = $this->buildActivityUnderKpiRow($activity, $cols);
                $currentRow++;
            }
        }

        // Statistics
        $rows[] = $this->padRow([''], $colCount);
        $rows = array_merge($rows, $this->buildStatistics($colCount));

        return $rows;
    }

    /**
     * Build category header row
     */
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

    /**
     * Build KPI row with optional first activity (for KPI view mode)
     * nhiem_vu_trong_tam = KPI title only (Category shown in separate header row)
     * noi_dung_cu_the = Activity description
     * phuong_an_de_xuat = Activity title
     */
    protected function buildKpiRow($kpiIndex, $categoryName, $kpi, $activity, $cols): array
    {
        // Prepare activity data if exists
        $leaderNames = '';
        $timePeriod = '';
        $completionDate = '';
        $result = '';
        $activityId = $activity ? $activity->id : null;

        if ($activity) {
            $leaderNames = \is_array($activity->leader_names)
                ? implode(', ', $activity->leader_names)
                : ($activity->leader_names ?? '');
            if (empty($leaderNames) && $activity->assignedUser) {
                $leaderNames = $activity->assignedUser->full_name ??
                    ($activity->assignedUser->last_name . ' ' . $activity->assignedUser->first_name);
            }

            // Time period (can be edited)
            $timePeriod = $this->getEditedValue($activityId, 'time_period', null);
            if ($timePeriod === null && $activity->start_date && $activity->end_date) {
                $startYear = Carbon::parse($activity->start_date)->format('Y');
                $endYear = Carbon::parse($activity->end_date)->format('Y');
                $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
            }

            $completionDate = $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '';

            $result = $this->getEditedValue($activityId, 'result_evaluation', $activity->result_summary ?? '');
            if ($activity->completion_percentage !== null && $activity->completion_percentage > 0 && !isset($this->editedRowsMap[$activityId]['result_evaluation'])) {
                $result .= ($result ? "\n" : '') . "(Tiến độ: {$activity->completion_percentage}%)";
            }
        }

        // KPI text only (Category already shown in category header row)
        $kpiText = $kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title;
        if ($activityId) {
            $kpiText = $this->getEditedValue($activityId, 'nhiem_vu_trong_tam', $kpiText);
        }

        $row = [];
        foreach ($cols as $col) {
            switch ($col) {
                case 'stt':
                    $row[] = $kpiIndex;
                    break;
                case 'nhiem_vu_trong_tam':
                    // KPI title only (Category shown in header row)
                    $row[] = $kpiText;
                    break;
                case 'noi_dung_cu_the':
                    // Activity description (can be edited)
                    $row[] = $activity ? $this->getEditedValue($activityId, 'noi_dung_cu_the', $activity->description ?? '') : '';
                    break;
                case 'phuong_an_de_xuat':
                    // Activity title (can be edited)
                    $row[] = $activity ? $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title) : '';
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
                case 'organization':
                    $row[] = $activity && $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'partner_organizations':
                    // Lấy tên các đơn vị phối hợp (can be edited)
                    $partnerOrgs = '';
                    if ($activity && $activity->collaboratingOrganizations && $activity->collaboratingOrganizations->count() > 0) {
                        $partnerOrgs = $activity->collaboratingOrganizations
                            ->map(fn($org) => $org->short_name ?? $org->name)
                            ->implode(', ');
                    }
                    $row[] = $activity ? $this->getEditedValue($activityId, 'partner_organizations', $partnerOrgs) : '';
                    break;
                case 'completion_date':
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

    /**
     * Build activity row under KPI (for additional activities)
     */
    protected function buildActivityUnderKpiRow($activity, $cols): array
    {
        $activityId = $activity->id;

        $leaderNames = \is_array($activity->leader_names)
            ? implode(', ', $activity->leader_names)
            : ($activity->leader_names ?? '');
        if (empty($leaderNames) && $activity->assignedUser) {
            $leaderNames = $activity->assignedUser->full_name ??
                ($activity->assignedUser->last_name . ' ' . $activity->assignedUser->first_name);
        }

        // Time period (can be edited)
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
                    $row[] = ''; // Already shown in KPI row
                    break;
                case 'noi_dung_cu_the':
                    // Activity description (can be edited)
                    $row[] = $this->getEditedValue($activityId, 'noi_dung_cu_the', $activity->description ?? '');
                    break;
                case 'phuong_an_de_xuat':
                    // Activity title (can be edited)
                    $row[] = $this->getEditedValue($activityId, 'phuong_an_de_xuat', $activity->title);
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
                case 'organization':
                    $row[] = $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '';
                    break;
                case 'partner_organizations':
                    // Lấy tên các đơn vị phối hợp (can be edited)
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
        while (\count($row) < $colCount) {
            $row[] = '';
        }
        return $row;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            // Title row
            1 => [
                'font' => ['bold' => true, 'size' => 14],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ],
            // Subtitle row
            2 => [
                'font' => ['bold' => true, 'size' => 12],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            // Header row 1
            4 => [
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
            ],
            // Header row 2
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
        return "BC_NQ57_{$mode}_T{$this->month}_{$this->year}";
    }

    public function registerEvents(): array
    {
        $categoryRows = $this->categoryRows;
        $kpiRows = $this->kpiRows;
        $colCount = \count($this->selectedColumns);
        $lastCol = \chr(\ord('A') + $colCount - 1);
        $viewMode = $this->viewMode;

        return [
            AfterSheet::class => function (AfterSheet $event) use ($categoryRows, $kpiRows, $lastCol, $viewMode) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // Merge title cells
                $sheet->mergeCells("A1:{$lastCol}1");
                $sheet->mergeCells("A2:{$lastCol}2");

                // Merge header cells for "Mục tiêu" (columns G-H in default layout)
                // Find the qualitative_target column index
                $selectedCols = array_values($this->selectedColumns ?? self::$defaultColumns[$viewMode]);
                $qualIndex = array_search('qualitative_target', $selectedCols);
                $quantIndex = array_search('quantitative_target', $selectedCols);

                if ($qualIndex !== false && $quantIndex !== false) {
                    $qualCol = \chr(\ord('A') + $qualIndex);
                    $quantCol = \chr(\ord('A') + $quantIndex);
                    // Merge "Mục tiêu" header across both columns in row 4
                    $sheet->mergeCells("{$qualCol}4:{$quantCol}4");
                }

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

                // Style KPI rows
                foreach ($kpiRows as $row) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'font' => ['bold' => false],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']],
                    ]);
                }

                // Center STT column
                $sheet->getStyle("A6:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Format budget column as number with thousand separator (e.g., 3,940,000,000)
                $budgetIndex = array_search('budget', $selectedCols);
                if ($budgetIndex !== false) {
                    $budgetCol = \chr(\ord('A') + $budgetIndex);
                    $sheet->getStyle("{$budgetCol}6:{$budgetCol}{$highestRow}")
                        ->getNumberFormat()
                        ->setFormatCode('#,##0');
                }

                // Row heights
                $sheet->getRowDimension(1)->setRowHeight(30);
                $sheet->getRowDimension(4)->setRowHeight(35);
                $sheet->getRowDimension(5)->setRowHeight(25);

                // Freeze panes
                $sheet->freezePane('A6');

                // Auto filter
                $sheet->setAutoFilter("A5:{$lastCol}5");
            },
        ];
    }
}
