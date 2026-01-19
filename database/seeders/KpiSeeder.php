<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KpiSeeder extends Seeder
{
    /**
     * Seed KPIs and KPI Tasks based on NQ57 requirements
     *
     * Categories:
     * 1. GOVERNANCE - Quản trị đại học
     * 2. TRAINING - Đào tạo
     * 3. SCIENCE_TECH - Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số
     * 4. INFRASTRUCTURE - Đầu tư phát triển cơ sở vật chất, hạ tầng
     * 5. INTERNATIONAL - Hợp tác quốc tế và tham gia xếp hạng đại học
     * 6. FINANCE - Tài chính
     */
    public function run(): void
    {
        // Get category IDs
        $categories = DB::table('kpi_categories')->pluck('id', 'code')->toArray();

        // Define KPIs with their tasks
        $kpisData = [
            // ==================== GOVERNANCE ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-GOV-01',
                'title' => 'Hoàn thiện mô hình tổ chức và quản trị đại học',
                'description' => 'Xây dựng và hoàn thiện mô hình tổ chức, quản trị đại học theo hướng tự chủ, hiện đại và hiệu quả',
                'category' => 'GOVERNANCE',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-GOV-01.1',
                        'title' => 'Xây dựng quy chế tổ chức và hoạt động theo mô hình tự chủ',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-GOV-01.2',
                        'title' => 'Triển khai hệ thống quản trị số trong điều hành',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-GOV-01.3',
                        'title' => 'Đào tạo, bồi dưỡng cán bộ quản lý về quản trị đại học hiện đại',
                        'target_value' => '80%',
                        'unit' => '%',
                    ],
                ],
            ],
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-GOV-02',
                'title' => 'Nâng cao năng lực đội ngũ giảng viên và cán bộ quản lý',
                'description' => 'Phát triển đội ngũ giảng viên có trình độ cao, đáp ứng yêu cầu đào tạo và nghiên cứu',
                'category' => 'GOVERNANCE',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-GOV-02.1',
                        'title' => 'Tỷ lệ giảng viên có trình độ tiến sĩ',
                        'target_value' => '50%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-GOV-02.2',
                        'title' => 'Tỷ lệ giảng viên có chức danh GS, PGS',
                        'target_value' => '25%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-GOV-02.3',
                        'title' => 'Số lượng giảng viên được đào tạo ở nước ngoài',
                        'target_value' => '100',
                        'unit' => 'người/năm',
                    ],
                ],
            ],
            [
                'source' => 'VNU',
                'code' => 'KPI-GOV-03',
                'title' => 'Xây dựng văn hóa tổ chức và môi trường làm việc',
                'description' => 'Tạo dựng văn hóa tổ chức tích cực, môi trường làm việc chuyên nghiệp',
                'category' => 'GOVERNANCE',
                'order_number' => 3,
                'tasks' => [
                    [
                        'code' => 'KPI-GOV-03.1',
                        'title' => 'Xây dựng bộ quy tắc ứng xử và văn hóa công sở',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-GOV-03.2',
                        'title' => 'Tỷ lệ hài lòng của cán bộ, giảng viên về môi trường làm việc',
                        'target_value' => '85%',
                        'unit' => '%',
                    ],
                ],
            ],

            // ==================== TRAINING ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-TRN-01',
                'title' => 'Nâng cao chất lượng đào tạo đại học',
                'description' => 'Đổi mới chương trình, phương pháp giảng dạy, nâng cao chất lượng đào tạo',
                'category' => 'TRAINING',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-TRN-01.1',
                        'title' => 'Tỷ lệ chương trình đào tạo được kiểm định theo chuẩn quốc gia',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-01.2',
                        'title' => 'Tỷ lệ chương trình đào tạo được kiểm định quốc tế (ABET, AUN-QA)',
                        'target_value' => '30%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-01.3',
                        'title' => 'Tỷ lệ sinh viên tốt nghiệp có việc làm trong 12 tháng',
                        'target_value' => '95%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-01.4',
                        'title' => 'Tỷ lệ sinh viên hài lòng về chất lượng đào tạo',
                        'target_value' => '90%',
                        'unit' => '%',
                    ],
                ],
            ],
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-TRN-02',
                'title' => 'Phát triển đào tạo sau đại học',
                'description' => 'Mở rộng quy mô và nâng cao chất lượng đào tạo thạc sĩ, tiến sĩ',
                'category' => 'TRAINING',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-TRN-02.1',
                        'title' => 'Số lượng nghiên cứu sinh được tuyển mới hàng năm',
                        'target_value' => '200',
                        'unit' => 'người/năm',
                    ],
                    [
                        'code' => 'KPI-TRN-02.2',
                        'title' => 'Tỷ lệ nghiên cứu sinh tốt nghiệp đúng hạn',
                        'target_value' => '70%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-02.3',
                        'title' => 'Số lượng chương trình đào tạo liên kết quốc tế',
                        'target_value' => '20',
                        'unit' => 'chương trình',
                    ],
                ],
            ],
            [
                'source' => 'VNU',
                'code' => 'KPI-TRN-03',
                'title' => 'Đổi mới phương pháp giảng dạy và học tập',
                'description' => 'Áp dụng công nghệ số, phương pháp giảng dạy hiện đại trong đào tạo',
                'category' => 'TRAINING',
                'order_number' => 3,
                'tasks' => [
                    [
                        'code' => 'KPI-TRN-03.1',
                        'title' => 'Tỷ lệ môn học có tài liệu số hóa',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-03.2',
                        'title' => 'Tỷ lệ môn học áp dụng e-learning',
                        'target_value' => '50%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-TRN-03.3',
                        'title' => 'Số khóa học MOOC được phát triển',
                        'target_value' => '30',
                        'unit' => 'khóa học',
                    ],
                ],
            ],

            // ==================== SCIENCE_TECH ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-SCI-01',
                'title' => 'Đẩy mạnh nghiên cứu khoa học và công bố quốc tế',
                'description' => 'Tăng cường hoạt động nghiên cứu khoa học, nâng cao số lượng và chất lượng công bố quốc tế',
                'category' => 'SCIENCE_TECH',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-SCI-01.1',
                        'title' => 'Số bài báo ISI/Scopus trên đầu giảng viên/năm',
                        'target_value' => '0.5',
                        'unit' => 'bài/GV/năm',
                    ],
                    [
                        'code' => 'KPI-SCI-01.2',
                        'title' => 'Số bằng sáng chế, giải pháp hữu ích được cấp',
                        'target_value' => '20',
                        'unit' => 'bằng/năm',
                    ],
                    [
                        'code' => 'KPI-SCI-01.3',
                        'title' => 'Tỷ lệ đề tài nghiên cứu được nghiệm thu đạt và xuất sắc',
                        'target_value' => '95%',
                        'unit' => '%',
                    ],
                ],
            ],
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-SCI-02',
                'title' => 'Chuyển giao công nghệ và đổi mới sáng tạo',
                'description' => 'Thúc đẩy hoạt động chuyển giao công nghệ, khởi nghiệp và đổi mới sáng tạo',
                'category' => 'SCIENCE_TECH',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-SCI-02.1',
                        'title' => 'Số hợp đồng chuyển giao công nghệ với doanh nghiệp',
                        'target_value' => '50',
                        'unit' => 'hợp đồng/năm',
                    ],
                    [
                        'code' => 'KPI-SCI-02.2',
                        'title' => 'Doanh thu từ hoạt động chuyển giao công nghệ',
                        'target_value' => '50',
                        'unit' => 'tỷ đồng/năm',
                    ],
                    [
                        'code' => 'KPI-SCI-02.3',
                        'title' => 'Số startup/spinoff được thành lập từ kết quả nghiên cứu',
                        'target_value' => '10',
                        'unit' => 'doanh nghiệp/năm',
                    ],
                ],
            ],
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-SCI-03',
                'title' => 'Chuyển đổi số trong giáo dục và quản lý',
                'description' => 'Triển khai chuyển đổi số toàn diện trong hoạt động đào tạo, nghiên cứu và quản lý',
                'category' => 'SCIENCE_TECH',
                'order_number' => 3,
                'tasks' => [
                    [
                        'code' => 'KPI-SCI-03.1',
                        'title' => 'Tỷ lệ quy trình hành chính được số hóa',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-SCI-03.2',
                        'title' => 'Triển khai hệ thống quản lý học tập LMS',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-SCI-03.3',
                        'title' => 'Xây dựng kho dữ liệu và hệ thống phân tích dữ liệu lớn',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                ],
            ],

            // ==================== INFRASTRUCTURE ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-INF-01',
                'title' => 'Phát triển cơ sở vật chất phục vụ đào tạo',
                'description' => 'Đầu tư xây dựng, nâng cấp cơ sở vật chất, thiết bị phục vụ đào tạo và nghiên cứu',
                'category' => 'INFRASTRUCTURE',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-INF-01.1',
                        'title' => 'Diện tích sàn xây dựng/sinh viên',
                        'target_value' => '10',
                        'unit' => 'm²/SV',
                    ],
                    [
                        'code' => 'KPI-INF-01.2',
                        'title' => 'Số phòng thí nghiệm đạt chuẩn quốc tế',
                        'target_value' => '20',
                        'unit' => 'phòng',
                    ],
                    [
                        'code' => 'KPI-INF-01.3',
                        'title' => 'Tỷ lệ phòng học được trang bị thiết bị hiện đại',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                ],
            ],
            [
                'source' => 'VNU',
                'code' => 'KPI-INF-02',
                'title' => 'Phát triển hạ tầng công nghệ thông tin',
                'description' => 'Đầu tư hạ tầng CNTT, mạng internet, hệ thống máy chủ phục vụ chuyển đổi số',
                'category' => 'INFRASTRUCTURE',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-INF-02.1',
                        'title' => 'Băng thông internet/người dùng',
                        'target_value' => '10',
                        'unit' => 'Mbps/người',
                    ],
                    [
                        'code' => 'KPI-INF-02.2',
                        'title' => 'Tỷ lệ khu vực được phủ sóng wifi',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-INF-02.3',
                        'title' => 'Xây dựng trung tâm dữ liệu đạt chuẩn Tier 3',
                        'target_value' => '1',
                        'unit' => 'trung tâm',
                    ],
                ],
            ],

            // ==================== INTERNATIONAL ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-INT-01',
                'title' => 'Mở rộng hợp tác quốc tế trong đào tạo và nghiên cứu',
                'description' => 'Tăng cường hợp tác với các trường đại học, viện nghiên cứu quốc tế',
                'category' => 'INTERNATIONAL',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-INT-01.1',
                        'title' => 'Số đối tác quốc tế có hợp tác thực chất',
                        'target_value' => '100',
                        'unit' => 'đối tác',
                    ],
                    [
                        'code' => 'KPI-INT-01.2',
                        'title' => 'Số sinh viên trao đổi quốc tế (đi và đến)',
                        'target_value' => '500',
                        'unit' => 'sinh viên/năm',
                    ],
                    [
                        'code' => 'KPI-INT-01.3',
                        'title' => 'Số giảng viên quốc tế tham gia giảng dạy',
                        'target_value' => '50',
                        'unit' => 'người/năm',
                    ],
                ],
            ],
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-INT-02',
                'title' => 'Nâng cao thứ hạng trong các bảng xếp hạng đại học',
                'description' => 'Cải thiện vị trí trong các bảng xếp hạng đại học uy tín quốc tế',
                'category' => 'INTERNATIONAL',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-INT-02.1',
                        'title' => 'Thứ hạng QS World University Rankings',
                        'target_value' => 'Top 500',
                        'unit' => 'hạng',
                    ],
                    [
                        'code' => 'KPI-INT-02.2',
                        'title' => 'Thứ hạng THE World University Rankings',
                        'target_value' => 'Top 800',
                        'unit' => 'hạng',
                    ],
                    [
                        'code' => 'KPI-INT-02.3',
                        'title' => 'Số ngành học được xếp hạng theo QS Subject Rankings',
                        'target_value' => '10',
                        'unit' => 'ngành',
                    ],
                ],
            ],

            // ==================== FINANCE ====================
            [
                'source' => 'CENTRAL',
                'code' => 'KPI-FIN-01',
                'title' => 'Đa dạng hóa nguồn thu',
                'description' => 'Tăng cường huy động các nguồn thu ngoài ngân sách nhà nước',
                'category' => 'FINANCE',
                'order_number' => 1,
                'tasks' => [
                    [
                        'code' => 'KPI-FIN-01.1',
                        'title' => 'Tỷ lệ thu ngoài ngân sách/tổng thu',
                        'target_value' => '70%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-FIN-01.2',
                        'title' => 'Tăng trưởng nguồn thu từ hoạt động KHCN',
                        'target_value' => '20%',
                        'unit' => '%/năm',
                    ],
                    [
                        'code' => 'KPI-FIN-01.3',
                        'title' => 'Nguồn thu từ hợp tác doanh nghiệp',
                        'target_value' => '100',
                        'unit' => 'tỷ đồng/năm',
                    ],
                ],
            ],
            [
                'source' => 'VNU',
                'code' => 'KPI-FIN-02',
                'title' => 'Nâng cao hiệu quả sử dụng nguồn lực tài chính',
                'description' => 'Tối ưu hóa việc phân bổ và sử dụng nguồn lực tài chính',
                'category' => 'FINANCE',
                'order_number' => 2,
                'tasks' => [
                    [
                        'code' => 'KPI-FIN-02.1',
                        'title' => 'Tỷ lệ giải ngân đạt kế hoạch',
                        'target_value' => '95%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-FIN-02.2',
                        'title' => 'Tỷ lệ chi cho nghiên cứu khoa học/tổng chi',
                        'target_value' => '25%',
                        'unit' => '%',
                    ],
                    [
                        'code' => 'KPI-FIN-02.3',
                        'title' => 'Công khai minh bạch tài chính theo quy định',
                        'target_value' => '100%',
                        'unit' => '%',
                    ],
                ],
            ],
        ];

        // Insert KPIs and their tasks
        foreach ($kpisData as $kpiData) {
            $kpiId = (string) Str::uuid();
            $categoryId = $categories[$kpiData['category']] ?? null;
            $tasks = $kpiData['tasks'] ?? [];
            unset($kpiData['tasks']);

            // Insert KPI
            DB::table('kpis')->insert([
                'id' => $kpiId,
                'source' => $kpiData['source'],
                'code' => $kpiData['code'],
                'title' => $kpiData['title'],
                'description' => $kpiData['description'],
                'category' => $kpiData['category'],
                'category_id' => $categoryId,
                'order_number' => $kpiData['order_number'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Insert tasks for this KPI
            foreach ($tasks as $index => $task) {
                DB::table('kpi_tasks')->insert([
                    'id' => (string) Str::uuid(),
                    'kpi_id' => $kpiId,
                    'code' => $task['code'],
                    'title' => $task['title'],
                    'description' => $task['description'] ?? null,
                    'target_value' => $task['target_value'] ?? null,
                    'unit' => $task['unit'] ?? null,
                    'order_number' => $index + 1,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('KPIs and KPI Tasks seeded successfully!');
        $this->command->info('- Created ' . count($kpisData) . ' KPIs');
        $this->command->info('- Created ' . array_sum(array_map(fn($k) => count($k['tasks'] ?? []), $kpisData)) . ' KPI Tasks');
    }
}
