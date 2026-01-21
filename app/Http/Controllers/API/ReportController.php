<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Exports\ActivityReportExport;
use App\Exports\MultiOrgActivityReportExport;
use App\Models\ReportExport;
use App\Models\Activity;
use App\Models\Organization;
use App\Models\OrganizationAccessPermission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Get export history for current user's organization
     */
    public function getExportHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        $perPage = $request->input('per_page', 20);
        $query = ReportExport::with(['exporter:id,first_name,last_name,email'])
            ->byOrganization($user->organization_id)
            ->orderBy('exported_at', 'desc');

        // Filter by month/year if provided
        if ($request->has('month')) {
            $query->where('month', $request->input('month'));
        }
        if ($request->has('year')) {
            $query->where('year', $request->input('year'));
        }
        if ($request->has('view_mode')) {
            $query->where('view_mode', $request->input('view_mode'));
        }

        $exports = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $exports->items(),
            'pagination' => [
                'current_page' => $exports->currentPage(),
                'last_page' => $exports->lastPage(),
                'per_page' => $exports->perPage(),
                'total' => $exports->total(),
            ],
        ]);
    }

    /**
     * Get available export columns for a view mode
     */
    public function getExportColumns(Request $request): JsonResponse
    {
        $viewMode = $request->input('view_mode', 'activities');

        if (!in_array($viewMode, ['activities', 'kpis'])) {
            $viewMode = 'activities';
        }

        $availableColumns = ActivityReportExport::$availableColumns[$viewMode];
        $defaultColumns = ActivityReportExport::$defaultColumns[$viewMode];

        $columns = [];
        foreach ($availableColumns as $key => $config) {
            $columns[] = [
                'key' => $key,
                'label' => $config['label'],
                'default' => in_array($key, $defaultColumns),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'view_mode' => $viewMode,
                'columns' => $columns,
            ],
        ]);
    }

    /**
     * Get report statistics for dashboard
     */
    public function getReportStats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get activity counts by status for current month
        $now = Carbon::now();
        $activityStats = Activity::where('lead_organization_id', $user->organization_id)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Get total exports this month
        $exportsThisMonth = ReportExport::byOrganization($user->organization_id)
            ->whereMonth('exported_at', $now->month)
            ->whereYear('exported_at', $now->year)
            ->count();

        // Get last export
        $lastExport = ReportExport::byOrganization($user->organization_id)
            ->orderBy('exported_at', 'desc')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'activity_stats' => $activityStats,
                'total_activities' => array_sum($activityStats),
                'exports_this_month' => $exportsThisMonth,
                'last_export' => $lastExport ? [
                    'id' => $lastExport->id,
                    'file_name' => $lastExport->file_name,
                    'exported_at' => $lastExport->exported_at->format('d/m/Y H:i'),
                    'period' => $lastExport->period_label,
                ] : null,
            ],
        ]);
    }

    /**
     * Export activity report for user's organization
     */
    public function exportActivityReport(Request $request)
    {
        $user = $request->user();

        Log::info('=== Report Export: Activity Report ===', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_role' => $user->role,
            'organization_id' => $user->organization_id,
            'params' => $request->only(['period_type', 'month', 'quarter', 'year', 'view_mode', 'columns', 'notes', 'report_name']),
        ]);

        // Check if user has organization
        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get organization info
        $organization = $user->organization;
        if (!$organization) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin đơn vị',
            ], 404);
        }

        // Get period type (month, quarter, year)
        $periodType = $request->input('period_type', 'month');
        if (!in_array($periodType, ['month', 'quarter', 'year'])) {
            $periodType = 'month';
        }

        // Get year from request (required for all period types)
        $year = $request->input('year', Carbon::now()->year);
        if ($year < 2020 || $year > 2100) {
            return response()->json([
                'success' => false,
                'message' => 'Năm không hợp lệ',
            ], 400);
        }

        // Get month or quarter based on period type
        $month = null;
        $quarter = null;
        $startMonth = 1;
        $endMonth = 12;

        if ($periodType === 'month') {
            $month = $request->input('month', Carbon::now()->month);
            if ($month < 1 || $month > 12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tháng không hợp lệ (1-12)',
                ], 400);
            }
            $startMonth = $month;
            $endMonth = $month;
        } elseif ($periodType === 'quarter') {
            $quarter = $request->input('quarter', ceil(Carbon::now()->month / 3));
            if ($quarter < 1 || $quarter > 4) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quý không hợp lệ (1-4)',
                ], 400);
            }
            $startMonth = ($quarter - 1) * 3 + 1;
            $endMonth = $quarter * 3;
        }

        // Get view mode (activities or kpis)
        $viewMode = $request->input('view_mode', 'activities');
        if (!in_array($viewMode, ['activities', 'kpis'])) {
            $viewMode = 'activities';
        }

        // Get selected columns
        $selectedColumns = $request->input('columns');
        if (is_string($selectedColumns)) {
            $selectedColumns = explode(',', $selectedColumns);
        }
        if (!is_array($selectedColumns) || empty($selectedColumns)) {
            $selectedColumns = null; // Will use defaults
        }

        // Get custom report name
        $customReportName = $request->input('report_name');

        // Get excluded activity IDs (from preview modal)
        $excludedIds = $request->input('excluded_ids');
        if (is_string($excludedIds)) {
            $excludedIds = array_filter(explode(',', $excludedIds));
        }
        if (!is_array($excludedIds)) {
            $excludedIds = [];
        }

        // Get edited rows (from preview modal)
        // Format: [{ id: 'uuid', edits: { field: value, ... } }, ...]
        $editedRows = $request->input('edited_rows');
        if (!is_array($editedRows)) {
            $editedRows = [];
        }
        // Convert to map for easier lookup: id => edits
        $editedRowsMap = [];
        foreach ($editedRows as $row) {
            if (isset($row['id']) && isset($row['edits']) && is_array($row['edits'])) {
                $editedRowsMap[$row['id']] = $row['edits'];
            }
        }

        try {
            $organizationName = $organization->short_name ?? $organization->name;
            $viewModeLabel = $viewMode === 'kpis' ? 'KPI' : 'HD';

            // Build period label for filename
            if ($periodType === 'month') {
                $periodLabel = "T{$month}_{$year}";
                $periodDisplayLabel = "Tháng {$month}/{$year}";
            } elseif ($periodType === 'quarter') {
                $periodLabel = "Q{$quarter}_{$year}";
                $periodDisplayLabel = "Quý {$quarter}/{$year}";
            } else {
                $periodLabel = "Nam{$year}";
                $periodDisplayLabel = "Năm {$year}";
            }

            // Use custom name or default
            // Keep Vietnamese characters and common safe characters
            if ($customReportName && trim($customReportName) !== '') {
                // Remove only truly unsafe filename characters: \ / : * ? " < > |
                $fileName = preg_replace('/[\\\\\/\:\*\?\"\<\>\|]/', '_', trim($customReportName));
                $fileName = str_replace(' ', '_', $fileName) . ".xlsx";
            } else {
                $fileName = "BaoCao_NQ57_{$viewModeLabel}_{$organizationName}_{$periodLabel}.xlsx";
                // Remove only truly unsafe filename characters
                $fileName = preg_replace('/[\\\\\/\:\*\?\"\<\>\|]/', '_', $fileName);
            }

            // Build query for counting activities
            $query = Activity::where('lead_organization_id', $organization->id)
                ->whereYear('start_date', $year);

            if ($periodType === 'month') {
                $query->whereMonth('start_date', $month);
            } elseif ($periodType === 'quarter') {
                $query->whereRaw('MONTH(start_date) BETWEEN ? AND ?', [$startMonth, $endMonth]);
            }

            $activityCount = $query->count();

            Log::info('Generating report', [
                'organization_id' => $organization->id,
                'organization_name' => $organizationName,
                'period_type' => $periodType,
                'month' => $month,
                'quarter' => $quarter,
                'year' => $year,
                'view_mode' => $viewMode,
                'columns' => $selectedColumns,
                'filename' => $fileName,
                'activity_count' => $activityCount,
            ]);

            // Create the export instance
            $exportInstance = new ActivityReportExport(
                $organization->id,
                $organizationName,
                $startMonth,
                $year,
                $viewMode,
                $selectedColumns,
                $user->id,
                $endMonth, // Pass end month for quarter/year reports
                $excludedIds, // Pass excluded activity IDs
                $editedRowsMap // Pass edited rows map (id => edits)
            );

            // Generate unique file path for storage
            $storagePath = "reports/{$organization->id}/" . date('Y/m');
            $uniqueFileName = pathinfo($fileName, PATHINFO_FILENAME) . '_' . time() . '.xlsx';
            $fullStoragePath = "{$storagePath}/{$uniqueFileName}";

            // Store the file
            Excel::store($exportInstance, $fullStoragePath, 'local');

            // Get file size
            $fileSize = \Storage::disk('local')->size($fullStoragePath);

            // Create export record with file path
            $exportRecord = ReportExport::create([
                'organization_id' => $organization->id,
                'exported_by' => $user->id,
                'report_type' => 'activity',
                'view_mode' => $viewMode,
                'month' => $month ?? 0, // 0 for quarter/year reports
                'year' => $year,
                'selected_columns' => $selectedColumns,
                'file_name' => $fileName,
                'file_path' => $fullStoragePath,
                'file_size' => $fileSize,
                'activity_count' => $activityCount,
                'status' => 'completed',
                'notes' => $request->input('notes'),
                'exported_at' => now(),
            ]);

            // Return the file for download
            return Excel::download($exportInstance, $fileName);
        } catch (\Exception $e) {
            Log::error('Report export failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xuất báo cáo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available report periods (months/years with activities)
     */
    public function getReportPeriods(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get current and previous 12 months as options
        $periods = [];
        $now = Carbon::now();

        for ($i = 0; $i < 12; $i++) {
            $date = $now->copy()->subMonths($i);

            // Count activities for this period
            $count = Activity::where('lead_organization_id', $user->organization_id)
                ->whereMonth('start_date', $date->month)
                ->whereYear('start_date', $date->year)
                ->count();

            $periods[] = [
                'month' => $date->month,
                'year' => $date->year,
                'label' => "Tháng {$date->month}/{$date->year}",
                'activity_count' => $count,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'periods' => $periods,
                'organization' => [
                    'id' => $user->organization->id,
                    'name' => $user->organization->name,
                    'short_name' => $user->organization->short_name,
                ],
            ],
        ]);
    }


    /**
     * Preview activities for report before exporting
     * Returns data structured exactly like Excel export (Category -> KPI -> Activities)
     */
    public function previewActivities(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                "success" => false,
                "message" => "Bạn chưa được phân công vào đơn vị nào",
            ], 400);
        }

        $organization = $user->organization;

        // Get period type (month, quarter, year)
        $periodType = $request->input("period_type", "month");
        if (!in_array($periodType, ["month", "quarter", "year"])) {
            $periodType = "month";
        }

        // Get year from request
        $year = $request->input("year", Carbon::now()->year);

        // Get month or quarter based on period type
        $month = null;
        $quarter = null;
        $startMonth = 1;
        $endMonth = 12;

        if ($periodType === "month") {
            $month = $request->input("month", Carbon::now()->month);
            $startMonth = $month;
            $endMonth = $month;
        } elseif ($periodType === "quarter") {
            $quarter = $request->input("quarter", ceil(Carbon::now()->month / 3));
            $startMonth = ($quarter - 1) * 3 + 1;
            $endMonth = $quarter * 3;
        }

        // Build date range
        $startDate = Carbon::create($year, $startMonth, 1)->startOfMonth();
        $endDate = Carbon::create($year, $endMonth, 1)->endOfMonth();

        // Get all activities for the period
        $activities = Activity::with([
            "activityType:id,name",
            "leadOrganization:id,name,short_name",
            "kpis.kpiCategory",
            "collaboratingOrganizations:id,name,short_name",
        ])
            ->where("lead_organization_id", $organization->id)
            ->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            })
            ->orderBy("start_date", "asc")
            ->get();

        // Get KPI Categories with KPIs and their tasks
        $categories = \App\Models\KpiCategory::where('is_active', true)
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
        foreach ($activities as $activity) {
            foreach ($activity->kpis as $kpi) {
                if (!isset($kpiActivitiesMap[$kpi->id])) {
                    $kpiActivitiesMap[$kpi->id] = [];
                }
                $kpiActivitiesMap[$kpi->id][] = $activity;
            }
        }

        // Build preview rows (matching Excel structure)
        $previewRows = [];
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        $categoryIndex = 0;
        $kpiIndex = 1;
        $totalActivities = 0;

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
            $previewRows[] = [
                'type' => 'category',
                'roman_numeral' => $romanNumeral,
                'category_name' => $category->name,
                'category_id' => $category->id,
            ];
            $categoryIndex++;

            // KPIs under this category
            foreach ($category->kpis as $kpi) {
                $linkedActivities = $kpiActivitiesMap[$kpi->id] ?? [];
                if (empty($linkedActivities)) continue;

                // Format KPI Tasks as numbered list (chỉ hiển thị title, không có target_value)
                $kpiTasksText = '';
                if ($kpi->tasks && $kpi->tasks->count() > 0) {
                    $taskLines = [];
                    $taskIdx = 1;
                    foreach ($kpi->tasks as $task) {
                        $taskLines[] = "{$taskIdx}. {$task->title}";
                        $taskIdx++;
                    }
                    $kpiTasksText = implode("\n", $taskLines);
                }

                foreach ($linkedActivities as $idx => $activity) {
                    $isFirstActivity = ($idx === 0);

                    // Get leader name from leader_names field
                    $leaderName = '';
                    if (!empty($activity->leader_names) && is_array($activity->leader_names)) {
                        $leaderName = implode(', ', $activity->leader_names);
                    }

                    // Time period
                    $timePeriod = '';
                    if ($activity->start_date && $activity->end_date) {
                        $startYear = Carbon::parse($activity->start_date)->format('Y');
                        $endYear = Carbon::parse($activity->end_date)->format('Y');
                        $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
                    }

                    // Partner organizations
                    $partnerOrgs = $activity->collaboratingOrganizations
                        ? $activity->collaboratingOrganizations->map(fn($org) => $org->short_name ?? $org->name)->implode(', ')
                        : '';

                    // Result with completion percentage
                    $result = $activity->result_summary ?? '';
                    if ($activity->completion_percentage !== null && $activity->completion_percentage > 0) {
                        $result .= ($result ? " " : '') . "(Tiến độ: {$activity->completion_percentage}%)";
                    }

                    $previewRows[] = [
                        'type' => 'activity',
                        'id' => $activity->id,
                        'stt' => $isFirstActivity ? $kpiIndex : null,
                        'nhiem_vu_trong_tam' => $isFirstActivity
                            ? ($kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title)
                            : '',
                        'noi_dung_cu_the' => $isFirstActivity ? $kpiTasksText : '', // KPI Tasks (only for first row)
                        'noi_dung_hoat_dong' => $activity->description ?? '', // Activity description
                        'phuong_an_de_xuat' => $activity->title,
                        'time_period' => $timePeriod,
                        'budget' => $activity->budget,
                        'qualitative_target' => $activity->qualitative_target ?? '',
                        'quantitative_target' => $activity->quantitative_target ?? '',
                        'implementation_content' => $activity->focus_content ?? '',
                        'updated_at' => $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '',
                        'evidence_link' => '', // Will be generated during export
                        'leader' => $leaderName,
                        'organization' => $activity->leadOrganization
                            ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                            : '',
                        'partner_organizations' => $partnerOrgs,
                        'completion_date' => $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '',
                        'result_evaluation' => $result,
                        'status' => $activity->status,
                        'kpi_id' => $kpi->id,
                    ];
                    $totalActivities++;
                }
                $kpiIndex++;
            }
        }

        // Unlinked activities
        $unlinkedActivities = $activities->filter(fn($a) => $a->kpis->isEmpty());
        if ($unlinkedActivities->isNotEmpty()) {
            $previewRows[] = [
                'type' => 'category',
                'roman_numeral' => '*',
                'category_name' => 'Hoạt động chưa liên kết KPI',
                'category_id' => null,
            ];

            foreach ($unlinkedActivities as $activity) {
                // Get leader name from leader_names field
                $leaderName = '';
                if (!empty($activity->leader_names) && is_array($activity->leader_names)) {
                    $leaderName = implode(', ', $activity->leader_names);
                }

                $timePeriod = '';
                if ($activity->start_date && $activity->end_date) {
                    $startYear = Carbon::parse($activity->start_date)->format('Y');
                    $endYear = Carbon::parse($activity->end_date)->format('Y');
                    $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
                }

                $partnerOrgs = $activity->collaboratingOrganizations
                    ? $activity->collaboratingOrganizations->map(fn($org) => $org->short_name ?? $org->name)->implode(', ')
                    : '';

                $result = $activity->result_summary ?? '';
                if ($activity->completion_percentage !== null && $activity->completion_percentage > 0) {
                    $result .= ($result ? " " : '') . "(Tiến độ: {$activity->completion_percentage}%)";
                }

                $previewRows[] = [
                    'type' => 'activity',
                    'id' => $activity->id,
                    'stt' => null,
                    'nhiem_vu_trong_tam' => '',
                    'noi_dung_cu_the' => '', // No KPI Tasks for unlinked activities
                    'noi_dung_hoat_dong' => $activity->description ?? '', // Activity description
                    'phuong_an_de_xuat' => $activity->title,
                    'time_period' => $timePeriod,
                    'budget' => $activity->budget,
                    'qualitative_target' => $activity->qualitative_target ?? '',
                    'quantitative_target' => $activity->quantitative_target ?? '',
                    'implementation_content' => $activity->focus_content ?? '',
                    'updated_at' => $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '',
                    'evidence_link' => '',
                    'leader' => $leaderName,
                    'organization' => $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '',
                    'partner_organizations' => $partnerOrgs,
                    'completion_date' => $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '',
                    'result_evaluation' => $result,
                    'status' => $activity->status,
                    'kpi_id' => null,
                ];
                $totalActivities++;
            }
        }

        // Get status summary
        $statusSummary = [];
        foreach ($activities as $activity) {
            $status = $activity->status;
            $statusSummary[$status] = ($statusSummary[$status] ?? 0) + 1;
        }

        return response()->json([
            "success" => true,
            "data" => [
                "rows" => $previewRows,
                "summary" => [
                    "total" => $totalActivities,
                    "by_status" => $statusSummary,
                ],
                "organization" => [
                    "id" => $organization->id,
                    "name" => $organization->name,
                    "short_name" => $organization->short_name,
                ],
            ],
        ]);
    }

    /**
     * Download a previously exported report from history
     */
    public function downloadExport(Request $request, string $id)
    {
        $user = $request->user();

        $export = ReportExport::find($id);

        if (!$export) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy bản ghi xuất báo cáo',
            ], 404);
        }

        // Check permission - same organization
        if ($export->organization_id !== $user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tải file này',
            ], 403);
        }

        // Check if file exists
        if (!$export->file_path || !\Storage::disk('local')->exists($export->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File báo cáo không tồn tại hoặc đã bị xóa',
            ], 404);
        }

        // Return file for download
        $filePath = storage_path('app/' . $export->file_path);
        return response()->download($filePath, $export->file_name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Delete an export record
     */
    public function deleteExport(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $export = ReportExport::find($id);

        if (!$export) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy bản ghi xuất báo cáo',
            ], 404);
        }

        // Check permission
        if ($export->organization_id !== $user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa bản ghi này',
            ], 403);
        }

        // Only MANAGER+ can delete
        if (!in_array($user->role, ['MANAGER', 'OPERATOR', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Quản lý trở lên mới có thể xóa lịch sử xuất báo cáo',
            ], 403);
        }

        $export->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa bản ghi xuất báo cáo',
        ]);
    }

    /**
     * Get organizations that user has permission to export reports for
     */
    public function getAccessibleOrganizations(Request $request): JsonResponse
    {
        $user = $request->user();
        $accessibleOrgs = [];
        $hasAllAccess = false;

        // ADMIN và OPERATOR có quyền xem tất cả phòng ban
        if (in_array($user->role, ['ADMIN', 'OPERATOR'])) {
            $hasAllAccess = true;
            $allOrgs = Organization::where('status', 'active')
                ->orderBy('name')
                ->get();

            foreach ($allOrgs as $org) {
                $accessibleOrgs[] = [
                    'id' => $org->id,
                    'name' => $org->name,
                    'short_name' => $org->short_name,
                    'is_own' => $org->id === $user->organization_id,
                    'can_export' => true,
                    'can_view_details' => true,
                    'can_view_files' => true,
                    'can_view_budget' => true,
                ];
            }

            // Sort: own org first, then by name
            usort($accessibleOrgs, function ($a, $b) {
                if ($a['is_own'] !== $b['is_own']) {
                    return $a['is_own'] ? -1 : 1;
                }
                return strcmp($a['name'], $b['name']);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'organizations' => $accessibleOrgs,
                    'own_organization' => $user->organization ? [
                        'id' => $user->organization->id,
                        'name' => $user->organization->name,
                        'short_name' => $user->organization->short_name,
                    ] : null,
                    'has_all_access' => true,
                    'total_count' => count($accessibleOrgs),
                    'can_export_multi' => count($accessibleOrgs) > 1,
                ],
            ]);
        }

        // Các role khác (MANAGER, STAFF, USER) cần có organization_id
        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Always include own organization
        $ownOrg = $user->organization;
        if ($ownOrg) {
            $accessibleOrgs[] = [
                'id' => $ownOrg->id,
                'name' => $ownOrg->name,
                'short_name' => $ownOrg->short_name,
                'is_own' => true,
                'can_export' => true,
                'can_view_details' => true,
                'can_view_files' => true,
                'can_view_budget' => true,
            ];
        }

        // Check for export permissions via OrganizationAccessPermission
        $permissions = OrganizationAccessPermission::where('organization_id', $user->organization_id)
            ->active()
            ->valid()
            ->where('can_export', true)
            ->get();

        foreach ($permissions as $permission) {
            // Check role restriction
            if (!$permission->isRoleAllowed($user->role)) {
                continue;
            }

            // Get accessible organization IDs from this permission
            $orgIds = $permission->getAccessibleOrganizationIds();

            foreach ($orgIds as $orgId) {
                // Skip own organization (already added)
                if ($orgId === $user->organization_id) {
                    continue;
                }

                // Skip if already in list
                $alreadyAdded = collect($accessibleOrgs)->contains('id', $orgId);
                if ($alreadyAdded) {
                    continue;
                }

                $org = Organization::find($orgId);
                if ($org && $org->status === 'active') {
                    $accessibleOrgs[] = [
                        'id' => $org->id,
                        'name' => $org->name,
                        'short_name' => $org->short_name,
                        'is_own' => false,
                        'can_export' => true,
                        'can_view_details' => $permission->can_view_details ?? false,
                        'can_view_files' => $permission->can_view_files ?? false,
                        'can_view_budget' => $permission->can_view_budget ?? false,
                    ];
                }
            }
        }

        // Sort: own org first, then by name
        usort($accessibleOrgs, function ($a, $b) {
            if ($a['is_own'] !== $b['is_own']) {
                return $a['is_own'] ? -1 : 1;
            }
            return strcmp($a['name'], $b['name']);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'organizations' => $accessibleOrgs,
                'own_organization' => $ownOrg ? [
                    'id' => $ownOrg->id,
                    'name' => $ownOrg->name,
                    'short_name' => $ownOrg->short_name,
                ] : null,
                'has_all_access' => false,
                'total_count' => count($accessibleOrgs),
                'can_export_multi' => count($accessibleOrgs) > 1,
            ],
        ]);
    }

    /**
     * Export activity report for multiple organizations
     */
    public function exportMultiOrgReport(Request $request)
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get selected organization IDs
        $selectedOrgIds = $request->input('organization_ids');
        if (is_string($selectedOrgIds)) {
            $selectedOrgIds = array_filter(explode(',', $selectedOrgIds));
        }
        if (!is_array($selectedOrgIds) || empty($selectedOrgIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng chọn ít nhất một đơn vị',
            ], 400);
        }

        // Verify user has permission for all selected organizations
        $allowedOrgIds = $this->getExportableOrganizationIds($user);

        $invalidOrgs = array_diff($selectedOrgIds, $allowedOrgIds);
        if (!empty($invalidOrgs)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xuất báo cáo cho một số đơn vị đã chọn',
            ], 403);
        }

        // Get period parameters
        $periodType = $request->input('period_type', 'month');
        if (!in_array($periodType, ['month', 'quarter', 'year'])) {
            $periodType = 'month';
        }

        $year = $request->input('year', Carbon::now()->year);
        $month = null;
        $quarter = null;
        $startMonth = 1;
        $endMonth = 12;

        if ($periodType === 'month') {
            $month = $request->input('month', Carbon::now()->month);
            $startMonth = $month;
            $endMonth = $month;
        } elseif ($periodType === 'quarter') {
            $quarter = $request->input('quarter', ceil(Carbon::now()->month / 3));
            $startMonth = ($quarter - 1) * 3 + 1;
            $endMonth = $quarter * 3;
        }

        $viewMode = $request->input('view_mode', 'activities');
        $selectedColumns = $request->input('columns');
        if (is_string($selectedColumns)) {
            $selectedColumns = explode(',', $selectedColumns);
        }
        $customReportName = $request->input('report_name');

        $excludedIds = $request->input('excluded_ids');
        if (is_string($excludedIds)) {
            $excludedIds = array_filter(explode(',', $excludedIds));
        }
        if (!is_array($excludedIds)) {
            $excludedIds = [];
        }

        $editedRows = $request->input('edited_rows');
        if (!is_array($editedRows)) {
            $editedRows = [];
        }
        $editedRowsMap = [];
        foreach ($editedRows as $row) {
            if (isset($row['id']) && isset($row['edits']) && is_array($row['edits'])) {
                $editedRowsMap[$row['id']] = $row['edits'];
            }
        }

        try {
            $userOrg = $user->organization;
            $exporterOrgName = $userOrg->short_name ?? $userOrg->name;

            // Build period label for filename
            if ($periodType === 'month') {
                $periodLabel = "T{$month}_{$year}";
            } elseif ($periodType === 'quarter') {
                $periodLabel = "Q{$quarter}_{$year}";
            } else {
                $periodLabel = "Nam{$year}";
            }

            $viewModeLabel = $viewMode === 'kpis' ? 'KPI' : 'HD';

            // Use custom name or default
            if ($customReportName && trim($customReportName) !== '') {
                $fileName = preg_replace('/[\\\\\/\:\*\?\"\<\>\|]/', '_', trim($customReportName));
                $fileName = str_replace(' ', '_', $fileName) . ".xlsx";
            } else {
                $orgCount = count($selectedOrgIds);
                $fileName = "BaoCao_NQ57_TongHop_{$orgCount}DonVi_{$viewModeLabel}_{$periodLabel}.xlsx";
            }

            // Count activities
            $query = Activity::whereIn('lead_organization_id', $selectedOrgIds)
                ->whereYear('start_date', $year);

            if ($periodType === 'month') {
                $query->whereMonth('start_date', $month);
            } elseif ($periodType === 'quarter') {
                $query->whereRaw('MONTH(start_date) BETWEEN ? AND ?', [$startMonth, $endMonth]);
            }

            $activityCount = $query->count();

            Log::info('Generating multi-org report', [
                'user_id' => $user->id,
                'organization_ids' => $selectedOrgIds,
                'period_type' => $periodType,
                'year' => $year,
                'view_mode' => $viewMode,
                'activity_count' => $activityCount,
            ]);

            // Create export instance
            $exportInstance = new MultiOrgActivityReportExport(
                $selectedOrgIds,
                $exporterOrgName,
                $startMonth,
                $year,
                $viewMode,
                $selectedColumns,
                $user->id,
                $endMonth,
                $excludedIds,
                $editedRowsMap
            );

            // Generate unique file path for storage
            $storagePath = "reports/{$user->organization_id}/multi-org/" . date('Y/m');
            $uniqueFileName = pathinfo($fileName, PATHINFO_FILENAME) . '_' . time() . '.xlsx';
            $fullStoragePath = "{$storagePath}/{$uniqueFileName}";

            // Store the file
            Excel::store($exportInstance, $fullStoragePath, 'local');

            $fileSize = \Storage::disk('local')->size($fullStoragePath);

            // Create export record
            $exportRecord = ReportExport::create([
                'organization_id' => $user->organization_id,
                'exported_by' => $user->id,
                'report_type' => 'multi_org_activity',
                'view_mode' => $viewMode,
                'month' => $month ?? 0,
                'year' => $year,
                'selected_columns' => $selectedColumns,
                'file_name' => $fileName,
                'file_path' => $fullStoragePath,
                'file_size' => $fileSize,
                'activity_count' => $activityCount,
                'status' => 'completed',
                'notes' => $request->input('notes'),
                'exported_at' => now(),
                // Store which organizations were included
                'metadata' => json_encode([
                    'organization_ids' => $selectedOrgIds,
                    'organization_count' => count($selectedOrgIds),
                    'period_type' => $periodType,
                ]),
            ]);

            return Excel::download($exportInstance, $fileName);
        } catch (\Exception $e) {
            Log::error('Multi-org report export failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xuất báo cáo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Preview activities for multi-organization report
     */
    public function previewMultiOrgActivities(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được phân công vào đơn vị nào',
            ], 400);
        }

        // Get selected organization IDs
        $selectedOrgIds = $request->input('organization_ids');
        if (is_string($selectedOrgIds)) {
            $selectedOrgIds = array_filter(explode(',', $selectedOrgIds));
        }
        if (!is_array($selectedOrgIds) || empty($selectedOrgIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng chọn ít nhất một đơn vị',
            ], 400);
        }

        // Verify user has permission
        $allowedOrgIds = $this->getExportableOrganizationIds($user);
        $invalidOrgs = array_diff($selectedOrgIds, $allowedOrgIds);
        if (!empty($invalidOrgs)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem báo cáo cho một số đơn vị đã chọn',
            ], 403);
        }

        // Get period parameters
        $periodType = $request->input("period_type", "month");
        $year = $request->input("year", Carbon::now()->year);
        $month = null;
        $quarter = null;
        $startMonth = 1;
        $endMonth = 12;

        if ($periodType === "month") {
            $month = $request->input("month", Carbon::now()->month);
            $startMonth = $month;
            $endMonth = $month;
        } elseif ($periodType === "quarter") {
            $quarter = $request->input("quarter", ceil(Carbon::now()->month / 3));
            $startMonth = ($quarter - 1) * 3 + 1;
            $endMonth = $quarter * 3;
        }

        $startDate = Carbon::create($year, $startMonth, 1)->startOfMonth();
        $endDate = Carbon::create($year, $endMonth, 1)->endOfMonth();

        // Get all activities for selected organizations
        $activities = Activity::with([
            "activityType:id,name",
            "leadOrganization:id,name,short_name",
            "kpis.kpiCategory",
            "collaboratingOrganizations:id,name,short_name",
        ])
            ->whereIn("lead_organization_id", $selectedOrgIds)
            ->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            })
            ->orderBy("lead_organization_id")
            ->orderBy("start_date", "asc")
            ->get();

        // Get KPI Categories
        $categories = \App\Models\KpiCategory::where('is_active', true)
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
        foreach ($activities as $activity) {
            foreach ($activity->kpis as $kpi) {
                if (!isset($kpiActivitiesMap[$kpi->id])) {
                    $kpiActivitiesMap[$kpi->id] = [];
                }
                $kpiActivitiesMap[$kpi->id][] = $activity;
            }
        }

        // Build preview rows
        $previewRows = [];
        $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        $categoryIndex = 0;
        $kpiIndex = 1;
        $totalActivities = 0;

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
            $previewRows[] = [
                'type' => 'category',
                'roman_numeral' => $romanNumeral,
                'category_name' => $category->name,
                'category_id' => $category->id,
            ];
            $categoryIndex++;

            foreach ($category->kpis as $kpi) {
                $linkedActivities = $kpiActivitiesMap[$kpi->id] ?? [];
                if (empty($linkedActivities)) continue;

                $kpiTasksText = '';
                if ($kpi->tasks && $kpi->tasks->count() > 0) {
                    $taskLines = [];
                    $taskIdx = 1;
                    foreach ($kpi->tasks as $task) {
                        $taskLines[] = "{$taskIdx}. {$task->title}";
                        $taskIdx++;
                    }
                    $kpiTasksText = implode("\n", $taskLines);
                }

                foreach ($linkedActivities as $idx => $activity) {
                    $isFirstActivity = ($idx === 0);

                    $leaderName = '';
                    if (!empty($activity->leader_names) && is_array($activity->leader_names)) {
                        $leaderName = implode(', ', $activity->leader_names);
                    }

                    $timePeriod = '';
                    if ($activity->start_date && $activity->end_date) {
                        $startYear = Carbon::parse($activity->start_date)->format('Y');
                        $endYear = Carbon::parse($activity->end_date)->format('Y');
                        $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
                    }

                    $partnerOrgs = $activity->collaboratingOrganizations
                        ? $activity->collaboratingOrganizations->map(fn($org) => $org->short_name ?? $org->name)->implode(', ')
                        : '';

                    $result = $activity->result_summary ?? '';
                    if ($activity->completion_percentage !== null && $activity->completion_percentage > 0) {
                        $result .= ($result ? " " : '') . "(Tiến độ: {$activity->completion_percentage}%)";
                    }

                    $previewRows[] = [
                        'type' => 'activity',
                        'id' => $activity->id,
                        'stt' => $isFirstActivity ? $kpiIndex : null,
                        'nhiem_vu_trong_tam' => $isFirstActivity
                            ? ($kpi->code ? "[{$kpi->code}] {$kpi->title}" : $kpi->title)
                            : '',
                        'noi_dung_cu_the' => $isFirstActivity ? $kpiTasksText : '',
                        'noi_dung_hoat_dong' => $activity->description ?? '',
                        'phuong_an_de_xuat' => $activity->title,
                        'organization' => $activity->leadOrganization
                            ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                            : '',
                        'organization_id' => $activity->lead_organization_id,
                        'time_period' => $timePeriod,
                        'budget' => $activity->budget,
                        'qualitative_target' => $activity->qualitative_target ?? '',
                        'quantitative_target' => $activity->quantitative_target ?? '',
                        'implementation_content' => $activity->focus_content ?? '',
                        'updated_at' => $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '',
                        'evidence_link' => '',
                        'leader' => $leaderName,
                        'partner_organizations' => $partnerOrgs,
                        'completion_date' => $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '',
                        'result_evaluation' => $result,
                        'status' => $activity->status,
                        'kpi_id' => $kpi->id,
                    ];
                    $totalActivities++;
                }
                $kpiIndex++;
            }
        }

        // Unlinked activities
        $unlinkedActivities = $activities->filter(fn($a) => $a->kpis->isEmpty());
        if ($unlinkedActivities->isNotEmpty()) {
            $previewRows[] = [
                'type' => 'category',
                'roman_numeral' => '*',
                'category_name' => 'Hoạt động chưa liên kết KPI',
                'category_id' => null,
            ];

            foreach ($unlinkedActivities as $activity) {
                $leaderName = '';
                if (!empty($activity->leader_names) && is_array($activity->leader_names)) {
                    $leaderName = implode(', ', $activity->leader_names);
                }

                $timePeriod = '';
                if ($activity->start_date && $activity->end_date) {
                    $startYear = Carbon::parse($activity->start_date)->format('Y');
                    $endYear = Carbon::parse($activity->end_date)->format('Y');
                    $timePeriod = ($startYear === $endYear) ? $startYear : "{$startYear}-{$endYear}";
                }

                $partnerOrgs = $activity->collaboratingOrganizations
                    ? $activity->collaboratingOrganizations->map(fn($org) => $org->short_name ?? $org->name)->implode(', ')
                    : '';

                $result = $activity->result_summary ?? '';
                if ($activity->completion_percentage !== null && $activity->completion_percentage > 0) {
                    $result .= ($result ? " " : '') . "(Tiến độ: {$activity->completion_percentage}%)";
                }

                $previewRows[] = [
                    'type' => 'activity',
                    'id' => $activity->id,
                    'stt' => null,
                    'nhiem_vu_trong_tam' => '',
                    'noi_dung_cu_the' => '',
                    'noi_dung_hoat_dong' => $activity->description ?? '',
                    'phuong_an_de_xuat' => $activity->title,
                    'organization' => $activity->leadOrganization
                        ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                        : '',
                    'organization_id' => $activity->lead_organization_id,
                    'time_period' => $timePeriod,
                    'budget' => $activity->budget,
                    'qualitative_target' => $activity->qualitative_target ?? '',
                    'quantitative_target' => $activity->quantitative_target ?? '',
                    'implementation_content' => $activity->focus_content ?? '',
                    'updated_at' => $activity->updated_at ? Carbon::parse($activity->updated_at)->format('d/m/Y') : '',
                    'evidence_link' => '',
                    'leader' => $leaderName,
                    'partner_organizations' => $partnerOrgs,
                    'completion_date' => $activity->end_date ? Carbon::parse($activity->end_date)->format('d/m/Y') : '',
                    'result_evaluation' => $result,
                    'status' => $activity->status,
                    'kpi_id' => null,
                ];
                $totalActivities++;
            }
        }

        // Status summary
        $statusSummary = [];
        foreach ($activities as $activity) {
            $status = $activity->status;
            $statusSummary[$status] = ($statusSummary[$status] ?? 0) + 1;
        }

        // Organization summary
        $orgSummary = [];
        foreach ($activities as $activity) {
            $orgId = $activity->lead_organization_id;
            $orgName = $activity->leadOrganization
                ? ($activity->leadOrganization->short_name ?? $activity->leadOrganization->name)
                : 'Không xác định';
            if (!isset($orgSummary[$orgId])) {
                $orgSummary[$orgId] = ['name' => $orgName, 'count' => 0];
            }
            $orgSummary[$orgId]['count']++;
        }

        // Get organization names for reference
        $organizations = Organization::whereIn('id', $selectedOrgIds)
            ->select('id', 'name', 'short_name')
            ->get()
            ->map(fn($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'short_name' => $org->short_name,
            ]);

        return response()->json([
            "success" => true,
            "data" => [
                "rows" => $previewRows,
                "summary" => [
                    "total" => $totalActivities,
                    "by_status" => $statusSummary,
                    "by_organization" => array_values($orgSummary),
                ],
                "organizations" => $organizations,
            ],
        ]);
    }

    /**
     * Helper: Get organization IDs that user can export reports for
     */
    private function getExportableOrganizationIds($user): array
    {
        // ADMIN và OPERATOR có quyền xuất tất cả phòng ban
        if (in_array($user->role, ['ADMIN', 'OPERATOR'])) {
            return Organization::where('status', 'active')
                ->pluck('id')
                ->toArray();
        }

        $orgIds = [];

        // Always include own organization
        if ($user->organization_id) {
            $orgIds[] = $user->organization_id;
        }

        // Get from permissions
        $permissions = OrganizationAccessPermission::where('organization_id', $user->organization_id)
            ->active()
            ->valid()
            ->where('can_export', true)
            ->get();

        foreach ($permissions as $permission) {
            if (!$permission->isRoleAllowed($user->role)) {
                continue;
            }

            $accessibleIds = $permission->getAccessibleOrganizationIds();
            $orgIds = array_merge($orgIds, $accessibleIds);
        }

        return array_unique($orgIds);
    }
}
