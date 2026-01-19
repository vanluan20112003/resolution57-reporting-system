<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Restore UUID primary key for report_batch_activities
     */
    public function up(): void
    {
        // Drop foreign keys and table
        Schema::table('report_batch_activities', function (Blueprint $table) {
            $table->dropForeign(['report_batch_id']);
            $table->dropForeign(['activity_id']);
        });

        Schema::dropIfExists('report_batch_activities');

        // Recreate with UUID
        Schema::create('report_batch_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('report_batch_id');
            $table->uuid('activity_id');
            $table->integer('order_number')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('report_batch_id')
                ->references('id')
                ->on('report_batches')
                ->onDelete('cascade');

            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->unique(['report_batch_id', 'activity_id']);
            $table->index(['report_batch_id', 'order_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_batch_activities', function (Blueprint $table) {
            $table->dropForeign(['report_batch_id']);
            $table->dropForeign(['activity_id']);
        });

        Schema::dropIfExists('report_batch_activities');

        Schema::create('report_batch_activities', function (Blueprint $table) {
            $table->id();
            $table->uuid('report_batch_id');
            $table->uuid('activity_id');
            $table->integer('order_number')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('report_batch_id')
                ->references('id')
                ->on('report_batches')
                ->onDelete('cascade');

            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->unique(['report_batch_id', 'activity_id']);
            $table->index(['report_batch_id', 'order_number']);
        });
    }
};
