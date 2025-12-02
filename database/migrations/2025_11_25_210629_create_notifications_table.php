<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng notifications hoàn chỉnh
     * Cấu trúc khớp với database hiện tại
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // User nhận thông báo (char(36) để match với nq57_users.id)
            $table->char('user_id', 36)->comment('ID người nhận thông báo');

            // Tiêu đề và nội dung
            $table->string('title', 500)->comment('Tiêu đề thông báo');
            $table->text('message')->comment('Nội dung chi tiết');

            // UI display
            $table->string('icon', 50)->nullable()->comment('Icon: CheckCircleOutlined, WarningOutlined, etc.');
            $table->string('color', 20)->nullable()->default('primary')->comment('Màu: success, warning, error, info, primary');

            // Action
            $table->string('action_url', 500)->nullable()->comment('URL điều hướng khi click');
            $table->string('action_type', 50)->nullable()->comment('Loại action: navigate, modal, external_link, etc.');

            // Data JSON cho dữ liệu bổ sung
            $table->json('data')->nullable()->comment('Dữ liệu bổ sung dạng JSON');

            // Loại và phân loại thông báo
            $table->string('notification_type', 100)->comment('Loại: activity_created, activity_approved, user_assigned, etc.');
            $table->string('category', 50)->default('general')->comment('Nhóm: activity, user, system, report, etc.');

            // Entity liên quan (polymorphic)
            $table->string('related_entity_type', 100)->nullable()->comment('Loại entity: Activity, User, Organization, etc.');
            $table->char('related_entity_id', 36)->nullable()->comment('ID của entity liên quan');

            // Actor - người thực hiện hành động
            $table->char('actor_id', 36)->nullable()->comment('ID người thực hiện hành động (null = system)');

            // Trạng thái đọc
            $table->boolean('is_read')->nullable()->default(false)->comment('Đã đọc chưa');
            $table->dateTime('read_at')->nullable()->comment('Thời điểm đọc');
            $table->timestamp('seen_at')->nullable()->comment('Thời điểm xem chi tiết');
            $table->timestamp('archived_at')->nullable()->comment('Thời điểm archive (ẩn khỏi danh sách)');

            // Priority
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal')->comment('Độ ưu tiên');

            // Expires
            $table->timestamp('expires_at')->nullable()->comment('Thời điểm hết hạn (null = không hết hạn)');

            // Email delivery tracking
            $table->boolean('email_sent')->default(false)->comment('Đã gửi email chưa');
            $table->timestamp('email_sent_at')->nullable();

            // Push notification tracking
            $table->boolean('push_sent')->default(false)->comment('Đã gửi push notification chưa');
            $table->timestamp('push_sent_at')->nullable();

            // Grouping
            $table->string('group_key', 100)->nullable()->comment('Key để gom nhóm thông báo tương tự');
            $table->integer('group_count')->default(1)->comment('Số lượng trong nhóm');

            // Timestamps
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();

            // Soft deletes
            $table->timestamp('deleted_at')->nullable();
        });

        // Add indexes
        $this->addIndexSafe('notifications', ['user_id', 'is_read', 'created_at'], 'idx_user_read');
        $this->addIndexSafe('notifications', ['notification_type', 'created_at'], 'idx_type');
        $this->addIndexSafe('notifications', 'category', 'notifications_category_index');
        $this->addIndexSafe('notifications', 'created_at', 'notifications_created_at_index');
        $this->addIndexSafe('notifications', ['user_id', 'is_read'], 'notifications_user_read_index');
        $this->addIndexSafe('notifications', ['user_id', 'created_at'], 'notifications_user_created_index');
    }

    /**
     * Helper: Add index if not exists
     */
    private function addIndexSafe(string $table, $columns, string $indexName): void
    {
        $columns = is_array($columns) ? $columns : [$columns];
        $columnsList = implode(',', array_map(fn($c) => "`$c`", $columns));

        // Check if index exists
        $exists = DB::select("SHOW INDEX FROM `$table` WHERE Key_name = ?", [$indexName]);

        if (empty($exists)) {
            DB::statement("CREATE INDEX `$indexName` ON `$table` ($columnsList)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
