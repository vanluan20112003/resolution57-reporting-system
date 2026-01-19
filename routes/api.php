<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\API\GoogleAuthController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\KpiController;
use App\Http\Controllers\API\OrganizationController;
use App\Http\Controllers\API\ProfileController;
use App\Http\Controllers\API\ActivityTypeController;
use App\Http\Controllers\API\ActivityFieldController;
use App\Http\Controllers\API\ActivityController;
use App\Http\Controllers\API\FileTypeController;
use App\Http\Controllers\API\KpiCategoryController;
use App\Http\Controllers\API\ImportController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\ActivityShareLinkController;
use App\Http\Controllers\API\OrganizationAccessPermissionController;
use App\Http\Controllers\API\KpiTaskController;
use App\Http\Controllers\API\DocumentController;
use App\Http\Controllers\API\ActivityLogController;
use App\Http\Controllers\API\ReportBatchController;
use App\Http\Controllers\API\MaintenanceController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Public API routes
Route::prefix('v1')->group(function () {
    // Temporary route to seed view scopes (remove after use)
    Route::get('/seed-view-scopes', function () {
        $count = \DB::table('organization_view_scopes')->count();

        if ($count > 0) {
            return response()->json([
                'success' => true,
                'message' => "View scopes already exist ($count records)",
                'data' => \DB::table('organization_view_scopes')->get()
            ]);
        }

        $scopes = [
            [
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'name' => 'ALL_ORGANIZATIONS',
                'display_name' => 'Xem tất cả phòng ban',
                'description' => 'Có quyền xem hoạt động của tất cả các phòng ban trong hệ thống',
                'is_system' => true,
                'requires_specific_orgs' => false,
                'scope_type' => 'all',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'name' => 'SPECIFIC_ORGANIZATIONS',
                'display_name' => 'Xem phòng ban được chỉ định',
                'description' => 'Chỉ xem hoạt động của các phòng ban được chỉ định cụ thể',
                'is_system' => true,
                'requires_specific_orgs' => true,
                'scope_type' => 'custom',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'name' => 'PARENT_AND_CHILDREN',
                'display_name' => 'Xem phòng ban và các phòng ban con',
                'description' => 'Xem hoạt động của phòng ban và tất cả phòng ban trực thuộc',
                'is_system' => true,
                'requires_specific_orgs' => false,
                'scope_type' => 'group',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($scopes as $scope) {
            \DB::table('organization_view_scopes')->insert($scope);
        }

        return response()->json([
            'success' => true,
            'message' => 'Seeded ' . count($scopes) . ' view scopes',
            'data' => \DB::table('organization_view_scopes')->get()
        ]);
    });

    // Temporary route to seed all required data (remove after use)
    Route::get('/seed-all-data', function () {
        try {
        $results = [];

        // 1. Seed Activity Types if empty
        if (\DB::table('activity_types')->count() === 0) {
            $activityTypes = [
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Hội thảo/Hội nghị', 'code' => 'CONFERENCE', 'description' => 'Tổ chức hội thảo, hội nghị khoa học', 'is_active' => true, 'display_order' => 1],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Đào tạo/Tập huấn', 'code' => 'TRAINING', 'description' => 'Chương trình đào tạo, tập huấn nâng cao năng lực', 'is_active' => true, 'display_order' => 2],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Nghiên cứu khoa học', 'code' => 'RESEARCH', 'description' => 'Đề tài nghiên cứu khoa học các cấp', 'is_active' => true, 'display_order' => 3],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Dự án triển khai', 'code' => 'PROJECT', 'description' => 'Dự án triển khai ứng dụng công nghệ', 'is_active' => true, 'display_order' => 4],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Hợp tác quốc tế', 'code' => 'INTL_COOP', 'description' => 'Hoạt động hợp tác với đối tác quốc tế', 'is_active' => true, 'display_order' => 5],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Chuyển giao công nghệ', 'code' => 'TECH_TRANSFER', 'description' => 'Hoạt động chuyển giao công nghệ', 'is_active' => true, 'display_order' => 6],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Xây dựng hạ tầng', 'code' => 'INFRASTRUCTURE', 'description' => 'Xây dựng cơ sở hạ tầng KHCN', 'is_active' => true, 'display_order' => 7],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Khác', 'code' => 'OTHER', 'description' => 'Các hoạt động khác', 'is_active' => true, 'display_order' => 99],
            ];
            foreach ($activityTypes as $type) {
                $type['created_at'] = now();
                $type['updated_at'] = now();
                \DB::table('activity_types')->insert($type);
            }
            $results['activity_types'] = count($activityTypes) . ' types created';
        } else {
            $results['activity_types'] = 'Already exists (' . \DB::table('activity_types')->count() . ')';
        }

        // 2. Seed Activity Fields if empty
        if (\DB::table('activity_fields')->count() === 0) {
            $activityFields = [
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Trí tuệ nhân tạo (AI)', 'description' => 'Lĩnh vực AI, Machine Learning, Deep Learning', 'is_active' => true, 'display_order' => 1],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Công nghệ bán dẫn', 'description' => 'Vi mạch, chip, semiconductor', 'is_active' => true, 'display_order' => 2],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Công nghệ sinh học', 'description' => 'Biotechnology, y sinh', 'is_active' => true, 'display_order' => 3],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Năng lượng tái tạo', 'description' => 'Solar, wind, hydrogen', 'is_active' => true, 'display_order' => 4],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Vật liệu mới', 'description' => 'Advanced materials, nanomaterials', 'is_active' => true, 'display_order' => 5],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Internet vạn vật (IoT)', 'description' => 'IoT, embedded systems, sensors', 'is_active' => true, 'display_order' => 6],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Điện toán đám mây', 'description' => 'Cloud computing, distributed systems', 'is_active' => true, 'display_order' => 7],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'An ninh mạng', 'description' => 'Cybersecurity, information security', 'is_active' => true, 'display_order' => 8],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Dữ liệu lớn', 'description' => 'Big Data, Data Analytics', 'is_active' => true, 'display_order' => 9],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Chuyển đổi số', 'description' => 'Digital transformation', 'is_active' => true, 'display_order' => 10],
            ];
            foreach ($activityFields as $field) {
                $field['created_at'] = now();
                $field['updated_at'] = now();
                \DB::table('activity_fields')->insert($field);
            }
            $results['activity_fields'] = count($activityFields) . ' fields created';
        } else {
            $results['activity_fields'] = 'Already exists (' . \DB::table('activity_fields')->count() . ')';
        }

        // 3. Seed Organizations if less than 5
        if (\DB::table('organizations')->count() < 5) {
            $organizations = [
                ['name' => 'Trường Đại học Bách khoa', 'short_name' => 'HCMUT', 'code' => 'HCMUT', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học Bách khoa - ĐHQG-HCM'],
                ['name' => 'Trường Đại học Khoa học Tự nhiên', 'short_name' => 'HCMUS', 'code' => 'HCMUS', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học Khoa học Tự nhiên - ĐHQG-HCM'],
                ['name' => 'Trường Đại học Công nghệ Thông tin', 'short_name' => 'UIT', 'code' => 'UIT', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học Công nghệ Thông tin - ĐHQG-HCM'],
                ['name' => 'Trường Đại học Kinh tế - Luật', 'short_name' => 'UEL', 'code' => 'UEL', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học Kinh tế - Luật - ĐHQG-HCM'],
                ['name' => 'Trường Đại học Khoa học Xã hội và Nhân văn', 'short_name' => 'USSH', 'code' => 'USSH', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học KHXH&NV - ĐHQG-HCM'],
                ['name' => 'Trường Đại học Quốc tế', 'short_name' => 'IU', 'code' => 'IU', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học Quốc tế - ĐHQG-HCM'],
                ['name' => 'Trường Đại học An Giang', 'short_name' => 'AGU', 'code' => 'AGU', 'type' => 'UNIVERSITY', 'description' => 'Trường Đại học An Giang - ĐHQG-HCM'],
                ['name' => 'Viện Môi trường và Tài nguyên', 'short_name' => 'IER', 'code' => 'IER', 'type' => 'INSTITUTE', 'description' => 'Viện Môi trường và Tài nguyên - ĐHQG-HCM'],
                ['name' => 'Viện Công nghệ Nano', 'short_name' => 'INT', 'code' => 'INT', 'type' => 'INSTITUTE', 'description' => 'Viện Công nghệ Nano - ĐHQG-HCM'],
                ['name' => 'Phòng Khoa học Công nghệ', 'short_name' => 'KHCN', 'code' => 'KHCN', 'type' => 'OFFICE', 'description' => 'Phòng Khoa học Công nghệ - ĐHQG-HCM'],
                ['name' => 'Phòng Đào tạo', 'short_name' => 'PDT', 'code' => 'PDT', 'type' => 'OFFICE', 'description' => 'Phòng Đào tạo - ĐHQG-HCM'],
                ['name' => 'Phòng Kế hoạch Tài chính', 'short_name' => 'KHTC', 'code' => 'KHTC', 'type' => 'OFFICE', 'description' => 'Phòng Kế hoạch Tài chính - ĐHQG-HCM'],
                ['name' => 'Trung tâm Công nghệ Thông tin', 'short_name' => 'TTCNTT', 'code' => 'TTCNTT', 'type' => 'CENTER', 'description' => 'Trung tâm CNTT - ĐHQG-HCM'],
                ['name' => 'Trung tâm Sở hữu Trí tuệ', 'short_name' => 'SHTT', 'code' => 'SHTT', 'type' => 'CENTER', 'description' => 'Trung tâm Sở hữu Trí tuệ và Chuyển giao Công nghệ'],
                ['name' => 'Khu Công nghệ Phần mềm', 'short_name' => 'ITP', 'code' => 'ITP', 'type' => 'CENTER', 'description' => 'Khu Công nghệ Phần mềm ĐHQG-HCM'],
            ];

            $existingCount = \DB::table('organizations')->count();
            $newOrgs = 0;
            $updatedOrgs = 0;
            foreach ($organizations as $org) {
                // Check if already exists by code (unique field)
                $existing = \DB::table('organizations')->where('code', $org['code'])->first();
                if (!$existing) {
                    // Insert new organization
                    \DB::table('organizations')->insert([
                        'id' => \Illuminate\Support\Str::uuid()->toString(),
                        'name' => $org['name'],
                        'short_name' => $org['short_name'],
                        'code' => $org['code'],
                        'type' => $org['type'],
                        'description' => $org['description'],
                        'status' => 'active',
                        'is_vnuhcm' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $newOrgs++;
                } else {
                    // Update existing organization if missing type
                    if (empty($existing->type)) {
                        \DB::table('organizations')->where('id', $existing->id)->update([
                            'type' => $org['type'],
                            'updated_at' => now(),
                        ]);
                        $updatedOrgs++;
                    }
                }
            }
            $results['organizations'] = $newOrgs . ' new, ' . $updatedOrgs . ' updated (total: ' . \DB::table('organizations')->count() . ')';
        } else {
            $results['organizations'] = 'Already exists (' . \DB::table('organizations')->count() . ')';
        }

        // 4. Seed File Types if empty
        if (\DB::table('file_types')->count() === 0) {
            $fileTypes = [
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Báo cáo', 'code' => 'REPORT', 'description' => 'File báo cáo hoạt động', 'allowed_extensions' => json_encode(['pdf', 'doc', 'docx']), 'is_active' => true],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Hình ảnh', 'code' => 'IMAGE', 'description' => 'Hình ảnh minh họa', 'allowed_extensions' => json_encode(['jpg', 'jpeg', 'png', 'gif']), 'is_active' => true],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Tài liệu', 'code' => 'DOCUMENT', 'description' => 'Tài liệu đính kèm', 'allowed_extensions' => json_encode(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']), 'is_active' => true],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Video', 'code' => 'VIDEO', 'description' => 'Video ghi hình', 'allowed_extensions' => json_encode(['mp4', 'avi', 'mov']), 'is_active' => true],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'Khác', 'code' => 'OTHER', 'description' => 'Loại file khác', 'allowed_extensions' => json_encode(['*']), 'is_active' => true],
            ];
            foreach ($fileTypes as $type) {
                $type['created_at'] = now();
                $type['updated_at'] = now();
                \DB::table('file_types')->insert($type);
            }
            $results['file_types'] = count($fileTypes) . ' file types created';
        } else {
            $results['file_types'] = 'Already exists (' . \DB::table('file_types')->count() . ')';
        }

        // 5. Seed sample Users for organizations without users
        $orgsWithoutUsers = \DB::table('organizations')
            ->whereNotIn('id', function($query) {
                $query->select('organization_id')->from('nq57_users')->whereNotNull('organization_id');
            })
            ->where('status', 'active')
            ->get();

        $newUsers = 0;
        foreach ($orgsWithoutUsers as $org) {
            // Create a MANAGER for each org
            $managerId = \Illuminate\Support\Str::uuid()->toString();
            $shortName = strtolower($org->short_name ?? 'org');
            \DB::table('nq57_users')->insert([
                'id' => $managerId,
                'email' => "manager.{$shortName}@vnuhcm.edu.vn",
                'password_hash' => bcrypt('password123'),
                'first_name' => 'Quản lý',
                'last_name' => $org->short_name,
                'role' => 'MANAGER',
                'organization_id' => $org->id,
                'status' => 'active',
                'is_vnuhcm' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $newUsers++;

            // Create 2-3 STAFF for each org
            $numStaff = rand(2, 3);
            for ($i = 1; $i <= $numStaff; $i++) {
                \DB::table('nq57_users')->insert([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'email' => "staff{$i}.{$shortName}@vnuhcm.edu.vn",
                    'password_hash' => bcrypt('password123'),
                    'first_name' => "Nhân viên {$i}",
                    'last_name' => $org->short_name,
                    'role' => 'STAFF',
                    'organization_id' => $org->id,
                    'status' => 'active',
                    'is_vnuhcm' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $newUsers++;
            }
        }
        $results['users'] = $newUsers . ' new users created (total: ' . \DB::table('nq57_users')->count() . ')';

        // 6. Seed View Scopes
        if (\DB::table('organization_view_scopes')->count() === 0) {
            $scopes = [
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'ALL_ORGANIZATIONS', 'display_name' => 'Xem tất cả phòng ban', 'description' => 'Có quyền xem hoạt động của tất cả các phòng ban trong hệ thống', 'is_system' => true, 'requires_specific_orgs' => false, 'scope_type' => 'all', 'status' => 'active'],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'SPECIFIC_ORGANIZATIONS', 'display_name' => 'Xem phòng ban được chỉ định', 'description' => 'Chỉ xem hoạt động của các phòng ban được chỉ định cụ thể', 'is_system' => true, 'requires_specific_orgs' => true, 'scope_type' => 'custom', 'status' => 'active'],
                ['id' => \Illuminate\Support\Str::uuid()->toString(), 'name' => 'PARENT_AND_CHILDREN', 'display_name' => 'Xem phòng ban và các phòng ban con', 'description' => 'Xem hoạt động của phòng ban và tất cả phòng ban trực thuộc', 'is_system' => true, 'requires_specific_orgs' => false, 'scope_type' => 'group', 'status' => 'active'],
            ];
            foreach ($scopes as $scope) {
                $scope['created_at'] = now();
                $scope['updated_at'] = now();
                \DB::table('organization_view_scopes')->insert($scope);
            }
            $results['view_scopes'] = count($scopes) . ' view scopes created';
        } else {
            $results['view_scopes'] = 'Already exists (' . \DB::table('organization_view_scopes')->count() . ')';
        }

        return response()->json([
            'success' => true,
            'message' => 'Seed completed',
            'results' => $results
        ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Seed failed: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    });

    // Temporary route to seed sample activities (remove after use)
    Route::get('/seed-activities', function () {
        $organizations = \DB::table('organizations')->where('status', 'active')->get();
        $activityTypes = \DB::table('activity_types')->where('is_active', true)->get();
        $activityFields = \DB::table('activity_fields')->where('is_active', true)->get();
        $users = \DB::table('nq57_users')->where('status', 'active')->get();

        if ($organizations->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No organizations found']);
        }
        if ($activityTypes->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No activity types found']);
        }

        $statuses = ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED'];

        // Activity title templates
        $titleTemplates = [
            'Hội thảo khoa học về {topic}',
            'Triển khai dự án {topic}',
            'Đào tạo nâng cao năng lực {topic}',
            'Nghiên cứu và phát triển {topic}',
            'Hợp tác quốc tế trong lĩnh vực {topic}',
            'Chuyển đổi số trong {topic}',
            'Xây dựng quy trình {topic}',
            'Phát triển nguồn nhân lực {topic}',
            'Ứng dụng AI trong {topic}',
            'Tối ưu hóa hệ thống {topic}',
            'Nâng cấp cơ sở hạ tầng {topic}',
            'Triển khai giải pháp {topic}',
            'Đánh giá và cải tiến {topic}',
            'Xây dựng nền tảng {topic}',
            'Phát triển sản phẩm {topic}',
        ];

        $topics = [
            'trí tuệ nhân tạo', 'công nghệ bán dẫn', 'công nghệ sinh học',
            'năng lượng tái tạo', 'vật liệu mới', 'công nghệ nano',
            'internet vạn vật (IoT)', 'điện toán đám mây', 'blockchain',
            'an ninh mạng', 'dữ liệu lớn (Big Data)', 'robot và tự động hóa',
            'thực tế ảo (VR/AR)', 'công nghệ 5G', 'xe tự hành',
            'y tế số', 'nông nghiệp thông minh', 'thành phố thông minh',
            'fintech', 'edtech', 'logistics thông minh',
        ];

        $locations = [
            'Hội trường A - ĐHQG-HCM', 'Phòng họp 301 - Tòa nhà Điều hành',
            'Trung tâm Hội nghị ĐHQG-HCM', 'Khu Công nghệ cao TP.HCM',
            'Trường ĐH Bách Khoa', 'Trường ĐH Khoa học Tự nhiên',
            'Trường ĐH Công nghệ Thông tin', 'Viện Nghiên cứu ĐHQG-HCM',
            'Online qua MS Teams', 'Hybrid - Phòng họp + Online',
        ];

        $budgetSources = [
            'Ngân sách Nhà nước', 'Nguồn thu sự nghiệp', 'Tài trợ doanh nghiệp',
            'Quỹ phát triển KHCN', 'Hợp tác quốc tế', 'Nguồn xã hội hóa',
        ];

        $createdCount = 0;
        $year = 2025;

        // Generate activities for each organization
        foreach ($organizations as $org) {
            // Find a user from this organization to be creator
            $orgUsers = $users->where('organization_id', $org->id);
            $creator = $orgUsers->first() ?? $users->first();

            if (!$creator) continue;

            // Generate 5-15 activities per organization
            $numActivities = rand(5, 15);

            for ($i = 0; $i < $numActivities; $i++) {
                $activityType = $activityTypes->random();
                $activityField = $activityFields->isNotEmpty() ? $activityFields->random() : null;
                $status = $statuses[array_rand($statuses)];
                $topic = $topics[array_rand($topics)];
                $titleTemplate = $titleTemplates[array_rand($titleTemplates)];
                $title = str_replace('{topic}', $topic, $titleTemplate);

                // Generate dates
                $startMonth = rand(1, 12);
                $startDay = rand(1, 28);
                $startDate = \Carbon\Carbon::create($year, $startMonth, $startDay);
                $endDate = (clone $startDate)->addDays(rand(1, 90));

                // For completed activities, set actual dates
                $actualStartDate = null;
                $actualEndDate = null;
                $completionPercentage = 0;

                if ($status === 'COMPLETED') {
                    $actualStartDate = $startDate;
                    $actualEndDate = $endDate;
                    $completionPercentage = 100;
                } elseif ($status === 'IN_PROGRESS') {
                    $actualStartDate = $startDate;
                    $completionPercentage = rand(20, 80);
                } elseif ($status === 'APPROVED') {
                    $completionPercentage = 0;
                }

                // Generate unique code
                $code = 'NQ57-' . strtoupper(substr($org->short_name ?? $org->name, 0, 3)) . '-' . $year . '-' . str_pad($createdCount + 1, 4, '0', STR_PAD_LEFT);

                $activityId = \Illuminate\Support\Str::uuid()->toString();

                try {
                    \DB::table('activities')->insert([
                        'id' => $activityId,
                        'code' => $code,
                        'title' => $title,
                        'description' => "Hoạt động triển khai theo Nghị quyết 57-NQ/TW về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia. Hoạt động này thuộc đơn vị {$org->name}.",
                        'focus_content' => "Tập trung vào {$topic} với mục tiêu nâng cao năng lực nghiên cứu và ứng dụng công nghệ mới.",
                        'qualitative_target' => "Nâng cao năng lực đội ngũ, hoàn thiện quy trình, tăng cường hợp tác.",
                        'quantitative_target' => rand(1, 5) . " sản phẩm/báo cáo, " . rand(10, 100) . " người tham gia",
                        'activity_type_id' => $activityType->id,
                        'activity_field_id' => $activityField?->id,
                        'status' => $status,
                        'lead_organization_id' => $org->id,
                        'leader_names' => json_encode(['Trưởng đơn vị ' . $org->short_name]),
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'actual_start_date' => $actualStartDate,
                        'actual_end_date' => $actualEndDate,
                        'budget' => rand(50, 500) * 1000000, // 50-500 triệu
                        'budget_source' => $budgetSources[array_rand($budgetSources)],
                        'location' => $locations[array_rand($locations)],
                        'created_by' => $creator->id,
                        'approved_by' => $status !== 'DRAFT' ? $creator->id : null,
                        'approved_at' => $status !== 'DRAFT' ? now() : null,
                        'completion_percentage' => $completionPercentage,
                        'result_summary' => $status === 'COMPLETED' ? "Hoàn thành đúng tiến độ với kết quả đạt yêu cầu." : null,
                        'created_at' => now()->subDays(rand(1, 180)),
                        'updated_at' => now(),
                    ]);

                    $createdCount++;
                } catch (\Exception $e) {
                    // Skip duplicates
                    continue;
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Created {$createdCount} sample activities across " . $organizations->count() . " organizations",
            'data' => [
                'total_activities' => \DB::table('activities')->count(),
                'organizations_count' => $organizations->count(),
                'new_activities' => $createdCount,
            ]
        ]);
    });

    // Temporary route to seed organization permissions (remove after use)
    Route::get('/seed-permissions', function () {
        $organizations = \DB::table('organizations')->where('status', 'active')->get();

        if ($organizations->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No organizations found']);
        }

        // Get view scopes
        $allOrgScope = \DB::table('organization_view_scopes')
            ->where('name', 'ALL_ORGANIZATIONS')
            ->first();
        $specificOrgScope = \DB::table('organization_view_scopes')
            ->where('name', 'SPECIFIC_ORGANIZATIONS')
            ->first();

        if (!$allOrgScope || !$specificOrgScope) {
            return response()->json(['success' => false, 'message' => 'View scopes not found. Please run migrations first.']);
        }

        $createdCount = 0;
        $updatedCount = 0;

        // VNUHCM headquarters gets ALL_ORGANIZATIONS access
        $vnuhcm = $organizations->firstWhere('code', 'VNUHCM');
        if ($vnuhcm) {
            $existingPerm = \DB::table('organization_access_permissions')
                ->where('organization_id', $vnuhcm->id)
                ->first();

            if (!$existingPerm) {
                \DB::table('organization_access_permissions')->insert([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'organization_id' => $vnuhcm->id,
                    'view_scope_id' => $allOrgScope->id,
                    'target_organization_id' => null,
                    'target_organization_ids' => null,
                    'allowed_roles' => json_encode(['MANAGER', 'STAFF']),
                    'can_view_details' => true,
                    'can_view_files' => true,
                    'can_export' => true,
                    'can_view_participants' => true,
                    'can_view_budget' => true,
                    'status' => 'active',
                    'reason' => 'Đơn vị cấp trên - quyền xem tất cả',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $createdCount++;
            }
        }

        // Other universities get SPECIFIC_ORGANIZATIONS access to each other
        $universities = $organizations->filter(function ($org) {
            return in_array($org->type ?? '', ['UNIVERSITY', 'INSTITUTE']) && $org->code !== 'VNUHCM';
        });

        foreach ($universities as $org) {
            $existingPerm = \DB::table('organization_access_permissions')
                ->where('organization_id', $org->id)
                ->first();

            // Skip if permission already exists
            if ($existingPerm) {
                continue;
            }

            // Get other organization IDs to grant access to
            $otherOrgIds = $universities->filter(function ($o) use ($org) {
                return $o->id !== $org->id;
            })->pluck('id')->toArray();

            // Take up to 5 random orgs to create varied permissions
            shuffle($otherOrgIds);
            $targetOrgIds = array_slice($otherOrgIds, 0, min(5, count($otherOrgIds)));

            if (empty($targetOrgIds)) continue;

            \DB::table('organization_access_permissions')->insert([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'organization_id' => $org->id,
                'view_scope_id' => $specificOrgScope->id,
                'target_organization_id' => $targetOrgIds[0] ?? null,
                'target_organization_ids' => json_encode($targetOrgIds),
                'allowed_roles' => json_encode(['MANAGER', 'STAFF']),
                'can_view_details' => true,
                'can_view_files' => rand(0, 1) === 1,
                'can_export' => rand(0, 1) === 1,
                'can_view_participants' => true,
                'can_view_budget' => rand(0, 1) === 1,
                'status' => 'active',
                'reason' => 'Quyền xem các phòng ban liên quan',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $createdCount++;
        }

        // Count all permissions
        $totalPermissions = \DB::table('organization_access_permissions')->count();

        return response()->json([
            'success' => true,
            'message' => "Created {$createdCount} permissions, updated {$updatedCount}",
            'data' => [
                'total_permissions' => $totalPermissions,
                'new_permissions' => $createdCount,
                'updated_permissions' => $updatedCount,
                'organizations_with_permissions' => \DB::table('organization_access_permissions')
                    ->distinct('organization_id')
                    ->count('organization_id'),
            ]
        ]);
    });

    Route::get('/status', function () {
        try {
            // Test database connection
            DB::connection()->getPdo();
            $dbStatus = 'connected';
            $tables = DB::select('SHOW TABLES');
            $tableCount = count($tables);
        } catch (\Exception $e) {
            $dbStatus = 'disconnected';
            $tableCount = 0;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'NQ57 Portal API is running',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'connection' => config('database.default'),
                'tables' => $tableCount,
            ],
        ]);
    });

    // Health check
    Route::get('/health', function () {
        try {
            DB::connection()->getPdo();
            $dbHealth = 'up';
        } catch (\Exception $e) {
            $dbHealth = 'down';
        }

        return response()->json([
            'status' => 'healthy',
            'services' => [
                'api' => 'up',
                'database' => $dbHealth,
                'cache' => 'up',
            ],
            'timestamp' => now()->toIso8601String()
        ]);
    });

    // Activity Management Routes
    // All authenticated users can access (security handled in controller based on role/organization)
    Route::middleware('auth:sanctum')->prefix('activities')->group(function () {
        // Get form data (dropdown options) for creating/editing
        Route::get('/form-data', [ActivityController::class, 'getFormData']);

        // Get badge counts for notifications
        Route::get('/badge-counts', [ActivityController::class, 'getBadgeCounts']);

        // Attendance Template (MUST be before routes with {id} parameter)
        Route::get('/participants/template', [ActivityController::class, 'downloadAttendanceTemplate']);
        Route::get('/participants/template-info', [ActivityController::class, 'getAttendanceTemplateInfo']);

        // Export participants list to Excel
        Route::get('/{id}/participants/export', [ActivityController::class, 'exportParticipants']);

        // Get all approved activities from all organizations (public view)
        // MUST be before routes with {id} parameter
        Route::get('/all', [ActivityController::class, 'allApproved']);

        // List activities (filtered by user's organization for STAFF/MANAGER)
        Route::get('/', [ActivityController::class, 'index']);

        // Get single activity
        Route::get('/{id}', [ActivityController::class, 'show']);

        // Create new activity (STAFF, MANAGER, OPERATOR, ADMIN with organization)
        Route::post('/', [ActivityController::class, 'store']);

        // Update activity (security checked in controller)
        Route::put('/{id}', [ActivityController::class, 'update']);

        // Delete activity (only DRAFT status, security checked in controller)
        Route::delete('/{id}', [ActivityController::class, 'destroy']);

        // Submit activity for approval
        Route::post('/{id}/submit', [ActivityController::class, 'submitForApproval']);

        // Review activity - Step 1 (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/review', [ActivityController::class, 'review']);

        // Approve/Confirm activity - Step 2 (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/approve', [ActivityController::class, 'approve']);

        // Reject activity (MANAGER, OPERATOR, ADMIN only)
        Route::post('/{id}/reject', [ActivityController::class, 'reject']);

        // Lock activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/lock', [ActivityController::class, 'lock']);

        // Unlock activity (OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/unlock', [ActivityController::class, 'unlock']);

        // Postpone activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/postpone', [ActivityController::class, 'postpone']);

        // Cancel activity (MANAGER, OPERATOR, ADMIN only - checked in controller)
        Route::post('/{id}/cancel', [ActivityController::class, 'cancel']);

        // Uncancel activity (ADMIN only - checked in controller)
        Route::post('/{id}/uncancel', [ActivityController::class, 'uncancel']);

        // Activity Files Management
        Route::get('/{id}/files', [ActivityController::class, 'getFiles']);
        Route::post('/{id}/files/upload', [ActivityController::class, 'uploadFile']);
        Route::post('/{id}/files/link', [ActivityController::class, 'addLink']);
        Route::post('/{id}/files/batch', [ActivityController::class, 'batchAddFiles']);
        Route::put('/{id}/files/{fileId}', [ActivityController::class, 'updateFile']);
        Route::delete('/{id}/files/{fileId}', [ActivityController::class, 'deleteFile']);

        // Activity Participants Management
        Route::get('/{id}/participants', [ActivityController::class, 'getParticipants']);
        Route::post('/{id}/participants/upload', [ActivityController::class, 'uploadAttendanceList']);
        Route::delete('/{id}/participants', [ActivityController::class, 'deleteAttendanceList']);
        Route::post('/{id}/participants/send-invitations', [ActivityController::class, 'sendInvitations']);
        Route::post('/{id}/participants/resend-invitation', [ActivityController::class, 'resendInvitation']);
        Route::post('/{id}/participants/respond', [ActivityController::class, 'respondToInvitation']);

        // Add participants from organization groups
        Route::get('/{id}/participants/organization-groups', [ActivityController::class, 'getOrganizationUserGroups']);
        Route::post('/{id}/participants/add-from-group', [ActivityController::class, 'addParticipantsFromGroup']);

        // Update attendance for participants (mark who attended)
        Route::post('/{id}/participants/attendance', [ActivityController::class, 'updateParticipantsAttendance']);

        // Process attendance with new participants and file upload
        Route::post('/{id}/participants/process-attendance', [ActivityController::class, 'processAttendance']);

        // Activity Share Links Management
        Route::get('/{id}/share-links', [ActivityShareLinkController::class, 'index']);
        Route::post('/{id}/share-links', [ActivityShareLinkController::class, 'store']);
        Route::put('/{id}/share-links/{linkId}', [ActivityShareLinkController::class, 'update']);
        Route::delete('/{id}/share-links/{linkId}', [ActivityShareLinkController::class, 'destroy']);
    });

    // Shared Files Access (authenticated users with share token)
    Route::middleware('auth:sanctum')->get('/shared/files/{token}', [ActivityShareLinkController::class, 'accessSharedFiles']);

    // Organization Access Permissions Management Routes
    Route::middleware('auth:sanctum')->prefix('organization-permissions')->group(function () {
        // Get all view scopes (for dropdown in UI)
        Route::get('/scopes', [OrganizationAccessPermissionController::class, 'getViewScopes']);

        // Get accessible organizations for current user
        Route::get('/accessible-organizations', [OrganizationAccessPermissionController::class, 'getAccessibleOrganizations']);

        // Get permissions for current user's organization
        Route::get('/my-organization', [OrganizationAccessPermissionController::class, 'getMyOrganizationPermissions']);

        // Admin/Operator only routes
        Route::middleware('role:OPERATOR,ADMIN')->group(function () {
            // Get all permissions (with filters)
            Route::get('/', [OrganizationAccessPermissionController::class, 'index']);

            // Create new permission
            Route::post('/', [OrganizationAccessPermissionController::class, 'store']);

            // Update permission
            Route::put('/{id}', [OrganizationAccessPermissionController::class, 'update']);

            // Delete permission
            Route::delete('/{id}', [OrganizationAccessPermissionController::class, 'destroy']);
        });
    });

    // Accessible Activities Route (STAFF/MANAGER with permissions)
    Route::middleware('auth:sanctum')->get('/activities/accessible/all', [ActivityController::class, 'getAccessibleActivities']);

    // Authentication Routes
    Route::prefix('auth')->group(function () {
        // Email/Password Login
        Route::post('/login', [AuthController::class, 'login']);

        // Password Reset Routes
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);

        // Google OAuth Routes
        Route::prefix('google')->group(function () {
            Route::get('/redirect', [GoogleAuthController::class, 'redirectToGoogle']);
            Route::get('/callback', [GoogleAuthController::class, 'handleGoogleCallbackWeb']);
            Route::post('/exchange-code', [GoogleAuthController::class, 'exchangeCode']);
        });
    });

    // Protected Auth Routes
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // User Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('users')->group(function () {
        // View and list users
        Route::get('/', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::get('/{id}', [UserController::class, 'show'])->middleware('permission:users.view');

        // Create, update, delete users
        Route::post('/', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::put('/{id}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        // Start impersonation (ADMIN only)
        Route::post('/{id}/impersonate', [UserController::class, 'impersonate'])->middleware('role:ADMIN');
    });

    // Stop impersonation - Must be outside role:ADMIN group so impersonated users can call it
    Route::middleware('auth:sanctum')->post('/users/stop-impersonate', [UserController::class, 'stopImpersonate']);

    // User Profile Routes (All authenticated users can access their own profile)
    Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
        // Get current user profile
        Route::get('/', [ProfileController::class, 'show']);

        // Update current user profile (only allowed fields)
        Route::put('/', [ProfileController::class, 'update']);

        // Upload avatar
        Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);

        // Delete avatar
        Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
    });

    // KPI Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('kpis')->group(function () {
        // List all KPIs with filtering
        Route::get('/', [KpiController::class, 'index']);

        // Get KPI categories (deprecated - use /kpi-categories instead)
        Route::get('/categories', [KpiController::class, 'categories']);

        // Get single KPI
        Route::get('/{id}', [KpiController::class, 'show']);

        // Create new KPI
        Route::post('/', [KpiController::class, 'store']);

        // Update KPI
        Route::put('/{id}', [KpiController::class, 'update']);

        // Delete KPI
        Route::delete('/{id}', [KpiController::class, 'destroy']);

        // KPI Tasks (sub-tasks) Routes
        Route::prefix('{kpiId}/tasks')->group(function () {
            // List all tasks for a KPI
            Route::get('/', [KpiTaskController::class, 'index']);
            // Get single task
            Route::get('/{taskId}', [KpiTaskController::class, 'show']);
            // Create new task
            Route::post('/', [KpiTaskController::class, 'store']);
            // Update task
            Route::put('/{taskId}', [KpiTaskController::class, 'update']);
            // Delete task
            Route::delete('/{taskId}', [KpiTaskController::class, 'destroy']);
            // Batch create/update/delete tasks
            Route::post('/batch', [KpiTaskController::class, 'batchUpdate']);
            // Reorder tasks
            Route::post('/reorder', [KpiTaskController::class, 'reorder']);
        });
    });

    // KPI Category Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('kpi-categories')->group(function () {
        Route::get('/', [KpiCategoryController::class, 'index']);
        Route::get('/{id}', [KpiCategoryController::class, 'show']);
        Route::post('/', [KpiCategoryController::class, 'store']);
        Route::put('/{id}', [KpiCategoryController::class, 'update']);
        Route::delete('/{id}', [KpiCategoryController::class, 'destroy']);
    });

   // Organization simple list (all authenticated users - for filters/dropdowns)
    Route::middleware('auth:sanctum')->get('/organizations/list-simple', [OrganizationController::class, 'listSimple']);

   // Organization Management Routes (OPERATOR and ADMIN only)
    Route::middleware('auth:sanctum', 'role:OPERATOR,ADMIN')->prefix('organizations')->group(function(){
        Route::get("/",[OrganizationController::class,'index'])->middleware('permission:organizations.view');
        Route::get("/{id}",[OrganizationController::class,'show'])->middleware('permission:organizations.view');
        Route::post("/",[OrganizationController::class,'store'])->middleware('permission:organizations.create');
        Route::put("/{id}",[OrganizationController::class,'update'])->middleware('permission:organizations.update');
        Route::delete("/{id}",[OrganizationController::class,'destroy'])->middleware('permission:organizations.update');
    });

    // Notification Management Routes 
    Route::middleware('auth:sanctum')->prefix("notifications")->group(function(){
        Route::get("/", [NotificationController::class, 'show']);
        Route::put("/{id}/read", [NotificationController::class, 'read']);
        Route::put("/readAll", [NotificationController::class, 'readAll']);
    });

    // My Organization Routes (STAFF, MANAGER can view/edit their own organization)
    Route::middleware('auth:sanctum')->prefix('my-organization')->group(function () {
        // Get current user's organization profile
        Route::get('/', [OrganizationController::class, 'getMyOrganization']);

        // Update organization basic info (STAFF, MANAGER only)
        Route::put('/', [OrganizationController::class, 'updateMyOrganization']);

        // Upload organization avatar
        Route::post('/avatar', [OrganizationController::class, 'uploadAvatar']);

        // Delete organization avatar
        Route::delete('/avatar', [OrganizationController::class, 'deleteAvatar']);

        // Upload organization cover image
        Route::post('/cover', [OrganizationController::class, 'uploadCoverImage']);

        // Get organization members (STAFF, MANAGER, OPERATOR, ADMIN)
        Route::get('/members', [OrganizationController::class, 'getMyOrganizationMembers']);

        // Update member role (MANAGER can promote GUEST to STAFF or demote)
        Route::put('/members/{memberId}/role', [OrganizationController::class, 'updateMemberRole']);

        // Add single member by email
        Route::post('/members', [OrganizationController::class, 'addMember']);

        // Remove member from organization
        Route::delete('/members/{memberId}', [OrganizationController::class, 'removeMember']);

        // Import members from Excel
        Route::get('/members/import/template-info', [OrganizationController::class, 'getMemberImportTemplateInfo']);
        Route::get('/members/import/template', [OrganizationController::class, 'downloadMemberImportTemplate']);
        Route::post('/members/import', [OrganizationController::class, 'importMembers']);
    });

    // Activity Type Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('activity-types')->group(function () {
        Route::get('/', [ActivityTypeController::class, 'index']);
        Route::get('/{id}', [ActivityTypeController::class, 'show']);
        Route::post('/', [ActivityTypeController::class, 'store']);
        Route::put('/{id}', [ActivityTypeController::class, 'update']);
        Route::delete('/{id}', [ActivityTypeController::class, 'destroy']);
    });

    // Activity Field Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('activity-fields')->group(function () {
        Route::get('/', [ActivityFieldController::class, 'index']);
        Route::get('/{id}', [ActivityFieldController::class, 'show']);
        Route::post('/', [ActivityFieldController::class, 'store']);
        Route::put('/{id}', [ActivityFieldController::class, 'update']);
        Route::delete('/{id}', [ActivityFieldController::class, 'destroy']);
    });

    // File Type Management Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('file-types')->group(function () {
        Route::get('/', [FileTypeController::class, 'index']);
        Route::get('/{id}', [FileTypeController::class, 'show']);
        Route::post('/', [FileTypeController::class, 'store']);
        Route::put('/{id}', [FileTypeController::class, 'update']);
        Route::delete('/{id}', [FileTypeController::class, 'destroy']);
    });

    // Import Excel Routes (OPERATOR and ADMIN only)
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('import')->group(function () {
        // Get template info for a type
        Route::get('/template-info', [ImportController::class, 'getTemplateInfo']);

        // Download template file
        Route::get('/template', [ImportController::class, 'downloadTemplate']);

        // Import data from Excel
        Route::post('/', [ImportController::class, 'import']);
    });

    // Report Management Routes (STAFF+ only - users must have organization)
    Route::middleware(['auth:sanctum', 'role:STAFF,MANAGER,OPERATOR,ADMIN'])->prefix('reports')->group(function () {
        // Get available report periods with activity counts
        Route::get('/periods', [ReportController::class, 'getReportPeriods']);

        // Get available export columns for a view mode
        Route::get('/columns', [ReportController::class, 'getExportColumns']);

        // Get export history for current user's organization
        Route::get('/history', [ReportController::class, 'getExportHistory']);

        // Get report statistics for dashboard
        Route::get('/stats', [ReportController::class, 'getReportStats']);

        // Preview activities before exporting
        Route::get('/preview', [ReportController::class, 'previewActivities']);

        // Export activity report (creates history record)
        // Using POST to support sending edited_rows data in request body
        Route::post('/export', [ReportController::class, 'exportActivityReport']);

        // Download export file from history
        Route::get('/history/{id}/download', [ReportController::class, 'downloadExport']);

        // Delete export history record (MANAGER+ only)
        Route::delete('/history/{id}', [ReportController::class, 'deleteExport']);

        // Multi-organization report routes (for users with cross-org permissions)
        Route::get('/multi-org/accessible-organizations', [ReportController::class, 'getAccessibleOrganizations']);
        Route::get('/multi-org/preview', [ReportController::class, 'previewMultiOrgActivities']);
        Route::post('/multi-org/export', [ReportController::class, 'exportMultiOrgReport']);

        // Report Batches (Đợt báo cáo)
        Route::prefix('batches')->group(function () {
            // Collaborator endpoints (đơn vị phối hợp) - MUST be before {id} routes
            Route::get('/collaborator', [ReportBatchController::class, 'collaboratorBatches']);
            Route::get('/collaborator/summary', [ReportBatchController::class, 'collaboratorSummary']);
            Route::get('/collaborator/{id}', [ReportBatchController::class, 'showForCollaborator']);

            // List batches
            Route::get('/', [ReportBatchController::class, 'index']);
            // Get available activities for adding to batch
            Route::get('/available-activities', [ReportBatchController::class, 'getAvailableActivities']);
            // Get activities grouped by KPI structure
            Route::get('/activities-by-kpi', [ReportBatchController::class, 'getActivitiesByKpi']);
            // Create new batch
            Route::post('/', [ReportBatchController::class, 'store']);
            // Get single batch with activities
            Route::get('/{id}', [ReportBatchController::class, 'show']);
            // Update batch
            Route::put('/{id}', [ReportBatchController::class, 'update']);
            // Delete batch
            Route::delete('/{id}', [ReportBatchController::class, 'destroy']);
            // Add activities to batch
            Route::post('/{id}/activities', [ReportBatchController::class, 'addActivities']);
            // Remove activity from batch
            Route::delete('/{id}/activities/{activityId}', [ReportBatchController::class, 'removeActivity']);
            // Reorder activities in batch
            Route::post('/{id}/reorder', [ReportBatchController::class, 'reorderActivities']);

            // Collaborator responses (Phản hồi đơn vị phối hợp)
            Route::get('/{id}/responses', [ReportBatchController::class, 'getCollaboratorResponses']);
            Route::post('/{id}/responses', [ReportBatchController::class, 'submitCollaboratorResponse']);
            Route::delete('/{id}/responses/{responseId}', [ReportBatchController::class, 'deleteCollaboratorResponse']);

            // Export batch report (chỉ đơn vị tạo đợt báo cáo mới được xuất)
            Route::get('/{id}/export/preview', [ReportBatchController::class, 'previewExport']);
            Route::post('/{id}/export', [ReportBatchController::class, 'exportBatch']);
            Route::get('/{id}/export/history', [ReportBatchController::class, 'exportHistory']);
            Route::get('/{id}/export/{exportId}/download', [ReportBatchController::class, 'downloadExport'])
                ->name('api.reports.batches.download');
        });
    });

    // SSO Authentication Routes (Simple Test)
    Route::prefix('auth/sso')->group(function () {
        // Test Keycloak realms
        Route::get('/test-realms', function () {
            $baseUrl = 'https://sso.vnuhcm.edu.vn';
            $possibleRealms = ['Production', 'production', 'PRODUCTION', 'master', 'vnuhcm', 'VNUHCM'];

            $results = [];
            foreach ($possibleRealms as $realm) {
                $url = "{$baseUrl}/realms/{$realm}/.well-known/openid-configuration";
                $results[$realm] = [
                    'url' => $url,
                    'exists' => '❓ Check manually'
                ];
            }

            return response()->json([
                'message' => 'Test these URLs to find the correct realm',
                'realms' => $results,
                'instruction' => 'Try opening each URL in browser. The one that returns JSON (not 404) is the correct realm.'
            ]);
        });

        // Redirect to Keycloak
        Route::get('/login', function () {
            $baseUrl = config('keycloak.base_url');
            $realm = config('keycloak.realm');
            $clientId = config('keycloak.client_id');
            $redirectUri = config('keycloak.redirect_uri');

            $authUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/auth?" . http_build_query([
                'client_id' => $clientId,
                'redirect_uri' => $redirectUri,
                'response_type' => 'code',
                'scope' => 'openid profile email',
            ]);

            return redirect($authUrl);
        });

        // Debug endpoint to see error details
        Route::get('/callback-debug', function (Request $request) {
            $code = $request->query('code');

            if (!$code) {
                return response()->json(['error' => 'No code provided']);
            }

            $baseUrl = config('keycloak.base_url');
            $realm = config('keycloak.realm');
            $clientId = config('keycloak.client_id');
            $clientSecret = config('keycloak.client_secret');
            $redirectUri = config('keycloak.redirect_uri');
            $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

            $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, [
                'grant_type' => 'authorization_code',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]);

            return response()->json([
                'status' => $response->status(),
                'success' => $response->successful(),
                'body' => $response->json(),
                'raw_body' => $response->body(),
            ]);
        });

        // Callback from Keycloak
        Route::get('/callback', function (Request $request) {
            $code = $request->query('code');
            $frontendUrl = config('app.frontend_url', 'https://nq57.vnuhcm.edu.vn');

            if (!$code) {
                return redirect($frontendUrl . '?error=no_code');
            }

            try {
                // Exchange code for token
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $clientId = config('keycloak.client_id');
                $clientSecret = config('keycloak.client_secret');
                $redirectUri = config('keycloak.redirect_uri');

                $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

                $tokenParams = [
                    'grant_type' => 'authorization_code',
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'code' => $code,
                    'redirect_uri' => $redirectUri,
                ];

                $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, $tokenParams);

                if (!$response->successful()) {
                    \Log::error('Token exchange failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'error' => $response->json()
                    ]);

                    // Return detailed error in development
                    if (env('APP_DEBUG')) {
                        return response()->json([
                            'error' => 'token_exchange_failed',
                            'status' => $response->status(),
                            'details' => $response->json()
                        ], 400);
                    }

                    return redirect($frontendUrl . '?error=token_exchange_failed');
                }

                $tokenData = $response->json();
                $accessToken = $tokenData['access_token'];
                $refreshToken = $tokenData['refresh_token'] ?? null;
                $expiresIn = $tokenData['expires_in'] ?? 300;

                // Get user info from Keycloak
                $userInfoUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/userinfo";
                $userInfoResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)->get($userInfoUrl);

                if (!$userInfoResponse->successful()) {
                    \Log::error('User info fetch failed', [
                        'status' => $userInfoResponse->status(),
                        'body' => $userInfoResponse->body()
                    ]);
                    return redirect($frontendUrl . '?error=userinfo_failed');
                }

                $userInfo = $userInfoResponse->json();

                // Decode JWT to get roles
                // SECURITY NOTE: This only decodes the JWT payload without signature verification.
                // The token validity is already verified by Keycloak when we successfully got userInfo.
                // For additional security, consider using firebase/php-jwt to verify the signature
                // against Keycloak's public key (available at: {KEYCLOAK_BASE_URL}/realms/{REALM}/protocol/openid-connect/certs)
                $tokenParts = explode('.', $accessToken);
                $roles = [];
                if (count($tokenParts) === 3) {
                    try {
                        $payload = json_decode(base64_decode($tokenParts[1]), true);
                        // Keycloak stores roles in different places
                        $roles = array_merge(
                            $payload['realm_access']['roles'] ?? [],
                            $payload['resource_access'][$clientId]['roles'] ?? []
                        );
                    } catch (\Exception $e) {
                        \Log::warning('Failed to decode JWT roles', ['error' => $e->getMessage()]);
                    }
                }

                // Add roles to user info
                $userInfo['roles'] = $roles;

                // SECURITY NOTE: Passing tokens via URL is not ideal as they can appear in:
                // - Browser history
                // - Server logs
                // - Referrer headers
                // This is acceptable here because:
                // 1. The data is immediately consumed by frontend and removed from URL
                // 2. HTTPS encrypts the URL in transit
                // 3. The tokens are short-lived
                // For improved security, consider using a server-side session or HTTP-only cookies
                $data = base64_encode(json_encode([
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_in' => $expiresIn,
                    'user' => $userInfo
                ]));

                // Redirect to frontend with token data
                return redirect($frontendUrl . '?sso_success=1&data=' . $data);

            } catch (\Exception $e) {
                \Log::error('SSO callback error', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return redirect($frontendUrl . '?error=server_error');
            }
        });

        // Get current user info by verifying token
        Route::get('/user', function (Request $request) {
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'authenticated' => false,
                    'user' => null,
                    'message' => 'No token provided'
                ]);
            }

            try {
                // Verify token with Keycloak
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $userInfoUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/userinfo";

                $response = \Illuminate\Support\Facades\Http::withToken($token)->get($userInfoUrl);

                if (!$response->successful()) {
                    return response()->json([
                        'authenticated' => false,
                        'user' => null,
                        'message' => 'Invalid or expired token'
                    ], 401);
                }

                $userInfo = $response->json();

                // Decode JWT to get roles
                $roles = [];
                try {
                    $tokenParts = explode('.', $token);
                    if (count($tokenParts) === 3) {
                        $payload = json_decode(base64_decode($tokenParts[1]), true);
                        $clientId = config('keycloak.client_id');
                        // Keycloak stores roles in different places
                        $roles = array_merge(
                            $payload['realm_access']['roles'] ?? [],
                            $payload['resource_access'][$clientId]['roles'] ?? []
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to decode JWT roles', ['error' => $e->getMessage()]);
                }

                // Add roles to user info
                $userInfo['roles'] = $roles;

                return response()->json([
                    'authenticated' => true,
                    'user' => $userInfo
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'authenticated' => false,
                    'user' => null,
                    'message' => 'Token verification failed'
                ], 401);
            }
        });

        // Refresh access token
        Route::post('/refresh', function (Request $request) {
            $refreshToken = $request->input('refresh_token');

            if (!$refreshToken) {
                return response()->json([
                    'error' => 'Refresh token required'
                ], 400);
            }

            try {
                $baseUrl = config('keycloak.base_url');
                $realm = config('keycloak.realm');
                $clientId = config('keycloak.client_id');
                $clientSecret = config('keycloak.client_secret');
                $tokenUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/token";

                $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, [
                    'grant_type' => 'refresh_token',
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'refresh_token' => $refreshToken,
                ]);

                if (!$response->successful()) {
                    return response()->json([
                        'error' => 'Token refresh failed'
                    ], 401);
                }

                $tokenData = $response->json();

                return response()->json([
                    'access_token' => $tokenData['access_token'],
                    'refresh_token' => $tokenData['refresh_token'] ?? $refreshToken,
                    'expires_in' => $tokenData['expires_in'] ?? 300,
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Token refresh failed'
                ], 500);
            }
        });

        // Logout - Revoke token with Keycloak
        Route::post('/logout', function (Request $request) {
            $refreshToken = $request->input('refresh_token');

            if ($refreshToken) {
                try {
                    $baseUrl = config('keycloak.base_url');
                    $realm = config('keycloak.realm');
                    $clientId = config('keycloak.client_id');
                    $clientSecret = config('keycloak.client_secret');
                    $logoutUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/logout";

                    // Revoke refresh token
                    \Illuminate\Support\Facades\Http::asForm()->post($logoutUrl, [
                        'client_id' => $clientId,
                        'client_secret' => $clientSecret,
                        'refresh_token' => $refreshToken,
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Keycloak logout failed', ['error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        });
    });

    // Document Library Routes (All authenticated users can view, STAFF/MANAGER/OPERATOR/ADMIN can upload)
    Route::middleware('auth:sanctum')->prefix('documents')->group(function () {
        // Get list of documents (filtered by user access)
        Route::get('/', [DocumentController::class, 'index']);

        // Get list of categories
        Route::get('/categories', [DocumentController::class, 'categories']);

        // Get list of tags
        Route::get('/tags', [DocumentController::class, 'tags']);

        // Get single document
        Route::get('/{id}', [DocumentController::class, 'show']);

        // Download document
        Route::get('/{id}/download', [DocumentController::class, 'download']);

        // Upload new document (STAFF, MANAGER, OPERATOR, ADMIN only)
        Route::post('/', [DocumentController::class, 'store']);

        // Update document metadata
        Route::put('/{id}', [DocumentController::class, 'update']);

        // Delete document
        Route::delete('/{id}', [DocumentController::class, 'destroy']);
    });

    // Activity Logs Routes (STAFF, MANAGER, OPERATOR, ADMIN)
    Route::middleware('auth:sanctum')->prefix('activity-logs')->group(function () {
        // Get action types (for filter dropdown)
        Route::get('/action-types', [ActivityLogController::class, 'actionTypes']);

        // Get organization activity feed (recent actions)
        Route::get('/feed', [ActivityLogController::class, 'organizationFeed']);

        // Get all logs for organization (with filters)
        Route::get('/', [ActivityLogController::class, 'index']);

        // Get logs for a specific activity
        Route::get('/activity/{activityId}', [ActivityLogController::class, 'forActivity']);
    });

    // ==========================================
    // MAINTENANCE MODE ROUTES
    // ==========================================

    // Public endpoint - check maintenance status (always accessible)
    // Controller will manually check auth to see if user is admin
    Route::get('/maintenance/status', [MaintenanceController::class, 'status']);

    // Bypass maintenance with secret key
    Route::post('/maintenance/bypass/{secretKey}', [MaintenanceController::class, 'bypass']);
    Route::get('/maintenance/check-bypass', [MaintenanceController::class, 'checkBypass']);

    // Admin-only maintenance management routes
    Route::middleware('auth:sanctum')->prefix('maintenance')->group(function () {
        // Get full settings (admin only)
        Route::get('/settings', [MaintenanceController::class, 'getSettings']);

        // Update settings
        Route::put('/settings', [MaintenanceController::class, 'updateSettings']);

        // Enable/disable maintenance mode
        Route::post('/enable', [MaintenanceController::class, 'enable']);
        Route::post('/disable', [MaintenanceController::class, 'disable']);
        Route::post('/toggle', [MaintenanceController::class, 'toggle']);

        // Regenerate secret key
        Route::post('/regenerate-key', [MaintenanceController::class, 'regenerateKey']);

        // Get maintenance logs
        Route::get('/logs', [MaintenanceController::class, 'getLogs']);
    });
});
