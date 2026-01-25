<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Thêm activity_id để file minh chứng từ đơn vị phối hợp có thể liên kết với từng hoạt động cụ thể
     * - File của owner (văn bản giao nhiệm vụ): activity_id = null (áp dụng cho cả đợt)
     * - File của collaborator: activity_id có thể là null (chung cho đợt) hoặc có giá trị (riêng cho hoạt động)
     */
    public function up(): void
    {
        Schema::table('report_batch_files', function (Blueprint $table) {
            $table->uuid('activity_id')->nullable()->after('report_batch_id');

            // Foreign key to activities table
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            // Index for faster queries
            $table->index(['report_batch_id', 'activity_id']);
            $table->index(['organization_id', 'activity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_batch_files', function (Blueprint $table) {
            $table->dropForeign(['activity_id']);
            $table->dropIndex(['report_batch_id', 'activity_id']);
            $table->dropIndex(['organization_id', 'activity_id']);
            $table->dropColumn('activity_id');
        });
    }
};
