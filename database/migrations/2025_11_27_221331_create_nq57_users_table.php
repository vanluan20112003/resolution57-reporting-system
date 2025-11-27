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
        Schema::create('nq57_users', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Authentication fields
            $table->string('email', 255)->unique()->comment('Email đăng nhập');
            $table->string('google_id', 255)->unique()->nullable()->comment('Google OAuth User ID');
            $table->string('password_hash', 255)->nullable()->comment('Mật khẩu hash');

            // Personal information
            $table->string('first_name', 100)->comment('Tên');
            $table->string('last_name', 100)->comment('Họ và tên đệm');
            $table->string('phone', 20)->nullable()->comment('Số điện thoại');

            // Avatar fields
            $table->string('avatar', 255)->nullable()->comment('Avatar URL (deprecated)');
            $table->string('avatar_url', 500)->nullable()->comment('Avatar URL từ Google hoặc upload');

            // Organization fields
            $table->boolean('is_vnuhcm')->default(false)->comment('Là thành viên ĐHQG-HCM');
            $table->string('employee_id', 50)->nullable()->comment('Mã nhân viên');

            // Status and role
            $table->string('status', 20)->default('active')->comment('Trạng thái: active, inactive, suspended');
            $table->string('role', 20)->comment('Vai trò: ADMIN, OPERATOR, MANAGER, USER, VIEWER');

            // Relationships
            $table->uuid('organization_id')->nullable()->comment('ID đơn vị');
            $table->uuid('manager_id')->nullable()->comment('ID người quản lý');

            // Tracking fields
            $table->datetime('last_login_at')->nullable()->comment('Lần đăng nhập cuối');
            $table->uuid('created_by')->nullable()->comment('Người tạo');

            // Timestamps
            $table->datetime('created_at')->useCurrent();
            $table->datetime('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Indexes
            $table->index('status');
            $table->index('employee_id');
            $table->index('organization_id');
            $table->index('manager_id');

            // Foreign key constraints (commented out - to be added after related tables exist)
            // $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');
            // $table->foreign('manager_id')->references('id')->on('nq57_users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nq57_users');
    }
};
