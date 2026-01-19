<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tạo bảng organization_view_scopes - Định nghĩa phạm vi xem hoạt động
     *
     * Bảng này quản lý các phạm vi (scope) mà một phòng ban có thể được cấp quyền xem
     * Ví dụ: Xem tất cả, Xem theo nhóm, Xem theo loại hoạt động, etc.
     */
    public function up(): void
    {
        Schema::create('organization_view_scopes', function (Blueprint $table) {
            // Primary key
            $table->char('id', 36)->primary()->comment('UUID');

            // Tên và mô tả scope
            $table->string('name', 100)->unique()->comment('Tên scope: ALL_ORGANIZATIONS, GROUP_BASED, TYPE_BASED, CUSTOM');
            $table->string('display_name', 200)->comment('Tên hiển thị');
            $table->text('description')->nullable()->comment('Mô tả chi tiết');

            // Cấu hình scope
            $table->boolean('is_system')->default(false)->comment('Scope hệ thống (không thể xóa)');
            $table->boolean('requires_specific_orgs')->default(true)->comment('Cần chỉ định phòng ban cụ thể');
            $table->string('scope_type', 50)->comment('all, group, type, custom');

            // Status
            $table->string('status', 20)->default('active')->comment('active, inactive');

            // Tracking
            $table->char('created_by', 36)->nullable()->comment('Người tạo');
            $table->datetime('created_at')->useCurrent();
            $table->datetime('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Indexes
            $table->index('name');
            $table->index('scope_type');
            $table->index('status');
        });

        // Insert default scopes
        DB::table('organization_view_scopes')->insert([
            [
                'id' => DB::raw('UUID()'),
                'name' => 'ALL_ORGANIZATIONS',
                'display_name' => 'Xem tất cả phòng ban',
                'description' => 'Có quyền xem hoạt động của tất cả các phòng ban trong hệ thống',
                'is_system' => true,
                'requires_specific_orgs' => false,
                'scope_type' => 'all',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => DB::raw('UUID()'),
                'name' => 'SPECIFIC_ORGANIZATIONS',
                'display_name' => 'Xem phòng ban được chỉ định',
                'description' => 'Chỉ xem hoạt động của các phòng ban được chỉ định cụ thể',
                'is_system' => true,
                'requires_specific_orgs' => true,
                'scope_type' => 'custom',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => DB::raw('UUID()'),
                'name' => 'PARENT_AND_CHILDREN',
                'display_name' => 'Xem phòng ban và các phòng ban con',
                'description' => 'Xem hoạt động của phòng ban và tất cả phòng ban trực thuộc (theo cấu trúc parent_id)',
                'is_system' => true,
                'requires_specific_orgs' => false,
                'scope_type' => 'group',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_view_scopes');
    }
};
