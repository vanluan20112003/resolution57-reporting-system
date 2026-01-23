<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Remove assigned_to column - all staff in the same organization now have equal permissions
     */
    public function up(): void
    {
        // Check if foreign key exists before dropping
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'activities'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = 'activities_assigned_to_foreign'
        ");

        if (count($foreignKeys) > 0) {
            Schema::table('activities', function (Blueprint $table) {
                $table->dropForeign(['assigned_to']);
            });
        }

        // Drop the column if it exists
        if (Schema::hasColumn('activities', 'assigned_to')) {
            Schema::table('activities', function (Blueprint $table) {
                $table->dropColumn('assigned_to');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->uuid('assigned_to')->nullable()->after('created_by');
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
        });
    }
};
