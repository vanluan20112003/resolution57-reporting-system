<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Thêm các trường bổ sung cho báo cáo của đơn vị phối hợp:
     * - difficulties: Khó khăn/vướng mắc
     * - recommendations: Đề xuất/kiến nghị
     * - explanation: Nội dung giải trình (khi quá hạn)
     * - is_overdue_submission: Đánh dấu nếu nộp quá hạn
     */
    public function up(): void
    {
        Schema::table('batch_collaborator_responses', function (Blueprint $table) {
            $table->text('difficulties')->nullable()->after('content'); // Khó khăn/vướng mắc
            $table->text('recommendations')->nullable()->after('difficulties'); // Đề xuất/kiến nghị
            $table->text('explanation')->nullable()->after('recommendations'); // Nội dung giải trình (khi quá hạn)
            $table->boolean('is_overdue_submission')->default(false)->after('explanation'); // Đánh dấu nộp quá hạn
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('batch_collaborator_responses', function (Blueprint $table) {
            $table->dropColumn(['difficulties', 'recommendations', 'explanation', 'is_overdue_submission']);
        });
    }
};
