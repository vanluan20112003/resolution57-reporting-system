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
        Schema::table('activity_files', function (Blueprint $table) {
            // Add file_url column for external links
            if (!Schema::hasColumn('activity_files', 'file_url')) {
                $table->string('file_url', 1000)->nullable()->after('file_path');
            }

            // Add source_type column to distinguish between upload and link
            if (!Schema::hasColumn('activity_files', 'source_type')) {
                $table->enum('source_type', ['upload', 'link'])->default('upload')->after('file_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_files', function (Blueprint $table) {
            if (Schema::hasColumn('activity_files', 'file_url')) {
                $table->dropColumn('file_url');
            }
            if (Schema::hasColumn('activity_files', 'source_type')) {
                $table->dropColumn('source_type');
            }
        });
    }
};
