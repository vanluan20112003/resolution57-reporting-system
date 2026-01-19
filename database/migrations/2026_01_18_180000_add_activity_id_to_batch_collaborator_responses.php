<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Change from batch-level responses to activity-level responses
     * Each collaborating organization submits a response for each activity they participate in
     */
    public function up(): void
    {
        Schema::table('batch_collaborator_responses', function (Blueprint $table) {
            // Drop old unique constraint (batch + organization)
            $table->dropUnique('batch_org_response_unique');

            // Add activity_id column
            $table->uuid('activity_id')->after('organization_id');

            // Add foreign key for activity
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            // New unique constraint: each org can only respond once per activity per batch
            $table->unique(
                ['report_batch_id', 'organization_id', 'activity_id'],
                'batch_org_activity_response_unique'
            );

            // Index for faster queries
            $table->index('activity_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('batch_collaborator_responses', function (Blueprint $table) {
            // Drop new unique constraint
            $table->dropUnique('batch_org_activity_response_unique');

            // Drop foreign key and column
            $table->dropForeign(['activity_id']);
            $table->dropIndex(['activity_id']);
            $table->dropColumn('activity_id');

            // Restore old unique constraint
            $table->unique(['report_batch_id', 'organization_id'], 'batch_org_response_unique');
        });
    }
};
