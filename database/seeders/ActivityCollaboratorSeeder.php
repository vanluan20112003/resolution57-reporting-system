<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivityCollaboratorSeeder extends Seeder
{
    /**
     * Seed activity_collaborators table - Gắn đơn vị phối hợp vào các hoạt động
     */
    public function run(): void
    {
        // Lấy tất cả activities với lead_organization_id
        $activities = DB::table('activities')
            ->select('id', 'title', 'lead_organization_id')
            ->get();

        if ($activities->isEmpty()) {
            $this->command->info('Không có hoạt động nào trong database. Bỏ qua ActivityCollaboratorSeeder.');
            return;
        }

        // Lấy tất cả organizations
        $organizations = DB::table('organizations')
            ->where('status', 'active')
            ->select('id', 'name', 'short_name', 'type')
            ->get();

        if ($organizations->count() < 3) {
            $this->command->info('Cần ít nhất 3 đơn vị. Chạy OrganizationSeeder trước.');
            return;
        }

        $this->command->info("Tìm thấy {$activities->count()} hoạt động");
        $this->command->info("Tìm thấy {$organizations->count()} đơn vị");

        // Xóa dữ liệu cũ
        DB::table('activity_collaborators')->truncate();

        // Danh sách ghi chú mẫu về vai trò phối hợp
        $collaboratorNotes = [
            'Hỗ trợ chuyên môn và cung cấp nguồn lực',
            'Phối hợp triển khai các hoạt động thực địa',
            'Cung cấp cơ sở vật chất và trang thiết bị',
            'Hỗ trợ về mặt nhân sự và chuyên gia',
            'Đồng tổ chức sự kiện và hội thảo',
            'Cung cấp dữ liệu và thông tin liên quan',
            'Hỗ trợ kết nối với các đối tác bên ngoài',
            'Phối hợp trong công tác truyền thông',
            'Hỗ trợ đào tạo và tập huấn',
            'Cung cấp kinh phí đối ứng',
            'Phối hợp nghiên cứu và phát triển',
            'Hỗ trợ công tác hậu cần',
            'Đảm nhận vai trò tư vấn chuyên môn',
            'Phối hợp giám sát và đánh giá',
            'Hỗ trợ xuất bản và công bố kết quả',
        ];

        $collaborators = [];
        $now = now();
        $orgArray = $organizations->toArray();
        $orgCount = count($orgArray);

        foreach ($activities as $index => $activity) {
            // Số lượng đơn vị phối hợp ngẫu nhiên từ 1-4
            $numCollaborators = rand(1, 4);

            // Lọc ra các đơn vị không phải là đơn vị chủ trì
            $availableOrgs = array_filter($orgArray, function($org) use ($activity) {
                return $org->id !== $activity->lead_organization_id;
            });

            if (empty($availableOrgs)) {
                continue;
            }

            // Shuffle và lấy ngẫu nhiên
            $availableOrgs = array_values($availableOrgs);
            shuffle($availableOrgs);
            $selectedOrgs = array_slice($availableOrgs, 0, min($numCollaborators, count($availableOrgs)));

            foreach ($selectedOrgs as $org) {
                $collaborators[] = [
                    'id' => Str::uuid()->toString(),
                    'activity_id' => $activity->id,
                    'organization_id' => $org->id,
                    'notes' => $collaboratorNotes[array_rand($collaboratorNotes)],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // Insert theo batch để tối ưu
        if (!empty($collaborators)) {
            $chunks = array_chunk($collaborators, 100);
            foreach ($chunks as $chunk) {
                DB::table('activity_collaborators')->insert($chunk);
            }
        }

        $totalCollaborators = count($collaborators);
        $avgPerActivity = $activities->count() > 0
            ? round($totalCollaborators / $activities->count(), 1)
            : 0;

        $this->command->info("Đã tạo {$totalCollaborators} liên kết đơn vị phối hợp");
        $this->command->info("Trung bình {$avgPerActivity} đơn vị phối hợp / hoạt động");
    }
}
