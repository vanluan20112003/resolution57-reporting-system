<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add assigned_to field to allow MANAGER to assign STAFF users to manage activities
     */
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // UUID of the staff assigned to manage this activity (char(36) to match nq57_users.id)
            // When null, the creator (created_by) is the default manager
            $table->char('assigned_to', 36)->nullable()->after('created_by');

            // Foreign key constraint referencing nq57_users table
            $table->foreign('assigned_to')
                  ->references('id')
                  ->on('nq57_users')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropColumn('assigned_to');
        });
    }
};
