<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Thêm cột leader_names - Danh sách người chủ trì hoạt động (JSON array)
     */
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->json('leader_names')->nullable()->after('lead_organization_id')->comment('Danh sách người chủ trì hoạt động (JSON array)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn('leader_names');
        });
    }
};
