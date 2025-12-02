<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng kpis - Chỉ tiêu KPI
     * Cấu trúc khớp với database hiện tại
     */
    public function up(): void
    {
        Schema::create('kpis', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // Nguồn KPI (NQ57, internal, etc.)
            $table->string('source', 50)->comment('Nguồn KPI: NQ57, internal, etc.');

            // Mã KPI
            $table->string('code', 100)->nullable()->comment('Mã chỉ tiêu');

            // Tiêu đề và mô tả
            $table->string('title', 500)->comment('Tên chỉ tiêu');
            $table->text('description')->nullable()->comment('Mô tả chi tiết');

            // Phân loại
            $table->string('category', 255)->nullable()->comment('Nhóm/phân loại KPI');

            // Thứ tự hiển thị
            $table->integer('order_number')->nullable()->comment('Số thứ tự');

            // Trạng thái
            $table->boolean('is_active')->nullable()->default(true)->comment('Đang sử dụng');

            // Người tạo
            $table->char('created_by', 36)->nullable()->comment('Người tạo');

            // Timestamps
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->dateTime('updated_at')->nullable()->useCurrent();
        });

        // Add indexes
        $this->addIndexSafe('kpis', 'source', 'idx_source');
        $this->addIndexSafe('kpis', 'code', 'idx_code');
        $this->addIndexSafe('kpis', 'is_active', 'idx_is_active');
        $this->addIndexSafe('kpis', 'category', 'idx_category');
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
        Schema::dropIfExists('kpis');
    }
};
