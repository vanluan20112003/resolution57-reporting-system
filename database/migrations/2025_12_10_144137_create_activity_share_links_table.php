<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activity_share_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->string('share_token', 64)->unique(); // Token ngắn gọn để chia sẻ
            $table->uuid('created_by'); // Người tạo link
            $table->timestamp('expires_at')->nullable(); // Thời gian hết hạn (null = không hết hạn)
            $table->boolean('is_active')->default(true); // Có thể vô hiệu hóa link
            $table->integer('access_count')->default(0); // Số lần truy cập
            $table->timestamp('last_accessed_at')->nullable(); // Lần truy cập cuối
            $table->text('description')->nullable(); // Mô tả link chia sẻ
            $table->timestamps();

            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('cascade');

            $table->index(['share_token', 'is_active']);
            $table->index(['activity_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_share_links');
    }
};
