<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng activities - Hoạt động
     * Cấu trúc khớp với database hiện tại
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // Mã hoạt động (unique)
            $table->string('code', 100)->unique()->comment('Mã hoạt động');

            // Tiêu đề và mô tả
            $table->string('title', 500)->comment('Tiêu đề hoạt động');
            $table->text('description')->nullable()->comment('Mô tả chi tiết');

            // Loại và lĩnh vực hoạt động (foreign keys)
            $table->char('activity_type_id', 36)->comment('Loại hoạt động');
            $table->char('activity_field_id', 36)->nullable()->comment('Lĩnh vực hoạt động');

            // Trạng thái
            $table->string('status', 50)->default('DRAFT')->comment('DRAFT, PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED');

            // Đơn vị chủ trì (foreign key)
            $table->char('lead_organization_id', 36)->comment('Đơn vị chủ trì');

            // Thời gian kế hoạch
            $table->dateTime('start_date')->nullable()->comment('Ngày bắt đầu dự kiến');
            $table->dateTime('end_date')->nullable()->comment('Ngày kết thúc dự kiến');

            // Thời gian thực tế
            $table->dateTime('actual_start_date')->nullable()->comment('Ngày bắt đầu thực tế');
            $table->dateTime('actual_end_date')->nullable()->comment('Ngày kết thúc thực tế');

            // Ngân sách
            $table->decimal('budget', 15, 2)->nullable()->comment('Ngân sách (VND)');
            $table->string('budget_source', 255)->nullable()->comment('Nguồn ngân sách');

            // Địa điểm và link
            $table->string('location', 500)->nullable()->comment('Địa điểm thực hiện');
            $table->string('external_url', 1000)->nullable()->comment('Link tài liệu bên ngoài');

            // Người tạo và phê duyệt
            $table->char('created_by', 36)->comment('Người tạo');
            $table->char('approved_by', 36)->nullable()->comment('Người phê duyệt');
            $table->dateTime('approved_at')->nullable()->comment('Thời điểm phê duyệt');
            $table->char('updated_by', 36)->nullable()->comment('Người cập nhật cuối');

            // Khóa hoạt động
            $table->boolean('is_locked')->nullable()->default(false)->comment('Đã khóa chỉnh sửa');
            $table->dateTime('locked_at')->nullable()->comment('Thời điểm khóa');
            $table->char('locked_by', 36)->nullable()->comment('Người khóa');

            // Tiến độ và kết quả
            $table->integer('completion_percentage')->nullable()->default(0)->comment('Phần trăm hoàn thành');
            $table->text('result_summary')->nullable()->comment('Tóm tắt kết quả');

            // Timestamps
            $table->dateTime('created_at')->nullable()->useCurrent();
            $table->dateTime('updated_at')->nullable()->useCurrent();
        });

        // Add foreign keys
        Schema::table('activities', function (Blueprint $table) {
            $table->foreign('activity_type_id')
                ->references('id')
                ->on('activity_types')
                ->onDelete('restrict');

            $table->foreign('activity_field_id')
                ->references('id')
                ->on('activity_fields')
                ->onDelete('set null');

            $table->foreign('lead_organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('restrict');
        });

        // Add indexes
        $this->addIndexSafe('activities', 'code', 'idx_code');
        $this->addIndexSafe('activities', ['status', 'activity_type_id'], 'idx_status_type');
        $this->addIndexSafe('activities', 'lead_organization_id', 'idx_lead_org');
        $this->addIndexSafe('activities', ['created_by', 'created_at'], 'idx_creator');
        $this->addIndexSafe('activities', ['start_date', 'end_date'], 'idx_dates');
        $this->addIndexSafe('activities', 'activity_field_id', 'idx_field');
        $this->addIndexSafe('activities', 'status', 'idx_status');
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
        Schema::dropIfExists('activities');
    }
};
