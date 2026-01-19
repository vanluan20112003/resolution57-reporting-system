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
        Schema::create('maintenance_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_enabled')->default(false);
            $table->string('secret_key', 64)->nullable(); // Key để admin bypass
            $table->string('title')->default('Hệ thống đang bảo trì');
            $table->text('message')->nullable();
            $table->string('notification_type')->default('info'); // info, warning, error
            $table->datetime('estimated_end_time')->nullable();
            $table->boolean('show_countdown')->default(true);
            $table->boolean('allow_admin_access')->default(true);
            $table->json('allowed_ips')->nullable(); // Whitelist IPs
            $table->uuid('enabled_by')->nullable(); // User who enabled maintenance
            $table->datetime('enabled_at')->nullable();
            $table->uuid('disabled_by')->nullable();
            $table->datetime('disabled_at')->nullable();
            $table->timestamps();

            $table->foreign('enabled_by')->references('id')->on('nq57_users')->nullOnDelete();
            $table->foreign('disabled_by')->references('id')->on('nq57_users')->nullOnDelete();
        });

        // Log table for maintenance history
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action'); // enabled, disabled, settings_updated
            $table->uuid('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->json('old_settings')->nullable();
            $table->json('new_settings')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('nq57_users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
        Schema::dropIfExists('maintenance_settings');
    }
};
