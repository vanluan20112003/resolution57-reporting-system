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
        Schema::create('batch_collaborator_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('report_batch_id');
            $table->uuid('organization_id'); // Don vi phoi hop
            $table->uuid('submitted_by')->nullable(); // Nguoi nop bao cao
            $table->text('content'); // Noi dung phan hoi/bao cao
            $table->timestamp('submitted_at')->nullable(); // Thoi gian nop
            $table->timestamps();

            // Foreign keys
            $table->foreign('report_batch_id')
                ->references('id')
                ->on('report_batches')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('submitted_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('set null');

            // Unique constraint - moi don vi chi phan hoi 1 lan cho 1 dot
            $table->unique(['report_batch_id', 'organization_id'], 'batch_org_response_unique');

            // Index for faster queries
            $table->index('report_batch_id');
            $table->index('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batch_collaborator_responses');
    }
};
