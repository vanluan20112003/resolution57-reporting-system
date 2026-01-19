<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivityKpiSeeder extends Seeder
{
    /**
     * Seed activity_kpis table - Gắn mỗi hoạt động với 1 KPI Trung ương và 1 KPI ĐHQG-HCM
     */
    public function run(): void
    {
        // Lấy tất cả activities
        $activities = DB::table('activities')->select('id', 'title')->get();

        if ($activities->isEmpty()) {
            $this->command->info('Không có hoạt động nào trong database. Bỏ qua ActivityKpiSeeder.');
            return;
        }

        // Lấy KPIs theo nguồn
        $centralKpis = DB::table('kpis')
            ->where('source', 'CENTRAL')
            ->where('is_active', true)
            ->select('id', 'title', 'code')
            ->get();

        $vnuKpis = DB::table('kpis')
            ->where('source', 'VNU')
            ->where('is_active', true)
            ->select('id', 'title', 'code')
            ->get();

        if ($centralKpis->isEmpty() || $vnuKpis->isEmpty()) {
            $this->command->info('Không đủ KPIs (cần cả CENTRAL và VNU). Chạy KpiSeeder trước.');
            return;
        }

        $this->command->info("Tìm thấy {$activities->count()} hoạt động");
        $this->command->info("Tìm thấy {$centralKpis->count()} KPIs Trung ương");
        $this->command->info("Tìm thấy {$vnuKpis->count()} KPIs ĐHQG-HCM");

        // Xóa dữ liệu cũ
        DB::table('activity_kpis')->truncate();

        $activityKpis = [];
        $centralCount = $centralKpis->count();
        $vnuCount = $vnuKpis->count();
        $now = now();

        // Danh sách mô tả đóng góp mẫu
        $contributionDescriptions = [
            'Hoạt động này đóng góp trực tiếp vào việc đạt được chỉ tiêu thông qua các kết quả cụ thể.',
            'Góp phần nâng cao chất lượng và hiệu quả trong việc thực hiện chỉ tiêu.',
            'Hỗ trợ đạt mục tiêu thông qua việc triển khai các giải pháp sáng tạo.',
            'Tạo nền tảng vững chắc cho việc hoàn thành chỉ tiêu trong giai đoạn tiếp theo.',
            'Đóng góp vào việc cải thiện các chỉ số liên quan đến chỉ tiêu.',
            'Thúc đẩy tiến độ thực hiện chỉ tiêu thông qua các hoạt động thiết thực.',
            'Nâng cao năng lực và nguồn lực phục vụ việc đạt chỉ tiêu.',
            'Tăng cường sự phối hợp và liên kết trong việc thực hiện chỉ tiêu.',
        ];

        foreach ($activities as $index => $activity) {
            // Chọn ngẫu nhiên 1 KPI Trung ương
            $centralKpi = $centralKpis[$index % $centralCount];

            // Chọn ngẫu nhiên 1 KPI ĐHQG-HCM (dùng offset để đa dạng hơn)
            $vnuKpi = $vnuKpis[($index + 3) % $vnuCount];

            // Tạo mô tả đóng góp ngẫu nhiên
            $description1 = $contributionDescriptions[array_rand($contributionDescriptions)];
            $description2 = $contributionDescriptions[array_rand($contributionDescriptions)];

            // Gắn với KPI Trung ương
            $activityKpis[] = [
                'id' => Str::uuid()->toString(),
                'activity_id' => $activity->id,
                'kpi_id' => $centralKpi->id,
                'contribution_description' => $description1,
                'target_value' => $this->generateTargetValue(),
                'actual_value' => null, // Chưa có giá trị thực tế
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // Gắn với KPI ĐHQG-HCM
            $activityKpis[] = [
                'id' => Str::uuid()->toString(),
                'activity_id' => $activity->id,
                'kpi_id' => $vnuKpi->id,
                'contribution_description' => $description2,
                'target_value' => $this->generateTargetValue(),
                'actual_value' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Insert theo batch để tối ưu
        $chunks = array_chunk($activityKpis, 100);
        foreach ($chunks as $chunk) {
            DB::table('activity_kpis')->insert($chunk);
        }

        $totalLinks = count($activityKpis);
        $this->command->info("Đã tạo {$totalLinks} liên kết Activity-KPI ({$activities->count()} hoạt động x 2 KPIs)");
    }

    /**
     * Tạo giá trị mục tiêu ngẫu nhiên
     */
    private function generateTargetValue(): string
    {
        $types = [
            fn() => rand(1, 10) . ' sản phẩm',
            fn() => rand(1, 5) . ' báo cáo',
            fn() => rand(50, 100) . '%',
            fn() => rand(1, 3) . ' đề tài',
            fn() => rand(10, 50) . ' người tham gia',
            fn() => rand(1, 5) . ' bài báo',
            fn() => rand(1, 3) . ' hội thảo',
            fn() => 'Hoàn thành đúng tiến độ',
            fn() => 'Đạt yêu cầu chất lượng',
        ];

        return $types[array_rand($types)]();
    }
}
