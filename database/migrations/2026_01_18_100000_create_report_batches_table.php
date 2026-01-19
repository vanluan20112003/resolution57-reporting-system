<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Report Batches - Đợt báo cáo
        Schema::create('report_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('created_by');
            $table->string('name'); // Tên đợt báo cáo
            $table->text('description')->nullable(); // Mô tả đợt báo cáo
            $table->date('start_date')->nullable(); // Ngày bắt đầu đợt
            $table->date('end_date')->nullable(); // Ngày kết thúc đợt
            $table->date('deadline')->nullable(); // Hạn nộp báo cáo
            $table->string('status', 20)->default('draft'); // draft, active, completed, cancelled
            $table->text('notes')->nullable(); // Ghi chú
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('cascade');

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'created_at']);
        });

        // Pivot table: Report Batch - Activities
        Schema::create('report_batch_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('report_batch_id');
            $table->uuid('activity_id');
            $table->integer('order_number')->default(0); // Thứ tự hiển thị
            $table->text('notes')->nullable(); // Ghi chú cho hoạt động trong đợt
            $table->timestamps();

            $table->foreign('report_batch_id')
                ->references('id')
                ->on('report_batches')
                ->onDelete('cascade');

            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->unique(['report_batch_id', 'activity_id']);
            $table->index(['report_batch_id', 'order_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_batch_activities');
        Schema::dropIfExists('report_batches');
    }
};
