<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('exported_by');
            $table->string('report_type', 50)->default('activity'); // activity, kpi, summary
            $table->string('view_mode', 20)->default('activities'); // activities, kpis
            $table->integer('month');
            $table->integer('year');
            $table->json('selected_columns')->nullable();
            $table->string('file_name');
            $table->string('file_path')->nullable(); // Path to stored file if keeping
            $table->integer('file_size')->nullable(); // File size in bytes
            $table->integer('activity_count')->default(0); // Number of activities exported
            $table->string('status', 20)->default('completed'); // pending, processing, completed, failed
            $table->text('notes')->nullable(); // User notes for this export
            $table->text('error_message')->nullable(); // Error message if failed
            $table->timestamp('exported_at');
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('exported_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('cascade');

            $table->index(['organization_id', 'exported_at']);
            $table->index(['exported_by', 'exported_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_exports');
    }
};
