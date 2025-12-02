<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tạo bảng notification_templates
     * Lưu mẫu thông báo cho các loại notification khác nhau
     */
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // Loại thông báo (unique)
            $table->string('type', 100)->unique()->comment('Loại thông báo: activity_created, activity_approved, etc.');

            // Mẫu tiêu đề và nội dung
            $table->string('title_template', 255)->comment('Mẫu tiêu đề, hỗ trợ biến như {{user_name}}, {{activity_title}}');
            $table->text('message_template')->nullable()->comment('Mẫu nội dung chi tiết');

            // Giá trị mặc định cho UI
            $table->string('default_icon', 50)->nullable()->comment('Icon mặc định: CheckCircleOutlined, etc.');
            $table->string('default_color', 20)->nullable()->comment('Màu mặc định: success, warning, error, info, primary');
            $table->string('default_category', 50)->default('general')->comment('Nhóm mặc định: activity, user, system, report');
            $table->string('default_priority', 20)->default('normal')->comment('Độ ưu tiên mặc định: low, normal, high, urgent');

            // Cài đặt gửi thông báo
            $table->boolean('send_email')->default(false)->comment('Có gửi email không');
            $table->boolean('send_push')->default(false)->comment('Có gửi push notification không');

            // Mô tả và trạng thái
            $table->text('description')->nullable()->comment('Mô tả về loại thông báo này');
            $table->boolean('is_active')->default(true)->comment('Template có active không');

            // Timestamps
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
