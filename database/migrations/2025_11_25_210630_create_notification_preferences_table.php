<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tạo bảng notification_preferences
     * Lưu cài đặt thông báo của từng user
     */
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            // Primary key - UUID
            $table->char('id', 36)->primary();

            // User (char(36) để match với nq57_users.id)
            $table->char('user_id', 36)->comment('ID người dùng');

            // Loại thông báo hoặc category
            $table->string('notification_type', 100)->comment('Loại thông báo hoặc category');

            // Kênh nhận thông báo
            $table->boolean('in_app')->default(true)->comment('Nhận trong app');
            $table->boolean('email')->default(true)->comment('Nhận qua email');
            $table->boolean('push')->default(true)->comment('Nhận push notification');

            // Tần suất gửi email
            $table->string('email_frequency', 20)->default('realtime')->comment('realtime, daily, weekly');

            // Timestamps
            $table->timestamps();

            // Unique constraint: mỗi user chỉ có 1 preference cho mỗi notification_type
            $table->unique(['user_id', 'notification_type'], 'notification_preferences_user_type_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
