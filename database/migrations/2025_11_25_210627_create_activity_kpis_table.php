<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng activity_kpis - Liên kết hoạt động với KPI
     * Cấu trúc khớp với database hiện tại
     */
    public function up(): void
    {
        Schema::create('activity_kpis', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // Foreign keys
            $table->char('activity_id', 36)->comment('ID hoạt động');
            $table->char('kpi_id', 36)->comment('ID chỉ tiêu KPI');

            // Thông tin đóng góp
            $table->text('contribution_description')->nullable()->comment('Mô tả đóng góp của hoạt động vào KPI');

            // Giá trị mục tiêu và thực tế
            $table->string('target_value', 255)->nullable()->comment('Giá trị mục tiêu');
            $table->string('actual_value', 255)->nullable()->comment('Giá trị thực tế');

            // Timestamps
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->dateTime('updated_at')->nullable()->useCurrent();
        });

        // Add foreign keys
        Schema::table('activity_kpis', function (Blueprint $table) {
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->foreign('kpi_id')
                ->references('id')
                ->on('kpis')
                ->onDelete('cascade');
        });

        // Add indexes
        $this->addIndexSafe('activity_kpis', ['activity_id', 'kpi_id'], 'idx_activity_kpi');
        $this->addIndexSafe('activity_kpis', 'activity_id', 'idx_activity');
        $this->addIndexSafe('activity_kpis', 'kpi_id', 'idx_kpi');
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
        Schema::dropIfExists('activity_kpis');
    }
};
