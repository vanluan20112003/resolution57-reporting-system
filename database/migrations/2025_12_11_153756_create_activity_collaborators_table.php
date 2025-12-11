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
        Schema::create('activity_collaborators', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('organization_id');
            $table->text('notes')->nullable(); // Ghi chú về vai trò phối hợp
            $table->timestamps();

            // Foreign keys
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            // Unique constraint - mỗi đơn vị chỉ phối hợp 1 lần cho 1 hoạt động
            $table->unique(['activity_id', 'organization_id'], 'activity_org_unique');

            // Index for faster queries
            $table->index('activity_id');
            $table->index('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_collaborators');
    }
};
