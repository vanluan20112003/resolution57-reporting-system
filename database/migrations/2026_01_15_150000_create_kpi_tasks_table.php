<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tạo bảng kpi_tasks - Nhiệm vụ con của KPI
     *
     * Mỗi KPI có thể có nhiều nhiệm vụ nhỏ (tasks)
     * Mỗi task chỉ thuộc về 1 KPI cha
     */
    public function up(): void
    {
        Schema::create('kpi_tasks', function (Blueprint $table) {
            // Primary key - UUID
            $table->uuid('id')->primary();

            // Foreign key to parent KPI
            $table->char('kpi_id', 36)->comment('ID của KPI cha');

            // Task information
            $table->string('code', 100)->nullable()->comment('Mã nhiệm vụ');
            $table->string('title', 500)->comment('Tên nhiệm vụ');
            $table->text('description')->nullable()->comment('Mô tả chi tiết');

            // Target values
            $table->string('target_value', 255)->nullable()->comment('Giá trị mục tiêu');
            $table->string('unit', 100)->nullable()->comment('Đơn vị đo lường');

            // Ordering & Status
            $table->integer('order_number')->default(0)->comment('Thứ tự hiển thị');
            $table->boolean('is_active')->default(true)->comment('Đang sử dụng');

            // Tracking
            $table->char('created_by', 36)->nullable()->comment('Người tạo');
            $table->char('updated_by', 36)->nullable()->comment('Người cập nhật');

            // Timestamps
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('kpi_id')
                ->references('id')
                ->on('kpis')
                ->onDelete('cascade');

            // Indexes
            $table->index('kpi_id');
            $table->index('code');
            $table->index('is_active');
            $table->index('order_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_tasks');
    }
};
