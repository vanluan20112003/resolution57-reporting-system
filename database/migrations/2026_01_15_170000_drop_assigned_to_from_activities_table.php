<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Remove assigned_to column - all staff in the same organization now have equal permissions
     */
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['assigned_to']);
            // Then drop the column
            $table->dropColumn('assigned_to');
        });
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
