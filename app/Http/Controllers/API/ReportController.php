<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Exports\ActivityReportExport;
use App\Models\ReportExport;
use App\Models\Activity;
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

            // Create export record
            $exportRecord = ReportExport::create([
                'organization_id' => $organization->id,
                'exported_by' => $user->id,
                'report_type' => 'activity',
                'view_mode' => $viewMode,
                'month' => $month ?? 0, // 0 for quarter/year reports
                'year' => $year,
                'selected_columns' => $selectedColumns,
                'file_name' => $fileName,
                'activity_count' => $activityCount,
                'status' => 'completed',
                'notes' => $request->input('notes'),
                'exported_at' => now(),
            ]);

            return Excel::download(
                new ActivityReportExport(
                    $organization->id,
                    $organizationName,
                    $startMonth,
                    $year,
                    $viewMode,
                    $selectedColumns,
                    $user->id,
                    $endMonth, // Pass end month for quarter/year reports
                    $excludedIds // Pass excluded activity IDs
                ),
                $fileName
            );
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
            "assignedUser:id,first_name,last_name",
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

        // Get KPI Categories
        $categories = \App\Models\KpiCategory::where('is_active', true)
            ->orderBy('display_order')
            ->with(['kpis' => function($query) {
                $query->where('is_active', true)->orderBy('order_number');
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

                foreach ($linkedActivities as $idx => $activity) {
                    $isFirstActivity = ($idx === 0);

                    // Get leader name
                    $leaderName = '';
                    if ($activity->assignedUser) {
                        $leaderName = trim(($activity->assignedUser->last_name ?? '') . ' ' . ($activity->assignedUser->first_name ?? ''));
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
                        'noi_dung_cu_the' => $activity->description ?? '',
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
                $leaderName = '';
                if ($activity->assignedUser) {
                    $leaderName = trim(($activity->assignedUser->last_name ?? '') . ' ' . ($activity->assignedUser->first_name ?? ''));
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
                    'noi_dung_cu_the' => $activity->description ?? '',
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
}
