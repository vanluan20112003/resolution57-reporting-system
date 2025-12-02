<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Cập nhật bảng notifications với cấu trúc đầy đủ hơn
     * Giữ lại các cột cũ, thêm các cột mới
     *
     * Note: nq57_users dùng char(36) UUID làm primary key
     */
    public function up(): void
    {
        // Thêm các cột mới nếu chưa có
        Schema::table('notifications', function (Blueprint $table) {
            // Category để phân loại thông báo
            if (!Schema::hasColumn('notifications', 'category')) {
                $table->string('category', 50)->default('general')->after('notification_type')
                    ->comment('Nhóm: activity, user, system, report, etc.');
            }

            // Actor - người thực hiện hành động (char(36) để match với nq57_users.id)
            if (!Schema::hasColumn('notifications', 'actor_id')) {
                $table->char('actor_id', 36)->nullable()->after('related_entity_id')
                    ->comment('ID người thực hiện hành động (null = system)');
            }

            // Icon và color cho UI
            if (!Schema::hasColumn('notifications', 'icon')) {
                $table->string('icon', 50)->nullable()->after('message')
                    ->comment('Icon: CheckCircleOutlined, WarningOutlined, etc.');
            }
            if (!Schema::hasColumn('notifications', 'color')) {
                $table->string('color', 20)->nullable()->default('primary')->after('icon')
                    ->comment('Màu: success, warning, error, info, primary');
            }

            // Action URL và type
            if (!Schema::hasColumn('notifications', 'action_url')) {
                $table->string('action_url', 500)->nullable()->after('color')
                    ->comment('URL điều hướng khi click');
            }
            if (!Schema::hasColumn('notifications', 'action_type')) {
                $table->string('action_type', 50)->nullable()->after('action_url')
                    ->comment('Loại action: navigate, modal, external_link, etc.');
            }

            // Data JSON cho dữ liệu bổ sung
            if (!Schema::hasColumn('notifications', 'data')) {
                $table->json('data')->nullable()->after('action_type')
                    ->comment('Dữ liệu bổ sung dạng JSON');
            }

            // Seen at - thời điểm xem chi tiết
            if (!Schema::hasColumn('notifications', 'seen_at')) {
                $table->timestamp('seen_at')->nullable()->after('read_at')
                    ->comment('Thời điểm xem chi tiết');
            }

            // Archived at - thời điểm ẩn thông báo
            if (!Schema::hasColumn('notifications', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('seen_at')
                    ->comment('Thời điểm archive (ẩn khỏi danh sách)');
            }

            // Priority
            if (!Schema::hasColumn('notifications', 'priority')) {
                $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal')->after('archived_at')
                    ->comment('Độ ưu tiên');
            }

            // Expires at
            if (!Schema::hasColumn('notifications', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('priority')
                    ->comment('Thời điểm hết hạn (null = không hết hạn)');
            }

            // Email delivery tracking
            if (!Schema::hasColumn('notifications', 'email_sent')) {
                $table->boolean('email_sent')->default(false)->after('expires_at')
                    ->comment('Đã gửi email chưa');
            }
            if (!Schema::hasColumn('notifications', 'email_sent_at')) {
                $table->timestamp('email_sent_at')->nullable()->after('email_sent');
            }

            // Push notification tracking
            if (!Schema::hasColumn('notifications', 'push_sent')) {
                $table->boolean('push_sent')->default(false)->after('email_sent_at')
                    ->comment('Đã gửi push notification chưa');
            }
            if (!Schema::hasColumn('notifications', 'push_sent_at')) {
                $table->timestamp('push_sent_at')->nullable()->after('push_sent');
            }

            // Grouping
            if (!Schema::hasColumn('notifications', 'group_key')) {
                $table->string('group_key', 100)->nullable()->after('push_sent_at')
                    ->comment('Key để gom nhóm thông báo tương tự');
            }
            if (!Schema::hasColumn('notifications', 'group_count')) {
                $table->integer('group_count')->default(1)->after('group_key')
                    ->comment('Số lượng trong nhóm');
            }

            // Updated at
            if (!Schema::hasColumn('notifications', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

            // Soft deletes
            if (!Schema::hasColumn('notifications', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // Thêm indexes bằng raw SQL (tránh lỗi duplicate)
        $this->addIndexIfNotExists('notifications', 'category', 'notifications_category_index');
        $this->addIndexIfNotExists('notifications', 'created_at', 'notifications_created_at_index');
        $this->addIndexIfNotExists('notifications', ['user_id', 'is_read'], 'notifications_user_read_index');
        $this->addIndexIfNotExists('notifications', ['user_id', 'created_at'], 'notifications_user_created_index');

        // Tạo bảng notification_preferences nếu chưa có
        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->char('user_id', 36); // Match với nq57_users.id (char(36) UUID)
                $table->foreign('user_id')->references('id')->on('nq57_users')->onDelete('cascade');

                $table->string('notification_type', 100)->comment('Loại thông báo hoặc category');

                $table->boolean('in_app')->default(true)->comment('Nhận trong app');
                $table->boolean('email')->default(true)->comment('Nhận qua email');
                $table->boolean('push')->default(true)->comment('Nhận push notification');

                $table->string('email_frequency', 20)->default('realtime');

                $table->timestamps();

                $table->unique(['user_id', 'notification_type']);
            });
        }

        // Tạo bảng notification_templates nếu chưa có
        if (!Schema::hasTable('notification_templates')) {
            Schema::create('notification_templates', function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->string('type', 100)->unique()->comment('Loại thông báo');

                $table->string('title_template', 255)->comment('Mẫu tiêu đề');
                $table->text('message_template')->nullable()->comment('Mẫu nội dung');

                $table->string('default_icon', 50)->nullable();
                $table->string('default_color', 20)->nullable();
                $table->string('default_category', 50)->default('general');
                $table->string('default_priority', 20)->default('normal');

                $table->boolean('send_email')->default(false);
                $table->boolean('send_push')->default(false);

                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);

                $table->timestamps();
            });
        }
    }

    /**
     * Helper: Add index if not exists
     */
    private function addIndexIfNotExists(string $table, $columns, string $indexName): void
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
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('notification_preferences');

        Schema::table('notifications', function (Blueprint $table) {
            // Drop indexes first
            try {
                $table->dropIndex('notifications_category_index');
                $table->dropIndex('notifications_created_at_index');
                $table->dropIndex('notifications_user_read_index');
                $table->dropIndex('notifications_user_created_index');
            } catch (\Exception $e) {
                // Index might not exist
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            // Drop new columns
            $columns = [
                'category', 'actor_id', 'icon', 'color', 'action_url', 'action_type',
                'data', 'seen_at', 'archived_at', 'priority', 'expires_at',
                'email_sent', 'email_sent_at', 'push_sent', 'push_sent_at',
                'group_key', 'group_count', 'updated_at', 'deleted_at'
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('notifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
