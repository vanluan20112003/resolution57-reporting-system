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
        Schema::table('file_types', function (Blueprint $table) {
            // Check and add columns if they don't exist
            if (!Schema::hasColumn('file_types', 'code')) {
                $table->string('code', 50)->unique()->after('id');
            }
            if (!Schema::hasColumn('file_types', 'name')) {
                $table->string('name', 100)->after('code');
            }
            if (!Schema::hasColumn('file_types', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (!Schema::hasColumn('file_types', 'display_order')) {
                $table->integer('display_order')->default(0)->after('description');
            }
            if (!Schema::hasColumn('file_types', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('display_order');
            }
        });

        // Also need to change the id column to uuid if it's not already
        // This is handled by updating the original migration file
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('file_types', function (Blueprint $table) {
            $table->dropColumn(['description', 'display_order', 'is_active']);
        });
    }
};
