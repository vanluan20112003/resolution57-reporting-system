<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tạo bảng organization_access_permissions - Quản lý quyền xem hoạt động
     *
     * Bảng này lưu thông tin về quyền được cấp cho một phòng ban
     * để xem hoạt động của các phòng ban khác
     *
     * Chỉ có staff hoặc manager của phòng ban được cấp quyền mới có thể xem
     */
    public function up(): void
    {
        Schema::create('organization_access_permissions', function (Blueprint $table) {
            // Primary key
            $table->char('id', 36)->primary()->comment('UUID');

            // Phòng ban được cấp quyền (owner)
            $table->char('organization_id', 36)->comment('Phòng ban được cấp quyền xem');

            // Phạm vi xem (scope)
            $table->char('view_scope_id', 36)->comment('Loại phạm vi xem');

            // Phòng ban được phép xem (nullable nếu scope là ALL)
            $table->char('target_organization_id', 36)->nullable()->comment('Phòng ban được phép xem (legacy - backward compatibility)');

            // Nhiều phòng ban được phép xem (JSON array)
            $table->json('target_organization_ids')->nullable()->comment('Danh sách phòng ban được phép xem');

            // Giới hạn theo role
            $table->json('allowed_roles')->nullable()->comment('Các role được phép: ["MANAGER", "STAFF"]');

            // Quyền hạn
            $table->boolean('can_view_details')->default(true)->comment('Xem chi tiết hoạt động');
            $table->boolean('can_view_files')->default(false)->comment('Xem files đính kèm');
            $table->boolean('can_export')->default(false)->comment('Xuất báo cáo');
            $table->boolean('can_view_participants')->default(true)->comment('Xem danh sách người tham gia');
            $table->boolean('can_view_budget')->default(false)->comment('Xem ngân sách');

            // Thời hạn (optional)
            $table->datetime('valid_from')->nullable()->comment('Có hiệu lực từ ngày');
            $table->datetime('valid_until')->nullable()->comment('Hết hiệu lực vào ngày');

            // Status
            $table->string('status', 20)->default('active')->comment('active, inactive, expired');

            // Lý do và ghi chú
            $table->text('reason')->nullable()->comment('Lý do cấp quyền');
            $table->text('notes')->nullable()->comment('Ghi chú');

            // Tracking
            $table->char('created_by', 36)->nullable()->comment('Admin/Operator cấp quyền');
            $table->char('updated_by', 36)->nullable()->comment('Người cập nhật');
            $table->datetime('created_at')->useCurrent();
            $table->datetime('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Foreign keys
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('view_scope_id')
                ->references('id')
                ->on('organization_view_scopes')
                ->onDelete('restrict');

            $table->foreign('target_organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            // Indexes
            $table->index(['organization_id', 'status'], 'idx_org_status');
            $table->index('view_scope_id', 'idx_scope');
            $table->index('target_organization_id', 'idx_target_org');
            $table->index(['valid_from', 'valid_until'], 'idx_validity');
            $table->index('status', 'idx_status');

            // Unique constraint: Một phòng ban chỉ được cấp quyền xem một target org một lần
            $table->unique(
                ['organization_id', 'view_scope_id', 'target_organization_id'],
                'uk_org_scope_target'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_access_permissions');
    }
};
