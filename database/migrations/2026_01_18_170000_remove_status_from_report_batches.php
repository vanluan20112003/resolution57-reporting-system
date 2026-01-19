<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Remove status column from report_batches - status is now calculated from dates
     */
    public function up(): void
    {
        Schema::table('report_batches', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_batches', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->after('deadline');
        });
    }
};
