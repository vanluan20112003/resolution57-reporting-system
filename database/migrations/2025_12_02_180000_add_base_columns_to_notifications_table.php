<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Thêm các cột cơ bản cho bảng notifications
     * Migration này phải chạy TRƯỚC migration update_notifications_table_structure
     *
     * Note: nq57_users dùng char(36) UUID làm primary key
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // User nhận thông báo (char(36) để match với nq57_users.id)
            if (!Schema::hasColumn('notifications', 'user_id')) {
                $table->char('user_id', 36)->after('id')
                    ->comment('ID người nhận thông báo');
            }

            // Loại thông báo
            if (!Schema::hasColumn('notifications', 'notification_type')) {
                $table->string('notification_type', 100)->after('user_id')
                    ->comment('Loại: activity_created, activity_approved, user_assigned, etc.');
            }

            // Tiêu đề thông báo
            if (!Schema::hasColumn('notifications', 'title')) {
                $table->string('title', 255)->after('notification_type')
                    ->comment('Tiêu đề thông báo');
            }

            // Nội dung thông báo
            if (!Schema::hasColumn('notifications', 'message')) {
                $table->text('message')->nullable()->after('title')
                    ->comment('Nội dung chi tiết');
            }

            // Trạng thái đã đọc
            if (!Schema::hasColumn('notifications', 'is_read')) {
                $table->boolean('is_read')->default(false)->after('message')
                    ->comment('Đã đọc chưa');
            }

            // Thời điểm đọc
            if (!Schema::hasColumn('notifications', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('is_read')
                    ->comment('Thời điểm đọc');
            }

            // Entity liên quan (polymorphic)
            if (!Schema::hasColumn('notifications', 'related_entity_type')) {
                $table->string('related_entity_type', 100)->nullable()->after('read_at')
                    ->comment('Loại entity: Activity, User, Organization, etc.');
            }

            if (!Schema::hasColumn('notifications', 'related_entity_id')) {
                $table->string('related_entity_id', 36)->nullable()->after('related_entity_type')
                    ->comment('ID của entity liên quan');
            }
        });

        // Thêm foreign key và indexes
        Schema::table('notifications', function (Blueprint $table) {
            // Foreign key to users table
            if (!$this->hasForeignKey('notifications', 'notifications_user_id_foreign')) {
                $table->foreign('user_id')
                    ->references('id')
                    ->on('nq57_users')
                    ->onDelete('cascade');
            }
        });

        // Add indexes
        $this->addIndexIfNotExists('notifications', 'user_id', 'notifications_user_id_index');
        $this->addIndexIfNotExists('notifications', 'notification_type', 'notifications_type_index');
        $this->addIndexIfNotExists('notifications', 'is_read', 'notifications_is_read_index');
        $this->addIndexIfNotExists('notifications', ['related_entity_type', 'related_entity_id'], 'notifications_entity_index');
    }

    /**
     * Check if foreign key exists
     */
    private function hasForeignKey(string $table, string $keyName): bool
    {
        $foreignKeys = Schema::getConnection()
            ->getDoctrineSchemaManager()
            ->listTableForeignKeys($table);

        foreach ($foreignKeys as $foreignKey) {
            if ($foreignKey->getName() === $keyName) {
                return true;
            }
        }

        return false;
    }

    /**
     * Helper: Add index if not exists
     */
    private function addIndexIfNotExists(string $table, $columns, string $indexName): void
    {
        $columns = is_array($columns) ? $columns : [$columns];
        $columnsList = implode(',', array_map(fn($c) => "`$c`", $columns));

        // Check if index exists
        $exists = \Illuminate\Support\Facades\DB::select("SHOW INDEX FROM `$table` WHERE Key_name = ?", [$indexName]);

        if (empty($exists)) {
            \Illuminate\Support\Facades\DB::statement("CREATE INDEX `$indexName` ON `$table` ($columnsList)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Drop foreign key first
            try {
                $table->dropForeign('notifications_user_id_foreign');
            } catch (\Exception $e) {
                // Foreign key might not exist
            }

            // Drop indexes
            try {
                $table->dropIndex('notifications_user_id_index');
                $table->dropIndex('notifications_type_index');
                $table->dropIndex('notifications_is_read_index');
                $table->dropIndex('notifications_entity_index');
            } catch (\Exception $e) {
                // Index might not exist
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            // Drop columns
            $columns = [
                'user_id',
                'notification_type',
                'title',
                'message',
                'is_read',
                'read_at',
                'related_entity_type',
                'related_entity_id',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('notifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
