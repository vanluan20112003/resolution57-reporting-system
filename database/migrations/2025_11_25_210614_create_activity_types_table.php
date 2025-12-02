<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng activity_types - Loại hoạt động
     * Cấu trúc khớp với database hiện tại
     */
    public function up(): void
    {
        Schema::create('activity_types', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // Tên loại hoạt động (unique)
            $table->string('name', 100)->unique()->comment('Tên loại hoạt động');

            // Mô tả
            $table->text('description')->nullable()->comment('Mô tả chi tiết');

            // Thứ tự hiển thị
            $table->integer('display_order')->nullable()->default(0)->comment('Thứ tự sắp xếp');

            // Trạng thái active
            $table->boolean('is_active')->nullable()->default(true)->comment('Đang sử dụng');

            // Timestamps
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->dateTime('updated_at')->nullable()->useCurrent();
        });

        // Add indexes
        $this->addIndexSafe('activity_types', 'name', 'idx_name');
        $this->addIndexSafe('activity_types', 'is_active', 'idx_is_active');
    }

    /**
     * Helper: Add index if not exists
     */
    private function addIndexSafe(string $table, $columns, string $indexName): void
    {
        $columns = is_array($columns) ? $columns : [$columns];
        $columnsList = implode(',', array_map(fn($c) => "`$c`", $columns));

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
        Schema::dropIfExists('activity_types');
    }
};
