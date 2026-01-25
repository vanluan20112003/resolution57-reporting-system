<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Thêm share_token để tạo link xem tất cả file của đợt báo cáo
     * Token được tự động generate khi tạo đợt báo cáo mới
     */
    public function up(): void
    {
        Schema::table('report_batches', function (Blueprint $table) {
            $table->string('share_token', 64)->nullable()->unique()->after('notes');
            $table->index('share_token');
        });

        // Generate tokens for existing batches
        $batches = DB::table('report_batches')->whereNull('share_token')->get();
        foreach ($batches as $batch) {
            DB::table('report_batches')
                ->where('id', $batch->id)
                ->update(['share_token' => Str::random(32)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_batches', function (Blueprint $table) {
            $table->dropIndex(['share_token']);
            $table->dropColumn('share_token');
        });
    }
};
