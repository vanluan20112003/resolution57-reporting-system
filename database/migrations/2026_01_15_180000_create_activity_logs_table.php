<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Create activity_logs table to track all actions on activities
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('user_id');
            $table->uuid('organization_id')->nullable();
            $table->string('action', 50); // created, updated, deleted, submitted, approved, rejected, locked, unlocked, postponed, cancelled, uncancelled, file_uploaded, file_deleted, participant_added, participant_removed
            $table->string('action_label', 100)->nullable(); // Human readable label in Vietnamese
            $table->text('description')->nullable(); // Detailed description of the action
            $table->json('old_values')->nullable(); // Previous values (for updates)
            $table->json('new_values')->nullable(); // New values (for updates)
            $table->json('metadata')->nullable(); // Additional metadata (file info, participant info, etc.)
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('nq57_users')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');

            // Indexes for common queries
            $table->index('activity_id');
            $table->index('user_id');
            $table->index('organization_id');
            $table->index('action');
            $table->index('created_at');
            $table->index(['organization_id', 'created_at']); // For organization activity feed
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
