<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Đổi target_organization_id từ single ID sang array of IDs
     * để hỗ trợ chọn nhiều phòng ban cho scope SPECIFIC_ORGANIZATIONS
     */
    public function up(): void
    {
        Schema::table('organization_access_permissions', function (Blueprint $table) {
            // Drop foreign key và unique constraint liên quan
            $table->dropForeign(['target_organization_id']);
            $table->dropUnique('uk_org_scope_target');
        });

        // Migrate data: chuyển single ID sang array
        DB::statement("
            UPDATE organization_access_permissions
            SET target_organization_id = JSON_ARRAY(target_organization_id)
            WHERE target_organization_id IS NOT NULL
        ");

        Schema::table('organization_access_permissions', function (Blueprint $table) {
            // Đổi tên column và kiểu dữ liệu
            $table->renameColumn('target_organization_id', 'target_organization_ids');
        });

        // Đổi kiểu sang JSON
        DB::statement("
            ALTER TABLE organization_access_permissions
            MODIFY COLUMN target_organization_ids JSON NULL
            COMMENT 'Danh sách phòng ban được phép xem (JSON array of IDs)'
        ");

        Schema::table('organization_access_permissions', function (Blueprint $table) {
            // Tạo unique constraint mới: org + scope (không bao gồm target nữa)
            $table->unique(
                ['organization_id', 'view_scope_id'],
                'uk_org_scope'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_access_permissions', function (Blueprint $table) {
            $table->dropUnique('uk_org_scope');
        });

        // Rollback: lấy phần tử đầu tiên của array
        DB::statement("
            UPDATE organization_access_permissions
            SET target_organization_ids = JSON_UNQUOTE(JSON_EXTRACT(target_organization_ids, '$[0]'))
            WHERE target_organization_ids IS NOT NULL
        ");

        Schema::table('organization_access_permissions', function (Blueprint $table) {
            $table->renameColumn('target_organization_ids', 'target_organization_id');
        });

        DB::statement("
            ALTER TABLE organization_access_permissions
            MODIFY COLUMN target_organization_id CHAR(36) NULL
        ");

        Schema::table('organization_access_permissions', function (Blueprint $table) {
            $table->foreign('target_organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->unique(
                ['organization_id', 'view_scope_id', 'target_organization_id'],
                'uk_org_scope_target'
            );
        });
    }
};
