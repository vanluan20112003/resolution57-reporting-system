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
        Schema::table('activity_share_links', function (Blueprint $table) {
            // Drop the foreign key first
            $table->dropForeign(['created_by']);

            // Make created_by nullable for system-generated links
            $table->uuid('created_by')->nullable()->change();

            // Re-add the foreign key with SET NULL on delete
            $table->foreign('created_by')
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
        Schema::table('activity_share_links', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->uuid('created_by')->nullable(false)->change();
            $table->foreign('created_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('cascade');
        });
    }
};
